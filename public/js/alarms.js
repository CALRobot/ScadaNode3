// alarms.js - Lógica para el historial de alarmas

async function alarms_refreshHistory() {
  const tbody = document.querySelector('#alarms-history-table tbody');
  const msg = document.getElementById('alarms-history-msg');
  if (!tbody || !msg) return;

  msg.textContent = 'Cargando...';
  
  try {
    const res = await fetch('/api/alarms/history');
    if (!res.ok) throw new Error('Error en la respuesta de red');
    const data = await res.json();
    
    tbody.innerHTML = '';
    
    // Invertimos el orden para que lo más reciente salga ARRIBA
    const reversedData = [...data].reverse();
    
    reversedData.forEach(item => {
      const tr = document.createElement('tr');
      
      // Formatear fecha (Día/Mes/Año)
      const d = new Date(item.date);
      const dateStr = isNaN(d) ? item.date : d.toLocaleString('es-ES');
      
      const tdDate = document.createElement('td');
      tdDate.textContent = dateStr;
      
      const tdPlc = document.createElement('td');
      tdPlc.textContent = item.plc || 'PLC1';
      tdPlc.style.fontWeight = 'bold';
      tdPlc.style.color = '#a29bfe';

      const tdTag = document.createElement('td');
      tdTag.textContent = item.tag || '';
      
      const tdDesc = document.createElement('td');
      tdDesc.textContent = item.desc || '';
      
      const tdStatus = document.createElement('td');
      tdStatus.textContent = item.status || '';
      
      // Estilo de color según estado
      if (item.status === 'ACTIVADA') {
        tdStatus.style.color = '#ff4444'; // Rojo brillante
        tdStatus.style.fontWeight = 'bold';
      } else if (item.status === 'NORMALIZADA') {
        tdStatus.style.color = '#44ff44'; // Verde brillante
      }
      
      tr.appendChild(tdDate);
      tr.appendChild(tdPlc);
      tr.appendChild(tdTag);
      tr.appendChild(tdDesc);
      tr.appendChild(tdStatus);
      
      tbody.appendChild(tr);
    });
    
    const now = new Date().toLocaleTimeString();
    msg.textContent = `Última actualización: ${now}`;
    
  } catch (err) {
    console.error('Error al cargar historial de alarmas:', err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ff4444;">Error al cargar historial</td></tr>';
    msg.textContent = 'Error al cargar';
  }
}

let alarmsInterval = null;

function init_alarms() {
  console.log("Inicializando Historial de Alarmas...");
  alarms_refreshHistory(); // Primera carga inmediata

  // Limpiar intervalo previo por seguridad
  if (alarmsInterval) clearInterval(alarmsInterval);

  // Auto-refresco cada 3 segundos
  alarmsInterval = setInterval(() => {
    // Solo refrescar si estamos viendo la tabla (para ahorrar recursos)
    const tbody = document.querySelector('#alarms-history-table tbody');
    if (tbody) {
      alarms_refreshHistory();
    } else {
      clearInterval(alarmsInterval);
    }
  }, 3000);
}

function update_alarms(data) {
  // Las alarmas globales se manejan en alarm-banner.js
  // Aquí podríamos actualizar el historial en tiempo real si fuera necesario,
  // pero por ahora lo dejamos bajo demanda con el botón Refrescar.
}

// Mantenemos la función original pero la hacemos disponible globalmente
window.m1_cmdResetAnomalie = function() {
  socket.emit('escribir_bit', { id: 'PLC1', addr: 61, bit: 1, value: 1 });
  setTimeout(() => {
    socket.emit('escribir_bit', { id: 'PLC1', addr: 61, bit: 1, value: 0 });
  }, 500);
};
