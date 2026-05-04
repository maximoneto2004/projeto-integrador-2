import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class UpperAndLowerCaseValidator:
    def validate(self, password, user=None):
        if not re.search(r"[A-Z]", password):
            raise ValidationError(
                _("A senha deve conter pelo menos uma letra maiúscula."),
                code="password_no_upper",
            )
        if not re.search(r"[a-z]", password):
            raise ValidationError(
                _("A senha deve conter pelo menos uma letra minúscula."),
                code="password_no_lower",
            )

    def get_help_text(self):
        return _(
            "Sua senha deve conter pelo menos uma letra maiúscula e uma minúscula."
        )


class SpecialCharacterValidator:
    def validate(self, password, user=None):
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise ValidationError(
                _("A senha deve conter pelo menos um caractere especial."),
                code="password_no_special",
            )

    def get_help_text(self):
        return _(
            "Sua senha deve conter pelo menos um caractere especial "
            "(por exemplo: !, @, #, $, %, &, *)."
        )
