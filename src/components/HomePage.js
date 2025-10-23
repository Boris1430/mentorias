import React from 'react';

const HomePage = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bienvenido, {user.name}</h1>
              <p className="text-gray-600">Dashboard de Mentorías Innovug</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-600 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-sky-600 text-white p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">Próximas Mentorías</h3>
              <p className="text-blue-100">0 agendadas</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-sky-600 text-white p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">Mentores Disponibles</h3>
              <p className="text-blue-100">Explora perfiles</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-sky-600 text-white p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">Tu Progreso</h3>
              <p className="text-blue-100">Inicia tu viaje emprendedor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;