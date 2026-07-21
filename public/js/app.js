// RayoBoss 4.0.1 - UI segura, biblioteca multimedia y WebRTC audiovisual.
let currentUser = null;
let currentLive = null;
let myMicrophoneRequest = null;
let adminRefreshAt = 0;
const SECTION_PATHS = Object.freeze({
  panel: '/inicio', admin: '/administrativo', vivo: '/en-vivo', media: '/biblioteca',
  program: '/programacion', reports: '/informes', player: '/reproductor', diag: '/diagnostico'
});
const PATH_SECTIONS = Object.fromEntries(Object.entries(SECTION_PATHS).map(([section, pathname]) => [pathname, section]));

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const hostStudio = {
  active: false,
  stream: null,
  context: null,
  broadcastDestination: null,
  hostDestination: null,
  peers: new Map(),
  pollTimer: null,
  polling: false,
  iceServers: []
};
let listenerRtc = null;
let participantRtc = null;

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, headers, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Error de red');
  return body;
}
function message(id, text, ok) {
  const element = $(id);
  element.textContent = text;
  element.className = `msg ${ok ? 'ok' : 'err'}`;
}
function clearMessage(id) {
  const element = $(id);
  element.textContent = '';
  element.className = 'msg';
}
function visible(id, show) { $(id).classList.toggle('oculto', !show); }
function sectionFromLocation() { return PATH_SECTIONS[location.pathname] || 'panel'; }
function sectionAllowed(section) {
  if (section === 'admin' || section === 'media') return roleIs('desarrollador', 'administrador');
  if (section === 'program' || section === 'reports') return roleIs('desarrollador', 'administrador', 'locutor');
  if (section === 'vivo') return roleIs('desarrollador', 'administrador', 'locutor', 'periodista', 'invitado');
  return true;
}
function show(section, options = {}) {
  const target = currentUser && sectionAllowed(section) ? section : (currentUser ? 'panel' : section);
  ['login', 'panel', 'admin', 'vivo', 'media', 'program', 'reports', 'player', 'diag'].forEach(name => {
    $(`t-${name}`).classList.toggle('oculto', name !== target);
  });
  document.querySelectorAll('nav button[data-t]').forEach(button => {
    button.classList.toggle('on', button.dataset.t === target);
  });
  const pathname = SECTION_PATHS[target];
  if (currentUser && target !== section && pathname) history.replaceState({ section: target }, '', pathname);
  if (pathname && currentUser && location.pathname !== pathname && !options.fromHistory) history.pushState({ section: target }, '', pathname);
  document.dispatchEvent(new CustomEvent('rayoboss:section', { detail: { section: target } }));
}
function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}
function actionButton(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.style.margin = '0 6px 6px 0';
  button.style.padding = '5px 10px';
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}
function roleIs(...roles) { return Boolean(currentUser && roles.includes(currentUser.role)); }
function microphoneStateLabel(state) {
  return ({
    requested: 'Solicitado',
    test_approved: 'Prueba autorizada',
    live_approved: 'Aprobado al aire',
    revoked: 'Revocado',
    expired: 'Finalizado'
  })[state] || state || 'Sin solicitud';
}
function testStateLabel(state) {
  return ({ not_started: 'Sin realizar', ready: 'Correcta', failed: 'Fallida' })[state] || state || '-';
}

