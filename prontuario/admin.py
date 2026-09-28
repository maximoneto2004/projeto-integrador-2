from django.contrib import admin

from .models import Receita, ReceitaMedicamento, RegistroAtendimento


class ReceitaMedicamentoInline(admin.TabularInline):
    model = ReceitaMedicamento
    extra = 0
    raw_id_fields = ("medicamento",)


@admin.register(Receita)
class ReceitaAdmin(admin.ModelAdmin):
    list_display = ("cidadao", "profissional", "data_emissao", "data_validade")
    search_fields = ("cidadao__nome", "cidadao__cpf")
    raw_id_fields = ("agendamento", "cidadao", "profissional")
    inlines = [ReceitaMedicamentoInline]


@admin.register(RegistroAtendimento)
class RegistroAtendimentoAdmin(admin.ModelAdmin):
    list_display = ("cidadao", "profissional", "unidade", "created_at", "cid")
    search_fields = ("cidadao__nome", "cidadao__cpf", "cid")
    list_filter = ("unidade", "classificacao_risco")
    raw_id_fields = ("agendamento", "cidadao", "profissional", "unidade")
