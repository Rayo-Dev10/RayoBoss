const $ = id => document.getElementById(id);
let manifest = null;
let rtc = null;
let currentKey = '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(url, options={}) {
  const response = await fetch(url, { ...options, cache:'no-store', headers:{'Content-Type':'application/json',...(options.headers||{})} });
  const body = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(body.error || 'No fue posible obtener la señal.');
  return body;
}
function showMedia(kind) {
  $('video').classList.toggle('hidden', kind !== 'video');
  $('audio').classList.toggle('hidden', kind !== 'audio');
  $('poster').classList.toggle('hidden', Boolean(kind));
}
async function tryPlay(element) {
  try { await element.play(); $('unlock').classList.add('hidden'); }
  catch (_) { $('unlock').classList.remove('hidden'); $('status').textContent='La señal está lista; este navegador exige una pulsación para activar audio audible.'; }
}
$('unlock').addEventListener('click', async()=>{
  const el = !$('video').classList.contains('hidden') ? $('video') : $('audio');
  await tryPlay(el);
});
function closeRtc() {
  if (!rtc) return;
  clearInterval(rtc.timer);
  try { rtc.pc.close(); } catch(_){}
  fetch('/api/rtc/clients/leave',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({connectionId:rtc.session.connectionId,token:rtc.session.token})}).catch(()=>{});
  rtc=null;
}
async function sendSignal(session, signal) {
  await api('/api/rtc/clients/signal',{method:'POST',body:JSON.stringify({connectionId:session.connectionId,token:session.token,signal})});
}
async function pollRtc(client) {
  if (!client || client.polling) return; client.polling=true;
  try {
    const result=await api('/api/rtc/clients/poll',{method:'POST',body:JSON.stringify({connectionId:client.session.connectionId,token:client.session.token})});
    for(const signal of result.signals||[]) {
      if(signal.type==='close'){closeRtc();return;}
      if(signal.type==='description'){
        await client.pc.setRemoteDescription(signal.payload);
        const answer=await client.pc.createAnswer(); await client.pc.setLocalDescription(answer);
        await sendSignal(client.session,{type:'description',payload:client.pc.localDescription.toJSON()});
        for(const c of client.pending.splice(0)) await client.pc.addIceCandidate(c).catch(()=>{});
      } else if(signal.type==='candidate'&&signal.payload){
        if(client.pc.remoteDescription) await client.pc.addIceCandidate(signal.payload).catch(()=>{}); else client.pending.push(signal.payload);
      }
    }
  } finally { client.polling=false; }
}
async function startRtc() {
  closeRtc(); showMedia(null); $('status').textContent='Conectando con el estudio en vivo…';
  const result=await api('/api/rtc/listeners/join',{method:'POST',body:'{}'});
  const pc=new RTCPeerConnection({iceServers:result.session.iceServers,bundlePolicy:'max-bundle'});
  const client={pc,session:result.session,pending:[],polling:false,timer:null,stream:new MediaStream()}; rtc=client;
  pc.onicecandidate=e=>{if(e.candidate)sendSignal(client.session,{type:'candidate',payload:e.candidate.toJSON()}).catch(()=>{});};
  pc.ontrack=async e=>{
    if(!client.stream.getTracks().some(t=>t.id===e.track.id)) client.stream.addTrack(e.track);
    const hasVideo=client.stream.getVideoTracks().length>0;
    const el=hasVideo?$('video'):$('audio'); el.srcObject=client.stream; showMedia(hasVideo?'video':'audio');
    $('meta').textContent=hasVideo?'Señal audiovisual WebRTC':'Señal de audio WebRTC'; await tryPlay(el);
  };
  pc.onconnectionstatechange=()=>{$('status').textContent=pc.connectionState==='connected'?'EN VIVO conectado':`Estado WebRTC: ${pc.connectionState}`;};
  client.timer=setInterval(()=>pollRtc(client).catch(e=>$('status').textContent=e.message),result.session.pollMs||900);
  await pollRtc(client);
}

async function startDirectLive(data) {
  closeRtc();
  const videoMode = ['hls','direct-video'].includes(data.liveTransport);
  const el = videoMode ? $('video') : $('audio'); const other = videoMode ? $('audio') : $('video');
  other.pause(); other.removeAttribute('src'); other.srcObject=null;
  el.srcObject=null; el.src=data.liveMediaUrl; el.loop=false; showMedia(videoMode?'video':'audio');
  el.onloadedmetadata=()=>tryPlay(el); el.load();
  $('meta').textContent = videoMode ? 'Señal audiovisual de la VPS' : 'Señal de audio de la VPS';
  $('status').textContent = `Transporte: ${data.liveTransport}.`;
}

async function startAutodj(data) {
  closeRtc();
  const item=data.autodj&&data.autodj.item; if(!item){showMedia(null);$('status').textContent='AutoDJ sin contenido programado.';return;}
  const el=item.kind==='video'?$('video'):$('audio'); const other=item.kind==='video'?$('audio'):$('video');
  other.pause(); other.removeAttribute('src'); other.srcObject=null;
  el.srcObject=null; el.src=item.url; el.loop=false;
  showMedia(item.kind); $('title').textContent=item.title; $('meta').textContent=`${data.autodj.playlist?.name||'AutoDJ'} · ${item.kind==='video'?'Audio y video':'Audio'}`;
  el.onloadedmetadata=async()=>{const offset=Math.max(0,Number(data.autodj.offsetSeconds)||0);if(Number.isFinite(el.duration)&&el.duration>0)el.currentTime=Math.min(offset,Math.max(0,el.duration-0.2));await tryPlay(el);};
  el.onended=()=>refresh(true); el.load(); $('status').textContent='AutoDJ programado por reloj.';
}
async function refresh(force=false) {
  try {
    const data=await api('/api/public/on-air'); manifest=data; $('mode').textContent=data.mode==='live'?'EN VIVO':'AutoDJ'; $('title').textContent=data.status.title;
    const key=data.mode==='live'?`live:${data.status.broadcastId}`:`auto:${data.autodj?.item?.id}`;
    if(force||key!==currentKey){currentKey=key;if(data.mode==='live'){if(data.liveMediaUrl)await startDirectLive(data);else await startRtc();}else await startAutodj(data);}
  } catch(e){$('status').textContent=e.message;}
}
window.addEventListener('beforeunload',closeRtc); refresh(true); setInterval(()=>refresh(false),4000);
