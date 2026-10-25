
import json
import pandas as pd

# Arquivos de entrada e saída
arquivo_excel = "municipios.xlsx"
arquivo_json = "municipios.json"

# Lê a planilha Excel
df = pd.read_excel(arquivo_excel)

# Renomeia as colunas para o formato desejado
df = df.rename(columns={
    "codigo_municipio": "codigo",
    "nome_municipio": "nome"
})

# Seleciona as colunas e define a ordem no JSON
colunas = [
    "codigo",
    "nome",
    "classificacao",
    "latitude",
    "longitude"
]

df = df[colunas]

# Converte a tabela em uma lista de dicionários
municipios = df.to_dict(orient="records")

# Garante que os códigos e as classificações sejam inteiros
for municipio in municipios:
    municipio["codigo"] = int(municipio["codigo"])
    municipio["classificacao"] = int(municipio["classificacao"])

    # Garante que latitude e longitude sejam números
    municipio["latitude"] = float(municipio["latitude"])
    municipio["longitude"] = float(municipio["longitude"])

# Cria o arquivo JSON
with open(arquivo_json, "w", encoding="utf-8") as arquivo:
    json.dump(
        municipios,
        arquivo,
        ensure_ascii=False,
        indent=2,
        allow_nan=False
    )

print(f"Arquivo '{arquivo_json}' criado com sucesso!")
print(f"Total de municípios: {len(municipios)}")
