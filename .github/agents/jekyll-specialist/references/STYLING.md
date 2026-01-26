# Styling Reference

## Color Palette (SCSS Variables)

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

## Inline Color Codes (for index.md)

| Purpose | Color | Hex |
|---------|-------|-----|
| Keys | Blue | `#58a6ff` |
| Values | Orange | `#ffa657` |
| Section headers | Purple | `#a371f7` |
| Descriptions | Green | `#7ee787` |
| Comments | Gray | `#6e7681` |
| Badge items | Orange bg | `rgba(255,166,87,0.1)` |

## Key CSS Classes

| Class | Use |
|-------|-----|
| `.code-window` | Terminal-style window with colored dots |
| `.badge` | Pill-shaped links with icons |
| `.card` | Content cards with hover effects |
| `.photo-gallery` | Grid layout for photos |
| `.camera-list` | Vertical list for cameras |
| `.sidebar-section` | Sidebar content blocks |
| `.hero-compact` | Compact hero section |
| `.home-grid` | Two-column home layout |
| `.home-main` | Left column (agent file) |
| `.home-sidebar` | Right column (posts) |

## Photo Gallery Styling

- Grid: `minmax(200px, 1fr)` columns
- Hover: `translateY(-4px)` with purple box-shadow
- Images: `loading="lazy"` for performance

## Header Gradient

Purple-blue gradient from left:
```scss
background: linear-gradient(to right, rgba($accent-purple, 0.15), transparent 50%);
```
