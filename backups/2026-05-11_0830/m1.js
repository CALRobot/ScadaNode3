// m1.js - lógica de la página Máquina 1 (PLC1)

// Direcciones para comandos (solo nos importa la W y el bit)
const CMD_ADDR = 60;          // pompa, resistencias, modo
const CMD_ADDR_CICLO = 61;    // start ciclo

// ==================================================
// Actualización de la página con los datos del PLC
// ==================================================
// Lógica de actualización y comandos
// ==================================================


function m1_update(data) {
  if (!data || data.id !== 'PLC1') return;

  // Nota: Los LEDs de cabecera se actualizan dentro del bloque de tags más abajo
  if (!data.tags) return;
  const tags = data.tags;  // <-- AQUÍ definimos 'tags' UNA vez

  // LED Pompa
  const ledPompa = document.getElementById('m1-led-pompa');
  if (ledPompa) {
    if (tags.FBK_POMPA_ACCESA) ledPompa.classList.add('on');
    else ledPompa.classList.remove('on');
  }

  // LED Resistencias
  const ledRes = document.getElementById('m1-led-res');
  if (ledRes) {
    if (tags.FBK_RESISTENZE_ACCESE) ledRes.classList.add('on');
    else ledRes.classList.remove('on');
  }

  // Modo Manual / Auto
  const modoTexto = document.getElementById('m1-modo-texto');
  if (modoTexto) {
    if (tags.FBK_MANUAL) {
      modoTexto.textContent = 'MANUAL';
    } else if (tags.FBK_AUTOMATICO) {
      modoTexto.textContent = 'AUTOMÁTICO';
    } else {
      modoTexto.textContent = '---';
    }
  }

  const ledCicloHeader = document.getElementById('m1-ciclo-led-header');
  const txtCicloHeader = document.getElementById('m1-ciclo-text-header');
  const ledCicloProHeader = document.getElementById('m1-pro-ciclo-led-header');
  const txtCicloProHeader = document.getElementById('m1-pro-ciclo-text-header');
  const inCiclo = !!tags.FBK_START_CICLO;

  const updateCicloUI = (led, txt) => {
    if (!led || !txt) return;
    if (inCiclo) {
      led.style.backgroundColor = '#28a745';
      led.style.boxShadow = '0 0 15px #28a745';
      txt.textContent = 'EN CICLO';
      txt.style.color = '#28a745';
    } else {
      led.style.backgroundColor = '#222';
      led.style.boxShadow = 'none';
      txt.textContent = 'PARADO';
      txt.style.color = '#777';
    }
  };

  updateCicloUI(ledCicloHeader, txtCicloHeader);
  updateCicloUI(ledCicloProHeader, txtCicloProHeader);

  // LED Ciclo (Cuerpo de la página clásica)
  const ledCiclo = document.getElementById('m1-led-ciclo');
  if (ledCiclo) {
    if (inCiclo) ledCiclo.classList.add('on');
    else ledCiclo.classList.remove('on');
  }

  const cicloTexto = document.getElementById('m1-ciclo-texto');
  if (cicloTexto) {
    if (tags.FBK_START_CICLO) {
      cicloTexto.textContent = 'CICLO EN MARCHA';
    } else if (tags.FBK_STOP_CICLO) {
      cicloTexto.textContent = 'CICLO PARADO';
    } else {
      cicloTexto.textContent = '---';
    }
  }

  console.log(
    'FBK_MANUAL:', tags.FBK_MANUAL,
    'FBK_AUTOMATICO:', tags.FBK_AUTOMATICO,
    'FBK_START_CICLO:', tags.FBK_START_CICLO,
    'FBK_STOP_CICLO:', tags.FBK_STOP_CICLO
  );



  // --- SP de temperatura mostrados en texto ---
  const tSpSup = document.getElementById('m1-temp-spSup');
  if (tSpSup && tags.TEMP_SP_SUP !== undefined) {
    tSpSup.textContent = tags.TEMP_SP_SUP;
  }

  const tSpInf = document.getElementById('m1-temp-spInf');
  if (tSpInf && tags.TEMP_SP_INF !== undefined) {
    tSpInf.textContent = tags.TEMP_SP_INF;
  }

  // --- Temperaturas reales molde ---
  const tSupReal = document.getElementById('m1-temp-sup-real');
  if (tSupReal && tags.TEMP_MOLDE_SUP !== undefined) {
    tSupReal.textContent = tags.TEMP_MOLDE_SUP;
  }

  const tInfReal = document.getElementById('m1-temp-inf-real');
  if (tInfReal && tags.TEMP_MOLDE_INF !== undefined) {
    tInfReal.textContent = tags.TEMP_MOLDE_INF;
  }

  // --- Producción ---
  const prodReal = document.getElementById('m1-prod-actual');
  if (prodReal && tags.PROD_ACTUAL_GOLPES !== undefined) {
    prodReal.textContent = tags.PROD_ACTUAL_GOLPES;
  }

  const tpoCiclo = document.getElementById('m1-tpo-ciclo');
  if (tpoCiclo && tags.TEMPO_CICLO_ULTIMO !== undefined) {
    tpoCiclo.textContent = tags.TEMPO_CICLO_ULTIMO;
  }

  const vasosReales = document.getElementById('m1-nro-formas');
  if (vasosReales && tags.NUMERO_DE_FORMAS !== undefined) {
    vasosReales.textContent = tags.NUMERO_DE_FORMAS;
  }

  // --- Energía ---
  const pActual = document.getElementById('m1-consumo-actual');
  if (pActual && tags.CONSUMO_ENERG_ACTUAL !== undefined) {
    pActual.textContent = tags.CONSUMO_ENERG_ACTUAL;
  }

  const eDia = document.getElementById('m1-consumo-medio');
  if (eDia && tags.CONSUMO_MEDIO_DIA !== undefined) {
    eDia.textContent = tags.CONSUMO_MEDIO_DIA;
  }

  // --- Serial / estado máquina ---
  const serial = document.getElementById('m1-serial');
  if (serial && tags.SERIAL_NUMBER_ENGI !== undefined) {
    serial.textContent = tags.SERIAL_NUMBER_ENGI;
  }

  const estadoMac = document.getElementById('m1-estado-mac');
  const statusText = document.getElementById('m1-status-text');

  if (tags.STATO_MACCHINA !== undefined) {
    const val = tags.STATO_MACCHINA;
    if (estadoMac) estadoMac.textContent = val;
 
    // Referencias a todos los LEDs de estado de la máquina
    const ledNormal = document.getElementById('m1-status-led');
    const ledProHeader = document.getElementById('m1-pro-status-led');
 
    const updateLed = (led) => {
      if (!led) return;
      led.className = 'status-led-large'; // Reset
      if (val === 1) led.classList.add('status-led--manual');
      else if (val === 2) led.classList.add('status-led--auto');
      else if (val === 3) led.classList.add('status-led--alarm');
    };
 
    updateLed(ledNormal);
    updateLed(ledProHeader);
 
    // Actualización de textos de estado
    const stTextNormal = document.getElementById('m1-status-text');
    const stTextPro = document.getElementById('m1-pro-status-text');
 
    const setStatusText = (el) => {
      if (!el) return;
      if (val === 1) { el.textContent = 'MODO MANUAL'; el.style.color = '#007bff'; }
      else if (val === 2) { el.textContent = 'MODO AUTOMÁTICO'; el.style.color = '#28a745'; }
      else if (val === 3) { el.textContent = 'FALLO / ALARMA'; el.style.color = '#dc3545'; }
      else { el.textContent = 'ESTADO INICIAL / OFF'; el.style.color = '#aaa'; }
    };
 
    setStatusText(stTextNormal);
    setStatusText(stTextPro);

  }

  // --- ACTUALIZACIÓN M1-PRO (SINÓPTICO) - SECCIÓN EXPERIMENTAL ---
  try {
    const proTempSup = document.getElementById('m1-pro-temp-sup');
    if (proTempSup) proTempSup.textContent = tags.TEMP_MOLDE_SUP || 0;

    const proTempInf = document.getElementById('m1-pro-temp-inf');
    if (proTempInf) proTempInf.textContent = tags.TEMP_MOLDE_INF || 0;

    const proProd = document.getElementById('m1-pro-prod-actual');
    if (proProd) proProd.textContent = tags.PROD_ACTUAL_GOLPES || 0;

    const proTpoCiclo = document.getElementById('m1-pro-tpo-ciclo');
    if (proTpoCiclo) proTpoCiclo.textContent = tags.TEMPO_CICLO_ULTIMO || 0;

    const proSerial = document.getElementById('m1-pro-serial');
    if (proSerial) proSerial.textContent = (tags.SERIAL_NUMBER_ENGI !== undefined) ? tags.SERIAL_NUMBER_ENGI : '---';

    // Efectos de Iconos (Motor y Resistencia)
    const iconMotor = document.querySelector('#m1-pro-icon-motor img');
    const glowMotor = document.getElementById('m1-pro-motor-glow');
    if (iconMotor && glowMotor) {
      const active = !!tags.FBK_POMPA_ACCESA;
      iconMotor.style.filter = active ? 'none' : 'grayscale(1)';
      glowMotor.style.opacity = active ? '1' : '0';
    }

    const iconRes = document.querySelector('#m1-pro-icon-res img');
    const glowRes = document.getElementById('m1-pro-res-glow');
    if (iconRes && glowRes) {
      const active = !!tags.FBK_RESISTENZE_ACCESE;
      iconRes.style.filter = active ? 'none' : 'grayscale(1)';
      glowRes.style.opacity = active ? '1' : '0';
    }
  } catch (err) {
    console.error('Error en actualización M1-PRO:', err);
  }
}

