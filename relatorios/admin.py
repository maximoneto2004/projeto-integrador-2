from django.contrib import admin

from .models import (
    ConfiguracaoRelatorioAtendimentosTecnico,
    ConfiguracaoRelatorioAtividadesCadunico,
)


@admin.register(ConfiguracaoRelatorioAtendimentosTecnico)
class ConfiguracaoRelatorioAtendimentosTecnicoAdmin(admin.ModelAdmin):
    list_display = ("nome", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("nome",)
    filter_horizontal = (
        "servicos_adicionais",
        "servicos_adicionais_agrupados",
        "servicos_adicionais_pcd",
    )
    autocomplete_fields = ("servico_adicional_faixa_etaria",)


@admin.register(ConfiguracaoRelatorioAtividadesCadunico)
class ConfiguracaoRelatorioAtividadesCadunicoAdmin(admin.ModelAdmin):
    list_display = ("nome", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("nome",)
    filter_horizontal = ("cadastro_unico", "bolsa_familia")
