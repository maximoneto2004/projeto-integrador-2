# Análise dos dashboards e métricas por perfil — Saúde Perto

Análise feita sobre a branch `feat/dashboards` (commit `ed626ca`) em 29/10/2026.
Cobre todas as telas com indicadores (dashboards, monitor, mapa e estoque), os dados
que o banco já guarda e o que cada perfil deveria ver.

A base metodológica vem do material da disciplina (Profª Isaura Cardoso):
*Princípios e Etapas para um Design Eficiente*, *Visualização de Dados na Tomada de
Decisão*, *Pensamento Analítico*, *Tipos de Gráficos e quando utilizá-los* e
*Transformação de Dados em Resultados com BI*.

---

## 1. Método aplicado (resumo do material)

O material propõe um caminho que este documento segue para cada perfil:

| Etapa do material | Como foi aplicada aqui |
| --- | --- |
| **Definir o objetivo** e **conhecer o público** (10 passos, 1–2) | Cada dashboard começa por uma *pergunta-chave* do perfil e pela decisão que ele toma com ela. |
| **Dado → Informação → Conhecimento → Ação** (BI) | Todo KPI proposto vem com meta/limite (informação), comparação ou tendência (conhecimento) e a ação esperada. |
| **Analisar um KPI em 5 passos**: valor atual, tendência, causa, impacto, ação | Os cartões do topo mostram valor + variação contra o período anterior; o detalhe abaixo explica a causa (por serviço, profissional, horário). |
| **Escolher o gráfico pelo tipo de dado** | Barras para comparar categorias, linha para tempo, mapa de calor para intensidade geográfica/horária, dispersão para relação entre duas variáveis, medidor para meta. Pizza só com 3–5 fatias. |
| **Hierarquia visual** (tamanho, posição, contraste) | Layout em 3 faixas: KPIs no topo → tendência e comparação no meio → tabelas de detalhe embaixo. |
| **Cores consistentes e com significado** | Uma paleta semântica única para todo o sistema (seção 8). |
| **Evitar ciladas**: escala manipulada, cores enganosas, excesso de informação | Barras sempre com eixo em zero, no máximo 4 linhas por gráfico, até 6 KPIs por faixa, e uma mesma métrica com a mesma fórmula em todas as telas. |
| **Testar e reavaliar** (passo 10) | Seção 9: roteiro de validação com a carga de demonstração. |

O último ponto é o mais urgente: hoje a **mesma métrica tem fórmulas diferentes em
telas diferentes**, o que quebra a confiança no dashboard (o material chama isso de
falta de "cultura digital": desconfiança nos dashboards e decisões por achismo).

---

## 2. Situação atual das telas

| Tela | Rota | Quem acessa (`security/acess.ts`) | Fonte | Situação |
| --- | --- | --- | --- | --- |
| Dashboard da Unidade (Supervisor) | `/sistema/dashboard` | Supervisor, Coordenador | API | **Parcialmente correta.** SLA novo está certo; demais blocos usam cálculos antigos. |
| Dashboard do Gestor | `/sistema/dashboard-gestor` | Gestor | API | **Incorreta em vários pontos** (ver 3.2). Textos ainda falam em CRAS. |
| Monitor da Unidade | `/sistema/monitor-unidade` | Gestor, Admin | API | Duplica o dashboard do supervisor com fórmulas antigas e sem SLA. |
| Dashboard do Atendente | `/sistema/dashboard-atendente` | Médico, Enfermeiro | **Mock** | Dados fixos de CRAS ("Bolsa Família", "BPC", turno "Noite"). |
| Mapa das Unidades | `/sistema/mapa-unidades` | Gestor, Admin | API | Bloco `analise` (novo) correto; bloco `metricas` usa fórmulas antigas e mostra a origem "156". |
| Alertas de estoque | `/sistema/estoque/alertas` | Supervisor, Admin, Coordenador | API | Lista, sem visão gráfica nem tendência. |
| Farmacêutico | — | — | — | **Não tem dashboard.** |
| Recepcionista | — | — | — | **Não tem dashboard.** |
| Administrador | — | — | — | Sem visão de qualidade de dados/uso. |

