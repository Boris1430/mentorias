import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './Firebase';

const functions = getFunctions(app, 'us-east1');

export const emailService = {
  // Para la pestaña de "Aprobación Mentores"
  async approveMentor(email) {
    const callable = httpsCallable(functions, 'approveMentor');
    return await callable({ email });
  },

  // Para el botón de "Iniciar Reunión" y enviar el link de Meet
  async sendEmail({ to, subject, html }) {
    const callable = httpsCallable(functions, 'sendNotificationEmail');
    return await callable({ to, subject, html });
  }
};