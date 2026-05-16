// recipes.js - CRUD de recetas (JSON) + cargar receta al PLC

const RECIPE_FIELDS = [
  { key: 'RECETA_ESPESOR', label: 'Espesor', addr: 62 },
  { key: 'RECETA_EMPUJE', label: 'Empuje', addr: 63 },
  { key: 'RECETA_DISPARO', label: 'Disparo', addr: 64 },
  { key: 'RECETA_EXPANSION', label: 'Expansión', addr: 65 },
  { key: 'RECETA_2do_EMPUJE', label: 'Segundo empuje', addr: 66 },
  { key: 'RECETA_2do_DISPARO', label: 'Segundo disparo', addr: 67 },
  { key: 'RECETA_2do_EXPANSION', label: 'Segunda expansión', addr: 68 },
  { key: 'RECETA_DURACION_LIMP_DOSIF', label: 'Duración limpieza dosificación', addr: 69 },
  { key: 'RECETA_RETRASO_LIMP_DOSIF', label: 'Retraso limpieza dosificación', addr: 70 },
  { key: 'RETRASO_SUB_PLATO_DBLCIC', label: 'Retraso subida plato (doble ciclo)', addr: 71 },
  { key: 'RECETA_VASO', label: 'Vaso', addr: 72 },
  { key: 'RECETA_CICLOS_LIMP_DOSIF', label: 'Ciclos limpieza dosificación', addr: 73 },
  { key: 'RECETA_TEMP_CONSIG_SUP', label: 'Temperatura consigna superior', addr: 74 },
  { key: 'RECETA_TEMP_CONSIG_INF', label: 'Temperatura consigna inferior', addr: 75 },
  { key: 'RECETA_NUM_FORMAS_MOLDE', label: 'Número de formas en el molde', addr: 76 },
];

const PLC_ACTIVE_TAGS = [
  { key: 'Spessore', label: 'Espesor (Spessore) — W2 lectura' },
  { key: 'Spinta', label: 'Empuje (Spinta) — W3' },
  { key: 'Cottura', label: 'Disparo (Cottura) — W4' },
  { key: 'Espansione', label: 'Expansión (Espansione) — W5' },
  { key: '2_Spinta', label: 'Segundo empuje (2_Spinta) — W6' },
  { key: '2_Cottura', label: 'Segundo disparo (2_Cottura) — W7' },
  { key: '2_Espansione', label: 'Segunda expansión (2_Espansione) — W8' },
  { key: 'Dosat_Tpo_di_Pulizia', label: 'Duración limpieza dosif. — W9' },
  { key: 'Dosat_Pulizia_Ritardo', label: 'Retraso limpieza dosif. — W10' },
  { key: 'Rit_Salita_Piastra_CentCicloDoppio', label: 'Retraso subida plato doble ciclo — W11' },
  { key: 'Bicchiere', label: 'Vaso (Bicchiere) — W12' },
  { key: 'Dosatori _num_cicli_per_Pulizia', label: 'Ciclos limpieza dosif. — W13' },
  { key: 'TEMP_SP_SUP', label: 'Temperatura consigna superior (PLC) — W14' },
  { key: 'TEMP_SP_INF', label: 'Temperatura consigna inferior (PLC) — W15' },
  { key: 'NUMERO_DE_FORMAS', label: 'Número de formas / vasos molde — W27' },
];

let recipesState = {
  list: [],
  selectedId: null,
};

document.addEventListener('DOMContentLoaded', () => {
  initRecipesUi();
  recipesRefresh();
  renderPlcActiveTable({});
});

function $(id) {
  return document.getElementById(id);
}

function initRecipesUi() {
  const fieldsWrap = $('recipe-fields');
  if (!fieldsWrap) return;

  fieldsWrap.innerHTML = RECIPE_FIELDS.map(f => `
    <div class="row">
      <span>${escapeHtml(f.label)}</span>
      <input class="inp inp-sm" type="number" id="rf_${f.key}" value="0" min="0" max="65535" />
      <span style="opacity:.8;">W${f.addr}</span>
    </div>
  `).join('');

  $('recipe-btn-new')?.addEventListener('click', () => {
    selectRecipe(null);
    setMsg('Formulario vacío: rellene y pulse Guardar para crear una receta nueva.', 'info');
  });

  $('recipes-btn-refresh')?.addEventListener('click', () => recipesRefresh());

  $('recipe-btn-save')?.addEventListener('click', () => recipeSave());
  $('recipe-btn-delete')?.addEventListener('click', () => recipeDelete());
  $('recipe-btn-load')?.addEventListener('click', () => recipeLoadToPlc());
}

async function recipesRefresh() {
  try {
    const res = await fetch('/api/recipes');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const list = await res.json();
    recipesState.list = Array.isArray(list) ? list : [];
    renderRecipesTable();

    if (recipesState.selectedId) {
      const still = recipesState.list.find(r => r.id === recipesState.selectedId);
      if (still) fillForm(still);
    }

    setMsg('Recetas cargadas', 'ok');
  } catch (e) {
    setMsg('Error cargando recetas', 'err');
  }
}