for (const button of document.querySelectorAll('nav button[data-t]')) {
  button.addEventListener('click', () => show(button.dataset.t));
}
$('btnSalir').addEventListener('click', async () => {
  stopHostStudio();
  await stopParticipantRtc();
  await stopListenerRtc();
  await api('/api/logout', { method: 'POST' });
  location.reload();
});
$('btnEscuchar').addEventListener('click', () => show('player'));
$('btnLogin').addEventListener('click', login);
$('lp').addEventListener('keydown', event => { if (event.key === 'Enter') login(); });
$('btnInvitado').addEventListener('click', requestGuest);
$('btnCrearUsuario').addEventListener('click', createUser);
$('btnClave').addEventListener('click', changePassword);
$('btnVivo').addEventListener('click', startLive);
$('btnFinVivo').addEventListener('click', endLive);
$('btnStudio').addEventListener('click', () => startHostStudio(currentLive));
$('btnStopStudio').addEventListener('click', stopHostStudio);
$('btnMic').addEventListener('click', testLocalMicrophone);
$('btnRequestMic').addEventListener('click', requestMicrophone);
$('btnTestMic').addEventListener('click', testAuthorizedMicrophone);
$('btnJoinMic').addEventListener('click', startParticipantRtc);
$('btnLeaveMic').addEventListener('click', stopParticipantRtc);
$('btnListenLive').addEventListener('click', startListenerRtc);
$('btnStopListen').addEventListener('click', stopListenerRtc);
$('btnDiag').addEventListener('click', loadDiagnostics);
$('btnLoadPublicPlayer').addEventListener('click', () => {
  const frame = $('publicFrame');
  if (!frame.getAttribute('src')) frame.setAttribute('src', frame.dataset.src);
  visible('publicFrame', true);
  $('btnLoadPublicPlayer').textContent = 'Reproductor de oyentes cargado';
  $('btnLoadPublicPlayer').disabled = true;
});
$('btnStream').addEventListener('click', () => { location.href = '/api/public/audio'; });
$('au').addEventListener('ended', () => message('amsg', 'La sesion de AutoDJ termino. Pulsa reproducir para reconectar.', false));
$('au').addEventListener('play', () => clearMessage('amsg'));

async function login() {
  try {
    const result = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('lu').value, password: $('lp').value })
    });
    currentUser = result.user;
    $('lp').value = '';
    enter();
  } catch (error) { message('lmsg', error.message, false); }
}

function enter() {
  $('nav').classList.remove('oculto');
  $('quien').textContent = currentUser.username;
  $('rol').textContent = currentUser.role;
  const admin = roleIs('desarrollador', 'administrador');
  const liveArea = roleIs('desarrollador', 'administrador', 'locutor', 'periodista', 'invitado');
  document.querySelector('[data-t=admin]').style.display = admin ? '' : 'none';
  document.querySelector('[data-t=vivo]').style.display = liveArea ? '' : 'none';
  document.querySelector('[data-t=media]').style.display = admin ? '' : 'none';
  document.querySelector('[data-t=program]').style.display = roleIs('desarrollador', 'administrador', 'locutor') ? '' : 'none';
  document.querySelector('[data-t=reports]').style.display = roleIs('desarrollador', 'administrador', 'locutor') ? '' : 'none';
  const developerOption = $('nr').querySelector('option[value="desarrollador"]');
  developerOption.hidden = currentUser.role !== 'desarrollador';
  developerOption.disabled = currentUser.role !== 'desarrollador';
  visible('hostCard', roleIs('desarrollador', 'administrador', 'locutor'));
  visible('participantCard', roleIs('periodista', 'invitado'));
  show(sectionFromLocation(), { fromHistory: true });
  if (admin) loadAdminData();
  refresh();
}

async function requestGuest() {
  try {
    const result = await api('/api/guests/request', {
      method: 'POST', body: JSON.stringify({ nombre: $('gn').value, apellido: $('ga').value })
    });
    $('lu').value = result.request.username;
    $('lp').focus();
    const micText = result.microphoneRequest
      ? ' Tambien se envio una solicitud de microfono para el vivo actual.'
      : ' La solicitud de microfono podra hacerse cuando exista una transmision en vivo.';
    message('gmsg', `Solicitud enviada. Tu usuario temporal reservado es ${result.request.username}.${micText} Espera la contraseña del administrador y pegala en el campo Contraseña.`, true);
  } catch (error) { message('gmsg', error.message, false); }
}

async function loadAdminData() {
  if (!roleIs('desarrollador', 'administrador')) return;
  try {
    const [usersResult, guestsResult, microphonesResult] = await Promise.all([
      api('/api/users'), api('/api/guests'), api('/api/microphones')
    ]);
    renderUsers(usersResult.users);
    renderGuests(guestsResult.guests);
    renderMicrophones(microphonesResult.requests);
    adminRefreshAt = Date.now();
  } catch (error) { message('umsg', error.message, false); }
}

function renderUsers(users) {
  const body = $('tu').querySelector('tbody');
  body.replaceChildren();
  for (const user of users) {
    const row = document.createElement('tr');
    row.append(cell(user.protected ? `${user.username} (protegido)` : user.username), cell(user.role));
    const actions = document.createElement('td');
    if (!user.protected) actions.append(actionButton('Eliminar', 'btn linea', () => removeUser(user.username)));
    row.append(actions);
    body.append(row);
  }
}

