# Arquitetura dos Agentes de IA

## Visão geral

A automação planejada separa autenticação e operações do cidadão em dois agentes. O backend Django é a fonte de verdade para identidade, sessão, autorização e dados; o futuro n8n apenas orquestrará mensagens e chamadas HTTP.

### Agente de Login

Responsável exclusivamente por:

- verificar se existe sessão válida para o telefone;
- buscar cidadão por CPF no modo permitido;
- criar cidadão quando o fluxo e o ambiente permitirem;
- iniciar a autenticação;
- validar o código;
- obter uma sessão temporária.

Esse agente usa `X-Integration-Key`. Ele não consulta vagas, agendamentos, receitas ou estoque.

### Agente de Serviços

Responsável por:

- consultar bairros, unidades, tipos de serviço, serviços e vagas;
- criar, listar e cancelar agendamentos do cidadão autenticado;
- listar e detalhar receitas próprias;
- consultar disponibilidade somente dos medicamentos prescritos.

Esse agente usa `X-Citizen-Session`. Ele não recebe uma integration key e não executa autenticação.

## Roteamento

```text
Mensagem recebida
      ↓
telefone do contato
      ↓
verificar_sessao
      ↓
┌────────────────────┐
│ sessão válida?     │
└────────────────────┘
   ↓ não        ↓ sim
 LOGIN         SERVIÇOS
```

Uma consulta de sessão confirma sua existência, mas nunca recupera o token bruto. O orquestrador deve manter o token recebido na autenticação em armazenamento seguro com expiração compatível. Se o token não estiver disponível, uma nova autenticação é necessária.

## Sessão do cidadão

- vinculada ao cidadão e ao telefone;
- validade padrão de 24 horas, configurável por ambiente;
- revogável;
- token bruto entregue somente na verificação bem-sucedida;
- token bruto nunca persistido pelo backend;
- somente o hash SHA-256 é persistido;
- uma nova autenticação revoga sessões anteriores do mesmo cidadão/telefone;
- endpoints de serviço derivam o titular da sessão, nunca do payload.

## Fluxo de login mock

```text
CPF
 ↓
buscar cidadão
 ↓
iniciar autenticação
 ↓
challenge
 ↓
código mock configurado por ambiente
 ↓
verificar código
 ↓
sessão temporária de 24h
```

O mock é exclusivamente de desenvolvimento. Produção deve usar:

```env
CITIZEN_AUTH_MOCK_ENABLED=false
CITIZEN_AUTH_MOCK_EXPOSE_CODE=false
```

O canal real de entrega do código será decidido posteriormente. O prompt, o n8n e o usuário não devem conhecer um código fixo. O n8n não valida credenciais por conta própria e não é fonte de verdade da autenticação.

## Limites de confiança

```text
Canal de mensagem
  → n8n/orquestrador
    → Agente de Login -- X-Integration-Key --> APIs de login
    → Agente de Serviços -- X-Citizen-Session --> APIs do cidadão
      → Django/PostgreSQL: identidade, autorização e dados
```

- A integration key fica somente no cofre/configuração do orquestrador.
- O token de cidadão não deve aparecer em prompts, logs ou mensagens.
- CPF e telefone devem ser usados apenas no fluxo de identificação.
- APIs administrativas, JWT de funcionário e prontuário completo ficam fora dos agentes.

## Fluxos de serviço

### Agendamento

1. Identificar a necessidade.
2. Obter bairro ou unidade quando necessário.
3. Listar tipos de serviço.
4. Localizar o serviço oferecido pela unidade.
5. Consultar vagas.
6. Apresentar opções compreensíveis.
7. Obter confirmação explícita.
8. Criar o agendamento sem enviar `cidadao_id`.
9. Informar data, horário, serviço e unidade confirmados.

### Consulta e cancelamento

O agente lista somente agendamentos próprios, traduz a situação para linguagem simples e evita expor UUIDs. Antes de cancelar, identifica o agendamento, pede confirmação e usa exclusivamente o endpoint de cancelamento.

### Receitas

O agente opera somente em leitura. Pode listar receitas próprias, detalhar medicamentos prescritos e consultar disponibilidade. Não cria, edita ou exclui receita e não acessa prontuário clínico completo.

## Decisões futuras

- provedor e canal do OTP real;
- armazenamento seguro do token no orquestrador;
- política de renovação da sessão;
- textos conversacionais finais;
- observabilidade com mascaramento de dados pessoais;
- implementação dos workflows no n8n e integração com WhatsApp.
