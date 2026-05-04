from rest_framework import serializers
from django.db import transaction
from prontuario.models import (
    BeneficioSocial,
    BeneficiosEventuais,
    BeneficiosServicos,
    ConvivenviaFortalecimento,
    CondicoesDeSaude,
    CondicaoEducacional,
    CondicaoEducacionalMembro,
    DescumprimentoCondicionalidadesBolsa,
    DescumprimentoEducacional,
    ExclusaoMembroComposicao,
    PessoaReferencia,
    Prontuario,
    FormaIngresso,
    OrgaoOrigemEncaminhamento,
    MembroComposicao,
    CondicaoHabitacional,
    AbastecimentoAgua,
    Parentesco,
    Unidade,
    SaudeCuidadosMembro,
    TrabalhoRendimentoMembro,
    TransferenciaRenda,
    TrabalhoRendimento,
    ConvivenciaFamiliar,
    AcompanhamentoCreas,
    SituacaoViolencia,
    AcolhimentoFamiliar,
    AcolhimentoInstitucional,
    AnotacaoPlanejamento,
    NovoIngresso,
    RegistroDesligamento,
    EvolucaoAcompanhamento,
    AvaliacaoAcompanhamentoFamiliar,
    MedidaSocioEducativaMembro,
    AcompanhamentoLAPSC,
    MedidaSocioEducativa,
)
from cidadaos.models import Cidadao
from app.serializers import BairroSerializer
from unidade_cras.serializers import UnidadeCrasSerializerDetail


class CidadaoPessoaReferenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cidadao
        fields = "__all__"


class PessoaReferenciaSerializer(serializers.ModelSerializer):
    def _get_parentesco_pessoa_referencia(self):
        return "REFERENCIA"

    def create(self, validated_data):
        cidadao = validated_data.get("pessoa_referencia")
        if cidadao:
            for field in ["logradouro", "numero", "bairro", "cep", "complemento"]:
                if validated_data.get(field) in (None, ""):
                    value = getattr(cidadao, field, None)
                    if value not in (None, ""):
                        validated_data[field] = value
        with transaction.atomic():
            pessoa_referencia = super().create(validated_data)
            parentesco = self._get_parentesco_pessoa_referencia()
            membro_defaults = {}
            if parentesco:
                membro_defaults["parentesco"] = parentesco
            membro, created = MembroComposicao.objects.get_or_create(
                prontuario=pessoa_referencia.prontuario,
                cidadao=pessoa_referencia.pessoa_referencia,
                ativo=True,
                defaults=membro_defaults,
            )
            if not created and parentesco and membro.parentesco is None:
                membro.parentesco = parentesco
                membro.save(update_fields=["parentesco"])

            condicao_educacional_membro, _ = CondicaoEducacionalMembro.objects.get_or_create(
                prontuario=pessoa_referencia.prontuario,
                membro=membro,
            )
            condicao_educacional, _ = CondicaoEducacional.objects.get_or_create(
                prontuario=pessoa_referencia.prontuario,
            )
            condicao_educacional.condicao_educacional_membro.add(
                condicao_educacional_membro
            )

            trabalho_rendimento_membro, _ = TrabalhoRendimentoMembro.objects.get_or_create(
                prontuario=pessoa_referencia.prontuario,
                membro=membro,
            )
            trabalho_rendimento, _ = TrabalhoRendimento.objects.get_or_create(
                prontuario=pessoa_referencia.prontuario,
            )
            trabalho_rendimento.trabalho_rendimento_membro.add(
                trabalho_rendimento_membro
            )
            return pessoa_referencia

    def update(self, instance, validated_data):
        old_cidadao = instance.pessoa_referencia
        old_prontuario = instance.prontuario
        cidadao = validated_data.get("pessoa_referencia")
        if cidadao:
            for field in ["logradouro", "numero", "bairro", "cep", "complemento"]:
                if validated_data.get(field) in (None, ""):
                    value = getattr(cidadao, field, None)
                    if value not in (None, ""):
                        validated_data[field] = value
        with transaction.atomic():
            pessoa_referencia = super().update(instance, validated_data)
            parentesco = self._get_parentesco_pessoa_referencia()

            if old_cidadao:
                membro_antigo = MembroComposicao.objects.filter(
                    prontuario=old_prontuario,
                    cidadao=old_cidadao,
                    ativo=True,
                ).first()
                if membro_antigo and membro_antigo.parentesco is not None:
                    membro_antigo.parentesco = None
                    membro_antigo.save(update_fields=["parentesco"])

            if pessoa_referencia.pessoa_referencia:
                membro_defaults = {}
                if parentesco:
                    membro_defaults["parentesco"] = parentesco
                membro_novo, created = MembroComposicao.objects.get_or_create(
                    prontuario=pessoa_referencia.prontuario,
                    cidadao=pessoa_referencia.pessoa_referencia,
                    ativo=True,
                    defaults=membro_defaults,
                )
                if not created and parentesco and membro_novo.parentesco is None:
                    membro_novo.parentesco = parentesco
                    membro_novo.save(update_fields=["parentesco"])

            return pessoa_referencia

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.pessoa_referencia:
            pessoa_referencia_data = CidadaoPessoaReferenciaSerializer(
                instance.pessoa_referencia, context=self.context
            ).data
            data["pessoa_referencia"] = pessoa_referencia_data
        else:
            data["pessoa_referencia"] = None
        return data

    class Meta:
        model = PessoaReferencia
        fields = "__all__"


