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
  {%- assign kicker = '' -%}
  {%- for cat in post.categories -%}
    {%- unless site.languages contains cat -%}
      {%- if kicker == '' -%}{%- assign kicker = cat -%}{%- endif -%}
    {%- endunless -%}
  {%- endfor -%}
  {%- assign minutes = post.content | number_of_words | divided_by: 200 | plus: 1 -%}
  <li class="card">
    <p class="story-kicker">
      {% if kicker != '' %}<a href="{{ '/categories/' | append: kicker | append: '/' | relative_url }}">{{ kicker }}</a>{% endif %}
      <span class="story-dot">&middot;</span>
      <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%d de %B de %Y" }}</time>
      <span class="story-dot">&middot;</span>
      {{ minutes }} min de leitura
    </p>
    <h4><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h4>
    {% assign summary = post.description | default: post.excerpt %}
    {% if summary %}
    <p>{{ summary | strip_html | truncate: 175 }}</p>
    {% endif %}
  </li>
{% endfor %}
</ul>
