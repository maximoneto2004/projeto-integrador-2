# Documento de Requisitos — Sistema CRAS

## 1. Visão Geral

O sistema é uma plataforma de gestão para Centros de Referência de Assistência Social (CRAS), com foco no atendimento ao cidadão, agendamentos, fila de espera, prontuário social e relatórios operacionais.

---

## 2. Requisitos Funcionais

### 2.1 Gestão de Cidadãos
- RF01 — O sistema deve permitir cadastrar cidadãos com CPF, nome, data de nascimento, telefone, e-mail e endereço.
- RF02 — O CPF deve ser único e validado no cadastro.
- RF03 — O sistema deve integrar com o FortDigital (SSO) para autenticar e importar dados do cidadão automaticamente.
- RF04 — O cidadão pode ser consultado por CPF, nome ou NIS.

### 2.2 Agendamentos
- RF05 — O sistema deve permitir criar agendamentos vinculados a um cidadão, serviço e unidade CRAS.
- RF06 — O agendamento deve ser atrelado a uma vaga disponível (AgendaVaga), respeitando o limite de vagas.
- RF07 — O sistema deve controlar o ciclo de status do agendamento: AGENDADO → ATIVADO → CHAMANDO → ATENDIMENTO → FINALIZADO.
- RF08 — Agendamentos vencidos devem ser automaticamente marcados como AUSÊNCIA.
- RF09 — Deve ser possível cancelar um agendamento pelo cidadão ou pelo CRAS, com registro de motivo.
- RF10 — O sistema deve enviar e-mail de confirmação ao cidadão após o agendamento.
- RF11 — Somente um agendamento ativo por cidadão por tipo de serviço deve ser permitido.

### 2.3 Fila de Espera
- RF12 — O sistema deve permitir inserir cidadãos em fila de espera quando não há vagas disponíveis.
- RF13 — A fila deve suportar níveis de prioridade e urgência.
- RF14 — Não deve ser permitido inserir o mesmo cidadão na fila duas vezes no mesmo dia para o mesmo serviço.
- RF15 — A fila deve ser limpa automaticamente ao final do dia.

### 2.4 Painel de Chamada
- RF16 — O sistema deve exibir um painel com as últimas chamadas de atendimento por unidade.
- RF17 — Cada chamada deve registrar o nome do cidadão e o guichê de atendimento.

### 2.5 Prontuário Social
- RF18 — O sistema deve gerar um prontuário único por família com numeração automática (PR-XXXXXX).
- RF19 — O prontuário deve registrar: composição familiar, condições habitacionais, condições educacionais, trabalho e renda, condições de saúde, benefícios sociais, situação de violência e convivência familiar.
- RF20 — Cada seção do prontuário deve ser editável de forma independente.
- RF21 — O prontuário deve registrar evoluções de acompanhamento com histórico completo.

### 2.6 Atendimento Familiar
- RF22 — O sistema deve registrar fichas de atendimento familiar com dados da família, demanda apresentada e observações.
- RF23 — A ficha deve estar vinculada ao prontuário e ao cidadão responsável.

### 2.7 Encaminhamentos
- RF24 — O sistema deve permitir criar encaminhamentos entre unidades com motivo, orientações e profissional responsável.
- RF25 — A unidade de origem e destino não podem ser iguais.
- RF26 — Cada agendamento pode ter apenas um encaminhamento.

### 2.8 Avaliação de Atendimento
- RF27 — O cidadão deve poder avaliar o atendimento com nota de 1 a 5 e comentário.
- RF28 — A avaliação só pode ser feita em agendamentos com status FINALIZADO.

### 2.9 Gestão de Usuários e Perfis
- RF29 — O sistema deve suportar os perfis: Atendente, Supervisor e Atendente 156.
- RF30 — Cada usuário deve ser vinculado a uma ou mais unidades de lotação.
- RF31 — O atendente deve ter escala de trabalho configurada com dias e horários.
- RF32 — O atendente deve poder associar-se a um guichê de atendimento.

### 2.10 Gestão de Unidades CRAS
- RF33 — O sistema deve cadastrar unidades CRAS com endereço, horários de funcionamento e bairros de abrangência.
- RF34 — Cada unidade pode ter múltiplos guichês de atendimento.
- RF35 — Deve ser possível configurar os serviços ofertados por unidade, com dias e horários específicos.
- RF36 — O sistema deve permitir bloquear horários de atendimento por unidade com justificativa.

### 2.11 Serviços
- RF37 — Os serviços devem ser organizados por classe e tipo, com tempo médio de atendimento configurável.
- RF38 — Cada serviço deve ter modalidade de marcação (agendamento ou fila).

### 2.12 Relatórios
- RF39 — O sistema deve gerar relatório de atendimentos por técnico.
- RF40 — O sistema deve gerar relatório de atividades do CadÚnico e Bolsa Família.
- RF41 — A configuração dos relatórios deve ser personalizável por gestor.

### 2.13 Dúvidas Frequentes
- RF42 — O sistema deve exibir uma seção de perguntas e respostas frequentes para os cidadãos.

---

## 3. Requisitos Não Funcionais

### 3.1 Desempenho
- RNF01 — O sistema deve suportar múltiplos atendentes simultâneos sem perda de consistência nas vagas (uso de transações atômicas com `select_for_update`).
- RNF02 — O tempo de resposta das APIs deve ser inferior a 2 segundos em condições normais de uso.

### 3.2 Segurança
- RNF03 — A autenticação deve ser baseada em JWT (JSON Web Token) com expiração configurável.
- RNF04 — O sistema deve aplicar HTTPS em produção com cabeçalhos de segurança (HSTS, XSS, CSP).
- RNF05 — O acesso às rotas deve ser controlado por permissões por perfil de usuário.
- RNF06 — Dados sensíveis (senhas, tokens) não devem ser armazenados em texto plano.

### 3.3 Disponibilidade
- RNF07 — O sistema deve ser implantado em contêineres Docker com reinicialização automática em caso de falha.

### 3.4 Manutenibilidade
- RNF08 — O código deve seguir a arquitetura Django REST Framework com separação por apps.
- RNF09 — A documentação da API deve estar disponível via Swagger UI e Redoc.

### 3.5 Compatibilidade
- RNF10 — O sistema deve ser acessível via navegadores modernos (Chrome, Firefox, Edge).
- RNF11 — O frontend deve ser responsivo.

---

## 4. Regras de Negócio

- RN01 — Não é permitido agendar o mesmo cidadão para o mesmo tipo de serviço se já houver agendamento ativo.
- RN02 — Agendamentos expirados sem presença devem ser automaticamente marcados como ausência.
- RN03 — A vaga de agendamento possui controle de concorrência para evitar dupla ocupação.
- RN04 — O intervalo mínimo entre chamadas no painel é de 15 segundos por unidade.
- RN05 — O prontuário é gerado automaticamente com numeração sequencial no formato PR-000001.
- RN06 — Encaminhamentos não podem ter a mesma unidade de origem e destino.
- RN07 — Avaliações só podem ser feitas para atendimentos finalizados.
