// ============================================================
// SCADA NODE 3 - Servidor Backend
// Versión: 1.0.0
// Fecha: 2026-05-24
// Autor: [Tu Nombre]
// Email: [tu_email@ejemplo.com]
// Descripción: Servidor Node.js para SCADA industrial con Modbus TCP,
//              Socket.io para actualizaciones en tiempo real, sistema de
//              alarmas, recetas y autenticación.
// ============================================================

// --- 1. IMPORTE DE DEPENDENCIAS ---
const express = require('express');     // Framework web para el servidor HTTP
const http = require('http');           // Módulo nativo de Node.js para crear servidor HTTP
const { Server } = require('socket.io'); // Socket.io para comunicación en tiempo real
const jsmodbus = require('jsmodbus');   // Librería para comunicación Modbus TCP
const net = require('net');               // Módulo nativo para conexiones TCP
const fs = require('fs');                 // Módulo nativo para manejo de archivos
const path = require('path');             // Módulo nativo para manejo de rutas
const nodemailer = require('nodemailer'); // Librería para envío de emails
const session = require('express-session'); // Middleware para manejo de sesiones de usuario

// --- 2. INICIALIZACIÓN DEL SERVIDOR ---
const app = express();                    // Instancia de Express
const server = http.createServer(app);    // Servidor HTTP basado en Express
const io = new Server(server);            // Instancia de Socket.io para WebSockets

// --- 3. CONFIGURACIÓN BÁSICA ---
const plcsConfig = JSON.parse(fs.readFileSync('./config/plcs.json', 'utf8')); // Configuración de PLCs (IP, puerto, etc.)
const { tags: tagsPlc1 } = require('./config/tags_plc1'); // Definición de tags para PLC1

// --- 4. CARGA DE USUARIOS ---
let usersConfig = { users: [] };
try {
  usersConfig = JSON.parse(fs.readFileSync('./config/users.json', 'utf8')); // Carga usuarios desde config/users.json
} catch (e) { console.log('[AUTH] No se encontró config/users.json'); } // Si no existe el archivo, usa configuración vacía

// --- 5. CONFIGURACIÓN DE SESIONES ---
app.use(session({
  secret: 'scada-secret-key-2026',       // Clave secreta para firmar las cookies de sesión
  resave: false,                           // No volver a guardar la sesión si no hay cambios
  saveUninitialized: false,                // No guardar sesiones no inicializadas
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // Duración de la sesión: 24 horas (en milisegundos)
}));

app.use(express.static('public'));        // Servir archivos estáticos desde la carpeta public
app.use(express.json());                   // Middleware para parsear JSON en las solicitudes

// --- 6. PERSISTENCIA DE DATOS ---
const recipesPath = './data/recipes.json'; // Ruta al archivo de recetas
if (!fs.existsSync(recipesPath)) fs.writeFileSync(recipesPath, JSON.stringify({ recipes: [] }, null, 2)); // Si no existe, crear archivo vacío

// --- 7. CONFIGURACIÓN DE EMAIL ---
let emailConfig = { enabled: false };
try {
  emailConfig = JSON.parse(fs.readFileSync('./config/email.json', 'utf8')); // Carga configuración de email desde config/email.json
} catch (e) { console.log('[EMAIL] No se encontró config/email.json o está mal formado.'); } // Si no existe o está mal formado, usa configuración vacía

/*
Este era el email.json para Gmail
{
  "enabled": false,
  "service": "gmail",
  "auth": {
    "user": "TU_CORREO@gmail.com",
    "pass": "TU_CONTRASEÑA_DE_APLICACION"
  },
  "notifications": {
    "to": "DESTINATARIO@ejemplo.com",
    "subject": "⚠️ ALERTA SCADA - PLANTA 1",
    "onAlarm": true,
    "onRecovery": true,
    "maxInactivityMin": 10
  }
}
-------------------------------------------------------------------------
const transporter = emailConfig.enabled ? nodemailer.createTransport({
  service: emailConfig.service,
  auth: emailConfig.auth
}) : null;
*/

const transporter = emailConfig.enabled ? nodemailer.createTransport({
  host: emailConfig.host || 'smtp.ethereal.email', // Servidor SMTP (por defecto Ethereal para pruebas)
  port: emailConfig.port || 587,                     // Puerto SMTP (por defecto 587)
  auth: emailConfig.auth,                             // Credenciales de autenticación
  tls: {
    rejectUnauthorized: false // Esto es para que la VMware no se queje
  }
}) : null;

