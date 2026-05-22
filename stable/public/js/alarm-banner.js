// alarm-banner.js — franja superior tipo SCADA (todas las páginas)

/**
 * Muestra las alarmas activas del PLC.
 * Ahora busca las descripciones directamente en TAGS_DICT (public/js/tags_dict.js)
 */
function alarmBanner_update(data) {
  const banner = document.getElementById('alarm-banner');
  const line1 = document.getElementById('alarm-line-1');
  const line2 = document.getElementById('alarm-line-2');
  if (!banner || !line1 || !line2) return;

  if (!data || !data.id) return;

  if (!data.status) {
    banner.classList.remove('alarm-banner--hidden');
    banner.classList.add('alarm-banner--offline');
    line1.textContent = `⚠ Sin comunicación Modbus con ${data.id}`;
    line2.textContent = 'Revise IP/puerto en config/plcs.json y que el servidor Node esté en marcha.';
    return;
  }

  banner.classList.remove('alarm-banner--offline');
  const tags = data.tags || {};
  const active = [];

  // Buscamos en el diccionario todos los tags que sean de tipo Alarma (usualmente empiezan por ALM_ o están definidos como tal)
  // En TAGS_DICT no tenemos la categoría, así que buscamos por nombre o por el rango de palabras (W52-W55)
  for (const tagDef of TAGS_DICT) {
    if (tagDef.word >= 52 && tagDef.word <= 55 && tagDef.bit !== null) {
      if (tags[tagDef.name] === 1) {
        active.push({ 
          plc: data.id,
          tag: tagDef.name, 
          text: tagDef.desc || tagDef.name,
          pri: 50 // Por defecto prioridad media
        });
      }
    }
  }

  // Prioridades específicas si se desea (opcional)
  active.forEach(a => {
    if (a.tag === 'EMERGENZA_PREMUTA') a.pri = 1;
    if (a.tag.includes('TERMICO')) a.pri = 10;
  });

  active.sort((a, b) => a.pri - b.pri || a.text.localeCompare(b.text));

  if (active.length === 0) {
    banner.classList.add('alarm-banner--hidden');
    line1.textContent = '';
    line2.textContent = '';
    return;
  }

  banner.classList.remove('alarm-banner--hidden');

  const sep = '  ●  ';
  // Incluimos el ID del PLC si hay múltiples PLCs (para futuro)
  const full = active.map(a => `[${a.plc}] ${a.text}`).join(sep);
  const max1 = 140;

  if (full.length <= max1) {
    line1.textContent = full;
    line2.textContent = active.length > 1 ? `${active.length} alarmas activas` : '';
  } else {
    line1.textContent = full.slice(0, max1).trim() + '…';
    line2.textContent = `(+${active.length}) alarmas activas`;
  }
}
