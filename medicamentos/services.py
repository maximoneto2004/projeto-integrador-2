from datetime import timedelta

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from app.static_data import (
    GRUPO_ADMINISTRADOR,
    TIPO_MOVIMENTACAO_AJUSTE,
    TIPO_MOVIMENTACAO_ENTRADA,
    TIPO_MOVIMENTACAO_PERDA,
    TIPO_MOVIMENTACAO_SAIDA,
)
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from prontuario.models import ReceitaMedicamento
from unidade_posto.models import UnidadePosto

TIPOS_QUE_EXIGEM_MOTIVO = {TIPO_MOVIMENTACAO_AJUSTE, TIPO_MOVIMENTACAO_PERDA}


def unidades_permitidas(user):
    """Retorna None quando o usuário enxerga todas as unidades."""
    if user.is_superuser or user.groups.filter(name__iexact=GRUPO_ADMINISTRADOR).exists():
        return None
    return user.unidades_lotacao.all()


def garantir_acesso_unidade(user, unidade):
    permitidas = unidades_permitidas(user)
    if permitidas is not None and not permitidas.filter(pk=unidade.pk).exists():
        raise PermissionDenied("Você não está lotado nesta unidade.")


def _calcular_delta(tipo, quantidade):
    if tipo == TIPO_MOVIMENTACAO_AJUSTE:
        if quantidade == 0:
            raise ValidationError({"quantidade": "O ajuste não pode ser zero."})
        return quantidade
    if quantidade <= 0:
        raise ValidationError({"quantidade": "Informe uma quantidade maior que zero."})
    return quantidade if tipo == TIPO_MOVIMENTACAO_ENTRADA else -quantidade


def _aplicar_movimentacao(lote, tipo, delta, usuario, motivo=None, receita_item=None):
    """Espera o lote já travado (select_for_update) dentro de uma transação."""
    if tipo == TIPO_MOVIMENTACAO_SAIDA and lote.vencido:
        raise ValidationError(
            {"lote": f"O lote {lote.numero_lote} está vencido e não pode ser dispensado. Registre-o como perda."}
        )
    novo_saldo = lote.quantidade_atual + delta
    if novo_saldo < 0:
        raise ValidationError(
            {"quantidade": f"Saldo insuficiente no lote {lote.numero_lote}: disponível {lote.quantidade_atual}."}
        )
    lote.quantidade_atual = novo_saldo
    lote.save(update_fields=["quantidade_atual", "updated_at"])
    return MovimentacaoEstoque.objects.create(
        lote=lote,
        tipo=tipo,
        quantidade=delta,
        saldo_apos=novo_saldo,
        usuario=usuario,
        motivo=motivo,
        receita_item=receita_item,
    )


def registrar_lote(usuario, **dados):
    quantidade = dados.pop("quantidade_inicial")
    if quantidade <= 0:
        raise ValidationError({"quantidade_inicial": "Informe uma quantidade maior que zero."})
    garantir_acesso_unidade(usuario, dados["unidade"])
    with transaction.atomic():
        lote = LoteMedicamento.objects.create(quantidade_inicial=quantidade, quantidade_atual=0, **dados)
        _aplicar_movimentacao(
            lote, TIPO_MOVIMENTACAO_ENTRADA, quantidade, usuario, motivo="Entrada inicial do lote"
        )
    return lote


def movimentar_lote(usuario, lote_id, tipo, quantidade, motivo=None, receita_item=None):
    if tipo in TIPOS_QUE_EXIGEM_MOTIVO and not (motivo or "").strip():
        raise ValidationError({"motivo": "Informe o motivo para ajustes e perdas."})
    delta = _calcular_delta(tipo, quantidade)
    with transaction.atomic():
        lote = LoteMedicamento.objects.select_for_update().select_related("unidade").get(pk=lote_id)
        garantir_acesso_unidade(usuario, lote.unidade)
        return _aplicar_movimentacao(lote, tipo, delta, usuario, motivo, receita_item)


