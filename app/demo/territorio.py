"""Bairros reais de Fortaleza para a carga de demonstração, tirados do mesmo GeoJSON que o mapa desenha."""

import json
from functools import lru_cache
from pathlib import Path

from django.conf import settings

CAMINHOS = (
    Path("static") / "geo" / "bairros_fortaleza.geojson",
    Path("Frontend") / "public" / "geo" / "bairros_fortaleza.geojson",
)


def _centro(geometria):
    pontos = [ponto for poligono in geometria["coordinates"] for anel in poligono for ponto in anel]
    return sum(p[1] for p in pontos) / len(pontos), sum(p[0] for p in pontos) / len(pontos)


@lru_cache(maxsize=1)
def bairros_do_mapa():
    """Lista (nome, latitude, longitude) dos centros dos bairros; vazia quando o GeoJSON não está no projeto."""
    for relativo in CAMINHOS:
        caminho = Path(settings.BASE_DIR) / relativo
        if caminho.exists():
            with open(caminho, encoding="utf-8") as arquivo:
                features = json.load(arquivo).get("features", [])
            return tuple(
                (f["properties"]["Nome"], *_centro(f["geometry"]))
                for f in sorted(features, key=lambda f: f["properties"].get("Nome", ""))
                if f.get("geometry", {}).get("type") == "MultiPolygon" and f.get("properties", {}).get("Nome")
            )
    return ()


def mais_proximos(latitude, longitude, quantidade, rng):
    """Os bairros mais perto do ponto; sem coordenadas, uma amostra fixa pela semente."""
    bairros = bairros_do_mapa()
    if latitude is None or longitude is None:
        return [nome for nome, _, _ in rng.sample(bairros, quantidade)]
    ordenados = sorted(bairros, key=lambda b: (b[1] - latitude) ** 2 + (b[2] - longitude) ** 2)
    return [nome for nome, _, _ in ordenados[:quantidade]]
