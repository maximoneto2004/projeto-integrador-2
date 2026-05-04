from django.db import models, transaction
from app.mixins import BaseModel
from django.core.exceptions import ValidationError
from unidade_cras.models import UnidadeCras
from cidadaos.models import Cidadao
from app.static_data import (
    TIPO_RESIDENCIA_CHOICES,
    LOCALIZACAO_DOMICILIO_CHOICES,
    ESPECIFICIDADE_SOCIAL_CHOICES,
    PAREDES_EXTERNAS_CHOICES,
    ENERGIA_ELETRICA_CHOICES,
    SIM_NAO_CHOICES,
    ESGOTAMENTO_SANITARIO_CHOICES,
    COLETA_CHOICES,
    ESCOLARIDADE_CHOICES,
    FREQUENCIA_CHOICES,
    SITUACAO_ESCOLAR_CHOICES,
    EFEITO_DESCUMPRIMENTO_CHOICES,
    FORMA_INGRESSO_CHOICES,
    CONDICAO_OCUPACAO_CHOICES,
    VINCULO_CHOICES,
    PARENTESCO_CHOICES,
    ABASTECIMENTO_CHOICES,
    TIPO_BENEFICIOS,
    PERCEPCAO_VIOLENCIA_CHOICES,
    UNIDADE_REALIZACAO_CHOICES,
    MOTIVO_DESLIGAMENTO_CHOICES,
    OFERTA_ASSISTENCIA_CHOICES,
    ENCAMINHAMENTOS_CHOICES,
    VINCULO_FAMILIAR_CHOICES,
    STATUS_VUNERABILIDADE,
    MEDIDA_CHOICES
)
from usuarios.models import Usuario
from app.models import Bairro
from django.db.models import Max
from .validators import validate_qualificacoes, validate_doencas_graves
from datetime import date


class Prontuario(BaseModel):
    sequencial = models.PositiveIntegerField(unique=True, editable=False, null=True)
    numero = models.CharField(verbose_name="Prontuário", unique=True, max_length=200, editable=False)
    unidade_inicial = models.ForeignKey(
        UnidadeCras, verbose_name="Unidade Inicial", on_delete=models.PROTECT
    )

    def __str__(self):
        return self.numero
    
    def save(self, *args, **kwargs):
        if not self.sequencial:
            with transaction.atomic():
                last = Prontuario.objects.select_for_update().aggregate(Max("sequencial"))["sequencial__max"] or 0
                self.sequencial = last + 1
                self.numero = f"PR-{self.sequencial:06d}"
        super().save(*args, **kwargs)


class FormaIngresso(BaseModel):
    opcao = models.CharField(verbose_name="Forma de Ingresso", max_length=150)

    class Meta:
        verbose_name = "Forma de Ingresso"
        verbose_name_plural = "Formas de Ingresso"

    def __str__(self):
        return self.opcao


class OrgaoOrigemEncaminhamento(BaseModel):
    orgao = models.CharField(verbose_name="Orgão", max_length=50)


    class Meta:
        verbose_name = "Origem de Encaminhamento"
        verbose_name_plural = "Origens de Encaminhamento"

    def __str__(self):
        return self.orgao


class Unidade(BaseModel):
    unidade = models.CharField(verbose_name="Órgão/Unidade", max_length=150)

    def __str__(self):
        return self.unidade


class BeneficioSocial(BaseModel):
    nome = models.CharField(verbose_name="Nome", max_length=150)

    class Meta:
        verbose_name = "Benefício Social"
        verbose_name_plural = "Benefícios Sociais"

    def __str__(self):
        return self.nome


