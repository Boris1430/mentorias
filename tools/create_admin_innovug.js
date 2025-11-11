#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Leer argumentos
const argv = require('minimist')(process.argv.slice(2));
const email = argv.email || argv.e || process.env.ADMIN_EMAIL || 'innovug@ug.edu.ec';
const password = argv.password || argv.p || process.env.ADMIN_PASSWORD || 'MentoriasUG';

console.log('\n═══════════════════════════════════════════════════');
console.log('Crear Usuario Admin en mentorias-innovug');
console.log('═══════════════════════════════════════════════════\n');
console.log(`Email: ${email}`);
console.log(`Contraseña: ${password}\n`);

try {
  if (!admin.apps.length) {
    // Buscar archivo de clave de servicio
    let keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'mentorias-innovug-firebase-adminsdk.json');

    if (!fs.existsSync(keyPath)) {
      // Buscar archivos JSON que sean service account
      const candidates = fs.readdirSync(__dirname).filter(f => f.toLowerCase().endsWith('.json'));
      let found = null;
      for (const f of candidates) {
        const p = path.join(__dirname, f);
        try {
          const content = fs.readFileSync(p, 'utf8');
          const parsed = JSON.parse(content);
          if (parsed && parsed.type === 'service_account') {
            found = p;
            console.log(`✓ Service account encontrado: ${f}`);
            break;
          }
        } catch (e) {
          // ignorar JSON inválido
        }
      }

      if (found) {
        keyPath = found;
      }
    }

    if (!fs.existsSync(keyPath)) {
      console.error('\n✗ ERROR: No se encontró el archivo de clave de servicio.');
      console.error('Descarga la clave desde Google Firebase Console:');
      console.error('1. Ve a: https://console.firebase.google.com/');
      console.error('2. Selecciona el proyecto "mentorias-innovug"');
      console.error('3. Ve a: Configuración del proyecto → Cuentas de servicio');
      console.error('4. Haz clic en "Generar nueva clave privada"');
      console.error('5. Guarda el JSON en: tools/mentorias-innovug-firebase-adminsdk.json\n');
      process.exit(1);
    }

    const serviceAccount = require(keyPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (err) {
  console.error('✗ Error inicializando firebase-admin:', err.message);
  process.exit(1);
}

async function createAdmin() {
  try {
    let userRecord;
    try {
      // Intentar obtener usuario existente
      userRecord = await admin.auth().getUserByEmail(email);
      console.log(`ℹ Usuario encontrado: ${userRecord.uid}`);

      if (argv.password || argv.force || argv.reset) {
        try {
          await admin.auth().updateUser(userRecord.uid, { password });
          console.log('✓ Contraseña actualizada.\n');
        } catch (pwErr) {
          console.error('✗ No se pudo actualizar contraseña:', pwErr.message);
        }
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`Creando usuario con email: ${email}...`);
        userRecord = await admin.auth().createUser({ email, password });
        console.log(`✓ Usuario creado: ${userRecord.uid}\n`);
      } else {
        throw err;
      }
    }

    // Asignar custom claims
    console.log('Asignando claims de admin...');
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    console.log('✓ Claims asignados: { admin: true }\n');

    // Crear perfil en Firestore
    console.log('Creando perfil en Firestore...');
    const db = admin.firestore();
    await db.collection('userProfiles').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      full_name: 'Admin Innovug',
      role: 'admin',
      phone: '',
      bio: '',
      expertise: [],
      availability: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✓ Perfil creado: userProfiles/${userRecord.uid}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('✓ ADMIN CREADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\nEmail: ${email}`);
    console.log(`Contraseña: ${password}`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('\nPuedes usar estas credenciales para iniciar sesión en la app.\n');

    process.exit(0);
  } catch (err) {
    console.error('\n✗ ERROR:', err.message);
    if (err.code === 'auth/email-already-exists') {
      console.error(`El email ${email} ya existe en la base de datos.`);
      console.error('Intenta eliminar el usuario manualmente o usa --force para resetear.\n');
    }
    process.exit(1);
  }
}

createAdmin();
