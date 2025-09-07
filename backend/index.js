import fetch from 'node-fetch';
import express from 'express';

const app = express();

const SHEETS_WEBAPP_URL = process.env.SHEETS_WEBAPP_URL || ''; // твій GAS /exec

// --- util: pattern *.domain → RegExp
const toRegex = (pat) =>
  new RegExp('^' + pat
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '.*') + '$');

let cfg = { allow: [], allowRx: [], fetchedAt: 0 };

async function refreshConfig(force = false) {
  const freshEnough = Date.now() - cfg.fetchedAt < 60_000; // 60s TTL
  if (!force && freshEnough) return cfg;

  try {
    const url = `${SHEETS_WEBAPP_URL.replace(/\/+$/,'')}?res=kv&mode=list`;
    const r = await fetch(url);
    const list = await r.json();

    // очікуємо або масив {key,value}, або вже об’єкт
    const kv = Array.isArray(list)
      ? Object.fromEntries(list.map(i => [i.key, i.value]))
      : (list || {});

    // джерела allowlist: CONFIG → env override
    const raw = (kv.CORS_ALLOWLIST || process.env.CORS_ALLOWLIST || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    cfg = {
      allow: raw.filter(s => !s.includes('*')),
      allowRx: raw.filter(s => s.includes('*')).map(toRegex),
      fetchedAt: Date.now(),
    };

    console.log('[CORS] allowlist =', cfg.allow, ' | patterns =', raw.filter(s=>s.includes('*')));
  } catch (e) {
    console.warn('[CORS] refresh failed:', e.message);
  }
  return cfg;
}

function isAllowed(origin) {
  if (!origin) return false;
  if (cfg.allow.includes(origin)) return true;
  return cfg.allowRx.some(rx => rx.test(origin));
}

// --- CORS middleware (дзеркалимо саме той origin, який дозволено)
app.use(async (req, res, next) => {
  await refreshConfig(); // ледь-ледь дешеве; кешується
  const origin = req.headers.origin;

  if (origin && isAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/ping', async (_, res) => {
  await refreshConfig(true);
  res.json({ ok: true, allow: cfg.allow, patterns: cfg.allowRx.map(r => r.source) });
});
