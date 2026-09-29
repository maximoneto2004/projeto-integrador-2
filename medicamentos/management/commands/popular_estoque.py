import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from app.static_data import GRUPO_ADMINISTRADOR, TIPO_MOVIMENTACAO_AJUSTE, TIPO_MOVIMENTACAO_PERDA
from medicamentos import services
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from unidade_posto.models import UnidadePosto

PREFIXO_LOTE = "DEMO-"

# (nome, principio_ativo, forma, concentracao, unidade_medida, via, controlado, classe, estoque_minimo)
MEDICAMENTOS = [
    ("Losartana Potássica", "losartana potássica", "COMPRIMIDO", "50", "MG", "ORAL", False, "Anti-hipertensivo", 500),
    ("Hidroclorotiazida", "hidroclorotiazida", "COMPRIMIDO", "25", "MG", "ORAL", False, "Diurético", 300),
    ("Anlodipino", "besilato de anlodipino", "COMPRIMIDO", "5", "MG", "ORAL", False, "Anti-hipertensivo", 300),
    ("Captopril", "captopril", "COMPRIMIDO", "25", "MG", "ORAL", False, "Anti-hipertensivo", 200),
    ("Metformina", "cloridrato de metformina", "COMPRIMIDO", "850", "MG", "ORAL", False, "Antidiabético", 500),
    ("Glibenclamida", "glibenclamida", "COMPRIMIDO", "5", "MG", "ORAL", False, "Antidiabético", 200),
    ("Insulina NPH", "insulina humana NPH", "SOLUCAO_INJETAVEL", "100", "UI_ML", "SUBCUTANEA", False, "Antidiabético", 20),
    ("Sinvastatina", "sinvastatina", "COMPRIMIDO", "20", "MG", "ORAL", False, "Hipolipemiante", 300),
    ("Ácido Acetilsalicílico", "ácido acetilsalicílico", "COMPRIMIDO", "100", "MG", "ORAL", False, "Antiagregante plaquetário", 300),
    ("Paracetamol", "paracetamol", "COMPRIMIDO", "500", "MG", "ORAL", False, "Analgésico/antitérmico", 500),
    ("Paracetamol", "paracetamol", "GOTAS", "200", "MG_ML", "ORAL", False, "Analgésico/antitérmico", 50),
    ("Dipirona Sódica", "dipirona monoidratada", "COMPRIMIDO", "500", "MG", "ORAL", False, "Analgésico/antitérmico", 500),
    ("Dipirona Sódica", "dipirona monoidratada", "GOTAS", "500", "MG_ML", "ORAL", False, "Analgésico/antitérmico", 50),
    ("Ibuprofeno", "ibuprofeno", "COMPRIMIDO", "600", "MG", "ORAL", False, "Anti-inflamatório", 200),
    ("Amoxicilina", "amoxicilina", "CAPSULA", "500", "MG", "ORAL", False, "Antibiótico", 300),
    ("Amoxicilina", "amoxicilina", "SUSPENSAO_ORAL", "50", "MG_ML", "ORAL", False, "Antibiótico", 30),
    ("Azitromicina", "azitromicina", "COMPRIMIDO", "500", "MG", "ORAL", False, "Antibiótico", 100),
    ("Cefalexina", "cefalexina", "CAPSULA", "500", "MG", "ORAL", False, "Antibiótico", 200),
    ("Albendazol", "albendazol", "COMPRIMIDO", "400", "MG", "ORAL", False, "Anti-helmíntico", 100),
    ("Omeprazol", "omeprazol", "CAPSULA", "20", "MG", "ORAL", False, "Antiulceroso", 300),
    ("Loratadina", "loratadina", "COMPRIMIDO", "10", "MG", "ORAL", False, "Anti-histamínico", 100),
    ("Salbutamol", "sulfato de salbutamol", "AEROSSOL", "100", "MCG", "INALATORIA", False, "Broncodilatador", 20),
    ("Sulfato Ferroso", "sulfato ferroso", "COMPRIMIDO", "40", "MG", "ORAL", False, "Antianêmico", 200),
    ("Nistatina", "nistatina", "CREME", "100000", "UI", "TOPICA", False, "Antifúngico", 20),
    ("Fluoxetina", "cloridrato de fluoxetina", "CAPSULA", "20", "MG", "ORAL", True, "Antidepressivo", 100),
    ("Amitriptilina", "cloridrato de amitriptilina", "COMPRIMIDO", "25", "MG", "ORAL", True, "Antidepressivo", 100),
    ("Clonazepam", "clonazepam", "COMPRIMIDO", "2", "MG", "ORAL", True, "Ansiolítico/anticonvulsivante", 50),
    ("Diazepam", "diazepam", "COMPRIMIDO", "10", "MG", "ORAL", True, "Ansiolítico", 50),
]

