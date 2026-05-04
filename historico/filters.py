import django_filters
from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q

from app.static_data import HISTORICO_CHOICES


class DjangoLogFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    content_type_model = django_filters.CharFilter(method="filter_content_type_model")
    prontuario_id = django_filters.CharFilter(method="filter_prontuario_id")
    membro = django_filters.CharFilter(method="filter_membro")
    user_display = django_filters.CharFilter(method="filter_user_display")
    data_inicial = django_filters.DateFilter(
        field_name="action_time", lookup_expr="date__gte"
    )
    data_final = django_filters.DateFilter(
        field_name="action_time", lookup_expr="date__lte"
    )

    class Meta:
        model = LogEntry
        fields = [
            "search",
            "content_type_model",
            "prontuario_id",
            "membro",
            "user_display",
            "data_inicial",
            "data_final",
        ]

    def _get_models_for_label(self, term):
        label_to_models = {}
        for model, label in HISTORICO_CHOICES:
            normalized_label = str(label or "").strip().lower()
            if not normalized_label:
                continue
            label_to_models.setdefault(normalized_label, []).append(model)
        return label_to_models.get(term, [])

    def filter_content_type_model(self, queryset, name, value):
        term = (value or "").strip().lower()
        if not term:
            return queryset

        model_values = self._get_models_for_label(term)
        if model_values:
            return queryset.filter(content_type__model__in=model_values)

        return queryset.filter(content_type__model__iexact=term)

    def _get_membro_conditions(self, queryset, membro_id=None, membro_nome=None):
        content_type_ids = queryset.values_list("content_type_id", flat=True).distinct()
        content_types = ContentType.objects.filter(id__in=content_type_ids)

        conditions = Q()
        has_match = False

        for content_type in content_types:
            model_class = content_type.model_class()
            if not model_class:
                continue

            model_name = model_class._meta.model_name
            field_names = {field.name for field in model_class._meta.get_fields()}
            membro_field = None
            if "membro" in field_names:
                try:
                    membro_field = model_class._meta.get_field("membro")
                except Exception:
                    membro_field = None
            membro_is_relation = bool(getattr(membro_field, "is_relation", False))

            object_ids = []
            if membro_id and model_name == "membrocomposicao":
                object_ids.extend(
                    str(pk)
                    for pk in model_class.objects.filter(pk=membro_id).values_list(
                        "pk", flat=True
                    )
                )
            elif membro_id and model_name == "acompanhamentolapsc":
                try:
                    object_ids.extend(
                        str(pk)
                        for pk in model_class.objects.filter(
                            membro__membro_id=membro_id
                        ).values_list("pk", flat=True)
                    )
                except Exception:
                    pass
            elif membro_id and "membro" in field_names and membro_is_relation:
                try:
                    object_ids.extend(
                        str(pk)
                        for pk in model_class.objects.filter(membro_id=membro_id).values_list(
                            "pk", flat=True
                        )
                    )
                except Exception:
                    pass

            if membro_nome and model_name == "membrocomposicao":
                object_ids.extend(
                    str(pk)
                    for pk in model_class.objects.filter(
                        cidadao__nome__icontains=membro_nome
                    ).values_list("pk", flat=True)
                )
            elif membro_nome and model_name == "acompanhamentolapsc":
                try:
                    object_ids.extend(
                        str(pk)
                        for pk in model_class.objects.filter(
                            membro__membro__cidadao__nome__icontains=membro_nome
                        ).values_list("pk", flat=True)
                    )
                except Exception:
                    pass
            elif membro_nome and "membro" in field_names and membro_is_relation:
                try:
                    object_ids.extend(
                        str(pk)
                        for pk in model_class.objects.filter(
                            membro__cidadao__nome__icontains=membro_nome
                        ).values_list("pk", flat=True)
                    )
                except Exception:
                    pass
            elif membro_nome and "membro" in field_names:
                try:
                    object_ids.extend(
                        str(pk)
                        for pk in model_class.objects.filter(
                            membro__icontains=membro_nome
                        ).values_list("pk", flat=True)
                    )
                except Exception:
                    pass

            unique_object_ids = list(set(object_ids))
            if unique_object_ids:
                has_match = True
                conditions |= Q(
                    content_type_id=content_type.id,
                    object_id__in=unique_object_ids,
                )

        return conditions, has_match

    def filter_prontuario_id(self, queryset, name, value):
        prontuario_id = (value or "").strip()
        if not prontuario_id:
            return queryset

        from cidadaos.models import Cidadao
        from prontuario.models import MembroComposicao, PessoaReferencia

        content_type_ids = (
            queryset.values_list("content_type_id", flat=True).distinct()
        )
        content_types = ContentType.objects.filter(id__in=content_type_ids)

        conditions = Q()
        has_match = False
        for content_type_id in content_types:
            model_class = content_type_id.model_class()
            if not model_class:
                continue

            model_name = model_class._meta.model_name
            field_names = {field.name for field in model_class._meta.get_fields()}

            if model_name == "prontuario":
                object_ids = [prontuario_id]
            elif model_name == "cidadao":
                pessoa_referencia_ids = PessoaReferencia.objects.filter(
                    prontuario_id=prontuario_id
                ).values_list("pessoa_referencia_id", flat=True)
                membro_ids = MembroComposicao.objects.filter(
                    prontuario_id=prontuario_id
                ).values_list("cidadao_id", flat=True)
                object_ids = [
                    str(pk)
                    for pk in Cidadao.objects.filter(
                        pk__in=set(pessoa_referencia_ids).union(set(membro_ids))
                    ).values_list("pk", flat=True)
                ]
            elif "prontuario" in field_names:
                object_ids = [
                    str(pk)
                    for pk in model_class.objects.filter(
                        prontuario_id=prontuario_id
                    ).values_list("pk", flat=True)
                ]
            else:
                continue

            if object_ids:
                has_match = True
                conditions |= Q(
                    content_type_id=content_type_id.id,
                    object_id__in=object_ids,
                )

        if not has_match:
            return queryset.none()

        return queryset.filter(conditions)

    def filter_membro(self, queryset, name, value):
        membro_id = (value or "").strip()
        if not membro_id:
            return queryset

        conditions, has_match = self._get_membro_conditions(
            queryset, membro_id=membro_id
        )

        if not has_match:
            return queryset.none()

        return queryset.filter(conditions)

    def filter_user_display(self, queryset, name, value):
        term = (value or "").strip()
        if not term:
            return queryset

        return queryset.filter(
            Q(user__nome_completo__icontains=term)
            | Q(user__first_name__icontains=term)
            | Q(user__last_name__icontains=term)
            | Q(user__username__icontains=term)
        )

    def filter_search(self, queryset, name, value):
        term = (value or "").strip()
        if not term:
            return queryset

        normalized_term = term.lower()
        model_values = self._get_models_for_label(normalized_term)

        search_q = (
            Q(user__nome_completo__icontains=term)
            | Q(user__first_name__icontains=term)
            | Q(user__last_name__icontains=term)
            | Q(user__username__icontains=term)
            | Q(content_type__model__icontains=normalized_term)
        )

        if model_values:
            search_q |= Q(content_type__model__in=model_values)
        else:
            search_q |= Q(content_type__model__iexact=normalized_term)

        if term.isdigit():
            membro_conditions, has_membro_match = self._get_membro_conditions(
                queryset, membro_id=term
            )
        else:
            membro_conditions, has_membro_match = self._get_membro_conditions(
                queryset, membro_nome=term
            )

        if has_membro_match:
            search_q |= membro_conditions

        return queryset.filter(search_q).distinct()
