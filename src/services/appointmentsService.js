import { db } from './Firebase';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

export const appointmentsService = {
  async addAvailabilitySlot(mentorId, slot) {
    const ref = collection(db, `mentors/${mentorId}/availability`);
    const res = await addDoc(ref, { ...slot, createdAt: serverTimestamp() });
    return res.id;
  },

  async removeAvailabilitySlot(mentorId, slotId) {
    const ref = doc(db, `mentors/${mentorId}/availability`, slotId);
    await setDoc(ref, { deleted: true }, { merge: true });
  },

  listenAvailability(mentorId, cb) {
    const ref = collection(db, `mentors/${mentorId}/availability`);
    const q = query(ref, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      const slots = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.deleted) return;
        slots.push({ id: d.id, ...data });
      });
      cb(slots);
    });
  },

  async requestAppointment({ mentorId, emprendedorId, slot, reason }) {
    const ref = collection(db, 'appointments');
    const docRef = await addDoc(ref, {
      mentorId,
      emprendedorId,
      slot,
      reason: reason || null,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'notifications'), {
      userId: mentorId,
      type: 'appointment_request',
      appointmentId: docRef.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  },

  listenAppointmentsForUser(userId, role, cb) {
    const ref = collection(db, 'appointments');
    let q;
    if (role === 'mentor') q = query(ref, where('mentorId', '==', userId), orderBy('createdAt', 'desc'));
    else if (role === 'emprendedor') q = query(ref, where('emprendedorId', '==', userId), orderBy('createdAt', 'desc'));
    else q = query(ref, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snap) => {
      const appts = [];
      snap.forEach((d) => appts.push({ id: d.id, ...d.data() }));
      cb(appts);
    });
  },

  async updateAppointmentStatus(appointmentId, updates) {
    const ref = doc(db, 'appointments', appointmentId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });

    // Read the updated appointment to create notifications for involved parties
    const apptSnap = await getDoc(ref);
    if (!apptSnap.exists()) return;
    const appt = apptSnap.data();

    const status = updates.status;
    let type = 'appointment_update';
    let message = 'La cita ha sido actualizada';

    if (status === 'confirmed') {
      type = 'appointment_confirmed';
      message = 'Tu cita ha sido confirmada';
    } else if (status === 'cancelled') {
      type = 'appointment_cancelled';
      message = 'La cita ha sido cancelada';
    } else if (status === 'reschedule_requested') {
      type = 'appointment_reschedule_requested';
      message = 'Se ha solicitado reprogramar la cita';
    } else if (status === 'completed') {
      type = 'appointment_completed';
      message = 'La cita ha sido marcada como completada';
    }

    // Create notifications for both mentor and emprendedor so both sides are informed.
    try {
      if (appt.emprendedorId) {
        await addDoc(collection(db, 'notifications'), {
          userId: appt.emprendedorId,
          type,
          appointmentId,
          message,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      if (appt.mentorId) {
        await addDoc(collection(db, 'notifications'), {
          userId: appt.mentorId,
          type,
          appointmentId,
          message,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Error creando notificación:', err);
    }
  },

  listenNotifications(userId, cb) {
    const ref = collection(db, 'notifications');
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const notes = [];
      snap.forEach(d => notes.push({ id: d.id, ...d.data() }));
      cb(notes);
    });
  },

  async markNotificationRead(notificationId) {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, { read: true });
  },
};
