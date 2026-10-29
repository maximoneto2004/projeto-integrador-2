# Carga sintética e estado da integração

O projeto está **parcialmente integrado**. A origem sintética dos dados da prévia
não significa que os dashboards novos sejam mocks: eles fazem requisições HTTP,
consultam o Django e leem registros persistidos no banco.

## O que consulta a API

| Tela ou fluxo | Situação observada na branch |
| --- | --- |
| Login principal | Autenticação JWT em `/api/v1/authentication/token/` |
| Dashboard do Gestor | Dados da API de dashboard |
| Dashboard do Supervisor | API; os novos SLAs, grupos e detalhes usam o banco |
| Monitor por Unidade | API de indicadores da unidade |
| Mapa e calor de medicamentos | API de unidades, prescrições e serviços; dados agregados no backend |
| Lista principal de atendimentos | Consulta e operações na API, incluindo a confirmação de chegada feita nessa lista |
| Prontuário e busca de receitas | Serviços da API de prontuário/receitas |
| Estoque e dispensação | API de lotes, saldos e movimentações |
| Cadastros em `/sistema/administrador/*` | Serviços da API de unidades, serviços, bairros e medicamentos |
| Configuração de serviços/profissionais do coordenador | Hooks/serviços da API |

Isso é evidência da implementação da branch e das verificações locais, não uma
certificação de todos os fluxos ou da versão publicada no domínio.

## O que ainda contém mock ou indicador parcial

| Rota | Limitação encontrada |
| --- | --- |
| `/sistema/dashboard-atendente` | Séries e contadores fixos em `AdminDashboardAtendente.tsx` |
| `/sistema/confirmar-chegada` | A tela separada usa `appointmentStore` em memória; é diferente da ação integrada da lista principal |
| `/sistema/atendimento-publico` | Fluxo antigo baseado em `appointmentStore` |
| `/sistema/gerenciar-unidades` | Arrays locais de unidades/serviços; é diferente do cadastro integrado em `/sistema/administrador/unidades` |
| `/sistema/cadastro/servico` | Cadastro antigo com lista local; é diferente de `/sistema/administrador/servicos` |
| Resumo legado do Supervisor | O número de reagendamentos continua fixo em zero; não representa uma medição da API |

Também há arquivos de protótipo sem rota ativa e stores antigos sem uso no login
principal. A existência desses arquivos, por si só, não significa que o fluxo atual
esteja usando autenticação ou receitas simuladas no navegador.

## Comando de carga

O comando `carregar_demonstracao` utiliza os modelos reais e os nomes/tipos do
catálogo oficial de saúde. Não envia e-mails nem chama serviços externos.

Na raiz do projeto, com dependências e banco configurados:

```bash
USE_SQLITE=True DEBUG=True .venv/bin/python manage.py migrate
SAUDE_DEMO_PASSWORD='SUA_SENHA_DE_DEMONSTRACAO' USE_SQLITE=True DEBUG=True \
  .venv/bin/python manage.py carregar_demonstracao --data-base 2026-10-29
```

O comando usa o banco selecionado nas configurações do Django, ou o alias informado
em `--database`. A prévia desta sessão usa um banco temporário separado do banco do
domínio publicado. Não é necessário reconstruir o frontend para visualizar a carga:
recarregue a página ou use **Atualizar** nos dashboards.

Opções principais: `--unidades` (1–8), `--cidadaos`, `--agendamentos`, `--fila`,
`--dias`, `--seed`, `--data-base`, `--database` e `--json`. A senha pode ser informada
por `SAUDE_DEMO_PASSWORD` ou `--senha`; ela é armazenada como hash e não é impressa
no relatório. Cidadãos reservados para a fila não recebem agendamentos ativos.

## Cenário padrão aplicado

- 8 unidades fictícias, incluindo uma sem coordenadas para testar o estado da lista;
- 32 bairros reais de Fortaleza (os mais próximos de cada unidade, tirados do GeoJSON do mapa); os dois mais
  próximos formam o território de cada unidade;
