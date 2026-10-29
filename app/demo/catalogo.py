from app.static_data import (
    GRUPO_ADMINISTRADOR, GRUPO_ENFERMEIRO, GRUPO_FARMACEUTICO,
    GRUPO_MEDICO, GRUPO_SUPERVISOR,
)

TAG = "[DEMO]"
DOMINIO = "demo.saude.local"

# Coordenadas apenas para simulação visual; não representam postos reais.
UNIDADES = [
    ("Centro", -3.7319, -38.5267),
    ("Sul", -3.789, -38.55),
    ("Leste", -3.755, -38.49),
    ("Oeste", -3.756, -38.595),
    ("Norte", -3.713, -38.565),
    ("Messejana", -3.832, -38.485),
    ("Parangaba", -3.777, -38.565),
    ("Sem localização", None, None),
]

MEDICAMENTOS = [
    ("Dipirona", "500", "COMPRIMIDO"),
    ("Paracetamol", "750", "COMPRIMIDO"),
    ("Losartana", "50", "COMPRIMIDO"),
    ("Metformina", "500", "COMPRIMIDO"),
    ("Amoxicilina", "500", "CAPSULA"),
    ("Ibuprofeno", "400", "COMPRIMIDO"),
    ("Omeprazol", "20", "CAPSULA"),
    ("Enalapril", "10", "COMPRIMIDO"),
    ("Dipirona", "1000", "COMPRIMIDO"),
    ("Amoxicilina", "250", "CAPSULA"),
]

PERFIS = {
    "admin": GRUPO_ADMINISTRADOR,
    "gestor": "gestor",
    "supervisor": GRUPO_SUPERVISOR,
    "coordenador": "coordenador",
    "recepcionista": "Recepcionista",
    "medico": GRUPO_MEDICO,
    "enfermeiro": GRUPO_ENFERMEIRO,
    "farmaceutico": GRUPO_FARMACEUTICO,
}

LEITURA_COMUM = {
    "view_agendamento", "view_agendavaga", "view_chamadapainel", "view_cidadao",
    "view_unidadeposto", "view_guiche", "view_usuario", "view_servico",
    "view_tiposervico", "view_classeservico", "view_bairro", "view_filaespera",
    "view_servicounidadeposto", "view_escalatrabalho",
}
LEITURA_ESTOQUE = {"view_medicamento", "view_lotemedicamento", "view_movimentacaoestoque"}
RECEITAS = {"view_receita", "view_receitamedicamento"}

# Permissões diretas dos usuários sintéticos. Os grupos existentes não são alterados.
EXTRAS_POR_PERFIL = {
    "admin": set(),
    "gestor": set(),
    "supervisor": LEITURA_ESTOQUE | RECEITAS | {
        "change_agendamento", "add_agendamento", "add_filaespera", "change_filaespera",
        "add_lotemedicamento", "change_lotemedicamento", "add_movimentacaoestoque", "change_guiche",
    },
    "coordenador": LEITURA_ESTOQUE | {
        "add_usuario", "change_usuario", "add_escalatrabalho", "change_escalatrabalho",
        "add_guiche", "change_guiche", "delete_guiche", "add_servicounidadeposto",
        "change_servicounidadeposto", "delete_servicounidadeposto", "view_bloqueiohorario",
        "add_bloqueiohorario", "change_bloqueiohorario", "delete_bloqueiohorario",
        "add_lotemedicamento", "change_lotemedicamento", "add_movimentacaoestoque",
    },
    "medico": LEITURA_ESTOQUE | RECEITAS | {
        "change_agendamento", "add_receita", "change_receita", "view_registroatendimento",
        "add_registroatendimento", "change_registroatendimento",
    },
    "enfermeiro": LEITURA_ESTOQUE | RECEITAS | {
        "change_agendamento", "view_registroatendimento", "add_registroatendimento", "change_registroatendimento",
    },
    "recepcionista": {
        "add_cidadao", "change_cidadao", "add_agendamento", "change_agendamento",
        "add_filaespera", "change_filaespera",
    },
    "farmaceutico": LEITURA_ESTOQUE | RECEITAS | {"change_agendamento", "add_movimentacaoestoque"},
}
