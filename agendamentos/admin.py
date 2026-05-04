from django.contrib import admin
from .models import AgendaVaga, Agendamento

class agendaVagaAdmin(admin.ModelAdmin):
    search_fields = ('unidade__nome', 'tipo_servico__nome')
    list_filter = ('tipo_servico', 'unidade')


class AgendamentoAdmin(admin.ModelAdmin):
    list_filter = ('unidade', 'servico', 'situacao', 'origem')
    list_display = ('unidade', 'situacao', "data", "horario", "cidadao", 'servico', 'servico__tipo_servico')
    readonly_fields = ("data", "horario")
    raw_id_fields = ("cidadao", "unidade", "servico", "vaga", "atendente", "servicos_adicionais")


admin.site.register(AgendaVaga, agendaVagaAdmin)
admin.site.register(Agendamento, AgendamentoAdmin)

# Register your models here.
