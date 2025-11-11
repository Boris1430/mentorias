const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/oauth2callback';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || null;
const USER_EMAIL = process.env.GOOGLE_USER_EMAIL || 'primary';
const PORT = process.env.MEET_SERVER_PORT || 5001;

const TOKEN_STORE = path.resolve(process.cwd(), '.tools_google_tokens.json');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

if (REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
} else if (fs.existsSync(TOKEN_STORE)) {
  try {
    const stored = JSON.parse(fs.readFileSync(TOKEN_STORE, 'utf8'));
    oauth2Client.setCredentials(stored);
  } catch (e) {
    console.warn('Could not read stored tokens:', e.message);
  }
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/auth', (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) return res.status(400).send('Missing GOOGLE_CLIENT_ID/SECRET in .env.local');
  const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_STORE, JSON.stringify(tokens, null, 2));
    return res.send('OK — Tokens saved locally. You can close this window.');
  } catch (err) {
    console.error('oauth2callback error', err);
    return res.status(500).send('Auth failed: ' + err.message);
  }
});

async function ensureClient() {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Missing GOOGLE_CLIENT_ID/CLIENT_SECRET in .env.local');
  try {
    const tokens = oauth2Client.credentials;
    if (!tokens?.refresh_token && !REFRESH_TOKEN) {
      throw new Error('No refresh token available. Visit /auth to complete OAuth flow and obtain a refresh token.');
    }
    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (err) {
    throw err;
  }
}

app.post('/create-event', async (req, res) => {
  try {
    const { summary, description, startTime, endTime, attendees = [] } = req.body;
    const calendar = await ensureClient();

    const event = {
      summary: summary || 'Mentoría - Centro Innovug',
      description: description || '',
      start: { dateTime: startTime || new Date().toISOString() },
      end: { dateTime: endTime || new Date(Date.now() + 1000 * 60 * 60).toISOString() },
      attendees: attendees.map((e) => ({ email: e })),
      conferenceData: { createRequest: { requestId: `innovug-${Date.now()}` } },
    };

    console.log('create-event: using calendarId =', USER_EMAIL);
    const response = await calendar.events.insert({
      calendarId: USER_EMAIL,
      resource: event,
      conferenceDataVersion: 1,
    });

    return res.json({ ok: true, event: response.data });
  } catch (err) {
    try {
      console.error('create-event error - response data:', err?.response?.data);
      console.error('create-event error - response status:', err?.response?.status);
    } catch (e) {
      // ignore
    }
    console.error('create-event error - message:', err?.message || err);
    console.error(err?.stack || 'no stack');

    let errorBody = err?.response?.data || err?.message || String(err);

    try {
      const respData = err?.response?.data;
      if (respData && (respData.error === 'invalid_grant' || (respData.error_description && /expired|revoked/i.test(respData.error_description)))) {
        errorBody = {
          code: 'invalid_grant',
          message: 'El token de refresco ha expirado o fue revocado. Debes volver a autorizar la cuenta: visita /auth y completa el flujo OAuth para generar un nuevo refresh token.',
          details: respData,
        };
      }
    } catch (e) {
      
    }

    return res.status(500).json({ ok: false, error: errorBody });
  }
});

app.get('/health', async (req, res) => {
  try {
    const tokens = oauth2Client.credentials || {};
    const access = await oauth2Client.getAccessToken();
    return res.json({ ok: true, tokensPresent: !!tokens.refresh_token, accessToken: access?.token || null });
  } catch (err) {
    console.error('health check error', err?.response?.data || err?.message || err);
    return res.status(500).json({ ok: false, error: err?.response?.data || err?.message || String(err) });
  }
});

app.listen(PORT, () => console.log(`Google Meet helper server listening on http://localhost:${PORT}`));
