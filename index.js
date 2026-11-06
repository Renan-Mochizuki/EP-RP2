window.L_NO_TOUCH = false;
window.L_DISABLE_3D = false;

// ======================================================
// CONFIGURAÇÃO DOS DATASETS
// Defina individualmente as colunas de cada modelo.
// ======================================================

const DATASETS = [
  {
    id: 'a',
    label: 'Municípios A',
    file: 'municipios_a.xlsx',
    tooltipColumns: [
      'Arborizacao_pct',
      'Pavimentacao_pct',
      'Bueiro_pct',
    ],
  },
  {
    id: 'b',
    label: 'Municípios B',
    file: 'municipios_b.xlsx',
    tooltipColumns: [
      'Arborizacao_pct',
      'Pavimentacao_pct',
      'Bueiro_pct',
      'Calcada_pct',
      'Calcada_sem_obstaculo_pct',
      'Rampa_pct',
    ],
  },
  {
    id: 'c',
    label: 'Municípios C',
    file: 'municipios_c.xlsx',
    tooltipColumns: [
      'Arborizacao_pct',
      'Pavimentacao_pct',
      'Bueiro_pct',
      'Calcada_pct',
      'Calcada_sem_obstaculo_pct',
      'Rampa_pct',
      'Ponto_onibus_pct',
      'Bicicleta_sinalizada_pct',
    ],
  },
  {
    id: '3v',
    label: 'Municípios 3V',
    file: 'municipios_3v.xlsx',
    tooltipColumns: ['Pavimentacao_pct',
    'Calcada_pct',
    'Calcada_sem_obstaculo_pct',],
  },
  {
    id: '4v',
    label: 'Municípios 4V',
    file: 'municipios_4v.xlsx',
    tooltipColumns: ['Pavimentacao_pct',
    'Calcada_pct',
    'Calcada_sem_obstaculo_pct',
    'Rampa_pct',],
  },
  {
    id: '5v',
    label: 'Municípios 5V',
    file: 'municipios_5v.xlsx',
    tooltipColumns: ['Pavimentacao_pct',
    'Bueiro_pct',
    'Calcada_pct',
    'Calcada_sem_obstaculo_pct',
    'Rampa_pct',],
  },
  {
    id: '6v',
    label: 'Municípios 6V',
    file: 'municipios_6v.xlsx',
    tooltipColumns: ['Pavimentacao_pct',
    'Bueiro_pct',
    'Arborizacao_pct',
    'Calcada_pct',
    'Calcada_sem_obstaculo_pct',
    'Rampa_pct',],
  },
];

// ======================================================
// CONFIGURAÇÃO DO MAPA
// ======================================================

const map = L.map('map_8230f5587939f2885ed5da8710cbf274', {
  center: [-14.2, -51.9],
  crs: L.CRS.EPSG3857,
  zoom: 4,
  zoomControl: true,
  preferCanvas: false,
});

L.control.scale().addTo(map);

L.tileLayer('https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=cb1_4rfx_1_77e134656d9a7c9838805a24',
  {
    minZoom: 0,
    maxZoom: 18,
    maxNativeZoom: 18,
    noWrap: false,
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abc',
    detectRetina: false,
    tms: false,
    opacity: 1,
  }
).addTo(map);



// ======================================================
// CORES DAS CLASSES
// ======================================================

const CLASS_COLORS = {
  0: '#808080',
  1: '#2878B5',
  2: '#D64545',
  3: '#F2C14E',
  4: '#2E8B57',
  5: '#7E57C2',
  6: '#D998CE',
};

const MAX_CLASSES = 7;

// ======================================================
// ELEMENTOS HTML
// ======================================================

const toggleButton = document.getElementById('visualizacao-toggle');
const datasetSelect = document.getElementById('planilha-select');
const classesLegend = document.getElementById('classes-legenda');

let activePointsLayer = null;
let activeMeshLayer = null;
let showingMesh = true;
let currentRequest = 0;

// ======================================================
// FUNÇÃO PARA ESCAPAR HTML
// ======================================================

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ======================================================
// FORMATAÇÃO DOS VALORES
// ======================================================

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  return String(value);
}

// ======================================================
// POPUP DO MUNICÍPIO
// Recebe as colunas específicas de cada modelo.
// ======================================================

