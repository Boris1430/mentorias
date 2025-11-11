import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Users, Award, Clock, PlusCircle, Trash2, Bell, Home, ListChecks, CheckCircle
} from 'lucide-react';
import Sidebar from './Sidebar';
import { appointmentsService } from '../services/appointmentsService';

const MentorDashboard = ({ profile, onLogout }) => {
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [newSlot, setNewSlot] = useState({ date: '', start: '', end: '' });
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const section = document.getElementById(id);
    if (section) {
      window.scrollTo({ top: section.offsetTop - 40, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubAvail = appointmentsService.listenAvailability(profile.uid, setAvailability);
    const unsubAppts = appointmentsService.listenAppointmentsForUser(profile.uid, 'mentor', setAppointments);
    const unsubNotif = appointmentsService.listenNotifications(profile.uid, setNotifications);

    return () => {
      unsubAvail && unsubAvail();
      unsubAppts && unsubAppts();
      unsubNotif && unsubNotif();
    };
  }, [profile]);

  const handleAddSlot = async () => {
    if (!newSlot.date || !newSlot.start || !newSlot.end) {
      return alert('Por favor, completa fecha, inicio y fin.');
    }
    try {
      await appointmentsService.addAvailabilitySlot(profile.uid, { 
        ...newSlot, 
        status: 'available',
        mentorName: profile.fullName || 'Mentor' 
      });
      setNewSlot({ date: '', start: '', end: '' });
    } catch (err) {
      alert('Error al añadir horario');
    }
  };

  const handleRemoveSlot = async (slotId) => {
    if (!window.confirm('¿Eliminar esta franja horaria?')) return;
    try {
      await appointmentsService.removeAvailabilitySlot(profile.uid, slotId);
    } catch (err) {
      alert('Error al eliminar disponibilidad');
    }
  };

  const handleConfirmAppointment = async (apptId) => {
    try {
      await appointmentsService.updateAppointmentStatus(apptId, { status: 'confirmed' });
    } catch (err) {
      alert('Error al confirmar');
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm('¿Deseas cancelar esta cita?')) return;
    try {
      await appointmentsService.updateAppointmentStatus(apptId, { status: 'cancelled' });
    } catch (err) {
      alert('Error al cancelar');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        title="Innovug"
        initiallyOpen={true}
        activeId={activeSection}
        onSelect={(id) => scrollToSection(id)}
        onToggle={(open) => setSidebarOpen(open)}
        onLogout={onLogout}
        items={[
          { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
          { id: 'disponibilidad', label: 'Disponibilidad', icon: <Clock size={18} /> },
          { id: 'citas', label: 'Citas', icon: <ListChecks size={18} /> },
        ]}
      />

      <main className={`flex-1 p-8 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        
        {/* HEADER ESTILO EMPRENDEDOR */}
        <header id="dashboard" className="mb-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                  Hola, {profile?.fullName || 'Mentor'}
                </h1>
                <p className="text-lg text-slate-500 font-medium">Panel de Mentoría</p>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 relative cursor-pointer hover:bg-gray-50 transition">
                <Bell className="text-slate-600" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 bg-red-500 w-3 h-3 rounded-full border-2 border-white"></span>
                )}
              </div>
            </div>
          </motion.div>
        </header>

        {/* CUADROS DE COLORES (Metric Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard color="from-blue-500 to-sky-600" icon={Calendar} val={appointments.length} label="Sesiones Agendadas" />
          <StatCard color="from-green-500 to-emerald-600" icon={Users} val={new Set(appointments.map(a => a.emprendedorId)).size} label="Emprendedores" />
          <StatCard color="from-orange-500 to-amber-600" icon={Clock} val={availability.filter(s => s.status === 'available').length} label="Horarios Libres" />
          <StatCard color="from-violet-500 to-purple-600" icon={Award} val={appointments.filter(a => a.status === 'confirmed').length} label="Sesiones Confirmadas" />
        </div>

        {/* CONTENEDORES BLANCOS (IGUAL AL DE DESCRIPCIÓN DEL PROYECTO) */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* SECCIÓN CONFIGURAR DISPONIBILIDAD */}
          <section id="disponibilidad" className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-50 rounded-lg">
                <PlusCircle className="text-blue-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Gestionar Disponibilidad</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Fecha</label>
                <input type="date" className="p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={newSlot.date} onChange={(e) => setNewSlot({...newSlot, date: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Inicio</label>
                <input type="time" className="p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={newSlot.start} onChange={(e) => setNewSlot({...newSlot, start: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Fin</label>
                <input type="time" className="p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={newSlot.end} onChange={(e) => setNewSlot({...newSlot, end: e.target.value})} />
              </div>
              <button onClick={handleAddSlot} className="mt-5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95">
                Añadir Franja
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availability.map((s) => (
                <div key={s.id} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div>
                    <p className="font-bold text-slate-700">{s.date}</p>
                    <p className="text-sm text-slate-500">{s.start} - {s.end}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md mt-2 inline-block ${s.status === 'available' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {s.status === 'available' ? 'Disponible' : 'Reservado'}
                    </span>
                  </div>
                  {s.status === 'available' && (
                    <button onClick={() => handleRemoveSlot(s.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN LISTADO DE CITAS */}
          <section id="citas" className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <ListChecks className="text-emerald-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Próximas Mentorías</h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-slate-400 border-b border-gray-100">
                    <th className="p-4 text-xs font-bold uppercase">Emprendedor</th>
                    <th className="p-4 text-xs font-bold uppercase">Fecha y Hora</th>
                    <th className="p-4 text-xs font-bold uppercase">Estado</th>
                    <th className="p-4 text-xs font-bold uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.length > 0 ? appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{a.emprendedorName}</p>
                        <p className="text-xs text-slate-400">{a.reason}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600 font-medium">
                        {a.slot?.date} <br /> <span className="text-slate-400">{a.slot?.start} - {a.slot?.end}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                          a.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                          a.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {a.status === 'pending' && (
                          <button onClick={() => handleConfirmAppointment(a.id)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition">
                            Confirmar
                          </button>
                        )}
                        {a.status !== 'cancelled' && (
                          <button onClick={() => handleCancelAppointment(a.id)} className="text-slate-400 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition">
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-400 font-medium">No hay citas registradas todavía.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

// COMPONENTE DE TARJETA MÉTRICA (igual al estilo de Emprendedor)
const StatCard = ({ color, icon: Icon, val, label }) => (
  <div className={`bg-gradient-to-br ${color} text-white p-6 rounded-2xl shadow-md`}>
    <Icon className="w-8 h-8 mb-3 opacity-80" />
    <h3 className="text-2xl font-bold">{val}</h3>
    <p className="text-sm opacity-90">{label}</p>
  </div>
);

export default MentorDashboard;