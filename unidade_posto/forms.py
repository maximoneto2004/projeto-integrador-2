from django import forms
from app.static_data import DIA_SEMANA_CHOICES
from unidade_posto.models import ServicoUnidadePosto

class ServicoUnidadePostoForm(forms.ModelForm):
    dias_semana = forms.MultipleChoiceField(
        choices=DIA_SEMANA_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        label="Dias da Semana"
    )

    class Meta:
        model = ServicoUnidadePosto
        fields = "__all__"