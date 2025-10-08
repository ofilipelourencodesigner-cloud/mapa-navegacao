// js/nav.js
// Navegação passo-a-passo com consumo de linha (azul -> cinza) e wake lock.
// Uso esperado:
//   import { createNavigator } from './js/nav.js'
//   const nav = createNavigator({ map, onStatus: setStatus });
//   await nav.start(latlngs);
//   nav.stop();

function toLatLng(p) {
  // garante [lat, lng] float
  if (Array.isArray(p) && p.length >= 2) return [Number(p[0]), Number(p[1])];
  if (p && typeof p.lat === 'number' && typeof p.lng === 'number') return [p.lat, p.lng];
  if (p && typeof p.lat === 'number' && typeof p.lon === 'number') return [p.lat, p.lon];
  return null;
}

// Distância haversine em metros
function haversineMeters(a, b) {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const aa =
    s1 * s1 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

// encontra o índice mais próximo à posição, pesquisando apenas para frente
function nearestAheadIndex(route, fromIdx, pos, window = 30) {
  const n = route.length;
  if (n === 0) return 0;
  let bestIdx = fromIdx;
  let bestD = Infinity;

  const end = Math.min(n - 1, fromIdx + window);
  for (let i = fromIdx; i <= end; i++) {
    const d = haversineMeters(route[i], pos);
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }

  // se por algum motivo o melhor ficou muito pior que o ponto atual,
  // evita recuos (travamento em rotatórias, por exemplo)
  return Math.max(fromIdx, bestIdx);
}

export function createNavigator({ map, onStatus }) {
  // camadas
  const completed = L.polyline([], { color: '#9aa4b2', weight: 6, opacity: 0.95 }); // cinza
  const remaining = L.polyline([], { color: '#1e80ff', weight: 6, opacity: 0.95 }); // azul

  let route = [];          // array de [lat,lng]
  let idx = 0;             // índice atual na rota
  let watchId = null;      // geolocation watch id
  let wakeLock = null;     // wake lock handler
  let active = false;

  // marcador do motorista + círculo de precisão
  const me = L.circleMarker([0, 0], {
    radius: 7,
    weight: 2,
    color: '#0b8',
    fillColor: '#0b8',
    fillOpacity: 0.8
  });
  const accuracy = L.circle([0, 0], { radius: 0, color: '#0b8', weight: 1, opacity: 0.25 });

  function setStatus(msg, cls = 'muted') {
    if (typeof onStatus === 'function') onStatus(msg, cls);
  }

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock.request) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener?.('release', () => {
          wakeLock = null;
        });
      }
    } catch (e) {
      // silencioso; nem todos os browsers suportam
      wakeLock = null;
    }
  }

  async function releaseWakeLock() {
    try {
      if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch {}
  }

  function mountLayers() {
    completed.addTo(map);
    remaining.addTo(map);
    me.addTo(map);
    accuracy.addTo(map);
  }

  function unmountLayers() {
    completed.remove();
    remaining.remove();
    me.remove();
    accuracy.remove();
  }

  function updatePolylines() {
    const done = route.slice(0, Math.max(1, idx));
    const todo = route.slice(Math.max(0, idx));

    completed.setLatLngs(done);
    remaining.setLatLngs(todo);
  }

  function recenterIfNeeded(latlng) {
    // não recentra o tempo todo para evitar jitter.
    // só recentra se o ponto sair de um padding interno.
    const padding = 80;
    const pt = map.latLngToContainerPoint(latlng);
    const size = map.getSize();
    const inside =
      pt.x > padding &&
      pt.y > padding &&
      pt.x < size.x - padding &&
      pt.y < size.y - padding;

    if (!inside) map.panTo(latlng, { animate: true });
  }

  function handlePosition(pos) {
    if (!active || route.length === 0) return;

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const acc = pos.coords.accuracy || 0;

    const here = [lat, lon];

    me.setLatLng(here);
    accuracy.setLatLng(here).setRadius(acc);

    // avança índice procurando o ponto mais próximo à frente
    idx = nearestAheadIndex(route, idx, here, 40);

    updatePolylines();
    recenterIfNeeded(here);

    // terminou?
    const distToEnd = haversineMeters(here, route[route.length - 1]);
    if (distToEnd < 25 && idx >= route.length - 2) {
      setStatus('Rota concluída 🎉', 'ok');
      stop();
    } else {
      const remainingMeters = route
        .slice(idx)
        .reduce((sum, p, i, arr) => {
          if (i === 0) return sum + haversineMeters(here, arr[0]);
          return sum + haversineMeters(arr[i - 1], p);
        }, 0);

      const km = (remainingMeters / 1000).toFixed(1);
      setStatus(`Navegando — faltam ${km} km`, 'ok');
    }
  }

  function handleError(err) {
    const msg =
      err && err.code === 1
        ? 'Permissão de localização negada.'
        : err && err.code === 2
        ? 'Posição indisponível.'
        : err && err.code === 3
        ? 'Tempo excedido para obter localização.'
        : (err && err.message) || 'Falha na geolocalização.';

    setStatus(`Erro de GPS: ${msg}`, 'err');
  }

  async function start(latlngs) {
    if (!Array.isArray(latlngs) || latlngs.length < 2) {
      throw new Error('Rota inválida para navegação.');
    }

    // normaliza pontos
    route = latlngs.map(toLatLng).filter(Boolean);

    if (route.length < 2) {
      throw new Error('Rota sem pontos suficientes.');
    }

    // inicia no primeiro ponto SEM pular para o mais próximo — isso evita
    // começar já do 2 quando você está longe do início.
    idx = 0;
    active = true;

    mountLayers();
    completed.setLatLngs([route[0]]); // já mostra um ponto cinza de partida
    remaining.setLatLngs(route.slice(0));
    me.setLatLng(route[0]);
    accuracy.setLatLng(route[0]).setRadius(0);

    map.fitBounds(L.polyline(route).getBounds(), { padding: [60, 60] });

    await requestWakeLock();

    // liga GPS
    try {
      if (!('geolocation' in navigator)) {
        setStatus('Este dispositivo não suporta geolocalização.', 'err');
        return;
      }

      watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });

      setStatus('Navegação iniciada. Dirija com atenção.', 'ok');
    } catch (err) {
      handleError(err);
    }
  }

  async function stop() {
    if (!active) return;
    active = false;

    if (watchId !== null) {
      try { navigator.geolocation.clearWatch(watchId); } catch {}
      watchId = null;
    }
    await releaseWakeLock();
    unmountLayers();
  }

  function isActive() {
    return active;
  }

  return { start, stop, isActive };
}
