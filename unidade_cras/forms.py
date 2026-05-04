from django import forms
from app.static_data import DIA_SEMANA_CHOICES
from unidade_cras.models import ServicoUnidadeCras

class ServicoUnidadeCrasForm(forms.ModelForm):
    dias_semana = forms.MultipleChoiceField(
        choices=DIA_SEMANA_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        label="Dias da Semana"
    )

    class Meta:
        model = ServicoUnidadeCras
        fields = "__all__"