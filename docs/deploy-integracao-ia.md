# Deploy da integração de IA

Este runbook prepara o deploy da integração de cidadão e a carga do catálogo de medicamentos. Ele não contém segredos. Substitua todos os valores entre `<...>` somente após conferir o `stack.yml` e o serviço efetivo no servidor.

## 1. Pré-check

- Confirmar que a revisão e os testes da branch foram concluídos.
- Confirmar que o commit a implantar está em `main` e identificar seu SHA.
- Confirmar janela de manutenção e responsável pelo rollback.
- Confirmar espaço em disco para imagem, backup e catálogo temporário.
- Confirmar que o CSV local tem 1.150 linhas válidas no dry-run.
- Não versionar nem copiar o CSV para dentro do repositório.

## 2. Backup recomendado

Antes das migrations, gerar um backup PostgreSQL conforme o padrão operacional do ambiente. Exemplo, com placeholders:

```bash
pg_dump --format=custom --file='<CAMINHO_BACKUP>/cras_pre_integracao.dump' \
  --host='<DB_HOST>' --port='<DB_PORT>' --username='<DB_USER>' '<DB_NAME>'
```

Validar que o arquivo existe, tem tamanho plausível e pode ser lido por `pg_restore --list`. Não colocar senha na linha de comando ou no histórico; usar o mecanismo seguro já adotado pelo servidor.

## 3. Conferir stack e execução efetiva

Executar inicialmente apenas comandos de leitura:

```bash
cd /root/projetointegrador-novo
sed -n '1,260p' stack.yml

docker service inspect cras_web --pretty

docker service inspect cras_web \
  --format 'Image={{.Spec.TaskTemplate.ContainerSpec.Image}} Command={{json .Spec.TaskTemplate.ContainerSpec.Command}} Args={{json .Spec.TaskTemplate.ContainerSpec.Args}}'

image="$(docker service inspect cras_web --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}')"

docker image inspect "$image" \
  --format 'Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}}'
```

Confirmar que nenhum `command` ou `entrypoint` do stack substitui inadvertidamente o CMD da imagem. O Dockerfile do repositório executa, nesta ordem: `migrate --noinput`, `collectstatic --noinput` e Gunicorn.

## 4. Variáveis

Confirmar pelo mecanismo de secrets/environment adotado no stack, sem imprimir valores sensíveis:

### Django existente

- `DEBUG=false`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`, se configurada por ambiente
- `CSRF_TRUSTED_ORIGINS`, se configurada por ambiente

### Banco existente

- `USE_SQLITE=false`
- `ORACLE=false`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

### Integração nova

- `INTEGRATION_LOGIN_API_KEY`: valor longo, aleatório e obrigatório.
- `CITIZEN_AUTH_CHALLENGE_MINUTES=10`, salvo decisão operacional diferente.
- `CITIZEN_AUTH_MAX_ATTEMPTS=5`, salvo decisão operacional diferente.
- `CITIZEN_SESSION_HOURS=24`, salvo decisão operacional diferente.

### Mock, obrigatoriamente desabilitado

- `CITIZEN_AUTH_MOCK_ENABLED=false`
- `CITIZEN_AUTH_MOCK_EXPOSE_CODE=false`
- `CITIZEN_AUTH_MOCK_CODE` vazio ou ausente.

## 5. Deploy

O workflow atual é disparado apenas por push em `main`. Ele conecta via SSH, preserva `.env.production`, executa `git pull --ff-only origin main`, constrói a imagem com o SHA, executa `docker stack deploy` e força a atualização de `cras_web` para a imagem do SHA.

Antes de permitir o workflow, confirmar que `/root/projetointegrador-novo/stack.yml` existe e que os secrets `SSH_HOST`, `SSH_USER` e `SSH_PRIVATE_KEY` estão configurados no GitHub.

Não executar manualmente um segundo deploy em paralelo ao workflow.

## 6. Acompanhar inicialização

Depois do deploy autorizado:

```bash
docker service ps cras_web --no-trunc
docker service logs --since 10m --timestamps cras_web
```

Confirmar uma única atualização estável, ausência de loop de restart e inicialização do Gunicorn. Não copiar logs contendo dados pessoais para tickets públicos.

## 7. Confirmar migrations

Identificar uma task/container saudável do serviço e executar, adaptando `<CONTAINER_WEB>`:

```bash
docker exec <CONTAINER_WEB> python manage.py showmigrations integracao medicamentos
docker exec <CONTAINER_WEB> python manage.py migrate --plan
docker exec <CONTAINER_WEB> python manage.py check
```

Esperado: `integracao.0001`, `medicamentos.0005` e `medicamentos.0006` aplicadas; `migrate --plan` sem operações pendentes.

## 8. Smoke tests antes da carga

- Aplicação e Swagger respondem.
- APIs internas autenticadas continuam respondendo.
- Endpoint de login sem chave ou com chave inválida retorna 403.
- Mock não inicia challenge em produção.
- Tabelas `integracao_desafioautenticacaocidadao` e `integracao_sessaocidadao` existem.
- Logs não exibem CPF integral, OTP, chave de integração ou token de sessão.

## 9. Importação real de medicamentos sem GitHub

O arquivo `medicamentos.csv` permanece fora do Git. Usar um diretório temporário restrito e substituir os placeholders somente depois de identificar o container real.

Na máquina local:

```bash
scp "C:/Users/Usuario/Downloads/medicamentos.csv" \
  <USUARIO>@<SERVIDOR>:/tmp/medicamentos-<DATA>.csv
