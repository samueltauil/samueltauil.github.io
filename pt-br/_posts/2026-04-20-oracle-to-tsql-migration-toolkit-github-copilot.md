---
lang: pt-br
permalink: /github-copilot/open-source/ai/2026/04/20/oracle-to-tsql-migration-toolkit-github-copilot.html
layout: post
title: "Oracle to T-SQL Migration Toolkit: Agents Personalizados, Pipelines Paralelos e um Rubber Duck"
date: 2026-04-20
categories: [github-copilot, open-source, ai]
tags: [github-copilot, github-copilot-cli, developer-tools, automation, sql-server, oracle, migration, ai]
---

Na semana passada apresentei uma demo de um projeto em que vinha trabalhando, e a reação das pessoas na sala me fez pensar: talvez isso possa ser útil além do meu próprio caso de uso. Então decidi torná-lo open source.

O projeto é o [Oracle to T-SQL Migration Toolkit](https://github.com/samueltauil/oracle-to-tsql), um conjunto de agents personalizados com GitHub Copilot que ajudam a migrar código Oracle SQL e PL/SQL para o Microsoft SQL Server T-SQL. Ele funciona tanto no VS Code quanto no GitHub Copilot CLI, e a experiência no CLI tem um truque bastante interessante que vou explicar em um momento.

![Oracle to T-SQL Migration Toolkit demo](https://raw.githubusercontent.com/samueltauil/oracle-to-tsql/main/docs/demo-preview.gif)

## Como surgiu

Se você já esteve envolvido em uma migração de banco de dados do Oracle para o SQL Server, sabe a dor. Não se trata apenas de trocar sintaxe. Oracle e SQL Server têm abordagens fundamentalmente diferentes para coisas como packages, sequences, estado de sessão, semântica de strings vazias, tratamento de cursores, tipos de data, e muito mais. Toda migração que já vi envolve muito trabalho manual, muitas planilhas e muitos momentos de "vamos lidar com esse edge case depois" que voltam para te assombrar.

Eu queria ver até onde conseguia levar o sistema de agents e instruções do GitHub Copilot para realmente automatizar esse processo de forma estruturada e repetível. Não apenas "cole este PL/SQL e peça ao Copilot para converter", mas um pipeline de verdade com avaliação, conversão, validação, análise de performance e até geração de M-language para Power BI, tudo coordenado por agents que sabem o que estão fazendo.

## Como funciona

O toolkit define seis agents personalizados, cada um responsável por uma fase específica da migração:

| Agent | O que faz |
|-------|------------|
| `@oracle-evaluator` | Lê seu Oracle SQL, identifica complexidade, features específicas do Oracle, armadilhas semânticas e fornece uma avaliação de prontidão para migração |
| `@oracle-to-tsql` | Faz a conversão em si, seguindo todas as regras de uma referência compartilhada (copilot-instructions.md) |
| `@tsql-validator` | Valida o T-SQL convertido contra o original, verificando correção e completude |
| `@performance-analyzer` | Analisa o output do T-SQL e sugere estratégias de indexação, opções SET e reescritas de query |
| `@m-language-converter` | Gera arquivos Power BI M-language (.pq) a partir do output T-SQL |
| `@migration-orchestrator` | O coordenador de batch que executa tudo em paralelo usando sub-agents |

O pipeline é simples: você coloca os arquivos Oracle SQL em `oracle-sql/` e o orchestrator assume a partir daí. Ele escaneia os arquivos, cria um plano, despacha sub-agents (um por arquivo) e acompanha o progresso por meio de uma máquina de estados. Cada arquivo passa por avaliação, conversão, validação, análise e, opcionalmente, geração de M-language.

O processo produz relatórios estruturados em `migration-reports/`, SQL convertido em `tsql-output/` e queries do Power BI em `pbi-output/`.

## Os relatórios são realmente úteis

Esta é a parte que mais me surpreendeu. Os relatórios de migração não são apenas "aqui está o seu código convertido". Cada relatório tem várias seções: resultados da avaliação com níveis de severidade, tabelas detalhadas de mapeamento de tipos, análise de diferenças semânticas, resultados de validação e recomendações de performance.

Por exemplo, o evaluator detecta coisas como o tipo `DATE` do Oracle que inclui componente de tempo (mapeá-lo para o `DATE` do T-SQL truncaria silenciosamente o horário, quebrando processos downstream), ou o fato de que o Oracle trata strings vazias como `NULL` enquanto o SQL Server não. São exatamente esses os tipos de problemas que causam erros de integridade de dados em produção se você os deixar passar, e os agents são especificamente instruídos a sinalizá-los.

As classificações de complexidade vão de traduções simples de DDL até casos críticos como conversões completas de packages PL/SQL com estado de sessão, REF CURSORs e blocos de inicialização. Os arquivos de amostra no repositório cobrem esse espectro deliberadamente, de uma definição de tabela simples até um package spec e body completos com cinco rotinas públicas, helpers privados e variáveis de nível de package.

## VS Code vs Copilot CLI

Ambos funcionam, mas têm pontos fortes diferentes. No VS Code, você acessa os agents pelo Copilot Chat e pode trabalhar arquivo por arquivo, arrastar itens para o chat como contexto, usar o inline chat para conversões rápidas e comparar o Oracle original e o output T-SQL lado a lado.

No Copilot CLI, você tem todo o poder das extension tools. A custom extension (`extension.mjs`) fornece ferramentas como `scan_oracle_files`, `migration_status`, `generate_batch_plan`, `claim_work_item` e `complete_work_item`. Isso permite que o orchestrator gerencie uma fila de trabalho com rastreamento de estado e despache sub-agents em paralelo — até cinco arquivos por vez, cada um passando pelo pipeline completo de forma independente.

Mas o verdadeiro diferencial da experiência no CLI é o Rubber Duck.

## Rubber Duck melhora os relatórios

O [Rubber Duck](https://github.blog/ai-and-ml/github-copilot/github-copilot-cli-combines-model-families-for-a-second-opinion/) é um feature do GitHub Copilot CLI onde um segundo modelo de uma família de IA diferente revisa o trabalho do agent principal. Quando você usa um modelo Claude como orchestrator, o Rubber Duck traz o GPT-5.4 para revisar o output em checkpoints importantes: após o planejamento, após implementações complexas e após a escrita de testes.

Para um toolkit de migração, isso é ouro. O agent principal faz a conversão e, em seguida, o Rubber Duck a revisa de uma perspectiva completamente diferente. Dados de treinamento diferentes, vieses diferentes, pontos cegos diferentes. Ele detecta coisas como problemas arquiteturais, bugs sutis e edge cases que o modelo principal pode ter ignorado com excesso de confiança.

Na prática, isso significa que os relatórios de migração gerados pelo Copilot CLI tendem a ser mais completos e detalhados do que os gerados no VS Code. A crítica do Rubber Duck adiciona uma camada de validação especialmente valiosa para os arquivos de complexidade crítica — aqueles com queries hierárquicas `CONNECT BY`, operações `BULK COLLECT` ou conversões completas de packages com gerenciamento de estado de sessão.

Você pode experimentar: execute `/experimental` no Copilot CLI para habilitar o Rubber Duck, escolha um modelo Claude e deixe o orchestrator processar seus arquivos Oracle. A diferença na qualidade dos relatórios é perceptível.

## Como executar

Começar é simples:

```bash
git clone https://github.com/samueltauil/oracle-to-tsql.git
cd oracle-to-tsql
```

Coloque seus arquivos Oracle SQL em `oracle-sql/` (ou copie os exemplos incluídos):

```bash
cp samples/*.sql oracle-sql/
```

Em seguida, selecione o agent **migration-orchestrator** (no VS Code, escolha-o na lista de agents do Copilot Chat; no Copilot CLI, selecione-o entre os agents disponíveis) e peça que ele execute o pipeline completo:

```
migrate all
```

Acompanhe o progresso com:

```
status
```

Os resultados aparecem em `tsql-output/`, `pbi-output/` e `migration-reports/`. O repositório inclui cinco arquivos de amostra que vão de complexidade simples a crítica, para que você veja o espectro completo do que o toolkit suporta antes de apontar para o seu próprio código.

## O que está no repositório

Não há código de aplicação no sentido tradicional. O toolkit é construído inteiramente sobre os recursos de personalização do GitHub Copilot:

- **copilot-instructions.md**: Uma referência abrangente de conversão Oracle-to-T-SQL compartilhada por todos os agents
- **Instruções específicas por path**: Arquivos de contexto que informam ao Copilot o que cada diretório contém e quais padrões seguir
- **Definições de agents**: Seis arquivos `.md` que definem o papel, as ferramentas e o comportamento de cada agent
- **Custom extension**: Um arquivo `.mjs` que fornece ferramentas de descoberta, rastreamento de status, planejamento de batch e gerenciamento de estado

A ideia é que você clone o repositório, abra no VS Code ou Copilot CLI, e os agents simplesmente funcionem. Nenhuma dependência para instalar, nenhum passo de build, nenhum arquivo de configuração para ajustar. São apenas arquivos de personalização do Copilot e o seu Oracle SQL.

## Por que decidi torná-lo open source

Depois da demo na semana passada, algumas pessoas me perguntaram sobre usar os agents para suas próprias migrações. Esse foi o sinal. Migrações de banco de dados do Oracle para o SQL Server acontecem o tempo todo, e o volume de trabalho manual envolvido é enorme. Se um conjunto de agents Copilot bem projetados consegue tirar parte desse trabalho do seu prato — e produzir relatórios estruturados e revisáveis no processo — isso parece algo que vale a pena compartilhar.

O repositório é público: [github.com/samueltauil/oracle-to-tsql](https://github.com/samueltauil/oracle-to-tsql)

Se você tem Oracle SQL que precisa ser migrado para o SQL Server, experimente. E se encontrar padrões que os agents não tratam bem, abra uma issue ou contribua. A referência de conversão e as definições de agents são todas apenas arquivos Markdown, então estendê-los é tão simples quanto editar texto.
