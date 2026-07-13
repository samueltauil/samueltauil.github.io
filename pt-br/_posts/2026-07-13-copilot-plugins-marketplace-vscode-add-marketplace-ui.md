---
layout: post
lang: pt-br
permalink: /github-copilot/vscode/2026/07/13/copilot-plugins-marketplace-vscode-add-marketplace-ui.html
title: "O doc de setup que virou um pull request no VS Code"
date: 2026-07-13
categories: [github-copilot, vscode]
tags: [github-copilot, vscode, plugins, copilot-cli, developer-tools, devex, open-source]
---

Todo time que adota o Copilot eventualmente faz a mesma pergunta: como compartilhamos nossas customizações em toda a organização? Alguém cria um agent ou skill genuinamente bom, ele fica em um único repo, e o próximo time recria uma versão ligeiramente diferente do zero porque não existe uma forma limpa de passar isso adiante. Passei um fim de semana em uma resposta: um plugins marketplace para o Copilot. Não o GitHub Marketplace — um único repo que empacota agents, skills e extensions em unidades instaláveis que um time inteiro pode padronizar. [samueltauil/copilot-plugins](https://github.com/samueltauil/copilot-plugins) é um que já funciona com 12 plugins, e serve também como uma implementação de referência que você pode fazer fork para a sua organização. Construir foi a parte fácil. Fazer um colega de time adicioná-lo no VS Code foi onde encontrei uma aspereza que valia a pena aparar.

## O botão existe, só não fica onde você procuraria

Para ser justo, existe uma UI para isso. Se você abrir o Settings e pesquisar por `chat.plugins.marketplaces`, aparece um editor de lista completo com um botão Add Item, dentro de uma seção chamada Chat > Plugins: Marketplaces com uma tag Experimental ao lado.

![VS Code Settings editor showing the experimental chat.plugins.marketplaces list with an Add Item button](/assets/images/2026-07-13-copilot-plugins-marketplace/settings-marketplaces-experimental.png)

A lista até documenta os formatos aceitos: um atalho `owner/repo`, uma URL git completa, uma referência `ssh://` ou `git@host:path`, ou um caminho `file://` local, com entradas GitHub e URI equivalentes deduplicadas automaticamente. Ou você pula o editor e edita o array diretamente no settings.json.

```json
{
  "chat.plugins.marketplaces": ["samueltauil/copilot-plugins"]
}
```

Então a superfície existe. O problema é onde fica. Está enterrada atrás de uma busca no settings, marcada como Experimental, e não fica perto de nenhum dos lugares onde você realmente navega pelos plugins. Nem na view Agent Plugins na sidebar de Extensions, nem na lista de plugins da janela Agents. Você descobre plugins em uma parte da UI e registra a fonte desses plugins em um painel de settings que você precisa saber que existe para ir procurar. Para encontrar o botão, você já precisa saber que ele existe.

## Três screenshots para uma string

Fiz o que se esperava. Escrevi o doc mesmo assim. Opção 1, a UI do settings. Opção 2, o settings.json diretamente. Opção 3, um `.github/copilot/settings.json` no nível do workspace para recomendações por projeto. Quando terminei, tinha três opções e três screenshots para explicar como adicionar uma única string a um array. Foi o sinal. Quando um doc de setup precisa de um screenshot para mostrar onde o botão está escondido, o doc está silenciosamente fazendo o trabalho do produto.

![Agent Plugins view showing plugins from the copilot-plugins marketplace](https://raw.githubusercontent.com/samueltauil/copilot-plugins/main/docs/images/vscode-browse-plugins.png)

## O que o pull request realmente faz

Então parei de escrever docs e abri o repo do VS Code. O pull request é o [microsoft/vscode#325640](https://github.com/microsoft/vscode/pull/325640), e ele adiciona um único command: `Chat: Add Plugin Marketplace`. Ele abre um input box que aceita os mesmos formatos que o settings já aceita, valida a referência, pula duplicatas, respeita a política `strictMarketplaces` da organização, e escreve em `chat.plugins.marketplaces` no escopo do usuário. Mesmo settings, mesmo modelo por baixo, o mesmo editor de lista ainda fica no painel de settings para quem preferir. A única coisa que muda é que a ação também aparece onde você já está olhando para plugins.

Conectei nos três lugares onde você realmente iria procurar:

- O Command Palette, como `Chat: Add Plugin Marketplace`.
- O menu de título da view Agent Plugins, onde `Add Marketplace...` agora lidera o fluxo de gerenciamento e aparece como o estado vazio.
- O menu `+` na lista de plugins da janela Agents.

O URI handler e o novo command chamam o mesmo helper `addConfiguredMarketplace`, então a lógica de adicionar e deduplicar que ficava copiada em dois lugares agora vive em um.

![The Chat: Add Plugin Marketplace command in the VS Code Command Palette](/assets/images/2026-07-13-copilot-plugins-marketplace/add-marketplace-command-palette.png)

## Adoção é onde um padrão vive ou morre

Aqui está a parte que fica voltando na minha cabeça. Um marketplace só padroniza algo se as pessoas realmente o adicionam, e a adoção morre na entrada. Se o primeiro passo é saber o nome de um settings e encontrar um painel Experimental pela busca do settings, uma parte do seu time nunca passa disso, e os agents que você queria compartilhar ficam na sua máquina. O marketplace em si é sólido: plugins instalam bem, o settings funciona, o modelo por baixo é consistente. A aspereza estava apenas em como você o ativa, que por acaso é exatamente a parte que decide se um padrão compartilhado se espalha ou trava.

Então enviei o fix para upstream, minha primeira contribuição ao VS Code. Seja lá o que acontecer na revisão, o ponto se mantém: o valor de um padrão compartilhado é limitado por quão facilmente a próxima pessoa pode aderir a ele.

## O que eu levaria daqui

O que realmente me importa é a padronização. Copiar um bom agent para uma dúzia de repos não é compartilhar, é drift esperando para acontecer. Um marketplace transforma esses agents, skills e extensions em uma única fonte instalável que permanece consistente no Copilot CLI, no VS Code e no cloud agent, e uma empresa pode distribuir um conjunto padrão para todos os desenvolvedores através de um `managed-settings.json` sem ninguém editar um config file manualmente. O repo tem licença MIT e foi construído para ser forkado, então você pode apontá-lo para a sua organização e sair usando.

A lição menor veio de brinde. Um padrão só se espalha até onde a sua entrada alcança, então quando o doc de setup ficou complicado, consertei a entrada em vez de escrever em torno do problema. O mesmo instinto nos dois casos: torne o que é compartilhado fácil de adotar, ou assista todos silenciosamente reconstruírem o próprio.
