---
lang: pt-br
permalink: /github-copilot/ai/healthcare/2026/07/07/cardiac-digital-twin-copilot-simulink-mcp.html
layout: post
title: "Cardiac Digital Twin: Controlando um Modelo Simulink com GitHub Copilot em Oito Prompts"
date: 2026-07-07
categories: [github-copilot, ai, healthcare]
tags: [github-copilot, mcp, simulink, matlab, digital-twin, healthcare, pharma, agentic-workflows, ai]
---

O lançamento do Simulink Agentic Toolkit pelo MATLAB aconteceu algumas semanas atrás, e meu primeiro pensamento não foi "o que isso faz". Foi a pergunta que me pego fazendo sobre todo novo lançamento de MCP: o que seria realmente útil pedir a essa coisa em inglês? Simulink não é uma superfície de language model. É um ambiente de modelagem gráfica que engenheiros de aeroespacial, medicina e automotivo usam há décadas para construir simulações precisas e validadas. Entregar um desses para um chat prompt pareceu estranho o suficiente para eu querer ver o que acontecia. O que eu não tinha era um bom caso de uso.

Fiquei com isso por alguns dias. A ideia que não me deixava em paz veio de um canto do meu trabalho sobre o qual normalmente não escrevo: healthcare e pharma.

Os estudos clínicos cardiovasculares fazem a pergunta errada. Eles perguntam "como o paciente médio vai responder a essa dose", aí recrutam pessoas, aí medem. Pacientes não são médios. Idade, peso, função renal, genética, medicamentos em uso. Um único estudo contra uma média não captura nada dessa variabilidade, e um estudo cardiovascular fracassado custa bilhões de dólares e anos de tempo para uma empresa farmacêutica. A pergunta que todo mundo realmente quer responder antes de recrutar qualquer pessoa é diferente. Como ESSE paciente vai responder?

É para isso que serve um cardiac digital twin. É um substituto computacional do sistema cardiovascular de um paciente específico. Você muda a dose no software, roda o modelo, vê o que aconteceria. Aí decide se vale a pena conduzir o estudo. É uma ideia muito antiga no aeroespacial. Bata o avião no simulador antes de bater no céu. O healthcare tem se atualizado lentamente, principalmente porque construir os modelos é difícil e dirigi-los nunca foi fácil.

