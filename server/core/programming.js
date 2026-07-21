const path = require('path');
const cfg = require('../config');
const media = require('./media-library');
const runtimeStore = require('../utils/runtime-store');
const { writePrimary, readRecoverable } = require('../utils/storage');
const { badRequest } = require('../utils/errors');

const KEY = 'programming-v4';
const LEGACY_KEY = 'programming-v302';
const FILE = cfg.dataDir ? path.join(cfg.dataDir, 'programming.json') : null;
let localState = null;
let queue = Promise.resolve();

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function seed() {
  return {
    schemaVersion: 2,
    revision: 1,
    playlists: [
      {
        id: 'continuidad-demo',
        name: 'Continuidad multimedia de demostración',
        itemIds: ['demo-indie', 'demo-graduacion'],
        shuffle: false,
        repeat: true
      },
      {
        id: 'solo-audio-demo',
        name: 'Música libre de demostración',
        itemIds: ['demo-indie'],
        shuffle: false,
        repeat: true
      }
    ],
    schedule: [
      {
        id: 'franja-general',
        name: 'Programación general',
        days: [0, 1, 2, 3, 4, 5, 6],
        start: '00:00',
        end: '23:59',
        playlistId: 'continuidad-demo',
        enabled: true
      }
    ],
    continuity: {
      stationIdEveryTracks: 2,
      stationIdItemIds: ['demo-id'],
      cueEveryMinutes: 1,
      cueItemIds: ['demo-cuna'],
      cueOrder: 'sequential',
      crossfadeSeconds: 1.5,
      fallbackPlaylistId: 'continuidad-demo'
    }
  };
}

function migrate(input) {
  if (!input || typeof input !== 'object') return seed();
  const state = clone(input);
  if (state.schemaVersion === 1) {
    state.schemaVersion = 2;
    state.schedule = Array.isArray(state.schedule)
      ? state.schedule.map(slot => ({ ...slot, enabled: slot.enabled !== false }))
      : [];
  }
  return state;
}

async function persist(state) {
  state.revision = (state.revision || 0) + 1;
  if (cfg.isVercel) {
    await runtimeStore.set(KEY, state, {
      ttl: 31_536_000,
      name: 'Programación AutoDJ RayoBoss 4',
      tags: ['rayoboss-programming']
    });
  } else if (FILE) {
    writePrimary(FILE, state);
  }
}

async function load({ fresh = false } = {}) {
  if (localState && !fresh && !cfg.isVercel) return localState;
  let state = cfg.isVercel ? await runtimeStore.get(KEY) : (FILE ? readRecoverable(FILE) : null);
  if (!state && cfg.isVercel) state = await runtimeStore.get(LEGACY_KEY);
  if (!state) {
    state = seed();
    await persist(state);
  } else {
    const migrated = migrate(state);
    if (migrated.schemaVersion !== state.schemaVersion) await persist(migrated);
    state = migrated;
  }
  if (!state || state.schemaVersion !== 2 || !Array.isArray(state.playlists) || !Array.isArray(state.schedule)) {
    throw new Error('Programación inválida. Restaura una copia o usa el restablecimiento administrativo.');
  }
  localState = state;
  return state;
}

function parseClock(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))) badRequest('Hora inválida; usa HH:MM.');
  const [hours, minutes] = String(value).split(':').map(Number);
  return hours * 60 + minutes;
}

function safeId(value, field) {
  const id = String(value || '').trim();
  if (!/^[a-z0-9_-]{2,48}$/i.test(id)) badRequest(`${field} inválido.`);
  return id;
}

function endExclusive(value) {
  const minute = parseClock(value);
  return minute === 1439 ? 1440 : minute;
}

function scheduleSegments(slot) {
  const start = parseClock(slot.start);
  const end = endExclusive(slot.end);
  const segments = [];
  for (const day of slot.days) {
    if (end > start) {
      segments.push({ day, start, end, slot });
    } else {
      segments.push({ day, start, end: 1440, slot });
      if (end > 0) segments.push({ day: (day + 1) % 7, start: 0, end, slot });
    }
  }
  return segments;
}

function validateNoOverlaps(schedule) {
  const byDay = Array.from({ length: 7 }, () => []);
  for (const slot of schedule.filter(item => item.enabled !== false)) {
    for (const segment of scheduleSegments(slot)) byDay[segment.day].push(segment);
  }
  for (let day = 0; day < byDay.length; day++) {
    const sorted = byDay[day].sort((a, b) => a.start - b.start || a.end - b.end);
    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (current.start < previous.end && current.slot.id !== previous.slot.id) {
        badRequest(`Las franjas “${previous.slot.name}” y “${current.slot.name}” se superponen.`);
      }
    }
  }
}

