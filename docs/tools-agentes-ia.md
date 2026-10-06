# Contrato das Tools dos Agentes de IA

Base atual: `/api/v1/integracao/`. Todas as respostas são JSON. A integration key e a citizen session são headers secretos e nunca devem entrar em prompts, mensagens ou logs.

## Tools do Agente de Login

### verificar_sessao

- Agente: Login.
- Endpoint/método: `GET cidadao/sessao/`.
- Autenticação: `X-Integration-Key`.
- Parâmetros: query `telefone`, obrigatório.
- Resposta: `authenticated`; quando ativa, também `cidadao_id`, `expires_at` e `remaining_seconds`.
- Erros: 400 para telefone ausente/inválido; 403 para chave ausente/inválida.
- Usar: no início de uma conversa para decidir o roteamento.
- Não usar: para recuperar token bruto; o endpoint nunca o devolve.

### buscar_cidadao_cpf

- Agente: Login.
- Endpoint/método: `GET cidadao/buscar/`.
- Autenticação: `X-Integration-Key`.
- Parâmetros: query `cpf`, obrigatório.
- Resposta: somente `exists`, `cidadao_id` e `nome`.
- Erros: 400 para CPF ausente; 403 para chave inválida ou mock desabilitado.
- Usar: durante o fluxo mock para verificar cadastro.
- Não usar: como busca administrativa ou para obter dados cadastrais completos.

### criar_cidadao

- Agente: Login.
- Endpoint/método: `POST cidadao/criar/`.
- Autenticação: `X-Integration-Key`.
- Obrigatórios: `nome`, `cpf`, `telefone`.
- Opcionais: `data_nascimento`, `email`.
- Resposta: `id` e `nome`.
- Erros: 400 para dados inválidos; 403 fora do modo mock; 409 para CPF existente.
- Usar: somente quando o fluxo de desenvolvimento permitir cadastro e o cidadão não existir.
- Não usar: em produção antes de existir decisão formal de cadastro pelo canal.

### iniciar_autenticacao

- Agente: Login.
- Endpoint/método: `POST cidadao/auth/iniciar/`.
- Autenticação: `X-Integration-Key`.
- Corpo: `cpf`, `telefone`.
- Resposta: `challenge_id`, `expires_at`, `delivery`.
- Erros: 400 para telefone divergente/dados inválidos; 403 se mock estiver desabilitado ou sem código; 404 se o cidadão não existir.
- Usar: depois de identificar cidadão e telefone.
- Não usar: para tentar autenticar outro telefone ou expor o código configurado.

### verificar_codigo

- Agente: Login.
- Endpoint/método: `POST cidadao/auth/verificar/`.
- Autenticação: `X-Integration-Key`.
- Corpo: `challenge_id`, `code`.
- Resposta: `authenticated`, `cidadao_id`, `expires_at`, `remaining_seconds`, `session_token`, `token_type`.
- Erros: 400 para código incorreto, expirado, reutilizado ou limite de tentativas; 403 com mock desabilitado; 404 para challenge inexistente.
- Usar: quando o cidadão informar o código.
- Não usar: repetidamente após expiração/bloqueio ou para registrar o token em texto/log.

## Tools do Agente de Serviços

### buscar_bairros

- Endpoint/método: `GET bairros/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: nenhum.
- Resposta: `results[]` com `id` e `nome`.
- Erros: 403 para sessão ausente/inválida/expirada.
- Usar: ajudar a localizar unidades.
- Não usar: como cadastro ou edição de bairros.

### buscar_unidades

- Endpoint/método: `GET unidades/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: nenhum.
- Resposta: unidade, telefone, bairro, endereço, CEP e coordenadas.
- Erros: 403 para sessão inválida.
- Usar: apresentar locais de atendimento.
- Não usar: para acessar e-mail ou campos administrativos da unidade.

### listar_tipos_servico

