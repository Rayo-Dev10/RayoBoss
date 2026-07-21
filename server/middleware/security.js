const cfg = require('../config');
const sessions = require('../core/sessions');
const users = require('../core/users');

function securityHeaders(req, res, next) {
  const embed = req.path === '/embed' || req.path === '/embed.html';
  res.set('X-Content-Type-Options', 'nosniff');
  if (!embed) res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', embed ? 'strict-origin-when-cross-origin' : 'no-referrer');
  res.set('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self), autoplay=(self), geolocation=(), payment=(), usb=()');
  res.set('Cross-Origin-Opener-Policy', embed ? 'unsafe-none' : 'same-origin');
  res.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data: https:",
    "connect-src 'self' blob: https:",
    "object-src 'none'",
    "base-uri 'none'",
    embed ? "frame-ancestors *" : "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; '));
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
}

function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next(); // clientes CLI/no navegador
  const expected = `${req.protocol}://${req.get('host')}`;
  if (origin !== expected && !cfg.server.allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origen no permitido.' });
  }
  next();
}

const attempts = new Map();
function clientIp(req) { return req.ip || req.socket.remoteAddress || 'unknown'; }
function aliveAttempts(ip, now = Date.now()) {
  const cutoff = now - cfg.auth.loginWindowMinutes * 60 * 1000;
  return (attempts.get(ip) || []).filter(time => time > cutoff);
}
setInterval(() => {
  for (const ip of attempts.keys()) {
    const alive = aliveAttempts(ip);
    if (alive.length) attempts.set(ip, alive); else attempts.delete(ip);
  }
}, 60_000).unref();

function loginLimiter(req, res, next) {
  const current = aliveAttempts(clientIp(req));
  if (current.length >= cfg.auth.loginMaxAttempts) {
    return res.status(429).json({ error: 'Demasiados intentos fallidos. Espera unos minutos.' });
  }
  next();
}
function recordLoginFailure(req) {
  const ip = clientIp(req);
  const current = aliveAttempts(ip);
  current.push(Date.now());
  attempts.set(ip, current);
}
function clearLoginAttempts(req) { attempts.delete(clientIp(req)); }

function getToken(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|;\s*)rb_session=([^;]+)/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch (_) { return null; }
}
function shouldSecureCookie(req) {
  if (cfg.server.cookieSecure === 'always') return true;
  if (cfg.server.cookieSecure === 'never') return false;
  return Boolean(req.secure || cfg.isVercel);
}
function setSessionCookie(req, res, token) {
  const secure = shouldSecureCookie(req) ? '; Secure' : '';
  res.set('Set-Cookie', `rb_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${cfg.server.sessionHours * 3600}; Priority=High${secure}`);
}
function clearSessionCookie(req, res) {
  const secure = shouldSecureCookie(req) ? '; Secure' : '';
  res.set('Set-Cookie', `rb_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Priority=High${secure}`);
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
function auth(...roles) {
  return asyncRoute(async (req, res, next) => {
    const session = sessions.getSession(getToken(req));
    if (!session) return res.status(401).json({ error: 'Sesion requerida.' });
    const current = await users.findUser(session.username);
    if (!current || current.role !== session.role || current.sessionVersion !== session.sessionVersion) {
      clearSessionCookie(req, res);
      return res.status(401).json({ error: 'La sesion ya no es valida. Ingresa nuevamente.' });
    }
    if (roles.length && !roles.includes(current.role)) return res.status(403).json({ error: 'Sin permiso para esta accion.' });
    req.actor = { username: current.username, role: current.role, sessionVersion: current.sessionVersion };
    next();
  });
}

module.exports = {
  securityHeaders, sameOrigin, loginLimiter, recordLoginFailure, clearLoginAttempts,
  getToken, setSessionCookie, clearSessionCookie, auth, asyncRoute,
  _resetRateLimiterForTests: () => attempts.clear()
};
