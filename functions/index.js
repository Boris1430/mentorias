const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { Groq } = require("groq-sdk");

if (!admin.apps.length) {
  admin.initializeApp();
}

const REGION = "us-east1";

// Configuración común de transporte (Nodemailer)
const transporter = require("nodemailer").createTransport({
  service: "gmail",
  auth: { user: "mentoriasinnovug@gmail.com", pass: "wcfqiqrboerfrpgk" },
});

// --- 1. FUNCIÓN PARA APROBAR MENTOR (Registro Inicial) ---
exports.approveMentor = functions.region(REGION).https.onCall(async (data, context) => {
  const db = admin.firestore();
  const email = data.email;
  if (!email) throw new functions.https.HttpsError("invalid-argument", "Falta el email del mentor");

  try {
    const preRegSnap = await db.collection("mentorPreRegistrations")
      .where("email", "==", email).where("status", "==", "pending").limit(1).get();

    if (preRegSnap.empty) throw new functions.https.HttpsError("not-found", "No hay registro pendiente");

    const preRegDoc = preRegSnap.docs[0];
    const preData = preRegDoc.data();
    const tempPassword = "Mentor" + Math.floor(1000 + Math.random() * 9000) + "!";

    const userRecord = await admin.auth().createUser({
      email: email, password: tempPassword, displayName: preData.fullName, emailVerified: true,
    });

    await db.collection("userProfiles").doc(userRecord.uid).set({
      fullName: preData.fullName, email, role: "mentor", status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await preRegDoc.ref.update({ status: "approved", uid: userRecord.uid });

    await transporter.sendMail({
      from: '"Innovug" <mentoriasinnovug@gmail.com>',
      to: email,
      subject: "¡Felicidades! Cuenta Aprobada",
      html: `<p>Tu clave temporal es: <b>${tempPassword}</b></p>`,
    });
    return { success: true };
  } catch (error) { throw new functions.https.HttpsError("internal", error.message); }
});

// --- 2. FUNCIÓN GENÉRICA PARA CORREOS (Ej: Para el link de Meet) ---
exports.sendNotificationEmail = functions.region(REGION).https.onCall(async (data, context) => {
  const { to, subject, html } = data;
  if (!to || !subject || !html) throw new functions.https.HttpsError("invalid-argument", "Datos incompletos");

  try {
    await transporter.sendMail({
      from: '"Innovug" <mentoriasinnovug@gmail.com>',
      to, subject, html
    });
    return { success: true };
  } catch (error) { throw new functions.https.HttpsError("internal", error.message); }
});

// --- 3. FUNCIÓN PARA GOOGLE MEET ---
exports.createCalendarEvent = functions.region(REGION).https.onCall(async (data, context) => {
  const { google } = require('googleapis');
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login requerido');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const { summary, description, startTime, endTime, attendees = [] } = data;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      resource: {
        summary, description,
        start: { dateTime: startTime },
        end: { dateTime: endTime },
        attendees: attendees.map(email => ({ email })),
        conferenceData: { createRequest: { requestId: `meet-${Date.now()}` } },
      },
    });
    return { ok: true, event: response.data };
  } catch (err) { throw new functions.https.HttpsError('internal', err.message); }
});

// --- 4. TRIGGERS AUTOMÁTICOS (Aprobar/Cancelar citas en Firestore) ---
exports.onAppointmentUpdated = functions.region(REGION).firestore.document("appointments/{id}").onUpdate(async (change) => {
  const after = change.after.data();
  const before = change.before.data();
  if (before.status === after.status) return null;

  const subject = after.status === "approved" ? "Cita Aprobada" : "Cita Cancelada/Actualizada";
  
  await transporter.sendMail({
    from: '"Innovug" <mentoriasinnovug@gmail.com>',
    to: [after.mentorEmail, after.emprendedorEmail],
    subject: subject,
    html: `<p>La cita para <b>${after.reason}</b> ahora está: <b>${after.status}</b></p>`
  });
});

exports.getAIRecommendations = functions.region("us-east1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login requerido');
  
  const { description, programType } = data;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: `Basado en la descripción: "${description}" y el programa "${programType}", sugiere 4 áreas de mentoría. Responde solo el texto del resumen.` }],
      model: "llama-3.1-8b-instant",
    });
    return { ok: true, summary: completion.choices[0].message.content };
  } catch (err) { throw new functions.https.HttpsError('internal', err.message); }
});

// --- IA: RESUMEN DE REUNIÓN (Administrador) ---
exports.summarizeMeeting = functions.region("us-east1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login requerido');

  const { transcript, meetingInfo } = data;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: `Resume esta transcripción de mentoría: ${transcript}. Info adicional: ${meetingInfo}` }],
      model: "llama-3.3-70b-versatile", 
    });
    return { ok: true, summary: completion.choices[0].message.content };
  } catch (err) { throw new functions.https.HttpsError('internal', err.message); }
});

// --- IA: TRANSCRIPCIÓN (Administrador) ---
// Nota: La transcripción de audio requiere manejar archivos binarios. 
// Groq soporta Whisper para archivos de hasta 25MB.
exports.transcribeAudio = functions.region("us-east1").runWith({ timeoutSeconds: 300, memory: '1GB' }).https.onCall(async (data, context) => {
    // Para archivos grandes en Cloud Functions, es mejor subir el archivo a Firebase Storage 
    // y pasar la URL a la función, pero aquí usaremos Base64 para simplicidad si el audio es corto.
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const { fileBase64, fileName } = data;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const filePath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(filePath, Buffer.from(fileBase64, 'base64'));

    try {
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-large-v3",
      });
      return { ok: true, transcript: transcription.text };
    } catch (err) { throw new functions.https.HttpsError('internal', err.message); }
});