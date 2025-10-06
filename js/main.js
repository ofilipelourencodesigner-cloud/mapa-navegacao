import { initMap } from './map.js';
import { wireOverviewUI } from './ui.js';

// >>>>>>>>>>>> COLE SUAS CHAVES AQUI <<<<<<<<<<<<
const MAPTILER_KEY = 'LPF4PdydkUaFkn9Kv7jl';
const ORS_KEY      = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU3NjRjMmY0NzdhZTQ5MGY5MjJiYmRhYTIzOGM0ZDBiIiwiaCI6Im11cm11cjY0In0=';
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const map = initMap(MAPTILER_KEY);
wireOverviewUI({ map, MAPTILER_KEY, ORS_KEY });
