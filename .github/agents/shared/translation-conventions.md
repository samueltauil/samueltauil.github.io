# Translation Conventions: English → Brazilian Portuguese (pt-BR)

## Technical Term Preservation

- Read `_data/translation_glossary.yml` for the full list of terms to keep in English
- When a glossary term appears in a Portuguese sentence, keep it in English naturally
  - Correct: "Eu criei um **workflow** que automatiza o deploy"
  - Incorrect: "Eu criei um **fluxo de trabalho** que automatiza a **implantação**"

## Markdown Structure Preservation

- **Never** translate content inside fenced code blocks (``` ```)
- **Never** translate inline code (backtick-wrapped text)
- Preserve all URLs, image paths, and HTML tags verbatim
- Preserve all Liquid template tags (`{% %}`, `{{ }}`) verbatim
- Preserve YAML frontmatter fields: `layout`, `date`, `tags`, `categories`, `permalink` unchanged
- Translate only these frontmatter fields: `title`, `excerpt` (if present)

## Tone & Voice

- Use conversational first-person style, matching the English originals
- Informal "você" (not "tu"), common in Brazilian tech writing
- Address the reader directly when the original does
- Maintain technical precision while keeping prose natural

## Date Format

- In prose text: "February 13, 2026" → "13 de fevereiro de 2026"
- In frontmatter `date:` field: do **not** change (keep ISO format)
- The Liquid templates handle date formatting via `site.active_lang`

## File Mapping

- English pages (root) → Portuguese pages (`pt-br/` directory)
- English posts (`_posts/`) → Portuguese posts (`pt-br/_posts/`)
- Filenames remain the same (same slug)

## Required Frontmatter for Multilingual Content

> **Critical:** Do NOT rely on jekyll-polyglot to auto-detect language from the
> directory. Every content file must have explicit `lang` frontmatter, and PT-BR
> posts require an explicit `permalink`. Omitting these causes broken URLs,
> wrong-language content, or 404 errors.

### English Pages (root-level `.md` files)

Every English page must include `lang: en` in frontmatter:

```yaml
---
lang: en
layout: page
title: "About"
permalink: /about/
---
```

### PT-BR Pages (`pt-br/*.md`)

Every Portuguese page must include `lang: pt-br` in frontmatter:

```yaml
---
lang: pt-br
layout: page
title: "Sobre"
permalink: /about/
---
```

### English Posts (`_posts/*.md`)

Every English post must include `lang: en` in frontmatter:

```yaml
---
lang: en
layout: post
title: "My Post Title"
date: 2026-02-13
categories: [github, ai, devops]
---
```

### PT-BR Posts (`pt-br/_posts/*.md`) — ⚠️ Permalink Required

Every Portuguese post **must** include both `lang: pt-br` **and** an explicit
`permalink` that matches the English URL pattern. This is the most critical rule.

```yaml
---
lang: pt-br
permalink: /github/ai/devops/2026/02/13/my-post-slug.html
layout: post
title: "Meu Título do Post"
date: 2026-02-13
categories: [github, ai, devops]
---
```

**How to construct the permalink:**

```
/<categories-joined-by-slash>/<year>/<month>/<day>/<slug>.html
```

- `categories`: from the `categories` array, joined with `/`
- `date`: from the `date` field, split into `YYYY/MM/DD`
- `slug`: the filename without the date prefix and `.md` extension
  (e.g., `2026-02-13-my-post.md` → `my-post`)

**Example:** A post with `categories: [mcp, vscode, ai, tutorial]`,
`date: 2026-01-28`, filename `2026-01-28-building-charts.md`:

```yaml
permalink: /mcp/vscode/ai/tutorial/2026/01/28/building-charts.html
```

## Known Pitfalls & Why These Rules Exist

### 1. Doubled `/pt-br/pt-br/` in URLs (404 errors)

**Problem:** Jekyll automatically adds the directory name as a category for
posts in subdirectories. Posts in `pt-br/_posts/` get `pt-br` as a hidden
category. Combined with polyglot's `/pt-br/` URL prefix, this creates
`/pt-br/pt-br/<categories>/...` — a URL that doesn't match what the listing
page links to.

**Fix:** The explicit `permalink` on PT-BR posts overrides the auto-generated
URL, removing the directory-based `pt-br` category. Polyglot then adds its
single `/pt-br/` prefix correctly.

### 2. English pages showing Portuguese content

