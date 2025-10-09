// js/nav.js

let watchId = null;
let wakeLock = null;
let active = false;
let route = [];
let currentIndex = 0;
let map, groups, onStatusUpdate;

// Marcador do motorista + círculo de precisão
const meMarker = L.circleMarker([0, 0], { radius: 7, weight: 2, color: '#00FFFF', fillColor: '#00FFFF', fillOpacity: 0.9, pane: 'tooltipPane' });
const accuracyCircle = L.circle([0, 0], { radius: 0, color: '#00FFFF', weight: 1, opacity: 0.3, interactive: false });

// --- Funções Auxiliares (cálculos de distância, etc.) ---

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

function nearestAheadIndex(routePoints, fromIndex, currentPos, searchWindow = 40) {
  const n = routePoints.length;
  if (n === 0) return 0;
  
  let bestIndex = fromIndex;
  let bestDistance = Infinity;

  const endIndex = Math.min(n - 1, fromIndex + searchWindow);
  for (let i = fromIndex; i <= endIndex; i++) {
    const d = haversineMeters(routePoints[i], currentPos);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }
  return Math.max(fromIndex, bestIndex); // Evita andar para trás
}

// --- Funções de Controle da Navegação ---

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn('WakeLock falhou:', err.name, err.message);
    }
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
  }
}

function updateMapOnPosition(pos) {
    if (!active) return;

    const here = [pos.coords.latitude, pos.coords.longitude];
    const acc = pos.coords.accuracy || 0;

    meMarker.setLatLng(here);
    accuracyCircle.setLatLng(here).setRadius(acc);
    
    // Recentraliza o mapa se o motorista sair da visão
    if (!map.getBounds().contains(here)) {
        map.panTo(here, { animate: true });
    }

    // Avança o índice na rota
    currentIndex = nearestAheadIndex(route, currentIndex, here);
    
    // Atualiza as polilinhas (cinza = percorrido, azul = restante)
    const done = route.slice(0, currentIndex + 1);
    // Adiciona a posição atual ao início do trecho percorrido para uma linha contínua
    if (done.length > 0) done.unshift(here);
    
    const remaining = route.slice(currentIndex);
    // Adiciona a posição atual ao início do trecho restante
    remaining.unshift(here);

    groups.routeDone.setLatLngs(done);
    groups.routeRemaining.setLatLngs(remaining);

    // Verifica se chegou ao fim
    const distToEnd = haversineMeters(here, route[route.length - 1]);
    if (distToEnd < 30 && currentIndex >= route.length - 2) {
        onStatusUpdate('Rota concluída 🎉', 'ok');
        stopNavigation();
    } else {
        onStatusUpdate('Navegação ativa. Dirija com atenção.', 'ok');
    }
}

function handleGpsError(err) {
  const msg = err.code === 1 ? 'Permissão de localização negada.' :
              err.code === 2 ? 'Sinal de GPS indisponível.' :
              'Falha ao obter localização.';
  onStatusUpdate(`Erro de GPS: ${msg}`, 'err');
  stopNavigation();
}

/**
 * Inicia o modo de navegação.
 * @param {object} options - Opções de navegação.
 * @param {L.Map} options.map - A instância do mapa Leaflet.
 * @param {object} options.groups - O objeto contendo as layerGroups.
 * @param {Array<[number, number]>} options.routeLatLngs - Array de coordenadas da rota.
 * @param {function} options.onStatusUpdate - Função para atualizar a UI de status.
 */
export function startNavigation(options) {
  if (active) return;

  map = options.map;
  groups = options.groups;
  route = options.routeLatLngs;
  onStatusUpdate = options.onStatusUpdate;
  
  currentIndex = 0;
  active = true;

  // Limpa marcadores e rotas antigas para focar na navegação
  groups.markers.clearLayers();
  
  meMarker.addTo(map);
  accuracyCircle.addTo(map);
  
  requestWakeLock();

  watchId = navigator.geolocation.watchPosition(
    updateMapOnPosition,
    handleGpsError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/**
 * Para o modo de navegação.
 */
export function stopNavigation() {
  if (!active) return;
  active = false;
  
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  
  releaseWakeLock();
  
  // Remove os marcadores de navegação do mapa
  meMarker.remove();
  accuracyCircle.remove();
}

/**
 * Verifica se a navegação está ativa.
 * @returns {boolean}
 */
export function isNavigating() {
  return active;
}
