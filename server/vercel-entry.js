// Entrada estable para Vercel. El build la empaqueta junto con todo el código local.
let app = null;
let bootError = null;

try {
  app = require('./app').app;
} catch (error) {
  bootError = error;
  console.error('[rayoboss:boot]', error && (error.stack || error.message || error));
}

module.exports = function rayobossVercelHandler(req, res) {
  if (bootError) {
    return res.status(500).json({
      ok: false,
      code: 'RAYOBOSS_BOOT_FAILED',
      error: 'La aplicación no pudo iniciar. Consulte Runtime Logs en Vercel.'
    });
  }
  return app(req, res);
};
