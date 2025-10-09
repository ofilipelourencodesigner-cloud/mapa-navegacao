// js/main.js
import { initMap, clearMap, addNumberedMarkers, fitToRoute, setStatus } from './map.js';
import { parseRouteInput, loadLogicalPoints, fetchORSRoute } from './data.js';
import { startNavigation, stopNavigation, isNavigating } from './nav.js';

// ======== COLE SUAS CHAVES AQUI ========
const MAPTILER_KEY = 'LPF4PdydkUaFkn9Kv7jl'; // SUBSTITUA AQUI
const ORS_KEY      = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU3NjRjMmY0NzdhZTQ5MGY5MjJiYmRhYTIzOGM0ZDBiIiwiaCI6Im11cm11cjY0In0='; // SUBSTITUA AQUI
// =======================================

const ui = {
  input: document.getElementById('rotaInput'),
  btnOverview: document.getElementById('btnOverview'),
  btnNavigate: document.getElementById('btnNavigate'),
  status: document.getElementById('status')
};

let map, groups;
let current = {
  logicalPoints: null,
  routeLatLngs: null,
  steps: [],
  stats: null
};

async function buildOverview() {
  if (isNavigating()) {
    stopNavigation();
    ui.btnNavigate.textContent = 'Iniciar rota';
  }
  clearMap(groups);
  setStatus('Carregando dados da rota...', 'muted');

  try {
    const parsed = parseRouteInput(ui.input.value);
    if (!parsed) throw new Error('Informe a rota. Ex: 1 (ida) ou 1r (retorno)');

    const logicalPoints = await loadLogicalPoints(parsed);
    current.logicalPoints = logicalPoints;
    addNumberedMarkers(groups.markers, logicalPoints);
    setStatus('Calculando a melhor rota...', 'muted');

    const { latlngs, steps, stats } = await fetchORSRoute(logicalPoints, ORS_KEY);
    current.routeLatLngs = latlngs;
    current.steps = steps;
    current.stats = stats;
    groups.routeRemaining.setLatLngs(latlngs);
    fitToRoute(map, groups);

    if (stats) {
      setStatus(
        `Visão geral — <span class="tag">${logicalPoints.length} pontos</span>` +
        `<span class="tag">${stats.km.toFixed(1)} km</span>` +
        `<span class="tag">${Math.round(stats.min)} min</span>`, 'ok'
      );
    } else {
      setStatus(`Visão geral — ${logicalPoints.length} pontos`, 'ok');
    }

  } catch (err) {
    console.error(err);
    setStatus(`Erro: ${err.message}`, 'err');
    current = { logicalPoints: null, routeLatLngs: null, steps: [], stats: null };
  } finally {
    ui.input.focus();
  }
}

function toggleNavigation() {
  if (isNavigating()) {
    stopNavigation();
    ui.btnNavigate.textContent = 'Iniciar rota';
    setStatus('Navegação encerrada.', 'muted');
    if(current.routeLatLngs) {
        groups.routeRemaining.setLatLngs(current.routeLatLngs);
        groups.routeDone.setLatLngs([]);
    }
    return;
  }

  if (!current.routeLatLngs || current.routeLatLngs.length === 0) {
    setStatus('Primeiro, carregue uma rota clicando em "Mostrar visão geral".', 'err');
    return;
  }

  startNavigation({
      map,
      groups,
      routeLatLngs: current.routeLatLngs,
      steps: current.steps, // Passa as instruções para o módulo de navegação
      onStatusUpdate: setStatus
  });
  
  ui.btnNavigate.textContent = 'Parar rota';
}

function main() {
    if (!MAPTILER_KEY || MAPTILER_KEY.includes('SEU_TOKEN') || !ORS_KEY || ORS_KEY.includes('SEU_TOKEN')) {
        setStatus('ATENÇÃO: Insira suas chaves de API no arquivo js/main.js', 'err');
        alert('ATENÇÃO: Insira suas chaves de API nos locais indicados no arquivo js/main.js');
        return;
    }
    if (typeof L === 'undefined') {
        setStatus('Erro crítico: A biblioteca de mapa (Leaflet) não pôde ser carregada.', 'err');
        return;
    }
    const mapData = initMap(MAPTILER_KEY);
    map = mapData.map;
    groups = mapData.groups;

    ui.btnOverview.addEventListener('click', buildOverview);
    ui.input.addEventListener('keydown', e => { if (e.key === 'Enter') buildOverview(); });
    ui.btnNavigate.addEventListener('click', toggleNavigation);

    setStatus('Digite a rota (ex: 1, 3r) e clique em <b>Mostrar visão geral</b>.', 'muted');
}

window.addEventListener('load', main);
