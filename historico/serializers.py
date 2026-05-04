from django.contrib.admin.models import LogEntry
from rest_framework import serializers
import json

from app.static_data import HISTORICO_CHOICES, QUALIFICACAO_CHOICES


HISTORICO_MAP = dict(HISTORICO_CHOICES)
QUALIFICACAO_MAP = dict(QUALIFICACAO_CHOICES)


class LogEntrySerializer(serializers.ModelSerializer):
    action_time = serializers.DateTimeField(format="%d/%m/%Y", read_only=True)
    action_flag = serializers.SerializerMethodField()
    user_display = serializers.CharField(source="user.nome_completo", read_only=True)
    user_username = serializers.CharField(source="user.get_username", read_only=True)
    content_type_app_label = serializers.CharField(
        source="content_type.app_label", read_only=True
    )
    content_type_model = serializers.SerializerMethodField()
    change_message = serializers.SerializerMethodField()
    membro = serializers.SerializerMethodField()
    prontuario = serializers.SerializerMethodField()
    object_repr = serializers.SerializerMethodField()
    prontuario_step = serializers.SerializerMethodField()

    model_exclusao = {"exclusaomembrocomposicao"}
    grouped_steps = {
    "membrocomposicao": "Composição familiar",
    "exclusaomembrocomposicao": "Composição familiar",
    "condicaoeducacional": "Condições educacionais",
    "condicaoeducacionalmembro": "Condições educacionais",
    "descumprimentoeducacional": "Condições educacionais",
    "trabalhorendimento": "Trabalho e rendimento",
    "trabalhorendimentomembro": "Trabalho e rendimento",
    "transferenciarenda": "Trabalho e rendimento",
    "condicoesdesaude": "Condições de saúde",
    "saudecuidadosmembro": "Condições de saúde",
    "descumprimentocondicionalidadesbolsa": "Condições de saúde",
    "beneficiosservicos": "Benefícios e serviços",
    "beneficioseventuais": "Benefícios e serviços",
    "convivenviafortalecimento": "Benefícios e serviços",
    "evolucaoacompanhamento": "Evolução do acompanhamento",
    "anotacaoplanejamento": "Evolução do acompanhamento",
    "novoingresso": "Evolução do acompanhamento",
    "registrodesligamento": "Evolução do acompanhamento",
    "medidasocioeducativa": "Medidas socioeducativas",
    "medidasocioeducativamembro": "Medidas socioeducativas",
    "acompanhamentolapsc": "Medidas socioeducativas",
    "cidadao": "Cidadão",
    }

    substep_overrides = {
        "exclusaomembrocomposicao": "Histórico de Exclusão",
        "condicaoeducacionalmembro": "Situação Educacional por Membro",
        "descumprimentoeducacional": "Descumprimento de Condicionalidades (PBF)",
    }

    full_form_models = {
        "pessoareferencia",
        "avaliacaoacompanhamentofamiliar",
        "convivenciafamiliar",
        "condicaohabitacional",
    }

    def _is_semantic_delete(self, obj):
        model_name = obj.content_type.model if obj.content_type else ""
        return model_name in self.model_exclusao and obj.action_flag in (1, 3)

    def get_action_flag(self, obj):
        if self._is_semantic_delete(obj):
            return 3
        return obj.action_flag


    def get_content_type_model(self, obj):
        model_name = obj.content_type.model if obj.content_type else ""
        return HISTORICO_MAP.get(model_name, model_name)

    def _get_model_name(self, obj):
        return obj.content_type.model if obj.content_type else ""

    def _get_step_title(self, obj):
        model_name = self._get_model_name(obj)
        if model_name in self.substep_overrides:
            return self.substep_overrides[model_name]
        return self.get_content_type_model(obj)

    def get_prontuario_step(self, obj):
        model_name = self._get_model_name(obj)
        title = self._get_step_title(obj)
        if not title:
            return ""

        if model_name in self.full_form_models:
            return title

        group_label = self.grouped_steps.get(model_name)
        if not group_label or group_label.lower() == title.lower():
            return title

        return f"{group_label} - {title}"


    def _get_field_verbose_name(self, obj, field_name):
        model_class = obj.content_type.model_class() if obj.content_type else None
        if not model_class:
            return field_name

        try:
            model_field = model_class._meta.get_field(field_name)
        except Exception:
            return field_name

        return str(getattr(model_field, "verbose_name", field_name))


    def _get_choice_label(self, obj, field_name, value):
        if field_name == "qualificacao_profissional":
            if isinstance(value, list):
                return [QUALIFICACAO_MAP.get(item, item) for item in value]
            return QUALIFICACAO_MAP.get(value, value)

        model_class = obj.content_type.model_class() if obj.content_type else None
        if not model_class:
            return value

        try:
            model_field = model_class._meta.get_field(field_name)
        except Exception:
            return value

        choices = getattr(model_field, "flatchoices", None)
        if not choices:
            return value

        if value in (None, ""):
            return value

        choices_map = dict(choices)
        if value in choices_map:
            return choices_map[value]

        string_value = str(value)
        for choice_key, choice_label in choices:
            if str(choice_key) == string_value:
                return choice_label

        return value


    def get_change_message(self, obj):
        if not obj.change_message:
            return obj.change_message

        try:
            payload = json.loads(obj.change_message)
        except (TypeError, ValueError):
            return obj.change_message

        if not isinstance(payload, dict):
            return payload

        ignored_fields = {"tipo", "is_active", "ativo", "sequencial"}
        normalized = {}
        for field, values in payload.items():
            if field in ignored_fields:
                continue

            field_label = self._get_field_verbose_name(obj, field)
            if field_label in ignored_fields:
                continue
            if isinstance(values, dict) and "depois" in values:
                normalized[field_label] = self._get_choice_label(
                    obj, field, values["depois"]
                )
            else:
                normalized[field_label] = self._get_choice_label(obj, field, values)

        return normalized

    def _get_logged_object(self, obj):
        model_class = obj.content_type.model_class() if obj.content_type else None
        if not model_class:
            return None

        return model_class._default_manager.filter(pk=obj.object_id).first()

    def _get_membro_data(self, membro):
        if not membro:
            return None

        if not hasattr(membro, "pk"):
            return {
                "id": None,
                "nome": str(membro),
            }

        cidadao = getattr(membro, "cidadao", None)
        if cidadao:
            return {
                "id": str(membro.pk),
                "nome": getattr(cidadao, "nome", str(membro)),
            }

        membro_nested = getattr(membro, "membro", None)
        membro_nested_cidadao = (
            getattr(membro_nested, "cidadao", None) if membro_nested else None
        )
        if membro_nested and hasattr(membro_nested, "pk"):
            return {
                "id": str(membro_nested.pk),
                "nome": getattr(membro_nested_cidadao, "nome", str(membro_nested)),
            }

        return {
            "id": str(membro.pk),
            "nome": str(membro),
        }


    def get_membro(self, obj):
        instance = self._get_logged_object(obj)
        if not instance or not hasattr(instance, "membro"):
            return None

        return self._get_membro_data(getattr(instance, "membro", None))


    def get_prontuario(self, obj):
        instance = self._get_logged_object(obj)
        if not instance:
            return None

        if instance._meta.model_name == "prontuario":
            return getattr(instance, "numero", None)

        prontuario = getattr(instance, "prontuario", None)
        if prontuario:
            return getattr(prontuario, "numero", None)

        membro = getattr(instance, "membro", None)
        if membro and getattr(membro, "prontuario", None):
            return getattr(membro.prontuario, "numero", None)

        if instance._meta.model_name == "cidadao":
            from prontuario.models import MembroComposicao, PessoaReferencia

            pessoa_referencia = (
                PessoaReferencia.objects.select_related("prontuario")
                .filter(pessoa_referencia_id=instance.pk)
                .first()
            )
            if pessoa_referencia and pessoa_referencia.prontuario:
                return getattr(pessoa_referencia.prontuario, "numero", None)

            membro_composicao = (
                MembroComposicao.objects.select_related("prontuario")
                .filter(cidadao_id=instance.pk)
                .first()
            )
            if membro_composicao and membro_composicao.prontuario:
                return getattr(membro_composicao.prontuario, "numero", None)

        return None
    def get_object_repr(self, obj):
        step_label = (
            self.get_prontuario_step(obj)
            or self.get_content_type_model(obj)
            or "Registro de histórico"
        )
        model_name = self._get_model_name(obj)
        if model_name != "pessoareferencia":
            return step_label

        instance = self._get_logged_object(obj)
        pessoa = getattr(instance, "pessoa_referencia", None) if instance else None
        pessoa_nome = str(getattr(pessoa, "nome", "") or "").strip()
        if not pessoa_nome and instance:
            pessoa_nome = str(instance).strip()

        if pessoa_nome:
            return f"{step_label} - {pessoa_nome}"

        return step_label

    class Meta:
        model = LogEntry
        fields = [
            "action_time",
            "user_display",
            "user_username",
            "content_type_app_label",
            "content_type_model",
            "prontuario_step",
            "prontuario",
            "membro",
            "object_repr",
            "action_flag",
            "change_message",
        ]


