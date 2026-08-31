---
lang: pt-br
permalink: /github-copilot/devops/2026/08/29/ssis-packages-copilot-managed-object-model.html
layout: post
title: "Parei de pedir ao Copilot para escrever XML do SSIS"
seo_title: "Geração de Pacotes SSIS com GitHub Copilot"
description: "Em vez de pedir ao Copilot para escrever XML .dtsx, entreguei o modelo de objetos gerenciado do SSIS, e ele gera pacotes que consigo validar e revisar."
date: 2026-08-29
categories: [github-copilot, devops]
tags: [github-copilot, ssis, sql-server, data-engineering, custom-agents, agent-skills, powershell, csharp, developer-tools]
---

Eu estava compartilhando o Visual Studio com um cliente, clicando pelo custom agent, o schema de metadados e as convenções SQL que eu havia colocado em um repositório. Em determinado momento descrevi o que o sistema fazia como algo que "gera e valida o packaging do SSIS." Essa não é a linguagem mais polida para uma demo, mas capturou o que eles queriam: usar o GitHub Copilot para acelerar a criação de pacotes sem pedir para as pessoas babysitarem boilerplate do SSIS. Um pacote SSIS é um arquivo `.dtsx` cheio de identificadores gerados, metadados de componentes, referências de lineagem e estado do designer. Pedir a um modelo que digitasse aquele XML mais rápido não era a resposta. Então, o que o Copilot deveria ter permissão para escrever?