---

## 3. Problemas encontrados nos cálculos

### 3.1 Inconsistências entre telas (a mesma métrica, fórmulas diferentes)

| Métrica | Supervisor | Gestor | Monitor | Mapa (`metricas`) |
| --- | --- | --- | --- | --- |
| **Não comparecimento** | `AUSENCIA_CIDADAO` + `ATIVADO_AUSENTE` | só `AUSENCIA_CIDADAO` ([serializers.py:294](../dashboard/serializers.py:294)) | igual ao Supervisor | — |
| **Aguardando atendimento** | `ATIVADO` + `CHAMANDO` | só `ATIVADO` ([serializers.py:292](../dashboard/serializers.py:292)) | igual ao Supervisor | — |
| **Tempo médio (TMA)** | `sla.py` (datas completas, encerrados, sem negativos) | média de `TimeField` antigos, **sem filtrar situação** ([serializers.py:299](../dashboard/serializers.py:299)) | média de `TimeField` antigos, sem filtrar situação ([serializers.py:540](../dashboard/serializers.py:540)) | só `FINALIZADO` e `TimeField` antigos ([views.py:274](../dashboard/views.py:274)) |
| **Consulta encerrada** | `FINALIZADO` + `AGUARDANDO_RETIRADA` + `CHAMANDO_RETIRADA` (no SLA) | — | só `FINALIZADO` | só `FINALIZADO` |

Consequência: o mesmo dia, na mesma unidade, mostra tempos médios e taxas de
ausência diferentes no Supervisor, no Monitor e no Mapa. Consultas que terminaram e
foram para a farmácia somem das métricas de serviço do Supervisor e do Monitor
(`servicos_metricas` filtra só `FINALIZADO`, [serializers.py:168](../dashboard/serializers.py:168)).

**Correção recomendada:** criar um módulo único de definições (por exemplo
`dashboard/indicadores.py`) com as constantes de situação e as funções de cada métrica,
e fazer Supervisor, Gestor, Monitor e Mapa usarem só ele. O `sla.py` já é o modelo a seguir.

### 3.2 Dashboard do Gestor

- **Comparecimento por unidade é o mesmo número para todas as unidades**: o valor
  global é copiado para cada linha ([AdminDashboardGestor.tsx:125](../Frontend/src/pages/Sistema/Dashboards/AdminDashboardGestor.tsx:125)).
- **"Espera média" por unidade é, na verdade, a duração da consulta**
  ([AdminDashboardGestor.tsx:126](../Frontend/src/pages/Sistema/Dashboards/AdminDashboardGestor.tsx:126)). Espera e duração são métricas diferentes.
- **"Unidades em atenção"** usa limites fixos no código (fila > 20, ocupação > 85 %, "espera" > 25 min, [linha 149](../Frontend/src/pages/Sistema/Dashboards/AdminDashboardGestor.tsx:149)), sem relação com a meta de cada serviço.
- **Agregação por nome da unidade** em vez de id. O nome é único no banco, então não havia fusão de unidades, mas o frontend não recebia o id. *(Corrigido na etapa 1: agora agrupa por id e devolve `unidade_id`.)*
- **"Equipe"** conta só quem atendeu no período (`Count("atendente")`), não os profissionais lotados.
- **"Atendimentos no período"** conta todos os agendamentos, inclusive cancelados e futuros.
- **"Perfis de público"** em pizza mostra só quem *está aguardando* na fila com prioridade; não é o perfil do público atendido.
- Em erro, a API devolve `200` com `detail: str(e)` ([views.py:111](../dashboard/views.py:111)): esconde a falha do frontend e expõe detalhes internos.
- Texto do cabeçalho: "unidades do CRAS" ([linha 206](../Frontend/src/pages/Sistema/Dashboards/AdminDashboardGestor.tsx:206)).

### 3.3 Dashboard do Supervisor

