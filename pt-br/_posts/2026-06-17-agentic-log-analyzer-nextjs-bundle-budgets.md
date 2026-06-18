---
layout: post
lang: pt-br
permalink: /github-copilot/devops/2026/06/17/agentic-log-analyzer-nextjs-bundle-budgets.html
title: "Demo para Cliente: Agentic Workflow Revisando Orçamentos de Bundle do Next.js e Atualizando PRs"
date: 2026-06-17
categories: [github-copilot, devops]
tags: [github, github-actions, agentic-workflows, nextjs, bundle-analyzer, ci-cd, performance]
---

Recentemente eu sentei com um cliente que tinha um problema que eu ouço o tempo todo. O app Next.js deles estava crescendo há cerca de um ano, e ninguém estava realmente monitorando o tamanho do bundle. A cada poucos sprints, alguém notava que a página estava lenta no celular, rodava um profile, encontrava uma dependência de 200 kB que havia entrado por um import transitivo, e o time passava uma sexta-feira inteira removendo isso. A correção era fácil. A detecção era a parte que estava quebrada.

Então eu fiz a pergunta com que sempre começo para esse tipo de coisa: dá pra colocar um agent no CI sem transformar o pipeline numa caixa preta? Eles eram céticos, o que é justo. A maioria dos demos de agent circulando agora quer assumir o controle do seu pipeline, rodar com quaisquer permissões que conseguir, e escrever commits que você precisa revisar depois. Isso não era o que eu queria mostrar.

Minha resposta é sim, desde que o CI determinístico permaneça como fonte da verdade e o agent adicione apenas uma camada de julgamento por cima. O build ainda tem que buildar. Os testes ainda têm que passar. O agent não pode mentir sobre nada disso. O que ele pode fazer é ler os artefatos que o build produz e te contar algo útil em linguagem clara, no lugar onde o time já está olhando.