```

No servidor:

```bash
chmod 600 /tmp/medicamentos-<DATA>.csv
docker cp /tmp/medicamentos-<DATA>.csv <CONTAINER_WEB>:/tmp/medicamentos.csv

docker exec <CONTAINER_WEB> python manage.py importar_medicamentos \
  --arquivo /tmp/medicamentos.csv --dry-run
```

Somente se o dry-run apresentar 1.150 validados, zero erros e zero possíveis duplicidades:

```bash
docker exec <CONTAINER_WEB> python manage.py importar_medicamentos \
  --arquivo /tmp/medicamentos.csv
```

Validar a saída antes de repetir o comando. A segunda execução deve criar zero registros e manter o total estável.

## 10. Validar contagem e catálogo

```bash
docker exec <CONTAINER_WEB> python manage.py shell -c \
  "from medicamentos.models import Medicamento; print(Medicamento.objects.count()); print(Medicamento.objects.filter(is_active=True).count())"
```

Além da contagem esperada para o banco real, consultar amostras das apresentações injetáveis, comprimidos especiais, cremes, goma, pastilha, águas para injetáveis e preservativos 49/52 mm. A contagem total pode incluir registros anteriores; reconciliar criados/atualizados pela saída do importador.

## 11. Remover o CSV temporário

Depois da validação e conforme a política operacional:

```bash
docker exec <CONTAINER_WEB> rm -f /tmp/medicamentos.csv
rm -f /tmp/medicamentos-<DATA>.csv
```

Antes de remover, confirmar literalmente ambos os caminhos e que estão restritos a `/tmp`.

## 12. Smoke tests da integração

- Consultar sessão inexistente com integration key válida.
- Confirmar 403 com integration key inválida.
- Confirmar que o mock continua desabilitado.
- Quando o provedor real estiver implementado, autenticar um cidadão de teste autorizado.
- Consultar bairros, unidades, tipos, serviços e vagas.
- Criar/listar/cancelar um agendamento de teste e confirmar liberação da vaga.
- Listar/detalhar receita do próprio cidadão e confirmar isolamento entre cidadãos.
- Consultar disponibilidade apenas dos medicamentos prescritos.
- Confirmar que respostas 400/403/404 não exibem stack trace ou detalhes internos.

## 13. Restart controlado

Quando autorizado, reiniciar/forçar atualização uma vez e acompanhar as tasks. Na segunda inicialização, migrations devem ser no-op; o importador e `popular_dados_ia_dev` não podem executar automaticamente.

## 14. Rollback

### Rollback de aplicação

Preferir reimplantar a imagem anterior conhecida pelo SHA, mantendo o banco no schema novo quando o código anterior tolerar as colunas/tabelas adicionais. Confirmar compatibilidade antes da troca.

### Rollback de migrations

- `integracao.0001` é reversível tecnicamente, mas sua reversão remove as duas tabelas e apaga desafios e sessões.
- `medicamentos.0006` altera choices no estado do Django; no PostgreSQL, normalmente não altera os valores persistidos.
- `medicamentos.0005` amplia `concentracao` de 50 para 300 e `observacoes` de 600 para 1000. Reverter pode falhar se já houver dados acima dos limites antigos.
- Os 1.150 medicamentos não são removidos automaticamente ao reverter essas migrations.

Não reverter migrations nem apagar medicamentos automaticamente. Se rollback de schema for indispensável, interromper escritas, preservar backup, medir comprimentos dos dados e obter aprovação específica.

## 15. Critérios de encerramento

- Serviço estável e sem restart loop.
- Migrations aplicadas e sem plano pendente.
- Importação conferida e idempotente.
- Mock desabilitado.
- Integração rejeita credenciais inválidas.
- APIs internas e Swagger respondem.
- Logs não contêm dados sensíveis.
- Evidências e SHA implantado registrados sem segredos.