Essa pergunta se tornou o [ssis-copilot-toolkit](https://github.com/samueltauil/ssis-copilot-toolkit). O cliente poderia descrever um pacote de integração no Copilot Chat, pular a maior parte do boilerplate e passar a conversa em como os dados deveriam se mover. O toolkit transformava essa descrição em um projeto SSIS com connection managers, metadados do pacote, um `.dtsx` gerado, SQL de validação e documentação em Markdown que um revisor poderia ler sem abrir o designer.

O que tornou a demo útil foi o limite. O Copilot parou em algo que eu poderia inspecionar.

## A primeira abordagem foi a errada óbvia

Primeiro tentei a rota direta: deixar o Copilot editar o XML do `.dtsx`. Isso durou tempo suficiente para me lembrar por que os desenvolvedores de SSIS evitam revisar o XML de pacotes manualmente.

Eu já havia aprendido uma versão dessa lição trabalhando em projetos Java que dependiam de validação XML. Um documento pode ser XML válido e ainda assim estar errado para o sistema que o consome. O SSIS adiciona mais uma camada porque o designer se preocupa com os relacionamentos entre IDs gerados, metadados de componentes e a lineagem do fluxo de dados. Ver colchetes angulares nunca me deixou nervoso. Ver XML plausível tratado como prova de que um pacote era utilizável, sim.

O formato é documentado, mas isso não o torna uma boa superfície de autoria. Um pacote contém valores `refId`, lineage IDs, propriedades de componentes, caminhos e estados que o designer do Visual Studio espera que estejam de acordo uns com os outros. Um modelo pode produzir XML bem formado que ainda assim falha ao carregar no designer ou quebra quando uma coluna muda upstream. O output parece plausível até o SSIS precisar usá-lo.

O toolkit agora recusa edições diretas em arquivos `.dtsx`, `.dtproj`, `.conmgr` e `.params`. Ele também recusa solicitações para alterar IDs internos. Esses arquivos pertencem ao managed object model do SSIS, a mesma API por trás do designer nativo.

Essa recusa não é um aviso enterrado no README. Ela faz parte do contrato do agent `ssis-author`:

```markdown
1. Never write or edit .dtsx, .dtproj, .conmgr, or .params files directly.
2. Never modify refIds, lineageIds, package GUIDs, or internal identifiers.
3. Never skip the delivery gate.
```

Tenho ficado desconfiado de agents cujo principal feature é quantas coisas eles conseguem fazer. Para essa demo, a lista de coisas que o agent não faria era mais importante.

## JSON como representação intermediária

Enquanto compartilhava o repositório, eu voltava sempre a uma frase: "criando e gerando a partir de um metadata JSON." Minha explicação mais clara é que o toolkit se comporta como um pequeno compilador. O Copilot cuida do front end, onde uma solicitação em linguagem natural se torna uma intenção. O JSON de metadados é uma representação intermediária que podemos revisar. A partir daí, um host determinístico chama o managed object model do SSIS e emite o pacote.

O primeiro pedido na demo foi deliberadamente comum:

```text
/generate-staging-package
Load AdventureWorks2025 Sales.Customer into stg.Customer.
```

O Copilot resolve os schemas reais de origem e destino antes de escrever qualquer coisa. Para o AdventureWorks2025, o repositório inclui uma pinned mapping skill. Em outro banco de dados, o agent recebe instruções para consultar `INFORMATION_SCHEMA.COLUMNS` e confirmar os tipos em vez de preencher lacunas a partir da memória. Se não consegue resolver uma tabela ou coluna, para.

O `Stg_Customer.metadata.json` resultante nomeia as duas conexões, os dois bancos de dados, a source query, sete mapeamentos de colunas, a tabela de destino e se a carga trunca primeiro. Uma linha é fácil de ignorar e importa na prática:

```json
{
  "pattern": "staging",
  "packageName": "Stg_Customer",
  "sourceConnection": "AdventureWorks2025",
  "targetConnection": "CopilotSSIS_Warehouse",
  "targetTable": "stg.Customer",
  "truncateBeforeLoad": true,
  "auditTable": "etl.PackageRun",
  "protectionLevel": "DontSaveSensitive"
}
```

Os metadados completos também contêm um `CAST(c.AccountNumber AS NVARCHAR(10))` explícito. Os tipos de origem e destino diferem, então a conversão pertence à query onde um revisor pode vê-la. Confiar em uma conversão implícita do SSIS pode resultar em um pacote que passa na validação e depois falha em tempo de execução com `0xC02020F6`.

Este JSON é o arquivo que quero em um pull request. Ele descreve a integração sem fingir que as pessoas deveriam revisar os internos do pacote gerado. Mude `truncateBeforeLoad` para `false`, adicione uma coluna mapeada ou altere um atributo rastreado por Type 2 e regenere. O `.dtsx` permanece como um artefato dessa decisão.

## O que transforma o JSON em um pacote

`tools/New-SsisPackage.ps1` é um wrapper simples. Ele valida os nomes das conexões no `.ssis-toolkit.json`, resolve o caminho de output, compila um pequeno executável .NET Framework quando necessário e o chama com o arquivo de metadados.

O executável é o `SsisOmHost.exe`. Seu entry point lê o JSON e despacha para um dos quatro builders em C#:

- `StagingLoad.cs` copia uma origem para `stg.*`, com truncate opcional e linha de auditoria.
- `Type1Dimension.cs` insere novas business keys e sobrescreve atributos correspondentes.
- `Type2Dimension.cs` expira a linha atual e insere uma nova versão quando valores rastreados mudam.
- `FactLoad.cs` resolve surrogate keys de dimensões antes de inserir fatos.

Esses são os únicos quatro formatos que o agent suporta. Peça para ele carregar um fato diretamente de um sistema de origem ou criar um pacote SCD Type 6, e ele recusa. Quatro padrões não cobrem todo o trabalho com SSIS. Eles cobrem o trabalho repetível no estilo Kimball que eu queria demonstrar, e cada um tem um builder que posso testar.

O host em C# existe por uma razão menos glamorosa também. O PowerShell pode carregar boa parte do object model do SSIS, mas não consegue ativar de forma confiável os componentes de design-time do pipeline usados por sources, destinations, lookups e derived columns. O caminho COM falha em `ProvideComponentProperties`. Um processo console .NET Framework compilado com `csc.exe` ativa esses componentes corretamente, então o PowerShell cuida da invocação enquanto o C# é o dono da autoria no object model.

Essa separação é a parte que mais gosto. O binário externo me dá consistência que mais uma página de instruções de agent não consegue dar. O Copilot pode raciocinar sobre o pacote, mas o managed object model ainda precisa construir algo que o designer do SSIS reconheça. Durante a demo, eu poderia dizer que o agent sabia como criar um novo projeto SSIS e, em seguida, mostrar os assets do repositório que tornavam essa afirmação inspecionável em vez de pedir que todos confiassem na janela do chat.

## Gerado não é o mesmo que pronto

Após cada mudança que afeta o SSIS, o `ssis-author` deve entregar o pacote a um agent separado, o `ssis-validator`. O validator não tem ferramenta de edição. Ele pode ler, pesquisar e executar os primitivos de validação, mas não pode reparar um pacote nem fazer o deploy de um.

Dois checks vêm hoje. Primeiro, `Test-SsisPackage.ps1` executa:

```powershell
dtexec.exe /File <package.dtsx> /Validate /WarnAsError
```

Isso captura bindings quebradas, expressões inválidas e erros de tipo no data-flow. Depois, `Test-SsisDesignerLoad.ps1` pede ao managed object model para carregar o pacote e salvá-lo em um arquivo temporário. Isso exercita o mesmo caminho `Application.LoadPackage` usado quando o designer abre um pacote.

O veredicto é estruturado e deliberadamente monótono:

```text
VERDICT: PASS
STEPS:
  1. Test-SsisPackage      : PASS
  2. Test-SsisDesignerLoad : PASS
  3. Build-SsisIspac       : SKIPPED (roadmap)
  4. ssis-clone-roundtrip  : SKIPPED (roadmap)
```

Estou destacando as linhas ignoradas porque elas são limites reais, não notas de rodapé. Compilar o `.ispac` com `SSISBuild.exe` e validar um clone limpo estão projetados no gate, mas ainda não implementados. O prompt `/deploy-and-execute` também recusa hoje porque seus primitivos de build, publicação e execução ainda estão no roadmap.

Há também uma lacuna menor no código atual. A skill de delivery-gate diz que o round trip pelo designer compara um hash estrutural, mas o host atualmente prova apenas que `Application.LoadPackage` e `SaveToXml` são bem-sucedidos e que o arquivo salvo é analisado como XML. Isso ainda é uma verificação útil. Não é ainda a comparação mais rigorosa descrita na skill, e prefiro dizer isso claramente a transformar uma demo em uma afirmação que o código não consegue suportar.

## Tornando utilizável em um repositório SSIS existente

Um repositório de demo limpo é fácil. A pergunta do cliente por trás da maioria das demos é o que acontece com o repositório que eles já têm.

O toolkit tem um installer para brownfield para isso. Execute-o a partir da raiz de um repositório SSIS existente:

```powershell
iex (irm https://raw.githubusercontent.com/samueltauil/ssis-copilot-toolkit/main/install/Add-CopilotSsisToolkit.ps1)
```

O installer copia os agents, skills, prompts, instruções, ferramentas e tasks do VS Code. Por padrão, ele pula arquivos que já existem. Para `AGENTS.md` e `.gitignore`, ele possui apenas um bloco delimitado e substitui esse bloco em uma execução posterior sem reescrever o restante do arquivo.

Um manifest controla ambos os caminhos de distribuição. Sua lista `Overlay` é o que um repositório de cliente recebe. Sua lista `Demo` contém o AdventureWorks, SQL de demo, o walkthrough e scripts de teardown que não devem entrar em uma árvore de cliente. Sua lista `Ignore` captura output de build e artefatos de debug que nunca devem ser entregues. O mesmo manifest também impulsiona o cleanup workflow quando alguém cria um novo repositório a partir do template do GitHub.

Essa parte exigiu mais código do que a demo de chat. Também acho que é a parte que as equipes deveriam copiar. Sem um caminho de upgrade e uma resposta clara sobre quais arquivos o installer possui, a demo termina com um arquivo zip que ninguém quer merge em um repositório de dez anos.

## Os pré-requisitos pouco glamorosos

Isso é SSIS, então a máquina importa. Autoria e validação são exclusivas para Windows. O host atual se vincula aos assemblies do SQL Server 2025 Integration Services, especificamente a versão gerenciada do DTS `17.0.0.0`. Instalar apenas o database engine não é suficiente, e os assemblies do SQL Server 2022 não satisfazem esse requisito.

O repositório inclui `Test-Prerequisites.ps1` porque perdi a paciência com falhas de setup se passando por falhas de agent. Ele roda no Windows PowerShell 5.1 padrão, verifica Git, .NET Framework, os assemblies do SSIS, `dtexec`, configuração, acesso ao SQL e a IDE, e então exibe a remediação exata para cada falha. Com `-Install`, pode instalar Git, PowerShell 7 e o módulo `SqlServer`. Deliberadamente não instala o SQL Server, não restaura o AdventureWorks nem cria o SSISDB.

Isso não é uma abstração cross-platform sobre integração de dados. É um harness focado em torno das ferramentas que as equipes de SSIS já usam.

## No que o cliente poderia se concentrar

Ao final da demo, tínhamos um pacote de integração mais o material circundante que as pessoas costumam adiar: configuração do projeto, conexões, SQL de validação e documentação do pacote cobrindo control flow, data flow, parâmetros e um runbook. Queria que o toolkit absorvesse as verificações repetitivas em torno de colunas, restrições de modelo e convenções de pacote. Isso deixou a conversa humana onde acho que ela pertence: o que a origem significa, como o warehouse deveria modelá-la e o que a carga deve fazer quando a realidade não corresponde ao happy path. Ninguém precisou negociar um lineage ID com um modelo de linguagem.

Um formato gerado não se torna uma boa superfície de autoria para IA simplesmente por ser texto. Quero que o modelo interprete a intenção, verifique o schema ao vivo e produza um pequeno contrato que uma pessoa possa revisar. A API que já conhece o formato pode serializá-lo. Depois, um gate independente tem a última palavra.

Deixe a IA escolher a intenção, não serializar XML.
