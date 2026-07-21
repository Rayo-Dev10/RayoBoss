const router = require('express').Router();
const live = require('../core/live');
const rtc = require('../core/rtc');
const microphones = require('../core/microphones');
const validation = require('../utils/validation');
const { auth, asyncRoute } = require('../middleware/security');
const { forbidden } = require('../utils/errors');

router.post('/rtc/listeners/join', asyncRoute(async (req, res) => {
  const liveStatus = await live.status();
  res.json({ ok: true, session: await rtc.createClient('listener', { displayName: 'Oyente' }, liveStatus) });
}));

router.post('/rtc/participants/join', auth('invitado', 'periodista'), asyncRoute(async (req, res) => {
  const liveStatus = await live.status();
  if (!(await microphones.canJoinLive(req.actor.username, liveStatus))) {
    forbidden('El administrador aun no aprobo tu microfono para salir al aire.');
  }
  res.json({ ok: true, session: await rtc.createClient('participant', {
    username: req.actor.username,
    displayName: req.actor.username
  }, liveStatus) });
}));

router.get('/rtc/host/poll', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  const liveStatus = await live.status();
  res.json(await rtc.pollHost(req.actor, liveStatus));
}));

router.post('/rtc/host/signal', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  const targetId = validation.text(body.targetId, 'Conexion destino', { min: 8, max: 64 });
  const liveStatus = await live.status();
  await rtc.signalFromHost(req.actor, targetId, body.signal, liveStatus);
  res.json({ ok: true });
}));

router.post('/rtc/clients/poll', asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  const connectionId = validation.text(body.connectionId, 'Conexion', { min: 8, max: 64 });
  const token = validation.text(body.token, 'Token', { min: 20, max: 128, trim: false });
  const liveStatus = await live.status();
  res.json(await rtc.pollClient(connectionId, token, liveStatus));
}));

router.post('/rtc/clients/signal', asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  const connectionId = validation.text(body.connectionId, 'Conexion', { min: 8, max: 64 });
  const token = validation.text(body.token, 'Token', { min: 20, max: 128, trim: false });
  const liveStatus = await live.status();
  await rtc.signalFromClient(connectionId, token, body.signal, liveStatus);
  res.json({ ok: true });
}));

router.post('/rtc/clients/leave', asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  const connectionId = validation.text(body.connectionId, 'Conexion', { min: 8, max: 64 });
  const token = validation.text(body.token, 'Token', { min: 20, max: 128, trim: false });
  const liveStatus = await live.status();
  await rtc.leaveClient(connectionId, token, liveStatus);
  res.json({ ok: true });
}));

module.exports = router;
