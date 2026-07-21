const path = require('path');
const router = require('express').Router();
const multer = require('multer');
const cfg = require('../config');
const media = require('../core/media-library');
const validation = require('../utils/validation');
const sessions = require('../core/sessions');
const users = require('../core/users');
const security = require('../middleware/security');
const storageFactory = require('../core/storage/storage-factory');
const { keyMatchesCategory } = require('../core/storage/storage-keys');
const { auth, asyncRoute } = security;
const { forbidden, badRequest } = require('../utils/errors');

const LICENSE_MAX_BYTES = 25 * 1024 * 1024;
function mediaRoles() { return ['desarrollador', 'administrador']; }
function parseMetadata(value) {
  try { return typeof value === 'string' ? JSON.parse(value || '{}') : (value || {}); }
  catch (_) { badRequest('Metadatos multimedia inválidos.'); }
}
function uploadedDescriptor(file) {
  return { originalName: file?.originalname, contentType: file?.mimetype, sizeBytes: file?.size };
}

const storage = storageFactory.getStorageProvider();
const serverUpload = storage.getServerUploadConfig();
const upload = serverUpload ? multer({
  dest: serverUpload.tempDir,
  limits: { fileSize: cfg.media.maxUploadBytes, files: 2 },
  fileFilter: (req, file, cb) => {
    try {
      if (file.fieldname === 'file') media.validateMediaDescriptor(uploadedDescriptor(file));
      else if (file.fieldname === 'licenseFile') media.validateLicenseDescriptor(uploadedDescriptor(file));
      else return cb(new Error('Campo de archivo no reconocido.'));
      cb(null, true);
    } catch (error) { cb(error); }
  }
}) : null;

function storageRecord(metadata, descriptor, originalName) {
  return {
    provider: storage.id,
    storage: storage.id === 'local-disk' ? 'local' : storage.id,
    storageKey: metadata.key || metadata.pathname,
    pathname: metadata.key || metadata.pathname,
    url: metadata.url,
    originalName: originalName || path.basename(metadata.key || metadata.pathname || 'archivo'),
    contentType: metadata.contentType || descriptor.contentType,
    size: metadata.size == null ? null : metadata.size
  };
}
async function verifiedStoredObject({ storageKey, originalName, contentType, sizeBytes, category, assetType = 'media' }) {
  if (!storage.writable) badRequest('El proveedor de almacenamiento activo es de solo lectura.');
  if (assetType === 'media' && !keyMatchesCategory(storageKey, category)) badRequest('El archivo no corresponde a la categoría seleccionada.');
  if (assetType === 'license' && !keyMatchesCategory(storageKey, 'licenses')) badRequest('La ruta del soporte de licencia no es válida.');
  const metadata = await storage.getMetadata(storageKey).catch(() => badRequest('El archivo no existe en el almacenamiento conectado.'));
  const actualType = String(metadata.contentType || contentType || '').toLowerCase();
  const descriptor = assetType === 'license'
    ? media.validateLicenseDescriptor({ originalName, contentType: actualType, sizeBytes: metadata.size ?? sizeBytes })
    : media.validateMediaDescriptor({ originalName, contentType: actualType });
  if (assetType === 'media' && Number(metadata.size ?? sizeBytes) > cfg.media.maxUploadBytes) badRequest('El archivo supera el tamaño máximo permitido.');
  return storageRecord(metadata, descriptor, originalName);
}
async function deleteStored(record) {
  if (!record) return;
  const provider = storageFactory.getProviderForItem(record);
  if (provider) await provider.deleteObject(record);
}
async function finishCatalogWrite(actor, metadata, stored, licenseStored, replaceItemId) {
  if (replaceItemId) {
    const result = await media.replaceUploaded(actor, replaceItemId, metadata, stored, licenseStored);
    if (result.previous) {
      await storageFactory.deleteStoredObject(result.previous).catch(() => {});
      if (licenseStored && result.previous.rights?.document) await deleteStored(result.previous.rights.document).catch(() => {});
    }
    return result.item;
  }
  return media.addUploaded(actor, metadata, stored, licenseStored);
}

router.get('/media/config', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const description = storage.describe();
  res.json({
    ...description,
    maxUploadBytes: cfg.media.maxUploadBytes,
    maxLicenseBytes: LICENSE_MAX_BYTES,
    categories: media.categories(),
    licenseTypes: media.licenseTypes(),
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  });
}));

router.get('/media', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  res.json({
    items: await media.list({ category: req.query.category || '', includeInactive: true }),
    categories: media.categories(),
    licenseTypes: media.licenseTypes()
  });
}));