function municipalityPopup(municipio, dataset) {

  const additionalInfo = (dataset.tooltipColumns || [])
    .map((column) => {

      const value = municipio[column];

      if (value === null || value === undefined || value === '') {
        return '';
      }

      const formattedValue = formatValue(value);

      const label = column.replaceAll('_', ' ');

      return `
        <br>
        <b>${escapeHtml(label)}:</b>
        ${escapeHtml(formattedValue)}
      `;
    })
    .join('');

  return `
    <div class="municipio-popup">

      <b>Código do município:</b>
      ${escapeHtml(municipio.codigo)}
      <br>

      <b>Nome do município:</b>
      ${escapeHtml(municipio.nome)}
      <br>

      <b>Classificação:</b>
      ${escapeHtml(municipio.classificacao)}

      ${additionalInfo}

    </div>
  `;
}

// ======================================================
// ATUALIZAÇÃO DA LEGENDA
// ======================================================

function updateClassCounts(municipios) {

  const counts = municipios.reduce((result, municipio) => {

    result[municipio.classificacao] =
      (result[municipio.classificacao] || 0) + 1;

    return result;

  }, {});

  const formatter = new Intl.NumberFormat('pt-BR');

  classesLegend.replaceChildren();

  for (let classe = 0; classe < MAX_CLASSES; classe += 1) {

    if (!counts[classe]) continue;

    const item = document.createElement('div');
    item.className = 'legend-item';

    const color = document.createElement('span');
    color.className = `legend-color legend-color-${classe}`;

    const label = document.createTextNode(`Classe ${classe}: `);

    const count = document.createElement('span');
    count.className = 'class-count';
    count.textContent = formatter.format(counts[classe]);

    item.append(
      color,
      label,
      count,
      document.createTextNode(' municípios')
    );

    classesLegend.appendChild(item);
  }
}

// ======================================================
// CRIAÇÃO DA CAMADA DE PONTOS
// ======================================================

function createPointsLayer(municipios, dataset) {

  const pointsLayer = L.layerGroup();

  municipios.forEach((municipio) => {

    const color =
      CLASS_COLORS[municipio.classificacao] || '#161616';

    const marker = L.circleMarker(
      [municipio.latitude, municipio.longitude],
      {
        color,
        fillColor: color,
        fillOpacity: 0.85,
        radius: 3,
        weight: 1,
      }
    );

    marker.bindPopup(
      municipalityPopup(municipio, dataset)
    );

    marker.bindTooltip(
      `<div>${escapeHtml(municipio.nome)} — Classe ${municipio.classificacao}</div>`,
      { sticky: true }
    );

    marker.addTo(pointsLayer);

  });

  return pointsLayer;
}

// ======================================================
// CRIAÇÃO DA CAMADA DE MALHA
// ======================================================

function createMeshLayer(malha, municipalityInfo, dataset) {

  return L.geoJSON(malha, {

    style: (feature) => {

      const municipio = municipalityInfo.get(
        String(feature.properties?.CD_MUN)
      );

      const classe = municipio?.classificacao;

      const color = CLASS_COLORS[classe] || '#161616';

      return {
        color: '#555',
        fillColor: color,
        fillOpacity: 0.8,
        weight: 0.3,
      };
    },

    onEachFeature: (feature, layer) => {

      const nome =
        feature.properties?.NM_MUN || 'Município não identificado';

      const municipio = municipalityInfo.get(
        String(feature.properties?.CD_MUN)
      );

      const classe = municipio?.classificacao;

      layer.bindTooltip(
        `<div>
          <b>Município:</b> ${escapeHtml(nome)}
          <br>
          <b>Classe:</b> ${classe ?? 'não informada'}
        </div>`,
        { sticky: true }
      );

      layer.bindPopup(
        municipio
          ? municipalityPopup(municipio, dataset)
          : `<div class="municipio-popup">
              <b>Município:</b> ${escapeHtml(nome)}
              <br>
              <b>Classe:</b> não informada
            </div>`
      );

    },

  });
}

// ======================================================
// LEITURA DA PLANILHA
// ======================================================

