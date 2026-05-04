from django.contrib.admin.models import LogEntry
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions
from rest_framework.response import Response

from app.static_data import HISTORICO_CHOICES
from .filters import DjangoLogFilter
from .serializers import LogEntrySerializer


class DjangoLogListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LogEntrySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = DjangoLogFilter
    queryset = (
        LogEntry.objects.select_related("user", "content_type")
        .filter(content_type__app_label__in=["prontuario", "cidadaos"], action_flag__in=[1, 2, 3])
        .exclude(Q(content_type__model="prontuario") & Q(action_flag=1))
        .exclude(change_message__isnull=True)
        .exclude(change_message="")
        .exclude(change_message="[]")
        .exclude(change_message="{}")
        .order_by("-action_time")
    )
    historico_label_map = dict(HISTORICO_CHOICES)

    def _is_effectively_empty_change_message(self, value):
        if value in (None, "", {}, []):
            return True

        if value == [{"added": {}}]:
            return True

        return False

    def _build_filter_options_queryset(self, request):
        if not self.filterset_class:
            return self.get_queryset()

        # As opções de filtros devem considerar TODO o histórico do prontuário,
        # sem depender da página (dia) nem de outros filtros ativos.
        prontuario_id = request.query_params.get("prontuario_id")
        query_params = request.query_params.copy()
        query_params.clear()
        if prontuario_id:
            query_params["prontuario_id"] = prontuario_id

        filterset = self.filterset_class(
            data=query_params,
            queryset=self.get_queryset(),
            request=request,
        )
        if hasattr(filterset, "is_valid"):
            filterset.is_valid()
        return filterset.qs

    def _get_filter_options(self, queryset, prontuario_id=None):
        content_type_models = queryset.values_list("content_type__model", flat=True).distinct()
        secoes = sorted(
            {
                self.historico_label_map.get(model, model)
                for model in content_type_models
                if model
            }
        )

        profissionais_map = {}
        for user_obj in queryset.values("user__nome_completo", "user__username").distinct():
            nome = str(user_obj.get("user__nome_completo") or "").strip()
            username = str(user_obj.get("user__username") or "").strip()
            display = nome or username
            if not display:
                continue
            profissionais_map[display.lower()] = display
        profissionais = sorted(profissionais_map.values(), key=lambda item: item.lower())

        membros_map = {}

        # Fonte de verdade do filtro de membro:
        # apenas membros atuais do prontuário (ativos).
        if prontuario_id:
            try:
                from prontuario.models import MembroComposicao

                membros_prontuario = (
                    MembroComposicao.objects.select_related("cidadao")
                    .filter(prontuario_id=prontuario_id, is_active=True, ativo=True)
                    .values("id", "cidadao__nome")
                )
                for item in membros_prontuario:
                    membro_id = str(item.get("id") or "").strip()
                    membro_nome = str(item.get("cidadao__nome") or "").strip()
                    if membro_id and membro_nome and membro_id not in membros_map:
                        membros_map[membro_id] = membro_nome
            except Exception:
                # fallback silencioso: mantém lista vazia caso haja erro
                pass

        membros = [
            {"id": membro_id, "nome": nome}
            for membro_id, nome in sorted(membros_map.items(), key=lambda item: item[1].lower())
        ]

        return {
            "secoes": secoes,
            "profissionais": profissionais,
            "membros": membros,
        }

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        prontuario_id = (request.query_params.get("prontuario_id") or "").strip()
        filter_options_queryset = self._build_filter_options_queryset(request)
        filter_options = self._get_filter_options(
            filter_options_queryset, prontuario_id=prontuario_id
        )
        datas = list(queryset.dates("action_time", "day", order="DESC"))
        if not datas:
            return Response(
                {
                    "success": True,
                    "count": 0,
                    "next": None,
                    "previous": None,
                    "date": None,
                    "filters": filter_options,
                    "result": [],
                }
            )

        paginator = Paginator(datas, 1)
        page_number = request.query_params.get("page", 1)

        try:
            page_obj = paginator.page(page_number)
        except EmptyPage:
            return Response(
                {
                    "success": True,
                    "count": paginator.count,
                    "next": None,
                    "previous": None,
                    "date": None,
                    "filters": filter_options,
                    "result": [],
                }
            )

        data_referencia = page_obj.object_list[0]
        page_queryset = queryset.filter(action_time__date=data_referencia)
        serializer = self.get_serializer(page_queryset, many=True)
        result = [
            item
            for item in serializer.data
            if not self._is_effectively_empty_change_message(
                item.get("change_message")
            )
        ]

        return Response(
            {
                "success": True,
                "count": paginator.count,
                "next": page_obj.next_page_number() if page_obj.has_next() else None,
                "previous": page_obj.previous_page_number()
                if page_obj.has_previous()
                else None,
                "page": page_obj.number,
                "date": data_referencia.strftime("%Y-%m-%d"),
                "filters": filter_options,
                "result": result,
            }
        )
