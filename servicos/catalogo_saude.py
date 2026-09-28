"""Catálogo padrão de serviços do posto de saúde.

Fonte única para o comando `carregar_catalogo_saude` e para os fixtures em Collection/.
Os IDs são derivados do nome (uuid5), então recarregar o catálogo é idempotente.
"""

import uuid

from app.static_data import GRUPO_ENFERMEIRO, GRUPO_MEDICO, GRUPO_SUPERVISOR

_NAMESPACE = uuid.UUID("6f1c2b1e-7c0a-4a55-9a0e-5b1f3d2c8e41")


def gerar_id(prefixo, nome):
    return uuid.uuid5(_NAMESPACE, f"{prefixo}:{nome}")


ATENCAO_BASICA = "Atenção Básica"
SAUDE_MULHER = "Saúde da Mulher"
SAUDE_CRIANCA = "Saúde da Criança"
DOENCAS_CRONICAS = "Doenças Crônicas"
SAUDE_MENTAL = "Saúde Mental"
IMUNIZACAO = "Imunização"
PROCEDIMENTOS = "Procedimentos de Enfermagem"
APOIO_DIAGNOSTICO = "Apoio Diagnóstico"
ASSISTENCIA_FARMACEUTICA = "Assistência Farmacêutica"

CLASSES = [
    (ATENCAO_BASICA, "Atendimento geral de porta de entrada do posto."),
    (SAUDE_MULHER, "Pré-natal, prevenção e saúde reprodutiva."),
    (SAUDE_CRIANCA, "Puericultura e atendimento pediátrico."),
    (DOENCAS_CRONICAS, "Acompanhamento de hipertensão, diabetes e outras condições crônicas."),
    (SAUDE_MENTAL, "Acolhimento e acompanhamento em saúde mental."),
    (IMUNIZACAO, "Aplicação de vacinas do calendário nacional e campanhas."),
    (PROCEDIMENTOS, "Curativos, administração de medicamentos e outros procedimentos."),
    (APOIO_DIAGNOSTICO, "Testes rápidos e exames realizados no posto."),
    (ASSISTENCIA_FARMACEUTICA, "Entrega de medicamentos e orientação farmacêutica."),
]

CONSULTA_MEDICA = "Consulta Médica"
CONSULTA_ENFERMAGEM = "Consulta de Enfermagem"
PROCEDIMENTO_ENFERMAGEM = "Procedimento de Enfermagem"
DISPENSACAO = "Dispensação de Medicamentos"

# (nome, descrição, tempo de atendimento em minutos). Cada tipo corresponde a uma categoria profissional.
TIPOS = [
    (CONSULTA_MEDICA, "Atendimento realizado por médico.", 20),
    (CONSULTA_ENFERMAGEM, "Atendimento realizado por enfermeiro.", 20),
    (PROCEDIMENTO_ENFERMAGEM, "Procedimentos técnicos realizados pela enfermagem.", 15),
    (DISPENSACAO, "Entrega de medicamentos do estoque do posto.", 10),
]

TIPOS_POR_GRUPO = {
    GRUPO_MEDICO: [CONSULTA_MEDICA],
    GRUPO_ENFERMEIRO: [CONSULTA_ENFERMAGEM, PROCEDIMENTO_ENFERMAGEM],
    GRUPO_SUPERVISOR: [DISPENSACAO],
}

AGENDAMENTO = "AGENDAMENTO"
ENCAMINHAMENTO = "ENCAMINHAMENTO"

# (nome, classe, tipo, tipo_marcacao, gera_receita, envolve_dispensacao)
# ENCAMINHAMENTO = não é marcado pela recepção; é registrado como serviço adicional durante outro atendimento.
SERVICOS = [
    ("Consulta Clínica Geral", ATENCAO_BASICA, CONSULTA_MEDICA, AGENDAMENTO, True, False),
    ("Consulta Pediátrica", SAUDE_CRIANCA, CONSULTA_MEDICA, AGENDAMENTO, True, False),
    ("Consulta Ginecológica", SAUDE_MULHER, CONSULTA_MEDICA, AGENDAMENTO, True, False),
    ("Pré-natal - Consulta Médica", SAUDE_MULHER, CONSULTA_MEDICA, AGENDAMENTO, True, False),
    ("Hipertensão e Diabetes - Consulta Médica", DOENCAS_CRONICAS, CONSULTA_MEDICA, AGENDAMENTO, True, False),
    ("Consulta em Saúde Mental", SAUDE_MENTAL, CONSULTA_MEDICA, AGENDAMENTO, True, False),
    ("Renovação de Receita de Uso Contínuo", DOENCAS_CRONICAS, CONSULTA_MEDICA, AGENDAMENTO, True, False),
    ("Consulta de Enfermagem", ATENCAO_BASICA, CONSULTA_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Pré-natal - Consulta de Enfermagem", SAUDE_MULHER, CONSULTA_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Puericultura (Crescimento e Desenvolvimento)", SAUDE_CRIANCA, CONSULTA_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Coleta de Exame Preventivo (Citopatológico)", SAUDE_MULHER, CONSULTA_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Hipertensão e Diabetes - Consulta de Enfermagem", DOENCAS_CRONICAS, CONSULTA_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Acolhimento e Classificação de Risco", ATENCAO_BASICA, PROCEDIMENTO_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Aplicação de Vacina", IMUNIZACAO, PROCEDIMENTO_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Curativo", PROCEDIMENTOS, PROCEDIMENTO_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Retirada de Pontos", PROCEDIMENTOS, PROCEDIMENTO_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Teste Rápido (HIV, Sífilis e Hepatites)", APOIO_DIAGNOSTICO, PROCEDIMENTO_ENFERMAGEM, AGENDAMENTO, False, False),
    ("Aferição de Pressão Arterial", PROCEDIMENTOS, PROCEDIMENTO_ENFERMAGEM, ENCAMINHAMENTO, False, False),
    ("Teste de Glicemia Capilar", APOIO_DIAGNOSTICO, PROCEDIMENTO_ENFERMAGEM, ENCAMINHAMENTO, False, False),
    ("Administração de Medicamento Injetável", PROCEDIMENTOS, PROCEDIMENTO_ENFERMAGEM, ENCAMINHAMENTO, False, False),
    ("Nebulização", PROCEDIMENTOS, PROCEDIMENTO_ENFERMAGEM, ENCAMINHAMENTO, False, False),
    ("Dispensação de Medicamentos com Receita", ASSISTENCIA_FARMACEUTICA, DISPENSACAO, AGENDAMENTO, False, True),
    ("Dispensação de Medicamento de Uso Contínuo", ASSISTENCIA_FARMACEUTICA, DISPENSACAO, AGENDAMENTO, False, True),
]
