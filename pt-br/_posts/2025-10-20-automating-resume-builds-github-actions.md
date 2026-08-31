---
lang: pt-br
permalink: /github/devops/automation/2025/10/20/automating-resume-builds-github-actions.html
layout: post
title: "Automatizando Builds de Currículo com GitHub Actions"
seo_title: "Build Automático de Currículo LaTeX com GitHub Actions"
description: "Como configurei o GitHub Actions para compilar meu currículo em LaTeX e publicar o PDF automaticamente, mantendo fonte e saída em sincronia."
date: 2025-10-20
categories: [github, devops, automation]
tags: [latex, github-actions, ci-cd, automation, devops]
---

Se você já tentou manter um currículo em LaTeX, você sabe que o workflow pode ser frustrante. Você faz uma pequena alteração, executa o comando de compilação, verifica o resultado, percebe que precisa de outra edição, compila novamente, e o ciclo continua. Então você precisa garantir que está fazendo commit tanto do arquivo fonte quanto do PDF gerado, mantendo tudo sincronizado.

Para desenvolvedores que já usam GitHub para controle de versão, há uma abordagem melhor.

## O Problema com Workflows Tradicionais de LaTeX

A maioria das pessoas compila documentos LaTeX localmente, o que significa:

- Você precisa de uma distribuição LaTeX completa instalada na sua máquina
- Cada colaborador ou dispositivo precisa do mesmo setup
- PDFs e arquivos fonte podem facilmente ficar dessincronizados
- Compartilhar a versão mais recente requer compilação e upload manuais

## Uma Solução Usando GitHub Actions

Eu criei um template que automatiza todo o processo de build. Quando você faz push de alterações no seu arquivo fonte LaTeX, um workflow do GitHub Actions compila automaticamente o documento e faz commit do PDF de volta ao repositório. O PDF compilado também fica disponível como um artefato do workflow.

Isso significa que você pode editar seu currículo de qualquer máquina com acesso git, mesmo sem LaTeX instalado localmente. A automação cuida da compilação, e o controle de versão mantém tudo sincronizado.

## O Setup

O template inclui um workflow pré-configurado que:

- Compila LaTeX usando um ambiente containerizado
- Faz upload do PDF como um artefato baixável
- Faz commit do PDF gerado de volta ao repositório
- Executa automaticamente a cada push

É simples de personalizar. Apenas duas variáveis de ambiente controlam os nomes dos arquivos fonte e de saída.

## o que o workflow realmente faz

O workflow vive em `.github/workflows/build-resume.yml` e executa quatro passos a cada push:

1. **Checkout do repositório** para obter a fonte mais recente
2. **Compila o LaTeX** usando o container [`xu-cheng/latex-action`](https://github.com/xu-cheng/latex-action), então nenhuma distribuição LaTeX é instalada no runner ou na sua máquina
3. **Upload do PDF** como um artefato do workflow que você pode baixar direto do resumo da run
4. **Commit do PDF de volta** ao repositório, mas só quando ele realmente mudou

Duas variáveis controlam a nomenclatura, e são a única coisa que a maioria das pessoas precisa mexer:

| Variável | Descrição | Padrão |
|---|---|---|
| `TEX_FILE` | Nome do arquivo fonte LaTeX | `my-resume.tex` |
| `PDF_FILE` | Nome do PDF gerado | `my-resume.pdf` |

Renomeie seus arquivos, atualize esses dois valores, e o resto continua funcionando.

## o passo que demorou mais para acertar

Fazer commit de um artefato de build de volta no mesmo repositório que disparou o build parece uma maneira óbvia de criar um loop infinito. Push dispara o workflow, o workflow faz commit do PDF, o commit dispara o workflow, e assim por diante até alguém notar os minutos do Actions.

Isso não entra em loop, por dois motivos que vale a pena entender em vez de só copiar. O passo de commit só roda quando o conteúdo do PDF realmente difere, então um rebuild que produz bytes idênticos não escreve nada e não faz push de nada. E commits feitos com o `GITHUB_TOKEN` padrão não disparam novas execuções do workflow, um comportamento deliberado do GitHub que existe exatamente para esse padrão.

O segundo ponto é a parte que sustenta tudo. Se você trocar por um personal access token para contornar algum outro problema de permissão, você perde essa proteção e vai ter o loop.

## por que o container importa mais do que a automação

A automação é legal. O container é a correção de verdade. O `latex-action` puxa um ambiente TeX Live completo, o que significa que o build é idêntico rodando no meu notebook, na minha máquina de trabalho, ou em um runner do GitHub que eu nunca vi.

Quem já instalou uma distribuição LaTeX conhece o modo de falha que isso remove. Você recebe um erro de pacote ausente, instala o pacote, recebe um erro de pacote diferente, e quarenta minutos depois está lendo uma resposta do Stack Overflow de 2013 sobre font maps. Fazer isso uma vez é chato. Fazer de novo em uma máquina nova dois anos depois, porque você precisa corrigir um typo no currículo, foi o que me fez construir isso.

Se você quiser o PDF localmente ainda pode compilar direto:

```bash
pdflatex my-resume.tex
```

Rode duas vezes se você adicionou referências ou um sumário, já que a primeira passada gera os arquivos auxiliares que a segunda passada lê.

## Por Que Isso Importa

Para qualquer um mantendo documentos profissionais em LaTeX, automação remove fricção do processo de edição. Você pode focar no conteúdo ao invés das ferramentas. É particularmente útil para currículos já que eles requerem atualizações frequentes mas precisam manter formatação profissional consistente.

Existe um limite que vale a pena nomear. Isso não é uma boa escolha para documentos com colaboradores de verdade, porque um PDF commitado a cada push produz conflitos de merge em um arquivo binário, o que ninguém gosta de resolver. Para um documento de autor único que você edita algumas vezes por ano e precisa sempre ter atualizado, é quase ideal.

## Pegue o Template

O template é licenciado MIT e disponível em: [github.com/samueltauil/latex-resume-template](https://github.com/samueltauil/latex-resume-template)

Clique em **Use this template**, edite `my-resume.tex`, e faça push. O primeiro build produz seu PDF.

Se você já enfrentou problemas com processos de build LaTeX ou desenvolveu outras soluções, estou interessado em ouvir como você abordou este problema.

---

*Postado originalmente no [LinkedIn](https://www.linkedin.com/pulse/automating-resume-builds-github-actions-samuel-tauil/)*
