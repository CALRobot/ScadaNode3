const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jsmodbus = require('jsmodbus');
const net = require('net');
const fs = require('fs');
const path = require('path');

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

// --- LOGGING PRODUCCIÓN ---
let productionInterval = 10 * 60 * 1000;
let productionTimer = null;

function logProduction() {
    console.log('[LOG] Capturando snapshot de producción...');
    const now = new Date();
    Object.keys(plcControllers).forEach(id => {
        const ctrl = plcControllers[id];
        if (ctrl.isConnected()) {
            const tags = ctrl.getTagsValues();
            // USAMOS LOS NOMBRES EXACTOS QUE ESPERA EL FRONTEND (analytics.js)
            const logEntry = {
                timestamp: now.toISOString(),
                fecha_es: now.toLocaleString('es-ES'), // <--- LEGIBLE EN ESPAÑOL
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
            fs.appendFileSync('./data/production.jsonl', JSON.stringify(logEntry) + '\n');
            console.log('[LOG] Snapshot guardado con éxito.');
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
        client.readHoldingRegisters(device.readStart, device.readLength)
            .then(resp => {
                resp.response._body.values.forEach((v, i) => { memoria[device.readStart + i] = v; });
                const tagsValues = buildTagValues(memoria, tagsDef);
                logAlarms(device.id, tagsValues);
                io.emit('plc_update', { id: device.id, status: true, regs: memoria, tags: tagsValues });
                setTimeout(poll, device.pollInterval || 500);
            })
            .catch(() => { isConnected = false; });
    };
    connect();

    return {
        id: device.id,
        isConnected: () => isConnected,
        getMemoria: () => memoria,
        getTagsValues: () => buildTagValues(memoria, tagsDef),
        escribir: (addr, val) => { if (isConnected) client.writeSingleRegister(addr, val).catch(() => {}); },
        escribirBit: (addr, bit, value) => {
            if (!isConnected) return;
            let word = memoria[addr] || 0;
            if (value) word |= (1 << bit); else word &= ~(1 << bit);
            client.writeSingleRegister(addr, word).then(() => { memoria[addr] = word; }).catch(() => {});
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

app.get('/api/production/history', (req, res) => {
    if (!fs.existsSync('./data/production.jsonl')) return res.json([]);
    res.json(fs.readFileSync('./data/production.jsonl', 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)));
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
    console.log('🚀 SCADA Online en puerto 4000'); 
    startProductionLogging();
    setTimeout(logProduction, 5000); 
});