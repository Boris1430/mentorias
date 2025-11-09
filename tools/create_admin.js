/*
  Script para crear/asegurar un usuario administrador en Firebase Auth
  Uso:
    - Coloca el JSON de clave de servicio en tools/serviceAccountKey.json (no lo subas a git)
    - O exporta la variable de entorno GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON
    - Ejecuta: npm run create-admin -- --email=admin@tu dominio.com --password=TuPass123

  El script creará el usuario si no existe, establecerá la contraseña y aplicará custom claim { admin: true }.
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Leer args simples
const argv = require('minimist')(process.argv.slice(2));
const email = argv.email || argv.e || process.env.ADMIN_EMAIL;
const password = argv.password || argv.p || process.env.ADMIN_PASSWORD || 'Admin123!';

if (!email) {
  console.error('Error: debes especificar --email o la variable ADMIN_EMAIL');
  process.exit(1);
}

// Inicializar Admin SDK: intenta usar GOOGLE_APPLICATION_CREDENTIALS o varios archivos comunes en tools/
try {
  if (!admin.apps.length) {
    let keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');

    // Si no existe el archivo explícito, buscar automáticamente un JSON válido de service account en la carpeta tools
    if (!fs.existsSync(keyPath)) {
      const candidates = fs.readdirSync(__dirname).filter(f => f.toLowerCase().endsWith('.json'));
      let found = null;
      for (const f of candidates) {
        const p = path.join(__dirname, f);
        try {
          const content = fs.readFileSync(p, 'utf8');
          const parsed = JSON.parse(content);
          if (parsed && parsed.type === 'service_account') {
            found = p;
            break;
          }
        } catch (e) {
          // no es JSON válido o no es service account, continuar
        }
      }

      if (found) {
        keyPath = found;
        console.log('Usando service account encontrado en:', keyPath);
      }
    }

    if (!fs.existsSync(keyPath)) {
      console.error('No se encontró el serviceAccount JSON en', keyPath);
      console.error('Crea el archivo con la clave del servicio (tools/serviceAccountKey.json) o exporta GOOGLE_APPLICATION_CREDENTIALS');
      process.exit(1);
    }

    const serviceAccount = require(keyPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (err) {
  console.error('Error inicializando firebase-admin:', err);
  process.exit(1);
}

async function ensureAdmin() {
  try {
    // Buscar usuario por email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('Usuario encontrado:', userRecord.uid);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log('Usuario no encontrado, creando...');
        userRecord = await admin.auth().createUser({ email, password });
        console.log('Usuario creado:', userRecord.uid);
      } else {
        throw err;
      }
    }

    // Assignar custom claim admin
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    console.log(`Custom claim 'admin' asignado a ${email} (uid: ${userRecord.uid})`);

    // Opcional: puedes crear un documento en Firestore con datos de perfil usando admin.firestore()

    process.exit(0);
  } catch (err) {
    console.error('Error en ensureAdmin:', err);
    process.exit(1);
  }
}

ensureAdmin();
