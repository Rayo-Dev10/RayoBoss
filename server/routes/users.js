const router = require('express').Router();
const users = require('../core/users');
const validation = require('../utils/validation');
const live = require('../core/live');
const microphones = require('../core/microphones');
const { auth, asyncRoute } = require('../middleware/security');

router.get('/users', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  res.json({ users: await users.listUsers() });
}));
router.post('/users', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  res.json({ ok: true, user: await users.createUser(req.actor, validation.objectBody(req)) });
}));
router.delete('/users/:username', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  await users.deleteUser(req.actor, req.params.username);
  res.json({ ok: true });
}));
router.post('/users/:username/password', auth(), asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  await users.changePassword(req.actor, req.params.username, body.newPassword);
  res.json({ ok: true, reloginRequired: true });
}));

router.post('/guests/request', asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  const request = await users.requestGuest(body.nombre, body.apellido);
  const liveStatus = await live.status();
  const microphoneRequest = await microphones.requestForGuestAccess(request, liveStatus);
  res.json({ ok: true, request, microphoneRequest });
}));
router.get('/guests', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  res.json({ guests: await users.listGuests() });
}));
router.post('/guests/:id/approve', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  const result = await users.approveGuest(req.actor, req.params.id);
  res.json({ ok: true, ...result });
}));

module.exports = router;