**Problem:** Without `lang: en` on English pages, polyglot may render
Portuguese versions at English URLs when both language versions share the
same permalink.

**Fix:** Always set `lang: en` on English pages and posts, and `lang: pt-br`
on Portuguese pages and posts. This ensures each file only appears in its
respective language build.

### 3. PT-BR posts showing English content

**Problem:** Polyglot's directory-based content replacement does NOT work
reliably for `_posts`. If you remove `lang` from posts expecting polyglot
to auto-detect language from the `pt-br/` directory, PT-BR post pages may
render English content instead.

**Fix:** PT-BR posts must be fully self-contained with `lang: pt-br` in
frontmatter. Do NOT rely on directory-based language detection for posts.

### 4. "pt-br" appearing as a category badge

**Problem:** Because Jekyll treats the directory name as a category, the
posts listing shows "pt-br" as a category badge alongside real categories.

**Fix:** The explicit `permalink` prevents this by overriding the
auto-generated URL. The `categories` array in frontmatter should only
contain real content categories — never include `pt-br`.

### 5. Translation drift from full re-translations

**Problem:** When a single sentence changes in a 300-line post, the entire file
gets flagged as stale and re-translated from scratch. The agent has no memory of
prior translation choices, so unchanged paragraphs may get subtly different
phrasing each time — different synonyms, different sentence structures, different
transition phrases. Over multiple edit cycles, this erodes voice consistency.
The glossary prevents *term* drift (200+ technical terms locked), but the
connective tissue — verb conjugations, transition phrases, sentence structure —
can still vary.

**Fix:** Use diff-based patching. The workflow runs `git diff` to identify exactly
what changed in the English source, reads the existing PT-BR translation as the
base document, and patches only the changed portions. Unchanged PT-BR text is
preserved verbatim. If the diff exceeds ~60% of lines (major rewrite), fall back
to full re-translation but still read the existing PT-BR first to absorb the
established voice.

### 6. Polyglot rewrites internal links to external projects

**Problem:** Polyglot automatically rewrites any URL in rendered HTML that
matches `site.url` (e.g., `https://samueltauil.github.io/...`), adding the
`/pt-br/` language prefix. This breaks links to separate projects hosted on
the same GitHub Pages domain (e.g., `/skills-hub`, `/other-project`) because
those projects have no `/pt-br/` version.

In markdown source: `[Live Site](https://samueltauil.github.io/skills-hub)`
Rendered by polyglot: `<a href="https://samueltauil.github.io/pt-br/skills-hub">`

**Fix:** In PT-BR files, convert affected links from markdown syntax to HTML
using polyglot's `{% static_href %}` tag, which prevents URL rewriting:

```html
<a {% static_href %}href="https://samueltauil.github.io/skills-hub"{% endstatic_href %}>Live Site</a>
```

This applies to any link pointing to `samueltauil.github.io/<path>` where
`<path>` is a separate project, not a page on this site. Links to
`github.com/...` are not affected (different domain).

### 7. `site.description` not translated in layouts

**Problem:** The `{{ site.description }}` Liquid variable used in layouts
(e.g., the hero tagline on the home page) pulls from `_config.yml`, which
contains a single English string. Polyglot does not translate `_config.yml`
values, so PT-BR pages display the English description.

**Fix:** Use `site.active_lang` conditionals in layouts instead of relying
on `{{ site.description }}` alone. The translated text must be hardcoded
in the layout template:

```liquid
{% if site.active_lang == 'pt-br' %}
<p class="tagline">Translated description here.</p>
{% else %}
<p class="tagline">{{ site.description }}</p>
{% endif %}
```

## Translation Quality Checklist

- [ ] All glossary terms preserved in English
- [ ] Code blocks identical to English original
- [ ] URLs and image paths unchanged
- [ ] Frontmatter structure intact
- [ ] `lang: en` set on every English file (pages and posts)
- [ ] `lang: pt-br` set on every PT-BR file (pages and posts)
- [ ] Every PT-BR post has an explicit `permalink` matching the English URL pattern
- [ ] `permalink` does NOT contain `pt-br` as a path segment
- [ ] `categories` array does NOT include `pt-br`
- [ ] Links to external projects on same domain use `{% static_href %}` in PT-BR files
- [ ] Natural-sounding Brazilian Portuguese
- [ ] No machine-translation artifacts
- [ ] Consistent verb tense and pronoun usage
- [ ] Toggle switch navigates correctly between EN ↔ PT-BR versions
