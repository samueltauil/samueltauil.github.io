---
lang: pt-br
layout: post
title: "Construindo Meu Primeiro Agentic Workflow: Um Agente de Sincronização de Documentação com GitHub Agentic Workflows"
date: 2026-02-13
categories: [github, ai, devops]
tags: [github-actions, ai, automation, agentic-workflows, developer-tools, github-copilot]
---

Tenho estado profundamente envolvido no mundo de GitHub Agentic Workflows ultimamente, e estou absolutamente entusiasmado sobre o que essa tecnologia habilita. Se você já desejou que seus pipelines de CI/CD pudessem *pensar* em vez de apenas executar, este é o momento que você está esperando. Construí um agente de sincronização de documentação para meu repositório [AI Skills Hub](https://github.com/samueltauil/skills-hub), e quero guiá-lo pelo que aprendi: o que agentic workflows são, como funcionam internamente, como meu workflow se compara com o spec oficial, e que padrões de design e ideias você pode usar para começar a construir os seus próprios.

Vamos mergulhar nisso.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } O que São GitHub Agentic Workflows?

GitHub Actions tradicionais são poderosos, mas são fundamentalmente rígidos. Você escreve YAML, define steps, e cada caminho condicional tem que ser explicitamente codificado. Agentic Workflows invertem esse modelo de cabeça para baixo.

Com [GitHub Agentic Workflows](https://github.github.com/gh-aw/introduction/overview/) (gh-aw), você escreve sua automação em **Markdown**. Sim, Markdown simples. O frontmatter YAML no topo configura triggers, permissões e tools, enquanto o corpo do arquivo contém **instruções em linguagem natural** que um agente de codificação com IA (Copilot, Claude ou Codex) interpreta em tempo de execução.

O agente pode:

- **Entender contexto**: Ler seu repositório, issues, pull requests e arquivos para compreender a situação atual
- **Tomar decisões**: Escolher ações apropriadas com base no que encontra, não apenas branches pré-definidas if-then
- **Adaptar comportamento**: Responder flexivelmente a diferentes cenários sem você ter que contabilizar cada caso edge antecipadamente

O insight chave é este: você descreve *o que quer que aconteça*, e o agente de IA descobre *como fazer*. O comando `gh aw compile` então transforma seu Markdown em um workflow GitHub Actions seguro (um arquivo `.lock.yml`) que executa dentro de um ambiente sandboxed com detecção de ameaças integrada.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } A Arquitetura Que Torna Isso Seguro

Antes de você entrar em pânico sobre dar a um agente de IA acesso de escrita ao seu repositório, aqui está a parte que me fez me apaixonar por este sistema: **safe outputs**.

Agentic workflows reforçam uma separação limpa entre pensamento e execução. O agente executa com **permissões read-only** por padrão. Quando precisa escrever algo (criar uma PR, postar um comentário, adicionar labels), ele produz saída estruturada que um *job separado e controlado por permissões* executa. O agente nunca obtém acesso direto de escrita. Ele solicita ações, e um handler sandboxed valida e as executa. 

Isso é segurança através de separação, e é genuinamente inteligente. Você obtém a flexibilidade de um agente de IA que pode raciocinar sobre seu codebase enquanto mantém o princípio de privilégio mínimo. Além disso, cada workflow executa dentro do Agent Workflow Firewall (AWF), que fornece controles de egresso de rede, detecção de prompt injection e prevenção de vazamento de segredos.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } Meu Workflow de Docs-Sync: A Coisa Real

