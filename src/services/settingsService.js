import { db } from './Firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const REG_DOC = doc(db, 'settings', 'registration');

export const settingsService = {
  async getRegistration() {
    try {
      const snap = await getDoc(REG_DOC);
      return snap.exists() ? snap.data() : { enabled: true, startDate: null, endDate: null, adminEmail: null };
    } catch (err) {
      console.error('settingsService.getRegistration error', err);
      // Si falla la lectura por permisos u otro error, devolvemos registro CERRADO por seguridad
      return { enabled: false, startDate: null, endDate: null, adminEmail: null, _error: err.message || 'get error' };
    }
  },

  async setRegistration({ enabled, startDate, endDate, adminEmail }) {
    try {
      // startDate/endDate may be Date or null
      await setDoc(REG_DOC, { enabled: !!enabled, startDate: startDate || null, endDate: endDate || null, adminEmail: adminEmail || null }, { merge: true });
      return true;
    } catch (err) {
      console.error('settingsService.setRegistration error', err);
      throw err;
    }
  },

  listenRegistration(cb) {
    try {
      return onSnapshot(REG_DOC, (snap) => {
        if (!snap.exists()) return cb({ enabled: true, startDate: null, endDate: null });
        cb(snap.data());
      }, (err) => {
        console.error('listenRegistration error', err);
        // En caso de error (p. ej. permisos), emitimos estado cerrado para que la app falle en modo seguro
        cb({ enabled: false, startDate: null, endDate: null, _error: err.message || 'listen error' });
      });
    } catch (err) {
      console.error('settingsService.listenRegistration error', err);
      cb({ enabled: false, startDate: null, endDate: null });
      return () => {};
    }
  }
};