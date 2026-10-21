from django.contrib.auth.management import create_permissions
from django.db import migrations

GRUPO = "Farmacêutico"

# Perfil responsável pela retirada de medicamentos: atende a fila da farmácia, consulta receitas
# e dá baixa no estoque. Não acessa prontuário clínico nem gerencia lotes.
PERMISSOES = {
    "agendamentos": ["view_agendamento", "change_agendamento", "view_agendavaga", "view_chamadapainel"],
    "cidadaos": ["view_cidadao"],
    "servicos": ["view_servico"],
    "unidade_posto": ["view_guiche", "view_unidadeposto"],
    "usuarios": ["view_usuario"],
    "prontuario": ["view_receita", "view_receitamedicamento"],
    "medicamentos": [
        "view_medicamento",
        "view_lotemedicamento",
        "view_movimentacaoestoque",
        "add_movimentacaoestoque",
    ],
}


def _permissoes(apps):
    Permission = apps.get_model("auth", "Permission")
    for app_label, codenames in PERMISSOES.items():
        yield from Permission.objects.filter(content_type__app_label=app_label, codename__in=codenames)


def criar_grupo(apps, schema_editor):
    # Permissões normalmente só são criadas no post_migrate; forçamos aqui para poder atribuí-las.
    for app_label in PERMISSOES:
        app_config = apps.get_app_config(app_label)
        app_config.models_module = True
        create_permissions(app_config, apps=apps, verbosity=0)
        app_config.models_module = None

    Group = apps.get_model("auth", "Group")
    grupo, _ = Group.objects.get_or_create(name=GRUPO)
    grupo.permissions.add(*_permissoes(apps))


def remover_grupo(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name=GRUPO).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("agendamentos", "0023_retirada_medicamento"),
        ("cidadaos", "0010_cidadao_dados_clinicos"),
        ("servicos", "0005_servico_gera_receita_dispensacao"),
        ("unidade_posto", "0009_alter_servicounidadeposto_mesmo_expediente"),
        ("usuarios", "0007_reestruturar_grupos_saude"),
        ("prontuario", "0081_permissoes_registro_atendimento"),
        ("medicamentos", "0005_permissoes_estoque_coordenador"),
    ]

    operations = [
        migrations.RunPython(criar_grupo, remover_grupo),
    ]
