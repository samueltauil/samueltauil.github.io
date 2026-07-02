---
layout: post
lang: pt-br
permalink: /github-copilot/devops/2026/07/02/visualizing-copilot-prompt-cache-otel-grafana.html
title: "Monitorando o Cache de Prompt do Copilot com OpenTelemetry e Grafana"
date: 2026-07-02
categories: [github-copilot, devops]
tags: [github-copilot, opentelemetry, grafana, tempo, observability, vscode, prompt-caching, prompt-engineering, intune]
---

Abra o VS Code, faça uma pergunta no Copilot Chat e, se você abrir a visualização de debug, dá pra ver os tokens de cache de prompt passando para aquela única chamada. É exatamente o nível de visibilidade que um desenvolvedor precisa. Ele deixa de ser suficiente no momento em que um time de plataforma quer a mesma imagem em toda uma frota, ao longo de uma semana, segmentada por modelo e por formato de prompt. Essa foi a pergunta com que me envolvi semana passada. O cliente havia implantado o Copilot para uma boa parte da sua organização de engenharia, a adoção estava saudável, e eles chegaram com uma preocupação específica: quão consistentes são os prompts que nossos desenvolvedores realmente estão enviando? Eles não queriam um gráfico de marketing. Queriam ver, por desenvolvedor e por formato de prompt, com que frequência o modelo estava lendo do cache de prompt em vez de construir um novo. Esse número diz muito sobre o quanto seus prompts são estáveis e reutilizáveis de verdade.

O cache de prompt é uma daquelas coisas que parecem chatas até você começar a prestar atenção no que gera um hit versus um miss. O reaproveitamento do cache só acontece quando o mesmo prefixo de prompt aparece de novo, e se os seus prompts variarem um pouco a cada vez (uma mensagem de sistema ligeiramente diferente, uma ordenação instável de tools, uma dica de workspace que muda a cada chamada), você pode silenciosamente destruir sua taxa de cache hit sem perceber. Taxas de hit mais baixas significam respostas mais lentas e comportamento menos previsível, então o cliente tinha uma intuição de que isso estava acontecendo na organização e queria uma prova em um sentido ou no outro.

