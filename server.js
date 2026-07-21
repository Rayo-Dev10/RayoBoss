require('./server/load-env')();
const { app, live, cfg } = require('./server/app');
const server = app.listen(cfg.server.port, () => {
  console.log(`RayoBoss ${cfg.version} en http://localhost:${cfg.server.port} (modo ${cfg.mode}, frames ${cfg.audio.frameMs} ms)`);
});

let closing = false;
function graceful(signal) {
  if (closing) return;
  closing = true;
  console.log(`[rayoboss] ${signal}: cerrando streams y servidor...`);
  live.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGTERM', () => graceful('SIGTERM'));
process.on('SIGINT', () => graceful('SIGINT'));
process.on('uncaughtException', error => {
  console.error('[rayoboss] uncaughtException', error);
  graceful('uncaughtException');
});
process.on('unhandledRejection', error => {
  console.error('[rayoboss] unhandledRejection', error);
  graceful('unhandledRejection');
});
