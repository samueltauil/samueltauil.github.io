---
lang: pt-br
permalink: /github-copilot/healthcare/2026/08/03/fhir-compliance-skill-copilot-code-review.html
layout: post
title: "Bem formado não é a mesma coisa que seguro para construir"
date: 2026-08-03
categories: [github-copilot, healthcare]
tags: [github-copilot, code-review, agent-skills, healthcare, fhir, hl7, interoperability, hipaa, typescript]
---

`npm test` retornou com dezenove passando e zero falhando. Então chamei o endpoint que esses testes cobrem e li o JSON retornado. Em um campo de texto livre de uma Observation clínica estava o número do seguro social de um paciente. O suite estava verde. O recurso estava errado de quatro maneiras distintas, e uma delas é o tipo de coisa que acaba em uma notificação de violação.

Escrevi dessa forma de propósito. [fhir-compliance-copilot](https://github.com/samueltauil/fhir-compliance-copilot) é um pequeno serviço TypeScript que serve recursos clínicos em FHIR R4, a quarta versão do Fast Healthcare Interoperability Resources, o padrão HL7 sobre o qual a maior parte da integração em saúde moderna é construída. Ele contém oito violações deliberadas do R4 espalhadas por três rotas. Cada violação passa no suite de testes, porque os testes afirmam sobre a forma que meu código produz, e meu código produz exatamente o que eu mandei. Os dados de pacientes são saídas do Synthea, então o SSN é um valor sintético `999-XX-XXXX` que a Administração da Seguridade Social nunca emitiu para ninguém. Esse detalhe importa para a demo e, como se descobriu, não importa nada para a regra.

A pergunta que tentei responder surgiu de muitas conversas na área de saúde que seguem mais ou menos o mesmo caminho. Validamos FHIR na integração contínua, então estamos cobertos. Eu queria descobrir onde essa frase deixa de ser verdade.

## O que um validador está verificando

Um validador FHIR lê uma instância de recurso. Você entrega um JSON, ele verifica contra as definições de estrutura do R4 e os bindings de terminologia, e te diz se o que você construiu é legal. Isso é genuinamente útil, e três das minhas quatro violações na Observation teriam sido detectadas por ele.

Aqui está a função que as produz, simplificada:

```ts
return {
  resourceType: 'Observation',
  id: randomUUID(),
  status: 'final_result',              // V1
  // V2: category array is absent
  subject: { reference: `Patient/${patientId}` },
  code: { coding: [{ system: 'http://loinc.org', code: loincCode, display: 'Heart rate' }] },
  valueQuantity: {
    value,
    unit,                              // V3: no system, no code
  },
  note: auditRef ? [{ text: `Audit ref: ${auditRef}` }] : undefined,  // V4
};
```

Três delas são erros estruturais comuns. `final_result` não é um dos valores que o R4 permite para `status`, e o R4 é rigoroso com essa lista. `category` está ausente, o que quebra o profile que a spec espera quando você publica sinais vitais. `valueQuantity` reporta `/min` como uma string simples, sem nada para indicar de qual vocabulário de unidades esses caracteres vieram, então um sistema receptor recebe um rótulo em vez de algo com que possa calcular. Um validador captura os três sem muito esforço.

Depois temos a V4. `auditRef` é o SSN do paciente, e ele aparece em `note[].text` como `Audit ref: 999-XX-XXXX`. Isso é uma string schema-válida em um campo schema-válido, então o validador não tem nada a dizer sobre ela.

O restante do meu toolchain está respondendo perguntas diferentes. O secret scanning não tem nenhum segredo para encontrar, porque o que foi commitado foi apenas uma referência de variável. O CodeQL rastreia dados contaminados até sinks que foi ensinado a reconhecer, e um campo de nota em um corpo de resposta FHIR não é um deles por padrão. Você poderia ensiná-lo com uma query customizada, e para um codebase grande de saúde essa é uma opção séria. Eu queria a regra escrita em algum lugar que um arquiteto de saúde pudesse ler. Cada uma dessas ferramentas está fazendo precisamente o trabalho para o qual foi projetada. A lacuna está entre elas.

O Departamento de Saúde e Serviços Humanos não é tão relaxado. Números de seguro social são o identificador (G) na lista Safe Harbor, e a orientação de de-identificação responde diretamente à questão do texto livre: o padrão "não faz distinção entre dados inseridos em campos padronizados e informações inseridas como texto livre", e um identificador "deve ser removido independentemente de sua localização em um registro se for reconhecível como um identificador." O campo que você escolheu não é uma defesa.

## A última vez que vi isso, era delimitado por pipe

Não sou neutro sobre esse assunto. Anos atrás no Brasil trabalhei no [SIGA Saúde](https://ezute.org.br/siga-saude/), o sistema integrado de gestão em saúde da rede municipal de São Paulo. Está em produção desde 2004 em mais de 980 unidades, e os números públicos colocam em torno de 22 milhões de usuários cadastrados e 1,3 milhões de consultas por mês. Agendamento, regulação de acesso, o prontuário eletrônico do paciente, o cartão nacional de saúde, autorizações de procedimentos de alta complexidade, tudo em uma plataforma que se comunica com o Ministério da Saúde via mensagens HL7 e um par de profiles de identidade de paciente chamados PIX e PDQ. Os [manuais operacionais](https://repositoriosistemas.smsprefeiturasp.com.br/Manuais/) ainda são publicados abertamente pela prefeitura, o que diz algo sobre como o projeto foi estruturado.

PIX e PDQ são os dois em que ainda penso. O Patient Identifier Cross-referencing permite que dois sistemas reconciliem os diferentes identificadores que cada um mantém para a mesma pessoa. O Patient Demographics Query permite que um sistema busque alguém pelo nome e data de nascimento e receba um identificador de volta. Ambos existem para que dois sistemas possam concordar sobre qual paciente estão discutindo sem precisar enviar um número de identidade nacional de um lado para o outro. Você cadastra o paciente uma vez, o índice fornece um identificador, e a partir daí você referencia o identificador. Toda a arquitetura é um argumento longo e cuidadoso contra exatamente a linha que escrevi em `observation.ts`.

O FHIR substituiu os segmentos delimitados por pipe que eu lia naquela época, e o tooling ao redor dele é enormemente melhor. O erro não mudou. Alguém precisa de um valor para debug, o campo mais próximo que aceita uma string é um campo de texto livre, lá vai, e é commitado. O formato de serialização avançou e o modo de falha permaneceu exatamente onde estava, ainda esperando que um humano perceba antes do merge.

Essa última parte é a razão principal pela qual fui buscar um tipo diferente de verificação. Ela sobrevive à revisão porque um revisor lê um diff pelo que mudou, e o que mudou aqui foi uma variável inserida em um template string. Não há nada alarmante na sintaxe. A parte alarmante é semântica, e ela vive no que `auditRef` acontece de conter dois arquivos atrás. Você detecta se já sabe disso, o que na prática significa que detecta se você escreveu o outro arquivo, ou se você é a pessoa que lembra por que a arquitetura de identidade existe em primeiro lugar. No SIGA isso era um punhado de pessoas em um sistema muito grande, e elas não estavam em todas as revisões.

Então a verificação era real, simplesmente era condicional à presença da pessoa certa na sala. Escrever a regra e apontá-la para cada diff não é uma verificação mais inteligente do que aquela que o engenheiro sênior teria feito. É a mesma verificação, rodando toda vez.

## Por que isso foi para um skill e não para o copilot-instructions.md

Minha primeira tentativa foi um `copilot-instructions.md`. Funcionou. Também tinha cerca de 130 linhas de bindings de terminologia do R4 e padrões de informação de saúde protegida, e as instruções personalizadas de repositório se aplicam a cada revisão, então todas as 130 linhas iam junto em um pull request que não tocou nada além do README. É exatamente o que as instruções de repositório são projetadas para fazer. Eu tinha escolhido o container errado para um conjunto de regras tão específico.

O code review do Copilot oferece quatro lugares para colocar conhecimento, e eles não são intercambiáveis. O `.github/copilot-instructions.md` contém regras de repositório que se aplicam a cada revisão no repo. Um arquivo em `.github/instructions/` com um glob `applyTo` em seu frontmatter contém regras que só são ativadas quando os arquivos alterados correspondem ao padrão. O `AGENTS.md` na raiz contém convenções que você quer que todo agent leia, não apenas o Copilot. E o `.github/skills/` contém procedimentos específicos de tarefa que são carregados quando são relevantes para o diff.

Fiquei em dúvida entre o arquivo de instruções específico por caminho e o skill. Um bloco `applyTo: "src/routes/**/*.ts"` teria limitado as tabelas de terminologia às rotas que constroem recursos, e para muitos times essa é a resposta certa e a mudança menor. Escolhi o skill porque o que estava escrevendo é um procedimento e não uma preferência. Ele tem severidades, tabelas de lookup e um julgamento sobre o que conta como um vazamento, e queria que lesse como um documento com que um responsável por compliance pudesse se sentar, não um parágrafo de orientação de estilo enterrado em um arquivo de configuração.

A parte que mudou como eu trabalho é menor e mais prática. O code review do Copilot lê instruções personalizadas, instruções de agent e skills do head branch do pull request em vez do base. Edite o skill, abra um PR, e esse mesmo PR é revisado com a nova versão do skill. Não esperava um feedback loop rápido no próprio conjunto de regras, e imediatamente comecei a usá-lo. Cada iteração das definições de severidade abaixo foi testada no pull request que a introduziu, o que não é como escrever regras de compliance geralmente acontece.

## As regras que escrevi

O skill fica em `.github/skills/fhir-compliance/SKILL.md`. Começa se limitando a pull requests que tocam construção de recursos FHIR, depois define três severidades:

```markdown
- CRITICAL: violates a SHALL in the R4 specification. Block merge.
- WARNING: violates a SHOULD. Allow merge with explicit acknowledgment.
- PHI_RISK: always CRITICAL, regardless of data source.
```

Depois disso são principalmente tabelas de lookup maçantes. Códigos `status` válidos. O código da categoria de sinais vitais do LOINC, o vocabulário Logical Observation Identifiers Names and Codes. Os identificadores de unidade para `/min`, `mm[Hg]`, `kg` e `%`, retirados do UCUM, o Unified Code for Units of Measure. O URI do ActCode HL7 v3 descontinuado que o R4 removeu e o que o substituiu. Uma lista de padrões de nome de campo para verificar: `ssn`, `socialSecurity`, `mrn`, `medicalRecord`, `nationalId`, `taxId`, `driversLicense`, `passport`.

Cada comentário que o skill produz é marcado com `[FHIR-R4-SKILL]`, para que um autor possa distinguir o feedback dirigido pelo skill do review geral do Copilot. Coisa pequena. Tornou a triagem muito menos irritante.

O parágrafo que me importa é o que decide o que conta como um vazamento:

> Uma referência de variável como `patient.ssn` é uma violação PHI_RISK mesmo quando a fonte de dados atual é sintética (Synthea). O próprio padrão de código constitui o risco.

Essa frase está fazendo todo o trabalho. O bundle sintético é uma propriedade do diretório de fixtures de hoje, não uma propriedade do código. A linha que lê um SSN e o escreve em um campo de nota se comporta de forma idêntica no dia em que alguém apontar o serviço para um registro eletrônico de saúde real, e ninguém vai reler essa função naquele dia.

## Fazendo a revisão funcionar

Não há arquivo de workflow para escrever e nenhum bot para instalar. Em um pull request, o Copilot aparece em Reviewers na barra lateral direita e você clica em Request. A partir do terminal é `gh pr create --reviewer @copilot`, ou `gh pr edit PR-NUMBER --add-reviewer @copilot` em um pull request que já existe. As revisões voltaram em bem menos de um minuto todas as vezes que executei.

Se você quer que funcione nos pull requests que você esquece em vez dos que você lembra, proprietários de repositório e organização podem ativar a revisão automática, com opções separadas para revisar cada novo push e para revisar drafts. Em um repositório de saúde eu ativaria os dois sem pensar. O erro que estou descrevendo é escrito em um branch de draft às 17h, não no pull request organizado que você abre na manhã seguinte.

Uma configuração importa mais do que as outras para esse tipo de código. O effort de revisão tem como default Low, que é feedback rápido sobre problemas comuns. Medium, em public preview enquanto escrevo isso, roteia o pull request para um modelo de raciocínio mais elevado para análise mais longa, e o GitHub destaca código sensível à segurança como o caso para isso. Uma rota que monta um recurso clínico a partir de campos de paciente é exatamente esse caso, e os AI credits extras estão longe de ser a parte cara de uma violação.

## O que o Copilot deixou no pull request

Abri um PR com as quatro violações na Observation e deixei o code review rodar.

![Comentários de code review do GitHub Copilot no pull request da Observation, sinalizando o binding de status inválido, a categoria ausente e o valueQuantity incompleto](https://raw.githubusercontent.com/samueltauil/fhir-compliance-copilot/main/docs/screenshots/02-pr1-observation-violations-review.png)

Ele capturou todos os quatro. Para cada um nomeou a severidade, citou a linha ofensora, citou a seção do R4 e forneceu o valor corrigido em vez de me mandar ler a spec. Quando o fix cabe em uma ou duas linhas, ele chega como uma mudança sugerida que você pode commitar diretamente da página do pull request, e o Fix with Copilot entrega as maiores para o cloud agent abrir como um follow-up. O comentário de PHI é o que fico mostrando para as pessoas:

![Comentário de code review do Copilot marcando o SSN no campo de nota como uma violação PHI_RISK](https://raw.githubusercontent.com/samueltauil/fhir-compliance-copilot/main/docs/screenshots/03-pr1-phi-ssn-leak-comment.png)

A próxima pergunta que recebo, sempre, é como saber que o skill foi ativado e o Copilot não simplesmente tinha conhecimento de FHIR por acaso. Há duas respostas. Os comentários de revisão carregam uma atribuição na parte inferior nomeando o skill ou MCP server por trás deles, e a linha do tempo do pull request tem um link para a sessão de revisão, cujos logs mostram quais skills e ferramentas foram realmente chamadas. Em uma conversa de compliance, essa rastreabilidade vale mais do que o próprio comentário. Alguém eventualmente vai perguntar qual versão de qual conjunto de regras produziu determinado achado, e você quer uma resposta melhor do que um encolher de ombros.

Então fiquei curioso e pedi ao app do Copilot para construir um canvas que varre cada PR aberto no repositório e pontua por tipo de recurso, com triagem de aceitar-risco ou requer-correção em cada achado. Isso levou um prompt e cerca de um minuto, e é a parte da demo para a qual os arquitetos de saúde se inclinam para a frente, porque parece algo com que uma equipe de compliance poderia trabalhar numa segunda-feira de manhã.

![Um dashboard canvas de compliance pontuando cada pull request aberto por tipo de recurso FHIR com triagem por achado](https://raw.githubusercontent.com/samueltauil/fhir-compliance-copilot/main/docs/screenshots/06-canvas-compliance-dashboard.png)

## A parte que errei

Meu skill chama `note.text` de campo narrativo. Isso é impreciso. No FHIR, `Observation.note` é uma `Annotation`, não a narrativa do recurso, que é `Resource.text.div` e tem suas próprias regras sobre renderização segura por conta própria. Confundi duas coisas diferentes ao escrever o conjunto de regras, e o comentário de revisão carregou minha redação diretamente para o PR, o que é exatamente o que deve acontecer quando o skill é a fonte da verdade que você entregou a ele.

A resposta de privacidade não muda. O Departamento de Saúde e Serviços Humanos não se importa com qual campo o identificador está. Mas é um bom lembrete de que um skill herda qualquer confusão que você trouxe para ele, e que as citações que ele produz querem um humano que conheça a spec para fazer uma verificação. Isso é orientação em prosa em vez de uma regra compilada, então duas execuções no mesmo diff vão frasear o mesmo achado de forma diferente. Essa é a natureza de escrever regras em inglês, e é a maior razão pela qual a abordagem vale a pena usar.

A outra coisa que mudaria é o nome da pasta. Meu skill fica em `.github/skills/fhir-compliance/`, e a orientação do GitHub é que nomes de diretório focados em revisão tornam o Copilot mais propenso a recorrer a um skill durante uma revisão. O meu foi ativado em cada pull request que joguei nele, então a descrição estava carregando o peso. Chamar a pasta de `fhir-code-review` teria tornado esse sinal explícito em vez de implícito, e em um repositório com uma dúzia de skills competindo por atenção não é o tipo de coisa que eu deixaria para a sorte.

Mais uma ressalva, porque é a primeira pergunta que um responsável por compliance faz. O Copilot sempre deixa um review de Comentário, nunca um Aprovar e nunca um Solicitar mudanças, então não conta para aprovações obrigatórias e não pode bloquear um merge por conta própria. Minha tabela de severidade diz "bloquear merge" em achados CRITICAL, e devo deixar claro que essa é uma linguagem dirigida ao humano que lê o comentário, não um mecanismo de enforcement. Para um revisor que ocasionalmente erra sobre a spec, advisory é o padrão correto, e também é por isso que você não deveria vender isso como um gate. Se você precisa de algo que genuinamente impeça o merge, coloque um passo de validação na integração contínua que falhe o build de forma determinística, ou use GitHub Code Quality com um conjunto de regras, que pode bloquear um pull request em achados não resolvidos.

## Onde isso se paga

Pense como duas perguntas diferentes feitas em dois momentos diferentes. Um validador inspeciona o recurso que seu código produziu, depois que o código rodou. O skill inspeciona o código que está prestes a produzi-lo, enquanto ainda é um diff e ainda é barato de mudar. Nenhum cobre o ponto cego do outro, e o SSN no campo de nota vive precisamente no do validador.

O repositório é público se você quiser fazer um fork e apontá-lo para seus próprios tipos de recursos. Trocar domínios é principalmente trocar as tabelas de lookup. O modelo de severidade e aquele parágrafo sobre referências de variáveis se aplicam a qualquer payload regulado, e eu esperaria que a mesma forma de skill se mantivesse para um formato de claims ou um feed de laboratório com tabelas diferentes embaixo. É um projeto pessoal construído em documentação pública e dados do Synthea, sem nenhum ambiente de cliente envolvido em lugar algum, e as opiniões são completamente minhas.

Não vou fingir que isso é um programa de compliance. É um assistente de revisão que lê os bindings de terminologia do R4 com mais cuidado do que eu faço às 17h de uma quinta-feira, e captura uma classe de erro que o restante do meu toolchain não foi construído para ver. Essa é a afirmação inteira. O que continua me chamando a atenção é que a regra nunca foi a parte difícil. Todo engenheiro de saúde com quem trabalhei já sabe que não se coloca um SSN em um campo de nota. A parte difícil era fazer esse conhecimento aparecer no pull request onde o erro estava sendo escrito, em vez de na cabeça de quem quer que não estivesse revisando.

Um validador pode te dizer que o recurso está bem formado. Não pode te dizer que era seguro construí-lo.
