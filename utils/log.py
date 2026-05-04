import json
from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType


def registrar_log(user, objeto, acao, mensagem):
    """
    Registra log no django_admin_log. Aceita mensagem como string ou dict.
    """
    change_message = (
        json.dumps(mensagem, ensure_ascii=False, default=str)
        if isinstance(mensagem, dict)
        else mensagem
    )
    print("OBJETO TESTE:", {user, objeto, acao, change_message})
    LogEntry.objects.log_action(
        user_id=user.id,
        content_type_id=ContentType.objects.get_for_model(objeto).pk,
        object_id=objeto.pk,
        object_repr=str(objeto),
        action_flag=acao,
        change_message=change_message,
    )