// ==================================================
// Envío de comandos (SET de bits en W60/W61)
// ==================================================
function m1_setBit(addr, bit, value) {
  // Ahora usamos el nuevo evento 'escribir_bit' que respeta el resto de los bits de la palabra
  socket.emit('escribir_bit', { id: 'PLC1', addr: addr, bit: bit, value: value });
}

// Estos se llaman desde los botones
function m1_cmdPompaStart() {
  m1_setBit(CMD_ADDR, 6, 1);   // CMD_START_POMPAOLEO → W60 bit 6
  setTimeout(() => m1_setBit(CMD_ADDR, 6, 0), 500);
}

function m1_cmdPompaStop() {
  m1_setBit(CMD_ADDR, 7, 1);   // CMD_STOP_POMPAOLEO  → W60 bit 7
  setTimeout(() => m1_setBit(CMD_ADDR, 7, 0), 500);
}

function m1_cmdResStart() {
  m1_setBit(CMD_ADDR, 4, 1);   // CMD_START_RESISTENZE → W60 bit 4
  setTimeout(() => m1_setBit(CMD_ADDR, 4, 0), 500);
}

function m1_cmdResStop() {
  m1_setBit(CMD_ADDR, 5, 1);   // CMD_STOP_RESISTENZE  → W60 bit 5
  setTimeout(() => m1_setBit(CMD_ADDR, 5, 0), 500);
}

