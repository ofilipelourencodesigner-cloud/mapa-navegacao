// Substitua pelo seu token do Mapbox
mapboxgl.accessToken = "pk.eyJ1IjoiZmlsaXBldHJhbnNwb3J0ZSIsImEiOiJjbWVtMTk1eHowZzU3Mmlva2dmejF3a3JrIn0.AqLF-HXkCaxuWL6eLBBrOQ";

// Inicializa o mapa
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-46.633309, -23.55052],
  zoom: 12
});

let rotas = [];
let rotaAtiva = null;

// Carregar rotas do JSON
fetch("rotas.json")
  .then(res => res.json())
  .then(data => {
    rotas = data.rotas;
    const select = document.getElementById("rotaSelect");
    rotas.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.nome;
      select.appendChild(opt);
    });
  });

// Mostrar a rota escolhida
document.getElementById("mostrarRota").addEventListener("click", () => {
  const id = document.getElementById("rotaSelect").value;
  if (!id) return alert("Escolha uma rota!");

  rotaAtiva = rotas.find(r => r.id == id);

  if (map.getSource("rota")) {
    map.removeLayer("rota");
    map.removeSource("rota");
  }

  map.addSource("rota", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: rotaAtiva.coordenadas
      }
    }
  });

  map.addLayer({
    id: "rota",
    type: "line",
    source: "rota",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#FF0000", "line-width": 4 }
  });

  // Centraliza no percurso
  const bounds = new mapboxgl.LngLatBounds();
  rotaAtiva.coordenadas.forEach(coord => bounds.extend(coord));
  map.fitBounds(bounds, { padding: 40 });
});

// Iniciar navegação simulada
document.getElementById("iniciarNavegacao").addEventListener("click", () => {
  if (!rotaAtiva) return alert("Selecione e mostre uma rota primeiro!");

  let i = 0;
  const marker = new mapboxgl.Marker({ color: "blue" })
    .setLngLat(rotaAtiva.coordenadas[0])
    .addTo(map);

  function mover() {
    if (i < rotaAtiva.coordenadas.length) {
      marker.setLngLat(rotaAtiva.coordenadas[i]);
      i++;
      setTimeout(mover, 1000);
    }
  }
  mover();
});