class ProntuarioSerializer(serializers.ModelSerializer):
    pessoa_referencia = serializers.SerializerMethodField(read_only=True)
    acompanhado = serializers.SerializerMethodField(read_only=True)

    def get_pessoa_referencia(self, obj):
        pessoa_referencia = PessoaReferencia.objects.filter(prontuario=obj).first()
        if not pessoa_referencia:
            return None
        return pessoa_referencia.pessoa_referencia_id
    

    def get_acompanhado(self, obj):
        novo = len(NovoIngresso.objects.filter(prontuario=obj))
        desligamento = len(RegistroDesligamento.objects.filter(prontuario=obj))
        if novo > desligamento:
            return True
        else:
            return False

    class Meta:
        model = Prontuario
        fields = "__all__"


class FormaIngressoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormaIngresso
        fields = "__all__"


class OrgaoOrigemEncaminhamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrgaoOrigemEncaminhamento
        fields = "__all__"


class CidadaoResumoField(serializers.PrimaryKeyRelatedField):
    def use_pk_only_optimization(self):
        return False

    def to_representation(self, value):
        return {"id": value.pk, "nome_completo": value.nome}


class MembroComposicaoSerializer(serializers.ModelSerializer):
    cidadao = CidadaoResumoField(queryset=Cidadao.objects.all())

    default_error_messages = {
        "cidadao_em_outra_familia": "Cidadão já pertence a uma família."
    }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        cidadao = attrs.get("cidadao")
        prontuario = attrs.get("prontuario")
        if not cidadao:
            return attrs

        membro_existente = MembroComposicao.objects.filter(cidadao=cidadao)
        if self.instance is not None:
            membro_existente = membro_existente.exclude(pk=self.instance.pk)

        membro_inativo_mesmo_prontuario = None
        if prontuario:
            membro_inativo_mesmo_prontuario = membro_existente.filter(
                prontuario=prontuario,
                is_active=False,
            ).first()

        membros_conflitantes = membro_existente.filter(is_active=True)
        if membro_inativo_mesmo_prontuario is not None:
            membros_conflitantes = membros_conflitantes.exclude(
                pk=membro_inativo_mesmo_prontuario.pk
            )

        if membros_conflitantes.exists():
            raise serializers.ValidationError(
                {"cidadao": self.error_messages["cidadao_em_outra_familia"]}
            )

        if membro_inativo_mesmo_prontuario is not None:
            attrs["_membro_inativo_mesmo_prontuario"] = membro_inativo_mesmo_prontuario

        return attrs

    def _get_parentesco_referencia_antiga(self, parentesco_nova_referencia, sexo_referencia_antiga):
        if parentesco_nova_referencia in {"FILHO", "ENTEADO"}:
            if sexo_referencia_antiga == "FEMININO":
                return "MAE"
            if sexo_referencia_antiga == "MASCULINO":
                return "PAI"
            return "OUTRO"
        if parentesco_nova_referencia == "SOGRO":
            if sexo_referencia_antiga == "FEMININO":
                return "NORA"
            if sexo_referencia_antiga == "MASCULINO":
                return "GENRO"
            return "OUTRO"

        mapa_inverso = {
            "MAE": "FILHO",
            "PAI": "FILHO",
            "CONJUGE": "CONJUGE",
            "IRMAO_IRMA": "IRMAO_IRMA",
            "NETO": "AVO",
            "AVO": "NETO",
            "GENRO": "SOGRO",
            "NORA": "SOGRO",
            "BISNETO": "AVO",
            "NAO_PARENTE": "NAO_PARENTE",
            "OUTRO": "OUTRO",
        }
        return mapa_inverso.get(parentesco_nova_referencia, "OUTRO")

    def _reativar_objeto(self, obj):
        if not hasattr(obj, "is_active") or obj.is_active:
            return
        obj.is_active = True
        update_fields = ["is_active", "updated_at"]
        if hasattr(obj, "ativo"):
            obj.ativo = True
            update_fields.append("ativo")
        obj.save(update_fields=update_fields)

    def _reativar_referencias_objeto(self, obj, visitados):
        chave_objeto = (obj.__class__, obj.pk)
        if chave_objeto in visitados:
            return
        visitados.add(chave_objeto)

        for relation in obj._meta.related_objects:
            if not relation.auto_created or not (relation.one_to_many or relation.one_to_one):
                continue

            accessor_name = relation.get_accessor_name()
            if not accessor_name:
                continue

            if relation.one_to_one:
                try:
                    relacionados = [getattr(obj, accessor_name)]
                except relation.related_model.DoesNotExist:
                    relacionados = []
            else:
                related_manager = getattr(obj, accessor_name, None)
                if related_manager is None:
                    continue
                relacionados = list(related_manager.all())

            for relacionado in relacionados:
                self._reativar_referencias_objeto(relacionado, visitados)

        self._reativar_objeto(obj)

    def _reativar_membro_existente(self, membro, validated_data):
        for field, value in validated_data.items():
            setattr(membro, field, value)

        membro.is_active = True
        membro.ativo = validated_data.get("ativo", True)
        membro.data_saida = None
        update_fields = list(validated_data.keys()) + [
            "is_active",
            "ativo",
            "data_saida",
            "updated_at",
        ]
        membro.save(update_fields=list(dict.fromkeys(update_fields)))
        self._reativar_referencias_objeto(membro, visitados=set())
        return membro

    def create(self, validated_data):
        with transaction.atomic():
            membro_inativo_mesmo_prontuario = validated_data.pop(
                "_membro_inativo_mesmo_prontuario", None
            )
            if membro_inativo_mesmo_prontuario is not None:
                return self._reativar_membro_existente(
                    membro_inativo_mesmo_prontuario,
                    validated_data,
                )

            membro = super().create(validated_data)
            condicao_educacional_membro, _ = CondicaoEducacionalMembro.objects.get_or_create(
                prontuario=membro.prontuario,
                membro=membro,
            )
            condicao_educacional, _ = CondicaoEducacional.objects.get_or_create(
                prontuario=membro.prontuario,
            )
            condicao_educacional.condicao_educacional_membro.add(
                condicao_educacional_membro
            )

            trabalho_rendimento_membro, _ = TrabalhoRendimentoMembro.objects.get_or_create(
                prontuario=membro.prontuario,
                membro=membro,
            )
            trabalho_rendimento, _ = TrabalhoRendimento.objects.get_or_create(
                prontuario=membro.prontuario,
            )
            trabalho_rendimento.trabalho_rendimento_membro.add(
                trabalho_rendimento_membro
            )

            saude_cuidado_membro, _ = SaudeCuidadosMembro.objects.get_or_create(
                prontuario=membro.prontuario,
                membro=membro,
            )
            saude_cuidado, _ = CondicoesDeSaude.objects.get_or_create(
                prontuario=membro.prontuario,
            )
            saude_cuidado.condicoes_saude_membro.add(
                saude_cuidado_membro
            )

            medida_educativa_membro, _ = MedidaSocioEducativaMembro.objects.get_or_create(
                prontuario=membro.prontuario,
                membro=membro,
            )
            medida_socio, _ = MedidaSocioEducativa.objects.get_or_create(
                prontuario=membro.prontuario,
            )
            medida_socio.membro_socio_educativo.add(
                medida_educativa_membro
            )
            return membro

    def update(self, instance, validated_data):
        parentesco_anterior = instance.parentesco
        novo_parentesco = validated_data.get("parentesco", instance.parentesco)
        novo_prontuario = validated_data.get("prontuario", instance.prontuario)

        with transaction.atomic():
            if (
                parentesco_anterior == "REFERENCIA"
                and novo_parentesco != "REFERENCIA"
            ):
                raise serializers.ValidationError(
                    {
                        "parentesco": (
                            "O prontuário não pode ficar sem pessoa de referência."
                        )
                    }
                )

            if (
                novo_parentesco == "REFERENCIA"
                and instance.parentesco != "REFERENCIA"
            ):
                referencia_antiga = MembroComposicao.objects.filter(
                    prontuario=novo_prontuario,
                    ativo=True,
                    parentesco="REFERENCIA",
                ).exclude(pk=instance.pk).select_related("cidadao").first()
                if referencia_antiga:
                    referencia_antiga.parentesco = self._get_parentesco_referencia_antiga(
                        parentesco_anterior,
                        referencia_antiga.cidadao.sexo,
                    )
                    referencia_antiga.save(update_fields=["parentesco"])

            return super().update(instance, validated_data)

    class Meta:
        model = MembroComposicao
        fields = "__all__"


class CondicaoHabitacionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = CondicaoHabitacional
        fields = "__all__"


class AbastecimentoAguaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AbastecimentoAgua
        fields = "__all__"


class ParentescoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parentesco
        fields = "__all__"

class UnidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unidade
        fields = "__all__"

class BeneficioSocialSerializer(serializers.ModelSerializer):
    class Meta:
        model = BeneficioSocial
        fields = "__all__"


class AtivosManyToManyRepresentationMixin:
    active_many_to_many_fields = ()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for field_name in self.active_many_to_many_fields:
            related_manager = getattr(instance, field_name, None)
            if related_manager is None:
                continue
            data[field_name] = [
                str(pk)
                for pk in related_manager.filter(is_active=True).values_list(
                    "pk", flat=True
                )
            ]
        return data


class CondicaoEducacionalSerializer(
    AtivosManyToManyRepresentationMixin, serializers.ModelSerializer
):
    active_many_to_many_fields = (
        "condicao_educacional_membro",
        "descumprimento_educacional_membro",
    )

    class Meta:
        model = CondicaoEducacional
        fields = "__all__"


class CondicaoEducacionalMembroSerializer(serializers.ModelSerializer):
    class Meta:
        model = CondicaoEducacionalMembro
        fields = "__all__"


class DescumprimentoEducacionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DescumprimentoEducacional
        fields = "__all__"


class DescumprimentoCondicionalidadesBolsaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DescumprimentoCondicionalidadesBolsa
        fields = "__all__"


class ExclusaoMembroComposicaoSerializer(serializers.ModelSerializer):
    membro = serializers.CharField(read_only=True)
    membro_id = serializers.PrimaryKeyRelatedField(
        source="membro_obj",
        queryset=MembroComposicao.objects.select_related("cidadao").filter(
            is_active=True
        ),
        write_only=True,
    )

    def _desativar_referencias_membro(self, membro):
        self._desativar_referencias_objeto(membro, visitados=set())

    def _desativar_objeto(self, obj):
        if not getattr(obj, "is_active", False):
            return
        obj.is_active = False
        obj.save(update_fields=["is_active", "updated_at"])

    def _desativar_referencias_objeto(self, obj, visitados):
        chave_objeto = (obj.__class__, obj.pk)
        if chave_objeto in visitados:
            return
        visitados.add(chave_objeto)

        # Desativa dependências reversas em profundidade antes de desativar o objeto atual.
        for relation in obj._meta.related_objects:
            if not relation.auto_created or not (relation.one_to_many or relation.one_to_one):
                continue

            accessor_name = relation.get_accessor_name()
            if not accessor_name:
                continue

            if relation.one_to_one:
                try:
                    relacionados = [getattr(obj, accessor_name)]
                except relation.related_model.DoesNotExist:
                    relacionados = []
            else:
                related_manager = getattr(obj, accessor_name, None)
                if related_manager is None:
                    continue
                relacionados = list(related_manager.all())

            for relacionado in relacionados:
                self._desativar_referencias_objeto(relacionado, visitados)

        self._desativar_objeto(obj)

    def create(self, validated_data):
        with transaction.atomic():
            membro = validated_data.pop("membro_obj")

            eh_referencia = membro.parentesco == "REFERENCIA" or PessoaReferencia.objects.filter(
                prontuario=membro.prontuario,
                pessoa_referencia=membro.cidadao,
            ).exists()
            if eh_referencia:
                raise serializers.ValidationError(
                    {"membro_id": "A pessoa de referência não pode ser excluída."}
                )

            validated_data["membro"] = membro.cidadao.nome
            validated_data["prontuario"] = membro.prontuario

            self._desativar_referencias_membro(membro)

            exclusao = super().create(validated_data)
            return exclusao

    class Meta:
        model = ExclusaoMembroComposicao
        fields = "__all__"


class TrabalhoRendimentoMembroSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrabalhoRendimentoMembro
        fields = "__all__"


class SaudeCuidadosMembroSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaudeCuidadosMembro
        fields = "__all__"


class CondicoesDeSaudeSerializer(
    AtivosManyToManyRepresentationMixin, serializers.ModelSerializer
):
    active_many_to_many_fields = (
        "condicoes_saude_membro",
        "descumprimento_condicionalidade",
    )

    class Meta:
        model = CondicoesDeSaude
        fields = "__all__"


class BeneficiosEventuaisSerializer(serializers.ModelSerializer):
    class Meta:
        model = BeneficiosEventuais
        fields = "__all__"


class ConvivenviaFortalecimentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConvivenviaFortalecimento
        fields = "__all__"


class BeneficiosServicosSerializer(serializers.ModelSerializer):
    class Meta:
        model = BeneficiosServicos
        fields = "__all__"


class TransferenciaRendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransferenciaRenda
        fields = "__all__"


class TrabalhoRendimentoSerializer(
    AtivosManyToManyRepresentationMixin, serializers.ModelSerializer
):
    active_many_to_many_fields = ("trabalho_rendimento_membro",)

    class Meta:
        model = TrabalhoRendimento
        fields = "__all__"


class ConvivenciaFamiliarSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConvivenciaFamiliar
        fields = "__all__"


class AcompanhamentoCreasSerializer(serializers.ModelSerializer):
    data_final = serializers.DateField(required=False, allow_null=True)
    class Meta:
        model = AcompanhamentoCreas
        fields = "__all__"


class SituacaoViolenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SituacaoViolencia
        fields = "__all__"


class AcolhimentoFamiliarSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcolhimentoFamiliar
        fields = "__all__"


class AcolhimentoInstitucionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcolhimentoInstitucional
        fields = "__all__"


class AnotacaoPlanejamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnotacaoPlanejamento
        fields = "__all__"


class NovoIngressoSerializer(serializers.ModelSerializer):
    class Meta:
        model = NovoIngresso
        fields = "__all__"


class RegistroDesligamentoSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        prontuario = attrs.get("prontuario", getattr(self.instance, "prontuario", None))
        data_desligamento = attrs.get(
            "data_desligamento",
            getattr(self.instance, "data_desligamento", None),
        )

        novo_ingresso = NovoIngresso.objects.filter(prontuario=prontuario).first() if prontuario else None
        if prontuario and not novo_ingresso:
            raise serializers.ValidationError(
                {"prontuario": "Só é possível registrar desligamento após um novo ingresso."}
            )

        if (
            novo_ingresso
            and novo_ingresso.data_ingresso
            and data_desligamento
            and data_desligamento < novo_ingresso.data_ingresso
        ):
            raise serializers.ValidationError(
                {
                    "data_desligamento": (
                        "A data de desligamento não pode ser menor que a data de ingresso "
                        f"({novo_ingresso.data_ingresso:%d/%m/%Y})."
                    )
                }
            )

        return attrs

    class Meta:
        model = RegistroDesligamento
        fields = "__all__"


class EvolucaoAcompanhamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvolucaoAcompanhamento
        fields = "__all__"


class AvaliacaoAcompanhamentoFamiliarSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvaliacaoAcompanhamentoFamiliar
        fields = "__all__"


class MedidaSocioEducativaMembroSerializer(serializers.ModelSerializer):
    def validate(self, data):
        data_inicio = data.get("data_inicio", getattr(self.instance, "data_inicio", None))
        data_termino = data.get("data_termino", getattr(self.instance, "data_termino", None))

        if data_inicio and data_termino and data_termino < data_inicio:
            raise serializers.ValidationError(
                {"data_termino": "A data de término não pode ser menor que a data de início."}
            )
        return data
    class Meta:
        model = MedidaSocioEducativaMembro
        fields = "__all__"


class AcompanhamentoLAPSCSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcompanhamentoLAPSC
        fields = "__all__"


class MedidaSocioEducativaSerializer(
    AtivosManyToManyRepresentationMixin, serializers.ModelSerializer
):
    active_many_to_many_fields = (
        "membro_socio_educativo",
        "acompanhamento_LAPSC_membro",
    )

    class Meta:
        model = MedidaSocioEducativa
        fields = "__all__"