function renderRecipesTable() {
  const tbody = document.querySelector('#recipes-table tbody');
  if (!tbody) return;

  tbody.innerHTML = recipesState.list.map(r => {
    const updated = r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '';
    return `
      <tr class="${r.id === recipesState.selectedId ? 'row-active' : ''}">
        <td>${escapeHtml(r.name || '')}</td>
        <td>${escapeHtml(r.description || '')}</td>
        <td>${escapeHtml(updated)}</td>
        <td>
          <button class="btn btn-sm btn-secondary" data-act="edit" data-id="${escapeAttr(r.id)}">Editar</button>
          <button class="btn btn-sm btn-success" data-act="sendplc" data-id="${escapeAttr(r.id)}">Enviar al PLC</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('button[data-act="edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const r = recipesState.list.find(x => x.id === id);
      if (r) selectRecipe(r);
    });
  });

  tbody.querySelectorAll('button[data-act="sendplc"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const r = recipesState.list.find(x => x.id === id);
      if (!r) return;
      selectRecipe(r);
      recipeSendValuesToPlc(r.values || {});
    });
  });
}

function selectRecipe(recipeOrNull) {
  if (!recipeOrNull) {
    recipesState.selectedId = null;
    fillForm({ name: '', description: '', values: {} });
    return;
  }
  recipesState.selectedId = recipeOrNull.id;
  fillForm(recipeOrNull);
  renderRecipesTable();
}

function fillForm(recipe) {
  const nameEl = $('recipe-name');
  const descEl = $('recipe-desc');
  if (nameEl) nameEl.value = recipe.name || '';
  if (descEl) descEl.value = recipe.description || '';

  const vals = recipe.values && typeof recipe.values === 'object' ? recipe.values : {};
  for (const f of RECIPE_FIELDS) {
    const el = $('rf_' + f.key);
    if (!el) continue;
    const v = vals[f.key];
    el.value = (typeof v === 'number' && Number.isFinite(v)) ? String(v) : String(parseInt(v ?? 0, 10) || 0);
  }
}

function mergeRecipeValues(values) {
  const src = values && typeof values === 'object' ? values : {};
  const out = {};
  for (const f of RECIPE_FIELDS) {
    const raw = src[f.key];
    const num = parseInt(raw ?? '0', 10);
    out[f.key] = Number.isFinite(num) ? clamp(num, 0, 65535) : 0;
  }
  return out;
}

function readFormRecipe() {
  const name = String($('recipe-name')?.value || '').trim();
  const description = String($('recipe-desc')?.value || '').trim();
  const values = {};

  for (const f of RECIPE_FIELDS) {
    const raw = $('rf_' + f.key)?.value;
    const num = parseInt(raw ?? '0', 10);
    values[f.key] = Number.isFinite(num) ? clamp(num, 0, 65535) : 0;
  }

  return { name, description, values };
}

async function recipeSave() {
  const payload = readFormRecipe();
  if (!payload.name) return setMsg('El nombre es obligatorio', 'err');

  try {
    const isEdit = !!recipesState.selectedId;
    const url = isEdit ? `/api/recipes/${encodeURIComponent(recipesState.selectedId)}` : '/api/recipes';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const saved = await res.json();

    recipesState.selectedId = saved.id;
    await recipesRefresh();
    setMsg(isEdit ? 'Receta actualizada' : 'Receta creada', 'ok');
  } catch (e) {
    setMsg('Error guardando receta', 'err');
  }
}

async function recipeDelete() {
  if (!recipesState.selectedId) return setMsg('Seleccione una receta en la tabla (Editar) o Guarde antes de eliminar.', 'err');
  if (!confirm('¿Eliminar esta receta del archivo JSON?')) return;

  try {
    const res = await fetch(`/api/recipes/${encodeURIComponent(recipesState.selectedId)}`, { method: 'DELETE' });
    if (!(res.status === 204 || res.ok)) throw new Error('HTTP ' + res.status);
    recipesState.selectedId = null;
    await recipesRefresh();
    selectRecipe(null);
    setMsg('Receta eliminada.', 'ok');
  } catch (e) {
    setMsg('Error al eliminar la receta.', 'err');
  }
}

/**
 * Igual que REGISTROS (`regs.js`): fire-and-forget por Socket.IO.
 * El servidor intenta Modbus; errores van por consola de Node (no por timeout en el navegador).
 */
function recipeSendValuesToPlc(valuesFromRecipe) {
  if (!socket) return setMsg('Socket no disponible', 'err');

  const merged = mergeRecipeValues(valuesFromRecipe);
  for (const f of RECIPE_FIELDS) {
    const value = merged[f.key] ?? 0;
    socket.emit('escribir', { id: 'PLC1', addr: f.addr, value });
  }

  const plcSt = $('recipes-plc1-status')?.textContent?.trim() || '?';
  setMsg(
    `Pedidas ${RECIPE_FIELDS.length} escrituras Modbus (PLC1, W62–W76). Estado pantalla: ${plcSt}. Si falla la conexión, mira la terminal del servidor.`,
    plcSt === 'ONLINE' ? 'ok' : 'info'
  );
}

function recipeLoadToPlc() {
  const payload = readFormRecipe();
  if (!payload.name) return setMsg('Pon un nombre de receta (también sirve para saber qué estás enviando)', 'err');
  recipeSendValuesToPlc(payload.values);
}

// Llamado desde main.js en cada plc_update
function recipes_onPlcUpdate(data) {
  if (!data || data.id !== 'PLC1') return;
  const st = $('recipes-plc1-status');
  if (st) st.textContent = data.status ? 'ONLINE' : 'OFFLINE';
  renderPlcActiveTable(data.tags || {});
}

function renderPlcActiveTable(tags) {
  const tbody = document.querySelector('#plc-active-table tbody');
  if (!tbody) return;

  tbody.innerHTML = PLC_ACTIVE_TAGS.map(p => {
    const val = tags[p.key];
    return `<tr><td>${escapeHtml(p.label)}</td><td>${escapeHtml(String(val ?? '---'))}</td></tr>`;
  }).join('');
}

function setMsg(text, type) {
  const el = $('recipe-msg');
  if (!el) return;

  const color = type === 'ok' ? '#0f0' : type === 'err' ? '#f66' : '#fff';
  el.style.color = color;
  el.textContent = text;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll('`', '&#96;');
}

