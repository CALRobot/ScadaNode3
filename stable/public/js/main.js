// public/js/main.js - Carga Modular Dinámica
const socket = io();
let currentPageId = 'home';
let currentStyleLink = null;
let currentScriptTag = null;

document.addEventListener('DOMContentLoaded', () => {
  initReloj();

  // Configurar clicks del menú
  document.querySelectorAll('.menu-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');

      // Actualizar estado activo en el menú
      document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      showPage(page);
    });
  });

  // Cargar primera página
  showPage('home');
});

/* Reloj (forzamos formato es-ES)
function initReloj() {
  setInterval(() => {
    const reloj = document.getElementById('reloj');
    if (reloj) reloj.innerText = new Date().toLocaleString('es-ES');
  }, 1000);
}
*/

function initReloj() {
  setInterval(() => {
    const reloj = document.getElementById('reloj');
    if (reloj) {
      const ahora = new Date();

      // 1. Formato de fecha, día y hora
      const opciones = {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      };
      let textoBase = ahora.toLocaleString('es-ES', opciones).replace(',', ' -');

      // 2. Cálculo de la semana del año (ISO 8601)
      const d = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const semana = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

      // 3. Montar el texto final con la barra
      reloj.innerText = `${textoBase} | SEM: ${semana}  `;
    }
  }, 1000);
}

// Carga Modular de Páginas, CSS y JS
async function showPage(pageId) {
  currentPageId = pageId;
  const container = document.getElementById('main-content-area');
  if (!container) return;

  // Sincronizar el menú lateral (poner en active el link correspondiente)
  document.querySelectorAll('.menu-link').forEach(link => {
    if (link.getAttribute('data-page') === pageId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 1. Cargar el HTML
  try {
    const res = await fetch(`pages/${pageId}.html`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    container.innerHTML = await res.text();
  } catch (error) {
    container.innerHTML = `<div style="color: #ef4444; padding: 20px;">
      <h2>Error al cargar pages/${pageId}.html</h2>
      <p>${error.message}</p>
    </div>`;
    return;
  }

  // 2. Cargar el CSS específico de la página
  if (currentStyleLink) {
    document.head.removeChild(currentStyleLink);
    currentStyleLink = null;
  }

  const cssUrl = `css/${pageId}.css`;
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = cssUrl;

  // Manejo de errores para CSS opcional (no todas las páginas necesitan uno)
  styleLink.onload = () => { currentStyleLink = styleLink; };
  styleLink.onerror = () => {
    // Si no existe, simplemente removemos el elemento que falló
    if (styleLink.parentNode) styleLink.parentNode.removeChild(styleLink);
  };
  document.head.appendChild(styleLink);

  // 3. Inicializar lógica específica si el JS ya está cargado o cargarlo
  loadPageScript(pageId);
}

function loadPageScript(pageId) {
  // Primero verificamos si ya existe el script de inicialización global
  const initFuncName = `init_${pageId}`;

  if (typeof window[initFuncName] === 'function') {
    window[initFuncName]();
    return;
  }

  // Si no existe, intentamos cargar el archivo .js dinámicamente
  if (currentScriptTag && currentScriptTag.getAttribute('data-page') !== pageId) {
    // Nota: Remover el tag de script no descarga las variables globales, 
    // pero mantiene el DOM limpio.
    document.body.removeChild(currentScriptTag);
    currentScriptTag = null;
  }

  const jsUrl = `js/${pageId}.js`;
  const scriptTag = document.createElement('script');
  scriptTag.src = jsUrl;
  scriptTag.setAttribute('data-page', pageId);

  scriptTag.onload = () => {
    currentScriptTag = scriptTag;
    if (typeof window[initFuncName] === 'function') {
      window[initFuncName]();
    }
  };

  scriptTag.onerror = () => {
    if (scriptTag.parentNode) scriptTag.parentNode.removeChild(scriptTag);
  };

  document.body.appendChild(scriptTag);
}

// Actualizaciones del PLC
socket.on('plc_update', (data) => {
  actualizarStatus(data);

  // Actualizar página actual si tiene función de update
  if (currentPageId === 'home' && typeof update_home === 'function') update_home(data);
  else if (currentPageId === 'layout' && typeof update_layout === 'function') update_layout(data);
  else if (currentPageId === 'm1' && typeof update_m1 === 'function') update_m1(data);
  else if (currentPageId === 'regs' && typeof update_regs === 'function') update_regs(data);
  else if (currentPageId === 'alarms' && typeof update_alarms === 'function') update_alarms(data);
  else if (currentPageId === 'recipes' && typeof update_recipes === 'function') update_recipes(data);

  // Las alarmas globales se actualizan siempre
  if (typeof alarmBanner_update === 'function') {
    alarmBanner_update(data);
  }
});

function actualizarStatus(data) {
  const st = document.getElementById('status');
  if (!st) return;
  st.className = data.status ? 'online' : 'offline';
  st.textContent = data.status ? '● PLC ONLINE' : '○ PLC OFFLINE - Verifique IP/Puerto en plcs.json, Servidor Node y que el PLC esté en RUN';

  if (!data.tags) return;
  const tags = data.tags;

  // 1. LED Estado Actual (STATO_MACCHINA - W43)
  const ledEstado = document.getElementById('led-estado');
  const txtEstado = document.getElementById('txt-estado');
  if (ledEstado && txtEstado) {
    const s = tags.STATO_MACCHINA;
    if (s === 1) { // MANUAL
      ledEstado.style.backgroundColor = '#007bff';
      ledEstado.style.boxShadow = '0 0 10px #007bff';
      txtEstado.textContent = 'MANUAL';
      txtEstado.style.color = '#007bff';
    } else if (s === 2) { // AUTO
      ledEstado.style.backgroundColor = '#28a745';
      ledEstado.style.boxShadow = '0 0 10px #28a745';
      txtEstado.textContent = 'AUTOMÁTICO';
      txtEstado.style.color = '#28a745';
    } else if (s === 3) { // ALARMA
      ledEstado.style.backgroundColor = '#dc3545';
      ledEstado.style.boxShadow = '0 0 10px #dc3545';
      txtEstado.textContent = 'FALLO';
      txtEstado.style.color = '#dc3545';
    } else {
      ledEstado.style.backgroundColor = '#444';
      ledEstado.style.boxShadow = 'none';
      txtEstado.textContent = 'DESCONECTADO';
      txtEstado.style.color = '#777';
    }
  }

  // 2. LED Ciclo / Producción (FBK_START_CICLO - W1.9)
  const containerCiclo = document.getElementById('led-ciclo-container');
  const ledCiclo = document.getElementById('led-ciclo');
  const txtCiclo = document.getElementById('txt-ciclo');
  
  if (containerCiclo && ledCiclo && txtCiclo) {
    containerCiclo.style.display = 'flex'; // Siempre visible
    if (tags.FBK_START_CICLO) {
      ledCiclo.style.backgroundColor = '#22c55e';
      ledCiclo.style.boxShadow = '0 0 15px #22c55e';
      txtCiclo.textContent = 'EN PRODUCCIÓN';
      txtCiclo.style.color = '#22c55e';
    } else {
      ledCiclo.style.backgroundColor = '#3f3f46';
      ledCiclo.style.boxShadow = 'none';
      txtCiclo.textContent = 'MÁQUINA PARADA';
      txtCiclo.style.color = '#71717a';
    }
  }
}