class PessoaReferencia(BaseModel):
    pessoa_referencia = models.ForeignKey(
        Cidadao,
        verbose_name="Pessoa de Referência",
        unique=True,
        on_delete=models.PROTECT,
    )
    prontuario = models.ForeignKey(
        Prontuario, verbose_name="Prontuário", unique=True, on_delete=models.PROTECT
    )
    logradouro = models.CharField(
        verbose_name="Logradouro", max_length=200, null=True, blank=True
    )
    numero = models.CharField(
        verbose_name="Número", max_length=10, null=True, blank=True
    )
    bairro = models.ForeignKey(
        Bairro, verbose_name="Bairro", on_delete=models.PROTECT, null=True, blank=True
    )
    cep = models.CharField(verbose_name="CEP", max_length=10, null=True, blank=True)
    complemento = models.CharField(
        verbose_name="Complemento", max_length=150, blank=True, null=True
    )
    estado = models.CharField(
        verbose_name="Estado", max_length=50, null=True, blank=True
    )
    cidade = models.CharField(
        verbose_name="Cidade", max_length=50, null=True, blank=True
    )
    ponto_referencia = models.CharField(
        verbose_name="Ponto de Referência", max_length=150, null=True, blank=True
    )
    localizacao = models.CharField(
        verbose_name="Localização do Domicílio",
        max_length=50,
        choices=LOCALIZACAO_DOMICILIO_CHOICES,
        null=True,
        blank=True,
    )
    abrigo = models.BooleanField(
        verbose_name="Endereço é de um Abrigo", null=True, blank=True
    )
    forma_ingresso = models.CharField(
        verbose_name="Forma de ingresso", choices=FORMA_INGRESSO_CHOICES, null=True, blank=True
    )
    unidade = models.ForeignKey(
        Unidade, verbose_name="Órgão/Unidade", on_delete=models.PROTECT, null=True, blank=True
    )
    contato_encaminhamento = models.CharField(
        verbose_name="Contato do órgão/unidade", max_length=150, null=True, blank=True
    )
    razoes = models.TextField(
        verbose_name="Motivo do atendimento",
        null=True,
        blank=True,
        max_length=600
    )
    beneficio = models.ManyToManyField(
        BeneficioSocial, verbose_name="Benefícios Sociais", null=True, blank=True
    )
    especifidade_familia = models.CharField(
        verbose_name="Especifidade étnico-culturais",
        max_length=150,
        choices=ESPECIFICIDADE_SOCIAL_CHOICES,
        null=True,
        blank=True,
    )
    povo_etinia = models.CharField(
        verbose_name="Especifique o povo/etnia (residente)",
        max_length=250,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Pessoa de Referência"
        verbose_name_plural = "Pessoas de Referências"

    def __str__(self):
        return self.pessoa_referencia.nome


class Parentesco(BaseModel):
    nome = models.CharField(verbose_name="Parentesco", max_length=150)

    class Meta:
        verbose_name = "Parentesco"
        verbose_name_plural = "Parentescos"   


    def __str__(self):
        return self.nome


class MembroComposicao(BaseModel):
    prontuario = models.ForeignKey(
        Prontuario, on_delete=models.PROTECT, related_name="membros"
    )
    cidadao = models.ForeignKey(
        Cidadao, on_delete=models.PROTECT, related_name="composicoes"
    )
    parentesco = models.CharField(verbose_name="Parentesco", choices=PARENTESCO_CHOICES, null=True, blank=True)
    # parentesco = models.ForeignKey(
    #     Parentesco,
    #     verbose_name="Parentesco",
    #     on_delete=models.PROTECT,
    #     null=True,
    #     blank=True,
    # )
    data_entrada = models.DateField(null=True, blank=True)
    data_saida = models.DateField(null=True, blank=True)
    responsavel = models.BooleanField(default=False)
    ativo = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["prontuario", "cidadao"],
                condition=models.Q(ativo=True),
                name="uniq_membro_ativo_por_prontuario",
            )
        ]

    class Meta:
        verbose_name = "Membro Composição"
        verbose_name_plural = "Membros Composição"
    
    def __str__(self):
        return f"Prontuário {self.prontuario} - {self.cidadao.nome} "


class ExclusaoMembroComposicao(BaseModel):
    membro = models.CharField(verbose_name="Membro", max_length=300, null=True, blank=True)
    prontuario = models.ForeignKey(
        Prontuario,
        on_delete=models.PROTECT,
        related_name="exclusoes_membros",
        null=True,
        blank=True,
    )
    # membro = models.ForeignKey(
    #     MembroComposicao,
    #     on_delete=models.SET_NULL,
    #     related_name="exclusoes",
    #     null=True,
    #     blank=True,
    # )
    data_exclusao = models.DateField(auto_now_add=True)
    motivo = models.TextField(verbose_name="Motivo", max_length=600)

    class Meta:
        verbose_name = "Exclusão de Membro"
        verbose_name_plural = "Exclusões de Membros"
    
    def __str__(self):
        return f"{self.membro}"


class AbastecimentoAgua(BaseModel):
    tipo_abastecimento = models.CharField(
        verbose_name="Abastecimento de água", max_length=150
    )

    class Meta:
        verbose_name = "Abastecimento de água"
        verbose_name_plural = "Abastecimentos de água"

    def __str__(self):
        return f"{self.tipo_abastecimento}"


