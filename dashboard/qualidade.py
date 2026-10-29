"""Painel "Qualidade dos dados" do administrador: o que falta no cadastro para os dashboards serem confiáveis."""

import json
from datetime import timedelta
from functools import lru_cache

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from agendamentos.models import Agendamento
from app.models import Bairro
from app.static_data import (
    GRUPO_ADMINISTRADOR,
    GRUPO_FARMACEUTICO,
    GRUPO_RECEPCIONISTA,
    GRUPO_SUPERVISOR,
    GRUPOS_PROFISSIONAIS_SAUDE,
)
from cidadaos.models import Cidadao
from medicamentos.models import Medicamento
from prontuario.models import ReceitaMedicamento
from servicos.models import TipoServico
from unidade_posto.models import UnidadePosto
from usuarios.models import Usuario
from . import indicadores
from .mapa_bairros import normalizar_nome_geo

DIAS_HISTORICO = 30
LIMITE_ITENS = 20
GRUPOS_OPERACIONAIS = [*GRUPOS_PROFISSIONAIS_SAUDE, GRUPO_FARMACEUTICO, GRUPO_RECEPCIONISTA, GRUPO_SUPERVISOR]


class AdministradorPermission(permissions.BasePermission):
    message = "O painel de qualidade dos dados é do administrador."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (
            user.is_superuser or user.groups.filter(name__iexact=GRUPO_ADMINISTRADOR).exists()
        ))


@lru_cache(maxsize=1)
def nomes_do_mapa():
    from .views import _get_bairros_geojson_path

    caminho = _get_bairros_geojson_path()
    if not caminho:
        return None
    with open(caminho, encoding="utf-8") as arquivo:
        features = json.load(arquivo).get("features", [])
    return {normalizar_nome_geo(str((f.get("properties") or {}).get("Nome") or "")) for f in features}


def verificacao(chave, titulo, descricao, total, base, itens, link):
    return {
        "chave": chave,
        "titulo": titulo,
        "descricao": descricao,
        "total": total,
        "base": base,
        "pct": round(total / base * 100, 1) if base else None,
        "itens": itens[:LIMITE_ITENS],
        "link": link,
    }


def item(objeto_id, nome, detalhe=""):
    return {"id": str(objeto_id), "nome": nome, "detalhe": detalhe}


def medicao_das_consultas(inicio, fim):
    periodo = Agendamento.objects.filter(data__range=(inicio, fim))
    nomes = dict(UnidadePosto.objects.values_list("id", "nome"))
    itens, encerrados, sem_medicao = [], 0, 0
    for unidade_id, tempos in indicadores.tempos_por(periodo, "unidade_id").items():
        faltando = tempos.encerrados - tempos.medidos
        encerrados += tempos.encerrados
        sem_medicao += faltando
        if faltando:
            itens.append(item(unidade_id, nomes.get(unidade_id, "Unidade"), f"{faltando} de {tempos.encerrados} consultas sem início ou fim"))
    itens.sort(key=lambda i: -int(i["detalhe"].split()[0]))
    return verificacao(
        "consultas_sem_medicao", "Consultas sem início ou fim registrado",
        f"Consultas encerradas nos últimos {DIAS_HISTORICO} dias que não entram no tempo médio nem no SLA.",
        sem_medicao, encerrados, itens, "/sistema/monitor-unidade",
    )


def unidades():
    from .views import _parse_lat_lon

    ativas = list(UnidadePosto.objects.filter(is_active=True).annotate(
        abrangencia=Count("bairros_abrangencia", distinct=True), servicos=Count("servicos_unidade", distinct=True),
    ).order_by("nome"))
    sem_coordenadas = [u for u in ativas if None in _parse_lat_lon(u.latitude, u.longitude)]
    sem_abrangencia = [u for u in ativas if not u.abrangencia]
    sem_servico = [u for u in ativas if not u.servicos]
    link = "/sistema/administrador/unidades"
    return [
        verificacao("unidades_sem_coordenadas", "Unidades sem localização", "Não aparecem no mapa nem no calor de medicamentos.",
                    len(sem_coordenadas), len(ativas), [item(u.id, u.nome) for u in sem_coordenadas], link),
        verificacao("unidades_sem_abrangencia", "Unidades sem bairros de abrangência",
                    "Sem território definido, todo atendimento conta como fora do território e o bairro fica descoberto.",
                    len(sem_abrangencia), len(ativas), [item(u.id, u.nome) for u in sem_abrangencia], link),
        verificacao("unidades_sem_servico", "Unidades sem serviço ofertado", "Não abrem agenda nem recebem agendamentos.",
                    len(sem_servico), len(ativas), [item(u.id, u.nome) for u in sem_servico], link),
    ]


