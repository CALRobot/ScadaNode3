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
    
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay alarmas en el historial.</td></tr>';
      msg.textContent = '';
      return;
    }
    
    data.forEach(item => {
      const tr = document.createElement('tr');
      
      // Formatear fecha
      const d = new Date(item.date);
      const dateStr = isNaN(d) ? item.date : d.toLocaleString();
      
      const tdDate = document.createElement('td');
      tdDate.textContent = dateStr;
      
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

// Cargar la tabla una vez que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  alarms_refreshHistory();
  
  // Opcional: recargar historial cuando se hace clic en la pestaña de alarmas
  const alarmTab = document.querySelector('.menu-link[data-page="page-alarms"]');
  if (alarmTab) {
    alarmTab.addEventListener('click', () => {
      alarms_refreshHistory();
    });
  }
});