def dispensar(usuario, medicamento, unidade, quantidade, receita_item=None, motivo=None):
    """Baixa o estoque usando primeiro os lotes que vencem antes (FEFO)."""
    if quantidade <= 0:
        raise ValidationError({"quantidade": "Informe uma quantidade maior que zero."})
    garantir_acesso_unidade(usuario, unidade)
    with transaction.atomic():
        if receita_item is not None:
            receita_item = _validar_item_receita(receita_item.pk, medicamento, quantidade)
        lotes = list(
            LoteMedicamento.objects.select_for_update()
            .filter(
                medicamento=medicamento,
                unidade=unidade,
                is_active=True,
                quantidade_atual__gt=0,
                validade__gte=timezone.localdate(),
            )
            .order_by("validade", "data_entrada")
        )
        disponivel = sum(lote.quantidade_atual for lote in lotes)
        if disponivel < quantidade:
            raise ValidationError(
                {"quantidade": f"Estoque insuficiente de {medicamento} nesta unidade: disponível {disponivel}."}
            )

        movimentacoes = []
        restante = quantidade
        for lote in lotes:
            if restante == 0:
                break
            retirar = min(restante, lote.quantidade_atual)
            movimentacoes.append(
                _aplicar_movimentacao(lote, TIPO_MOVIMENTACAO_SAIDA, -retirar, usuario, motivo, receita_item)
            )
            restante -= retirar

        if receita_item is not None:
            receita_item.registrar_dispensacao(quantidade)
    return movimentacoes


def _validar_item_receita(item_id, medicamento, quantidade):
    """Trava o item para que duas dispensações simultâneas não ultrapassem o prescrito."""
    item = ReceitaMedicamento.objects.select_for_update().select_related("receita").get(pk=item_id)
    if item.medicamento_id != medicamento.pk:
        raise ValidationError({"medicamento": "O medicamento não corresponde ao prescrito na receita."})
    if item.receita.vencida:
        raise ValidationError(
            {"receita_item": f"A receita venceu em {item.receita.data_validade:%d/%m/%Y} e não pode mais ser dispensada."}
        )
    if quantidade > item.quantidade_restante:
        raise ValidationError(
            {"quantidade": f"Quantidade acima do que falta dispensar nesta receita: restam {item.quantidade_restante}."}
        )
    return item


def calcular_saldos(unidades, medicamento_id=None):
    hoje = timezone.localdate()
    lotes = LoteMedicamento.objects.filter(is_active=True)
    if unidades is not None:
        lotes = lotes.filter(unidade__in=unidades)
    if medicamento_id:
        lotes = lotes.filter(medicamento_id=medicamento_id)

    agregados = (
        lotes.values("medicamento_id", "medicamento__estoque_minimo", "unidade_id", "unidade__nome")
        .annotate(
            saldo_disponivel=Sum("quantidade_atual", filter=Q(validade__gte=hoje), default=0),
            saldo_vencido=Sum("quantidade_atual", filter=Q(validade__lt=hoje), default=0),
        )
        .order_by("unidade__nome", "medicamento_id")
    )
    medicamentos = Medicamento.objects.in_bulk({item["medicamento_id"] for item in agregados})
    return [
        {
            "medicamento_id": item["medicamento_id"],
            "medicamento": str(medicamentos[item["medicamento_id"]]),
            "unidade_id": item["unidade_id"],
            "unidade": item["unidade__nome"],
            "saldo_disponivel": item["saldo_disponivel"],
            "saldo_vencido": item["saldo_vencido"],
            "estoque_minimo": item["medicamento__estoque_minimo"],
            "abaixo_minimo": item["saldo_disponivel"] < item["medicamento__estoque_minimo"],
        }
        for item in agregados
    ]


def calcular_alertas(unidades, dias_vencimento=30):
    hoje = timezone.localdate()
    saldos = calcular_saldos(unidades)
    estoque_baixo = [s for s in saldos if s["abaixo_minimo"]]

    # Medicamentos com mínimo definido e nenhum lote na unidade também estão abaixo do mínimo.
    unidades_qs = UnidadePosto.objects.filter(is_active=True) if unidades is None else unidades
    com_lote = {(s["medicamento_id"], s["unidade_id"]) for s in saldos}
    for medicamento in Medicamento.objects.filter(is_active=True, estoque_minimo__gt=0):
        for unidade in unidades_qs:
            if (medicamento.id, unidade.id) not in com_lote:
                estoque_baixo.append(
                    {
                        "medicamento_id": medicamento.id,
                        "medicamento": str(medicamento),
                        "unidade_id": unidade.id,
                        "unidade": unidade.nome,
                        "saldo_disponivel": 0,
                        "saldo_vencido": 0,
                        "estoque_minimo": medicamento.estoque_minimo,
                        "abaixo_minimo": True,
                    }
                )

    lotes = LoteMedicamento.objects.filter(is_active=True, quantidade_atual__gt=0).select_related(
        "medicamento", "unidade"
    )
    if unidades is not None:
        lotes = lotes.filter(unidade__in=unidades)

    return {
        "estoque_baixo": estoque_baixo,
        "vencendo": lotes.filter(validade__gte=hoje, validade__lte=hoje + timedelta(days=dias_vencimento)),
        "vencidos": lotes.filter(validade__lt=hoje),
    }
