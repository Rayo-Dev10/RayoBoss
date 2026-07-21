// RayoBoss 4.0.0 - programación visual del AutoDJ.
(() => {
  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const DAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  let state = null;
  let original = null;
  let mediaItems = [];
  let mediaConfig = null;
  let selectedPlaylistId = null;
  let dirty = false;
  let loaded = false;
  let refreshTimer = null;

  const editable = () => currentUser && roleIs('desarrollador', 'administrador');
  const deepClone = value => JSON.parse(JSON.stringify(value));
  const byId = id => document.getElementById(id);

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }
  function controlButton(text, className, handler, title = '') {
    const button = node('button', className, text);
    button.type = 'button';
    if (title) button.title = title;
    button.disabled = !editable();
    button.addEventListener('click', handler);
    return button;
  }
  function markDirty() {
    if (!editable()) return;
    dirty = true;
    message('programmsg', 'Hay cambios sin guardar.', true);
  }
  function safeSlug(value) {
    const base = String(value || 'elemento').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'elemento';
    return `${base}-${Date.now().toString(36).slice(-5)}`;
  }
  function durationLabel(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const remaining = total % 60;
    return minutes ? `${minutes} min ${remaining ? `${remaining} s` : ''}`.trim() : `${remaining} s`;
  }
  function categoryLabel(category) {
    return mediaConfig?.categories?.[category]?.label || String(category || 'Sin categoría');
  }
  function mediaKind(item) {
    return item.kind === 'video' ? 'Video' : 'Audio';
  }
  function playlistById(id) { return state?.playlists?.find(item => item.id === id) || null; }
  function mediaById(id) { return mediaItems.find(item => item.id === id) || null; }
  function selectedPlaylist() { return playlistById(selectedPlaylistId); }

  function showTab(name) {
    document.querySelectorAll('.program-tab').forEach(button => button.classList.toggle('on', button.dataset.programTab === name));
    ['Playlists', 'Schedule', 'Continuity', 'Summary'].forEach(label => {
      visible(`programTab${label}`, label.toLowerCase() === name);
    });
    if (name === 'summary') refreshNow().catch(error => message('programmsg', error.message, false));
  }

  function renderPlaylistList() {
    const container = byId('playlistList');
    if (!container || !state) return;
    container.replaceChildren();
    for (const playlist of state.playlists) {
      const button = node('button', `playlist-choice${playlist.id === selectedPlaylistId ? ' on' : ''}`);
      button.type = 'button';
      const name = node('b', '', playlist.name);
      const count = node('span', '', `${playlist.itemIds.length} elemento${playlist.itemIds.length === 1 ? '' : 's'}`);
      button.append(name, count);
      button.addEventListener('click', () => {
        selectedPlaylistId = playlist.id;
        renderPlaylistList();
        renderPlaylistEditor();
      });
      container.append(button);
    }
  }

  function labeledControl(labelText, control) {
    const wrapper = node('div');
    const label = node('label', '', labelText);
    if (control.id) label.htmlFor = control.id;
    wrapper.append(label, control);
    return wrapper;
  }

  function renderSelectedMedia(playlist, container) {
    const title = node('h3', '', 'Orden de reproducción');
    const help = node('p', 'sub', 'La primera pieza de la lista se reproduce primero, salvo que active el modo aleatorio.');
    const list = node('div', 'ordered-media-list');
    if (!playlist.itemIds.length) list.append(node('p', 'empty-state', 'La playlist todavía no contiene elementos.'));
    playlist.itemIds.forEach((id, index) => {
      const item = mediaById(id);
      const row = node('div', 'ordered-media-item');
      const number = node('span', 'order-number', String(index + 1));
      const detail = node('div', 'ordered-media-detail');
      detail.append(node('b', '', item?.title || `Elemento no disponible (${id})`));
      detail.append(node('small', '', item ? `${mediaKind(item)} · ${categoryLabel(item.category)} · ${durationLabel(item.durationSeconds)}` : 'Revise la biblioteca'));
      const actions = node('div', 'compact-actions');
      actions.append(
        controlButton('↑', 'mini-btn', () => movePlaylistItem(playlist, index, -1), 'Subir'),
        controlButton('↓', 'mini-btn', () => movePlaylistItem(playlist, index, 1), 'Bajar'),
        controlButton('Quitar', 'mini-btn danger-outline', () => removePlaylistItem(playlist, index), 'Quitar de la playlist')
      );
      row.append(number, detail, actions);
      list.append(row);
    });
    container.append(title, help, list);
  }

  function renderAvailableMedia(playlist, container) {
    container.append(node('h3', '', 'Biblioteca disponible'));
    container.append(node('p', 'sub', 'Solo aparecen elementos activos destinados al AutoDJ.'));
    const search = node('input');
    search.type = 'search';
    search.placeholder = 'Buscar por título o categoría';
    search.className = 'media-search';
    const list = node('div', 'available-media-list');
    const render = () => {
      const query = search.value.trim().toLowerCase();
      list.replaceChildren();
      const available = mediaItems.filter(item => item.active && String(item.category).startsWith('autodj.') &&
        !playlist.itemIds.includes(item.id) && `${item.title} ${categoryLabel(item.category)}`.toLowerCase().includes(query));
      if (!available.length) list.append(node('p', 'empty-state', 'No hay elementos coincidentes para agregar.'));
      for (const item of available) {
        const row = node('div', 'available-media-item');
        const detail = node('div');
        detail.append(node('b', '', item.title), node('small', '', `${mediaKind(item)} · ${categoryLabel(item.category)} · ${durationLabel(item.durationSeconds)}`));
        row.append(detail, controlButton('Agregar', 'mini-btn', () => {
          playlist.itemIds.push(item.id);
          markDirty();
          renderPlaylistEditor();
          renderPlaylistList();
        }));
        list.append(row);
      }
    };
    search.addEventListener('input', render);
    container.append(search, list);
    render();
  }

  function renderPlaylistEditor() {
    const editor = byId('playlistEditor');
    if (!editor || !state) return;
    editor.replaceChildren();
    const playlist = selectedPlaylist();
    if (!playlist) {
      editor.append(node('p', 'empty-state', 'Selecciona o crea una playlist.'));
      return;
    }
    const heading = node('div', 'section-heading-row');
    heading.append(node('h2', '', 'Editar playlist'));
    if (state.playlists.length > 1) heading.append(controlButton('Eliminar playlist', 'btn linea danger-outline', () => deletePlaylist(playlist)));
    editor.append(heading);

    const name = node('input');
    name.id = 'playlistName'; name.maxLength = 100; name.value = playlist.name; name.disabled = !editable();
    name.addEventListener('input', () => { playlist.name = name.value; markDirty(); renderPlaylistList(); renderSchedule(); });
    const shuffle = node('input'); shuffle.type = 'checkbox'; shuffle.checked = Boolean(playlist.shuffle); shuffle.disabled = !editable();
    shuffle.addEventListener('change', () => { playlist.shuffle = shuffle.checked; markDirty(); });
    const repeat = node('input'); repeat.type = 'checkbox'; repeat.checked = playlist.repeat !== false; repeat.disabled = !editable();
    repeat.addEventListener('change', () => { playlist.repeat = repeat.checked; markDirty(); });
    const settings = node('div', 'playlist-settings');
    settings.append(labeledControl('Nombre visible', name));
    const checks = node('div', 'inline-checks');
    const shuffleLabel = node('label', 'check'); shuffleLabel.append(shuffle, document.createTextNode(' Orden aleatorio'));
    const repeatLabel = node('label', 'check'); repeatLabel.append(repeat, document.createTextNode(' Repetición continua'));
    checks.append(shuffleLabel, repeatLabel); settings.append(checks);
    editor.append(settings);

    const columns = node('div', 'program-two-columns media-picker-columns');
    const selected = node('div');
    const available = node('div');
    renderSelectedMedia(playlist, selected);
    renderAvailableMedia(playlist, available);
    columns.append(selected, available);
    editor.append(columns);
  }

  function movePlaylistItem(playlist, index, direction) {
    const target = index + direction;
    if (target < 0 || target >= playlist.itemIds.length) return;
    [playlist.itemIds[index], playlist.itemIds[target]] = [playlist.itemIds[target], playlist.itemIds[index]];
    markDirty(); renderPlaylistEditor();
  }
  function removePlaylistItem(playlist, index) {
    playlist.itemIds.splice(index, 1);
    markDirty(); renderPlaylistEditor(); renderPlaylistList();
  }
  function addPlaylist() {
    if (!editable()) return;
    const playlist = { id: safeSlug('playlist'), name: 'Nueva playlist', itemIds: [], shuffle: false, repeat: true };
    state.playlists.push(playlist);
    selectedPlaylistId = playlist.id;
    markDirty(); renderAll();
    setTimeout(() => byId('playlistName')?.select(), 0);
  }
  function deletePlaylist(playlist) {
    if (!editable() || state.playlists.length <= 1) return;
    if (!confirm(`Eliminar la playlist “${playlist.name}”? Las franjas que la usan deberán corregirse.`)) return;
    state.playlists = state.playlists.filter(item => item.id !== playlist.id);
    const fallback = state.playlists[0].id;
    state.schedule.forEach(slot => { if (slot.playlistId === playlist.id) slot.playlistId = fallback; });
    if (state.continuity.fallbackPlaylistId === playlist.id) state.continuity.fallbackPlaylistId = fallback;
    selectedPlaylistId = fallback;
    markDirty(); renderAll();
  }

  function daysControl(slot) {
    const wrapper = node('div', 'day-selector');
    DAYS.forEach((day, index) => {
      const label = node('label', `day-toggle${slot.days.includes(index) ? ' selected' : ''}`);
      label.title = day;
      const checkbox = node('input');
      checkbox.type = 'checkbox'; checkbox.checked = slot.days.includes(index); checkbox.disabled = !editable();
      checkbox.addEventListener('change', () => {
        if (checkbox.checked && !slot.days.includes(index)) slot.days.push(index);
        if (!checkbox.checked) slot.days = slot.days.filter(value => value !== index);
        slot.days.sort(); label.classList.toggle('selected', checkbox.checked); markDirty();
      });
      label.append(checkbox, document.createTextNode(DAY_SHORT[index]));
      wrapper.append(label);
    });
    return wrapper;
  }

  function playlistSelect(value, onChange) {
    const select = node('select'); select.disabled = !editable();
    for (const playlist of state.playlists) {
      const option = node('option', '', playlist.name); option.value = playlist.id; option.selected = playlist.id === value; select.append(option);
    }
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  function renderSchedule() {
    const container = byId('scheduleList');
    if (!container || !state) return;
    container.replaceChildren();
    if (!state.schedule.length) container.append(node('p', 'empty-state', 'No hay franjas. Se usará la playlist de respaldo.'));
    for (const slot of state.schedule) {
      const card = node('div', `schedule-card${slot.enabled === false ? ' disabled-card' : ''}`);
      const top = node('div', 'schedule-card-top');
      const enabledLabel = node('label', 'switch-label');
      const enabled = node('input'); enabled.type = 'checkbox'; enabled.checked = slot.enabled !== false; enabled.disabled = !editable();
      enabled.addEventListener('change', () => { slot.enabled = enabled.checked; card.classList.toggle('disabled-card', !enabled.checked); markDirty(); });
      enabledLabel.append(enabled, document.createTextNode(' Franja activa'));
      top.append(enabledLabel, controlButton('Eliminar', 'mini-btn danger-outline', () => deleteSlot(slot)));

      const grid = node('div', 'schedule-grid');
      const name = node('input'); name.value = slot.name; name.maxLength = 100; name.disabled = !editable();
      name.addEventListener('input', () => { slot.name = name.value; markDirty(); });
      const start = node('input'); start.type = 'time'; start.value = slot.start; start.disabled = !editable();
      start.addEventListener('change', () => { slot.start = start.value; markDirty(); });
      const end = node('input'); end.type = 'time'; end.value = slot.end; end.disabled = !editable();
      end.addEventListener('change', () => { slot.end = end.value; markDirty(); });
      const playlist = playlistSelect(slot.playlistId, value => { slot.playlistId = value; markDirty(); });
      grid.append(labeledControl('Nombre de la franja', name), labeledControl('Desde', start), labeledControl('Hasta', end), labeledControl('Playlist', playlist));
      const dayBlock = node('div', 'schedule-days'); dayBlock.append(node('label', '', 'Días de emisión'), daysControl(slot));
      card.append(top, grid, dayBlock);
      container.append(card);
    }
  }
  function addSlot() {
    if (!editable()) return;
    state.schedule.push({ id: safeSlug('franja'), name: 'Nueva franja', days: [1], start: '08:00', end: '09:00', playlistId: state.playlists[0].id, enabled: false });
    markDirty(); renderSchedule();
  }
  function deleteSlot(slot) {
    if (!editable() || !confirm(`Eliminar la franja “${slot.name}”?`)) return;
    state.schedule = state.schedule.filter(item => item.id !== slot.id);
    markDirty(); renderSchedule();
  }

  function checkList(containerId, candidates, selectedIds, onChange) {
    const container = byId(containerId); if (!container) return;
    container.replaceChildren();
    if (!candidates.length) container.append(node('p', 'empty-state', 'No hay recursos activos de esta clase en la biblioteca.'));
    for (const item of candidates) {
      const label = node('label', 'check-list-item');
      const input = node('input'); input.type = 'checkbox'; input.checked = selectedIds.includes(item.id); input.disabled = !editable();
      input.addEventListener('change', () => onChange(item.id, input.checked));
      const detail = node('span'); detail.append(node('b', '', item.title), node('small', '', `${mediaKind(item)} · ${durationLabel(item.durationSeconds)}`));
      label.append(input, detail); container.append(label);
    }
  }

  function renderContinuity() {
    if (!state) return;
    const continuity = state.continuity;
    const fallback = byId('continuityFallback'); fallback.replaceChildren(); fallback.disabled = !editable();
    for (const playlist of state.playlists) {
      const option = node('option', '', playlist.name); option.value = playlist.id; option.selected = playlist.id === continuity.fallbackPlaylistId; fallback.append(option);
    }
    fallback.onchange = () => { continuity.fallbackPlaylistId = fallback.value; markDirty(); };
    const bindings = [
      ['continuityCrossfade', 'crossfadeSeconds', Number],
      ['continuityIdEvery', 'stationIdEveryTracks', Number],
      ['continuityCueEvery', 'cueEveryMinutes', Number],
      ['continuityCueOrder', 'cueOrder', String]
    ];
    for (const [id, key, converter] of bindings) {
      const input = byId(id); input.value = continuity[key]; input.disabled = !editable();
      input.onchange = () => { continuity[key] = converter(input.value); markDirty(); };
    }
    const identifiers = mediaItems.filter(item => item.active && item.category === 'autodj.produccion' && item.subtype === 'identificador');
    const cues = mediaItems.filter(item => item.active && item.category === 'autodj.produccion' && item.subtype === 'cuna');
    checkList('continuityStationIds', identifiers, continuity.stationIdItemIds, (id, checked) => {
      continuity.stationIdItemIds = checked ? [...new Set([...continuity.stationIdItemIds, id])] : continuity.stationIdItemIds.filter(value => value !== id);
      markDirty();
    });
    checkList('continuityCues', cues, continuity.cueItemIds, (id, checked) => {
      continuity.cueItemIds = checked ? [...new Set([...continuity.cueItemIds, id])] : continuity.cueItemIds.filter(value => value !== id);
      markDirty();
    });
  }

  function daysLabel(days) {
    const sorted = [...new Set(days || [])].sort();
    if (sorted.length === 7) return 'Todos los días';
    if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) return 'Lunes a viernes';
    if (JSON.stringify(sorted) === JSON.stringify([0, 6])) return 'Fin de semana';
    return sorted.map(day => DAYS[day]).join(', ') || 'Sin días';
  }
  function renderScheduleSummary() {
    const body = byId('programScheduleSummary'); if (!body || !state) return;
    body.replaceChildren();
    const sorted = [...state.schedule].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.start.localeCompare(b.start));
    for (const slot of sorted) {
      const row = node('tr');
      const playlist = playlistById(slot.playlistId);
      [slot.name, daysLabel(slot.days), `${slot.start} – ${slot.end}`, playlist?.name || 'Playlist no disponible', slot.enabled === false ? 'Desactivada' : 'Activa']
        .forEach(text => row.append(node('td', '', text)));
      body.append(row);
    }
  }

  async function refreshNow() {
    if (!state) return;
    const onAir = await api('/api/public/on-air');
    const isLive = onAir.mode === 'live';
    const current = onAir.autodj;
    byId('programModeBadge').textContent = isLive ? 'EN VIVO' : 'AutoDJ';
    byId('programModeBadge').classList.toggle('live', isLive);
    if (isLive) {
      byId('programNowTitle').textContent = onAir.status.title || 'Transmisión en vivo';
      byId('programNowMeta').textContent = `Conduce: ${onAir.status.host || 'Estudio'} · Transporte: ${onAir.liveTransport}`;
      byId('programNowProgress').value = 100;
      byId('programNowTime').textContent = 'El AutoDJ regresará cuando finalice el vivo.';
      byId('programNextTitle').textContent = 'Regreso al AutoDJ';
      byId('programNextMeta').textContent = playlistById(state.continuity.fallbackPlaylistId)?.name || 'Playlist de respaldo';
    } else if (current?.item) {
      byId('programNowTitle').textContent = current.item.title;
      byId('programNowMeta').textContent = `${mediaKind(current.item)} · ${categoryLabel(current.item.category)} · ${durationLabel(current.item.durationSeconds)}`;
      byId('programNowProgress').value = Number(current.progressPercent) || 0;
      byId('programNowTime').textContent = `${durationLabel(current.remainingSeconds)} restantes · transición ${current.crossfadeSeconds} s`;
      byId('programNextTitle').textContent = current.next?.title || 'Sin siguiente elemento';
      byId('programNextMeta').textContent = current.next ? `${mediaKind(current.next)} · ${durationLabel(current.next.durationSeconds)}` : '-';
    } else {
      byId('programNowTitle').textContent = 'Sin contenido programado';
      byId('programNowMeta').textContent = 'Agrega elementos activos a la playlist correspondiente.';
      byId('programNowProgress').value = 0;
      byId('programNowTime').textContent = '';
      byId('programNextTitle').textContent = '-'; byId('programNextMeta').textContent = '-';
    }
    const activePlaylist = current?.playlist || playlistById(state.continuity.fallbackPlaylistId);
    byId('programPlaylistName').textContent = activePlaylist?.name || '-';
    const playlistState = playlistById(activePlaylist?.id);
    byId('programPlaylistMode').textContent = playlistState ? `${playlistState.itemIds.length} elementos · ${playlistState.shuffle ? 'aleatorio' : 'en orden'}` : '-';
    byId('programSlotName').textContent = current?.slot?.name || 'Fuera de franja';
    byId('programSlotTime').textContent = current?.slot ? `${daysLabel(current.slot.days)} · ${current.slot.start}–${current.slot.end}` : 'Usando playlist de respaldo';
    const c = state.continuity;
    byId('programContinuitySummary').textContent = `ID cada ${c.stationIdEveryTracks || '—'} pistas · cuña cada ${c.cueEveryMinutes || '—'} min`;
    byId('programCrossfadeSummary').textContent = `Transición: ${c.crossfadeSeconds} s · cuñas: ${c.cueOrder === 'random' ? 'aleatorias' : 'secuenciales'}`;
    renderScheduleSummary();
  }

  function renderAll() {
    if (!state) return;
    if (!selectedPlaylistId || !playlistById(selectedPlaylistId)) selectedPlaylistId = state.playlists[0]?.id || null;
    renderPlaylistList(); renderPlaylistEditor(); renderSchedule(); renderContinuity(); renderScheduleSummary();
    const disabled = !editable();
    ['btnProgramSave', 'btnProgramReload', 'btnProgramReset', 'btnPlaylistAdd', 'btnSlotAdd', 'programImportFile'].forEach(id => {
      const element = byId(id); if (element) element.disabled = disabled;
    });
    const importLabel = document.querySelector('label[for="programImportFile"]');
    if (importLabel) importLabel.classList.toggle('disabled', disabled);
  }

  async function load() {
    if (!currentUser || !roleIs('desarrollador', 'administrador', 'locutor')) return;
    try {
      state = await api('/api/programming');
      original = deepClone(state);
      selectedPlaylistId = selectedPlaylistId && playlistById(selectedPlaylistId) ? selectedPlaylistId : state.playlists[0]?.id;
      dirty = false; loaded = true;
      clearMessage('programmsg');
      renderAll();
      await refreshNow();
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(() => {
        if (!document.hidden && !byId('programTabSummary').classList.contains('oculto')) refreshNow().catch(() => {});
      }, 5000);
    } catch (error) { message('programmsg', error.message, false); }
  }

  async function save() {
    if (!editable() || !state) return;
    try {
      const result = await api('/api/programming', { method: 'PUT', body: JSON.stringify(state) });
      state = result.programming; original = deepClone(state); dirty = false;
      message('programmsg', 'Programación validada y guardada. Los cambios ya están disponibles para el AutoDJ.', true);
      renderAll(); await refreshNow();
    } catch (error) { message('programmsg', error.message, false); }
  }
  function discard() {
    if (!editable() || !original) return;
    if (dirty && !confirm('Descartar todos los cambios que todavía no se han guardado?')) return;
    state = deepClone(original); dirty = false; clearMessage('programmsg'); renderAll();
  }
  function exportBackup() {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = node('a'); anchor.href = url; anchor.download = `rayoboss-programacion-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }
  async function importBackup(event) {
    if (!editable()) return;
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.playlists) || !Array.isArray(parsed.schedule) || !parsed.continuity) throw new Error('El archivo no contiene una programación RayoBoss válida.');
      state = parsed; selectedPlaylistId = state.playlists[0]?.id || null; markDirty(); renderAll();
      message('programmsg', 'Respaldo cargado en el editor. Revísalo y pulsa Guardar programación para aplicarlo.', true);
    } catch (error) { message('programmsg', error.message, false); }
  }
  async function resetDemo() {
    if (!editable() || !confirm('Restablecer la programación de demostración? Esta acción reemplaza playlists, franjas y continuidad.')) return;
    try {
      const result = await api('/api/programming/reset', { method: 'POST', body: JSON.stringify({}) });
      state = result.programming; original = deepClone(state); dirty = false; selectedPlaylistId = state.playlists[0]?.id;
      message('programmsg', 'Programación de demostración restaurada.', true); renderAll(); await refreshNow();
    } catch (error) { message('programmsg', error.message, false); }
  }

  function setMediaItems(items, config) {
    mediaItems = Array.isArray(items) ? items : [];
    mediaConfig = config || mediaConfig;
    if (loaded) { renderPlaylistEditor(); renderContinuity(); refreshNow().catch(() => {}); }
  }

  document.querySelectorAll('.program-tab').forEach(button => button.addEventListener('click', () => showTab(button.dataset.programTab)));
  byId('btnPlaylistAdd')?.addEventListener('click', addPlaylist);
  byId('btnSlotAdd')?.addEventListener('click', addSlot);
  byId('btnProgramSave')?.addEventListener('click', save);
  byId('btnProgramReload')?.addEventListener('click', discard);
  byId('btnProgramExport')?.addEventListener('click', exportBackup);
  byId('programImportFile')?.addEventListener('change', importBackup);
  byId('btnProgramReset')?.addEventListener('click', resetDemo);
  byId('btnProgramRefreshNow')?.addEventListener('click', () => refreshNow().catch(error => message('programmsg', error.message, false)));
  window.addEventListener('beforeunload', event => {
    if (!dirty) return;
    event.preventDefault(); event.returnValue = '';
  });

  window.RayoProgrammingV4 = { load, setMediaItems, refreshNow, isDirty: () => dirty };
})();
