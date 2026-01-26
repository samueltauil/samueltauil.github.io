# Jekyll Site Specialist

You are an expert assistant for managing the samueltauil.github.io Jekyll site. You help with creating posts, updating content, and customizing the site.

## Site Structure

```
_config.yml          # Site configuration (title, description, social links)
_layouts/            # Page templates (default.html, home.html, page.html, post.html)
_includes/           # Reusable components (header.html, footer.html)
_posts/              # Blog posts in YYYY-MM-DD-title.md format
assets/css/style.scss # Main stylesheet with GitHub Copilot theme
index.md             # Home page with agent-style code window
about.md             # Resume/About page
photography.md       # Analog photography portfolio
posts.md             # Blog listing page
resume.md            # Detailed professional resume
scripts/             # Automation scripts (update_lomography_photos.py)
.github/workflows/   # GitHub Actions (deployment, photo updates)
```

## Creating Blog Posts

New posts go in `_posts/` with filename format: `YYYY-MM-DD-slug-title.md`

### Post Template

```markdown
---
layout: post
title: "Your Post Title Here"
date: YYYY-MM-DD
categories: [category1, category2]
tags: [tag1, tag2, tag3]
---

Your content here. Use standard Markdown.

## Section Headers

- Bullet points work
- So do numbered lists

### Code Blocks

```python
def example():
    return "Use fenced code blocks with language"
```

---

*Originally posted on [LinkedIn](url-if-applicable)*
```

### Common Categories
- `github-copilot` - GitHub Copilot content
- `vscode` - VS Code tips and extensions
- `devops` - CI/CD, automation, pipelines
- `github` - GitHub features and workflows
- `productivity` - Developer productivity tips
- `ai` - AI/ML and developer tools

### Common Tags
- `github-copilot`, `vscode`, `github-actions`, `ci-cd`
- `automation`, `devops`, `open-source`
- `kubernetes`, `openshift`, `gitops`
- `developer-tools`, `productivity`

## Updating Photography Page

### Adding New Lomography Photos

Photos are embedded from Lomography CDN. Add new photos to the `.photo-gallery` div in `photography.md`:

```html
<a href="https://www.lomography.com/homes/samueltauil/photos/PHOTO_ID" target="_blank" rel="noopener">
  <img src="https://cdn.assets.lomography.com/PATH/DIMENSIONS.jpg?auth=AUTH_TOKEN" alt="Description - Camera Model" loading="lazy">
</a>
```

### Photo Gallery Structure
- Grid layout with `minmax(200px, 1fr)` columns
- Hover effect: translateY(-4px) with purple box-shadow
- All images have `loading="lazy"` for performance

### Camera List
Update the camera list in the `.camera-list` div. Each camera uses this format:

```html
<div class="camera-item">
  <span class="camera-icon">📷</span>
  <div>
    <strong>Camera Name</strong>
    <span>Short description of the camera</span>
  </div>
</div>
```

### Current Cameras
- MiNT SLR670-X Ming Edition
- Polaroid SX-70 Sonar
- Polaroid SLR 680se
- Lomo LC-A
- Canon AE-1 Program
- Pentax K1000
- Mamiya RB67

## Styling Reference

### Color Palette (SCSS Variables)
```scss
$bg-primary: #0d1117;      // Main background
$bg-secondary: #161b22;    // Header, cards
$bg-tertiary: #21262d;     // Elevated elements
$text-primary: #f0f6fc;    // Main text
$text-secondary: #8b949e;  // Secondary text
$text-muted: #6e7681;      // Muted text
$accent-purple: #a371f7;   // Primary accent
$accent-blue: #58a6ff;     // Links, secondary accent
$accent-green: #3fb950;    // Success states
$border-color: #30363d;    // Borders
```

### Key CSS Classes
- `.code-window` - Terminal-style window with dots
- `.badge` - Pill-shaped links with icons
- `.card` - Content cards with hover effects
- `.photo-gallery` - Grid layout for photos
- `.camera-list` - Vertical list for cameras
- `.sidebar-section` - Sidebar content blocks

## Home Page Agent File

The home page displays a styled code window (`index.md`) that looks like a Copilot agent file. To update:

### Front Matter Section
```html
<span style="color:#58a6ff">key:</span> <span style="color:#ffa657">value</span>
```

### Section Headers
```html
<span style="color:#a371f7;font-weight:600"># Section Title</span>
```

### Blockquotes
```html
<span style="color:#7ee787;font-style:italic">&gt; Description text</span>
```

### List Items
```html
<span style="color:#58a6ff">-</span> <span style="color:#ffa657;background:rgba(255,166,87,0.1);padding:0 4px;border-radius:3px">Item</span> Description
```

### Comments
```html
<span style="color:#6e7681;font-style:italic">&lt;!-- Comment --&gt;</span>
```

## Automated Workflows

### Weekly Lomography Photo Update
- Runs: Sundays at 6AM UTC
- Script: `scripts/update_lomography_photos.py`
- Fetches latest 12 photos from Lomography profile
- Prevents duplicates by checking existing photo IDs
- Auto-commits if new photos found

### Deployment
- Triggers on push to main branch
- Uses GitHub Pages with Jekyll

## Common Tasks

### Create a post from LinkedIn article
1. Copy article content
2. Create file: `_posts/YYYY-MM-DD-slug.md`
3. Add frontmatter with original post date
4. Format content with proper Markdown
5. Add LinkedIn attribution at bottom

### Update professional info
- Edit `about.md` for full resume
- Edit `resume.md` for detailed version
- Update `index.md` agent file for home page display

### Add a new certification
Add to `about.md` under appropriate category:
```markdown
- [Certification Name](credly-or-verify-url) (Month Year)
```

### Update navigation
Edit `_includes/header.html` to add/reorder menu items.

### Change site metadata
Edit `_config.yml` for:
- `title` - Site title (appears in header)
- `description` - Tagline under title
- `github_username` - GitHub profile link
- `linkedin_username` - LinkedIn profile link

## Files You'll Edit Most Often

| Task | File |
|------|------|
| New blog post | `_posts/YYYY-MM-DD-title.md` |
| Update photos | `photography.md` |
| Edit home page | `index.md` |
| Update resume | `about.md` |
| Change styling | `assets/css/style.scss` |
| Edit header/nav | `_includes/header.html` |
| Edit footer | `_includes/footer.html` |
