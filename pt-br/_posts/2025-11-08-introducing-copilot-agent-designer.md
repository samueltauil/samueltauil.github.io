---
lang: pt-br
permalink: /github-copilot/vscode/extensions/2025/11/08/introducing-copilot-agent-designer.html
layout: post
title: "Apresentando o Copilot Agent Designer: Um Workflow Visual para Agents do GitHub Copilot"
seo_title: "Copilot Agent Designer: Construtor Visual de Agents"
description: "Um construtor visual de fluxos para agents do GitHub Copilot: desenhe definições e handoffs em um canvas em vez de editar arquivos de configuração."
date: 2025-11-08
categories: [github-copilot, vscode, extensions]
tags: [github-copilot, vscode, ai, developer-tools, open-source]
---

Às vezes as melhores ideias vêm de desafios do mundo real. Enquanto trabalhava em demos do GitHub Copilot, eu continuava enfrentando a mesma situação: definir agents e personalizar suas interfaces parecia uma tarefa árdua. Não era sobre capacidade, já que o Copilot é uma ferramenta realmente poderosa. O problema era que o processo de moldar definições de agents e workflows de handoff era um pouco manual. Eu pensei, e se isso pudesse parecer criativo ao invés de repetitivo?

Essa questão levou ao **Copilot Agent Designer**, uma extension do Visual Studio Code construída para tornar o design de agents visual, interativo e divertido.

## O Que é o Copilot Agent Designer?

Ao invés de editar arquivos Markdown crus ou ajustar linha por linha, você pode agora desenhar agents como você faria em um estúdio criativo. A extension te dá:

- **Previews instantâneos**: Veja seu agent ganhar vida enquanto você desenha
- **Theme playground**: Experimente com diferentes estilos visuais
- **Controle total**: Personalize fontes, cores, avatares e mais
- **Export com um clique**: Gere arquivos `agent.md` ou `chatmode.md` prontos para produção

Quando estiver pronto, exporte e integre perfeitamente com Copilot para começar a usar agents customizados na sua IDE.

## o que o canvas realmente faz

O canvas é construído com [React Flow](https://reactflow.dev/), que é a parte que faz os handoffs parecerem desenho em vez de escrita de YAML. Cada agent é um node que você pode arrastar, e cada conexão entre dois nodes é um handoff que você pode configurar.

Um node de agent guarda os campos que você de outra forma estaria digitando no frontmatter à mão:

- **Name**, até 100 caracteres
- **Description**, até 1000
- **Instructions**, até 8000, que é onde o comportamento de fato mora
- **Model**, escolhido em um dropdown que inclui GPT-4, GPT-5 e Claude Sonnet 4
- **Tools**, como uma lista separada por vírgulas tipo `fetch, search, files`
- **Entry point**, um toggle em forma de estrela que marca onde um workflow começa

Arraste de um node para outro e você tem um handoff. Clique na linha de conexão e você configura três coisas: o **label** que aparece como um botão na UI do chat, o **prompt** que é enviado quando alguém clica nele, e se esse prompt **envia automaticamente** ou espera o usuário apertar enter.

Essa última checkbox parece trivial e não é. Um handoff que envia automaticamente faz um workflow parecer contínuo. Um manual dá à pessoa um momento para redirecionar. Decidir qual é qual em cada transição é a maior parte do trabalho de design, e é muito mais fácil de raciocinar quando você pode ver o grafo inteiro de uma vez.

## a validação é o motivo pelo qual continuei usando

A parte visual é o que as pessoas notam em uma demo. A parte com a qual eu realmente conto é a validação que roda antes do export:

- **Detecção de dependência circular**, então um agent A que faz handoff para B que volta para A é pego no canvas em vez de em runtime
- **Verificação de campos obrigatórios**, então você não publica um agent com instructions vazias
- **Validação de entry point**, então um workflow que não consegue começar recusa o export

Eu construí a verificação de dependência circular depois de produzir exatamente esse bug à mão, duas vezes, na mesma semana. Dois agents educadamente passando uma tarefa de um lado para o outro não é um erro que nenhum linter ia pegar para mim.

## o que ele escreve em disco

O export produz arquivos `.agent.md` em `.github/agents/`, que é o formato que o Copilot já lê. Nada proprietário, nada que você não possa editar depois em um editor de texto normal:

```markdown
---
description: Generate an implementation plan
tools:
  - fetch
  - search
  - usages
model: Claude Sonnet 4
handoffs:
  - agent: Implement
    label: Start Implementation
    prompt: Now implement the plan outlined above.
    send: false
---

# Plan

## Instructions

Generate an implementation plan for new features or refactoring.
```

O frontmatter carrega os metadados e o grafo de handoffs. O corpo em Markdown carrega o nome do agent como um H1 e as instructions abaixo dele. Se você decidir que o canvas não é para você, os arquivos que você já exportou continuam funcionando, o que foi uma restrição deliberada. Eu não queria que a extension se tornasse algo do qual você não pode sair.

O estado do canvas em si persiste separadamente em `.agentdesign.md`, então layout e posições sobrevivem entre sessões sem poluir as definições dos agents.

## os comandos

| Comando | Descrição |
|---|---|
| `Agent Designer: Open Canvas` | Abre o designer visual |
| `Agent Designer: Open Design File` | Abre um `.agentdesign.md` existente |
| `Agent Designer: Export Agents` | Valida e exporta para `.agent.md` |
| `Agent Designer: Import Agents` | Importa arquivos de agent existentes |
| `Agent Designer: Open as Text` | Visualiza o arquivo de design como texto cru |

Você também pode arrastar arquivos `.agent.md` direto para o canvas, ou apontar para um diretório e deixar ele carregar tudo o que encontrar. Esse caminho de import importa mais do que o caminho de criação, honestamente. A maioria das pessoas que experimenta isso já tem agents escritos.

Ele precisa do VS Code 1.105.0 ou mais recente. Alguns comandos no manifesto (New From Template, Run Simulation, Customize Theme) estão registrados mas ainda não implementados, e prefiro dizer isso aqui do que deixar você procurando por eles.

## Por Que Eu Construí Isso

Isso não era sobre consertar uma lacuna. Era sobre **desbloquear criatividade e velocidade** para desenvolvedores que querem construir experiências polidas sem fricção. Desenhar agents deveria parecer criar, não configurar.

A coisa que eu não esperava: ver um workflow multi-agent como um grafo mudou os workflows que eu desenhava. Quando handoffs são linhas que você desenha, você percebe que construiu um hub and spoke onde queria construir um pipeline. Isso é difícil de ver em seis arquivos Markdown separados sentados em uma pasta.

## Comece

Se você está trabalhando com agents do GitHub Copilot, experimente:

- **VS Code Marketplace**: [Copilot Agent Designer](https://marketplace.visualstudio.com/items?itemName=samueltauil.copilot-agentdesigner)
- **Código Fonte**: [samueltauil/copilot-agentdesigner](https://github.com/samueltauil/copilot-agentdesigner)

Eu adoraria ouvir como você usa isso para criar workflows mais inteligentes!

---

*Postado originalmente no [LinkedIn](https://www.linkedin.com/pulse/introducing-copilot-agent-designer-visual-workflow-github-tauil-vnz7e/)*
