// js/main.js
import { initMap, clearMap, addNumberedMarkers, fitToRoute, setStatus } from './map.js';
import { parseRouteInput, loadLogicalPoints, fetchORSRoute } from './data.js';
import { startNavigation, stopNavigation, isNavigating } from './nav.js';

// ======== COLE SUAS CHAVES AQUI ========
const MAPTILER_KEY = 'LPF4PdydkUaFkn9Kv7jl'; // SUBSTITUA AQUI
const ORS_KEY      = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU3NjRjMmY0NzdhZTQ5MGY5MjJiYmRhYTIzOGM0ZDBiIiwiaCI6Im11cm11cjY0In0='; // SUBSTITUA AQUI
// =======================================

// --- Verificação de Segurança Mínima ---
if (MAPTILER_KEY.includes('SEU_TOKEN') || ORS_KEY.includes('SEU_TOKEN')) {
  alert('ATENÇÃO: Insira suas chaves de API nos locais indicados no arquivo js/main.js');
}

const ui = {
  input: document.getElementById('rotaInput'),
  btnOverview: document.getElementById('btnOverview'),
  btnNavigate: document.getElementById('btnNavigate'), // ID CORRIGIDO
  status: document.getElementById('status')
};

// Inicializa o mapa e as camadas
const { map, groups } = initMap(MAPTILER_KEY);

// Guarda o estado da rota carregada atualmente
let current = {
  logicalPoints: null, // Pontos do seu arquivo JSON
  routeLatLngs: null,  // Polilinha da rota gerada pela ORS
  steps: [],           // Instruções de texto da ORS
  stats: null          // {km, min}
};

/**
 * Função principal para buscar, processar e exibir a visão geral da rota.
 */
async function buildOverview() {
  // Se a navegação estiver ativa, para antes de carregar uma nova rota.
  if (isNavigating()) {
    stopNavigation();
    ui.btnNavigate.textContent = 'Iniciar rota';
  }

  clearMap(groups);
  setStatus('Carregando dados da rota...', 'muted');

  try {
    const parsed = parseRouteInput(ui.input.value);
    if (!parsed) {
      throw new Error('Informe a rota. Ex: 1 (ida) ou 1r (retorno)');
    }

    // 1. Carrega os pontos do arquivo JSON correspondente
    const logicalPoints = await loadLogicalPoints(parsed);
    current.logicalPoints = logicalPoints;

    // 2. Adiciona os marcadores numerados no mapa
    addNumberedMarkers(groups.markers, logicalPoints);
    
    setStatus('Calculando a melhor rota...', 'muted');

    // 3. Busca a rota na API do OpenRouteService
    const { latlngs, steps, stats } = await fetchORSRoute(logicalPoints, ORS_KEY);
    current.routeLatLngs = latlngs;
    current.steps = steps;
    current.stats = stats;

    // 4. Desenha a polilinha da rota no mapa
    groups.routeRemaining.setLatLngs(latlngs);

    // 5. Ajusta o zoom para mostrar a rota inteira
    fitToRoute(map, groups);

    // 6. Mostra o status com as estatísticas da rota
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
    // Limpa o estado se der erro
    current = { logicalPoints: null, routeLatLngs: null, steps: [], stats: null };
  }
}

/**
 * Controla o início e o fim da navegação.
 */
function toggleNavigation() {
  // Se já estiver navegando, o botão funciona para parar.
  if (isNavigating()) {
    stopNavigation();
    ui.btnNavigate.textContent = 'Iniciar rota';
    setStatus('Navegação encerrada.', 'muted');
    // Restaura a linha cheia da rota
    groups.routeRemaining.setLatLngs(current.routeLatLngs);
    groups.routeDone.setLatLngs([]);
    return;
  }

  // Se não houver rota carregada, exibe erro.
  if (!current.routeLatLngs || current.routeLatLngs.length === 0) {
    setStatus('Primeiro, carregue uma rota clicando em "Mostrar visão geral".', 'err');
    return;
  }

  // Inicia a navegação
  startNavigation({
      map,
      groups,
      routeLatLngs: current.routeLatLngs,
      onStatusUpdate: setStatus
  });
  
  ui.btnNavigate.textContent = 'Parar rota';
  setStatus('Navegação ativa. A tela será mantida ligada.', 'ok');
}


// --- Event Listeners ---
// Espera o Leaflet carregar completamente antes de adicionar eventos
window.addEventListener('load', () => {
    ui.btnOverview.addEventListener('click', buildOverview);
    ui.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        buildOverview();
      }
    });
    ui.btnNavigate.addEventListener('click', toggleNavigation);

    setStatus('Digite a rota (ex: 1, 3r) e clique em <b>Mostrar visão geral</b>.', 'muted');
});
