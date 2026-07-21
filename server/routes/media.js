const router = require('express').Router();
const multer = require('multer');
const cfg = require('../config');
const media = require('../core/media-library');
const validation = require('../utils/validation');
const sessions = require('../core/sessions');
const users = require('../core/users');
const security = require('../middleware/security');
const storageFactory = require('../core/storage/storageFactory');
const { auth, asyncRoute } = security;
const { forbidden, badRequest } = require('../utils/errors');

function mediaRoles() { return ['desarrollador', 'administrador']; }
function parseMetadata(value) {
  try { return typeof value === 'string' ? JSON.parse(value || '{}') : (value || {}); }
  catch (_) { badRequest('Metadatos multimedia inválidos.'); }
}

const storage = storageFactory.getStorageProvider();
const serverUpload = storage.getServerUploadConfig();
const upload = serverUpload ? multer({
  dest: serverUpload.tempDir,
  limits: { fileSize: cfg.media.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^(audio|video)\//.test(file.mimetype))
}) : null;

router.get('/media/config', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const description = storage.describe();
  res.json({
    ...description,
    maxUploadBytes: cfg.media.maxUploadBytes,
    categories: media.categories(),
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  });
}));

router.get('/media', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  res.json({ items: await media.list({ category: req.query.category || '', includeInactive: true }), categories: media.categories() });
}));

router.patch('/media/:id', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  res.json({ ok: true, item: await media.update(req.actor, req.params.id, validation.objectBody(req)) });
}));

router.delete('/media/:id', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const item = await media.get(req.params.id);
  await storageFactory.deleteStoredObject(item);
  await media.remove(req.actor, req.params.id);
  res.json({ ok: true });
}));

if (upload) {
  router.post('/media/local-upload', auth('desarrollador', 'administrador'), upload.single('file'), asyncRoute(async (req, res) => {
    if (!req.file) badRequest('Selecciona un archivo de audio o video.');
    let stored = null;
    try {
      const metadata = parseMetadata(req.body.metadata);
      metadata.contentType = req.file.mimetype;
      media.normalizeMetadata(metadata, req.actor);
      stored = await storage.storeUploadedFile({
        tempPath: req.file.path,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        sizeBytes: req.file.size,
        category: metadata.category
      });
      const item = await media.addUploaded(req.actor, metadata, stored);
      res.json({ ok: true, item });
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
  const metadata = parseMetadata(body.metadata);
  metadata.contentType = String(metadata.contentType || body.contentType || '').toLowerCase();
  const sizeBytes = Number(body.sizeBytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > cfg.media.maxUploadBytes) badRequest('Tamaño de archivo inválido.');
  media.normalizeMetadata(metadata, req.actor);
  const storageKey = storage.createStorageKey({ category: metadata.category, originalName: body.originalName });
  res.json({ storageKey });
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
    normalizeMetadata: media.normalizeMetadata,
    maxUploadBytes: cfg.media.maxUploadBytes,
    onCompleted: async ({ actor, metadata, stored }) => {
      await media.addUploaded(actor, metadata, stored);
    }
  });
  res.json(result);
}));

module.exports = router;
