from django.conf import settings
from django.db.models import F
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from agendamentos.models import Agendamento, AgendaVaga
from app.models import Bairro
from cidadaos.models import Cidadao
from integracao.authentication import CitizenSessionAuthentication, IntegrationKeyAuthentication, IsCitizenSessionAuthenticated, IsIntegrationKeyAuthenticated
from integracao.models import SessaoCidadao
from integracao.serializers import (
    AgendamentoIntegracaoSerializer, BairroIntegracaoSerializer,
    CidadaoBuscaQuerySerializer, CidadaoBuscaRespostaSerializer, CidadaoCriadoRespostaSerializer,
    CriarAgendamentoIntegracaoSerializer, CriarCidadaoIntegracaoSerializer,
    DesafioCriadoSerializer, DisponibilidadeMedicamentoSerializer,
    ErroIntegracaoSerializer, IniciarAuthSerializer, ReceitaIntegracaoSerializer,
    ServicoIntegracaoSerializer, ServicosUnidadeQuerySerializer, SessaoQuerySerializer,
    SessaoStatusSerializer, TipoServicoIntegracaoSerializer, UnidadeIntegracaoSerializer,
    VagaIntegracaoSerializer, VagasQuerySerializer, VerificarAuthSerializer,
)
from integracao.services import cancelar_agendamento_cidadao, criar_agendamento_cidadao, disponibilidade_receita, iniciar_desafio, normalizar_telefone, somente_digitos, verificar_desafio
from prontuario.models import Receita
from servicos.models import TipoServico
from unidade_posto.models import ServicoUnidadePosto, UnidadePosto


class PublicIntegrationView(APIView):
    permission_classes = [IsIntegrationKeyAuthenticated]
    authentication_classes = [IntegrationKeyAuthentication]
    serializer_class = serializers.Serializer


class CitizenIntegrationView(APIView):
    authentication_classes = [CitizenSessionAuthentication]
    permission_classes = [IsCitizenSessionAuthenticated]
    serializer_class = serializers.Serializer

    @property
    def cidadao(self):
        return self.request.auth.cidadao


def sessao_payload(sessao, token=None):
    restante = max(0, int((sessao.expires_at - timezone.now()).total_seconds()))
    data = {"authenticated": True, "cidadao_id": str(sessao.cidadao_id), "expires_at": sessao.expires_at, "remaining_seconds": restante}
    if token:
        data["session_token"] = token
        data["token_type"] = "X-Citizen-Session"
    return data


class SessaoConsultaView(PublicIntegrationView):
    @extend_schema(parameters=[OpenApiParameter("telefone", str, required=True)], responses={200: SessaoStatusSerializer, 400: ErroIntegracaoSerializer}, tags=["Integração - autenticação"])
    def get(self, request):
        serializer = SessaoQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            telefone = normalizar_telefone(serializer.validated_data["telefone"])
        except Exception as exc:
            return Response(getattr(exc, "detail", {"telefone": "Inválido."}), status=400)
        sessao = SessaoCidadao.objects.filter(telefone=telefone, revoked_at__isnull=True, is_active=True, expires_at__gt=timezone.now()).order_by("-authenticated_at").first()
        return Response(sessao_payload(sessao) if sessao else {"authenticated": False})


class AuthIniciarView(PublicIntegrationView):
    @extend_schema(request=IniciarAuthSerializer, responses={201: DesafioCriadoSerializer, 403: ErroIntegracaoSerializer, 404: ErroIntegracaoSerializer}, tags=["Integração - autenticação"])
    def post(self, request):
        serializer = IniciarAuthSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        desafio = iniciar_desafio(**serializer.validated_data)
        data = {"challenge_id": str(desafio.id), "expires_at": desafio.expires_at, "delivery": "mock"}
        if settings.DEBUG and settings.CITIZEN_AUTH_MOCK_EXPOSE_CODE:
            data["development_code"] = settings.CITIZEN_AUTH_MOCK_CODE
        return Response(data, status=status.HTTP_201_CREATED)


class AuthVerificarView(PublicIntegrationView):
    @extend_schema(request=VerificarAuthSerializer, responses={200: SessaoStatusSerializer, 400: ErroIntegracaoSerializer, 403: ErroIntegracaoSerializer, 404: ErroIntegracaoSerializer}, tags=["Integração - autenticação"])
    def post(self, request):
        serializer = VerificarAuthSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        sessao, token = verificar_desafio(**serializer.validated_data)
        return Response(sessao_payload(sessao, token))


