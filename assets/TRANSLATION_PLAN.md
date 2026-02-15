# PT-BR Translation Plan for samueltauil.github.io

> Fully automated English → Brazilian Portuguese translation for all content (UI, pages, 8 blog posts), using `/pt-br/` URL paths, keeping technical terms in English, powered by GitHub Agentic Workflows.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Scope** | Everything (UI + pages + all blog posts) | Full bilingual experience |
| **Translation method** | Fully automated via gh-aw | Zero API cost, only Actions compute minutes |
| **Technical terms** | Keep in English | Standard in BR tech community (GitHub Copilot, VS Code, MCP, CI/CD, etc.) |
| **URL structure** | Path prefix `/pt-br/` | Clean, SEO-friendly (e.g., `samueltauil.github.io/pt-br/about/`) |
| **i18n plugin** | `jekyll-polyglot` | Most popular, handles hreflang and language-specific URLs natively |
| **Translation engine** | GitHub Agentic Workflows (Copilot agent) | $0 API cost, natural language glossary enforcement, draft PR for review |

---

## Phase 1: Build Pipeline & i18n Infrastructure

### 1.1 Switch Gemfile from `github-pages` to standalone Jekyll

The `github-pages` gem only supports whitelisted plugins. `jekyll-polyglot` is not whitelisted, so the build must switch to a custom Jekyll build.

**File:** `Gemfile`

Replace:
```ruby
gem "github-pages", group: :jekyll_plugins
```

With:
```ruby
gem "jekyll", "~> 4.3"

group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-seo-tag"
  gem "jekyll-polyglot"
end
```

### 1.2 Update `_config.yml` with polyglot configuration

**File:** `_config.yml`

Add:
```yaml
languages: ["en", "pt-br"]
default_lang: "en"
exclude_from_localization: ["assets", "scripts", "images"]
parallel_localization: true
```

### 1.3 Update deployment workflow

**File:** `.github/workflows/pages.yml`

Replace `actions/jekyll-build-pages@v1` with a custom build:
- `ruby/setup-ruby@v1` with bundler cache
- `bundle install`
- `bundle exec jekyll build`
- `actions/upload-pages-artifact@v3` pointing to `_site/`
- `actions/deploy-pages@v4`

### 1.4 Create `pt-br/` directory structure

Mirror all content:
```
pt-br/
  index.md
  about.md
  photography.md
  posts.md
  _posts/
    2025-10-16-vscode-keyboard-shortcuts.md
    2025-10-20-automating-resume-builds-github-actions.md
    2025-11-08-introducing-copilot-agent-designer.md
    2026-01-25-healthtranscribe-azure-ai-medical-transcription.md
    2026-01-28-building-mcp-app-interactive-charts-vscode.md
    2026-02-02-copilot-compass-github-copilot-analytics-mcp-app.md
    2026-02-06-skills-hub-curated-catalog-discovering-installing-ai-coding-skills.md
    2026-02-13-building-my-first-agentic-workflow-docs-sync.md
```

---

## Phase 2: Template & UI Updates

### 2.1 Dynamic `lang` attribute

**File:** `_layouts/default.html`

Change `<html lang="en">` → `<html lang="{{ site.active_lang }}">`

### 2.2 Add language switcher

**File:** `_includes/header.html`

Add a language toggle using polyglot's `site.languages` and `site.active_lang` variables. Link each language to its corresponding page URL.

### 2.3 Translate hardcoded UI strings

Use `site.active_lang` conditionals in:

| File | English | Portuguese |
|---|---|---|
| `_includes/header.html` | Home | Início |
| `_includes/header.html` | Posts | Publicações |
| `_includes/header.html` | Photography | Fotografia |
| `_includes/header.html` | About | Sobre |
| `_layouts/home.html` | Latest Posts | Últimas Publicações |
| `_layouts/home.html` | View all posts → | Ver todas as publicações → |
| `_layouts/home.html` | No posts yet. | Nenhuma publicação ainda. |
| `_layouts/post.html` | ← Back to home | ← Voltar ao início |
| `_includes/footer.html` | Built with | Feito com |

### 2.4 Add `hreflang` meta tags

**File:** `_layouts/default.html`

Add polyglot's `{% I18n_Headers %}` tag in the `<head>` section for automatic hreflang generation.

### 2.5 Localize date formatting

**Files:** `_layouts/post.html`, `_layouts/home.html`

Use `site.active_lang` to switch:
- EN: `%B %d, %Y` → "February 13, 2026"
- PT-BR: `%d de %B de %Y` → "13 de fevereiro de 2026"

