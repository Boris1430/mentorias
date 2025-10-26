import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import EmprendedorDashboard from './components/EmprendedorDashboard';
import MentorDashboard from './components/MentorDashboard';
import { authService } from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentView, setCurrentView] = useState('landing');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        loadUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setUserProfile(null);
        setCurrentView('landing');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
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

  const loadUserData = async (user) => {
    try {
      const profile = await authService.getUserProfile(user.id);
      setCurrentUser(user);
      setUserProfile(profile);
      setIsAuthenticated(true);
      setCurrentView('home');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleRegister = async (data) => {
    try {
      const result = await authService.signUp({
        email: data.email,
        password: data.password,
        fullName: data.name,
        role: data.role
      });
      if (result.user) {
        await loadUserData(result.user);
      }
    } catch (error) {
      throw new Error(error.message || 'Error al registrarse');
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
      throw new Error('Credenciales incorrectas');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setUserProfile(null);
      setCurrentView('landing');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const renderDashboard = () => {
    if (!userProfile) return null;

    switch (userProfile.role) {
      case 'admin':
        return <AdminDashboard user={currentUser} profile={userProfile} onLogout={handleLogout} />;
      case 'mentor':
        return <MentorDashboard user={currentUser} profile={userProfile} onLogout={handleLogout} />;
      case 'emprendedor':
        return <EmprendedorDashboard user={currentUser} profile={userProfile} onLogout={handleLogout} />;
      default:
        return <Navigate to="/" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              currentView === 'landing' ? (
                <LandingPage
                  onRegister={() => setCurrentView('register')}
                  onLogin={() => setCurrentView('login')}
                />
              ) : currentView === 'register' ? (
                <RegisterForm
                  onRegister={handleRegister}
                  onBack={() => setCurrentView('landing')}
                />
              ) : (
                <LoginForm
                  onLogin={handleLogin}
                  onBack={() => setCurrentView('landing')}
                />
              )
            ) : (
              <Navigate to="/home" />
            )
          }
        />
        <Route
          path="/home"
          element={
            isAuthenticated ? (
              renderDashboard()
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/"} />} />
      </Routes>
    </Router>
  );
}

export default App;