router.get('/media/orphans', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  if (!storage.writable) return res.json({ items: [] });
  const [objects, catalog] = await Promise.all([storage.listObjects('rayoboss/'), media.list({ includeInactive: true })]);
  const registered = new Set();
  for (const item of catalog) {
    if (item.storageKey) registered.add(item.storageKey);
    if (item.rights?.document?.storageKey) registered.add(item.rights.document.storageKey);
  }
  const items = objects
    .filter(object => !registered.has(object.key) && !object.key.startsWith('rayoboss/licenses/'))
    .map(object => ({ ...object, originalName: path.basename(object.key) }));
  res.json({ items });
}));

router.post('/media/import-stored', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  const metadata = parseMetadata(body.metadata);
  const originalName = String(body.originalName || path.basename(String(body.storageKey || 'archivo')));
  const stored = await verifiedStoredObject({
    storageKey: body.storageKey,
    originalName,
    contentType: metadata.contentType,
    sizeBytes: body.sizeBytes,
    category: metadata.category
  });
  metadata.contentType = stored.contentType;
  const item = await media.addUploaded(req.actor, metadata, stored);
  res.json({ ok: true, item });
}));

router.post('/media/confirm-upload', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  if (storage.uploadMode !== 'direct') badRequest('La confirmación directa solo está disponible con Vercel Blob.');
  const body = validation.objectBody(req);
  const metadata = parseMetadata(body.metadata);
  const stored = await verifiedStoredObject({
    storageKey: body.storageKey,
    originalName: body.originalName,
    contentType: metadata.contentType,
    sizeBytes: body.sizeBytes,
    category: metadata.category
  });
  metadata.contentType = stored.contentType;
  let licenseStored = null;
  if (body.licenseStorageKey) {
    licenseStored = await verifiedStoredObject({
      storageKey: body.licenseStorageKey,
      originalName: body.licenseOriginalName,
      contentType: body.licenseContentType,
      sizeBytes: body.licenseSizeBytes,
      assetType: 'license'
    });
  }
  const item = await finishCatalogWrite(req.actor, metadata, stored, licenseStored, String(body.replaceItemId || ''));
  res.json({ ok: true, item });
}));

router.patch('/media/:id', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  res.json({ ok: true, item: await media.update(req.actor, req.params.id, validation.objectBody(req)) });
}));

router.post('/media/:id/license', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  if (storage.uploadMode !== 'direct') badRequest('Esta confirmación de licencia requiere carga directa.');
  const body = validation.objectBody(req);
  const stored = await verifiedStoredObject({
    storageKey: body.storageKey,
    originalName: body.originalName,
    contentType: body.contentType,
    sizeBytes: body.sizeBytes,
    assetType: 'license'
  });
  const result = await media.attachLicense(req.actor, req.params.id, stored, body);
  if (result.previous && result.previous.storageKey !== stored.storageKey) await deleteStored(result.previous).catch(() => {});
  res.json({ ok: true, item: result.item });
}));

router.delete('/media/:id', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const item = await media.get(req.params.id);
  await storageFactory.deleteStoredObject(item);
  if (item.rights?.document) await deleteStored(item.rights.document);
  await media.remove(req.actor, req.params.id);
  res.json({ ok: true });
}));

