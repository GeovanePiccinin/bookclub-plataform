# Ambientes de banco de dados

O desenvolvimento local usa PostgreSQL 16 no Docker Compose. A aplicação
Next.js executa no host via pnpm.

## Mapa dos ambientes

| Ambiente               | Onde executa                 | Banco e configuração                                                              | Quem configura                  |
| ---------------------- | ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| Desenvolvimento        | Next.js no computador do dev | Docker local `software_starter_dev`; `.env.development`                           | Cada dev                        |
| Testes locais          | Vitest no computador do dev  | Docker local `software_starter_test`; `.env.test`                                 | Cada dev                        |
| CI de PR e `main`      | GitHub Actions               | PostgreSQL temporário, com bancos separados para teste e build                    | Workflow                        |
| Preview, se habilitado | Vercel e GitHub Actions      | Banco e variáveis de preview **isolados de produção**                             | Responsável pela infraestrutura |
| Produção               | Vercel e GitHub Actions      | Supabase; variáveis da Vercel para a aplicação e secrets do GitHub para migration | Responsáveis por produção       |

O nome `DATABASE_URL` aparece em vários ambientes, mas os valores são
independentes. Secrets do GitHub não são automaticamente compartilhados com a
Vercel. Nenhum desenvolvedor precisa de credenciais de produção para o setup,
testes locais ou PR.

## Requisitos e primeira configuração

Instale Docker Desktop com Compose, Node.js 22 e pnpm. Após clonar o repositório:

```bash
pnpm install
pnpm run setup
```

No PowerShell do Windows, use `pnpm.cmd` se a política de execução bloquear
`pnpm.ps1`.

`pnpm run setup` (alias de `pnpm run setup:local`) copia `.env.development.example` e
`.env.test.example` apenas se os respectivos arquivos locais não existirem. Em
seguida, inicia PostgreSQL, aplica as migrations nos bancos de desenvolvimento
e teste, e executa o seed somente no banco de desenvolvimento. Arquivos locais
já existentes não são sobrescritos.

Use `pnpm run setup`, não `pnpm setup`: `setup` sem `run` é um comando próprio
do pnpm para configurar o gerenciador, não um script do projeto.

O serviço do Compose mantém bancos independentes:

- `software_starter_dev` para desenvolvimento e seed.
- `software_starter_test` para testes.

Esses nomes são identificadores internos herdados e permanecem estáveis para
não quebrar volumes locais já inicializados. Eles não representam a identidade
visível do Book Club Platform.

Ambos usam credenciais de exemplo locais e um volume nomeado do projeto. O
Compose cria o banco de teste na inicialização de um volume novo. `pnpm
db:down` para o container, mas preserva o volume. Não remova o volume sem
confirmar que os dados locais podem ser apagados.

Os exemplos locais fornecem `AUTH_SECRET`, `DATABASE_URL`, `DATABASE_SCHEMA`,
porta Docker e credenciais `DEMO_ADMIN_*` para desenvolvimento; o arquivo de
teste define também `TEST_DATABASE_URL`. O setup não altera arquivos existentes.
Para mudar a porta de `54329`, edite-a **nos dois arquivos locais** antes de
iniciar o Compose. Se já houver um processo de outro projeto usando a porta,
não o interrompa: escolha outra porta livre. Valores de exemplo nunca devem
ser usados em produção ou enviados como credenciais reais.

Após `pnpm run setup`, inicie com `pnpm dev` e acesse
`http://localhost:3000/login` usando os valores locais de `DEMO_ADMIN_EMAIL` e
`DEMO_ADMIN_PASSWORD`. `pnpm db:up` é suficiente para reiniciar o banco em dias
seguintes; rode `pnpm db:migrate` se tiver recebido migrations novas. O seed
local é repetível, mas uma nova execução pode atualizar a conta demonstrativa,
inclusive sua senha: não o confunda com uma rotina de produção.

## Comandos locais

| Comando           | Resultado                                                        |
| ----------------- | ---------------------------------------------------------------- |
| `pnpm db:up`      | Inicia PostgreSQL e aguarda o healthcheck.                       |
| `pnpm db:down`    | Para o serviço sem excluir o volume.                             |
| `pnpm db:migrate` | Aplica migrations de desenvolvimento.                            |
| `pnpm db:seed`    | Executa o seed de desenvolvimento.                               |
| `pnpm test:local` | Inicia PostgreSQL, migra o banco de teste e roda testes.         |
| `pnpm test`       | Executa uma vez a suíte contra o banco de teste já preparado.    |
| `pnpm dev`        | Executa Next.js localmente com o banco de desenvolvimento.       |
| `pnpm build`      | Executa o build local usando o alvo de desenvolvimento validado. |