function renderGuests(guests) {
  const body = $('tg').querySelector('tbody');
  body.replaceChildren();
  if (!guests.length) {
    const row = document.createElement('tr');
    const empty = cell('Sin solicitudes.'); empty.colSpan = 4; row.append(empty); body.append(row);
  }
  for (const guest of guests) {
    const row = document.createElement('tr');
    row.append(cell(`${guest.nombre} ${guest.apellido}`), cell(guest.username || '-'), cell(guest.estado));
    const actions = document.createElement('td');
    if (guest.estado === 'pendiente') actions.append(actionButton('Aprobar acceso', 'btn naranja', () => approveGuest(guest.id)));
    row.append(actions);
    body.append(row);
  }
}

function renderMicrophones(requests) {
  const body = $('tm').querySelector('tbody');
  body.replaceChildren();
  const relevant = requests.filter(request => request.active || !['expired'].includes(request.state)).slice(0, 100);
  if (!relevant.length) {
    const row = document.createElement('tr');
    const empty = cell('Sin solicitudes de microfono.'); empty.colSpan = 5; row.append(empty); body.append(row);
  }
  for (const request of relevant) {
    const row = document.createElement('tr');
    row.append(
      cell(`${request.displayName}${request.username ? ` (${request.username})` : ''}`),
      cell(request.role),
      cell(microphoneStateLabel(request.state)),
      cell(testStateLabel(request.testStatus))
    );
    const actions = document.createElement('td');
    if (request.active && request.state === 'requested') {
      actions.append(actionButton('Aprobar prueba', 'btn linea', () => approveMicTest(request.id)));
    }
    if (request.active && ['requested', 'test_approved'].includes(request.state)) {
      actions.append(actionButton('Aprobar al aire', 'btn rojo', () => approveMicLive(request.id)));
    }
    if (request.active && !['revoked', 'expired'].includes(request.state)) {
      actions.append(actionButton('Revocar', 'btn linea', () => revokeMic(request.id)));
    }
    row.append(actions);
    body.append(row);
  }
}

async function createUser() {
  try {
    await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: $('nu').value, password: $('np').value, role: $('nr').value })
    });
    $('np').value = '';
    message('umsg', 'Usuario creado.', true);
    loadAdminData();
  } catch (error) { message('umsg', error.message, false); }
}
async function removeUser(username) {
  try {
    await api(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
    message('umsg', 'Usuario eliminado y sus sesiones quedaron invalidadas.', true);
    loadAdminData();
  } catch (error) { message('umsg', error.message, false); }
}
async function approveGuest(id) {
  try {
    const result = await api(`/api/guests/${encodeURIComponent(id)}/approve`, { method: 'POST' });
    message('credmsg', `Entregar una sola vez\nUsuario: ${result.credentials.username}\nContraseña temporal: ${result.credentials.temporaryPassword}`, true);
    loadAdminData();
  } catch (error) { message('credmsg', error.message, false); }
}
async function approveMicTest(id) {
  try {
    await api(`/api/microphones/${encodeURIComponent(id)}/approve-test`, { method: 'POST' });
    message('micadminmsg', 'Prueba de microfono autorizada.', true);
    loadAdminData();
  } catch (error) { message('micadminmsg', error.message, false); }
}
async function approveMicLive(id) {
  try {
    await api(`/api/microphones/${encodeURIComponent(id)}/approve-live`, { method: 'POST' });
    message('micadminmsg', 'Microfono aprobado para integrarse al vivo.', true);
    loadAdminData();
  } catch (error) { message('micadminmsg', error.message, false); }
}
async function revokeMic(id) {
  try {
    await api(`/api/microphones/${encodeURIComponent(id)}/revoke`, { method: 'POST' });
    message('micadminmsg', 'Microfono revocado y conexion solicitada para cierre.', true);
    loadAdminData();
  } catch (error) { message('micadminmsg', error.message, false); }
}
async function changePassword() {
  try {
    await api(`/api/users/${encodeURIComponent(currentUser.username)}/password`, {
      method: 'POST', body: JSON.stringify({ newPassword: $('cp').value })
    });
    await api('/api/logout', { method: 'POST' });
    alert('Contraseña actualizada. Debes ingresar nuevamente.');
    location.reload();
  } catch (error) { message('cmsg', error.message, false); }
}

async function getMicrophone() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('El navegador no ofrece captura de microfono. Usa HTTPS o localhost y un navegador actualizado.');
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1
    }
  });
}