if (upload) {
  router.post('/media/local-upload', auth('desarrollador', 'administrador'), upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'licenseFile', maxCount: 1 }
  ]), asyncRoute(async (req, res) => {
    const file = req.files?.file?.[0];
    const licenseFile = req.files?.licenseFile?.[0];
    if (!file) badRequest('Selecciona un archivo de audio o video.');
    let stored = null;
    let licenseStored = null;
    try {
      const metadata = parseMetadata(req.body.metadata);
      const descriptor = media.validateMediaDescriptor(uploadedDescriptor(file));
      metadata.contentType = descriptor.contentType;
      media.normalizeMetadata(metadata, req.actor);
      stored = await storage.storeUploadedFile({
        tempPath: file.path,
        originalName: file.originalname,
        contentType: descriptor.contentType,
        sizeBytes: file.size,
        category: metadata.category
      });
      if (licenseFile) {
        const licenseDescriptor = media.validateLicenseDescriptor(uploadedDescriptor(licenseFile));
        licenseStored = await storage.storeUploadedFile({
          tempPath: licenseFile.path,
          originalName: licenseFile.originalname,
          contentType: licenseDescriptor.contentType,
          sizeBytes: licenseFile.size,
          category: 'licenses'
        });
      }
      const item = await finishCatalogWrite(req.actor, metadata, stored, licenseStored, String(req.body.replaceItemId || ''));
      res.json({ ok: true, item });
    } catch (error) {
      if (stored) await storage.deleteObject(stored).catch(() => {});
      if (licenseStored) await storage.deleteObject(licenseStored).catch(() => {});
      const fs = require('fs/promises');
      for (const pending of [file, licenseFile]) if (pending?.path) await fs.rm(pending.path, { force: true }).catch(() => {});
      throw error;
    }
  }));

  router.post('/media/:id/license-upload', auth('desarrollador', 'administrador'), upload.single('licenseFile'), asyncRoute(async (req, res) => {
    if (!req.file) badRequest('Selecciona el soporte de licencia.');
    let stored = null;
    try {
      const descriptor = media.validateLicenseDescriptor(uploadedDescriptor(req.file));
      stored = await storage.storeUploadedFile({
        tempPath: req.file.path,
        originalName: req.file.originalname,
        contentType: descriptor.contentType,
        sizeBytes: req.file.size,
        category: 'licenses'
      });
      const result = await media.attachLicense(req.actor, req.params.id, stored, parseMetadata(req.body.metadata));
      if (result.previous) await deleteStored(result.previous).catch(() => {});
      res.json({ ok: true, item: result.item });
    } catch (error) {
      if (stored) await storage.deleteObject(stored).catch(() => {});
      else if (req.file?.path) {
        const fs = require('fs/promises');
        await fs.rm(req.file.path, { force: true }).catch(() => {});
      }
      throw error;
    }
  }));
}

router.post('/media/upload-plan', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  if (storage.uploadMode !== 'direct') badRequest('El proveedor activo no admite carga directa desde el navegador.');
  const body = validation.objectBody(req);
  const assetType = body.assetType === 'license' ? 'license' : 'media';
  const sizeBytes = Number(body.sizeBytes);
  const maximum = assetType === 'license' ? LICENSE_MAX_BYTES : cfg.media.maxUploadBytes;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maximum) badRequest('Tamaño de archivo inválido.');
  let descriptor;
  let category;
  if (assetType === 'license') {
    descriptor = media.validateLicenseDescriptor({ originalName: body.originalName, contentType: body.contentType, sizeBytes });
    category = 'licenses';
  } else {
    const metadata = parseMetadata(body.metadata);
    descriptor = media.validateMediaDescriptor({ originalName: body.originalName, contentType: body.contentType });
    metadata.contentType = descriptor.contentType;
    media.normalizeMetadata(metadata, req.actor);
    category = metadata.category;
  }
  const storageKey = storage.createStorageKey({ category, originalName: body.originalName });
  res.json({ storageKey, assetType, contentType: descriptor.contentType });
}));

async function actorFromRequest(req) {
  const token = security.getToken(req);
  const session = sessions.getSession(token);
  if (!session) forbidden('Sesión requerida para cargar archivos.');
  const actor = await users.findUser(session.username);
  if (!actor || !mediaRoles().includes(actor.role) || actor.sessionVersion !== session.sessionVersion) forbidden('Sin permiso para cargar archivos.');
  return { username: actor.username, role: actor.role };
}

router.post('/media/blob-upload', asyncRoute(async (req, res) => {
  if (storage.uploadMode !== 'direct') badRequest('Vercel Blob no está configurado en este despliegue.');
  const result = await storage.handleDirectUpload({
    req,
    body: req.body,
    getActor: actorFromRequest,
    authorizeUpload: async ({ actor, storageKey, payload }) => {
      const assetType = payload.assetType === 'license' ? 'license' : 'media';
      if (assetType === 'license') {
        if (!keyMatchesCategory(storageKey, 'licenses')) badRequest('Ruta de licencia no autorizada.');
        const descriptor = media.validateLicenseDescriptor(payload);
        return { contentType: descriptor.contentType, maximumSizeInBytes: LICENSE_MAX_BYTES };
      }
      const metadata = parseMetadata(payload.metadata);
      const descriptor = media.validateMediaDescriptor(payload);
      metadata.contentType = descriptor.contentType;
      media.normalizeMetadata(metadata, actor);
      if (!keyMatchesCategory(storageKey, metadata.category)) badRequest('La ruta no coincide con la categoría autorizada.');
      return { contentType: descriptor.contentType, maximumSizeInBytes: cfg.media.maxUploadBytes };
    }
  });
  res.json(result);
}));

module.exports = router;
