import hashlib

from django.db import models
from django.utils import timezone

from app.mixins import BaseModel


def hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class SessaoCidadao(BaseModel):
    cidadao = models.ForeignKey("cidadaos.Cidadao", on_delete=models.CASCADE, related_name="sessoes_integracao")
    telefone = models.CharField(max_length=20, db_index=True)
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    authenticated_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["telefone", "expires_at"], name="sessao_tel_exp_idx")]

    @property
    def is_valid(self):
        return self.is_active and self.revoked_at is None and self.authenticated_at is not None and timezone.now() < self.expires_at


class DesafioAutenticacaoCidadao(BaseModel):
    cidadao = models.ForeignKey("cidadaos.Cidadao", on_delete=models.CASCADE, related_name="desafios_integracao")
    telefone = models.CharField(max_length=20, db_index=True)
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField(db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_available(self):
        return self.is_active and self.used_at is None and timezone.now() < self.expires_at
