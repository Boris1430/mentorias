#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const argv = require('minimist')(process.argv.slice(2));
const uidArg = argv.uid || argv.u;
const emailArg = argv.email || argv.e;
const role = argv.role || 'mentor';
const fullName = argv.fullName || argv.name || 'Perfil creado manualmente';
const program = argv.program || '';

if (!uidArg && !emailArg) {
  console.error('Uso: node tools/create_profile.js --uid <uid> [--role mentor|emprendedor] [--name "Nombre"]');
  console.error(' O: node tools/create_profile.js --email user@example.com --role mentor');
  process.exit(1);
}

try {
  if (!admin.apps.length) {
    let keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'mentorias-innovug-firebase-adminsdk.json');
    if (!fs.existsSync(keyPath)) {
      const candidates = fs.readdirSync(__dirname).filter(f => f.toLowerCase().endsWith('.json'));
      for (const f of candidates) {
        const p = path.join(__dirname, f);
        try {
          const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (parsed && parsed.type === 'service_account') {
            keyPath = p;
            break;
          }
        } catch (e) {}
      }
    }

    if (!fs.existsSync(keyPath)) {
      console.error('No se encontró el archivo de service account JSON en tools/. Coloca el JSON del proyecto mentorias-innovug en tools/ y vuelve a ejecutar.');
      process.exit(1);
    }

    const serviceAccount = require(keyPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (err) {
  console.error('Error inicializando firebase-admin:', err.message);
  process.exit(1);
}

async function run() {
  try {
    const auth = admin.auth();
    let uid = uidArg;
    let email = emailArg;

    if (!uid && email) {
      try {
        const userRecord = await auth.getUserByEmail(email);
        uid = userRecord.uid;
        console.log('Usuario encontrado:', uid);
      } catch (err) {
        console.error('No se encontró usuario con email:', email);
        process.exit(1);
      }
    }

    const db = admin.firestore();
    const docRef = db.collection('userProfiles').doc(uid);
    await docRef.set({
      uid,
      email: email || null,
      full_name: fullName,
      role,
      program: program || null,
      phone: '',
      bio: '',
      expertise: [],
      availability: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Perfil creado: userProfiles/${uid}`);
    process.exit(0);
  } catch (err) {
    console.error('Error creando perfil:', err.message || err);
    process.exit(1);
  }
}

run();
