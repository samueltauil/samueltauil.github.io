---
lang: pt-br
permalink: /github-copilot/devops/2026/09/10/hydrafusion-model-routing-grafana-traces.html
layout: post
title: "Cinco models rodaram um turn, e eu queria ver os cinco"
seo_title: "Rastreando o Model Routing do HydraFusion no Copilot CLI"
description: "O HydraFusion devolve uma resposta e um número de créditos. Construí um dashboard no Grafana a partir do session log do Copilot CLI para ver cada model."
image: https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/dashboard.png
date: 2026-09-10
categories: [github-copilot, devops]
tags: [github-copilot, copilot-cli, hydrafusion, opentelemetry, observability, grafana, tempo, prometheus, model-routing, copilot-coding-agent]
---

Ativei o HydraFusion na semana em que foi lançado, dei a ele uma tarefa real em um pequeno projeto Python e esperei cerca de um minuto. Ele voltou com uma boa resposta e um número: 14.72 créditos. Foi aí que fiquei curioso. Um model produziu aquilo, ou quatro? Algo foi rascunhado, revisado e melhorado pelo caminho? O [anúncio](https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/) diz que um turn pode draft, critique, revise, ou escalate, e que o CLI mantém rascunhos intermediários para que trabalho inacabado não pareça final. Essa é uma decisão sensata para quem está codando, porque um draft prestes a ser revisado não deveria parecer uma resposta. Isso também significa que a parte interessante da história acontece fora da tela, e eu queria assistir a ela.

Essa é a coceira. O HydraFusion escolhe um de três padrões de execução por request: `single`, onde um model resolve a tarefa; `cascade`, onde um model eficiente rascunha e um quality gate decide se aceita ou escala; e `critique`, onde um model rascunha, um critic somente leitura de outra família revisa, e o drafter revisa uma vez. Cascade e critique são os que eu queria ver, porque em ambos um segundo model contribuiu e o resultado ainda chega como uma resposta limpa. Eu queria saber qual model rascunhou, qual revisou, qual veredito voltou, e para onde foram os créditos.

Então construí o [samueltauil/hydrafusion-traces](https://github.com/samueltauil/hydrafusion-traces): `docker compose up -d`, aponto o CLI para ele, e cada turn aparece no Grafana com um span por fusion leg, nomeado pelo model que o executou.

<div class="post-note">
  <div>
    <strong>Importante</strong>
    <p>Este é um projeto paralelo independente. Não é afiliado, endossado ou apoiado pelo GitHub ou pela Microsoft. O HydraFusion é um research preview, e tudo abaixo foi observado de fora, em uma máquina, ao longo de 24 turns. Ele lê session state que não carrega nenhuma promessa de compatibilidade, então vai ficar desatualizado. Nada aqui é um benchmark ou uma afirmação sobre qualidade de model.</p>
  </div>
</div>

![O dashboard de routing do HydraFusion no Grafana, mostrando estatísticas principais, ledger de fases e linhas por turn](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/dashboard.png)

## Eu presumi que o OpenTelemetry simplesmente me contaria

Meu primeiro plano era o óbvio, e estava errado.

Eu já tinha feito uma versão disso para prompt caching no [copilot-traces](https://github.com/samueltauil/copilot-traces), então presumi que o mesmo truque funcionaria. O CLI emite OpenTelemetry, eu configuraria `OTEL_EXPORTER_OTLP_ENDPOINT`, as fusion legs apareceriam como spans `chat` separados com valores diferentes de `gen_ai.response.model`, e eu apontaria o span-metrics generator do Tempo para esse atributo. Reservei uma noite para a coisa toda.

O CLI emite OTel corretamente, e é exatamente por isso que meu plano não funcionou. Cada turn chega como exatamente uma operação `chat` com `gen_ai.request.model=hydrafusion`, que é o que as [GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) pedem, porque `gen_ai.request.model` é definido como o model que o cliente pediu, e o cliente de fato pediu `hydrafusion`. Não existe um `gen_ai.response.model` por leg porque as conventions ainda não têm noção de um router que expande um request em várias chamadas de model. Isso é um gap entre uma spec em desenvolvimento e uma arquitetura nova, não um defeito no CLI. O vocabulário simplesmente ainda não foi escrito.

Meu span-metrics generator, se eu o tivesse deixado rodando, teria produzido uma bela série temporal rotulada `hydrafusion`. Desativei e fui procurar em outro lugar.

## Onde o detalhe realmente mora

O CLI já escreve tudo isso, por suas próprias e boas razões.

Toda sessão mantém um arquivo `~/.copilot/session-state/<id>/events.jsonl`, e esse arquivo registra o padrão de routing, o plano de fases, o model que serviu cada fase, o veredito do reviewer, tokens por fase, e créditos por fase. Está ali para que o CLI possa retomar e rebobinar uma sessão, o que é um recurso genuinamente bom e a razão pela qual esses dados são tão completos. O tailer neste repositório lê o mesmo arquivo com um segundo propósito: ele reconstrói cada turn como um trace com um child span por leg e conta os mesmos eventos no Prometheus.

Esse é todo o truque. Tudo mais no repositório é config provisionada: um collector, Tempo, Prometheus, e um dashboard do Grafana que carrega como página inicial sem login e sem configuração de datasource. O tailer é Python puro da stdlib, sem dependências, porque uma coisa que lê o seu session state deveria ser pequena o bastante para você mesmo ler.

Vale dizer quem escreveu isso. A lista de contribuidores desse repositório tem duas entradas, eu e o Copilot. Eu fiz o spike à mão, porque descobrir o que o CLI emite significou ler linhas JSON cruas e discutir comigo mesmo sobre o que elas significavam. Tudo depois disso foi o tipo de trabalho que fico feliz em delegar: o tailer, o compose file, e várias centenas de linhas de JSON do dashboard do Grafana das quais eu teria enjoado na metade. Rodei a maior parte no GPT-6 Astra, que foi minha primeira sessão de verdade com esse model, e o que notei foi o quão pouco tive que reexplicar a topologia. Qual container fala com qual porta permaneceu firme entre sessões. O pull request mais recente do repositório é um do Copilot que foi lá e removeu uma feature flag `HYDRAFUSION_ROLLOUT` obsoleta da documentação assim que o rollout se abriu e a flag deixou de ser necessária. Isso é uma manutenção pequena, entediante e genuinamente útil, e eu nem precisei notá-la sozinho.

```bash
docker compose up -d
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
copilot --model hydrafusion
```

Você precisa do Copilot CLI 1.0.83 ou mais recente com `/experimental on`, e então o HydraFusion selecionado em `/model`. Se quiser dar uma olhada sem nada disso, `docker compose --env-file demo.env up -d` reproduz um cascade higienizado, versionado em `fixtures/`.

Uma linha por turn nos logs do tailer conta que está funcionando:

```
INFO fusion fusion-fa51fa07-905f pattern=cascade phases=3 models=gpt-5.6-sol,mai-code-1.1-flash aiu=14.72
```

## O turn de 14.72, desmontado

Aqui está o turn do início deste post, como três legs.

![Waterfall do Tempo para um turn cascade: uma draft leg, uma judge leg que rejeitou, e uma repair leg](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/cascade-waterfall.png)

`mai-code-1.1-flash` rascunhou por 22 segundos e 0.58 AIU, a unidade de crédito que o CLI reporta. `gpt-5.6-sol` revisou aquele draft, retornou `reject`, e então refez o trabalho sozinho em 42 segundos e 11.69 AIU. A judge leg custou 2.46. Três legs, uma resposta coerente, e agora consigo ver as três.

Abra qualquer leg e a história toda cabe em duas linhas de atributos.

![Atributos de span mostrando gen_ai.request.model como hydrafusion e gen_ai.response.model como gpt-5.6-sol](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/span-attributes.png)

`gen_ai.request.model` é `hydrafusion`, conforme as conventions. `gen_ai.response.model` é `gpt-5.6-sol`, que o tailer acrescentou a partir do session log. Ambos são afirmações verdadeiras. Esse é o mental model ao qual sempre volto: as conventions presumem que um request mapeia para um model, e um router quebra essa premissa sem quebrar regra nenhuma. O model que você pediu e o model que respondeu agora são duas coisas separadas, e a spec só tem um campo para o primeiro.

O restante da leg carrega o veredito, a divisão de tokens, o custo em créditos, e uma flag indicando se essa leg produziu a resposta que você de fato recebeu.

![Detalhe completo de span para uma fusion leg, incluindo veredito, tokens e créditos](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/span-detail.png)

## A aposta do cascade vai nos dois sentidos

Escrevi uma versão inicial do documento de achados quando eu só tinha quatro turns, e afirmei com confiança que todo cascade terminava em rejeição. Em 24 turns, é dois em três, e o terceiro é mais interessante do que os dois que confirmaram meu viés.

![Waterfall para um cascade onde o judge aceitou o draft](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/cascade-accepted.png)

`mai-code-1.1-flash` respondeu a uma pergunta aberta de design de cache distribuído por 0.34 AIU. `gpt-5.6-sol` revisou e aceitou. Total do turn: 2.39 AIU, contra uma mediana de 7.97 para turns `single` na mesma amostra.

Olhe para a divisão interna, porém. A review custou 2.05 e a resposta custou 0.34. A checagem custou seis vezes o trabalho que aprovou, e o turn ainda assim chegou a aproximadamente um quinto de um turn single-model comparável. Acho genuinamente difícil ter uma opinião limpa sobre isso. A maior parte do gasto foi em checagem em vez de produção, e o resultado foi ao mesmo tempo verificado e mais barato do que a alternativa.

## Critique é um animal diferente

Cascade e critique incluem uma fase de review, o que torna tentador colocá-los na mesma categoria. Os traces dizem o contrário.

![Waterfall para um turn critique: uma draft leg longa seguida de uma critic leg curta](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/critique-waterfall.png)

`claude-opus-5` rascunhou por 1 minuto e 46 segundos e 51.11 AIU. `gpt-5.6-sol` fez a crítica por 5.7 segundos e 0.69 AIU. Não há campo de veredito, e o draft é confirmado (committed).

Então, em um critique, a review é uma passada barata sobre um trabalho caro. Em um cascade, o judge é um gate que pode disparar uma segunda tentativa completa em um model mais forte. Os perfis de custo correm em direções opostas mesmo que ambos os padrões incluam uma fase de review. Se você está construindo um modelo de custo para isso, agrupar os dois em um único balde "multi-model" vai esconder exatamente a coisa que você mais quer saber, que é com que frequência o gate dispara.

## Como foram vinte e quatro turns

Amostra pequena, uma máquina, um operador, um projetinho Python com um bug off-by-one plantado propositalmente. Leia isso como um relato de campo, não como uma avaliação.

![Estatísticas principais: taxa de workflow composto, taxa de rejeição do judge, e fatia de overhead](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/headline-stats.png)

Seis dos 24 turns usaram mais de um model, uma taxa composta de 25%. Dezoito turns não tiveram segunda leg alguma, o que é o router decidindo que um único model era suficiente e economizando o resto. A taxa de rejeição do judge foi de 67%, embora isso seja dois em três e não um número que eu defenderia em qualquer lugar. Uma rejeição é o quality gate fazendo o seu trabalho: o draft não passou da régua, então o turn escalou, que é exatamente o comportamento que o padrão existe para fornecer.

Cinco models distintos apareceram no conjunto.

![Painel de models listando os cinco models observados na amostra](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/models.png)

`gpt-5.6-sol` rodou uma leg em todos os turns, sem exceção. `claude-opus-5` apareceu três vezes, apenas para o trabalho mais pesado: refatorações multi-arquivo e uma passada de delete-and-verify.

![Fatia de créditos por model, com gpt-5.6-sol e claude-opus-5 dominando](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/aiu-by-model.png)

Essas três legs de `claude-opus-5` levaram 42% do gasto total. Trate os identificadores como rótulos de routing observados em um preview, não como nomes de produto, porque vão mudar, e a leitura de "placar" desse gráfico não tem sentido nesse tamanho de amostra. O ponto é que o pool é heterogêneo entre vendors e o router alcança dentro dele por fase, não por sessão.

Cada leg que o router executou, colorida por model e tipo de fase:

![Ledger de fases mostrando cada fusion leg colorida por model e tipo de fase](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/phase-ledger.png)

E a resposta para a pergunta que eu de fato me importava, que é como os créditos se dividiram entre a leg que respondeu e as legs que revisaram:

![Créditos por tipo de fase: primary, draft, repair, judge, critic](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/where-credits-went.png)

Uma leg por turn fornece a resposta que você vê. Ao longo dos 24 turns, as legs que não fizeram isso somaram 2.5% do gasto. Hesito em chamar isso de overhead, porque um draft superado e sua crítica ficam no contexto da repair leg, então a resposta final pode muito bem ser melhor por causa da existência delas. O que aquele 2.5% de fato mede é a fatia da conta que comprou review em vez de output, o que é uma frase mais monótona, mas mais defensável.

Depois, uma linha por turn, e clicar em qualquer célula carrega o waterfall daquele turn.

![Tabela de turns com uma linha por turn, mostrando pattern, models, duração e créditos](https://raw.githubusercontent.com/samueltauil/hydrafusion-traces/main/docs/screenshots/turns.png)

## Acertei a rota uma vez em seis tentativas

Antes de rodar os prompts, anotei o que eu esperava que cada um roteasse. Minha regra era a sensata: draft barato para trabalho fácil, model forte para trabalho difícil, escalar quando o draft é fraco.

Acertei um em seis. Uma busca de três itens na stdlib foi para `critique` entre dois models por 0.51 AIU. Um off-by-one sutil com um teste falhando, exatamente o tipo de coisa que eu esperava que disparasse um cascade, foi direto para `single` no model mais forte. Uma renomeação mecânica entre dois arquivos virou um cascade. Eu estava errado nas duas direções e nos dois extremos da faixa de dificuldade.

Isso não significa que o routing seja arbitrário. `routeSource` foi `capi_plan` nos 24 turns e `policy` era `max`, o que significa que a decisão é servida remotamente e pode ser reajustada sem um release do CLI. A seleção de padrão levou entre 172 e 371 milissegundos, uma média de 229 ms, bem abaixo de 1% dos tempos de parede de 28 a 64 segundos. Existe um campo `degradedReason` que ficou nulo o tempo todo, então há um caminho de fallback que nunca disparei.

Duas outras coisas me surpreenderam. Ao longo de 96 chamadas de inferência, tokens de input superaram os de output em aproximadamente 59 para 1, e três quartos desse input foi servido do cache, o que é muito reuso. Output visível é um proxy ruim para custo aqui. Uma resposta curta com cache frio pode facilmente custar mais do que uma longa, o que explica uma esquisitice na tabela de turns que eu fiquei encarando por um tempo até os números de tokens fazerem sentido dela.

## O que vai quebrar, e quando

`events.jsonl` é session state, não uma API. Está ali para que o CLI possa retomar e rebobinar, e não carrega promessa de compatibilidade, nem deveria. Tudo aqui foi verificado contra o Copilot CLI 1.0.84-2. Quando o tailer parar de produzir linhas depois de um upgrade do CLI, essa será a razão, e é o resultado esperado de ler o estado interno de alguém por diversão. Os nomes de atributos também vão se mover, porque as GenAI conventions ainda estão em desenvolvimento e o CLI as acompanha, o que é a coisa certa para ele fazer.

Nenhum conteúdo de prompt ou resposta é capturado. O tailer lê campos de metadados e descarta corpos de mensagem, e eu deixaria `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` intocado nesta stack, porque minha stack não tem controle de acesso e armazenaria alegremente o seu código-fonte em uma porta local. Toda porta se vincula a `127.0.0.1`. Mantenha assim.

Nada disso é um benchmark. Vinte e quatro turns descrevem o que a telemetria contém e provam que o dashboard funciona. Está longe de ser suficiente para julgar uma política de routing, e os números acima não dizem nada sobre qualidade de model.

## Por que acho que esse padrão vale a pena roubar

Nada aqui está quebrado. O HydraFusion devolve uma resposta coerente por um bom motivo, o CLI reporta uma única cifra de crédito por um bom motivo, e o output do OTel é uma leitura fiel de uma spec que ainda está crescendo em direção a models compostos. Cada camada se comporta exatamente como projetada, e o detalhe que eu queria estava a um arquivo de distância.

Esse é o padrão que vale a pena levar com você. Quando uma interface te dá um resumo e você quer o detalhamento, a resposta geralmente não é esperar a interface criar um campo novo. É ir encontrar onde o sistema já mantém suas próprias anotações, porque a maioria dos runtimes registra muito mais do que exibe, por suas próprias razões operacionais. Retomar e rebobinar é a razão pela qual esse log existe, e visibilidade de routing é um efeito colateral que ganhei de graça.

Acertei a rota uma vez em seis tentativas, o que diz muito mais sobre a minha regra de bolso do que sobre o router. Esse é todo o argumento para ler o log em vez de raciocinar sobre ele.

O repositório é [samueltauil/hydrafusion-traces](https://github.com/samueltauil/hydrafusion-traces), as notas de campo estão em [docs/FINDINGS.md](https://github.com/samueltauil/hydrafusion-traces/blob/main/docs/FINDINGS.md), e o que o CLI de fato emite está medido em [docs/SPIKE.md](https://github.com/samueltauil/hydrafusion-traces/blob/main/docs/SPIKE.md).
