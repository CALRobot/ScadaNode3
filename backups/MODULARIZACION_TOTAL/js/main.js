// main.js - SCADA Node3 demo + registros

// Socket.IO cliente
const socket = io();

// Al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  initReloj();
  initNavigation();
  initRegs();   // ← importante: genera las tablas de registros
  initThemeToggle(); 
});

// ============================================================
// FUNCIONES DE MANDO MAESTRO (GLOBALES)
// ============================================================

/**
 * Conexión Global de PLCs (Pausa/Reanuda comunicación)
 * 0 = Conectar, 1 = Desconectar
 */
function master_cmdGlobalConn(value) {
  const isPaused = (value === 1);
  console.log(`[MASTER] Conexión Global -> ${isPaused ? 'DESCONECTAR' : 'CONECTAR'}`);
  socket.emit('toggle_plc_connection', { id: 'PLC1', paused: isPaused });
  // Si tuvieras más PLCs, los añadirías aquí:
  // socket.emit('toggle_plc_connection', { id: 'PLC2', paused: isPaused });
}

/**
 * Control Global de Hidráulica (W60 bit 1)
 */
function master_cmdGlobalHidra(value) {
  console.log(`[MASTER] Hidráulica Global -> ${value}`);
  // Enviamos a PLC1 (y podrías añadir PLC2, PLC3...)
  socket.emit('escribir_bit', { id: 'PLC1', addr: 60, bit: 1, value: value });
  // showToast(`Hidráulica Global: ${value ? 'ON' : 'OFF'}`);
}

/**
 * Control Global de Resistencias (W60 bit 0)
 */
function master_cmdGlobalRes(value) {
  console.log(`[MASTER] Resistencias Global -> ${value}`);
  socket.emit('escribir_bit', { id: 'PLC1', addr: 60, bit: 0, value: value });
}

/**
 * Cambio de Modo Global (W60 bit 2)
 * 0 = Manual, 1 = Automático
 */
function master_cmdGlobalModo(value) {
  console.log(`[MASTER] Modo Global -> ${value ? 'AUTO' : 'MANUAL'}`);
  socket.emit('escribir_bit', { id: 'PLC1', addr: 60, bit: 2, value: value });
}

/**
 * START Maestro (Flanco en W60 bit 9)
 */
function master_cmdGlobalStart() {
  console.log('[MASTER] START Global');
  // Pulso de 500ms
  socket.emit('escribir_bit', { id: 'PLC1', addr: 60, bit: 9, value: 1 });
  setTimeout(() => {
    socket.emit('escribir_bit', { id: 'PLC1', addr: 60, bit: 9, value: 0 });
  }, 500);
}

/**
 * STOP Maestro (Flanco en W60 bit 10)
 */
function master_cmdGlobalStop() {
  console.log('[MASTER] STOP Global');
  // Pulso de 500ms
  socket.emit('escribir_bit', { id: 'PLC1', addr: 60, bit: 10, value: 1 });
  setTimeout(() => {
    socket.emit('escribir_bit', { id: 'PLC1', addr: 60, bit: 10, value: 0 });
  }, 500);
}

// Función de Tema Moderno
function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  
  // Cargar preferencia guardada
  const isModern = (localStorage.getItem('scada-theme') === 'modern');
  if (isModern) {
    document.body.classList.add('theme-modern');
    updateFavicon('#7c3aed');
  } else {
    updateFavicon('#0f0');
  }
  
  // Evento del botón
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('theme-modern');
    const nowModern = document.body.classList.contains('theme-modern');
    if (nowModern) {
      localStorage.setItem('scada-theme', 'modern');
      updateFavicon('#7c3aed');
    } else {
      localStorage.setItem('scada-theme', 'classic');
      updateFavicon('#0f0');
    }
  });
}