Para o [AI Skills Hub](https://github.com/samueltauil/skills-hub), tenho um catálogo curado de skills de assistente de IA agregados de múltiplas fontes upstream. Os dados fluem através de git submodules e um workflow de sincronização semanal, e o desafio é manter a documentação (README, guia de CONTRIBUTING e homepage Astro) alinhada com o estado real dos dados.

Verificar manualmente se contagens de badges são precisas, tabelas de categorias estão atualizadas e formatos de exemplo correspondem ao schema é exatamente o tipo de trabalho tedioso-mas-importante que um agente de IA é excelente em fazer.

Aqui está o frontmatter do meu [workflow de docs-sync](https://github.com/samueltauil/skills-hub/blob/main/.github/workflows/docs-sync.md):

```yaml
---
description: Keeps documentation (README, CONTRIBUTING, and site content)
  aligned with the current skills registry and upstream sources after sync
  updates.
on:
  push:
    branches: [main]
    paths:
      - "skills/registry.json"
      - "site/src/data/skills.json"
      - "sources/**"
  workflow_dispatch:
permissions:
  contents: read
  actions: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-pull-request:
    title-prefix: "[docs-sync] "
    labels: [documentation, automation]
    draft: true
    expires: 14
---
```

E o corpo Markdown dá ao agente sua missão: ler os dados de skills, auditar cada arquivo de documentação por obsolescência, identificar drift, aplicar mínimos fixes, e resumir tudo em uma pull request. Também sabe usar o `noop` safe output quando tudo já está em sincronização, então o workflow não cria ruído.

## Validação: Como Se Compara?

Eu passei pela [documentação oficial gh-aw](https://github.github.com/gh-aw/introduction/overview/), a [referência de frontmatter](https://github.github.com/gh-aw/reference/frontmatter/), o [spec de safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/), e o [agente de agentic workflows](https://github.com/github/gh-aw/blob/main/.github/agents/agentic-workflows.agent.md) em si. Aqui está a análise.

### O que Acerta

**Design Inteligente de Trigger.** O trigger `push` usa filtragem baseada em caminho para que o workflow só dispare quando os arquivos de dados realmente mudam (`skills/registry.json`, `site/src/data/skills.json`, ou qualquer coisa sob `sources/`). Isso evita desperdiçar compute em commits não relacionados. Incluir `workflow_dispatch` também é uma ótima prática, já que permite que você dispare o agente manualmente para testes ou execuções on-demand.

**Permissões com Privilégio Mínimo.** As permissões são `contents: read` e `actions: read`. O workflow não solicita nenhuma permissão de escrita porque todas as operações de escrita fluem através do sistema safe-outputs. Isso é exatamente como agentic workflows devem funcionar. O agente lê seu repo, raciocina sobre ele, e então *pede* ao handler safe-output para criar uma pull request em seu nome.

**Safe Outputs Bem-Configurados.** O output `create-pull-request` usa:
- `title-prefix: "[docs-sync] "` para identificação fácil
- `labels: [documentation, automation]` para rastreamento organizado
- `draft: true` para que um humano revise antes de fazer merge
- `expires: 14` para auto-fechar PRs obsoletas após duas semanas

Todos esses campos são válidos de acordo com o spec. O default `draft: true` é um toque particularmente legal, já que assegura que o agente nunca faz merge de mudanças sem supervisão humana. A expiração de 14 dias previne PRs abandonadas de se acumularem.

**Instruções Claras em Linguagem Natural.** O corpo Markdown é estruturado com contexto, tarefas passo-a-passo, diretrizes explícitas e instruções de safe output. O agente sabe exatamente quais arquivos verificar, quais discrepâncias procurar, e o que *não* é permitido fazer (nunca deve modificar `registry.json`, `skills.json`, ou código-fonte). Este tipo de boundary-setting explícito é crítico para comportamento confiável do agente.

**Uso Apropriado de noop.** O workflow instrui o agente a chamar `noop` quando a documentação já está em sincronização. Como `noop` é auto-habilitado por padrão em gh-aw, isso apenas funciona. Previne conclusões silenciosas e te dá visibilidade sobre o que o agente decidiu.

### Observações e Ideias para Iterações Futuras

O workflow é sólido como está, mas algumas coisas se destacaram como potenciais melhorias para versões futuras:

- **Nenhum `engine:` especificado.** Isso usa como padrão Copilot, o que é fino. Se você alguma vez quisesse experimentar Claude ou Codex para esta tarefa, adicionar `engine: claude` seria uma mudança de uma linha.
- **Nenhum controle `concurrency:`.** Se múltiplos commits de arquivo de dados chegarem em rápida sucessão, execuções sobrepostas de workflow poderiam criar PRs duplicadas. Adicionar um grupo de concorrência como `concurrency: { group: docs-sync-${{ github.ref }}, cancel-in-progress: true }` evitaria isso.
- **Nenhum `if-no-changes:` no output de PR.** A abordagem atual usa `noop` nas instruções, o que funciona. Mas você também poderia adicionar `if-no-changes: "ignore"` à configuração `create-pull-request` como uma abordagem de bretele-e-suspensórios.

Essas são refinamentos menores, não problemas. O workflow segue as convenções gh-aw com precisão e compilaria limpo.

## O Poder de Descrever O Que, Não Como

A coisa que realmente me deixa animado sobre agentic workflows é o padrão que estabelece. Veja o que construímos aqui: um arquivo Markdown de 70 linhas que substitui o que teria sido centenas de linhas de shell scripting frágil, análise JSON e lógica condicional em GitHub Actions tradicionais.

O agente lê arquivos, compara estruturas de dados, identifica discrepâncias, faz edições direcionadas e escreve um resumo detalhado de PR. Todo esse comportamento emerge de instruções em linguagem natural. Se o schema mudar ou um novo arquivo de documentação for adicionado, você atualiza o Markdown e o agente se adapta. Nenhuma reescrita de regex, nenhuma atualização de parser, nenhum novo caso de teste para condições edge que você esqueceu de considerar.

E o ecossistema ao seu redor está crescendo rápido. O projeto gh-aw já vem com padrões de design oficiais para ChatOps, DailyOps, IssueOps, orquestração, monitoramento e componentes compartilhados reutilizáveis, cada um com seu próprio modelo de trigger e configuração de safe-output. Cubro cada um desses com trechos de código na seção [Design Patterns](#design-patterns-from-the-official-documentation) abaixo.

Estamos observando automação evoluir de "faça exatamente o que eu digo" para "aqui está o que precisamos realizar, descubra como". Esse shift é massivo, e abre um conjunto rico de padrões e ideias práticas que valem a pena explorar.

## Dicas para Escrever Agentic Workflows Efetivos

Depois de construir esse workflow e estudar o ecossistema, aqui estão algumas lições práticas que peguei que devem economizar seu tempo e frustração.

### Seja Específico Sobre Limites

Os agentic workflows mais confiáveis são aqueles que claramente dizem ao agente o que ele *não deve* fazer. Meu workflow de docs-sync explicitamente afirma que `registry.json` e `skills.json` são intocáveis. Sem essa restrição, um agente ambicioso poderia decidir "corrigir" seus dados de origem. Trate suas instruções Markdown como uma descrição de cargo: defina o escopo, liste as responsabilidades e estabeleça limites claros sobre autoridade.

### Estruture Suas Instruções Como um Runbook

Agentes performam melhor quando seu corpo Markdown segue uma estrutura previsível: **contexto** (o que é este repo, com o que parecem os dados), **tarefas** (passos numerados que o agente deve seguir), **diretrizes** (regras de formatação, tom, o que evitar) e **instruções de output** (qual safe output usar e quando). Pense nisso como escrever para um teammate capaz mas literal que nunca viu seu projeto antes.

### Comece com `draft: true` e `expires:`

Até você ter alta confiança no comportamento de um agentic workflow, sempre use como padrão PRs de rascunho e defina uma janela de expiração. Isso te dá uma rede de segurança para revisar o que o agente produz sem poluir seu repositório com branches obsoletas. Uma vez que você confia no output após alguns ciclos, você pode remover a flag de rascunho e deixar PRs chegarem para revisão diretamente.

### Use `workflow_dispatch` Para Iteração

Sempre inclua `workflow_dispatch` como um trigger durante desenvolvimento. Permite que você re-execute o workflow sob demanda sem fazer push de commits dummy. Combine com o comando CLI `gh workflow run` para iterar rapidamente. Uma vez que seu workflow é estável em produção, mantenha-o como um override manual para execuções sob demanda.

### Aproveite Grupos de Concorrência Desde o Início

Se seu trigger dispara em pushes para caminhos frequentemente atualizados, adicione um bloco `concurrency` desde o início. Execuções agentic sobrepostas podem produzir PRs conflitantes ou trabalho duplicado. Um simples `cancel-in-progress: true` economiza compute e mantém sua lista de PR limpa.

### Mantenha o Markdown Focado em Um Job

Resista à tentação de construir um mega-workflow que lida com documentação, linting, testes e issue triage tudo de uma vez. Agentes raciocinam melhor dentro de um escopo estreito. Se você precisa de múltiplas tarefas automatizadas, crie arquivos de workflow separados e deixe cada um possuir uma responsabilidade única. Você sempre pode orquestrá-los com dispatch triggers se eles precisarem coordenar.

## Ideias para Agentic Workflows Que Você Pode Construir Hoje

O padrão de docs-sync é apenas o começo. Construindo sobre os [design patterns](#design-patterns-from-the-official-documentation) cobertos anteriormente, aqui estão use cases que estou ativamente explorando ou planejando construir a seguir.

### Agente de Triagem de Issues Obsoletas

Dispare em um schedule cron (padrão DailyOps). O agente escaneia issues abertas com mais de 30 dias, verifica se elas fazem referência a arquivos ou features que desde então foram feitos merge ou removidos, e posta um comentário de resumo pedindo ao autor se a issue ainda é relevante. Se não houver resposta após uma semana, ele rotula a issue como `stale`. Isso substitui a abordagem stale-bot antiga com algo que realmente entende o contexto de seu codebase.

### Release Notes Generator

Dispare em um novo push de tag. O agente lê todos os PRs merged desde a última tag de release, os agrupa por label (feature, bugfix, breaking change, dependency), e rascunha uma GitHub Release com notas categorizadas. Em vez de análise rígida de commit-message, o agente lê descrições de PR e resume a intenção real por trás de cada mudança. Wire isso com o safe output `create-release` e você tem release notes automáticas.

### Respondedor de Aviso de Segurança

Dispare em eventos de alerta `dependabot` ou quando um label `security` é adicionado a uma issue. O agente lê os detalhes do aviso, identifica arquivos afetados em seu codebase, verifica se a dependência vulnerável realmente é importada e usada (não apenas listada em um lockfile), e abre uma PR com o bump de versão mais um resumo do que mudou e por quê. Isso transforma um alerta de Dependabot de uma notificação em uma correção acionável.

### Gerador de Checklist de Onboarding

Dispare via IssueOps quando alguém abre uma issue com um label `new-contributor`. O agente lê seu guia de CONTRIBUTING, escaneia PRs recentes merged para padrões, e posta um comentário personalizado com instruções de setup, sugestões de good-first-issue e links para documentação relevante. Ele adapta o checklist com base em que linguagens e frameworks o repositório realmente usa, não um template genérico.

### Revisor de Qualidade de PR

Dispare em eventos `pull_request` opened ou updated. O agente lê o diff, verifica se testes foram adicionados para novas funções, verifica que a documentação foi atualizada se APIs públicas mudaram, e marca quaisquer arquivos que foram modificados mas não cobertos pela descrição de PR. Ele posta um comentário de revisão resumindo seus achados. Isso não é um linter. É um revisor ciente de contexto que entende a relação entre mudanças de código e convenções de projeto.

### Mantenedor de Changelog e Guia de Migração

Dispare quando PRs com um label `breaking-change` são feitos merge. O agente lê o diff, identifica o que mudou na superfície de API pública, atualiza o arquivo CHANGELOG com uma entrada estruturada, e se necessário, adiciona instruções de migração a um guia `MIGRATION.md`. Ao longo do tempo, sua documentação de migração se acumula automaticamente e fica precisa porque é gerada a partir das mudanças reais de código.

### Auditor de Grafo de Dependência de Monorepo

Dispare em pushes que modificam `package.json`, `go.mod`, `Cargo.toml`, ou arquivos de dependência equivalentes em qualquer workspace package. O agente mapeia dependências internas cross-package, detecta incompatibilidades de versão, identifica dependências circulares, e abre uma PR que fixa alinhamento de versão ou posta uma issue resumindo os conflitos. Em um monorepo com dezenas de packages, este tipo de consciência estrutural é extremamente valioso.

Cada um desses segue o mesmo padrão central: agente read-only, safe outputs estruturados, revisão humana antes de qualquer coisa chegar. A diferença entre estes e automação tradicional é que o agente se adapta ao que encontra em vez de falhar no primeiro caso edge inesperado.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } Design Patterns da Documentação Oficial

O projeto gh-aw vem com uma biblioteca crescente de [design patterns](https://github.github.com/gh-aw/patterns/) que resolvem cenários comuns de automação. Aqui estão aqueles que acho mais úteis, com trechos que você pode adaptar para seus próprios repositórios.

### ChatOps: Slash Commands em Comentários de Issue

O [padrão ChatOps](https://github.github.com/gh-aw/patterns/chatops/) permite que você dispare agentic workflows de comentários em issues ou PRs usando slash commands. Isso é perfeito para tarefas under-demand como `/deploy staging`, `/summarize`, ou `/assign-reviewer`.

```yaml
---
description: Responds to slash commands in issue comments.
on:
  issue_comment:
    types: [created]
permissions:
  contents: read
  issues: read
  pull-requests: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  add-comment:
    issue-number: from-trigger
  add-labels:
    issue-number: from-trigger
---
```

O campo `issue-number: from-trigger` automaticamente amarra o safe output de volta à issue ou PR que disparou o workflow. No corpo Markdown, você descreve quais commands reconhecer e o que cada um deve fazer. O agente analisa o comentário, identifica o command, e age em conformidade. Nenhum servidor webhook, nenhum framework de bot, apenas Markdown.

### IssueOps: Automação Acionada por Issue

O [padrão IssueOps](https://github.github.com/gh-aw/patterns/issueops/) usa criação ou labeling de issue como o trigger. Isso é ideal para workflows onde alguém arquivo uma requisição (como "provisionar um novo ambiente" ou "gerar um relatório") e o agente a realiza.

```yaml
---
description: Processes structured requests submitted as GitHub issues.
on:
  issues:
    types: [opened, labeled]
permissions:
  contents: read
  issues: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  add-comment:
    issue-number: from-trigger
  add-labels:
    issue-number: from-trigger
  create-pull-request:
    title-prefix: "[issueops] "
    labels: [automated]
    draft: true
---
```

A chave aqui é que o corpo da issue atua como o formulário de entrada. Você instrui o agente a analisar campos estruturados do template de issue (como nome de ambiente, região, ou opções de configuração) e agir sobre eles. O agente posta atualizações de progresso como comentários e entrega o resultado como uma PR ou um comentário final com o output.

### DailyOps: Tarefas de Manutenção Agendadas

O [padrão DailyOps](https://github.github.com/gh-aw/patterns/dailyops/) executa em um schedule cron e é desenhado para housekeeping recorrente: limpeza de issues obsoletas, audits de dependência, relatórios de métricas, ou verificações de atualização de dados.

```yaml
---
description: Runs daily maintenance tasks on the repository.
on:
  schedule:
    - cron: "0 9 * * 1-5"
  workflow_dispatch:
permissions:
  contents: read
  issues: read
  pull-requests: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-issue:
    labels: [daily-report, automation]
  add-comment:
    issue-number: latest
  create-pull-request:
    title-prefix: "[dailyops] "
    draft: true
    expires: 7
---
```

Note o `issue-number: latest` no output `add-comment`. Isso diz ao handler safe-output para encontrar a issue aberta mais recente que corresponde a certos critérios e anexar o comentário lá, para que seus relatórios diários se acumulem em uma única issue de rastreamento em vez de criar uma nova cada dia. O `expires: 7` no output de PR mantém as coisas arrumadas para ciclos semanais.

### Orquestração: Coordenação de Multi-Workflow

O [padrão de orquestração](https://github.github.com/gh-aw/patterns/orchestration/) é para quando um agentic workflow precisa disparar outro. Pense nisso como um workflow pai que dispara workflows filhos e rastreia seus resultados.

```yaml
---
description: Coordinates multiple downstream workflows after a release.
on:
  release:
    types: [published]
permissions:
  contents: read
  actions: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  dispatch-workflow:
    workflows:
      - update-docs.md
      - notify-stakeholders.md
      - publish-packages.md
  add-comment:
    issue-number: from-trigger
---
```

O safe output `dispatch-workflow` é particularmente poderoso. Permite que o agente decida *quais* workflows downstream disparar com base no que observa. Por exemplo, se uma release toca apenas o package SDK, o agente poderia disparar `publish-packages.md` mas pular `update-docs.md` porque nenhuma superfície de API mudou. Essa é orquestração dinâmica acionada por compreensão, não sequenciamento de pipeline estático.

### Monitoramento: Detecção de Drift e Alertas

O [padrão de monitoramento](https://github.github.com/gh-aw/patterns/monitoring/) observa configuration drift, violações de conformidade, ou inconsistências de estado e levanta alertas quando algo está errado.

```yaml
---
description: Monitors infrastructure configuration for drift and compliance.
on:
  schedule:
    - cron: "0 */6 * * *"
  push:
    branches: [main]
    paths:
      - "infra/**"
      - "terraform/**"
permissions:
  contents: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-issue:
    labels: [drift-detected, infrastructure]
  add-labels:
    issue-number: from-trigger
  noop: {}
---
```

O dual trigger aqui é intencional: o schedule cron pega drift que se acumula silenciosamente, enquanto o trigger push pega misconfigurations no momento que chegam. O agente compara o estado atual de arquivos de config contra baselines esperados, e se encontra discrepâncias, abre uma issue com um relatório detalhado. Quando tudo está limpo, chama `noop` para confirmar que a verificação executou com sucesso.

### Componentes Compartilhados: Instruções de Agente Reutilizáveis

Um padrão que merece atenção especial é [componentes compartilhados](https://github.github.com/gh-aw/patterns/shared-components/). Você pode extrair instruções comuns em arquivos Markdown reutilizáveis e referenciá-los de múltiplos workflows.

```markdown
<!-- .github/agents/shared/pr-conventions.md -->

## Pull Request Conventions

When creating a pull request, follow these rules:

- Title must start with one of: feat:, fix:, docs:, chore:, refactor:
- Description must include a "## Changes" section summarizing what changed
- Description must include a "## Testing" section explaining how to verify
- If the PR touches public APIs, include a "## Migration" section
- Never force-push to the PR branch after review comments have been posted
```

Então em seu workflow Markdown body, você o referencia:

```markdown
Follow the shared PR conventions defined in `.github/agents/shared/pr-conventions.md`.
```

O agente lê esse arquivo em tempo de execução e incorpora as instruções. Isso significa que você pode padronizar comportamentos em todos seus agentic workflows sem duplicar instruções em cada arquivo. Atualize o componente compartilhado uma vez, e cada workflow que o referencia pega a mudança.

### Combinando Padrões

O poder real emerge quando você combina padrões. Um trigger ChatOps pode disparar um workflow de orquestração. Um schedule DailyOps pode alimentar em uma verificação de monitoramento que cria tickets IssueOps. Um componente compartilhado pode definir o formato de PR que cada workflow usa. Os padrões são blocos de construção compostos, e porque tudo é apenas Markdown e frontmatter YAML, a barreira para misturá-los é quase zero.

## ![gh-aw](/assets/images/gh-aw-logo.svg){: .inline-icon } Comece

Se você quer tentar isso você mesmo:

- **Official Documentation**: [github.github.com/gh-aw](https://github.github.com/gh-aw/introduction/overview/)
- **CLI Installation**: `gh extension install github/gh-aw`
- **Example Workflows**: [Agentics Collection](https://github.com/githubnext/agentics)
- **My Workflow**: [skills-hub/docs-sync.md](https://github.com/samueltauil/skills-hub/blob/main/.github/workflows/docs-sync.md)

Escreva um pouco de Markdown. Deixe um agente de IA lidar com o resto. O futuro da automação está aqui e lê como um README.
