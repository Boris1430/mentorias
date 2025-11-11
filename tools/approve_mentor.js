#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ===== INIT ADMIN =====
if (!admin.apps.length) {
  const keyPath = path.join(__dirname, 'mentorias-innovug-firebase-adminsdk.json');
  admin.initializeApp({
    credential: admin.credential.cert(require(keyPath))
  });
}

const db = admin.firestore();

/**
 * Aprobar mentor desde pre-registro
 */
async function approveMentor(preRegId) {
  const preRef = db.collection('mentorPreRegistrations').doc(preRegId);
  const preSnap = await preRef.get();

  if (!preSnap.exists) {
    throw new Error('Pre-registro no existe');
  }

  const data = preSnap.data();

  if (data.status !== 'pending') {
    throw new Error('Este mentor ya fue procesado');
  }

  // 1️⃣ Crear usuario Auth
  const user = await admin.auth().createUser({
    email: data.email,
    password: data.password,
    emailVerified: true,
  });

  const uid = user.uid;

  // 2️⃣ Crear perfil
  await db.collection('userProfiles').doc(uid).set({
    uid,
    email: data.email,
    fullName: data.fullName,
    role: 'mentor',
    program: data.program,
    specialization: data.specialization,
    experience: data.experience,
    curriculumUrl: data.curriculumUrl || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 3️⃣ Claims
  await admin.auth().setCustomUserClaims(uid, { mentor: true });

  // 4️⃣ Actualizar pre-registro
  await preRef.update({
    status: 'approved',
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    uid
  });

  console.log(`✓ Mentor aprobado: ${data.email}`);
  return uid;
}

// ===== CLI =====
const preRegId = process.argv[2];
if (!preRegId) {
  console.error('Uso: node approve_mentor.js <preRegistrationId>');
  process.exit(1);
}

approveMentor(preRegId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });