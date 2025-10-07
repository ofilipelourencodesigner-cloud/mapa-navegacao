import { initMap } from './map.js';
import { wireOverviewUI } from './ui.js';

// ===================== CHAVES =====================
// COLE SUAS CHAVES AQUI:
const MAPTILER_KEY = 'LPF4PdydkUaFkn9Kv7jl';
const ORS_KEY      = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU3NjRjMmY0NzdhZTQ5MGY5MjJiYmRhYTIzOGM0ZDBiIiwiaCI6Im11cm11cjY0In0=';
// ==================================================

// Inicializa o mapa (MapTiler + Leaflet)
const map = initMap(MAPTILER_KEY);

// Liga a UI do "Mostrar visão geral"
wireOverviewUI({ map, MAPTILER_KEY, ORS_KEY });
