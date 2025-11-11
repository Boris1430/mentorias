import { storage } from './Firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const storageService = {
  /**
   * @param file 
   * @param userId 
   * @returns 
   */
  async uploadPDF(file, userId) {
    if (!file) {
      throw new Error('No se seleccionó ningún archivo');
    }

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]
    if (!validTypes.includes(file.type)) {
      throw new Error("Solo se permiten archivos PDF o Word")
    }

    const maxSize = 5 * 1024 * 1024; // 5MB en bytes
    if (file.size > maxSize) {
      throw new Error('El archivo no debe superar los 5MB');
    }

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `curriculums/${userId}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      console.log('[v0] Archivo subido exitosamente:', snapshot);

      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('[v0] URL de descarga:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error("[v0] Error al subir archivo:", error)
      throw new Error("Error al subir el archivo. Intenta nuevamente.")
    }
  },

  /**
   * @param file 
   * @param folder 
   * @param userId 
   * @returns 
   */
  async uploadFile(file, folder, userId) {
    if (!file) {
      throw new Error('No se seleccionó ningún archivo');
    }

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `${folder}/${userId}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error) {
      console.error('[v0] Error al subir archivo:', error);
      throw new Error('Error al subir el archivo');
    }
  },

  /**
   * Sube un archivo a Cloudinary usando un upload_preset (unsigned).
   * Devuelve la URL segura (https) del recurso si tiene éxito.
   * Opcionalmente se puede pasar cloudName y uploadPreset. Por defecto usa los valores del proyecto.
   */
  async uploadToCloudinary(file, { cloudName = 'ds9dou6h5', uploadPreset = 'Mentorias_Innovug' } = {}) {
    if (!file) throw new Error('No se seleccionó ningún archivo para subir a Cloudinary');

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
      throw new Error('Solo se permiten archivos PDF o Word');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) throw new Error('El archivo no debe superar los 5MB');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Cloudinary upload error:', data);
        throw new Error(data.error?.message || 'Error al subir a Cloudinary');
      }

      return data.secure_url || data.url || null;
    } catch (error) {
      console.error('Error en uploadToCloudinary:', error);
      throw new Error('No se pudo subir el archivo a Cloudinary');
    }
  },
};