Também estão disponíveis `pnpm db:migrate:development`,
`pnpm db:migrate:test`, `pnpm db:seed:development`, `pnpm test:run` e
`pnpm build:production` para um ambiente de build explicitamente configurado.
Na CI, `pnpm build` usa o `DATABASE_URL` do banco efêmero de build; fora da CI,
usa o banco local validado de desenvolvimento.

A porta padrão do host é `54329`. Para alterá-la, configure o mesmo
`STARTER_POSTGRES_PORT` em `.env.development` e `.env.test`; as URLs de banco
interpolam esse valor. Os comandos locais aceitam somente conexões loopback aos
nomes de banco esperados. Isso impede que apontem aos bancos do sistema
original.

## Testes e CI

Testes locais usam `software_starter_test`, nunca dados de desenvolvimento. O
runner exige `.env.test`, valida que `DATABASE_URL` e `TEST_DATABASE_URL`
apontam ao mesmo banco de teste, rejeita destinos inesperados/não locais e
remove variáveis PostgreSQL herdadas do processo.

A CI usa um serviço PostgreSQL 16 efêmero criado para cada execução. Ele mantém
um banco de build separado e não usa o volume local nem banco de produção.

## Migrations no desenvolvimento e no PR

`pnpm db:migrate` aplica migrations já existentes; ele **não cria** uma nova.
Quando a alteração exigir uma migration:

1. Em uma branch de trabalho, confirme que o Docker local está ativo e que
   `.env.development` aponta ao banco local dedicado, nunca ao Supabase. Rode
   `pnpm db:migrate` para aplicar migrations pendentes existentes e então
   altere `prisma/schema.prisma`.
2. Crie a migration sem aplicá-la ao banco de desenvolvimento:

   ```bash
   pnpm exec tsx scripts/run-env.ts development node_modules/tsx/dist/cli.mjs scripts/prisma-command.ts migrate dev --create-only --name nome_da_mudanca
   ```

   O wrapper valida o ambiente e a conexão local antes de chamar o Prisma 7.
   O Prisma pode criar um shadow database temporário no mesmo servidor local e
   exigir permissões para isso. Se solicitar reset ou relatar drift, **pare e
   investigue**; não aceite reset nem use o histórico legado.

3. Revise o SQL gerado em `prisma/migrations/`, incluindo operações destrutivas
   ou incompatíveis com dados existentes. Não edite migrations já aplicadas.
4. Aplique a nova migration nos bancos locais e atualize o Prisma Client:

   ```bash
   pnpm db:migrate:development
   pnpm db:migrate:test
   pnpm db:generate
   ```

5. Execute `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` e
   `pnpm build`. Envie schema e nova pasta da migration no mesmo PR. Registre no
   PR os testes, compatibilidade, riscos e plano de recuperação.
6. A CI do PR valida migrations em bancos temporários vazios, não em produção.
   Ela não garante segurança de uma migration sobre dados existentes: mudanças
   arriscadas devem ser verificadas também em staging isolado com dados
   representativos, sem dados pessoais.

O mentor revisa e aprova o PR segundo as regras configuradas no GitHub. Após
merge na `main`, o release de produção pode iniciar automaticamente; aprovação
de PR por si só, sem merge, não altera produção.

## Produção

Comandos de produção exigem `DATABASE_URL` fornecida pelo ambiente de deploy;
setup local e testes não os invocam. Antes de uma migration ou seed em produção,
valide o destino com `pnpm db:check:production` e confirme host, banco e schema.
Não use comandos de reset em produção. O seed demonstrativo é desativado nesse
ambiente: `pnpm db:seed` aponta a desenvolvimento e `pnpm db:seed:production`
também chama o seed demonstrativo, que recusa produção. Não desative essa
proteção. O bootstrap inicial é separado e não roda em releases posteriores.

### Migrations e publicação

