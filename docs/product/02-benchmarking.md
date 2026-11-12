# Fábrica de Software Virtual — Benchmarking de Plataformas Literárias

**Documento:** `02-benchmarking.md`  
**Versão:** 1.0 — proposta para validação  
**Data da pesquisa:** 11/11/2026  
**Etapa:** 2 — Produto e backlog  
**Referências internas:** `FABRICA_SOFTWARE_GUIA_MESTRE.md` (v1.0) e `01-visao-produto.md` (v1.0).

## 1. Objetivo, escopo e método

Comparar Bookclubs, Fable, Goodreads e The StoryGraph para identificar padrões de gestão de clubes, descoberta de livros, ciclos coletivos, encontros e participação. O resultado **não é uma autorização para copiar funcionalidades** nem substitui a entrevista com o organizador. A análise foi feita por pesquisa documental em páginas públicas oficiais e documentação de ajuda, sem testes autenticados de todos os fluxos ou auditoria de planos comerciais.

**Legenda de evidência:** **FV** = fato verificado em fonte pública indicada; **R** = recomendação para o produto; **H** = hipótese que requer validação com o organizador ou teste; **NV** = não verificado nesta pesquisa (não significa ausência da função). As prioridades são propostas, não backlog aprovado.

## 2. Síntese executiva

- **Bookclubs:** referência mais próxima do problema operacional: livros do clube, encontros, votações, histórico, participantes e comunicação. **FV** [F1–F3].
- **Fable:** referência para discussões de leitura organizadas por capítulos, moderação e proteção contra spoilers, mas não justifica chat no MVP. **FV** [F4].
- **Goodreads:** referência para catálogo, grupos e discussões de leitores; os grupos são confirmados, mas esta pesquisa não auditou integralmente os fluxos pessoais de avaliação e estantes. **FV parcial** [F5].
- **The StoryGraph:** referência para leitura compartilhada e discussões segmentadas com desbloqueio por avanço, além de controles de privacidade. **FV** [F6–F7].

**R:** usar o Bookclubs como principal referência de jornada do organizador, sem reproduzir sua abrangência. Aproveitar os demais para pensar evoluções sociais, não para inflar a primeira entrega.

## 3. Matriz comparativa de capacidades

**Interpretação:** `✓` = confirmado na fonte citada; `NV` = não verificado com evidência suficiente; `—` = não avaliado como foco do produto. A matriz indica evidência de presença, **não** equivalência de maturidade, gratuidade ou facilidade de uso.

| Capacidade | Bookclubs | Fable | Goodreads | StoryGraph | Decisão proposta para nosso clube |
|---|---|---|---|---|---|
| Comunidade/clube ou grupo de leitores | ✓ [F1] | ✓ [F4] | ✓ [F5] | ✓ [F7] | **MVP:** página do clube; gestão detalhada de membros depois |
| Livro em leitura pelo grupo | ✓ [F1] | ✓ [F4] | NV | ✓ leitura compartilhada [F6] | **MVP:** leitura coletiva atual |
| Acervo / histórico de livros do clube | ✓ [F1] | NV | NV | NV | **MVP:** catálogo e histórico de ciclos |
| Encontros e agenda | ✓ [F1] | NV | NV | NV | **MVP:** consulta e administração básica |
| Votação de livros ou datas | ✓ [F2] | ✓ [F4] | NV | NV | **Evolução prioritária**, após validar o modo de escolha |
| Discussão comunitária | ✓ [F1] | ✓ [F4] | ✓ [F5] | ✓ [F6] | **Pós-MVP:** discussão assíncrona moderada |
| Discussão por capítulo / controle de spoiler | NV | ✓ [F4] | NV | ✓ [F6] | **Pós-MVP opcional:** requer moderação e regra de spoilers |
| Resenhas e avaliações individuais | ✓ [F3] | NV | NV nesta auditoria | NV nesta auditoria | **Pós-MVP**, se houver uso real |
| Controle de presença / lembretes | ✓ [F1] | NV | NV | NV | **Pós-MVP:** não necessário para primeiro fluxo |
| Progresso de leitura individual / estatísticas | NV | ✓ marcos coletivos [F4] | NV | NV nesta auditoria | **Fora do MVP:** não confundir progresso individual com ciclo coletivo |
| Gestão avançada, chat e vídeo | ✓ em diferentes planos [F1,F3] | ✓ chat [F4] | NV | NV | **Excluído do MVP** |

**Cautela:** funcionalidades de terceiros podem mudar ou depender de plano, país e plataforma. Em particular, a documentação de votações do Bookclubs apresenta diferenças de enquadramento entre páginas públicas; não pressupor acesso gratuito irrestrito [F2,F3].

