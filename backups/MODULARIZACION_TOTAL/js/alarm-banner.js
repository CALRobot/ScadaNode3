// alarm-banner.js — franja superior tipo SCADA (todas las páginas)

const ALARM_TEXT = {
  EMERGENZA_PREMUTA: 'Emergencia pulsada',
  TERMICO_RES_SUP_INTERV: 'Resistencias térmicas superiores disparadas',
  TERMICO_RES_INF_INTERV: 'Resistencias térmicas inferiores disparadas',
  TERMICO_CENT_IDR_INTERV: 'Térmico central hidráulica intervenido',
  RIPARI_APERTI: 'Protecciones / guardas abiertas',
  CENT_IDRAULICA_SPENTA: 'Central hidráulica apagada',
  KO_AV_PIASTRA_CENT_SUP: 'Fallo avance placa central superior',
  KO_AV_STAMPOINF_NOINPOS: 'Estampo inferior fuera de posición',
  KO_AV_VAL_SCAR_NOINPOS: 'Válvula descarga fuera de posición',
  KO_AV_SELET_IN_MANUALE: 'Selector en manual',
  CENT_IDR_SPENTA_IN_CICLO: 'Central hidráulica apagada en ciclo',
  ANOM_MOV_SCARICO_GALLTE: 'Anomalía movimiento descarga galleta',
  ANOM_REED_CIL_SUPERIOR: 'Anomalía reed cilindro superior',
  ANOM_REED_CIL_SCAR_GALL: 'Anomalía reed cilindro descarga galleta',
  TIMEOUT_MOVIMENTI: 'Timeout movimientos',
  ALM_FINE_PRODOTTO: 'Fin de producto',
  ALM_CIL_NON_IN_POS_ALTA: 'Cilindro no en posición alta',
  TEM_KO_ALLO_START_CICLO: 'Fallo tiempo arranque ciclo',
  ALM_PRESSIONE_ARIA: 'Alarma presión de aire',
  ALM_DISTRIB_GRASSO: 'Alarma distribución grasa',
  ALM_LIVELLO_GRASSO: 'Alarma nivel grasa',
  NON_SQ3_IN_FASE_DI_HOME: 'SQ3 no OK en fase home',
  NON_SQ5_IN_FASE_DI_HOME: 'SQ5 no OK en fase home',
  FINE_GARANZIA: 'Fin de garantía',
  START_STOP_ATTIVO: 'Arranque / parada activo',
  MANCA_SQ6: 'Falta SQ6',
  DRY_CICLE_ATTIVO: 'Ciclo dry activo',
  'STOP_RES_RISCALD_100%': 'Parada resistencias calentamiento 100%',
  ALM_RISERVA_1: 'Alarma reserva 1',
  ALM_RISERVA_2: 'Alarma reserva 2',
  ALM_RISERVA_3: 'Alarma reserva 3',
  ALM_RISERVA_4: 'Alarma reserva 4',
  ALM_RISERVA_5: 'Alarma reserva 5',
  ALM_RISERVA_6: 'Alarma reserva 6',
  ALM_RISERVA_7: 'Alarma reserva 7',
  ALM_RISERVA_8: 'Alarma reserva 8',
  ALM_RISERVA_9: 'Alarma reserva 9',
  ALM_RISERVA_10: 'Alarma reserva 10',
  ALM_RISERVA_11: 'Alarma reserva 11',
  ALM_RISERVA_12: 'Alarma reserva 12',
  ALM_RISERVA_13: 'Alarma reserva 13',
  ALM_RISERVA_14: 'Alarma reserva 14',
  ALM_RISERVA_15: 'Alarma reserva 15',
  ALM_RISERVA_16: 'Alarma reserva 16',
  ALM_RISERVA_17: 'Alarma reserva 17',
  ALM_RISERVA_19: 'Alarma reserva 19',
  ALM_RISERVA_20: 'Alarma reserva 20',
  ALM_RISERVA_21: 'Alarma reserva 21',
  ALM_RISERVA_22: 'Alarma reserva 22',
  ALM_RISERVA_23: 'Alarma reserva 23',
  ALM_RISERVA_24: 'Alarma reserva 24',
  ALM_RISERVA_25: 'Alarma reserva 25',
  ALM_RISERVA_26: 'Alarma reserva 26',
  ALM_RISERVA_27: 'Alarma reserva 27',
  ALM_RISERVA_28: 'Alarma reserva 28',
  ALM_RISERVA_29: 'Alarma reserva 29',
  ALM_RISERVA_30: 'Alarma reserva 30',
  ALM_RISERVA_31: 'Alarma reserva 31',
  ALM_RISERVA_32: 'Alarma reserva 32',
  ALM_RISERVA_33: 'Alarma reserva 33',
};

const ALARM_PRIORITY = {
  EMERGENZA_PREMUTA: 1,
  CENT_IDRAULICA_SPENTA: 2,
  CENT_IDR_SPENTA_IN_CICLO: 3,
  TERMICO_RES_SUP_INTERV: 10,
  TERMICO_RES_INF_INTERV: 11,
  TERMICO_CENT_IDR_INTERV: 12,
};

function alarmBanner_update(data) {
  const banner = document.getElementById('alarm-banner');
  const line1 = document.getElementById('alarm-line-1');
  const line2 = document.getElementById('alarm-line-2');
  if (!banner || !line1 || !line2) return;

  if (!data || data.id !== 'PLC1') return;

  if (!data.status) {
    banner.classList.remove('alarm-banner--hidden');
    banner.classList.add('alarm-banner--offline');
    line1.textContent = '⚠ Sin comunicación Modbus con PLC1';
    line2.textContent = 'Revise IP/puerto en config/plcs.json y que el servidor Node esté en marcha.';
    return;
  }

  banner.classList.remove('alarm-banner--offline');
  const tags = data.tags || {};
  const active = [];

  for (const tag of Object.keys(ALARM_TEXT)) {
    if (!tags[tag]) continue;
    active.push({ tag, text: ALARM_TEXT[tag], pri: ALARM_PRIORITY[tag] ?? 50 });
  }

  active.sort((a, b) => a.pri - b.pri || a.text.localeCompare(b.text));

  if (active.length === 0) {
    banner.classList.add('alarm-banner--hidden');
    line1.textContent = '';
    line2.textContent = '';
    return;
  }

  banner.classList.remove('alarm-banner--hidden');

  const sep = '  ●  ';
  const full = active.map(a => a.text).join(sep);
  const max1 = 140;
  if (full.length <= max1) {
    line1.textContent = full;
    line2.textContent = active.length > 1 ? `${active.length} alarmas activas` : '';
  } else {
    line1.textContent = full.slice(0, max1).trim() + '…';
    line2.textContent = full.slice(max1).trim() || `${active.length} alarmas activas`;
  }
}
