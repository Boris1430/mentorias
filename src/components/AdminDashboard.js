import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, Briefcase, Settings, FileText, CheckCircle, Home, TrendingUp, Video } from 'lucide-react';
import { meetService } from '../services/meetService';
import { aiService } from '../services/aiService';
import { emailService } from '../services/emailService';
import { settingsService } from '../services/settingsService';
import Sidebar from './Sidebar';
import { db, auth, storage, functions } from '../services/Firebase';
import { httpsCallable } from 'firebase/functions';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  deleteDoc,
  setDoc,
  where 
} from 'firebase/firestore';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, ArcElement, BarElement, Title, Tooltip, Legend);

const AdminDashboard = ({ profile, onLogout }) => {
  const [stats, setStats] = useState({ emprendedores: 0, mentores: 0, admins: 0, total: 0 });
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [mentorProgressData, setMentorProgressData] = useState([]);
  const [preRegistrations, setPreRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registrationSettings, setRegistrationSettings] = useState({ enabled: true, startDate: null, endDate: null });
  const [mentorEmail, setMentorEmail] = useState('');

  // Formatea un Date o Firestore Timestamp a valor compatible con <input type="datetime-local">
  const formatToDateTimeLocal = (dateValue) => {
    if (!dateValue) return '';
    try {
      const d = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Escuchar cambios en configuración de registro
    const unsubSettings = settingsService.listenRegistration((s) => {
      const st = s || { enabled: true, startDate: null, endDate: null };
      setRegistrationSettings({ enabled: !!st.enabled, startDate: st.startDate || null, endDate: st.endDate || null });
    });

    return () => {
      if (typeof unsubSettings === 'function') unsubSettings();
    };
  }, []);

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const section = document.getElementById(id);
    if (section) {
      window.scrollTo({ top: section.offsetTop - 40, behavior: 'smooth' });
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userQuery = query(collection(db, 'userProfiles'), orderBy('createdAt', 'desc'));
      const appointmentQuery = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
      const preRegQuery = query(collection(db, 'mentorPreRegistrations'), orderBy('createdAt', 'desc'));

      const [userSnap, appointmentSnap, preRegSnap] = await Promise.all([
        getDocs(userQuery),
        getDocs(appointmentQuery),
        getDocs(preRegQuery),
      ]);

      const userData = userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const appointmentData = appointmentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const preRegData = preRegSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Corrección de conteo de estadísticas
      const emprendedores = userData.filter((u) => u.role === 'emprendedor').length;
      const mentores = userData.filter((u) => u.role === 'mentor').length;
      const admins = userData.filter((u) => u.role === 'admin').length;
      const total = userData.length;

      setUsers(userData);
      setAppointments(appointmentData);
      setPreRegistrations(preRegData);
      setStats({ emprendedores, mentores, admins, total });

      const progreso = calcularProgresoPorEmprendedor(userData, appointmentData);
      setProgressData(progreso);

      // Progreso de mentores: porcentaje de citas atendidas (confirmadas) sobre las solicitadas en el período
      const progresoMentores = calcularProgresoPorMentor(userData, appointmentData);
      setMentorProgressData(progresoMentores);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // UI + AI state for summarization
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [lastSummary, setLastSummary] = useState(null);

  const REQUIRED_MENTORIAS = {
    preincubacion: ['financiera', 'contable', 'comercializacion', 'diseno'],
    incubacion: ['legal', 'marketing', 'software'],
  };

  const calcularProgresoPorEmprendedor = (usuarios, citas) => {
    // Cuenta por tipo de mentoría y solo considera citas con estado 'confirmed' o 'completed'
    const validStatuses = ['confirmed', 'completed'];

    return usuarios
      .filter((u) => u.role === 'emprendedor')
      .map((emp) => {
        const requiredTipos = REQUIRED_MENTORIAS[emp.program] || REQUIRED_MENTORIAS['preincubacion'];
        const totalTipos = requiredTipos.length || 1;

        // Todas las citas del emprendedor que estén confirmadas/completadas
        const empCitas = citas.filter((a) => a.emprendedorId === emp.id && validStatuses.includes(a.status));

        // Tipos únicos completados (solo si están en el conjunto requerido)
        const tiposCompletadosSet = new Set(
          empCitas
            .map((a) => a.tipoMentoria)
            .filter((t) => t && requiredTipos.includes(t))
        );

        const progreso = (tiposCompletadosSet.size / totalTipos) * 100;

        // Detalles de las mentorías que cuentan para el progreso
        const detalles = empCitas
          .filter((a) => a.tipoMentoria && requiredTipos.includes(a.tipoMentoria))
          .map((a) => ({ id: a.id, tipo: a.tipoMentoria, fecha: a.slot?.date || null, mentorEmail: a.mentorEmail, status: a.status }));

        return {
          id: emp.id,
          nombre: emp.fullName || 'Sin nombre',
          email: emp.email,
          progreso: Math.min(100, parseFloat(progreso.toFixed(1))),
          fase: emp.phase || 'Preincubación',
          tiposRequeridos: requiredTipos,
          tiposCompletados: Array.from(tiposCompletadosSet),
          detallesTipos: detalles,
        };
      });
  };

  const calcularProgresoPorMentor = (usuarios, citas) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return usuarios
      .filter((u) => u.role === 'mentor')
      .map((mentor) => {
        const mentorCitas = citas.filter((a) => a.mentorId === mentor.id);
        // Filtrar por mes de creación (createdAt) si existe, si no usar slot.date
        const citasEnMes = mentorCitas.filter((a) => {
          if (a.createdAt && a.createdAt.toDate) {
            const d = a.createdAt.toDate();
            return d >= startOfMonth && d <= endOfMonth;
          }
          if (a.slot && a.slot.date) {
            const d = new Date(a.slot.date);
            return d >= startOfMonth && d <= endOfMonth;
          }
          return false;
        });

        const totalSolicitadas = citasEnMes.length;
        const confirmadas = citasEnMes.filter((a) => a.status === 'confirmed').length;
        const canceladas = citasEnMes.filter((a) => a.status === 'cancelled').length;
        const ratio = totalSolicitadas === 0 ? 0 : Math.min(100, Math.round((confirmadas / totalSolicitadas) * 100));

        return {
          id: mentor.id,
          nombre: mentor.fullName || 'Sin nombre',
          email: mentor.email,
          curriculumUrl: mentor.curriculumUrl || null,
          specialization: mentor.specialization || null,
          program: mentor.program || null,
          totalSolicitadas,
          confirmadas,
          canceladas,
          cumplimiento: ratio,
        };
      });
  };

  const SPECIALIZATION_LABELS = {
    financiera: 'Asesoría Financiera',
    contable: 'Asesoría Contable y Tributario',
    comercializacion: 'Asesoría en Comercialización',
    diseno: 'Asesoría en Diseño Gráfico',
    legal: 'Asesoría Legal',
    marketing: 'Asesoría en Marketing Digital',
    software: 'Asesoría en Software y Desarrollo',
  };

  const avanzarFase = async (empId) => {
    try {
      await updateDoc(doc(db, 'userProfiles', empId), { phase: 'Incubación' });
      await loadDashboardData();
      alert('✅ Emprendedor avanzado a fase de Incubación');
    } catch (err) {
      console.error('Error actualizando fase:', err);
    }
  };

  const registerMentor = async (mentorEmail) => {
    if (!mentorEmail) {
    alert("Error: El correo del mentor no es válido.");
    return;
    }
    
    try {
      setLoading(true);
      const approveMentorFn = httpsCallable(functions, "approveMentor");

      const result = await approveMentorFn({ email: mentorEmail });

      if (result.data.success) {
        alert("✅ Mentor aprobado con éxito. Cuenta creada y correo enviado.");
        setMentorEmail("");
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generarPDF = () => {
    const docPdf = new jsPDF();
    docPdf.setFontSize(16);
    docPdf.text('Reporte Mensual de Emprendedores', 14, 20);
    docPdf.setFontSize(12);
    docPdf.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const rows = progressData.map((p) => {
      // Obtener las mentorías del mes que contribuyeron
      const citasMes = appointments
        .filter((a) => a.emprendedorId === p.id)
        .filter((a) => {
          // fecha desde createdAt si existe, o slot.date
          if (a.createdAt && a.createdAt.toDate) {
            const d = a.createdAt.toDate();
            return d >= startOfMonth && d <= endOfMonth;
          }
          if (a.slot && a.slot.date) {
            const d = new Date(a.slot.date);
            return d >= startOfMonth && d <= endOfMonth;
          }
          return false;
        })
        .filter((a) => ['confirmed', 'completed'].includes(a.status))
        .filter((a) => p.tiposRequeridos ? p.tiposRequeridos.includes(a.tipoMentoria) : true);

      const detallesStr = citasMes.map((c) => `${c.tipoMentoria || 'Mentoría'} (${c.slot?.date || ''}) - ${c.mentorEmail || ''} - ${c.status}`).join('; ');

      return [p.nombre, p.email, `${p.progreso}%`, p.fase, detallesStr];
    });

    docPdf.autoTable({
      head: [['Nombre', 'Correo', 'Progreso', 'Fase', 'Mentorías del mes (tipo, fecha, mentor, estado)']],
      body: rows,
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [245, 245, 245] },
    });

    docPdf.save('Reporte_Mensual_Emprendedores.pdf');
  };

  const generarPDFMentores = () => {
    const docPdf = new jsPDF();
    docPdf.setFontSize(16);
    docPdf.text('Reporte Mensual de Mentores', 14, 20);
    docPdf.setFontSize(12);
    docPdf.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

    const rows = mentorProgressData.map((m) => [
      m.nombre,
      m.email,
      SPECIALIZATION_LABELS[m.specialization] || m.specialization || '',
      m.totalSolicitadas,
      m.confirmadas,
      `${m.cumplimiento}%`,
    ]);

    docPdf.autoTable({
      head: [['Nombre', 'Correo', 'Especialización', 'Solicitadas', 'Confirmadas', 'Cumplimiento']],
      body: rows,
      startY: 40,
    });

    docPdf.save('Reporte_Mensual_Mentores.pdf');
  }; 

  const roleChartData = {
    labels: ['Emprendedores', 'Mentores', 'Admins'],
    datasets: [
      {
        label: 'Usuarios por Rol',
        data: [stats.emprendedores, stats.mentores, stats.admins],
        backgroundColor: ['#34d399', '#fb923c', '#f87171'],
      },
    ],
  };

  const progresoChartData = {
    labels: progressData.map((p) => p.nombre),
    datasets: [
      {
        label: 'Avance (%)',
        data: progressData.map((p) => p.progreso),
        backgroundColor: '#3b82f6',
      },
    ],
  };

  const mentorChartData = {
    labels: mentorProgressData.map((m) => m.nombre),
    datasets: [
      {
        label: 'Cumplimiento (%)',
        data: mentorProgressData.map((m) => m.cumplimiento),
        backgroundColor: '#f97316',
      },
    ],
  }; 

  const handleStartMeeting = async (appt) => {
    if (!appt) return;
    try {
      // 1. Si ya existe un link, simplemente abrirlo
      if (appt.meet && (appt.meet.hangoutLink || appt.meet.entryPoint)) {
        const url = appt.meet.hangoutLink || appt.meet.entryPoint;
        window.open(url, '_blank');
        return;
      }

      // 2. Preparar participantes
      const attendees = [];
      if (appt.mentorEmail) attendees.push(appt.mentorEmail);
      if (appt.emprendedorEmail) attendees.push(appt.emprendedorEmail);

      // 3. Configurar tiempos (esto lo tienes bien)
      let startISO = new Date().toISOString();
      let endISO = new Date(Date.now() + 3600000).toISOString(); // +1 hora

      if (appt.slot?.date && appt.slot?.start) {
        startISO = new Date(`${appt.slot.date}T${appt.slot.start}`).toISOString();
      }
      if (appt.slot?.date && appt.slot?.end) {
        endISO = new Date(`${appt.slot.date}T${appt.slot.end}`).toISOString();
      }

      const originalInfo = appt.slot ? `${appt.slot.date || ''} ${appt.slot.start || ''}-${appt.slot.end || ''}` : '';
      const description = `${appt.reason || ''}\n\n(Programado: ${originalInfo})`;

      // 4. Llamar a la función de Google Meet en el Backend
      const meetingEvent = await meetService.createEvent({ 
        summary: `Mentoría - ${appt.id}`, 
        description, 
        startTime: startISO, 
        endTime: endISO, 
        attendees 
      });

      if (!meetingEvent) throw new Error('No se pudo crear el evento');

      const hangoutLink = meetingEvent.hangoutLink || (meetingEvent.conferenceData?.entryPoints?.[0]?.uri) || null;

      // 5. Guardar el link en la base de datos
      await updateDoc(doc(db, 'appointments', appt.id), {
        meet: {
          id: meetingEvent.id,
          hangoutLink,
          conferenceData: meetingEvent.conferenceData || null,
        },
        status: 'meeting_started', // Opcional: cambiar estado para que el botón cambie a "Unirse"
        updatedAt: serverTimestamp(),
      });

      // 6. ENVIAR CORREO (Aquí usamos la nueva lógica genérica)
      if (hangoutLink && attendees.length > 0) {
        try {
          await emailService.sendEmail({
            to: attendees.join(','), // Envía a mentor y emprendedor
            subject: `¡Reunión Iniciada! Mentoria - ${appt.id}`,
            html: `
              <h3>La sesión de mentoría ha comenzado</h3>
              <p>Puedes unirte a través del siguiente enlace:</p>
              <p><a href="${hangoutLink}" style="padding: 10px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Unirse a Google Meet</a></p>
              <p><b>Horario programado:</b> ${originalInfo}</p>
            `,
          });
        } catch (emailErr) {
          console.warn('El link se creó pero no se pudo notificar por correo:', emailErr);
        }
      }

      // 7. Abrir la reunión para el admin
      if (hangoutLink) window.open(hangoutLink, '_blank');

    } catch (err) {
      console.error('Error starting meeting:', err);
      alert('Error al iniciar la reunión. Revisa que tengas permisos de Google Calendar.');
    }
  };

  const openTranscriptModal = (appt) => {
    setSelectedAppt(appt);
    setTranscriptText('');
    setLastSummary(null);
    setTranscriptModalOpen(true);
  };

  const closeTranscriptModal = () => {
    setTranscriptModalOpen(false);
    setSelectedAppt(null);
    setTranscriptText('');
    setLastSummary(null);
  };

  const handleSummarizeAndDownload = async () => {
    if (!transcriptText.trim()) return alert('Pega la transcripción primero');
    setSummaryLoading(true);
    try {
      const info = selectedAppt ? `Cita ID: ${selectedAppt.id} - Fecha: ${selectedAppt.slot?.date}` : '';
      
      // Llamada a la Cloud Function de resumen
      const summary = await aiService.summarizeMeeting({ 
        transcript: transcriptText, 
        meetingInfo: info 
      });
      if (!summary) throw new Error('La IA no devolvió un resumen');

      setLastSummary(summary);

      // Generación del documento
      const fileName = `Resumen_Reunion_${selectedAppt?.id || 'id'}.doc`;
      
      // Añadimos un encabezado básico al contenido del Blob para que se vea mejor en Word
      const content = `RESUMEN DE REUNIÓN\n${info}\n\n${summary}`;
      const blob = new Blob([content], { type: 'application/msword' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      alert('Resumen generado con éxito');
    } catch (err) {
      console.error('AI summarize error:', err);
      alert('Error al conectar con el servicio de IA en la nube.');
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-100">
      <Sidebar
        title="Innovug"
        initiallyOpen={true}
        activeId={activeSection}
        onSelect={(id) => scrollToSection(id)}
        onToggle={(open) => setSidebarOpen(open)}
        onLogout={onLogout}
        items={[
          { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
          { id: 'progreso', label: 'Progreso', icon: <TrendingUp size={18} /> },
          { id: 'emprendedores', label: 'Emprendedores', icon: <Users size={18} /> },
          { id: 'aprobacion-mentores', label: 'Aprobación Mentores', icon: <CheckCircle size={18} /> },
          { id: 'reuniones', label: 'Reuniones', icon: <Video size={18} /> },
        ]}
      />

      <main className={`container mx-auto px-4 py-8 max-w-7xl transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <motion.div id="dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Administrador</h1>
              <p className="text-gray-600">Bienvenido, {profile?.fullName || 'Administrador'}</p>
            </div>
          </div>

          {/* Tarjetas de Estadísticas */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <StatCard icon={Users} color="from-blue-500 to-sky-600" label="Usuarios Totales" value={stats.total} />
            <StatCard icon={UserCheck} color="from-green-500 to-emerald-600" label="Emprendedores" value={stats.emprendedores} />
            <StatCard icon={Briefcase} color="from-orange-500 to-amber-600" label="Mentores" value={stats.mentores} />

            {/* Control de Registro (Admin) */}
            <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-bold text-sm">Control de Registro</h4>
                  <p className="text-xs text-gray-500">Habilitar o programar cierre/ apertura de registros</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <label className="text-sm font-medium">Registro</label>
                <button onClick={async () => {
                  const newEnabled = !registrationSettings.enabled;
                  // Actualizamos localmente para respuesta inmediata
                  setRegistrationSettings(s => ({ ...s, enabled: newEnabled }));
                  try {
                    await settingsService.setRegistration({ enabled: newEnabled, startDate: registrationSettings.startDate, endDate: registrationSettings.endDate });
                  } catch (err) {
                    // Revertir en caso de error
                    setRegistrationSettings(s => ({ ...s, enabled: !newEnabled }));
                    alert('Error actualizando configuración');
                  }
                }} className={`px-3 py-1 rounded-lg font-medium ${registrationSettings.enabled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {registrationSettings.enabled ? 'Habilitado' : 'Deshabilitado'}
                </button>
              </div>

              {registrationSettings._error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-xs mt-2">
                  No se pudo leer configuración de registro: {registrationSettings._error}. Se asume registro cerrado.
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div>
                  <label className="block text-xs text-gray-600">Apertura automática</label>
                  <input
                    type="datetime-local"
                    value={formatToDateTimeLocal(registrationSettings.startDate)}
                    onChange={(e) => setRegistrationSettings(s => ({ ...s, startDate: e.target.value ? new Date(e.target.value) : null }))}
                    className="w-full border rounded-md p-2"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Cierre automático</label>
                  <input
                    type="datetime-local"
                    value={formatToDateTimeLocal(registrationSettings.endDate)}
                    onChange={(e) => setRegistrationSettings(s => ({ ...s, endDate: e.target.value ? new Date(e.target.value) : null }))}
                    className="w-full border rounded-md p-2"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <button onClick={async () => {
                    try {
                      await settingsService.setRegistration({ enabled: registrationSettings.enabled, startDate: registrationSettings.startDate, endDate: registrationSettings.endDate });
                      alert('Configuración guardada');
                    } catch (err) {
                      console.error(err);
                      alert('Error al guardar');
                    }
                  }} className="bg-blue-600 text-white px-3 py-2 rounded-lg">Guardar</button>
                  <button onClick={() => setRegistrationSettings({ enabled: true, startDate: null, endDate: null })} className="px-3 py-2 border rounded-lg">Restablecer</button>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div id="progreso" className="grid md:grid-cols-3 gap-8 mb-8">
            <ChartCard title="Usuarios por Rol">
              <Doughnut data={roleChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </ChartCard>

            <ChartCard title="Progreso de Emprendedores (%)">
              <Bar
                data={progresoChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true, max: 100 } },
                }}
              />
            </ChartCard>

            <ChartCard title="Progreso de Mentores (%)">
              <Bar
                data={mentorChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true, max: 100 } },
                }}
              />
            </ChartCard>
          </div> 

          {/* Botón Reporte */}
          <div className="flex justify-end mb-6 gap-3">
            <button
              onClick={generarPDF}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-2"
            >
              <FileText className="w-5 h-5" /> Generar Reporte Mensual Emprendedores
            </button>
            <button
              onClick={generarPDFMentores}
              className="bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-orange-700 flex items-center gap-2"
            >
              <FileText className="w-5 h-5" /> Generar Reporte Mensual Mentores
            </button>
          </div> 

          {/* Tabla de Emprendedores */}
          <div id="emprendedores" className="bg-gray-50 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-6 h-6" /> Gestión de Emprendedores
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-3 px-4 text-left">Nombre</th>
                    <th className="py-3 px-4 text-left">Correo</th>
                    <th className="py-3 px-4 text-left">Progreso</th>
                    <th className="py-3 px-4 text-left">Fase</th>
                    <th className="py-3 px-4 text-left">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {progressData.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                      <td className="py-3 px-4 font-medium">{p.nombre}</td>
                      <td className="py-3 px-4 text-gray-600">{p.email}</td>
                      <td className="py-3 px-4">{p.progreso}%</td>
                      <td className="py-3 px-4">{p.fase}</td>
                      <td className="py-3 px-4">
                        {p.fase === 'Preincubación' && p.progreso >= 100 ? (
                          <button
                            onClick={() => avanzarFase(p.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4" /> Avanzar
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla de Mentores */}
          <div id="mentores" className="bg-gray-50 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-6 h-6" /> Progreso de Mentores (mes actual)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-3 px-4 text-left">Nombre</th>
                    <th className="py-3 px-4 text-left">Correo</th>
                    <th className="py-3 px-4 text-left">Especialización</th>
                    <th className="py-3 px-4 text-left">CV</th>
                    <th className="py-3 px-4 text-left">Solicitadas</th>
                    <th className="py-3 px-4 text-left">Confirmadas</th>
                    <th className="py-3 px-4 text-left">Cumplimiento</th>
                  </tr>
                </thead> 
                <tbody>
                  {mentorProgressData.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                      <td className="py-3 px-4 font-medium">{m.nombre}</td>
                      <td className="py-3 px-4 text-gray-600">{m.email}</td>
                      <td className="py-3 px-4">{SPECIALIZATION_LABELS[m.specialization] || m.specialization || '—'}</td>
                      <td className="py-3 px-4">
                        {m.curriculumUrl ? (
                          <a href={m.curriculumUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Ver CV</a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{m.totalSolicitadas}</td>
                      <td className="py-3 px-4">{m.confirmadas}</td>
                      <td className="py-3 px-4">{m.cumplimiento}%</td> 
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gestión Unificada de Mentores */}
          <div id="aprobacion-mentores" className="bg-white rounded-2xl p-6 shadow border border-gray-200 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" /> Gestión de Mentores (Pre-registro y Aprobación)
            </h2>
            <p className="text-gray-600 mb-6">
              Revisa los pre-registros de mentores y apruébalos desde aquí.
            </p>
            {/* Lista de Pre-registros */}
            <div className="space-y-4 mb-8">
              {preRegistrations.filter(p => p.status === 'pending').length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-xl text-gray-500">
                  No hay pre-registros de mentores pendientes.
                </div>
              ) : (
                preRegistrations
                  .filter(p => p.status === 'pending')
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-5 bg-gray-50 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div>
                        <div className="font-semibold text-gray-800">{p.fullName}</div>
                        <div className="text-sm text-gray-600">Email: {p.email}</div>
                        <div className="text-sm text-gray-600">
                          Especialización: {SPECIALIZATION_LABELS[p.specialization] || p.specialization}
                        </div>
                        <div className="text-sm text-gray-600">Programa: {p.program}</div>
                        {p.curriculumUrl && (
                          <a
                            href={p.curriculumUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline text-sm inline-block mt-1"
                          >
                            Ver CV
                          </a>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
            {/* Aprobación Manual */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Aprobación Manual
              </h3>
              <p className="text-gray-600 mb-4">
                Usa esta opción para aprobar un mentor por correo electrónico.
              </p>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="email"
                  value={mentorEmail}
                  onChange={(e) => setMentorEmail(e.target.value)}
                  placeholder="Email del mentor"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => registerMentor(mentorEmail)}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Aprobando...' : 'Aprobar'}
                </button>
              </div>
            </div>
          </div>

          {/* Sección de Reuniones */}
          <div id="reuniones" className="bg-white rounded-2xl p-6 shadow border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Video className="w-6 h-6 text-blue-500" /> Control de Reuniones
            </h2>
            <div className="space-y-4">
              {appointments.filter(a => a.status === 'confirmed').length === 0 ? (
                <p className="text-gray-500">No hay reuniones confirmadas actualmente.</p>
              ) : (
                appointments
                  .filter(a => a.status === 'confirmed')
                  .map((a) => (
                    <div key={a.id} className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">{a.slot?.date} — {a.slot?.start} a {a.slot?.end}</div>
                        <div className="text-sm text-gray-600">Mentor: {a.mentorEmail} · Emprendedor: {a.emprendedorEmail}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleStartMeeting(a)} 
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          {a.meet?.hangoutLink ? 'Unirse a Meet' : 'Crear Reunión'}
                        </button>
                        <button onClick={() => openTranscriptModal(a)} className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600">Resumir IA</button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Modal de Transcripción IA */}
      {transcriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Resumen con Inteligencia Artificial</h3>
              <button onClick={closeTranscriptModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <textarea 
              value={transcriptText} 
              onChange={(e) => setTranscriptText(e.target.value)} 
              placeholder="Pega la transcripción de la reunión aquí..."
              rows={10} 
              className="w-full border rounded-lg p-4 mb-4 focus:ring-2 focus:ring-blue-500 outline-none" 
            />

            {/* Upload audio file for transcription */}
            <div className="mb-4">
              <input type="file" accept="audio/*" id="transcriptFile" className="block" />
              <div className="mt-2 flex gap-2">
                <button onClick={async () => {
                  const f = document.getElementById('transcriptFile').files?.[0];
                  if (!f) return alert('Selecciona un archivo de audio');
                  try {
                    const t = await aiService.transcribeAudio(f);
                    setTranscriptText((prev) => (prev ? prev + '\n' + t : t));
                    alert('Transcripción completada y añadida al campo');
                  } catch (err) {
                    console.error('Transcribe upload error', err);
                    alert('Error transcribiendo audio');
                  }
                }} className="bg-indigo-600 text-white px-3 py-1 rounded-lg">Transcribir archivo</button>

                <button onClick={() => { document.getElementById('transcriptFile').value = ''; }} className="px-3 py-1 border rounded-lg">Limpiar archivo</button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={closeTranscriptModal} className="px-6 py-2 rounded-lg border font-medium">Cancelar</button>
              <button 
                onClick={handleSummarizeAndDownload} 
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:bg-gray-400"
                disabled={summaryLoading || !transcriptText.trim()}
              >
                {summaryLoading ? 'Generando...' : 'Resumir y Descargar .doc'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



const StatCard = ({ icon: Icon, color, label, value }) => (
  <div className={`bg-gradient-to-br ${color} text-white p-6 rounded-2xl shadow-lg`}>
    <Icon className="w-10 h-10 mb-3 opacity-80" />
    <h3 className="text-3xl font-bold">{value}</h3>
    <p className="text-blue-50 opacity-90 font-medium">{label}</p>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-md p-6 h-[400px] border border-gray-100">
    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
      <TrendingUp className="text-blue-500" size={20} /> {title}
    </h3>
    <div className="h-[300px]">{children}</div>
  </div>
);

export default AdminDashboard;