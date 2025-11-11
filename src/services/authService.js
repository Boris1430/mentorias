import { auth, db } from './Firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,           
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, addDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { storageService } from './storageService';
import { emailService } from './emailService';
import { settingsService } from './settingsService';

/**
 * Crea el documento de perfil en Firestore.
 */
const createUserProfileInFirestore = async (userId, fullName, role, program, mentorData, email) => {
  const profileRef = doc(db, 'userProfiles', userId);

  const profileData = {
    fullName: fullName || 'Usuario',
    email: email || null,
    role: role,
    createdAt: new Date(),
  };

  if (role === 'emprendedor' && program) {
    profileData.program = program;
  }

  if (role === 'mentor' && mentorData) {
    profileData.experience = mentorData.experience || '';
    profileData.program = mentorData.program || '';
    profileData.specialization = mentorData.specialization || '';
    if (mentorData.curriculumUrl) {
      profileData.curriculumUrl = mentorData.curriculumUrl;
    }
  }

  try {
    await setDoc(profileRef, profileData);
    console.log(`Perfil creado para uid=${userId}`);
  } catch (err) {
    console.error('Error creando perfil en Firestore:', err);
    throw err;
  }
};

export const authService = {
  // --- REGISTRO ---
  async signUp({ email, password, fullName, role, program, mentorData }) {
    if (role === "admin") throw new Error("No puedes registrarte como administrador");
    if (!["emprendedor", "mentor"].includes(role)) throw new Error("Rol inválido");
    if (role === "emprendedor" && !program) throw new Error("Los emprendedores deben seleccionar un programa");
    if (role === "mentor" && (!mentorData?.experience || !mentorData?.program || !mentorData?.specialization)) {
      throw new Error("Datos de mentor incompletos");
    }

    try {
      if (role === 'mentor') {
        // Pre-registro para mentores
        let uploadWarning = null;
        if (mentorData?.curriculum) {
          try {
            const url = await storageService.uploadToCloudinary(mentorData.curriculum, { cloudName: 'ds9dou6h5', uploadPreset: 'Mentorias_Innovug' });
            mentorData.curriculumUrl = url;
          } catch (uploadErr) {
            console.error('Error subiendo CV a Cloudinary:', uploadErr);
            uploadWarning = uploadErr.message || 'Error subiendo CV';
          }
        }

        // Crear documento de pre-registro
        const preRegData = {
          fullName,
          email,
          role,
          program: mentorData.program,
          experience: mentorData.experience,
          specialization: mentorData.specialization,
          curriculumUrl: mentorData.curriculumUrl || null,
          createdAt: new Date(),
          status: 'pending'
        };
        await addDoc(collection(db, 'mentorPreRegistrations'), preRegData);

        // Enviar notificación al admin
        try {
          const settings = await settingsService.getRegistration();
          if (settings.adminEmail) {
            await emailService.sendEmail({
              to: settings.adminEmail,
              subject: 'Nuevo pre-registro de mentor pendiente de aprobación',
              text: `Un nuevo mentor se ha pre-registrado: ${fullName}. Especialización: ${mentorData.specialization}. Revisa el panel de administrador para aprobar.`,
              html: `<p>Un nuevo mentor se ha pre-registrado: <strong>${fullName}</strong>.</p><p>Especialización: ${mentorData.specialization}</p><p>Revisa el panel de administrador para aprobar el registro.</p>`
            });
          }
        } catch (emailErr) {
          console.error('Error enviando email de notificación:', emailErr);
        }

        return { preRegistered: true, uploadWarning };
      } else {
        // Registro normal para emprendedores
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await createUserProfileInFirestore(user.uid, fullName, role, program, null, email);

        try {
          await sendEmailVerification(user);
          console.log('Correo de verificación enviado');
        } catch (verErr) {
          console.error('Error enviando verificación:', verErr);
        }

        return { user: { uid: user.uid, email: user.email }, verificationSent: true };
      }
    } catch (error) {
      console.error('Error en signUp:', error);
      let errorMessage = 'Error al registrarse.';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'Este correo ya está registrado.';
      else if (error.code === 'auth/weak-password') errorMessage = 'La contraseña es muy débil.';
      throw new Error(errorMessage);
    }
  },

  // --- INICIO DE SESIÓN CON EXCEPCIÓN PARA ADMIN ---
  async signIn({ email, password }) {
    try {
      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verificar si es administrador mediante los Claims
      const idTokenResult = await user.getIdTokenResult();
      const isAdmin = !!idTokenResult.claims.admin;

      // Solo bloqueamos si NO es admin y NO ha verificado correo
      if (!isAdmin && !user.emailVerified) {
        await firebaseSignOut(auth);
        const error = new Error('Por favor verifica tu correo electrónico antes de entrar.');
        error.code = 'auth/email-not-verified';
        throw error;
      }

      return { user: { uid: user.uid, email: user.email, isAdmin } };
    } catch (error) {
      console.error('Error en signIn:', error);
      throw error;
    }
  },

  // --- OBTENER USUARIO ACTUAL (Añadido para App.js) ---
  async getCurrentUser() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          const sessionData = await this.getAdminStatus(user);
          resolve(sessionData);
        } else {
          resolve(null);
        }
      });
    });
  },

  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { ok: true };
    } catch (err) {
      console.error('Error en sendPasswordReset:', err);
      throw err;
    }
  },

  async resendVerification({ email, password }) {
    try {
      await setPersistence(auth, browserSessionPersistence);
      const uc = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(uc.user);
      await firebaseSignOut(auth);
      return { ok: true };
    } catch (err) {
      throw err;
    }
  },

  async signOut() {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw new Error("Error al cerrar sesión");
    }
  },

  async getUserProfile(userId) {
    try {
      const docSnap = await getDoc(doc(db, "userProfiles", userId));
      return docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
      return {};
    }
  },

  async getAdminStatus(user) {
    try {
      const idTokenResult = await user.getIdTokenResult(true);
      const isAdmin = !!idTokenResult.claims.admin;
      const profile = await this.getUserProfile(user.uid);
      return {
        uid: user.uid,
        email: user.email,
        isAdmin,
        role: profile?.role || (isAdmin ? 'admin' : 'usuario'),
        fullName: profile?.fullName || null,
      };
    } catch (error) {
      return { uid: user.uid, email: user.email, isAdmin: false, role: 'usuario' };
    }
  },

  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const sessionData = await this.getAdminStatus(user);
        callback('SIGNED_IN', { user: sessionData });
      } else {
        callback('SIGNED_OUT', null);
      }
    });
  }
};