---

## Phase 3: Agentic Translation Workflow (replaces Python script + Azure API)

### 3.1 Create glossary file

**File:** `_data/translation_glossary.yml`

Curated list of terms to keep in English:

```yaml
# Technical terms to preserve in English during translation
terms:
  # Products & brands
  - GitHub Copilot
  - GitHub Actions
  - GitHub Pages
  - VS Code
  - Visual Studio Code
  - Azure
  - Azure AI
  - Jekyll
  - React
  - Node.js
  - TypeScript
  - Python
  - Docker
  - Kubernetes
  - OpenShift
  - Cloudflare
  - Chart.js
  - Astro
  - Zod
  - LaTeX

  # Protocols & standards
  - MCP
  - Model Context Protocol
  - FHIR
  - FHIR R4
  - REST
  - API
  - SDK
  - CLI
  - GraphQL
  - SARIF

  # Technical concepts (commonly kept in English in BR)
  - CI/CD
  - pipeline
  - deploy
  - commit
  - push
  - pull request
  - merge
  - branch
  - fork
  - workflow
  - frontmatter
  - plugin
  - template
  - layout
  - endpoint
  - webhook
  - container
  - middleware
  - framework
  - runtime
  - sandbox
  - skill
  - agent
  - prompt
  - token
  - schema
  - hook
  - sprint
  - backlog
  - release
  - tag
  - diff
  - patch
  - cron
  - monorepo

  # File/code references
  - Markdown
  - YAML
  - JSON
  - SCSS
  - CSS
  - HTML
  - RSS
  - Atom
```

### 3.2 Create shared translation conventions

**File:** `.github/agents/shared/translation-conventions.md`

Reusable instructions covering:
- Technical term preservation rules (reference the glossary file)
- Markdown structure preservation rules:
  - Never translate content inside fenced code blocks (``` ```)
  - Never translate inline code (backtick-wrapped text)
  - Preserve all URLs, image paths, and HTML tags verbatim
  - Preserve YAML frontmatter fields: `layout`, `date`, `tags`, `categories` unchanged
  - Translate only: `title`, `excerpt` (if present)
- Tone/voice: conversational first-person, matching the English originals
- Date format: `%B %d, %Y` → `%d de %B de %Y` in prose (not in frontmatter `date:`)
- When encountering a term from the glossary embedded in a Portuguese sentence, keep it in English naturally (e.g., "Eu criei um **workflow** que..." not "Eu criei um **fluxo de trabalho** que...")

### 3.3 Create the agentic translation workflow

**File:** `.github/workflows/translate-to-ptbr.md`

```markdown
---
description: Translates English content to Brazilian Portuguese,
  preserving technical terminology, code blocks, and Markdown structure.
  Outputs translated files to the pt-br/ directory.
on:
  push:
    branches: [main]
    paths:
      - "_posts/**"
      - "index.md"
      - "about.md"
      - "photography.md"
      - "posts.md"
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: translate-ptbr
  cancel-in-progress: true
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-pull-request:
    title-prefix: "[translate] "
    labels: [translation, pt-br, automation]
    draft: true
    expires: 14
---

# Content Translator: English → Brazilian Portuguese

You are a professional translator specializing in technical developer content.
Your task is to translate content from English to Brazilian Portuguese (pt-BR)
with high fidelity, preserving all technical terminology, code blocks, and
Markdown structure.

## Context

This is a personal developer portfolio and blog (Jekyll site) that covers
GitHub Copilot, VS Code, AI tools, DevOps, and developer productivity.
The audience for the Portuguese version is Brazilian developers who are
comfortable with English technical terms.

## Instructions

1. Read `_data/translation_glossary.yml` for the full list of terms to keep in English.
2. Follow the shared translation conventions in `.github/agents/shared/translation-conventions.md`.
3. For each English source file listed below, check if a translated version
   exists in `pt-br/`. If the source is newer or the translation doesn't exist,
   translate it.

### Files to translate

**Content pages:**
- `index.md` → `pt-br/index.md`
- `about.md` → `pt-br/about.md`
- `photography.md` → `pt-br/photography.md`
- `posts.md` → `pt-br/posts.md`

**Blog posts:**
- All files in `_posts/` → corresponding files in `pt-br/_posts/`

### Translation rules

- Translate prose, headings, and alt text to natural Brazilian Portuguese.
- Keep all glossary terms in English — embed them naturally in Portuguese sentences.
- Never modify content inside fenced code blocks or inline code.
- Preserve all URLs, image paths, HTML tags, and Liquid template tags verbatim.
- In YAML frontmatter: translate `title` and `excerpt` only. Keep `layout`, `date`,
  `tags`, `categories`, and all other fields unchanged.
- Match the tone of the original — conversational, first-person, technically precise.
- Process files one at a time: read source → write translation → move to next.

### Output

- If any files were translated, create a pull request with all translated files.
- Include a summary table in the PR description listing each file translated.
- If all translations are already current, use `noop` with a message confirming
  everything is in sync.
```

