"""Normalização conservadora do catálogo externo de medicamentos.

As funções deste módulo não acessam o banco e não alteram o arquivo de origem.
Valores que não podem ser representados com segurança são preservados como
texto e sinalizados para revisão pelo management command.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
import re
import unicodedata


MARCADORES_NULOS = {"", "null", "none", "n/a", "na"}


def _sem_acentos(valor: str) -> str:
    return "".join(
        caractere
        for caractere in unicodedata.normalize("NFKD", valor)
        if not unicodedata.combining(caractere)
    )


def _texto_normalizado(valor: object) -> str:
    texto = _sem_acentos(str(valor or "")).casefold().strip()
    return re.sub(r"\s+", " ", texto)


def limpar_opcional(valor: object) -> str | None:
    texto = str(valor or "").strip()
    return None if _texto_normalizado(texto) in MARCADORES_NULOS else texto


def converter_booleano(valor: object, campo: str) -> bool:
    texto = _texto_normalizado(valor)
    if texto in {"true", "1", "sim", "s", "yes"}:
        return True
    if texto in {"false", "0", "nao", "n", "no"}:
        return False
    raise ValueError(f"Valor booleano inválido em {campo}: {valor!r}")


def normalizar_forma_farmaceutica(valor: object) -> str:
    """Converte a descrição livre para uma choice sem alterar o CSV original."""

    texto = _texto_normalizado(valor)
    if not texto or texto in MARCADORES_NULOS or texto in {"'-", "-"}:
        return "OUTRO"

    # As formas específicas precisam vir antes dos termos genéricos.
    if "solucao oftalm" in texto or "suspensao oftalm" in texto or texto == "colirio":
        return "COLIRIO"
    if "comprimido orodispersivel" in texto:
        return "COMPRIMIDO_ORODISPERSIVEL"
    if "comprimido soluvel" in texto:
        return "COMPRIMIDO_SOLUVEL"
    if "comprimido de liberacao retardada" in texto:
        return "COMPRIMIDO_LIB_RETARDADA"
    if "comprim" in texto:
        return "COMPRIMIDO"
    if "capsul" in texto:
        return "CAPSULA"
    if "drage" in texto:
        return "DRAGEA"
    if "solucao oral" in texto or "emulsao oral" in texto or "oleo para uso oral" in texto:
        return "SOLUCAO_ORAL"
    if "suspensao oral" in texto or "suspensao para uso oral" in texto:
        return "SUSPENSAO_ORAL"
    if "xarope" in texto or "elixir" in texto:
        return "XAROPE"
    if "gota" in texto or "solucao otolog" in texto:
        return "GOTAS"
    volumes_injetaveis = {
        "solucao injetavel 5 ml": "SOL_INJETAVEL_5ML",
        "solucao injetavel 10 ml": "SOL_INJETAVEL_10ML",
        "solucao injetavel 100 ml": "SOL_INJETAVEL_100ML",
        "solucao injetavel 500 ml": "SOL_INJETAVEL_500ML",
    }
    if texto in volumes_injetaveis:
        return volumes_injetaveis[texto]
    if "po para suspensao injetavel" in texto:
        return "PO_SUSP_INJETAVEL"
    if "suspensao injetavel" in texto:
        return "SUSPENSAO_INJETAVEL"
    if "po para solucao injetavel" in texto:
        return "PO_SOLUCAO_INJETAVEL"
    if any(termo in texto for termo in ("injet", "infusao", "intratecal", "intrabronqu")):
        return "SOLUCAO_INJETAVEL"
    if "pomada" in texto or "pasta" in texto:
        return "POMADA"
    if "creme vaginal" in texto:
        return "CREME_VAGINAL"
    if "creme" in texto:
        return "CREME"
    if "gel" in texto:
        return "GEL"
    if "supositorio" in texto or "enema" in texto or "solucao retal" in texto:
        return "SUPOSITORIO"
    if "adesivo" in texto:
        return "ADESIVO"
    if "spray" in texto:
        return "SPRAY"
    if "aerossol" in texto:
        return "AEROSSOL"
    if re.search(r"\bpo\b", texto) or "granul" in texto:
        return "PO"
    if texto == "goma de mascar":
        return "GOMA_MASCAR"
    if texto == "pastilha":
        return "PASTILHA"
    if texto == "160 mm x 49 mm":
        return "PRESERVATIVO_160X49"
    if texto == "160 mm x 52 mm":
        return "PRESERVATIVO_160X52"
    return "OUTRO"


@dataclass(frozen=True)
class ConcentracaoNormalizada:
    concentracao: str
    unidade_medida: str
    ambigua: bool = False
    motivo: str | None = None


_UNIDADES = {
    "mg": "MG",
    "g": "G",
    "mcg": "MCG",
    "ug": "MCG",
    "ml": "ML",
    "mg/ml": "MG_ML",
    "mg/g": "MG_G",
    "ui": "UI",
    "ui/ml": "UI_ML",
    "%": "PERCENTUAL",
}

_CONCENTRACAO_SIMPLES = re.compile(
    r"^\s*(?P<numero>(?:\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?))\s*"
    r"(?P<unidade>mg\s*/\s*ml|mg\s*/\s*g|ui\s*/\s*ml|mcg|[µμ]g|mg|ml|ui|g|%)\s*$",
    re.IGNORECASE,
)


def _normalizar_numero(valor: str) -> str:
    valor = valor.strip()
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", valor):
        return valor.replace(".", "")
    valor = valor.replace(",", ".")
    try:
        decimal = Decimal(valor)
    except InvalidOperation:
        return valor
    normalizado = format(decimal, "f")
    return normalizado.rstrip("0").rstrip(".") if "." in normalizado else normalizado


def normalizar_concentracao(valor: object) -> ConcentracaoNormalizada:
    """Separa somente concentrações simples e preserva integralmente as demais."""

    original = str(valor or "").strip()
    if not original or _texto_normalizado(original) in MARCADORES_NULOS or original in {"'-", "-"}:
        return ConcentracaoNormalizada(
            concentracao=original or "Não informada",
            unidade_medida="NAO_SE_APLICA",
            ambigua=True,
            motivo="Concentração ausente no catálogo de origem.",
        )

    comparavel = original.replace("μ", "µ")
    encontrado = _CONCENTRACAO_SIMPLES.fullmatch(comparavel)
    if encontrado:
        unidade = encontrado.group("unidade").replace(" ", "").casefold()
        unidade = "ug" if unidade in {"µg", "μg"} else unidade
        return ConcentracaoNormalizada(
            concentracao=_normalizar_numero(encontrado.group("numero")),
            unidade_medida=_UNIDADES[unidade],
        )

    return ConcentracaoNormalizada(
        concentracao=original,
        unidade_medida="NAO_SE_APLICA",
        ambigua=True,
        motivo="Concentração composta ou unidade sem correspondência segura nas choices atuais.",
    )


def inferir_via_administracao(forma_original: object) -> str:
    """Infere a via apenas quando a descrição da forma é praticamente inequívoca."""

    texto = _texto_normalizado(forma_original)
    if "sublingual" in texto:
        return "SUBLINGUAL"
    if "oftalm" in texto or "colirio" in texto:
        return "OFTALMICA"
    if "otolog" in texto:
        return "OTOLOGICA"
    if "nasal" in texto:
        return "NASAL"
    if "vaginal" in texto:
        return "VAGINAL"
    if "retal" in texto or "supositorio" in texto or "enema" in texto:
        return "RETAL"
    if "transderm" in texto or "adesivo" in texto:
        return "TRANSDERMICA"
    if "inal" in texto or "aerossol" in texto:
        return "INALATORIA"
    if "comprimido para uso topico" in texto:
        return "TOPICA"
    if "pomada" in texto or "creme" in texto or "uso topico" in texto or "solucao topica" in texto:
        return "TOPICA"
    if any(
        termo in texto
        for termo in (
            "comprim",
            "capsul",
            "drage",
            "solucao oral",
            "suspensao oral",
            "xarope",
            "elixir",
            "granulado oral",
            "para suspensao oral",
            "dispersao oral",
            "oleo para uso oral",
            "pastilha",
            "goma de mascar",
        )
    ):
        return "ORAL"
    return "NAO_INFORMADA"
