import time
import logging
from urllib import request, response
from django.db import connection, reset_queries, models
from django.forms.models import model_to_dict
from django.utils.deprecation import MiddlewareMixin
from django.contrib.admin.models import ADDITION, CHANGE, DELETION

from utils.log import registrar_log

# Configura logger
logger = logging.getLogger(__name__)


# Cores ANSI para o terminal
class Colors:
    RESET = "\033[0m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"


class PerformanceMiddleware(MiddlewareMixin):

    def process_request(self, request):
        reset_queries()
        request._start_time = time.time()

    def process_response(self, request, response):
        if not hasattr(request, "_start_time"):
            return response

        duration = time.time() - request._start_time
        querie = connection.queries
        num_queries = len(connection.queries)
        path = request.path
        user = "anônimo"
        if hasattr(request, "user") and request.user.is_authenticated:
            user = getattr(request.user, "email", None) or getattr(
                request.user, "username", "anônimo"
            )

        # Define cor conforme o tempo
        if duration < 0.3:
            color = Colors.GREEN
        elif duration < 1.0:
            color = Colors.YELLOW
        else:
            color = Colors.RED

        msg = (
            f"{Colors.CYAN}[PERF]{Colors.RESET} "
            f"{Colors.BOLD}{path}{Colors.RESET} "
            f"{color}{duration:.3f}s{Colors.RESET} "
            f"({num_queries} queries) "
            f"- user: {user}"
        )

        logger.info(msg)
        print(msg)  # também imprime no console

        return response


class AuditMiddleware(MiddlewareMixin):
    WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
    SEMANTIC_DELETE_POST_MODELS = {"exclusaomembrocomposicao"}

    IGNORED_FIELD_NAMES = {
        "id",
        "created_at",
        "updated_at",
    }

    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.method not in self.WRITE_METHODS:
            return None

        model = self._get_model_from_view(view_func)
        if not model:
            return None

        request._audit_model = model

        if request.method == "POST":
            return None

        pk = self._get_pk_from_kwargs(view_kwargs)
        if not pk:
            return None

        try:
            obj = model.objects.get(pk=pk)
        except model.DoesNotExist:
            return None

        request._audit_before = model_to_dict(obj)
        request._audit_pk = obj.pk

        return None

    def process_response(self, request, response):
        if request.method not in self.WRITE_METHODS:
            return response

        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return response

        model = getattr(request, "_audit_model", None)
        if not model:
            return response

        method = request.method

        if method == "POST" and response.status_code in (200, 201):
            obj = self._get_created_object(response, model)
            if obj:
                if self._is_semantic_delete_post(model):
                    registrar_log(
                        user=user,
                        objeto=obj,
                        acao=DELETION,
                        mensagem=self._build_semantic_delete_message(obj),
                    )
                    return response

                registrar_log(
                    user=user,
                    objeto=obj,
                    acao=ADDITION,
                    mensagem=self._build_creation_message(obj),
                )
            return response

        if method in {"PUT", "PATCH"}:
            before = getattr(request, "_audit_before", None)
            pk = getattr(request, "_audit_pk", None)

            if not before or not pk:
                return response

            try:
                after = model.objects.get(pk=pk)
            except model.DoesNotExist:
                return response

            changes = {}

            for field in model._meta.fields:
                name = field.name

                if name in self.IGNORED_FIELD_NAMES:
                    continue

                if isinstance(field, models.ForeignKey):
                    continue

                old = before.get(name)
                new = getattr(after, name)

                if old != new:
                    changes[name] = {
                        "antes": old,
                        "depois": new,
                    }
            print(user, after, CHANGE, changes)
            if changes:
                registrar_log(
                    user=user,
                    objeto=after,
                    acao=CHANGE,
                    mensagem=changes,
                )

            return response

        if method == "DELETE":
            before = getattr(request, "_audit_before", None)
            pk = getattr(request, "_audit_pk", None)

            if not before or not pk:
                return response

            obj = model()
            for field in model._meta.fields:
                name = field.name
                if name not in before:
                    continue
                if isinstance(field, models.ForeignKey):
                    setattr(obj, field.attname, before[name])
                else:
                    setattr(obj, name, before[name])
            obj.pk = pk

            registrar_log(
                user=user,
                objeto=obj,
                acao=DELETION,
                mensagem=before,
            )

        return response

    def _build_creation_message(self, obj):
        payload = {"tipo": "criacao"}

        for field in obj._meta.fields:
            name = field.name

            if name in self.IGNORED_FIELD_NAMES:
                continue

            if isinstance(field, models.ForeignKey):
                continue

            value = getattr(obj, name, None)
            if value in (None, ""):
                continue

            payload[name] = value

        return payload

    def _build_semantic_delete_message(self, obj):
        payload = {"tipo": "exclusao"}

        for field in obj._meta.fields:
            name = field.name

            if name in self.IGNORED_FIELD_NAMES:
                continue

            if isinstance(field, models.ForeignKey):
                continue

            value = getattr(obj, name, None)
            if value in (None, ""):
                continue

            payload[name] = value

        return payload

    def _get_pk_from_kwargs(self, view_kwargs):
        for key in ("pk", "id", "uuid"):
            if key in view_kwargs:
                return view_kwargs[key]
        return None

    def _get_model_from_view(self, view_func):
        view_class = getattr(view_func, "view_class", None)
        if not view_class:
            return None

        queryset = getattr(view_class, "queryset", None)
        if queryset is not None:
            return queryset.model

        if hasattr(view_class, "get_queryset"):
            try:
                return view_class().get_queryset().model
            except Exception:
                return None

        return None

    def _is_semantic_delete_post(self, model):
        model_name = getattr(getattr(model, "_meta", None), "model_name", "")
        return model_name in self.SEMANTIC_DELETE_POST_MODELS

    def _get_created_object(self, response, model):
        try:
            data = getattr(response, "data", None)
            if not isinstance(data, dict):
                return None

            pk = data.get("id") or data.get("pk")

            if not pk and isinstance(data.get("result"), dict):
                pk = data["result"].get("id") or data["result"].get("pk")

            if not pk:
                return None

            return model.objects.get(pk=pk)
        except Exception:
            return None
