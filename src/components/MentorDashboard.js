import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Award, Clock, PlusCircle, Trash2 } from 'lucide-react';
import { appointmentsService } from '../services/appointmentsService';
import { authService } from '../services/authService';

const MentorDashboard = ({ user, profile, onLogout }) => {
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [newSlot, setNewSlot] = useState({ date: '', start: '', end: '' });

  useEffect(() => {
    if (!user || !user.id) return;
    const unsubAvail = appointmentsService.listenAvailability(user.id, setAvailability);
    const unsubAppts = appointmentsService.listenAppointmentsForUser(user.id, 'mentor', setAppointments);
    return () => {
      unsubAvail && unsubAvail();
      unsubAppts && unsubAppts();
    };
  }, [user]);

  const handleAddSlot = async () => {
    if (!newSlot.date || !newSlot.start || !newSlot.end) return alert('Completa fecha, inicio y fin');
    try {
      await appointmentsService.addAvailabilitySlot(user.id, { ...newSlot });
      setNewSlot({ date: '', start: '', end: '' });
    } catch (err) {
      console.error(err);
      alert('Error al añadir disponibilidad');
    }
  };

  const handleRemoveSlot = async (slotId) => {
    if (!confirm('Eliminar esta disponibilidad?')) return;
    try {
      await appointmentsService.removeAvailabilitySlot(user.id, slotId);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const handleConfirmAppointment = async (apptId) => {
    try {
      await appointmentsService.updateAppointmentStatus(apptId, { status: 'confirmed' });
      alert('Cita confirmada');
    } catch (err) {
      console.error(err);
      alert('Error al confirmar');
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!confirm('¿Cancelar esta cita?')) return;
    try {
      await appointmentsService.updateAppointmentStatus(apptId, { status: 'cancelled' });
      alert('Cita cancelada');
    } catch (err) {
      console.error(err);
      alert('Error al cancelar');
    }
  };
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
              <h1 className="text-3xl font-bold text-gray-900">Bienvenido, {profile?.full_name}</h1>
              <p className="text-gray-600">Panel de Mentor</p>
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
              <p className="text-blue-100">Sesiones Agendadas</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-2xl">
              <Users className="w-8 h-8 mb-3" />
              <h3 className="text-2xl font-bold">0</h3>
              <p className="text-green-100">Emprendedores Activos</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-6 rounded-2xl">
              <Clock className="w-8 h-8 mb-3" />
              <h3 className="text-2xl font-bold">0h</h3>
              <p className="text-orange-100">Horas de Mentoría</p>
            </div>
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white p-6 rounded-2xl">
              <Award className="w-8 h-8 mb-3" />
              <h3 className="text-2xl font-bold">0</h3>
              <p className="text-violet-100">Sesiones Completadas</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Próximas Sesiones</h2>
              <div>
                <h3 className="font-semibold mb-2">Disponibilidad</h3>
                <div className="space-y-3">
                  {availability.length === 0 ? (
                    <p className="text-gray-500">No hay franjas configuradas</p>
                  ) : (
                    availability.map((s) => (
                      <div key={s.id} className="flex justify-between items-center bg-white p-3 rounded-md border">
                        <div>
                          <div className="font-medium">{s.date} {s.start} - {s.end}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRemoveSlot(s.id)} className="text-red-500">
                            <Trash2 />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <input value={newSlot.date} onChange={e => setNewSlot({...newSlot, date: e.target.value})} type="date" className="p-2 border rounded" />
                  <input value={newSlot.start} onChange={e => setNewSlot({...newSlot, start: e.target.value})} type="time" className="p-2 border rounded" />
                  <input value={newSlot.end} onChange={e => setNewSlot({...newSlot, end: e.target.value})} type="time" className="p-2 border rounded" />
                </div>
                <div className="mt-2">
                  <button onClick={handleAddSlot} className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl">
                    <PlusCircle /> Añadir franja
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Solicitudes y Citas</h2>
              {appointments.length === 0 ? (
                <p className="text-gray-500">No hay solicitudes</p>
              ) : (
                <div className="space-y-3">
                  {appointments.map(a => (
                    <div key={a.id} className="p-3 bg-white rounded border flex justify-between">
                      <div>
                        <div className="font-semibold">{a.slot.date} {a.slot.start} - {a.slot.end}</div>
                        <div className="text-sm text-gray-600">Solicitado por: {a.emprendedorId}</div>
                        <div className="text-sm text-gray-600">Estado: {a.status}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {a.status === 'pending' && (
                          <button onClick={() => handleConfirmAppointment(a.id)} className="bg-green-500 text-white px-3 py-1 rounded">Confirmar</button>
                        )}
                        {a.status !== 'cancelled' && (
                          <button onClick={() => handleCancelAppointment(a.id)} className="bg-red-400 text-white px-3 py-1 rounded">Cancelar</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-6 border border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Especialidades</h2>
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-700 border border-gray-200">
                Plan de Negocios
              </span>
              <span className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-700 border border-gray-200">
                Marketing Digital
              </span>
              <span className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-700 border border-gray-200">
                Finanzas
              </span>
              <span className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-700 border border-gray-200">
                Estrategia
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MentorDashboard;
