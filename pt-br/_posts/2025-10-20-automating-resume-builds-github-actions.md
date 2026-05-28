---
lang: pt-br
permalink: /github/devops/automation/2025/10/20/automating-resume-builds-github-actions.html
layout: post
title: "Automatizando Builds de Currículo com GitHub Actions"
date: 2025-10-20
categories: [github, devops, automation]
tags: [latex, github-actions, ci-cd, automation, devops]
---

Se você já tentou manter um currículo em LaTeX, você sabe que o workflow pode ser frustrante. Você faz uma pequena alteração, executa o comando de compilação, verifica o resultado, percebe que precisa de outra edição, compila novamente – e o ciclo continua. Então você precisa garantir que está fazendo commit tanto do arquivo fonte quanto do PDF gerado, mantendo tudo sincronizado.

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

É simples de personalizar – apenas duas variáveis de ambiente controlam os nomes dos arquivos fonte e de saída.

## Por Que Isso Importa

Para qualquer um mantendo documentos profissionais em LaTeX, automação remove fricção do processo de edição. Você pode focar no conteúdo ao invés das ferramentas. É particularmente útil para currículos já que eles requerem atualizações frequentes mas precisam manter formatação profissional consistente.

## Pegue o Template

O template é licenciado MIT e disponível em: [github.com/samueltauil/latex-resume-template](https://github.com/samueltauil/latex-resume-template)

Se você já enfrentou problemas com processos de build LaTeX ou desenvolveu outras soluções, estou interessado em ouvir como você abordou este problema.

---

*Postado originalmente no [LinkedIn](https://www.linkedin.com/pulse/automating-resume-builds-github-actions-samuel-tauil/)*