/**
 * Envía un email de alarma cuando se activa una alarma en el PLC.
 * 
 * @param {Object} entry - Objeto con la información de la alarma
 *   @param {string} entry.date - Fecha y hora en formato ISO
 *   @param {string} entry.fecha_es - Fecha y hora en formato español legible
 *   @param {string} entry.plc - ID del PLC (ej: "PLC1")
 *   @param {string} entry.tag - Nombre del tag de alarma
 *   @param {string} entry.desc - Descripción de la alarma
 *   @param {string} entry.status - Estado ("ACTIVADA" o "NORMALIZADA")
 * 
 * @returns {void} No devuelve nada
 * 
 * @example
 * sendAlarmEmail({
 *   date: "2026-05-24T12:34:56.789Z",
 *   fecha_es: "24/05/2026 14:34:56",
 *   plc: "PLC1",
 *   tag: "ALM_TEMPERATURA_ALTA",
 *   desc: "Temperatura del molde superior demasiado alta",
 *   status: "ACTIVADA"
 * });
 */
function sendAlarmEmail(entry) {
  if (!transporter || !emailConfig.notifications.onAlarm) return; // Si el email está desactivado o no hay que enviar alarmas, salir

  // Verificar cooldown para evitar múltiples emails del mismo PLC en poco tiempo
  const now = Date.now();
  const lastEmailTime = emailCooldown[entry.plc] || 0;
  if (now - lastEmailTime < EMAIL_COOLDOWN_MS) {
    console.log(`[EMAIL] Email en cooldown para ${entry.plc}, omitiendo envío`);
    return;
  }

  // Actualizar cooldown para este PLC
  emailCooldown[entry.plc] = now;

  const mailOptions = {
    from: emailConfig.auth.user,
    to: emailConfig.notifications.to,
    subject: `${emailConfig.notifications.subject} - ${entry.plc}`,
    text: `ALERTA DETECTADA EN PLANTA\n\nPLC: ${entry.plc}\nTag: ${entry.tag}\nDescripción: ${entry.desc}\nEstado: ${entry.status}\nHora: ${entry.fecha_es}\n\nEste es un mensaje automático del Sistema SCADA.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log('[EMAIL] Error al enviar:', error);
    else console.log('[EMAIL] Correo enviado: ' + info.response);
  });
}

/**
 * Envía un email de recuperación cuando la máquina vuelve a estar en producción.
 * 
 * @param {string} id - ID del PLC (ej: "PLC1")
 * @param {string} msg - Mensaje de recuperación
 * 
 * @returns {void} No devuelve nada
 */
function sendRecoveryEmail(id, msg) {
  if (!transporter || !emailConfig.notifications.onRecovery) return; // Si el email está desactivado o no hay que enviar recuperaciones, salir
  const mailOptions = {
    from: emailConfig.auth.user,
    to: emailConfig.notifications.to,
    subject: `✅ RECUPERACIÓN - ${id}`,
    text: `${msg}\n\nHora: ${new Date().toLocaleString('es-ES')}\n\nEste es un mensaje automático del Sistema SCADA.`
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log('[EMAIL] Error recuperación:', error);
    else console.log('[EMAIL] Correo recuperación enviado.');
  });
}

// --- 8. VIGILANCIA DE PRODUCCIÓN ---
const prodWatch = {};
// Cooldown para evitar múltiples emails de alarmas (en milisegundos)
const emailCooldown = {};
const EMAIL_COOLDOWN_MS = 60000; // 1 minuto de cooldown por PLC

/**
 * Vigila la actividad de la máquina y envía alertas si hay parada prolongada.
 * 
 * @param {string} id - ID del PLC (ej: "PLC1")
 * @param {Object} tags - Objeto con los valores de los tags del PLC
 * 
 * @returns {void} No devuelve nada
 */
function checkInactivity(id, tags) {
  if (!emailConfig.enabled || !emailConfig.notifications.maxInactivityMin) return; // Si email está desactivado o no hay límite de inactividad, salir

  const now = Date.now();
  if (!prodWatch[id]) {
    prodWatch[id] = { lastTime: now, emailSent: false }; // Inicializar el watcher para este PLC
    return;
  }

  const p = prodWatch[id];
  const isAuto = tags.FBK_AUTOMATICO === 1; // Verificar si la máquina está en modo AUTO
  const isProducing = tags.FBK_START_CICLO === 1; // Verificar si la máquina está en ciclo de producción

  // CASO A: La máquina vuelve a producir estando en AUTO
  if (isAuto && isProducing) {
    if (p.emailSent) {
      sendRecoveryEmail(id, `¡BUENAS NOTICIAS!\nLa máquina ${id} ha vuelto a ponerse EN PRODUCCIÓN.`);
    }
    p.lastTime = now;
    p.emailSent = false;
    return;
  }

  // CASO B: La máquina está en AUTO pero en PARADA
  if (isAuto && !isProducing && !p.emailSent) {
    const elapsedMin = (now - p.lastTime) / (1000 * 60);
    if (elapsedMin >= emailConfig.notifications.maxInactivityMin) {
      const entry = {
        plc: id,
        tag: 'PARADA_PROLONGADA',
        desc: `Máquina en AUTO detenida por más de ${emailConfig.notifications.maxInactivityMin} min`,
        status: 'AVISO',
        fecha_es: new Date().toLocaleString('es-ES')
      };
      sendAlarmEmail(entry);
      p.emailSent = true;
    }
  }

  // CASO C: Si salimos de AUTO o está produciendo, reseteamos el cronómetro de aviso
  if (!isAuto || isProducing) {
    p.lastTime = now;
  }
}

// --- 9. LOGGING PRODUCCIÓN CON ROTACIÓN MENSUAL ---
let productionInterval = 10 * 60 * 1000; // Intervalo de logging: 10 minutos (en milisegundos)
let productionTimer = null;

/**
 * Obtiene la ruta del archivo de producción para el mes actual.
 * 
 * @returns {string} Ruta del archivo (ej: "./data/production_2026_05.jsonl")
 */
function getProductionPath() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Mes con 2 dígitos (01-12)
  const year = now.getFullYear();
  return `./data/production_${year}_${month}.jsonl`;
}

/**
 * Captura un snapshot de producción y lo guarda en JSONL y CSV.
 * Se ejecuta periódicamente según el intervalo configurado.
 * 
 * @returns {void} No devuelve nada
 */
function logProduction() {
  console.log('[LOG] Capturando snapshot de producción...');
  const now = new Date();
  const baseName = getProductionPath().replace('.jsonl', '');
  const jsonlPath = baseName + '.jsonl';
  const csvPath = baseName + '.csv';

  Object.keys(plcControllers).forEach(id => {
    const ctrl = plcControllers[id];
    if (ctrl.isConnected()) {
      const tags = ctrl.getTagsValues();
      const logEntry = {
        timestamp: now.toISOString(),
        fecha_es: now.toLocaleString('es-ES'),
        plc: id,
        PROD_ACTUAL_GOLPES: tags.PROD_ACTUAL_GOLPES || 0,
        CONSUMO_ENERG_ACTUAL: tags.CONSUMO_ENERG_ACTUAL || 0,
        TEMP_MOLDE_SUP: tags.TEMP_MOLDE_SUP || 0,
        TEMP_MOLDE_INF: tags.TEMP_MOLDE_INF || 0,
        TEMPO_CICLO_ULTIMO: tags.TEMPO_CICLO_ULTIMO || 0,
        CONSUMO_MEDIO_DIA: tags.CONSUMO_MEDIO_DIA || 0,
        TEMP_SP_SUP: tags.TEMP_SP_SUP || 0,
        TEMP_SP_INF: tags.TEMP_SP_INF || 0
      };

      // 1. Guardar en JSONL (para el SCADA)
      fs.appendFileSync(jsonlPath, JSON.stringify(logEntry) + '\n');

      // 2. Guardar en CSV (para Power BI / Excel)
      const isNewCsv = !fs.existsSync(csvPath);
      const csvRow = [
        logEntry.timestamp,
        logEntry.fecha_es,
        logEntry.plc,
        logEntry.PROD_ACTUAL_GOLPES,
        logEntry.CONSUMO_ENERG_ACTUAL,
        logEntry.TEMP_MOLDE_SUP,
        logEntry.TEMP_MOLDE_INF,
        logEntry.TEMPO_CICLO_ULTIMO,
        logEntry.CONSUMO_MEDIO_DIA,
        logEntry.TEMP_SP_SUP,
        logEntry.TEMP_SP_INF
      ].join(';'); // Usamos punto y coma para Excel en español

      if (isNewCsv) {
        const header = "Timestamp;Fecha_ES;PLC;Produccion_Golpes;Consumo_Energia;Temp_Sup;Temp_Inf;Tempo_Ciclo;Consumo_Medio;SP_Sup;SP_Inf\n";
        fs.writeFileSync(csvPath, header + csvRow + '\n');
      } else {
        fs.appendFileSync(csvPath, csvRow + '\n');
      }

      console.log(`[LOG] Snapshot guardado en JSONL y CSV (${baseName})`);
    }
  });
}

/**
 * Inicia o reinicia el logging de producción con el intervalo actual.
 * 
 * @returns {void} No devuelve nada
 */
function startProductionLogging() {
  if (productionTimer) clearInterval(productionTimer);
  productionTimer = setInterval(logProduction, productionInterval);
}

// --- 10. LÓGICA DE ALARMAS ---
const lastAlarmsState = {};

/**
 * Registra los cambios de estado de las alarmas en el archivo alarms.jsonl.
 * Compara el estado actual de las alarmas con el estado anterior y registra los cambios.
 * 
 * @param {string} id - ID del PLC (ej: "PLC1")
 * @param {Object} currentTags - Objeto con los valores de los tags actuales del PLC
 * 
 * @returns {void} No devuelve nada
 */
function logAlarms(id, currentTags) {
  if (!lastAlarmsState[id]) {
    lastAlarmsState[id] = { ...currentTags };
    return;
  }
  // Buscamos tags que empiecen por ALM_ o tengan categoría Alarma
  const alarmTags = tagsPlc1.filter(t => t.cat === 'Alarma' || t.name.startsWith('ALM_'));
  alarmTags.forEach(tag => {
    if (currentTags[tag.name] !== lastAlarmsState[id][tag.name]) {
      const entry = {
        date: new Date().toISOString(),
        fecha_es: new Date().toLocaleString('es-ES'), // <--- LEGIBLE EN ESPAÑOL
        plc: id,
        tag: tag.name,
        desc: tag.desc,
        status: currentTags[tag.name] ? 'ACTIVADA' : 'NORMALIZADA'
      };
      fs.appendFileSync('./data/alarms.jsonl', JSON.stringify(entry) + '\n');
      console.log(`[ALERTA] ${id} -> ${tag.name} ${entry.status}`);

      // Enviar email solo si se activa la alarma
      if (entry.status === 'ACTIVADA') {
        sendAlarmEmail(entry);
      }
    }
  });
  lastAlarmsState[id] = { ...currentTags };
}

// --- 11. LÓGICA DE PLCS (JSMODBUS) ---
const plcControllers = {};

/**
 * Construye un objeto con los valores de los tags a partir de la memoria del PLC.
 * 
 * @param {Array} memoria - Array con los valores de los registros Modbus
 * @param {Array} tagsDef - Array con la definición de los tags
 * 
 * @returns {Object} Objeto con los valores de los tags formateados
 */
function buildTagValues(memoria, tagsDef) {
  const vals = {};
  tagsDef.forEach(t => {
    const val = memoria[t.word] || 0;
    if (t.bit !== null) vals[t.name] = (val & (1 << t.bit)) ? 1 : 0; // Si es un bit, extraer su valor
    else vals[t.name] = val; // Si es una palabra completa, usar el valor directamente
  });
  return vals;
}

/**
 * Crea un controlador para un PLC específico.
 * Gestiona la conexión Modbus TCP, la lectura periódica y la escritura de datos.
 * 
 * @param {Object} device - Objeto con la configuración del PLC (id, host, port, etc.)
 * @param {Array} tagsDef - Array con la definición de los tags para este PLC
 * 
 * @returns {Object} Controlador del PLC con métodos para interactuar con él
 */
function createPlcController(device, tagsDef) {
  const socket = new net.Socket();
  const client = new jsmodbus.client.TCP(socket);
  const memoria = new Array(device.totalRegs || 200).fill(0); // Memoria local para almacenar los valores de los registros
  let isConnected = false;

  const connect = () => socket.connect({ host: device.host, port: device.port }); // Función para conectar al PLC
  socket.on('connect', () => { isConnected = true; poll(); }); // Cuando se conecta, empezar a leer
  socket.on('close', () => { isConnected = false; setTimeout(connect, 5000); }); // Cuando se cierra la conexión, intentar reconectar en 5 segundos
  socket.on('error', () => { isConnected = false; }); // Cuando hay un error, marcar como desconectado

  const poll = () => {
    if (!isConnected) return;

    // Primera lectura: bloque de solo lectura (ej. 0 a 59)
    client.readHoldingRegisters(device.readStart, device.readLength)
      .then(resp => {
        resp.response._body.values.forEach((v, i) => { memoria[device.readStart + i] = v; }); // Almacenar los valores leídos en la memoria local

        // Segunda lectura: bloque de escritura/lectura (ej. 60 a 119)
        // Usamos writeStart y writeLength que ya estaban en el config pero no se leían
        return client.readHoldingRegisters(device.writeStart, device.writeLength);
      })
      .then(resp2 => {
        resp2.response._body.values.forEach((v, i) => { memoria[device.writeStart + i] = v; }); // Almacenar los valores del segundo bloque

        const tagsValues = buildTagValues(memoria, tagsDef); // Construir el objeto de valores de tags
        logAlarms(device.id, tagsValues); // Registrar alarmas si hay cambios
        checkInactivity(device.id, tagsValues); // <--- Vigilancia de paradas

        io.emit('plc_update', { id: device.id, status: true, regs: memoria, tags: tagsValues }); // Emitir actualización a todos los clientes conectados
        setTimeout(poll, device.pollMs || 500); // Esperar el intervalo de polling y volver a leer
      })
      .catch((err) => {
        console.error(`[MODBUS ERROR ${device.id}]`, err);
        isConnected = false;
      });
  };
  connect();

  return {
    id: device.id,
    isConnected: () => isConnected,
    getMemoria: () => memoria,
    getTagsValues: () => buildTagValues(memoria, tagsDef),
    escribir: (addr, val) => { if (isConnected) client.writeSingleRegister(addr, val).catch(() => { }); },
    escribirBit: (addr, bit, value) => {
      if (!isConnected) return;
      let word = memoria[addr] || 0;
      if (value) word |= (1 << bit); else word &= ~(1 << bit);
      client.writeSingleRegister(addr, word).then(() => { memoria[addr] = word; }).catch(() => { });
    }
  };
}

plcsConfig.devices.forEach(dev => {
  if (dev.id === 'PLC1') plcControllers[dev.id] = createPlcController(dev, tagsPlc1); // Crear controlador para PLC1
});

// --- 12. AUTH API (Autenticación) ---

/**
 * Middleware para verificar que el usuario esté autenticado antes de acceder a rutas protegidas.
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware/ruta
 * 
 * @returns {void} No devuelve nada
 */
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
};

/**
 * Endpoint para iniciar sesión.
 * Verifica las credenciales del usuario y crea una sesión si son válidas.
 * 
 * @route POST /api/login
 * @param {Object} req.body - Cuerpo de la solicitud
 *   @param {string} req.body.username - Nombre de usuario
 *   @param {string} req.body.password - Contraseña
 * 
 * @returns {Object} Respuesta JSON con éxito o error
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = usersConfig.users.find(u => u.username === username && u.password === password);
  
  if (user) {
    req.session.user = { username: user.username, role: user.role };
    res.json({ success: true, user: { username: user.username, role: user.role } });
  } else {
    res.status(401).json({ success: false, error: 'Credenciales inválidas' });
  }
});

/**
 * Endpoint para cerrar sesión.
 * Destruye la sesión del usuario en el servidor.
 * 
 * @route POST /api/logout
 * @returns {Object} Respuesta JSON con éxito
 */
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

/**
 * Endpoint para verificar el estado de la sesión actual.
 * 
 * @route GET /api/me
 * @returns {Object} Respuesta JSON con el estado de autenticación y datos del usuario (si está autenticado)
 */
app.get('/api/me', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

// --- 13. APIs REST ---

/**
 * Endpoint para obtener la lista de recetas.
 * 
 * @route GET /api/recipes
 * @returns {Array} Lista de recetas
 */
app.get('/api/recipes', (req, res) => {
  const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
  res.json(data.recipes || []);
});

/**
 * Endpoint para crear una nueva receta.
 * 
 * @route POST /api/recipes
 * @param {Object} req.body - Datos de la nueva receta
 * 
 * @returns {Object} Receta creada
 */
app.post('/api/recipes', (req, res) => {
  const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
  const newRecipe = {
    id: Date.now(), // ID temporal basado en tiempo si no se especifica
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.recipes.push(newRecipe);
  fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2));
  res.status(201).json(newRecipe);
});

/**
 * Endpoint para actualizar una receta existente.
 * 
 * @route PUT /api/recipes/:id
 * @param {string} req.params.id - ID de la receta a actualizar
 * @param {Object} req.body - Nuevos datos de la receta
 * 
 * @returns {Object} Receta actualizada
 */
app.put('/api/recipes/:id', (req, res) => {
  const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
  const idx = data.recipes.findIndex(r => String(r.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });

  data.recipes[idx] = {
    ...data.recipes[idx],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2));
  res.json(data.recipes[idx]);
});

/**
 * Endpoint para eliminar una receta.
 * 
 * @route DELETE /api/recipes/:id
 * @param {string} req.params.id - ID de la receta a eliminar
 * 
 * @returns {void} No devuelve nada (status 204)
 */
app.delete('/api/recipes/:id', (req, res) => {
  const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
  data.recipes = data.recipes.filter(r => String(r.id) !== String(req.params.id));
  fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2));
  res.status(204).send();
});

/**
 * Endpoint para obtener el historial de producción del mes actual.
 * 
 * @route GET /api/production/history
 * @returns {Array} Lista de snapshots de producción
 */
app.get('/api/production/history', (req, res) => {
  const currentPath = getProductionPath();
  if (!fs.existsSync(currentPath)) return res.json([]);
  res.json(fs.readFileSync(currentPath, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)));
});

/**
 * Endpoint para obtener la configuración del logging de producción.
 * 
 * @route GET /api/production/config
 * @returns {Object} Configuración actual (intervalo en minutos)
 */
app.get('/api/production/config', (req, res) => {
  res.json({ intervalMinutes: productionInterval / 60000 });
});

/**
 * Endpoint para cambiar el intervalo de logging de producción.
 * 
 * @route POST /api/production/interval
 * @param {Object} req.body - Datos de la solicitud
 *   @param {number} req.body.minutes - Nuevo intervalo en minutos
 * 
 * @returns {Object} Respuesta con el nuevo intervalo
 */
app.post('/api/production/interval', (req, res) => {
  const minutes = parseFloat(req.body.minutes);
  if (!isNaN(minutes) && minutes >= 0.1) {
    productionInterval = minutes * 60000;
    startProductionLogging();
    console.log(`[API] Intervalo cambiado a ${minutes} min`);
    res.json({ ok: true, minutes });
  } else {
    res.status(400).json({ error: 'Intervalo no válido' });
  }
});

/**
 * Endpoint para obtener el historial de alarmas.
 * 
 * @route GET /api/alarms/history
 * @returns {Array} Lista de entradas de alarmas
 */
app.get('/api/alarms/history', (req, res) => {
  if (!fs.existsSync('./data/alarms.jsonl')) return res.json([]);
  res.json(fs.readFileSync('./data/alarms.jsonl', 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)));
});

// --- 14. SOCKETS (Comunicación en tiempo real) ---
io.on('connection', (socket) => {
  // Enviar el estado actual de todos los PLCs al cliente que se conecta
  Object.keys(plcControllers).forEach(id => {
    const ctrl = plcControllers[id];
    socket.emit('plc_update', { id: ctrl.id, status: ctrl.isConnected(), regs: ctrl.getMemoria(), tags: ctrl.getTagsValues() });
  });
  // Escuchar peticiones de escritura de registros
  socket.on('escribir', (data) => { if (plcControllers[data.id]) plcControllers[data.id].escribir(data.addr, data.value); });
  // Escuchar peticiones de escritura de bits individuales
  socket.on('escribir_bit', (data) => { if (plcControllers[data.id]) plcControllers[data.id].escribirBit(data.addr, data.bit, data.value); });
});

// --- 15. INICIO DEL SERVIDOR ---
server.listen(4000, () => {
  console.log('🚀 SCADA Online: http://localhost:4000');
  startProductionLogging(); // Iniciar logging de producción
  setTimeout(logProduction, 5000); // Capturar primer snapshot en 5 segundos
});
