"""Carga com aparência de operação real, sem marcações de demonstração.

Reaproveita o motor de `CargaDemonstracao` (IDs estáveis, histórico coerente entre agenda, prontuário,
receitas e estoque) e troca os textos: nomes de pessoas, UAPS com nomes de bairros de Fortaleza,
CPF/CNS válidos, queixas coerentes com o CID, posologias e lotes plausíveis. Todos os dados continuam
fictícios. Os IDs usam outro namespace, então convivem com uma carga [DEMO] sem colidir.
"""

import random
import unicodedata
from datetime import datetime, time, timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import ProtectedError, Q

from agendamentos.models import AgendaVaga, Agendamento, ChamadaPainel
from app.models import Bairro
from cidadaos.models import Cidadao
from fila_espera.models import FilaEspera
from medicamentos.management.commands.popular_estoque import MEDICAMENTOS as CATALOGO_FARMACIA
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from prontuario.models import Receita, ReceitaMedicamento, RegistroAtendimento
from servicos.catalogo_saude import CLASSES, SERVICOS, TIPOS
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import BloqueioHorario, Guiche, ServicoUnidadePosto, UnidadePosto
from usuarios.models import EscalaTrabalho, Usuario
from .carga import CargaDemonstracao, cpf_sintetico
from .catalogo import PERFIS, TAG
from .territorio import bairros_do_mapa

NAMESPACE_REALISTA = "saude-perto:operacao:v1"
LIMITE_CIDADAOS = 20000

# (chave, bairro onde fica a UAPS, coordenada de reserva se o GeoJSON não estiver no projeto)
UNIDADES = [
    ("centro", "Centro", -3.7275, -38.5275),
    ("messejana", "Messejana", -3.8310, -38.4920),
    ("parangaba", "Parangaba", -3.7760, -38.5640),
    ("aldeota", "Aldeota", -3.7360, -38.5000),
    ("barra-do-ceara", "Barra do Ceará", -3.6960, -38.5850),
    ("montese", "Montese", -3.7640, -38.5400),
    ("bom-jardim", "Bom Jardim", -3.7950, -38.6140),
    ("jangurussu", "Jangurussu", -3.8430, -38.5160),
]

# Serviços agendáveis e o peso de cada um na demanda de uma UAPS.
SERVICOS_PESOS = {
    "Consulta Clínica Geral": 22,
    "Consulta Pediátrica": 7,
    "Consulta Ginecológica": 5,
    "Pré-natal - Consulta Médica": 4,
    "Hipertensão e Diabetes - Consulta Médica": 10,
    "Renovação de Receita de Uso Contínuo": 8,
    "Consulta de Enfermagem": 8,
    "Puericultura (Crescimento e Desenvolvimento)": 5,
    "Coleta de Exame Preventivo (Citopatológico)": 4,
    "Hipertensão e Diabetes - Consulta de Enfermagem": 5,
    "Aplicação de Vacina": 9,
    "Curativo": 4,
    "Dispensação de Medicamentos com Receita": 9,
}
SO_MULHERES = {"Consulta Ginecológica", "Pré-natal - Consulta Médica", "Coleta de Exame Preventivo (Citopatológico)"}
GESTANTES = {"Pré-natal - Consulta Médica"}
CRIANCAS = {"Consulta Pediátrica", "Puericultura (Crescimento e Desenvolvimento)"}
CRONICOS = {"Hipertensão e Diabetes - Consulta Médica", "Hipertensão e Diabetes - Consulta de Enfermagem",
            "Renovação de Receita de Uso Contínuo"}

MEDICAMENTOS_DA_REDE = [
    ("Losartana Potássica", "50"), ("Hidroclorotiazida", "25"), ("Anlodipino", "5"), ("Metformina", "850"),
    ("Glibenclamida", "5"), ("Sinvastatina", "20"), ("Paracetamol", "500"), ("Dipirona Sódica", "500"),
    ("Ibuprofeno", "600"), ("Amoxicilina", "500"), ("Azitromicina", "500"), ("Omeprazol", "20"),
    ("Loratadina", "10"), ("Sulfato Ferroso", "40"),
]

# (frequência, duração) por princípio ativo.
POSOLOGIAS = {
    "losartana": ("1 comprimido 1 vez ao dia", "30 dias"),
    "hidroclorotiazida": ("1 comprimido pela manhã", "30 dias"),
    "anlodipino": ("1 comprimido 1 vez ao dia", "30 dias"),
    "metformina": ("1 comprimido 2 vezes ao dia, após as refeições", "30 dias"),
    "glibenclamida": ("1 comprimido antes do café da manhã", "30 dias"),
    "sinvastatina": ("1 comprimido à noite", "30 dias"),
    "paracetamol": ("1 comprimido de 6 em 6 horas, se dor ou febre", "5 dias"),
    "dipirona": ("1 comprimido de 6 em 6 horas, se dor ou febre", "3 dias"),
    "ibuprofeno": ("1 comprimido de 8 em 8 horas, após as refeições", "5 dias"),
    "amoxicilina": ("1 cápsula de 8 em 8 horas", "7 dias"),
    "azitromicina": ("1 comprimido 1 vez ao dia", "3 dias"),
    "omeprazol": ("1 cápsula em jejum", "30 dias"),
    "loratadina": ("1 comprimido 1 vez ao dia", "7 dias"),
    "sulfato ferroso": ("1 comprimido 1 vez ao dia, longe das refeições", "60 dias"),
}

