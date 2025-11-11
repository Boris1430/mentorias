import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, Briefcase, Settings } from 'lucide-react';
import { db } from '../services/Firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// Chart.js
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = ({ user, profile, onLogout }) => {
  const [stats, setStats] = useState({ emprendedores: 0, mentores: 0, total: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const roleChartData = {
    labels: ['Emprendedores', 'Mentores', 'Admins'],
    datasets: [
      {
        label: 'Usuarios por rol',
        data: [stats.emprendedores || 0, stats.mentores || 0, (stats.total - ((stats.emprendedores || 0) + (stats.mentores || 0))) || 0],
        backgroundColor: ['#34d399', '#fb923c', '#f87171'],
      },
    ],
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
  // La colección real creada por el flujo de registro es 'userProfiles'
  const q = query(collection(db, 'userProfiles'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setUsers(data || []);
      const emprendedores = data?.filter(u => u.role === 'emprendedor').length || 0;
      const mentores = data?.filter(u => u.role === 'mentor').length || 0;
      setStats({ emprendedores, mentores, total: data?.length || 0 });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Administrador</h1>
              <p className="text-gray-600">Bienvenido, {profile?.full_name}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-500 text-white px-6 py-2 rounded-xl font-semibold hover:bg-red-600 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-sky-600 text-white p-6 rounded-2xl">
              <Users className="w-10 h-10 mb-3" />
              <h3 className="text-2xl font-bold">{stats.total}</h3>
              <p className="text-blue-100">Usuarios Totales</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-2xl">
              <UserCheck className="w-10 h-10 mb-3" />
              <h3 className="text-2xl font-bold">{stats.emprendedores}</h3>
              <p className="text-green-100">Emprendedores</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-6 rounded-2xl">
              <Briefcase className="w-10 h-10 mb-3" />
              <h3 className="text-2xl font-bold">{stats.mentores}</h3>
              <p className="text-orange-100">Mentores</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Usuarios Registrados
            </h2>
            <div className="mb-6">
              <Bar data={roleChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
            {loading ? (
              <p className="text-gray-500">Cargando usuarios...</p>
            ) : users.length === 0 ? (
              <p className="text-gray-500">No hay usuarios registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Nombre</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Rol</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                        <td className="py-3 px-4">{u.full_name}</td>
                        <td className="py-3 px-4 text-gray-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            u.role === 'admin' ? 'bg-red-100 text-red-700' :
                            u.role === 'mentor' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