Então construí uma coisa pequena para provar isso localmente: [samueltauil/copilot-traces](https://github.com/samueltauil/copilot-traces). O Docker Compose sobe o Grafana Tempo e o Grafana, o VS Code envia traces OTel direto para o Tempo via OTLP/HTTP, e um dashboard pré-construído mostra os tokens de `cache_read` vs `cache_creation` ao longo do tempo. Sem conta na nuvem, sem collector, sem cadastro. O ponto é que você pode entregar um laptop para um desenvolvedor cético e ele estará rodando em cerca de cinco minutos.

## Por que isso funciona

O que possibilita tudo isso é que versões recentes do VS Code já emitem spans de OpenTelemetry para o Copilot Chat. As convenções semânticas GenAI cobrem os atributos de que precisei:

- `gen_ai.usage.input_tokens` e `gen_ai.usage.output_tokens` para as contagens brutas de tokens.
- `gen_ai.usage.cache_read.input_tokens` para cache hits.
- `gen_ai.usage.cache_creation.input_tokens` para cache misses que foram gravados no cache.
- `gen_ai.request.model` e `gen_ai.operation.name` para que eu possa segmentar por modelo e por se um span é uma chamada de chat, invoke_agent ou execute_tool.

Cache hit é `cache_read.input_tokens > 0`. Cache miss é `cache_creation.input_tokens > 0`. Ambos zero significa nenhum envolvimento do cache. Uma vez que você tem esses três estados bem definidos, todo o resto no dashboard é só contagem.

## As peças do sistema

A stack no repositório é menor do que eu esperava quando comecei. O Tempo é configurado para aceitar OTLP/HTTP diretamente na porta 4318. O Grafana aponta para o Tempo como fonte de dados. O Grafana carrega o dashboard de um arquivo de provisionamento na inicialização. É isso.

Ativar o cliente são quatro configurações no user settings do VS Code:

```json
{
  "github.copilot.chat.otel.enabled": true,
  "github.copilot.chat.otel.exporterType": "otlp-http",
  "github.copilot.chat.otel.otlpEndpoint": "http://localhost:4318",
  "github.copilot.chat.otel.captureContent": false
}
```

Um detalhe que me custou um tempo para descobrir: tem que ser nas configurações de User, não de Workspace. O OTel SDK inicializa cedo na inicialização do VS Code, e as configurações de workspace carregam tarde demais para o exporter capturá-las. Recarregue a janela após salvar e os traces começam a fluir.

Deixei o `captureContent` desativado por padrão porque, quando você o ativa, os traces incluem os prompts e respostas completos. É incrível para fazer debug dos seus próprios prompts e aterrorizante para os de qualquer outra pessoa, então deixei o default como a opção segura.

## O que o dashboard realmente mostra

Baseei o layout dos painéis no [dashboard oficial do GitHub Copilot para Grafana](https://aka.ms/amg/dash/gh-copilot) e reescrevi as queries em TraceQL para que rodem contra o Tempo em vez de um workspace do Log Analytics. Os painéis focados em cache são os que adicionei, porque essa era a questão central do cliente:

- Tokens de Cache Read vs Creation ao longo do tempo.
- Eficiência de cache por modelo como bar gauges.
- Stat panels para total de hits, misses, tokens de input e output.

Em volta deles, os suspeitos de sempre: operações ao longo do tempo, consumo de tokens por modelo, distribuição de modelos como pie chart, duração de resposta por modelo, principais tool calls, e uma tabela de traces brutos para os últimos agent runs.

![Dashboard de cache de prompt do Copilot](https://raw.githubusercontent.com/samueltauil/copilot-traces/main/docs/dashboard.png)

A primeira coisa que o cliente quis fazer foi abrir o Explore, rodar uma query em TraceQL e ver spans reais. Então a documentação também cobre isso. Duas queries a que continuo voltando:

```
{ span.gen_ai.usage.cache_read.input_tokens > 0 }
```

```
{ span.gen_ai.operation.name = "chat" && resource.service.name = "copilot-chat" }
```

A primeira é "me mostre todo chat que acertou o cache." A segunda é "me mostre todo chat span". Entre as duas, você consegue avaliar sua taxa de hit num laptop em cerca de dez segundos.

## Por que não tem collector

Alguém sempre pergunta isso dentro do primeiro minuto de um demo, então isso entrou no README como um grande destaque. Os traces vão diretamente do VS Code para o Tempo porque eu queria que o demo coubesse em uma máquina sem hops extras. É mais fácil de explicar e muito mais fácil de debugar quando algo não está funcionando.

Isso não é o que eu colocaria em produção para uma organização. Em um ambiente de time, você coloca um [OTel Collector](https://opentelemetry.io/docs/collector/) entre o editor e o backend para poder distribuir para mais de um destino, filtrar atributos que você não quer enviar, e rotear diferentes ambientes para diferentes backends. O formato típico que esboço para clientes é um Collector na frente do Grafana Tempo e do Azure Application Insights, para que o time de plataforma tenha seus dashboards e os times de aplicação mantenham sua história de APM existente.

## A questão do Intune

Essa é a parte que fez o cliente prestar atenção. As quatro configurações do VS Code acima são ótimas para um demo, mas se você pedir para cada desenvolvedor colá-las no próprio `settings.json`, metade vai esquecer e suas métricas vão ser uma mentira. O fix é chato e eficaz: configurações gerenciadas via Microsoft Intune. Empurre uma política que defina o endpoint OTel, o tipo de exporter e o flag de habilitação em cada dispositivo gerenciado, e agora a telemetria não é mais opt-in. Ela simplesmente existe.

O [guia da Microsoft sobre Grafana + Application Insights](https://learn.microsoft.com/en-us/azure/managed-grafana/grafana-opentelemetry-app-insights) cobre o Collector, o App Insights e o Managed Grafana nessa história. Combine com uma política do Intune para as configurações do cliente e você tem a versão enterprise desse mesmo demo, rodando com as mesmas convenções, com as mesmas queries do dashboard.

## Com o que o cliente saiu

O número que importava para eles era a eficiência de cache por modelo. Uma vez que tiveram isso, a conversa mudou de forma. Deixou de ser uma sensação vaga de que algo parecia inconsistente de execução em execução e se tornou "quais formatos de prompt estão destruindo nosso cache, e conseguimos estabilizá-los?" Essa é uma pergunta muito melhor para debater, porque você pode realmente fazer algo com a resposta.

Algumas coisas pequenas que eles notaram e que eu não havia enquadrado como features:

- O dashboard roda no laptop deles. Ninguém precisou abrir um ticket para conseguir uma instância do Grafana para experimentar.
- As queries são TraceQL, não KQL. O time de plataforma deles já é focado em Grafana, então não havia uma nova linguagem de query para aprender.
- O toggle do lado do cliente é um único bloco de configurações. Se acabar sendo uma má ideia, você desativa e recarrega.

## Se quiser explorar

Clone o repositório, `docker compose up -d`, cole as quatro configurações no seu `settings.json` de usuário, recarregue o VS Code e use o Copilot Chat por alguns minutos. Depois abra `http://localhost:3000` e o dashboard já vai estar esperando por você.

O repositório está aqui se quiser os detalhes: [samueltauil/copilot-traces](https://github.com/samueltauil/copilot-traces).

O que continuo dizendo para clientes sobre esse padrão é que observabilidade para desenvolvimento com IA assistida não é uma nova disciplina especial. É a mesma história do OpenTelemetry que contamos para serviços, direcionada para um público ligeiramente diferente. Uma vez que você consegue ver os traces, as perguntas posteriores sobre ajuste de prompts e padrões de uso ficam bem menos vagas.
