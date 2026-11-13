# Ambientes de banco de dados

O desenvolvimento local usa PostgreSQL 16 no Docker Compose. A aplicação
Next.js executa no host via pnpm.

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

## Produção

Comandos de produção exigem `DATABASE_URL` fornecida pelo ambiente de deploy;
setup local e testes não os invocam. Antes de uma migration ou seed em produção,
valide o destino com `pnpm db:check:production` e confirme host, banco e schema.
Não use comandos de reset em produção. O seed demonstrativo é desativado nesse
ambiente.

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

Esse fluxo **não está ativo apenas pela presença dos arquivos**. Antes de
integrar o PR que o adiciona, o responsável deve:

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
   `VERCEL_TOKEN` com acesso apenas ao projeto/equipe necessários. Para
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
6. Revise e integre o PR. Configure `PRODUCTION_RELEASE_ENABLED=true` somente
   após verificar tudo acima. Sem essa variável o job falha antes da migration,
   mantendo o deployment atual. Se o job já tiver falhado por estar desativado,
   execute **Re-run all jobs** na execução de `main` mais recente.
7. Confira cada etapa em **Actions**, incluindo promoção e verificação do
   domínio, e valide manualmente login e funcionalidades críticas. Confirme na
   Vercel que o deployment publicado corresponde ao commit esperado.

Previews de PR não devem usar a URL de produção: configure um banco de preview
isolado ou desative os previews. Segredos de produção não são usados pelo job
de `quality`.

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
