let map;
let rotas = {};
let rotaSelecionada = null;
let routeLine = null;

// Inicializar mapa
document.addEventListener("DOMContentLoaded", async () => {
  map = L.map("map").setView([-27.5954, -48.5480], 13);

  // camada do Mapbox
  L.tileLayer(
    "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=" + L.mapboxAccessToken,
    {
      maxZoom: 20,
      id: "mapbox/streets-v11",
      tileSize: 512,
      zoomOffset: -1
    }
  ).addTo(map);

  // carregar rotas
  await carregarRotas();

  // eventos dos botões
  document.getElementById("mostrar").addEventListener("click", mostrarRota);
  document.getElementById("navegar").addEventListener("click", iniciarNavegacao);
});

// carregar rotas do JSON
async function carregarRotas() {
  try {
    const resp = await fetch("rotas.json");
    rotas = await resp.json();

    const select = document.getElementById("rota");
    select.innerHTML = '<option value="">-- escolha --</option>';

    Object.keys(rotas).forEach((rotaId) => {
      const opt = document.createElement("option");
      opt.value = rotaId;
      opt.textContent = rotas[rotaId].nome;
      select.appendChild(opt);
    });

    select.addEventListener("change", (e) => {
      rotaSelecionada = rotas[e.target.value];
    });
  } catch (err) {
    alert("Erro ao carregar rotas!");
    console.error(err);
  }
}

// mostrar rota no mapa
function mostrarRota() {
  if (!rotaSelecionada) {
    alert("Selecione uma rota primeiro!");
    return;
  }

  // remover linha anterior
  if (routeLine) {
    map.removeLayer(routeLine);
  }

  // desenhar pontos
  rotaSelecionada.pontos.forEach((p, i) => {
    L.marker([p.lat, p.lng]).addTo(map).bindPopup(`Ponto ${i + 1}`);
  });

  // desenhar linha azul
  const coords = rotaSelecionada.pontos.map((p) => [p.lat, p.lng]);
  routeLine = L.polyline(coords, {
    color: "blue",
    weight: 6,
    opacity: 0.7
  }).addTo(map);

  map.fitBounds(routeLine.getBounds());
}

// simular navegação (passo a passo)
function iniciarNavegacao() {
  if (!rotaSelecionada) {
    alert("Selecione uma rota primeiro!");
    return;
  }

  let passo = 0;
  const coords = rotaSelecionada.pontos.map((p) => [p.lat, p.lng]);

  const marker = L.marker(coords[0], { icon: L.divIcon({ className: "arrow", html: "🚐" }) })
    .addTo(map);

  const mover = () => {
    if (passo >= coords.length) {
      alert("Chegou ao destino!");
      return;
    }
    marker.setLatLng(coords[passo]);
    map.setView(coords[passo], 16, { animate: true });
    passo++;
    setTimeout(mover, 2000);
  };

  mover();
}
