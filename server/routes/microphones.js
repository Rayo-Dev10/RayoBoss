const router = require('express').Router();
const microphones = require('../core/microphones');
const live = require('../core/live');
const rtc = require('../core/rtc');
const validation = require('../utils/validation');
const { auth, asyncRoute } = require('../middleware/security');

router.get('/microphones', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const liveStatus = await live.status();
  res.json({ requests: await microphones.listAll(liveStatus), live: liveStatus });
}));

router.get('/microphones/me', auth(), asyncRoute(async (req, res) => {
  const liveStatus = await live.status();
  res.json({ request: await microphones.forUser(req.actor.username, liveStatus), live: liveStatus });
}));

router.post('/microphones/request', auth('invitado', 'periodista'), asyncRoute(async (req, res) => {
  const liveStatus = await live.status();
  res.json({ ok: true, request: await microphones.requestForActor(req.actor, liveStatus) });
}));

router.post('/microphones/:id/approve-test', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const liveStatus = await live.status();
  res.json({ ok: true, request: await microphones.approveTest(req.actor, req.params.id, liveStatus) });
}));

router.post('/microphones/:id/approve-live', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const liveStatus = await live.status();
  res.json({ ok: true, request: await microphones.approveLive(req.actor, req.params.id, liveStatus) });
}));

router.post('/microphones/me/test-result', auth('invitado', 'periodista'), asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  const result = body.result === 'ready' ? 'ready' : 'failed';
  const liveStatus = await live.status();
  res.json({ ok: true, request: await microphones.reportTest(req.actor, result, liveStatus) });
}));

router.post('/microphones/:id/revoke', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const liveStatus = await live.status();
  const request = await microphones.revoke(req.actor, req.params.id);
  await rtc.disconnectUsername(request.username, liveStatus);
  res.json({ ok: true, request });
}));

module.exports = router;