O fluxo de release usa a CI do PR e, depois do merge em `main`, executa
novamente o job `quality`. Após seu sucesso, o job de produção valida a
configuração e o destino, aplica migrations pendentes, cria um deployment
Vercel sem promovê-lo, verifica sua resposta HTTP e só então o promove.
O antigo disparo manual de migrations é substituído por esse fluxo: uma
tentativa manual de recuperação deve reexecutar a CI do commit mais recente,
incluindo a publicação, após o diagnóstico apropriado.
O resultado e o commit ficam registrados na execução do GitHub Actions. A
checagem HTTP da página inicial não comprova login, acesso ao banco ou
equivalência do deployment com todos os domínios: valide também esses pontos.

A presença dos arquivos não comprova que as proteções e os valores estejam
corretos: para configurar, revisar ou reconstruir o ambiente, um responsável
deve seguir os passos abaixo.

1. Na Vercel, confirme o projeto e a branch de produção e desative a atribuição
   automática dos domínios de produção em **Settings > Environments >
   Production > Branch Tracking**. Preserve o deployment atual. Confirme que
   nenhum outro projeto, deploy hook, integração ou workflow consegue publicar
   diretamente no domínio. O `vercel.json` adicionalmente desativa deploys Git
   para `main`, mas mantenha a proteção no painel durante a transição.
2. No GitHub, em **Settings > Environments > production**, restrinja a branch
   a `main`; ative aprovação do ambiente quando apropriado e disponível.
   Configure branch protection/rulesets para exigir PR, aprovação e o check
   `quality`, e restrinja alterações em workflows e bypass de regras.
3. Configure os secrets do ambiente: `DATABASE_URL` para migrations e
   `VERCEL_TOKEN` com acesso necessário à equipe e ao projeto. O workflow atual
   executa `vercel whoami`: um token restrito a um único projeto não permite
   acesso ao recurso de usuário e pode retornar `User not found`; use um
   escopo compatível e considere seu alcance ampliado. Para
   deployment protegido por Vercel Authentication, configure também
   `VERCEL_AUTOMATION_BYPASS_SECRET` se o recurso estiver disponível. Um secret
   de ambiente prevalece sobre o de repositório com o mesmo nome.
4. Configure as variáveis do ambiente: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
   `PRODUCTION_URL` (URL HTTPS do domínio, sem caminho nem barra final),
   `MIGRATION_EXPECTED_HOST`, `MIGRATION_EXPECTED_PORT`,
   `MIGRATION_EXPECTED_DATABASE` e `MIGRATION_EXPECTED_USER`. Os quatro últimos
   valores são o host, porta, banco e usuário da URL de migration, conferidos
   independentemente com o Supabase; o usuário do pooler inclui a referência do
   projeto. Não coloque senha em variáveis nem nos logs.
5. Confira as credenciais e permissões antes de habilitar o fluxo. No Supabase,
   prefira conexão direta para migrations; se o runner não tiver IPv6 e não
   houver IPv4 direto, use o pooler em **modo sessão**, não modo transação.
   Confirme TLS, conectividade, permissões de DDL e backup/recuperação. A URL
   de aplicação na Vercel pode usar outro endpoint, mas deve apontar ao mesmo
   projeto e banco. Confira esses destinos nos dois painéis.
6. Configure `PRODUCTION_RELEASE_ENABLED=true` somente após verificar tudo
   acima. Sem essa variável o job falha antes da migration. Se o job já tiver
   falhado por estar desativado, investigue e execute **Re-run all jobs** na
   execução de `main` mais recente quando o release estiver autorizado.
7. Confira cada etapa em **Actions**, incluindo promoção e verificação do
   domínio, e valide manualmente login e funcionalidades críticas. Confirme na
   Vercel que o deployment publicado corresponde ao commit esperado.

### Variáveis por plataforma

**Vercel — Settings > Environment Variables > Production**

| Nome                                   | Uso                                                                |
| -------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                         | Conexão da aplicação ao banco de produção.                         |
| `APP_ENV`                              | Defina `production` também no runtime; `NODE_ENV` não o substitui. |
| `AUTH_SECRET`                          | Segredo forte e privado usado pela autenticação e rate limit.      |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Opcionais, se observabilidade Sentry estiver configurada.          |

