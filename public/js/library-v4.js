// Biblioteca visual RayoBoss 4.0.1: catálogo, metadatos, licencias y carga masiva.
(() => {
  const state = { items: [], config: null, orphans: [], queue: [], editor: null, replaceTarget: null, loading: null };
  const MEDIA_EXTENSIONS = new Set(['mp3', 'wav', 'aac', 'm4a', 'ogg', 'oga', 'flac', 'opus', 'mp4', 'm4v', 'webm', 'mov']);
  const VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'webm', 'mov']);

  function element(tag, className = '', text = '') {
    const output = document.createElement(tag);
    if (className) output.className = className;
    if (text !== '') output.textContent = text;
    return output;
  }
  function button(label, className, handler) {
    const output = element('button', className, label);
    output.type = 'button';
    output.addEventListener('click', handler);
    return output;
  }
  function extension(name) { return String(name || '').split('.').pop().toLowerCase(); }
  function cleanFileTitle(name) {
    return String(name || 'Sin título').replace(/^[a-f0-9]{16,}-/i, '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function inferredContentType(fileOrName, supplied = '') {
    if (/^(audio|video)\//.test(supplied)) return supplied;
    const ext = extension(typeof fileOrName === 'string' ? fileOrName : fileOrName?.name);
    const types = { mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac', m4a: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg', flac: 'audio/flac', opus: 'audio/ogg', mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
    return types[ext] || '';
  }
  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}` : `${minutes}:${String(rest).padStart(2, '0')}`;
  }
  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GB`;
    if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }
  function categoryLabel(category) { return state.config?.categories?.[category]?.label || category; }
  function licenseLabel(type) { return state.config?.licenseTypes?.[type] || type || 'Pendiente'; }
  function setSelectOptions(select, values, firstOption = null) {
    const selected = select.value;
    select.replaceChildren();
    if (firstOption) {
      const option = element('option', '', firstOption.label);
      option.value = firstOption.value;
      select.append(option);
    }
    for (const [value, info] of Object.entries(values || {})) {
      const option = element('option', '', typeof info === 'string' ? info : info.label);
      option.value = value;
      select.append(option);
    }
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
  }
  function defaultLicense(category) {
    if (category === 'autodj.sayco') return 'sayco-acinpro';
    if (category === 'autodj.produccion') return 'produccion-propia';
    if (category === 'autodj.libre') return 'licencia-libre';
    return 'pendiente';
  }
  function updateCategoryUi() {
    const category = $('mediaCategory').value;
    const production = category === 'autodj.produccion';
    $('mediaSubtype').disabled = !production;
    if (!production) $('mediaSubtype').value = '';
    if (!$('licenseType').dataset.userChanged) $('licenseType').value = defaultLicense(category);
    updateValidationSummary();
  }
  function updateValidationSummary() {
    const ready = state.queue.filter(entry => ['ready', 'uploading', 'done'].includes(entry.status));
    if (!state.queue.length) return visible('mediaValidation', false);
    const errors = state.queue.filter(entry => entry.status === 'error').length;
    const mediaType = state.config?.categories?.[$('mediaCategory').value]?.mediaType;
    const technical = !ready.length ? 'Ningún archivo superó todavía la comprobación técnica.'
      : ready.every(entry => entry.kind === 'audio')
        ? (mediaType === 'music' ? 'Audio válido y clasificado editorialmente como música.' : 'Audio válido; el destino seleccionado no lo clasifica como música de AutoDJ.')
        : ready.every(entry => entry.kind === 'video') ? 'Video válido con pista multimedia reconocida.' : 'Lote mixto de audio y video reconocido.';
    const validation = $('mediaValidation');
    visible('mediaValidation', true);
    validation.className = `file-validation ${errors ? 'has-error' : 'is-valid'}`;
    validation.textContent = errors
      ? `${ready.length} archivos listos y ${errors} con errores. ${technical}`
      : `${ready.length} ${ready.length === 1 ? 'archivo validado' : 'archivos validados'}. ${technical}`;
  }
  async function probeMedia(source, contentType = '') {
    const name = source?.name || String(source || '');
    const ext = extension(name);
    if (!MEDIA_EXTENSIONS.has(ext)) throw new Error('Formato no admitido.');
    const type = inferredContentType(name, contentType || source?.type || '');
    const kind = type.startsWith('video/') || VIDEO_EXTENSIONS.has(ext) ? 'video' : 'audio';
    const mediaElement = document.createElement(kind);
    mediaElement.preload = 'metadata';
    mediaElement.muted = true;
    const objectUrl = source instanceof File ? URL.createObjectURL(source) : String(source);
    return new Promise((resolve, reject) => {
      const finish = callback => {
        mediaElement.removeAttribute('src');
        mediaElement.load();
        if (source instanceof File) URL.revokeObjectURL(objectUrl);
        callback();
      };
      const timer = setTimeout(() => finish(() => reject(new Error('No fue posible leer la duración.'))), 15_000);
      mediaElement.onloadedmetadata = () => {
        clearTimeout(timer);
        const duration = Number(mediaElement.duration);
        finish(() => Number.isFinite(duration) && duration > 0
          ? resolve({ durationSeconds: duration, kind, contentType: type })
          : reject(new Error('El archivo no informa una duración válida.')));
      };
      mediaElement.onerror = () => {
        clearTimeout(timer);
        finish(() => reject(new Error('El navegador no pudo reconocer este archivo como audio o video.')));
      };
      mediaElement.src = objectUrl;
    });
  }
  function synchsafe(bytes) { return ((bytes[0] & 0x7f) << 21) | ((bytes[1] & 0x7f) << 14) | ((bytes[2] & 0x7f) << 7) | (bytes[3] & 0x7f); }
  function decodeId3Text(bytes) {
    if (!bytes.length) return '';
    const encoding = bytes[0];
    const content = bytes.slice(1);
    try {
      if (encoding === 1 || encoding === 2) return new TextDecoder(encoding === 2 ? 'utf-16be' : 'utf-16').decode(content).replace(/\0/g, '').trim();
      return new TextDecoder(encoding === 3 ? 'utf-8' : 'iso-8859-1').decode(content).replace(/\0/g, '').trim();
    } catch (_) { return ''; }
  }
  async function readId3(file) {
    if (extension(file.name) !== 'mp3') return {};
    const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 512 * 1024)).arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 3)) !== 'ID3' || bytes.length < 10) return {};
    const version = bytes[3];
    const limit = Math.min(bytes.length, 10 + synchsafe(bytes.slice(6, 10)));
    const map = { TIT2: 'title', TPE1: 'artist', TALB: 'album', TCON: 'genre', TYER: 'year', TDRC: 'year', TCOM: 'composer', TPUB: 'recordLabel', TSRC: 'isrc' };
    const result = {};
    let offset = 10;
    while (offset + 10 <= limit) {
      const frame = String.fromCharCode(...bytes.slice(offset, offset + 4));
      if (!/^[A-Z0-9]{4}$/.test(frame)) break;
      const sizeBytes = bytes.slice(offset + 4, offset + 8);
      const size = version === 4 ? synchsafe(sizeBytes) : new DataView(sizeBytes.buffer, sizeBytes.byteOffset, 4).getUint32(0);
      if (!size || offset + 10 + size > limit) break;
      if (map[frame]) result[map[frame]] = decodeId3Text(bytes.slice(offset + 10, offset + 10 + size));
      offset += 10 + size;
    }
    return result;
  }
  async function mapLimit(values, limit, worker) {
    const output = new Array(values.length);
    let next = 0;
    async function run() {
      while (next < values.length) {
        const index = next++;
        output[index] = await worker(values[index], index);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, values.length) }, run));
    return output;
  }
  async function prepareFiles(fileList) {
    const files = [...fileList].slice(0, 200);
    state.queue = files.map(file => ({ file, status: 'probing', progress: 0 }));
    renderQueue();
    await mapLimit(state.queue, 4, async entry => {
      try {
        const [probe, tags] = await Promise.all([probeMedia(entry.file), readId3(entry.file)]);
        Object.assign(entry, probe, { tags, status: 'ready' });
      } catch (error) { entry.status = 'error'; entry.error = error.message; }
      renderQueue();
    });
    const ready = state.queue.filter(entry => entry.status === 'ready');
    if (ready.length === 1) {
      const entry = ready[0];
      $('mediaTitle').value = entry.tags.title || cleanFileTitle(entry.file.name);
      $('mediaArtist').value = entry.tags.artist || '';
      $('mediaAlbum').value = entry.tags.album || '';
      $('mediaGenre').value = entry.tags.genre || '';
      $('mediaYear').value = String(entry.tags.year || '').slice(0, 4);
      $('mediaIsrc').value = entry.tags.isrc || '';
      $('mediaComposer').value = entry.tags.composer || '';
      $('mediaLabel').value = entry.tags.recordLabel || '';
      $('mediaDuration').value = formatDuration(entry.durationSeconds);
      $('mediaMetadataDetails').open = true;
    } else {
      $('mediaDuration').value = '';
      $('mediaMetadataDetails').open = false;
    }
    updateValidationSummary();
  }
  function renderQueue() {
    const container = $('uploadQueue');
    container.replaceChildren();
    if (!state.queue.length) return;
    const summary = element('div', 'queue-summary');
    summary.append(element('b', '', `${state.queue.length} archivo${state.queue.length === 1 ? '' : 's'}`), element('span', '', 'La cola continúa aunque una pieza falle.'));
    container.append(summary);
    const list = element('div', 'queue-list');
    for (const entry of state.queue.slice(0, 200)) {
      const row = element('div', `queue-item ${entry.status}`);
      const detail = element('div');
      detail.append(element('b', '', entry.file.name));
      const statusText = entry.status === 'ready' ? `${entry.kind === 'audio' ? 'Audio' : 'Video'} · ${formatDuration(entry.durationSeconds)} · ${formatBytes(entry.file.size)}`
        : entry.status === 'uploading' ? `Cargando ${Math.round(entry.progress || 0)}%`
          : entry.status === 'done' ? 'Incorporado al catálogo'
            : entry.status === 'error' ? entry.error : 'Analizando archivo…';
      detail.append(element('span', '', statusText));
      row.append(detail);
      if (!['uploading', 'done'].includes(entry.status)) row.append(button('Quitar', 'mini-btn', () => {
        state.queue = state.queue.filter(item => item !== entry);
        renderQueue(); updateValidationSummary();
      }));
      list.append(row);
    }
    container.append(list);
  }
  function commonMetadata(entry) {
    const single = state.queue.filter(item => item.status === 'ready').length === 1;
    const tags = entry.tags || {};
    return {
      title: single ? ($('mediaTitle').value || tags.title || cleanFileTitle(entry.file.name)) : (tags.title || cleanFileTitle(entry.file.name)),
      artist: single ? $('mediaArtist').value : (tags.artist || ''),
      album: single ? $('mediaAlbum').value : (tags.album || ''),
      genre: single ? $('mediaGenre').value : (tags.genre || ''),
      year: single ? $('mediaYear').value : String(tags.year || '').slice(0, 4),
      isrc: single ? $('mediaIsrc').value : (tags.isrc || ''),
      composer: single ? $('mediaComposer').value : (tags.composer || ''),
      recordLabel: single ? $('mediaLabel').value : (tags.recordLabel || ''),
      category: $('mediaCategory').value,
      subtype: $('mediaSubtype').value,
      durationSeconds: entry.durationSeconds,
      contentType: entry.contentType,
      licenseType: $('licenseType').value,
      rightsBasis: $('rightsBasis').value,
      rightsReference: $('rightsReference').value,
      rightsConfirmed: $('rightsConfirmed').checked
    };
  }
  async function directUpload(file, metadata, progress, assetType = 'media') {
    if (typeof window.rayoBlobUpload !== 'function') throw new Error('El cliente de Vercel Blob no está compilado. Ejecuta npm run build.');
    return window.rayoBlobUpload(file, metadata, progress, assetType);
  }
  async function uploadOne(entry, metadata, licenseFile = null, replaceItemId = '') {
    entry.status = 'uploading'; entry.progress = 0; renderQueue();
    if (state.config.uploadMode === 'direct') {
      const uploaded = await directUpload(entry.file, metadata, event => { entry.progress = event.percentage || 0; renderQueue(); });
      let licenseUploaded = null;
      if (licenseFile) licenseUploaded = await directUpload(licenseFile, {}, () => {}, 'license');
      const result = await api('/api/media/confirm-upload', {
        method: 'POST',
        body: JSON.stringify({
          storageKey: uploaded.pathname,
          originalName: entry.file.name,
          sizeBytes: entry.file.size,
          metadata,
          replaceItemId,
          licenseStorageKey: licenseUploaded?.pathname || '',
          licenseOriginalName: licenseFile?.name || '',
          licenseContentType: licenseFile?.type || '',
          licenseSizeBytes: licenseFile?.size || 0
        })
      });
      entry.status = 'done'; entry.progress = 100; renderQueue();
      return result.item;
    }
    if (state.config.uploadMode === 'server') {
      const form = new FormData();
      form.append('file', entry.file);
      if (licenseFile) form.append('licenseFile', licenseFile);
      form.append('metadata', JSON.stringify(metadata));
      if (replaceItemId) form.append('replaceItemId', replaceItemId);
      const response = await fetch('/api/media/local-upload', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'No fue posible incorporar el archivo.');
      entry.status = 'done'; entry.progress = 100; renderQueue();
      return body.item;
    }
    throw new Error(state.config.reason || 'El almacenamiento activo no permite cargas.');
  }
  async function uploadSelected() {
    const ready = state.queue.filter(entry => entry.status === 'ready' || entry.status === 'error');
    const valid = ready.filter(entry => entry.status === 'ready');
    const licenseFile = $('licenseFile').files[0] || null;
    if (!valid.length) return message('mediamsg', 'Selecciona al menos un archivo válido.', false);
    if (valid.length > 200) return message('mediamsg', 'La carga masiva admite hasta 200 piezas por lote.', false);
    if (licenseFile && valid.length > 1) return message('mediamsg', 'El soporte de licencia se adjunta a una pieza individual. Para un lote, incorpora primero las canciones y adjunta el soporte desde cada ficha.', false);
    if (!state.config?.writable) return message('mediamsg', state.config?.reason || 'La biblioteca está en modo de solo lectura.', false);
    $('btnUploadMedia').disabled = true;
    visible('uploadProgress', true);
    const failures = [];
    let completed = 0;
    await mapLimit(valid, 3, async entry => {
      try { await uploadOne(entry, commonMetadata(entry), licenseFile); }
      catch (error) { entry.status = 'error'; entry.error = error.message; failures.push(`${entry.file.name}: ${error.message}`); renderQueue(); }
      completed++;
      $('uploadProgress').value = completed / valid.length * 100;
    });
    $('btnUploadMedia').disabled = false;
    if (failures.length) message('mediamsg', `${valid.length - failures.length} piezas incorporadas y ${failures.length} pendientes.\n${failures.slice(0, 5).join('\n')}`, false);
    else message('mediamsg', `${valid.length} ${valid.length === 1 ? 'pieza incorporada' : 'piezas incorporadas'} y confirmadas en el catálogo. Ya están disponibles en Programación.`, true);
    await load(true);
    if (!failures.length) resetUploadForm();
    setTimeout(() => visible('uploadProgress', false), 1000);
  }
  function resetUploadForm() {
    state.queue = [];
    $('mediaFile').value = '';
    $('licenseFile').value = '';
    for (const id of ['mediaTitle', 'mediaArtist', 'mediaAlbum', 'mediaGenre', 'mediaYear', 'mediaIsrc', 'mediaComposer', 'mediaLabel', 'mediaDuration']) $(id).value = '';
    visible('mediaValidation', false);
    renderQueue();
  }
  function renderStats() {
    $('mediaCount').textContent = String(state.items.length);
    $('mediaMusicCount').textContent = String(state.items.filter(item => item.mediaType === 'music').length);
    $('mediaLicenseCount').textContent = String(state.items.filter(item => item.rights?.document).length);
    const seconds = state.items.reduce((sum, item) => sum + (Number(item.durationSeconds) || 0), 0);
    $('mediaDurationTotal').textContent = seconds >= 3600 ? `${(seconds / 3600).toFixed(1)} h` : `${Math.round(seconds / 60)} min`;
  }
  function matchesFilters(item) {
    const query = $('mediaSearch').value.trim().toLocaleLowerCase('es');
    const haystack = [item.title, item.artist, item.album, item.isrc, item.genre].join(' ').toLocaleLowerCase('es');
    if (query && !haystack.includes(query)) return false;
    if ($('mediaCategoryFilter').value && item.category !== $('mediaCategoryFilter').value) return false;
    const status = $('mediaStatusFilter').value;
    if (status === 'active' && !item.active) return false;
    if (status === 'inactive' && item.active) return false;
    if (status === 'license-missing' && item.rights?.document) return false;
    return true;
  }
  function mediaCard(item) {
    const card = element('article', `media-card${item.active ? '' : ' inactive'}`);
    const preview = element('div', 'media-preview');
    const type = element('span', 'media-kind', item.kind === 'video' ? 'VIDEO' : 'AUDIO');
    const player = document.createElement(item.kind === 'video' ? 'video' : 'audio');
    player.controls = true; player.preload = 'metadata'; player.src = item.url;
    if (item.kind === 'video') player.playsInline = true;
    preview.append(type, player);
    const body = element('div', 'media-card-body');
    const chips = element('div', 'media-chips');
    chips.append(element('span', 'chip', categoryLabel(item.category)), element('span', `chip ${item.active ? 'active' : 'inactive'}`, item.active ? 'Activa' : 'Inactiva'));
    body.append(chips, element('h3', '', item.title), element('p', 'media-artist', item.artist || 'Artista sin registrar'));
    const facts = element('dl', 'media-facts');
    for (const [label, value] of [['Duración', formatDuration(item.durationSeconds)], ['Álbum', item.album || '—'], ['ISRC', item.isrc || '—'], ['Licencia', licenseLabel(item.rights?.licenseType)]]) {
      facts.append(element('dt', '', label), element('dd', '', value));
    }
    body.append(facts);
    const rights = element('div', `license-state ${item.rights?.document ? 'attached' : 'missing'}`);
    rights.append(element('b', '', item.rights?.document ? 'Soporte de licencia adjunto' : 'Sin archivo de soporte'));
    if (item.rights?.basis) rights.append(element('span', '', item.rights.basis));
    if (item.rights?.document?.url) {
      const link = element('a', '', 'Ver o descargar soporte');
      link.href = item.rights.document.url; link.target = '_blank'; link.rel = 'noopener';
      rights.append(link);
    }
    body.append(rights);
    if (roleIs('desarrollador', 'administrador')) {
      const actions = element('div', 'media-actions');
      actions.append(button('Editar ficha', 'mini-btn', () => openEditor(item)));
      if (!item.bundled) actions.append(button('Reemplazar archivo', 'mini-btn', () => chooseReplacement(item)));
      actions.append(button(item.active ? 'Desactivar' : 'Activar', 'mini-btn', () => toggleItem(item)));
      if (!item.bundled) actions.append(button('Eliminar', 'mini-btn danger', () => deleteItem(item)));
      body.append(actions);
    }
    card.append(preview, body);
    return card;
  }
  function renderCatalog() {
    renderStats();
    const grid = $('mediaGrid'); grid.replaceChildren();
    const filtered = state.items.filter(matchesFilters);
    if (!filtered.length) grid.append(element('p', 'empty-state', 'No hay piezas que coincidan con estos filtros.'));
    else for (const item of filtered) grid.append(mediaCard(item));
  }
  function inferredCategory(key) {
    const match = String(key).match(/^rayoboss\/(autodj|live)\/([^/]+)\//);
    return match ? `${match[1]}.${match[2]}` : 'autodj.libre';
  }
  function renderOrphans() {
    visible('orphanCard', state.orphans.length > 0);
    const list = $('orphanList'); list.replaceChildren();
    for (const orphan of state.orphans) {
      const row = element('div', 'orphan-item');
      const detail = element('div');
      detail.append(element('b', '', cleanFileTitle(orphan.originalName)), element('span', '', `${formatBytes(orphan.size)} · ${orphan.key}`));
      row.append(detail, button('Completar ficha', 'btn linea', () => openOrphanEditor(orphan)));
      list.append(row);
    }
  }
  function editorValues(item) {
    const rights = item.rights || {};
    const values = {
      editTitle: item.title || '', editArtist: item.artist || '', editAlbum: item.album || '', editGenre: item.genre || '',
      editYear: item.year || '', editIsrc: item.isrc || '', editComposer: item.composer || '', editLabel: item.recordLabel || '',
      editCategory: item.category || 'autodj.libre', editSubtype: item.subtype || '', editLicenseType: rights.licenseType || defaultLicense(item.category),
      editRightsBasis: rights.basis || '', editRightsReference: rights.reference || '', editNotes: item.notes || ''
    };
    for (const [id, value] of Object.entries(values)) $(id).value = value;
    $('editRightsConfirmed').checked = Boolean(rights.confirmed);
    $('editLicenseFile').value = '';
  }
  function editorMetadata() {
    return {
      title: $('editTitle').value, artist: $('editArtist').value, album: $('editAlbum').value, genre: $('editGenre').value,
      year: $('editYear').value, isrc: $('editIsrc').value, composer: $('editComposer').value, recordLabel: $('editLabel').value,
      category: $('editCategory').value, subtype: $('editSubtype').value, licenseType: $('editLicenseType').value,
      rightsBasis: $('editRightsBasis').value, rightsReference: $('editRightsReference').value, rightsConfirmed: $('editRightsConfirmed').checked,
      notes: $('editNotes').value, durationSeconds: state.editor.durationSeconds, contentType: state.editor.contentType
    };
  }
  function openEditor(item) {
    state.editor = { mode: 'edit', item, durationSeconds: item.durationSeconds, contentType: item.contentType };
    $('editModeLabel').textContent = 'Ficha multimedia'; $('editHeading').textContent = 'Editar pieza';
    editorValues(item); clearMessage('editMediaMsg'); $('mediaEditor').showModal();
  }
  async function openOrphanEditor(orphan) {
    try {
      message('mediamsg', 'Leyendo el archivo encontrado para completar su ficha…', true);
      const probe = await probeMedia(orphan.url, inferredContentType(orphan.originalName));
      const category = inferredCategory(orphan.key);
      const draft = { title: cleanFileTitle(orphan.originalName), category, contentType: probe.contentType, durationSeconds: probe.durationSeconds, rights: { licenseType: defaultLicense(category) } };
      state.editor = { mode: 'orphan', orphan, durationSeconds: probe.durationSeconds, contentType: probe.contentType };
      $('editModeLabel').textContent = 'Archivo encontrado en el almacenamiento'; $('editHeading').textContent = 'Completar ficha para Programación';
      editorValues(draft); clearMessage('editMediaMsg'); $('mediaEditor').showModal();
    } catch (error) { message('mediamsg', `No fue posible incorporar el archivo: ${error.message}`, false); }
  }
  async function attachLicense(item, licenseFile, metadata) {
    if (!licenseFile) return item;
    if (state.config.uploadMode === 'direct') {
      const uploaded = await directUpload(licenseFile, {}, () => {}, 'license');
      const result = await api(`/api/media/${encodeURIComponent(item.id)}/license`, {
        method: 'POST', body: JSON.stringify({
          storageKey: uploaded.pathname, originalName: licenseFile.name, contentType: licenseFile.type, sizeBytes: licenseFile.size,
          licenseType: metadata.licenseType, rightsBasis: metadata.rightsBasis, rightsReference: metadata.rightsReference, rightsConfirmed: metadata.rightsConfirmed
        })
      });
      return result.item;
    }
    const form = new FormData(); form.append('licenseFile', licenseFile); form.append('metadata', JSON.stringify(metadata));
    const response = await fetch(`/api/media/${encodeURIComponent(item.id)}/license-upload`, { method: 'POST', body: form });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'No fue posible adjuntar el soporte de licencia.');
    return body.item;
  }
  async function saveEditor() {
    const metadata = editorMetadata();
    const licenseFile = $('editLicenseFile').files[0] || null;
    $('btnSaveMediaEditor').disabled = true;
    try {
      let item;
      if (state.editor.mode === 'edit') {
        const result = await api(`/api/media/${encodeURIComponent(state.editor.item.id)}`, { method: 'PATCH', body: JSON.stringify(metadata) });
        item = result.item;
      } else {
        const orphan = state.editor.orphan;
        const result = await api('/api/media/import-stored', {
          method: 'POST', body: JSON.stringify({ storageKey: orphan.key, originalName: orphan.originalName, sizeBytes: orphan.size, metadata })
        });
        item = result.item;
      }
      if (licenseFile) item = await attachLicense(item, licenseFile, metadata);
      $('mediaEditor').close();
      message('mediamsg', state.editor.mode === 'orphan' ? 'Archivo incorporado al catálogo y disponible en Programación.' : 'Ficha multimedia actualizada.', true);
      await load(true);
    } catch (error) { message('editMediaMsg', error.message, false); }
    finally { $('btnSaveMediaEditor').disabled = false; }
  }
  function chooseReplacement(item) {
    state.replaceTarget = item;
    $('replaceMediaFile').value = '';
    $('replaceMediaFile').click();
  }
  async function replaceSelected() {
    const file = $('replaceMediaFile').files[0];
    const item = state.replaceTarget;
    if (!file || !item) return;
    try {
      const probe = await probeMedia(file);
      const tags = await readId3(file);
      const entry = { file, ...probe, tags, status: 'ready', progress: 0 };
      const metadata = {
        ...item,
        title: item.title || tags.title || cleanFileTitle(file.name),
        artist: item.artist || tags.artist || '', album: item.album || tags.album || '', genre: item.genre || tags.genre || '',
        year: item.year || tags.year || '', isrc: item.isrc || tags.isrc || '', composer: item.composer || tags.composer || '',
        recordLabel: item.recordLabel || tags.recordLabel || '', durationSeconds: probe.durationSeconds, contentType: probe.contentType,
        licenseType: item.rights?.licenseType, rightsBasis: item.rights?.basis, rightsReference: item.rights?.reference, rightsConfirmed: item.rights?.confirmed
      };
      if (!confirm(`¿Reemplazar el archivo de “${item.title}” por “${file.name}”? La pieza conservará su lugar en las playlists.`)) return;
      state.queue = [entry]; renderQueue();
      await uploadOne(entry, metadata, null, item.id);
      message('mediamsg', 'Archivo reemplazado. La ficha y las referencias de Programación se conservaron.', true);
      state.queue = []; renderQueue(); await load(true);
    } catch (error) { message('mediamsg', error.message, false); }
  }
  async function toggleItem(item) {
    try { await api(`/api/media/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ active: !item.active }) }); await load(true); }
    catch (error) { message('mediamsg', error.message, false); }
  }
  async function deleteItem(item) {
    if (!confirm(`¿Eliminar definitivamente “${item.title}”, su archivo y el soporte de licencia adjunto?`)) return;
    try { await api(`/api/media/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); message('mediamsg', 'Pieza eliminada de la biblioteca y del almacenamiento.', true); await load(true); }
    catch (error) { message('mediamsg', error.message, false); }
  }
  async function load(force = false) {
    if (state.loading && !force) return state.loading;
    state.loading = (async () => {
      const admin = roleIs('desarrollador', 'administrador');
      const requests = [api('/api/media')];
      if (admin) requests.push(api('/api/media/config'), api('/api/media/orphans').catch(() => ({ items: [] })));
      const [catalog, config, orphans] = await Promise.all(requests);
      state.items = catalog.items || [];
      state.config = config || state.config || { categories: catalog.categories || {}, licenseTypes: catalog.licenseTypes || {}, provider: 'lectura', writable: false, uploadMode: 'none' };
      state.orphans = orphans?.items || [];
      setSelectOptions($('mediaCategory'), state.config.categories);
      setSelectOptions($('editCategory'), state.config.categories);
      setSelectOptions($('mediaCategoryFilter'), state.config.categories, { value: '', label: 'Todas las categorías' });
      setSelectOptions($('licenseType'), state.config.licenseTypes);
      setSelectOptions($('editLicenseType'), state.config.licenseTypes);
      updateCategoryUi();
      $('mediaProviderBadge').textContent = state.config.writable ? `${state.config.provider} · escritura habilitada` : `${state.config.provider} · solo lectura`;
      $('mediaProviderBadge').classList.toggle('ready', Boolean(state.config.writable));
      $('btnUploadMedia').disabled = !state.config.writable;
      renderCatalog(); renderOrphans();
      if (window.RayoProgrammingV4) window.RayoProgrammingV4.setMediaItems(state.items, state.config);
      return { items: state.items, config: state.config, orphans: state.orphans };
    })();
    try { return await state.loading; }
    catch (error) { message('mediamsg', error.message, false); throw error; }
    finally { state.loading = null; }
  }

  $('mediaFile').addEventListener('change', event => prepareFiles(event.target.files));
  $('mediaDrop').addEventListener('dragover', event => { event.preventDefault(); $('mediaDrop').classList.add('dragging'); });
  $('mediaDrop').addEventListener('dragleave', () => $('mediaDrop').classList.remove('dragging'));
  $('mediaDrop').addEventListener('drop', event => { event.preventDefault(); $('mediaDrop').classList.remove('dragging'); prepareFiles(event.dataTransfer.files); });
  $('mediaCategory').addEventListener('change', updateCategoryUi);
  $('licenseType').addEventListener('change', () => { $('licenseType').dataset.userChanged = '1'; });
  $('btnRefreshMedia').addEventListener('click', () => load(true));
  $('btnRefreshOrphans').addEventListener('click', () => load(true));
  $('mediaSearch').addEventListener('input', renderCatalog);
  $('mediaCategoryFilter').addEventListener('change', renderCatalog);
  $('mediaStatusFilter').addEventListener('change', renderCatalog);
  $('replaceMediaFile').addEventListener('change', replaceSelected);
  $('btnCloseMediaEditor').addEventListener('click', () => $('mediaEditor').close());
  $('btnCancelMediaEditor').addEventListener('click', () => $('mediaEditor').close());
  $('btnSaveMediaEditor').addEventListener('click', saveEditor);
  document.addEventListener('rayoboss:section', event => { if (event.detail.section === 'media') load(true); });

  window.RayoLibraryV4 = { load, uploadSelected, get items() { return state.items; }, get config() { return state.config; } };
})();
