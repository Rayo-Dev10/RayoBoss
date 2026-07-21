const { badRequest } = require('./errors');

function objectBody(req) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) badRequest('Cuerpo JSON invalido.');
  return req.body;
}
function text(value, name, { min = 0, max = 200, trim = true } = {}) {
  if (typeof value !== 'string') badRequest(`${name} debe ser texto.`);
  const result = trim ? value.trim() : value;
  if (result.length < min) badRequest(`${name} debe tener al menos ${min} caracteres.`);
  if (result.length > max) badRequest(`${name} no puede superar ${max} caracteres.`);
  return result;
}

module.exports = { objectBody, text };
