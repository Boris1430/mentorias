import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import HomePage from './components/HomePage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'register', 'login'

  const handleRegister = (data) => {
    // Simulate success - in real: supabase.auth.signUp({ email: data.email, password: data.password }).then((res) => { setCurrentUser({ ...data, id: res.user.id }); setIsAuthenticated(true); });
    setCurrentUser({ name: data.name, email: data.email });
    setIsAuthenticated(true);
    setCurrentView('home');
  };

  const handleLogin = (data) => {
    // Simulate success - in real: supabase.auth.signInWithPassword({ email: data.email, password: data.password }).then((res) => { setCurrentUser({ email: data.email, name: 'Usuario' }); setIsAuthenticated(true); });
    setCurrentUser({ name: 'Usuario Ejemplo', email: data.email });
    setIsAuthenticated(true);
    setCurrentView('home');
  };

  const handleLogout = () => {
    // In real: supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('landing');
  };

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
              <HomePage user={currentUser} onLogout={handleLogout} />
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