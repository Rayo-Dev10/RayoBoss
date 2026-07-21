const path = require('path');
const express = require('express');
const cfg = require('./config');
const { securityHeaders, sameOrigin } = require('./middleware/security');
const live = require('./core/live');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', cfg.server.trustProxy);
app.use(express.json({ limit: cfg.server.jsonLimit, strict: true }));
app.use(securityHeaders);
app.use(sameOrigin);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'RayoBoss', version: cfg.version, mode: cfg.mode, time: new Date().toISOString() });
});
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/live'));
app.use('/api', require('./routes/microphones'));
app.use('/api', require('./routes/rtc'));
app.use('/api', require('./routes/media'));
app.use('/api', require('./routes/programming'));
app.use('/api', require('./routes/public'));
if (!cfg.isVercel && cfg.dataDir) {
  app.use(cfg.storage.localPublicPath, express.static(cfg.storage.localRootDir, { maxAge: '1h', fallthrough: false }));
}
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], maxAge: cfg.isProduction ? '1h' : 0 }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error('[rayoboss]', err.stack || err.message || err);
  res.status(status).json({ error: status < 500 && err.expose !== false ? err.message : 'Error interno.' });
});

module.exports = { app, live, cfg };