## 4. Dinâmica de uso observada e tradução para o domínio

### 4.1 Bookclubs — operação do clube

**FV:** o organizador cria um clube, convida participantes, adiciona livros, agenda encontros e promove votações. A plataforma destaca leitura atual, livros já lidos e comunicação entre membros [F1–F3]. **R:** espelhar a **sequência conceitual**, não as telas: apresentar clube → cadastrar livro → criar ciclo de leitura → marcar encontro → encerrar ciclo → consultar histórico. **H:** o clube parceiro pode não precisar de convites, presença ou votação digital.

### 4.2 Fable — experiência social em torno da obra

**FV:** a plataforma anuncia clubes com salas de discussão sem spoilers, organizadas por capítulos/episódios, enquetes e marcos de leitura [F4]. **R:** se discussões forem incorporadas, vinculá-las ao **ciclo** de leitura e prever mecanismos de spoiler e moderação. **H:** leitores podem preferir continuar conversando por um canal externo já utilizado.

### 4.3 Goodreads — catálogo e grupos

**FV:** a página oficial de grupos permite descobrir comunidades e evidencia tópicos de discussão e leituras coletivas organizadas por grupos [F5]. **R:** preservar a distinção entre **obra bibliográfica** e **comunidade**, sem tentar construir um diretório social global. **Limite:** a presente pesquisa não valida detalhadamente estantes, avaliações, algoritmos ou fluxos autenticados; não utilizar essas capacidades como fatos auditados nesta versão.

### 4.4 The StoryGraph — leitura compartilhada com proteção contra spoilers

**FV:** os *readalongs* permitem fóruns por partes do livro, inclusive com bloqueio até o leitor atingir determinado trecho; há também recursos de *buddy reads* e clubes mencionados na documentação de privacidade [F6–F7]. **R:** separar discussão de uma leitura coletiva de uma resenha geral do livro. **H:** controle de progresso e desbloqueio de capítulos pode ser excessivo para um clube cuja atividade principal é o encontro presencial/remoto.

## 5. Modelo de interação recomendado

```text
Clube
 ├── Organizador(es) [administração]
 ├── Membros [associação e permissões: evolução]
 ├── Catálogo de livros [obra reutilizável]
 └── Ciclos de leitura coletiva [livro + período + estado]
       ├── Encontro(s) [data, modalidade, detalhes de acesso]
       ├── Histórico do ciclo [MVP]
       ├── Sugestões e votação [evolução]
       └── Discussões e comentários [evolução]

Livro ── pode participar de vários ciclos, inclusive releituras.
Resenha ── pertence a autor e livro; vínculo ao ciclo ainda a decidir.
```

**Decisão preservada:** livro **não é** leitura coletiva; não duplicar a obra para representar releitura. A primeira implantação atende um clube; multiclube completo não é requisito inicial. Uma leitura principal ativa é **H**, não regra confirmada.

## 6. Priorização de funcionalidades e justificativas

| Capacidade | Classificação proposta | Justificativa e trade-off | Evidência/condição |
|---|---|---|---|
| Página pública do clube | **P0 — base MVP** | Explica a comunidade e dá acesso rápido à programação; baixo custo relativo | R; visão aprovada |
| Cadastro manual e consulta de livros | **P0 — base MVP** | Evita dependência externa e viabiliza ciclos; edição de dados pelo organizador | R; visão aprovada |
| Leitura coletiva atual com período/estado | **P0 — base MVP** | Principal informação para participantes; modelo de domínio explícito | R; visão aprovada |
| Agenda simples de encontros | **P0 — base MVP** | Resolve a coordenação básica; sem RSVP ou notificações | R; Bookclubs [F1] |
| Histórico de ciclos, inclusive releitura | **P0 — base MVP** | Preserva memória sem confundir livro e ciclo | R; visão aprovada |
| Autenticação/autorização administrativa mínima | **P0 — base MVP** | Protege operações de escrita; não exige conta de cada leitor | R; visão aprovada |
| Sugestão de livros | **P1 — primeira evolução candidata** | Pequena contribuição comunitária, se o clube usar indicações | R/H; validar processo |
| Votação simples de próxima leitura | **P1 — primeira evolução candidata** | Incremento pedagógico claro, mas exige regras de elegibilidade e fechamento | R/H; Bookclubs/Fable [F2,F4] |
| Busca/importação por Open Library ou Google Books | **P1/P2 — candidata** | Reduz digitação; traz dependências, licenças, deduplicação e falhas externas | R/H; avaliar viabilidade |
| Gestão de membros e papéis granular | **P2 — condicional** | Necessária se houver votação restrita, conteúdo privado ou moderação | R/H |
| Comentários por ciclo e resenhas | **P2 — condicional** | Amplia engajamento, mas exige políticas de publicação, privacidade e moderação | R/H; Fable/StoryGraph [F4,F6] |
| RSVP, presença, lembretes, integração calendário | **P2 — condicional** | Útil apenas se a logística real justificar complexidade adicional | R/H; Bookclubs [F1] |
| Chat em tempo real, vídeo integrado, feed social, IA de recomendação, gamificação e estatísticas individuais sofisticadas | **Fora do MVP** | Alto custo operacional, manutenção ou desvio da proposta central | R; não é proibição permanente |
| Comércio de livros, distribuição de e-books protegidos, app nativo, multiclube completo | **Fora do MVP** | Não contribuem para o primeiro problema validável | Direção aprovada |

