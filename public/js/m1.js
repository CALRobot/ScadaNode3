// m1.js - lógica de la página Máquina 1 (PLC1)

// Direcciones para comandos
const CMD_ADDR = 60;          // pompa, resistencias, modo
const CMD_ADDR_CICLO = 61;    // start ciclo

// ==================================================
// Actualización de la página con los datos del PLC
// ==================================================
function update_m1(data) {
  if (!data || data.id !== 'PLC1' || !data.tags) return;
  const tags = data.tags;

  // --- Cabecera (Estados y Modos) ---
  const txtAuto = document.getElementById('m1-txt-auto');
  const ledAuto = document.getElementById('m1-led-auto');
  if (txtAuto && ledAuto) {
    if (tags.FBK_MANUAL) {
      txtAuto.textContent = 'MODO MANUAL';
      txtAuto.style.color = '#007bff';
      ledAuto.className = 'led on';
      ledAuto.style.backgroundColor = '#007bff';
      ledAuto.style.boxShadow = '0 0 10px #007bff';
    } else if (tags.FBK_AUTOMATICO) {
      txtAuto.textContent = 'MODO AUTOMÁTICO';
      txtAuto.style.color = '#28a745';
      ledAuto.className = 'led on';
      ledAuto.style.backgroundColor = '#28a745';
      ledAuto.style.boxShadow = '0 0 10px #28a745';
    } else {
      txtAuto.textContent = 'MODO OFF';
      txtAuto.style.color = '#777';
      ledAuto.className = 'led';
      ledAuto.style.backgroundColor = '';
      ledAuto.style.boxShadow = '';
    }
  }

  const inCiclo = !!tags.FBK_START_CICLO;
  const txtCicloHeader = document.getElementById('m1-txt-ciclo');
  const ledCicloHeader = document.getElementById('m1-led-ciclo');
  const ledCicloCard = document.getElementById('m1-led-ciclo-card');

  if (txtCicloHeader && ledCicloHeader) {
    if (inCiclo) {
      ledCicloHeader.classList.add('on');
      ledCicloHeader.style.backgroundColor = '#28a745';
      ledCicloHeader.style.boxShadow = '0 0 15px #28a745';
      txtCicloHeader.textContent = 'EN CICLO';
      txtCicloHeader.style.color = '#28a745';
    } else {
      ledCicloHeader.classList.remove('on');
      ledCicloHeader.style.backgroundColor = '';
      ledCicloHeader.style.boxShadow = 'none';
      txtCicloHeader.textContent = 'PARADO';
      txtCicloHeader.style.color = '#777';
    }
  }

  if (ledCicloCard) {
    if (inCiclo) {
      ledCicloCard.style.backgroundColor = '#28a745';
      ledCicloCard.style.boxShadow = '0 0 10px #28a745';
    } else {
      ledCicloCard.style.backgroundColor = '#444';
      ledCicloCard.style.boxShadow = 'none';
    }
  }

  // --- Mandos y LEDs Laterales ---
  const ledHidra = document.getElementById('m1-led-hidra');
  if (ledHidra) {
    ledHidra.classList.toggle('on', !!tags.FBK_POMPA_ACCESA);
  }

  const ledRes = document.getElementById('m1-led-res');
  if (ledRes) {
    ledRes.classList.toggle('on', !!tags.FBK_RESISTENZE_ACCESE);
  }

  // --- Overlays Sinópticos (Valores sobre la imagen) ---
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.textContent = val;
  };

  setVal('m1-val-real-sup', tags.TEMP_MOLDE_SUP);
  setVal('m1-val-real-inf', tags.TEMP_MOLDE_INF);
  setVal('m1-val-prod-real', tags.PROD_ACTUAL_GOLPES);
  setVal('m1-val-ciclo-time', tags.TEMPO_CICLO_ULTIMO);

  // --- Iconos Flotantes (Imágenes que cambian de color) ---
  const imgRes = document.getElementById('m1-img-res');
  if (imgRes) {
    imgRes.className = tags.FBK_RESISTENZE_ACCESE ? 'icon-img active' : 'icon-img gray';
  }

  const imgMotor = document.getElementById('m1-img-motor');
  if (imgMotor) {
    imgMotor.className = tags.FBK_POMPA_ACCESA ? 'icon-img active' : 'icon-img gray';
  }

  // --- Otros Datos ---
  setVal('m1-val-estado', tags.STATO_MACCHINA === 1 ? 'MANUAL' : tags.STATO_MACCHINA === 2 ? 'AUTO' : tags.STATO_MACCHINA === 3 ? 'ALARMA' : '---');
  setVal('m1-val-serial', tags.SERIAL_NUMBER_ENGI);
}

