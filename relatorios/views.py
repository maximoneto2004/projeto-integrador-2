import unicodedata
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from django.db.models import Count, Exists, OuterRef, Subquery
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions
from rest_framework.response import Response

from app.permissions import DjangoModelPermissionsWithView
from agendamentos.models import Agendamento
from prontuario.models import (
    AcolhimentoFamiliar,
    AnotacaoPlanejamento,
    BeneficiosEventuais,
    DescumprimentoCondicionalidadesBolsa,
    NovoIngresso,
    PessoaReferencia,
    Prontuario,
    RegistroDesligamento,
    SaudeCuidadosMembro,
    SituacaoViolencia,
    TrabalhoRendimento,
)
from servicos.models import Servico

from .filters import (
    RelatorioAtendimentosTecnicoFilter,
    RelatorioAtividadesCadunicoFilter,
    RelatorioQuantitativoMensalFilter,
)
from .models import (
    ConfiguracaoRelatorioAtendimentosTecnico,
    ConfiguracaoRelatorioAtividadesCadunico,
)


class RelatorioAtendimentosTecnicoAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Prontuario.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = RelatorioAtendimentosTecnicoFilter
    LIMITE_EXTREMA_POBREZA = Decimal("85.00")

    @staticmethod
    def _normalizar_texto(valor):
        if not valor:
            return ""
        valor_normalizado = unicodedata.normalize("NFKD", str(valor))
        return "".join(char for char in valor_normalizado if not unicodedata.combining(char)).lower()

    @staticmethod
    def _data_limite_menoridade():
        hoje = date.today()
        try:
            return hoje.replace(year=hoje.year - 18)
        except ValueError:
            return hoje.replace(month=2, day=28, year=hoje.year - 18)

    def _beneficio_eh_bpc(self, transferencia):
        beneficio = getattr(transferencia, "beneficio", None)
        nome_beneficio = getattr(beneficio, "nome", "")
        nome_normalizado = self._normalizar_texto(nome_beneficio)
        return "bpc" in nome_normalizado or "loas" in nome_normalizado

    def _beneficio_eh_bolsa_familia(self, beneficio):
        nome_beneficio = getattr(beneficio, "nome", "")
        nome_normalizado = self._normalizar_texto(nome_beneficio)
        return "bolsa familia" in nome_normalizado

    def _beneficio_eh_bpc_social(self, beneficio):
        nome_beneficio = getattr(beneficio, "nome", "")
        nome_normalizado = self._normalizar_texto(nome_beneficio)
        return "bpc" in nome_normalizado or "loas" in nome_normalizado

    def _obter_renda_familiar_considerada(self, trabalho_rendimento):
        if trabalho_rendimento is None:
            return Decimal("0.00")

        renda_total = trabalho_rendimento.renda_total
        if renda_total is None:
            renda_total = sum(
                (membro.renda_individual or Decimal("0.00"))
                for membro in trabalho_rendimento.trabalho_rendimento_membro.all()
            )

        total_bpc = sum(
            (transferencia.valor or Decimal("0.00"))
            for transferencia in trabalho_rendimento.transferencia_renda_familia.all()
            if self._beneficio_eh_bpc(transferencia)
        )

        return Decimal(renda_total) + Decimal(total_bpc)

    def _familia_esta_em_extrema_pobreza(self, prontuario, trabalho_rendimento):
        quantidade_membros = prontuario.membros.filter(ativo=True).count()
        if quantidade_membros <= 0:
            return False

        renda_familiar = self._obter_renda_familiar_considerada(trabalho_rendimento)
        renda_per_capita = renda_familiar / Decimal(quantidade_membros)
        return renda_per_capita <= self.LIMITE_EXTREMA_POBREZA

    @staticmethod
    def _obter_ids_servicos_adicionais(request):
        ids = []
        for valor in request.query_params.getlist("servicos_adicionais"):
            for item in str(valor).split(","):
                item = item.strip()
                if not item:
                    continue
                try:
                    ids.append(str(UUID(item)))
                except (TypeError, ValueError, AttributeError):
                    continue
        return ids

    @staticmethod
    def _obter_configuracao_ativa():
        return (
            ConfiguracaoRelatorioAtendimentosTecnico.objects.filter(is_active=True)
            .prefetch_related(
                # "cadastro_unico",
                # "bolsa_familia",
                "servicos_adicionais",
                "servicos_adicionais_agrupados",
                "servicos_adicionais_pcd",
            )
            .select_related("familias_grupos", "servico_adicional_faixa_etaria")
            .order_by("-updated_at", "-created_at")
            .first()
        )

    @staticmethod
    def _obter_ids_servicos_adicionais_agrupados(request):
        ids = []
        for valor in request.query_params.getlist("servicos_adicionais_agrupados"):
            for item in str(valor).split(","):
                item = item.strip()
                if not item:
                    continue
                try:
                    ids.append(str(UUID(item)))
                except (TypeError, ValueError, AttributeError):
                    continue
        return ids

    @staticmethod
    def _obter_ids_servicos_adicionais_pcd(request):
        ids = []
        for valor in request.query_params.getlist("servicos_adicionais_pcd"):
            for item in str(valor).split(","):
                item = item.strip()
                if not item:
                    continue
                try:
                    ids.append(str(UUID(item)))
                except (TypeError, ValueError, AttributeError):
                    continue
        return ids

    @staticmethod
    def _obter_id_servico_adicional_faixa_etaria(request):
        valor = request.query_params.get("servico_adicional_faixa_etaria")
        if not valor:
            return None
        try:
            return str(UUID(str(valor).strip()))
        except (TypeError, ValueError, AttributeError):
            return None

    @staticmethod
    def _obter_id_familias_grupos(request):
        valor = request.query_params.get("familias_grupos")
        if not valor:
            return None
        try:
            return str(UUID(str(valor).strip()))
        except (TypeError, ValueError, AttributeError):
            return None

    @staticmethod
    def _calcular_idade_na_data(data_nascimento, data_referencia):
        if not data_nascimento or not data_referencia:
            return None
        idade = data_referencia.year - data_nascimento.year
        if (data_referencia.month, data_referencia.day) < (
            data_nascimento.month,
            data_nascimento.day,
        ):
            idade -= 1
        return idade

    def get(self, request):
        filtro_referencia = self.filterset_class(
            data=request.query_params,
            queryset=NovoIngresso.objects.all(),
        )
        filtro_referencia.is_valid()

        ultimo_ingresso_subquery = (
            NovoIngresso.objects.filter(prontuario_id=OuterRef("pk"))
            .order_by("-data_ingresso", "-id")
            .values("data_ingresso")[:1]
        )
        familias_acompanhadas = (
            self.queryset.annotate(
                data_ultimo_ingresso=Subquery(ultimo_ingresso_subquery)
            )
            .annotate(
                possui_desligamento_apos_ultimo_ingresso=Exists(
                    RegistroDesligamento.objects.filter(
                        prontuario_id=OuterRef("pk"),
                        data_desligamento__gte=OuterRef("data_ultimo_ingresso"),
                    )
                )
            )
            .filter(
                data_ultimo_ingresso__isnull=False,
                possui_desligamento_apos_ultimo_ingresso=False,
            )
            .count()
        )
        novos_ingressos_queryset = filtro_referencia.qs
        familias_que_iniciaram_acompanhamento = (
            novos_ingressos_queryset.values("prontuario_id").distinct().count()
        )
        prontuarios_novas_familias = (
            Prontuario.objects.filter(
                id__in=novos_ingressos_queryset.values_list("prontuario_id", flat=True)
            )
            .prefetch_related("membros")
            .distinct()
        )
        trabalhos_rendimento_por_prontuario = {
            trabalho.prontuario_id: trabalho
            for trabalho in TrabalhoRendimento.objects.filter(
                prontuario_id__in=prontuarios_novas_familias.values_list("id", flat=True)
            )
            .prefetch_related(
                "trabalho_rendimento_membro",
                "transferencia_renda_familia__beneficio",
            )
        }
        pessoas_referencia_por_prontuario = {
            pessoa_referencia.prontuario_id: pessoa_referencia
            for pessoa_referencia in PessoaReferencia.objects.filter(
                prontuario_id__in=prontuarios_novas_familias.values_list("id", flat=True)
            ).prefetch_related("beneficio")
        }
        familias_em_extrema_pobreza = sum(
            1
            for prontuario in prontuarios_novas_familias
            if self._familia_esta_em_extrema_pobreza(
                prontuario,
                trabalhos_rendimento_por_prontuario.get(prontuario.id),
            )
        )
        familias_novas_com_bolsa_familia = sum(
            1
            for prontuario in prontuarios_novas_familias
            if (
                prontuario.id in pessoas_referencia_por_prontuario
                and any(
                    self._beneficio_eh_bolsa_familia(beneficio)
                    for beneficio in pessoas_referencia_por_prontuario[
                        prontuario.id
                    ].beneficio.all()
                )
            )
        )
        familias_novas_com_bpc = sum(
            1
            for prontuario in prontuarios_novas_familias
            if (
                prontuario.id in pessoas_referencia_por_prontuario
                and any(
                    self._beneficio_eh_bpc_social(beneficio)
                    for beneficio in pessoas_referencia_por_prontuario[
                        prontuario.id
                    ].beneficio.all()
                )
            )
        )
        familias_novas_com_descumprimento_condicionalidades = (
            DescumprimentoCondicionalidadesBolsa.objects.filter(
                prontuario_id__in=prontuarios_novas_familias.values_list("id", flat=True)
            )
            .values("prontuario_id")
            .distinct()
            .count()
        )
        familias_novas_com_trabalho_infantil = (
            SituacaoViolencia.objects.filter(
                prontuario_id__in=prontuarios_novas_familias.values_list("id", flat=True),
                trabalho_infantil="SIM",
            )
            .values("prontuario_id")
            .distinct()
            .count()
        )
        familias_novas_com_acolhimento_familiar = (
            AcolhimentoFamiliar.objects.filter(
                prontuario_id__in=prontuarios_novas_familias.values_list("id", flat=True),
                membro__cidadao__data_nascimento__gt=self._data_limite_menoridade(),
            )
            .values("prontuario_id")
            .distinct()
            .count()
        )

        mes_referencia = int(filtro_referencia.form.cleaned_data["mes_referencia"])
        ano_referencia = int(filtro_referencia.form.cleaned_data["ano_referencia"])
        unidade_cras = filtro_referencia.form.cleaned_data.get("unidade_cras")
        configuracao_relatorio = self._obter_configuracao_ativa()
        servicos_adicionais_selecionados_ids = self._obter_ids_servicos_adicionais(request)
        if not servicos_adicionais_selecionados_ids and configuracao_relatorio:
            servicos_adicionais_selecionados_ids = [
                str(servico.id)
                for servico in configuracao_relatorio.servicos_adicionais.all()
            ]
        servicos_adicionais_agrupados_ids = self._obter_ids_servicos_adicionais_agrupados(
            request
        )
        if not servicos_adicionais_agrupados_ids and configuracao_relatorio:
            servicos_adicionais_agrupados_ids = [
                str(servico.id)
                for servico in configuracao_relatorio.servicos_adicionais_agrupados.all()
            ]
        servicos_adicionais_pcd_ids = self._obter_ids_servicos_adicionais_pcd(request)
        if not servicos_adicionais_pcd_ids and configuracao_relatorio:
            servicos_adicionais_pcd_ids = [
                str(servico.id)
                for servico in configuracao_relatorio.servicos_adicionais_pcd.all()
            ]
        familias_grupos_id = self._obter_id_familias_grupos(request)
        if (
            not familias_grupos_id
            and configuracao_relatorio
            and configuracao_relatorio.familias_grupos_id
        ):
            familias_grupos_id = str(configuracao_relatorio.familias_grupos_id)
        servico_adicional_faixa_etaria_id = self._obter_id_servico_adicional_faixa_etaria(
            request
        )
        if (
            not servico_adicional_faixa_etaria_id
            and configuracao_relatorio
            and configuracao_relatorio.servico_adicional_faixa_etaria_id
        ):
            servico_adicional_faixa_etaria_id = str(
                configuracao_relatorio.servico_adicional_faixa_etaria_id
            )
        atendimentos_realizados_queryset = Agendamento.objects.filter(
            data__month=mes_referencia,
            data__year=ano_referencia,
            situacao="FINALIZADO",
            servico__tipo_servico__nome__iexact="ESPECIALIZADO",
        )
        if unidade_cras:
            atendimentos_realizados_queryset = atendimentos_realizados_queryset.filter(
                unidade_id=unidade_cras
            )
        atendimentos_realizados = atendimentos_realizados_queryset.count()
        auxilios_natalidade_queryset = BeneficiosEventuais.objects.filter(
            data_beneficio__month=mes_referencia,
            data_beneficio__year=ano_referencia,
            beneficio="NATALIDADE",
        )
        if unidade_cras:
            auxilios_natalidade_queryset = auxilios_natalidade_queryset.filter(
                prontuario__unidade_inicial_id=unidade_cras
            )
        auxilios_natalidade_concedidos = auxilios_natalidade_queryset.count()
        auxilios_funeral_queryset = BeneficiosEventuais.objects.filter(
            data_beneficio__month=mes_referencia,
            data_beneficio__year=ano_referencia,
            beneficio="FUNERAL",
        )
        if unidade_cras:
            auxilios_funeral_queryset = auxilios_funeral_queryset.filter(
                prontuario__unidade_inicial_id=unidade_cras
            )
        auxilios_funeral_concedidos = auxilios_funeral_queryset.count()
        outros_beneficios_eventuais_queryset = BeneficiosEventuais.objects.filter(
            data_beneficio__month=mes_referencia,
            data_beneficio__year=ano_referencia,
        ).exclude(beneficio__in=["NATALIDADE", "FUNERAL"])
        if unidade_cras:
            outros_beneficios_eventuais_queryset = (
                outros_beneficios_eventuais_queryset.filter(
                    prontuario__unidade_inicial_id=unidade_cras
                )
            )
        outros_beneficios_eventuais_concedidos = (
            outros_beneficios_eventuais_queryset.count()
        )

        servicos_adicionais_selecionados_no_mes_referencia = {}
        if servicos_adicionais_selecionados_ids:
            servicos_selecionados = {
                str(servico.id): servico.nome
                for servico in Servico.objects.filter(
                    id__in=servicos_adicionais_selecionados_ids
                )
            }
            contagens_queryset = Agendamento.objects.filter(
                data__month=mes_referencia,
                data__year=ano_referencia,
                servicos_adicionais__id__in=servicos_selecionados.keys(),
            )
            if unidade_cras:
                contagens_queryset = contagens_queryset.filter(unidade_id=unidade_cras)
            contagens_servicos_adicionais = {
                str(item["servicos_adicionais__id"]): item["total"]
                for item in contagens_queryset.values("servicos_adicionais__id").annotate(
                    total=Count("id", distinct=True)
                )
            }
            for servico_id in servicos_adicionais_selecionados_ids:
                if servico_id not in servicos_selecionados:
                    continue
                servicos_adicionais_selecionados_no_mes_referencia[servico_id] = {
                    "nome": servicos_selecionados[servico_id],
                    "total": contagens_servicos_adicionais.get(servico_id, 0),
                }
        servicos_adicionais_agrupados_no_mes_referencia = None
        if servicos_adicionais_agrupados_ids:
            servicos_agrupados_mapeados = {
                str(servico["id"]): servico
                for servico in Servico.objects.filter(
                    id__in=servicos_adicionais_agrupados_ids
                ).values("id", "nome")
            }
            servicos_agrupados = [
                servicos_agrupados_mapeados[servico_id]
                for servico_id in servicos_adicionais_agrupados_ids
                if servico_id in servicos_agrupados_mapeados
            ]
            if servicos_agrupados:
                agrupados_queryset = Agendamento.objects.filter(
                    data__month=mes_referencia,
                    data__year=ano_referencia,
                    servicos_adicionais__id__in=[
                        servico["id"] for servico in servicos_agrupados
                    ],
                )
                if unidade_cras:
                    agrupados_queryset = agrupados_queryset.filter(unidade_id=unidade_cras)
                servicos_adicionais_agrupados_no_mes_referencia = {
                    "servicos": [
                        {"id": str(servico["id"]), "nome": servico["nome"]}
                        for servico in servicos_agrupados
                    ],
                    "total": agrupados_queryset.count(),
                }
        servicos_adicionais_pcd_no_mes_referencia = 0
        if servicos_adicionais_pcd_ids:
            cidadaos_pcd_ids = SaudeCuidadosMembro.objects.filter(
                deficiencia="SIM"
            ).values_list("membro__cidadao_id", flat=True)
            contagens_pcd_queryset = Agendamento.objects.filter(
                data__month=mes_referencia,
                data__year=ano_referencia,
                cidadao_id__in=cidadaos_pcd_ids,
                servicos_adicionais__id__in=servicos_adicionais_pcd_ids,
            )
            if unidade_cras:
                contagens_pcd_queryset = contagens_pcd_queryset.filter(
                    unidade_id=unidade_cras
                )
            servicos_adicionais_pcd_no_mes_referencia = contagens_pcd_queryset.distinct().count()
        familias_grupos_no_mes_referencia = None
        if familias_grupos_id:
            servico_familias_grupos = Servico.objects.filter(id=familias_grupos_id).first()
            if servico_familias_grupos:
                familias_grupos_queryset = Agendamento.objects.filter(
                    data__month=mes_referencia,
                    data__year=ano_referencia,
                    servico_id=familias_grupos_id,
                    cidadao__composicoes__ativo=True,
                )
                if unidade_cras:
                    familias_grupos_queryset = familias_grupos_queryset.filter(
                        unidade_id=unidade_cras
                    )
                familias_grupos_no_mes_referencia = {
                    "servico_id": str(servico_familias_grupos.id),
                    "servico_nome": servico_familias_grupos.nome,
                    "total": familias_grupos_queryset.values(
                        "cidadao__composicoes__prontuario_id"
                    )
                    .distinct()
                    .count(),
                }
        faixas_etarias_servico_adicional_no_mes_referencia = None
        if servico_adicional_faixa_etaria_id:
            servico_faixa_etaria = Servico.objects.filter(
                id=servico_adicional_faixa_etaria_id
            ).first()
            if servico_faixa_etaria:
                agendamentos_faixa_etaria_queryset = (
                    Agendamento.objects.filter(
                        data__month=mes_referencia,
                        data__year=ano_referencia,
                        servicos_adicionais__id=servico_adicional_faixa_etaria_id,
                    )
                    .select_related("cidadao")
                    .distinct()
                )
                if unidade_cras:
                    agendamentos_faixa_etaria_queryset = (
                        agendamentos_faixa_etaria_queryset.filter(unidade_id=unidade_cras)
                    )
                faixas_etarias_servico_adicional_no_mes_referencia = {
                    "servico_id": str(servico_faixa_etaria.id),
                    "servico_nome": servico_faixa_etaria.nome,
                    "criancas_0_a_6_anos": 0,
                    "criancas_adolescentes_7_a_14_anos": 0,
                    "adolescentes_15_a_17_anos": 0,
                    "adultos_18_a_59_anos": 0,
                    "idosos": 0,
                }
                for agendamento in agendamentos_faixa_etaria_queryset:
                    idade = self._calcular_idade_na_data(
                        getattr(agendamento.cidadao, "data_nascimento", None),
                        agendamento.data,
                    )
                    if idade is None or idade < 0:
                        continue
                    if idade <= 6:
                        faixas_etarias_servico_adicional_no_mes_referencia[
                            "criancas_0_a_6_anos"
                        ] += 1
                    elif idade <= 14:
                        faixas_etarias_servico_adicional_no_mes_referencia[
                            "criancas_adolescentes_7_a_14_anos"
                        ] += 1
                    elif idade <= 17:
                        faixas_etarias_servico_adicional_no_mes_referencia[
                            "adolescentes_15_a_17_anos"
                        ] += 1
                    elif idade <= 59:
                        faixas_etarias_servico_adicional_no_mes_referencia[
                            "adultos_18_a_59_anos"
                        ] += 1
                    else:
                        faixas_etarias_servico_adicional_no_mes_referencia[
                            "idosos"
                        ] += 1

        return Response(
            {
                "success": True,
                "result": {
                    "familias_em_acompanhamento": familias_acompanhadas,
                    "familias_que_iniciaram_acompanhamento_no_mes_referencia": familias_que_iniciaram_acompanhamento,
                    "familias_novas_em_extrema_pobreza_no_mes_referencia": familias_em_extrema_pobreza,
                    "familias_novas_com_bolsa_familia_no_mes_referencia": familias_novas_com_bolsa_familia,
                    "familias_novas_com_descumprimento_condicionalidades_no_mes_referencia": familias_novas_com_descumprimento_condicionalidades,
                    "familias_novas_com_bpc_no_mes_referencia": familias_novas_com_bpc,
                    "familias_novas_com_trabalho_infantil_no_mes_referencia": familias_novas_com_trabalho_infantil,
                    "familias_novas_com_acolhimento_familiar_no_mes_referencia": familias_novas_com_acolhimento_familiar,
                    "atendimentos_realizados_no_mes_referencia": atendimentos_realizados,
                    "servicos_adicionais_selecionados_no_mes_referencia": servicos_adicionais_selecionados_no_mes_referencia,
                    "familias_grupos_no_mes_referencia": familias_grupos_no_mes_referencia,
                    "servicos_adicionais_agrupados_no_mes_referencia": servicos_adicionais_agrupados_no_mes_referencia,
                    "servicos_adicionais_pcd_no_mes_referencia": servicos_adicionais_pcd_no_mes_referencia,
                    "faixas_etarias_servico_adicional_no_mes_referencia": faixas_etarias_servico_adicional_no_mes_referencia,
                    "auxilios_natalidade_concedidos_no_mes_referencia": auxilios_natalidade_concedidos,
                    "auxilios_funeral_concedidos_no_mes_referencia": auxilios_funeral_concedidos,
                    "outros_beneficios_eventuais_concedidos_no_mes_referencia": outros_beneficios_eventuais_concedidos,
                    "mes_referencia": int(mes_referencia),
                    "ano_referencia": int(ano_referencia),
                    "unidade_cras": str(unidade_cras) if unidade_cras else None,
                },
            }
        )


class RelatorioAtividadesCadunicoAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = RelatorioAtividadesCadunicoFilter

    @staticmethod
    def _montar_linha_indicador(indicador, contagens_por_mes):
        linha = {"indicador": indicador, "meses": {}, "total_ano": 0}
        for mes in sorted(contagens_por_mes.keys()):
            dias = contagens_por_mes[mes]
            total_mes = sum(dias.values())
            linha["meses"][f"mes_{mes}"] = {
                "dias": {
                    f"dia_{dia}": total
                    for dia, total in sorted(dias.items())
                    if total > 0
                },
                "total_mes": total_mes,
            }
            linha["total_ano"] += total_mes
        return linha

    @staticmethod
    def _obter_configuracao_ativa():
        return (
            ConfiguracaoRelatorioAtividadesCadunico.objects.filter(is_active=True)
            .prefetch_related("cadastro_unico", "bolsa_familia")
            .order_by("-updated_at", "-created_at")
            .first()
        )

    @staticmethod
    def _obter_contagens_por_mes(queryset):
        contagens = {}
        for item in queryset.values("data__month", "data__day").annotate(total=Count("id")):
            mes = item["data__month"]
            dia = item["data__day"]
            if mes not in contagens:
                contagens[mes] = {}
            contagens[mes][dia] = item["total"]
        return contagens

    def get(self, request):
        filtro_referencia = self.filterset_class(
            data=request.query_params,
            queryset=NovoIngresso.objects.all(),
        )
        filtro_referencia.is_valid()

        ano_referencia = int(filtro_referencia.form.cleaned_data["ano_referencia"])
        unidade_cras = filtro_referencia.form.cleaned_data.get("unidade_cras")
        configuracao_relatorio = self._obter_configuracao_ativa()

        atendimentos_realizados_queryset = Agendamento.objects.filter(
            data__year=ano_referencia,
            situacao="FINALIZADO",
            servico__tipo_servico__nome__iexact="COMUM",
        )
        if unidade_cras:
            atendimentos_realizados_queryset = atendimentos_realizados_queryset.filter(
                unidade_id=unidade_cras
            )
        contagens_por_mes = self._obter_contagens_por_mes(atendimentos_realizados_queryset)
        indicador_tipo_comum = self._montar_linha_indicador(
            "Atendimentos realizados - tipo COMUM",
            contagens_por_mes,
        )

        grupos_configurados = {}
        if configuracao_relatorio:
            grupos_configurados = {
                "cadastro_unico": {
                    "indicador": "Atendimentos realizados - Cadastro Único",
                    "servicos": list(configuracao_relatorio.cadastro_unico.order_by("nome")),
                },
                "bolsa_familia": {
                    "indicador": "Atendimentos realizados - Bolsa Família",
                    "servicos": list(configuracao_relatorio.bolsa_familia.order_by("nome")),
                },
            }

        grupos_servicos = {}
        for campo, grupo in grupos_configurados.items():
            indicador = grupo["indicador"]
            servicos = grupo["servicos"]
            if not servicos:
                continue
            servicos_ids = [servico.id for servico in servicos]
            servico_queryset = Agendamento.objects.filter(
                data__year=ano_referencia,
                situacao="FINALIZADO",
                servico_id__in=servicos_ids,
            )
            if unidade_cras:
                servico_queryset = servico_queryset.filter(unidade_id=unidade_cras)
            grupo_resultado = {
                "indicador": indicador,
                "servicos": [],
            }
            if campo == "cadastro_unico":
                grupo_resultado["servicos"].append(
                    {
                        "id": None,
                        "nome": "Atendimentos realizados - tipo COMUM",
                        "valores": indicador_tipo_comum,
                    }
                )
            for servico in servicos:
                servico_individual_queryset = Agendamento.objects.filter(
                    data__year=ano_referencia,
                    situacao="FINALIZADO",
                    servico_id=servico.id,
                )
                if unidade_cras:
                    servico_individual_queryset = servico_individual_queryset.filter(
                        unidade_id=unidade_cras
                    )
                contagens_servico = self._obter_contagens_por_mes(
                    servico_individual_queryset
                )
                grupo_resultado["servicos"].append(
                    {
                        "id": str(servico.id),
                        "nome": servico.nome,
                        "valores": self._montar_linha_indicador(
                            servico.nome,
                            contagens_servico,
                        ),
                    }
                )
            grupos_servicos[campo] = grupo_resultado

        return Response(
            {
                "success": True,
                "result": {
                    "grupos_servicos": grupos_servicos,
                    "ano_referencia": ano_referencia,
                    "unidade_cras": str(unidade_cras) if unidade_cras else None,
                },
            }
        )


class RelatorioQuantitativoMensalAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Prontuario.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = RelatorioQuantitativoMensalFilter

    def get(self, request):
        filtro_referencia = self.filterset_class(
            data=request.query_params,
            queryset=self.get_queryset(),
        )
        filtro_referencia.is_valid()

        mes_referencia = int(filtro_referencia.form.cleaned_data["mes_referencia"])
        ano_referencia = int(filtro_referencia.form.cleaned_data["ano_referencia"])
        unidade_cras = filtro_referencia.form.cleaned_data.get("unidade_cras")

        total_prontuarios_queryset = self.get_queryset()
        if unidade_cras:
            total_prontuarios_queryset = total_prontuarios_queryset.filter(
                unidade_inicial_id=unidade_cras
            )
        total_prontuarios_demanda_espontanea = (
            PessoaReferencia.objects.filter(
                prontuario_id__in=total_prontuarios_queryset.values("id"),
                forma_ingresso="ESPONTANEA",
            )
            .values("prontuario_id")
            .distinct()
            .count()
        )
        total_prontuarios_protecao_especial = (
            PessoaReferencia.objects.filter(
                prontuario_id__in=total_prontuarios_queryset.values("id"),
                forma_ingresso="PROTECAO_ESPECIal",
            )
            .values("prontuario_id")
            .distinct()
            .count()
        )
        total_prontuarios_outros_ingressos = (
            PessoaReferencia.objects.filter(
                prontuario_id__in=total_prontuarios_queryset.values("id"),
                forma_ingresso="OUTROS",
            )
            .values("prontuario_id")
            .distinct()
            .count()
        )
        total_prontuarios_busca_ativa = (
            PessoaReferencia.objects.filter(
                prontuario_id__in=total_prontuarios_queryset.values("id"),
                forma_ingresso="ATIVA",
            )
            .values("prontuario_id")
            .distinct()
            .count()
        )

        ultimo_ingresso_subquery = (
            NovoIngresso.objects.filter(prontuario_id=OuterRef("pk"))
            .order_by("-data_ingresso", "-id")
            .values("data_ingresso")[:1]
        )
        familias_acompanhadas_queryset = (
            total_prontuarios_queryset.annotate(
                data_ultimo_ingresso=Subquery(ultimo_ingresso_subquery)
            )
            .annotate(
                possui_desligamento_apos_ultimo_ingresso=Exists(
                    RegistroDesligamento.objects.filter(
                        prontuario_id=OuterRef("pk"),
                        data_desligamento__gte=OuterRef("data_ultimo_ingresso"),
                    )
                )
            )
            .filter(
                data_ultimo_ingresso__isnull=False,
                possui_desligamento_apos_ultimo_ingresso=False,
            )
        )
        familias_acompanhadas = familias_acompanhadas_queryset.count()
        data_limite_tres_meses = timezone.localdate() - timedelta(days=90)
        familias_acompanhadas_mais_de_tres_meses = familias_acompanhadas_queryset.filter(
            Exists(
                AnotacaoPlanejamento.objects.filter(
                    prontuario_id=OuterRef("pk"),
                    created_at__date__gte=data_limite_tres_meses,
                )
            )
        ).count()
        familias_que_iniciaram_acompanhamento_queryset = NovoIngresso.objects.filter(
            data_ingresso__month=mes_referencia,
            data_ingresso__year=ano_referencia,
        )
        if unidade_cras:
            familias_que_iniciaram_acompanhamento_queryset = (
                familias_que_iniciaram_acompanhamento_queryset.filter(
                    prontuario__unidade_inicial_id=unidade_cras
                )
            )
        familias_que_iniciaram_acompanhamento = (
            familias_que_iniciaram_acompanhamento_queryset.values("prontuario_id")
            .distinct()
            .count()
        )
        familias_desligadas_queryset = RegistroDesligamento.objects.filter(
            data_desligamento__month=mes_referencia,
            data_desligamento__year=ano_referencia,
        )
        if unidade_cras:
            familias_desligadas_queryset = familias_desligadas_queryset.filter(
                prontuario__unidade_inicial_id=unidade_cras
            )
        familias_desligadas = (
            familias_desligadas_queryset.values("prontuario_id").distinct().count()
        )

        return Response(
            {
                "success": True,
                "result": {
                    "total_prontuarios": total_prontuarios_queryset.count(),
                    "familias_em_acompanhamento": familias_acompanhadas,
                    "familias_que_iniciaram_acompanhamento_no_mes_referencia": familias_que_iniciaram_acompanhamento,
                    "familias_em_acompanhamento_mais_de_tres_meses": familias_acompanhadas_mais_de_tres_meses,
                    "familias_desligadas_do_acompanhamento_no_mes_referencia": familias_desligadas,
                    "total_prontuarios_demanda_espontanea": total_prontuarios_demanda_espontanea,
                    "total_prontuarios_protecao_especial": total_prontuarios_protecao_especial,
                    "total_prontuarios_outros_ingressos": total_prontuarios_outros_ingressos,
                    "total_prontuarios_busca_ativa": total_prontuarios_busca_ativa,
                    "mes_referencia": mes_referencia,
                    "ano_referencia": ano_referencia,
                    "unidade_cras": str(unidade_cras) if unidade_cras else None,
                },
            }
        )
