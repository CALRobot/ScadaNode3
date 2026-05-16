const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jsmodbus = require('jsmodbus');
const net = require('net');
const fs = require('fs');
const path = require('path');
// Eliminado uuid para evitar instalaciones extra

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONFIGURACIÓN ---
const plcsConfig = JSON.parse(fs.readFileSync('./config/plcs.json', 'utf8'));
const { tags: tagsPlc1 } = require('./config/tags_plc1');

app.use(express.static('public'));
app.use(express.json());

// --- PERSISTENCIA (Asegurar que los archivos existen) ---
const recipesPath = './data/recipes.json';
if (!fs.existsSync(recipesPath)) fs.writeFileSync(recipesPath, '[]');

// --- LOGGING PRODUCCIÓN ---
let productionInterval = 10 * 60 * 1000; // 10 minutos
let productionTimer = null;

function logProduction() {
    const now = new Date();
    Object.keys(plcControllers).forEach(id => {
        const ctrl = plcControllers[id];
        if (ctrl.isConnected()) {
            const tags = ctrl.getTagsValues();
            const logEntry = {
                timestamp: now.toISOString(),
                plc: id,
                golpes: tags.PROD_ACTUAL_GOLPES || 0,
                consumo: tags.CONSUMO_ENERG_ACTUAL || 0,
                temp_sup: tags.TEMP_MOLDE_SUP || 0,
                temp_inf: tags.TEMP_MOLDE_INF || 0,
                ciclo: tags.TEMPO_CICLO_ULTIMO || 0
            };
            fs.appendFileSync('./data/production.jsonl', JSON.stringify(logEntry) + '\n');
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
    const alarmTags = tagsPlc1.filter(t => t.cat === 'Anomalie');
    alarmTags.forEach(tag => {
        if (currentTags[tag.name] !== lastAlarmsState[id][tag.name]) {
            const entry = {
                date: new Date().toISOString(),
                tag: tag.name,
                desc: tag.desc,
                status: currentTags[tag.name] ? 'ACTIVADA' : 'NORMALIZADA'
            };
            fs.appendFileSync('./data/alarms.jsonl', JSON.stringify(entry) + '\n');
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
    const memoria = new Array(device.totalRegs).fill(0);
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
            .catch(() => { isConnected = false; setTimeout(connect, 2000); });
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

plcsConfig.devices.forEach(dev => { if (dev.id === 'PLC1') plcControllers[dev.id] = createPlcController(dev, tagsPlc1); });

// --- APIs ---

// RECETAS (CRUD COMPLETO)
app.get('/api/recipes', (req, res) => {
    const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
    res.json(data.recipes || []);
});

app.post('/api/recipes', (req, res) => {
    const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
    const newRecipe = { ...req.body, id: Date.now().toString(), updatedAt: new Date().toISOString() };
    data.recipes.push(newRecipe);
    fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2));
    res.json(newRecipe);
});

app.put('/api/recipes/:id', (req, res) => {
    const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
    const idx = data.recipes.findIndex(r => r.id === req.params.id);
    if (idx !== -1) {
        data.recipes[idx] = { ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
        fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2));
        res.json(data.recipes[idx]);
    } else res.status(404).send();
});

app.delete('/api/recipes/:id', (req, res) => {
    const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
    data.recipes = data.recipes.filter(r => r.id !== req.params.id);
    fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2));
    res.status(204).send();
});

// ALARMAS Y PRODUCCIÓN
app.get('/api/alarms/history', (req, res) => {
    if (!fs.existsSync('./data/alarms.jsonl')) return res.json([]);
    res.json(fs.readFileSync('./data/alarms.jsonl', 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)));
});

app.get('/api/production/history', (req, res) => {
    if (!fs.existsSync('./data/production.jsonl')) return res.json([]);
    res.json(fs.readFileSync('./data/production.jsonl', 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)));
});

app.get('/api/production/config', (req, res) => {
    res.json({ intervalMinutes: productionInterval / 60000 });
});

app.post('/api/production/interval', (req, res) => {
    const { minutes } = req.body;
    if (minutes && minutes >= 1) {
        productionInterval = minutes * 60000;
        startProductionLogging();
        res.json({ ok: true, minutes });
    } else {
        res.status(400).json({ error: 'Intervalo no válido' });
    }
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

server.listen(4000, () => { console.log('🚀 SCADA Online en puerto 4000'); startProductionLogging(); });