- **Taxa de não comparecimento** divide pelo total de agendamentos, incluindo
  cancelados e agendamentos ainda futuros ([serializers.py:118](../dashboard/serializers.py:118)). Em "Semana", os dias que ainda não chegaram derrubam a taxa.
  Denominador correto: agendamentos com data já passada (ou horário já passado, no dia) e não cancelados.
- **"Reagendados" fixo em 0** ([AdminDashboardSupervisor.tsx:112](../Frontend/src/pages/Sistema/Dashboards/AdminDashboardSupervisor.tsx:112)). Não existe campo para isso no modelo; ou se cria o dado, ou se remove a barra.
- **Gráfico de status mistura duas tabelas**: "Fila" vem de `FilaEspera` e o resto de `Agendamento`; e as situações `AGUARDANDO_RETIRADA`/`CHAMANDO_RETIRADA` não entram em nenhuma barra, então a soma não fecha com o total.
- **"Atendimentos por hora"** é, na verdade, *agendamentos por horário marcado*. O título deve dizer isso, ou a série deve usar `inicio_atendimento_em`.
- **"Atendimentos por serviço"** usa uma variável chamada `produtividadePorColaborador` com dados por serviço; o SLA por médico (`sla.por_medico`) existe na API mas só aparece no detalhamento.
- **`pct_acima_esperado`** é "quanto a média passou da meta", não "% de consultas acima da meta". O contador `acima` é calculado e descartado ([serializers.py:186](../dashboard/serializers.py:186), [234](../dashboard/serializers.py:234)). Para o supervisor, o indicador útil é o segundo: **% de consultas dentro da meta**.
- Descrição de origem: "Demanda espontânea, portal, SPU ou CRAS" ([OrigemAtendimentosSection.tsx:18](../Frontend/src/components/dashboard-supervisor/sections/OrigemAtendimentosSection.tsx:18)).

### 3.4 Mapa das Unidades

- Mostra a origem **"156"**, que foi removida do posto de saúde ([views.py:242](../dashboard/views.py:242), `AdminMapaUnidades.tsx:546`). A carga de demonstração também ainda gera essa origem ([app/demo/carga.py:244](../app/demo/carga.py:244)).
- Classifica "especializado" procurando a palavra `"especial"` no nome do tipo de serviço ([views.py:310](../dashboard/views.py:310)). Deve usar um campo (`ClasseServico`/`TipoServico`), não texto.
- Os rótulos dizem "30d" (`servicos_prestados_30d`) mesmo quando o período escolhido é outro.
- Existe a rota `mapa/bairros.geojson` com os bairros de Fortaleza já ligados ao cadastro, mas **o frontend não a usa**. É o recurso mais valioso não explorado (seção 6).

### 3.5 Escopo e permissão

- O Supervisor tem escopo por unidade de lotação (`SupervisorScopeMixin`). O **Monitor** e o **Gestor** usam apenas `DjangoModelPermissionsWithView` sobre `Agendamento`: qualquer perfil com permissão de ver agendamentos (recepcionista, médico) consegue chamar essas APIs e ler qualquer unidade. Devem ter permissão própria, como o mapa já tem (`GestorMapaPermission`).

### 3.6 Dados de demonstração que limitam os gráficos

A carga sintética é boa para volume, mas alguns campos saem constantes e deixam
gráficos "chapados":

- `classificacao_risco` é sempre `VERDE`; `cid` não é preenchido;
- o bairro do cidadão é sempre o bairro da unidade (o mapa por bairro não teria variação);
- `sexo` não é preenchido; não há `ChamadaPainel`;
- a fila tem só `PREFERENCIAL` e `NORMAL` (nunca `PREFERENCIAL+`) e só urgência `NORMAL`.

Vale variar esses campos em `app/demo/carga.py` antes de apresentar os dashboards novos.

---

## 4. Dicionário único de métricas

Proposta de definição oficial, para ser usada em **todas** as telas. Cada linha diz a
fórmula, a fonte e quem usa.

