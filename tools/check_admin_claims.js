const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const email = argv.email || argv.e || process.env.ADMIN_EMAIL;
if (!email) {
  console.error('Usage: node tools/check_admin_claims.js --email=you@example.com');
  process.exit(1);
}

function initAdmin() {
  if (admin.apps.length) return;
  let keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(keyPath)) {
    const candidates = fs.readdirSync(__dirname).filter(f => f.toLowerCase().endsWith('.json'));
    let found = null;
    for (const f of candidates) {
      const p = path.join(__dirname, f);
      try {
        const content = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed && parsed.type === 'service_account') { found = p; break; }
      } catch (e) {}
    }
    if (found) keyPath = found;
  }

  if (!fs.existsSync(keyPath)) {
    console.error('No service account JSON found in tools/. Set GOOGLE_APPLICATION_CREDENTIALS or place a service account JSON in tools/.');
    process.exit(1);
  }

  const serviceAccount = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function checkClaim() {
  try {
    initAdmin();
    const user = await admin.auth().getUserByEmail(email);
    console.log('User found:', user.uid);
    console.log('Custom claims:', user.customClaims || {});
    if (user.customClaims && user.customClaims.admin === true) {
      console.log('\n-> Este usuario TIENE el claim admin = true');
    } else {
      console.log('\n-> Este usuario NO tiene el claim admin (o es false).');
      console.log('Si quieres, ejecútate: npm run create-admin -- --email=' + email + ' --password=TuPass123! para volver a asignarlo.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error al comprobar claims:', err);
    process.exit(1);
  }
}

checkClaim();
