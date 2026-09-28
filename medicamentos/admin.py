from django.contrib import admin

from .models import LoteMedicamento, Medicamento, MovimentacaoEstoque


@admin.register(Medicamento)
class MedicamentoAdmin(admin.ModelAdmin):
    search_fields = ("nome", "principio_ativo", "codigo_registro")
    list_display = ("nome", "concentracao", "unidade_medida", "forma_farmaceutica", "controlado", "is_active")
    list_filter = ("forma_farmaceutica", "via_administracao", "controlado", "is_active")


# Saldos só mudam pela API de estoque, que registra a movimentação; o admin fica somente leitura para quantidades.
@admin.register(LoteMedicamento)
class LoteMedicamentoAdmin(admin.ModelAdmin):
    search_fields = ("numero_lote", "medicamento__nome")
    list_display = ("medicamento", "unidade", "numero_lote", "validade", "quantidade_atual", "is_active")
    list_filter = ("unidade", "is_active")
    raw_id_fields = ("medicamento", "unidade")
    readonly_fields = ("quantidade_inicial", "quantidade_atual")

    def has_add_permission(self, request):
        return False


@admin.register(MovimentacaoEstoque)
class MovimentacaoEstoqueAdmin(admin.ModelAdmin):
    list_display = ("data", "tipo", "lote", "quantidade", "saldo_apos", "usuario")
    list_filter = ("tipo", "lote__unidade")
    search_fields = ("lote__numero_lote", "lote__medicamento__nome")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