Esse virou o demo. Eu construí aqui: [samueltauil/cardiac-digital-twin](https://github.com/samueltauil/cardiac-digital-twin). Ele usa GitHub Copilot no modo Agent, orquestrando o Simulink Agentic Toolkit através de MCP, para simular uma mudança de dosagem de beta-bloqueador em um cardiac digital twin em oito prompts em linguagem natural. Sem edição manual de código. O modelo é um modelo cardíaco de loop fechado real, não um script de brinquedo.

## O que tentei primeiro

Meu primeiro instinto foi fazer o demo sobre um pequeno script MATLAB e pedir ao Copilot para reescrevê-lo. Funciona, e descartei depois de uns trinta minutos. Respondia uma pergunta chata ("o Copilot consegue editar código MATLAB", que obviamente consegue) e ignorava a que eu me importava. Eu queria ver o Copilot controlando um modelo Simulink validado sem tocar no código-fonte do modelo. Editar um script significa que o modelo é um arquivo de texto. Controlar um modelo Simulink significa que é uma simulação viva que o agent precisa interrogar.

Então descartei o brinquedo e construí um modelo cardíaco de loop fechado de verdade com cinco subsistemas: farmacocinética para metoprolol, uma resposta de frequência cardíaca Hill/Emax, débito cardíaco, pressão arterial e um loop de feedback de barorreflexo que compensa parcialmente a queda de frequência cardíaca. Tudo em Simulink, construído programaticamente a partir de `model/create_cardiac_model.m`. Isso é o que o Copilot tem que interagir, não um script.

## Os oito prompts

O cenário do demo é uma única linha que o usuário digita para o Copilot no modo Agent: *"Simulate the effect of increasing a patient's beta-blocker (metoprolol) dosage by 20%."* A partir dessa única frase, o Copilot executa um workflow de oito etapas:

1. Descrever a topologia de subsistemas do modelo cardíaco.
2. Localizar e resolver o parâmetro de workspace `beta_blocker_dose_mg`.
3. Aplicar a mudança de +20% (50 mg para 60 mg).
4. Reexecutar a simulação de loop fechado e comparar as métricas principais.
5. Interpretar o impacto fisiológico no contexto clínico.
6. Gerar um teste de verificação em Gherkin.
7. Redigir requisitos formais de engenharia a partir dos resultados da simulação.
8. Lançar um dashboard `uifigure` em tempo real com comparação de runs sobrepostos.

O texto dos prompts fica em `.github/prompts/01-explore-model.prompt.md` até `08-realtime-dashboard.prompt.md`. O agent do Copilot que os conecta é `.github/agents/cardiac-demo.agent.md`. Tudo está no repositório, versionado, revisável. Nada roda contra um dashboard oculto ou uma skill hospedada.

A configuração para as duas superfícies do Copilot são dois pequenos arquivos de MCP config, um para o Copilot Chat no modo Agent e outro para o Copilot CLI:

```json
// .vscode/mcp.json  (VS Code, Copilot Chat in Agent mode)
{
  "servers": {
    "matlab-simulink": { ... }
  }
}
```

```json
// .github/mcp.json  (GitHub Copilot CLI)
{
  "mcpServers": {
    "matlab-simulink": { ... }
  }
}
```

Dois schemas, um servidor. Ambos apontam para o MCP server `matlab-simulink` que o instalador do Simulink Agentic Toolkit configurou. O Toolkit compartilha uma sessão MATLAB em execução com esse servidor, então quando o Copilot faz uma pergunta ao modelo, está perguntando a um workspace Simulink vivo com o modelo carregado, não a um snapshot em disco.

Essa é a parte que me importa. O rigor ainda vive no modelo Simulink. O que o MCP adicionou foi um shell de linguagem natural sobre ele.

## Os números, e por que eles são o ponto

Depois que o Copilot aumenta a dose de 50 mg para 60 mg e reexecuta a simulação, a comparação que ele retorna é pequena de propósito:

| Métrica | Baseline (50 mg) | Modificado (60 mg) | Mudança |
|---------|:----------------:|:------------------:|:-------:|
| Frequência cardíaca | 67,4 bpm | 66,6 bpm | -1,3 % |
| Débito cardíaco | 4,72 L/min | 4,66 L/min | -1,3 % |
| Pressão arterial média | 84,9 mmHg | 83,9 mmHg | -1,3 % |

Uma mudança de dose de +20% produzindo uma queda de -1,3% na frequência cardíaca parece decepcionante até você ler a explicação do Copilot sobre isso, que é o output real do demo. A curva de Hill para o metoprolol satura próxima ao Emax nesses níveis de dose, então um aumento de 20% na dose não é um aumento de 20% na ocupação do receptor. O barorreflexo restaura parcialmente a frequência cardíaca conforme a pressão arterial cai, amortecendo ainda mais o efeito observável. Essa é uma resposta fisiológica real, produzida por um modelo fisiológico real, em resposta a uma pergunta feita em inglês.

![Dashboard uifigure em tempo real mostrando runs baseline e modificado de beta-bloqueador sobrepostos, com gauges ao vivo para frequência cardíaca, débito cardíaco e pressão arterial média](https://raw.githubusercontent.com/samueltauil/cardiac-digital-twin/main/docs/images/dashboard.png)

A outra coisa que o Copilot escreve nesse ponto é um arquivo Gherkin, `validation/beta_blocker_dose_response.feature`, que transforma esses números em um cenário: dado o baseline `CardiacDigitalTwin`, quando `beta_blocker_dose_mg` aumenta para 60 mg, então frequência cardíaca e pressão arterial média ambas caem 1,3%. Esse teste não existia antes de o Copilot gerá-lo a partir do output da simulação. Na próxima vez que alguém mudar o modelo, o arquivo Gherkin é o que informa se a fisiologia ainda se sustenta.

## Por que o padrão vale a pena copiar

A tentação com um demo como esse é lê-lo como "a IA agora está fazendo simulação clínica". Não está. O modelo Simulink faz a simulação. Cada valor naquela tabela de comparação veio de equações que um engenheiro escreveu e validou. O que mudou é a interface.

Para quem trabalha em um domínio regulado que já tem um simulador maduro, essa é a forma que vale a pena copiar. Poderia ser um modelo de estabilidade de rede elétrica, ou um modelo de yield de refinaria, ou um motor de adjudicação de sinistros. A física ou as regras de negócio já estão codificadas. O que estava faltando era uma forma de fazer uma pergunta ao modelo na linguagem do problema, sem também ser fluente na linguagem da ferramenta. O MCP é a peça que fecha essa lacuna. O agent não está substituindo o modelo. É um tradutor sentado sobre ele.

A versão de onze prompts do demo (três prompts opcionais de análise aprofundada além dos oito) vai mais longe. Ela lineariza o loop fechado, verifica margens de estabilidade do barorreflexo com um diagrama de Bode, e roda uma coorte de 100 pacientes em Monte Carlo com um tornado PRCC de sensibilidade, tudo em linguagem natural. Essa é a parte que um farmacologista clínico pode usar, não porque o Copilot de repente entende de farmacologia, mas porque o modelo entende, e o Copilot agora consegue perguntar.

Quando o agent consegue controlar um modelo Simulink validado, o prompt interessante para de ser "o que devo programar" e se torna "qual paciente devo simular". O repositório está em [samueltauil/cardiac-digital-twin](https://github.com/samueltauil/cardiac-digital-twin), e o site completo de documentação (arquitetura do modelo, narrativa dos prompts, matemática fisiológica, metodologia de validação) está em <a {% static_href %}href="https://samueltauil.github.io/cardiac-digital-twin/"{% endstatic_href %}>samueltauil.github.io/cardiac-digital-twin</a> se você quiser explorar.
