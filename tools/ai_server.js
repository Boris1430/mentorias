const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const OpenAI = require('openai').default || require('openai');
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const PORT = process.env.AI_SERVER_PORT || 5002;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) console.warn('Warning: GROQ_API_KEY not set in .env.local — ai_server will not be able to call Groq');

const client = new OpenAI({ apiKey: GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post('/recommend', async (req, res) => {
  try {
    const { description, programType } = req.body;
    if (!description) return res.status(400).json({ ok: false, error: 'Missing description' });

    const prompt = `Eres un asistente de mentoría. Dado el siguiente texto de proyecto y el programa (${programType}), devuelve 4 recomendaciones de mentoría cortas y específicas.` +
      `Cada recomendación debe estar en prosa (1-2 oraciones) seguida de una breve explicación (1 oración).` +
      ` **Responde SOLO en texto plano**: no uses numeración, viñetas, etiquetas HTML, bloques de código, fragmentos de Python ni ninguna sección etiquetada como <tool> o <output>.` +
      ` No añadas ninguna explicación meta ni ejemplos de código. Usa únicamente las mentorías indicadas en el texto (no inventes otras).\n\nProyecto: ${description}`;

    const response = await client.responses.create({
      model: 'groq/compound',
      input: prompt,
      max_output_tokens: 400,
    });

    const output = response.output && response.output[0] && response.output[0].content ? response.output[0].content : null;
    let text = Array.isArray(output) ? output.map((c) => c.text || c.trim()).join('\n') : (typeof output === 'string' ? output : response.output_text || JSON.stringify(response));

    const sanitize = (input) => {
      if (!input) return '';
      let t = input;
      t = t.replace(/```[\s\S]*?```/g, '');
      t = t.replace(/<tool>[\s\S]*?<\/tool>/gi, '');
      t = t.replace(/<output>[\s\S]*?<\/output>/gi, '');
      t = t.split(/\r?\n/).filter((line) => {
        const l = line.trim();
        if (!l) return false;
        if (/^python\(/i.test(l)) return false;
        if (/^cell in\[?/i.test(l)) return false;
        if (/syntaxerror/i.test(l)) return false;
        if (/^(<|>)/.test(l)) return false;
        return true;
      }).join('\n');
      t = t.replace(/\n{2,}/g, '\n');
      return t.trim();
    };

    text = sanitize(text);

    return res.json({ ok: true, summary: text });
  } catch (err) {
    console.error('recommend error', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'ai error' });
  }
});

app.post('/summarize', async (req, res) => {
  try {
    let { transcript, meetingInfo } = req.body;
    if (!transcript) return res.status(400).json({ ok: false, error: 'Missing transcript' });

    if (transcript.length > 30000) {
      transcript = transcript.substring(0, 30000) + "... [Transcripción truncada]";
    }

    const prompt = `Eres un asistente que resume reuniones. Recibirás la transcripción de una reunión y devolverás un resumen estructurado con: 1) Resumen en 3-4 frases; 2) Acciones a realizar (lista); 3) Puntos clave/decisiones. Devuelve solo texto formateado.` +
      `\n\nInformación de la sesión: ${meetingInfo || 'N/A'}\n\nTranscripción:\n${transcript}`;

    const response = await client.responses.create({
      model: 'groq/compound',
      input: prompt,
      max_output_tokens: 800,
    });

    const output = response.output && response.output[0] && response.output[0].content ? response.output[0].content : null;
    let text = Array.isArray(output) ? output.map((c) => c.text || c.trim()).join('\n') : (typeof output === 'string' ? output : response.output_text || JSON.stringify(response));
    
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/<tool>[\s\S]*?<\/tool>/gi, '');
    text = text.replace(/<output>[\s\S]*?<\/output>/gi, '');
    text = text.split(/\r?\n/).filter(Boolean).join('\n');

    return res.json({ ok: true, summary: text });
  } catch (err) {
    console.error('summarize error', err?.message || err);
    const status = err.status === 413 ? 413 : 500;
    return res.status(status).json({ ok: false, error: err?.message || 'ai error' });
  }
});

app.post('/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'Missing file' });
    if (!GROQ_API_KEY) return res.status(500).json({ ok: false, error: 'GROQ_API_KEY not set' });

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    
    const tempFile = path.join(tempDir, `audio_${Date.now()}.mp3`);
    fs.writeFileSync(tempFile, req.file.buffer);

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: 'whisper-large-v3', 
      language: 'es',
    });

    fs.unlinkSync(tempFile);

    const transcript = transcription?.text || '';
    return res.json({ ok: true, transcript });
  } catch (err) {
    console.error('transcribe error', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'transcription failed' });
  }
});

app.listen(PORT, () => console.log(`AI proxy server listening on http://localhost:${PORT}`));