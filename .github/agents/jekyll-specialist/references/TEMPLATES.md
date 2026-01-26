# Templates Reference

## Blog Post Template

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

## Photo Gallery Item

Add to `.photo-gallery` div in `photography.md`:

```html
<a href="https://www.lomography.com/homes/samueltauil/photos/PHOTO_ID" target="_blank" rel="noopener">
  <img src="https://cdn.assets.lomography.com/PATH/DIMENSIONS.jpg?auth=AUTH_TOKEN" alt="Description - Camera Model" loading="lazy">
</a>
```

## Camera List Item

Add to `.camera-list` div in `photography.md`:

```html
<div class="camera-item">
  <span class="camera-icon">📷</span>
  <div>
    <strong>Camera Name</strong>
    <span>Short description of the camera</span>
  </div>
</div>
```

## Home Page Inline Styles

### Front Matter Key-Value
```html
<span style="color:#58a6ff">key:</span> <span style="color:#ffa657">value</span>
```

### Section Headers
```html
<span style="color:#a371f7;font-weight:600"># Section Title</span>
```

### Blockquotes/Descriptions
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