class CondicaoHabitacional(BaseModel):
    prontuario = models.ForeignKey(
        Prontuario, on_delete=models.PROTECT, related_name="condicoes_habitacionais"
    )
    tipo_residencia = models.CharField(
        verbose_name="Tipo de residência",
        max_length=150,
        choices=TIPO_RESIDENCIA_CHOICES,
    )
    material = models.CharField(
        verbose_name="Material das paredes externas",
        max_length=150,
        choices=PAREDES_EXTERNAS_CHOICES,
        null=True,
        blank=True,
    )
    acesso_eletrico = models.CharField(
        verbose_name="Acesso à energia elétrica",
        max_length=150,
        choices=ENERGIA_ELETRICA_CHOICES,
        null=True,
        blank=True,
    )
    agua_canalizada = models.CharField(
        verbose_name="Possui água canalizada?",
        max_length=10,
        choices=SIM_NAO_CHOICES,
        null=True,
        blank=True,
    )
    abastecimento_agua = models.CharField(verbose_name="Forma de Abastecimento de água", choices=ABASTECIMENTO_CHOICES, null=True, blank=True)
    # abastecimento_agua = models.ForeignKey(
    #     AbastecimentoAgua,
    #     verbose_name="Abastecimento de água",
    #     on_delete=models.PROTECT,
    #     null=True,
    #     blank=True,
    # )
    esgotamento = models.CharField(
        verbose_name="Escoamento sanitário",
        max_length=150,
        choices=ESGOTAMENTO_SANITARIO_CHOICES,
        null=True,
        blank=True,
    )
    coleta = models.CharField(
        verbose_name="Coleta de lixo",
        max_length=150,
        choices=COLETA_CHOICES,
        null=True,
        blank=True,
    )
    total_comodos = models.IntegerField(
        verbose_name="Número total de cômodos do domicílio", default=0, null=True, blank=True
    )
    total_dormitorios = models.IntegerField(
        verbose_name="Número total de cômodos utilizados como dormitórios", default=0, null=True, blank=True
    )
    media_dormitorios = models.IntegerField(
        verbose_name="Média de pessoas por dormitório", null=True, blank=True
    )
    locomocao = models.CharField(
        verbose_name="O domicílio possui acessibilidade para pessoas com dificuldade de locomoção",
        max_length=10,
        choices=SIM_NAO_CHOICES,
        null=True,
        blank=True,
    )
    area_risco = models.CharField(
        verbose_name="O domicílio está localizado em área de risco (desabamento/alagamento)?",
        max_length=10,
        choices=SIM_NAO_CHOICES,
        null=True,
        blank=True,
    )
    dificil_acesso = models.CharField(
        verbose_name="O domicílio está em área de difícil acesso geográfico?",
        max_length=10,
        choices=SIM_NAO_CHOICES,
        null=True,
        blank=True,
    )
    area_conflito = models.CharField(
        verbose_name="O domicílio está localizado em área com conflito/violência?",
        max_length=10,
        choices=SIM_NAO_CHOICES,
        null=True,
        blank=True,
    )
    outras_observacoes = models.TextField(
        verbose_name="Observações referentes às condições habitacionais da família",
        null=True,
        blank=True,
        max_length=600
    )

    class Meta:
        verbose_name = "Condição Habitacional"
        verbose_name_plural = "Condições Habitacionais"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"
    

