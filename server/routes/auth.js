const router = require('express').Router();
const users = require('../core/users');
const sessions = require('../core/sessions');
const validation = require('../utils/validation');
const {
  loginLimiter, recordLoginFailure, clearLoginAttempts,
  setSessionCookie, clearSessionCookie, auth, asyncRoute
} = require('../middleware/security');

router.post('/login', loginLimiter, asyncRoute(async (req, res) => {
  const body = validation.objectBody(req);
  const username = validation.text(body.username, 'Usuario', { min: 1, max: 64 });
  const password = validation.text(body.password, 'Contraseña', { min: 1, max: 256, trim: false });
  const user = await users.verifyLogin(username, password);
  if (!user) {
    recordLoginFailure(req);
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  clearLoginAttempts(req);
  setSessionCookie(req, res, sessions.createSession(user));
  res.json({ ok: true, user: { username: user.username, role: user.role } });
}));

router.post('/logout', (req, res) => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
});
router.get('/me', auth(), (req, res) => res.json({ user: req.actor }));

module.exports = router;