QUEIXAS = {
    "J06.9": ["Dor de garganta, coriza e febre baixa há 3 dias.", "Tosse seca e congestão nasal há 4 dias.",
              "Febre e dor no corpo desde ontem.", "Espirros, coriza e dor de garganta."],
    "I10": ["Retorno para acompanhamento da pressão arterial.", "Dor na nuca e pressão alta aferida em casa.",
            "Controle da hipertensão; refere uso regular da medicação."],
    "E11.9": ["Acompanhamento do diabetes; traz registro das glicemias.", "Muita sede e cansaço nas últimas semanas.",
              "Controle glicêmico; refere dieta irregular."],
    "R51": ["Dor de cabeça frequente há uma semana.", "Cefaleia frontal que piora no fim do dia."],
    "M54.5": ["Dor lombar após esforço no trabalho.", "Dor nas costas há 10 dias, sem melhora com repouso."],
    "Z00.0": ["Consulta de rotina, sem queixas.", "Check-up e solicitação de exames de rotina.",
              "Avaliação geral; paciente assintomático."],
    "N39.0": ["Ardência ao urinar e vontade frequente de urinar há 2 dias.", "Dor ao urinar e urina escura."],
    "K29.7": ["Queimação no estômago após as refeições.", "Azia e má digestão há duas semanas."],
    "F41.1": ["Ansiedade, insônia e palpitações nas últimas semanas.", "Nervosismo constante e dificuldade para dormir."],
    "A09": ["Diarreia e cólica abdominal desde ontem.", "Vômitos e evacuações líquidas há 1 dia."],
    "Z34.9": ["Pré-natal de rotina, gestação sem intercorrências.", "Acompanhamento de pré-natal; sem queixas."],
}

OBS_RECEITA = [None, None, None, "Retornar se os sintomas persistirem.", "Tomar com água.",
               "Manter alimentação com pouco sal e praticar atividade física.", "Retorno em 30 dias com exames.",
               "Evitar automedicação."]
OBS_AGENDAMENTO = ["Retorno com resultado de exames.", "Paciente acompanhado de familiar.",
                   "Trazer cartão de vacina.", "Solicitou atendimento no período da manhã.",
                   "Primeira consulta na unidade.", "Trazer receitas anteriores."]
ALERGIAS = ["Dipirona", "Penicilina", "Sulfa", "Ácido acetilsalicílico", "Camarão", "Látex"]

NOMES_F = ["Ana", "Maria", "Francisca", "Antônia", "Juliana", "Fernanda", "Patrícia", "Aline", "Camila", "Débora",
           "Jéssica", "Luciana", "Mariana", "Raquel", "Sabrina", "Tatiane", "Vanessa", "Bruna", "Larissa", "Natália",
           "Priscila", "Renata", "Rebeca", "Simone", "Kelly", "Daniela", "Elaine", "Gabriela", "Joana", "Lívia",
           "Marcela", "Paula", "Roberta", "Sara", "Thaís", "Viviane", "Adriana", "Cláudia", "Cristiane", "Eliane",
           "Rosângela", "Sandra", "Lúcia", "Márcia", "Ivone", "Silvana", "Karla", "Ingrid", "Beatriz", "Carolina",
           "Letícia", "Amanda", "Isabela", "Bianca", "Lara", "Yasmin", "Kamila", "Talita", "Érica", "Geovana"]
NOMES_M = ["José", "Francisco", "Antônio", "João", "Carlos", "Paulo", "Pedro", "Lucas", "Luiz", "Marcos",
           "Rafael", "Daniel", "Marcelo", "Bruno", "Eduardo", "Felipe", "Rodrigo", "Gustavo", "Fábio", "Diego",
           "Thiago", "Leandro", "Anderson", "Alexandre", "Vinícius", "Renato", "Sérgio", "Jorge", "Roberto", "Márcio",
           "Fernando", "André", "Ricardo", "Wellington", "Cícero", "Raimundo", "Edson", "Gilberto", "Júlio", "Mateus",
           "Samuel", "Igor", "Caio", "Danilo", "Hugo", "Ítalo", "Wesley", "Jefferson", "Leonardo", "Gabriel",
           "Emanuel", "Gerson", "Valdir", "Ronaldo", "Kleber", "Alisson", "Iago", "Victor", "Breno", "Davi"]
