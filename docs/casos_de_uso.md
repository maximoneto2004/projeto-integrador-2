# Casos de Uso — Sistema CRAS

## Atores

| Ator | Descrição |
|---|---|
| **Cidadão** | Usuário externo que busca atendimento no CRAS |
| **Atendente** | Servidor responsável pelo atendimento presencial |
| **Atendente 156** | Servidor responsável por agendamentos via central telefônica |
| **Supervisor** | Gestor com permissões administrativas ampliadas |
| **Sistema** | Ações automáticas executadas pelo próprio sistema |

---

## UC-01 — Cadastrar Cidadão

**Ator:** Atendente  
**Pré-condição:** Atendente autenticado no sistema.  
**Fluxo principal:**
1. Atendente acessa o módulo de cidadãos.
2. Informa CPF do cidadão.
3. Sistema verifica se o CPF já existe.
4. Atendente preenche nome, data de nascimento, telefone, e-mail e endereço.
5. Sistema valida os dados e salva o cadastro.

**Fluxo alternativo:**
- Se o CPF já estiver cadastrado, o sistema exibe os dados existentes para atualização.
- Se o cidadão autenticar via SSO (FortDigital), os dados são importados automaticamente.

---

## UC-02 — Realizar Agendamento

**Ator:** Atendente / Atendente 156 / Cidadão (via portal)  
**Pré-condição:** Cidadão cadastrado; vagas disponíveis para o serviço e unidade.  
**Fluxo principal:**
1. Ator seleciona o cidadão, a unidade CRAS, o serviço e a data.
2. Sistema exibe as vagas disponíveis.
3. Ator seleciona a vaga.
4. Sistema reserva a vaga atomicamente (bloqueio de concorrência).
5. Sistema cria o agendamento com status AGENDADO.
6. Sistema envia e-mail de confirmação ao cidadão.

**Fluxo alternativo:**
- Se não houver vagas, o sistema oferece inclusão na fila de espera.
- Se o cidadão já tiver agendamento ativo para o mesmo tipo de serviço, o sistema impede a criação.

---

## UC-03 — Ativar Atendimento

**Ator:** Atendente  
**Pré-condição:** Agendamento com status AGENDADO.  
**Fluxo principal:**
1. Atendente seleciona o agendamento do cidadão.
2. Atendente clica em "Ativar".
3. Sistema atualiza o status para ATIVADO.
4. Atendente chama o cidadão no painel (status CHAMANDO).
5. Cidadão comparece ao guichê.
6. Atendente inicia o atendimento (status ATENDIMENTO).
7. Atendente finaliza o atendimento (status FINALIZADO).

**Fluxo alternativo:**
- Se o cidadão não comparecer após a chamada, atendente registra AUSÊNCIA.
- Agendamentos do dia anterior não finalizados são marcados automaticamente como AUSÊNCIA pelo sistema.

---

## UC-04 — Cancelar Agendamento

**Ator:** Atendente / Atendente 156 / Cidadão  
**Pré-condição:** Agendamento com status AGENDADO ou ATIVADO.  
**Fluxo principal:**
1. Ator acessa o agendamento.
2. Ator seleciona "Cancelar" e informa o motivo.
3. Sistema atualiza o status para CANCELADO_CIDADAO ou CANCELADO_CRAS.
4. A vaga é liberada para novos agendamentos.

---

## UC-05 — Incluir Cidadão na Fila de Espera

**Ator:** Atendente  
**Pré-condição:** Cidadão cadastrado; sem vagas disponíveis para o serviço.  
**Fluxo principal:**
1. Atendente seleciona o cidadão, unidade e serviço.
2. Atendente define a prioridade e urgência.
3. Sistema verifica se o cidadão já está na fila para o mesmo serviço no dia.
4. Sistema cria a entrada na fila com status AGUARDANDO_FILA.

**Fluxo alternativo:**
- Se o cidadão já estiver na fila para o mesmo serviço no dia, o sistema impede o cadastro duplicado.
- Ao final do dia, o sistema limpa automaticamente as entradas da fila não atendidas.

---

## UC-06 — Chamar Cidadão no Painel

