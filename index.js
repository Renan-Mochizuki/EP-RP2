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

const pointsLayer = L.layerGroup();
const toggleButton = document.getElementById('visualizacao-toggle');
const municipalityInfo = new Map();

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

    marker.bindPopup(municipalityPopup(municipio));
    marker.bindTooltip(`<div>${escapeHtml(municipio.nome)} — Classe ${municipio.classificacao}</div>`, { sticky: true });
    marker.addTo(pointsLayer);
  });
}

function createMeshLayer(malha) {
  return L.geoJSON(malha, {
    style: (feature) => {
      const municipio = municipalityInfo.get(feature.properties?.NM_MUN);
      const classe = municipio?.classificacao;
      const color = colors[classe] || '#161616';
      return { color: '#555', fillColor: color, fillOpacity: 0.8, weight: 0.3 };
    },
    onEachFeature: (feature, layer) => {
      const nome = feature.properties?.NM_MUN || 'Município não identificado';
      const municipio = municipalityInfo.get(nome);
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

async function loadMunicipalitiesFromSpreadsheet() {
  const response = await fetch('./municipios.xlsx');
  if (!response.ok) throw new Error(`Erro ao carregar municipios.xlsx: ${response.status}`);

  const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null, raw: true });
  const requiredColumns = ['CD_MUN', 'NM_MUN', 'Latitude', 'Longitude', 'cluster'];
  const missingColumns = requiredColumns.filter((column) => !(column in (rows[0] || {})));

  if (missingColumns.length) {
    throw new Error(`Colunas ausentes na planilha: ${missingColumns.join(', ')}`);
  }

  return rows.map((row, index) => {
    const codigo = Number(row.CD_MUN);
    const latitude = Number(row.Latitude);
    const longitude = Number(row.Longitude);
    const classificacao = Number(row.cluster);

    if (!row.NM_MUN || !Number.isFinite(codigo) || !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) || !Number.isFinite(classificacao)) {
      throw new Error(`Dados inválidos na linha ${index + 2} da planilha.`);
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

async function loadMap() {
  const [municipios, malhaResponse] = await Promise.all([
    loadMunicipalitiesFromSpreadsheet(),
    fetch('./json/municipiosMalha.json'),
  ]);
  if (!malhaResponse.ok) throw new Error(`Erro ao carregar malha: ${malhaResponse.status}`);

  const malha = await malhaResponse.json();
  updateClassCounts(municipios);
  municipios.forEach((municipio) => municipalityInfo.set(municipio.nome, municipio));
  addMunicipalityPoints(municipios);

  const meshLayer = createMeshLayer(malha);
  meshLayer.addTo(map);
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
}

loadMap().catch((error) => {
  console.error(error);
  toggleButton.disabled = true;
  toggleButton.textContent = 'Erro ao carregar dados';
});
