import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

// --- CORS (стабільний варіант)
const ALLOWLIST = new Set([
  'https://shifttime-crm-test.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  // додаткові домени можна додати сюди
]);

const corsOptions = {
  origin: (origin, cb) => {
    // дозволяємо запити без Origin (наприклад, healthchecks)
    if (!origin) return cb(null, true);
    // дозволяємо тільки зі списку
    return cb(null, ALLOWLIST.has(origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // кеш preflight у браузері
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight OK

app.use(express.json({ limit: '1mb' }));

const SHEETS_WEBAPP_URL = process.env.SHEETS_WEBAPP_URL
  || 'https://script.google.com/macros/s/AKfycbyfGKwSIEhASTWJaayjslWD6wOWDFYyznlmUFih9iofphjPBM4KZwaDdNluxeopkVtrfA/exec';

app.get('/ping', (_, res) => res.type('text/plain').send('ok'));

app.post('/send', async (req, res) => {
  try {
    const r = await fetch(SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    try {
      JSON.parse(text);
      return res.status(r.status).type('application/json').send(text);
    } catch {
      return res.status(502).json({ success: false, error: 'GAS returned non-JSON', body: text.slice(0, 500) });
    }
  } catch (err) {
    console.error('❌ /send error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Proxy-сервер запущено на порту ${PORT}`));
