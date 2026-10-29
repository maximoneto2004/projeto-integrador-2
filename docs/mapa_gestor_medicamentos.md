# Mapa assistencial do gestor

Na rota `/sistema/mapa-unidades`, o gestor pode selecionar uma unidade pelo mapa
ou pela lista de unidades cadastradas. O detalhe mantém endereço, bairro, telefone,
e-mail, equipe e indicadores, e acrescenta oferta de serviços, duração média por
serviço e medicamentos mais solicitados. Unidades sem coordenadas continuam na
lista; suas posições não são estimadas nem inventadas.

## Serviços e tempo médio

O campo `analise` da API de mapa reúne a oferta ativa em `ServicoUnidadePosto` e
os serviços que tiveram consultas concluídas no período, mesmo quando já não
fazem parte da oferta atual. Serviços sem consultas aparecem com média nula.

As médias por serviço e da unidade reutilizam `dashboard/sla.py`: consultas
finalizadas ou encaminhadas para a farmácia, com início e fim válidos. Os novos
horários completos suportam a virada de dia; o histórico de horas isoladas usa a
diferença no mesmo dia, com intervalos negativos excluídos. A média geral é
ponderada pela quantidade de consultas, nunca uma média das médias dos serviços.
O período considera a **data do agendamento**.

## Demanda de medicamentos e camada de calor

Uma **solicitação** é uma receita ativa contendo o medicamento. O agrupamento
usa a unidade do agendamento que originou a receita, independentemente da unidade
de origem do cidadão. A mesma receita com linhas repetidas do mesmo medicamento
conta uma vez. Apresentações diferentes são separadas pelo ID do catálogo.

O período considera a **data de emissão da receita no fuso do sistema**. O calor
usa o número de receitas por unidade. A intensidade é normalizada pela maior
demanda da rede no período e medicamento selecionados; filtros de bairro e unidade
não mudam a escala. Cada ponto representa uma unidade, não a residência do paciente.
As manchas indicam concentração de solicitações, não estoque, incidência de doença
ou quantidade de comprimidos. A legenda informa a escala e a lista mostra os
valores exatos, inclusive zero.

O ranking da unidade separa número de receitas, soma da quantidade prescrita e
quantidade já dispensada dessas receitas. A dispensação acumulada pode ter ocorrido
depois do período de emissão. Não se somam quantidades de apresentações diferentes.
Quantidades históricas ausentes permanecem nulas e são sinalizadas. Itens antigos
sem vínculo com o catálogo são informados separadamente e não são associados por
semelhança de nomes. Itens e receitas inativos ficam fora da demanda. Medicamentos
inativos continuam disponíveis quando possuem receitas no período consultado ou
quando já estão selecionados, para permitir consultar períodos sem demanda.

## API e permissões

- `/api/v1/mapa_unidades/` e `/api/v1/mapa_unidades/<uuid>/` acrescentam `analise`
  para gestores e administradores. Os demais perfis preservam os dados anteriores
  e recebem `analise: null`.
- `/api/v1/mapa/medicamentos/` recebe `data_inicio`, `data_fim` e, opcionalmente,
  `medicamento_id`. Retorna catálogo por apresentação, medicamento selecionado,
  demanda de cada unidade ativa, total de solicitações e maior demanda.
- Sem seleção explícita, o medicamento com mais receitas é selecionado; empates
  seguem a ordenação do catálogo. Medicamentos sem demanda podem ser selecionados
  e retornam zero, sem gerar calor artificial.
- A camada exige autenticação, perfil Gestor/Administrador (ou superusuário) e
  permissão `unidade_posto.view_unidadeposto`. Não retorna pacientes, diagnósticos,
  CPF ou conteúdo individual de receitas.

A análise fica em `dashboard/mapa_assistencial.py`, com quatro consultas agregadas
independentemente do número de unidades. A camada e os painéis novos ficam em
`Frontend/src/components/dashboard-gestor/mapa/`, com tipos e hook próprios.
O mapa utiliza Leaflet.heat; as unidades seguem clicáveis sobre a camada.

## Verificação e publicação

```bash
USE_SQLITE=True DEBUG=True DISABLE_APSCHEDULER=1 .venv/bin/python manage.py test dashboard unidade_posto agendamentos prontuario --noinput
cd Frontend
npm run build
```

O build atualiza os estáticos versionados utilizados pelo Dockerfile. Esta mudança
não adiciona migrações além da migração de horários completos do SLA já presente
na branch. Frontend e backend devem ser publicados juntos. A prévia local usa
dados sintéticos e não altera o banco do site publicado.
