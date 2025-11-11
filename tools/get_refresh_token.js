const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const app = express();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local');
  process.exit(1);
}

// Use localhost:3000 for this OAuth flow (separate from meet_server's 5001)
// You MUST add http://localhost:3000/auth/google/callback to your Google Cloud Console OAuth client redirect URIs
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// scopes: use calendar.events for meet links
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
  console.log('✓ Generating OAuth URL with redirect_uri:', REDIRECT_URI);
  console.log('✓ Auth URL:', url.substring(0, 80) + '...');
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');
    console.log('✓ Received auth code, exchanging for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // save tokens to file for tools/meet_server.js to pick up
    const outPath = path.resolve(process.cwd(), '.tools_google_tokens.json');
    fs.writeFileSync(outPath, JSON.stringify(tokens, null, 2));

    console.log('✓ Tokens saved to', outPath);
    if (tokens.refresh_token) {
      console.log('✓ SUCCESS! Refresh token:', tokens.refresh_token);
    } else {
      console.warn('⚠️  No refresh_token in response. Make sure you used prompt: consent.');
    }
    res.send('OK — Tokens saved locally. Puedes cerrar esta ventana y reiniciar meet_server.');
  } catch (err) {
    console.error('✗ auth callback error:', err.message || err);
    res.status(500).send('Auth failed: ' + (err.message || err));
  }
});

const PORT = process.env.GET_REFRESH_PORT || 3000;
app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Google OAuth Token Getter');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✓ Servidor iniciado en puerto', PORT);
  console.log('');
  console.log('IMPORTANTE: Antes de continuar, asegúrate de que en Google Cloud Console');
  console.log('agregaste ESTA redirect URI a tu OAuth client:');
  console.log('  → http://localhost:3000/auth/google/callback');
  console.log('');
  console.log('Abre en tu navegador:');
  console.log('  → http://localhost:3000/auth/google');
  console.log('');
  console.log('Luego completa el flujo de consentimiento.');
  console.log('═══════════════════════════════════════════════════════════\n');
});

// helper when run directly: print instructions
if (require.main === module) {
  console.log('\nInstrucciones:');
  console.log('- Asegúrate de que tu OAuth client en Google Cloud Console tiene la redirect URI: ' + REDIRECT_URI);
  console.log('- Ejecuta: node tools/get_refresh_token.js');
  console.log('- Abre en el navegador la URL mostrada y concede permisos.');
}
