// analytics.js — Lógica del dashboard de producción SCADA Node3

// ==================================================
// CHART.JS DEFAULTS
// ==================================================
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = 'Inter, sans-serif';

const CHART_COLORS = {
  violet: { line: '#7c3aed', fill: 'rgba(124,58,237,0.15)' },
  cyan:   { line: '#06b6d4', fill: 'rgba(6,182,212,0.12)'  },
  green:  { line: '#10b981', fill: 'rgba(16,185,129,0.12)' },
  amber:  { line: '#f59e0b', fill: 'rgba(245,158,11,0.12)' },
};

let allData = [];
let charts  = {};

// ==================================================
// UTILIDADES
// ==================================================
function showToast(msg, icon = '✅') {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${icon}</span> ${msg}`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function formatDT(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return isoStr; }
}

function mean(arr, key) {
  const vals = arr.map(r => r[key]).filter(v => v !== undefined && v !== null && !isNaN(v));
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// ==================================================
// CARGA DE DATOS
// ==================================================
async function loadData() {
  const plc   = document.getElementById('sel-plc').value;
  const limit = document.getElementById('sel-period').value;
  try {
    const res = await fetch(`/api/production/history?plc=${plc}&limit=${limit}`);
    const raw = await res.json();
    allData   = raw.reverse(); // cronológico
    renderAll();
  } catch (e) {
    showToast('Error al cargar los datos', '❌');
    console.error(e);
  }
}

async function loadConfig() {
  try {
    const res = await fetch('/api/production/config');
    const cfg = await res.json();
    document.getElementById('inp-interval').value = cfg.intervalMinutes;
    document.getElementById('logger-status-text').textContent = `Registro activo — cada ${cfg.intervalMinutes} min`;
  } catch (e) { /* silencioso */ }
}

async function setIntervalLog() {
  const minutes = parseFloat(document.getElementById('inp-interval').value);
  try {
    const res  = await fetch('/api/production/interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes })
    });
    const json = await res.json();
    if (json.ok) {
      showToast(`Intervalo actualizado a ${minutes} min`);
      document.getElementById('logger-status-text').textContent = `Registro activo — cada ${minutes} min`;
    } else {
      showToast(json.error || 'Error', '⚠️');
    }
  } catch (e) {
    showToast('No se pudo cambiar el intervalo', '❌');
  }
}

// ==================================================
// RENDER
// ==================================================
function renderAll() {
  if (!allData.length) { renderEmpty(); return; }
  updateKPIs();
  renderChartProduccion();
  renderChartEnergia();
  renderChartCiclo();
  renderChartTemp();
  renderTable();
}

function renderEmpty() {
  const mins = document.getElementById('inp-interval').value;
  document.getElementById('table-container').innerHTML = `
    <div class="empty-state">
      <div class="icon">📭</div>
      <p>No hay datos de producción todavía.<br>
      Espera al primer ciclo de registro (cada ${mins} min).</p>
    </div>`;
}

function updateKPIs() {
  if (!allData.length) return;
  const last = allData[allData.length - 1];
  document.getElementById('kpi-golpes').textContent    = last.PROD_ACTUAL_GOLPES ?? '—';
  document.getElementById('kpi-ciclo').textContent     = mean(allData, 'TEMPO_CICLO_ULTIMO');
  document.getElementById('kpi-temp-sup').textContent  = last.TEMP_MOLDE_SUP ?? '—';
  document.getElementById('kpi-temp-inf').textContent  = last.TEMP_MOLDE_INF ?? '—';
  document.getElementById('kpi-energia').textContent   = last.CONSUMO_ENERG_ACTUAL ?? '—';
  document.getElementById('kpi-golpes-sub').textContent   = `Registrado: ${formatDT(last.timestamp)}`;
  document.getElementById('kpi-ciclo-sub').textContent    = `Media de ${allData.length} muestras`;
  document.getElementById('kpi-temp-sup-sub').textContent = `SP: ${last.TEMP_SP_SUP ?? '?'}°C`;
  document.getElementById('kpi-temp-inf-sub').textContent = `SP: ${last.TEMP_SP_INF ?? '?'}°C`;
  document.getElementById('kpi-energia-sub').textContent  = `Medio día: ${last.CONSUMO_MEDIO_DIA ?? '?'}`;
}

// ==================================================
// HELPER CHARTS
// ==================================================
function buildChart(id, config) {
  if (charts[id]) {
    charts[id].data = config.data;
    charts[id].update('active');
    return;
  }
  const ctx = document.getElementById(id).getContext('2d');
  charts[id] = new Chart(ctx, config);
}

function makeLineDataset(label, data, color) {
  return {
    label,
    data,
    borderColor: color.line,
    backgroundColor: color.fill,
    borderWidth: 2,
    pointRadius: data.length > 80 ? 0 : 3,
    pointHoverRadius: 5,
    fill: true,
    tension: 0.4
  };
}

const BASE_OPTS = (yLabel = '') => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(18,18,26,0.95)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      padding: 10
    }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 10 } },
         title: { display: !!yLabel, text: yLabel, font: { size: 10 } } }
  }
});

const MULTI_LEGEND = { ...BASE_OPTS(), plugins: { ...BASE_OPTS().plugins, legend: { display: true, labels: { font: { size: 11 }, color: '#94a3b8' } } } };

// ==================================================
// GRÁFICOS
// ==================================================
function renderChartProduccion() {
  const labels = allData.map(r => formatDT(r.timestamp));
  buildChart('chart-produccion', {
    type: 'line',
    data: { labels, datasets: [makeLineDataset('Golpes', allData.map(r => r.PROD_ACTUAL_GOLPES ?? null), CHART_COLORS.violet)] },
    options: BASE_OPTS('Golpes')
  });
}

function renderChartEnergia() {
  const labels = allData.map(r => formatDT(r.timestamp));
  buildChart('chart-energia', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Consumo Actual', data: allData.map(r => r.CONSUMO_ENERG_ACTUAL ?? null), backgroundColor: CHART_COLORS.amber.fill, borderColor: CHART_COLORS.amber.line, borderWidth: 1 },
        { label: 'Medio Día',      data: allData.map(r => r.CONSUMO_MEDIO_DIA ?? null),    backgroundColor: CHART_COLORS.cyan.fill,  borderColor: CHART_COLORS.cyan.line,  borderWidth: 1 }
      ]
    },
    options: { ...MULTI_LEGEND, scales: BASE_OPTS('kW').scales }
  });
}

function renderChartCiclo() {
  const labels = allData.map(r => formatDT(r.timestamp));
  buildChart('chart-ciclo', {
    type: 'line',
    data: { labels, datasets: [makeLineDataset('T.Ciclo (s)', allData.map(r => r.TEMPO_CICLO_ULTIMO ?? null), CHART_COLORS.cyan)] },
    options: BASE_OPTS('Segundos')
  });
}

function renderChartTemp() {
  const labels = allData.map(r => formatDT(r.timestamp));
  buildChart('chart-temp', {
    type: 'line',
    data: {
      labels,
      datasets: [
        makeLineDataset('T.SUP (°C)', allData.map(r => r.TEMP_MOLDE_SUP ?? null), CHART_COLORS.amber),
        makeLineDataset('T.INF (°C)', allData.map(r => r.TEMP_MOLDE_INF ?? null), CHART_COLORS.green)
      ]
    },
    options: { ...MULTI_LEGEND, scales: BASE_OPTS('°C').scales }
  });
}

// ==================================================
// TABLA
// ==================================================
function renderTable() {
  const rows = [...allData].reverse().slice(0, 50);
  let html = `<table class="data-table">
    <thead><tr>
      <th>Timestamp</th><th>Golpes</th><th>T.Ciclo (s)</th>
      <th>Temp.SUP (°C)</th><th>Temp.INF (°C)</th>
      <th>Consumo (kW)</th><th>PLC</th>
    </tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr>
      <td>${formatDT(r.timestamp)}</td>
      <td>${r.PROD_ACTUAL_GOLPES ?? '—'}</td>
      <td>${r.TEMPO_CICLO_ULTIMO ?? '—'}</td>
      <td>${r.TEMP_MOLDE_SUP ?? '—'}</td>
      <td>${r.TEMP_MOLDE_INF ?? '—'}</td>
      <td>${r.CONSUMO_ENERG_ACTUAL ?? '—'}</td>
      <td><span class="badge badge-green">${r.plc}</span></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('table-container').innerHTML = html;
}

