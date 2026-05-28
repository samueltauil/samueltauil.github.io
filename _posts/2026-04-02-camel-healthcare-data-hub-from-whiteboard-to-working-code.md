---
lang: en
layout: post
title: "Camel Healthcare Data Hub: From Whiteboard to Working Code in One Session"
date: 2026-04-02
categories: [github-copilot, open-source, healthcare]
tags: [github-copilot, apache-camel, quarkus, healthcare, hl7, fhir, open-source, developer-tools, cloud-native]
---

Yesterday I was in Dallas at the Microsoft office for an Innovation Hub session with one of our healthcare customers. These sessions are always interesting, but this one really stood out. We spent a good chunk of the day around a whiteboard talking about how Microsoft technologies can help when it comes to modernizing data in transit, developer agility, and architecture design in regulated environments. Lots of use cases came up, lots of ideas.

At some point during the conversation, I thought: why not just try to build one of these things right now? We were already deep into the architecture discussion, so I opened up VS Code, fired up GitHub Copilot, and picked one of the use cases we had been talking about. The idea was to see how far I could get before the session ended.

Turns out, I got pretty far. Far enough that it became its own project: [Camel Healthcare Data Hub](https://github.com/samueltauil/camel-healthcare-data-hub).

## The reality of healthcare integrations

If you have worked anywhere near healthcare IT, you know this already: integrations between regulated organizations still rely heavily on flat files. CSV exports from EHRs, HL7v2 messages over legacy interfaces, batch data drops to FTP servers. This is not some niche scenario, it is the day-to-day reality for a lot of organizations. And at the same time, everyone wants REST APIs, event streaming, FHIR-compliant endpoints, and async messaging.

That gap between what legacy systems produce and what modern platforms expect is where things get messy. But the core insight from our conversation was actually pretty simple: being able to talk different protocols for integrations is a straightforward and powerful design. There are standards like HL7 and FHIR to follow, but there are also patterns that were extensively used by enterprise service bus implementations and, yes, good old SOAP web services that are still very much alive in healthcare.

## Why Camel on Quarkus

I went with [Apache Camel](https://camel.apache.org/) on [Quarkus](https://quarkus.io/) for this. Camel is a natural fit because it gives you the protocol translation layer out of the box, and Quarkus keeps things fast and lightweight, which matters when you are thinking cloud-native.

The flow is pretty simple:

1. **Inbound**: An FTP server receives flat files in CSV or HL7v2 format
2. **Parsing**: Content-based routing figures out the file type and parses it accordingly (Camel Bindy for CSV, HAPI HL7 for HL7v2)
3. **Fan-out**: The parsed data gets routed in parallel to six different output connectors

Here is what those connectors look like:

| Connector | Protocol | What it does |
|-----------|----------|-------------|
| **REST API** | HTTP/JSON | GET endpoints for patients, observations, health checks, plus an OpenAPI spec |
| **SOAP** | XML/WSDL | A `PatientService` with `getPatient`, `searchPatients`, `getAllPatients` |
| **HL7 MLLP** | TCP | Forwards HL7v2 messages to downstream systems over MLLP |
| **FHIR R4** | HTTP/JSON | Bundles patient resources and POSTs them to a HAPI FHIR Server |
| **JMS** | AMQP | Publishes to queues and topics on ActiveMQ Artemis |
| **Kafka** | TCP | Streams events to a `healthcare.patients.ingested` topic |

So you drop a CSV file on FTP and that same data simultaneously shows up on a REST API, gets pushed to a FHIR server, streams into Kafka, goes out over MLLP to a clinical system, and lands on a JMS topic. All from one file.

## Synthea for realistic test data

Obviously I was not going to use real patient data for this, so I pulled in [Synthea](https://github.com/synthetichealth/synthea) to generate synthetic patients. It is widely used in healthcare IT for exactly this kind of thing. One script and you get realistic patient records in CSV, HL7v2, and FHIR formats:

```bash
# Generate 20 synthetic patients
./scripts/generate-synthea-data.sh

# Or 100 patients in a specific state
./scripts/generate-synthea-data.sh 100 Texas
```

Then you run `./scripts/seed-ftp.sh` to upload the files to the FTP server, and the pipeline picks them up automatically.

## Everything runs locally

The whole infrastructure stack comes up with `docker-compose up -d`:

- **Pure-FTPd** for file ingestion
- **ActiveMQ Artemis** for JMS messaging
- **Kafka (KRaft)** for event streaming
- **HAPI FHIR Server** with a browsable UI
- **NextGen Connect (Mirth)** for inspecting MLLP messages

No cloud accounts, no external services. The full stack runs on your laptop.

## Copilot did a lot of the heavy lifting

I have to give credit where it is due. What made it possible to go from whiteboard sketch to working code in one sitting was GitHub Copilot. Route definitions, Camel DSL configs, FHIR resource mapping, HL7 parsing... Copilot helped me translate the patterns we were drawing on the whiteboard into actual Camel routes. Check the [commit history](https://github.com/samueltauil/camel-healthcare-data-hub/commits/main) and you will see Copilot listed as a contributor. That is not a gimmick, it really was a pair programming session.

## It is open source now

I made the project public because these patterns are not unique to one customer. If you deal with healthcare data integration, or honestly any domain where legacy flat-file systems need to connect to modern APIs and event-driven architectures, this could be a useful starting point.

The repo is MIT licensed: [github.com/samueltauil/camel-healthcare-data-hub](https://github.com/samueltauil/camel-healthcare-data-hub)

Contributions are welcome. New input formats, new output connectors, better error handling, production hardening... there is a lot of room to grow this.

## Getting started

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

From there you can hit the REST API at `http://localhost:8080/api/patients`, browse the FHIR server at `http://localhost:8090`, check MLLP messages in the Mirth dashboard at `https://localhost:8443`, and look at JMS queues in the Artemis console at `http://localhost:8161`.

---

It was a good day. The kind where a customer conversation and a whiteboard turn into something real. I like that the Innovation Hub format encourages that, and I am glad this project gets to live on as open source.