class CondicaoEducacionalMembro(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    membro = models.ForeignKey(MembroComposicao, verbose_name='Membro Composição', on_delete=models.PROTECT, null=True)
    escolaridade = models.CharField(verbose_name='Escolaridade', choices=ESCOLARIDADE_CHOICES, max_length=150, null=True)
    alfabetizado = models.BooleanField(verbose_name='Alfabetizado', default=True, null=True, blank=True)
    frequencia = models.CharField(verbose_name='Frequência Escolar', choices=FREQUENCIA_CHOICES, null=True, blank=True, max_length=150,)
    situacao = models.CharField(verbose_name='Situação Escolar', choices=SITUACAO_ESCOLAR_CHOICES, null=True, blank=True, max_length=150)
    observacao = models.TextField(verbose_name='Observações do membro', null=True, blank=True, max_length=600)

    class Meta:
        verbose_name = "Condição Educacional do Membro Famíliar"
        verbose_name_plural = "Condições Educacionais dos Membros Famíliares"

    def __str__(self):
        return f"Prontuário - {self.prontuario} - {self.membro.cidadao.nome}"


class DescumprimentoEducacional(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    membro = models.ForeignKey(MembroComposicao, verbose_name='Membro da família', on_delete=models.PROTECT)
    data_ocorrencia = models.DateField(verbose_name='Data da ocorrência', auto_now_add=True)
    efeito_codigo = models.CharField(verbose_name="Efeito gerado (código)", choices=EFEITO_DESCUMPRIMENTO_CHOICES, max_length=150)

    class Meta:
        verbose_name = "Descumprimento Educacional"
        verbose_name_plural = "Descumprimentos Educacional"

    def __str__(self):
        return f"Prontuário - {self.prontuario} - {self.membro.cidadao.nome}"


class CondicaoEducacional(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT, unique=True)
    condicao_educacional_membro = models.ManyToManyField(CondicaoEducacionalMembro, verbose_name='Membro', null=True, blank=True)
    # efeito_descumprimento = models.CharField(verbose_name="Efeito Aplicado", choices=EFEITO_DESCUMPRIMENTO_CHOICES, null=True, blank=True, max_length=150)
    # observacao_suspensao = models.TextField(verbose_name="Observações sobre a suspensão solicitada", null=True, blank=True)
    observacao_geral = models.TextField(verbose_name="Observações gerais da família", null=True, blank=True, max_length=600)
    descumprimento_educacional_membro = models.ManyToManyField(DescumprimentoEducacional, verbose_name='Descumprimento Educacional Membro', null=True, blank=True)

    class Meta:
        verbose_name = "Condição Educacional"
        verbose_name_plural = "Condições Educacionais"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"
    


class TrabalhoRendimentoMembro(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    membro = models.ForeignKey(MembroComposicao, verbose_name='Membro Composição', on_delete=models.PROTECT, null=True, unique=True)
    condicao_ocupacao = models.CharField(verbose_name="Condição de Ocupação", choices=CONDICAO_OCUPACAO_CHOICES, null=True, blank=True)
    vinculo_empregatico = models.CharField(verbose_name="Vínculo Empregatício", choices=VINCULO_CHOICES, null=True, blank=True)
    renda_individual = models.DecimalField(verbose_name='Renda Individual (sem benefícios sociais)', decimal_places=2, max_digits=10, null=True, blank=True)
    carteira_assinada = models.BooleanField(verbose_name='Possui Carteira de Trabalho', null=True, blank=True)
    aposentado_pensionista = models.BooleanField(verbose_name='Aposentado/Pensionista', null=True, blank=True)
    qualificacao_profissional = models.JSONField(
        verbose_name="Qualificação Profissional",
        default=list,
        blank=True,
        validators=[validate_qualificacoes],
    )
    

    class Meta:
        verbose_name = "Trabalho e Rendimento do Membro"
        verbose_name_plural = "Trabalhos e Rendimentos dos Membros"

    def __str__(self):
        return f"Prontuário - {self.prontuario} - {self.membro.cidadao.nome}"


class TransferenciaRenda(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT) 
    beneficio = models.ForeignKey(
        BeneficioSocial, verbose_name="Benefícios Socials", null=True, blank=True, on_delete=models.PROTECT
    )  
    valor = models.DecimalField(verbose_name="Valor do benefício", decimal_places=2, max_digits=10, null=True, blank=True) 


class TrabalhoRendimento(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT, unique=True)
    trabalho_rendimento_membro = models.ManyToManyField(TrabalhoRendimentoMembro, verbose_name='Membro', null=True, blank=True)
    renda_total = models.DecimalField(verbose_name="Renda total da família (Sem Benefícios)", decimal_places=2, max_digits=10, null=True, blank=True)
    renda_per_capita = models.DecimalField(verbose_name="Renda familiar per capita (Sem Benefícios)", decimal_places=2, max_digits=10, null=True, blank=True)
    transferencia_renda_familia = models.ManyToManyField(TransferenciaRenda, verbose_name="Benefícios sociais recebidos pela família", null=True, blank=True)
    parecer = models.TextField(verbose_name="Diagnóstico Situacional", null=True, blank=True, max_length=600)

    class Meta:
        verbose_name = "Trabalho e Rendimento"
        verbose_name_plural = "Trabalhos e Rendimentos"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"


class SaudeCuidadosMembro(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    membro = models.ForeignKey(MembroComposicao, verbose_name='Membro Composição', on_delete=models.PROTECT, null=True, unique=True)
    deficiencia = models.CharField(verbose_name="Possui Deficiência?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    acompanhamento = models.CharField(verbose_name="Realiza Acompanhamento Médico?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    doencas_graves = models.CharField(verbose_name="Doenças Graves e/ou Crônicas", max_length=350, null=True, blank=True)
    cuidados_terceiros = models.CharField(verbose_name="Necessita de cuidados constantes de terceiros?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    realiza_cuidados = models.CharField(verbose_name="Quem realiza os cuidados?", max_length=200, null=True, blank=True)
    remedio = models.CharField(verbose_name="Uso de remédios controlados?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    alcool = models.CharField(verbose_name="Uso abusivo de Álcool?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    drogas = models.CharField(verbose_name="Uso abusivo de Drogas?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    substancia = models.CharField(verbose_name="Qual Substância?", max_length=250, null=True, blank=True)
    tratamentos = models.TextField(verbose_name="Tratamentos atuais", null=True, blank=True, max_length=600)
    medicamentos = models.TextField(verbose_name="Medicamentos em uso", null=True, blank=True, max_length=600)
    gestante = models.CharField(verbose_name="Gestante?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    meses_gestante = models.PositiveIntegerField(verbose_name="Meses de gestação", null=True, blank=True)
    

    class Meta:
        verbose_name = "Condição de Saúde do Membro"
        verbose_name_plural = "Condições de Saúde dos Membros"

    def __str__(self):
        return f"Prontuário - {self.prontuario} - {self.membro.cidadao.nome}"


class DescumprimentoCondicionalidadesBolsa(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    membro = models.ForeignKey(MembroComposicao, verbose_name='Membro Composição', on_delete=models.PROTECT)
    data_ocorrencia = models.DateField(verbose_name="Data da Ocorrência", null=True, blank=True)
    efeito_codigo = models.CharField(verbose_name="Código Efeito", choices=EFEITO_DESCUMPRIMENTO_CHOICES, max_length=150)

    class Meta:
        verbose_name = "Descumprimento de Condicionalidades"
        verbose_name_plural = "Descumprimentos de Condicionalidades"

    def __str__(self):
        return f"Prontuário - {self.prontuario} - {self.membro.cidadao.nome}"


class CondicoesDeSaude(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    condicoes_saude_membro = models.ManyToManyField(SaudeCuidadosMembro, verbose_name='Membro', null=True, blank=True)
    descumprimento_condicionalidade = models.ManyToManyField(DescumprimentoCondicionalidadesBolsa, verbose_name='Descumprimento Saúde Membro', null=True, blank=True)
    inseguranca_alimentar = models.CharField(verbose_name="A família declara ou há indícios de insegurança alimentar por insuficiência de alimentos", choices=SIM_NAO_CHOICES, null=True, blank=True)
    observacoes = models.TextField(verbose_name="Outras observações técnicas (Diagnóstico de Saúde)", null=True, blank=True, max_length=600)

    class Meta:
        verbose_name = "Condição de Saúde"
        verbose_name_plural = "Condições de Saúde"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"


class BeneficiosEventuais(BaseModel):
    data_beneficio = models.DateField(
        verbose_name='Data do Benefício',
        null=True,
        blank=True,
        default=date.today,
    )
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    beneficio = models.CharField(verbose_name="Tipo de Benefício", choices=TIPO_BENEFICIOS, max_length=150)
    observacao = models.TextField(verbose_name="Observações e Justificativa Técnica", null=True, blank=True, max_length=600)
    registro_nascimento = models.CharField(verbose_name="Registro de nascimento", max_length=150, null=True, blank=True)
    cpf_falecido = models.CharField(verbose_name="CPF da pessoa falecida", max_length=15, null=True, blank=True)
    
    class Meta:
        verbose_name = "Benefício Eventual"
        verbose_name_plural = "Benefícios Eventuais"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"


class ConvivenviaFortalecimento(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    membro = models.ForeignKey(MembroComposicao, verbose_name='Membro da Família', on_delete=models.PROTECT)
    servico = models.CharField(verbose_name="Nome do Serviço", max_length=150)
    data_inicio = models.DateField(verbose_name="Data de Início")
    unidade_realizacao = models.CharField(verbose_name="Unidade de realização", choices=UNIDADE_REALIZACAO_CHOICES, null=True, blank=True)
    # unidade_inicial = models.ForeignKey(
    #     UnidadeCras, verbose_name="Unidade de realização", on_delete=models.PROTECT
    # )

    class Meta:
        verbose_name = "Convivenvia e Fortalecimento de Vínculo"
        verbose_name_plural = "Convivenvia e Fortalecimentos de Vínculos"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"


class BeneficiosServicos(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT, unique=True)
    beneficios_eventuais = models.ManyToManyField(BeneficiosEventuais, verbose_name='Benefícios Eventuais', null=True, blank=True)
    convivencia_e_fortalecimento = models.ManyToManyField(ConvivenviaFortalecimento, verbose_name='Convivência e Fortalecimento de Vínculos', null=True, blank=True)

    class Meta:
        verbose_name = "Benefício e Serviço"
        verbose_name_plural = "Benefícios e Serviços"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"


class ConvivenciaFamiliar(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT, unique=True)
    #HISTORICO DE RESIDENCIA
    tempo_estado = models.IntegerField(verbose_name="Há quantos anos a família mora neste estado", null=True, blank=True)
    estado = models.BooleanField(verbose_name='A família sempre morou no estado', null=True, blank=True)
    tempo_municipio = models.IntegerField(verbose_name="Há quantos anos a família mora no município", null=True, blank=True)
    municipio = models.BooleanField(verbose_name='A família sempre morou no município', null=True, blank=True)
    tempo_bairro = models.IntegerField(verbose_name="Há quantos anos a família mora no bairro atual", null=True, blank=True)
    bairro = models.BooleanField(verbose_name='A família sempre morou no bairro', null=True, blank=True)
    #VINCULOS,APOIO E ACESSO A DIREITOS
    vitima_ameaca = models.CharField(verbose_name="Vítima de ameaça ou discriminação na comunidade?", null=True, blank=True, choices=SIM_NAO_CHOICES)
    parente_proximo = models.CharField(verbose_name="Possui parentes próximos que integram rede de apoio?", null=True, blank=True, choices=SIM_NAO_CHOICES)
    vizinhos_apoio = models.CharField(verbose_name="Possui vizinhos que constituam rede de solidariedade?", null=True, blank=True, choices=SIM_NAO_CHOICES)
    grupo_religioso = models.CharField(verbose_name="Participa de grupos religiosos ou comunitários?", null=True, blank=True, choices=SIM_NAO_CHOICES)
    movimento_social = models.CharField(verbose_name="Participa de movimentos sociais, sindicatos ou defesa de interesses coletivos?", null=True, blank=True, choices=SIM_NAO_CHOICES)
    atividade_lazer_crianca = models.CharField(verbose_name="Criança ou adolescente sem acesso a lazer, recreação e convívio social?", null=True, blank=True, choices=SIM_NAO_CHOICES)
    atividade_lazer_idoso = models.CharField(verbose_name="Idoso sem acesso a lazer, recreação e convívio social?", null=True, blank=True, choices=SIM_NAO_CHOICES)
    companhia_adulto = models.CharField(verbose_name="Dependentes (crianças, idosos ou PcD) permanecem sozinhos sem acompanhante adulto?", null=True, blank=True, choices=SIM_NAO_CHOICES)
    #CONVIVENCIA E CONFLITOS
    conflitos_conjugais = models.CharField(verbose_name="Avaliação de Convivência e Conflitos nas relações conjugais", choices=PERCEPCAO_VIOLENCIA_CHOICES, null=True, blank=True)
    conflitos_responsaveis = models.CharField(verbose_name="Avaliação de Convivência e Conflitos nas relações entre pais e filhos", choices=PERCEPCAO_VIOLENCIA_CHOICES, null=True, blank=True)
    conflitos_irmaos = models.CharField(verbose_name="Avaliação de Convivência e Conflitos nas relações entre irmãos", choices=PERCEPCAO_VIOLENCIA_CHOICES, null=True, blank=True)
    conflitos_outros = models.CharField(verbose_name="Avaliação de Convivência e Conflitos nas relações envolvendo outros indivíduos que residam no domicílio", choices=PERCEPCAO_VIOLENCIA_CHOICES, null=True, blank=True)
    outras_observacoes = models.TextField(verbose_name="Parecer Técnico Consolidado", null=True, blank=True, max_length=600)

    class Meta:
        verbose_name = "Convivência familiar e comunitária"
        verbose_name_plural = "Convivências familiares e comunitárias"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"
    

class AcompanhamentoCreas(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    data_inicio = models.DateField(verbose_name="Data Início")
    data_final = models.DateField(verbose_name="Data Final", null=True, blank=True)
    identificao_creas = models.CharField(verbose_name="Identificação do Creas", max_length=250)

    class Meta:
        verbose_name = "Acompanhamento Creas"
        verbose_name_plural = "Acompanhamentos Creas"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"    



class SituacaoViolencia(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT, unique=True)
    #INFANCIA E JUVENTUDE
    trabalho_infantil = models.CharField(verbose_name="Membro da família em situação de trabalho infantil", choices=SIM_NAO_CHOICES, null=True, blank=True)
    negligencia = models.CharField(verbose_name="Alguma criança da família sofreu negligência", choices=SIM_NAO_CHOICES, null=True, blank=True)
    situacao_trabalho_rua = models.CharField(verbose_name="Membro da família em situação de trabalho na rua", choices=SIM_NAO_CHOICES, null=True, blank=True)
    #VIOLENCIA E ABUSO
    exploracao_sexual = models.CharField(verbose_name="Vítima de exploração sexual?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    violencia_sexual = models.CharField(verbose_name="Vítima de abuso ou violência sexual?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    violencia_fisica = models.CharField(verbose_name="Vítima de violência física?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    violencia_psicologica = models.CharField(verbose_name="Vítima de violência psicológica?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    trafico_pessoa = models.CharField(verbose_name="Vítima de tráfico de pessoas?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    #IDOSOS E PCD
    idoso_negligencia = models.CharField(verbose_name="Idoso da família sofreu negligência?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    deficiente_negligencia = models.CharField(verbose_name="Pessoa com deficiência sofreu negligência?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    violencia_patrimonial = models.CharField(verbose_name="Vítima de violência patrimonial (Idoso ou PCD)?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    violencia_vivenciada  = models.CharField(verbose_name="Outra forma de violência vivenciada?", choices=SIM_NAO_CHOICES, null=True, blank=True)
    acompanhamento_creas = models.ManyToManyField(AcompanhamentoCreas, verbose_name='AcompanhamentoCreas', null=True, blank=True)
    observacao = models.TextField(verbose_name="Observações do Diagnóstico de Violência", null=True, blank=True, max_length=600)

    class Meta:
        verbose_name = "Situação de violência"
        verbose_name_plural = "Situações de violência"

    def __str__(self):
        return f"Prontuário - {self.prontuario}"  


class AcolhimentoFamiliar(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    membro = models.ForeignKey(MembroComposicao, verbose_name='Membro da Família', on_delete=models.PROTECT)
    data_entrada = models.DateField(verbose_name="Data de Entrada")
    data_saida = models.DateField(verbose_name="Data de Saída", null=True, blank=True)
    motivo = models.CharField(verbose_name="Motivo principal do acolhimento", max_length=250)
    detalhe = models.TextField(verbose_name="Detalhamento/Contexto", null=True, blank=True, max_length=600)

    class Meta:
        verbose_name = "Acolhimento Famíliar"
        verbose_name_plural = "Acolhimentos Familiares"

    def __str__(self):
        return f"Prontuário - {self.prontuario}" 


class AcolhimentoInstitucional(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT, unique=True)
    acolhimento_familiar = models.ManyToManyField(AcolhimentoFamiliar, verbose_name='Acolhimento Familiar', null=True, blank=True)
    perda_domicilio = models.TextField(verbose_name="Descrição da Perda de Domícilio (Catástrofe ou Fatalidade)", max_length=600, null=True, blank=True)
    guarda_terceiros = models.TextField(verbose_name="Descrição da situação de Criança/Adolescente sob guarda de terceiros", max_length=600, null=True, blank=True)
    adulto_prisional = models.BooleanField(verbose_name="Algum membro adulto está em instituição prisional", null=True, blank=True)
    adolescente_internacao = models.BooleanField(verbose_name="Algum adolescente cumpre medida socioeducativa de internação.", null=True, blank=True)
    observacao = models.TextField(verbose_name="Observações finais do Diagnóstico", max_length=600, null=True, blank=True)

    class Meta:
        verbose_name = "Acolhimento Institucional"
        verbose_name_plural = "Acolhimentos Institucionais"

    def __str__(self):
        return f"Prontuário - {self.prontuario}" 


class AnotacaoPlanejamento(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    anotacao = models.TextField(verbose_name="Anotação de Planejamento", max_length=600)
    tecnico_responsavel = models.ForeignKey(Usuario, verbose_name="Técnico responsável", on_delete=models.PROTECT)

    class Meta:
        verbose_name = "Anotação de Planejamento"
        verbose_name_plural = "Anotações de Planejamentos"

    def __str__(self):
        return f"Prontuário - {self.prontuario}" 


class NovoIngresso(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    data_ingresso = models.DateField(verbose_name="Data de Ingresso")
    motivo = models.CharField(verbose_name="Motivo/Forma de Ingresso", max_length=250)
    observacoes = models.TextField(verbose_name="Observações do Ingresso", max_length=600, null=True, blank=True)

    class Meta:
        verbose_name = "Novo Ingresso"
        verbose_name_plural = "Novos Ingressos"

    def __str__(self):
        return f"Prontuário - {self.prontuario}" 


class RegistroDesligamento(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    data_desligamento = models.DateField(verbose_name="Data de Desligamento")
    motivo = models.CharField(verbose_name="Motivo do Desligamento", choices=MOTIVO_DESLIGAMENTO_CHOICES, max_length=250)
    observacoes = models.TextField(verbose_name="Observações do Desligamento", max_length=600, null=True, blank=True)

    class Meta:
        verbose_name = "Registro de Desligamento"
        verbose_name_plural = "Registros de Desligamento"

    def clean(self):
        super().clean()

        if not self.prontuario_id:
            return

        novo_ingresso = NovoIngresso.objects.filter(prontuario=self.prontuario).first()
        if not novo_ingresso:
            raise ValidationError(
                {"prontuario": "Só é possível registrar desligamento após um novo ingresso."}
            )

        if (
            self.data_desligamento
            and novo_ingresso.data_ingresso
            and self.data_desligamento < novo_ingresso.data_ingresso
        ):
            raise ValidationError(
                {
                    "data_desligamento": (
                        "A data de desligamento não pode ser menor que a data de ingresso "
                        f"({novo_ingresso.data_ingresso:%d/%m/%Y})."
                    )
                }
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Prontuário - {self.prontuario}" 


class EvolucaoAcompanhamento(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT, unique=True)
    anotacao_acompanhamento = models.ManyToManyField(AnotacaoPlanejamento, verbose_name="Nova Anotação de Planejamento", null=True, blank=True)
    novo_ingresso = models.ManyToManyField(NovoIngresso, verbose_name="Novos Ingressos", null=True, blank=True)
    registros_desligamentos = models.ManyToManyField(RegistroDesligamento, verbose_name="Registros de Desligamentos", null=True, blank=True)

    class Meta:
        verbose_name = "Evolução do Acompanhamento"
        verbose_name_plural = "Evoluções do Acompanhamento"

    def __str__(self):
        return f"Prontuário - {self.prontuario}" 


class AvaliacaoAcompanhamentoFamiliar(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT, unique=True)
    ofertas_assistencia = models.CharField(verbose_name="Foram efetivamente disponibilizadas para a família/indivíduo todas as ofertas da Assistência Social cuja necessidade havia sido identificada pelo profissional", choices=OFERTA_ASSISTENCIA_CHOICES, null=True, blank=True, max_length=150)
    encaminhamentos = models.CharField(verbose_name="Em relação aos encaminhamentos da família/indivíduo para demais políticas, houve atendimento efetivo e resolutivo por parte da área que recebeu o encaminhamento", choices=ENCAMINHAMENTOS_CHOICES, null=True, blank=True, max_length=150)
    vinculo_familia = models.CharField(verbose_name="A família reconhece o Serviço de Acompanhamento como algo que contribui para o enfrentamento de seus problemas e dificuldades e deseja continuar recebendo atenções deste serviço", choices=VINCULO_FAMILIAR_CHOICES, null=True, blank=True, max_length=150)
    status = models.CharField(verbose_name="Como você classifica os resultados obtidos quanto a ampliação da capacidade de enfrentamento ou superação das condições de vulnerabilidade e risco social e pessoal", choices=STATUS_VUNERABILIDADE, null=True, blank=True, max_length=150)
    analise = models.TextField(verbose_name="Descreva os principais ganhos, potencialidades desenvolvidas e fatores que dificultaram o processo.", null=True, blank=True, max_length=600)

    class Meta:
        verbose_name = "Avaliação Acompanhamento Famíliar"
        verbose_name_plural = "Avaliações Acompanhamento Familiares"

    def __str__(self):
        return f"Prontuário - {self.prontuario}" 


class MedidaSocioEducativaMembro(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    membro = models.ForeignKey(MembroComposicao, verbose_name='Membro Composição', on_delete=models.PROTECT, null=True, unique=True)
    tipo_medida = models.CharField(verbose_name="Tipo de Medida Socio Educativa", choices=MEDIDA_CHOICES, max_length=200, null=True, blank=True)
    data_inicio = models.DateField(verbose_name="Data de Início", null=True, blank=True)
    data_termino = models.DateField(verbose_name="Data de Término", null=True, blank=True)
    numero_processo = models.CharField(verbose_name="Número do processo", max_length=200, null=True, blank=True)
    

    class Meta:
        verbose_name = "Medida Socio Educativa Membro"
        verbose_name_plural = "Medidas Socio Educativas Membros"

    def __str__(self):
        return f"Prontuário {self.prontuario}"


class AcompanhamentoLAPSC(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT)
    membro = models.ForeignKey(MedidaSocioEducativaMembro, verbose_name='Membro Composição', on_delete=models.PROTECT, null=True, unique=True)
    acompanhado = models.CharField(verbose_name="Acompanhado pelo CRAS", max_length=10, choices=SIM_NAO_CHOICES, null=True, blank=True)
    data_anotacao = models.DateField(verbose_name="Data da anotação", null=True, blank=True)
    observação = models.TextField(verbose_name="Observação", max_length=900, null=True, blank=True)
    
    class Meta:
        verbose_name = "Acompanhamento LA PSC"
        verbose_name_plural = "Acompanhamentos LA PSC"

    def __str__(self):
        return f"Prontuário {self.prontuario}"


class MedidaSocioEducativa(BaseModel):
    prontuario = models.ForeignKey(Prontuario, verbose_name='Prontuário', on_delete=models.PROTECT, unique=True)
    membro_socio_educativo = models.ManyToManyField(MedidaSocioEducativaMembro, verbose_name='Membro SocioEducativo', null=True, blank=True)
    acompanhamento_LAPSC_membro = models.ManyToManyField(AcompanhamentoLAPSC, verbose_name='Membro Acompanhamento', null=True, blank=True)
    contatos_PSC = models.TextField(verbose_name="Registros dos contatos do local de prestação e do orientador responsável", null=True, blank=True, max_length=600)

    class Meta:
        verbose_name = "Medida Socio Educativa"
        verbose_name_plural = "Medidas Socio Educativas"

    def __str__(self):
        return f"Prontuário {self.prontuario}"