function updateFavicon(color) {
  const oldFavicon = document.getElementById('favicon');
  const cleanColor = color.replace('#', '%23');
  const svg = `<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect x=%2210%22 y=%2210%22 width=%2280%22 height=%2260%22 rx=%225%22 fill=%22black%22 stroke=%22${cleanColor}%22 stroke-width=%225%22/><path d=%22M30 70 L20 90 L80 90 L70 70%22 fill=%22black%22 stroke=%22${cleanColor}%22 stroke-width=%225%22/></svg>`;
  
  const newFavicon = document.createElement('link');
  newFavicon.id = 'favicon';
  newFavicon.rel = 'icon';
  newFavicon.href = `data:image/svg+xml,${svg}`;
  
  if (oldFavicon) {
    document.head.removeChild(oldFavicon);
  }
  document.head.appendChild(newFavicon);
}

// Reloj
function initReloj() {
  setInterval(() => {
    const reloj = document.getElementById('reloj');
    if (reloj) {
      const now = new Date();
      const dateStr = now.toLocaleString();
      
      // Calcular número de semana (ISO 8601)
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      
      reloj.innerText = `${dateStr} | Semana: ${weekNo}`;
    }
  }, 1000);
}

// Navegación
function initNavigation() {
  const links = document.querySelectorAll('.menu-link');
  const pages = document.querySelectorAll('.content');

  links.forEach(link => {
    link.addEventListener('click', () => {
      const pageId = link.dataset.page;

      links.forEach(l => l.classList.remove('active'));
      pages.forEach(p => p.classList.remove('active'));

      link.classList.add('active');
      document.getElementById(pageId).classList.add('active');
    });
  });
}

// Recibir actualización del PLC
socket.on('plc_update', (data) => {
  console.log('PLC_UPDATE', data);   // <<< AÑADIDO PARA VIA F12 VER EN EL BROWSER QUE CONTIENE
	
  // Lo que ya tengas:
  actualizarStatus(data);      // si lo usas
  actualizarRegsDemo(data);    // página A-INICIO  >>  R0..R9
  actualizarRegs(data);        // página B-REGISTROS  >>  página REGISTROS

  // Nueva página Máquina 1
  m1_update(data);             // página M1 >> maquina 1

  // Página Recetas
  if (typeof recipes_onPlcUpdate === 'function') {
    recipes_onPlcUpdate(data);
  }

  // Franja global de alarmas (PLC1)
  if (typeof alarmBanner_update === 'function') {
    alarmBanner_update(data);
  }

  // Actualizar LED de estado en el Layout (General)
  if (data.tags && data.tags.STATO_MACCHINA !== undefined) {
    const val = data.tags.STATO_MACCHINA;
    const layoutLed = document.getElementById(`mcard-${data.id}-status-led`);
    if (layoutLed) {
      layoutLed.className = 'status-led-large'; // Reset
      if (val === 1) layoutLed.classList.add('status-led--manual');
      else if (val === 2) layoutLed.classList.add('status-led--auto');
      else if (val === 3) layoutLed.classList.add('status-led--alarm');
    }
  }
});

// Estado PLC (cabecera y mensaje)
function actualizarStatus(data) {
  const statusEl = document.getElementById('status');
  const msgEl = document.getElementById('msg');
  if (!statusEl) return;

  if (data.status) {
    statusEl.classList.remove('offline');
    statusEl.classList.add('online');
    statusEl.textContent = '● PLC ONLINE';

    if (msgEl) {
      msgEl.textContent = 'Conectado al PLC. Leyendo registros...';
    }
  } else {
    statusEl.classList.remove('online');
    statusEl.classList.add('offline');
    statusEl.textContent = '○ PLC OFFLINE';

    if (msgEl) {
      msgEl.textContent = 'No hay conexión con el PLC.';
    }
  }
}

// Demo de R0..R9 en la página de inicio
function actualizarRegsDemo(data) {
  const list = document.getElementById('regs-list');
  if (!list || !data.regs) return;

  let html = '';
  for (let i = 0; i < 10; i++) {
    const val = data.regs[i] ?? 0;
    html += `<li>R${i} = ${val}</li>`;
  }
  list.innerHTML = html;
}