function validate(input) {
  if (!input || !Array.isArray(input.playlists) || !Array.isArray(input.schedule) || !input.continuity) {
    badRequest('Configuración de programación inválida.');
  }
  const state = clone(input);
  if (state.playlists.length < 1 || state.playlists.length > 100) badRequest('Debe existir entre 1 y 100 playlists.');
  if (state.schedule.length > 250) badRequest('La programación supera 250 franjas.');

  const playlistIds = new Set();
  for (const playlist of state.playlists) {
    playlist.id = safeId(playlist.id, 'Identificador de playlist');
    playlist.name = String(playlist.name || '').trim().slice(0, 100);
    if (!playlist.name || playlistIds.has(playlist.id) || !Array.isArray(playlist.itemIds)) {
      badRequest('Playlist inválida o duplicada.');
    }
    playlistIds.add(playlist.id);
    playlist.itemIds = [...new Set(playlist.itemIds.map(String))].slice(0, 500);
    playlist.shuffle = Boolean(playlist.shuffle);
    playlist.repeat = playlist.repeat !== false;
  }

  const slotIds = new Set();
  for (const slot of state.schedule) {
    slot.id = safeId(slot.id, 'Identificador de franja');
    slot.name = String(slot.name || '').trim().slice(0, 100);
    slot.playlistId = String(slot.playlistId || '');
    slot.days = Array.isArray(slot.days) ? [...new Set(slot.days.map(Number))].sort() : [];
    slot.enabled = slot.enabled !== false;
    if (!slot.name || slotIds.has(slot.id) || !playlistIds.has(slot.playlistId) || !slot.days.length ||
        !slot.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
      badRequest('Franja de programación inválida o duplicada.');
    }
    slotIds.add(slot.id);
    const startMinute = parseClock(slot.start);
    const endMinute = endExclusive(slot.end);
    if (startMinute === endMinute) badRequest(`La franja “${slot.name}” debe tener horas distintas.`);
  }
  validateNoOverlaps(state.schedule);

  const continuity = state.continuity;
  continuity.stationIdEveryTracks = Math.max(0, Math.min(50, Number(continuity.stationIdEveryTracks) || 0));
  continuity.cueEveryMinutes = Math.max(0, Math.min(240, Number(continuity.cueEveryMinutes) || 0));
  continuity.crossfadeSeconds = Math.max(0, Math.min(10, Number(continuity.crossfadeSeconds) || 0));
  continuity.cueOrder = ['sequential', 'random'].includes(continuity.cueOrder) ? continuity.cueOrder : 'sequential';
  if (!playlistIds.has(continuity.fallbackPlaylistId)) continuity.fallbackPlaylistId = state.playlists[0].id;
  continuity.stationIdItemIds = Array.isArray(continuity.stationIdItemIds)
    ? [...new Set(continuity.stationIdItemIds.map(String))].slice(0, 100)
    : [];
  continuity.cueItemIds = Array.isArray(continuity.cueItemIds)
    ? [...new Set(continuity.cueItemIds.map(String))].slice(0, 100)
    : [];
  state.schemaVersion = 2;
  return state;
}

function replace(actor, input) {
  const run = queue.then(async () => {
    const state = validate(input);
    state.updatedAt = new Date().toISOString();
    state.updatedBy = actor.username;
    await persist(state);
    localState = state;
    return clone(state);
  });
  queue = run.catch(() => {});
  return run;
}

function reset(actor) {
  return replace(actor, seed());
}

function activeSlot(state, date = new Date()) {
  const day = date.getDay();
  const minute = date.getHours() * 60 + date.getMinutes();
  return state.schedule.find(slot => {
    if (slot.enabled === false) return false;
    const start = parseClock(slot.start);
    const end = endExclusive(slot.end);
    if (end > start) return slot.days.includes(day) && minute >= start && minute < end;
    const previousDay = (day + 6) % 7;
    return (slot.days.includes(day) && minute >= start) || (slot.days.includes(previousDay) && minute < end);
  }) || null;
}

function deterministicShuffle(items, seedValue) {
  const output = [...items];
  let seedValueMutable = seedValue >>> 0;
  for (let index = output.length - 1; index > 0; index--) {
    seedValueMutable = (seedValueMutable * 1664525 + 1013904223) >>> 0;
    const selected = seedValueMutable % (index + 1);
    [output[index], output[selected]] = [output[selected], output[index]];
  }
  return output;
}