NOMES_F_CRIANCA = ["Helena", "Alice", "Laura", "Valentina", "Cecília", "Maitê", "Liz", "Lorena", "Manuela",
                   "Sophia", "Heloísa", "Isis", "Antonella", "Ayla", "Melissa", "Esther", "Clara", "Luna"]
NOMES_M_CRIANCA = ["Miguel", "Arthur", "Heitor", "Theo", "Gael", "Bernardo", "Ravi", "Noah", "Samuel", "Enzo",
                   "Lorenzo", "Benício", "Joaquim", "Isaac", "Bento", "Davi", "Pietro", "Lucca"]
NOMES_F_IDOSA = ["Maria", "Francisca", "Raimunda", "Antônia", "Terezinha", "Luzia", "Benedita", "Rita",
                 "Expedita", "Socorro", "Aparecida", "Zuleide", "Neide", "Iracema", "Marlene", "Conceição"]
NOMES_M_IDOSO = ["Francisco", "José", "Antônio", "Raimundo", "Sebastião", "Manoel", "Joaquim", "Expedito",
                 "Benedito", "Luiz", "Valdemar", "Osvaldo", "Geraldo", "Moacir", "Severino", "Juvenal"]
SEGUNDOS_F = ["", "", "", "Clara", "Beatriz", "Luiza", "Cristina", "de Fátima", "do Socorro", "Gabriela", "Vitória"]
SEGUNDOS_M = ["", "", "", "Henrique", "Eduardo", "Augusto", "Gabriel", "Vitor", "Lucas", "Roberto"]
SOBRENOMES = ["Silva", "Sousa", "Oliveira", "Lima", "Pereira", "Costa", "Ferreira", "Rodrigues", "Almeida",
              "Nascimento", "Alves", "Araújo", "Barbosa", "Cavalcante", "Holanda", "Bezerra", "Freitas", "Moreira",
              "Rocha", "Gomes", "Martins", "Carvalho", "Ribeiro", "Mendes", "Batista", "Sampaio", "Teixeira",
              "Castro", "Brito", "Monteiro", "Pinheiro", "Maia", "Queiroz", "Farias", "Fernandes", "Santos",
              "Nogueira", "Lopes", "Vieira", "Andrade", "Correia", "Dias", "Leite", "Matos", "Saraiva", "Braga",
              "Pontes", "Paiva", "Siqueira", "Melo", "Magalhães", "Albuquerque", "Uchôa", "Benevides", "Aragão",
              "Tavares", "Xavier", "Feitosa", "Furtado", "Girão", "Cunha", "Pinto", "Rolim", "Bastos"]
LOGRADOUROS = ["Rua São José", "Rua Padre Cícero", "Rua Dom Pedro I", "Avenida Treze de Maio", "Rua Senador Pompeu",
               "Rua Pedro Pereira", "Rua Tenente Benévolo", "Rua Barão de Aratanha", "Rua Antônio Pompeu",
               "Rua Princesa Isabel", "Rua Guilherme Rocha", "Rua Castro e Silva", "Rua Juvenal Galeno",
               "Rua Rodrigues Júnior", "Rua General Sampaio", "Rua Assunção", "Rua Jaime Benévolo",
               "Rua Maria Tomásia", "Rua Frei Mansueto", "Rua Coronel Linhares", "Rua Dona Leopoldina",
               "Rua Nossa Senhora dos Remédios", "Rua Santa Luzia", "Rua São Francisco", "Rua Boa Vista",
               "Rua Primeiro de Maio", "Rua Sete de Setembro", "Rua Quinze de Novembro", "Travessa Esperança",
               "Rua Joaquim Nabuco", "Rua Tibúrcio Cavalcante", "Rua Oswaldo Cruz", "Rua Paulino Nogueira",
               "Rua Jovita Feitosa", "Avenida Godofredo Maciel", "Avenida Augusto dos Anjos", "Rua Ana Bilhar",
               "Rua Delmiro Gouveia", "Rua Marechal Deodoro", "Rua do Rosário"]
COMPLEMENTOS = [None] * 6 + ["Casa A", "Casa B", "Apto 101", "Apto 203", "Bloco C", "Fundos", "Próximo à igreja"]


def sem_acento(texto):
    return "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))


def cns_provisorio(rng):
    """CNS de 15 dígitos iniciado por 7, 8 ou 9 que passa no dígito verificador oficial."""
    while True:
        digitos = [rng.choice((7, 8, 9))] + [rng.randint(0, 9) for _ in range(13)]
        soma = sum(d * (15 - i) for i, d in enumerate(digitos))
        ultimo = (-soma) % 11
        if ultimo < 10:
            return "".join(map(str, digitos + [ultimo]))


