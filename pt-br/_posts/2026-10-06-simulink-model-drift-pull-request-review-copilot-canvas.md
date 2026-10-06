---
lang: pt-br
permalink: /github-copilot/devops/2026/10/06/simulink-model-drift-pull-request-review-copilot-canvas.html
layout: post
title: "O que você aprova quando o diff diz binary file not shown?"
seo_title: "Revisão de Model Drift do Simulink em Pull Requests com GitHub Copilot"
description: "O GitHub mostra um .slx do Simulink alterado como arquivo binário. Criei uma Action e um canvas do Copilot que dizem o que mudou e quando falta evidência."
image: https://raw.githubusercontent.com/samueltauil/simulink-model-diff/main/docs/assets/copilot-canvas-review.png
date: 2026-10-06
categories: [github-copilot, devops]
tags: [github-copilot, github-actions, copilot-app, copilot-canvas, simulink, matlab, model-based-design, code-review, sarif, ci-cd]
---

Depois que escrevi sobre o [cardiac digital twin]({% post_url 2026-07-07-cardiac-digital-twin-copilot-simulink-mcp %}) em julho, uma das perguntas que recebi não tinha nada a ver com farmacologia ou MCP. Era sobre Git. A demo aumenta uma dose de metoprolol de 50 mg para 60 mg, e alguém perguntou como essa mudança seria revisada se estivesse num repositório de time, e não no meu laptop. Quem olha para ela, e o que está olhando?

Comecei a digitar uma resposta e percebi que o meu próprio repo foge da pergunta. O `CardiacDigitalTwin.slx` é gerado pelo `create_cardiac_model.m` e fica de propósito fora do Git, então nunca existe um binário num pull request para discutir. A maioria dos times que trabalham com Simulink faz commit do `.slx`. Quando ele muda, o GitHub entrega ao reviewer um nome de arquivo, um tamanho e "Binary file not shown." Mesmo assim alguém clica em approve. O que essa pessoa acabou de aprovar?

## Um diff que ninguém consegue ler

Se você passa seus dias no Simulink, já sabe que o modelo é o código-fonte. Um valor de gain, uma porta num subsystem, uma entrada de data dictionary: essas são as linhas de código. Numa codebase de texto, o reviewer vê a linha que mudou. Com um modelo, o reviewer ou faz checkout dos dois commits e abre lado a lado no Simulink, o que exige licença e uma tarde livre, ou confia na descrição do pull request.

