// Motor de audio de baja latencia con cache compartida, backpressure y plazo absoluto.
const cfg = require('../config');

const SR = cfg.audio.sampleRate;
const FRAME_MS = cfg.audio.frameMs;
const CYCLE_SECONDS = 6;
const CYCLE_MS = CYCLE_SECONDS * 1000;
const TOTAL_FRAMES = CYCLE_MS / FRAME_MS;
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

function wavHeader() {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(0xFFFFFFFF, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(0xFFFFFFFF, 40);
  return header;
}

const frameCache = [];
function buildCache() {
  if (frameCache.length) return;
  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    // Reparto exacto de muestras: admite, por ejemplo, 50 ms a 22050 Hz alternando 1102/1103 muestras.
    const sampleStart = Math.round(frame * SR * FRAME_MS / 1000);
    const sampleEnd = Math.round((frame + 1) * SR * FRAME_MS / 1000);
    const sampleCount = sampleEnd - sampleStart;
    const buffer = Buffer.alloc(sampleCount * 2);
    for (let i = 0; i < sampleCount; i++) {
      const globalSample = sampleStart + i;
      const tGlobal = globalSample / SR;
      const second = Math.floor(tGlobal) % CYCLE_SECONDS;
      const t = tGlobal - Math.floor(tGlobal);
      const f1 = SCALE[second];
      const f2 = SCALE[(second + 2) % SCALE.length] / 2;
      const envelope = Math.min(1, t * 8) * Math.min(1, (1 - t) * 4);
      const sample = 0.28 * Math.sin(2 * Math.PI * f1 * t) + 0.14 * Math.sin(2 * Math.PI * f2 * t);
      buffer.writeInt16LE(Math.round(sample * envelope * 32767 * cfg.audio.gain), i * 2);
    }
    frameCache.push(buffer);
  }
}
buildCache();

function currentFrameIndex(now = Date.now()) {
  return Math.floor(now / FRAME_MS) % frameCache.length;
}

function streamTo(res, maxSeconds, meta = {}) {
  res.writeHead(200, {
    'Content-Type': 'audio/wav',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Accept-Ranges': 'none',
    'Connection': 'keep-alive',
    'icy-name': cfg.branding.stationName,
    'icy-description': String(meta.title || '').replace(/[^\x20-\x7E]/g, ' ').trim() || 'RayoBoss',
    'Access-Control-Allow-Origin': '*'
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  if (res.socket && typeof res.socket.setNoDelay === 'function') res.socket.setNoDelay(true);
  res.write(wavHeader());

  let sent = 0;
  const frameLimit = maxSeconds > 0 ? Math.max(1, Math.floor(maxSeconds * 1000 / FRAME_MS)) : null;
  let closed = false;
  let timer = null;
  let deadlineTimer = null;
  const startedAt = Date.now();

  const end = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    clearTimeout(deadlineTimer);
    if (typeof meta.onClose === 'function') meta.onClose();
    try { res.end(); } catch (_) { /* conexion ya cerrada */ }
  };

  if (maxSeconds > 0) deadlineTimer = setTimeout(end, Math.max(1, Math.round(maxSeconds * 1000)));

  const tick = () => {
    if (closed) return;
    if (frameLimit !== null && sent >= frameLimit) return end();
    const frame = frameCache[currentFrameIndex()];
    const ok = res.write(frame);
    sent++;
    const nextAt = startedAt + sent * FRAME_MS;
    const schedule = () => {
      if (!closed) timer = setTimeout(tick, Math.max(0, nextAt - Date.now()));
    };
    if (ok) schedule();
    else res.once('drain', schedule);
  };

  tick();
  res.on('close', end);
  res.on('error', end);
  return end;
}

module.exports = {
  streamTo, wavHeader, frameCache, FRAME_MS, currentFrameIndex, SR,
  CYCLE_SECONDS, TOTAL_FRAMES,
  get totalCachedSamples() { return frameCache.reduce((sum, frame) => sum + frame.length / 2, 0); }
};
