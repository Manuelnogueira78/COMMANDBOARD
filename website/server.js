'use strict';

/* MATTER+ENERGY website + admin backend.
   Zero-dependency Node.js (>=16). Run: node server.js [port] */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const T = require('./lib/templates');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const PUBLIC = path.join(ROOT, 'public');
const ADMIN = path.join(ROOT, 'admin');
const PORT = Number(process.argv[2] || process.env.PORT || 3000);

/* ---------------- data store ---------------- */

function readJSON(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
  } catch {
    return fallback;
  }
}
function writeJSON(name, value) {
  const file = path.join(DATA, name);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 1));
  fs.renameSync(tmp, file);
}

const store = {
  get site() { return readJSON('site.json', {}); },
  get projects() { return readJSON('projects.json', []); },
  set projects(v) { writeJSON('projects.json', v); },
  get news() { return readJSON('news.json', []); },
  set news(v) { writeJSON('news.json', v); },
  get bus() { return readJSON('bus.json', []); },
  set bus(v) { writeJSON('bus.json', v); },
  get users() { return readJSON('users.json', []); },
  set users(v) { writeJSON('users.json', v); },
};

/* ---------------- auth ---------------- */

const SESSION_TTL = 1000 * 60 * 60 * 8; // 8h
const sessions = new Map(); // token -> {email, expires}
const loginAttempts = new Map(); // ip -> [timestamps]
const LOGIN_WINDOW = 1000 * 60 * 10; // 10 min
const LOGIN_MAX_ATTEMPTS = 8;

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, user) {
  const candidate = crypto.scryptSync(password, user.salt, 64);
  const actual = Buffer.from(user.hash, 'hex');
  return candidate.length === actual.length && crypto.timingSafeEqual(candidate, actual);
}
function seedAdmin() {
  const users = store.users;
  if (!users.length) {
    const initial = process.env.ADMIN_PASSWORD || 'PresenceOverPerformance!26';
    const { salt, hash } = hashPassword(initial);
    store.users = [{ email: 'manuel@matter-energy.com', name: 'Manuel Nogueira', role: 'admin', salt, hash, mustChangePassword: !process.env.ADMIN_PASSWORD }];
    console.log('[admin] seeded admin user manuel@matter-energy.com' + (process.env.ADMIN_PASSWORD ? ' (password from ADMIN_PASSWORD)' : ' (default password — change it in the admin)'));
  }
}
function createSession(email) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { email, expires: Date.now() + SESSION_TTL });
  return token;
}
function getSession(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)me_session=([a-f0-9]{64})/);
  if (!m) return null;
  const s = sessions.get(m[1]);
  if (!s) return null;
  if (s.expires < Date.now()) { sessions.delete(m[1]); return null; }
  s.expires = Date.now() + SESSION_TTL;
  return { token: m[1], ...s };
}

/* ---------------- helpers ---------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}
function sendJSON(res, code, obj) {
  send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
}
function serveStatic(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base)) return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, T.notFound(store.site));
    const ext = path.extname(file).toLowerCase();
    const cache = /\/assets\//.test(file) ? 'public, max-age=86400' : 'no-cache';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  });
}
function readBody(req, limit = 1e6) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) { reject(new Error('body too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
async function readJSONBody(req) {
  const raw = await readBody(req);
  try { return JSON.parse(raw || '{}'); } catch { return null; }
}
function slugify(t) {
  return String(t).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').toLowerCase();
}

const PROJECT_FIELDS = ['title', 'client', 'industry', 'sector', 'onePhraser', 'longDescription', 'type', 'year',
  'businessUnits', 'capabilities', 'deliverables', 'credits', 'driveFolder', 'notes', 'published', 'featured',
  'order', 'heroImage', 'gallery', 'video'];

function sanitizeProject(input, existing = {}) {
  const p = { ...existing };
  for (const f of PROJECT_FIELDS) {
    if (!(f in input)) continue;
    let v = input[f];
    if (['businessUnits', 'capabilities', 'deliverables', 'gallery'].includes(f)) {
      v = Array.isArray(v) ? v.map(String) : String(v).split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    } else if (['published', 'featured'].includes(f)) {
      v = Boolean(v);
    } else if (f === 'order') {
      v = Number(v) || 0;
    } else {
      v = String(v);
    }
    p[f] = v;
  }
  return p;
}

/* ---------------- API routes ---------------- */