def servicos_e_medicamentos(inicio, fim):
    tipos = TipoServico.objects.filter(is_active=True)
    sem_meta = list(tipos.filter(tempo_atendimento__lte=0).order_by("nome"))
    medicamentos = Medicamento.objects.filter(is_active=True)
    sem_minimo = list(medicamentos.filter(estoque_minimo=0).order_by("nome", "concentracao"))
    itens_receita = ReceitaMedicamento.objects.filter(is_active=True, receita__data_emissao__date__range=(inicio, fim))
    legados = itens_receita.filter(medicamento__isnull=True)
    nomes_legados = list(legados.values("nome").annotate(total=Count("id")).order_by("-total", "nome"))
    return [
        verificacao("servicos_sem_meta", "Tipos de serviço sem tempo de atendimento",
                    "Sem meta, as consultas desses serviços não entram na % dentro da meta.",
                    len(sem_meta), tipos.count(), [item(t.id, t.nome) for t in sem_meta], "/sistema/administrador/servicos"),
        verificacao("medicamentos_sem_minimo", "Medicamentos sem estoque mínimo",
                    "Sem mínimo, o estoque nunca entra em alerta e a ruptura só aparece quando zera.",
                    len(sem_minimo), medicamentos.count(), [item(m.id, str(m)) for m in sem_minimo], "/sistema/administrador/medicamentos"),
        verificacao("receitas_sem_catalogo", "Itens de receita sem medicamento do catálogo",
                    f"Prescrições dos últimos {DIAS_HISTORICO} dias digitadas à mão: ficam fora do calor de medicamentos e do estoque.",
                    legados.count(), itens_receita.count(),
                    [item(n["nome"], n["nome"] or "Sem nome", f"{n['total']} itens") for n in nomes_legados], "/sistema/administrador/medicamentos"),
    ]


def cidadaos():
    base = Cidadao.objects.filter(is_active=True)
    total = base.count()
    contagens = base.aggregate(
        sem_bairro=Count("id", filter=Q(bairro__isnull=True)),
        sem_cns=Count("id", filter=Q(cns__isnull=True) | Q(cns="")),
        sem_nascimento=Count("id", filter=Q(data_nascimento__isnull=True)),
        sem_telefone=Count("id", filter=Q(telefone__isnull=True) | Q(telefone="")),
    )
    link = "/sistema/cadastro-cidadao"
    return [
        verificacao("cidadaos_sem_bairro", "Cidadãos sem bairro", "Ficam fora das camadas por bairro do mapa e do cálculo de território.",
                    contagens["sem_bairro"], total, [], link),
        verificacao("cidadaos_sem_nascimento", "Cidadãos sem data de nascimento", "Ficam fora da faixa etária do Painel da Rede.",
                    contagens["sem_nascimento"], total, [], link),
        verificacao("cidadaos_sem_cns", "Cidadãos sem Cartão Nacional de Saúde", "Dificulta a integração com os sistemas do SUS.",
                    contagens["sem_cns"], total, [], link),
        verificacao("cidadaos_sem_telefone", "Cidadãos sem telefone", "A recepção não consegue avisar atrasos nem confirmar presença.",
                    contagens["sem_telefone"], total, [], link),
    ]


def bairros_fora_do_mapa():
    nomes = nomes_do_mapa()
    bairros = list(Bairro.objects.filter(is_active=True).order_by("nome"))
    if nomes is None:
        return []
    fora = [b for b in bairros if normalizar_nome_geo(b.nome) not in nomes]
    return [verificacao(
        "bairros_fora_do_mapa", "Bairros com nome diferente do mapa",
        "O nome não bate com nenhum bairro do mapa de Fortaleza, então o bairro não é desenhado nas camadas.",
        len(fora), len(bairros), [item(b.id, b.nome) for b in fora], "/sistema/administrador/bairros",
    )]


def profissionais():
    operacionais = Usuario.objects.filter(is_active=True, groups__name__in=GRUPOS_OPERACIONAIS).distinct()
    total = operacionais.count()
    sem_lotacao = list(operacionais.filter(unidades_lotacao__isnull=True).order_by("nome_completo"))
    sem_escala = list(operacionais.exclude(escalas__is_active=True).order_by("nome_completo"))
    saude = operacionais.filter(groups__name__in=GRUPOS_PROFISSIONAIS_SAUDE).distinct()
    sem_servico = list(saude.filter(tipo_ofertados__isnull=True).order_by("nome_completo"))
    link = "/sistema/cadastro-profissionais"
    return [
        verificacao("profissionais_sem_lotacao", "Profissionais sem unidade de lotação",
                    "Não conseguem abrir os painéis da unidade nem atender.", len(sem_lotacao), total,
                    [item(u.id, u.nome_completo) for u in sem_lotacao], link),
        verificacao("profissionais_sem_escala", "Profissionais sem escala ativa", "O login é recusado nos dias sem escala.",
                    len(sem_escala), total, [item(u.id, u.nome_completo) for u in sem_escala], link),
        verificacao("profissionais_sem_servico", "Médicos e enfermeiros sem serviço ofertado",
                    "A lista de atendimentos e o painel Meu Dia ficam vazios para eles.", len(sem_servico), saude.count(),
                    [item(u.id, u.nome_completo) for u in sem_servico], link),
    ]


class QualidadeDadosAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, AdministradorPermission]

    def get(self, request):
        fim = timezone.localdate()
        inicio = fim - timedelta(days=DIAS_HISTORICO - 1)
        grupos = [
            {"grupo": "Atendimento", "verificacoes": [medicao_das_consultas(inicio, fim)]},
            {"grupo": "Unidades e território", "verificacoes": unidades() + bairros_fora_do_mapa()},
            {"grupo": "Serviços e medicamentos", "verificacoes": servicos_e_medicamentos(inicio, fim)},
            {"grupo": "Cidadãos", "verificacoes": cidadaos()},
            {"grupo": "Equipe", "verificacoes": profissionais()},
        ]
        pendencias = sum(1 for g in grupos for v in g["verificacoes"] if v["total"])
        total = sum(len(g["verificacoes"]) for g in grupos)
        return Response({"success": True, "results": {
            "data_inicio": inicio, "data_fim": fim, "pendencias": pendencias, "verificacoes": total, "grupos": grupos,
        }})
