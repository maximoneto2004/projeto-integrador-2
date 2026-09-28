from rest_framework import serializers
from app.models import Bairro


class BairroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bairro
        fields = ["id", "nome", "is_active"]
