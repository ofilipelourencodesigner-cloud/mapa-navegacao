import { initMap } from './map.js';
import { wireOverviewUI } from './ui.js';

// >>>>>>>>>>>> COLE SUAS CHAVES AQUI <<<<<<<<<<<<
const MAPTILER_KEY = 'SUA_CHAVE_MAPTILER_AQUI';
const ORS_KEY      = 'SUA_CHAVE_OPENROUTESERVICE_AQUI';
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const map = initMap(MAPTILER_KEY);
wireOverviewUI({ map, MAPTILER_KEY, ORS_KEY });
