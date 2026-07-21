// Extensiones multimedia RayoBoss 4.0.1.
hostStudio.videoStream = null;
hostStudio.videoTrack = null;
hostStudio.voiceAnalyser = null;
hostStudio.duckTimer = null;
hostStudio.bed = null;
hostStudio.effectPlayers = new Set();
let mediaConfig302 = null;
let mediaItems302 = [];
let programming302 = null;

async function loadPublicEndpoints302() {
  try {
    const data = await api('/api/public/embed-code');
    $('embedUrl').value = data.url;
    $('embedCode').value = data.iframe;
  } catch (_) { /* se reintenta al abrir el reproductor */ }
}
async function loadMedia302() {
  if (!currentUser || !roleIs('desarrollador', 'administrador', 'locutor')) return;
  try {
    const result = await window.RayoLibraryV4.load();
    mediaItems302 = result.items || [];
    mediaConfig302 = result.config || mediaConfig302;
    loadStudioAssets302();
    if (window.RayoProgrammingV4) window.RayoProgrammingV4.setMediaItems(mediaItems302, mediaConfig302);
  } catch (error) { if ($('mediamsg')) message('mediamsg', error.message, false); }
}
async function uploadMedia302() {
  return window.RayoLibraryV4.uploadSelected();
}
async function loadProgramming302() {
  if (window.RayoProgrammingV4) await window.RayoProgrammingV4.load();
}
function loadStudioAssets302() {
  if (!$('bedSelect')) return;
  const beds = mediaItems302.filter(i => i.active && i.category === 'live.camas');
  $('bedSelect').replaceChildren(...beds.map(item => { const o=document.createElement('option');o.value=item.id;o.textContent=item.title;return o; }));
  const effects = mediaItems302.filter(i => i.active && i.category === 'live.efectos');
  $('soundboard').replaceChildren(...effects.map(item => actionButton(item.title, 'btn naranja', () => playEffect302(item))));
}
function setupDucking302() {
  if (!hostStudio.context || hostStudio.voiceAnalyser) return;
  const analyser = hostStudio.context.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.65;
  hostStudio.localGain.connect(analyser); hostStudio.voiceAnalyser = analyser;
  const data = new Uint8Array(analyser.fftSize);
  hostStudio.duckTimer = setInterval(() => {
    if (!hostStudio.bed || !hostStudio.voiceAnalyser) return;
    analyser.getByteTimeDomainData(data); let sum=0;
    for (const value of data) { const normalized=(value-128)/128; sum += normalized*normalized; }
    const rms=Math.sqrt(sum/data.length); const normal=Number($('bedVolume').value)||0.55; const target=rms>0.035?Math.min(0.16,normal*0.3):normal;
    hostStudio.bed.gain.gain.setTargetAtTime(target, hostStudio.context.currentTime, 0.12);
  },100);
}
async function attachVideo302(stream) {
  if (hostStudio.videoStream) hostStudio.videoStream.getTracks().forEach(t=>t.stop());
  hostStudio.videoStream = stream; hostStudio.videoTrack = stream ? stream.getVideoTracks()[0] : null;
  $('studioPreview').srcObject = stream; visible('studioPreview', Boolean(stream));
  if (hostStudio.videoTrack) hostStudio.videoTrack.onended = () => attachVideo302(null);
  for (const entry of hostStudio.peers.values()) if (entry.videoSender) await entry.videoSender.replaceTrack(hostStudio.videoTrack).catch(()=>{});
  message('studiomsg', hostStudio.videoTrack ? 'Fuente de video integrada a la señal.' : 'La transmisión continúa solo con audio.', true);
}
async function selectCamera302() {
  try { const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false}); await attachVideo302(stream); }
  catch(error){message('studiomsg',`No fue posible abrir la cámara: ${error.message}`,false);}
}
async function selectScreen302() {
  try {
    const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true,preferCurrentTab:true,systemAudio:'include'});
    const audioTrack=stream.getAudioTracks()[0];
    if(audioTrack&&hostStudio.context){const audioOnly=new MediaStream([audioTrack]);const source=hostStudio.context.createMediaStreamSource(audioOnly);source.connect(hostStudio.broadcastDestination);source.connect(hostStudio.context.destination);hostStudio.screenAudioSource=source;}
    await attachVideo302(stream);
  } catch(error){message('studiomsg',`No fue posible compartir la pantalla: ${error.message}`,false);}
}
async function toggleBed302() {
  try {
    if (!hostStudio.active) throw new Error('Activa primero el estudio en vivo.');
    if (hostStudio.bed) {
      hostStudio.bed.element.pause(); hostStudio.bed.source.disconnect(); hostStudio.bed.gain.disconnect(); hostStudio.bed=null; $('btnBed').textContent='Activar cama'; return;
    }
    const item=mediaItems302.find(i=>i.id===$('bedSelect').value); if(!item)throw new Error('No hay una cama musical seleccionada.');
    const element=new Audio(); element.crossOrigin='anonymous'; element.src=item.url; element.loop=true;
    const source=hostStudio.context.createMediaElementSource(element); const gain=hostStudio.context.createGain(); gain.gain.value=Number($('bedVolume').value)||0.55;
    const monitor=hostStudio.context.createGain(); monitor.gain.value=0.18;
    source.connect(gain); gain.connect(hostStudio.broadcastDestination); gain.connect(monitor); monitor.connect(hostStudio.context.destination);
    hostStudio.bed={element,source,gain,monitor}; await element.play();
    api('/api/reports/playback/record',{method:'POST',body:JSON.stringify({itemId:item.id,source:'live-bed'})}).catch(()=>{});
    $('btnBed').textContent='Detener cama'; setupDucking302();
  } catch(error){message('studiomsg',error.message,false);}
}
async function playEffect302(item) {
  try {
    if (!hostStudio.active) throw new Error('Activa primero el estudio en vivo.');
    const element=new Audio(); element.crossOrigin='anonymous'; element.src=item.url;
    const source=hostStudio.context.createMediaElementSource(element); const monitor=hostStudio.context.createGain(); monitor.gain.value=0.35;
    source.connect(hostStudio.broadcastDestination); source.connect(monitor); monitor.connect(hostStudio.context.destination);
    hostStudio.effectPlayers.add(element); element.onended=()=>{try{source.disconnect();monitor.disconnect();}catch(_){}hostStudio.effectPlayers.delete(element);}; await element.play();
    api('/api/reports/playback/record',{method:'POST',body:JSON.stringify({itemId:item.id,source:'live-effect'})}).catch(()=>{});
  } catch(error){message('studiomsg',error.message,false);}
}

