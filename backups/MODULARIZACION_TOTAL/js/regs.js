// regs.js - página de registros (lectura/escritura)

// Rango definido en plc.json: 0-59 lectura, 60-119 escritura
const READ_START = 0;
const READ_LEN   = 60;
const WRITE_START = 60;
const WRITE_LEN   = 60;

// Se llama desde main.js cuando el DOM ya está listo
function initRegs() {
  const readDiv = document.getElementById('list-read');
  const writeDiv = document.getElementById('list-write');
  if (!readDiv || !writeDiv) return;

  // Generar filas de lectura R0..R59
  for (let i = READ_START; i < READ_START + READ_LEN; i++) {
    readDiv.innerHTML += `
      <div class="item">
        <span>R${i}</span>
        <b id="r_val_${i}">0</b>
      </div>
    `;
  }
  
  // Generar filas de escritura R60..R119
  for (let i = WRITE_START; i < WRITE_START + WRITE_LEN; i++) {
    writeDiv.innerHTML += `
      <div class="item">
        <span>R${i}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <b id="w_val_${i}">0</b>      <!-- valor actual en PLC -->
          <input type="number" id="w_in_${i}" value="0" min="0" max="65535">
          <button onclick="enviarRegistro(${i}, event)">SET</button>
        </div>
      </div>
    `;
  }
}

// Actualizar los valores de lectura (R0..R59) con los datos del PLC
function actualizarRegs(data) {
  if (!data || !data.regs) return;

  // Lectura 0..59
  for (let i = READ_START; i < READ_START + READ_LEN; i++) {
    const el = document.getElementById('r_val_' + i);
    if (el) el.textContent = data.regs[i] ?? 0;
  }

  // Escritura 60..119: mostrar también valor real del PLC
  for (let i = WRITE_START; i < WRITE_START + WRITE_LEN; i++) {
    const el = document.getElementById('w_val_' + i);
    if (el) el.textContent = data.regs[i] ?? 0;
  }
}

// Enviar escritura de un registro de la zona de escritura (R60..R119)
function enviarRegistro(addr, event) {
  const input = document.getElementById('w_in_' + addr);
  if (!input) return;

  const val = parseInt(input.value);
  if (Number.isNaN(val) || val < 0 || val > 65535) {
    alert('Valor inválido (debe ser 0..65535)');
    return;
  }

  // Enviar al servidor vía Socket.IO
  socket.emit('escribir', { addr, value: val });

  // Feedback visual en el botón
  const btn = event.target;
  btn.textContent = 'OK';
  btn.classList.add('btn-success');
  setTimeout(() => {
    btn.textContent = 'SET';
    btn.classList.remove('btn-success');
  }, 600);
}