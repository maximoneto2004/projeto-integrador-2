"""Rotas da área do cidadão, usadas pelo agente de IA com o token devolvido na verificação.

O cidadão vem sempre do token, nunca do corpo ou da URL: um cidadão não alcança dados de outro.
"""

from django.db import transaction
from django.http import Http404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from agendamentos.filters import AgendamentoFilter
from agendamentos.models import Agendamento
from agendamentos.services import cancelar_agendamento
from agendamentos.views import criar_agendamento
from medicamentos.services import calcular_saldos
from prontuario.filters import ReceitaFilter
from prontuario.models import Receita
from unidade_posto.models import UnidadePosto

from .autenticacao import CidadaoJWTAuthentication, IsCidadao
from .serializers_cidadao import (
    AgendamentoCidadaoSerializer,
    NovoAgendamentoCidadaoSerializer,
    ReceitaCidadaoSerializer,
)

ORIGEM_AGENDAMENTO_CIDADAO = "SITE"
CAMPOS_AGENDAMENTO_CIDADAO = ("vaga", "servico", "motivo_territorio")


def _sem_filtros_de_pessoa(filterset_class, nomes):
    """Reaproveita o filtro da rota de funcionário sem os filtros que identificam pessoas.

    Assim um ?cidadao= enviado pelo agente é ignorado, em vez de esvaziar a lista.
    """

    class FiltroDoCidadao(filterset_class):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            for nome in nomes:
                self.filters.pop(nome, None)

    return FiltroDoCidadao


class _AreaCidadaoMixin:
    authentication_classes = [CidadaoJWTAuthentication]
    permission_classes = [IsCidadao]

    @property
    def cidadao(self):
        return self.request.user.cidadao

    def _listar(self, queryset, serializer_class):
        paginator = LimitOffsetPagination()
        page = paginator.paginate_queryset(queryset, self.request, view=self)
        if page is None:
            return Response({"success": True, "result": serializer_class(queryset, many=True).data})
        return Response(
            {
                "success": True,
                "count": paginator.count,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
                "result": serializer_class(page, many=True).data,
            }
        )


class CidadaoMeusDadosView(_AreaCidadaoMixin, APIView):
    """Dados do próprio cidadão, identificado pelo token devolvido na verificação."""

    def get(self, request):
        cidadao = self.cidadao
        return Response(
            {
                "success": True,
                "result": {"id": str(cidadao.id), "nome": cidadao.nome, "cpf": cidadao.cpf, "email": cidadao.email},
            }
        )


class MeusAgendamentosView(_AreaCidadaoMixin, generics.ListCreateAPIView):
    serializer_class = AgendamentoCidadaoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = _sem_filtros_de_pessoa(AgendamentoFilter, ("cidadao", "cpf", "nome", "atendente"))

    def get_queryset(self):
        return (
            Agendamento.objects.filter(cidadao=self.cidadao)
            .select_related("servico__tipo_servico", "unidade__bairro")
            .order_by("-data", "-horario")
        )

    def list(self, request, *args, **kwargs):
        return self._listar(self.filter_queryset(self.get_queryset()), AgendamentoCidadaoSerializer)

    def create(self, request, *args, **kwargs):
        dados = request.data if hasattr(request.data, "get") else {}
        entrada = {campo: dados.get(campo) for campo in CAMPOS_AGENDAMENTO_CIDADAO if campo in dados}
        entrada.update(cidadao=str(self.cidadao.id), origem=ORIGEM_AGENDAMENTO_CIDADAO)
        return criar_agendamento(
            NovoAgendamentoCidadaoSerializer(data=entrada), serializer_saida=AgendamentoCidadaoSerializer
        )


class CancelarMeuAgendamentoView(_AreaCidadaoMixin, APIView):
    def post(self, request, pk):
        with transaction.atomic():
            agendamento = Agendamento.objects.select_for_update().filter(pk=pk, cidadao=self.cidadao).first()
            if agendamento is None:
                return Response(
                    {"success": False, "result": "Agendamento não encontrado."}, status=status.HTTP_404_NOT_FOUND
                )
            if agendamento.situacao != "AGENDADO":
                return Response(
                    {
                        "success": False,
                        "result": f"Este agendamento não pode ser cancelado: {agendamento.get_situacao_display()}.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            mensagem = cancelar_agendamento(agendamento.pk, origem="CANCELADO_CIDADAO")
        return Response({"success": True, "result": mensagem})


class _MinhasReceitasMixin(_AreaCidadaoMixin):
    serializer_class = ReceitaCidadaoSerializer

    def get_queryset(self):
        return (
            Receita.objects.filter(cidadao=self.cidadao)
            .select_related("profissional", "agendamento__unidade")
            .prefetch_related("medicamentos")
        )


class MinhasReceitasView(_MinhasReceitasMixin, generics.ListAPIView):
    filter_backends = [DjangoFilterBackend]
    filterset_class = _sem_filtros_de_pessoa(ReceitaFilter, ("cidadao", "search", "agendamento"))

    def list(self, request, *args, **kwargs):
        return self._listar(self.filter_queryset(self.get_queryset()), ReceitaCidadaoSerializer)


class MinhaReceitaView(_MinhasReceitasMixin, generics.RetrieveAPIView):
    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response({"success": False, "result": "Receita não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return super().handle_exception(exc)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "result": self.get_serializer(self.get_object()).data})


class DisponibilidadeReceitaView(_MinhasReceitasMixin, generics.GenericAPIView):
    """Em quais unidades há estoque válido de cada medicamento da receita."""

    def get(self, request, pk):
        receita = self.get_queryset().filter(pk=pk).first()
        if receita is None:
            return Response({"success": False, "result": "Receita não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        unidades = UnidadePosto.objects.filter(is_active=True)
        itens = []
        for item in receita.medicamentos.all():
            if not item.medicamento_id:
                itens.append(
                    {
                        "item_id": item.id,
                        "medicamento": item.nome,
                        "quantidade_restante": item.quantidade_restante,
                        "unidades": [],
                        "observacao": "Medicamento sem cadastro no estoque; confirme a disponibilidade na unidade.",
                    }
                )
                continue
            saldos = calcular_saldos(unidades, medicamento_id=item.medicamento_id)
            itens.append(
                {
                    "item_id": item.id,
                    "medicamento": item.nome,
                    "quantidade_restante": item.quantidade_restante,
                    # Só a existência de estoque; a quantidade exata é informação interna da unidade.
                    "unidades": [
                        {
                            "unidade_id": saldo["unidade_id"],
                            "unidade": saldo["unidade"],
                            "suficiente": saldo["saldo_disponivel"] >= item.quantidade_restante,
                        }
                        for saldo in saldos
                        if saldo["saldo_disponivel"] > 0
                    ],
                }
            )
        return Response(
            {"success": True, "result": {"receita_id": receita.id, "vencida": receita.vencida, "itens": itens}}
        )
