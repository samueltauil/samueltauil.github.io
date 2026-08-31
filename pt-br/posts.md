---
layout: page
title: Posts
permalink: /posts/
lang: pt-br
---

<section class="section">
  <p class="tagline page-intro">Artigos técnicos, tutoriais e insights sobre tecnologias cloud-native, IA e ferramentas de desenvolvedor.</p>
</section>

<ul class="post-list">
{% for post in site.posts %}
  <li class="card" style="margin-bottom: 1rem;">
    <span class="card-meta">{{ post.date | date: "%B %d, %Y" }}</span>
    <h4 style="margin: 0.5rem 0;"><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h4>
    {% assign summary = post.description | default: post.excerpt %}
    {% if summary %}
    <p style="margin: 0.5rem 0; font-size: 0.9rem; color: #8b949e;">{{ summary | strip_html | truncate: 160 }}</p>
    {% endif %}
    {% if post.categories.size > 0 %}
    <div style="margin-top: 0.5rem;">
      {% for cat in post.categories %}
      {% unless site.languages contains cat %}
      <a class="badge" href="{{ '/categories/' | append: cat | append: '/' | relative_url }}">{{ cat }}</a>
      {% endunless %}
      {% endfor %}
    </div>
    {% endif %}
  </li>
{% endfor %}
</ul>
