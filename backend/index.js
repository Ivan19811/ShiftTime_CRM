// backend/index.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json({ limit: '1mb' }));

// ---- GAS WebApp URL (у тебе вже є)
const SHEETS_WEBAPP_URL =
  (process.env.SHEETS_WEBAPP_URL || '').replace(/\/+$/, '');

// ====== CORS allowlist: динамічна конфігурація ======
let allowlistRules = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'https://shifttime-crm-test.netlify.app'
]);

const parseRules = (str) =>
  String(str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

async function refreshConfig() {
  try {
    let fromSheet = [];
    if (SHEETS_WEBAPP_URL) {
      const url = `${SHEETS_WEBAPP_URL}?res=kv&mode=list`;
      const r = await fetch(url);
      const j = await r.json();
      const kv = Array.isArray(j)
        ? j.reduce((a, it) => { a[it.key] = it.value; return a; }, {})
        : (j || {});
      // можна задавати в CONFIG ключ CORS_ALLOWLIST або ALLOWLIST
      fromSheet = parseRules(kv.CORS_ALLOWLIST || kv.ALLOWLIST);
    }

    const fromEnv = parseRules(process.env.CORS_ALLOWLIST);
    const merged = [...new Set([...fromEnv, ...fromSheet])];

    if (merged.length) {
      allowlistRules = new Set(merged);
    }
    console.log('[CORS] allowlist =', [...allowlistRules]);
  } catch (e) {
    console.warn('[CORS] refreshConfig failed:', e.message);
  }
}

// стартове завантаження + періодичне оновлення
await refreshConfig().catch(()=>{});
setInterval(refreshConfig, 10 * 60 * 1000); // раз на 10 хв

function wildcardToRegex(rule) {
  if (rule.startsWith('regex:')) return new RegExp(rule.slice(6));
  // підтримка *.domain.com
  const esc = rule
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '.*');
  return new RegExp(`^${esc}$`);
}
function isAllowed(origin) {
  if (!origin) return false;
  const rules = [...allowlistRules].map(wildcardToRegex);
  return rules.some(re => re.test(origin));
}

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  return next();
});

// (необов'язково) ручне оновлення конфіга без перезапуску
app.post('/admin/reload-config', async (req, res) => {
  // додай простий секрет, якщо треба
  await refreshConfig();
  res.json({ ok: true, allowlist: [...allowlistRules] });
});

// ---- далі твій існуючий код
app.get('/ping', (_, res) => res.type('text/plain').send('ok'));

// ... /send, /writeNumber і т.д. без змін