FORNECEDORES = ["Farmácia Básica Municipal", "Almoxarifado Central", "Ministério da Saúde"]


class Command(BaseCommand):
    help = (
        "Popula o estoque de medicamentos para demonstração: cadastra medicamentos e cria lotes, "
        "dispensações, perdas e ajustes nas unidades, incluindo casos de estoque baixo, lote vencendo "
        "e lote vencido para aparecerem nos alertas. Lotes gerados usam o prefixo DEMO-."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--unidade",
            help="ID ou parte do nome da unidade. Sem este parâmetro, popula todas as unidades ativas.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Remove os lotes DEMO- (e suas movimentações) antes de gerar novamente.",
        )
        parser.add_argument(
            "--usuario",
            help="E-mail ou CPF do responsável pelas movimentações. Padrão: um superusuário ou administrador.",
        )
        parser.add_argument("--seed", type=int, default=42, help="Semente aleatória (resultado reproduzível).")

    def handle(self, *args, **opts):
        random.seed(opts["seed"])
        usuario = self._usuario(opts["usuario"])
        self.stdout.write(f"Movimentações registradas em nome de: {usuario}")

        unidades = self._unidades(opts["unidade"])

        with transaction.atomic():
            if opts["reset"]:
                self._reset(unidades)
            medicamentos = self._cadastrar_medicamentos()
            for unidade in unidades:
                if LoteMedicamento.objects.filter(unidade=unidade, numero_lote__startswith=PREFIXO_LOTE).exists():
                    self.stdout.write(self.style.WARNING(f"{unidade.nome}: já possui lotes DEMO- (use --reset). Pulando."))
                    continue
                resumo = self._popular_unidade(usuario, unidade, medicamentos)
                self.stdout.write(f"{unidade.nome}: {resumo}")

        self.stdout.write(self.style.SUCCESS("Estoque de demonstração populado."))

    def _usuario(self, identificador):
        usuarios = get_user_model().objects.filter(is_active=True)
        if identificador:
            usuario = usuarios.filter(Q(email__iexact=identificador) | Q(cpf=identificador)).first()
            if usuario is None:
                raise CommandError(f"Usuário '{identificador}' não encontrado.")
            return usuario
        usuario = (
            usuarios.filter(is_superuser=True).first()
            or usuarios.filter(groups__name__iexact=GRUPO_ADMINISTRADOR).first()
        )
        if usuario is None:
            raise CommandError("Nenhum superusuário ou administrador ativo encontrado. Informe --usuario.")
        return usuario

    def _unidades(self, filtro):
        qs = UnidadePosto.objects.filter(is_active=True)
        if filtro:
            try:
                qs = qs.filter(Q(pk=filtro) | Q(nome__icontains=filtro))
            except Exception:
                qs = qs.filter(nome__icontains=filtro)
        unidades = list(qs.order_by("nome"))
        if not unidades:
            raise CommandError("Nenhuma unidade ativa encontrada.")
        return unidades

    def _reset(self, unidades):
        lotes = LoteMedicamento.objects.filter(unidade__in=unidades, numero_lote__startswith=PREFIXO_LOTE)
        movs, _ = MovimentacaoEstoque.objects.filter(lote__in=lotes).delete()
        qtd, _ = lotes.delete()
        self.stdout.write(self.style.WARNING(f"Removidos {qtd} lotes DEMO- e {movs} movimentações."))

    def _cadastrar_medicamentos(self):
        medicamentos = []
        novos = 0
        for nome, principio, forma, conc, unid, via, controlado, classe, minimo in MEDICAMENTOS:
            med, criado = Medicamento.objects.get_or_create(
                nome=nome,
                concentracao=conc,
                unidade_medida=unid,
                forma_farmaceutica=forma,
                defaults=dict(
                    principio_ativo=principio,
                    via_administracao=via,
                    controlado=controlado,
                    classe_terapeutica=classe,
                    estoque_minimo=minimo,
                ),
            )
            if not med.is_active:
                med.is_active = True
                med.save(update_fields=["is_active", "updated_at"])
            medicamentos.append(med)
            novos += criado
        self.stdout.write(f"Medicamentos: {len(medicamentos)} no catálogo ({novos} novos).")
        return medicamentos

    def _popular_unidade(self, usuario, unidade, medicamentos):
        hoje = timezone.localdate()
        sufixo = str(unidade.pk)[:4].upper()
        lotes = 0
        dispensacoes = 0

        # Alguns medicamentos ficam propositalmente com estoque abaixo do mínimo.
        baixos = set(random.sample(range(len(medicamentos)), k=4))

        for i, med in enumerate(medicamentos):
            minimo = med.estoque_minimo or 50
            numero = lambda n: f"{PREFIXO_LOTE}{sufixo}-{i:02d}{n}"

            if i in baixos:
                self._lote(usuario, unidade, med, numero("A"), hoje + timedelta(days=random.randint(120, 400)),
                           max(1, minimo // 3), hoje - timedelta(days=40))
                lotes += 1
                continue

            # Lote antigo (vence antes) + lote novo, para mostrar a baixa FEFO.
            self._lote(usuario, unidade, med, numero("A"), hoje + timedelta(days=random.randint(90, 200)),
                       random.randint(minimo, minimo * 2), hoje - timedelta(days=60))
            self._lote(usuario, unidade, med, numero("B"), hoje + timedelta(days=random.randint(300, 720)),
                       random.randint(minimo, minimo * 3), hoje - timedelta(days=15))
            lotes += 2

            for _ in range(random.randint(2, 5)):
                mov = services.dispensar(usuario, med, unidade, random.randint(1, max(2, minimo // 10)),
                                         motivo="Dispensação (demonstração)")
                self._retroagir(mov, random.randint(0, 14))
                dispensacoes += 1

        # Lote vencendo nos próximos dias (aparece em Alertas).
        med = medicamentos[9]
        self._lote(usuario, unidade, med, f"{PREFIXO_LOTE}{sufixo}-VENC", hoje + timedelta(days=12), 80,
                   hoje - timedelta(days=200))
        # Lote já vencido (aparece como Vencido no saldo) e parte descartada como perda.
        med = medicamentos[14]
        vencido = self._lote(usuario, unidade, med, f"{PREFIXO_LOTE}{sufixo}-EXP", hoje - timedelta(days=5), 60,
                             hoje - timedelta(days=300))
        services.movimentar_lote(usuario, vencido.pk, TIPO_MOVIMENTACAO_PERDA, 20, motivo="Lote vencido - descarte parcial")
        # Ajuste de inventário.
        lote_ajuste = LoteMedicamento.objects.filter(unidade=unidade, numero_lote__startswith=PREFIXO_LOTE,
                                                     quantidade_atual__gt=10).first()
        if lote_ajuste:
            services.movimentar_lote(usuario, lote_ajuste.pk, TIPO_MOVIMENTACAO_AJUSTE, -3,
                                     motivo="Divergência na contagem de inventário")
        lotes += 2

        return f"{lotes} lotes, {dispensacoes} dispensações, 1 perda, 1 ajuste."

    def _lote(self, usuario, unidade, med, numero, validade, quantidade, data_entrada):
        lote = services.registrar_lote(
            usuario,
            medicamento=med,
            unidade=unidade,
            numero_lote=numero,
            validade=validade,
            quantidade_inicial=quantidade,
            fornecedor=random.choice(FORNECEDORES),
            data_entrada=data_entrada,
        )
        lote.movimentacoes.update(data=timezone.now() - (timezone.localdate() - data_entrada))
        return lote

    @staticmethod
    def _retroagir(movimentacoes, dias):
        ids = [m.pk for m in movimentacoes]
        MovimentacaoEstoque.objects.filter(pk__in=ids).update(data=timezone.now() - timedelta(days=dias, hours=random.randint(0, 8)))
