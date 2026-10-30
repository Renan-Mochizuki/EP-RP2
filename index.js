L_NO_TOUCH = false;
L_DISABLE_3D = false;

// Para adicionar outra planilha, coloque-a em data/ e acrescente uma entrada aqui.
const datasets = [
  { id: 'principal', label: 'Municípios', file: 'municipios.xlsx' },
  { id: '3v', label: 'Municípios 3V', file: 'municipios_3v.xlsx' },
];

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
  attribution: '© OpenStreetMap contributors © CARTO',
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

const toggleButton = document.getElementById('visualizacao-toggle');
const datasetSelect = document.getElementById('planilha-select');
let activePointsLayer = null;
let activeMeshLayer = null;
let showingMesh = true;
let currentRequest = 0;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function municipalityPopup(municipio) {
  return `
    <div class="municipio-popup">
      <b>Código do município:</b> ${escapeHtml(municipio.codigo)}<br>
      <b>Nome do município:</b> ${escapeHtml(municipio.nome)}<br>
      <b>Classificação:</b> ${escapeHtml(municipio.classificacao)}<br>
      <b>Latitude:</b> ${municipio.latitude.toFixed(6)}<br>
      <b>Longitude:</b> ${municipio.longitude.toFixed(6)}
    </div>
  `;
}

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

function createPointsLayer(municipios) {
  const pointsLayer = L.layerGroup();

  municipios.forEach((municipio) => {
    const color = colors[municipio.classificacao] || '#161616';
    const marker = L.circleMarker([municipio.latitude, municipio.longitude], {
      color,
      fillColor: color,
      fillOpacity: 0.85,
      radius: 3,
      weight: 1,
    });

    marker.bindPopup(municipalityPopup(municipio));
    marker.bindTooltip(`<div>${escapeHtml(municipio.nome)} — Classe ${municipio.classificacao}</div>`, { sticky: true });
    marker.addTo(pointsLayer);
  });

  return pointsLayer;
}

function createMeshLayer(malha, municipalityInfo) {
  return L.geoJSON(malha, {
    style: (feature) => {
      const municipio = municipalityInfo.get(String(feature.properties?.CD_MUN));
      const classe = municipio?.classificacao;
      const color = colors[classe] || '#161616';
      return { color: '#555', fillColor: color, fillOpacity: 0.8, weight: 0.3 };
    },
    onEachFeature: (feature, layer) => {
      const nome = feature.properties?.NM_MUN || 'Município não identificado';
      const municipio = municipalityInfo.get(String(feature.properties?.CD_MUN));
      const classe = municipio?.classificacao;

      layer.bindTooltip(
        `<div><b>Município:</b> ${escapeHtml(nome)}<br><b>Classe:</b> ${classe ?? 'não informada'}</div>`,
        { sticky: true },
      );
      layer.bindPopup(municipio ? municipalityPopup(municipio) :
        `<div class="municipio-popup"><b>Município:</b> ${escapeHtml(nome)}<br><b>Classe:</b> não informada</div>`);
    },
  });
}

async function loadMunicipalitiesFromSpreadsheet(dataset) {
  const response = await fetch(`./data/${encodeURIComponent(dataset.file)}`);
  if (!response.ok) throw new Error(`Erro ao carregar ${dataset.file}: ${response.status}`);

  const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null, raw: true });
  const requiredColumns = ['CD_MUN', 'NM_MUN', 'Latitude', 'Longitude', 'cluster'];
  const missingColumns = requiredColumns.filter((column) => !(column in (rows[0] || {})));

  if (missingColumns.length) {
    throw new Error(`${dataset.file}: colunas ausentes: ${missingColumns.join(', ')}`);
  }

  return rows.map((row, index) => {
    const codigo = String(row.CD_MUN).trim();
    const latitude = Number(row.Latitude);
    const longitude = Number(row.Longitude);
    const classificacao = Number(row.cluster);

    if (!row.NM_MUN || !/^\d{7}$/.test(codigo) || !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) || !Number.isFinite(classificacao)) {
      throw new Error(`Dados inválidos na linha ${index + 2} de ${dataset.file}.`);
    }

    return {
      codigo,
      nome: String(row.NM_MUN),
      latitude,
      longitude,
      classificacao,
    };
  });
}

function replaceActiveLayers(municipios, malha) {
  if (activePointsLayer) map.removeLayer(activePointsLayer);
  if (activeMeshLayer) map.removeLayer(activeMeshLayer);

  const municipalityInfo = new Map(municipios.map((municipio) => [municipio.codigo, municipio]));
  activePointsLayer = createPointsLayer(municipios);
  activeMeshLayer = createMeshLayer(malha, municipalityInfo);

  (showingMesh ? activeMeshLayer : activePointsLayer).addTo(map);
  updateClassCounts(municipios);
  toggleButton.textContent = showingMesh ? 'Ver pontos' : 'Ver malha';
}

async function loadDataset(dataset, malha) {
  const requestId = ++currentRequest;
  datasetSelect.disabled = true;
  toggleButton.disabled = true;

  try {
    const municipios = await loadMunicipalitiesFromSpreadsheet(dataset);
    if (requestId !== currentRequest) return;
    replaceActiveLayers(municipios, malha);
    datasetSelect.disabled = false;
    toggleButton.disabled = false;
  } catch (error) {
    console.error(error);
    toggleButton.textContent = 'Erro ao carregar dados';
  }
}

async function loadMap() {
  const malhaResponse = await fetch('./json/municipiosMalha.json');
  if (!malhaResponse.ok) throw new Error(`Erro ao carregar malha: ${malhaResponse.status}`);
  const malha = await malhaResponse.json();

  datasetSelect.replaceChildren();
  datasets.forEach((dataset) => {
    const option = document.createElement('option');
    option.value = dataset.id;
    option.textContent = dataset.label;
    datasetSelect.appendChild(option);
  });

  datasetSelect.addEventListener('change', () => {
    const dataset = datasets.find((item) => item.id === datasetSelect.value);
    if (dataset) loadDataset(dataset, malha);
  });

  await loadDataset(datasets[0], malha);
  datasetSelect.disabled = false;
}

toggleButton.addEventListener('click', () => {
  if (!activePointsLayer || !activeMeshLayer) return;

  if (showingMesh) {
    map.removeLayer(activeMeshLayer);
    activePointsLayer.addTo(map);
    toggleButton.textContent = 'Ver malha';
  } else {
    map.removeLayer(activePointsLayer);
    activeMeshLayer.addTo(map);
    toggleButton.textContent = 'Ver pontos';
  }

  showingMesh = !showingMesh;
  toggleButton.setAttribute('aria-pressed', String(!showingMesh));
});

loadMap().catch((error) => {
  console.error(error);
  datasetSelect.disabled = true;
  toggleButton.disabled = true;
  toggleButton.textContent = 'Erro ao carregar dados';
});
