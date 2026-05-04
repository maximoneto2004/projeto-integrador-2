import logging
from django.db import IntegrityError, transaction
from django.core.cache import cache
from django.db.models import F, Q
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.views import View
from django.views.generic import TemplateView
from rest_framework import permissions, status, serializers
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.http import Http404
from rest_framework import generics
from django.utils import timezone
from rest_framework.response import Response
from agendamentos.filters import AgendaVagaFilter, AgendamentoFilter
from agendamentos.models import AgendaVaga, Agendamento, ChamadaPainel
from agendamentos.serializers import (
    AgendaVagaSerializer,
    AgendamentoDetailSerializer,
    AgendamentoSerializer,
)
from cidadaos.models import Cidadao
from cidadaos.requests_fd import check_auth_sso, get_valid_token_or_none
from servicos.models import Servico, TipoServico
from unidade_cras.models import ServicoUnidadeCras, UnidadeCras
from app.permissions import DjangoModelPermissionsWithView
from cidadaos.authentication import SSOAuthentication
from cidadaos.serializers import CidadaoSerializer
from rest_framework.permissions import AllowAny
from usuarios.models import EscalaTrabalho
from django.conf import settings
from utils.email import send_email_in_thread
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.db.models import Q
from django.db import IntegrityError
from .services import cancelar_agendamento

logger = logging.getLogger(__name__)
CHAMADA_INTERVALO_SEGUNDOS = 15


def _format_endereco_unidade(unidade):
    if not unidade:
        return ""
    partes = [unidade.logradouro, unidade.numero]
    if unidade.complemento:
        partes.append(unidade.complemento)
    endereco = ", ".join([p for p in partes if p])
    bairro = unidade.bairro.nome if unidade.bairro_id else ""
    if bairro:
        endereco = f"{endereco} - {bairro}" if endereco else bairro
    if unidade.cep:
        endereco = f"{endereco} - CEP {unidade.cep}" if endereco else f"CEP {unidade.cep}"
    return endereco


def _send_agendamento_email(agendamento):
    if not agendamento or agendamento.situacao != "AGENDADO":
        return
    cidadao = agendamento.cidadao
    email = getattr(cidadao, "email", None) if cidadao else None
    if not email:
        return

    unidade = agendamento.unidade
    data = agendamento.data.strftime("%d/%m/%Y") if agendamento.data else ""
    horario = agendamento.horario.strftime("%H:%M") if agendamento.horario else ""
    unidade_nome = unidade.nome if unidade else ""
    endereco = _format_endereco_unidade(unidade)
    servico_nome = agendamento.servico.nome if agendamento.servico_id else ""

    subject = "Confirmação de agendamento"
    message = (
        "Seu agendamento foi confirmado.\n"
        f"Servico: {servico_nome}\n"
        f"Data: {data}\n"
        f"Horario: {horario}\n"
        f"Unidade: {unidade_nome}\n"
        f"Endereco: {endereco}\n"
    )
    # html = (
    #     "<p>Seu agendamento foi confirmado.</p>"
    #     f"<p><strong>Servico:</strong> {servico_nome}</p>"
    #     f"<p><strong>Data:</strong> {data}</p>"
    #     f"<p><strong>Horário:</strong> {horario}</p>"
    #     f"<p><strong>Unidade:</strong> {unidade_nome}</p>"
    #     f"<p><strong>Endereco:</strong> {endereco}</p>"
    #     f"<p>Leve todos os seus documentos, e chegue ao menos 15 minutos antes na recepção.</p>"
    #     f"<p><i>Esse email é só para confirmação de agendamento e não deve ser respondido <br> qualquer dúvida entrar em contato com a central Cras mais próxima</i> <a href='https://desenvolvimentosocial.fortaleza.ce.gov.br/atendimento/enderecos-e-telefones/2-uncategorised/57-telefones-e-enderecos-cras'>Contato Cras</a></p>"
    # )
    context = {
        "cidadao_nome": getattr(cidadao, "nome", "") if cidadao else "",
        "servico_nome": servico_nome,
        "data": data,
        "horario": horario,
        "unidade_nome": unidade_nome,
        "endereco": endereco,
        "contato_url": (
            "https://desenvolvimentosocial.fortaleza.ce.gov.br/"
            "atendimento/enderecos-e-telefones/2-uncategorised/"
            "57-telefones-e-enderecos-cras"
        ),
    }
    html = render_to_string(
        "agendamentos/email_agendamento_confirmacao.html", context
    )
    message = strip_tags(html)
    try:
        send_email_in_thread(
            email,
            subject,
            message,
            html,
            getattr(settings, "DEFAULT_FROM_EMAIL", None),
        )
    except Exception:
        logger.exception("Falha ao enviar email de agendamento para %s", email)


