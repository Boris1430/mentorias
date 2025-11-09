import { storage } from './Firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const storageService = {
  /**
   * @param file - El archivo a subir
   * @param userId - ID del usuario (para organizar los archivos)
   * @returns URL de descarga del archivo subido
   */
  async uploadPDF(file, userId) {
    if (!file) {
      throw new Error('No se seleccionó ningún archivo');
    }

    // Validar tipo de archivo
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]
    if (!validTypes.includes(file.type)) {
      throw new Error("Solo se permiten archivos PDF o Word")
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB en bytes
    if (file.size > maxSize) {
      throw new Error('El archivo no debe superar los 5MB');
    }

    try {
      // Crear referencia única con timestamp para evitar sobrescribir
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `curriculums/${userId}/${fileName}`);

      // Subir el archivo
      const snapshot = await uploadBytes(storageRef, file);
      console.log('[v0] Archivo subido exitosamente:', snapshot);

      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('[v0] URL de descarga:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error("[v0] Error al subir archivo:", error)
      throw new Error("Error al subir el archivo. Intenta nuevamente.")
    }
  },

  /**
   * Sube cualquier tipo de archivo
   * @param file - El archivo a subir
   * @param folder - Carpeta donde guardar el archivo
   * @param userId - ID del usuario
   * @returns URL de descarga del archivo
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
};
