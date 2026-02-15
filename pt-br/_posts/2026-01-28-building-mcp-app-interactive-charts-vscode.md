---
lang: pt-br
layout: post
title: "Construindo um MCP App com Gráficos Interativos para VS Code"
date: 2026-01-28
categories: [mcp, vscode, ai, tutorial]
tags: [mcp, model-context-protocol, chart.js, react, vscode, github-copilot]
---

Neste post, vou te guiar através de um MCP (Model Context Protocol) App que exibe gráficos interativos diretamente no VS Code. Este app demonstra como criar experiências de UI ricas que se integram perfeitamente com assistentes de IA como GitHub Copilot—e a melhor parte? **Todo o código foi gerado pelo GitHub Copilot**.

![MCP Chart App Screenshot](/assets/images/2026-01-28-mcp-chart-app/screenshot.png)

## O Que é MCP?

O [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) é um padrão aberto que permite modelos de IA interagirem com ferramentas externas e fontes de dados. MCP Apps estendem isso permitindo que servidores forneçam componentes de UI interativos que renderizam dentro da aplicação host.

## O Objetivo

O objetivo era criar um MCP server que:
- Aceita dados de gráficos de assistentes de IA
- Renderiza gráficos interativos (barra, linha, pizza, rosca)
- Permite usuários trocarem tipos de gráfico dinamicamente
- Integra com o sistema de temas do VS Code

## Como Foi Construído: GitHub Copilot + Skill Customizada

Aqui está a parte empolgante: **todo o código neste projeto foi gerado pelo GitHub Copilot** usando uma skill customizada projetada especificamente para construir MCP Apps.

A skill ensina Copilot os padrões, APIs e melhores práticas para desenvolvimento de MCP App:

📄 **[create-mcp-app Skill](https://github.com/samueltauil/mcp-chart-app-demo/blob/main/.github/skills/create-mcp-app/SKILL.md)**

Com esta skill habilitada, eu simplesmente descrevi o que queria—"crie um MCP server que exibe gráficos interativos"—e Copilot gerou o projeto inteiro: setup do servidor, registro de ferramentas, componentes React, integração de tema e arquivos de configuração.

Este é um ótimo exemplo de como skills customizadas podem turbinar GitHub Copilot para tarefas de desenvolvimento específicas de domínio.

## Setup do Projeto

### 1. Scaffolding do Projeto

O projeto começa com um setup básico:

```bash
mkdir mcp-chart-app
cd mcp-chart-app
npm init -y
```

### 2. Instalando Dependências

O projeto usa várias dependências chave:

```bash
npm install @modelcontextprotocol/ext-apps @modelcontextprotocol/sdk \
  chart.js react-chartjs-2 react react-dom express cors zod
```

**Dependências de Runtime:**
- `@modelcontextprotocol/ext-apps` - MCP Apps SDK para construir servidores habilitados com UI
- `@modelcontextprotocol/sdk` - Core MCP SDK
- `chart.js` + `react-chartjs-2` - Renderização de gráficos
- `react` + `react-dom` - Framework de UI
- `express` - Servidor HTTP
- `zod` - Validação de schema

### 3. Estrutura do Projeto

```
mcp-chart-app/
├── main.ts              # Entry point - inicia o MCP server
├── server.ts            # Registro de ferramentas e recursos
├── mcp-app.html         # Template HTML
├── src/
│   ├── mcp-app.tsx      # Componente React de UI
│   └── global.css       # Estilos theme-aware
└── dist/                # Output construído
```

## Construindo o Servidor

### Definindo o Schema da Ferramenta

Em `server.ts`, o schema de input é definido usando Zod:

```typescript
import { z } from "zod";

const chartDatasetSchema = z.object({
  label: z.string().describe("Dataset label"),
  data: z.array(z.number()).describe("Array of numeric data values"),
  backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
  borderColor: z.string().optional(),
});

const chartInputSchema = z.object({
  chartType: z.enum(["bar", "line", "pie", "doughnut"]),
  title: z.string(),
  labels: z.array(z.string()),
  datasets: z.array(chartDatasetSchema),
});
```

### Registrando a Ferramenta e Recurso

O MCP Apps SDK fornece helpers para registrar ferramentas com capacidades de UI:

```typescript
import { registerAppTool, registerAppResource } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "MCP Chart App Server",
    version: "1.0.0",
  });

  const resourceUri = "ui://display-chart/mcp-app.html";

  // Registre a ferramenta com metadados de UI
  registerAppTool(
    server,
    "display-chart",
    {
      title: "Display Chart",
      description: "Displays an interactive chart with the provided data",
      inputSchema: chartInputSchema.shape,
      _meta: { ui: { resourceUri } },
    },
    async (args) => {
      // Processe e retorne dados do gráfico
      return {
        content: [{ type: "text", text: JSON.stringify(args) }],
      };
    }
  );

  // Registre o recurso de UI
  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: "text/html" },
    async () => {
      const html = await fs.readFile("dist/mcp-app.html", "utf-8");
      return {
        contents: [{ uri: resourceUri, mimeType: "text/html", text: html }],
      };
    }
  );

  return server;
}
```

## Construindo a UI React

O componente de UI usa os hooks React do MCP Apps:

```tsx
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";

function ChartApp() {
  const [chartData, setChartData] = useState(null);

  const { app, error } = useApp({
    appInfo: { name: "Chart Display App", version: "1.0.0" },
    onAppCreated: (app) => {
      app.ontoolresult = async (result) => {
        const data = JSON.parse(result.content[0].text);
        setChartData(data);
      };
    },
  });

  // Aplique estilos de tema do host
  useHostStyles(app);

  // Renderize gráfico baseado no tipo...
}
```

### Integração de Tema

O CSS usa variáveis CSS que automaticamente se adaptam ao tema do host:

```css
.main {
  background: var(--color-background-primary, #ffffff);
  color: var(--color-text-primary, #1f2937);
}

.chart-container {
  border: 1px solid var(--color-border-primary, #e5e7eb);
  border-radius: var(--border-radius-lg, 12px);
}
```

## Executando o Servidor

### Desenvolvimento Local

```bash
npm run dev
```

Isso inicia o servidor em `http://localhost:3001/mcp` com hot-reload.

### Expondo Publicamente com Cloudflared

Para testar com clientes remotos ou demos, você pode usar [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) para expor o servidor local:

```bash
# Instale cloudflared
winget install --id Cloudflare.cloudflared  # Windows
brew install cloudflared                     # macOS

# Execute servidor com tunnel
npm run public
```

Isso fornece uma URL pública como `https://random-subdomain.trycloudflare.com`.

## Configurando no VS Code

### Método 1: Settings JSON

Adicione ao seu VS Code `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "chart-app": {
        "url": "https://your-tunnel-url.trycloudflare.com/mcp"
      }
    }
  }
}
```

### Método 2: Comando MCP: Add Server

1. Pressione `Ctrl+Shift+P` (ou `Cmd+Shift+P` no macOS)
2. Digite "MCP: Add Server"
3. Escolha transport "HTTP"
4. Digite um nome: `chart-app`
5. Cole a URL: `https://your-tunnel-url.trycloudflare.com/mcp`

## Usando o Chart App

Uma vez configurado, abra GitHub Copilot Chat e experimente prompts como:

> "Puxe dados das minhas métricas de uso do GitHub e exiba em um gráfico de pizza"

**Nota:** Este exemplo requer que o [GitHub MCP Server](https://github.com/github/github-mcp-server) também esteja configurado. O GitHub MCP Server recupera os dados, e então o Chart App visualiza. Isso demonstra como múltiplos MCP servers podem trabalhar juntos—um para recuperação de dados, outro para apresentação.

### Exemplo de Chamada de Ferramenta

A IA chamará a ferramenta `display-chart` com dados como:

```json
{
  "chartType": "pie",
  "title": "GitHub Usage Metrics",
  "labels": ["Commits", "Pull Requests", "Issues", "Reviews"],
  "datasets": [{
    "label": "Activity",
    "data": [142, 38, 25, 67]
  }]
}
```

O gráfico renderiza interativamente no VS Code, e você pode trocar entre tipos de gráfico (barra, linha, pizza, rosca) sem reinvocar a ferramenta.

## Conclusões Principais

1. **MCP Apps habilitam UIs ricas** - Além de respostas de texto, MCP servers podem fornecer componentes visuais interativos.

2. **Integração de tema é perfeita** - Variáveis CSS automaticamente se adaptam aos temas claro/escuro do VS Code.

3. **Múltiplos transportes suportados** - HTTP para desenvolvimento/demos, stdio para integrações de produção.

4. **MCP servers compõem bem** - Combine servidores de busca de dados (como GitHub MCP) com servidores de visualização (como este Chart App) para workflows poderosos.

## Recursos

- [Documentação MCP Apps SDK](https://modelcontextprotocol.io/docs/apps)
- [Repositório GitHub](https://github.com/samueltauil/mcp-chart-app-demo)
- [Especificação Model Context Protocol](https://spec.modelcontextprotocol.io/)

---

*Tem perguntas ou quer ver mais tutoriais MCP? Entre em contato no [GitHub](https://github.com/samueltauil)!*
