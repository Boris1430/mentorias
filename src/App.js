import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import RegisterForm from './components/RegisterForm';
import { settingsService } from './services/settingsService';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import EmprendedorDashboard from './components/EmprendedorDashboard';
import MentorDashboard from './components/MentorDashboard';
import { authService } from './services/authService';
import AutoLogout from './components/AutoLogout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentView, setCurrentView] = useState('landing');
  const [loading, setLoading] = useState(true);
  const [registrationSettings, setRegistrationSettings] = useState({ enabled: false, startDate: null, endDate: null });

  const isRegistrationOpen = (settings = registrationSettings) => {
    try {
      const now = new Date();
      if (settings.enabled) return true;
      const start = settings.startDate && settings.startDate.seconds ? new Date(settings.startDate.seconds * 1000) : (settings.startDate ? new Date(settings.startDate) : null);
      const end = settings.endDate && settings.endDate.seconds ? new Date(settings.endDate.seconds * 1000) : (settings.endDate ? new Date(settings.endDate) : null);
      if (start && end) return now >= start && now <= end;
      if (start && !end) return now >= start;
      if (!start && end) return now <= end;
      return false;
    } catch (err) {
      // En caso de error con la configuración, fallamos en modo seguro (registro cerrado)
      return false;
    }
  };

  useEffect(() => {
    // Escuchar cambios de autenticación en tiempo real
    const unsubscribe = authService.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setUserProfile(null);
        setCurrentView('landing');
        setLoading(false);
      }
    });

    // Verificación inicial
    checkAuthStatus();

    // Obtener configuración inicial y escuchar cambios en settings de registro
    (async () => {
      try {
        const initial = await settingsService.getRegistration();
        setRegistrationSettings(initial || { enabled: false, startDate: null, endDate: null });
      } catch (err) {
        console.error('Error fetching registration settings:', err);
        setRegistrationSettings({ enabled: false, startDate: null, endDate: null });
      }
    })();

    const unsubSettings = settingsService.listenRegistration((s) => {
      const st = s || { enabled: false, startDate: null, endDate: null };
      setRegistrationSettings(st);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubSettings === 'function') unsubSettings();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        await loadUserData(user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUserData = async (user, expectedRole = null) => {    
    try {
      // Simplificación de extracción de ID para evitar nulos
      const userId = user.uid || user.id;
      const email = user.email;
      
      if (!userId) return null;

      // Obtener el perfil desde Firestore
      const profile = await authService.getUserProfile(userId);

      // Si no hay perfil en la DB, creamos uno básico basado en el registro
      const mergedProfile = { 
        uid: userId, // Aseguramos que el uid esté en el perfil
        email: email,
        ...profile 
      };

      // Lógica de roles
      if (!mergedProfile.role) {
        mergedProfile.role = expectedRole || 'emprendedor';
      }
      
      console.log('[DEBUG loadUserData] Usuario cargado:', mergedProfile.role, 'ID:', userId);

      setCurrentUser({ id: userId, email });
      setUserProfile(mergedProfile);
      setIsAuthenticated(true);
      setCurrentView('home');
      setLoading(false); // Finaliza la carga aquí también
      return mergedProfile;
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
      return null;
    }
  };

  const handleRegister = async (data) => {
    try {
      const result = await authService.signUp({
        email: data.email,
        password: data.password,
        fullName: data.name,
        role: data.role,
        program: data.programType || data.mentorProgramType,
        mentorData: {
          experience: data.experience,
          program: data.mentorProgramType,
          specialization: data.specialization,
          curriculum: data.curriculum
        }
      });

      if (result.preRegistered) {
        alert('Tu pre-registro como mentor ha sido enviado. El administrador revisará tu solicitud y te notificará cuando sea aprobado.');
        setCurrentView('landing'); // Volver a landing
      } else if (result.user) {
        await loadUserData(result.user, data.role);
        if (result.verificationSent) {
          alert('Revisa tu correo para verificar tu cuenta.');
        }
      }
      if (result.uploadWarning) {
        alert(`Registro exitoso, pero hubo un problema subiendo el CV: ${result.uploadWarning}`);
      }
    } catch (error) {
      alert(error.message || 'Error al registrarse');
    }
  };

  const handleLogin = async (data) => {
    try {
      const result = await authService.signIn({
        email: data.email,
        password: data.password
      });
      if (result.user) {
        await loadUserData(result.user);
      }
    } catch (error) {
      alert('Credenciales incorrectas o error de conexión');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const renderDashboard = () => {
    if (!userProfile) return <div className="p-10 text-center">Cargando perfil...</div>;

    // Aseguramos que pasamos el ID correcto al dashboard
    const userData = { ...currentUser, ...userProfile };

    switch (userProfile.role) {
      case 'admin':
        return <AdminDashboard user={userData} profile={userProfile} onLogout={handleLogout} />;
      case 'mentor':
        return <MentorDashboard user={userData} profile={userProfile} onLogout={handleLogout} />;
      case 'emprendedor':
        return <EmprendedorDashboard user={userData} profile={userProfile} onLogout={handleLogout} />;
      default:
        return <Navigate to="/" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              currentView === 'landing' ? (
                <LandingPage onRegister={() => {
                  if (!isRegistrationOpen()) {
                    alert('El registro está cerrado actualmente. Por favor inténtalo más tarde.');
                    return;
                  }
                  setCurrentView('register');
                }} onLogin={() => setCurrentView('login')} />
              ) : currentView === 'register' ? (
                <RegisterForm onRegister={handleRegister} onBack={() => setCurrentView('landing')} registrationOpen={isRegistrationOpen()} registrationSettings={registrationSettings} />
              ) : (
                <LoginForm onLogin={handleLogin} onBack={() => setCurrentView('landing')} />
              )
            ) : (
              <Navigate to="/home" />
            )
          }
        />
        <Route
          path="/home"
          element={isAuthenticated ? <><AutoLogout />{renderDashboard()}</> : <Navigate to="/" />}
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/"} />} />
      </Routes>
    </Router>
  );
}

export default App;