// index.js (Node 18+, ESM)
// ------------------------
import express from 'express';
import fetch from 'node-fetch';

const app = express();

// ====== 0) БЕЗПЕКА/СТАБІЛЬНІСТЬ ======
process.on('unhandledRejection', (e) => console.error('[UNHANDLED]', e));
process.on('uncaughtException', (e) => {
  console.error('[UNCAUGHT]', e);
  process.exit(1);
});

// ====== 1) Джерела конфігурації ======
// Основний GAS WebApp (краще задати у Render → Environment)
const ENV_SHEETS_WEBAPP_URL = (process.env.SHEETS_WEBAPP_URL || '').trim();

// Кеш конфіга з аркуша CONFIG (res=kv&mode=list)
let cfg = {
  fetchedAt: 0,
  allow: [],     // точні origin'и
  allowRx: [],   // патерни типу https://*.shifttime.com.ua
  gasUrlKV: '',  // якщо в CONFIG є ключ SHEETS_WEBAPP_URL
};

// утиліта: '*.domain' -> RegExp
const toRegex = (pat) =>
  new RegExp(
    '^' +
      pat
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*') +
      '$'
  );

// підтягнути CONFIG з GAS (TTL 60 сек)
async function refreshConfig(force = false) {
  const TTL_MS = 60_000;
  if (!force && Date.now() - cfg.fetchedAt < TTL_MS) return cfg;

  const base = getSheetsBase();
  if (!base) {
    cfg.fetchedAt = Date.now();
    return cfg;
  }

  const url = `${base.replace(/\/+$/, '')}?res=kv&mode=list`;
  try {
    const r = await fetch(url, { method: 'GET' });
    const list = await r.json();

    // очікуємо або масив {key,value}, або готовий об'єкт
    const kv =
      Array.isArray(list)
        ? Object.fromEntries(list.map((i) => [i.key, i.value]))
        : list || {};

    // CORS_ALLOWLIST: коми, підтримка wildcard
    const raw = String(kv.CORS_ALLOWLIST || process.env.CORS_ALLOWLIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    cfg = {
      fetchedAt: Date.now(),
      allow: raw.filter((s) => !s.includes('*')),
      allowRx: raw.filter((s) => s.includes('*')).map(toRegex),
      gasUrlKV: String(kv.SHEETS_WEBAPP_URL || '').trim(),
    };

    console.log(
      '[CORS] allow =',
      cfg.allow,
      '| patterns =',
      raw.filter((s) => s.includes('*'))
    );
  } catch (e) {
    console.warn('[CONFIG] refresh failed:', e?.message || e);
    cfg.fetchedAt = Date.now();
  }
  return cfg;
}

function isAllowed(origin) {
  if (!origin) return false;
  if (cfg.allow.includes(origin)) return true;
  return cfg.allowRx.some((rx) => rx.test(origin));
}

// Який URL GAS використовуємо: ENV має пріоритет, далі — KV
function getSheetsBase() {
  return (ENV_SHEETS_WEBAPP_URL || cfg.gasUrlKV || '').trim();
}

// ====== 2) CORS middleware з дзеркалом дозволеного origin ======
app.use(async (req, res, next) => {
  await refreshConfig();

  const origin = req.headers.origin;
  if (origin && isAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Ехо запитаних клієнтом методів/заголовків
    const reqMethod = req.headers['access-control-request-method'];
    const reqHeaders = req.headers['access-control-request-headers'];

    res.setHeader(
      'Access-Control-Allow-Methods',
      reqMethod || 'GET,POST,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      reqHeaders || 'Content-Type, Authorization'
    );

    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

// ====== 3) Тіло запиту ======
app.use(express.json({ limit: '1mb' }));

// ====== 4) Службові маршрути ======
app.get('/ping', async (_, res) => {
  await refreshConfig(true);
  res.json({
    ok: true,
    gasUrl: getSheetsBase() || '(not set)',
    allow: cfg.allow,
    patterns: cfg.allowRx.map((r) => r.source),
    fetchedAt: cfg.fetchedAt,
  });
});

app.get('/', (_, res) => {
  res.type('text/plain').send('ShiftTime proxy is up');
});

// ====== 5) Проксі на GAS: /send і /writeNumber ======
async function forwardToGAS(payload) {
  const base = getSheetsBase();
  if (!base) {
    throw new Error(
      'SHEETS_WEBAPP_URL is not configured (env or CONFIG.SHEETS_WEBAPP_URL)'
    );
  }
  const url = base.replace(/\/+$/, '');
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'ShiftTimeProxy/1.0' },
    body: JSON.stringify(payload || {}),
  });
  const text = await r.text();

  // якщо GAS повернув JSON — віддаємо як є; інакше — 502
  try {
    const json = JSON.parse(text);
    return { status: r.status, json };
  } catch {
    return {
      status: 502,
      json: { success: false, error: 'GAS returned non-JSON', body: text.slice(0, 500) },
    };
  }
}

app.post('/send', async (req, res) => {
  try {
    const { status, json } = await forwardToGAS(req.body);
    res.status(status).json(json);
  } catch (e) {
    console.error('❌ /send error:', e);
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

// альтернативний мінімальний запис лише числа (залишив для зручності)
app.post('/writeNumber', async (req, res) => {
  try {
    const payload = {
      surname: '',
      name: '',
      patronymic: '',
      number: req.body?.value || 0,
    };
    const { status, json } = await forwardToGAS(payload);
    res.status(status).json(json);
  } catch (e) {
    console.error('❌ /writeNumber error:', e);
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

// ====== 6) Старт сервера ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Proxy-сервер слухає порт ${PORT} — /ping для перевірки`)
);
