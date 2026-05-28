---
lang: pt-br
permalink: /github-copilot/developer-tools/2026/05/28/copilot-cli-weather-statusline.html
layout: post
title: "Adicionando Previsão do Tempo Local à Minha Statusline do GitHub Copilot CLI"
date: 2026-05-28
categories: [github-copilot, developer-tools]
tags: [github-copilot, cli, bash, statusline, wttr, productivity]
---

O verão está chegando aqui em Dracut, e os dias mais quentes me fizeram pensar em quanto tempo passo olhando para um terminal em vez de estar lá fora. A maior parte do meu dia de trabalho acontece dentro do GitHub Copilot CLI, então pensei: se vou ficar com um olho num prompt o dia todo, que ele pelo menos me diga como está o tempo lá fora. Essa pequena ideia virou um script de statusline que tenho usado nas últimas semanas, e quero compartilhar.

O código completo está neste gist: [Custom GitHub Copilot CLI statusline with local weather](https://gist.github.com/samueltauil/8e837bb90502f2d848d16f84d2c12112).

![Statusline do Copilot CLI mostrando a previsão do tempo local](/assets/images/2026-05-28-copilot-cli-weather-statusline/statusline-screenshot.png)

## Por que fazer isso

O Copilot CLI vem com uma statusline totalmente personalizável por meio de uma configuração experimental. Eu tinha visto [o post do Tugdual Grall](https://tgrall.github.io/blog/2026/05/02/copilot-cli-customize-statusline) sobre esse mesmo recurso algumas semanas atrás, e ele ficou na minha cabeça. A statusline é só um comando shell. O que você imprime no stdout aparece na parte inferior da tela. É um lugar surpreendentemente divertido para colocar informações.

Testei algumas ideias (branch do git, modelo atual, uso de tokens) e acabei ficando com o tempo. É o tipo de sinal que você dá uma olhada rápida e é útil para escolher quando se afastar da mesa — e é honesto: se disser 32 graus lá fora, provavelmente é um bom dia para encerrar cedo e dar uma caminhada.

## O que o script faz

O script chama o [wttr.in](https://wttr.in), um serviço de previsão do tempo gratuito e sem necessidade de API key que já fala texto simples. Peço um formato compacto com o ícone da condição, temperatura, sensação térmica, vento e umidade, e converto Fahrenheit para Celsius localmente com `awk` para fazer apenas uma requisição HTTP por atualização. O output fica assim:

```
📍 Dracut, MA  🌤️  +67°F/19°C (feels +67°F/19°C) ↓9mph 55%
```

Alguns detalhes nos quais me preocupei ao escrever:

- A statusline roda a cada tick de renderização, e eu não queria sobrecarregar o wttr.in. O script salva o resultado em cache em `~/.copilot/.weather-statusline.cache` e só refaz a busca a cada 15 minutos por padrão.
- O Copilot CLI envia um payload JSON para o script via stdin. Não preciso dele para o tempo, mas faço o drain para que a escrita não trave.
- Se a rede estiver fora ou a requisição falhar, o script usa o último cache disponível. Se não houver cache, exibe uma mensagem discreta `weather unavailable` em vez de gerar um erro.
- A localização é configurável editando duas variáveis no topo do arquivo ou definindo `WEATHER_LOCATION` e `WEATHER_LABEL` como variáveis de ambiente. Eu mantenho as minhas no shell profile para que o mesmo script funcione em todas as máquinas.

## O script

```bash
#!/usr/bin/env bash
# Custom GitHub Copilot CLI statusline: shows current weather for a configurable
# location in both °F and °C via wttr.in (no API key required).

# CUSTOMIZE ME
WEATHER_LOCATION="${WEATHER_LOCATION:-Dracut,MA}"
WEATHER_LABEL="${WEATHER_LABEL:-📍 Dracut, MA}"
CACHE_TTL="${WEATHER_CACHE_TTL:-900}"

set -eu

# Copilot CLI pipes a JSON payload to stdin on each render. Drain it.
cat >/dev/null

CACHE_FILE="${HOME}/.copilot/.weather-statusline.cache"

now=$(date +%s)
if [ -f "$CACHE_FILE" ]; then
  mtime=$(stat -c %Y "$CACHE_FILE" 2>/dev/null || stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0)
  age=$((now - mtime))
else
  age=$((CACHE_TTL + 1))
fi

if [ "$age" -gt "$CACHE_TTL" ]; then
  encoded_loc=$(printf '%s' "$WEATHER_LOCATION" | sed 's/ /+/g')
  raw=$(curl -fsS --max-time 3 \
    "https://wttr.in/${encoded_loc}?format=%c|%t|%f|%w|%h" 2>/dev/null || true)
  if [ -n "$raw" ]; then
    IFS='|' read -r cond tempF feelsF wind humidity <<< "$raw"
    tF=$(printf '%s' "$tempF" | tr -cd '0-9-')
    fF=$(printf '%s' "$feelsF" | tr -cd '0-9-')
    if [ -n "$tF" ]; then
      tC=$(awk "BEGIN{printf \"%d\",($tF-32)*5/9}")
      fC=$(awk "BEGIN{printf \"%d\",($fF-32)*5/9}")
      fetched="${cond} ${tempF}/${tC}°C (feels ${feelsF}/${fC}°C) ${wind} ${humidity}"
      printf '%s' "$fetched" > "$CACHE_FILE"
    fi
  fi
fi

if [ -f "$CACHE_FILE" ]; then
  weather=$(cat "$CACHE_FILE")
else
  weather="🌐 weather unavailable"
fi

printf "%s %s" "$WEATHER_LABEL" "$weather"
```

## Instalação

São quatro passos, e tudo leva alguns minutos.

**1. Salve o script.** Coloque-o em `~/.copilot/statusline.sh` e torne-o executável:

```bash
chmod +x ~/.copilot/statusline.sh
```

**2. Escolha sua localização.** Edite `WEATHER_LOCATION` e `WEATHER_LABEL` no topo do arquivo, ou defina-os como variáveis de ambiente no seu shell profile. `WEATHER_LOCATION` aceita qualquer coisa que o wttr.in entenda: uma cidade com estado nos EUA (`Dracut,MA`), cidade com país (`Paris,France`), CEP (`94016`), código de aeroporto (`MUC`) ou um ponto de referência precedido de til (`~Eiffel+Tower`).

**3. Ative a statusline no Copilot CLI.** Este ainda é um recurso experimental, então você precisa habilitá-lo. Edite `~/.copilot/settings.json`:

```json
{
  "experimental": true,
  "statusLine": {
    "type": "command",
    "command": "~/.copilot/statusline.sh",
    "padding": 1
  }
}
```

**4. Reinicie o Copilot CLI.** Execute `/restart` em uma sessão existente ou relance o comando `copilot`. O primeiro render demora um instante enquanto busca o tempo inicial; depois o cache mantém tudo instantâneo.

## Rodando no Windows

O script é um script bash, então no Windows você precisa de um shell no estilo POSIX. Duas opções funcionam bem, dependendo de como você já executa o Copilot CLI.

**Opção 1: WSL (recomendado).** Se você executa o Copilot CLI dentro do WSL (Ubuntu, Debian, etc.), os passos acima funcionam como estão. Salve o script em `~/.copilot/statusline.sh` dentro do seu home do WSL, execute `chmod +x` e aponte `~/.copilot/settings.json` (o de dentro do WSL) para ele. `curl`, `awk`, `sed` e `stat -c` estão disponíveis out of the box.

**Opção 2: Git Bash.** Se você executa o Copilot CLI no Git Bash diretamente no Windows, o script também funciona, mas o layout de paths é diferente. No Git Bash:

```bash
mkdir -p ~/.copilot
# Salve o script em ~/.copilot/statusline.sh, depois:
chmod +x ~/.copilot/statusline.sh
```

No Git Bash, `~` resolve para `C:\Users\<você>`, então o arquivo de settings fica em `C:\Users\<você>\.copilot\settings.json`. O Copilot CLI espera que o valor de `command` seja um path executável, e no Windows isso significa apontar explicitamente para o shell do Git Bash. Edite o `settings.json` assim:

```json
{
  "experimental": true,
  "statusLine": {
    "type": "command",
    "command": "C:\\Program Files\\Git\\bin\\bash.exe -c \"~/.copilot/statusline.sh\"",
    "padding": 1
  }
}
```

Ajuste o path para o `bash.exe` se você instalou o Git for Windows em outro lugar. PowerShell e `cmd.exe` não conseguem rodar o script diretamente porque ele depende de recursos do bash (`<<<` here-strings, split de `IFS`, `stat`), então envolvê-lo com `bash -c` é a forma mais simples de manter um único script que funciona em todo lugar.

Alguns detalhes específicos do Windows que valem a pena saber:

- Certifique-se de que o arquivo foi salvo com line endings LF, não CRLF. Se você editou num editor Windows e o bash reclamar de caracteres `\r`, execute `dos2unix ~/.copilot/statusline.sh` (ou defina `core.autocrlf=input` antes de clonar).
- O script usa `stat -c %Y` primeiro e cai para `stat -f %m`, o que cobre tanto o GNU coreutils (WSL, Git Bash) quanto o stat estilo BSD (macOS), então a verificação de idade do cache funciona nos três ambientes.

## Pensamento final

É uma coisa pequena, mas eu me peguei olhando para ela mais do que esperava. A statusline é um daqueles lugares onde você pode colocar exatamente uma informação que torna o seu dia um pouco melhor, e para mim, agora, isso é o tempo. Se você quiser um sinal diferente lá (status de build, sprint atual, escala de plantão), o mesmo padrão funciona. Imprima no stdout, faça cache de qualquer coisa custosa e deixe o Copilot CLI renderizar.

Inspirado pelo [post do Tugdual Grall sobre como customizar a statusline do Copilot CLI](https://tgrall.github.io/blog/2026/05/02/copilot-cli-customize-statusline).
