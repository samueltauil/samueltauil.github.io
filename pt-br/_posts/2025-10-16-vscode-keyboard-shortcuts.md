---
lang: pt-br
permalink: /vscode/productivity/2025/10/16/vscode-keyboard-shortcuts.html
layout: post
title: "Aumente Sua Velocidade no VS Code com Atalhos de Teclado"
seo_title: "Atalhos de Teclado do VS Code para Usuários de Copilot"
description: "Os atalhos do VS Code que uso todos os dias, incluindo os keybindings do chat e do inline chat do Copilot que mudaram como me movo pelo editor."
date: 2025-10-16
categories: [vscode, productivity]
tags: [vscode, keyboard-shortcuts, developer-tools, productivity, github-copilot]
---

Eu estava em uma screen sharing na semana passada e me peguei fazendo algo que fez a outra pessoa me interromper: abri um arquivo, pulei para um symbol, dividi o editor e pedi ao Copilot para explicar uma função sem tocar no mouse uma única vez. Ela me pediu para fazer de novo, mais devagar. Esse é todo o valor dos atalhos. Não que eles economizem um segundo cada, mas que eles mantêm você dentro do pensamento que você estava tendo.

Aqui estão os que eu uso constantemente, e depois o conjunto mais novo que importa se você tem o Copilot ligado.

## os clássicos que vale a pena gravar na memória muscular

**Command Palette** te leva a qualquer comando sem precisar caçar nos menus:

- macOS: `⇧⌘P`
- Windows/Linux: `Ctrl+Shift+P`

**Quick Open** pula para um arquivo pelo nome. Esse substituiu o file explorer para mim por completo:

- macOS: `⌘P`
- Windows/Linux: `Ctrl+P`

**Multi-cursor** é aquele que as pessoas ficam olhando e depois perguntam na hora. Coloque cursores com `Alt+Click`, ou adicione um por linha em uma seleção:

- macOS: `⇧⌥I`
- Windows/Linux: `Shift+Alt+I`

Selecione a próxima ocorrência do que estiver destacado, que é como você renomeia seis coisas em quatro segundos:

- macOS: `⌘D`
- Windows/Linux: `Ctrl+D`

**Toggle Sidebar** quando o código precisa da janela inteira:

- macOS: `⌘B`
- Windows/Linux: `Ctrl+B`

**Zen Mode** quando uma revisão precisa de atenção de verdade:

- macOS: `⌘K Z`
- Windows/Linux: `Ctrl+K Z`

## o conjunto do Copilot que ninguém me ensinou

Essa é a parte que mudou no último ano, e é onde vejo mais uso de mouse em pessoas que, de resto, são rápidas. O [VS Code AI features cheat sheet](https://code.visualstudio.com/docs/copilot/reference/copilot-vscode-features) documenta isso, mas é fácil passar batido porque a UI tem botões para tudo.

| Atalho | O que faz |
|---|---|
| `Ctrl+Alt+I` | Abre o Chat view na Secondary Side Bar |
| `Ctrl+I` | Inicia o inline chat, no editor ou no terminal |
| `Ctrl+Shift+Alt+L` | Abre o Quick Chat sem sair do que você está fazendo |
| `Ctrl+Shift+I` | Muda para usar agents no Chat view |
| `Ctrl+N` | Inicia uma nova sessão de chat |
| `Ctrl+Alt+.` | Mostra o model picker |
| `Tab` | Aceita uma sugestão inline, ou avança para a próxima sugestão de edição |
| `Escape` | Descarta a sugestão |

O que realmente reorganizou meu dia é `Ctrl+I` no terminal. Não no editor, no terminal. Eu costumava alternar para um navegador para lembrar alguma invocação de `find`. Agora eu pergunto no próprio lugar e leio o comando antes de rodá-lo. Mesmo ciclo, menos a troca de contexto.

Quick Chat é o segundo que vale a pena aprender deliberadamente. Chat view é um lugar para onde você vai. Quick Chat é algo que você faz e depois descarta, o que combina com as perguntas do tipo "o que essa flag faz", que são a maioria dos meus prompts.

## por que eu não memorizo a coluna do Mac

Esses keybindings são os padrões de Windows e Linux da documentação. Os equivalentes de macOS seguem majoritariamente a convenção da plataforma, mas não de forma uniforme, e eu já errei isso no palco antes. Então, em vez de confiar na minha memória ou em um post de blog, incluindo este, abra o editor de Keyboard Shortcuts com `Ctrl+K Ctrl+S` (`⌘K ⌘S` no macOS) e procure por "chat". Ele mostra o que está de fato vinculado na sua máquina, na sua versão do VS Code, que é a única versão que importa.

Esse editor também é onde você corrige as colisões. `Ctrl+I` em particular tende a brigar com o que mais você tiver vinculado, e vale a pena resolver isso deliberadamente em vez de ficar se perguntando por que o inline chat às vezes não faz nada.

## a ressalva honesta

Atalhos são um problema de adequação pessoal, não de melhores práticas. Já vi engenheiros genuinamente excelentes trabalharem quase inteiramente pelo mouse e entregarem mais rápido do que eu. O motivo pelo qual me importo é mais restrito do que produtividade: toda vez que alcanço o mouse no meio de um pensamento, eu perco o fio do que estava prestes a escrever. Se não é assim que sua atenção funciona, a maior parte dessa lista é ruído.

Escolha dois. Use-os até que fiquem automáticos. Depois volte para mais dois.

## Cheat Sheets Imprimíveis

Pegue os cheat sheets imprimíveis oficiais (teclado US-English):

- [Windows](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf)
- [macOS](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-macos.pdf)
- [Linux](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-linux.pdf)

Explore o [Keybindings & Customization Guide](https://code.visualstudio.com/docs/configure/keybindings#_keyboard-shortcuts-reference) completo

Qual atalho economiza mais tempo para você?

---

*Postado originalmente no [LinkedIn](https://www.linkedin.com/pulse/level-up-your-vs-code-speed-keyboard-shortcuts-samuel-tauil/)*
