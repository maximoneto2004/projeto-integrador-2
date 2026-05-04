from django.contrib import admin
from .models import ClasseServico, TipoServico, Servico


class ServicoAdmin(admin.ModelAdmin):
    search_fields = ('nome',)
    list_display = ('nome', 'classe', 'tipo_servico')
    list_filter = ('classe', 'tipo_servico')


class ClasseServicoAdmin(admin.ModelAdmin):
    search_fields = ('nome',)


class TipoServicoAdmin(admin.ModelAdmin):
    search_fields = ('nome',)


admin.site.register(ClasseServico, ClasseServicoAdmin)
admin.site.register(TipoServico, TipoServicoAdmin)
admin.site.register(Servico, ServicoAdmin)