### 3.4 Compile the workflow

```bash
gh aw compile translate-to-ptbr
```

### 3.5 Initial run

Trigger via `workflow_dispatch` to translate all existing content. Review the draft PR for quality.

---

## Phase 4: Content Translation & Verification

### 4.1 Review initial translation PR

- Spot-check 2-3 posts for code block integrity
- Verify glossary terms are preserved in English
- Confirm natural PT-BR prose flow
- Check frontmatter structure is preserved

### 4.2 Iterate

- If quality issues are found, update the translation conventions or glossary
- Re-trigger via `workflow_dispatch`
- Repeat until satisfied

---

## Phase 5: SEO & Polish

### 5.1 Configure `jekyll-seo-tag` for multilingual

Ensure `og:locale` and `og:locale:alternate` are correct per language.

### 5.2 Configure `jekyll-feed` for per-language RSS

Polyglot generates language-specific feeds automatically. Verify `/feed.xml` (EN) and `/pt-br/feed.xml` (PT-BR).

### 5.3 Update Schema.org microdata

**File:** `_layouts/post.html`

Add `inLanguage` property using `site.active_lang`:
```html
<meta itemprop="inLanguage" content="{{ site.active_lang }}">
```

---

## Files Summary

### Modified files
| File | Changes |
|---|---|
| `Gemfile` | Replace `github-pages` with standalone `jekyll` + `jekyll-polyglot` |
| `_config.yml` | Add polyglot config, languages array |
| `.github/workflows/pages.yml` | Custom Ruby/Jekyll build (replace `jekyll-build-pages`) |
| `_layouts/default.html` | Dynamic `lang` attr, `hreflang` tags |
| `_includes/header.html` | Language switcher, translated nav strings |
| `_includes/footer.html` | Translated footer strings |
| `_layouts/home.html` | Translated sidebar strings, date format |
| `_layouts/post.html` | Translated back link, date format, Schema.org `inLanguage` |

### New files
| File | Purpose |
|---|---|
| `_data/translation_glossary.yml` | Terms to keep in English |
| `.github/agents/shared/translation-conventions.md` | Reusable translation rules |
| `.github/workflows/translate-to-ptbr.md` | Agentic translation workflow |
| `pt-br/index.md` | Translated home page |
| `pt-br/about.md` | Translated about page |
| `pt-br/photography.md` | Translated photography page |
| `pt-br/posts.md` | Translated posts listing |
| `pt-br/_posts/*.md` | Translated blog posts (8 files) |

---

## Verification Checklist

- [ ] `bundle exec jekyll serve` builds both EN and PT-BR without errors
- [ ] `/` renders English, `/pt-br/` renders Portuguese
- [ ] Language switcher navigates correctly on all page types (home, page, post)
- [ ] Code blocks in translated posts are identical to English originals
- [ ] Glossary terms appear in English within Portuguese prose
- [ ] Dates show "February 13, 2026" (EN) and "13 de fevereiro de 2026" (PT-BR)
- [ ] `hreflang` tags present in `<head>` for both languages
- [ ] `og:locale` correct per language
- [ ] RSS feeds exist at `/feed.xml` and `/pt-br/feed.xml`
- [ ] Schema.org `inLanguage` reflects active language
- [ ] Internal links work in both language versions
- [ ] Translation workflow triggers on push to `_posts/` or content pages
- [ ] Translation workflow produces draft PR with summary table
- [ ] `noop` fires when no source files changed
- [ ] Concurrency group prevents overlapping translation runs

---

## Cost Estimate

| Resource | Cost |
|---|---|
| gh-aw translation runs | $0 API cost (Copilot agent included) |
| GitHub Actions compute | ~5-15 min per run (free tier: 2,000 min/month) |
| `jekyll-polyglot` | Free, open source |
| No external translation API | $0 |
| **Total ongoing cost** | **$0** (within free Actions minutes) |
