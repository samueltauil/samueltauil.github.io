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
- `lang: pt-br` is set automatically by jekyll-polyglot based on directory

## Translation Quality Checklist

- [ ] All glossary terms preserved in English
- [ ] Code blocks identical to English original
- [ ] URLs and image paths unchanged
- [ ] Frontmatter structure intact
- [ ] Natural-sounding Brazilian Portuguese
- [ ] No machine-translation artifacts
- [ ] Consistent verb tense and pronoun usage
