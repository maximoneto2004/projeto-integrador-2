from django.shortcuts import render
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from usuarios.models import EscalaTrabalho, Usuario
from django.conf import settings
from rest_framework_simplejwt.views import TokenRefreshView

from utils.email import send_email_in_thread



secure_cookie = not settings.DEBUG  # True em produção
samesite_cookie = "None" if secure_cookie else "Lax"
token_generator = PasswordResetTokenGenerator()
default_email_backend = "django.core.mail.backends.smtp.EmailBackend"
User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        usuario = self.user

        dia_semana_atual = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"][
            timezone.localdate().weekday()
        ]
        escala_ativa = EscalaTrabalho.objects.select_related("unidade").filter(
            profissional=usuario,
            is_active=True,
            dias_semana__icontains=dia_semana_atual,
        ).first()


        grupos = list(usuario.groups.values_list("name", flat=True))
        if escala_ativa is None and not any(grupo in {"Gestor", "Coordenador", "coordenador", "administrador"} for grupo in grupos):
            raise AuthenticationFailed("Usuário sem escala ativa para hoje.")


        unidade = None
        if escala_ativa and escala_ativa.unidade:
            unidade = {"id": escala_ativa.unidade_id, "nome": escala_ativa.unidade.nome}
        else:
            primeira_unidade = usuario.unidades_lotacao.first()
            if primeira_unidade:
                unidade = {"id": primeira_unidade.id, "nome": primeira_unidade.nome}

        data["usuario"] = {
            "id": usuario.id,
            "nome": usuario.nome_completo,
            "email": usuario.email,
            "cpf": usuario.cpf,
            "grupos": grupos,
            "unidade_ativa": unidade,
        }

        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        refresh = response.data.get("refresh")
        access = response.data.get("access")
        usuario = response.data.get("usuario")

        if refresh is None:
            return Response({"detail": "Erro ao gerar refresh token"}, status=400)

        res = Response(
            {
                "access": access,
                "usuario": usuario,
            },
            status=status.HTTP_200_OK,
        )

        # ⬇ Cookie HttpOnly com refresh token
        res.set_cookie(
            key="refresh_token",
            value=refresh,
            httponly=True,
            secure=secure_cookie,
            samesite=samesite_cookie,
            max_age=60 * 60 * 24 * 7,
            path="/",
        )

        return res


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get("refresh_token")

        if refresh is None:
            return Response({"detail": "Refresh token não encontrado"}, status=400)

        request.data["refresh"] = refresh
        try:
            return super().post(request, *args, **kwargs)
        except User.DoesNotExist:
            res = Response({"detail": "Refresh token inválido."}, status=status.HTTP_401_UNAUTHORIZED)
            res.delete_cookie("refresh_token", path="/")
            return res


# class CustomTokenObtainPairView(TokenObtainPairView):
#     serializer_class = CustomTokenObtainPairSerializer



class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")

        if getattr(request.user, "guiche_atual", None):
            request.user.guiche_atual = None
            request.user.save(update_fields=["guiche_atual", "updated_at"])

        if not refresh_token:
            return Response({"detail": "Refresh token não fornecido."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response({"detail": "Refresh token invalido ou já expirado."}, status=status.HTTP_400_BAD_REQUEST)

        res = Response({"detail": "Logout realizado com sucesso."}, status=status.HTTP_200_OK)
        res.delete_cookie("refresh_token", path="/")
        return res


class PasswordResetRequestAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = (request.data.get("email") or "").strip()
        cpf = (request.data.get("cpf") or "").strip()
        if not email and not cpf:
            return Response(
                {"detail": "Informe e-mail ou cpf."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = None
        if email:
            user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user and cpf:
            user = User.objects.filter(cpf=cpf, is_active=True).first()

        reset_payload = {}
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = token_generator.make_token(user)
            reset_payload = {"uid": uid, "token": token}

            email_backend = getattr(settings, "EMAIL_BACKEND", default_email_backend)
            email_host = getattr(settings, "EMAIL_HOST", "")
            if email_host or email_backend != default_email_backend:
                print("Aqui?")
                reset_url = None
                frontend_reset_url = getattr(settings, "FRONTEND_RESET_PASSWORD_URL", "")
                print(frontend_reset_url, " frontend_reset_url")
                if frontend_reset_url:
                    separator = "&" if "?" in frontend_reset_url else "?"
                    reset_url = f"{frontend_reset_url}{separator}uid={uid}&token={token}"
                    print(reset_url, ' reset')

                subject = "Redefinição de senha"
                context = {
                    "cidadao_nome": getattr(user, "nome_completo", "") or getattr(user, "nome", ""),
                    "link_redefinicao": reset_url,
                }
                html = render_to_string(
                    "authentication/email_password_reset.html", context
                )
                message = strip_tags(html)
                try:
                    r = send_mail(
                        subject,
                        message,
                        getattr(settings, "DEFAULT_FROM_EMAIL", "fortbilingue@sis.fortaleza.ce.gov.br"),
                        [user.email],
                        fail_silently=False,
                        html_message=html,
                    )
                except Exception as exc:
                    return Response(
                        {"detail": "Erro ao enviar e-mail de redefinição."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

        response = {"detail": "Se a conta existir, enviaremos instruções por e-mail."}
        if settings.DEBUG and reset_payload:
            response["reset"] = reset_payload
        return Response(response, status=status.HTTP_200_OK)


class PasswordResetConfirmAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        uid = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        if not uid or not token or not new_password:
            return Response(
                {"detail": "Informe uid, token e nova senha."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (ValueError, TypeError, User.DoesNotExist):
            return Response(
                {"detail": "Token inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_generator.check_token(user, token):
            return Response(
                {"detail": "Token inválido ou expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except ValidationError as exc:
            return Response(
                {"detail": "Senha inválida.", "errors": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])

        return Response({"detail": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)