**Ator:** Atendente  
**Pré-condição:** Agendamento com status ATIVADO; atendente vinculado a um guichê.  
**Fluxo principal:**
1. Atendente aciona a chamada no painel.
2. Sistema registra a chamada com nome do cidadão e guichê.
3. Painel exibe as últimas chamadas da unidade.
4. Sistema aplica intervalo mínimo de 15 segundos entre chamadas.

---

## UC-07 — Criar e Gerenciar Prontuário

**Ator:** Atendente / Supervisor  
**Pré-condição:** Cidadão cadastrado como pessoa de referência.  
**Fluxo principal:**
1. Atendente cria o prontuário vinculado ao cidadão responsável pela família.
2. Sistema gera numeração automática no formato PR-000001.
3. Atendente preenche as seções:
   - Composição familiar
   - Condições habitacionais
   - Condições educacionais
   - Trabalho e renda
   - Condições de saúde
   - Benefícios sociais
   - Situação de violência
   - Convivência familiar
4. Atendente registra evoluções de acompanhamento ao longo do tempo.

---

## UC-08 — Criar Encaminhamento

**Ator:** Atendente / Supervisor  
**Pré-condição:** Agendamento finalizado ou em atendimento.  
**Fluxo principal:**
1. Atendente acessa o agendamento e cria um encaminhamento.
2. Informa código de área, unidade de destino, motivo e orientações.
3. Sistema valida que origem ≠ destino.
4. Sistema registra o encaminhamento vinculado ao agendamento.

---

## UC-09 — Avaliar Atendimento

**Ator:** Cidadão  
**Pré-condição:** Agendamento com status FINALIZADO.  
**Fluxo principal:**
1. Cidadão acessa o portal e localiza o atendimento finalizado.
2. Cidadão atribui uma nota de 1 a 5.
3. Cidadão pode adicionar um comentário opcional.
4. Sistema registra a avaliação.

---

## UC-10 — Gerenciar Usuários e Escalas

**Ator:** Supervisor  
**Pré-condição:** Supervisor autenticado.  
**Fluxo principal:**
1. Supervisor cadastra novo atendente com CPF, e-mail e unidades de lotação.
2. Supervisor define o perfil (Atendente, Atendente 156, Supervisor).
3. Supervisor configura a escala de trabalho com dias da semana e horários.
4. Sistema valida conflitos de horário na escala.

---

## UC-11 — Configurar Unidade CRAS

**Ator:** Supervisor  
**Pré-condição:** Supervisor autenticado.  
**Fluxo principal:**
1. Supervisor cadastra a unidade com endereço, telefone, e-mail e horários de funcionamento.
2. Supervisor define os bairros de abrangência.
3. Supervisor configura os serviços ofertados com dias e horários específicos.
4. Supervisor cadastra os guichês de atendimento.
5. Supervisor pode criar bloqueios de horário (feriados, manutenção) com justificativa.

---

## UC-12 — Gerar Relatórios

**Ator:** Supervisor  
**Pré-condição:** Supervisor autenticado; configuração de relatório criada.  
**Fluxo principal:**
1. Supervisor acessa o módulo de relatórios.
2. Seleciona o tipo de relatório (atendimentos por técnico ou CadÚnico).
3. Define o período e parâmetros de filtro.
4. Sistema processa e exibe o relatório.

---

## UC-13 — Autenticação via SSO (FortDigital)

**Ator:** Cidadão  
**Pré-condição:** Cidadão com conta no FortDigital.  
**Fluxo principal:**
1. Cidadão acessa o portal e clica em "Entrar com FortDigital".
2. Sistema redireciona para o FortDigital.
3. Cidadão autentica no FortDigital.
4. Sistema recebe o token e importa os dados do cidadão.
5. Se o cidadão não existir no sistema, é cadastrado automaticamente.
6. Cidadão é redirecionado para o portal autenticado.

---

## UC-14 — Consultar Dúvidas Frequentes

**Ator:** Cidadão  
**Pré-condição:** Nenhuma (acesso público).  
**Fluxo principal:**
1. Cidadão acessa a seção de dúvidas frequentes.
2. Sistema exibe a lista de perguntas e respostas cadastradas.
