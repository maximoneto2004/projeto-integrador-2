from django.contrib import admin
from .models import Cidadao


class CidadaosAdmin(admin.ModelAdmin):
    search_fields = ('cpf', 'nome', 'email')
    list_display = ('nome', 'cpf', 'email')


admin.site.register(Cidadao, CidadaosAdmin)