**P0/P1/P2 não são estimativas de esforço nem compromissos de entrega.** P0 designa capacidades do software-base inicial; P1/P2 são candidatos ao backlog a refinar, podendo mudar após a entrevista.

## 7. Implicações concretas para o MVP

### 7.1 Recorte funcional mínimo

O usuário visitante deve conseguir: (1) entender o clube, (2) ver livro/leitura atual, (3) consultar próximo(s) encontro(s) e (4) acessar histórico. O organizador autenticado deve conseguir: (5) cadastrar/editar livros, (6) criar/atualizar/encerrar ciclos e (7) administrar informações essenciais dos encontros. A interface deve ser responsiva e considerar acessibilidade desde o início.

**R:** não exigir cadastro de leitores para consulta pública; proteger dados privados dos encontros (por exemplo, links ou contatos restritos) conforme decisão do organizador. **H:** definir quais campos e detalhes são públicos.

### 7.2 Corte software-base × trabalho dos alunos

**Software-base recomendado:** aplicação publicada, autenticação administrativa mínima, catálogo manual, leitura atual, consulta básica de agenda, testes e CI funcionando. Histórico essencial e operações administrativas necessárias à manutenção devem estar implementados antes do piloto ou ser garantidos como parte da preparação do software-base.

**Features candidatas para alunos:** melhorias incrementais de histórico, filtros simples, sugestões de livros, votação simplificada, aperfeiçoamentos de agenda, validações, acessibilidade, testes e correções. **Não reservar uma função essencial sem a qual o clube não consegue usar a base.** O corte final será decidido no `03-product-backlog.md` e depende da capacidade do mentor e do tamanho das issues.

### 7.3 Critérios preliminares de aceitação do MVP

1. Visitante encontra leitura atual e próximo encontro sem autenticação, quando esses dados forem públicos.
2. Organizador autorizado cria e atualiza livro, ciclo e encontro; visitante não pode modificar registros.
3. Encerrar um ciclo o mantém no histórico, com suas datas e encontros.
4. Reutilizar um livro em novo ciclo não duplica o registro bibliográfico.
5. Interface lida com ausência de leitura ativa ou encontro futuro sem apresentar informação falsa.
6. Fluxos essenciais têm testes e execução automatizada na CI; aplicação pode ser iniciada a partir da documentação.

São **critérios candidatos** para detalhamento no backlog, não uma Definition of Done já aprovada.

### 7.4 Dados, integrações e segurança

**R:** cadastro bibliográfico manual primeiro; considerar importação posterior por Open Library/Google Books com busca por título/autor/ISBN, seleção de edição, revisão manual e atribuição. Antes de integrar, verificar termos, licenças, limites e direitos de capas/sinopses. Não incluir textos integrais protegidos. Separar dados públicos de informações de participantes e de acesso privado aos encontros; definir política de publicação/moderação antes de comentários ou resenhas.

### 7.5 Impacto pedagógico

O benchmark **não amplia** o piloto de quatro semanas, 3–4 alunos e 3–4 horas semanais estimadas por pessoa. A equipe deve ingressar em código existente, trabalhar em issues pequenas, abrir PRs, receber review, executar testes/CI e participar de deploy e retrospectiva. O GitHub será o centro da colaboração; stack, hospedagem, ORM e arquitetura permanecem em aberto. Uma feature de agenda é exemplo de jornada didática, **não** compromisso de que será implementada pelos alunos.

## 8. Perguntas de validação com o organizador

