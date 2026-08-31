---
layout: page
title: Topics
description: "Every topic covered on this blog: GitHub Copilot, agentic workflows, MCP, VS Code, DevOps, healthcare data, and developer tooling."
permalink: /categories/
lang: en
---

<p class="tagline" style="color: #8b949e;">Browse by topic. Each page collects everything written on that subject.</p>

<ul class="post-list">
{% assign sorted_categories = site.categories | sort %}
{% for category in sorted_categories %}
  {% assign name = category[0] %}
  {% assign posts = category[1] %}
  {% assign cat_page = site.pages | where: "category", name | first %}
  {% if cat_page %}
  <li class="card" style="margin-bottom: 1rem;">
    <h4 style="margin: 0.5rem 0;"><a href="{{ cat_page.url | relative_url }}">{{ cat_page.title | escape }}</a></h4>
    {% if cat_page.description %}<p style="margin: 0.5rem 0; font-size: 0.9rem; color: #8b949e;">{{ cat_page.description }}</p>{% endif %}
    <span class="card-meta">{{ posts.size }} post{% if posts.size != 1 %}s{% endif %}</span>
  </li>
  {% endif %}
{% endfor %}
</ul>

## Tags

<ul class="tag-cloud">
{% assign sorted_tags = site.tags | sort %}
{% for tag in sorted_tags %}
  <li><a href="{{ '/tags/#' | append: tag[0] | relative_url }}">{{ tag[0] }}<span class="tag-count">{{ tag[1].size }}</span></a></li>
{% endfor %}
</ul>
