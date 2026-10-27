L_NO_TOUCH = false;
L_DISABLE_3D = false;

const map = L.map('map_8230f5587939f2885ed5da8710cbf274', {
  center: [-14.2, -51.9],
  crs: L.CRS.EPSG3857,
  zoom: 4,
  zoomControl: true,
  preferCanvas: false,
});

L.control.scale().addTo(map);

L.tileLayer('https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=cb1_4rfx_1_77e134656d9a7c9838805a24', {
  minZoom: 0,
  maxZoom: 18,
  maxNativeZoom: 18,
  noWrap: false,
  attribution: '\u00a9 OpenStreetMap contributors \u00a9 CARTO',
  subdomains: 'abc',
  detectRetina: false,
  tms: false,
  opacity: 1,
}).addTo(map);

const colors = {
  0: '#808080',
  1: '#2878B5',
  2: '#D64545',
  3: '#F2C14E',
};

const meshLayer = L.geoJSON(null, {
  style: (feature) => {
    const color = colors[feature.properties?.classe] || '#161616';
    return { color: '#555', fillColor: color, fillOpacity: 0.8, weight: 0.3 };
  },
  onEachFeature: (feature, layer) => {
    const { NM_MUN, classe } = feature.properties;
    layer.bindTooltip(`<div><b>Município:</b> ${NM_MUN}<br><b>Classe:</b> ${classe}</div>`, { sticky: true });

    layer.bindPopup(() => {
      const municipio = municipalityInfo.get(NM_MUN);
      if (!municipio) {
        return `<div class="municipio-popup"><b>Município:</b> ${NM_MUN}<br><b>Classe:</b> ${classe}</div>`;
      }

      return `
        <div class="municipio-popup">
          <b>Código do município:</b> ${municipio.codigo}<br>
          <b>Nome do município:</b> ${municipio.nome}<br>
          <b>Classificação:</b> ${municipio.classificacao}<br>
          <b>Latitude:</b> ${municipio.latitude.toFixed(6)}<br>
          <b>Longitude:</b> ${municipio.longitude.toFixed(6)}
        </div>
      `;
    });
  },
});

const pointsLayer = L.layerGroup();
const toggleButton = document.getElementById('visualizacao-toggle');
const municipalityInfo = new Map();

function updateClassCounts(municipios) {
  const counts = municipios.reduce((result, municipio) => {
    result[municipio.classificacao] = (result[municipio.classificacao] || 0) + 1;
    return result;
  }, {});
  const formatter = new Intl.NumberFormat('pt-BR');

  document.querySelectorAll('.class-count').forEach((element) => {
    const classe = element.dataset.class;
    element.textContent = formatter.format(counts[classe] || 0);
  });
}

function addMunicipalityPoints(municipios) {
  municipios.forEach((municipio) => {
    const color = colors[municipio.classificacao] || '#161616';
    const marker = L.circleMarker([municipio.latitude, municipio.longitude], {
      color,
      fillColor: color,
      fillOpacity: 0.85,
      radius: 3,
      weight: 1,
    });

    marker.bindPopup(`
      <div class="municipio-popup">
        <b>Código do município:</b> ${municipio.codigo}<br>
        <b>Nome do município:</b> ${municipio.nome}<br>
        <b>Classificação:</b> ${municipio.classificacao}<br>
        <b>Latitude:</b> ${municipio.latitude.toFixed(6)}<br>
        <b>Longitude:</b> ${municipio.longitude.toFixed(6)}
      </div>
    `);
    marker.bindTooltip(`<div>${municipio.nome} — Classe ${municipio.classificacao}</div>`, { sticky: true });
    marker.addTo(pointsLayer);
  });
}

Promise.all([
  fetch('./municipios.json').then((response) => {
    if (!response.ok) throw new Error(`Erro ao carregar pontos: ${response.status}`);
    return response.json();
  }),
  fetch('./novomapa/municipios.json').then((response) => {
    if (!response.ok) throw new Error(`Erro ao carregar malha: ${response.status}`);
    return response.json();
  }),
])
  .then(([municipios, malha]) => {
    updateClassCounts(municipios);
    municipios.forEach((municipio) => municipalityInfo.set(municipio.nome, municipio));
    addMunicipalityPoints(municipios);

    meshLayer.addData(malha).addTo(map);
    toggleButton.disabled = false;
    toggleButton.addEventListener('click', () => {
      const showingMesh = map.hasLayer(meshLayer);
      if (showingMesh) {
        map.removeLayer(meshLayer);
        pointsLayer.addTo(map);
        toggleButton.textContent = 'Ver malha';
        toggleButton.setAttribute('aria-pressed', 'true');
      } else {
        map.removeLayer(pointsLayer);
        meshLayer.addTo(map);
        toggleButton.textContent = 'Ver pontos';
        toggleButton.setAttribute('aria-pressed', 'false');
      }
    });
  })
  .catch((error) => console.error(error));
