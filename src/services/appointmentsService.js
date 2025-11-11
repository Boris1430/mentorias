import { db } from './Firebase';
import { emailService } from './emailService';
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
  // --- GESTIÓN DE DISPONIBILIDAD (MENTOR) ---
  
  async addAvailabilitySlot(mentorId, slot) {
    if (!mentorId) {
      console.error("Error: mentorId no definido.");
      throw new Error("ID de mentor no encontrado.");
    }

    try {
      const ref = collection(db, 'mentors', mentorId, 'availability');
      const res = await addDoc(ref, { 
        ...slot, 
        mentorId: mentorId,
        deleted: false, 
        createdAt: serverTimestamp() 
      });
      return res.id;
    } catch (error) {
      console.error("Error en addAvailabilitySlot:", error);
      throw error;
    }
  },

  listenAvailability(mentorId, cb) {
    if (!mentorId) return () => {};

    const ref = collection(db, 'mentors', mentorId, 'availability');
    // Esta consulta REQUIERE un índice en Firebase
    const q = query(
      ref, 
      where('deleted', '==', false), 
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (snap) => {
      const slots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cb(slots);
    }, (error) => {
      console.error("Error en listenAvailability:", error);
    });
  },

  async removeAvailabilitySlot(mentorId, slotId) {
    const ref = doc(db, 'mentors', mentorId, 'availability', slotId);
    await updateDoc(ref, { deleted: true });
  },

  // --- GESTIÓN DE CITAS ---

  async requestAppointment({ mentorId, emprendedorId, slot, reason, emprendedorEmail, emprendedorName, tipoMentoria }) {
    const ref = collection(db, 'appointments');
    let mentorEmail = null;
    let mentorName = null;

    try {
      const mentorRef = doc(db, 'userProfiles', mentorId);
      const mentorSnap = await getDoc(mentorRef);
      if (mentorSnap.exists()) {
        mentorEmail = mentorSnap.data().email;
        mentorName = mentorSnap.data().fullName || mentorSnap.data().email || null;
      }
    } catch (err) {
      console.warn('No se pudo obtener datos del mentor para el correo');
    }

    const docRef = await addDoc(ref, {
      mentorId,
      mentorEmail: mentorEmail || null,
      emprendedorId,
      emprendedorEmail: emprendedorEmail || null,
      emprendedorName: emprendedorName || 'Emprendedor',
      slot,
      reason: reason || 'Mentoría solicitada',
      tipoMentoria: tipoMentoria || null,
      status: 'pending',
      deleted: false,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'notifications'), {
      userId: mentorId,
      type: 'appointment_request',
      appointmentId: docRef.id,
      message: `Nueva solicitud de cita de ${emprendedorName}.`,
      read: false,
      createdAt: serverTimestamp(),
    });

    // Enviar email al mentor notificando la nueva solicitud (no bloqueante)
    if (mentorEmail) {
      try {
        const appUrl = process.env.REACT_APP_APP_URL || 'http://localhost:3000';
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#111827">
            <h2 style="color:#0ea5e9;margin-bottom:6px">Nueva solicitud de mentoría</h2>
            <p>Hola ${mentorName || mentorEmail},</p>
            <p>Has recibido una nueva solicitud de mentoría con los siguientes datos:</p>
            <ul>
              <li><strong>Solicitante:</strong> ${emprendedorName}</li>
              <li><strong>Fecha:</strong> ${slot?.date || 'N/A'} ${slot?.start ? `(${slot.start} - ${slot.end})` : ''}</li>
              <li><strong>Motivo:</strong> ${reason || '—'}</li>
              <li><strong>ID de cita:</strong> ${docRef.id}</li>
            </ul>
            <p><a href="${appUrl}/home" style="display:inline-block;background:#0ea5e9;color:#fff;padding:8px 12px;border-radius:6px;text-decoration:none">Ver solicitud en el panel</a></p>
            <p style="color:#6b7280;font-size:12px;margin-top:8px">No responda este correo. Para soporte, contacte al equipo de Innovug.</p>
          </div>
        `;

        emailService.sendEmail({
          to: mentorEmail,
          subject: `Nueva solicitud de cita - ${emprendedorName}`,
          html,
        }).catch(err => console.error('Error enviando email mentor:', err));
      } catch (err) {
        console.error('Error preparando email mentor:', err);
      }
    }

    return docRef.id;
  },

  listenAppointmentsForUser(userId, role, cb) {
    if (!userId || !role) return () => {};

    const ref = collection(db, 'appointments');
    let q;

    if (role === 'mentor') {
      q = query(ref, where('mentorId', '==', userId), where('deleted', '==', false), orderBy('createdAt', 'desc'));
    } else {
      q = query(ref, where('emprendedorId', '==', userId), where('deleted', '==', false), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, (snap) => {
      const appts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cb(appts);
    }, (error) => {
      console.error("Error en listenAppointments:", error);
    });
  },

  // --- NOTIFICACIONES (LA FUNCIÓN QUE FALTABA) ---

  listenNotifications(userId, cb) {
    if (!userId) return () => {};
    const ref = collection(db, 'notifications');
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snap) => {
      const notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cb(notes);
    }, (err) => {
      console.error("Error en listenNotifications:", err);
    });
  },

  async markNotificationRead(notificationId) {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, { read: true });
  },

  async updateAppointmentStatus(appointmentId, updates) {
    const ref = doc(db, 'appointments', appointmentId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });

    // Obtener la cita actualizada para enviar notificaciones y correos
    try {
      const apptSnap = await getDoc(ref);
      if (!apptSnap.exists()) return;
      const appt = apptSnap.data();

      // Mensaje legible
      let message = `Tu cita ha cambiado a estado: ${updates.status}`;
      if (updates.status === 'confirmed') message = '¡Tu cita ha sido confirmada por el mentor!';
      if (updates.status === 'cancelled') message = 'La cita ha sido cancelada.';

      // Notificar in-app a ambos
      const usersToNotify = [appt.emprendedorId, appt.mentorId].filter(uid => uid != null);
      for (const uid of usersToNotify) {
        addDoc(collection(db, 'notifications'), {
          userId: uid,
          type: 'status_change',
          appointmentId,
          message,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(err => console.error('Error creando notificación:', err));
      }

      // Enviar email al emprendedor si su correo existe
      const emprendedorEmail = appt.emprendedorEmail;
      const mentorName = appt.mentorName || appt.mentorEmail || 'tu mentor';
      const slotInfo = appt.slot ? `${appt.slot.date} (${appt.slot.start || ''} - ${appt.slot.end || ''})` : 'Fecha no especificada';

      if (emprendedorEmail && updates.status === 'confirmed') {
        const meetingLink = appt.meet?.hangoutLink || appt.meet?.conferenceData?.entryPoints?.[0]?.uri || null;
        const appUrl = process.env.REACT_APP_APP_URL || 'http://localhost:3000';
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#111827">
            <h2 style="color:#10b981;margin-bottom:6px">Tu cita ha sido confirmada</h2>
            <p>Hola ${appt.emprendedorName || emprendedorEmail},</p>
            <p>Tu cita con <strong>${mentorName}</strong> ha sido <strong>confirmada</strong>.</p>
            <ul>
              <li><strong>Fecha:</strong> ${slotInfo}</li>
              <li><strong>Motivo:</strong> ${appt.reason || '—'}</li>
              ${meetingLink ? `<li><strong>Enlace reunión:</strong> <a href="${meetingLink}">${meetingLink}</a></li>` : ''}
              <li><strong>ID de cita:</strong> ${appointmentId}</li>
            </ul>
            <p><a href="${appUrl}/home" style="display:inline-block;background:#10b981;color:#fff;padding:8px 12px;border-radius:6px;text-decoration:none">Ver en el panel</a></p>
            <p style="color:#6b7280;font-size:12px;margin-top:8px">Gracias por usar Innovug.</p>
          </div>
        `;
        emailService.sendEmail({ to: emprendedorEmail, subject: 'Tu cita ha sido confirmada - Innovug', html }).catch(err => console.error('Error enviando email confirmación:', err));
      }

      if (emprendedorEmail && updates.status === 'cancelled') {
        const appUrl = process.env.REACT_APP_APP_URL || 'http://localhost:3000';
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#111827">
            <h2 style="color:#f97316;margin-bottom:6px">Cita cancelada</h2>
            <p>Hola ${appt.emprendedorName || emprendedorEmail},</p>
            <p>Tu cita con <strong>${mentorName}</strong> ha sido <strong>cancelada</strong>.</p>
            <p><strong>Motivo:</strong> <em>${updates.cancelReason || appt.cancelReason || 'Sin motivo registrado'}</em></p>
            <p><a href="${appUrl}/home" style="display:inline-block;background:#f97316;color:#fff;padding:8px 12px;border-radius:6px;text-decoration:none">Ver en el panel y reagendar</a></p>
            <p style="color:#6b7280;font-size:12px;margin-top:8px">Si necesitas ayuda, contacta al equipo de Innovug.</p>
          </div>
        `;
        emailService.sendEmail({ to: emprendedorEmail, subject: 'Tu cita ha sido cancelada - Innovug', html }).catch(err => console.error('Error enviando email cancelación:', err));
      }

      // Notificar por correo al mentor que la cita fue cancelada
      const mentorEmailAddr = appt.mentorEmail;
      if (mentorEmailAddr && updates.status === 'cancelled') {
        try {
          const appUrl = process.env.REACT_APP_APP_URL || 'http://localhost:3000';
          const htmlMentor = `
            <div style="font-family:Arial,Helvetica,sans-serif;color:#111827">
              <h2 style="color:#f97316;margin-bottom:6px">Cita cancelada</h2>
              <p>Hola ${appt.mentorName || mentorEmailAddr},</p>
              <p>La cita con <strong>${appt.emprendedorName || appt.emprendedorEmail}</strong> programada para <strong>${slotInfo}</strong> ha sido <strong>cancelada</strong>.</p>
              <p><strong>Motivo:</strong> <em>${updates.cancelReason || appt.cancelReason || 'Sin motivo registrado'}</em></p>
              <p><strong>ID de cita:</strong> ${appointmentId}</p>
              <p><a href="${appUrl}/home" style="display:inline-block;background:#f97316;color:#fff;padding:8px 12px;border-radius:6px;text-decoration:none">Ver en el panel</a></p>
              <p style="color:#6b7280;font-size:12px;margin-top:8px">Si deseas contactar al emprendedor, revisa la sección de reuniones en la plataforma.</p>
            </div>
          `;
          emailService.sendEmail({ to: mentorEmailAddr, subject: `Cita cancelada - ${appt.emprendedorName || appt.emprendedorEmail}`, html: htmlMentor }).catch(err => console.error('Error enviando email cancelación mentor:', err));
        } catch (err) {
          console.error('Error preparando email cancelación mentor:', err);
        }
      }
    } catch (err) {
      console.error('Error en updateAppointmentStatus post-update:', err);
    }
  }
};