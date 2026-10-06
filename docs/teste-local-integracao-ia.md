# Teste Local da Integração de IA

Este procedimento usa somente SQLite local, dados fictícios e o mock de autenticação. Não reutilize chaves, CPF, telefone ou código de ambientes reais.

## 1. Variáveis locais

No terminal que executará o Django, configure valores descartáveis:

```powershell
$env:USE_SQLITE='True'
$env:DEBUG='True'
$env:INTEGRATION_LOGIN_API_KEY='<CHAVE_LOCAL_LONGA>'
$env:CITIZEN_AUTH_MOCK_ENABLED='True'
$env:CITIZEN_AUTH_MOCK_CODE='<CODIGO_LOCAL>'
$env:CITIZEN_AUTH_MOCK_EXPOSE_CODE='False'
$env:CITIZEN_AUTH_CHALLENGE_MINUTES='10'
$env:CITIZEN_AUTH_MAX_ATTEMPTS='5'
$env:CITIZEN_SESSION_HOURS='24'
```

Não grave esses valores em arquivo versionado.

## 2. Preparar o banco

```powershell
python manage.py migrate
python manage.py popular_dados_ia_dev
python manage.py popular_dados_ia_dev
```

A segunda execução deve manter três cidadãos fake, uma unidade, dois serviços, as vagas planejadas e uma receita histórica, sem duplicar os relacionamentos funcionais.

## 3. Iniciar a API

```powershell
python manage.py runserver 127.0.0.1:8000 --noreload
```

O simulador bloqueia hosts externos por padrão.

## 4. Modo completo

Use a cidadã fake Carla para percorrer autenticação, catálogos e receita. Os valores abaixo são placeholders; use os mesmos valores descartáveis configurados no processo do Django.

```powershell
$env:IA_INTEGRATION_KEY='<CHAVE_LOCAL_LONGA>'
$env:IA_TELEFONE='<TELEFONE_FAKE>'
$env:IA_CPF='<CPF_FAKE>'
$env:IA_MOCK_CODE='<CODIGO_LOCAL>'

python scripts/simular_fluxo_ia.py --modo completo --confirmar-escrita
```

Com `--confirmar-escrita`, o simulador cria um agendamento de teste e o cancela ao final. Use `--manter-agendamento` somente se quiser preservar conscientemente esse registro.

## 5. Modo leitura

O modo leitura realiza apenas GET. Por isso exige um token já obtido pelo fluxo de autenticação e mantido somente em memória/variável do terminal:

```powershell
$env:IA_CITIZEN_SESSION='<TOKEN_TEMPORARIO>'
python scripts/simular_fluxo_ia.py --modo leitura
```

O token não é escrito em arquivo pelo simulador.

## 6. Cadastro fake opcional

Se o CPF fictício não existir e o modo mock estiver habilitado:

```powershell
python scripts/simular_fluxo_ia.py --modo completo --criar-cidadao --nome 'Pessoa Fictícia'
```

Não use essa opção contra ambiente real.

## 7. Proteção contra destino remoto

- localhost/loopback é permitido por padrão;
- host externo exige `--allow-remote`;
- modo completo remoto exige também `--confirmar-host <hostname-exato>`;
- escrita exige `--confirmar-escrita`;
- esses flags não constituem autorização operacional para produção.

## 8. Exemplo resumido de saída

```text
Destino: http://127.0.0.1:8000 (local)
Modo: completo
1. Sessão válida informada pelo backend: não
2. Cidadão localizado: sim
3. Challenge criado; entrega=mock
4. Sessão criada em memória
5. Catálogos: ...
6. Opção disponível: ...
7. Agendamento de teste criado
8. Agendamentos próprios listados: ...
9. Agendamento criado pelo simulador cancelado
10. Receitas próprias listadas: ...
11. Receita detalhada: ...
```

## 9. Validações complementares

```powershell
python -m unittest scripts.test_simular_fluxo_ia
python manage.py test integracao medicamentos.tests_importacao
python manage.py check
python manage.py makemigrations --check --dry-run
```

Os testes de concorrência em `integracao/tests_postgresql.py` são executados somente quando o banco configurado é PostgreSQL.
