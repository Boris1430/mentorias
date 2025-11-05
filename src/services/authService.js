import { auth, db } from './Firebase';

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut, 
    onAuthStateChanged,
} from 'firebase/auth';

import { 
    doc, 
    setDoc, 
    getDoc 
} from 'firebase/firestore';

/**
 * Crea el documento de perfil en Firestore al registrar un nuevo usuario.
 * @param {string} userId - El ID de Firebase del usuario (uid).
 * @param {string} fullName - Nombre completo del usuario.
 * @param {string} role - Rol asignado (mentor, emprendedor).
 */
const createUserProfileInFirestore = async (userId, fullName, role) => {
    const profileRef = doc(db, "userProfiles", userId);
    await setDoc(profileRef, {
        fullName: fullName,
        role: role,
        createdAt: new Date()
    });
};

export const authService = {
    async signUp({ email, password, fullName, role }) {
        if (role === 'admin') {
            throw new Error('No puedes registrarte como administrador');
        }

        if (!['emprendedor', 'mentor'].includes(role)) {
            throw new Error('Rol inválido');
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await createUserProfileInFirestore(user.uid, fullName, role);
            
            return { user: { uid: user.uid, email: user.email } };

        } catch (error) {
            let errorMessage = 'Error al registrarse.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este correo ya está registrado.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
            }
            throw new Error(errorMessage);
        }
    },

    async signIn({ email, password }) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            return { user: { uid: user.uid, email: user.email } };
        } catch (error) {
            let errorMessage = 'Credenciales incorrectas o usuario no encontrado.';
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                 errorMessage = 'Correo o contraseña incorrectos.';
            }
            throw new Error(errorMessage);
        }
    },

    async signOut() {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión de Firebase:", error);
            throw new Error('Error al cerrar sesión');
        }
    },

    async getCurrentUser() {
        return new Promise(resolve => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();
                resolve(user); 
            });
        });
    },

    async getUserProfile(userId) {
        try {
            const profileRef = doc(db, "userProfiles", userId);
            const docSnap = await getDoc(profileRef);
    
            if (docSnap.exists()) {
                const profileData = docSnap.data();
                return profileData;
            } 
            
            return { role: 'emprendedor', fullName: 'Usuario Desconocido' }; 
            
        } catch (error) {
            console.error("Error al obtener perfil de Firestore:", error);
            throw new Error('No se pudo cargar el perfil del usuario.');
        }
    },

    onAuthStateChange(callback) {
        return onAuthStateChanged(auth, (user) => {
            if (user) {
                const session = { user: { id: user.uid, email: user.email } };
                callback('SIGNED_IN', session);
            } else {
                callback('SIGNED_OUT', null);
            }
        });
    }
};
