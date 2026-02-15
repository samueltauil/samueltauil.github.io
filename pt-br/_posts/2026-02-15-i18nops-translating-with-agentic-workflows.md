---
lang: pt-br
permalink: /github/ai/devops/2026/02/15/i18nops-translating-with-agentic-workflows.html
layout: post
title: "i18nOps: Traduzindo Meu Site com GitHub Agentic Workflows"
date: 2026-02-15
categories: [github, ai, devops]
tags: [github-actions, ai, automation, agentic-workflows, translation, github-copilot, i18n]
---

É um sábado frio em Boston. O tipo de clima de fevereiro onde sair de casa parece opcional e o melhor plano é café, uma tela quentinha e construir algo divertido com Copilot. Acabei de voltar de Seattle na última sexta-feira para o Microsoft Tech Connect, onde passei um tempo conversando sobre produtividade de desenvolvedores e ferramentas de IA, e honestamente voltei inspirado. Então neste fim de semana sentei e me perguntei: e se eu pudesse tornar meu site inteiro bilíngue usando nada além de um agentic workflow?

Acontece que você pode. E a jornada foi cheia de surpresas.

## A Ideia: Tradução Automatizada como um Workflow

Tenho gostado muito de aprender sobre [GitHub Agentic Workflows](https://github.github.com/gh-aw/introduction/overview/) (gh-aw) ultimamente. Meu [post anterior]({% post_url 2026-02-13-building-my-first-agentic-workflow-docs-sync %}) cobriu a construção de um agent de sincronização de documentação para meu projeto Skills Hub. Desta vez eu queria tentar algo diferente: será que eu poderia usar um agentic workflow para manter uma tradução completa em português (pt-BR) deste site sincronizada, automaticamente?

A faísca inicial veio de [Peli de Halleux](https://github.com/pelikhan) e seu projeto [action-continuous-translation](https://github.com/pelikhan/action-continuous-translation). Peli construiu uma GitHub Action que usa IA para traduzir continuamente a documentação. Faça um push de uma mudança no seu conteúdo em inglês, e a action gera um pull request com as traduções atualizadas. É um ótimo conceito: tratar tradução como uma preocupação de CI/CD, não uma tarefa manual. Aquele projeto me fez pensar sobre como esse padrão poderia ser expresso como um agentic workflow, com toda a flexibilidade e raciocínio que vem com isso.

## Construindo o Workflow de Tradução

O workflow em si vive em um único arquivo Markdown: [translate-to-ptbr.md](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/workflows/translate-to-ptbr.md). O frontmatter configura triggers, permissões e safe outputs:

```yaml
---
description: Translates English content to Brazilian Portuguese,
  preserving technical terminology, code blocks, and Markdown structure.
on:
  push:
    branches: [main]
    paths:
      - "_posts/**"
      - "index.md"
      - "about.md"
      - "photography.md"
      - "posts.md"
  workflow_dispatch:
permissions:
  contents: read
  issues: read
  pull-requests: read
concurrency:
  group: translate-ptbr
  cancel-in-progress: true
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-pull-request:
    title-prefix: "[translate] "
    labels: [translation, pt-br, automation]
    draft: true
    expires: 14
---
```

Toda vez que faço um push de uma mudança em um post do blog ou página (incluindo este post), o workflow é acionado. O agent lê um [glossário de mais de 180 termos técnicos](https://github.com/samueltauil/samueltauil.github.io/blob/main/_data/translation_glossary.yml) que devem permanecer em inglês (palavras como *workflow*, *deploy*, *pull request*, *commit*), segue um [arquivo de convenções compartilhadas](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/agents/shared/translation-conventions.md) para regras de tom e formatação, e gera arquivos traduzidos em um diretório `pt-br/`. O resultado chega como um pull request em rascunho para eu revisar.

O que eu gosto nisso comparado a uma abordagem de script rígido é que o agent *entende* o conteúdo. Ele sabe não traduzir blocos de código, preserva tags de template Liquid, mantém URLs intactas e produz português brasileiro com som natural, não a saída engessada que você obtém de tradução automática pura. Lê como algo que uma pessoa escreveu, porque o agent está raciocinando sobre contexto, não fazendo buscar-e-substituir.

## A Parte Difícil: Polyglot e a Caçada ao Bug

Configurar o agent de tradução foi honestamente a parte fácil. A verdadeira aventura de fim de semana foi fazer o [jekyll-polyglot](https://github.com/untra/polyglot) se comportar corretamente. Aqui vai uma interessante: Jekyll automaticamente adiciona o nome do diretório pai como uma categoria oculta para posts em subdiretórios. Então posts em `pt-br/_posts/` silenciosamente ganham `pt-br` como uma categoria. Combine isso com o prefixo de URL `/pt-br/` do polyglot, e você acaba com URLs como `/pt-br/pt-br/github/ai/2026/02/13/my-post.html`. Prefixo duplo. 404 em todo lugar.

A correção foi adicionar frontmatter `permalink` explícito para cada post em PT-BR. Mas descobrir *por que* as coisas estavam quebradas exigiu algum trabalho de detetive: verificar URLs geradas, inspecionar a lógica de roteamento do polyglot e testar todas as 24 URLs (8 posts × 2 idiomas + 4 páginas × 2 idiomas) para garantir que tudo resolvesse corretamente.

Documentei todas as cinco armadilhas que encontramos nas [convenções de tradução](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/agents/shared/translation-conventions.md) para que o agent saiba como evitá-las em execuções futuras. Essa é uma das coisas bonitas sobre agentic workflows: você pode ensinar o agent com seus erros atualizando as instruções compartilhadas. Sem mudanças de código, apenas prosa mais clara.

## Tradução Incremental Baseada em Diff

Um problema que surgiu durante os testes foi o desvio de tradução. Imagine que você corrige um erro de digitação em um post de blog de 300 linhas. O workflow o marca como desatualizado, re-traduz a coisa toda, e agora todas as 300 linhas de português estão ligeiramente diferentes, com escolhas de sinônimos diferentes, estruturas de frases diferentes, frases de transição diferentes. O glossário previne desvio de *termos*, mas o tecido conectivo da escrita muda toda vez.

A solução foi adicionar patching baseado em diff ao workflow. Em vez de cegamente re-traduzir tudo, o agent agora:

1. Obtém o hash do commit quando o arquivo PT-BR foi modificado pela última vez
2. Executa `git diff` no source em inglês desde aquele commit
3. Lê a tradução PT-BR existente como o documento base
4. Aplica patch apenas nas porções alteradas, preservando todo o resto literalmente

Se o diff mostra mais de ~60% do arquivo alterado (uma reescrita maior), ele volta para uma re-tradução completa mas ainda lê o PT-BR existente primeiro para absorver a voz estabelecida. Isso mantém as traduções consistentes através das edições. Parágrafos inalterados mantêm sua frase exata, e apenas conteúdo genuinamente novo é traduzido.

## Propondo i18nOps como um Padrão de Design

Depois de fazer tudo funcionar, percebi que isso não é apenas uma solução pontual. É um padrão repetível. O projeto gh-aw já tem padrões de design bem definidos como ChatOps, IssueOps e DailyOps. Tradução se encaixa naturalmente no mesmo molde: um workflow orientado a trigger onde um agent de IA lê conteúdo source, aplica regras específicas de domínio e gera resultados estruturados através de safe outputs.

Então escrevi uma proposta e postei como uma [discussão no repositório gh-aw](https://github.com/github/gh-aw/discussions/15847): **i18nOps**, internacionalização como um padrão de workflow operacional. A ideia central:

- **Trigger**: push para arquivos de conteúdo, ou verificações agendadas de desatualização
- **Comportamento do agent**: tradução com consciência de glossário com patching baseado em diff
- **Safe outputs**: pull request em rascunho com conteúdo traduzido
- **Convenções compartilhadas**: regras de tradução reutilizáveis entre idiomas

Se você tem um site de documentação, um blog ou qualquer repositório com conteúdo que precisa alcançar uma audiência multilíngue, esse padrão te dá um ponto de partida. Faça um fork do workflow, troque seu idioma alvo e glossário, e você tem tradução contínua com revisão humana.

## Um Bug Pelo Caminho

Durante a implementação, também encontrei um bug no comando `gh aw compile`: quando o nome do repositório termina em `.github.io` (como repos GitHub Pages fazem), o compilador gera um caminho `runtime-import` incorreto. Em vez de `.github/workflows/translate-to-ptbr.md`, ele gera `.github.io/.github/workflows/translate-to-ptbr.md`. Reportei como [gh-aw#15824](https://github.com/github/gh-aw/issues/15824). Por enquanto, corrijo manualmente o caminho no arquivo lock após cada compilação. Não é ideal, mas funciona. Espero que seja corrigido em breve.

## Finalizando

O que começou como um experimento de fim de semana se transformou em um site bilíngue funcionando, um padrão de tradução documentado, uma discussão na comunidade e um relatório de bug. Nada mal para um sábado frio em Boston com Copilot me fazendo companhia.

A coisa que eu continuo voltando com agentic workflows é como eles parecem naturais. Você não está escrevendo condicionais YAML ou shell scripts. Você está descrevendo o que você quer em linguagem simples, e o agent descobre os detalhes. Ensinar o agent sobre armadilhas do polyglot foi tão simples quanto atualizar um arquivo Markdown. Adicionar tradução incremental foi alguns parágrafos de instruções, não uma biblioteca de parsing de diff.

Se você quiser tentar você mesmo, aqui estão as peças-chave:

- **Workflow de tradução**: [translate-to-ptbr.md](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/workflows/translate-to-ptbr.md)
- **Convenções de tradução**: [translation-conventions.md](https://github.com/samueltauil/samueltauil.github.io/blob/main/.github/agents/shared/translation-conventions.md)
- **Projeto original do Peli**: [action-continuous-translation](https://github.com/pelikhan/action-continuous-translation)
- **Discussão i18nOps**: [gh-aw#15847](https://github.com/github/gh-aw/discussions/15847)
- **Documentação gh-aw**: [github.github.com/gh-aw](https://github.github.com/gh-aw/introduction/overview/)

Escreva algum Markdown, ensine um agent suas convenções e deixe-o lidar com as traduções. Seu eu de fim de semana agradecerá.
