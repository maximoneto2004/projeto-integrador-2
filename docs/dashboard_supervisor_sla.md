# SLA de atendimento do supervisor

A tela `/sistema/dashboard` apresenta a duração média das consultas da unidade ativa,
no período selecionado. Neste painel, **SLA médio** significa a média aritmética de
`término - início`, em minutos, ponderada pela quantidade de consultas. Não é a média
das médias dos médicos ou serviços, nem o tempo de espera antes da consulta.

## Regra de cálculo

- Considera consultas em `FINALIZADO`, `AGUARDANDO_RETIRADA` ou `CHAMANDO_RETIRADA`.
  Os dois últimos estados indicam que a consulta clínica já terminou.
- Exige início e fim válidos; intervalos negativos e registros incompletos ficam fora
  da média e aparecem no contador de consultas sem medição válida.
- Duração zero é uma medição válida. Ausência de medições retorna `null` e a tela
  informa que não há medição, em vez de apresentar zero minutos.
- Os recortes por médico e por serviço seguem a mesma regra. Médicos são os usuários
  dos grupos `Médico` ou `medico`; a média da unidade também inclui os demais profissionais.
- A meta exibida é o tempo **atualmente** configurado em `TipoServico.tempo_atendimento`.
  O detalhe compara a duração individual com essa meta; não há meta única inventada
  para a unidade ou para médicos com serviços diferentes.
- O período filtra a **data do agendamento**, como nos demais indicadores da página.

## Horários e histórico

A migração `agendamentos.0025_agendamento_marcos_atendimento` acrescenta
`inicio_atendimento_em` e `fim_atendimento_em`, sem modificar os horários existentes
nem preencher datas históricas por suposição. O backend registra os novos marcos
ao iniciar/finalizar uma consulta e ao encaminhá-la para retirada imediata de medicamentos.
Atualizações repetidas e a dispensação posterior preservam o término da consulta.
Os campos de medição são somente leitura na API de agendamentos.

Quando as duas datas completas existem, o cálculo suporta a virada de dia. Nos registros
antigos, usa a diferença entre as horas no mesmo dia e descarta intervalos negativos.
A linha do tempo identifica os marcos cuja data é apenas a referência do agendamento.
Mostra criação, início e encerramento quando disponíveis; não inventa eventos de
chegada, autorização ou chamada que não estejam preservados no modelo.

O projeto não possui campo de senha numérica. A lista usa os primeiros oito caracteres
do UUID como referência visual e mostra o identificador completo no detalhe.

## API e organização

- `GET /api/v1/dashboard-supervisor/`: mantém os indicadores anteriores e acrescenta
  `sla`, com média, tamanho da amostra, consultas sem medição e recortes por médico/serviço.
- `GET /api/v1/dashboard-supervisor/atendimentos/`: lista paginada com dados operacionais,
  horários e diagnóstico da medição. Aceita `unidade_id`, `data_inicio`, `data_fim`,
  `profissional_id`, `servico_id`, `busca`, `limit` (padrão 10, máximo 100) e `offset`.
- Ambos exigem autenticação, perfil supervisor/coordenador/administrador e permissão
  `agendamentos.view_agendamento`. Supervisores e coordenadores só consultam unidades
  às quais estão vinculados. Superusuários/administradores mantêm o escopo administrativo.
- A listagem não retorna prontuário, diagnóstico clínico, CPF ou observações médicas.
- As médias são agregadas no banco e independem da página, busca ou filtro da lista.
  Os filtros da lista servem para investigar os números gerais do período.

O cálculo fica em `dashboard/sla.py`; escopo, filtros e listagem em
`dashboard/supervisor.py`. Os componentes ficam em
`Frontend/src/components/dashboard-supervisor/sla/`, com tipos, serviço e hook próprios.
O número principal e as comparações usam as cores e componentes existentes na página.

## Validação e publicação

```bash
USE_SQLITE=True DEBUG=True DISABLE_APSCHEDULER=1 .venv/bin/python manage.py test dashboard agendamentos prontuario --noinput
```

Os testes cobrem médias ponderadas, dados ausentes/inválidos, duração zero, virada de
dia, isolamento por unidade/período/perfil, paginação, filtros e registro dos marcos.

Frontend e backend precisam ser publicados juntos, executando `python manage.py migrate`
no banco do ambiente. O Dockerfile atual utiliza os estáticos versionados; gere-os com
`cd Frontend && npm run build` antes de publicar mudanças de interface. O Vite copia
o HTML e os assets para `static/`. A branch de desenvolvimento não altera automaticamente o site
publicado. Em ambientes sem a nova API, o painel informa que os indicadores de SLA
estão indisponíveis.
