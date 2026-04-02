# samueltauil.github.io

Personal website and blog by **Samuel Tauil** — Senior Solution Engineer at Microsoft focused on Developer Experience (GitHub Copilot, VS Code, Codespaces). Built with Jekyll and hosted on GitHub Pages.

🌐 **Live site:** [samueltauil.github.io](https://samueltauil.github.io)

## What's on the Site

- **Blog** — Technical articles and tutorials on AI developer tools, agentic workflows, GitHub Copilot, MCP apps, and cloud-native technologies
- **About** — Professional background and core competencies
- **Photography** — Analog photography portfolio under the name *Expired Emulsions*, featuring instant film, Lomography, and vintage cameras
- **Bilingual** — Full content available in English and Brazilian Portuguese (pt-br) via [jekyll-polyglot](https://github.com/untra/polyglot)

## Tech Stack

- [Jekyll](https://jekyllrb.com/) 4.3 with a custom GitHub Copilot dark theme
- [jekyll-polyglot](https://github.com/untra/polyglot) for i18n (en / pt-br)
- [jekyll-feed](https://github.com/jekyll/jekyll-feed) & [jekyll-seo-tag](https://github.com/jekyll/jekyll-seo-tag)
- GitHub Pages + GitHub Actions for CI/CD

## Project Structure

```
├── _config.yml          # Site configuration
├── _data/               # Translation glossary and data files
├── _includes/           # Shared partials (header, footer)
├── _layouts/            # Page layouts (home, post, page, default)
├── _posts/              # Blog posts (English)
├── pt-br/               # Brazilian Portuguese content & posts
│   └── _posts/          # Blog posts (pt-br)
├── assets/
│   ├── css/style.scss   # Custom styles (GitHub Copilot dark theme)
│   └── images/          # Post images
├── scripts/             # Utility scripts (e.g. Lomography photo updater)
├── about.md             # About page
├── photography.md       # Photography portfolio page
├── posts.md             # Blog listing page
├── index.md             # Home page
└── Gemfile              # Ruby dependencies
```

## Local Development

```bash
# Install dependencies
bundle install

# Run locally
bundle exec jekyll serve

# View at http://localhost:4000
```

## Deployment

The site automatically deploys to GitHub Pages when changes are pushed to the `main` branch via GitHub Actions.

## Connect

- [GitHub](https://github.com/samueltauil)
- [LinkedIn](https://linkedin.com/in/samueltauil)
- [Instagram (Expired Emulsions)](https://instagram.com/expiredemulsions)

## License

Content © Samuel Tauil. Code MIT licensed.