| Métrica | Definição | Fonte | Usado por |
| --- | --- | --- | --- |
| **Agendamentos do período** | Agendamentos com `data` no período, exceto cancelados | `Agendamento` | Todos |
| **Consultas realizadas** | Situação em `FINALIZADO`, `AGUARDANDO_RETIRADA`, `CHAMANDO_RETIRADA` (`SITUACOES_ENCERRADAS`) | `Agendamento` | Todos |
| **Absenteísmo (%)** | (`AUSENCIA_CIDADAO` + `ATIVADO_AUSENTE`) ÷ agendamentos já vencidos e não cancelados | `Agendamento` | Gestor, Supervisor, Recepção |
| **Taxa de cancelamento (%)** | Cancelados ÷ total, separando `CANCELADO_CIDADAO` e `CANCELADO_CRAS` (renomear para "pela unidade") | `Agendamento` | Gestor, Supervisor |
| **TMA — tempo médio de consulta** | Média de `fim_atendimento_em − inicio_atendimento_em` dos encerrados (regras do `sla.py`) | `Agendamento` | Todos |
| **% dentro da meta (SLA)** | Consultas com duração ≤ `TipoServico.tempo_atendimento` ÷ consultas medidas | `Agendamento` + `TipoServico` | Gestor, Supervisor, Médico |
| **Tempo de espera** | `inicio_atendimento_em − (data + horario)`; negativos = 0 (chegou antes) | `Agendamento` | Gestor, Supervisor, Recepção |
| **Ocupação da agenda (%)** | `vagas_ocupadas` ÷ `vagas` em `AgendaVaga` (+ encaixes da fila) | `AgendaVaga` | Gestor, Supervisor, Coordenador |
| **Fila de espera** | `FilaEspera` com `status = AGUARDANDO_FILA`, por prioridade e urgência; idade média da espera (`agora − created_at`) | `FilaEspera` | Supervisor, Recepção, Gestor |
| **Tempo até a farmácia** | Do `fim_atendimento_em` até o fim da dispensação (precisa de novo campo, ver 7) | `Agendamento` | Farmacêutico, Supervisor |
| **Taxa de atendimento da receita (%)** | `quantidade_dispensada` ÷ `quantidade_prescrita` (itens `DISPENSADO` / `PARCIAL` / `PENDENTE`) | `ReceitaMedicamento` | Farmacêutico, Supervisor, Gestor |
| **Ruptura de estoque** | Medicamentos com saldo < `estoque_minimo`; dias de cobertura = saldo ÷ consumo médio diário (saídas dos últimos 30 dias) | `LoteMedicamento`, `MovimentacaoEstoque` | Farmacêutico, Supervisor, Gestor |
| **Perdas (%)** | Movimentações `PERDA` ÷ entradas no período | `MovimentacaoEstoque` | Supervisor, Gestor |
| **Lotes a vencer** | Lotes com `validade` em até 30/60/90 dias e quantidade > 0 | `LoteMedicamento` | Farmacêutico, Supervisor |
| **Classificação de risco** | Distribuição de `RegistroAtendimento.classificacao_risco` | `RegistroAtendimento` | Médico, Enfermeiro, Gestor |
| **Atendimento fora do território** | Agendamentos com `motivo_territorio` preenchido, ou bairro do cidadão fora de `bairros_abrangencia` | `Agendamento`, `Cidadao`, `UnidadePosto` | Gestor, Supervisor |

