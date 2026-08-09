const cfg = require('../config');
const { badRequest } = require('../utils/errors');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cache = new Map();
let fetchImplementation = (...args) => fetch(...args);
let queue = Promise.resolve();
let lastRequestAt = 0;

function optionalTerm(value, max = 160) {
  const term = String(value || '').trim();
  if (term.length > max || /[<>\r\n]/.test(term)) badRequest('La búsqueda de MusicBrainz contiene caracteres o una longitud no permitidos.');
  return term;
}

function escapeQuery(value) {
  return String(value).replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, '\\$1');
}

function buildQuery({ title, artist, isrc }) {
  const safeTitle = optionalTerm(title);
  const safeArtist = optionalTerm(artist);
  const safeIsrc = optionalTerm(isrc, 20).toUpperCase();
  if (!safeTitle && !safeArtist && !safeIsrc) badRequest('Escribe un título, artista o ISRC para consultar MusicBrainz.');
  const parts = [];
  if (safeTitle) parts.push(`recording:"${escapeQuery(safeTitle)}"`);
  if (safeArtist) parts.push(`artist:"${escapeQuery(safeArtist)}"`);
  if (safeIsrc) parts.push(`isrc:${escapeQuery(safeIsrc)}`);
  return parts.join(' AND ');
}

function textCredit(credits) {
  return Array.isArray(credits) ? credits.map(credit => `${credit.name || credit.artist?.name || ''}${credit.joinphrase || ''}`).join('').trim() : '';
}

function firstRelease(recording) {
  const releases = Array.isArray(recording.releases) ? recording.releases : [];
  return releases.find(release => release?.status === 'Official') || releases[0] || null;
}

function mapRecording(recording) {
  const release = firstRelease(recording);
  const artistCredits = Array.isArray(recording['artist-credit']) ? recording['artist-credit'] : [];
  const genres = (recording.genres || recording.tags || []).map(item => item?.name).filter(Boolean).slice(0, 10);
  const date = recording['first-release-date'] || release?.date || '';
  return {
    recordingId: recording.id,
    title: String(recording.title || ''),
    artist: textCredit(artistCredits),
    artistIds: artistCredits.map(credit => credit.artist?.id).filter(id => UUID.test(String(id))).slice(0, 10),
    album: String(release?.title || ''),
    releaseId: UUID.test(String(release?.id || '')) ? release.id : '',
    releaseGroupId: UUID.test(String(release?.['release-group']?.id || '')) ? release['release-group'].id : '',
    year: /^\d{4}/.test(date) ? date.slice(0, 4) : '',
    isrc: String((recording.isrcs || [])[0] || '').toUpperCase(),
    genre: genres.join('; '),
    durationSeconds: Number.isFinite(Number(recording.length)) ? Math.round(Number(recording.length)) / 1000 : null,
    score: Number(recording.score || 0),
    source: 'musicbrainz',
    picardUri: `mbid://track/${recording.id}`
  };
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function scheduleRequest(run) {
  const execute = async () => {
    const delay = Math.max(0, cfg.musicbrainz.requestIntervalMs - (Date.now() - lastRequestAt));
    if (delay) await wait(delay);
    lastRequestAt = Date.now();
    return run();
  };
  const pending = queue.then(execute, execute);
  queue = pending.catch(() => {});
  return pending;
}

async function search(input = {}) {
  const query = buildQuery(input);
  const limit = Math.min(10, Math.max(1, Number.parseInt(input.limit, 10) || 8));
  const cacheKey = `${query}|${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const url = new URL(`${cfg.musicbrainz.baseUrl}/recording`);
  url.searchParams.set('query', query);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', String(limit));
  const response = await scheduleRequest(() => fetchImplementation(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': `RayoBoss/${cfg.version} ( ${cfg.musicbrainz.contact} )`
    },
    signal: AbortSignal.timeout(12_000)
  }));
  if (!response.ok) {
    const error = new Error(response.status === 503
      ? 'MusicBrainz está limitando temporalmente las consultas. Intenta nuevamente en unos segundos.'
      : 'MusicBrainz no respondió correctamente.');
    error.status = 502;
    error.expose = true;
    throw error;
  }
  const payload = await response.json();
  const value = {
    query,
    items: (payload.recordings || []).filter(item => UUID.test(String(item.id || ''))).map(mapRecording),
    source: 'MusicBrainz',
    freeService: true
  };
  cache.set(cacheKey, { value, expiresAt: Date.now() + cfg.musicbrainz.cacheMs });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return value;
}

module.exports = {
  search,
  buildQuery,
  mapRecording,
  isValidMbid: value => UUID.test(String(value || '')),
  _setFetchForTests: fn => { fetchImplementation = fn || ((...args) => fetch(...args)); },
  _resetForTests: () => { cache.clear(); queue = Promise.resolve(); lastRequestAt = 0; fetchImplementation = (...args) => fetch(...args); }
};
