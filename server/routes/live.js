const router = require('express').Router();
const live = require('../core/live');
const microphones = require('../core/microphones');
const rtc = require('../core/rtc');
const validation = require('../utils/validation');
const { auth, asyncRoute } = require('../middleware/security');

router.get('/live/status', asyncRoute(async (req, res) => res.json(await live.status())));
router.post('/live/start', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  const title = body.title == null || body.title === ''
    ? ''
    : validation.text(body.title, 'Titulo', { min: 1, max: 120 });
  res.json({ ok: true, status: await live.goLive(req.actor, title), streamUrl: '/api/live/stream' });
}));
router.post('/live/end', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  const result = await live.endLive();
  await Promise.all([
    microphones.expireBroadcast(result.endedBroadcastId),
    rtc.closeRoom(result.endedBroadcastId)
  ]);
  res.json({ ok: true, status: result.status });
}));
router.get('/live/stream', asyncRoute(async (req, res) => live.attachListener(res)));

module.exports = router;
