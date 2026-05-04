from django.contrib import admin
from .models import FichaAtendimentoFamiliar, MembroFamiliar


class FichaAtendimentoFamiliarClass(admin.ModelAdmin):
    list_display = ('inscricao', 'unidade_de_atendimento', 'responsavel')
    search_fields = ('inscricao', 'responsavel__nome')
    list_filter = ('unidade_de_atendimento',)


admin.site.register(FichaAtendimentoFamiliar, FichaAtendimentoFamiliarClass)
admin.site.register(MembroFamiliar)

# Register your models here.
