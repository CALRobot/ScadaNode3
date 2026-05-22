// public/js/layout.js - VERSIÓN ULTRA-ESTABLE

function init_layout() {
  console.log("Layout inicializado - Forzando PLC1.");
}

function update_layout(data) {
  if (!data || !data.tags) return;
  const tags = data.tags;
  const isOnline = !!data.status;
  const pId = 'PLC1'; // Forzamos para las búsquedas de IDs

  // LEDs de conexión
  const ledStatus = document.getElementById(`mcard-${pId}-status-led`);
  const txtStatus = document.getElementById(`mcard-${pId}-status-txt`);
  if (ledStatus) ledStatus.className = isOnline ? 'led-status online' : 'led-status offline';
  if (txtStatus) {
    txtStatus.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
    txtStatus.className = isOnline ? 'badge online' : 'badge';
  }

  if (!isOnline) return;

  // Stats
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = val;
  };
  setVal(`mcard-${pId}-temp`, (tags.TEMP_MOLDE_SUP || 0) + '<small>°C</small>');
  setVal(`mcard-${pId}-prod`, tags.PROD_ACTUAL_GOLPES || 0);
  setVal(`mcard-${pId}-time`, (tags.TEMPO_CICLO_ULTIMO || 0) + '<small>ms</small>');

  // LEDs Mandos
  const setLed = (id, state) => {
    const el = document.getElementById(id);
    if (el) el.className = state ? 'led-small on' : 'led-small';
  };
  setLed(`mcard-${pId}-led-pompa`, !!tags.FBK_POMPA_ACCESA);
  setLed(`mcard-${pId}-led-res`, !!tags.FBK_RESISTENZE_ACCESE);
  setLed(`mcard-${pId}-led-ciclo`, !!tags.FBK_START_CICLO);

  // LED Modo
  const ledModo = document.getElementById(`mcard-${pId}-led-modo`);
  if (ledModo) {
    if (tags.FBK_MANUAL) ledModo.style.backgroundColor = '#007bff';
    else if (tags.FBK_AUTOMATICO) ledModo.style.backgroundColor = '#22c55e';
    else ledModo.style.backgroundColor = '#333';
  }
}

function layout_cmd(ignoreId, type, state) {
  const pId = 'PLC1'; // Ignoramos lo que venga y forzamos PLC1
  console.log("Comando Forzado PLC1:", type, state);
  
  if (type === 'pompa') {
    const bit = (state === 1) ? 6 : 7;
    socket.emit('escribir_bit', { id: pId, addr: 60, bit: bit, value: 1 });
    setTimeout(() => socket.emit('escribir_bit', { id: pId, addr: 60, bit: bit, value: 0 }), 500);
  } 
  else if (type === 'res') {
    const bit = (state === 1) ? 4 : 5;
    socket.emit('escribir_bit', { id: pId, addr: 60, bit: bit, value: 1 });
    setTimeout(() => socket.emit('escribir_bit', { id: pId, addr: 60, bit: bit, value: 0 }), 500);
  } 
  else if (type === 'ciclo') {
    const bit = (state === 1) ? 9 : 11;
    socket.emit('escribir_bit', { id: pId, addr: 61, bit: bit, value: 1 });
    setTimeout(() => socket.emit('escribir_bit', { id: pId, addr: 61, bit: bit, value: 0 }), 500);
  }
  else if (type === 'modo') {
    if (state === 1) { // AUTO
      socket.emit('escribir_bit', { id: pId, addr: 61, bit: 10, value: 1 });
      setTimeout(() => socket.emit('escribir_bit', { id: pId, addr: 61, bit: 10, value: 0 }), 500);
      socket.emit('escribir_bit', { id: pId, addr: 61, bit: 8, value: 0 });
    } else { // MANUAL
      socket.emit('escribir_bit', { id: pId, addr: 61, bit: 8, value: 1 });
      setTimeout(() => socket.emit('escribir_bit', { id: pId, addr: 61, bit: 8, value: 0 }), 500);
      socket.emit('escribir_bit', { id: pId, addr: 61, bit: 10, value: 0 });
    }
  }
}

function layout_globalCmd(type, state) {
  const pId = 'PLC1';
  console.log("[LAYOUT GLOBAL] Comando:", type, state);

  if (type === 'stop_all') {
    // Parar todo con pequeñas esperas para no saturar
    layout_cmd(pId, 'ciclo', 0); // STOP CICLO (Bit 11)
    setTimeout(() => layout_cmd(pId, 'pompa', 0), 100); // STOP BOMBA (Bit 7)
    setTimeout(() => layout_cmd(pId, 'res', 0), 200);   // STOP RES (Bit 5)
  } else if (type === 'start_all') {
    // Arrancar todo (Bombas -> Resistencias -> Ciclo)
    layout_cmd(pId, 'pompa', 1);
    setTimeout(() => layout_cmd(pId, 'res', 1), 100);
    setTimeout(() => layout_cmd(pId, 'ciclo', 1), 200);
  } else {
    // Para 'modo', 'pompa', 'res', etc.
    layout_cmd(pId, type, state);
  }
}
