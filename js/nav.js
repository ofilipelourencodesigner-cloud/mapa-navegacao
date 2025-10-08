// js/nav.js

let watchId = null;
let wakeLock = null;

function haversine(a, b){
  const toRad = d => d * Math.PI/180;
  const R = 6371000; // m
  const dLat = toRad(b[0]-a[0]);
  const dLon = toRad(b[1]-a[1]);
  const s1 = Math.sin(dLat/2), s2 = Math.sin(dLon/2);
  const aa = s1*s1 + Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*s2*s2;
  return 2*R*Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
}

/** retorna índice do ponto mais próximo a “pos”, a partir de um “hint” (otimiza) */
function nearestIndex(latlngs, pos, hint = 0, window = 40){
  let best = hint, bestD = Infinity;
  const from = Math.max(0, hint - window);
  const to   = Math.min(latlngs.length-1, hint + window);
  for (let i=from;i<=to;i++){
    const d = haversine([latlngs[i].lat||latlngs[i][0], latlngs[i].lng||latlngs[i][1]], [pos.lat,pos.lng]);
    if (d < bestD){ bestD = d; best = i; }
  }
  return { index: best, meters: bestD };
}

async function requestWakeLock(){
  try{
    if ('wakeLock' in navigator){
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', ()=>{ /* noop */ });
    }
  }catch(e){ /* silencioso */ }
}
function releaseWakeLock(){
  try{ wakeLock && wakeLock.release(); }catch(e){}
  wakeLock = null;
}

/**
 * Inicia navegação.
 * @param {*} map Leaflet map
 * @param {*} groups {routeRemaining, routeDone}
 * @param {*} latlngs rota completa (array de [lat,lon] ou L.LatLng)
 * @param {*} opts { recenter:boolean }
 * @returns stop() para encerrar
 */
export function startNavigation(map, groups, latlngs, opts = {}){
  if (watchId) stopNavigation();

  // prepara polilinhas
  groups.routeDone.setLatLngs([]);
  groups.routeRemaining.setLatLngs(latlngs);

  let hint = 0;
  let lastIdxDone = -1;

  requestWakeLock();

  watchId = navigator.geolocation.watchPosition(pos=>{
    const { latitude, longitude, accuracy } = pos.coords;
    const me = { lat: latitude, lng: longitude };

    // encontra ponto de rota mais próximo
    const ll = groups.routeRemaining.getLatLngs();
    const full = groups.routeDone.getLatLngs().concat(ll);

    const near = nearestIndex(full, me, Math.max(0,lastIdxDone));
    const idx = near.index;

    // “consome” até idx
    if (idx > lastIdxDone){
      const consumed = full.slice(0, idx+1);
      const remain   = full.slice(idx+1);
      groups.routeDone.setLatLngs(consumed);
      groups.routeRemaining.setLatLngs(remain);
      lastIdxDone = idx;
    }

    // recenter opcional
    if (opts.recenter){
      map.setView(me, Math.max(map.getZoom(), 16), { animate:false });
    }

  }, err=>{
    console.error(err);
  }, { enableHighAccuracy:true, maximumAge: 1000, timeout: 10000 });

  function stopNavigation(){
    if (watchId !== null){
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    releaseWakeLock();
  }

  return stopNavigation;
}

export function stopNavigation(){
  if (watchId !== null){
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  releaseWakeLock();
}
