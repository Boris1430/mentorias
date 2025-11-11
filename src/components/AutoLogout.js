import { useEffect, useRef } from 'react';
import { authService } from '../services/authService';

const AutoLogout = () => {
  const timerRef = useRef(null);
  
  // 5 minutos en milisegundos
  const INACTIVITY_TIME = 5 * 60 * 1000; 

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(async () => {
      try {
        await authService.signOut();
        alert("Tu sesión ha expirado por inactividad. Por seguridad, vuelve a iniciar sesión.");
        window.location.reload(); // Recarga para limpiar el estado de la App
      } catch (err) {
        console.error("Error en auto-logout", err);
      }
    }, INACTIVITY_TIME);
  };

  useEffect(() => {
    // Eventos que reinician el contador de inactividad
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    resetTimer(); // Iniciar contador

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return null;
};

export default AutoLogout;