async function startLive() {
  let stream;
  try {
    $('btnVivo').disabled = true;
    message('vmsg', 'Solicitando el microfono del conductor...', true);
    stream = await getMicrophone();
    const result = await api('/api/live/start', {
      method: 'POST', body: JSON.stringify({ title: $('vt').value })
    });
    currentLive = result.status;
    await startHostStudio(result.status, stream);
    message('vmsg', 'Transmision EN VIVO iniciada. El estudio WebRTC esta enviando el microfono del conductor.', true);
    await refresh();
  } catch (error) {
    if (stream) stream.getTracks().forEach(track => track.stop());
    message('vmsg', `No se inicio el vivo: ${error.message}`, false);
  } finally {
    $('btnVivo').disabled = false;
  }
}

async function endLive() {
  try {
    await api('/api/live/end', { method: 'POST', body: JSON.stringify({}) });
    stopHostStudio();
    await stopParticipantRtc();
    await stopListenerRtc();
    message('vmsg', 'Vivo terminado. AutoDJ retoma la continuidad.', true);
    await refresh();
  } catch (error) { message('vmsg', error.message, false); }
}

async function testLocalMicrophone() {
  let stream;
  try {
    stream = await getMicrophone();
    message('micmsg', 'Microfono detectado y autorizado por el navegador.', true);
  } catch (error) {
    message('micmsg', `No se pudo acceder al microfono: ${error.message}`, false);
  } finally {
    if (stream) stream.getTracks().forEach(track => track.stop());
  }
}

async function requestMicrophone() {
  try {
    const result = await api('/api/microphones/request', { method: 'POST', body: JSON.stringify({}) });
    myMicrophoneRequest = result.request;
    message('participantmsg', 'Solicitud enviada. Espera la aprobacion de prueba o la aprobacion directa al aire.', true);
    updateLiveUi();
  } catch (error) { message('participantmsg', error.message, false); }
}

async function testAuthorizedMicrophone() {
  let stream;
  try {
    stream = await getMicrophone();
    await api('/api/microphones/me/test-result', {
      method: 'POST', body: JSON.stringify({ result: 'ready' })
    });
    message('participantmsg', 'Prueba correcta. El administrador ya puede ver el resultado y aprobar el microfono al aire.', true);
    await refreshMyMicrophone();
  } catch (error) {
    try {
      await api('/api/microphones/me/test-result', { method: 'POST', body: JSON.stringify({ result: 'failed' }) });
    } catch (_) { /* conservar error principal */ }
    message('participantmsg', `La prueba no fue satisfactoria: ${error.message}`, false);
  } finally {
    if (stream) stream.getTracks().forEach(track => track.stop());
  }
}

function createPeer(iceServers) {
  if (typeof RTCPeerConnection === 'undefined') {
    throw new Error('Este navegador no ofrece WebRTC. Usa una version reciente de Chrome, Edge, Firefox o Safari.');
  }
  return new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' });
}

async function sendHostSignal(targetId, signal) {
  await api('/api/rtc/host/signal', {
    method: 'POST', body: JSON.stringify({ targetId, signal })
  });
}
async function sendClientSignal(session, signal) {
  await api('/api/rtc/clients/signal', {
    method: 'POST', body: JSON.stringify({
      connectionId: session.connectionId, token: session.token, signal
    })
  });
}

async function startHostStudio(status, preparedStream = null) {
  if (!status || !status.live) throw new Error('No hay un vivo activo.');
  if (!currentUser || status.host !== currentUser.username) throw new Error('Solo quien inicio el vivo puede activar este estudio.');
  if (hostStudio.active) return;
  const stream = preparedStream || await getMicrophone();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Este navegador no ofrece Web Audio para mezclar la transmision.');
  const context = new AudioContextClass();
  await context.resume();
  const broadcastDestination = context.createMediaStreamDestination();
  const hostDestination = context.createMediaStreamDestination();
  const localSource = context.createMediaStreamSource(stream);
  const localGain = context.createGain();
  localGain.gain.value = 1;
  localSource.connect(localGain);
  localGain.connect(broadcastDestination);
  localGain.connect(hostDestination);

  hostStudio.active = true;
  hostStudio.stream = stream;
  hostStudio.context = context;
  hostStudio.broadcastDestination = broadcastDestination;
  hostStudio.hostDestination = hostDestination;
  hostStudio.localSource = localSource;
  hostStudio.localGain = localGain;
  hostStudio.pollTimer = setInterval(pollHostStudio, 900);
  visible('studioCard', true);
  $('studioState').textContent = 'activo';
  message('studiomsg', 'Estudio activo. Usa audifonos para evitar realimentacion al escuchar invitados.', true);
  await pollHostStudio();
  updateStudioCounters();
}

