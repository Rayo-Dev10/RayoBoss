// Sesiones stateless firmadas con HMAC-SHA256 y version de seguridad revocable.
const crypto = require('crypto');
const cfg = require('../config');

function b64u(value) { return Buffer.from(value).toString('base64url'); }
function signature(payload) {
  return crypto.createHmac('sha256', cfg.auth.secret).update(payload).digest();
}

function createSession(user) {
  const now = Date.now();
  const payload = b64u(JSON.stringify({
    u: user.username,
    r: user.role,
    sv: Number(user.sessionVersion || 1),
    iat: now,
    exp: now + cfg.server.sessionHours * 3600 * 1000
  }));
  return `${payload}.${signature(payload).toString('base64url')}`;
}

function getSession(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) return null;
  const split = token.lastIndexOf('.');
  if (split < 1) return null;
  const payload = token.slice(0, split);
  let supplied;
  try { supplied = Buffer.from(token.slice(split + 1), 'base64url'); } catch (_) { return null; }
  const expected = signature(payload);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;

  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch (_) { return null; }
  const now = Date.now();
  const maxLife = cfg.server.sessionHours * 3600 * 1000 + 60_000;
  if (!data || typeof data.u !== 'string' || typeof data.r !== 'string') return null;
  if (!Number.isInteger(data.sv) || data.sv < 1) return null;
  if (!Number.isFinite(data.iat) || !Number.isFinite(data.exp)) return null;
  if (data.iat > now + 60_000 || data.exp <= now || data.exp - data.iat > maxLife) return null;
  return { username: data.u, role: data.r, sessionVersion: data.sv, exp: data.exp };
}

module.exports = { createSession, getSession };
