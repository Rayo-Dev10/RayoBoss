// RayoBoss 4 - configuracion central validada.
const path = require('path');

const file = require('../config/default.json');

function envInt(name, fallback) {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) ? value : fallback;
}
function envFloat(name, fallback) {
  const value = Number.parseFloat(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}
function envString(name, fallback = '') {
  const value = process.env[name];
  return value == null ? fallback : String(value).trim();
}
function assert(condition, message) {
  if (!condition) throw new Error(`[config] ${message}`);
}
function isPowerOfTwo(value) {
  return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
}

const isVercel = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === 'production' || isVercel;
const devPassword = envString('RAYOBOSS_DEV_PASSWORD');
const secret = envString('RAYOBOSS_SECRET');
const frameMs = envInt('RAYOBOSS_FRAME_MS', file.audio.frameMs);
const sampleRate = envInt('RAYOBOSS_SAMPLE_RATE', file.audio.sampleRate);
const scryptN = envInt('RAYOBOSS_SCRYPT_N', file.auth.scryptN);
const cookieSecure = envString('RAYOBOSS_COOKIE_SECURE', file.server.cookieSecure).toLowerCase();

assert(devPassword.length >= file.auth.minPasswordLength,
  `RAYOBOSS_DEV_PASSWORD es obligatoria y debe tener al menos ${file.auth.minPasswordLength} caracteres.`);
assert(devPassword.length <= file.auth.maxPasswordLength,
  `RAYOBOSS_DEV_PASSWORD supera ${file.auth.maxPasswordLength} caracteres.`);
assert(secret.length >= 32, 'RAYOBOSS_SECRET es obligatorio y debe tener al menos 32 caracteres.');
assert(['auto', 'always', 'never'].includes(cookieSecure),
  'RAYOBOSS_COOKIE_SECURE debe ser auto, always o never.');
assert(sampleRate >= 8000 && sampleRate <= 48000, 'RAYOBOSS_SAMPLE_RATE debe estar entre 8000 y 48000.');
assert(frameMs >= 50 && frameMs <= 1000, 'RAYOBOSS_FRAME_MS debe estar entre 50 y 1000.');
assert(6000 % frameMs === 0,
  'RAYOBOSS_FRAME_MS debe dividir exactamente el ciclo de 6000 ms (por ejemplo: 50, 60, 75, 100, 120, 125, 150, 200, 250, 300, 375, 400, 500, 600, 750 o 1000).');
assert(isPowerOfTwo(scryptN) && scryptN >= 16384 && scryptN <= 1048576,
  'RAYOBOSS_SCRYPT_N debe ser potencia de 2 entre 16384 y 1048576.');

const trustProxyRaw = envString('RAYOBOSS_TRUST_PROXY', isVercel ? '1' : file.server.trustProxy);
const trustProxy = /^\d+$/.test(trustProxyRaw) ? Number(trustProxyRaw) : trustProxyRaw;
const dataDirEnv = envString('RAYOBOSS_DATA_DIR');
const dataDir = isVercel ? null : (dataDirEnv ? path.resolve(dataDirEnv) : path.join(__dirname, '..', 'data'));
const storageProvider = envString('RAYOBOSS_STORAGE_PROVIDER', 'auto').toLowerCase();
const allowedOrigins = envString('RAYOBOSS_ALLOWED_ORIGINS')
  .split(',').map(x => x.trim()).filter(Boolean);

const cfg = {
  isVercel,
  isProduction,
  mode: isVercel ? 'vercel-poc' : 'vps-local',
  version: '4.0.1',
  server: {
    port: envInt('PORT', file.server.port),
    jsonLimit: envString('RAYOBOSS_JSON_LIMIT', file.server.jsonLimit),
    sessionHours: envInt('RAYOBOSS_SESSION_HOURS', file.server.sessionHours),
    trustProxy,
    cookieSecure,
    allowedOrigins
  },
  auth: {
    devUsername: file.auth.devUsername,
    devPassword,
    secret,
    minPasswordLength: envInt('RAYOBOSS_MIN_PASSWORD', file.auth.minPasswordLength),
    maxPasswordLength: envInt('RAYOBOSS_MAX_PASSWORD', file.auth.maxPasswordLength),
    loginMaxAttempts: envInt('RAYOBOSS_LOGIN_MAX', file.auth.loginMaxAttempts),
    loginWindowMinutes: envInt('RAYOBOSS_LOGIN_WINDOW', file.auth.loginWindowMinutes),
    scryptN,
    scryptR: envInt('RAYOBOSS_SCRYPT_R', file.auth.scryptR),
    scryptP: envInt('RAYOBOSS_SCRYPT_P', file.auth.scryptP),
    scryptMaxmem: envInt('RAYOBOSS_SCRYPT_MAXMEM_MB', file.auth.scryptMaxmemMb) * 1024 * 1024
  },
  audio: {
    sampleRate,
    frameMs,
    gain: Math.min(1, Math.max(0, envFloat('RAYOBOSS_GAIN', file.audio.gain))),
    vercelSeconds: Math.min(290, Math.max(60, envInt('RAYOBOSS_LIVE_SECONDS', file.audio.vercelSeconds)))
  },
  rtc: {
    pollMs: Math.min(3000, Math.max(400, envInt('RAYOBOSS_RTC_POLL_MS', file.rtc.pollMs))),
    roomTtlSeconds: Math.min(3600, Math.max(300, envInt('RAYOBOSS_RTC_ROOM_TTL', file.rtc.roomTtlSeconds))),
    clientTtlSeconds: Math.min(600, Math.max(60, envInt('RAYOBOSS_RTC_CLIENT_TTL', file.rtc.clientTtlSeconds))),
    maxParticipants: Math.min(20, Math.max(1, envInt('RAYOBOSS_RTC_MAX_PARTICIPANTS', file.rtc.maxParticipants))),
    maxListeners: Math.min(100, Math.max(1, envInt('RAYOBOSS_RTC_MAX_LISTENERS', file.rtc.maxListeners))),
    iceServers: (() => {
      const servers = [{ urls: file.rtc.stunUrls }];
      const turnUrl = envString('RAYOBOSS_TURN_URL');
      const turnUsername = envString('RAYOBOSS_TURN_USERNAME');
      const turnCredential = envString('RAYOBOSS_TURN_CREDENTIAL');
      if (turnUrl) servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
      return servers;
    })()
  },
  autodj: file.autodj,
  media: {
    maxUploadBytes: Math.min(5 * 1024 * 1024 * 1024, Math.max(1024 * 1024, envInt('RAYOBOSS_MAX_UPLOAD_MB', 500) * 1024 * 1024))
  },
  storage: {
    provider: storageProvider,
    localRootDir: dataDir ? path.join(dataDir, 'media') : null,
    localPublicPath: envString('RAYOBOSS_LOCAL_MEDIA_PATH', '/media-files')
  },
  public: {
    audioUrl: envString('RAYOBOSS_PUBLIC_AUDIO_URL'),
    videoUrl: envString('RAYOBOSS_PUBLIC_VIDEO_URL'),
    hlsUrl: envString('RAYOBOSS_PUBLIC_HLS_URL')
  },
  branding: file.branding,
  dataDir
};

assert(['auto', 'local', 'vercel-blob'].includes(cfg.storage.provider),
  'RAYOBOSS_STORAGE_PROVIDER debe ser auto, local o vercel-blob.');
assert(cfg.server.sessionHours >= 1 && cfg.server.sessionHours <= 168,
  'RAYOBOSS_SESSION_HOURS debe estar entre 1 y 168.');
assert(cfg.auth.minPasswordLength >= 10 && cfg.auth.minPasswordLength <= cfg.auth.maxPasswordLength,
  'Longitud minima de contraseña invalida.');
assert(cfg.auth.scryptR >= 1 && cfg.auth.scryptR <= 32, 'RAYOBOSS_SCRYPT_R invalido.');
assert(cfg.auth.scryptP >= 1 && cfg.auth.scryptP <= 16, 'RAYOBOSS_SCRYPT_P invalido.');
assert(128 * cfg.auth.scryptN * cfg.auth.scryptR < cfg.auth.scryptMaxmem,
  'RAYOBOSS_SCRYPT_MAXMEM_MB es insuficiente para los parametros scrypt elegidos.');

module.exports = cfg;