function cleanupHostPeer(id) {
  const entry = hostStudio.peers.get(id);
  if (!entry) return;
  try { entry.pc.close(); } catch (_) { /* no-op */ }
  try { if (entry.remoteSource) entry.remoteSource.disconnect(); } catch (_) { /* no-op */ }
  try { if (entry.monitorGain) entry.monitorGain.disconnect(); } catch (_) { /* no-op */ }
  hostStudio.peers.delete(id);
  updateStudioCounters();
}

function updateStudioCounters() {
  let listeners = 0;
  let participants = 0;
  for (const entry of hostStudio.peers.values()) {
    if (entry.kind === 'listener') listeners++;
    if (entry.kind === 'participant') participants++;
  }
  $('studioListeners').textContent = String(listeners);
  $('studioParticipants').textContent = String(participants);
  $('studioState').textContent = hostStudio.active ? 'activo' : 'inactivo';
}

async function createHostPeer(join) {
  if (!hostStudio.active || hostStudio.peers.has(join.id)) return;
  const pc = createPeer(hostStudio.iceServers || []);
  const entry = { pc, kind: join.kind, username: join.username, pendingCandidates: [], remoteSource: null, monitorGain: null };
  hostStudio.peers.set(join.id, entry);

  pc.onicecandidate = event => {
    if (event.candidate) sendHostSignal(join.id, { type: 'candidate', payload: event.candidate.toJSON() }).catch(() => {});
  };
  pc.onconnectionstatechange = () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) cleanupHostPeer(join.id);
  };

  if (join.kind === 'listener') {
    for (const track of hostStudio.broadcastDestination.stream.getTracks()) {
      pc.addTransceiver(track, { direction: 'sendonly', streams: [hostStudio.broadcastDestination.stream] });
    }
  } else {
    const hostTrack = hostStudio.hostDestination.stream.getAudioTracks()[0];
    pc.addTransceiver(hostTrack, { direction: 'sendrecv', streams: [hostStudio.hostDestination.stream] });
    pc.ontrack = event => {
      if (!event.streams[0] || entry.remoteSource) return;
      const source = hostStudio.context.createMediaStreamSource(event.streams[0]);
      const monitorGain = hostStudio.context.createGain();
      monitorGain.gain.value = 1;
      source.connect(hostStudio.broadcastDestination);
      source.connect(monitorGain);
      monitorGain.connect(hostStudio.context.destination);
      entry.remoteSource = source;
      entry.monitorGain = monitorGain;
      message('studiomsg', `Microfono de ${join.displayName || join.username} conectado al estudio. Usa audifonos.`, true);
    };
  }

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await sendHostSignal(join.id, { type: 'description', payload: pc.localDescription.toJSON() });
  updateStudioCounters();
}

async function handleHostSignal(signal) {
  const entry = hostStudio.peers.get(signal.from);
  if (!entry) return;
  if (signal.type === 'close') return cleanupHostPeer(signal.from);
  if (signal.type === 'description') {
    await entry.pc.setRemoteDescription(signal.payload);
    for (const candidate of entry.pendingCandidates.splice(0)) await entry.pc.addIceCandidate(candidate).catch(() => {});
  } else if (signal.type === 'candidate' && signal.payload) {
    if (entry.pc.remoteDescription) await entry.pc.addIceCandidate(signal.payload).catch(() => {});
    else entry.pendingCandidates.push(signal.payload);
  }
}

async function pollHostStudio() {
  if (!hostStudio.active || hostStudio.polling) return;
  hostStudio.polling = true;
  try {
    const result = await api('/api/rtc/host/poll');
    hostStudio.iceServers = result.iceServers || hostStudio.iceServers || [];
    for (const join of result.joins || []) await createHostPeer(join);
    for (const signal of result.signals || []) await handleHostSignal(signal);
  } catch (error) {
    if (hostStudio.active) message('studiomsg', `Señalizacion temporalmente interrumpida: ${error.message}`, false);
  } finally {
    hostStudio.polling = false;
  }
}

