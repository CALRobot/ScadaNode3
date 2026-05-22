// public/js/regs.js

function init_regs() {
  console.log("Página de Registros cargada. Inicializando tablas...");
  renderRegsTables();
}

function renderRegsTables() {
  const tbodyRead = document.querySelector('#table-read tbody');
  if (tbodyRead) {
    let htmlRead = '';
    for (let i = 0; i < 60; i++) {
      const tag = TAGS_DICT.find(t => t.word === i && t.bit === null);
      const tagName = tag ? tag.name : '';
      const tagDesc = tag ? tag.desc : '';
      
      htmlRead += `
        <tr>
          <td class="reg-label">W${i}</td>
          <td class="reg-tag">
            <div class="tag-name">${tagName}</div>
            <div class="tag-desc">${tagDesc}</div>
          </td>
          <td class="reg-value" id="reg-val-${i}">---</td>
        </tr>
      `;
    }
    tbodyRead.innerHTML = htmlRead;
  }

  const tbodyWrite = document.querySelector('#table-write tbody');
  if (tbodyWrite) {
    let htmlWrite = '';
    for (let i = 60; i < 120; i++) {
      const tag = TAGS_DICT.find(t => t.word === i && t.bit === null);
      const tagName = tag ? tag.name : '';
      const tagDesc = tag ? tag.desc : '';
      
      htmlWrite += `
        <tr>
          <td class="reg-label">W${i}</td>
          <td class="reg-tag">
            <div class="tag-name">${tagName}</div>
            <div class="tag-desc">${tagDesc}</div>
          </td>
          <td>
            <div class="write-control">
              <div class="reg-value small-val" id="reg-val-${i}">---</div>
              <input type="number" id="reg-input-${i}" class="inp" placeholder="0">
              <button class="btn btn-sm btn-primary" onclick="setRegistro(${i})">SET</button>
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

// Función para resetear a 0 un registro específico
function resetRegistro(addr) {
  // Emitir directamente el valor 0 al registro correspondiente
  socket.emit('escribir', { id: 'PLC1', addr: addr, value: 0 });
}