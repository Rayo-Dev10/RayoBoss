// Informes mensuales de reproducción RayoBoss 4.0.1.
(() => {
  let loadedMonth = '';
  let licenseTypes = {};
  function node(tag, className = '', text = '') {
    const output = document.createElement(tag);
    if (className) output.className = className;
    output.textContent = text;
    return output;
  }
  function duration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;
    return hours ? `${hours} h ${minutes} min` : `${minutes} min ${rest} s`;
  }
  function dateTime(value) {
    try { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
    catch (_) { return value || '—'; }
  }
  function render(report) {
    licenseTypes = report.licenseTypes || licenseTypes;
    $('reportPlayCount').textContent = String(report.totals.plays);
    $('reportUniqueCount').textContent = String(report.totals.uniquePieces);
    $('reportDuration').textContent = duration(report.totals.totalSeconds);
    $('reportLicenseCount').textContent = String(Object.keys(report.totals.byLicense || {}).length);
    const body = $('reportTable').querySelector('tbody'); body.replaceChildren();
    if (!report.items.length) {
      const row = node('tr'); const empty = node('td', '', 'No hay reproducciones registradas en este mes.'); empty.colSpan = 6; row.append(empty); body.append(row);
    }
    for (const item of report.items) {
      const row = node('tr');
      const piece = node('td'); piece.append(node('b', '', item.title), node('small', 'table-secondary', item.artist || 'Artista sin registrar'));
      row.append(piece, node('td', '', licenseTypes[item.licenseType] || item.licenseType), node('td', '', item.licenseDocument ? 'Adjunto' : 'Sin adjuntar'), node('td', '', String(item.plays)), node('td', '', duration(item.totalSeconds)), node('td', '', dateTime(item.lastPlayedAt)));
      body.append(row);
    }
    const timeline = $('reportTimeline'); timeline.replaceChildren();
    if (!report.events.length) timeline.append(node('p', 'empty-state', 'El histórico aparecerá cuando una pieza sea iniciada por el reproductor público o por el estudio en vivo.'));
    for (const event of report.events.slice(0, 300)) {
      const entry = node('div', 'timeline-entry');
      const time = node('time', '', dateTime(event.playedAt)); time.dateTime = event.playedAt;
      const detail = node('div'); detail.append(node('b', '', event.title), node('span', '', `${event.artist || 'Artista sin registrar'} · ${event.source} · ${licenseTypes[event.licenseType] || event.licenseType}`));
      entry.append(time, detail); timeline.append(entry);
    }
  }
  async function loadReport() {
    const month = $('reportMonth').value;
    if (!month) return message('reportmsg', 'Selecciona un mes.', false);
    $('btnLoadReport').disabled = true;
    try {
      const report = await api(`/api/reports/playback?month=${encodeURIComponent(month)}`);
      loadedMonth = month; render(report);
      message('reportmsg', `Informe ${month}: ${report.totals.plays} reproducciones y ${report.totals.uniquePieces} piezas diferentes.`, true);
    } catch (error) { message('reportmsg', error.message, false); }
    finally { $('btnLoadReport').disabled = false; }
  }
  function exportReport() {
    const month = $('reportMonth').value || loadedMonth;
    if (!month) return message('reportmsg', 'Selecciona un mes antes de exportar.', false);
    const link = document.createElement('a');
    link.href = `/api/reports/playback.csv?month=${encodeURIComponent(month)}`;
    link.download = `rayoboss-reproducciones-${month}.csv`;
    document.body.append(link); link.click(); link.remove();
  }
  $('reportMonth').value = new Date().toISOString().slice(0, 7);
  $('btnLoadReport').addEventListener('click', loadReport);
  $('btnExportReport').addEventListener('click', exportReport);
  document.addEventListener('rayoboss:section', event => { if (event.detail.section === 'reports') loadReport(); });
  window.RayoReportsV4 = { load: loadReport };
})();