class TelaAgendamentoView(TemplateView):
    template_name = "tela_agendamento.html"

    def dispatch(self, request, *args, **kwargs):
        redirect_response = check_auth_sso(request)
        if redirect_response:
            return redirect_response
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["unidades"] = UnidadeCras.objects.all()
        return ctx


def ajax_carregar_tipos(request, unidade_id):
    # Buscar todos os tipos atendidos nessa unidade
    tipos_ids = (
        ServicoUnidadeCras.objects.filter(unidade_id=unidade_id)
        .values_list("servico__tipo_servico_id", flat=True)
        .distinct()
    )

    tipos = TipoServico.objects.filter(id__in=tipos_ids)

    data = [{"id": str(t.id), "nome": t.nome} for t in tipos]

    return JsonResponse({"tipos": data})


def ajax_carregar_vagas(request, unidade_id, tipo_id, data):
    vagas = AgendaVaga.objects.filter(
        unidade_id=unidade_id, tipo_servico_id=tipo_id, data=data
    ).order_by("horario")

    data_json = [
        {
            "id": str(v.id),
            "horario": v.horario.strftime("%H:%M"),
            "vagas": v.vagas,
            "vagas_ocupadas": v.vagas_ocupadas,
            "vagas_disponiveis": v.vagas - v.vagas_ocupadas,
        }
        for v in vagas
    ]

    return JsonResponse({"vagas": data_json})


def ajax_carregar_servicos_por_tipo(request, unidade_id, tipo_id):
    su = ServicoUnidadeCras.objects.filter(
        unidade_id=unidade_id, servico__tipo_servico_id=tipo_id
    ).select_related("servico")

    # Remove duplicados
    servicos_ids = su.values_list("servico_id", flat=True).distinct()

    servicos = Servico.objects.filter(id__in=servicos_ids)

    data = [{"id": str(s.id), "nome": s.nome} for s in servicos]

    return JsonResponse({"servicos": data})


class CriarAgendamentoView(View):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()

    def post(self, request):
        token = get_valid_token_or_none(request)
        if not token:
            return JsonResponse({"redirect": reverse("login")}, status=401)

        identidade = {
            "cpf": token.get("preferred_username"),
            "email": token.get("email"),
            "nome": token.get("name"),
        }
        
        cidadao = None
        if identidade["cpf"] or identidade["email"]:
            cidadao = Cidadao.objects.filter(
                Q(cpf=identidade["cpf"]) | Q(email=identidade["email"])
            ).first()
        # if identidade.get("cpf"):
        #     cidadao = Cidadao.objects.filter(cpf=identidade["cpf"]).first()
        # if not cidadao and identidade.get("email"):
        #     cidadao = Cidadao.objects.filter(email=identidade["email"]).first()

        if not cidadao:
            # Garante que a identidade ficará na sessão para pré-preencher o cadastro
            request.session["cidadao_identity"] = {
                k: v for k, v in identidade.items() if v
            }
            return JsonResponse({"redirect": reverse("completar_cadastro")}, status=403)

        vaga_id = request.POST.get("vaga_id")
        servico_id = request.POST.get("servico_id")
        if not vaga_id or not servico_id:
            return JsonResponse({"error": "Dados incompletos."}, status=400)

        try:
            servico = Servico.objects.filter(pk=servico_id).first()
        except Servico.DoesNotExist:
            return JsonResponse({"error": "Serviço inválido."}, status=404)

        if Agendamento.possui_ativo_por_tipo(
                cidadao=cidadao,
                tipo_servico=servico.tipo_servico,
            ):
                return JsonResponse(
                    {"error": "Já existe um agendamento ativo deste tipo para você."},
                    status=409,
                )
        
        with transaction.atomic():
            try:
                vaga = AgendaVaga.objects.select_for_update().get(pk=vaga_id)
            except AgendaVaga.DoesNotExist:
                return JsonResponse({"error": "Vaga não encontrada."}, status=404)

            if vaga.vagas_ocupadas >= vaga.vagas:
                return JsonResponse({"error": "Vaga já preenchida."}, status=409)

            if servico.tipo_servico_id != vaga.tipo_servico_id:
                return JsonResponse(
                    {"error": "Serviço não pertence a este tipo de vaga."}, status=400
                )

            vaga.vagas_ocupadas += 1
            vaga.save(update_fields=["vagas_ocupadas", "updated_at"])

            agendamento = Agendamento.objects.create(
                cidadao=cidadao,
                unidade=vaga.unidade,
                servico=servico,
                vaga=vaga,
                situacao="AGENDADO",
            )

        transaction.on_commit(lambda:_send_agendamento_email(agendamento))

        return JsonResponse(
            {
                "ok": True,
                "agendamento_id": str(agendamento.id),
                "mensagem": f"Agendamento confirmado para {vaga.data} às {vaga.horario}.",
            }
        )


class AgendamentoAtivadoAusenteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()

    def post(self, request, agendamento_id, *args, **kwargs):
        user = request.user
        is_supervisor = (
                user
                and user.is_authenticated
                and user.groups.filter(name="Supervisor").exists()
            )
        is_atendente = (
                user
                and user.is_authenticated
                and user.groups.filter(name="Atendente").exists()
            )
        with transaction.atomic():
            try:
                agendamento = (
                    Agendamento.objects.select_for_update()
                    .get(pk=agendamento_id)
                )
            except Agendamento.DoesNotExist:
                return Response(
                    {"detail": "Agendamento não encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            
            if agendamento.situacao == "CHAMANDO" and is_atendente and not is_supervisor:
                atendente_atual_id = agendamento.atendente_id
                if atendente_atual_id and atendente_atual_id != user.id:
                    return Response(
                        {   
                            "success": False,
                            "result": "Agendamento já está sendo chamado por outro atendente.",
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

            if agendamento.situacao == "ATIVADO_AUSENTE":
                return Response(
                    {"detail": "Agendamento já está como ATIVADO_AUSENTE."},
                    status=status.HTTP_200_OK,
                )

            vaga = None
            if agendamento.vaga_id:
                try:
                    vaga = AgendaVaga.objects.select_for_update().get(
                        pk=agendamento.vaga_id
                    )
                except AgendaVaga.DoesNotExist:
                    vaga = None

            agendamento.situacao = "ATIVADO_AUSENTE"
            agendamento.save(update_fields=["situacao", "updated_at"])

            if vaga and vaga.vagas_ocupadas > 0:
                vaga.vagas_ocupadas -= 1
                vaga.save(update_fields=["vagas_ocupadas", "updated_at"])

        mensagem = "Agendamento marcado como ATIVADO_AUSENTE."
        if vaga:
            mensagem += " Vaga liberada."

        return Response({"detail": mensagem}, status=status.HTTP_200_OK)


class AgendamentoCanceladoCrasAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()

    def post(self, request, agendamento_id, *args, **kwargs):
        try:
            agendamento = cancelar_agendamento(agendamento_id)
            return Response({"detail": agendamento}, status=status.HTTP_200_OK)
        except NotFound as error:
            return Response(
                    {"detail": str(error)},
                    status=status.HTTP_404_NOT_FOUND,
                )
        except ValidationError as error:
            return Response(
                    {"detail": str(error)},
                    status=status.HTTP_200_OK,
                )
        except Exception as error:
            return Response(
                    {"detail": "Erro interno ao processar o cancelamento."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        # with transaction.atomic():
        #     try:
        #         agendamento = (
        #             Agendamento.objects.select_for_update()
        #             .get(pk=agendamento_id)
        #         )
        #     except Agendamento.DoesNotExist:
        #         return Response(
        #             {"detail": "Agendamento não encontrado."},
        #             status=status.HTTP_404_NOT_FOUND,
        #         )

        #     if agendamento.situacao == "CANCELADO_CRAS":
        #         return Response(
        #             {"detail": "Agendamento ja esta como CANCELADO_CRAS."},
        #             status=status.HTTP_200_OK,
        #         )

        #     vaga = None
        #     if agendamento.vaga_id:
        #         try:
        #             vaga = AgendaVaga.objects.select_for_update().get(
        #                 pk=agendamento.vaga_id
        #             )
        #         except AgendaVaga.DoesNotExist:
        #             vaga = None

        #     liberar_vaga = vaga and agendamento.situacao not in (
        #         "CANCELADO_CRAS",
        #         "CANCELADO_CIDADAO",
        #     )
        #     agendamento.situacao = "CANCELADO_CRAS"
        #     agendamento.save(update_fields=["situacao", "updated_at"])

        #     #libera vaga no banco
        #     if liberar_vaga and vaga.vagas_ocupadas > 0:
        #         vaga.vagas_ocupadas -= 1
        #         vaga.save(update_fields=["vagas_ocupadas", "updated_at"])

        # mensagem = "Agendamento marcado como CANCELADO_CRAS."
        # if liberar_vaga:
        #     mensagem += " Vaga liberada."

        # return Response({"detail": mensagem}, status=status.HTTP_200_OK)


class AgendaVagaListView(generics.ListAPIView):
    queryset = AgendaVaga.objects.all()
    serializer_class = AgendaVagaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AgendaVagaFilter

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), DjangoModelPermissionsWithView()]

    def get_queryset(self):
        queryset = super().get_queryset().select_related("unidade", "tipo_servico")
        queryset = queryset.order_by("horario")
        agora = timezone.localtime()
        hoje = agora.date()
        hora_atual = agora.time()
        return queryset.filter(
            Q(data__gt=hoje) | Q(data=hoje, horario__gt=hora_atual)
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        if not response.data:
            return Response(
                {
                    "success": True,
                    "mensagem": "Nenhuma vaga encontrada para os filtros fornecidos.",
                    "result": [],
                }
            )

        return Response(
            {"success": True, "mensagem": "Vagas encontradas.", "result": response.data}
        )


class AgendamentoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()
    serializer_class = AgendamentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AgendamentoFilter
    pagination_class = LimitOffsetPagination

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AgendamentoDetailSerializer
        return AgendamentoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset()).select_related("cidadao", "servico", "unidade", "vaga")
        user = request.user
        is_atendente = (
            user
            and user.is_authenticated
            and user.groups.filter(name="Atendente").exists()
        )
        if is_atendente:
            tipos_ids = user.tipo_ofertados.values_list("id", flat=True)
            queryset = queryset.filter(servico__tipo_servico_id__in=tipos_ids)

        queryset = queryset.order_by("-data", "horario")
        # # filtro unidade
        # user = request.user
        # escala = user.escalas.first()
        # cpf = request.query_params.get("cpf")
        # nome = request.query_params.get("nome")

        # if escala and not cpf and not nome:
        #     queryset = queryset.filter(unidade=escala.unidade)
        #     print(escala.unidade)
        # # para desativar o filtro acima de unidade, comentar ou excluir

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response(
                {
                    "success": True,
                    "count": paginator.count,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                    "result": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as exc:
            if isinstance(exc, serializers.ValidationError):
                detail = exc.detail
                message = detail
                if isinstance(detail, dict):
                    first_key = next(iter(detail.keys()), None)
                    if first_key is not None:
                        value = detail[first_key]
                        if isinstance(value, (list, tuple)) and value:
                            message = value[0]
                        else:
                            message = value
                return Response(
                    {"success": False, "result": message},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            raise
        vaga = serializer.validated_data.get("vaga")
        servico = serializer.validated_data.get("servico")
        cidadao = serializer.validated_data.get("cidadao")
        origem = serializer.validated_data.get("origem")
        situacao = serializer.validated_data.get("situacao") or "AGENDADO"
        is_fila = origem == "FILA"

        # Para origem FILA, permite criar sem vaga (usa data/hora atuais).
        if is_fila and not vaga:
            agora = timezone.localtime()
            agendamento = Agendamento.objects.create(
                cidadao=cidadao,
                servico=servico,
                unidade=serializer.validated_data.get("unidade"),
                vaga=None,
                data=agora.date(),
                horario=agora.time(),
                situacao=situacao,
                origem=origem,
            )
            _send_agendamento_email(agendamento)
            return Response(
                {
                    "success": True,
                    "result": AgendamentoDetailSerializer(agendamento).data,
                },
                status=status.HTTP_201_CREATED,
            )

        if not vaga:
            return Response(
                {
                    "success": False,
                    "result": "Vaga é obrigatória para criar agendamento.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Impede duplicidade de agendamento ativo para o mesmo cidadão/tipo de serviço.
        if Agendamento.possui_ativo_por_tipo(
            cidadao=cidadao,
            tipo_servico=servico.tipo_servico,
        ):
            return Response(
                {
                    "success": False,
                    "result": "Já existe um agendamento ativo deste tipo para você.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            try:
                vaga_locked = AgendaVaga.objects.select_for_update().get(pk=vaga.pk)
            except AgendaVaga.DoesNotExist:
                return Response(
                    {"success": False, "result": "Vaga não encontrada."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if vaga_locked.vagas_ocupadas >= vaga_locked.vagas:
                return Response(
                    {"success": False, "result": "Vaga já preenchida."},
                    status=status.HTTP_409_CONFLICT,
                )

            if servico.tipo_servico_id != vaga_locked.tipo_servico_id:
                return Response(
                    {
                        "success": False,
                        "result": "Serviço não pertence a este tipo de vaga.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            

            # initial_ocupadas = vaga_locked.vagas_ocupadas

            try:
                # Garante unidade, data e horário alinhados com a vaga bloqueada
                agendamento = serializer.save(
                    vaga=vaga_locked,
                    unidade=vaga_locked.unidade,
                    data=vaga_locked.data,
                    horario=vaga_locked.horario,
                    situacao=situacao,
                    origem=origem,
                )
            except IntegrityError:
                return Response({
                    "success": False,
                    "result": "Já existe um agendamento ativo para este serviço e cidadão."
                }, status=status.HTTP_409_CONFLICT)

            # Se o modelo não incrementou, garante o incremento aqui
            # vaga_locked.refresh_from_db(fields=["vagas_ocupadas"])
            # if vaga_locked.vagas_ocupadas == initial_ocupadas:
            #     AgendaVaga.objects.filter(pk=vaga_locked.pk).update(
            #         vagas_ocupadas=F("vagas_ocupadas") + 1
            #     )
            #     vaga_locked.refresh_from_db(fields=["vagas_ocupadas"])

        transaction.on_commit(lambda: _send_agendamento_email(agendamento))

        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AgendamentoSSOCreateView(generics.GenericAPIView):
    authentication_classes = [SSOAuthentication]
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_class = AgendamentoFilter

    def get(self, request, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        cpf = identidade.get("cpf")
        email = identidade.get("email")
        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cidadao = None
        if cpf:
            cidadao = Cidadao.objects.filter(cpf=cpf).first()
        if not cidadao and email:
            cidadao = Cidadao.objects.filter(email=email).first()

        if not cidadao:
            return Response({"success": True, "result": []})

        qs = self.filter_queryset(
            Agendamento.objects.filter(cidadao=cidadao)
        ).order_by("-created_at")

        page_param = request.query_params.get("page")
        page_size_param = request.query_params.get("page_size")
        if page_param is not None or page_size_param is not None:
            try:
                page = int(page_param or 1)
            except (TypeError, ValueError):
                page = 1
            try:
                page_size = int(page_size_param or 10)
            except (TypeError, ValueError):
                page_size = 10

            page = max(page, 1)
            page_size = max(1, min(page_size, 50))
            total = qs.count()
            start = (page - 1) * page_size
            end = start + page_size
            paged_qs = qs[start:end]

            serializer = AgendamentoDetailSerializer(
                paged_qs, many=True, context={"request": request}
            )
            return Response(
                {
                    "success": True,
                    "result": {
                        "items": serializer.data,
                        "total": total,
                        "page": page,
                        "page_size": page_size,
                        "has_next": end < total,
                    },
                }
            )

        serializer = AgendamentoDetailSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "result": serializer.data})

    def post(self, request, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        identidade = dict(identidade)
        identidade.setdefault("origem", "SITE")
        # Evita validação de null em campos de endereço não anuláveis no Cidadao.
        for field in ("logradouro", "numero", "cep", "complemento"):
            if identidade.get(field) is None:
                identidade.pop(field, None)
        cpf = identidade.get("cpf")
        email = identidade.get("email")
        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cidadao = None
        if cpf:
            cidadao = Cidadao.objects.filter(cpf=cpf).first()
        if not cidadao and email:
            cidadao = Cidadao.objects.filter(email=email).first()

        if cidadao:
            cid_serializer = CidadaoSerializer(
                cidadao, data=identidade, partial=True
            )
            cid_serializer.is_valid(raise_exception=True)
            cid_serializer.save()
        else:
            cid_serializer = CidadaoSerializer(data=identidade)
            cid_serializer.is_valid(raise_exception=True)
            cidadao = cid_serializer.save()

        data = request.data.copy()
        data["cidadao"] = str(cidadao.id)
        data["origem"] = "SITE"
        if not data.get("situacao"):
            data["situacao"] = "AGENDADO"

        serializer = AgendamentoSerializer(data=data, context={"request": request})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as exc:
            if isinstance(exc, serializers.ValidationError):
                detail = exc.detail
                message = detail
                if isinstance(detail, dict):
                    first_key = next(iter(detail.keys()), None)
                    if first_key is not None:
                        value = detail[first_key]
                        if isinstance(value, (list, tuple)) and value:
                            message = value[0]
                        else:
                            message = value
                return Response(
                    {"success": False, "result": message},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            raise

        vaga = serializer.validated_data.get("vaga")
        servico = serializer.validated_data.get("servico")
        situacao = serializer.validated_data.get("situacao") or "AGENDADO"

        if not vaga:
            return Response(
                {
                    "success": False,
                    "result": "Vaga é obrigatória para criar agendamento.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Agendamento.possui_ativo_por_tipo(
            cidadao=cidadao,
            tipo_servico=servico.tipo_servico,
        ):
            return Response(
                {
                    "success": False,
                    "result": "Já existe um agendamento ativo deste tipo para você.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            try:
                vaga_locked = AgendaVaga.objects.select_for_update().get(pk=vaga.pk)
            except AgendaVaga.DoesNotExist:
                return Response(
                    {"success": False, "result": "Vaga não encontrada."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if vaga_locked.vagas_ocupadas >= vaga_locked.vagas:
                return Response(
                    {"success": False, "result": "Vaga já preenchida."},
                    status=status.HTTP_409_CONFLICT,
                )

            if servico.tipo_servico_id != vaga_locked.tipo_servico_id:
                return Response(
                    {
                        "success": False,
                        "result": "Serviço não pertence a este tipo de vaga.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            initial_ocupadas = vaga_locked.vagas_ocupadas
            agendamento = serializer.save(
                vaga=vaga_locked,
                unidade=vaga_locked.unidade,
                data=vaga_locked.data,
                horario=vaga_locked.horario,
                situacao=situacao,
                origem="SITE",
            )

            vaga_locked.refresh_from_db(fields=["vagas_ocupadas"])
            if vaga_locked.vagas_ocupadas == initial_ocupadas:
                AgendaVaga.objects.filter(pk=vaga_locked.pk).update(
                    vagas_ocupadas=F("vagas_ocupadas") + 1
                )
                vaga_locked.refresh_from_db(fields=["vagas_ocupadas"])

        _send_agendamento_email(agendamento)

        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AgendamentoSSORetrieveUpdateView(APIView):
    authentication_classes = [SSOAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, pk, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        cpf = identidade.get("cpf")
        email = identidade.get("email")
        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cidadao = None
        if cpf:
            cidadao = Cidadao.objects.filter(cpf=cpf).first()
        if not cidadao and email:
            cidadao = Cidadao.objects.filter(email=email).first()
        if not cidadao:
            return Response(
                {"success": False, "result": "Cidadão não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            agendamento = Agendamento.objects.get(pk=pk, cidadao=cidadao)
        except Agendamento.DoesNotExist:
            return Response(
                {"success": False, "result": "Agendamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AgendamentoDetailSerializer(
            agendamento, context={"request": request}
        )
        return Response({"success": True, "result": serializer.data})

    def patch(self, request, pk, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        cpf = identidade.get("cpf")
        email = identidade.get("email")
        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cidadao = None
        if cpf:
            cidadao = Cidadao.objects.filter(cpf=cpf).first()
        if not cidadao and email:
            cidadao = Cidadao.objects.filter(email=email).first()
        if not cidadao:
            return Response(
                {"success": False, "result": "Cidadão não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            agendamento = Agendamento.objects.get(pk=pk, cidadao=cidadao)
        except Agendamento.DoesNotExist:
            return Response(
                {"success": False, "result": "Agendamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data.copy()
        data["cidadao"] = str(cidadao.id)
        serializer = AgendamentoSerializer(
            agendamento, data=data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"success": True, "result": serializer.data})


class AgendamentoRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()
    serializer_class = AgendamentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AgendamentoFilter

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AgendamentoDetailSerializer
        return AgendamentoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Agendamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().handle_exception(exc)

    def retrieve(self, request, *args, **kwargs):

        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "result": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = request.method == "PATCH"
        instance = self.get_object()
        situacao_anterior = instance.situacao
        nova_situacao = request.data.get("situacao", instance.situacao)
        atendente_data = request.data.get("atendente")
        atendente_id_payload = request.data.get("atendente_id")
        if isinstance(atendente_data, dict):
            atendente_id = atendente_data.get("id")
        elif atendente_data:
            atendente_id = atendente_data
        elif atendente_id_payload:
            atendente_id = atendente_id_payload
        else:
            atendente_id = instance.atendente_id
        user = request.user
        is_supervisor = (
            user
            and user.is_authenticated
            and user.groups.filter(name__iexact="Supervisor").exists()
        )
        is_atendente = (
            user
            and user.is_authenticated
            and user.groups.filter(
                Q(name__iexact="Atendente")
                | Q(name__iexact="Atendente 156")
                | Q(name__iexact="Atendente do 156")
            ).exists()
        )
        atendente_atual_id = instance.atendente_id
        solicitante_id = str(user.id) if user and user.is_authenticated else ""
        atendente_atual_id_str = str(atendente_atual_id) if atendente_atual_id else ""
        atendente_payload_id = str(atendente_id) if atendente_id else ""

        if is_atendente and not is_supervisor:
            if (
                atendente_atual_id_str
                and atendente_atual_id_str != solicitante_id
                and (
                    instance.situacao in {"CHAMANDO", "ATENDIMENTO"}
                    or nova_situacao in {"CHAMANDO", "ATENDIMENTO", "FINALIZADO"}
                )
            ):
                return Response(
                    {
                        "success": False,
                        "result": "Agendamento já está em atendimento por outro atendente.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            if (
                instance.situacao == "CHAMANDO"
                and not atendente_atual_id_str
                and atendente_payload_id
                and atendente_payload_id != solicitante_id
            ):
                return Response(
                    {
                        "success": False,
                        "result": "Agendamento já está sendo chamado por outro atendente.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        if nova_situacao == "FINALIZADO" and is_atendente and not is_supervisor:
            if atendente_atual_id_str and atendente_atual_id_str != solicitante_id:
                return Response(
                    {
                        "success": False,
                        "result": "Somente o atendente do agendamento pode finalizar.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )
        if nova_situacao == "CHAMANDO" and instance.unidade_id:
            lock_key = f"agendamento_chamando_lock:{instance.unidade_id}"
            if not cache.add(lock_key, True, timeout=CHAMADA_INTERVALO_SEGUNDOS):
                return Response(
                    {
                        "success": False,
                        "result": f"Aguarde {CHAMADA_INTERVALO_SEGUNDOS} segundos para chamar o próximo.",
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        if (
            nova_situacao in {"CHAMANDO", "ATENDIMENTO"}
            and not atendente_id
            and is_atendente
        ):
            atendente_id = user.id

        if nova_situacao in {"CHAMANDO", "ATENDIMENTO"} and atendente_id:
            conflito = Agendamento.objects.filter(
                atendente_id=atendente_id,
                situacao__in=["CHAMANDO", "ATENDIMENTO"],
                data=instance.data,
            ).exclude(pk=instance.pk)
            if conflito.exists():
                return Response(
                    {
                        "success": False,
                        "result": "Atendente já possui agendamento em aberto para este dia.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            
        is_atendente_156 = (
        user
        and user.is_authenticated
        and user.groups.filter(
            Q(name__iexact="Atendente 156")
            | Q(name__iexact="Atendente do 156")
        ).exists()
    )
    
        if is_atendente_156 and "CANCELADO_CRAS" in nova_situacao:
            try:
                cancelar_agendamento(
                    agendamento_id=instance.id,
                    origem=nova_situacao,  
                    liberar_vaga=True
                )
                instance.refresh_from_db()
                serializer = self.get_serializer(instance)
                return Response(
                    {"success": True, "result": serializer.data},
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                return Response(
                    {"success": False, "result": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_update(serializer)
        except IntegrityError:
            return Response(
                {
                    "success": False,
                    "result": "Já existe um agendamento ativo para este serviço e cidadão.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        instance.refresh_from_db()
        if situacao_anterior != "CHAMANDO" and instance.situacao == "CHAMANDO":
            self._registrar_chamada_painel(instance)

        return Response({"success": True, "result": serializer.data})

    @staticmethod
    def _resolver_guiche_snapshot(agendamento):
        guiche_nome = None
        guiche_id = None
        atendente = agendamento.atendente

        if not atendente:
            return guiche_nome, guiche_id

        if getattr(atendente, "guiche_atual", None):
            guiche_nome = atendente.guiche_atual.nome
            guiche_id = str(atendente.guiche_atual_id)
        elif hasattr(atendente, "guiche"):
            guiche = getattr(atendente, "guiche")
            if guiche:
                guiche_nome = getattr(guiche, "nome", None) or str(guiche)
                guiche_id = str(getattr(guiche, "id", "") or "")

        return guiche_nome, guiche_id

    @classmethod
    def _registrar_chamada_painel(cls, agendamento):
        if not agendamento.unidade_id:
            return

        guiche_nome, guiche_id = cls._resolver_guiche_snapshot(agendamento)
        ChamadaPainel.objects.create(
            agendamento=agendamento,
            unidade_id=agendamento.unidade_id,
            cidadao_nome=(agendamento.cidadao.nome if agendamento.cidadao_id else ""),
            guiche_nome=guiche_nome,
            guiche_id=guiche_id,
        )


class UltimasChamadasPainelAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        unidade_id = request.query_params.get("unidade_id") or self._resolver_unidade(
            request
        )
        if not unidade_id:
            return Response(
                {
                    "success": False,
                    "detail": "Informe unidade_id ou defina guichê/unidade no perfil do usuário.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            limite = int(request.query_params.get("limite", 4))
        except (TypeError, ValueError):
            limite = 4
        limite = max(1, min(limite, 20))
        hoje = timezone.localdate()
        qs = (
            ChamadaPainel.objects.filter(
                unidade_id=unidade_id,
                chamado_em__date=hoje,
            )
            .select_related("unidade")
            .order_by("-chamado_em", "-created_at")[:limite]
        )

        resultados = []
        for chamada in qs:
            hora = (
                timezone.localtime(chamada.chamado_em).strftime("%H:%M")
                if chamada.chamado_em
                else None
            )
            resultados.append(
                {
                    "id": str(chamada.agendamento_id),
                    "cidadao": chamada.cidadao_nome or None,
                    "unidade": chamada.unidade.nome if chamada.unidade_id else None,
                    "situacao": "CHAMANDO",
                    "guiche": chamada.guiche_nome,
                    "guiche_id": chamada.guiche_id,
                    "local": chamada.guiche_nome,
                    "horario_chamada": hora,
                }
            )

        return Response({"success": True, "result": resultados})

    @staticmethod
    def _resolver_unidade(request):
        usuario = request.user
        if not usuario.is_authenticated:
            return None
            

        # Prioriza a unidade do guichê atual, se houver
        if getattr(usuario, "guiche_atual", None) and usuario.guiche_atual.unidade_id:
            return str(usuario.guiche_atual.unidade_id)

        unidades_ids = list(usuario.unidades_lotacao.values_list("id", flat=True))
        dia_semana_atual = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"][
            timezone.localdate().weekday()
        ]
        escalas_ativas = EscalaTrabalho.objects.select_related("unidade").filter(
            profissional=usuario, is_active=True
        )
        escala_ativa = next(
            (esc for esc in escalas_ativas if dia_semana_atual in esc.dias_semana),
            None,
        )
        return escala_ativa.unidade
        # print(escala_ativa.unidade, " unidade da escala")
        # print(escala_ativa, " escala ativa")
        # print(unidades_ids, " unidade")
        # print(len(unidades_ids), " teste")
        # if len(unidades_ids) == 1:
        #     print(str(unidades_ids[0]), " retorno")
        #     return str(unidades_ids[0])

        # return None

