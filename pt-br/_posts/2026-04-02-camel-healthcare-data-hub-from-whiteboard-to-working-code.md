---
lang: pt-br
permalink: /github-copilot/open-source/healthcare/2026/04/02/camel-healthcare-data-hub-from-whiteboard-to-working-code.html
layout: post
title: "Camel Healthcare Data Hub: Do Quadro Branco ao Código Funcionando em Uma Sessão"
date: 2026-04-02
categories: [github-copilot, open-source, healthcare]
tags: [github-copilot, apache-camel, quarkus, healthcare, hl7, fhir, open-source, developer-tools, cloud-native]
---

Ontem eu estava em Dallas, no escritório da Microsoft, para uma sessão do Innovation Hub com um dos nossos clientes da área de saúde. Essas sessões são sempre interessantes, mas essa em particular se destacou. Passamos uma boa parte do dia em torno de um quadro branco discutindo como as tecnologias da Microsoft podem ajudar na modernização de dados em trânsito, na agilidade dos desenvolvedores e no design de arquitetura em ambientes regulados. Muitos casos de uso surgiram, muitas ideias.

Em determinado momento da conversa, pensei: por que não tentar construir uma dessas coisas agora mesmo? Já estávamos fundo na discussão de arquitetura, então abri o VS Code, iniciei o GitHub Copilot e escolhi um dos casos de uso que estávamos discutindo. A ideia era ver até onde eu conseguiria chegar antes do fim da sessão.