// ==================================================
// EXPORTAR PDF
// ==================================================
async function exportPDF() {
  if (!allData.length) { showToast('Sin datos para exportar', '⚠️'); return; }
  showToast('Generando PDF...', '⏳');
  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const plc   = document.getElementById('sel-plc').value;
  const now   = new Date();
  const last  = allData[allData.length - 1];

  // Fondo oscuro
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, 297, 210, 'F');

  // Título
  doc.setTextColor(124, 58, 237);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('SCADA Node3 — Informe de Producción', 14, 18);
  doc.setTextColor(148, 163, 184); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`PLC: ${plc}  |  Generado: ${now.toLocaleString('es-ES')}  |  Muestras: ${allData.length}`, 14, 26);

  // Línea separadora
  doc.setDrawColor(124, 58, 237); doc.setLineWidth(0.3);
  doc.line(14, 30, 283, 30);

  // KPIs
  const kpis = [
    ['Golpes Producción',  last.PROD_ACTUAL_GOLPES ?? '—'],
    ['T.Ciclo Medio (s)',  mean(allData, 'TEMPO_CICLO_ULTIMO')],
    ['Temp. SUP (°C)',     last.TEMP_MOLDE_SUP ?? '—'],
    ['Temp. INF (°C)',     last.TEMP_MOLDE_INF ?? '—'],
    ['Consumo (kW)',       last.CONSUMO_ENERG_ACTUAL ?? '—'],
  ];
  kpis.forEach(([label, val], i) => {
    const x = 14 + i * 55;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184); doc.setFontSize(8);
    doc.text(label.toUpperCase(), x, 40);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(240, 240, 240); doc.setFontSize(13);
    doc.text(String(val), x, 48);
  });

  doc.setDrawColor(124, 58, 237); doc.line(14, 54, 283, 54);

  // Tabla
  doc.autoTable({
    startY: 58,
    head: [['Timestamp', 'Golpes', 'T.Ciclo(s)', 'Temp.SUP(°C)', 'Temp.INF(°C)', 'Consumo(kW)']],
    body: [...allData].reverse().slice(0, 100).map(r => [
      formatDT(r.timestamp),
      r.PROD_ACTUAL_GOLPES ?? '—',
      r.TEMPO_CICLO_ULTIMO ?? '—',
      r.TEMP_MOLDE_SUP ?? '—',
      r.TEMP_MOLDE_INF ?? '—',
      r.CONSUMO_ENERG_ACTUAL ?? '—',
    ]),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.5, textColor: [200, 200, 210], fillColor: [18, 18, 26] },
    headStyles: { fillColor: [50, 20, 100], textColor: [200, 180, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [22, 22, 34] },
    margin: { left: 14, right: 14 }
  });

  const filename = `produccion_${plc}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  showToast(`PDF descargado: ${filename}`);
}

// ==================================================
// EVENTOS
// ==================================================
document.getElementById('btn-refresh').addEventListener('click', loadData);
document.getElementById('btn-set-interval').addEventListener('click', setIntervalLog);
document.getElementById('btn-pdf').addEventListener('click', exportPDF);
document.getElementById('sel-plc').addEventListener('change', loadData);
document.getElementById('sel-period').addEventListener('change', loadData);

// Init
loadConfig();
loadData();

// Auto-refresh cada 5 minutos
setInterval(loadData, 5 * 60 * 1000);
