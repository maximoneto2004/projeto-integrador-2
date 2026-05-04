# serializers.py

import logging
import secrets
import string
from django.contrib.auth.models import Group
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_encode
from rest_framework import serializers
from avaliacao.models import Avaliacao
from unidade_cras.models import Guiche, UnidadeCras
from usuarios.models import Usuario, EscalaTrabalho
from servicos.serializers import TipoServicoSerializer
from utils.email import send_email_in_thread
from django.db.models import Avg


logger = logging.getLogger(__name__)
token_generator = PasswordResetTokenGenerator()


class GroupSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ("id", "name")


class UnidadeCrasSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadeCras
        fields = ("id", "nome")


class GuicheSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guiche
        fields = ("id", "nome")

class EscalaTrabalhoSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalaTrabalho
        fields = "__all__"
        read_only_fields = ("id",)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)

        data = {
            "profissional": attrs.get("profissional")
            or (instance.profissional if instance else None),
            "unidade": attrs.get("unidade") or (instance.unidade if instance else None),
            "dias_semana": attrs.get("dias_semana")
            if "dias_semana" in attrs
            else (instance.dias_semana if instance else []),
            "turno1_inicio": attrs.get("turno1_inicio")
            if "turno1_inicio" in attrs
            else (instance.turno1_inicio if instance else None),
            "turno1_fim": attrs.get("turno1_fim")
            if "turno1_fim" in attrs
            else (instance.turno1_fim if instance else None),
            "turno2_inicio": attrs.get("turno2_inicio")
            if "turno2_inicio" in attrs
            else (instance.turno2_inicio if instance else None),
            "turno2_fim": attrs.get("turno2_fim")
            if "turno2_fim" in attrs
            else (instance.turno2_fim if instance else None),
            "is_active": attrs.get("is_active")
            if "is_active" in attrs
            else (instance.is_active if instance else True),
        }

        temp = EscalaTrabalho(**data)
        if instance:
            temp.pk = instance.pk
            temp._state.adding = False
            temp._state.db = instance._state.db

        try:
            temp.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict or exc.messages)

        return attrs

    def validate_dias_semana(self, value):
        if not value:
            raise serializers.ValidationError("Informe ao menos um dia da semana.")
        return value


class UsuarioListDetailSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(),
        many=True,
        required=False,
    )
    escalaTrabalho = EscalaTrabalhoSimpleSerializer(many=True, read_only=True, source="escalas")

    class Meta:
        model = Usuario
        fields = (
            "is_active",
            "id",
            "email",
            "nome_completo",
            "cpf",
            "telefone",
            "groups",
            "unidades_lotacao",
            "tipo_ofertados",
            "escalaTrabalho",
            "guiche_atual",
        )

    def create(self, validated_data):
        email = validated_data["email"]
        groups = validated_data.pop("groups", [])
        unidades = validated_data.pop("unidades_lotacao", [])
        tipo_ofertados = validated_data.pop("tipo_ofertados", [])

        user = Usuario(
            **validated_data,
            username=email,
        )
        user.set_password(gerar_senha())
        user.save()
        if groups:
            user.groups.set(groups)
        if unidades:
            user.unidades_lotacao.set(unidades)
        if tipo_ofertados:
            user.tipo_ofertados.set(tipo_ofertados)

        _send_user_reset_email(user)
        return user

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["groups"] = GroupSimpleSerializer(instance.groups.all(), many=True).data
        guiche_atual = getattr(instance, "guiche_atual", None)
        data["guiche_atual"] = (
            GuicheSimpleSerializer(guiche_atual).data if guiche_atual else None
        )
        return data





class EscalaTrabalhoListDetailSerializer(serializers.ModelSerializer):
    profissional = UsuarioListDetailSerializer(read_only=True)
    unidade = UnidadeCrasSimpleSerializer(read_only=True)

    class Meta:
        model = EscalaTrabalho
        fields = (
            "id",
            "profissional",
            "unidade",
            "dias_semana",
            "turno1_inicio",
            "turno1_fim",
            "turno2_inicio",
            "turno2_fim",
        )
        read_only_fields = ("id",)


class GuicheSerializer(serializers.ModelSerializer):
    unidade = UnidadeCrasSimpleSerializer(read_only=True)
    ocupado = serializers.SerializerMethodField()

    class Meta:
        model = Guiche
        fields = ("id", "nome", "unidade", "ocupado")

    def get_ocupado(self, obj):
        guiches_ocupados = self.context.get("guiches_ocupados_set", set())
        return obj.id in guiches_ocupados


class GuicheUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guiche
        fields = ("id", "nome", "unidade", "is_active")
        read_only_fields = ("id",)


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ("id", "name")


class UsuarioSerializer(serializers.ModelSerializer):
    unidades = UnidadeCrasSimpleSerializer(
        many=True,
        read_only=True,
        source="unidades_lotacao",
    )
    groups = GroupSimpleSerializer(many=True, read_only=True)
    escalas_trabalho = EscalaTrabalhoSimpleSerializer(
        many=True,
        read_only=True,
        source="escalas",
    )
    tipos_servico = TipoServicoSerializer(
        many=True,
        read_only=True,
        source="tipo_ofertados",
    )

    class Meta:
        model = Usuario
        fields = (
            "id",
            "cpf",
            "nome_completo",
            "email",
            "first_name",
            "last_name",
            "telefone",
            "is_active",
            "groups",
            "guiche_atual",
            "unidades",
            "escalas_trabalho",
            "created_at",
            "tipos_servico",
            "is_active"
        )


def gerar_senha():
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(10))


def _send_user_reset_email(user):
    if not user or not user.email:
        return

    frontend_reset_url = getattr(settings, "FRONTEND_RESET_PASSWORD_URL", "")
    if not frontend_reset_url:
        return

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = token_generator.make_token(user)
    separator = "&" if "?" in frontend_reset_url else "?"
    reset_url = f"{frontend_reset_url}{separator}uid={uid}&token={token}"

    subject = "Redefinição de senha"
    context = {
        "cidadao_nome": getattr(user, "nome_completo", "") or getattr(user, "nome", ""),
        "link_redefinicao": reset_url
    }
    html = render_to_string("authentication/email_password_reset.html", context)
    message = strip_tags(html)
    try:
        send_email_in_thread(
            user.email,
            subject,
            message,
            html,
            getattr(settings, "DEFAULT_FROM_EMAIL", None),
        )
    except Exception:
        logger.exception("Falha ao enviar e-mail de redefinição para %s", user.email)

class SimplesUserSerializer(serializers.ModelSerializer):
    nota_media_atendente = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ["id", "nome_completo", "nota_media_atendente"]

    def get_nota_media_atendente(self, obj):
        media = (
            Avaliacao.objects
            .filter(agendamento__atendente=obj)
            .aggregate(media=Avg("nota"))["media"]
        )
        return round(float(media), 1) if media is not None else None