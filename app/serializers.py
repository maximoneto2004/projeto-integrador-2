from rest_framework import serializers
from app.models import Bairro


class BairroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bairro
        fields = ["id", "nome", "is_active"]

class FaleConoscoSerializer(serializers.Serializer):
    nome_completo = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    assunto = serializers.CharField(max_length=255)
    mensagem = serializers.CharField()

    class Meta:
        fields = ["nome_completo", "email", "assunto", "mensagem"]
