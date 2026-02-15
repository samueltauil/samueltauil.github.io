---
layout: post
title: "Copilot Compass: Navegue Sua Adoção de GitHub Copilot com Insights Acionáveis"
date: 2026-02-02
categories: [mcp, github-copilot, analytics, vscode]
tags: [mcp, model-context-protocol, github-copilot, react, vscode, analytics, dashboard]
---

Medir a adoção de GitHub Copilot em toda a sua organização pode ser desafiador. Enquanto GitHub fornece métricas de uso através de APIs, transformar esses dados brutos em inteligência acionável requer ferramentas adicionais. É aí que entra o **Copilot Compass**.

![Copilot Compass Dashboard](https://raw.githubusercontent.com/samueltauil/copilot-compass/main/docs/report-result.png)

## O que é Copilot Compass?

[Copilot Compass](https://github.com/samueltauil/copilot-compass) é uma aplicação MCP (Model Context Protocol) que transforma métricas brutes de GitHub Copilot em um dashboard visual interativo. Construído com o MCP Apps SDK, ele fornece tanto dados legíveis por IA quanto uma interface React que renderiza diretamente em hosts compatíveis com MCP como VS Code e Claude Desktop.

### Diferenciadores Principais

Diferentemente de dashboards tradicionais, Copilot Compass aproveita o padrão MCP Apps SDK:

- **Orientado por IA**: As ferramentas retornam dados estruturados que modelos de IA podem analisar e resumir
- **Dashboard Visual**: A mesma invocação de tool renderiza uma interface React interativa no host
- **Sincronização em Tempo Real**: A interface se atualiza automaticamente quando novos dados chegam via `ontoolresult`
- **Tema do Host**: O dashboard se adapta ao esquema de cores do host via `useHostStyles`

## Recursos Principais

### Dashboard de Analytics

O dashboard fornece analytics abrangentes em várias dimensões:

| Métrica | O Que Mede | Por Que Importa |
|--------|-----------|----------------|
| **Active Users** | Usuários únicos que receberam sugestões de Copilot | Amplitude de adoção |
| **Engaged Users** | Usuários que aceitaram pelo menos uma sugestão | Extração ativa de valor |
| **Acceptance Rate** | Sugestões aceitas divididas pelo total de sugestões | Qualidade das sugestões |
| **Lines Accepted** | Linhas reais de código integradas do Copilot | Impacto na produtividade |
| **Chat Sessions** | Conversas de Copilot Chat iniciadas | Uso de pair programming com IA |
| **Code Insertions** | Código gerado por Chat adicionado aos arquivos | Valor da codificação conversacional |
| **PR Summaries** | Descrições de pull request auto-geradas | Eficiência do processo de revisão |

### Visualizações

O dashboard inclui múltiplos tipos de visualização:

- **Active Users Trend** - Gráfico de linha de 14 dias com contagens diárias de usuários ativos
- **Acceptance Rate** - Acompanhe a aceitação de sugestões de código ao longo do tempo
- **Language Breakdown** - Principais linguagens por sugestões, aceitações e usuários engajados
- **Editor Distribution** - Divisão de uso entre VS Code, JetBrains, Neovim e outros
- **Chat Metrics** - Sessões, inserções de código e eventos de cópia do Copilot Chat
- **PR Intelligence** - Estatísticas de geração de resumos de pull request

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0;">
  <img src="https://raw.githubusercontent.com/samueltauil/copilot-compass/main/docs/report1.png" alt="Visão Geral do Dashboard" style="width: 100%;">
  <img src="https://raw.githubusercontent.com/samueltauil/copilot-compass/main/docs/report2.png" alt="Tendências de Uso" style="width: 100%;">
  <img src="https://raw.githubusercontent.com/samueltauil/copilot-compass/main/docs/report3.png" alt="Divisão por Linguagem" style="width: 100%;">
  <img src="https://raw.githubusercontent.com/samueltauil/copilot-compass/main/docs/report4.png" alt="Métricas de Editor e Chat" style="width: 100%;">
</div>

## Primeiros Passos

### Pré-requisitos

- **Node.js** 18+
- **VS Code Insiders** - Necessário para MCP Apps SDK (dashboard interativo). [Baixe aqui](https://code.visualstudio.com/insiders/).
- **GitHub PAT** com escopos:
  - `manage_billing:copilot` - Acesso às métricas de Copilot
  - `read:enterprise` - Acesso em nível corporativo
  - `read:org` - Métricas da organização

### Instalação

```bash
# Clone o repositório
git clone https://github.com/samueltauil/copilot-compass.git
cd copilot-compass

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite .env e adicione seu GITHUB_TOKEN
```

### Build e Execução

```bash
# Construa o dashboard React e o servidor TypeScript
npm run build

# Inicie o servidor MCP
npm start
```

O servidor inicia em `http://localhost:3001` com:
- **MCP Endpoint**: `http://localhost:3001/mcp`
- **Health Check**: `http://localhost:3001/health`

### Conectando ao VS Code

Adicione à sua configuração MCP no VS Code:

```json
{
  "mcpServers": {
    "copilot-compass": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

Alternativamente, use o comando integrado:

1. Pressione `Ctrl+Shift+P` (ou `Cmd+Shift+P` no macOS)
2. Digite "MCP: Add Server"
3. Escolha o transporte "HTTP"
4. Insira um nome: `copilot-compass`
5. Cole a URL: `http://localhost:3001/mcp`

## Usando Copilot Compass

Uma vez configurado, abra GitHub Copilot Chat e solicite um relatório:

```
Generate a Copilot report for enterprise "acme-corp" from 2024-01-01 to 2024-01-31
```

A IA chamará a tool `generate_copilot_report`, que:

1. Busca métricas da API de GitHub Copilot
2. Transforma os dados em um relatório estruturado
3. Retorna JSON à IA para resumo
4. Renderiza o dashboard interativo no VS Code

### Parâmetros da Tool

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|------------|-----------|
| `enterpriseSlug` | string | Sim | Identificador da corporação |
| `orgName` | string | Não | Organização dentro da corporação |
| `dateRange.from` | string | Sim | Data inicial (YYYY-MM-DD) |
| `dateRange.to` | string | Sim | Data final (YYYY-MM-DD) |

### Métricas de Corporação vs Organização

Copilot Compass suporta a busca de métricas em dois níveis, ambos usando a mesma estrutura de dados subjacente, mas com escopos diferentes:

**Nível de Corporação** (`/enterprises/{enterprise}/copilot/metrics`)
- Agrega dados de uso em todas as organizações da corporação
- Requer um GitHub PAT com escopos `manage_billing:copilot` e `read:enterprise`
- Fornece uma visão holística da adoção de Copilot em toda a empresa
- Ideal para executivos e times de plataforma rastreando adoção em toda a empresa

**Nível de Organização** (`/orgs/{org}/copilot/metrics`)
- Escopo de uma única organização
- Requer um GitHub PAT com escopos `manage_billing:copilot` e `read:org`
- Útil para admins de org rastreando o uso específico do seu time
- Ideal para líderes de time e relatórios em nível departamental

Ambos os níveis retornam a mesma estrutura de métricas:

| Categoria de Métrica | Dados Incluídos |
|---------------------|-----------------|
| **Code Completions** | Sugestões, aceitações, linhas de código, taxa de aceitação |
| **Language Breakdown** | Estatísticas por linguagem (TypeScript, Python, etc.) |
| **Editor Distribution** | Uso por IDE (VS Code, JetBrains, Neovim) |
| **IDE Chat** | Sessões de chat, inserções de código, eventos de cópia |
| **Dotcom Chat** | Uso de Copilot Chat no GitHub.com |
| **Pull Requests** | Estatísticas de geração de resumo de PR por repositório |

Para usar métricas em nível de organização em vez de corporação, basta fornecer o parâmetro `orgName`:

```
Generate a Copilot report for organization "my-team" from 2024-01-01 to 2024-01-31
```

## Arquitetura

A aplicação segue um padrão típico de MCP Apps com vinculação tool-UI:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MCP HOST (VS Code / Claude Desktop)                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌────────┐      ┌────────────┐      ┌──────────────────────────────┐   │
│   │  USER  │ ───► │  AI MODEL  │ ───► │   COPILOT COMPASS SERVER     │   │
│   └────────┘      └────────────┘      └──────────────────────────────┘   │
│                          │                          │                    │
│                          │                          │                    │
│                          ▼                          ▼                    │
│                   ┌─────────────┐          ┌────────────────────┐        │
│                   │ AI SUMMARY  │          │   REACT DASHBOARD  │        │
│                   │             │          │                    │        │
│                   │ - Insights  │          │  - useApp() hook   │        │
│                   │ - Trends    │          │  - Chart.js viz    │        │
│                   │ - Actions   │          │  - Host theming    │        │
│                   └─────────────┘          └────────────────────┘        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Fetches metrics
                                       ▼
                            ┌──────────────────────┐
                            │     GITHUB API       │
                            │  /copilot/metrics    │
                            └──────────────────────┘
```

**Como Funciona:**

1. **User Request**: O usuário solicita um relatório de Copilot em linguagem natural via GitHub Copilot Chat
2. **AI Processing**: O modelo de IA analisa a solicitação e chama a tool `generate_copilot_report` com os parâmetros apropriados
3. **Data Fetching**: O servidor Copilot Compass busca métricas de uso da API de GitHub Copilot
4. **Dual Response**: O servidor retorna dados JSON estruturados que:
   - O modelo de IA recebe e resume em insights acionáveis
   - O dashboard React renderiza como visualizações interativas
5. **User Experience**: O usuário vê tanto o resumo em linguagem natural da IA quanto o dashboard visual lado a lado

### Componentes Principais

**Server Side (`server.ts`):**

```typescript
import { registerAppTool, registerAppResource } from "@modelcontextprotocol/ext-apps/server";

// Register the tool with UI metadata
registerAppTool(
  server,
  "generate_copilot_report",
  {
    title: "Generate Copilot Report",
    description: "Generate a comprehensive Copilot usage report",
    inputSchema: reportInputSchema.shape,
    _meta: { ui: { resourceUri } },
  },
  async (args) => {
    const report = await generateReport(args);
    return {
      content: [{ type: "text", text: JSON.stringify(report) }],
    };
  }
);
```

**Client Side (`mcp-app.tsx`):**

```tsx
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";

function CopilotCompassApp() {
  const [report, setReport] = useState(null);

  const { app, error } = useApp({
    appInfo: { name: "Copilot Compass", version: "1.0.0" },
    onAppCreated: (app) => {
      app.ontoolresult = async (result) => {
        const data = JSON.parse(result.content[0].text);
        setReport(data);
      };
    },
  });

  // Apply host theme styles
  useHostStyles(app);

  // Render dashboard with Chart.js visualizations
}
```

## Executando no GitHub Codespaces

Para a configuração mais rápida, use GitHub Codespaces:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/samueltauil/copilot-compass?quickstart=1)

Quando seu Codespace iniciar:
1. As dependências são instaladas e o projeto é construído
2. O servidor MCP inicia automaticamente na porta 3001
3. A porta 3001 é tornada pública com HTTPS
4. A configuração MCP é criada automaticamente

### Compatibilidade de MCP Apps SDK e VS Code

A interface de dashboard interativa se baseia no **MCP Apps SDK**, que atualmente só é suportado no **VS Code Insiders**. O editor web do Codespaces usa VS Code Stable, que suporta tools MCP básicas, mas ainda não renderiza a interface de dashboard visual.

**Suas opções:**

1. **Conectar do VS Code Insiders Desktop (recomendado para interface completa)**: Instale [VS Code Insiders](https://code.visualstudio.com/insiders/) localmente, adicione a [extensão GitHub Codespaces](https://marketplace.visualstudio.com/items?itemName=GitHub.codespaces), e conecte ao seu Codespace a partir daí.

2. **Usar o editor web do Codespaces (apenas tools)**: As tools MCP funcionarão e retornarão dados JSON que a IA pode resumir, mas o dashboard React interativo não será renderizado.

O suporte MCP Apps SDK deve chegar no VS Code Stable em uma versão futura. Para as atualizações mais recentes sobre suporte MCP no VS Code, veja a [documentação oficial MCP](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) e o [repositório MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps).

## Expondo Publicamente com Cloudflare Tunnel

Para acesso remoto ou compartilhamento, você pode expor o servidor local usando Cloudflare Tunnel.

### Método Rápido

O projeto inclui um script de conveniência que inicia tanto o servidor quanto o tunnel:

```bash
npm run public
```

Este comando constrói o projeto, inicia o servidor MCP e cria um tunnel Cloudflare em uma única etapa.

### Método Manual

Se você preferir executar os passos separadamente:

```bash
# Instale cloudflared
winget install cloudflare.cloudflared  # Windows
brew install cloudflared                # macOS

# Em um terminal, inicie o servidor MCP
npm start

# Em outro terminal, crie o tunnel
cloudflared tunnel --url http://localhost:3001
```

O cloudflared retorna uma URL pública como `https://random-words.trycloudflare.com`. Use isso na sua configuração de cliente MCP:

```json
{
  "mcpServers": {
    "copilot-compass": {
      "type": "http",
      "url": "https://random-words.trycloudflare.com/mcp"
    }
  }
}
```

### Configurando no VS Code via Command Palette

Uma vez que você tenha a URL do tunnel, você pode adicionar o servidor MCP diretamente do VS Code:

1. Pressione `Ctrl+Shift+P` (ou `Cmd+Shift+P` no macOS) para abrir a Command Palette
2. Digite **"MCP: Add Server"** e selecione
3. Escolha **"HTTP"** como o tipo de servidor
4. Insira um nome para o servidor: `copilot-compass`
5. Cole sua URL do tunnel com o caminho `/mcp`: `https://random-words.trycloudflare.com/mcp`
6. Pressione Enter para confirmar

VS Code adicionará o servidor à sua configuração MCP e estará disponível no GitHub Copilot Chat imediatamente.

## Modo Demo

Se você não tiver um token GitHub com as permissões necessárias, Copilot Compass automaticamente volta para o modo demo com dados mock realistas. Isso permite que você explore o dashboard e entenda suas capacidades sem precisar de acesso em nível corporativo.

## Principais Aprendizados

1. **Métricas de adoção de Copilot são valiosas** - Entender como seu time usa Copilot ajuda a otimizar seu deployment e identificar oportunidades de treinamento.

2. **MCP Apps habilitam interfaces ricas** - Além de respostas de texto, servidores MCP podem fornecer componentes visuais interativos que renderizam diretamente na aplicação host.

3. **IA e visualizações trabalham juntas** - A IA resume insights enquanto o dashboard fornece capacidades de exploração detalhada.

4. **Múltiplas opções de deployment** - Execute localmente, no Codespaces, ou exponha publicamente com serviços de tunelamento.

## Recursos

- [GitHub Repository](https://github.com/samueltauil/copilot-compass)
- [MCP Apps SDK Documentation](https://modelcontextprotocol.io/docs/apps)
- [GitHub Copilot Metrics API](https://docs.github.com/en/rest/copilot/copilot-metrics)

---

*Tem dúvidas ou quer contribuir? Confira o [repositório GitHub](https://github.com/samueltauil/copilot-compass)!*
