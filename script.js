// Configuração do Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiZmlsaXBldHJhbnNwb3J0ZSIsImEiOiJjbWVtMTk1eHowZzU3Mmlva2dmejF3a3JrIn0.AqLF-HXkCaxuWL6eLBBrOQ';

// Inicializa o mapa
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-48.670, -26.915], // Centro inicial aproximado (Green Valley)
    zoom: 12
});

let rotas = {};
let rotaAtual = null;

// Carrega o arquivo rotas.json
fetch('rotas.json')
    .then(response => response.json())
    .then(data => {
        rotas = data;
        const select = document.getElementById('rotaSelect');
        Object.keys(rotas).forEach(nome => {
            const option = document.createElement('option');
            option.value = nome;
            option.textContent = rotas[nome].nome;
            select.appendChild(option);
        });
    });

// Botão Mostrar Rota
document.getElementById('mostrarRota').addEventListener('click', () => {
    const rotaId = document.getElementById('rotaSelect').value;
    if (!rotaId) {
        alert("Selecione uma rota primeiro.");
        return;
    }

    rotaAtual = rotas[rotaId];

    // Remove rota antiga, se existir
    if (map.getSource('rota')) {
        map.removeLayer('linhaRota');
        map.removeSource('rota');
    }
    if (map.getLayer('pontos')) {
        map.removeLayer('pontos');
        map.removeSource('pontos');
    }

    // Adiciona a linha da rota
    map.addSource('rota', {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: rotaAtual.pontos
            }
        }
    });

    map.addLayer({
        id: 'linhaRota',
        type: 'line',
        source: 'rota',
        paint: {
            'line-color': '#ff0000',
            'line-width': 4
        }
    });

    // Adiciona os pontos
    map.addSource('pontos', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: rotaAtual.pontos.map((coord, i) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: coord },
                properties: { numero: i + 1 }
            }))
        }
    });

    map.addLayer({
        id: 'pontos',
        type: 'circle',
        source: 'pontos',
        paint: {
            'circle-radius': 8,
            'circle-color': '#007cbf'
        }
    });

    // Ajusta o mapa para a rota
    const bounds = new mapboxgl.LngLatBounds();
    rotaAtual.pontos.forEach(coord => bounds.extend(coord));
    map.fitBounds(bounds, { padding: 50 });
});

// Botão Iniciar Navegação
document.getElementById('iniciarNavegacao').addEventListener('click', () => {
    if (!rotaAtual) {
        alert("Selecione e mostre uma rota antes de iniciar a navegação.");
        return;
    }

    let passo = 0;
    function proximoPasso() {
        if (passo >= rotaAtual.pontos.length) {
            alert("Navegação concluída!");
            return;
        }
        map.flyTo({ center: rotaAtual.pontos[passo], zoom: 16 });
        alert(`Indo para o ponto ${passo + 1}`);
        passo++;
    }

    proximoPasso();
    document.getElementById('iniciarNavegacao').onclick = proximoPasso;
});