Configure ou confirme o build command `pnpm build:production` em
**Settings > Build and Deployment** na Vercel.
Defina as variáveis para o ambiente **Production** e faça novo deployment após
alterações quando necessário. `DATABASE_URL` deve incluir host, porta explícita
e banco; o schema aceito pelo projeto é `public`. Tokens e credenciais nunca
devem ser prefixados com `NEXT_PUBLIC_` ou armazenados no repositório.

**GitHub — Settings > Environments > production**

Configure como **Environment secrets**:

| Nome                              | Uso                                                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | Conexão usada pelo Prisma para migrations; pode ser diferente da URL da aplicação, mas deve apontar ao mesmo banco e projeto. |
| `VERCEL_TOKEN`                    | Token de acesso da Vercel usado pela CLI para autenticar, criar e promover o deployment.                                      |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Necessário quando a URL do deployment protegido exige bypass para o teste HTTP; não é o token da CLI.                         |

Configure como **Environment variables**:

| Nome                          | Uso                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `PRODUCTION_RELEASE_ENABLED`  | `true` para habilitar o job; ausente ou outro valor bloqueia antes da migration.                                    |
| `VERCEL_ORG_ID`               | Identificador da equipe/conta proprietária do projeto.                                                              |
| `VERCEL_PROJECT_ID`           | Identificador do projeto Vercel.                                                                                    |
| `PRODUCTION_URL`              | Origem HTTPS sem caminho nem barra final; a página `/` deve responder HTTP 200.                                     |
| `MIGRATION_EXPECTED_HOST`     | Host da URL de migration conferido no Supabase.                                                                     |
| `MIGRATION_EXPECTED_PORT`     | Porta da URL de migration.                                                                                          |
| `MIGRATION_EXPECTED_DATABASE` | Nome do banco da URL de migration.                                                                                  |
| `MIGRATION_EXPECTED_USER`     | Usuário completo da URL de migration; no pooler Supabase normalmente `postgres.<referência-do-projeto>`, sem senha. |

Os valores `BOOTSTRAP_*` são exclusivos do provisionamento inicial descrito
abaixo e não são necessários nos releases normais. `AUTH_SECRET` pertence à
aplicação Vercel, não é uma credencial necessária ao job de migration. O
secret de ambiente tem precedência sobre um secret de repositório homônimo.

**Supabase — Connect e configurações do projeto**

Confirme o projeto, banco, schema, usuário e endpoint independentemente dos
valores do GitHub e da Vercel. Para o Session Pooler, copie também o usuário
completo específico do projeto; não use somente `postgres` se a URL contiver
o sufixo. Confirme que o usuário de migration tem permissões de DDL e que há
backup e procedimento de recuperação. Não copie a URL completa em issues,
logs ou mensagens.

### Onde o fluxo está definido

- `.github/workflows/ci.yml`: PRs e pushes na `main`; executa `quality` e
  chama o release somente após sucesso em push para `main`.
- `.github/workflows/prod-db-setup.yml`: job do ambiente `production`, valida
  configuração e banco, executa `pnpm db:migrate:production`, cria deployment
  não promovido, verifica HTTP e promove na Vercel.
- `.github/workflows/production-bootstrap.yml`: provisionamento manual inicial
  de tenant e admin; não é executado em cada release.
- `vercel.json`: desativa deployments Git da `main`; permissões, domínio,
  segredo de bypass e prevenção de outros caminhos de deploy são configurados
  nos painéis.
- `prisma.config.ts` e `prisma/migrations/`: configuração Prisma 7 e histórico
  ativo. O histórico em `prisma/migrations-legacy/` não deve ser aplicado.

Um check de HTTP 200 confirma apenas a resposta da página inicial, não a
autenticação, os dados ou a integridade de todos os domínios. Uma alteração na
`main` durante o release é conferida antes da migration e da promoção, mas não
há bloqueio atômico de merges; mantenha migrations compatíveis e acompanhe
releases concorrentes. Configurações externas, segredos, proteções e acessos
devem ser verificados pelos responsáveis nos painéis: o repositório não
confirma seu estado atual.

### Falhas observadas e diagnóstico

