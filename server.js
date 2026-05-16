const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jsmodbus = require('jsmodbus');
const net = require('net');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONFIGURACIÓN ---
const plcsConfig = JSON.parse(fs.readFileSync('./config/plcs.json', 'utf8'));
const { tags: tagsPlc1 } = require('./config/tags_plc1');

app.use(express.static('public'));
app.use(express.json());

// --- PERSISTENCIA ---
const recipesPath = './data/recipes.json';
if (!fs.existsSync(recipesPath)) fs.writeFileSync(recipesPath, JSON.stringify({ recipes: [] }, null, 2));

// --- CONFIGURACIÓN EMAIL ---
let emailConfig = { enabled: false };
try {
  emailConfig = JSON.parse(fs.readFileSync('./config/email.json', 'utf8'));
} catch (e) { console.log('[EMAIL] No se encontró config/email.json o está mal formado.'); }

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
  host: emailConfig.host || 'smtp.ethereal.email',
  port: emailConfig.port || 587,
  auth: emailConfig.auth,
  tls: {
    rejectUnauthorized: false // Esto es para que la VMware no se queje
  }
}) : null;

function sendAlarmEmail(entry) {
  if (!transporter || !emailConfig.notifications.onAlarm) return;

  // Verificar cooldown para evitar múltiples emails del mismo PLC
  const now = Date.now();
  const lastEmailTime = emailCooldown[entry.plc] || 0;
  if (now - lastEmailTime < EMAIL_COOLDOWN_MS) {
    console.log(`[EMAIL] Email en cooldown para ${entry.plc}, omitiendo envío`);
    return;
  }

  // Actualizar cooldown
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

function sendRecoveryEmail(id, msg) {
  if (!transporter || !emailConfig.notifications.onRecovery) return;
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

// --- VIGILANCIA DE PRODUCCIÓN ---
const prodWatch = {};
// Cooldown para evitar múltiples emails de alarmas (en milisegundos)
const emailCooldown = {};
const EMAIL_COOLDOWN_MS = 60000; // 1 minuto de cooldown por PLC

function checkInactivity(id, tags) {
  if (!emailConfig.enabled || !emailConfig.notifications.maxInactivityMin) return;

  const now = Date.now();
  if (!prodWatch[id]) {
    prodWatch[id] = { lastTime: now, emailSent: false };
    return;
  }

  const p = prodWatch[id];
  const isAuto = tags.FBK_AUTOMATICO === 1;
  const isProducing = tags.FBK_START_CICLO === 1;

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

// --- LOGGING PRODUCCIÓN CON ROTACIÓN MENSUAL ---
let productionInterval = 10 * 60 * 1000;
let productionTimer = null;

function getProductionPath() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `./data/production_${year}_${month}.jsonl`;
}

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

function startProductionLogging() {
  if (productionTimer) clearInterval(productionTimer);
  productionTimer = setInterval(logProduction, productionInterval);
}

// --- LÓGICA DE ALARMAS ---
const lastAlarmsState = {};
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

// --- LÓGICA DE PLCS (JSMODBUS) ---
const plcControllers = {};
function buildTagValues(memoria, tagsDef) {
  const vals = {};
  tagsDef.forEach(t => {
    const val = memoria[t.word] || 0;
    if (t.bit !== null) vals[t.name] = (val & (1 << t.bit)) ? 1 : 0;
    else vals[t.name] = val;
  });
  return vals;
}

function createPlcController(device, tagsDef) {
  const socket = new net.Socket();
  const client = new jsmodbus.client.TCP(socket);
  const memoria = new Array(device.totalRegs || 200).fill(0);
  let isConnected = false;

  const connect = () => socket.connect({ host: device.host, port: device.port });
  socket.on('connect', () => { isConnected = true; poll(); });
  socket.on('close', () => { isConnected = false; setTimeout(connect, 5000); });
  socket.on('error', () => { isConnected = false; });

  const poll = () => {
    if (!isConnected) return;

    // Primera lectura: bloque de solo lectura (ej. 0 a 59)
    client.readHoldingRegisters(device.readStart, device.readLength)
      .then(resp => {
        resp.response._body.values.forEach((v, i) => { memoria[device.readStart + i] = v; });

        // Segunda lectura: bloque de escritura/lectura (ej. 60 a 119)
        // Usamos writeStart y writeLength que ya estaban en el config pero no se leían
        return client.readHoldingRegisters(device.writeStart, device.writeLength);
      })
      .then(resp2 => {
        resp2.response._body.values.forEach((v, i) => { memoria[device.writeStart + i] = v; });

        const tagsValues = buildTagValues(memoria, tagsDef);
        logAlarms(device.id, tagsValues);
        checkInactivity(device.id, tagsValues); // <--- Vigilancia de paradas

        io.emit('plc_update', { id: device.id, status: true, regs: memoria, tags: tagsValues });
        setTimeout(poll, device.pollMs || 500);
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
  if (dev.id === 'PLC1') plcControllers[dev.id] = createPlcController(dev, tagsPlc1);
});

// --- APIs ---
app.get('/api/recipes', (req, res) => {
  const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
  res.json(data.recipes || []);
});

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

app.delete('/api/recipes/:id', (req, res) => {
  const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
  data.recipes = data.recipes.filter(r => String(r.id) !== String(req.params.id));
  fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2));
  res.status(204).send();
});

app.get('/api/production/history', (req, res) => {
  const currentPath = getProductionPath();
  if (!fs.existsSync(currentPath)) return res.json([]);
  res.json(fs.readFileSync(currentPath, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)));
});

app.get('/api/production/config', (req, res) => {
  res.json({ intervalMinutes: productionInterval / 60000 });
});

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

app.get('/api/alarms/history', (req, res) => {
  if (!fs.existsSync('./data/alarms.jsonl')) return res.json([]);
  res.json(fs.readFileSync('./data/alarms.jsonl', 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)));
});

// --- SOCKETS ---
io.on('connection', (socket) => {
  Object.keys(plcControllers).forEach(id => {
    const ctrl = plcControllers[id];
    socket.emit('plc_update', { id: ctrl.id, status: ctrl.isConnected(), regs: ctrl.getMemoria(), tags: ctrl.getTagsValues() });
  });
  socket.on('escribir', (data) => { if (plcControllers[data.id]) plcControllers[data.id].escribir(data.addr, data.value); });
  socket.on('escribir_bit', (data) => { if (plcControllers[data.id]) plcControllers[data.id].escribirBit(data.addr, data.bit, data.value); });
});

server.listen(4000, () => {
  console.log('🚀 SCADA Online: http://localhost:4000');
  startProductionLogging();
  setTimeout(logProduction, 5000);
});