async function handleAPI(req, res, url) {
  const method = req.method;
  const p = url.pathname;

  if (p === '/api/login' && method === 'POST') {
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const attempts = (loginAttempts.get(ip) || []).filter((t) => now - t < LOGIN_WINDOW);
    if (attempts.length >= LOGIN_MAX_ATTEMPTS) {
      return sendJSON(res, 429, { error: 'Too many attempts. Try again in a few minutes.' });
    }
    const body = await readJSONBody(req);
    if (!body || !body.email || !body.password) return sendJSON(res, 400, { error: 'Email and password required.' });
    const user = store.users.find((u) => u.email.toLowerCase() === String(body.email).toLowerCase());
    if (!user || !verifyPassword(String(body.password), user)) {
      attempts.push(now);
      loginAttempts.set(ip, attempts);
      return sendJSON(res, 401, { error: 'Invalid credentials.' });
    }
    loginAttempts.delete(ip);
    const token = createSession(user.email);
    res.setHeader('Set-Cookie', `me_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}`);
    return sendJSON(res, 200, { ok: true, user: { email: user.email, name: user.name, mustChangePassword: !!user.mustChangePassword } });
  }

  const session = getSession(req);

  if (p === '/api/session' && method === 'GET') {
    if (!session) return sendJSON(res, 401, { authenticated: false });
    const user = store.users.find((u) => u.email === session.email) || {};
    return sendJSON(res, 200, { authenticated: true, user: { email: session.email, name: user.name, mustChangePassword: !!user.mustChangePassword } });
  }

  if (!session) return sendJSON(res, 401, { error: 'Authentication required.' });

  if (p === '/api/logout' && method === 'POST') {
    sessions.delete(session.token);
    res.setHeader('Set-Cookie', 'me_session=; HttpOnly; Path=/; Max-Age=0');
    return sendJSON(res, 200, { ok: true });
  }

  if (p === '/api/password' && method === 'POST') {
    const body = await readJSONBody(req);
    if (!body || !body.current || !body.next) return sendJSON(res, 400, { error: 'Current and new password required.' });
    if (String(body.next).length < 10) return sendJSON(res, 400, { error: 'New password must be at least 10 characters.' });
    const users = store.users;
    const user = users.find((u) => u.email === session.email);
    if (!user || !verifyPassword(String(body.current), user)) return sendJSON(res, 401, { error: 'Current password is wrong.' });
    const { salt, hash } = hashPassword(String(body.next));
    Object.assign(user, { salt, hash, mustChangePassword: false });
    store.users = users;
    return sendJSON(res, 200, { ok: true });
  }

  /* projects */
  if (p === '/api/projects' && method === 'GET') return sendJSON(res, 200, store.projects);
  if (p === '/api/projects' && method === 'POST') {
    const body = await readJSONBody(req);
    if (!body || !body.title || !body.client) return sendJSON(res, 400, { error: 'Title and client are required.' });
    const projects = store.projects;
    const proj = sanitizeProject(body, {
      published: false, featured: false, order: 1000, heroImage: '', gallery: [], video: '',
      businessUnits: [], capabilities: [], deliverables: [], credits: '', driveFolder: '', notes: '',
      industry: '', sector: '', onePhraser: '', longDescription: '', type: '', year: '',
    });
    proj.id = 'PRJ-' + String(projects.reduce((m, x) => Math.max(m, Number((x.id || '').replace(/\D/g, '')) || 0), 0) + 1).padStart(3, '0');
    let slug = slugify(proj.title);
    while (projects.some((x) => x.slug === slug)) slug += '-2';
    proj.slug = slug;
    projects.push(proj);
    store.projects = projects;
    return sendJSON(res, 201, proj);
  }
  const projMatch = p.match(/^\/api\/projects\/([a-z0-9-]+)$/);
  if (projMatch) {
    const projects = store.projects;
    const idx = projects.findIndex((x) => x.slug === projMatch[1] || x.id === projMatch[1].toUpperCase());
    if (idx === -1) return sendJSON(res, 404, { error: 'Project not found.' });
    if (method === 'GET') return sendJSON(res, 200, projects[idx]);
    if (method === 'PUT' || method === 'PATCH') {
      const body = await readJSONBody(req);
      if (!body) return sendJSON(res, 400, { error: 'Invalid JSON.' });
      projects[idx] = sanitizeProject(body, projects[idx]);
      store.projects = projects;
      return sendJSON(res, 200, projects[idx]);
    }
    if (method === 'DELETE') {
      const [removed] = projects.splice(idx, 1);
      store.projects = projects;
      return sendJSON(res, 200, { ok: true, removed: removed.id });
    }
  }

  /* news */
  if (p === '/api/news' && method === 'GET') return sendJSON(res, 200, store.news);
  const newsMatch = p.match(/^\/api\/news\/([a-z0-9-]+)$/);
  if (newsMatch && (method === 'PUT' || method === 'PATCH')) {
    const items = store.news;
    const idx = items.findIndex((x) => x.slug === newsMatch[1] || x.id === newsMatch[1].toUpperCase());
    if (idx === -1) return sendJSON(res, 404, { error: 'News item not found.' });
    const body = await readJSONBody(req);
    if (!body) return sendJSON(res, 400, { error: 'Invalid JSON.' });
    for (const f of ['title', 'category', 'cta', 'image', 'imageSide', 'excerpt']) if (f in body) items[idx][f] = String(body[f]);
    if ('published' in body) items[idx].published = Boolean(body.published);
    if ('order' in body) items[idx].order = Number(body.order) || items[idx].order;
    store.news = items;
    return sendJSON(res, 200, items[idx]);
  }

  /* business units */
  if (p === '/api/bus' && method === 'GET') return sendJSON(res, 200, store.bus);

  return sendJSON(res, 404, { error: 'Unknown API route.' });
}