function stopHostStudio() {
  if (hostStudio.pollTimer) clearInterval(hostStudio.pollTimer);
  for (const id of [...hostStudio.peers.keys()]) cleanupHostPeer(id);
  if (hostStudio.stream) hostStudio.stream.getTracks().forEach(track => track.stop());
  if (hostStudio.context) hostStudio.context.close().catch(() => {});
  hostStudio.active = false;
  hostStudio.stream = null;
  hostStudio.context = null;
  hostStudio.broadcastDestination = null;
  hostStudio.hostDestination = null;
  hostStudio.pollTimer = null;
  hostStudio.polling = false;
  hostStudio.iceServers = [];
  $('studioState').textContent = 'inactivo';
  updateStudioCounters();
  if (!currentLive || !currentLive.live) visible('studioCard', false);
}

function newClientRtc(kind, session, pc, localStream = null) {
  return {
    kind, session, pc, localStream, pollTimer: null, polling: false,
    pendingCandidates: [], connected: false
  };
}

async function pollClientRtc(client) {
  if (!client || client.polling) return;
  client.polling = true;
  try {
    const result = await api('/api/rtc/clients/poll', {
      method: 'POST', body: JSON.stringify({
        connectionId: client.session.connectionId,
        token: client.session.token
      })
    });
    for (const signal of result.signals || []) await handleClientSignal(client, signal);
  } catch (error) {
    if (client.kind === 'listener') message('rtcmsg', `Conexion en vivo interrumpida: ${error.message}`, false);
    else message('participantmsg', `Conexion de microfono interrumpida: ${error.message}`, false);
  } finally {
    client.polling = false;
  }
}

async function handleClientSignal(client, signal) {
  if (signal.type === 'close') {
    if (client.kind === 'listener') await stopListenerRtc();
    else await stopParticipantRtc();
    return;
  }
  if (signal.type === 'description') {
    await client.pc.setRemoteDescription(signal.payload);
    if (client.kind === 'participant') {
      const transceiver = client.pc.getTransceivers().find(item => item.receiver && item.receiver.track && item.receiver.track.kind === 'audio');
      const localTrack = client.localStream.getAudioTracks()[0];
      if (transceiver && localTrack) {
        await transceiver.sender.replaceTrack(localTrack);
        transceiver.direction = 'sendrecv';
      }
    }
    const answer = await client.pc.createAnswer();
    await client.pc.setLocalDescription(answer);
    await sendClientSignal(client.session, { type: 'description', payload: client.pc.localDescription.toJSON() });
    for (const candidate of client.pendingCandidates.splice(0)) await client.pc.addIceCandidate(candidate).catch(() => {});
  } else if (signal.type === 'candidate' && signal.payload) {
    if (client.pc.remoteDescription) await client.pc.addIceCandidate(signal.payload).catch(() => {});
    else client.pendingCandidates.push(signal.payload);
  }
}

async function startListenerRtc() {
  try {
    await stopListenerRtc();
    message('rtcmsg', 'Conectando con el estudio...', true);
    const result = await api('/api/rtc/listeners/join', { method: 'POST', body: JSON.stringify({}) });
    const pc = createPeer(result.session.iceServers);
    const client = newClientRtc('listener', result.session, pc);
    listenerRtc = client;
    pc.onicecandidate = event => {
      if (event.candidate) sendClientSignal(client.session, { type: 'candidate', payload: event.candidate.toJSON() }).catch(() => {});
    };
    pc.ontrack = async event => {
      const stream = event.streams[0];
      const hasVideo = stream && stream.getVideoTracks().length > 0;
      const element = hasVideo ? $('liveVideo') : $('liveAudio');
      element.srcObject = stream;
      visible('liveVideo', hasVideo);
      visible('liveAudio', !hasVideo);
      try { await element.play(); }
      catch (_) { message('rtcmsg', 'La señal llegó. Pulsa reproducir en el control del navegador para activar el audio.', true); }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        client.connected = true;
        message('rtcmsg', result.session.turnConfigured
          ? 'Conectado al vivo mediante WebRTC.'
          : 'Conectado al vivo mediante WebRTC. No hay TURN configurado; algunas redes moviles restrictivas pueden fallar.', true);
      }
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && listenerRtc === client) {
        message('rtcmsg', 'La conexion WebRTC se cerro. Puedes intentar reconectar.', false);
      }
    };
    client.pollTimer = setInterval(() => pollClientRtc(client), result.session.pollMs || 900);
    visible('btnListenLive', false);
    visible('btnStopListen', true);
    await pollClientRtc(client);
  } catch (error) {
    message('rtcmsg', error.message, false);
    await stopListenerRtc(false);
  }
}

