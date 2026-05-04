import os
from django.http import HttpResponse
from django.http import JsonResponse
from django.conf import settings
from django.utils import timezone

import logging


logger = logging.getLogger(__name__)



class CustomCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "")

        # Se for preflight, retorna imediatamente 200
        if request.method == "OPTIONS":
            response = HttpResponse(status=200)
        else:
            response = self.get_response(request)

        # Adiciona os headers de CORS
        response["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
        response["Access-Control-Allow-Methods"] = "GET, HEAD, POST, PUT, DELETE, PATCH, TRACE, CONNECT, OPTIONS"
        response["Access-Control-Allow-Headers"] = (
            "Authorization, Access-Control-Request-Method, "
            "Access-Control-Request-Headers, Origin, user_key, Accept, Content-Type"
        )
        response["Access-Control-Allow-Credentials"] = "true"

        return response


class BlockExternalRequestsMiddleware:
    """
    Bloqueia requisições externas (sem Origin ou Referer autorizado).
    Registra logs de tentativas bloqueadas com IP, origem, caminho e horário.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        allowed_origins = getattr(settings, "ALLOWED_REQUEST_ORIGINS", [])
        origin = request.headers.get("Origin") or request.headers.get("Referer")
        client_ip = self.get_client_ip(request)

        # Permitir Django admin ou local dev (opcional)
        if settings.DEBUG or request.path.startswith("/admin/"):
            return self.get_response(request)

        # Se não houver origem ou for de fora dos domínios permitidos → bloqueia
        if not origin or not any(origin.startswith(a) for a in allowed_origins):
            # Loga o evento
            logger.warning(
                f"[🚫 BLOQUEIO API] IP={client_ip} Origem={origin or 'N/A'} "
                f"Path={request.path} Horário={timezone.now()}"
            )
            return JsonResponse(
                {"detail": "Acesso bloqueado: origem não autorizada."},
                status=403
            )

        return self.get_response(request)

    def get_client_ip(self, request):
        """Obtém o IP real do cliente (considerando proxy reverso)"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