A MathWorks tem uma boa resposta para parte disso. O exemplo deles, [Simulink Model Comparison for GitHub Pull Requests](https://github.com/mathworks/Simulink-Model-Comparison-for-GitHub-Pull-Requests), roda o Simulink Comparison Tool licenciado no GitHub Actions e publica o relatório HTML oficial do `visdiff`. Se você tem MATLAB nos seus runners e quer a comparação visual de verdade, use esse. O que eu queria era a camada em volta desse relatório. Quais modelos mudaram neste pull request, quanto devo confiar no que a ferramenta extraiu, o que mais no repositório depende deles, e qual devo olhar primeiro?

## Descompactar o slx pareceu progresso

Um arquivo `.slx` é um pacote zip com XML dentro. Então a primeira coisa que fiz foi a mais óbvia: descompactar as versões base e head e fazer diff do XML.

Isso produziu um diff. E esse foi o problema. O XML dentro de um `.slx` não é uma API documentada, e nada garante que o formato continue o mesmo entre releases. Um bloco movido e um gain alterado aparecem ambos como atributos editados, e o diff não tem opinião sobre qual deles muda o comportamento. Pior, um diff de texto sempre parece completo. Nada nele diz "esta é a parte que eu não consegui interpretar." Quem lê esse diff naturalmente assume que, se não está no diff, não mudou.

Esse último ponto moldou tudo o que veio depois. Seja lá o que extraísse o modelo, tinha que declarar quanto do modelo realmente enxergou, e o resto do pipeline tinha que respeitar essa declaração.

Errei uma segunda vez no canvas também. A primeira versão renderizava todo relatório carregado como se estivesse pronto para uma decisão, inclusive relatórios em que a extração era apenas parcial. A versão 0.3.0 foi refeita para parar primeiro no estado de confiança. As versões 0.1.0 e 0.3.0 saíram no mesmo dia, 29 de setembro, o que mostra a velocidade com que eu estava encontrando coisas para corrigir.

## O que roda no pull request

O projeto é o [samueltauil/simulink-model-diff](https://github.com/samueltauil/simulink-model-diff), e a peça principal é uma GitHub Action. Se você vive mais no Simulink do que no GitHub: uma Action é um passo que o GitHub executa numa das máquinas dele toda vez que um pull request é aberto ou atualizado. Você configura com um arquivo YAML em `.github/workflows/`, e o resultado aparece no pull request como um check com uma página de resumo.

O trigger só dispara quando um arquivo de modelo muda:

```yaml
on:
  pull_request:
    paths:
      - "**/*.slx"
      - "**/*.mdl"
      - "**/*.model.json"

permissions:
  contents: read
```

O que vale notar: é `pull_request`, nunca `pull_request_target`, e a única permissão é ler o repositório. Um pull request vindo de um fork roda sem secrets e sem acesso de escrita. Depois vêm os steps, sem os nomes:

{% raw %}
```yaml
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
          persist-credentials: false

      - id: drift
        uses: samueltauil/simulink-model-diff@v0.5.0
        with:
          fail-on: error

      - if: always()
        uses: actions/upload-artifact@v7
        with:
          name: simulink-model-drift-${{ github.run_id }}
          path: build/model-drift
```
{% endraw %}

O `fetch-depth: 0` está ali porque o analisador compara os commits exatos de base e head do pull request, então precisa do histórico completo em vez de um checkout raso. A Action em si não pede nenhuma permissão e não faz upload de nada, então quem decide o que é armazenado é o workflow que a chama. E o upload roda com `if: always()`, porque os relatórios são mantidos mesmo quando a análise ou a policy falha. Um check bloqueado que joga fora a própria evidência é só um X vermelho, e o reviewer precisa sair cavando.

O que sai é um plano de revisão. Cada modelo alterado recebe uma prioridade: `blocked` quando a análise falhou, a evidência está incompleta ou a policy falhou; `high` para drift de interface ou funcional; `normal` para outros drifts semânticos; `low` quando nada semântico mudou. O pull request inteiro se resume num único output `review-status` com valor `blocked`, `review-required` ou `clear`. O artifact contém um `model-drift-index.json` agregado, um resumo em Markdown e relatórios JSON, Markdown e SVG por modelo, além de um arquivo SARIF opcional. SARIF é o formato que o code scanning do GitHub lê, então os findings podem aparecer como annotations se você escolher fazer o upload num job separado.

Repository impact foi a última peça que adicionei, na 0.5.0. Uma mudança num modelo raramente diz respeito só àquele modelo. A Action inclui um scanner construído sobre o [data-explorer-core](https://github.com/mathworks/data-explorer-core) da MathWorks, licenciado sob BSD, que lê os bytes do pacote salvo e encontra model references, dictionaries vinculados e fontes de dados externas sem iniciar o MATLAB. Disso eu calculo dependentes diretos e transitivos, referências não resolvidas e ciclos. O relatório rotula tudo isso como contexto estrutural. Ele diz o que pode ser afetado. Não prova nada sobre comportamento.

Não iniciar o MATLAB é uma escolha deliberada, e é a que eu defenderia com mais força para um time de Simulink. Carregar um modelo pode executar callbacks, scripts, código customizado e tudo mais que o modelo referencia. Num pull request de alguém de fora do time, isso significa rodar o código dessa pessoa no seu runner. Por isso o caminho padrão lê bytes e nunca executa nada. A extração licenciada, em que o MATLAB de fato abre o modelo, pertence a um workflow separado que alguém aprova, num runner que você descarta depois.

Testes e outras ferramentas se encaixam do mesmo jeito. Se o seu workflow roda testes MATLAB e produz JUnit, ou se outro analisador produz SARIF, a Action importa os dois para o mesmo plano de revisão. Testes que falham, erros e evidências exigidas que nunca apareceram bloqueiam. Warnings mantêm o resultado em `review-required`.

## Quatro palavras que decidem a revisão

Toda extração termina em um de quatro estados: `complete`, `partial`, `unsupported` ou `failed`. Só `complete` pode sustentar a conclusão de que nada sofreu drift. Os outros três continuam visíveis em todos os relatórios, empurram o modelo para `blocked` e não podem ser promovidos por nada mais no pipeline. Uma suíte de testes que passa não transforma uma extração partial em complete.

Muitos dos meus posts deste ano foram sobre healthcare, então a analogia a que sempre volto é a de um exame de laboratório. Um espaço em branco ao lado de potássio significa que o exame não foi feito. Não significa que o potássio estava normal, e nenhum clínico leria assim. Model drift precisa da mesma regra. "No drift recorded" só é um finding quando a extração foi completa. Fora isso, é um espaço em branco, e a ferramenta de revisão deveria imprimi-lo como espaço em branco.

## O canvas é onde o engenheiro decide

A Action decide se o pull request passa na policy. Se a mudança está correta continua sendo um julgamento de engenharia, e esse é o trabalho da segunda peça: uma extensão de canvas para o [GitHub Copilot app](https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions). Um canvas é um painel que o app abre ao lado da conversa com o agent, e o repositório define o que vai nele. Este mora em `.github/extensions/simulink-model-diff-canvas/`. Você copia essa pasta para o seu repositório, e não há build step nem `node_modules`.

Para revisar um pull request de verdade, você traz o artifact para o seu checkout:

```bash
gh run download <run-id> \
  --name simulink-model-drift-<run-id> \
  --dir build/model-drift
```

Depois abre o repositório no Copilot app e pergunta: `Open the Simulink Model Diff canvas for build/model-drift/model-drift-index.json`.

[![A GitHub Copilot app session with the Simulink Model Diff canvas open beside the agent conversation, showing extraction trust, the changed model queue, evidence, and the merge assessment](https://raw.githubusercontent.com/samueltauil/simulink-model-diff/main/docs/assets/copilot-canvas-review.png)](https://raw.githubusercontent.com/samueltauil/simulink-model-diff/main/docs/assets/copilot-canvas-review.png)

O painel segue a ordem em que eu gostaria que um colega me guiasse por uma mudança de modelo. A confiança vem primeiro, e se a extração é partial o canvas avisa isso antes de mostrar qualquer outra coisa. Depois o escopo: a fila de modelos alterados em ordem de prioridade, mais os dependentes do scan do repositório. Depois a evidência, com testes importados e quality findings antes de um ledger de valores registrados antes e depois que você pode filtrar por mudanças funcionais, de interface ou estruturais. Campos que o relatório nunca preencheu ficam ocultos em vez de renderizados como "unknown", o que parece detalhe pequeno até você estar varrendo um ledger longo cheio deles.

Termina com um merge assessment: analysis unavailable, qualified extraction needed, policy gate failed, reviewer decision required ou no drift detected. O agent pode conduzir o painel enquanto você lê, por meio de três capabilities, `load_report`, `select_model` e `refresh`. Você pode pedir que ele pule para o modelo que um reviewer sinalizou, ou recarregue depois de uma nova execução de análise, sem perder o seu lugar.

O canvas também tem limites rígidos. Ele não abre o `.slx`. Não chama a API do GitHub, não publica uma review e não altera o resultado do check, e não consegue aprovar nada. Branch protection e o resultado de policy da Action continuam no comando.

## Meu próprio modelo foi bloqueado

A demo no repo é de novo o modelo cardíaco. A [gravação de 32 segundos](https://github.com/samueltauil/simulink-model-diff/blob/main/docs/assets/copilot-canvas-demo.mp4) acompanha um pull request real que muda o parâmetro de dose de 60 para 65. O job da Action volta blocked, o upload do relatório ainda é concluído, e a mesma mudança abre no canvas do Copilot app com estado de confiança `partial` e um merge assessment de "qualified extraction needed."

Também há um relatório versionado em `samples/cardiac-digital-twin/drift.json` para a mudança original de 50 mg para 60 mg, e ele também está marcado como `partial`. Os snapshots foram construídos a partir do script builder do MATLAB, não extraídos por um runtime Simulink licenciado, então isso é tudo o que eles podem afirmar com honestidade.

Tenho sentimentos mistos sobre essa demo. Um "no drift detected" verde ficaria muito melhor num vídeo de 32 segundos, e pensei em montar um sample que produzisse isso. Mas na primeira vez que minha ferramenta olhou para o meu próprio modelo, ela se recusou a chamá-lo de limpo, e estava certa. Esse é o comportamento que eu gostaria dela numa sexta à tarde, quando o pull request de alguém é a última coisa entre o time e um release.

## Por que eu manteria a fronteira mesmo que custe a demo

Isto não substitui a comparação da MathWorks. O `visdiff` continua sendo a comparação visual qualificada, e a documentação do projeto diz com clareza que um resultado em nível de pacote não é equivalente a ela. Os dois se complementam. Um time com infraestrutura licenciada pode rodar um extractor baseado na MathWorks, emitir evidência `complete` e deixar este projeto levá-la por policy, impact, SARIF e o canvas.

O contra-argumento óbvio, com o Copilot em cena, é "deixe o modelo ler o diff e aprovar". Fui na direção oposta de propósito. O agent nesta configuração consegue navegar pela evidência, filtrá-la e explicá-la. Ele não consegue transformar evidência partial em um check verde, e não consegue clicar em approve. Quando o modelo vai parar num carro ou numa bomba de infusão, prefiro um assistente que ajuda um humano a ler com cuidado a um que lê no lugar dele.

Uma ferramenta de revisão que não consegue dizer "eu não sei" vai acabar aprovando uma mudança que nunca viu. O repo está em [samueltauil/simulink-model-diff](https://github.com/samueltauil/simulink-model-diff), a Action está no [Marketplace](https://github.com/marketplace/actions/simulink-model-drift-pr-analysis), e o [guia de revisão end-to-end](https://github.com/samueltauil/simulink-model-diff/blob/main/docs/end-to-end-review.md) percorre todo o fluxo se você quiser testar nos seus próprios modelos.
