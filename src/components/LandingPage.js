import React from 'react';
import { motion } from 'framer-motion';

const LandingPage = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
      <motion.div 
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-sky-600 bg-clip-text text-transparent">
            Innovug Mentorías
          </h1>
          <p className="text-gray-600">Conecta con mentores y acelera tu emprendimiento.</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={onRegister}
            className="w-full bg-gradient-to-r from-blue-500 to-sky-600 text-white py-3 px-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Registrarse Gratis
          </button>
          
          <button
            onClick={onLogin}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 px-4 rounded-2xl font-semibold hover:bg-gray-50 transition-all duration-300"
          >
            Iniciar Sesión
          </button>
        </div>
        
        <p className="text-center text-xs text-gray-500">
          © 2025 Centro de emprendimiento Innovug. Todos los derechos reservados.
        </p>
      </motion.div>
    </div>
  );
};

export default LandingPage;