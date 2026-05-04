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

FORMA_INGRESSO_CHOICES = [
    ("ESPONTANEA", "Demanda Espontânea"),
    ("ATIVA", "Busca Ativa"),
    ("PROTECAO_BASICA", "Encaminhamento Proteção Social Básica"),
    ("PROTECAO_ESPECIAL", "Encaminhamento Proteção Social Especial"),
    ("SAUDE", "Encaminhamento pela Saúde"),
    ("EDUCACAO", "Encaminhado pela Educação"),
    ("SETORIAIS", "Outras políticas setoriais"),
    ("CONSELHO", "Conselho Tutelar"),
    ("JUDICIARIO", "Poder Judiciário"),
    ("DIREITOS", "Sistema de Garantia de Direitos"),
    ("OUTROS", "Outros Encaminhamentos"),
]

LOCALIZACAO_DOMICILIO_CHOICES = [("URBANO", "Urbano"), ("RURAL", "Rural")]

ESPECIFICIDADE_SOCIAL_CHOICES = [
    ("SITUACAO_RUA", "Família/pessoa em situação de rua"),
    ("RIBEIRINHA", "Família ribeirinha"),
    ("ALDEIA", "Família indígena residente em aldeia/reserva"),
    ("QUILOMBOLA", "Família quilombola"),
    ("CIGANA", "Família cigana"),
    ("INDIGINA_NAO_RESIDENTE", "Família indígena não residente em aldeia/reserva")
]

TIPO_RESIDENCIA_CHOICES = [
    ("PROPRIA", "Própria"),
    ("ALUGADA", "Alugada"),
    ("CEDIDA", "Cedida"),
    ("OCUPADA", "Ocupada"),
]

PAREDES_EXTERNAS_CHOICES = [
    ("ALVENARIA", "Alvenaria ou madeira aparelhada"),
    ("MADEIRA", "Madeira aproveitada / taipa / materiais precários"),
]

ENERGIA_ELETRICA_CHOICES = [
    ("MEDIDOR_PROPRIO", "Sim, com medidor próprio"),
    ("MEDIDOR_COMPARTILHADO", "Sim, com medidor compartilhado"),
    ("SEM_MEDIDOR", "Sim, sem medidor"),
    ("NAO_POSSUI", "Não possui energia elétrica"),
]

SIM_NAO_CHOICES = [("SIM", "Sim"), ("NAO", "Não")]

ESGOTAMENTO_SANITARIO_CHOICES = [
    ("REDE_COLETORA", "Rede coletora/ esgoto/ pluvial"),
    ("SEPTICA", "Fossa séptica"),
    ("RUDIMENTAR", "Fossa rudimentar"),
    ("DIRETO", "Direto para rio/ lago/ mar"),
    ("SEM_BANHEIRO", "Domicílio sem banheiro"),
]

COLETA_CHOICES = [
    ("COLETA_DIRETA", "Sim, coleta direta"),
    ("COLETA_INDIRETA", "Sim, coleta indireta"),
    ("NAO_POSSUI", "Não possui coleta"),
]

URGENCIA_ATENDIMENTO_CHOICES = [("ALTA", "Alta"), ("NORMAL", "Normal/Sem Urgência")]

ESCOLARIDADE_CHOICES = [
    ("SEM_ESCOLARIDADE", "Sem Escolaridade"),
    ("FUNDAMENTAL_INCOMPLETO", "Ensino Fundamental Incompleto"),
    ("FUNDAMENTAL_COMPLETO", "Ensino Fundamental Completo"),
    ("MEDIO_INCOMPLETO", "Ensino Médio Incompleto"),
    ("MEDIO_COMPLETO", "Ensino Médio Completo"),
    ("SUPERIOR_IMCOMPLETO", "Ensino Superior Incompleto"),
    ("SUPERIOR_COMPLETO", "Ensino Superior Completo"),
    ("CRECHE", "Creche"),
    ("EDUCACAO_INFANTIL", "Educação Infantil"),
    ("EJA_FUNDAMENTAL_INCOMPLETO", "EJA - Ensino Fundamental Incompleto"),
    ("EJA_FUNDAMENTAL_COMPLETO", "EJA - Ensino Fundamental Completo"),
    ("EJA_MEDIO_INCOMPLETO", "EJA - Ensino Médio Incompleto"),
    ("EJA_MEDIO_COMPLETO", "EJA - Ensino Médio Completo"),
]

FREQUENCIA_CHOICES = [
    ("REGULAR", "Regular"),
    ("IRREGULAR", "Irregular"),
    ("NAO_FREQUENTA", "Não Frequenta"),
    ("EVADIDO", "Evadido"),
]