Resultado: cheguei bem longe. O suficiente para que virasse um projeto próprio: [Camel Healthcare Data Hub](https://github.com/samueltauil/camel-healthcare-data-hub).

## A realidade das integrações em saúde

Se você já trabalhou com TI na área de saúde, já sabe disso: as integrações entre organizações reguladas ainda dependem muito de arquivos flat. Exportações CSV de sistemas de prontuário eletrônico, mensagens HL7v2 por interfaces legadas, envios em lote para servidores FTP. Isso não é um cenário de nicho — é a realidade do dia a dia de muitas organizações. E ao mesmo tempo, todo mundo quer REST APIs, streaming de eventos, endpoints compatíveis com FHIR e mensageria assíncrona.

Essa lacuna entre o que os sistemas legados produzem e o que as plataformas modernas esperam é onde as coisas ficam complicadas. Mas o insight central da nossa conversa foi bem simples: conseguir falar diferentes protocolos para integrações é um design direto e poderoso. Existem padrões como HL7 e FHIR para seguir, mas também existem padrões muito utilizados por implementações de enterprise service bus e, sim, os bons e velhos web services SOAP que ainda estão muito presentes na área de saúde.

## Por que Camel no Quarkus

Optei pelo [Apache Camel](https://camel.apache.org/) no [Quarkus](https://quarkus.io/) para isso. O Camel é uma escolha natural porque oferece a camada de tradução de protocolos out of the box, e o Quarkus mantém as coisas rápidas e leves, o que importa quando você pensa em cloud-native.

O fluxo é bem simples:

1. **Entrada**: Um servidor FTP recebe arquivos flat no formato CSV ou HL7v2
2. **Parsing**: O roteamento baseado em conteúdo identifica o tipo do arquivo e faz o parse adequado (Camel Bindy para CSV, HAPI HL7 para HL7v2)
3. **Fan-out**: Os dados processados são roteados em paralelo para seis conectores de output diferentes

Veja como ficaram esses conectores:

| Conector | Protocolo | O que faz |
|-----------|----------|-------------|
| **REST API** | HTTP/JSON | Endpoints GET para pacientes, observações, health checks e uma spec OpenAPI |
| **SOAP** | XML/WSDL | Um `PatientService` com `getPatient`, `searchPatients`, `getAllPatients` |
| **HL7 MLLP** | TCP | Encaminha mensagens HL7v2 para sistemas downstream via MLLP |
| **FHIR R4** | HTTP/JSON | Empacota recursos de pacientes e faz POST para um HAPI FHIR Server |
| **JMS** | AMQP | Publica em filas e tópicos no ActiveMQ Artemis |
| **Kafka** | TCP | Faz stream de eventos para um tópico `healthcare.patients.ingested` |

Ou seja: você coloca um arquivo CSV no FTP e esse mesmo dado aparece simultaneamente em uma REST API, é enviado a um servidor FHIR, vai parar no Kafka, sai via MLLP para um sistema clínico e chega em um tópico JMS. Tudo a partir de um único arquivo.

## Synthea para dados de teste realistas

Obviamente não ia usar dados reais de pacientes para isso, então usei o [Synthea](https://github.com/synthetichealth/synthea) para gerar pacientes sintéticos. Ele é amplamente utilizado em TI de saúde exatamente para esse tipo de coisa. Um script e você obtém registros de pacientes realistas nos formatos CSV, HL7v2 e FHIR:

```bash
# Generate 20 synthetic patients
./scripts/generate-synthea-data.sh

# Or 100 patients in a specific state
./scripts/generate-synthea-data.sh 100 Texas
```

Depois você roda `./scripts/seed-ftp.sh` para fazer upload dos arquivos no servidor FTP, e o pipeline os processa automaticamente.

## Tudo roda localmente

Toda a stack de infraestrutura sobe com `docker-compose up -d`:

- **Pure-FTPd** para ingestão de arquivos
- **ActiveMQ Artemis** para mensageria JMS
- **Kafka (KRaft)** para streaming de eventos
- **HAPI FHIR Server** com uma interface navegável
- **NextGen Connect (Mirth)** para inspecionar mensagens MLLP

Sem contas em cloud, sem serviços externos. A stack completa roda no seu laptop.

## O Copilot fez muito do trabalho pesado

Preciso dar o devido crédito. O que tornou possível ir do esboço no quadro branco ao código funcionando em uma única sessão foi o GitHub Copilot. Definições de routes, configurações do Camel DSL, mapeamento de recursos FHIR, parsing de HL7... O Copilot me ajudou a traduzir os padrões que estávamos desenhando no quadro branco em Camel routes reais. Veja o [histórico de commits](https://github.com/samueltauil/camel-healthcare-data-hub/commits/main) e você vai ver o Copilot listado como contribuidor. Isso não é enfeite — foi realmente uma sessão de pair programming.

## Agora é open source

Tornei o projeto público porque esses padrões não são exclusivos de um cliente. Se você lida com integração de dados em saúde — ou, honestamente, em qualquer domínio onde sistemas legados de arquivos flat precisam se conectar a APIs modernas e arquiteturas orientadas a eventos — este pode ser um ponto de partida útil.

O repositório tem licença MIT: [github.com/samueltauil/camel-healthcare-data-hub](https://github.com/samueltauil/camel-healthcare-data-hub)

Contribuições são bem-vindas. Novos formatos de input, novos conectores de output, melhor tratamento de erros, hardening para produção... há muito espaço para crescer.

## Primeiros passos

```bash
# Clone the repo
git clone https://github.com/samueltauil/camel-healthcare-data-hub.git
cd camel-healthcare-data-hub

# Start infrastructure
docker-compose up -d

# Generate synthetic data
./scripts/generate-synthea-data.sh

# Run the application
mvn quarkus:dev

# Seed the FTP server to trigger the pipeline
./scripts/seed-ftp.sh
```

A partir daí você pode acessar a REST API em `http://localhost:8080/api/patients`, navegar pelo servidor FHIR em `http://localhost:8090`, verificar mensagens MLLP no dashboard do Mirth em `https://localhost:8443` e ver as filas JMS no console do Artemis em `http://localhost:8161`.

---

Foi um bom dia. O tipo em que uma conversa com um cliente e um quadro branco se transformam em algo concreto. Gosto que o formato do Innovation Hub incentiva isso, e fico feliz que esse projeto continue vivo como open source.
