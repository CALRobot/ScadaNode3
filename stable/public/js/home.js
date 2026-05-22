// public/js/home.js

function init_home() {
  console.log("Panel de Control de Planta inicializado.");
  
  // Mostrar fecha actual en el header
  const dateBox = document.getElementById('home-date-box');
  if (dateBox) {
    const ahora = new Date();
    dateBox.innerHTML = `
      <div style="text-align: right;">
        <span style="display: block; font-size: 1.2rem; font-weight: bold; color: var(--purple-light);">${ahora.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}</span>
        <span style="font-size: 0.8rem; color: var(--text-muted);">${ahora.getFullYear()}</span>
      </div>
    `;
  }
}

function update_home(data) {
  if (!data || !data.tags) return;
  const plcId = data.id;
  const tags = data.tags;
  const isOnline = !!data.status;

  // 1. Actualizar el Badge de Conectividad en la Home
  const plcItem = document.getElementById(`home-status-${plcId}`);
  if (plcItem) {
    const badge = plcItem.querySelector('.plc-badge');
    if (badge) {
      badge.textContent = isOnline ? 'CONECTADO' : 'DESCONECTADO';
      badge.className = isOnline ? 'plc-badge online' : 'plc-badge offline';
    }
    if (isOnline) plcItem.classList.add('active');
    else plcItem.classList.remove('active');
  }

  if (!isOnline) return;

  // 2. KPIs de Producción
  const prodEl = document.getElementById('home-total-prod');
  if (prodEl) prodEl.textContent = tags.PROD_ACTUAL_GOLPES || 0;

  const tempEl = document.getElementById('home-avg-temp');
  if (tempEl) tempEl.innerHTML = (tags.TEMP_MOLDE_SUP || 0) + '<small>°C</small>';

  // 3. Alarmas Activas (Resumen rápido)
  // Filtramos los tags que sean de tipo alarma y estén a 1
  const alarmContainer = document.getElementById('home-active-alarms');
  if (alarmContainer && typeof TAGS_DICT !== 'undefined') {
    const activeAlms = Object.keys(tags).filter(tagName => {
      const def = TAGS_DICT[tagName];
      return def && (def.cat === 'Alarma' || tagName.startsWith('ALM_')) && tags[tagName] === 1;
    });

    if (activeAlms.length > 0) {
      let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
      activeAlms.forEach(alm => {
        const desc = TAGS_DICT[alm] ? TAGS_DICT[alm].desc : alm;
        html += `<li style="color: #ef4444; margin-bottom: 8px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 5px #ef4444;"></span>
          ${desc}
        </li>`;
      });
      html += '</ul>';
      alarmContainer.innerHTML = html;
    } else {
      alarmContainer.innerHTML = '<div class="no-alarms">No hay alarmas activas en este momento.</div>';
    }
  }
}