SITUACAO_ESCOLAR_CHOICES = [
    ("CURSANDO", "Cursando"),
    ("CONCLUIDO", "Concluído"),
    ("EVADIDO", "Evadido"),
    ("NUNCA_FREQUENTOU", "Nunca Frequentou")
]

EFEITO_DESCUMPRIMENTO_CHOICES = [
    ("ADVERTENCIA", "01 - Advertência"),
    ("BLOQUEIO", "02 - Bloqueio"),
    ("SUSPENSAO", "03 - Suspensão"),
    ("CANCELAMENTO", "04 - Cancelamento"),
]

STATUS_FINAL_ATENDIMENTO_CHOICES = [
    ("REALIZADO", "Realizado"),
    ("NAO_REALIZADO_REQUISITO", "Não Realizado - Pré-requisito"),
    ("NAO_REALIZADO_RECUSA", "Não Realizado - Recusa do Cidadão"),
    ("NAO_REALIZADO_RECURSO", "Não Realizado - Indisponibilidade de Recurso"),
    ("CANCELADO", "Cancelado")
]

CONDICAO_OCUPACAO_CHOICES = [
    ("NAO_TRABALHA", "0 - Não trabalha"),
    ("CONTA_PROPRIA", "1 - Conta própria(bico, autônomo)"),
    ("TRABALHADOR_RURAL", "2 - Trabalhador temporário em área rura"),
    ("SEM_CARTEIRA", "3 - Empregado sem carteira de trabalho assinada"),
    ("COM_CARTEIRA", "4 -  Empregado com carteira de trabalho assinada"),
    ("DOMESTICO_SEM", "5 - Trabalhador doméstico sem carteira de trabalho assinada"),
    ("DOMESTICO_COM", "6 - Trabalhador doméstico com carteira de trabalho assinada"),
    ("NAO_REMUNERADO", "7 - Trabalhador não-remunerado"),
    ("MILITAR_PUBLICO", "8 - Militar ou servidor público"),
    ("EMPREGADOR", "9 - Empregador"),
    ("ESTAGIARIO", "10 - Estagiário"),
    ("APRENDIZ", "11 - Aprendiz (em condição legal)")
]