- 400 cidadãos, com CPFs de teste válidos e endereços/e-mails fictícios; idades de 0 a 95 anos, sexo,
  CNS em cerca de 85% e hipertensão/diabetes em cerca de um terço;
- 58 usuários, cobrindo os 8 grupos, com vínculo à unidade, escala e permissões;
- 7 serviços em 4 tipos, com a oferta cadastrada em cada unidade;
- 3.000 agendamentos distribuídos pelo período de 90 dias e pelo dia-base, três quartos deles na unidade de
  origem do paciente, com hora de chegada e motivo de cancelamento (pedido do cidadão, unidade ou bloqueio);
- duração das consultas relativa à meta de cada serviço, com desempenho diferente por unidade (de cerca de 20%
  a 90% das consultas dentro da meta);
- 874 receitas, 1.738 itens prescritos e 2.206 registros de atendimento (consultas médicas com receita e
  atendimentos de enfermagem), com as cinco cores de classificação de risco, CID e sinais vitais;
- 10 apresentações de medicamentos, 88 lotes e 1.239 movimentações de estoque;
- 80 cidadãos em fila de espera, com prioridades normal, preferencial e 80+ e alguns casos urgentes;
- casos de SLA sem horários, duração zero e virada de dia;
- demandas diferentes por unidade/medicamento, lotes vencidos e saldos abaixo do mínimo.

Os totais de receitas dependem dos parâmetros e da semente. Os números acima
correspondem à configuração padrão, semente 42 e data-base 29/10/2026. A simulação
inclui horários do dia-base e não corresponde a atendimentos reais em tempo real.

Os nomes têm a marca `[DEMO]`, exceto os bairros, que usam os nomes reais para casar com o mapa e reaproveitam
um bairro já cadastrado com o mesmo nome. As variações usam um segundo gerador aleatório, separado do que
define as situações dos agendamentos. Uma carga feita antes dessas variações tem outros pacientes por
agendamento: repetir o comando nesse banco é recusado com a mensagem de cenário diferente, sem alterar nada;
carregue a versão nova num banco vazio. IDs estáveis permitem repetir a carga com os mesmos
parâmetros sem duplicar os registros nem sobrescrever o histórico existente. O
comando não apaga dados. Mudanças de tamanho ou da identidade dos agendamentos são
rejeitadas quando conflitarem com a carga existente; use outro banco para cenários
diferentes. As contas e registros anteriores da prévia são preservados.

As quantidades dispensadas têm saídas correspondentes no estoque. Entradas, saídas,
saldo após cada movimento e saldo atual do lote são consistentes. As emissões de
receitas e os carimbos históricos são preservados mesmo com campos `auto_now_add`.
O scheduler é desativado para esse comando, evitando limpeza da fila durante a carga.

## Acessos da carga

Todos usam a senha fornecida na primeira execução:

| Perfil | Login principal |
| --- | --- |
| Administrador | `admin@demo.saude.local` |
| Gestor | `gestor@demo.saude.local` |
| Supervisor | `supervisor@demo.saude.local` |
| Coordenador | `coordenador@demo.saude.local` |
| Médico | `medico@demo.saude.local` |
| Enfermeiro | `enfermeiro@demo.saude.local` |
| Recepcionista | `recepcionista@demo.saude.local` |
| Farmacêutico | `farmaceutico@demo.saude.local` |

Os usuários adicionais têm sufixos por unidade/profissional. Os logins principais
ficam vinculados à unidade `[DEMO] Unidade Centro`; Gestor e Administrador acessam a
visão geral da rede. Use **Semana** ou **Período** para explorar o histórico.

## Código e validação

- Entrada do comando: `app/management/commands/carregar_demonstracao.py`.
- Catálogos e permissões sintéticas: `app/demo/catalogo.py`.
- Geração e persistência: `app/demo/carga.py`.
- Testes: `app/test_demonstracao.py`.

Os testes verificam reexecução sem duplicação, preservação do histórico e de outros
registros, autenticação dos oito perfis, emissão histórica das receitas, coerência
de vagas, fila e estoque, além de leitura efetiva das APIs de SLA e mapa de calor.