async function stopListenerRtc(notify = true) {
  const client = listenerRtc;
  listenerRtc = null;
  if (!client) {
    visible('btnListenLive', Boolean(currentLive && currentLive.live));
    visible('btnStopListen', false);
    return;
  }
  if (client.pollTimer) clearInterval(client.pollTimer);
  try { client.pc.close(); } catch (_) { /* no-op */ }
  $('liveAudio').pause(); $('liveVideo').pause();
  $('liveAudio').srcObject = null; $('liveVideo').srcObject = null;
  visible('liveAudio', false); visible('liveVideo', false);
  visible('btnListenLive', Boolean(currentLive && currentLive.live));
  visible('btnStopListen', false);
  if (notify) {
    api('/api/rtc/clients/leave', {
      method: 'POST', keepalive: true, body: JSON.stringify({
        connectionId: client.session.connectionId, token: client.session.token
      })
    }).catch(() => {});
  }
}

async function startParticipantRtc() {
  let stream;
  try {
    await stopParticipantRtc();
    message('participantmsg', 'Solicitando el microfono y conectando con el estudio...', true);
    stream = await getMicrophone();
    const result = await api('/api/rtc/participants/join', { method: 'POST', body: JSON.stringify({}) });
    const pc = createPeer(result.session.iceServers);
    const client = newClientRtc('participant', result.session, pc, stream);
    participantRtc = client;
    pc.onicecandidate = event => {
      if (event.candidate) sendClientSignal(client.session, { type: 'candidate', payload: event.candidate.toJSON() }).catch(() => {});
    };
    pc.ontrack = async event => {
      const stream = event.streams[0];
      const hasVideo = stream && stream.getVideoTracks().length > 0;
      const element = hasVideo ? $('participantVideo') : $('participantAudio');
      element.srcObject = stream;
      visible('participantVideo', hasVideo);
      visible('participantAudio', !hasVideo);
      try { await element.play(); }
      catch (_) { message('participantmsg', 'La señal del conductor está disponible. Pulsa reproducir para activar el audio.', true); }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        client.connected = true;
        message('participantmsg', 'Microfono conectado al vivo. El conductor puede escucharte y tu recibes su voz.', true);
      }
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && participantRtc === client) {
        message('participantmsg', 'La conexion de microfono se cerro. Solicita ayuda al administrador o reconecta.', false);
      }
    };
    client.pollTimer = setInterval(() => pollClientRtc(client), result.session.pollMs || 900);
    visible('btnJoinMic', false);
    visible('btnLeaveMic', true);
    await pollClientRtc(client);
  } catch (error) {
    if (stream) stream.getTracks().forEach(track => track.stop());
    message('participantmsg', error.message, false);
    await stopParticipantRtc(false);
  }
}

async function stopParticipantRtc(notify = true) {
  const client = participantRtc;
  participantRtc = null;
  if (!client) {
    updateLiveUi();
    return;
  }
  if (client.pollTimer) clearInterval(client.pollTimer);
  try { client.pc.close(); } catch (_) { /* no-op */ }
  if (client.localStream) client.localStream.getTracks().forEach(track => track.stop());
  $('participantAudio').pause(); $('participantVideo').pause();
  $('participantAudio').srcObject = null; $('participantVideo').srcObject = null;
  visible('participantAudio', false); visible('participantVideo', false);
  if (notify) {
    api('/api/rtc/clients/leave', {
      method: 'POST', keepalive: true, body: JSON.stringify({
        connectionId: client.session.connectionId, token: client.session.token
      })
    }).catch(() => {});
  }
  updateLiveUi();
}

async function loadDiagnostics() {
  try {
    const health = await api('/api/health');
    const live = await api('/api/live/status');
    $('diag').textContent = JSON.stringify({
      health,
      live,
      browser: {
        secureContext: window.isSecureContext,
        mediaDevices: Boolean(navigator.mediaDevices),
        peerConnection: typeof RTCPeerConnection !== 'undefined',
        userAgent: navigator.userAgent
      }
    }, null, 2);
  } catch (error) { $('diag').textContent = error.message; }
}

