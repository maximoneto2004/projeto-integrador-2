from django.shortcuts import render
from rest_framework import generics, status, permissions
from rest_framework.pagination import LimitOffsetPagination
from app.permissions import DjangoModelPermissionsWithView
from prontuario.models import (
    CondicoesDeSaude,
    BeneficiosEventuais,
    BeneficiosServicos,
    ConvivenviaFortalecimento,
    CondicaoEducacional,
    CondicaoEducacionalMembro,
    DescumprimentoCondicionalidadesBolsa,
    DescumprimentoEducacional,
    ExclusaoMembroComposicao,
    Prontuario,
    PessoaReferencia,
    MembroComposicao,
    CondicaoHabitacional,
    AbastecimentoAgua,
    Parentesco,
    Unidade,
    BeneficioSocial,
    SaudeCuidadosMembro,
    TrabalhoRendimentoMembro,
    TransferenciaRenda,
    TrabalhoRendimento,
    ConvivenciaFamiliar,
    AcompanhamentoCreas,
    SituacaoViolencia,
    AcolhimentoFamiliar,
    AcolhimentoInstitucional,
    AnotacaoPlanejamento,
    NovoIngresso,
    RegistroDesligamento,
    EvolucaoAcompanhamento,
    AvaliacaoAcompanhamentoFamiliar,
    MedidaSocioEducativaMembro,
    AcompanhamentoLAPSC,
    MedidaSocioEducativa,
    Receita,
)
from prontuario.serializers import (
    CondicoesDeSaudeSerializer,
    BeneficiosEventuaisSerializer,
    BeneficiosServicosSerializer,
    ConvivenviaFortalecimentoSerializer,
    CondicaoEducacionalSerializer,
    CondicaoEducacionalMembroSerializer,
    DescumprimentoCondicionalidadesBolsaSerializer,
    DescumprimentoEducacionalSerializer,
    ExclusaoMembroComposicaoSerializer,
    ProntuarioSerializer,
    PessoaReferenciaSerializer,
    MembroComposicaoSerializer,
    CondicaoHabitacionalSerializer,
    AbastecimentoAguaSerializer,
    ParentescoSerializer,
    UnidadeSerializer,
    BeneficioSocialSerializer,
    SaudeCuidadosMembroSerializer,
    TrabalhoRendimentoMembroSerializer,
    TransferenciaRendaSerializer,
    TrabalhoRendimentoSerializer,
    ConvivenciaFamiliarSerializer,
    AcompanhamentoCreasSerializer,
    SituacaoViolenciaSerializer,
    AcolhimentoFamiliarSerializer,
    AcolhimentoInstitucionalSerializer,
    AnotacaoPlanejamentoSerializer,
    NovoIngressoSerializer,
    RegistroDesligamentoSerializer,
    EvolucaoAcompanhamentoSerializer,
    AvaliacaoAcompanhamentoFamiliarSerializer,
    MedidaSocioEducativaMembroSerializer,
    AcompanhamentoLAPSCSerializer,
    MedidaSocioEducativaSerializer,
    ReceitaSerializer,
)
from rest_framework.response import Response
from django.http import Http404
from prontuario.filters import (
    CondicoesDeSaudeFilter,
    ReceitaFilter,
    BeneficiosEventuaisFilter,
    BeneficiosServicosFilter,
    CondicaoEducacionalFilter,
    CondicaoEducacionalMembroFilter,
    ConvivenviaFortalecimentoFilter,
    PessoaReferenciaFilter,
    MembroComposicaoFilter,
    CondicaoHabitacionalFilter,
    DescumprimentoCondicionalidadesBolsaFilter,
    ProntuarioFilter,
    SaudeCuidadosMembroFilter,
    TrabalhoRendimentoMembroFilter,
    TransferenciaRendaFilter,
    TrabalhoRendimentoFilter,
    ConvivenciaFamiliarFilter,
    AcompanhamentoCreasFilter,
    SituacaoViolenciaFilter,
    AcolhimentoFamiliarFilter,
    AcolhimentoInstitucionalFilter,
    AnotacaoPlanejamentoFilter,
    NovoIngressoFilter,
    RegistroDesligamentoFilter,
    EvolucaoAcompanhamentoFilter,
    AvaliacaoAcompanhamentoFamiliarFilter,
    MedidaSocioEducativaMembroFilter,
    AcompanhamentoLAPSCFilter,
    MedidaSocioEducativaFilter,
)
from django_filters.rest_framework import DjangoFilterBackend


class PessoaReferenciaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = PessoaReferencia.objects.all()
    serializer_class = PessoaReferenciaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = PessoaReferenciaFilter

    def get_serializer_class(self):
        return PessoaReferenciaSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhuma Pessoa Referência encontrada."},
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class ProntuarioListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Prontuario.objects.all()
    serializer_class = ProntuarioSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ProntuarioFilter
    pagination_class = LimitOffsetPagination

    def get_serializer_class(self):
        return ProntuarioSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response(
                {
                    "success": bool(serializer.data),
                    "count": paginator.count,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                    "result": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhum Prontuário encontrado."},
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class ProntuarioRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Prontuario.objects.all()
    serializer_class = ProntuarioSerializer

    def get_serializer_class(self):
        return ProntuarioSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Prontuário não encontrado."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Prontuário removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class PessoaReferenciaRetrieveUpdatedDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    filter_backends = [DjangoFilterBackend]
    filterset_class = PessoaReferenciaFilter
    queryset = PessoaReferencia.objects.all()
    serializer_class = PessoaReferenciaSerializer

    def get_serializer_class(self):
        return PessoaReferenciaSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Pessoa Referência não encontrada."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Pessoa referência removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class MembroComposicaoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = MembroComposicao.objects.select_related("cidadao").filter(
        is_active=True
    )
    serializer_class = MembroComposicaoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = MembroComposicaoFilter

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhum membro encontrado."},
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class MembroComposicaoParentescoOpcoesView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = MembroComposicao.objects.none()

    def get(self, request, *args, **kwargs):
        field = MembroComposicao._meta.get_field("parentesco")
        opcoes = [
            {"value": value, "label": label}
            for value, label in getattr(field, "choices", []) or []
        ]

        if opcoes == []:
            return Response(
                {"success": False, "result": "Nenhuma opção de parentesco encontrada."}
            )

        return Response({"success": True, "result": opcoes})


class ConvivenviaFortalecimentoUnidadeRealizacaoOpcoesView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ConvivenviaFortalecimento.objects.none()

    def get(self, request, *args, **kwargs):
        field = ConvivenviaFortalecimento._meta.get_field("unidade_realizacao")
        opcoes = [
            {"value": value, "label": label}
            for value, label in getattr(field, "choices", []) or []
        ]

        if opcoes == []:
            return Response(
                {"success": False, "result": "Nenhuma opção de unidade de realização encontrada."}
            )

        return Response({"success": True, "result": opcoes})


class MembroComposicaoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = MembroComposicao.objects.select_related("cidadao").filter(
        is_active=True
    )
    serializer_class = MembroComposicaoSerializer

    def get_serializer_class(self):
        return MembroComposicaoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Membro não encontrado."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Membro removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class CondicaoHabitacionalListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CondicaoHabitacional.objects.all()
    serializer_class = CondicaoHabitacionalSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = CondicaoHabitacionalFilter

    def get_serializer_class(self):
        return CondicaoHabitacionalSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhuma condição encontrada."},
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class CondicaoHabitacionalRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CondicaoHabitacional.objects.all()
    serializer_class = CondicaoHabitacionalSerializer

    def get_serializer_class(self):
        return CondicaoHabitacionalSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Condição não encontrada."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Condição removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class AbastecimentoAguaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AbastecimentoAgua.objects.all()
    serializer_class = AbastecimentoAguaSerializer

    def get_serializer_class(self):
        return AbastecimentoAguaSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum abastecimento de água encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AbastecimentoAguaRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AbastecimentoAgua.objects.all()
    serializer_class = AbastecimentoAguaSerializer

    def get_serializer_class(self):
        return AbastecimentoAguaSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Abastecimento de água não encontrado."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Abastecimento de água removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )

class UnidadeListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Unidade.objects.all()
    serializer_class = UnidadeSerializer
    pagination_class = LimitOffsetPagination

    def get_serializer_class(self):
        return UnidadeSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(unidade__icontains=search)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response(
                {
                    "success": bool(serializer.data),
                    "count": paginator.count,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                    "result": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhuma Unidade encontrada."},
            )

        return Response({"success": True, "result": serializer.data})
    
class UnidadeRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Unidade.objects.all()
    serializer_class = UnidadeSerializer

    def get_serializer_class(self):
        return UnidadeSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Unidade não encontrada."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Unidade removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )
    
class BeneficioSocialListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = BeneficioSocial.objects.all()
    serializer_class = BeneficioSocialSerializer
    pagination_class = LimitOffsetPagination

    def get_serializer_class(self):
        return BeneficioSocialSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(nome__icontains=search)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response(
                {
                    "success": bool(serializer.data),
                    "count": paginator.count,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                    "result": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhum Benefício Social encontrado."},
            )

        return Response({"success": True, "result": serializer.data})
    
class BeneficioSocialRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = BeneficioSocial.objects.all()
    serializer_class = BeneficioSocialSerializer

    def get_serializer_class(self):
        return BeneficioSocialSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Benefício Social não encontrado."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Benefício Social removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )
    
class CondicaoEducacionalListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CondicaoEducacional.objects.all()
    serializer_class = CondicaoEducacionalSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = CondicaoEducacionalFilter

    def get_serializer_class(self):
        return CondicaoEducacionalSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhuma Condição Educacional encontrada."},
            )

        return Response({"success": True, "result": serializer.data})
    
class CondicaoEducacionalRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CondicaoEducacional.objects.all()
    serializer_class = CondicaoEducacionalSerializer

    def get_serializer_class(self):
        return CondicaoEducacionalSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Condição Educacional não encontrada."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Condição Educacional removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class ParentescoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Parentesco.objects.all()
    serializer_class = ParentescoSerializer

    def get_serializer_class(self):
        return ParentescoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhum Parentesco encontrado."},
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class ParentescoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Parentesco.objects.all()
    serializer_class = ParentescoSerializer

    def get_serializer_class(self):
        return ParentescoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Parentesco não encontrado."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Parentesco removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class ExclusaoMembroComposicaoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ExclusaoMembroComposicao.objects.all()
    serializer_class = ExclusaoMembroComposicaoSerializer

    def get_serializer_class(self):
        return ExclusaoMembroComposicaoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhuma exclusão de membro encontrada."},
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class ExclusaoMembroComposicaoRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ExclusaoMembroComposicao.objects.all()
    serializer_class = ExclusaoMembroComposicaoSerializer

    def get_serializer_class(self):
        return ExclusaoMembroComposicaoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Exclusão de membro não encontrada."},
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Exclusão de membro removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )

class CondicaoEducacionalMembroListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CondicaoEducacionalMembro.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True)
    serializer_class = CondicaoEducacionalMembroSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = CondicaoEducacionalMembroFilter

    def get_serializer_class(self):
        return CondicaoEducacionalMembroSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Condição Educacional do Membro encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class CondicaoEducacionalMembroRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CondicaoEducacionalMembro.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True)
    serializer_class = CondicaoEducacionalMembroSerializer

    def get_serializer_class(self):
        return CondicaoEducacionalMembroSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Condição Educacional do Membro não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Condição Educacional do Membro removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )

class DescumprimentoEducacionalListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = DescumprimentoEducacional.objects.select_related(
        "prontuario", "membro"
    ).all()
    serializer_class = DescumprimentoEducacionalSerializer

    def get_serializer_class(self):
        return DescumprimentoEducacionalSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Descumprimento Educacional encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class DescumprimentoEducacionalRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = DescumprimentoEducacional.objects.select_related(
        "prontuario", "membro"
    ).all()
    serializer_class = DescumprimentoEducacionalSerializer

    def get_serializer_class(self):
        return DescumprimentoEducacionalSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Descumprimento Educacional não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Descumprimento Educacional removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class DescumprimentoCondicionalidadesBolsaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = DescumprimentoCondicionalidadesBolsa.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True, membro__is_active=True)
    serializer_class = DescumprimentoCondicionalidadesBolsaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = DescumprimentoCondicionalidadesBolsaFilter

    def get_serializer_class(self):
        return DescumprimentoCondicionalidadesBolsaSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Descumprimento de Condicionalidades encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class DescumprimentoCondicionalidadesBolsaRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = DescumprimentoCondicionalidadesBolsa.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True, membro__is_active=True)
    serializer_class = DescumprimentoCondicionalidadesBolsaSerializer

    def get_serializer_class(self):
        return DescumprimentoCondicionalidadesBolsaSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Descumprimento de Condicionalidades não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Descumprimento de Condicionalidades removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class TrabalhoRendimentoMembroListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = TrabalhoRendimentoMembro.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True)
    serializer_class = TrabalhoRendimentoMembroSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TrabalhoRendimentoMembroFilter

    def get_serializer_class(self):
        return TrabalhoRendimentoMembroSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Trabalho e Rendimento do Membro encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class TrabalhoRendimentoMembroRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = TrabalhoRendimentoMembro.objects.select_related(
        "prontuario"
    ).filter(is_active=True)
    serializer_class = TrabalhoRendimentoMembroSerializer

    def get_serializer_class(self):
        return TrabalhoRendimentoMembroSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Trabalho e Rendimento do Membro não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Trabalho e Rendimento do Membro removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class SaudeCuidadosMembroListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = SaudeCuidadosMembro.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True)
    serializer_class = SaudeCuidadosMembroSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = SaudeCuidadosMembroFilter

    def get_serializer_class(self):
        return SaudeCuidadosMembroSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Condição de Saúde do Membro encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class SaudeCuidadosMembroRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = SaudeCuidadosMembro.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True)
    serializer_class = SaudeCuidadosMembroSerializer

    def get_serializer_class(self):
        return SaudeCuidadosMembroSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Condição de Saúde do Membro não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Condição de Saúde do Membro removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class CondicoesDeSaudeListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CondicoesDeSaude.objects.prefetch_related(
        "condicoes_saude_membro", "descumprimento_condicionalidade"
    ).select_related("prontuario").all()
    serializer_class = CondicoesDeSaudeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = CondicoesDeSaudeFilter

    def get_serializer_class(self):
        return CondicoesDeSaudeSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Condição de Saúde encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class CondicoesDeSaudeRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CondicoesDeSaude.objects.prefetch_related(
        "condicoes_saude_membro", "descumprimento_condicionalidade"
    ).select_related("prontuario").all()
    serializer_class = CondicoesDeSaudeSerializer

    def get_serializer_class(self):
        return CondicoesDeSaudeSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Condição de Saúde não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Condição de Saúde removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class BeneficiosEventuaisListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = BeneficiosEventuais.objects.select_related("prontuario").all()
    serializer_class = BeneficiosEventuaisSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = BeneficiosEventuaisFilter

    def get_serializer_class(self):
        return BeneficiosEventuaisSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Benefício Eventual encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class BeneficiosEventuaisRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = BeneficiosEventuais.objects.select_related("prontuario").all()
    serializer_class = BeneficiosEventuaisSerializer

    def get_serializer_class(self):
        return BeneficiosEventuaisSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Benefício Eventual não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Benefício Eventual removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class ConvivenviaFortalecimentoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ConvivenviaFortalecimento.objects.select_related(
        "prontuario", "membro"
    ).all()
    serializer_class = ConvivenviaFortalecimentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ConvivenviaFortalecimentoFilter

    def get_serializer_class(self):
        return ConvivenviaFortalecimentoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Convivência e Fortalecimento de Vínculo encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class ConvivenviaFortalecimentoRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ConvivenviaFortalecimento.objects.select_related(
        "prontuario", "membro"
    ).all()
    serializer_class = ConvivenviaFortalecimentoSerializer

    def get_serializer_class(self):
        return ConvivenviaFortalecimentoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Convivência e Fortalecimento de Vínculo não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Convivência e Fortalecimento de Vínculo removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class BeneficiosServicosListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = BeneficiosServicos.objects.prefetch_related(
        "beneficios_eventuais", "convivencia_e_fortalecimento"
    ).select_related("prontuario").all()
    serializer_class = BeneficiosServicosSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = BeneficiosServicosFilter

    def get_serializer_class(self):
        return BeneficiosServicosSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Benefício e Serviço encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class BeneficiosServicosRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = BeneficiosServicos.objects.prefetch_related(
        "beneficios_eventuais", "convivencia_e_fortalecimento"
    ).select_related("prontuario").all()
    serializer_class = BeneficiosServicosSerializer

    def get_serializer_class(self):
        return BeneficiosServicosSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Benefício e Serviço não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Benefício e Serviço removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class TransferenciaRendaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = TransferenciaRenda.objects.prefetch_related("beneficio").select_related(
        "prontuario"
    ).all()
    serializer_class = TransferenciaRendaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TransferenciaRendaFilter

    def get_serializer_class(self):
        return TransferenciaRendaSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Transferência de Renda encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class TransferenciaRendaRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = TransferenciaRenda.objects.prefetch_related("beneficio").select_related(
        "prontuario"
    ).all()
    serializer_class = TransferenciaRendaSerializer

    def get_serializer_class(self):
        return TransferenciaRendaSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Transferência de Renda não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Transferência de Renda removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class TrabalhoRendimentoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = TrabalhoRendimento.objects.prefetch_related(
        "trabalho_rendimento_membro", "transferencia_renda_familia"
    ).select_related("prontuario").all()
    serializer_class = TrabalhoRendimentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TrabalhoRendimentoFilter

    def get_serializer_class(self):
        return TrabalhoRendimentoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Trabalho e Rendimento encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class TrabalhoRendimentoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = TrabalhoRendimento.objects.prefetch_related(
        "trabalho_rendimento_membro", "transferencia_renda_familia"
    ).select_related("prontuario").all()
    serializer_class = TrabalhoRendimentoSerializer

    def get_serializer_class(self):
        return TrabalhoRendimentoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Trabalho e Rendimento não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Trabalho e Rendimento removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class ConvivenciaFamiliarListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ConvivenciaFamiliar.objects.select_related("prontuario").all()
    serializer_class = ConvivenciaFamiliarSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ConvivenciaFamiliarFilter

    def get_serializer_class(self):
        return ConvivenciaFamiliarSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Convivência familiar e comunitária encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class ConvivenciaFamiliarRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ConvivenciaFamiliar.objects.select_related("prontuario").all()
    serializer_class = ConvivenciaFamiliarSerializer

    def get_serializer_class(self):
        return ConvivenciaFamiliarSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Convivência familiar e comunitária não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Convivência familiar e comunitária removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class AcompanhamentoCreasListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AcompanhamentoCreas.objects.select_related("prontuario").all()
    serializer_class = AcompanhamentoCreasSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AcompanhamentoCreasFilter

    def get_serializer_class(self):
        return AcompanhamentoCreasSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Acompanhamento Creas encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AcompanhamentoCreasRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AcompanhamentoCreas.objects.select_related("prontuario").all()
    serializer_class = AcompanhamentoCreasSerializer

    def get_serializer_class(self):
        return AcompanhamentoCreasSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Acompanhamento Creas não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Acompanhamento Creas removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class SituacaoViolenciaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = SituacaoViolencia.objects.prefetch_related(
        "acompanhamento_creas"
    ).select_related("prontuario").all()
    serializer_class = SituacaoViolenciaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = SituacaoViolenciaFilter

    def get_serializer_class(self):
        return SituacaoViolenciaSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Situação de violência encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class SituacaoViolenciaRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = SituacaoViolencia.objects.prefetch_related(
        "acompanhamento_creas"
    ).select_related("prontuario").all()
    serializer_class = SituacaoViolenciaSerializer

    def get_serializer_class(self):
        return SituacaoViolenciaSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Situação de violência não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Situação de violência removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class AcolhimentoFamiliarListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AcolhimentoFamiliar.objects.select_related(
        "prontuario", "membro"
    ).all()
    serializer_class = AcolhimentoFamiliarSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AcolhimentoFamiliarFilter

    def get_serializer_class(self):
        return AcolhimentoFamiliarSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Acolhimento Familiar encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AcolhimentoFamiliarRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AcolhimentoFamiliar.objects.select_related(
        "prontuario", "membro"
    ).all()
    serializer_class = AcolhimentoFamiliarSerializer

    def get_serializer_class(self):
        return AcolhimentoFamiliarSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Acolhimento Familiar não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Acolhimento Familiar removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class AcolhimentoInstitucionalListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AcolhimentoInstitucional.objects.select_related(
        "prontuario"
    ).all()
    serializer_class = AcolhimentoInstitucionalSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AcolhimentoInstitucionalFilter

    def get_serializer_class(self):
        return AcolhimentoInstitucionalSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Acolhimento Institucional encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AcolhimentoInstitucionalRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AcolhimentoInstitucional.objects.prefetch_related(
        "prontuario", "acolhimento_familiar"
    ).all()
    serializer_class = AcolhimentoInstitucionalSerializer

    def get_serializer_class(self):
        return AcolhimentoInstitucionalSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Acolhimento Institucional não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Acolhimento Institucional removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class AnotacaoPlanejamentoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AnotacaoPlanejamento.objects.select_related(
        "prontuario", "tecnico_responsavel"
    ).all()
    serializer_class = AnotacaoPlanejamentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AnotacaoPlanejamentoFilter

    def get_serializer_class(self):
        return AnotacaoPlanejamentoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Anotação de Planejamento encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AnotacaoPlanejamentoRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AnotacaoPlanejamento.objects.select_related(
        "prontuario", "tecnico_responsavel"
    ).all()
    serializer_class = AnotacaoPlanejamentoSerializer

    def get_serializer_class(self):
        return AnotacaoPlanejamentoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Anotação de Planejamento não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Anotação de Planejamento removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class NovoIngressoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = NovoIngresso.objects.select_related("prontuario").all()
    serializer_class = NovoIngressoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = NovoIngressoFilter

    def get_serializer_class(self):
        return NovoIngressoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Novo Ingresso encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class NovoIngressoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = NovoIngresso.objects.select_related("prontuario").all()
    serializer_class = NovoIngressoSerializer

    def get_serializer_class(self):
        return NovoIngressoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Novo Ingresso não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Novo Ingresso removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class RegistroDesligamentoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = RegistroDesligamento.objects.select_related("prontuario").all()
    serializer_class = RegistroDesligamentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = RegistroDesligamentoFilter

    def get_serializer_class(self):
        return RegistroDesligamentoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Registro de Desligamento encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class RegistroDesligamentoRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = RegistroDesligamento.objects.select_related("prontuario").all()
    serializer_class = RegistroDesligamentoSerializer

    def get_serializer_class(self):
        return RegistroDesligamentoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Registro de Desligamento não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Registro de Desligamento removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class EvolucaoAcompanhamentoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = EvolucaoAcompanhamento.objects.prefetch_related(
        "anotacao_acompanhamento", "novo_ingresso", "registros_desligamentos"
    ).select_related("prontuario").all()
    serializer_class = EvolucaoAcompanhamentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = EvolucaoAcompanhamentoFilter

    def get_serializer_class(self):
        return EvolucaoAcompanhamentoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Evolução do Acompanhamento encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class EvolucaoAcompanhamentoRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = EvolucaoAcompanhamento.objects.prefetch_related(
        "anotacao_acompanhamento", "novo_ingresso", "registros_desligamentos"
    ).select_related("prontuario").all()
    serializer_class = EvolucaoAcompanhamentoSerializer

    def get_serializer_class(self):
        return EvolucaoAcompanhamentoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Evolução do Acompanhamento não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Evolução do Acompanhamento removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class AvaliacaoAcompanhamentoFamiliarListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AvaliacaoAcompanhamentoFamiliar.objects.select_related("prontuario").all()
    serializer_class = AvaliacaoAcompanhamentoFamiliarSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AvaliacaoAcompanhamentoFamiliarFilter

    def get_serializer_class(self):
        return AvaliacaoAcompanhamentoFamiliarSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Avaliação do Acompanhamento Familiar encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AvaliacaoAcompanhamentoFamiliarRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AvaliacaoAcompanhamentoFamiliar.objects.select_related("prontuario").all()
    serializer_class = AvaliacaoAcompanhamentoFamiliarSerializer

    def get_serializer_class(self):
        return AvaliacaoAcompanhamentoFamiliarSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Avaliação do Acompanhamento Familiar não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Avaliação do Acompanhamento Familiar removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class MedidaSocioEducativaMembroListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = MedidaSocioEducativaMembro.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True)
    serializer_class = MedidaSocioEducativaMembroSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = MedidaSocioEducativaMembroFilter

    def get_serializer_class(self):
        return MedidaSocioEducativaMembroSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Medida Socioeducativa do Membro encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class MedidaSocioEducativaMembroRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = MedidaSocioEducativaMembro.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True)
    serializer_class = MedidaSocioEducativaMembroSerializer

    def get_serializer_class(self):
        return MedidaSocioEducativaMembroSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Medida Socioeducativa do Membro não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Medida Socioeducativa do Membro removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class AcompanhamentoLAPSCListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AcompanhamentoLAPSC.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True)
    serializer_class = AcompanhamentoLAPSCSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AcompanhamentoLAPSCFilter

    def get_serializer_class(self):
        return AcompanhamentoLAPSCSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhum Acompanhamento LA PSC encontrado.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class AcompanhamentoLAPSCRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = AcompanhamentoLAPSC.objects.select_related(
        "prontuario", "membro"
    ).filter(is_active=True)
    serializer_class = AcompanhamentoLAPSCSerializer

    def get_serializer_class(self):
        return AcompanhamentoLAPSCSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Acompanhamento LA PSC não encontrado.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Acompanhamento LA PSC removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class MedidaSocioEducativaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = MedidaSocioEducativa.objects.prefetch_related(
        "membro_socio_educativo"
    ).select_related("prontuario").all()
    serializer_class = MedidaSocioEducativaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = MedidaSocioEducativaFilter

    def get_serializer_class(self):
        return MedidaSocioEducativaSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {
                    "success": False,
                    "result": "Nenhuma Medida Socioeducativa encontrada.",
                },
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class MedidaSocioEducativaRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = MedidaSocioEducativa.objects.prefetch_related(
        "membro_socio_educativo",
        "acompanhamento_LAPSC_membro",
    ).select_related("prontuario").all()
    serializer_class = MedidaSocioEducativaSerializer

    def get_serializer_class(self):
        return MedidaSocioEducativaSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Medida Socioeducativa não encontrada.",
                },
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "Medida Socioeducativa removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class ReceitaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Receita.objects.select_related("cidadao", "profissional", "agendamento").prefetch_related("medicamentos")
    serializer_class = ReceitaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ReceitaFilter
    pagination_class = LimitOffsetPagination

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response(
                {
                    "success": bool(serializer.data),
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
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"success": True, "result": serializer.data}, status=status.HTTP_201_CREATED)


class ReceitaRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Receita.objects.select_related("cidadao", "profissional", "agendamento").prefetch_related("medicamentos")
    serializer_class = ReceitaSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Receita não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().handle_exception(exc)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"success": True, "result": "Receita removida com sucesso."}, status=status.HTTP_200_OK)

