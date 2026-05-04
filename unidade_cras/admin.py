from django.contrib import admin
from .models import UnidadeCras, ServicoUnidadeCras, BloqueioHorario, Guiche
from .forms import ServicoUnidadeCrasForm
from django import forms
from app.static_data import DIA_SEMANA_CHOICES
from django.core.exceptions import ValidationError


class ServicoUnidadeCrasInlineForm(forms.ModelForm):
    dias_semana = forms.MultipleChoiceField(
        choices=DIA_SEMANA_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        label="Dias da Semana"
    )

    class Meta:
        model = ServicoUnidadeCras
        fields = "__all__"


class ServicoUnidadeCrasInline(admin.TabularInline):
    model = ServicoUnidadeCras
    form = ServicoUnidadeCrasInlineForm
    extra = 1
    show_change_link = True
    verbose_name = "Serviço vinculado"
    verbose_name_plural = "Serviços desta unidade"
    autocomplete_fields = ["servico"]
    classes = ["collapse"]

    fields = (
        "servico",
        "dias_semana",
        "mesmo_expediente",
        "hora_manha_inicio",
        "hora_manha_fim",
        "hora_tarde_inicio",
        "hora_tarde_fim",
        "is_active"
    )

class GuicheInline(admin.TabularInline):
    model = Guiche
    extra = 1
    fields = ("nome", "is_active")
    classes = ["collapse"]


class UnidadeCrasAdmin(admin.ModelAdmin):
    list_display = ('nome', 'is_active')
    inlines = [GuicheInline, ServicoUnidadeCrasInline]
    search_fields = ('nome',)


class ServicoUnidadeCrasAdmin(admin.ModelAdmin):
    list_filter = ('unidade',)
    form = ServicoUnidadeCrasForm


class BloqueioHorarioAdminForm(forms.ModelForm):
    class Meta:
        model = BloqueioHorario
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        if not self.instance._state.adding and not cleaned_data.get("justificativa_alteracao"):
            raise ValidationError("Você precisa colocar uma justificativa para alteração do bloqueio.")
        return cleaned_data


class BloqueioHorarioAdmin(admin.ModelAdmin):
    list_display = ("data", "hora_inicio", "hora_fim", "get_cras", "motivo", "is_active")
    list_filter = ("is_active", "cras", "data")
    search_fields = ("motivo", 'cras__nome')
    readonly_fields = ("criado_por", "alterado_por")
    form = BloqueioHorarioAdminForm

    def save_model(self, request, obj, form, change):
        if not change:
            obj.criado_por = request.user
        else:
            obj.alterado_por = request.user
        super().save_model(request, obj, form, change)

    def get_cras(self, obj):
        return ", ".join(c.nome for c in obj.cras.all())
    get_cras.short_description = "Unidades CRAS"


admin.site.register(UnidadeCras, UnidadeCrasAdmin)
admin.site.register(ServicoUnidadeCras, ServicoUnidadeCrasAdmin)
admin.site.register(BloqueioHorario, BloqueioHorarioAdmin)