const createHostPeer301 = createHostPeer;
createHostPeer = async function createHostPeer302(join) {
  if (!hostStudio.active || hostStudio.peers.has(join.id)) return;
  const pc=createPeer(hostStudio.iceServers||[]);
  const entry={pc,kind:join.kind,username:join.username,pendingCandidates:[],remoteSource:null,monitorGain:null,videoSender:null};
  hostStudio.peers.set(join.id,entry);
  pc.onicecandidate=e=>{if(e.candidate)sendHostSignal(join.id,{type:'candidate',payload:e.candidate.toJSON()}).catch(()=>{});};
  pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState))cleanupHostPeer(join.id);};
  if(join.kind==='listener'){
    const audioTrack=hostStudio.broadcastDestination.stream.getAudioTracks()[0];
    pc.addTransceiver(audioTrack,{direction:'sendonly',streams:[hostStudio.broadcastDestination.stream]});
    const video=pc.addTransceiver('video',{direction:'sendonly'}); entry.videoSender=video.sender;
    if(hostStudio.videoTrack)await entry.videoSender.replaceTrack(hostStudio.videoTrack);
  }else{
    const hostTrack=hostStudio.hostDestination.stream.getAudioTracks()[0];
    pc.addTransceiver(hostTrack,{direction:'sendrecv',streams:[hostStudio.hostDestination.stream]});
    const video=pc.addTransceiver('video',{direction:'sendonly'}); entry.videoSender=video.sender;
    if(hostStudio.videoTrack)await entry.videoSender.replaceTrack(hostStudio.videoTrack);
    pc.ontrack=event=>{
      if(event.track.kind!=='audio'||!event.streams[0]||entry.remoteSource)return;
      const source=hostStudio.context.createMediaStreamSource(event.streams[0]); const monitor=hostStudio.context.createGain(); monitor.gain.value=1;
      source.connect(hostStudio.broadcastDestination); source.connect(monitor); monitor.connect(hostStudio.context.destination);
      if(hostStudio.voiceAnalyser)source.connect(hostStudio.voiceAnalyser);
      entry.remoteSource=source;entry.monitorGain=monitor;message('studiomsg',`Micrófono de ${join.displayName||join.username} conectado. Usa audífonos.`,true);
    };
  }
  const offer=await pc.createOffer();await pc.setLocalDescription(offer);await sendHostSignal(join.id,{type:'description',payload:pc.localDescription.toJSON()});updateStudioCounters();
};

const startHostStudio301 = startHostStudio;
startHostStudio = async function startHostStudio302(status, preparedStream=null) {
  await startHostStudio301(status,preparedStream); setupDucking302(); await loadMedia302();
};
const stopHostStudio301 = stopHostStudio;
stopHostStudio = function stopHostStudio302() {
  if(hostStudio.duckTimer)clearInterval(hostStudio.duckTimer);hostStudio.duckTimer=null;
  if(hostStudio.bed){hostStudio.bed.element.pause();hostStudio.bed=null;}
  for(const element of hostStudio.effectPlayers){element.pause();}hostStudio.effectPlayers.clear();
  if(hostStudio.videoStream)hostStudio.videoStream.getTracks().forEach(t=>t.stop());hostStudio.videoStream=null;hostStudio.videoTrack=null;
  if($('studioPreview')){$('studioPreview').srcObject=null;visible('studioPreview',false);} hostStudio.voiceAnalyser=null;
  return stopHostStudio301();
};
const show301 = show;
show = function show302(section,options){show301(section,options);if(section==='media')loadMedia302();if(section==='program')loadProgramming302();if(section==='player')loadPublicEndpoints302();};
const enter301 = enter;
enter = function enter302(){enter301();loadPublicEndpoints302();if(roleIs('desarrollador','administrador','locutor')){loadMedia302();loadProgramming302();}};

$('btnCamera').addEventListener('click',selectCamera302);
$('btnScreen').addEventListener('click',selectScreen302);
$('btnNoVideo').addEventListener('click',()=>attachVideo302(null));
$('btnBed').addEventListener('click',toggleBed302);
$('btnUploadMedia').addEventListener('click',uploadMedia302);
$('btnCopyEmbed').addEventListener('click',async()=>{await navigator.clipboard.writeText($('embedCode').value);message('amsg','Código iframe copiado.',true);});
loadPublicEndpoints302();
