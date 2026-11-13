# Book Club Platform

Base técnica do projeto da Fábrica de Software Virtual para apoiar um clube
real de leitura. O repositório preserva a infraestrutura e a feature CRUD
demonstrativa herdadas do Software Starter; **não implementa ainda o domínio
Book Club**.

## Estado atual

- Autenticação por credenciais e autorização administrativa no servidor.
- Persistência PostgreSQL com isolamento por tenant.
- Feature `ExampleItem` como referência ponta a ponta para novas
  funcionalidades.
- Componentes compartilhados, testes, auditoria, rate limiting, logging,
  tratamento de erros e Sentry opcional.
- Ambientes locais separados para desenvolvimento e testes, com validação dos
  destinos de banco.

Catálogo de livros, ciclos de leitura, encontros, votações, comentários e
resenhas **não fazem parte desta etapa**. Consulte o [backlog do produto](./docs/product/03-product-backlog.md) para
entender as propostas, sem tratá-las como autorização automática de
implementação.

## Começar localmente

Requisitos: Git, Docker Desktop com Compose, Node.js 22 e pnpm.

```bash
pnpm install
pnpm run setup
pnpm dev
```

O setup cria arquivos locais de ambiente sem sobrescrever arquivos existentes,
inicia PostgreSQL, aplica as migrations ativas e prepara um administrador e um
item demonstrativos. Os dados e credenciais de exemplo são apenas para
desenvolvimento local; nunca os use em produção. Consulte os
[ambientes de banco de dados](./docs/database-environments.md) antes de
executar comandos relacionados ao banco.

Para desenvolver e abrir PRs, não é necessário ter credenciais do Supabase de
produção, da Vercel ou do GitHub Actions. O fluxo de migrations e as
configurações restritas aos responsáveis por produção estão no
[guia de ambientes e publicação](./docs/database-environments.md).

No PowerShell do Windows, use `pnpm.cmd` se a política de execução bloquear
`pnpm.ps1`.

## Documentação

- [Visão do produto](./docs/product/01-visao-produto.md)
- [Benchmarking](./docs/product/02-benchmarking.md)
- [Product Backlog](./docs/product/03-product-backlog.md)
- [Processo de trabalho](./docs/product/04-processo-trabalho.md)
- [Guia de arquitetura e onboarding](./docs/architecture-guide.md)
- [Ambientes e banco de dados](./docs/database-environments.md)
- [Auditoria e rate limiting](./docs/audit-and-rate-limiting.md)
- [Observabilidade e tratamento de erros](./docs/observability.md)
- [Contribuição](./CONTRIBUTING.md)
- [Desenvolvimento com IA](./docs/ai-assisted-development.md)
- [Política de segurança](./SECURITY.md)

As especificações em `specs/` descrevem funcionalidades do sistema anterior
de agendamentos e são mantidas somente como histórico; não representam o
escopo atual do Book Club.

## Stack

Next.js, React, TypeScript, NextAuth, Prisma ORM, PostgreSQL, TanStack Query e
Table, React Hook Form, Zod, Tailwind CSS, Vitest, ESLint, Pino e Sentry
opcional. Consulte [CONTRIBUTING](./CONTRIBUTING.md) para branches, commits,
testes e Pull Requests.