// ==================================================
// Envío de comandos
// ==================================================
function m1_setBit(addr, bit, value) {
  socket.emit('escribir_bit', { id: 'PLC1', addr: addr, bit: bit, value: value });
}

// --- HIDRAULICA ---
function m1_cmdHidra(state) {
  if (state === 1) {
    m1_setBit(CMD_ADDR, 6, 1);   // CMD_START_POMPAOLEO (W60 bit 6)
    setTimeout(() => m1_setBit(CMD_ADDR, 6, 0), 500);
  } else {
    m1_setBit(CMD_ADDR, 7, 1);   // CMD_STOP_POMPAOLEO (W60 bit 7)
    setTimeout(() => m1_setBit(CMD_ADDR, 7, 0), 500);
  }
}

// --- RESISTENCIAS ---
function m1_cmdRes(state) {
  if (state === 1) {
    m1_setBit(CMD_ADDR, 4, 1);   // CMD_START_RESISTENZE (W60 bit 4)
    setTimeout(() => m1_setBit(CMD_ADDR, 4, 0), 500);
  } else {
    m1_setBit(CMD_ADDR, 5, 1);   // CMD_STOP_RESISTENZE (W60 bit 5)
    setTimeout(() => m1_setBit(CMD_ADDR, 5, 0), 500);
  }
}

// --- MODO DE TRABAJO ---
function m1_cmdModo(state) {
  if (state === 1) { // AUTO
    socket.emit('escribir_bit', { id: 'PLC1', addr: CMD_ADDR_CICLO, bit: 10, value: 1 });
    socket.emit('escribir_bit', { id: 'PLC1', addr: CMD_ADDR_CICLO, bit: 8, value: 0 });
  } else { // MANUAL
    socket.emit('escribir_bit', { id: 'PLC1', addr: CMD_ADDR_CICLO, bit: 8, value: 1 });
    socket.emit('escribir_bit', { id: 'PLC1', addr: CMD_ADDR_CICLO, bit: 10, value: 0 });
  }
}

// --- CICLO AUTOMATICO ---
function m1_cmdCiclo(state) {
  if (state === 1) {
    m1_setBit(CMD_ADDR_CICLO, 9, 1);  // CMD_START_CICLO (W61 bit 9)
    setTimeout(() => m1_setBit(CMD_ADDR_CICLO, 9, 0), 500);
  } else {
    m1_setBit(CMD_ADDR_CICLO, 11, 1);  // CMD_STOP_CICLO (W61 bit 11)
    setTimeout(() => m1_setBit(CMD_ADDR_CICLO, 11, 0), 500);
  }
}

// --- SETPOINTS Y VALORES NUMERICOS ---
function m1_cmdSetReceta() {
  const el = document.getElementById('m1-in-receta');
  if (!el) return;
  const valor = parseInt(el.value, 10);
  if (!Number.isNaN(valor)) {
    // RECETA_VASO es W72
    socket.emit('escribir', { id: 'PLC1', addr: 72, value: valor });
  }
}

function m1_cmdSetSpSup() {
  const el = document.getElementById('m1-in-sp-sup');
  if (!el) return;
  const valor = parseInt(el.value, 10);
  if (!Number.isNaN(valor)) {
    // CMD_TEMP_SPSUP es W84
    socket.emit('escribir', { id: 'PLC1', addr: 84, value: valor });
  }
}

function m1_cmdSetSpInf() {
  const el = document.getElementById('m1-in-sp-inf');
  if (!el) return;
  const valor = parseInt(el.value, 10);
  if (!Number.isNaN(valor)) {
    // CMD_TEMP_SPINF es W85
    socket.emit('escribir', { id: 'PLC1', addr: 85, value: valor });
  }
}

function m1_cmdSetProdSp() {
  const el = document.getElementById('m1-in-prod-sp');
  if (!el) return;
  const valor = parseInt(el.value, 10);
  if (!Number.isNaN(valor)) {
    // SET_NUM_CICLOS_AL_STOP original en lectura es W39, usamos el mismo si hay offset o simplemente un placeholder (en modbus puede ser que W39 es lectura y otra en escritura)
    // Dejaremos W39 como fallback por si es Hold Register real
    console.log('Enviando SP Produccion a W39:', valor);
    socket.emit('escribir', { id: 'PLC1', addr: 39, value: valor });
  }
}

function m1_cmdSetFormas() {
  const el = document.getElementById('m1-in-formas');
  if (!el) return;
  const valor = parseInt(el.value, 10);
  if (!Number.isNaN(valor)) {
    // RECETA_NUM_FORMAS_MOLDE es W76
    socket.emit('escribir', { id: 'PLC1', addr: 76, value: valor });
  }
}
