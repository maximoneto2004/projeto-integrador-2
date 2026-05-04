from duvidas_frequentes.models import Duvida
from rest_framework import serializers

class DuvidaSerializer(serializers.ModelSerializer):
  class Meta:
    model = Duvida
    fields="__all__"