async function refreshMyMicrophone() {
  if (!roleIs('periodista', 'invitado')) {
    myMicrophoneRequest = null;
    return;
  }
  try {
    const result = await api('/api/microphones/me');
    myMicrophoneRequest = result.request;
  } catch (_) { myMicrophoneRequest = null; }
}

function updateLiveUi() {
  const status = currentLive;
  if (!status) return;
  $('punto').classList.toggle('live', status.live);
  $('estadoTxt').textContent = status.live ? 'EN VIVO' : 'AutoDJ';
  $('ondas').classList.toggle('quieto', !status.live);
  $('fuente').textContent = status.live ? 'En vivo' : `AutoDJ - ${status.autodj.playlist}`;
  $('titulo').textContent = status.title;
  $('detalle').textContent = `${status.host ? `Conduce: ${status.host} · ` : ''}Oyentes WAV: ${status.listeners} · Modo: ${status.mode}`;
  $('ptitulo').textContent = status.title;
  $('poyentes').textContent = status.listeners;

  const broadcaster = roleIs('desarrollador', 'administrador', 'locutor');
  const isHost = Boolean(currentUser && status.live && status.host === currentUser.username);
  if (broadcaster) {
    visible('btnVivo', !status.live);
    visible('btnFinVivo', status.live);
    visible('btnStudio', status.live && isHost && !hostStudio.active);
    visible('studioCard', status.live && isHost);
    $('vt').disabled = status.live;
  }
  if (hostStudio.active && (!status.live || !isHost)) stopHostStudio();

  visible('autoPlayer', !status.live);
  visible('rtcPlayer', status.live);
  visible('btnListenLive', status.live && !listenerRtc);
  visible('btnStopListen', status.live && Boolean(listenerRtc));
  if (!status.live && listenerRtc) stopListenerRtc();

  if (roleIs('periodista', 'invitado')) {
    visible('participantCard', true);
    const request = myMicrophoneRequest;
    visible('btnRequestMic', status.live && !request);
    visible('btnTestMic', status.live && Boolean(request) && ['test_approved', 'live_approved'].includes(request.state));
    visible('btnJoinMic', status.live && Boolean(request) && request.state === 'live_approved' && !participantRtc);
    visible('btnLeaveMic', status.live && Boolean(participantRtc));
    if (!status.live && participantRtc) stopParticipantRtc();
    if (!status.live) message('participantmsg', 'El microfono solo puede solicitarse durante una transmision en vivo.', false);
    else if (request && !participantRtc) message('participantmsg', `Estado: ${microphoneStateLabel(request.state)}. Prueba: ${testStateLabel(request.testStatus)}.`, true);
  }
}

async function refresh() {
  try {
    const previousBroadcast = currentLive && currentLive.broadcastId;
    const status = await api('/api/live/status');
    currentLive = status;
    if (currentUser) await refreshMyMicrophone();
    if (previousBroadcast && previousBroadcast !== status.broadcastId) {
      stopHostStudio();
      await stopParticipantRtc();
      await stopListenerRtc();
    }
    updateLiveUi();
    if (roleIs('desarrollador', 'administrador') && Date.now() - adminRefreshAt > 5000) loadAdminData();
  } catch (_) { /* reintenta en el siguiente intervalo */ }
}

window.addEventListener('beforeunload', () => {
  if (listenerRtc) {
    navigator.sendBeacon('/api/rtc/clients/leave', new Blob([JSON.stringify({
      connectionId: listenerRtc.session.connectionId, token: listenerRtc.session.token
    })], { type: 'application/json' }));
  }
  if (participantRtc) {
    navigator.sendBeacon('/api/rtc/clients/leave', new Blob([JSON.stringify({
      connectionId: participantRtc.session.connectionId, token: participantRtc.session.token
    })], { type: 'application/json' }));
  }
});
window.addEventListener('popstate', () => {
  if (currentUser) show(sectionFromLocation(), { fromHistory: true });
});

setInterval(refresh, 4000);
refresh();
loadDiagnostics();
(async () => {
  try {
    const result = await api('/api/me');
    currentUser = result.user;
    enter();
  } catch (_) { /* no hay sesion */ }
})();
