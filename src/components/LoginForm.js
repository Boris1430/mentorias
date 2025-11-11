import React, { useState } from 'react';
import { authService } from '../services/authService';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

const LoginForm = ({ onLogin, onBack }) => {
  const [formData, setFormData] = useState({ email: '', password: ''});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Email y contraseña requeridos');
      return;
    }
    setLoading(true);
    try {
      await onLogin(formData);
      // if login successful, ensure UI resets
      setUnverified(false);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      if (err && err.code === 'auth/email-not-verified') {
        setUnverified(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const email = resetEmail || formData.email;
    if (!email) return setError('Ingresa tu correo para enviar el enlace de reestablecimiento');
    try {
      await authService.sendPasswordReset(email);
      alert('Se ha enviado un enlace para restablecer tu contraseña. Revisa tu correo.');
      setShowReset(false);
    } catch (err) {
      console.error('sendPasswordReset error', err);
      setError(err.message || 'Error enviando enlace de restablecimiento');
    }
  };

  const handleResendVerification = async () => {
    // we will attempt to resend verification using the provided credentials in the form
    if (!formData.email || !formData.password) return setError('Ingresa correo y contraseña para reenviar verificación');
    try {
      await authService.resendVerification({ email: formData.email, password: formData.password });
      alert('Correo de verificación reenviado. Revisa tu bandeja de entrada.');
      setUnverified(false);
    } catch (err) {
      console.error('resendVerification error', err);
      setError(err.message || 'Error reenviando verificación');
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
      <motion.div 
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Bienvenido de vuelta</h2>
          <p className="text-gray-600">Inicia sesion para acceder a tus mentorias.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="tunombre@email.com"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Tu contraseña"
            />
            <button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(s => !s)} className="absolute inset-y-0 right-3 flex items-center text-gray-500">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-sky-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesion'}
          </button>
        </form>

        <div className="flex justify-between items-center mt-2">
          <button type="button" onClick={() => setShowReset(true)} className="text-sm text-blue-600 hover:underline">¿Olvidaste tu contraseña?</button>
          {unverified && (
            <button type="button" onClick={handleResendVerification} className="text-sm text-yellow-600 hover:underline">Reenviar verificación</button>
          )}
        </div>

        {showReset && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo para reestablecer contraseña</label>
            <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="tuemail@ejemplo.com" />
            <div className="mt-2 flex gap-2">
              <button onClick={handleSendPasswordReset} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Enviar enlace</button>
              <button onClick={() => setShowReset(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
            </div>
          </div>
        )}

        <button
          onClick={onBack}
          className="w-full text-blue-600 py-2 text-sm font-medium hover:underline"
        >
          No tienes cuenta? Registrate
        </button>
      </motion.div>
    </div>
  );
};

export default LoginForm;