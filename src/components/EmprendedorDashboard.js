import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Target, TrendingUp } from 'lucide-react';

const EmprendedorDashboard = ({ user, profile, onLogout }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hola, {profile?.full_name}</h1>
              <p className="text-gray-600">Panel de Emprendedor</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-500 text-white px-6 py-2 rounded-xl font-semibold hover:bg-red-600 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-sky-600 text-white p-6 rounded-2xl">
              <Calendar className="w-8 h-8 mb-3" />
              <h3 className="text-2xl font-bold">0</h3>
              <p className="text-blue-100">Próximas Mentorías</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-2xl">
              <Users className="w-8 h-8 mb-3" />
              <h3 className="text-2xl font-bold">0</h3>
              <p className="text-green-100">Mentores Activos</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-6 rounded-2xl">
              <Target className="w-8 h-8 mb-3" />
              <h3 className="text-2xl font-bold">0</h3>
              <p className="text-orange-100">Objetivos Cumplidos</p>
            </div>
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white p-6 rounded-2xl">
              <TrendingUp className="w-8 h-8 mb-3" />
              <h3 className="text-2xl font-bold">0%</h3>
              <p className="text-violet-100">Progreso Total</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Próximas Sesiones</h2>
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tienes sesiones agendadas</p>
                <button className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-600 transition-all">
                  Buscar Mentores
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tu Progreso</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Plan de Negocios</span>
                    <span className="text-sm font-medium text-gray-700">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Estrategia de Marketing</span>
                    <span className="text-sm font-medium text-gray-700">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Desarrollo de Producto</span>
                    <span className="text-sm font-medium text-gray-700">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EmprendedorDashboard;