---
lang: pt-br
permalink: /github-copilot/open-source/developer-tools/2026/03/08/skills-hub-updates-security-scan-new-domain-cli-install.html
layout: post
title: "Atualizações do Skills Hub: Scanner de Segurança, Instalação via CLI e Lançamento do skillshub.space"
date: 2026-03-08
categories: [github-copilot, open-source, developer-tools]
tags: [github-copilot, security, cli, automation, developer-tools, skills]
---

Quando lancei o Skills Hub pela primeira vez, ele tinha 51 skills vindos de uma única fonte. Alguns meses depois, o catálogo cresceu para 225 skills agregados do awesome-copilot do GitHub, do repositório de skills da Anthropic e de extensões MCP. Era muito código que eu ainda não tinha examinado.

Skills são poderosos porque estendem o que seu assistente de IA pode fazer. Eles são carregados dinamicamente no contexto, podem moldar respostas, executar comandos shell, acessar arquivos, fazer requisições de rede. Essa flexibilidade é o ponto central. Mas quando você está agregando 225 deles de múltiplos repositórios upstream, você quer saber exatamente o que cada um faz antes de chegar aos desenvolvedores. Não saber o que havia dentro do código e não saber exatamente quando ele ativa parecia uma lacuna que valia a pena fechar.

A ideia realmente se concretizou durante um hackathon na Microsoft Tech Connect em Seattle. Estávamos discutindo o que o Skills Hub mais precisava, e alguém perguntou "você sabe o que esses skills fazem antes de distribuí-los?" Resposta honesta: não realmente. Essa pergunta ficou comigo, e me levou a trabalhar em três atualizações: scanner de segurança, um fluxo de instalação via CLI adequado e um domínio dedicado.

## Scanner de Segurança

Esse foi o que ficou comigo desde aquela conversa no hackathon. Eu estava puxando skills de repositórios upstream que não controlo totalmente, e precisava de uma forma de saber o que havia dentro antes de chegar ao catálogo.

Então construí um scanner automatizado que roda a cada atualização do catálogo. Ele verifica nove categorias de problemas:

- **Execução de comandos shell** — escapes de shell inseguros e injeção de comando
- **Avaliação de código** — `eval()` e execução dinâmica de código
- **Ataques de deserialização** — deserialização de objetos insegura
- **Segredos hardcoded** — chaves de API, tokens, credenciais nos arquivos
- **URLs externas** — requisições de rede inesperadas para servidores terceiros
- **Curl pipe-to-shell** — o clássico padrão `curl | sh`
- **Path traversal** — truques de travessia de diretório
- **Acesso a arquivos sensíveis** — leituras de arquivos de sistema como `/etc/passwd`
- **Injeção SQL** — queries desprotegidas

Skills que passam recebem um badge **Verified** na página de detalhes, com o timestamp da varredura e um detalhamento do que foi verificado.

![Badge Verified mostrado no cabeçalho do skill](/assets/images/2026-03-08-skills-hub-updates/feature-verified-badge.png)

De 225 skills, 212 passaram limpos. 13 foram sinalizados com achados médios a altos. Decidi manter os sinalizados visíveis e baixáveis — fingir que os problemas não existem é pior do que mostrá-los. Melhor surfacear os achados e deixar os desenvolvedores decidirem por si mesmos.

A parte divertida que ninguém te conta sobre construir um scanner de segurança: você acaba lendo cada skill individualmente. Alguns estavam fazendo coisas incrivelmente inteligentes que eu nunca tinha notado. E alguns estavam fazendo coisas que me fizeram pensar "ainda bem que pegamos isso."

## Instalação via CLI

A experiência de instalação original era... aceitável. Baixar um ZIP, extrair, renomear a pasta, torcer para o caminho estar certo. Funcionava, mas parecia desajeitado toda vez que eu mesmo usava.

Eu queria algo mais próximo de como realmente instalamos as coisas — um comando, pronto. Então construí uma extensão do GitHub CLI:

```bash
gh skills-hub install <skill-id>
```

Primeira vez? Só pegar a extensão:

```bash
gh extension install samueltauil/skills-hub
```

Ela lida com a configuração do diretório, valida que tudo chegou corretamente e te dá uma confirmação clara. Cada página de skill agora mostra o comando CLI na frente e no centro com um botão de copiar.

![Extensão GH e comando de instalação mostrados no card de instalação](/assets/images/2026-03-08-skills-hub-updates/feature-gh-extension-install.png)

## skillshub.space

Esse é simples. O Skills Hub costumava ficar em um subdiretório do meu site GitHub Pages. Com 225 skills de múltiplas fontes, parecia que merecia seu próprio endereço:

**<a {% static_href %}href="https://skillshub.space"{% endstatic_href %}>skillshub.space</a>**

Mesma hospedagem, mesma infraestrutura — só mais fácil de compartilhar e lembrar.

![Homepage do Skills Hub em skillshub.space](/assets/images/2026-03-08-skills-hub-updates/feature-homepage-hero.png)

## Onde Estamos Agora

O catálogo atualmente está em **225 skills** em 8 categorias, com **212 verificados** através do scanner de segurança e **13 sinalizados** para revisão. A instalação agora tem três caminhos, com CLI como o recomendado.

## Próximos Passos

Ainda tem muito que quero fazer — submissões da comunidade para que outros possam contribuir com skills, melhor busca e filtragem, integração com extensão do VS Code, e talvez alguns padrões enterprise para times que querem rodar suas próprias coleções curadas. Mas o scanner de segurança e a instalação via CLI parecem a base certa para construir em cima.

**Confira**: <a {% static_href %}href="https://skillshub.space"{% endstatic_href %}>skillshub.space</a> | [Código no GitHub](https://github.com/samueltauil/skills-hub)
