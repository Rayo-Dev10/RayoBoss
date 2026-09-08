// SOLO PRUEBAS LOCALES. Este archivo no forma parte del artefacto StackCP.
// Produce audio y video propios; no solicita acceso a dispositivos del usuario.
(() => {
  async function synthetic(constraints = {}) {
    const stream = new MediaStream();
    if (constraints.audio) {
      const context = new AudioContext();
      const destination = context.createMediaStreamDestination();
      const tone = context.createOscillator(); const gain = context.createGain();
      tone.frequency.value = 440; gain.gain.value = 0.025;
      tone.connect(gain).connect(destination); tone.start(); await context.resume();
      const track = destination.stream.getAudioTracks()[0];
      track.addEventListener('ended', () => { tone.stop(); context.close(); });
      stream.addTrack(track);
    }
    if (constraints.video) {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
      const context = canvas.getContext('2d');
      const draw = () => { context.fillStyle = '#10243b'; context.fillRect(0,0,640,360); context.fillStyle = '#7dd3fc'; context.font = '28px sans-serif'; context.fillText('RayoBoss · señal sintética',50,160); context.fillText(new Date().toISOString(),50,220); };
      draw(); const timer = setInterval(draw,100);
      const track = canvas.captureStream(10).getVideoTracks()[0];
      track.addEventListener('ended', () => clearInterval(timer)); stream.addTrack(track);
    }
    return stream;
  }
  navigator.mediaDevices.getUserMedia = synthetic;
  navigator.mediaDevices.getDisplayMedia = () => synthetic({audio:true,video:true});
})();
