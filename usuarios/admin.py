from django.contrib import admin
from .models import Usuario, EscalaTrabalho
from django import forms
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm
from app.static_data import DIA_SEMANA_CHOICES
from .forms import EscalaTrabalhoForm



class EscalaTrabalhoInlineForm(forms.ModelForm):
    dias_semana = forms.MultipleChoiceField(
        choices=DIA_SEMANA_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        label="Dias da Semana"
    )

    class Meta:
        model = EscalaTrabalho
        fields = "__all__"

    def clean_dias_semana(self):
        dias = self.cleaned_data["dias_semana"]
        return list(dias)  # JSONField exige lista


class EscalaTrabalhoInline(admin.TabularInline):
    model = EscalaTrabalho
    form = EscalaTrabalhoInlineForm
    extra = 1

    fields = (
        "unidade",
        "dias_semana",
        "turno1_inicio",
        "turno1_fim",
        "turno2_inicio",
        "turno2_fim",
    )

class EscalaTrabalhoAdmin(admin.ModelAdmin):
    list_filter = ('unidade', 'profissional__groups')
    list_display = ('profissional', 'unidade', 'is_active')
    form = EscalaTrabalhoForm



class UsuarioCreationForm(forms.ModelForm):
    """Form usado no Django Admin para criar usuários SEM exigir senha."""

    class Meta:
        model = Usuario
        fields = ("email", "nome_completo", "cpf", "telefone",
                  "unidades_lotacao", "tipo_ofertados")

    def save(self, commit=True):
        user = super().save(commit=False)

        # Preencher username = email
        user.username = user.email

        # Criar usuário SEM senha no momento
        user.set_unusable_password()

        if commit:
            user.save()
            self.save_m2m()

        return user


class UsuarioChangeForm(UserChangeForm):
    """Form para edição do usuário usando o campo de senha somente leitura padrão."""

    class Meta(UserChangeForm.Meta):
        model = Usuario


class UsuarioAdmin(UserAdmin):
    add_form = UsuarioCreationForm
    form = UsuarioChangeForm
    model = Usuario

    # Campos exibidos no admin
    list_display = ("nome_completo", "email", "cpf", "telefone", "guiche_atual", "is_active")
    list_filter = ("is_staff", "is_superuser", "unidades_lotacao", 'groups')

    # Campos permitidos ao criar o usuário (SEM username e senha)
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "nome_completo", "cpf", "telefone",
                       "groups", "unidades_lotacao", "tipo_ofertados",
                       "is_staff", "is_superuser")}
        ),
    )

    # Campos ao editar
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informações pessoais", {"fields": ("nome_completo", "cpf", "telefone")}),
        ("Vínculos", {"fields": ("unidades_lotacao", "tipo_ofertados", "guiche_atual")}),
        ("Permissões", {"fields": ("is_staff", "is_superuser", "groups")}),
        ("Status", {"fields": ("is_active",)}),
    )

    # Remover a obrigatoriedade de username
    ordering = ("email",)
    search_fields = ("email", "nome_completo", "cpf")

admin.site.register(Usuario, UsuarioAdmin)
admin.site.register(EscalaTrabalho, EscalaTrabalhoAdmin)
