import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './Firebase';

const functions = getFunctions(app, 'us-east1');

export const aiService = {
  // 1. Recomendaciones (Emprendedor)
  async recommendProject({ description, programType }) {
    const callable = httpsCallable(functions, 'getAIRecommendations');
    const result = await callable({ description, programType });
    return result.data.summary || result.data.recommendations;
  },

  // 2. Resumen (Admin)
  async summarizeMeeting({ transcript, meetingInfo }) {
    const callable = httpsCallable(functions, 'summarizeMeeting');
    const result = await callable({ transcript, meetingInfo });
    return result.data.summary;
  },

  // 3. Transcripción (Admin) - Aquí ocurre la conversión a Base64
  async transcribeAudio(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file); // Leemos el archivo de audio
      
      reader.onload = async () => {
        try {
          // Extraemos la cadena Base64 pura
          const base64 = reader.result.split(',')[1];
          
          const callable = httpsCallable(functions, 'transcribeAudio');
          const result = await callable({ 
            fileBase64: base64, 
            fileName: file.name 
          });
          
          resolve(result.data.transcript);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  }
};
