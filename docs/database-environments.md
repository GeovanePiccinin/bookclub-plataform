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
