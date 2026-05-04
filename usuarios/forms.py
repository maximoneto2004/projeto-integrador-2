from django import forms
from app.static_data import DIA_SEMANA_CHOICES
from .models import EscalaTrabalho

class EscalaTrabalhoForm(forms.ModelForm):
    dias_semana = forms.MultipleChoiceField(
        choices=DIA_SEMANA_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        label="Dias da Semana"
    )

    class Meta:
        model = EscalaTrabalho
        fields = "__all__"