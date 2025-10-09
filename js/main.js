// js/main.js
import { initMap, clearMap, addNumberedMarkers, fitToRoute, setStatus } from './map.js';
import { parseRouteInput, loadLogicalPoints, fetchORSRoute } from './data.js';
import { startNavigation, stopNavigation, isNavigating } from './nav.js';

// ======== COLE SUAS CHAVES AQUI ========
const MAPTILER_KEY = 'LPF4PdydkUaFkn9Kv7jl'; // SUBSTITUA AQUI
const ORS_KEY      = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU3NjRjMmY0NzdhZTQ5MGY5MjJiYmRhYTIzOGM0ZDBiIiwiaCI6Im11cm11cjY0In0='; // SUBSTITUA AQUI
// =======================================

// --- Elementos da Interface (UI) ---
const ui = {
  input: document.getElementById('rotaInput'),
  btnOverview: document.getElementById('btnOverview'),
  btnNavigate: document.getElementById('btnNavigate'),
  status: document.getElementById('status')
};

// --- Estado da Aplicação ---
let map, groups;

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
    // Limpa completamente o estado se der erro
    current = { logicalPoints: null, routeLatLngs: null, steps: [], stats: null };
  } finally {
    // Devolve o foco ao campo de input para facilitar nova busca
    ui.input.focus();
  }
}

/**
 * Controla o início e o fim da navegação.
 */
function toggleNavigation() {
  if (isNavigating()) {
    stopNavigation();
    ui.btnNavigate.textContent = 'Iniciar rota';
    setStatus('Navegação encerrada.', 'muted');
    // Restaura a visualização da rota completa
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

  // Inicia a navegação, passando os objetos e callbacks necessários
  startNavigation({
      map,
      groups,
      routeLatLngs: current.routeLatLngs,
      onStatusUpdate: setStatus
  });
  
  ui.btnNavigate.textContent = 'Parar rota';
  setStatus('Navegação ativa. A tela será mantida ligada.', 'ok');
}


/**
 * Função de inicialização do aplicativo
 */
function main() {
    // --- Verificação de Segurança Mínima ---
    if (!MAPTILER_KEY || MAPTILER_KEY.includes('SEU_TOKEN') || !ORS_KEY || ORS_KEY.includes('SEU_TOKEN')) {
        setStatus('ATENÇÃO: Insira suas chaves de API no arquivo js/main.js', 'err');
        alert('ATENÇÃO: Insira suas chaves de API nos locais indicados no arquivo js/main.js');
        return; // Impede a execução do resto
    }

    // --- Verificação da Biblioteca Leaflet ---
    if (typeof L === 'undefined') {
        setStatus('Erro crítico: A biblioteca de mapa (Leaflet) não pôde ser carregada.', 'err');
        return;
    }

    // --- Inicializa o mapa ---
    const mapData = initMap(MAPTILER_KEY);
    map = mapData.map;
    groups = mapData.groups;

    // --- Conecta os Eventos da UI ---
    ui.btnOverview.addEventListener('click', buildOverview);
    ui.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        buildOverview();
      }
    });
    ui.btnNavigate.addEventListener('click', toggleNavigation);

    setStatus('Digite a rota (ex: 1, 3r) e clique em <b>Mostrar visão geral</b>.', 'muted');
}

// --- Ponto de Entrada ---
// Garante que a página carregou completamente antes de executar o código principal
window.addEventListener('load', main);