class CidadaoBuscaView(PublicIntegrationView):
    @extend_schema(parameters=[OpenApiParameter("cpf", str, required=True)], responses={200: CidadaoBuscaRespostaSerializer, 403: ErroIntegracaoSerializer}, tags=["Integração - login"])
    def get(self, request):
        if not settings.CITIZEN_AUTH_MOCK_ENABLED:
            return Response({"detail": "Disponível apenas no modo mock."}, status=403)
        serializer = CidadaoBuscaQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        cidadao = Cidadao.objects.filter(cpf=somente_digitos(serializer.validated_data["cpf"]), is_active=True).first()
        return Response({"exists": bool(cidadao), "cidadao_id": str(cidadao.id) if cidadao else None, "nome": cidadao.nome if cidadao else None})


class CidadaoCriarView(PublicIntegrationView):
    @extend_schema(request=CriarCidadaoIntegracaoSerializer, responses={201: CidadaoCriadoRespostaSerializer, 400: ErroIntegracaoSerializer, 403: ErroIntegracaoSerializer, 409: ErroIntegracaoSerializer}, tags=["Integração - login"])
    def post(self, request):
        if not settings.CITIZEN_AUTH_MOCK_ENABLED:
            return Response({"detail": "Disponível apenas no modo mock."}, status=403)
        serializer = CriarCidadaoIntegracaoSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        cpf = somente_digitos(data["cpf"])
        if Cidadao.objects.filter(cpf=cpf).exists():
            return Response({"cpf": ["CPF já cadastrado."]}, status=409)
        cidadao = Cidadao.objects.create(nome=data["nome"], cpf=cpf, telefone=normalizar_telefone(data["telefone"]), data_nascimento=data.get("data_nascimento"), email=data.get("email") or None)
        return Response({"id": str(cidadao.id), "nome": cidadao.nome}, status=201)


class BairrosView(CitizenIntegrationView):
    @extend_schema(responses={200: inline_serializer("BairrosResposta", {"results": BairroIntegracaoSerializer(many=True)})}, tags=["Integração - catálogo"])
    def get(self, request):
        return Response({"results": list(Bairro.objects.filter(is_active=True).values("id", "nome"))})


class UnidadesView(CitizenIntegrationView):
    @extend_schema(responses={200: inline_serializer("UnidadesResposta", {"results": UnidadeIntegracaoSerializer(many=True)})}, tags=["Integração - catálogo"])
    def get(self, request):
        unidades = UnidadePosto.objects.filter(is_active=True).select_related("bairro")
        return Response(
            {
                "results": [
                    {
                        "id": unidade.id,
                        "nome": unidade.nome,
                        "telefone": unidade.telefone,
                        "bairro": {
                            "id": unidade.bairro_id,
                            "nome": unidade.bairro.nome,
                        },
                        "logradouro": unidade.logradouro,
                        "numero": unidade.numero,
                        "complemento": unidade.complemento,
                        "cep": unidade.cep,
                        "latitude": unidade.latitude,
                        "longitude": unidade.longitude,
                    }
                    for unidade in unidades
                ]
            }
        )


class TiposServicoView(CitizenIntegrationView):
    @extend_schema(responses={200: inline_serializer("TiposServicoResposta", {"results": TipoServicoIntegracaoSerializer(many=True)})}, tags=["Integração - catálogo"])
    def get(self, request):
        return Response({"results": list(TipoServico.objects.filter(is_active=True).values("id", "nome", "descricao"))})


class ServicosUnidadeView(CitizenIntegrationView):
    @extend_schema(parameters=[OpenApiParameter("tipo_id", str, required=True)], responses={200: inline_serializer("ServicosUnidadeResposta", {"results": ServicoIntegracaoSerializer(many=True)}), 400: ErroIntegracaoSerializer}, tags=["Integração - catálogo"])
    def get(self, request, unidade_id):
        serializer = ServicosUnidadeQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        qs = ServicoUnidadePosto.objects.filter(unidade_id=unidade_id, servico__tipo_servico_id=serializer.validated_data["tipo_id"], is_active=True, servico__is_active=True)
        return Response({"results": [{"id": str(x.servico_id), "nome": x.servico.nome, "gera_receita": x.servico.gera_receita} for x in qs.select_related("servico")]})


