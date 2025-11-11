import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './Firebase'; 

const functions = getFunctions(app, 'us-east1');

export const meetService = {
  async createEvent({ summary, description, startTime, endTime, attendees = [] } = {}) {
    try {
      const createCalendarEvent = httpsCallable(functions, 'createCalendarEvent');
      
      const response = await createCalendarEvent({
        summary,
        description,
        startTime,
        endTime,
        attendees
      });

      if (!response.data || !response.data.ok) {
        throw new Error('Error al crear el evento en Google Calendar');
      }
      
      return response.data.event;
    } catch (err) {
      console.error('meetService.createEvent error:', err);
      throw err;
    }
  },
};