from rest_framework import serializers


class IniciarAuthSerializer(serializers.Serializer):
    cpf = serializers.CharField(max_length=20)
    telefone = serializers.CharField(max_length=30)


class VerificarAuthSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    code = serializers.CharField(max_length=20, trim_whitespace=True)


class SessaoQuerySerializer(serializers.Serializer):
    telefone = serializers.CharField(max_length=30)


class CidadaoBuscaQuerySerializer(serializers.Serializer):
    cpf = serializers.CharField(max_length=20)


class ServicosUnidadeQuerySerializer(serializers.Serializer):
    tipo_id = serializers.UUIDField()


class VagasQuerySerializer(serializers.Serializer):
    unidade_id = serializers.UUIDField()
    tipo_id = serializers.UUIDField()
    data = serializers.DateField(required=False)


class CriarAgendamentoIntegracaoSerializer(serializers.Serializer):
    vaga_id = serializers.UUIDField()
    servico_id = serializers.UUIDField()
    motivo_territorio = serializers.CharField(required=False, allow_blank=True, max_length=600)


class CriarCidadaoIntegracaoSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=150)
    cpf = serializers.CharField(max_length=20)
    telefone = serializers.CharField(max_length=30)
    data_nascimento = serializers.DateField(required=False, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)


class ErroIntegracaoSerializer(serializers.Serializer):
    detail = serializers.CharField(required=False)


class SessaoStatusSerializer(serializers.Serializer):
    authenticated = serializers.BooleanField()
    cidadao_id = serializers.UUIDField(required=False)
    expires_at = serializers.DateTimeField(required=False)
    remaining_seconds = serializers.IntegerField(required=False)
    session_token = serializers.CharField(required=False)
    token_type = serializers.CharField(required=False)


class DesafioCriadoSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    expires_at = serializers.DateTimeField()
    delivery = serializers.ChoiceField(choices=["mock"])
    development_code = serializers.CharField(required=False)


class CidadaoBuscaRespostaSerializer(serializers.Serializer):
    exists = serializers.BooleanField()
    cidadao_id = serializers.UUIDField(allow_null=True)
    nome = serializers.CharField(allow_null=True)


class CidadaoCriadoRespostaSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    nome = serializers.CharField()


class BairroIntegracaoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    nome = serializers.CharField()


class UnidadeIntegracaoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    nome = serializers.CharField()
    telefone = serializers.CharField()
    bairro = BairroIntegracaoSerializer()
    logradouro = serializers.CharField()
    numero = serializers.CharField()
    complemento = serializers.CharField(allow_null=True)
    cep = serializers.CharField()
    latitude = serializers.CharField(allow_null=True)
    longitude = serializers.CharField(allow_null=True)


class TipoServicoIntegracaoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    nome = serializers.CharField()
    descricao = serializers.CharField(allow_null=True)


class ServicoIntegracaoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    nome = serializers.CharField()
    gera_receita = serializers.BooleanField()


class VagaIntegracaoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    data = serializers.DateField()
    horario = serializers.TimeField()
    vagas_disponiveis = serializers.IntegerField()


class AgendamentoIntegracaoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    data = serializers.DateField()
    horario = serializers.TimeField()
    situacao = serializers.CharField()
    servico = serializers.CharField(required=False)
    unidade = serializers.CharField(required=False)


class MedicamentoReceitaIntegracaoSerializer(serializers.Serializer):
    medicamento_id = serializers.UUIDField(allow_null=True)
    nome = serializers.CharField()
    dosagem = serializers.CharField()
    frequencia = serializers.CharField()
    duracao = serializers.CharField()


class ReceitaIntegracaoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    data_emissao = serializers.DateTimeField()
    validade = serializers.DateField()
    medicamentos = MedicamentoReceitaIntegracaoSerializer(many=True)


class UnidadeEstoqueIntegracaoSerializer(serializers.Serializer):
    unidade_id = serializers.UUIDField()
    unidade_nome = serializers.CharField()
    quantidade_disponivel = serializers.IntegerField()
    disponivel = serializers.BooleanField()


class DisponibilidadeMedicamentoSerializer(serializers.Serializer):
    medicamento_id = serializers.UUIDField()
    nome = serializers.CharField()
    unidades = UnidadeEstoqueIntegracaoSerializer(many=True)
