from django import forms

from .models import Cidadao


class CidadaoCadastroForm(forms.ModelForm):
    def __init__(self, *args, locked_identity=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.locked_identity = locked_identity or {}

        for name, field in self.fields.items():
            css_classes = field.widget.attrs.get("class", "")
            field.widget.attrs["class"] = (css_classes + " form-control").strip()

        # Keep CPF and e-mail fixed if they came from SSO/API
        for field_name in ("cpf", "email"):
            locked_value = self.locked_identity.get(field_name)
            if locked_value:
                self.fields[field_name].initial = locked_value
                self.fields[field_name].disabled = True

    class Meta:
        model = Cidadao
        fields = [
            "nome",
            "cpf",
            "email",
            "telefone",
            "data_nascimento",
            "sexo",
            "logradouro",
            "numero",
            "bairro",
            "cep",
            "complemento",
        ]
        widgets = {
            "data_nascimento": forms.DateInput(attrs={"type": "date"}),
        }

    def clean(self):
        cleaned_data = super().clean()
        # Enforce immutable identity fields even if the client posts other values
        for field_name in ("cpf", "email"):
            locked_value = self.locked_identity.get(field_name)
            if locked_value:
                cleaned_data[field_name] = locked_value
        return cleaned_data