1. Hoje, como o clube escolhe o próximo livro? Quem decide e em que momento?
2. Existe uma leitura principal por vez? Há ciclos simultâneos ou releituras?
3. Como são marcados e divulgados os encontros? Quais dados podem ficar públicos?
4. Qual é o principal problema atual: descobrir a programação, manter histórico, escolher obras ou engajar membros?
5. O clube já usa WhatsApp, e-mail ou outra ferramenta para discussões? Faz sentido duplicá-la?
6. O organizador manterá livros, ciclos e agenda? Há outros administradores?
7. Há histórico para migrar? Qual a qualidade dos dados?
8. É necessário registrar participantes, presenças ou votos identificados?
9. Qual funcionalidade seria indispensável para testar a plataforma durante um ciclo real?
10. Quais riscos de privacidade, spoilers ou moderação são relevantes para a comunidade?

## 9. Registro de decisões e pendências

| ID | Registro | Estado |
|---|---|---|
| BM-001 | Bookclubs como referência operacional principal; demais como referências complementares | **R — proposta** |
| BM-002 | Priorizar catálogo, ciclo, agenda e histórico antes de interação social | **Direção aprovada na visão** |
| BM-003 | Não criar rede social generalista nem chat no MVP | **Direção aprovada na visão** |
| BM-004 | Preservar livro distinto de ciclo e permitir releitura | **Direção aprovada na visão** |
| BM-005 | Cadastro manual inicial; API como evolução | **Direção aprovada na visão; integração pendente** |
| BM-006 | Sugestão e votação como primeiras candidatas de evolução | **R — proposta, não backlog fechado** |
| BM-007 | Uma leitura principal ativa por clube | **H — validar** |
| BM-008 | Necessidade de contas de membros, privacidade e moderação | **H — validar** |
| BM-009 | Primeiro piloto com um clube e software-base preexistente | **Direção aprovada; corte operacional pendente** |
| BM-010 | Stack, arquitetura, custos e divisão exata das issues | **Pendente; não decidido pelo benchmark** |

## 10. Fontes e rastreabilidade

Consulta documental realizada em **11/11/2026**. Fontes oficiais públicas; funcionalidades sujeitas a alterações e a limitações de plano. Não houve inspeção autenticada de todos os aplicativos.

- **[F1] Bookclubs — página oficial de funcionalidades:** https://bookclubs.com/ — reuniões, presença, lembretes, votação, histórico, mensagens.
- **[F2] Bookclubs — ajuda: criação de votação:** https://help.bookclubs.com/support/solutions/articles/39000026568-how-to-create-a-poll — tipos de votação, opções, prazo e condições de planos.
- **[F3] Bookclubs — planos e recursos:** https://bookclubs.com/premium-pricing?trigger=pricing_hub — funcionalidades avançadas, moderação/organização e distinção de planos.
- **[F4] Fable — recursos para clubes:** https://fable.co/club-features — clubes, salas sem spoilers, marcos e enquetes.
- **[F5] Goodreads — grupos:** https://www.goodreads.com/group — comunidades, grupos e discussões.
- **[F6] The StoryGraph — anúncio de readalongs:** https://roadmap.thestorygraph.com/changelog/readalongs- — fóruns por seção, bloqueio por avanço e leitura compartilhada.
- **[F7] The StoryGraph — changelog:** https://roadmap.thestorygraph.com/changelog — menções a buddy reads, clubes e privacidade.
- **[I1] Guia Mestre v1.0:** decisões educacionais, piloto, GitHub, repositórios, snapshots, riscos e roadmap.
- **[I2] Visão do Produto v1.0:** objetivos, domínio, limites, jornada, MVP e hipóteses.

**Limitações metodológicas:** não foram feitos testes de usabilidade, entrevistas com usuários das plataformas, verificação sistemática de funcionalidades atrás de login ou análise de preços por mercado. Uma célula `NV` não autoriza afirmar que a plataforma não oferece o recurso. As recomendações são inferências para **nosso contexto**, não fatos sobre concorrentes.

## 11. Próximo passo e controle de mudança

1. Validar com o professor organizador os fluxos e hipóteses da seção 8.
2. Produzir `03-product-backlog.md` com épicos, features, histórias de usuário, critérios de aceite, prioridade e corte **software-base × alunos**.
3. Registrar alterações da visão e do Guia Mestre apenas quando houver decisões novas formalmente aprovadas; manter rastreabilidade entre BM, VP e DEC.
4. Definir `04-processo-trabalho.md` (Scrumban e glossário) e só então configurar GitHub Projects/Issues de acordo com o backlog refinado.

**Estado final:** benchmarking documental concluído para planejamento; recomendações sujeitas a aprovação e hipóteses pendentes de validação com o clube. Nenhuma decisão de stack ou escopo adicional foi tomada neste documento.
