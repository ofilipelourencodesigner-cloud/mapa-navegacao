// js/nav.js

// --- MÓDULO DE NAVEGAÇÃO AVANÇADA ---
let watchId = null;
let wakeLock = null;
let active = false;
let route = [], steps = [], totalStats = {};
let currentIndex = 0, currentStepIndex = -1;
let map, groups, onStatusUpdate;

const ui = {
    instructionsPanel: document.getElementById('nav-instructions'),
    icon: document.getElementById('nav-icon'),
    text: document.getElementById('nav-text'),
    statusPanel: document.getElementById('nav-status'),
    eta: document.getElementById('nav-eta'),
    distance: document.getElementById('nav-distance'),
    arrival: document.getElementById('nav-arrival'),
};

const meMarker = L.circleMarker([0, 0], { radius: 8, weight: 2, color: 'white', fillColor: '#00aaff', fillOpacity: 1, pane: 'tooltipPane' });
const accuracyCircle = L.circle([0, 0], { radius: 0, color: '#00aaff', weight: 1, opacity: 0.3, interactive: false });

// --- FUNÇÕES AUXILIARES ---
function haversineMeters(a, b) {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const aa = s1 * s1 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function nearestAheadIndex(routePoints, fromIndex, currentPos, searchWindow = 20) {
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
    switch (type) {
        case 0: return '↖️'; case 1: return '↗️'; case 2: return '⬆️'; case 3: return '⬆️';
        case 4: return '↩️'; case 5: return '↪️'; case 6: return '⬆️'; case 7: return '🔄';
        case 8: return '🔄'; case 9: return '↪️'; case 10: return '🏁'; case 11: return '📍';
        default: return '➡️';
    }
}

// --- CONTROLE DE VOZ (opcional) ---
function speak(text) {
    // Para ativar a voz, mude a linha abaixo para: const FalarInstrucoes = true;
    const FalarInstrucoes = false; 
    if (FalarInstrucoes && 'speechSynthesis' in window && text) {
        speechSynthesis.cancel(); // Cancela falas anteriores
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        speechSynthesis.speak(utterance);
    }
}

// --- CONTROLES PRINCIPAIS ---
async function requestWakeLock() { if ('wakeLock' in navigator) try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) { console.warn('WakeLock falhou:', err.name, err.message); } }
async function releaseWakeLock() { if (wakeLock) { await wakeLock.release(); wakeLock = null; } }

function updateInstructionsAndStats() {
    let stepIndex = -1;
    for (let i = 0; i < steps.length; i++) {
        const wayPoints = steps[i].way_points;
        if (currentIndex >= wayPoints[0] && currentIndex <= wayPoints[1]) {
            stepIndex = i; break;
        }
    }

    if (stepIndex !== -1 && stepIndex !== currentStepIndex) {
        currentStepIndex = stepIndex;
        const currentStep = steps[stepIndex];
        ui.icon.textContent = getManeuverIcon(currentStep.type);
        ui.text.textContent = currentStep.instruction;
        speak(currentStep.instruction);
    }

    let remainingDistance = 0;
    let remainingDuration = 0;
    if (steps.length > 0 && currentStepIndex !== -1) {
        for (let i = currentStepIndex; i < steps.length; i++) {
            remainingDistance += steps[i].distance;
            remainingDuration += steps[i].duration;
        }
    }
    
    const remainingKm = (remainingDistance / 1000).toFixed(1);
    const remainingMin = Math.round(remainingDuration / 60);
    const arrivalTime = new Date(Date.now() + remainingDuration * 1000);
    ui.eta.textContent = remainingMin;
    ui.distance.textContent = `${remainingKm} km`;
    ui.arrival.textContent = arrivalTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function updateMapOnPosition(pos) {
    if (!active) return;
    const here = [pos.coords.latitude, pos.coords.longitude];
    meMarker.setLatLng(here);
    accuracyCircle.setLatLng(here).setRadius(pos.coords.accuracy || 0);
    if (!map.getBounds().pad(0.2).contains(here)) { map.panTo(here); }

    currentIndex = nearestAheadIndex(route, currentIndex, here);
    
    const done = route.slice(0, currentIndex + 1);
    const remaining = route.slice(currentIndex);
    if(currentIndex > 0) done.push(here);
    remaining.unshift(here);

    groups.routeDone.setLatLngs(done);
    groups.routeRemaining.setLatLngs(remaining);

    updateInstructionsAndStats();

    if (haversineMeters(here, route[route.length - 1]) < 30 && currentIndex >= route.length - 2) {
        onStatusUpdate('Rota concluída 🎉', 'ok');
        stopNavigation();
    } else {
        onStatusUpdate('', 'ok'); // Limpa status da barra superior para não interferir
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
  route = options.routeLatLngs; steps = options.steps || [];
  totalStats = options.stats || {}; onStatusUpdate = options.onStatusUpdate;
  
  currentIndex = 0; active = true; currentStepIndex = -1;

  groups.markers.clearLayers();
  meMarker.addTo(map); accuracyCircle.addTo(map);
  ui.instructionsPanel.classList.remove('hidden');
  ui.statusPanel.classList.remove('hidden');
  
  updateInstructionsAndStats(); // Mostra status inicial
  requestWakeLock();
  watchId = navigator.geolocation.watchPosition(updateMapOnPosition, handleGpsError, { enableHighAccuracy: true });
}

export function stopNavigation() {
  if (!active) return;
  active = false;
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  releaseWakeLock();
  
  meMarker.remove(); accuracyCircle.remove();
  ui.instructionsPanel.classList.add('hidden');
  ui.statusPanel.classList.add('hidden');
  speechSynthesis.cancel(); // Para qualquer fala em andamento
}

export function isNavigating() { return active; }
