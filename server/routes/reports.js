const router = require('express').Router();
const history = require('../core/playback-history');
const media = require('../core/media-library');
const live = require('../core/live');
const { auth, asyncRoute } = require('../middleware/security');
const { badRequest } = require('../utils/errors');

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function csvCell(value) {
  let text = String(value == null ? '' : value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

router.get('/reports/playback', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  const report = await history.report(req.query.month || currentMonth());
  res.json({ ...report, licenseTypes: media.licenseTypes() });
}));

router.get('/reports/playback.csv', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  const report = await history.report(req.query.month || currentMonth());
  const headers = ['Título', 'Artista', 'Álbum', 'ISRC', 'Categoría', 'Tipo de licencia', 'Base de derechos', 'Referencia', 'Soporte adjunto', 'Reproducciones', 'Segundos emitidos', 'Primera reproducción', 'Última reproducción'];
  const rows = report.items.map(item => [
    item.title, item.artist, item.album, item.isrc, item.category, media.licenseTypes()[item.licenseType] || item.licenseType,
    item.rightsBasis, item.rightsReference, item.licenseDocument ? 'Sí' : 'No', item.plays,
    Math.round(item.totalSeconds * 1000) / 1000, item.firstPlayedAt, item.lastPlayedAt
  ]);
  const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}`;
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="rayoboss-reproducciones-${report.month}.csv"`);
  res.send(csv);
}));

router.post('/reports/playback/record', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  const source = String(req.body?.source || '');
  if (!['live-effect', 'live-bed', 'live-media'].includes(source)) badRequest('Origen de reproducción inválido.');
  const status = await live.status();
  if (!status.live) badRequest('Solo pueden registrarse piezas del estudio durante una transmisión en vivo.');
  const item = await media.get(String(req.body?.itemId || ''));
  const result = await history.record(item, { source, actor: req.actor });
  res.json({ ok: true, ...result });
}));

module.exports = router;
