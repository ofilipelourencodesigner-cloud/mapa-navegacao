// js/nav.js

let watchId = null;
let wakeLock = null;
let active = false;
let route = [];
let steps = []; // Armazena as instruções
let currentIndex = 0;
let currentStepIndex = -1;
let map, groups, onStatusUpdate;

// Elementos da UI de navegação
const ui = {
    instructionsPanel: document.getElementById('nav-instructions'),
    icon: document.getElementById('nav-icon'),
    text: document.getElementById('nav-text'),
};

const meMarker = L.circleMarker([0, 0], { radius: 7, weight: 2, color: '#00FFFF', fillColor: '#00FFFF', fillOpacity: 0.9, pane: 'tooltipPane' });
const accuracyCircle = L.circle([0, 0], { radius: 0, color: '#00FFFF', weight: 1, opacity: 0.3, interactive: false });

// --- Funções Auxiliares ---
function haversineMeters(a, b) {
  const [lat1, lon1] = a; const [lat2, lon2] = b; const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2); const s2 = Math.sin(dLon / 2);
  const aa = s1 * s1 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa)); return R * c;
}

function nearestAheadIndex(routePoints, fromIndex, currentPos, searchWindow = 40) {
  const n = routePoints.length; if (n === 0) return 0;
  let bestIndex = fromIndex; let bestDistance = Infinity;
  const endIndex = Math.min(n - 1, fromIndex + searchWindow);
  for (let i = fromIndex; i <= endIndex; i++) {
    const d = haversineMeters(routePoints[i], currentPos);
    if (d < bestDistance) { bestDistance = d; bestIndex = i; }
  }
  return Math.max(fromIndex, bestIndex);
}

function getManeuverIcon(type) {
    // Mapeia tipos de manobra da API para ícones
    switch (type) {
        case 0: return '↖️'; // Left
        case 1: return '↗️'; // Right
        case 2: return '⬆️'; // Sharp left
        case 3: return '⬆️'; // Sharp right
        case 4: return '↩️'; // Slight left
        case 5: return '↪️'; // Slight right
        case 6: return '⬆️'; // Straight
        case 7: return '🔄'; // Enter roundabout
        case 8: return '🔄'; // Exit roundabout
        case 9: return '↪️'; // U-turn
        case 10: return '🏁';// Goal
        case 11: return '📍';// Depart
        default: return '➡️';
    }
}

// --- Funções de Controle ---
async function requestWakeLock() { if ('wakeLock' in navigator) try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) { console.warn('WakeLock falhou:', err.name, err.message); } }
async function releaseWakeLock() { if (wakeLock) { await wakeLock.release(); wakeLock = null; } }

function updateInstructions() {
    // Encontra qual instrução (step) corresponde à posição atual (currentIndex)
    let stepIndex = -1;
    for (let i = 0; i < steps.length; i++) {
        const wayPoints = steps[i].way_points;
        if (currentIndex >= wayPoints[0] && currentIndex <= wayPoints[1]) {
            stepIndex = i;
            break;
        }
    }

    // Se a instrução mudou, atualiza o painel na tela
    if (stepIndex !== -1 && stepIndex !== currentStepIndex) {
        currentStepIndex = stepIndex;
        const currentStep = steps[stepIndex];
        ui.icon.textContent = getManeuverIcon(currentStep.type);
        ui.text.textContent = currentStep.instruction;
    }
}


function updateMapOnPosition(pos) {
    if (!active) return;
    const here = [pos.coords.latitude, pos.coords.longitude];
    meMarker.setLatLng(here);
    accuracyCircle.setLatLng(here).setRadius(pos.coords.accuracy || 0);
    
    if (!map.getBounds().pad(0.2).contains(here)) { map.panTo(here, { animate: true }); }

    currentIndex = nearestAheadIndex(route, currentIndex, here);
    
    const done = route.slice(0, currentIndex + 1);
    const remaining = route.slice(currentIndex);
    done.push(here); remaining.unshift(here);

    groups.routeDone.setLatLngs(done);
    groups.routeRemaining.setLatLngs(remaining);

    // CHAMA A ATUALIZAÇÃO DAS INSTRUÇÕES
    updateInstructions();

    const distToEnd = haversineMeters(here, route[route.length - 1]);
    if (distToEnd < 30 && currentIndex >= route.length - 2) {
        onStatusUpdate('Rota concluída 🎉', 'ok');
        stopNavigation();
    } else {
        const statusMsg = `Navegação ativa. Dirija com atenção.`;
        onStatusUpdate(statusMsg, 'ok');
    }
}

function handleGpsError(err) {
  const msg = err.code === 1 ? 'Permissão negada.' : err.code === 2 ? 'Sinal indisponível.' : 'Falha ao obter localização.';
  onStatusUpdate(`Erro de GPS: ${msg}`, 'err');
  stopNavigation();
}

export function startNavigation(options) {
  if (active) return;
  map = options.map; groups = options.groups;
  route = options.routeLatLngs; steps = options.steps || []; // Recebe as instruções
  onStatusUpdate = options.onStatusUpdate;
  
  currentIndex = 0; active = true; currentStepIndex = -1;

  groups.markers.clearLayers();
  meMarker.addTo(map); accuracyCircle.addTo(map);
  ui.instructionsPanel.classList.remove('hidden'); // MOSTRA O PAINEL
  
  requestWakeLock();
  watchId = navigator.geolocation.watchPosition(updateMapOnPosition, handleGpsError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

export function stopNavigation() {
  if (!active) return;
  active = false;
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  releaseWakeLock();
  
  meMarker.remove(); accuracyCircle.remove();
  ui.instructionsPanel.classList.add('hidden'); // ESCONDE O PAINEL
}

export function isNavigating() { return active; }