async function loadMunicipalitiesFromSpreadsheet(dataset) {

  const response = await fetch(
    `./data/${encodeURIComponent(dataset.file)}`
  );

  if (!response.ok) {
    throw new Error(
      `Erro ao carregar ${dataset.file}: ${response.status}`
    );
  }

  const workbook = XLSX.read(
    await response.arrayBuffer(),
    { type: 'array' }
  );

  const firstSheet =
    workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(
    firstSheet,
    {
      defval: null,
      raw: true,
    }
  );

  const requiredColumns = [
    'CD_MUN',
    'NM_MUN',
    'Latitude',
    'Longitude',
    'cluster',
  ];

  const missingColumns = requiredColumns.filter(
    (column) => !(column in (rows[0] || {}))
  );

  if (missingColumns.length) {
    throw new Error(
      `${dataset.file}: colunas ausentes: ${missingColumns.join(', ')}`
    );
  }

  // Verifica se as colunas configuradas existem na planilha.

  const missingTooltipColumns = (
    dataset.tooltipColumns || []
  ).filter(
    (column) => !(column in (rows[0] || {}))
  );

  if (missingTooltipColumns.length) {
    throw new Error(
      `${dataset.file}: colunas do popup ausentes: ${missingTooltipColumns.join(', ')}`
    );
  }

  return rows.map((row, index) => {

    const codigo = String(row.CD_MUN).trim();

    const latitude = Number(row.Latitude);

    const longitude = Number(row.Longitude);

    const classificacao = Number(row.cluster);

    if (
      !row.NM_MUN ||
      !/^\d{7}$/.test(codigo) ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isInteger(classificacao) ||
      classificacao < 0 ||
      classificacao >= MAX_CLASSES
    ) {

      throw new Error(
        `Dados inválidos na linha ${index + 2} de ${dataset.file}.`
      );

    }

    return {

      // Preserva todas as colunas originais da planilha.
      ...row,

      codigo,
      nome: String(row.NM_MUN),
      latitude,
      longitude,
      classificacao,

    };

  });
}

// ======================================================
// SUBSTITUIÇÃO DAS CAMADAS ATIVAS
// ======================================================

function replaceActiveLayers(municipios, malha, dataset) {

  if (activePointsLayer) {
    map.removeLayer(activePointsLayer);
  }

  if (activeMeshLayer) {
    map.removeLayer(activeMeshLayer);
  }

  const municipalityInfo = new Map(
    municipios.map(
      (municipio) => [municipio.codigo, municipio]
    )
  );

  activePointsLayer = createPointsLayer(
    municipios,
    dataset
  );

  activeMeshLayer = createMeshLayer(
    malha,
    municipalityInfo,
    dataset
  );

  (
    showingMesh
      ? activeMeshLayer
      : activePointsLayer
  ).addTo(map);

  updateClassCounts(municipios);

  toggleButton.textContent =
    showingMesh ? 'Ver pontos' : 'Ver malha';

}

// ======================================================
// CARREGAMENTO DO DATASET
// ======================================================

async function loadDataset(dataset, malha) {

  const requestId = ++currentRequest;

  datasetSelect.disabled = true;
  toggleButton.disabled = true;

  try {

    const municipios =
      await loadMunicipalitiesFromSpreadsheet(dataset);

    if (requestId !== currentRequest) return;

    replaceActiveLayers(
      municipios,
      malha,
      dataset
    );

    datasetSelect.disabled = false;
    toggleButton.disabled = false;

  } catch (error) {

    console.error(error);

    if (requestId !== currentRequest) return;

    datasetSelect.disabled = false;
    toggleButton.disabled = false;

    toggleButton.textContent = 'Erro ao carregar dados';

  }
}

// ======================================================
// CARREGAMENTO INICIAL DO MAPA
// ======================================================

async function loadMap() {

  const malhaResponse = await fetch(
    './json/municipiosMalha.json'
  );

  if (!malhaResponse.ok) {

    throw new Error(
      `Erro ao carregar malha: ${malhaResponse.status}`
    );

  }

  const malha = await malhaResponse.json();

  datasetSelect.replaceChildren();

  DATASETS.forEach((dataset) => {

    const option = document.createElement('option');

    option.value = dataset.id;

    option.textContent = dataset.label;

    datasetSelect.appendChild(option);

  });

  datasetSelect.addEventListener('change', () => {

    const dataset = DATASETS.find(
      (item) => item.id === datasetSelect.value
    );

    if (dataset) {
      loadDataset(dataset, malha);
    }

  });

  await loadDataset(DATASETS[0], malha);

  datasetSelect.disabled = false;

}

// ======================================================
// ALTERNÂNCIA ENTRE PONTOS E MALHA
// ======================================================

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

  toggleButton.setAttribute(
    'aria-pressed',
    String(!showingMesh)
  );

});

// ======================================================
// INICIALIZAÇÃO
// ======================================================

loadMap().catch((error) => {

  console.error(error);

  datasetSelect.disabled = true;

  toggleButton.disabled = true;

  toggleButton.textContent = 'Erro ao carregar dados';

});
