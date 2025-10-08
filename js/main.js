// js/main.js
import { initMap, clearMap, addNumberedMarkers, fitToRoute, setStatus } from './map.js';
import { parseRouteInput, loadLogicalPoints, fetchORSRoute } from './data.js';
import { startNavigation, stopNavigation } from './nav.js';

// ======== COLE SUAS CHAVES AQUI ========
const MAPTILER_KEY = 'LPF4PdydkUaFkn9Kv7jl';
const ORS_KEY      = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU3NjRjMmY0NzdhZTQ5MGY5MjJiYmRhYTIzOGM0ZDBiIiwiaCI6Im11cm11cjY0In0=';
// =======================================

const ui = {
  input: document.getElementById('rotaInput'),
  btnOverview: document.getElementById('btnOverview'),
  btnNavigate: document.getElementById('btnNavigate')
};

const { map, groups } = initMap(MAPTILER_KEY);

let current = {
  code: null,            // { id:'003', dir:'ida'|'retorno' }
  logicalPoints: null,   // pontos “originais” do seu arquivo
  routeLatLngs: null,    // polilinha expandida pela ORS
  steps: [],             // instruções ORS
  stats: null,           // {km, min}
  stopNav: null          // função para encerrar navegação
};

// ---------- helpers ----------
function resetNavIfRunning(){
  if (current.stopNav){
    current.stopNav();
    current.stopNav = null;
    ui.btnNavigate.textContent = 'Iniciar rota';
  }
}

async function buildOverview(){
  try{
    resetNavIfRunning();
    clearMap(groups);
    setStatus('Carregando...', 'muted');

    const parsed = parseRouteInput(ui.input.value);
    if (!parsed) throw new Error('Informe a rota. Exemplos: 3 (ida), 3r (retorno)');
    current.code = parsed;

    // 1) pontos lógicos (seus JSONs)
    current.logicalPoints = await loadLogicalPoints(parsed);

    // 2) marcadores numerados
    addNumberedMarkers(groups, current.logicalPoints);

    // 3) rota ORS para navegação
    const { latlngs, steps, stats } = await fetchORSRoute(current.logicalPoints, ORS_KEY);
    current.routeLatLngs = latlngs;
    current.steps = steps;
    current.stats = stats;

    groups.routeDone.setLatLngs([]);
    groups.routeRemaining.setLatLngs(latlngs);
    fitToRoute(map, groups);

    if (stats){
      setStatus(
        `Visão geral — <span class="tag">${current.logicalPoints.length} pontos</span>`+
        `<span class="tag">${stats.km.toFixed(1)} km</span>`+
        `<span class="tag">${Math.round(stats.min)} min</span>`, 'ok'
      );
    }else{
      setStatus(`Visão geral — ${current.logicalPoints.length} pontos`, 'ok');
    }

  }catch(err){
    console.error(err);
    setStatus('Erro: '+(err.message||String(err)), 'err');
  }
}

function toggleNavigation(){
  if (!current.routeLatLngs || !current.routeLatLngs.length){
    setStatus('Carregue uma rota primeiro (Mostrar visão geral).', 'err');
    return;
  }
  if (current.stopNav){
    current.stopNav();              // parar
    current.stopNav = null;
    ui.btnNavigate.textContent = 'Iniciar rota';
    setStatus('Navegação encerrada.', 'muted');
    return;
  }

  // iniciar
  current.stopNav = startNavigation(map, groups, current.routeLatLngs, { recenter:true });
  ui.btnNavigate.textContent = 'Parar rota';
  setStatus('Navegação ativa — a tela será mantida ligada.', 'ok');
}

// ---------- eventos ----------
ui.btnOverview.addEventListener('click', buildOverview);
ui.input.addEventListener('keydown', e=>{ if (e.key==='Enter') buildOverview(); });
ui.btnNavigate.addEventListener('click', toggleNavigation);

// dica inicial
setStatus('Digite a rota (ex.: 1, 3r) e clique em <b>Mostrar visão geral</b>.', 'muted');
