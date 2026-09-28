from django.contrib import admin

from .models import Medicamento


@admin.register(Medicamento)
class MedicamentoAdmin(admin.ModelAdmin):
    search_fields = ("nome", "principio_ativo", "codigo_registro")
    list_display = ("nome", "concentracao", "unidade_medida", "forma_farmaceutica", "controlado", "is_active")
    list_filter = ("forma_farmaceutica", "via_administracao", "controlado", "is_active")
