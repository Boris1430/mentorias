import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCircle, Briefcase } from 'lucide-react';

const RegisterForm = ({ onRegister, onBack }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'emprendedor' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRoleSelect = (role) => {
    setFormData({ ...formData, role });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (formData.password.length < 6) {
      setError('Contrasena muy debil, minimo 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await onRegister(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          <h2 className="text-2xl font-bold text-gray-900">Unete a Innovug!</h2>
          <p className="text-gray-600">Crea tu cuenta y empieza a agendar mentorias.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Selecciona tu Rol</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleSelect('emprendedor')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  formData.role === 'emprendedor'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <UserCircle className={`w-8 h-8 mb-2 ${formData.role === 'emprendedor' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-semibold ${formData.role === 'emprendedor' ? 'text-blue-600' : 'text-gray-600'}`}>
                  Emprendedor
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('mentor')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  formData.role === 'mentor'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <Briefcase className={`w-8 h-8 mb-2 ${formData.role === 'mentor' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-semibold ${formData.role === 'mentor' ? 'text-blue-600' : 'text-gray-600'}`}>
                  Mentor
                </span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Tu nombre aqui"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Minimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-sky-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Registrarse
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full text-blue-600 py-2 text-sm font-medium hover:underline"
        >
          Ya tienes cuenta? Inicia sesion
        </button>
      </motion.div>
    </div>
  );
};

export default RegisterForm;