---
layout: page
title: Tags
description: "All posts grouped by tag, from GitHub Copilot and agentic workflows to FHIR, MCP servers, and developer tooling."
permalink: /tags/
lang: en
---

<p class="tagline" style="color: #8b949e;">Every tag used on the blog, with the posts filed under each one.</p>

{% assign sorted_tags = site.tags | sort %}

<ul class="tag-cloud">
{% for tag in sorted_tags %}
  <li><a href="#{{ tag[0] }}">{{ tag[0] }}<span class="tag-count">{{ tag[1].size }}</span></a></li>
{% endfor %}
</ul>

{% for tag in sorted_tags %}
<h2 id="{{ tag[0] }}">{{ tag[0] }}</h2>
<ul class="post-list">
  {% for post in tag[1] %}
  <li class="card" style="margin-bottom: 0.75rem;">
    <span class="card-meta">{{ post.date | date: "%B %d, %Y" }}</span>
    <h4 style="margin: 0.5rem 0;"><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h4>
  </li>
  {% endfor %}
</ul>
{% endfor %}
