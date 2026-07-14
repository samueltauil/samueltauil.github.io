---
lang: pt-br
permalink: /github-copilot/vscode/2026/07/13/copilot-plugins-marketplace-vscode-add-marketplace-ui.html
layout: post
title: "O doc de setup que virou um pull request no VS Code"
date: 2026-07-13
categories: [github-copilot, vscode]
tags: [github-copilot, vscode, plugins, copilot-cli, developer-tools, devex, open-source]
---

Todo time que adota o Copilot acaba fazendo a mesma pergunta: como compartilhamos nossas customizações por toda a organização? A boa notícia é que a maior parte da resposta já vem de fábrica. O GitHub Copilot e o VS Code incluem marketplaces de plugins por padrão, e dois já vêm configurados, incluindo o excelente [awesome-copilot](https://github.com/github/awesome-copilot). Um marketplace empacota agents, skills e extensions em unidades instaláveis que um time inteiro pode padronizar, em vez de copiar o mesmo agent manualmente para dezenas de repositórios.

Eu queria entender esse mecanismo de verdade, não apenas apontar os clientes para a documentação, então criei o meu próprio: [samueltauil/copilot-plugins](https://github.com/samueltauil/copilot-plugins), um marketplace funcional com 12 plugins que também serve como implementação de referência para você fazer um fork na sua organização. Criar o marketplace foi simples. O problema veio na hora de explicar como um colega adiciona ele no VS Code — e esse era o único ponto áspero que merecia um post.

## O botão existe, só não onde você procuraria

Para ser justo, há uma UI para isso. Se você abre as Configurações e busca por `chat.plugins.marketplaces`, encontra um editor de lista com um botão Add Item, dentro de uma seção chamada Chat > Plugins: Marketplaces, marcada com a tag Experimental.

![Editor de Configurações do VS Code mostrando a lista experimental chat.plugins.marketplaces com o botão Add Item](/assets/images/2026-07-13-copilot-plugins-marketplace/settings-marketplaces-experimental.png)

A lista até documenta os formatos aceitos: o shorthand `owner/repo`, uma URL git completa, uma referência `ssh://` ou `git@host:path`, ou um caminho local com `file://`, com entradas equivalentes do GitHub e URI desduplicadas automaticamente. Ou você ignora o editor e edita diretamente o array no settings.json.

```json
{
  "chat.plugins.marketplaces": ["samueltauil/copilot-plugins"]
}
```

A interface está lá. O problema é onde ela vive. Está enterrada atrás de uma busca nas configurações, marcada como Experimental, e não fica nem perto dos lugares onde você realmente navega pelos plugins — nem na view Agent Plugins na barra lateral de Extensions, nem na lista de plugins da janela de Agents. Você descobre os plugins em uma parte da UI e registra a fonte desses plugins em um painel de configurações que você precisa saber que existe para ir procurar. Para encontrar o botão, você já precisa saber que ele existe.

## Três screenshots para uma única string

Fiz o que se costuma fazer: escrevi o doc mesmo assim. Opção 1, a UI de configurações. Opção 2, o settings.json diretamente. Opção 3, um `.github/copilot/settings.json` em nível de workspace para recomendações por projeto. Quando terminei, tinha três opções e três screenshots para explicar como adicionar uma única string a um array. Esse foi o sinal. Quando um doc de setup precisa de um screenshot para mostrar onde o botão está escondido, o doc está fazendo silenciosamente o trabalho do produto.

![View de Agent Plugins mostrando plugins do marketplace copilot-plugins](https://raw.githubusercontent.com/samueltauil/copilot-plugins/main/docs/images/vscode-browse-plugins.png)

## O que o pull request realmente faz

Então parei de escrever o doc e abri o repositório do VS Code. O pull request é [microsoft/vscode#325640](https://github.com/microsoft/vscode/pull/325640), e ele adiciona um único comando: `Chat: Add Plugin Marketplace`. Ele abre um input box que aceita os mesmos formatos que a configuração já aceita, valida a referência, pula duplicatas, respeita a política `strictMarketplaces` da organização e salva em `chat.plugins.marketplaces` no escopo do usuário. Mesma configuração, mesmo modelo por baixo, mesmo editor de lista ainda disponível no painel de configurações para quem prefere assim. A única mudança é que a ação também aparece onde você já está olhando para os plugins.

Conectei o comando aos três lugares onde você realmente iria procurá-lo:

- O Command Palette, como `Chat: Add Plugin Marketplace`.
- O menu de título da view Agent Plugins, onde `Add Marketplace...` agora lidera o fluxo de gerenciamento e aparece como o estado vazio.
- O menu `+` na lista de plugins da janela de Agents.

O URI handler e o novo comando chamam um único helper compartilhado `addConfiguredMarketplace`, então a lógica de adicionar e desduplicar que antes ficava copiada em dois lugares agora vive em um só.

![O comando Chat: Add Plugin Marketplace no Command Palette do VS Code](/assets/images/2026-07-13-copilot-plugins-marketplace/add-marketplace-command-palette.png)

## A adoção é onde um padrão vive ou morre

Esse é o ponto em que continuo pensando. Um marketplace só padroniza algo de verdade se as pessoas realmente o adicionarem, e a adoção morre na rampa de entrada. Se o passo um é saber o nome de uma configuração e encontrar um painel Experimental pela busca de configurações, uma parte do seu time nunca passa disso — e os agents que você pretendia compartilhar ficam na sua máquina. O marketplace em si é sólido: os plugins instalam bem, a configuração funciona, o modelo por baixo é consistente. O ponto áspero estava apenas em como você o ativa, que é exatamente a parte que decide se um padrão compartilhado se espalha ou estagna.

Então enviei o fix upstream, minha primeira contribuição ao VS Code. Independente do que acontecer na revisão, o ponto permanece: o valor de um padrão compartilhado é limitado pela facilidade com que a próxima pessoa consegue adotá-lo.

## O que eu levaria daqui

O takeaway que realmente me importa é a padronização. Copiar um bom agent para dezenas de repositórios não é compartilhamento — é drift esperando para acontecer. Um marketplace transforma esses agents, skills e extensions em uma única fonte instalável que se mantém consistente entre o Copilot CLI, o VS Code e o cloud agent, e uma empresa pode distribuir um conjunto padrão para todos os desenvolvedores via `managed-settings.json` sem que ninguém precise editar um arquivo de configuração manualmente. O repositório é licenciado como MIT e foi feito para ser forkado, então você pode apontá-lo para a sua própria organização e seguir em frente.

Se você quiser que o lado de manutenção fique por conta de alguém, transformei o que aprendi em um template companion: [samueltauil/plugins-marketplace-template](https://github.com/samueltauil/plugins-marketplace-template). Clique em Use this template, coloque cada plugin em `plugins/`, e o CI faz a parte chata. Ele valida cada `plugin.json` contra um schema baseado na referência oficial de plugins do GitHub, regenera o `marketplace.json` agregado para que o catálogo nunca saia de sincronia com o que realmente está no repositório, e falha o PR se os dois ficarem fora de sincronia. Há um formulário de issue "Propose a new plugin" e um checklist de PR para que um colega possa contribuir com um plugin sem precisar memorizar o formato do manifest. O marketplace de referência mostra como é um desses; o template dá à sua organização uma forma estruturada de manter um ativo.

A lição menor veio de brinde. Um padrão só se espalha até onde sua rampa de entrada alcança, então quando o doc de setup ficou complicado, consertei a rampa em vez de escrever ao redor do problema. Mesmo instinto nos dois casos: torne a coisa compartilhada fácil de adotar, ou assista todo mundo silenciosamente reconstruir a sua própria.
