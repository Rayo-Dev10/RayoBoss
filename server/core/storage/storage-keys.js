const crypto = require('crypto');
const path = require('path');
const { badRequest } = require('../../utils/errors');

function sanitizeFileName(originalName) {
  const source = path.basename(String(originalName || 'archivo'));
  const extension = path.extname(source).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
  const base = path.basename(source, path.extname(source))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80);
  return `${base || 'archivo'}${extension}`;
}

function categoryPath(category) {
  const value = String(category || '').trim();
  if (!/^[a-z0-9]+(?:\.[a-z0-9]+)*$/i.test(value)) badRequest('Categoría de almacenamiento inválida.');
  return value.replace(/\./g, '/').toLowerCase();
}

function buildStorageKey({ category, originalName, namespace = 'rayoboss', now = new Date() }) {
  const safeNamespace = String(namespace || 'rayoboss').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'rayoboss';
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const unique = crypto.randomBytes(10).toString('hex');
  return `${safeNamespace}/${categoryPath(category)}/${year}/${month}/${day}/${unique}-${sanitizeFileName(originalName)}`;
}

function assertSafeStorageKey(key) {
  const value = String(key || '');
  if (!value || value.length > 512 || value.startsWith('/') || value.includes('\\') || value.split('/').includes('..')) {
    badRequest('Clave de almacenamiento inválida.');
  }
  if (!/^rayoboss\/[a-z0-9/_-]+\/[a-z0-9._-]+$/i.test(value)) badRequest('Clave de almacenamiento fuera del espacio permitido.');
  return value;
}

function keyMatchesCategory(key, category) {
  const safe = assertSafeStorageKey(key);
  return safe.startsWith(`rayoboss/${categoryPath(category)}/`);
}

function encodePublicPath(key) {
  return String(key).split('/').map(segment => encodeURIComponent(segment)).join('/');
}

module.exports = { sanitizeFileName, categoryPath, buildStorageKey, assertSafeStorageKey, keyMatchesCategory, encodePublicPath };
