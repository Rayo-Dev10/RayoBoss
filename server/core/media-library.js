const path = require('path');
const crypto = require('crypto');
const cfg = require('../config');
const runtimeStore = require('../utils/runtime-store');
const { writePrimary, readRecoverable } = require('../utils/storage');
const { badRequest, notFound, forbidden } = require('../utils/errors');

const CATALOG_KEY = 'media-catalog-v302'; // Clave histórica: no cambiar para conservar catálogos existentes.
const CATALOG_FILE = cfg.dataDir ? path.join(cfg.dataDir, 'media-catalog.json') : null;
const CATEGORIES = Object.freeze({
  'autodj.libre': { label: 'Música libre y no restrictiva', scope: 'autodj', persistent: true, mediaType: 'music' },
  'autodj.sayco': { label: 'SAYCO-ACINPRO', scope: 'autodj', persistent: true, rightsRequired: true, mediaType: 'music' },
  'autodj.produccion': { label: 'Producción y continuidad', scope: 'autodj', persistent: true, mediaType: 'production' },
  'live.volatil': { label: 'Material temporal del vivo (24 horas)', scope: 'live', persistent: false, maxHours: 24, mediaType: 'other' },
  'live.efectos': { label: 'Efectos de sonido', scope: 'live', persistent: true, mediaType: 'effect' },
  'live.camas': { label: 'Camas y fondos musicales', scope: 'live', persistent: true, mediaType: 'bed' }
});
const LICENSE_TYPES = Object.freeze({
  'licencia-libre': 'Licencia libre o de stock',
  'creative-commons': 'Creative Commons',
  'dominio-publico': 'Dominio público',
  'produccion-propia': 'Producción propia',
  'sayco-acinpro': 'SAYCO-ACINPRO',
  'autorizacion-directa': 'Autorización directa',
  otra: 'Otra licencia',
  pendiente: 'Pendiente de clasificar'
});
const MEDIA_EXTENSIONS = new Set(['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.oga', '.flac', '.opus', '.mp4', '.m4v', '.webm', '.mov']);
const LICENSE_EXTENSIONS = new Set(['.txt', '.pdf', '.jpg', '.jpeg', '.png', '.webp']);
const LICENSE_CONTENT_TYPES = new Set(['text/plain', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
let localCatalog = null;
let queue = Promise.resolve();

function nowIso() { return new Date().toISOString(); }
function id() { return crypto.randomBytes(12).toString('hex'); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function optionalText(value, max = 240) {
  const safe = String(value || '').trim();
  if (safe.length > max || /[<>]/.test(safe)) badRequest('Uno de los metadatos contiene caracteres o una longitud no permitidos.');
  return safe;
}
function requiredText(value, name, max = 160) {
  const safe = optionalText(value, max);
  if (!safe) badRequest(`${name} inválido.`);
  return safe;
}
function inferredLicenseType(category) {
  if (category === 'autodj.sayco') return 'sayco-acinpro';
  if (category === 'autodj.produccion') return 'produccion-propia';
  if (category === 'autodj.libre') return 'licencia-libre';
  return 'pendiente';
}
function seed() {
  return {
    schemaVersion: 2,
    revision: 1,
    items: [
      { id: 'demo-indie', title: 'Pieza independiente de demostración', artist: 'RayoBoss', category: 'autodj.libre', mediaType: 'music', kind: 'audio', contentType: 'audio/mpeg', url: '/media/indie-demo.mp3', durationSeconds: 18, active: true, bundled: true, rights: { licenseType: 'produccion-propia', basis: 'Generación sintética propia para prueba', reference: 'RayoBoss 4.0.1', confirmed: true }, createdAt: nowIso() },
      { id: 'demo-graduacion', title: 'Ceremonia de graduación — video de prueba', artist: 'RayoBoss', category: 'autodj.libre', mediaType: 'music', kind: 'video', contentType: 'video/mp4', url: '/media/graduacion-demo.mp4', durationSeconds: 12, active: true, bundled: true, rights: { licenseType: 'produccion-propia', basis: 'Video y audio sintéticos propios', reference: 'RayoBoss 4.0.1', confirmed: true }, createdAt: nowIso() },
      { id: 'demo-id', title: 'Identificador RayoBoss de prueba', artist: 'RayoBoss', category: 'autodj.produccion', mediaType: 'production', subtype: 'identificador', kind: 'audio', contentType: 'audio/mpeg', url: '/media/identificador-demo.mp3', durationSeconds: 1, active: true, bundled: true, rights: { licenseType: 'produccion-propia', confirmed: true }, createdAt: nowIso() },
      { id: 'demo-cuna', title: 'Cuña institucional de prueba', artist: 'RayoBoss', category: 'autodj.produccion', mediaType: 'production', subtype: 'cuna', kind: 'audio', contentType: 'audio/mpeg', url: '/media/cuna-demo.mp3', durationSeconds: 2.4, active: true, bundled: true, rights: { licenseType: 'produccion-propia', confirmed: true }, createdAt: nowIso() },
      { id: 'demo-bed', title: 'Cama musical de estudio', artist: 'RayoBoss', category: 'live.camas', mediaType: 'bed', kind: 'audio', contentType: 'audio/mpeg', url: '/media/cama-demo.mp3', durationSeconds: 20, active: true, bundled: true, rights: { licenseType: 'produccion-propia', confirmed: true }, createdAt: nowIso() },
      { id: 'demo-laugh', title: 'Efecto: reacción positiva', artist: 'RayoBoss', category: 'live.efectos', mediaType: 'effect', kind: 'audio', contentType: 'audio/mpeg', url: '/media/efecto-risa-demo.mp3', durationSeconds: 0.6, active: true, bundled: true, rights: { licenseType: 'produccion-propia', confirmed: true }, createdAt: nowIso() },
      { id: 'demo-suspense', title: 'Efecto: suspenso', artist: 'RayoBoss', category: 'live.efectos', mediaType: 'effect', kind: 'audio', contentType: 'audio/mpeg', url: '/media/efecto-suspenso-demo.mp3', durationSeconds: 2.5, active: true, bundled: true, rights: { licenseType: 'produccion-propia', confirmed: true }, createdAt: nowIso() }
    ]
  };
}
function migrateCatalog(input) {
  if (!input || !Array.isArray(input.items)) return seed();
  const catalog = clone(input);
  catalog.schemaVersion = 2;
  catalog.items = catalog.items.map(item => {
    const rights = item.rights && typeof item.rights === 'object' ? item.rights : {};
    return {
      ...item,
      artist: String(item.artist || ''),
      album: String(item.album || ''),
      genre: String(item.genre || ''),
      year: String(item.year || ''),
      isrc: String(item.isrc || ''),
      composer: String(item.composer || ''),
      performer: String(item.performer || ''),
      recordLabel: String(item.recordLabel || ''),
      notes: String(item.notes || ''),
      mediaType: item.mediaType || CATEGORIES[item.category]?.mediaType || 'other',
      rights: {
        ...rights,
        licenseType: LICENSE_TYPES[rights.licenseType] ? rights.licenseType : inferredLicenseType(item.category),
        basis: String(rights.basis || ''),
        reference: String(rights.reference || ''),
        confirmed: Boolean(rights.confirmed)
      }
    };
  });
  return catalog;
}
function publicItem(item) { const copy = clone(item); delete copy.localPath; if (copy.rights?.document) delete copy.rights.document.localPath; return copy; }
function cleanExpired(catalog) {
  const before = catalog.items.length;
  const now = Date.now();
  catalog.items = catalog.items.filter(item => !item.expiresAt || Date.parse(item.expiresAt) > now);
  return before !== catalog.items.length;
}
function validateCatalog(catalog) {
  if (!catalog || catalog.schemaVersion !== 2 || !Array.isArray(catalog.items)) throw new Error('Catálogo multimedia inválido.');
  for (const item of catalog.items) {
    if (!item || typeof item.id !== 'string' || !CATEGORIES[item.category] || !['audio', 'video'].includes(item.kind)) throw new Error('El catálogo contiene un elemento inválido.');
  }
  return catalog;
}
async function persist(catalog) {
  catalog.revision = (catalog.revision || 0) + 1;
  if (cfg.isVercel) {
    await runtimeStore.set(CATALOG_KEY, catalog, { ttl: 31_536_000, name: 'Catálogo multimedia RayoBoss', tags: ['rayoboss-media'] });
  } else if (CATALOG_FILE) writePrimary(CATALOG_FILE, catalog);
}
async function load({ fresh = false } = {}) {
  if (localCatalog && !fresh && !cfg.isVercel) return localCatalog;
  let catalog = cfg.isVercel ? await runtimeStore.get(CATALOG_KEY) : (CATALOG_FILE ? readRecoverable(CATALOG_FILE) : null);
  if (!catalog) {
    catalog = seed();
    await persist(catalog);
  } else if (catalog.schemaVersion !== 2) {
    catalog = migrateCatalog(catalog);
    await persist(catalog);
  }
  validateCatalog(catalog);
  if (cleanExpired(catalog)) await persist(catalog);
  localCatalog = catalog;
  return catalog;
}
function mutate(fn) {
  const execute = async () => {
    const catalog = await load({ fresh: cfg.isVercel });
    const result = await fn(catalog);
    await persist(catalog);
    localCatalog = catalog;
    return result;
  };
  const run = queue.then(execute, execute);
  queue = run.catch(() => {});
  return run;
}
function validateMediaDescriptor({ originalName, contentType }) {
  const extension = path.extname(String(originalName || '')).toLowerCase();
  const mime = String(contentType || '').toLowerCase().split(';')[0];
  if (!MEDIA_EXTENSIONS.has(extension)) badRequest('Formato multimedia no admitido. Usa MP3, WAV, AAC, M4A, OGG, FLAC, OPUS, MP4, MOV o WebM.');
  if (mime && !/^(audio|video)\//.test(mime)) badRequest('El archivo seleccionado no se identifica como audio o video.');
  const kind = mime.startsWith('video/') || ['.mp4', '.m4v', '.webm', '.mov'].includes(extension) ? 'video' : 'audio';
  return { extension, contentType: mime || (kind === 'video' ? 'video/mp4' : 'audio/mpeg'), kind };
}
function validateLicenseDescriptor({ originalName, contentType, sizeBytes }) {
  const extension = path.extname(String(originalName || '')).toLowerCase();
  const mime = String(contentType || '').toLowerCase().split(';')[0];
  if (!LICENSE_EXTENSIONS.has(extension) || (mime && !LICENSE_CONTENT_TYPES.has(mime))) {
    badRequest('El soporte de licencia debe ser TXT, PDF, JPG, PNG o WebP.');
  }
  if (Number(sizeBytes) > 25 * 1024 * 1024) badRequest('El soporte de licencia no puede superar 25 MB.');
  return { extension, contentType: mime || (extension === '.pdf' ? 'application/pdf' : 'text/plain') };
}
function normalizeMetadata(input, actor) {
  const category = String(input.category || '');
  const categoryInfo = CATEGORIES[category];
  if (!categoryInfo) badRequest('Categoría multimedia inválida.');
  const contentType = String(input.contentType || '').toLowerCase().split(';')[0];
  if (!/^(audio|video)\//.test(contentType)) badRequest('Solo se permiten archivos de audio o video.');
  const kind = contentType.startsWith('video/') ? 'video' : 'audio';
  const rightsConfirmed = input.rightsConfirmed === true || input.rightsConfirmed === 'true';
  if (categoryInfo.rightsRequired && !rightsConfirmed) forbidden('Confirma que la emisora cuenta con autorización SAYCO-ACINPRO antes de incorporar la obra.');
  const durationSeconds = Number(input.durationSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 86_400) {
    badRequest('No fue posible validar la duración del archivo multimedia.');
  }
  const licenseType = String(input.licenseType || inferredLicenseType(category));
  if (!LICENSE_TYPES[licenseType]) badRequest('Tipo de licencia inválido.');
  const year = optionalText(input.year, 4);
  if (year && !/^\d{4}$/.test(year)) badRequest('El año debe tener cuatro dígitos.');
  const isrc = optionalText(input.isrc, 20).toUpperCase();
  if (isrc && !/^[A-Z0-9-]{5,20}$/.test(isrc)) badRequest('El código ISRC no tiene un formato válido.');
  const createdAt = nowIso();
  return {
    id: id(),
    title: requiredText(input.title, 'Título'),
    artist: optionalText(input.artist, 160),
    album: optionalText(input.album, 160),
    genre: optionalText(input.genre, 80),
    year,
    isrc,
    composer: optionalText(input.composer, 160),
    performer: optionalText(input.performer, 160),
    recordLabel: optionalText(input.recordLabel, 160),
    notes: optionalText(input.notes, 500),
    category,
    mediaType: categoryInfo.mediaType,
    subtype: optionalText(input.subtype, 40) || null,
    kind,
    contentType,
    durationSeconds: Math.round(durationSeconds * 1000) / 1000,
    active: input.active == null ? true : Boolean(input.active),
    bundled: false,
    uploadedBy: actor.username,
    createdAt,
    rights: {
      confirmed: rightsConfirmed,
      licenseType,
      basis: optionalText(input.rightsBasis, 240),
      reference: optionalText(input.rightsReference, 240)
    },
    expiresAt: categoryInfo.maxHours ? new Date(Date.now() + categoryInfo.maxHours * 3600_000).toISOString() : null
  };
}
async function list(filters = {}) {
  const catalog = await load({ fresh: cfg.isVercel });
  return catalog.items.filter(item => (!filters.category || item.category === filters.category) && (filters.includeInactive || item.active)).map(publicItem);
}
async function get(itemId) {
  const catalog = await load({ fresh: cfg.isVercel });
  const item = catalog.items.find(entry => entry.id === itemId);
  if (!item) notFound('Elemento multimedia no encontrado.');
  return clone(item);
}
function documentFromStorage(storage) {
  if (!storage) return null;
  return { ...storage, attachedAt: nowIso() };
}
function addUploaded(actor, input, storage, licenseStorage = null) {
  return mutate(async catalog => {
    const duplicate = storage.storageKey && catalog.items.find(item => item.storageKey === storage.storageKey);
    if (duplicate) return publicItem(duplicate);
    const normalized = normalizeMetadata(input, actor);
    if (licenseStorage) normalized.rights.document = documentFromStorage(licenseStorage);
    const item = { ...normalized, ...storage };
    catalog.items.push(item);
    return publicItem(item);
  });
}
function replaceUploaded(actor, itemId, input, storage, licenseStorage = null) {
  return mutate(async catalog => {
    const index = catalog.items.findIndex(entry => entry.id === itemId);
    if (index < 0) notFound('Elemento multimedia no encontrado.');
    const previous = clone(catalog.items[index]);
    if (previous.bundled) forbidden('Los recursos incluidos de demostración no pueden reemplazarse.');
    if (previous.storageKey && previous.storageKey === storage.storageKey) {
      return { item: publicItem(previous), previous: null };
    }
    if (storage.storageKey && catalog.items.some(entry => entry.id !== itemId && entry.storageKey === storage.storageKey)) {
      badRequest('Ese archivo ya pertenece a otra ficha de la biblioteca.');
    }
    const normalized = normalizeMetadata(input, actor);
    normalized.rights.document = licenseStorage ? documentFromStorage(licenseStorage) : previous.rights?.document;
    const item = {
      ...normalized,
      ...storage,
      id: previous.id,
      createdAt: previous.createdAt,
      uploadedBy: previous.uploadedBy,
      updatedAt: nowIso(),
      updatedBy: actor.username,
      replacedAt: nowIso(),
      replacedBy: actor.username
    };
    catalog.items[index] = item;
    return { item: publicItem(item), previous };
  });
}
function update(actor, itemId, input) {
  return mutate(async catalog => {
    const item = catalog.items.find(entry => entry.id === itemId);
    if (!item) notFound('Elemento multimedia no encontrado.');
    const merged = {
      ...item,
      ...input,
      rightsConfirmed: input.rightsConfirmed == null ? item.rights?.confirmed : input.rightsConfirmed,
      licenseType: input.licenseType == null ? item.rights?.licenseType : input.licenseType,
      rightsBasis: input.rightsBasis == null ? item.rights?.basis : input.rightsBasis,
      rightsReference: input.rightsReference == null ? item.rights?.reference : input.rightsReference
    };
    const normalized = normalizeMetadata(merged, actor);
    for (const field of ['title', 'artist', 'album', 'genre', 'year', 'isrc', 'composer', 'performer', 'recordLabel', 'notes', 'category', 'mediaType', 'subtype', 'durationSeconds', 'expiresAt']) {
      item[field] = normalized[field];
    }
    item.rights = { ...normalized.rights, document: item.rights?.document };
    if (input.active != null) item.active = Boolean(input.active);
    item.updatedAt = nowIso();
    item.updatedBy = actor.username;
    return publicItem(item);
  });
}
function attachLicense(actor, itemId, storage, input = {}) {
  return mutate(async catalog => {
    const item = catalog.items.find(entry => entry.id === itemId);
    if (!item) notFound('Elemento multimedia no encontrado.');
    const previous = item.rights?.document ? clone(item.rights.document) : null;
    const licenseType = String(input.licenseType || item.rights?.licenseType || inferredLicenseType(item.category));
    if (!LICENSE_TYPES[licenseType]) badRequest('Tipo de licencia inválido.');
    item.rights = {
      ...(item.rights || {}),
      licenseType,
      basis: input.rightsBasis == null ? String(item.rights?.basis || '') : optionalText(input.rightsBasis, 240),
      reference: input.rightsReference == null ? String(item.rights?.reference || '') : optionalText(input.rightsReference, 240),
      confirmed: input.rightsConfirmed == null ? Boolean(item.rights?.confirmed) : (input.rightsConfirmed === true || input.rightsConfirmed === 'true'),
      document: documentFromStorage(storage)
    };
    if (CATEGORIES[item.category].rightsRequired && !item.rights.confirmed) forbidden('Confirma la autorización SAYCO-ACINPRO antes de adjuntar el soporte.');
    item.updatedAt = nowIso();
    item.updatedBy = actor.username;
    return { item: publicItem(item), previous };
  });
}
function remove(actor, itemId) {
  return mutate(async catalog => {
    const index = catalog.items.findIndex(entry => entry.id === itemId);
    if (index < 0) notFound('Elemento multimedia no encontrado.');
    const item = catalog.items[index];
    if (item.bundled) forbidden('Los recursos de demostración incluidos no se eliminan; pueden desactivarse.');
    catalog.items.splice(index, 1);
    return clone(item);
  });
}
function categories() { return clone(CATEGORIES); }
function licenseTypes() { return clone(LICENSE_TYPES); }

module.exports = {
  list, get, addUploaded, replaceUploaded, update, attachLicense, remove, categories, licenseTypes,
  normalizeMetadata, validateMediaDescriptor, validateLicenseDescriptor,
  _resetForTests: () => { localCatalog = null; queue = Promise.resolve(); }
};