function composeTimeline(playlist, catalog, continuity, seedValue) {
  let base = playlist.itemIds.map(id => catalog.find(item => item.id === id && item.active)).filter(Boolean);
  if (playlist.shuffle) base = deterministicShuffle(base, seedValue);
  if (!base.length) return [];
  const stationIds = continuity.stationIdItemIds.map(id => catalog.find(item => item.id === id && item.active)).filter(Boolean);
  const cues = continuity.cueItemIds.map(id => catalog.find(item => item.id === id && item.active)).filter(Boolean);
  const timeline = [];
  let elapsed = 0;
  let lastCueAt = 0;
  let stationIndex = 0;
  let cueIndex = 0;
  const baseDuration = base.reduce((sum, item) => sum + (item.durationSeconds || 30), 0);
  const rounds = Math.max(3, Math.ceil(600 / Math.max(1, baseDuration)));
  for (let round = 0; round < rounds; round++) {
    for (let index = 0; index < base.length; index++) {
      const item = base[index];
      timeline.push(item);
      elapsed += item.durationSeconds || 30;
      const trackNumber = round * base.length + index + 1;
      if (continuity.stationIdEveryTracks > 0 && stationIds.length && trackNumber % continuity.stationIdEveryTracks === 0) {
        const stationId = stationIds[stationIndex++ % stationIds.length];
        timeline.push(stationId);
        elapsed += stationId.durationSeconds || 3;
      }
      if (continuity.cueEveryMinutes > 0 && cues.length && elapsed - lastCueAt >= continuity.cueEveryMinutes * 60) {
        const selected = continuity.cueOrder === 'random'
          ? cues[(seedValue + cueIndex * 7) % cues.length]
          : cues[cueIndex % cues.length];
        cueIndex++;
        timeline.push(selected);
        elapsed += selected.durationSeconds || 15;
        lastCueAt = elapsed;
      }
    }
  }
  return timeline;
}

async function now(date = new Date()) {
  const state = await load({ fresh: cfg.isVercel });
  const catalog = await media.list({ includeInactive: false });
  const slot = activeSlot(state, date);
  const playlistId = slot ? slot.playlistId : state.continuity.fallbackPlaylistId;
  const playlist = state.playlists.find(item => item.id === playlistId) || state.playlists[0];
  if (!playlist) return { item: null, next: null, playlist: null, slot, offsetSeconds: 0, remainingSeconds: 0, progressPercent: 0, crossfadeSeconds: 0 };
  const daySeed = Number(date.toISOString().slice(0, 10).replace(/-/g, ''));
  const timeline = composeTimeline(playlist, catalog, state.continuity, daySeed);
  const total = timeline.reduce((sum, item) => sum + (item.durationSeconds || 30), 0);
  if (!timeline.length || total <= 0) {
    return { item: null, next: null, playlist: { id: playlist.id, name: playlist.name }, slot, offsetSeconds: 0, remainingSeconds: 0, progressPercent: 0, crossfadeSeconds: state.continuity.crossfadeSeconds };
  }
  const epochSeconds = Math.floor(date.getTime() / 1000);
  const cycle = Math.floor(epochSeconds / total);
  let cursor = epochSeconds % total;
  for (let index = 0; index < timeline.length; index++) {
    const duration = timeline[index].durationSeconds || 30;
    if (cursor < duration) {
      return {
        item: timeline[index],
        next: timeline[(index + 1) % timeline.length],
        playlist: { id: playlist.id, name: playlist.name },
        slot,
        offsetSeconds: cursor,
        remainingSeconds: Math.max(0, duration - cursor),
        progressPercent: Math.min(100, Math.max(0, (cursor / duration) * 100)),
        crossfadeSeconds: state.continuity.crossfadeSeconds,
        startedAt: new Date((epochSeconds - cursor) * 1000).toISOString(),
        playoutKey: `autodj:${state.revision || 0}:${playlist.id}:${cycle}:${index}`
      };
    }
    cursor -= duration;
  }
  return { item: timeline[0], next: timeline[1] || timeline[0], playlist: { id: playlist.id, name: playlist.name }, slot, offsetSeconds: 0, remainingSeconds: timeline[0].durationSeconds || 30, progressPercent: 0, crossfadeSeconds: state.continuity.crossfadeSeconds, startedAt: date.toISOString(), playoutKey: `autodj:${state.revision || 0}:${playlist.id}:${cycle}:0` };
}

async function get() { return clone(await load({ fresh: cfg.isVercel })); }
module.exports = { get, replace, reset, now, _resetForTests: () => { localState = null; queue = Promise.resolve(); } };
