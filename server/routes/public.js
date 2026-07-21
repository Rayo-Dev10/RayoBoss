const router = require('express').Router();
const live = require('../core/live');
const programming = require('../core/programming');
const cfg = require('../config');
const { asyncRoute } = require('../middleware/security');

function absolute(req, path) { return `${req.protocol}://${req.get('host')}${path}`; }
router.get('/public/on-air', asyncRoute(async (req, res) => {
  const status = await live.status();
  const autodj = status.live ? null : await programming.now();
  const liveMediaUrl = cfg.public.hlsUrl || cfg.public.videoUrl || cfg.public.audioUrl || null;
  const liveTransport = !status.live ? 'direct-file' : (cfg.public.hlsUrl ? 'hls' : (cfg.public.videoUrl ? 'direct-video' : (cfg.public.audioUrl ? 'direct-audio' : 'webrtc')));
  res.json({
    mode: status.live ? 'live' : 'autodj', status, autodj, liveTransport, liveMediaUrl,
    embedUrl: absolute(req, '/embed?autoplay=1'),
    audioEndpoint: absolute(req, '/api/public/audio'),
    videoEndpoint: absolute(req, '/api/public/video'),
    autoplayNotice: 'El reproductor intenta iniciar automáticamente; el navegador puede exigir una interacción para audio audible.'
  });
}));
router.get('/public/audio', asyncRoute(async (req, res) => {
  const status = await live.status();
  if (status.live) {
    if (cfg.public.audioUrl) return res.redirect(307, cfg.public.audioUrl);
    return res.status(409).json({ error: 'El vivo de Vercel usa WebRTC. Inserta /embed como iframe; en VPS configura RAYOBOSS_PUBLIC_AUDIO_URL para obtener un src de audio directo.', embedUrl: absolute(req, '/embed?autoplay=1') });
  }
  const current = await programming.now();
  if (!current.item) return res.redirect(307, '/api/live/stream');
  res.redirect(307, current.item.url);
}));
router.get('/public/video', asyncRoute(async (req, res) => {
  const status = await live.status();
  if (status.live) {
    if (cfg.public.videoUrl) return res.redirect(307, cfg.public.videoUrl);
    return res.status(409).json({ error: 'El vivo de Vercel usa WebRTC. Inserta /embed como iframe; en VPS configura RAYOBOSS_PUBLIC_VIDEO_URL o HLS.', embedUrl: absolute(req, '/embed?autoplay=1') });
  }
  const current = await programming.now();
  if (!current.item || current.item.kind !== 'video') return res.status(204).end();
  res.redirect(307, current.item.url);
}));
router.get('/public/embed-code', (req, res) => {
  const url = absolute(req, '/embed?autoplay=1');
  res.json({ iframe: `<iframe src="${url}" allow="autoplay; fullscreen" style="width:100%;aspect-ratio:16/9;border:0" title="UNIOC Radio"></iframe>`, url });
});
module.exports = router;