class CargaRealista(CargaDemonstracao):
    NAMESPACE = NAMESPACE_REALISTA

    def __init__(self, *, dominio, hora_referencia, agendamentos_no_dia=200, dias_futuros=14, **kwargs):
        super().__init__(**kwargs)
        self.dominio = dominio
        self.hora_referencia = hora_referencia
        self.AGENDAMENTOS_NO_DIA = agendamentos_no_dia
        self.dias_futuros = dias_futuros
        self.semente = kwargs.get("seed", 42)
        self.cpfs_usados, self.emails_usados, self.cns_usados = set(), set(), set()
        self.grupos_de_pacientes = {}
        self.logins_por_unidade = {}

    def r(self, chave):
        """Gerador próprio para cada texto: os sorteios do motor base continuam na mesma ordem."""
        return random.Random(f"{self.semente}:{chave}")

    # ------------------------------------------------------------------ identidade e catálogo

    def rotulo(self, texto):
        return texto

    def carga_incompativel(self):
        n = self.quantidades["agendamentos"]
        existe = lambda idx: Agendamento.objects.using(self.db).filter(pk=self.id(Agendamento, idx)).exists()
        return existe(0) and (not existe(n - 1) or existe(n))

    def item_catalogo(self, model, nome, **campos):
        """Reaproveita o cadastro que já existe na base com o mesmo nome (o catálogo oficial do posto)."""
        existente = model.objects.using(self.db).filter(nome__iexact=nome).first()
        if existente:
            self.totais[model._meta.model_name] += 1
            return existente
        return self.entidade(model, nome, nome=nome, **campos)

    def servicos_da_carga(self):
        return [s for s in SERVICOS if s[0] in SERVICOS_PESOS]

    def unidades_da_carga(self):
        centros = {nome: (lat, lon) for nome, lat, lon in bairros_do_mapa()}
        resultado = []
        for chave, bairro, lat, lon in UNIDADES:
            lat, lon = centros.get(bairro, (lat, lon))
            resultado.append((f"uaps:{chave}", bairro, round(lat, 6), round(lon, 6), bairro if centros else None))
        return resultado

    def campos_unidade(self, idx, nome):
        r = self.r(f"unidade:{idx}")
        slug = sem_acento(nome).lower().replace(" ", "")
        return dict(nome=f"UAPS {nome}", logradouro=r.choice(LOGRADOUROS), numero=str(r.randint(10, 1800)),
            cep=f"60{r.randint(100, 899)}{r.randint(100, 999)}", telefone=f"853{r.randint(1000000, 9999999)}",
            email=f"uaps.{slug}@{self.dominio}")

    def medicamentos_da_carga(self):
        por_chave = {(nome, conc): linha for linha in CATALOGO_FARMACIA for nome, conc in [(linha[0], linha[3])]
                     if linha[2] in {"COMPRIMIDO", "CAPSULA"}}
        return [por_chave[chave] for chave in MEDICAMENTOS_DA_REDE]

    def medicamento(self, idx, especificacao):
        nome, principio, forma, conc, unid, via, controlado, classe, minimo = especificacao
        existente = Medicamento.objects.using(self.db).filter(
            nome=nome, concentracao=conc, unidade_medida=unid, forma_farmaceutica=forma).first()
        if existente:
            self.totais["medicamento"] += 1
            return existente
        return self.entidade(Medicamento, f"{nome}:{conc}:{forma}", nome=nome, principio_ativo=principio,
            concentracao=conc, forma_farmaceutica=forma, unidade_medida=unid, via_administracao=via,
            controlado=controlado, classe_terapeutica=classe, estoque_minimo=minimo)

    # ------------------------------------------------------------------ pessoas

    def nome_pessoa(self, r, sexo, idade, sobrenome_final=None):
        if sexo == "OUTRO":
            sexo = r.choice(["FEMININO", "MASCULINO"])
        feminino = sexo == "FEMININO"
        if idade < 12:
            primeiro = r.choice(NOMES_F_CRIANCA if feminino else NOMES_M_CRIANCA)
        elif idade >= 60:
            primeiro = r.choice(NOMES_F_IDOSA if feminino else NOMES_M_IDOSO)
        else:
            primeiro = r.choice(NOMES_F if feminino else NOMES_M)
        segundo = r.choice(SEGUNDOS_F if feminino else SEGUNDOS_M)
        sobrenomes = r.sample(SOBRENOMES, 2)
        if sobrenome_final:
            sobrenomes[-1] = sobrenome_final
        partes = [primeiro, segundo] + (sobrenomes if r.random() < 0.7 else sobrenomes[-1:])
        return " ".join(p for p in partes if p)

    def cpf_novo(self, r):
        while True:
            try:
                cpf = cpf_sintetico(r.randint(100000000, 999999999))
            except ValidationError:
                continue
            if cpf not in self.cpfs_usados:
                self.cpfs_usados.add(cpf)
                return cpf

    def email_novo(self, nome):
        partes = sem_acento(nome).lower().split()
        base = f"{partes[0]}.{partes[-1]}"
        email, n = f"{base}@{self.dominio}", 1
        while email in self.emails_usados:
            n += 1
            email = f"{base}{n}@{self.dominio}"
        self.emails_usados.add(email)
        return email

    def profissional(self, perfil, ui, repeticao, contador):
        r = self.r(f"profissional:{perfil}:{ui}:{repeticao}")
        sexo = r.choice(["FEMININO", "MASCULINO"])
        nome = self.nome_pessoa(r, sexo, r.randint(28, 55))
        email = self.email_novo(nome)
        return f"{perfil}:{ui}:{repeticao}", dict(email=email, username=email, nome_completo=nome,
            cpf=self.cpf_novo(r), telefone=f"859{r.randint(81000000, 99999999)}")

    def nome_guiche(self, perfil, repeticao):
        return {"medico": f"Consultório {repeticao + 1}", "enfermeiro": "Sala de Enfermagem",
                "farmaceutico": "Farmácia"}[perfil]

    def cidadao(self, idx, unidade, perfil):
        r = self.r(f"cidadao:{idx}")
        idade = (self.base - perfil["data_nascimento"]).days // 365
        sobrenome = r.choice(SOBRENOMES)
        nome = self.nome_pessoa(r, perfil["sexo"], idade, sobrenome_final=sobrenome)
        mae = self.nome_pessoa(r, "FEMININO", 30 if idade < 12 else (45 if idade < 40 else 70), sobrenome_final=sobrenome)
        cns = None
        if perfil["cns"]:
            cns = cns_provisorio(r)
            while cns in self.cns_usados:
                cns = cns_provisorio(r)
            self.cns_usados.add(cns)
        return dict(nome=nome, mae=mae, cpf=self.cpf_novo(r), email=None, cns=cns,
            telefone=f"859{r.randint(81000000, 99999999)}" if r.random() < 0.9 else None,
            logradouro=r.choice(LOGRADOUROS), numero=str(r.randint(1, 2400)) if r.random() < 0.96 else "S/N",
            complemento=r.choice(COMPLEMENTOS), cep=f"60{r.randint(100, 899)}{r.randint(100, 999)}",
            alergias=r.choice(ALERGIAS) if r.random() < 0.08 else None)

    # ------------------------------------------------------------------ atendimento

    def queixa(self, cid, paciente):
        return self.r(f"queixa:{paciente.pk}:{cid}").choice(QUEIXAS.get(cid, QUEIXAS["Z00.0"]))

    def registro_clinico(self, idx, criado, agendamento, paciente, unidade, profissional):
        registro = super().registro_clinico(idx, criado, agendamento, paciente, unidade, profissional)
        idade = (self.base - paciente.data_nascimento).days // 365
        if registro.cid == "Z34.9" and (paciente.sexo != "FEMININO" or not 15 <= idade <= 44):
            registro.cid = "Z00.0"
        r = self.r(f"queixa:{idx}:{registro.cid}")
        registro.queixa_principal = r.choice(QUEIXAS.get(registro.cid, QUEIXAS["Z00.0"]))
        if registro.cid in {"Z00.0", "Z34.9", "I10", "E11.9"} and registro.classificacao_risco in {"LARANJA", "VERMELHO"}:
            # Rotina, pré-natal e acompanhamento de crônicos raramente chegam como urgência.
            registro.classificacao_risco = r.choices(["AZUL", "VERDE", "AMARELO"], weights=[45, 45, 10])[0]
        return registro

    def servico_do_agendamento(self, idx):
        if not hasattr(self, "_pesos_servicos"):
            self._pesos_servicos = [SERVICOS_PESOS[s.nome] for s in self.servicos]
        return self.r(f"servico:{idx}").choices(self.servicos, weights=self._pesos_servicos)[0]

    def candidatos(self, unidade, categoria):
        chave = (unidade.pk, categoria)
        if chave not in self.grupos_de_pacientes:
            def idade(p):
                return (self.base - p.data_nascimento).days // 365
            filtros = {
                "mulher": lambda p: p.sexo == "FEMININO" and idade(p) >= 16,
                "gestante": lambda p: p.sexo == "FEMININO" and 16 <= idade(p) <= 42,
                "crianca": lambda p: idade(p) < 12,
                "cronico": lambda p: bool(p.condicoes_cronicas) or idade(p) >= 50,
            }
            pool = [p for p in self.por_unidade.get(unidade.pk, []) if filtros[categoria](p)]
            if not pool:
                pool = [p for lista in self.por_unidade.values() for p in lista if filtros[categoria](p)]
            self.grupos_de_pacientes[chave] = pool
        return self.grupos_de_pacientes[chave]

    def ajustar_paciente(self, paciente, servico, unidade):
        categoria = ("gestante" if servico.nome in GESTANTES else "mulher" if servico.nome in SO_MULHERES
                     else "crianca" if servico.nome in CRIANCAS else "cronico" if servico.nome in CRONICOS else None)
        if categoria is None:
            if (self.base - paciente.data_nascimento).days // 365 < 12 and servico.gera_receita:
                return self.r(f"paciente:{paciente.pk}:{servico.pk}").choice(self.candidatos(unidade, "cronico") or [paciente])
            return paciente
        pool = self.candidatos(unidade, categoria)
        if not pool or paciente in pool:
            return paciente
        return self.r(f"paciente:{paciente.pk}:{servico.pk}:{unidade.pk}").choice(pool)

    def horario_do_agendamento(self, idx):
        bloco = idx // len(self.unidades)
        hora = (8, 9, 10, 11, 13, 14, 15, 16)[bloco % 8]
        return time(hora, (0, 20, 40)[(bloco // 8 + idx) % 3])

    def situacao_no_dia(self, idx, dia, horario, situacao):
        """No dia-base, o andamento acompanha a hora de referência: antes dela já resolvido, perto dela em curso, depois agendado."""
        marcado = datetime.combine(dia, horario)
        referencia = datetime.combine(dia, self.hora_referencia)
        if marcado > referencia:
            return "AGENDADO"
        if marcado > referencia - timedelta(minutes=25):
            return "ATIVADO"  # chegou e aguarda chamada
        if marcado > referencia - timedelta(minutes=60):
            return ("ATIVADO", "CHAMANDO", "ATENDIMENTO")[idx % 3]
        if situacao in {"AGENDADO", "ATIVADO", "CHAMANDO", "ATENDIMENTO"}:
            return self.r(f"dia:{idx}").choices(["FINALIZADO", "AUSENCIA_CIDADAO", "CANCELADO_CRAS"], weights=[84, 11, 5])[0]
        return situacao

    def casos_de_borda(self):
        return False

    def observacao_agendamento(self, idx):
        r = self.r(f"obs:{idx}")
        return r.choice(OBS_AGENDAMENTO) if r.random() < 0.07 else None

    def observacao_receita(self):
        self._receitas = getattr(self, "_receitas", 0) + 1
        return self.r(f"receita:{self._receitas}").choice(OBS_RECEITA)

    def posologia(self, med):
        chave = next((k for k in POSOLOGIAS if k in sem_acento(med.principio_ativo or med.nome).lower()
                      or k in sem_acento(med.nome).lower()), None)
        frequencia, duracao = POSOLOGIAS.get(chave, ("1 comprimido 1 vez ao dia", "7 dias"))
        return f"{med.concentracao} {med.get_unidade_medida_display()}", frequencia, duracao

    def antes_de_gravar_agenda(self, vagas, agendamentos):
        """Agenda dos próximos dias úteis, como numa unidade em funcionamento."""
        for d in range(1, self.dias_futuros + 1):
            dia = self.base + timedelta(days=d)
            if dia.weekday() >= 5:
                continue
            for ui, unidade in enumerate(self.unidades):
                r = self.r(f"futuro:{dia}:{ui}")
                # Quanto mais distante, menos agenda preenchida.
                total = max(3, round(r.randint(14, 22) * (1 - d / (self.dias_futuros + 4))))
                for k in range(total):
                    idx = f"futuro:{dia}:{ui}:{k}"
                    servico = self.servico_do_agendamento(idx)
                    base = self.por_unidade.get(unidade.pk) or self.pacientes
                    paciente = self.ajustar_paciente(r.choice(base), servico, unidade)
                    par = (paciente.pk, servico.tipo_servico_id)
                    if par in self.ativos:
                        continue
                    self.ativos.add(par)
                    horario = time(r.choice((8, 9, 10, 11, 13, 14, 15, 16)), r.choice((0, 20, 40)))
                    chave_vaga = f"{unidade.pk}:{servico.tipo_servico_id}:{dia}:{horario}"
                    if chave_vaga not in vagas:
                        vagas[chave_vaga] = self.registro(AgendaVaga, chave_vaga, unidade=unidade,
                            tipo_servico=servico.tipo_servico, data=dia, horario=horario, vagas=30, vagas_ocupadas=0)
                    vaga = vagas[chave_vaga]
                    self.saldos_vagas[vaga.pk] += 1
                    marcado_em = self.instante(self.base - timedelta(days=r.randint(0, 20)), time(r.randint(7, 16), r.randint(0, 59)))
                    agendamentos.append(self.registro(Agendamento, idx, criado=marcado_em, cidadao=paciente,
                        unidade=unidade, servico=servico, vaga=vaga, data=dia, horario=horario, situacao="AGENDADO",
                        origem=r.choices(["RECEPCAO", "SITE"], weights=[65, 35])[0],
                        observacoes_gerais=self.observacao_agendamento(idx)))

    def fila(self):
        """Fila de espera do dia só com serviços de porta aberta (sem restrição de sexo ou idade)."""
        livres = [s for s in self.servicos if s.nome in {"Consulta Clínica Geral", "Consulta de Enfermagem",
                                                         "Aplicação de Vacina", "Curativo"}] or self.servicos
        entradas = []
        quantidade = self.quantidades["fila"]
        for idx, paciente in enumerate(self.pacientes[-quantidade:] if quantidade else []):
            r = self.r(f"fila:{idx}")
            unidade = self.unidades[idx % len(self.unidades)]
            chegada = datetime.combine(self.base, self.hora_referencia) - timedelta(minutes=r.randint(5, 110))
            entradas.append(self.registro(FilaEspera, idx, criado=self.instante(self.base, max(chegada.time(), time(7, 30))),
                cidadao=paciente, unidade=unidade, servico=r.choice(livres),
                prioridade=r.choices(["NORMAL", "PREFERENCIAL", "PREFERENCIAL+"], weights=[62, 30, 8])[0],
                urgencia="ALTA" if r.random() < 0.08 else "NORMAL", status="AGUARDANDO_FILA"))
        self.inserir(FilaEspera, entradas)

    # ------------------------------------------------------------------ estoque

    def lote(self, ui, mi, med, vencido=False):
        r = self.r(f"lote:{ui}:{mi}:{vencido}")
        prefixo = sem_acento(med.nome).upper().replace(" ", "")[:2]
        ano = (self.base.year - (1 if vencido else 0)) % 100
        numero = f"{prefixo}{ano:02d}{r.choice('ABCDEFGHJK')}{r.randint(100, 9999):04d}"
        fornecedor = r.choices(["Central de Abastecimento Farmacêutico (CAF)", "Ministério da Saúde - Componente Básico"],
                               weights=[80, 20])[0]
        if vencido:
            validade = self.base - timedelta(days=r.randint(3, 12))
        elif (ui + mi) % 11 == 3:
            validade = self.base + timedelta(days=r.randint(20, 55))  # vence em breve: aparece nos alertas
        else:
            validade = self.base + timedelta(days=r.randint(150, 540))
        return dict(numero_lote=numero, fornecedor=fornecedor, validade=validade)

    def saldo_alvo(self, ui, mi, med):
        minimo = med.estoque_minimo or 100
        r = self.r(f"saldo:{ui}:{mi}")
        if (ui + mi) % 9 == 4:
            return max(5, round(minimo * r.uniform(0.2, 0.6)))  # abaixo do mínimo
        return round(minimo * r.uniform(1.3, 3.2))

    def tem_lote_vencido(self, ui):
        return ui in (1, 4, 6)

    def motivo_movimento(self, tipo):
        return {"entrada": "Entrada inicial do lote", "saida": None, "vencido": "Entrada inicial do lote"}[tipo]

    # ------------------------------------------------------------------ resultado

    def executar(self):
        resultado = super().executar()
        resultado["logins_por_unidade"] = self.logins_por_unidade
        return resultado

    def ids_da_carga(self):
        """IDs das unidades, profissionais, cidadãos e itens de catálogo criados por esta carga."""
        unidades = [self.id(UnidadePosto, f"uaps:{chave}") for chave, *_ in UNIDADES]
        usuarios = []
        for ui in range(len(UNIDADES)):
            for perfil in PERFIS:
                if perfil in {"admin", "gestor"} and ui > 0:
                    continue
                usuarios += [self.id(Usuario, f"{perfil}:{ui}:{rep}") for rep in range(2 if perfil == "medico" else 1)]
        cidadaos = [self.id(Cidadao, idx) for idx in range(LIMITE_CIDADAOS)]
        catalogo = {
            Medicamento: [self.id(Medicamento, f"{l[0]}:{l[3]}:{l[2]}") for l in CATALOGO_FARMACIA],
            Servico: [self.id(Servico, s[0]) for s in SERVICOS],
            TipoServico: [self.id(TipoServico, t[0]) for t in TIPOS],
            ClasseServico: [self.id(ClasseServico, c[0]) for c in CLASSES],
        }
        return unidades, usuarios, cidadaos, catalogo


def _em_lotes(ids, tamanho=800):
    for i in range(0, len(ids), tamanho):
        yield ids[i:i + tamanho]


def _existentes(model, ids, db):
    encontrados = []
    for lote in _em_lotes(list(ids)):
        encontrados += list(model.objects.using(db).filter(pk__in=lote).values_list("pk", flat=True))
    return encontrados


def remover_carga(*, db, unidades, usuarios, cidadaos, catalogo):
    """Apaga, em ordem de dependência, tudo o que pertence às unidades/profissionais/cidadãos informados.

    Registros de outras unidades não são tocados. Itens de catálogo só saem se nada mais os usar.
    Retorna a contagem por modelo.
    """
    contagem = {}

    def apagar(qs):
        total, por_modelo = qs.delete()
        for modelo, n in por_modelo.items():
            contagem[modelo] = contagem.get(modelo, 0) + n

    with transaction.atomic(using=db):
        U = _existentes(UnidadePosto, unidades, db)
        P = _existentes(Usuario, usuarios, db)
        C = _existentes(Cidadao, cidadaos, db)
        objs = lambda model: model.objects.using(db)

        def por_cidadao(model, campo="cidadao"):
            ids = set()
            for lote in _em_lotes(C):
                ids |= set(objs(model).filter(**{f"{campo}__in": lote}).values_list("pk", flat=True))
            return ids

        agendamentos = set(objs(Agendamento).filter(Q(unidade__in=U) | Q(atendente__in=P)).values_list("pk", flat=True))
        agendamentos |= por_cidadao(Agendamento)
        receitas = set(objs(Receita).filter(profissional__in=P).values_list("pk", flat=True)) | por_cidadao(Receita)
        for lote in _em_lotes(list(agendamentos)):
            receitas |= set(objs(Receita).filter(agendamento__in=lote).values_list("pk", flat=True))
        lotes_estoque = list(objs(LoteMedicamento).filter(unidade__in=U).values_list("pk", flat=True))

        for lote in _em_lotes(list(receitas)):
            apagar(objs(MovimentacaoEstoque).filter(receita_item__receita__in=lote))
        apagar(objs(MovimentacaoEstoque).filter(Q(lote__in=lotes_estoque) | Q(usuario__in=P)))
        apagar(objs(LoteMedicamento).filter(pk__in=lotes_estoque))
        registros = set(objs(RegistroAtendimento).filter(Q(unidade__in=U) | Q(profissional__in=P)).values_list("pk", flat=True))
        registros |= por_cidadao(RegistroAtendimento)
        for lote in _em_lotes(list(agendamentos)):
            registros |= set(objs(RegistroAtendimento).filter(agendamento__in=lote).values_list("pk", flat=True))
        for lote in _em_lotes(list(registros)):
            apagar(objs(RegistroAtendimento).filter(pk__in=lote))
        for lote in _em_lotes(list(receitas)):
            apagar(objs(ReceitaMedicamento).filter(receita__in=lote))
            apagar(objs(Receita).filter(pk__in=lote))
        apagar(objs(FilaEspera).filter(unidade__in=U))
        for lote in _em_lotes(C):
            apagar(objs(FilaEspera).filter(cidadao__in=lote))
        apagar(objs(ChamadaPainel).filter(unidade__in=U))
        for lote in _em_lotes(list(agendamentos)):
            apagar(objs(ChamadaPainel).filter(agendamento__in=lote))
            apagar(objs(Agendamento).filter(pk__in=lote))
        apagar(objs(AgendaVaga).filter(unidade__in=U))
        objs(Usuario).filter(Q(pk__in=P) | Q(guiche_atual__unidade__in=U)).update(guiche_atual=None)
        apagar(objs(Guiche).filter(unidade__in=U))
        apagar(objs(EscalaTrabalho).filter(Q(profissional__in=P) | Q(unidade__in=U)))
        apagar(objs(ServicoUnidadePosto).filter(unidade__in=U))
        for bloqueio in objs(BloqueioHorario).filter(unidades__in=U).distinct():
            bloqueio.unidades.remove(*U)
            if not bloqueio.unidades.exists():
                apagar(objs(BloqueioHorario).filter(pk=bloqueio.pk))
        apagar(objs(Usuario).filter(pk__in=P))
        for lote in _em_lotes(C):
            apagar(objs(Cidadao).filter(pk__in=lote))
        # Cidadãos cadastrados à parte que escolheram uma destas unidades continuam, só sem unidade de origem.
        objs(Cidadao).filter(unidade_origem__in=U).update(unidade_origem=None)
        apagar(objs(UnidadePosto).filter(pk__in=U))
        for model in (Medicamento, Servico, TipoServico, ClasseServico, Bairro):
            for pk in _existentes(model, catalogo.get(model, []), db):
                try:
                    with transaction.atomic(using=db):
                        apagar(objs(model).filter(pk=pk))
                except ProtectedError:
                    pass  # ainda usado por outro cadastro: fica.
    return {k: v for k, v in contagem.items() if v}


def remover_marcados_demo(db):
    """Remove a carga antiga marcada com [DEMO] (nomes começando com a etiqueta)."""
    prefixo = TAG
    return remover_carga(
        db=db,
        unidades=list(UnidadePosto.objects.using(db).filter(nome__startswith=prefixo).values_list("pk", flat=True)),
        usuarios=list(Usuario.objects.using(db).filter(nome_completo__startswith=prefixo).values_list("pk", flat=True)),
        cidadaos=list(Cidadao.objects.using(db).filter(nome__startswith=prefixo).values_list("pk", flat=True)),
        catalogo={model: list(model.objects.using(db).filter(nome__startswith=prefixo).values_list("pk", flat=True))
                  for model in (Medicamento, Servico, TipoServico, ClasseServico, Bairro)},
    )
