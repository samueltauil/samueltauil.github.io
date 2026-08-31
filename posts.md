---
layout: page
title: Posts
permalink: /posts/
lang: en
---

<section class="section">
  <p class="tagline page-intro">Technical articles, tutorials, and insights on cloud-native technologies, AI, and developer tools.</p>
</section>

<ul class="post-list">
{% for post in site.posts %}
  <li class="card">
    {% include post-kicker.html post=post show_reading_time=true %}
    <h2><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h2>
    {% assign summary = post.description | default: post.excerpt %}
    {% if summary %}
    <p>{{ summary | strip_html | truncate: 175 }}</p>
    {% endif %}
  </li>
{% endfor %}
</ul>