// Modo Manual / Auto (Estados mantenidos mutuamente excluyentes)
function m1_cmdModoManual() {
  // Activar bit 8 (Manual) y desactivar bit 10 (Auto) en W61
  socket.emit('escribir_bit', { id: 'PLC1', addr: CMD_ADDR_CICLO, bit: 8, value: 1 });
  socket.emit('escribir_bit', { id: 'PLC1', addr: CMD_ADDR_CICLO, bit: 10, value: 0 });
}

function m1_cmdModoAuto() {
  // Activar bit 10 (Auto) y desactivar bit 8 (Manual) en W61
  socket.emit('escribir_bit', { id: 'PLC1', addr: CMD_ADDR_CICLO, bit: 10, value: 1 });
  socket.emit('escribir_bit', { id: 'PLC1', addr: CMD_ADDR_CICLO, bit: 8, value: 0 });
}

// Start Ciclo
function m1_cmdStartCiclo() {
  m1_setBit(CMD_ADDR_CICLO, 9, 1);  // CMD_START_CICLO → W61 bit 9     >> 512
  setTimeout(() => m1_setBit(CMD_ADDR_CICLO, 9, 0), 500);
}

// Stop Ciclo
function m1_cmdStopCiclo() {
  m1_setBit(CMD_ADDR_CICLO, 11, 1);  // CMD_STOP_CICLO → W61 bit 11    >>  2048
  setTimeout(() => m1_setBit(CMD_ADDR_CICLO, 11, 0), 500);
}

// Reset anomalías — tag CMD_RESET_ANOMALIE (W61 bit 1)
function m1_cmdResetAnomalie() {
  m1_setBit(CMD_ADDR_CICLO, 1, 1);
  setTimeout(() => m1_setBit(CMD_ADDR_CICLO, 1, 0), 500);
}

// SET POINTS DE TEMPERATURA SUP E INF
function m1_setSpSup() {
  const spSup = document.getElementById('m1-sp-sup');
  if (!spSup) return;

  const valor = parseInt(spSup.value, 10);
  console.log('m1_setSpSup valor:', spSup.value, '->', valor);

  if (Number.isNaN(valor)) {
    console.warn('m1_setSpSup: valor NO válido');
    return;
  }

  // OPCIÓN: escribir directamente R14 (W14) si está en rango de escritura
  socket.emit('escribir', { addr: 84, value: valor });
}

function m1_setSpInf() {
  const spInf = document.getElementById('m1-sp-inf');
  if (!spInf) return;

  const valor = parseInt(spInf.value, 10);
  console.log('m1_setSpInf valor:', spInf.value, '->', valor);

  if (Number.isNaN(valor)) {
    console.warn('m1_setSpInf: valor NO válido');
    return;
  }

  // OPCIÓN: escribir directamente R14 (W15) si está en rango de escritura
  socket.emit('escribir', { addr: 85, value: valor });
}
