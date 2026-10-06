GRUPO_MEDICO = "Médico"
GRUPO_ENFERMEIRO = "Enfermeiro"
GRUPO_SUPERVISOR = "Supervisor"
GRUPO_ADMINISTRADOR = "administrador"
GRUPOS_PROFISSIONAIS_SAUDE = [GRUPO_MEDICO, GRUPO_ENFERMEIRO]

FORMA_FARMACEUTICA_CHOICES = [
    ("COMPRIMIDO", "Comprimido"),
    ("COMPRIMIDO_ORODISPERSIVEL", "Comprimido orodispersível"),
    ("COMPRIMIDO_SOLUVEL", "Comprimido solúvel"),
    ("COMPRIMIDO_LIB_RETARDADA", "Comprimido de liberação retardada"),
    ("CAPSULA", "Cápsula"),
    ("DRAGEA", "Drágea"),
    ("SOLUCAO_ORAL", "Solução oral"),
    ("SUSPENSAO_ORAL", "Suspensão oral"),
    ("XAROPE", "Xarope"),
    ("GOTAS", "Gotas"),
    ("SOLUCAO_INJETAVEL", "Solução injetável"),
    ("PO_SOLUCAO_INJETAVEL", "Pó para solução injetável"),
    ("SUSPENSAO_INJETAVEL", "Suspensão injetável"),
    ("PO_SUSP_INJETAVEL", "Pó para suspensão injetável"),
    ("SOL_INJETAVEL_5ML", "Solução injetável 5 mL"),
    ("SOL_INJETAVEL_10ML", "Solução injetável 10 mL"),
    ("SOL_INJETAVEL_100ML", "Solução injetável 100 mL"),
    ("SOL_INJETAVEL_500ML", "Solução injetável 500 mL"),
    ("POMADA", "Pomada"),
    ("CREME", "Creme"),
    ("CREME_VAGINAL", "Creme vaginal"),
    ("GEL", "Gel"),
    ("COLIRIO", "Colírio"),
    ("SPRAY", "Spray"),
    ("AEROSSOL", "Aerossol"),
    ("SUPOSITORIO", "Supositório"),
    ("ADESIVO", "Adesivo"),
    ("PO", "Pó"),
    ("GOMA_MASCAR", "Goma de mascar"),
    ("PASTILHA", "Pastilha"),
    ("PRESERVATIVO_160X49", "Preservativo 160 mm x 49 mm"),
    ("PRESERVATIVO_160X52", "Preservativo 160 mm x 52 mm"),
    ("OUTRO", "Outro"),
]

UNIDADE_MEDIDA_CHOICES = [
    ("MG", "mg"),
    ("G", "g"),
    ("MCG", "mcg"),
    ("ML", "mL"),
    ("MG_ML", "mg/mL"),
    ("MG_G", "mg/g"),
    ("UI", "UI"),
    ("UI_ML", "UI/mL"),
    ("PERCENTUAL", "%"),
    ("NAO_SE_APLICA", "Não se aplica / não identificada"),
]

TIPO_MOVIMENTACAO_ENTRADA = "ENTRADA"
TIPO_MOVIMENTACAO_SAIDA = "SAIDA"
TIPO_MOVIMENTACAO_AJUSTE = "AJUSTE"
TIPO_MOVIMENTACAO_PERDA = "PERDA"

TIPO_MOVIMENTACAO_CHOICES = [
    (TIPO_MOVIMENTACAO_ENTRADA, "Entrada"),
    (TIPO_MOVIMENTACAO_SAIDA, "Saída/Dispensação"),
    (TIPO_MOVIMENTACAO_AJUSTE, "Ajuste de inventário"),
    (TIPO_MOVIMENTACAO_PERDA, "Perda/Descarte"),
]

CLASSIFICACAO_RISCO_CHOICES = [
    ("VERMELHO", "Vermelho - Emergência"),
    ("LARANJA", "Laranja - Muito urgente"),
    ("AMARELO", "Amarelo - Urgente"),
    ("VERDE", "Verde - Pouco urgente"),
    ("AZUL", "Azul - Não urgente"),
]

STATUS_DISPENSACAO_PENDENTE = "PENDENTE"
STATUS_DISPENSACAO_PARCIAL = "PARCIAL"
STATUS_DISPENSACAO_DISPENSADO = "DISPENSADO"

STATUS_DISPENSACAO_CHOICES = [
    (STATUS_DISPENSACAO_PENDENTE, "Pendente"),
    (STATUS_DISPENSACAO_PARCIAL, "Dispensado parcialmente"),
    (STATUS_DISPENSACAO_DISPENSADO, "Dispensado"),
]