VINCULO_CHOICES = [
    ("CLT", "CLT"),
    ("AUTONOMO", "Autônomo"),
    ("INFORMAL", "Informal"),
    ("DESEMPREGADO", "Desempregado")
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

EFEITO_CODIGO_CHOICES = [
    ("ADVERTENCIA", "1 - Advertência"),
    ("BLOQUEIO", "2 - Bloqueio"),
    ("SUSPENSAO", "3 - Suspensão"),
    ("CANCELAMENTO", "4 - Cancelamento")
]

PARENTESCO_CHOICES = [
    ("REFERENCIA", "Pessoa de Referência"),
    ("CONJUGE", "Cônjuge/Companheiro(a)"),
    ("FILHO", "Filho(a)"),
    ("ENTEADO", "Enteado(a)"),
    ("BISNETO", "Bisneto(a)"),
    ("SOGRO", "Sogro(a)"),
    ("GENRO", "Genro"),
    ("NORA", "Nora"),
    ("NAO_PARENTE", "Não Parente"),
    ("AVO", "AVÓ/AVÔ"),
    ("PAI", "Pai"),
    ("MAE", "Mãe"),
    ("NETO", "Neto(a)"),
    ("IRMAO_IRMA", "Irmão/Irmã"),
    ("OUTRO", "Outro")
]

ABASTECIMENTO_CHOICES = [
    ("REDE", "Rede geral de distribuição"),
    ("POCO", "Poço, ou Nascente"),
    ("CISTERNA", "Cisterna de captação"),
    ("CARRO", "Carro Pipa"),
    ("OUTRA", "Outra forma")
]

TIPO_BENEFICIOS = [
    ("NATALIDADE", "Auxílio Natalidade"),
    ("FUNERAL", "Auxílio Funeral"),
    ("EMERGENCIA", "Item/Kit Emergência"),
    ("BASICA", "Cesta Básica"),
    ("ALUGUEL", "Aluguel Social")
]

PERCEPCAO_VIOLENCIA_CHOICES = [
    ("COM_VIOLENCIA", "Conflituoso, com violência"),
    ("SEM_VIOLENCIA", "Conflituoso, sem violência"),
    ("SEM_CONFLICO", "Sem conflitos relevantes")
]

UNIDADE_REALIZACAO_CHOICES = [
    ("PROPRIA", "1 - Nesta própria unidade"),
    ("OUTRA_PUBLICA", "2 - Em outra Unidade Pública da rede Socioassistencial"),
    ("PRIVADA", "3 - Em unidade/entidade privada da rede socioassistencial"),
    ("EDUCACAO", "4 - Em unidade de rede de educação"),
    ("VINCULADA", "9 - Outra unidade vinculada a outras políticas")
]

MOTIVO_DESLIGAMENTO_CHOICES = [
    ("METAS", "1 - Avaliação Técnica (Metas atingidas)"),
    ("EVASAO", "2 - Evasão ou recusa da família"),
    ("MUDANCA", "3 - Mudança de município"),
    ("OUTRO" , "4 - Outros (Especificar em obs)")
]

OFERTA_ASSISTENCIA_CHOICES = [
    ("SIM", "Sim, integralmente"),
    ("PARCIALMENTE", "Parcialmente"),
    ("NAO", "Não foram disponibilizadas")
]

ENCAMINHAMENTOS_CHOICES = [
    ("SIM", "Sim, houve resolutividade"),
    ("PARCIAL", "Resolutividade parcial"),
    ("SEM", "Sem Resolutividade"),
    ("NAO", "Não houve necessidade de rede")
]

VINCULO_FAMILIAR_CHOICES = [
    ("SIM", "Sim, reconhece e deseja continuar"),
    ("PARCIALMENTE", "Reconhece parcialmente"),
    ("NAO", "Não reconhece a contribuição"),
]

STATUS_VUNERABILIDADE = [
    ("PIORA", "Houve agravamento/piora"),
    ("EQUIVALENTE", "Situação equivalente(sem avanços)"),
    ("AVANCO", "Houve avanço/melhoria"),
    ("SIGNIFICATIVO", "Avanço significativo (Sugere desligamento)")
]

HISTORICO_CHOICES = [
    ("membrocomposicao", "Composição Familiar"),
    ("exclusaomembrocomposicao", "Exclusão de Membro da Família"),
    ("pessoareferencia", "Pessoa de Referência"),
    ("condicaohabitacional", "Condição Habitacional"),
    ("descumprimentoeducacional", "Descumprimento de Condicionalidades Educacional"),
    ("trabalhorendimentomembro", "Trabalho e Renda por Membro"),
    ("condicaoeducacionalmembro", "Condição Educacional por Membro"),
    ("condicoesdesaude", "Condições de Saúde"),
    ("situacaoviolencia", "Situação de Violência"),
    ("saudecuidadosmembro", "Condições de Saúde por Membro"),
    ("avaliacaoacompanhamentofamiliar","Avaliação do Acompanhamento Familiar"),
    ("anotacaoplanejamento","Anotações de Planejamento Familiar"),
    ("acolhimentoinstitucional", "Acolhimento Institucional"),
    ("convivenciafamiliar","Convivência Familiar e Comunitária"),
    ("trabalhorendimento","Trabalho e Rendimento Familiar Geral"),
    ("condicaoeducacional", "Condições Educacionais"),
    ("beneficioseventuais", "Benefícios Eventuais"),
    ("novoingresso", "Novo Ingresso"),
    ("evolucaoacompanhamento"," Evolução do Acompanhamento"),
    ("acolhimentofamiliar","Acolhimento Familiar"),
    ("transferenciarenda", "Transferência de Renda"),
    ("medidasocioeducativamembro","Medidas Socioeducativas por Membro"),
    ("medidasocioeducativa","Medidas Socioeducativas"),
    ("acompanhamentolapsc", "Acompanhamento pelo CRAS"),
    ("acompanhamentocreas"," Histórico Acompanhamento pelo Creas"),
    ("descumprimentocondicionalidadesbolsa", "Descumprimento de Condicionalidades de Saúde (Bolsa Família) "),
    ("registrodesligamento","Regsitro de Desligamento"),
    ("convivenviafortalecimento","Serviços de Convivência e Fortalecimento de Vínculos"),
    ("cidadao", "Cidadão"),

]

MEDIDA_CHOICES = [
    ("ADVERTENCIA", "Advertência"),
    ("REPARAR_DANO", "Obrigação de reparar dano"),
    ("PRESTACAO_SERVICOS", "Prestação de serviços a comunidade"),
    ("LIBERDADE_ASSISTIDA", "Liberdade assistida"),
    ("SEMILIBERDADE", "Inserção em regime de semiliberdade"),
    ("ESTABELECIMENTO_EDUCACIONAL", "Internação em estabelecimento educacional"),
    ("QUALQUER", "Qualquer uma das medidas protetivas")
]
