const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
require("dotenv").config();

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ================= TRANSPORTER =================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: Number(process.env.EMAIL_SMTP_PORT),
  secure: process.env.EMAIL_SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS,
  },
});

// ================= APPROVE MENTOR =================
exports.approveMentor = functions.https.onRequest(async (req, res) => {
  // CORS manual simple
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Falta el email" });
  }

  try {
    // Buscar pre-registro
    const snap = await db
      .collection("mentorPreRegistrations")
      .where("email", "==", email)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (snap.empty) {
      return res
        .status(404)
        .json({ error: "No existe un pre-registro pendiente" });
    }

    const doc = snap.docs[0];
    const data = doc.data();

    // Crear usuario
    const tempPassword =
      Math.random().toString(36).slice(-8) + "Aa1!";

    const user = await auth.createUser({
      email: data.email,
      password: tempPassword,
      displayName: data.fullName,
    });

    // Guardar perfil
    await db.collection("userProfiles").doc(user.uid).set({
      fullName: data.fullName,
      email: data.email,
      role: "mentor",
      specialization: data.specialization || "",
      program: data.program || "",
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Actualizar preregistro
    await doc.ref.update({
      status: "approved",
      uid: user.uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ================= ENVIAR CORREO =================
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: data.email,
      subject: "Tu cuenta de mentor ha sido aprobada",
      html: `
        <h2>Hola ${data.fullName}</h2>
        <p>Tu cuenta de mentor ha sido aprobada.</p>
        <p><strong>Credenciales:</strong></p>
        <ul>
          <li>Email: ${data.email}</li>
          <li>Contraseña temporal: ${tempPassword}</li>
        </ul>
        <p>Por favor cambia tu contraseña al iniciar sesión.</p>
      `,
    });

    return res.json({
      ok: true,
      message: "Mentor aprobado y correo enviado",
    });
  } catch (error) {
    console.error("❌ Error approveMentor:", error);
    return res.status(500).json({ error: error.message });
  }
});