- Endpoint/método: `GET tipos-servico/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: nenhum.
- Resposta: `id`, `nome`, `descricao`.
- Erros: 403 para sessão inválida.
- Usar: classificar a necessidade antes de procurar serviço/vaga.
- Não usar: para escolher automaticamente sem entender a solicitação.

### buscar_servicos

- Endpoint/método: `GET unidades/{unidade_id}/servicos/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: path `unidade_id`; query `tipo_id`, ambos UUIDs.
- Resposta: `id`, `nome`, `gera_receita`.
- Erros: 400 para tipo ausente/inválido; 403 para sessão inválida; 404 para path inválido.
- Usar: após escolher unidade e tipo.
- Não usar: com IDs inventados ou de APIs administrativas.

### verificar_vagas

- Endpoint/método: `GET vagas/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: `unidade_id` e `tipo_id`; `data` é opcional no formato ISO.
- Resposta: vaga, data, horário e quantidade disponível.
- Erros: 400 para UUID/data ausente ou inválido; 403 para sessão inválida.
- Usar: antes de apresentar opções de agendamento.
- Não usar: para prometer vaga sem confirmação posterior do backend.

### criar_agendamento

- Endpoint/método: `POST agendamentos/`.
- Autenticação: `X-Citizen-Session`.
- Corpo: `vaga_id`, `servico_id`; `motivo_territorio` opcional.
- Resposta: `id`, `situacao`, `data`, `horario`.
- Erros: 400 para regra/entrada inválida; 403 para sessão inválida; 404 para vaga/serviço inexistente; 409 documentado para conflito.
- Usar: somente depois da confirmação explícita do cidadão.
- Não usar: com `cidadao_id`; o titular sempre vem da sessão.

### listar_agendamentos

- Endpoint/método: `GET agendamentos/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: nenhum.
- Resposta: somente agendamentos próprios, com data, horário, situação, serviço e unidade.
- Erros: 403 para sessão inválida.
- Usar: consulta e seleção antes de cancelamento.
- Não usar: para pesquisar outro cidadão.

### cancelar_agendamento

- Endpoint/método: `POST agendamentos/{agendamento_id}/cancelar/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: UUID do agendamento próprio no path.
- Resposta: mensagem de cancelamento/liberação da vaga.
- Erros: 400 se já cancelado/transição inválida; 403 para sessão inválida; 404 se inexistente ou pertencente a outro cidadão.
- Usar: após confirmação explícita.
- Não usar: para alterar status diretamente ou cancelar agendamento de terceiro.

### listar_receitas

- Endpoint/método: `GET receitas/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: nenhum.
- Resposta: receitas próprias, validade e medicamentos.
- Erros: 403 para sessão inválida.
- Usar: consulta em modo leitura.
- Não usar: para criar/editar receita ou acessar prontuário completo.

### detalhar_receita

- Endpoint/método: `GET receitas/{receita_id}/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: UUID da receita no path.
- Resposta: medicamentos, dosagem, frequência e duração.
- Erros: 403 para sessão inválida; 404 se inexistente ou de outro cidadão.
- Usar: quando o cidadão escolher uma receita própria.
- Não usar: com UUID fornecido por outro cidadão.

### consultar_disponibilidade_receita

- Endpoint/método: `GET receitas/{receita_id}/disponibilidade/`.
- Autenticação: `X-Citizen-Session`.
- Parâmetros: UUID da receita própria no path.
- Resposta: por medicamento prescrito, unidades, quantidade e disponibilidade.
- Erros: 403 para sessão inválida; 404 se receita inexistente ou de terceiro.
- Usar: somente a partir de uma receita retornada pelas tools anteriores.
- Não usar: para pesquisar estoque de medicamento arbitrário.

## Regras invariantes

- O agente de serviços nunca define livremente `cidadao_id`.
- Receita e agendamento sempre pertencem ao cidadão da sessão.
- Cancelamento é restrito aos próprios agendamentos.
- Disponibilidade parte exclusivamente dos itens prescritos naquela receita.
- APIs administrativas não fazem parte do fluxo.
- `X-Integration-Key` é exclusiva do agente de login.
- `X-Citizen-Session` é exclusiva do agente de serviços.