| Mensagem                                                                   | Verificação                                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Production release is disabled or its Vercel configuration is incomplete` | Verifique habilitação, token e IDs; `PRODUCTION_URL` deve ser HTTPS **sem barra final**.                                                                                                                    |
| `User not found` em `vercel whoami`                                        | Verifique validade e escopo do token. Token restrito a um projeto não acessa o recurso de usuário usado pelo comando.                                                                                       |
| `Migration DATABASE_URL does not match...`                                 | Compare host, porta, banco e usuário completos com a URL de migration; não exponha a senha. No Session Pooler, confira o sufixo do usuário.                                                                 |
| `Deployment health check returned HTTP 302`                                | Pode ser proteção Vercel. Confira o destino do redirect e, se apropriado, configure **Protection Bypass for Automation** na Vercel e o secret de mesmo nome no GitHub. Não trate qualquer 302 como sucesso. |

Após corrigir, confira o estágio em que houve falha antes de usar **Re-run all
jobs** na execução mais recente da `main`. Isso pode aplicar migrations
pendentes e publicar. Uma falha antes de `Apply pending migrations` não chegou
a essa etapa; falhas posteriores podem ocorrer após mudanças no banco.

### Migrations de Preview

Após `quality`, PRs direcionados a `main` executam `migrate-preview` no
Environment `preview`. Configure nele o secret `DATABASE_URL` com a Session
Pooler do Supabase de staging, porta 5432, e as variáveis independentes
`PREVIEW_MIGRATION_EXPECTED_HOST`, `PREVIEW_MIGRATION_EXPECTED_PORT`,
`PREVIEW_MIGRATION_EXPECTED_DATABASE` e `PREVIEW_MIGRATION_EXPECTED_USER`. Use o usuário
completo da URL, incluindo o identificador do projeto no pooler. Confirme
independentemente que o projeto e a conta são exclusivos de staging; a
comparação com as variáveis não detecta uma configuração incorreta que aponte
para produção. Não use dados pessoais.

O comando `pnpm db:migrate:preview` é restrito a eventos de PR no GitHub Actions,
valida esses parâmetros e confere o banco e schema ativos antes de executar
`prisma migrate deploy`. A ausência do secret ou de qualquer variável faz o job
falhar. PRs de forks normalmente não recebem secrets; seu job de Preview
falhará sem uma disponibilização explícita e segura das credenciais. Nunca use
`pull_request_target` para executar código de PR com secrets.

Configure aprovação obrigatória e restrinja acesso ao Environment `preview`
nas configurações do GitHub, conforme os recursos disponíveis no repositório.
O job executa código do PR e pode acessar seu secret: revise o código, as
dependências e as migrations antes de aprová-lo. Essas proteções e o isolamento
do banco não são garantidos pelo YAML. Configure a Vercel Preview separadamente;
ela não recebe automaticamente secrets do GitHub.

O banco de staging é compartilhado entre PRs, não isolado por PR. O grupo de
concorrência impede migrations simultâneas, mas o GitHub pode substituir uma
execução pendente. Migrations de um PR continuam no banco mesmo se ele for
fechado; branches divergentes podem causar conflitos ou incompatibilidade.
Revise compatibilidade, backup e recuperação, acompanhe cancelamentos e
reexecute quando apropriado. Não há rollback automático. Segredos de produção
não são usados pelo job `quality`.

Após as migrations, `pnpm db:seed:preview` cria o tenant, administrador e item
demonstrativos ausentes, usando as mesmas validações de destino. Configure os
secrets `DEMO_ADMIN_EMAIL` e `DEMO_ADMIN_PASSWORD` no Environment `preview`;
use credenciais exclusivas de demonstração e senha com pelo menos 8 caracteres.
O seed roda em cada execução bem-sucedida do job, mas preserva registros
existentes e recria os ausentes. Alterar esses secrets não atualiza a senha ou
e-mail de um administrador já criado. Colisões com outros tenants ou usuários
fazem o seed falhar; ele não substitui dados de outras pessoas. O seed de
desenvolvimento/teste mantém seu comportamento anterior, e produção continua
bloqueada.

### Concorrência e recuperação do release de produção

O job de produção e o bootstrap inicial compartilham uma fila de concorrência.
Uma execução antiga que ainda não iniciou a migration, ou que ficou antiga
antes da promoção, falha em vez de publicar seu commit. O GitHub mantém apenas
uma execução pendente por grupo: outra execução pode substituir a pendente,
inclusive entre bootstrap e release. Verifique cancelamentos e reexecute o job
de `main` mais recente quando necessário. Uma aprovação do ambiente pode
acrescentar uma etapa manual.

As migrations devem ser compatíveis com o código atualmente publicado: o banco
é alterado antes da promoção e não existe rollback automático do schema.
Desmembre alterações incompatíveis em etapas e planeje backfill e recuperação.
Um teste em banco vazio não verifica todos os riscos de dados reais; teste
também upgrades em staging com dados representativos e sem informações pessoais.
Não edite migrations já aplicadas, nem aplique o histórico legado.

Se migration, build, validação ou promoção falhar, investigue antes de
reexecutar. A migration pode já ter alterado o banco mesmo se uma etapa
posterior falhar; rollback de deployment não reverte o banco. Se a verificação
do domínio falhar após a promoção, o deployment novo pode já estar publicado.
Uma promoção pode continuar após timeout. Consulte a Vercel e o histórico de
`_prisma_migrations`; use migration corretiva ou recuperação avaliada. Não use
reset ou `migrate resolve` sem diagnóstico e procedimento aprovado.

### Primeiro administrador de produção

O seed demonstrativo não provisiona produção. Para um banco de produção novo,
com as migrations ativas já aplicadas, o workflow manual
`Provision initial production administrator` cria um tenant e seu primeiro
usuário `ADMIN`, além de registrar a criação em auditoria. Ele não cria itens
demonstrativos nem implementa cadastro de usuários.

O provisionamento é exclusivo do GitHub Actions, disparado manualmente a partir
de `main`. Antes de executá-lo:

1. Revise e integre o workflow e o script por PR. Confirme migrations, backup
   ou procedimento de recuperação do banco e o destino com o provedor.
2. Em **Settings > Environments**, configure o ambiente `production`.
   Restrinja o acesso a `main` e exija aprovação humana quando disponível no
   plano do repositório. Essas proteções são configurações manuais do GitHub,
   não são criadas pelo workflow. Limite quem pode alterar workflows, segredos,
   variáveis e iniciar execuções.
3. Configure neste ambiente os secrets `DATABASE_URL`,
   `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD`. Use uma senha forte e
   única, de 16 a 256 caracteres, guardada em gerenciador de senhas; não envie
   credenciais em mensagens nem as registre no repositório. O login atualmente
   não oferece alteração ou recuperação de senha.
4. Configure as variáveis de ambiente do GitHub `BOOTSTRAP_TENANT_NAME`,
   `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_EXPECTED_HOST`,
   `BOOTSTRAP_EXPECTED_PORT` e `BOOTSTRAP_EXPECTED_DATABASE`. Confirme host,
   porta e nome do banco diretamente com o provedor, independentemente do
   secret `DATABASE_URL`. A URL deve conter porta explícita e usar schema
   `public`. Não inclua credenciais nas variáveis de destino.
5. Em **Actions**, selecione o workflow, a branch `main`, informe `PROVISION`
   no campo de confirmação e aprove a execução se necessário. Uma branch ou
   confirmação diferente deixa o job sem execução. Confira o resultado do job;
   não considere um job ignorado como provisionamento bem-sucedido.
6. Após sucesso, teste o login com o e-mail em minúsculas e a senha escolhida.
   Remova os secrets temporários `BOOTSTRAP_ADMIN_EMAIL` e
   `BOOTSTRAP_ADMIN_PASSWORD` do GitHub e mantenha a senha no gerenciador.
   Preserve `DATABASE_URL` se outros workflows de produção dependerem dele.

O script compara URL e destino configurado, verifica o banco e schema ativos e
exige que **não exista nenhum tenant ou usuário**. A criação e a auditoria
ocorrem em uma transação serializável. Se já houver dados, inclusive após uma
execução bem-sucedida, ele falha sem atualizar contas; não é uma ferramenta de
recuperação de senha nem de criação de administradores adicionais. Falhas de
conexão, migrations ou conflito devem ser investigadas antes de nova tentativa.
Nunca execute esse comando a partir do terminal local.

## Baseline do starter

O schema ativo e a migration inicial definem o starter: usuários e itens de
exemplo tenant-scoped, auditoria e rate limit. O histórico do sistema de
agendamentos está preservado em `prisma/migrations-legacy/` e não faz parte do
caminho ativo. O seed cria apenas um administrador local e um item de exemplo.
Não aponte esta configuração a um banco existente nem aplique o histórico
arquivado ao banco do sistema original.
