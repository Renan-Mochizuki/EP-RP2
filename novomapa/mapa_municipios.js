L_NO_TOUCH = false;
L_DISABLE_3D = false;

var map_476a94180d29d1cccf68b915b1a352c6 = L.map('map_476a94180d29d1cccf68b915b1a352c6', {
  center: [-14.2, -51.9],
  crs: L.CRS.EPSG3857,
  ...{
    zoom: 4,
    zoomControl: true,
    preferCanvas: false,
  },
});

var tile_layer_a59cc5f863bc4dd9bc4dc3c6aca3957a = L.tileLayer('https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=cb1_4rfx_1_77e134656d9a7c9838805a24', {
  minZoom: 0,
  maxZoom: 20,
  maxNativeZoom: 20,
  noWrap: false,
  attribution: '\u00a9 OpenStreetMap contributors \u00a9 CARTO',
  subdomains: 'abc',
  detectRetina: false,
  tms: false,
  opacity: 1,
});

tile_layer_a59cc5f863bc4dd9bc4dc3c6aca3957a.addTo(map_476a94180d29d1cccf68b915b1a352c6);

const municipalityColors = {
  0: '#808080',
  1: '#377eb8',
  2: '#e41a1c',
  3: '#ffd700',
};

const geo_json_d498deba122898c532da0cac3a22d487 = L.geoJson(null, {
  style: (feature) => ({
    color: '#555555',
    fillColor: municipalityColors[feature.properties?.classe] ?? '#d3d3d3',
    fillOpacity: 0.8,
    weight: 0.3,
  }),
});

geo_json_d498deba122898c532da0cac3a22d487.bindTooltip(
  (layer) => {
    const { NM_MUN, classe } = layer.feature.properties;
    return '<table><tr><th>Município:</th><td>' + NM_MUN + '</td></tr><tr><th>Classe:</th><td>' + classe + '</td></tr></table>';
  },
  { sticky: true, className: 'foliumtooltip' },
);

fetch('municipios.json')
  .then((response) => {
    if (!response.ok) throw new Error('Não foi possível carregar municipios.json');
    return response.json();
  })
  .then((data) => {
    geo_json_d498deba122898c532da0cac3a22d487.addData(data).addTo(map_476a94180d29d1cccf68b915b1a352c6);
  })
  .catch((error) => console.error(error));

var layer_control_756a5c079f84ff3dbbc2ed87a7c56cba_layers = {
  base_layers: {
    'CartoDB Positron': tile_layer_a59cc5f863bc4dd9bc4dc3c6aca3957a,
  },
  overlays: {
    'Classifica\u00e7\u00e3o municipal': geo_json_d498deba122898c532da0cac3a22d487,
  },
};
let layer_control_756a5c079f84ff3dbbc2ed87a7c56cba = L.control
  .layers(layer_control_756a5c079f84ff3dbbc2ed87a7c56cba_layers.base_layers, layer_control_756a5c079f84ff3dbbc2ed87a7c56cba_layers.overlays, {
    position: 'topright',
    collapsed: true,
    autoZIndex: true,
  })
  .addTo(map_476a94180d29d1cccf68b915b1a352c6);
