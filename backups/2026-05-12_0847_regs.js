// public/js/regs.js

function init_regs() {
  console.log("Página de Registros cargada. Inicializando tablas...");
  renderRegsTables();
}

function renderRegsTables() {
  // Generar tabla izquierda (Lectura R0 - R59)
  const tbodyRead = document.querySelector('#table-read tbody');
  if (tbodyRead) {
    let htmlRead = '';
    for (let i = 0; i < 60; i++) {
      htmlRead += `
        <tr>
          <td class="reg-label">R${i}</td>
          <td class="reg-value" id="reg-val-${i}">---</td>
        </tr>
      `;
    }
    tbodyRead.innerHTML = htmlRead;
  }

  // Generar tabla derecha (Lectura/Escritura R60 - R119)
  const tbodyWrite = document.querySelector('#table-write tbody');
  if (tbodyWrite) {
    let htmlWrite = '';
    for (let i = 60; i < 120; i++) {
      htmlWrite += `
        <tr>
          <td class="reg-label">R${i}</td>
          <td class="reg-value" id="reg-val-${i}">---</td>
          <td>
            <div class="write-control">
              <input type="number" id="reg-input-${i}" class="inp" placeholder="0">
              <button class="btn btn-sm btn-primary" onclick="setRegistro(${i})">Set</button>
            </div>
          </td>
        </tr>
      `;
    }
    tbodyWrite.innerHTML = htmlWrite;
  }
}

function update_regs(data) {
  if (!data || !data.regs) return;
  
  // Actualizar todos los registros de 0 a 119 si existen en los datos
  for (let i = 0; i < 120; i++) {
    const el = document.getElementById(`reg-val-${i}`);
    if (el && data.regs[i] !== undefined) {
      el.textContent = data.regs[i];
    }
  }
}

// Función para enviar escritura al PLC (Puerto 4000, jsmodbus backend vía socket.io)
function setRegistro(addr) {
  const inputEl = document.getElementById(`reg-input-${addr}`);
  if (!inputEl) return;
  
  const value = parseInt(inputEl.value);
  if (isNaN(value)) {
    alert("Por favor, introduce un número válido.");
    return;
  }
  
  // Emitir evento al servidor Node.js que maneja jsmodbus
  socket.emit('escribir', { id: 'PLC1', addr: addr, value: value });
  
  // Opcional: limpiar el input tras enviarlo
  inputEl.value = '';
}