Toda tela deve mostrar, junto do número, **o período e a regra** ("Consultas
encerradas com início e fim registrados"), como o material pede para título, fonte e legenda.

---

## 5. Dashboards por perfil

Os perfis se dividem nos três níveis clássicos de BI do material:

- **Estratégico** — Gestor (rede inteira, decisões de médio prazo);
- **Tático** — Supervisor e Coordenador (uma unidade, decisões da semana);
- **Operacional** — Médico, Enfermeiro, Farmacêutico, Recepcionista (o próprio dia).

O Administrador fica à parte: cuida da **qualidade dos dados e do uso do sistema**.

### 5.1 Gestor — "Painel da Rede" (estratégico)

**Pergunta-chave:** *Quais unidades estão abaixo do esperado e por quê? Onde investir
profissionais e medicamentos?*

**Decisões:** redistribuir equipe, abrir/fechar oferta de serviço, remanejar estoque
entre unidades, cobrar planos de ação dos supervisores.

**Faixa 1 — KPIs (6 cartões, cada um com valor, seta de tendência e comparação com o período anterior):**

| KPI | Meta sugerida | Cor do alerta |
| --- | --- | --- |
| Consultas realizadas | — (volume) | — |
| Absenteísmo | ≤ 15 % | acima = vermelho |
| % dentro da meta (SLA) | ≥ 80 % | abaixo = âmbar/vermelho |
| Espera média | ≤ 30 min | acima = âmbar |
| Ocupação da agenda | 75–90 % (abaixo = ociosidade; acima = sobrecarga) | fora da faixa = âmbar |
| Medicamentos em ruptura | 0 | > 0 = vermelho |

**Faixa 2 — Comparação e tendência:**

| Visualização | Tipo | Por quê |
| --- | --- | --- |
| Evolução semanal de consultas e absenteísmo | **Linha** (2 séries, eixos separados ou dois gráficos pequenos) | Tendência no tempo. |
| Ranking de unidades por % dentro da meta | **Barras horizontais ordenadas**, uma cor, destaque para as abaixo da meta, linha de referência na meta | Comparação entre muitas categorias com nomes longos. |
| Ocupação × absenteísmo por unidade | **Dispersão** (cada ponto = unidade; tamanho = volume) | Mostra relação entre duas variáveis: unidade cheia e com muita falta precisa de confirmação de presença, não de mais vagas. |
| Demanda × capacidade por serviço | **Barras agrupadas** (vagas ofertadas × agendamentos) | Onde falta oferta. |

**Faixa 3 — Detalhe:** tabela de unidades (id, nome, consultas, absenteísmo, SLA, espera, ocupação, fila, rupturas) com ordenação e link para o Monitor da unidade.

**O que sai do Dashboard do Gestor atual:** a pizza "Perfis de público" (vira barra de
perfil do público *atendido*: faixa etária e prioridade) e o gráfico de "fila e duração".

### 5.2 Gestor/Admin — Mapa da Rede (estratégico, geográfico)

Ver a seção 6.

### 5.3 Gestor/Admin — Monitor da Unidade

Deve deixar de ser uma cópia com fórmulas antigas. Proposta: **reutilizar exatamente
os componentes do Dashboard do Supervisor**, com um seletor de unidade a mais. Assim
o gestor vê o mesmo que o supervisor daquela unidade, com os mesmos números.

### 5.4 Supervisor e Coordenador — "Painel da Unidade" (tático)

**Pergunta-chave:** *Minha unidade está cumprindo a agenda e as metas de tempo? Onde
está o gargalo hoje e nesta semana?*

**Decisões:** remanejar profissional entre serviços, abrir encaixes, bloquear/abrir
horários, ligar para confirmar presença, repor estoque.

**Faixa 1 — KPIs:** Consultas realizadas · Absenteísmo · % dentro da meta · Espera média · Ocupação da agenda · Fila aguardando (com a mais antiga em minutos).

**Faixa 2:**

| Visualização | Tipo | Observação |
| --- | --- | --- |
| Funil do dia: agendados → chegaram (ativados) → em atendimento → consulta encerrada → farmácia → finalizado | **Funil** ou barras horizontais em sequência | Substitui o gráfico de status atual, que mistura tabelas e não fecha a soma. Ausentes e cancelados aparecem ao lado, como "perdas". |
| Demanda por hora × capacidade | **Colunas** (agendados por hora) com **linha** da capacidade (vagas) | Mostra o pico e a ociosidade. |
| Mapa de calor dia da semana × hora | **Heatmap** (absenteísmo ou volume) | Mostra padrões (por exemplo, falta maior às segundas de manhã). |
| SLA por serviço | **Barras horizontais** com a meta como marcador (bullet chart) | Já existe parcialmente no SLA novo. |
| SLA por profissional | **Barras horizontais** ordenadas, com número de consultas no rótulo | Usar `sla.por_medico`. Sem ranking punitivo: mostrar ao lado o volume. |
| Origem dos agendamentos | **Barras** (Recepção, Site, Fila) | Pizza é aceitável só com 3 fatias. Sem "156". |

**Faixa 3:** a lista de atendimentos com SLA (já entregue), mais um bloco **"Estoque da unidade"**: medicamentos em ruptura, lotes a vencer em 30 dias, perdas do mês.

**Coordenador:** mesmo painel, com o foco em agenda e equipe — ocupação por serviço,
escalas sem cobertura (dias da semana sem `EscalaTrabalho` para um serviço ofertado),
bloqueios de horário no período e o volume de vagas perdidas por bloqueio.

### 5.5 Médico e Enfermeiro — "Meu Dia" (operacional)

Substitui o `AdminDashboardAtendente` mockado.

**Pergunta-chave:** *Quantos pacientes ainda tenho hoje, quem está esperando há mais
tempo, e como está meu tempo de consulta?*

**Cuidado:** este painel é para o próprio profissional. Ele vê só os próprios números
e a média da unidade como referência, sem ranking entre colegas.

**Faixa 1 — KPIs do dia:** Pacientes atendidos / agendados hoje · Aguardando agora (ativados para mim) · Meu TMA hoje × meta do serviço · Maior espera atual (min).

**Faixa 2:**

| Visualização | Tipo |
| --- | --- |
| Minha agenda do dia | **Linha do tempo** (Gantt simples por horário: agendado, atendido, ausente) |
| Meu TMA nos últimos 30 dias × meta | **Linha** com faixa da meta |
| Classificação de risco dos meus atendimentos | **Barras empilhadas 100 %** com as cores do protocolo (vermelho, laranja, amarelo, verde, azul) |

**Faixa 3 (só Médico):** principais CIDs e medicamentos que prescrevi no mês (barras
horizontais, top 10) e quantas receitas tiveram retirada imediata.

**Enfermeiro:** no lugar de CID/prescrição, a distribuição de sinais vitais alterados
na triagem (PA ≥ 140/90, glicemia ≥ 200, temperatura ≥ 37,8) — contagem em barras.

### 5.6 Farmacêutico — "Farmácia da Unidade" (operacional) — **novo**

**Pergunta-chave:** *Quem está esperando para retirar, o que vai faltar e o que vai vencer?*

**Faixa 1 — KPIs:** Fila de retirada agora (`AGUARDANDO_RETIRADA`) · Tempo médio de espera na farmácia · Receitas atendidas hoje · % de itens dispensados integralmente · Medicamentos abaixo do mínimo · Lotes a vencer em 30 dias.

**Faixa 2:**

| Visualização | Tipo |
| --- | --- |
| Dias de cobertura por medicamento | **Barras horizontais** ordenadas do menor para o maior, com a linha de 7 dias e cores de alerta |
| Saídas diárias dos medicamentos mais dispensados | **Linha** (até 4 medicamentos) |
| Status dos itens de receita (Dispensado, Parcial, Pendente) | **Barras empilhadas** por semana |
| Validade dos lotes | **Linha do tempo**/barras por mês de vencimento (quantidade) |

**Faixa 3:** tabela de rupturas (o que foi prescrito e não pôde ser dispensado) — dado
que alimenta o pedido de compra do Supervisor e do Gestor.

### 5.7 Recepcionista — "Fluxo do Dia" (operacional) — **novo**

**Pergunta-chave:** *Quem ainda deve chegar, quem está esperando e há vaga para encaixe?*

Painel simples, quase uma tela de operação, com atualização automática:

- KPIs: Esperados hoje · Chegaram · Ainda não chegaram (com horário já passado) · Vagas livres hoje por serviço · Fila de espera por prioridade.
- Lista "atrasados" (horário passou e não foi ativado) — ação: ligar ou marcar ausência.
- Barras de vagas livres por serviço nas próximas horas (para encaixe da fila).
- Indicador de cidadãos com cadastro incompleto atendidos hoje (sem CNS, telefone ou bairro).

### 5.8 Administrador — "Qualidade dos dados e uso" — **novo**

**Pergunta-chave:** *Os dados que alimentam os dashboards são confiáveis?*

Ligado diretamente ao "processamento/validação de dados" do material:

- % de consultas sem início/fim registrado (o contador `sem_medicao` do SLA, por unidade);
- unidades sem coordenadas (somem do mapa) e sem bairros de abrangência;
- serviços sem `tempo_atendimento` (sem meta de SLA);
- medicamentos sem `estoque_minimo`; itens de receita sem medicamento do catálogo (`itens_legados_sem_catalogo`);
- cidadãos sem bairro ou CNS;
- profissionais ativos sem escala ou sem unidade de lotação.

Visualização: cartões com contagem + barras por unidade + tabela com link para corrigir.

### 5.9 Cidadão

Não precisa de dashboard. A única métrica útil para ele é a **previsão de espera** e a
posição na fila (área do cidadão / painel público), calculadas com a mesma regra de
espera média do dicionário.

### Resumo: quem vê o quê

| Perfil | Dashboard | Nível | Escopo |
| --- | --- | --- | --- |
| Gestor | Painel da Rede + Mapa + Monitor da Unidade | Estratégico | Todas as unidades |
| Administrador | Qualidade dos dados + Mapa + Monitor | Apoio | Todas as unidades |
| Supervisor | Painel da Unidade (com bloco de estoque) | Tático | Unidades de lotação |
| Coordenador | Painel da Unidade (foco agenda e equipe) | Tático | Unidades de lotação |
| Médico | Meu Dia (com CID e prescrições) | Operacional | Só os próprios atendimentos |
| Enfermeiro | Meu Dia (com triagem) | Operacional | Só os próprios atendimentos |
| Farmacêutico | Farmácia da Unidade | Operacional | Unidade ativa |
| Recepcionista | Fluxo do Dia | Operacional | Unidade ativa |

---

## 6. Mapa: camadas e análises possíveis

Hoje o mapa tem marcadores das unidades e a camada de calor de medicamentos. Proposta
de camadas, escolhidas uma por vez (para não haver excesso de informação):

| Camada | Visualização | Pergunta que responde |
| --- | --- | --- |
| **Unidades** (atual) | Marcador colorido pelo SLA da unidade (verde/âmbar/vermelho) e tamanho pelo volume | Onde estão as unidades com problema? |
| **Demanda por bairro** | **Coroplético** usando o `mapa/bairros.geojson` já existente: cidadãos atendidos por bairro de residência (ou por 1.000 habitantes, se houver população) | De onde vêm os pacientes? |
| **Cobertura territorial** | Bairros de abrangência pintados pela unidade responsável; bairros sem unidade em cinza | Há bairros descobertos? |
| **Fora do território** | Linhas ou contagem por bairro de cidadãos atendidos fora da unidade de referência | A rede está mal distribuída? |
| **Absenteísmo por bairro** | Coroplético (escala sequencial de uma cor) | Onde a falta é maior (transporte, distância)? |
| **Medicamentos** (atual) | Calor por receitas de um medicamento | Onde cada medicamento é mais prescrito? |
| **Ruptura de estoque** | Marcador da unidade com ícone de alerta quando algum medicamento está abaixo do mínimo; ao lado, unidades vizinhas com sobra | De onde remanejar? |
| **Condições crônicas** | Coroplético de cidadãos com hipertensão/diabetes (de `condicoes_cronicas` ou CID) | Onde concentrar ações de prevenção? |

Regras visuais do mapa: escala **sequencial** de uma cor para quantidade, **divergente**
só quando houver ponto médio (meta); legenda sempre visível; valores absolutos e por
habitante nunca misturados na mesma camada.

---

## 7. Dados que faltam coletar

Algumas perguntas importantes não podem ser respondidas com o que o banco guarda hoje:

| Dado faltando | Para que serve | Sugestão |
| --- | --- | --- |
| Hora de chegada (quando vira `ATIVADO`) | Espera real (chegada → início), separada do atraso do paciente | `ativado_em` no `Agendamento` |
| Hora da chamada | Tempo chamado → início (paciente demorou a entrar?) | Já existe `ChamadaPainel.chamado_em`; usar nos indicadores |
| Fim da dispensação | Tempo na farmácia | `dispensado_em` no `Agendamento` ou na `Receita` |
| Reagendamento | Barra "Reagendados" do supervisor | `reagendado_de` (FK para o agendamento original) |
| Motivo do cancelamento/ausência | Causa do absenteísmo (análise de causa do material) | Lista fixa de motivos |
| População por bairro | Taxas por 1.000 habitantes no mapa | Tabela de população (IBGE) por `Bairro` |

---

## 8. Padrão visual para todos os dashboards

- **Cores semânticas fixas** (definidas uma vez, em `constants/`):
  - realizado/dentro da meta: verde; atenção: âmbar; fora da meta/ausência/ruptura: vermelho;
  - em andamento: azul; aguardando: cinza-azulado; cancelado: cinza.
  - Classificação de risco sempre com as cores do protocolo.
- **Barras em uma cor só**, com destaque apenas no item que importa; eixo sempre começando em zero.
- **Linhas**: no máximo 4 séries, rótulo direto na linha em vez de legenda.
- **Pizza/rosca**: só com 3–5 categorias e soma = 100 %. Nos demais casos, barras.
- **Todo cartão de KPI** mostra: valor, unidade (min, %), comparação com o período anterior e a meta.
- **Todo gráfico** tem título que diz a conclusão possível ("Absenteísmo por dia da semana"), período e regra de cálculo no subtítulo.
- **Estados vazios e "sem medição"** visíveis (o SLA novo já faz isso) — não mostrar 0 quando o dado não existe.
- **Filtros iguais em todas as telas**: Hoje · Semana · Mês · Período, com o período anterior equivalente usado na comparação.

---

## 9. Roteiro de implementação sugerido

| Ordem | Entrega | Motivo |
| --- | --- | --- |
| 1 ✅ | Módulo único de indicadores no backend e migração de Supervisor, Gestor, Monitor e Mapa para ele | Corrige a inconsistência entre telas, que é o problema mais grave. Feito em `dashboard/indicadores.py`, com testes em `dashboard/tests_indicadores.py`. |
| 2 ✅ | Correções pontuais: comparecimento por unidade, espera × duração, denominador do absenteísmo, origem "156", "Reagendados", textos de CRAS, erro 200 do gestor | Tira números errados da tela. As metas usadas nas telas ficam em `Frontend/src/constants/indicadores.ts`. |
| 3 ✅ | Permissões próprias para as APIs do Gestor e do Monitor | Escopo de dados. Feito com `dashboard/permissoes.py` (Gestor, Monitor, `/mapa/unidades/`, série e calor do mapa). As respostas em cache do mapa agora mandam `Vary: Authorization`. Falta decidir o escopo de `/mapa_unidades/` (lista e detalhe), que ainda segue só a permissão de leitura de unidades. |
| 4 ✅ | "Meu Dia" para Médico e Enfermeiro, com API real | Remove o último dashboard mockado. API em `dashboard/profissional.py` (`/api/v1/dashboard-profissional/`), tela em `/sistema/dashboard-atendente` com link "Meu dia" no menu. |
| 5 | "Farmácia da Unidade" para o Farmacêutico | Perfil novo sem nenhuma visão. |
| 6 | Novo layout do Painel da Rede (Gestor) com tendência e dispersão | Visão estratégica. |
| 7 | Camadas do mapa por bairro (coroplético com o GeoJSON existente) | Maior ganho analítico com dado que já existe. |
| 8 | Recepção e Qualidade de dados (Admin) | Completa os perfis. |
| 9 | Novos campos (seção 7) e variação da carga de demonstração | Habilita as análises de causa. |

**Validação (passo 10 do material):** rodar `python manage.py carregar_demonstracao`,
abrir cada painel com o login de demonstração do perfil correspondente e conferir que
o mesmo indicador, na mesma unidade e período, mostra o mesmo valor em todas as telas.
Vale incluir isso como teste automatizado no `dashboard/tests.py`.
