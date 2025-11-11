import { auth, db } from './Firebase';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { storageService } from './storageService';
/**
 * Crea el documento de perfil en Firestore al registrar un nuevo usuario.
 * @param {string} userId - El ID de Firebase del usuario (uid).
 * @param {string} fullName - Nombre completo del usuario.
 * @param {string} role - Rol asignado (mentor, emprendedor).
 * @param {string} program - Programa seleccionado (preincubación, incubación).
 * @param {Object} mentorData - Datos adicionales para mentores (opcionales).
 */
const createUserProfileInFirestore = async (userId, fullName, role, program, mentorData) => {
  const profileRef = doc(db, 'userProfiles', userId);

  const profileData = {
    fullName: fullName,
    role: role,
    createdAt: new Date(),
  };

  if (role === 'emprendedor' && program) {
    profileData.program = program;
  }

  if (role === 'mentor' && mentorData) {
    profileData.experience = mentorData.experience;
    profileData.program = mentorData.program;
    profileData.specialization = mentorData.specialization;
    if (mentorData.curriculumUrl) {
      profileData.curriculumUrl = mentorData.curriculumUrl;
    }
  }

  await setDoc(profileRef, profileData);
};

export const authService = {
  async signUp({ email, password, fullName, role, program, mentorData }) {
    if (role === "admin") {
      throw new Error("No puedes registrarte como administrador")
    }

    if (!["emprendedor", "mentor"].includes(role)) {
      throw new Error("Rol inválido")
    }

    if (role === "emprendedor" && !program) {
      throw new Error("Los emprendedores deben seleccionar un programa")
    }

    if (
      role === "mentor" &&
      (!mentorData || !mentorData.experience || !mentorData.program || !mentorData.specialization)
    ) {
      throw new Error("Los mentores deben completar todos los campos obligatorios")
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Si se envió un archivo de curriculum dentro de mentorData, subirlo al Storage
      if (role === 'mentor' && mentorData && mentorData.curriculum) {
        try {
          const url = await storageService.uploadPDF(mentorData.curriculum, user.uid);
          mentorData.curriculumUrl = url;
        } catch (uploadErr) {
          console.error('Error subiendo CV al storage:', uploadErr);
          // No interrumpimos el registro por un fallo en la subida; el mentor puede añadirlo luego
        }
      }

      await createUserProfileInFirestore(user.uid, fullName, role, program, mentorData);

      return { user: { uid: user.uid, email: user.email } };
    } catch (error) {
      console.error('Error en signUp:', error);
      let errorMessage = 'Error al registrarse.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo ya está registrado.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (error.code) {
        // Passthrough other Firebase error codes for debugging
        errorMessage = `${error.code}: ${error.message}`;
      }
      throw new Error(errorMessage);
    }
  },

  async signIn({ email, password }) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      return { user: { uid: user.uid, email: user.email } }
    } catch (error) {
      console.error('Error en signIn:', error);
      let errorMessage = "Credenciales incorrectas o usuario no encontrado.";
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-credential"
      ) {
        errorMessage = "Correo o contraseña incorrectos.";
      } else if (error.code && error.code.toLowerCase().includes('api-key')) {
        // Mensaje claro cuando la API Key del proyecto es inválida
        errorMessage = `Error de configuración: apiKey inválida (error: ${error.code}). Revisa REACT_APP_FIREBASE_API_KEY en .env.local y la configuración del proyecto en Firebase Console.`;
      } else if (error.code) {
        errorMessage = `${error.code}: ${error.message}`;
      }
      throw new Error(errorMessage)
    }
  },

  async signOut() {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Error al cerrar sesión de Firebase:", error)
      throw new Error("Error al cerrar sesión")
    }
  },

  // Helper: obtiene token actualizado y determina si el usuario tiene el claim `admin`.
  // Devuelve un objeto normalizado con uid, email, isAdmin, role y fullName.
  async getAdminStatus(user) {
    try {
      // Forzar refresco del token para recoger custom claims recién aplicados
      const idTokenResult = await user.getIdTokenResult(true);
      const isAdmin = idTokenResult.claims && idTokenResult.claims.admin === true;

      // Obtener perfil de Firestore si existe
      let profile = {};
      try {
        profile = await authService.getUserProfile(user.uid);
      } catch (err) {
        // Si falla, seguimos con valores por defecto
        console.error('No se pudo obtener perfil al verificar admin:', err);
      }

      return {
        uid: user.uid,
        email: user.email,
        isAdmin: !!isAdmin,
        role: profile?.role || (isAdmin ? 'admin' : 'usuario'),
        fullName: profile?.fullName || profile?.full_name || null,
      };
    } catch (error) {
      console.error('Error obteniendo admin status:', error);
      return {
        uid: user.uid,
        email: user.email,
        isAdmin: false,
        role: 'usuario',
        fullName: null,
      };
    }
  },

  async getCurrentUser() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          // Obtener datos extendidos (incluye custom claims si existen)
          authService.getAdminStatus(user)
            .then((sessionData) => resolve(sessionData))
            .catch((err) => {
              console.error('Error al obtener estado de admin en getCurrentUser:', err);
              resolve(null);
            });
        } else {
          resolve(null);
        }
      });
    });
  },

  async getUserProfile(userId) {
    try {
      const profileRef = doc(db, "userProfiles", userId)
      const docSnap = await getDoc(profileRef)

      if (docSnap.exists()) {
        const profileData = docSnap.data()
        return profileData
      }

      return { role: "emprendedor", fullName: "Usuario Desconocido" }
    } catch (error) {
      console.error("Error al obtener perfil de Firestore:", error)
      throw new Error("No se pudo cargar el perfil del usuario.")
    }
  },

  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        // Obtenemos el estado completo (incluye custom claims y perfil)
        authService.getAdminStatus(user)
          .then((sessionData) => {
            const session = { user: sessionData };
            callback('SIGNED_IN', session);
          })
          .catch((err) => {
            console.error('Error en onAuthStateChange al obtener Custom Claim:', err);
            // Fallback: pasar una sesión parcial
            const session = { user: { uid: user.uid, email: user.email } };
            callback('SIGNED_IN', session);
          });
      } else {
        callback('SIGNED_OUT', null);
      }
    });
  },
}
