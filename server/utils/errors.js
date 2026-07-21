class AppError extends Error {
  constructor(message, status = 400, expose = true) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.expose = expose;
  }
}

function badRequest(message) { throw new AppError(message, 400, true); }
function forbidden(message = 'Sin permiso para esta accion.') { throw new AppError(message, 403, true); }
function notFound(message = 'Recurso no encontrado.') { throw new AppError(message, 404, true); }

module.exports = { AppError, badRequest, forbidden, notFound };