VIA_ADMINISTRACAO_CHOICES = [
    ("ORAL", "Oral"),
    ("SUBLINGUAL", "Sublingual"),
    ("INTRAVENOSA", "Intravenosa"),
    ("INTRAMUSCULAR", "Intramuscular"),
    ("SUBCUTANEA", "Subcutânea"),
    ("TOPICA", "Tópica"),
    ("OFTALMICA", "Oftálmica"),
    ("OTOLOGICA", "Otológica"),
    ("NASAL", "Nasal"),
    ("INALATORIA", "Inalatória"),
    ("RETAL", "Retal"),
    ("VAGINAL", "Vaginal"),
    ("TRANSDERMICA", "Transdérmica"),
    ("NAO_INFORMADA", "Não informada"),
]

TIPO_MARCACAO_AGENDAMENTO = "AGENDAMENTO"

TIPO_MARCACAO_CHOICES = [
    ("AGENDAMENTO", "Atendimento por agendamento"),
    ("ENCAMINHAMENTO", "Atendimento por encaminhamento interno"),
]

SIGLA_ESTADO_CHOICES = [
    ("AC", "AC"),
    ("AL", "AL"),
    ("AP", "AP"),
    ("AM", "AM"),
    ("BA", "BA"),
    ("CE", "CE"),
    ("DF", "DF"),
    ("ES", "ES"),
    ("GO", "GO"),
    ("MA", "MA"),
    ("MT", "MT"),
    ("MS", "MS"),
    ("MG", "MG"),
    ("PA", "PA"),
    ("PB", "PB"),
    ("PR", "PR"),
    ("PE", "PE"),
    ("PI", "PI"),
    ("RJ", "RJ"),
    ("RN", "RN"),
    ("RS", "RS"),
    ("RO", "RO"),
    ("RR", "RR"),
    ("SC", "SC"),
    ("SP", "SP"),
    ("SE", "SE"),
    ("TO", "TO"),
]

DIA_SEMANA_CHOICES = [
    ("DOM", "Domingo"),
    ("SEG", "Segunda-feira"),
    ("TER", "Terça-feira"),
    ("QUA", "Quarta-feira"),
    ("QUI", "Quinta-feira"),
    ("SEX", "Sexta-feira"),
    ("SAB", "Sábado"),
]

SITUACAO_AGENDAMENTO_CHOICES = [
    ("AGENDADO", "Atendimento Agendado"),
    ("CANCELADO_CIDADAO", "Cancelado pelo Cidadão"),
    ("CANCELADO_CRAS", "Cancelado pelo Cras"),
    ("AUSENCIA_CIDADAO", "Ausência do Cidadão"),
    ("ATIVADO", "Ativado"),
    ("ATENDIMENTO", "Em Atendimento"),
    ("CHAMANDO", "Chamando"),
    ("ATIVADO_AUSENTE", "Ativado, mas não compareceu"),
    ("AGUARDANDO_FILA", "Aguardando"),
    ("FINALIZADO", "Finalizado"),
]

SEXO_CHOICES = [
    ("MASCULINO", "Masculino"),
    ("FEMININO", "Feminino"),
    ("OUTRO", "Outro"),
]

PRIORIDADE_CHOICES = [
    ("NORMAL", "Normal"),
    ("PREFERENCIAL", "Preferencial"),
    ("PREFERENCIAL+", "Preferencial 80+"),
]

ORIGEM_CHOICES = [
    ("156", "Central 156"),
    ("RECEPCAO", "Recepção Cras"),
    ("SITE", "Site"),
    ("FILA", "Fila de Espera"),
]


URGENCIA_ATENDIMENTO_CHOICES = [("ALTA", "Alta"), ("NORMAL", "Normal/Sem Urgência")]


STATUS_FINAL_ATENDIMENTO_CHOICES = [
    ("REALIZADO", "Realizado"),
    ("NAO_REALIZADO_REQUISITO", "Não Realizado - Pré-requisito"),
    ("NAO_REALIZADO_RECUSA", "Não Realizado - Recusa do Cidadão"),
    ("NAO_REALIZADO_RECURSO", "Não Realizado - Indisponibilidade de Recurso"),
    ("CANCELADO", "Cancelado")
]


QUALIFICACAO_CHOICES = [
    ("NAO_POSSUI", "Não Possui"),
    ("TECNICO", "Curso Técnico"),
    ("PROFISSIONALIZANTE", "Profissionalizante"),
    ("SUPERIOR", "Superior")
]

DOENCAS_CHOICES = [
    ("DIABETES", "Diabetes"),
    ("HIPERTENSAO", "Hipertensão"),
    ("HIV/AIDS", "HIV/AIDS"),
    ("CANCER", "Câncer"),
    ("CARDIOPATIA", "Cardiopatia")
]


