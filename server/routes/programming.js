const router = require('express').Router();
const programming = require('../core/programming');
const validation = require('../utils/validation');
const { auth, asyncRoute } = require('../middleware/security');

router.get('/programming', auth('desarrollador', 'administrador', 'locutor'), asyncRoute(async (req, res) => {
  res.json(await programming.get());
}));
router.put('/programming', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  res.json({ ok: true, programming: await programming.replace(req.actor, validation.objectBody(req)) });
}));
router.post('/programming/reset', auth('desarrollador', 'administrador'), asyncRoute(async (req, res) => {
  res.json({ ok: true, programming: await programming.reset(req.actor) });
}));
module.exports = router;
