
import pandas as pd
import geopandas as gpd
import folium
import json

# 1. Carregar os dados de classificação
dados = pd.read_csv("classificacoes.csv", dtype={"codigo_ibge": str})

# 2. Carregar a malha municipal do IBGE
# Substitua pelo caminho do seu arquivo .shp
municipios = gpd.read_file("../malha/BR_Municipios_2023.shp")

# 3. Padronizar os códigos IBGE
# O nome da coluna do IBGE pode variar conforme a versão da malha.
coluna_codigo = "CD_MUN"

municipios[coluna_codigo] = (
    municipios[coluna_codigo].astype(str).str.zfill(7)
)
dados["codigo_ibge"] = dados["codigo_ibge"].str.zfill(7)

# 4. Associar classificação a cada município
municipios = municipios.merge(
    dados[["codigo_ibge", "classe"]],
    left_on=coluna_codigo,
    right_on="codigo_ibge",
    how="left",
    validate="one_to_one"
)

# 5. Definir as cores de cada classe
cores = {
    0: "#808080",  # Cinza
    1: "#377EB8",  # Azul
    2: "#E41A1C",  # Vermelho
    3: "#FFD700",  # Verde
}

# 6. Preparar os dados geográficos para o mapa
# 6. Simplificar as geometrias para reduzir o tamanho do HTML
# Faça a simplificação em metros, não em latitude/longitude.

municipios = municipios.to_crs(epsg=5880)  # Projeção métrica do Brasil

municipios["geometry"] = municipios.geometry.simplify(
    tolerance=200,          # 100 metros
    preserve_topology=True
)

# Manter somente os campos necessários para o mapa
municipios = municipios[
    ["NM_MUN", "classe", "geometry"]
].copy()

# Converter para latitude/longitude
municipios = municipios.to_crs(epsg=4326)

# Reduzir o tamanho do GeoJSON para melhorar o desempenho
geojson = json.loads(
    municipios.to_json(drop_id=True)
)

# 7. Criar o mapa
CARTO_API_KEY = "cb1_4rfx_1_77e134656d9a7c9838805a24"

mapa = folium.Map(
    location=[-14.2, -51.9],
    zoom_start=4,
    tiles=None
)

folium.TileLayer(
    tiles=(
        "https://basemaps.cartocdn.com/"
        "rastertiles/light_all/{z}/{x}/{y}.png"
        f"?key={CARTO_API_KEY}"
    ),
    attr='© OpenStreetMap contributors © CARTO',
    name="CartoDB Positron",
    max_zoom=20
).add_to(mapa)

def estilo(feature):
    classe = feature["properties"].get("classe")
    cor = cores.get(int(classe), "#D3D3D3") if pd.notna(classe) else "#D3D3D3"

    return {
        "fillColor": cor,
        "color": "#555555",
        "weight": 0.3,
        "fillOpacity": 0.8,
    }

# 8. Desenhar os municípios
folium.GeoJson(
    geojson,
    name="Classificação municipal",
    style_function=estilo,
    tooltip=folium.GeoJsonTooltip(
        fields=["NM_MUN", "classe"],
        aliases=["Município:", "Classe:"],
        localize=True
    )
).add_to(mapa)

# 9. Criar legenda
legenda = """
<div style="
position: fixed; bottom: 30px; left: 30px; z-index: 9999;
background: white; padding: 12px; border: 1px solid #bbb;
border-radius: 5px; font-size: 14px;">
<b>Classificação</b><br>
"""

for classe, cor in cores.items():
    legenda += (
        f'<div><span style="background:{cor};'
        f'width:12px;height:12px;display:inline-block;'
        f'margin-right:6px;"></span>Classe {classe}</div>'
    )

legenda += "</div>"

mapa.get_root().html.add_child(folium.Element(legenda))
folium.LayerControl().add_to(mapa)

# 10. Salvar o resultado
mapa.save("mapa_municipios.html")

# 11. Conferir a correspondência dos dados
print("Municípios na malha:", len(municipios))
print("Municípios sem classificação:", municipios["classe"].isna().sum())
print("Mapa salvo em mapa_municipios.html")
