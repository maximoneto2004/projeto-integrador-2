from rest_framework import serializers
from avaliacao.models import Avaliacao
from django.db.models import Avg

class AvaliacaoSerializer(serializers.ModelSerializer):
    atendente = serializers.SerializerMethodField()
    nota_media_atendente = serializers.SerializerMethodField()

    class Meta:
        model = Avaliacao
        fields = "__all__"  # inclui os method fields também

    def get_atendente(self, obj):
        atendente = getattr(obj.agendamento, "atendente", None)
        if not atendente:
            return None
        return {
            "id": str(atendente.id),
            "nome": atendente.nome_completo,
        }

    def get_nota_media_atendente(self, obj):
        atendente_id = obj.agendamento.atendente_id
        if not atendente_id:
            return None

        media = (
            Avaliacao.objects
            .filter(agendamento__atendente_id=atendente_id)
            .aggregate(media=Avg("nota"))["media"]
        )
        return round(float(media), 1) if media is not None else None



