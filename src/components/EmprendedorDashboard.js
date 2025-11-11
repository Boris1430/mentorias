import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Target,
  TrendingUp,
  Lightbulb,
  Clock,
  Home,
  Star,
  ListChecks,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { aiService } from '../services/aiService';
import { appointmentsService } from '../services/appointmentsService';
import { db } from '../services/Firebase';
import { collection, getDocs, query, where } from 'firebase/firestore'; // Añadido query y where

const RECOMMENDATIONS = {
  preincubacion: [
    'Asesoría Financiera',
    'Asesoría Contable y Tributario',
    'Asesoría en Comercialización',
    'Asesoría en Diseño Gráfico',
  ],
  incubacion: [
    'Asesoría Legal',
    'Asesoría en Marketing Digital',
    'Asesoría en Software y Desarrollo',
  ],
};

const EmprendedorDashboard = ({ profile, onLogout }) => {
  const [appointments, setAppointments] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [selectedMentorInfo, setSelectedMentorInfo] = useState(null);
  const [programType, setProgramType] = useState('preincubacion');
  const [projectDescription, setProjectDescription] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const section = document.getElementById(id);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 40,
        behavior: 'smooth',
      });
    }
  };

  // Citas del emprendedor - Escucha solo las que le pertenecen
  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = appointmentsService.listenAppointmentsForUser(
      profile.uid,
      'emprendedor',
      (data) => {
        setAppointments(data);
        setLoading(false);
      }
    );
    return () => unsub && unsub();
  }, [profile]);

  // Mentores - CORRECCIÓN: Se añade filtro 'where' para evitar error de permisos
  useEffect(() => {
    const loadMentors = async () => {
      try {
        const q = query(
          collection(db, 'userProfiles'), 
          where('role', '==', 'mentor')
        );
        const snap = await getDocs(q);
        const mentorsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMentors(mentorsList);
      } catch (err) {
        console.error("Error cargando mentores:", err);
      }
    };
    loadMentors();
  }, []);

  // Disponibilidad mentor
  useEffect(() => {
    if (!selectedMentor) {
      setSelectedMentorInfo(null);
      setAvailableSlots([]);
      return;
    }

    // Actualizar info del mentor seleccionado (especialización, nombre, etc.)
    const info = mentors.find((m) => m.id === selectedMentor) || null;
    setSelectedMentorInfo(info);

    const unsub = appointmentsService.listenAvailability(selectedMentor, setAvailableSlots);
    return () => unsub && unsub();
  }, [selectedMentor, mentors]);

  // IA recomendación

  const SPECIALIZATION_LABELS = {
    financiera: 'Asesoría Financiera',
    contable: 'Asesoría Contable y Tributario',
    comercializacion: 'Asesoría en Comercialización',
    diseno: 'Asesoría en Diseño Gráfico',
    legal: 'Asesoría Legal',
    marketing: 'Asesoría en Marketing Digital',
    software: 'Asesoría en Software y Desarrollo',
  };
  const [aiLoading, setAiLoading] = useState(false);
  const handleDescribeProject = async () => {
    if (!projectDescription.trim()) {
      alert('Por favor describe tu proyecto');
      return;
    }

    try {
      setAiLoading(true);
      // 1. Preparamos el contexto
      const mentoringContext = RECOMMENDATIONS[programType].join(', ');
      const enhancedDescription = `${projectDescription}\n\nSolo sugiere mentorías de esta lista: ${mentoringContext}.`;
      
      // 2. Llamada al servicio (que ahora usa httpsCallable)
      const result = await aiService.recommendProject({ 
        description: enhancedDescription, 
        programType 
      });
      
      if (Array.isArray(result)) {
        setRecommendations(result);
      } else {
        // Si llega como string separado por comas
        const lines = (result || '').split(',').map(l => l.trim()).filter(l => l !== '');
        setRecommendations(lines.length ? lines : RECOMMENDATIONS[programType]);
      }

    } catch (err) {
      console.error('AI recommend error', err);
      setRecommendations(RECOMMENDATIONS[programType] || []);
    } finally {
      setAiLoading(false);
    }
  };

  // Solicitar cita
  const handleRequest = async (mentorId, slot) => {
    try {
      await appointmentsService.requestAppointment({
        mentorId,
        emprendedorId: profile.uid,
        slot,
        reason: projectDescription || 'Mentoría de seguimiento',
        emprendedorEmail: profile.email,
        emprendedorName: profile.fullName,
        tipoMentoria: selectedMentorInfo?.specialization || null,
      });
      alert('Solicitud enviada correctamente');
    } catch (err) {
      console.error('Error al solicitar cita', err);
      alert('Error al solicitar cita');
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm('¿Cancelar esta cita?')) return;
    try {
      await appointmentsService.updateAppointmentStatus(apptId, { status: 'cancelled' });
      alert('Cita cancelada');
    } catch (err) {
      alert('Error');
    }
  };

  // Tutorías completadas
  useEffect(() => {
    if (!appointments) return;
    const completed = appointments
      .filter((a) => a.status === 'completed')
      .map((a) => ({
        tipo: a.reason || 'Mentoría',
        estado: 'Completada',
        fecha: a.slot?.date || '',
      }));
    setCompletedSessions(completed);
  }, [appointments]);

  const totalObjetivos = programType === 'preincubacion' ? 4 : 3;
  const progreso = totalObjetivos === 0 ? 0 : (completedSessions.length / totalObjetivos) * 100;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        title="Innovug"
        initiallyOpen={true}
        activeId={activeSection}
        onSelect={(id) => scrollToSection(id)}
        onToggle={(open) => setSidebarOpen(open)}
        onLogout={onLogout}
        items={[
          { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
          { id: 'recomendaciones', label: 'Recomendaciones', icon: <Star size={18} /> },
          { id: 'agendamiento', label: 'Agendamiento', icon: <Calendar size={18} /> },
          { id: 'citas', label: 'Citas', icon: <ListChecks size={18} /> },
          { id: 'progreso', label: 'Progreso', icon: <TrendingUp size={18} /> },
        ]}
      />

      <main className={`flex-1 p-10 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* DASHBOARD */}
        <section id="dashboard">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-gray-900">Hola, {profile?.fullName || 'Emprendedor'}</h1>
            <p className="text-gray-600 mb-6">Panel de Seguimiento</p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard color="from-blue-500 to-sky-600" icon={Calendar} val={appointments.length} label="Próximas Mentorías" />
              <StatCard color="from-green-500 to-emerald-600" icon={Star} val={recommendations.length} label="Recomendadas" />
              <StatCard color="from-orange-500 to-amber-600" icon={Target} val={completedSessions.length} label="Completadas" />
              <StatCard color="from-violet-500 to-purple-600" icon={TrendingUp} val={`${Math.round(progreso)}%`} label="Progreso Total" />
            </div>
          </motion.div>
        </section>

        {/* RECOMENDACIONES */}
        <section id="recomendaciones" className="mt-12">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lightbulb size={20} className="text-yellow-500" /> Descripción del Proyecto
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <select value={programType} onChange={(e) => setProgramType(e.target.value)} className="w-full border rounded-xl p-3 mb-4">
                  <option value="preincubacion">Fase: Preincubación</option>
                  <option value="incubacion">Fase: Incubación</option>
                </select>
                <textarea
                  className="w-full border rounded-xl p-4 h-32 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Describe tu idea de negocio para recibir sugerencias de la IA..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
                <button onClick={handleDescribeProject} disabled={aiLoading} className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                  {aiLoading ? 'Analizando con IA...' : 'Obtener Recomendaciones'}
                </button>
              </div>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-3 text-sm uppercase">Mentorías Sugeridas</h3>
                {recommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {recommendations.map((r, i) => <li key={i} className="flex items-center gap-2 text-blue-800"><CheckCircle size={14} /> {r}</li>)}
                  </ul>
                ) : <p className="text-blue-400 text-sm">Ingresa tu proyecto para ver sugerencias personalizadas.</p>}
              </div>
            </div>
          </div>
        </section>

        {/* AGENDAMIENTO */}
        <section id="agendamiento" className="mt-12">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-600">
              <Clock size={20} /> Agendar Nueva Mentoría
            </h2>
            <select value={selectedMentor} onChange={(e) => setSelectedMentor(e.target.value)} className="w-full border rounded-xl p-3 mb-2">
              <option value="">-- Elige un Mentor --</option>
              {mentors.map((m) => <option key={m.id} value={m.id}>{m.fullName || m.email} {m.specialization ? ` — ${m.specialization}` : ''}</option>)}
            </select>

            {/* Mostrar especialización del mentor seleccionado */}
            {selectedMentorInfo ? (
              <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-600">Especialización: <span className="font-medium text-gray-800">{SPECIALIZATION_LABELS[selectedMentorInfo.specialization] || selectedMentorInfo.specialization || 'No especificada'}</span></p>
                {selectedMentorInfo.program && (
                  <p className="text-sm text-gray-500">Programa: <span className="font-medium">{selectedMentorInfo.program}</span></p>
                )}
              </div>
            ) : null}

            <div className="grid md:grid-cols-3 gap-4">
              {availableSlots.length > 0 ? availableSlots.map((slot) => (
                <div key={slot.id} className="border p-4 rounded-xl hover:border-blue-500 transition-all bg-gray-50">
                  <p className="font-bold">{slot.date}</p>
                  <p className="text-sm text-gray-600 mb-3">{slot.start} - {slot.end}</p>
                  <button onClick={() => handleRequest(selectedMentor, slot)} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Agendar</button>
                </div>
              )) : selectedMentor && <p className="text-gray-500">Este mentor no tiene horarios disponibles hoy.</p>}
            </div>
          </div>
        </section>

        {/* CITAS AGENDADAS */}
        <section id="citas" className="mt-12">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Mis Citas</h2>
            <div className="space-y-4">
              {appointments.length > 0 ? appointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-4 border rounded-xl">
                  <div>
                    <p className="font-bold">{appt.slot?.date} <span className="text-gray-400 font-normal">| {appt.slot?.start}</span></p>
                    <p className="text-xs uppercase font-bold text-blue-600 mt-1">{appt.status}</p>
                  </div>
                  <button onClick={() => handleCancelAppointment(appt.id)} className="text-red-500 hover:underline text-sm font-medium">Cancelar</button>
                </div>
              )) : <p className="text-gray-400">No tienes citas agendadas aún.</p>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// Componentes auxiliares
const StatCard = ({ color, icon: Icon, val, label }) => (
  <div className={`bg-gradient-to-br ${color} text-white p-6 rounded-2xl shadow-md`}>
    <Icon className="w-8 h-8 mb-3 opacity-80" />
    <h3 className="text-2xl font-bold">{val}</h3>
    <p className="text-sm opacity-90">{label}</p>
  </div>
);

const CheckCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export default EmprendedorDashboard;
