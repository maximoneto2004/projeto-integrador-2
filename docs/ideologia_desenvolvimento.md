# Ideologia do Desenvolvimento — Sistema CRAS

## 1. Propósito

O sistema foi desenvolvido para digitalizar e otimizar os processos de atendimento dos Centros de Referência de Assistência Social (CRAS), reduzindo filas presenciais, centralizando informações sociais das famílias e fornecendo dados operacionais para gestores públicos.

O foco central é o **cidadão em situação de vulnerabilidade social**, garantindo que o acesso aos serviços seja simples, justo e rastreável.

---

## 2. Arquitetura

### 2.1 Separação de Responsabilidades

O projeto adota a arquitetura **API REST + SPA (Single Page Application)**:

- **Backend:** Django 5 + Django REST Framework, responsável por toda a lógica de negócio, autenticação, persistência e exposição da API.
- **Frontend:** React (servido via Django/Whitenoise), responsável pela interface do usuário.
- **Banco de dados:** PostgreSQL em produção, com suporte a SQLite para desenvolvimento local.

Essa separação permite que o frontend evolua independentemente do backend, e que a API seja consumida por outros clientes no futuro (aplicativo mobile, integrações externas).

### 2.2 Organização por Domínios (Apps Django)

Cada domínio de negócio é um app Django independente:

| App | Responsabilidade |
|---|---|
| `agendamentos` | Ciclo de vida dos agendamentos e vagas |
| `fila_espera` | Gestão da fila quando não há vagas |
| `prontuario` | Registro social completo das famílias |
| `cidadaos` | Cadastro e identidade dos cidadãos |
| `usuarios` | Gestão de atendentes, escalas e guichês |
| `unidade_cras` | Configuração das unidades e serviços |
| `relatorios` | Relatórios operacionais configuráveis |
| `encaminhamentos` | Transferências entre unidades |
| `avaliacao` | Feedback do atendimento |
| `autenticacao` | Autenticação JWT e SSO |

Essa organização facilita a manutenção, o teste e a evolução de cada parte do sistema sem impactar as demais.

---

## 3. Decisões Técnicas

### 3.1 Consistência em Operações Concorrentes

O agendamento de vagas é uma operação crítica: dois atendentes podem tentar reservar a mesma vaga simultaneamente. Para evitar inconsistências, o sistema usa **transações atômicas com `select_for_update()`**, garantindo que apenas um agendamento seja efetivado por vaga.

### 3.2 Autenticação JWT

A autenticação é baseada em **JSON Web Tokens (JWT)** via `djangorestframework-simplejwt`. Isso permite que o frontend seja desacoplado do backend, sem necessidade de sessões no servidor, facilitando escalabilidade horizontal.

### 3.3 Integração SSO (FortDigital)

O sistema integra com o FortDigital, plataforma de identidade digital do governo, permitindo que cidadãos se autentiquem sem precisar de cadastro manual. Os dados são importados automaticamente no primeiro acesso.

### 3.4 Whitenoise para Arquivos Estáticos

Em vez de um servidor Nginx separado para servir arquivos estáticos, o sistema usa **Whitenoise** diretamente no Gunicorn. Isso simplifica a infraestrutura sem comprometer o desempenho para a escala do projeto.

### 3.5 Deploy com Docker Swarm

O sistema é empacotado em containers Docker e orquestrado via **Docker Swarm**, com:
- Reinicialização automática em caso de falha.
- Roteamento via Traefik com SSL automático (Let's Encrypt).
- Banco de dados PostgreSQL em volume persistente.

### 3.6 Scheduler com APScheduler

Tarefas automáticas (como marcar agendamentos vencidos como ausência e limpar a fila do dia) são executadas via **APScheduler** diretamente no processo Django, sem necessidade de um worker separado (Celery).

---

## 4. Padrões de Código

### 4.1 BaseModel com Auditoria

Todos os modelos principais herdam de `BaseModel`, que fornece automaticamente:
- `created_at` — data de criação
- `updated_at` — data da última atualização
- `is_active` — flag de ativação/desativação sem exclusão física

### 4.2 Choices Centralizados

Todos os valores de escolha (status, tipos, categorias) são definidos em `app/static_data.py`, evitando duplicação e facilitando manutenção.

### 4.3 Serializers com Validação de Negócio

As validações de regras de negócio (ex: impedir agendamento duplicado, validar encaminhamento de origem ≠ destino) são feitas nos `serializers` e `models`, não nas views, mantendo a lógica centralizada e testável.

### 4.4 Permissões por Perfil

O controle de acesso usa o sistema de grupos do Django (`Atendente`, `Supervisor`, `Atendente 156`) com uma classe de permissão customizada (`DjangoModelPermissionsWithView`) que exige autenticação até para operações de leitura.

---

## 5. Qualidade e Monitoramento

- **Logging de Performance:** Um middleware (`PerformanceMiddleware`) registra o tempo de resposta e quantidade de queries por requisição, facilitando a identificação de gargalos.
- **Auditoria:** Um middleware (`AuditMiddleware`) registra as ações dos usuários para fins de rastreabilidade.
- **Documentação da API:** Gerada automaticamente via `drf-spectacular` e acessível em `/api/schema/swagger-ui/`.

---

## 6. Princípios Guia

- **Simplicidade operacional:** A infraestrutura deve ser fácil de operar por equipes pequenas sem expertise avançada em DevOps.
- **Dados como serviço público:** As informações geradas pelo sistema devem ser acessíveis para relatórios e tomada de decisão pelos gestores.
- **Respeito ao cidadão:** O sistema prioriza a experiência do cidadão, com confirmações por e-mail, painel de chamada claro e integração com identidade digital.
- **Evolução incremental:** A arquitetura por apps permite que novas funcionalidades sejam adicionadas sem reescrever o que já existe.