/* ---------------- server ---------------- */

seedAdmin();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const p = decodeURIComponent(url.pathname);

    if (p.startsWith('/api/')) return await handleAPI(req, res, url);

    /* static assets */
    if (p.startsWith('/assets/')) return serveStatic(res, PUBLIC, p);
    if (p === '/favicon.ico') return serveStatic(res, PUBLIC, '/assets/logo/icon-matter-black.png');
    if (p === '/sitemap.xml') {
      const base = 'https://matter-energy.com';
      const urls = ['/', '/work', '/archive', '/news', '/about']
        .concat(store.projects.filter((x) => x.published).map((x) => `/work/${x.slug}`))
        .concat(store.news.filter((x) => x.published).map((x) => `/news/${x.slug}`));
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${base}${u}</loc></url>`)
        .join('\n')}\n</urlset>\n`;
      return send(res, 200, xml, { 'Content-Type': 'application/xml; charset=utf-8' });
    }
    if (p === '/robots.txt') {
      /* Ghost verticals are deliberately NOT listed here — a Disallow line would
         reveal the URL. They carry <meta name="robots" content="noindex"> instead. */
      return send(res, 200, `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://matter-energy.com/sitemap.xml\n`, { 'Content-Type': 'text/plain' });
    }

    /* admin */
    if (p === '/admin' || p === '/admin/') {
      const session = getSession(req);
      return serveStatic(res, ADMIN, session ? '/dashboard.html' : '/login.html');
    }
    if (p.startsWith('/admin/')) {
      if (p === '/admin/login.html') return serveStatic(res, ADMIN, '/login.html');
      const session = getSession(req);
      if (!session) return send(res, 302, '', { Location: '/admin' });
      return serveStatic(res, ADMIN, p.replace('/admin', '') || '/dashboard.html');
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', { 'Content-Type': 'text/plain' });

    const site = store.site;
    const projects = store.projects;
    const newsItems = store.news;

    if (p === '/') return send(res, 200, T.home({ site, projects, news: newsItems.filter((n) => n.published) }));
    if (p === '/work') return send(res, 200, T.work({ site, projects, query: Object.fromEntries(url.searchParams) }));
    if (p === '/archive') return send(res, 200, T.archive({ site, projects }));
    if (p === '/news') return send(res, 200, T.news({ site, news: newsItems }));
    if (p === '/about') return send(res, 200, T.about({ site, projects }));

    const caseMatch = p.match(/^\/work\/([a-z0-9-]+)$/);
    if (caseMatch) {
      const published = projects.filter((x) => x.published);
      const proj = projects.find((x) => x.slug === caseMatch[1]);
      if (proj && proj.published) {
        const idx = published.findIndex((x) => x.slug === proj.slug);
        const next = published[(idx + 1) % published.length];
        return send(res, 200, T.workCase({ site, project: proj, next: next && next.slug !== proj.slug ? next : null }));
      }
      return send(res, 404, T.notFound(site));
    }

    const newsMatch = p.match(/^\/news\/([a-z0-9-]+)$/);
    if (newsMatch) {
      const published = newsItems.filter((n) => n.published).sort((a, b) => a.order - b.order);
      const item = published.find((n) => n.slug === newsMatch[1]);
      if (item) {
        const idx = published.findIndex((n) => n.slug === item.slug);
        const next = published[(idx + 1) % published.length];
        return send(res, 200, T.newsArticle({ site, item, next: next && next.slug !== item.slug ? next : null }));
      }
      return send(res, 404, T.notFound(site));
    }

    /* hidden BU verticals: /entertainment, /branding, ... */
    const buMatch = p.match(/^\/([a-z-]+)$/);
    if (buMatch) {
      const bu = store.bus.find((b) => b.slug === buMatch[1]);
      if (bu) return send(res, 200, T.buPage({ site, bu, projects }));
    }

    return send(res, 404, T.notFound(site));
  } catch (err) {
    console.error(err);
    return send(res, 500, 'Internal error', { 'Content-Type': 'text/plain' });
  }
});

server.listen(PORT, () => console.log(`MATTER+ENERGY site running at http://localhost:${PORT}`));