Eu construí um pequeno demo para isso: [samueltauil/agentic-log-analyzer](https://github.com/samueltauil/agentic-log-analyzer). Ele roda um build normal do Next.js, gera um relatório do bundle analyzer, verifica os números contra orçamentos e thresholds que defini com antecedência, e posta o que encontrou de volta no GitHub como um comentário de PR e um check run. Nada sofisticado. O objetivo é que as partes móveis sejam chatas e visíveis.

A parte de agent é construída em cima do [GitHub Agentic Workflows (gh-aw)](https://github.github.com/gh-aw/), um projeto do GitHub Next e Microsoft Research que permite escrever o workflow em markdown simples e compilá-lo em um arquivo `.lock.yml` normal do GitHub Actions. Essa escolha foi importante para o demo. Significou que eu poderia entregar ao cliente um arquivo markdown e um arquivo JSON de orçamento e dizer "isso é tudo", sem apontar para um serviço hospedado ou um dashboard SaaS que eles teriam que procurar depois.

## O Que Eu Mostrei no Demo

O loop é curto, o que é metade do motivo pelo qual funciona:

1. O CI faz o build do app Next.js e produz os artefatos do bundle analyzer.
2. O agentic workflow lê esses artefatos e o `bundle-budget.json`.
3. Ele compara os tamanhos de rotas e bundles contra os thresholds de warn e fail.
4. Ele verifica a lista de dependências em busca de ofensores conhecidos de tamanho.
5. Ele posta os resultados no PR e atualiza o status do check.
6. Para pushes na `main`, ele abre ou atualiza uma issue de acompanhamento em vez de comentar.

Essa divisão de trabalho foi o que fez o cliente acenar com a cabeça. O build ainda passa ou falha por conta própria, e o agent lê o resultado e o explica. Se o agent travar amanhã, o CI continua entregando. O raio de impacto é intencionalmente pequeno.

Eu também mostrei o prompt. As pessoas sempre querem ver o prompt. Ele é curto, diz ao modelo quais formatos de arquivo esperar, e diz o que ele tem permissão de escrever de volta. Essa última parte importa mais do que a escolha do modelo. Se o agent só tem permissão de deixar um comentário, atualizar um check, e abrir uma issue com label, você consegue raciocinar sobre o pior caso em uns trinta segundos.

## O Workflow Também É Só um Arquivo Markdown

O agent em si vive em [`.github/workflows/bundle-analyzer-agent.md`](https://github.com/samueltauil/agentic-log-analyzer/blob/main/.github/workflows/bundle-analyzer-agent.md). É isso. O frontmatter YAML no topo diz ao gh-aw qual trigger configurar, quais permissões o run recebe, quais tools o agent pode chamar, e quais `safe-outputs` ele pode emitir. Tudo abaixo do frontmatter é uma lista numerada de passos em inglês simples, as mesmas instruções que eu daria a um engenheiro júnior fazendo essa revisão manualmente.

As partes relevantes do frontmatter são assim:

```yaml
on:
  workflow_run:
    workflows: ["Build and Analyze"]
    types: [completed]

permissions:
  contents: read
  actions: read
  pull-requests: read
  issues: read

tools:
  bash: [":*"]
  github:
    toolsets: [default, actions]
  agentic-workflows:
    web-fetch:

safe-outputs:
  add-comment:
    target: "*"
    max: 1
  create-issue:
    title-prefix: "[bundle-analyzer] "
    labels: [performance, bundle-size, automated]
    max: 1
    deduplicate-by-title: 1
    close-older-issues: true
  create-check-run:
    name: "Bundle Analyzer"
    max: 1
```

Algumas coisas a destacar, porque elas são a resposta para a maioria das perguntas de segurança que recebo:

- O bloco `permissions` é somente leitura. O `GITHUB_TOKEN` do agent literalmente não consegue escrever no repositório. A única forma de algo ser postado de volta é através do gate de `safe-outputs`, e esse gate tem um formato fixo: um comentário, uma issue (com prefixo de título e labels), um check run. Nada mais.
- O Bash está totalmente aberto dentro do sandbox (`bash: [":*"]`), e isso é intencional. O limite de segurança não é "eu coloquei `mkdir` na allowlist". É o modelo em camadas que o gh-aw impõe em torno do run: um token somente leitura, sem segredos do repositório no processo do agent, um container efêmero, e um firewall de rede de saída (o Agent Workflow Firewall) que só permite tráfego para um pequeno conjunto de domínios pré-aprovados. Se o modelo decidir ser criativo e fazer `curl` de algo estranho, o firewall derruba.
- O run real é gerado pelo `gh aw` em tempo de compilação. Ele pega o markdown, valida o schema, fixa as actions em SHAs, e emite um workflow `.lock.yml` normal do Actions. Esse arquivo também é commitado no repositório, então o diff é revisável como qualquer outra mudança no Actions. Não há etapa de "confie em mim".

O corpo do arquivo markdown é o prompt. Ele diz ao agent quais arquivos ler do artefato (`context.json`, `bundle-budget.json`, `build.log`, o `client-stats.json` e `client-modules.json` do `@next/bundle-analyzer`), quais queries de `jq` rodar para os módulos principais, como decidir entre `success` / `neutral` / `failure`, e exatamente qual `safe-output` chamar em cada caso. A tabela de decisão está no prompt, não na cabeça do modelo. O modelo é principalmente solicitado a ler JSON e preencher um template markdown.

Esta é a parte do gh-aw a que eu continuo voltando nas conversas com clientes: o workflow é algo que você pode fazer `cat` e um revisor de segurança pode aprovar em uma única sessão. Não é uma caixa preta com a qual você conversa através de uma API.

## O Gate de Orçamento É Só um Arquivo

Os thresholds não estão enterrados em um prompt. Eles ficam no `bundle-budget.json`, versionado ao lado do código, o que facilitou responder a pergunta de governança. O time de plataforma do cliente havia se queimado antes com ferramentas que escondiam políticas dentro de dashboards SaaS, e eles queriam saber quem poderia mudar um limite e como essa mudança apareceria em revisão. A resposta aqui é simples. Você muda o arquivo, abre um PR, o diff está ali.

Quando alguém mais tarde pergunta por que um PR foi sinalizado, eu posso apontar para duas coisas: o arquivo de orçamento no repositório, e o comentário mais o check que o agent deixou no PR. Não há estado oculto para fazer engenharia reversa, nenhuma etapa de "pergunte ao bot por quê". Os números vieram do artefato, as regras vieram de um arquivo JSON, e ambos estão no git.

## Resultado 1: Issue Criada pelo Workflow

Quando um run na `main` encontra algo que vale a pena rastrear, o workflow abre uma issue para isso em vez de apenas despejar um comentário num PR que ninguém vai revisitar. Aqui está a do demo, com label `bundle-size`, sinalizando o `lodash` completo (67,9 kB) e `moment` (57,8 kB) no bundle do servidor. Ambos são ofensores clássicos, ambos aparecem como imports completos muito mais frequentemente do que as pessoas percebem, e ambos têm substitutos mais leves que a seção de recomendações aponta diretamente.

![Issue criada pelo agentic workflow do bundle analyzer](/assets/images/2026-06-17-agentic-log-analyzer/issue-2-bundle-analysis.png)

O que eu gosto nessa visualização é que ela está fazendo o trabalho chato que um engenheiro sênior faria durante o code review, antes de chegar à revisão propriamente dita. Ela puxou os tamanhos das rotas, separou cliente de servidor, e nomeou os módulos suspeitos antes de um humano ter aberto a issue. No momento em que você olha para ela, a pergunta passou de "tem um problema" para "queremos resolver isso agora ou depois", que é uma conversa muito mais curta.

Referência da issue: [#2](https://github.com/samueltauil/agentic-log-analyzer/issues/2)

## Resultado 2: PR Atualizado com os Resultados

Em um pull request, o mesmo workflow comenta com o relatório e adiciona um check de `Bundle Analyzer`, então o veredicto de tamanho aparece logo ao lado dos outros checks do PR. Este é o demo com que eu geralmente começo, porque responde a pergunta que todo revisor tem ficado discretamente perguntando por anos: esse PR tornou o bundle maior, e em quanto?

![Pull request atualizado com os resultados do bundle analyzer](/assets/images/2026-06-17-agentic-log-analyzer/pr-3-bundle-analyzer-comment.png)

Nesse run tudo está saudável: rotas dentro do orçamento, bundle total do cliente parseado em 634 kB contra um threshold de warn de 800 kB, nenhuma dependência suspeita encontrada. Esse é o caso chato, e o caso chato é o ponto. Quando o bundle está bem, o comentário diz isso rapidamente e sai do caminho. Quando não está bem, o mesmo template fica vermelho na linha de veredicto e a seção de recomendações se preenche. Mesmo formato, estado diferente.

Referência do PR: [#3](https://github.com/samueltauil/agentic-log-analyzer/pull/3)

## Como o Cliente Reagiu

Alguns pontos ficaram com eles, e não foram os que eu esperava ao entrar:

- Ele lê o output compilado real, não um chute a partir dos arquivos fonte. Eles haviam se queimado com ferramentas de análise estática que mentiam sobre tree-shaking.
- A política de orçamento é explícita e vive no controle de versão. Nenhum dashboard, nenhum console de administração, nenhuma surpresa.
- O feedback aparece onde o time já trabalha. Ninguém precisa aprender uma nova aba.
- O agent só pode realizar um punhado de ações declaradas, o que facilita confiar nele num pipeline real. A revisão de segurança deles foi uma conversa de cinco minutos em vez de um projeto de duas semanas.

A reação mais interessante veio do tech lead do time, que disse algo como "esse é o primeiro demo de agent que eu vi que não parece estar tentando me substituir." Esse era o objetivo. O agent não é o engenheiro. É a planilha que o engenheiro ia construir manualmente se ninguém mais a tivesse construído primeiro.

## Por Que Eu Gosto do Padrão

O agent não está tentando assumir o CI. Ele faz o CI que você já tem dizer algo mais útil.

O pipeline responde as perguntas de sim ou não: ele buildou, os testes passaram. O agent responde a que está embaixo: dado o orçamento que defini, essa mudança ainda está saudável o suficiente para fazer merge? Essa é uma coisa mais interessante de discutir em revisão, e é uma pergunta que quase sempre é pulada porque ninguém quer ser a pessoa que bloqueia um PR por causa de 30 kB.

Se você quiser experimentar, clone o repositório do demo e edite o `bundle-budget.json` até que os thresholds correspondam ao quanto de crescimento de bundle você está disposto a tolerar. Comece solto, observe onde os avisos aparecem, aperte dali em diante. A parte divertida é que, uma vez que o arquivo de orçamento está no repositório, a conversa sobre performance para de ser abstrata. Ela se torna um diff.