class VagasView(CitizenIntegrationView):
    @extend_schema(parameters=[OpenApiParameter("unidade_id", str, required=True), OpenApiParameter("tipo_id", str, required=True), OpenApiParameter("data", str)], responses={200: inline_serializer("VagasResposta", {"results": VagaIntegracaoSerializer(many=True)}), 400: ErroIntegracaoSerializer}, tags=["Integração - agendamentos"])
    def get(self, request):
        serializer = VagasQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data
        qs = AgendaVaga.objects.filter(unidade_id=params["unidade_id"], tipo_servico_id=params["tipo_id"], data__gte=timezone.localdate(), is_active=True, vagas_ocupadas__lt=F("vagas"))
        if params.get("data"): qs = qs.filter(data=params["data"])
        return Response({"results": [{"id": str(v.id), "data": v.data, "horario": v.horario, "vagas_disponiveis": v.vagas-v.vagas_ocupadas} for v in qs]})


class AgendamentosView(CitizenIntegrationView):
    @extend_schema(responses={200: inline_serializer("AgendamentosResposta", {"results": AgendamentoIntegracaoSerializer(many=True)})}, tags=["Integração - agendamentos"])
    def get(self, request):
        qs = Agendamento.objects.filter(cidadao=self.cidadao).select_related("servico", "unidade").order_by("-data", "-horario")
        return Response({"results": [{"id": str(a.id), "data": a.data, "horario": a.horario, "situacao": a.situacao, "servico": a.servico.nome, "unidade": a.unidade.nome} for a in qs]})

    @extend_schema(request=CriarAgendamentoIntegracaoSerializer, responses={201: AgendamentoIntegracaoSerializer, 400: ErroIntegracaoSerializer, 404: ErroIntegracaoSerializer, 409: ErroIntegracaoSerializer}, tags=["Integração - agendamentos"])
    def post(self, request):
        serializer = CriarAgendamentoIntegracaoSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        agendamento = criar_agendamento_cidadao(self.cidadao, **serializer.validated_data)
        return Response({"id": str(agendamento.id), "situacao": agendamento.situacao, "data": agendamento.data, "horario": agendamento.horario}, status=201)


class CancelarAgendamentoView(CitizenIntegrationView):
    @extend_schema(request=None, responses={200: ErroIntegracaoSerializer, 400: ErroIntegracaoSerializer, 404: ErroIntegracaoSerializer}, tags=["Integração - agendamentos"])
    def post(self, request, agendamento_id):
        return Response({"detail": cancelar_agendamento_cidadao(self.cidadao, agendamento_id)})


def receita_data(receita):
    return {"id": str(receita.id), "data_emissao": receita.data_emissao, "validade": receita.data_validade, "medicamentos": [{"medicamento_id": str(i.medicamento_id) if i.medicamento_id else None, "nome": i.nome, "dosagem": i.dosagem, "frequencia": i.frequencia, "duracao": i.duracao} for i in receita.medicamentos.all()]}


class ReceitasView(CitizenIntegrationView):
    @extend_schema(responses={200: inline_serializer("ReceitasResposta", {"receitas": ReceitaIntegracaoSerializer(many=True)})}, tags=["Integração - receitas"], operation_id="integracao_listar_receitas")
    def get(self, request):
        qs = Receita.objects.filter(cidadao=self.cidadao).prefetch_related("medicamentos").order_by("-data_emissao")
        return Response({"receitas": [receita_data(r) for r in qs]})


class ReceitaDetalheView(CitizenIntegrationView):
    @extend_schema(responses={200: ReceitaIntegracaoSerializer, 404: ErroIntegracaoSerializer}, tags=["Integração - receitas"], operation_id="integracao_detalhar_receita")
    def get(self, request, receita_id):
        receita = Receita.objects.filter(pk=receita_id, cidadao=self.cidadao).prefetch_related("medicamentos").first()
        if not receita: return Response({"detail": "Receita não encontrada."}, status=404)
        return Response(receita_data(receita))


class DisponibilidadeReceitaView(CitizenIntegrationView):
    @extend_schema(responses={200: inline_serializer("DisponibilidadeReceitaResposta", {"medicamentos": DisponibilidadeMedicamentoSerializer(many=True)}), 404: ErroIntegracaoSerializer}, tags=["Integração - receitas"])
    def get(self, request, receita_id):
        return Response({"medicamentos": disponibilidade_receita(self.cidadao, receita_id)})
