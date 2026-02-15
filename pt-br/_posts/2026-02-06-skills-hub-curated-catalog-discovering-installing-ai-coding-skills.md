---
lang: pt-br
layout: post
title: "Skills Hub: Um Catálogo Curado para Descobrir e Instalar Skills de Codificação com IA"
date: 2026-02-06
categories: [github-copilot, open-source, developer-tools]
tags: [github-copilot, astro, github-pages, open-source, developer-tools, skills, automation]
---

GitHub Copilot skills são poderosos. Eles permitem que você ensine ao Copilot como lidar com tarefas de desenvolvimento específicas colocando um arquivo `SKILL.md` no diretório `.github/skills/` do seu repositório. O problema é que skills estão espalhados por dezenas de repositórios sem um lugar central para descobrir, comparar ou instalá-los. É essa lacuna que **Skills Hub** preenche.

![Skills Hub Homepage](/assets/images/2026-02-06-skills-hub/homepage.png)

**Site ao vivo**: [samueltauil.github.io/skills-hub](https://samueltauil.github.io/skills-hub)

**Repositório**: [github.com/samueltauil/skills-hub](https://github.com/samueltauil/skills-hub)

## O Problema

À medida que o ecossistema de skills de GitHub Copilot cresceu, alguns desafios emergiram:

- **Skills estão espalhados por muitos repositórios.** O próprio [awesome-copilot](https://github.com/github/awesome-copilot) do GitHub, [skills](https://github.com/anthropics/skills) do Anthropic, e o repositório [modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps) mantêm suas próprias coleções. Contribuidores comunitários adicionam ainda mais.
- **Não há um mecanismo central de descoberta.** Desenvolvedores não sabem quais skills existem ou como encontrar a certa para seu workflow.
- **A instalação é inconsistente.** Cada repositório tem estruturas diferentes, convenções de nomes e passos de setup. Não há uma forma padrão de pegar um skill e colocá-lo em um projeto.
- **Nenhuma metadados padronizada.** É difícil comparar skills ou entender o que fazem antes de investir tempo baixando-os e lendo-os.

## O que é Skills Hub?

Skills Hub é um catálogo curado e open source para descobrir, navegar e instalar skills de agentes GitHub Copilot. Ele agrega skills de múltiplas fontes em um único hub searchable com download em um clique.

O site atualmente cataloga **51 skills** de **3 repositórios fonte**, organizados em **8 categorias**.

## Recursos Principais

### Catálogo Unificado de Skills

Skills de `github/awesome-copilot`, `anthropics/skills` e `modelcontextprotocol/ext-apps` são agregados em uma única interface navegável. Apenas skills com licenças redistribuíveis (MIT, Apache-2.0, BSD, ISC, CC-BY-4.0) são incluídos. Cada skill exibe sua descrição, categoria, repositório fonte, contagem de arquivos e todos os arquivos incluídos.

### Navegação Baseada em Categorias

Skills são organizados em categorias que cobrem todo o ciclo de vida de desenvolvimento:

| Categoria | Descrição |
|-----------|-----------|
| Git & Version Control | Commits, branching, operações de GitHub |
| Code Quality | Revisões, refatoração, linting |
| Documentation | READMEs, PRDs, redação técnica |
| Diagrams | Mermaid, PlantUML, visualizações |
| Testing | Testes unitários, E2E, automação de testes |
| API & Backend | APIs REST, GraphQL, bancos de dados |
| Frontend & UI | React, Vue, componentes, design |
| DevOps & CI/CD | Pipelines, Docker, Kubernetes |
| Security | Audits, vulnerabilidades, codificação segura |
| Data & Analytics | Pipelines de dados, SQL, analytics |
| Office Documents | Word, Excel, PowerPoint, PDF |
| MCP Development | Desenvolvimento de Model Context Protocol |

Cada categoria tem sua própria página com listagens filtradas, e a homepage exibe cards visuais de categorias para navegação rápida.

![Categories Page](/assets/images/2026-02-06-skills-hub/categories.png)

### Busca e Filtragem

![Browse Skills](/assets/images/2026-02-06-skills-hub/browse-skills.png)

O site suporta busca full-text entre nomes de skills, descrições e tags. Você também pode filtrar por categoria na página de listagem de skills. Um atalho de teclado (`/`) foca a barra de busca para acesso rápido.

### Páginas de Detalhe de Skill

![Skill Detail Page](/assets/images/2026-02-06-skills-hub/skill-detail.png)

Cada skill tem uma página dedicada que inclui:

- **Descrição completa** analisada do frontmatter SKILL.md
- **Visualização de árvore de arquivos** mostrando cada arquivo incluído no skill (SKILL.md, scripts, configs)
- **Visualizador de código com syntax highlighting** permitindo que você expanda qualquer arquivo e leia seu conteúdo diretamente no site
- **Tipos de arquivo com código de cor** (Python em azul, JavaScript em amarelo, TypeScript em azul, JSON em laranja, YAML em roxo, Markdown em verde)
- **Atribuição de fonte** com um link direto ao repositório original

### Instalação em Um Clique

Instalar um skill não deve exigir comandos git complexos, submodules ou configurações de sparse-checkout. Skills Hub fornece três opções de instalação diretamente da página de cada skill:

1. **Download ZIP** baixa a pasta completa do skill como um arquivo ZIP, pronto para extrair em `.github/skills/`
2. **Copy Contents** copia todos os conteúdos de arquivo para sua clipboard
3. **Individual file copy** permite que você copie o conteúdo de um único arquivo

Nenhuma configuração é necessária após a instalação. Copilot descobre skills automaticamente do diretório `.github/skills/` com base em seu frontmatter `name` e `description`.

### Sincronização Automática Semanal

Um workflow GitHub Actions mantém o catálogo atualizado automaticamente:

- Executa todo domingo às 2:00 AM UTC
- Atualiza submodules git de repositórios upstream
- Re-executa o script de agregação para detectar skills novos ou modificados
- Auto-commits e faz push de atualizações
- Gera um job summary relatando skills totais, skills novos encontrados (com nomes) e skills removidos

Isso significa que o catálogo fica atual sem nenhuma intervenção manual.

## Arquitetura Técnica

### Construído com Astro

O site é construído com [Astro](https://astro.build/), um rápido gerador de site estático. Todos os dados de skill são pré-renderizados em tempo de build a partir de um arquivo `skills.json` que o script de agregação produz. Não há banco de dados, nenhuma API, e nenhum servidor backend. Todo o site é hospedado no GitHub Pages gratuitamente.

### O Pipeline de Agregação

O núcleo do projeto é o script de agregação (`scripts/aggregate-skills.js`). Ele processa skills de três repositórios fonte que são incluídos como git submodules:

```javascript
const SOURCES = [
  {
    id: 'awesome-copilot',
    name: 'github/awesome-copilot',
    path: path.join(SOURCES_DIR, 'awesome-copilot', 'skills'),
    repo: 'https://github.com/github/awesome-copilot',
    author: 'github',
    defaultLicense: 'MIT',
    licenseNotice: 'MIT License — Copyright GitHub, Inc.'
  },
  {
    id: 'anthropics-skills',
    name: 'anthropics/skills',
    path: path.join(SOURCES_DIR, 'anthropics-skills', 'skills'),
    repo: 'https://github.com/anthropics/skills',
    author: 'anthropic',
    defaultLicense: 'Apache-2.0',
    licenseNotice: 'Licensed under the Apache License, Version 2.0.'
  },
  {
    id: 'mcp-ext-apps',
    name: 'modelcontextprotocol/ext-apps',
    path: path.join(SOURCES_DIR, 'mcp-ext-apps', 'plugins', 'mcp-apps', 'skills'),
    repo: 'https://github.com/modelcontextprotocol/ext-apps',
    author: 'modelcontextprotocol',
    defaultLicense: 'MIT',
    licenseNotice: 'Licensed under Apache-2.0 (new contributions) / MIT (prior contributions).'
  }
];
```

Para cada pasta de skill, o script:

1. Lê e analisa o arquivo SKILL.md (frontmatter + conteúdo)
2. Coleta recursivamente todos os arquivos na pasta do skill
3. Detecta a licença de arquivos LICENSE na pasta do skill
4. Pula skills com licenças não-redistribuíveis (ex: proprietárias ou "all rights reserved")
5. Auto-categoriza o skill com base em palavras-chave em seu nome e descrição
6. Gera tags do conteúdo
7. Constrói um objeto skill estruturado com toda a metadados e conteúdos de arquivo

A saída é um único arquivo `skills.json` que Astro usa para gerar todas as páginas em tempo de build.

### Auto-Categorização

Skills são automaticamente categorizados usando correspondência de palavras-chave:

```javascript
const CATEGORY_KEYWORDS = {
  'git-version-control': ['git', 'commit', 'branch', 'github', 'version control', 'gh-cli', 'contribution'],
  'code-quality': ['refactor', 'lint', 'quality', 'review', 'clean code', 'vscode-ext'],
  'documentation': ['doc', 'readme', 'prd', 'requirements', 'markdown', 'meeting', 'internal-comms'],
  'diagrams': ['diagram', 'excalidraw', 'plantuml', 'mermaid', 'visualization', 'circuit'],
  'testing': ['test', 'e2e', 'unit test', 'qa', 'playwright', 'chrome-devtools', 'webapp-testing'],
  'api-backend': ['api', 'rest', 'graphql', 'backend', 'sdk', 'nuget'],
  'frontend-ui': ['frontend', 'ui', 'react', 'css', 'design', 'canvas', 'image', 'brand', 'theme'],
  'devops-cicd': ['deploy', 'ci', 'cd', 'docker', 'kubernetes', 'terraform', 'azure', 'appinsights'],
  'security': ['security', 'auth', 'rbac', 'role', 'permission'],
  'data-analytics': ['data', 'analytics', 'sql', 'powerbi', 'snowflake'],
  'office-documents': ['docx', 'xlsx', 'pptx', 'pdf', 'word', 'excel', 'powerpoint'],
  'mcp-development': ['mcp', 'model context protocol', 'skill-creator', 'make-skill']
};
```

### Estrutura do Projeto

```
skills-hub/
  .github/
    workflows/        # CI/CD para deployment e validação
    ISSUE_TEMPLATE/   # Templates de issue
    PULL_REQUEST_TEMPLATE/
  site/               # Site estático Astro
    src/
      pages/          # Páginas do site (index, skills, categories)
      components/     # Componentes UI (SkillCard, CategoryCard, SearchBar)
      layouts/        # Layouts de página
      data/           # skills.json gerado
    public/           # Ativos estáticos
  scripts/            # Script de agregação
  skills/
    schema.json       # Schema de metadados de skill
    registry.json     # Catálogo de skills
  sources/            # Git submodules (repositórios upstream)
  CONTRIBUTING.md     # Como adicionar skills
```

### Design

O site usa um tema escuro com uma paleta de cores inspirada em GitHub. O cabeçalho tem um efeito glassmorphism com backdrop blur. A seção hero inclui orbes de brilho com gradiente animado e efeito de texto shimmer. Cards de skill têm efeitos hover com transições de elevação e sombra. O layout é totalmente responsivo em mobile, tablet e desktop, com suporte de acessibilidade incluindo `prefers-reduced-motion`, outlines `focus-visible`, e HTML semântico.

## Contribuições da Comunidade

Skills Hub é projetado para participação comunitária. O repositório inclui:

- Um [CONTRIBUTING.md](https://github.com/samueltauil/skills-hub/blob/main/CONTRIBUTING.md) detalhado com instruções passo a passo para adicionar skills
- Um JSON schema para entradas de skill no registry
- Templates de PR tanto para contribuições gerais quanto para submissões específicas de skill
- Templates de issue para bug reports e requisições de categoria
- Validação de CI em pull requests que verifica formato JSON, campos obrigatórios, detecção de duplicatas e validade de URL

Adicionar um novo skill é direto:

1. Faça fork do repositório
2. Adicione sua entrada de skill em `skills/registry.json`
3. Submeta um Pull Request
4. GitHub Actions valida a submissão automaticamente

## Quem se Beneficia

| Audiência | Benefício |
|-----------|-----------|
| **Developers** | Descobrem skills que não conheciam e instalam em segundos |
| **Teams** | Padronizam quais skills o time usa em todos os projetos |
| **Skill authors** | Conseguem visibilidade para seus skills através de um catálogo central |
| **Open source community** | Processo fácil de contribuição para crescer o catálogo |

## Executando Localmente

Se você quer executar o site localmente ou contribuir:

```bash
# Clone o repositório
git clone https://github.com/samueltauil/skills-hub.git
cd skills-hub

# Instale dependências e inicie o servidor dev
cd site
pnpm install
pnpm dev
```

Node.js 18+ é necessário.

## O que Vem Depois

Há várias features planejadas para versões futuras:

- **CLI installer** (`npx skills-hub install <name>`) para workflows baseados em terminal
- **Skill ratings and usage stats** para surfacear os skills mais populares
- **Mais repositórios fonte** incluindo submissões comunitárias
- **Skill compatibility badges** para VS Code, JetBrains e outros editors
- **Custom domain** (skills-hub.dev)

## Recursos

- [Live Site](https://samueltauil.github.io/skills-hub)
- [GitHub Repository](https://github.com/samueltauil/skills-hub)
- [Contributing Guide](https://github.com/samueltauil/skills-hub/blob/main/CONTRIBUTING.md)

---

*Skills Hub é open source sob a licença MIT. Contribuições são bem-vindas. Se você tem um skill que quer que outros descubram, submeta um pull request ao [repositório](https://github.com/samueltauil/skills-hub).*
