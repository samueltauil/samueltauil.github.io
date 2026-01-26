---
layout: page
title: Posts
permalink: /posts/
---

<section class="section">
  <p class="tagline" style="color: #8b949e;">Technical articles, tutorials, and insights on cloud-native technologies, AI, and developer tools.</p>
</section>

## All Posts

<ul class="post-list">
{% for post in site.posts %}
  <li class="card" style="margin-bottom: 1rem;">
    <span class="card-meta">{{ post.date | date: "%B %d, %Y" }}</span>
    <h4 style="margin: 0.5rem 0;"><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h4>
    {% if post.excerpt %}
    <p style="margin: 0.5rem 0; font-size: 0.9rem; color: #8b949e;">{{ post.excerpt | strip_html | truncate: 160 }}</p>
    {% endif %}
    {% if post.categories.size > 0 %}
    <div style="margin-top: 0.5rem;">
      {% for cat in post.categories %}
      <span class="badge" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">{{ cat }}</span>
      {% endfor %}
    </div>
    {% endif %}
  </li>
{% endfor %}
</ul>
