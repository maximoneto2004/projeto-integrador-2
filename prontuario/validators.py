from django.core.exceptions import ValidationError
from app.static_data import QUALIFICACAO_CHOICES, DOENCAS_CHOICES

def validate_qualificacoes(value):
    if not isinstance(value, list):
        raise ValidationError("Envie uma lista.")
    valid_values = {k for k, _ in QUALIFICACAO_CHOICES}
    invalid = [v for v in value if v not in valid_values]
    if invalid:
        raise ValidationError(f"Valores inválidos: {invalid}")


def validate_doencas_graves(value):
    if not isinstance(value, list):
        raise ValidationError("Envie uma lista.")
    valid_values = {k for k, _ in DOENCAS_CHOICES}
    invalid = [v for v in value if v not in valid_values]
    if invalid:
        raise ValidationError(f"Valores inválidos: {invalid}")