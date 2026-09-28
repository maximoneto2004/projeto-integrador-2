from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction

from servicos import catalogo_saude as catalogo
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import ServicoUnidadePosto, UnidadePosto

DIAS_UTEIS = ["SEG", "TER", "QUA", "QUI", "SEX"]


def _upsert(model, prefixo, nome, **campos):
    """Localiza pelo ID determinístico ou, se já existir um registro com o mesmo nome, reaproveita-o."""
    registro = (
        model.objects.filter(pk=catalogo.gerar_id(prefixo, nome)).first()
        or model.objects.filter(nome__iexact=nome).first()
    )
    if registro is None:
        return model.objects.create(id=catalogo.gerar_id(prefixo, nome), nome=nome, is_active=True, **campos), True
    for campo, valor in {"nome": nome, "is_active": True, **campos}.items():
        setattr(registro, campo, valor)
    registro.save()
    return registro, False


class Command(BaseCommand):
    help = (
        "Carrega o catálogo de serviços do posto de saúde (classes, tipos e serviços) e inativa "
        "os itens que não fazem parte dele. Pode ser executado várias vezes."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--manter-antigos",
            action="store_true",
            help="Não inativa classes, tipos e serviços fora do catálogo.",
        )
        parser.add_argument(
            "--vincular-unidades",
            action="store_true",
            help="Oferta todos os serviços do catálogo nas unidades ativas (expediente padrão, seg a sex).",
        )
        parser.add_argument(
            "--atribuir-tipos",
            action="store_true",
            help="Define os tipos de serviço ofertados por Médicos, Enfermeiros e Supervisores conforme o grupo.",
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        classes = {}
        for nome, descricao in catalogo.CLASSES:
            classes[nome], _ = _upsert(ClasseServico, "classe", nome, descricao=descricao)

        tipos = {}
        for nome, descricao, tempo in catalogo.TIPOS:
            tipos[nome], _ = _upsert(TipoServico, "tipo", nome, descricao=descricao, tempo_atendimento=tempo)

        servicos = []
        criados = 0
        for nome, classe, tipo, marcacao, gera_receita, envolve_dispensacao in catalogo.SERVICOS:
            servico, criado = _upsert(
                Servico,
                "servico",
                nome,
                classe=classes[classe],
                tipo_servico=tipos[tipo],
                tipo_marcacao=marcacao,
                gera_receita=gera_receita,
                envolve_dispensacao=envolve_dispensacao,
            )
            servicos.append(servico)
            criados += criado

        self.stdout.write(
            f"Catálogo: {len(classes)} classes, {len(tipos)} tipos, {len(servicos)} serviços ({criados} novos)."
        )

        if not opts["manter_antigos"]:
            inativados = (
                ClasseServico.objects.exclude(pk__in=[c.pk for c in classes.values()]).filter(is_active=True).update(is_active=False),
                TipoServico.objects.exclude(pk__in=[t.pk for t in tipos.values()]).filter(is_active=True).update(is_active=False),
                Servico.objects.exclude(pk__in=[s.pk for s in servicos]).filter(is_active=True).update(is_active=False),
            )
            ofertas = ServicoUnidadePosto.objects.exclude(servico__in=servicos).filter(is_active=True).update(is_active=False)
            self.stdout.write(
                "Inativados fora do catálogo: {} classes, {} tipos, {} serviços, {} ofertas em unidades.".format(
                    *inativados, ofertas
                )
            )

        if opts["vincular_unidades"]:
            novos = 0
            for unidade in UnidadePosto.objects.filter(is_active=True):
                ja_ofertados = set(
                    ServicoUnidadePosto.objects.filter(unidade=unidade, is_active=True).values_list("servico_id", flat=True)
                )
                for servico in servicos:
                    if servico.pk not in ja_ofertados:
                        ServicoUnidadePosto.objects.create(
                            unidade=unidade, servico=servico, dias_semana=DIAS_UTEIS, mesmo_expediente=True
                        )
                        novos += 1
            self.stdout.write(f"Ofertas criadas nas unidades: {novos}.")

        if opts["atribuir_tipos"]:
            tipos_por_usuario = {}
            for nome_grupo, nomes_tipos in catalogo.TIPOS_POR_GRUPO.items():
                grupo = Group.objects.filter(name=nome_grupo).first()
                if grupo is None:
                    continue
                for usuario in grupo.user_set.all():
                    _, acumulados = tipos_por_usuario.setdefault(usuario.pk, (usuario, set()))
                    acumulados.update(tipos[nome] for nome in nomes_tipos)
            for usuario, tipos_usuario in tipos_por_usuario.values():
                usuario.tipo_ofertados.set(tipos_usuario)
            self.stdout.write(f"Profissionais com tipos de serviço redefinidos: {len(tipos_por_usuario)}.")

        self.stdout.write(self.style.SUCCESS("Catálogo de saúde carregado."))
