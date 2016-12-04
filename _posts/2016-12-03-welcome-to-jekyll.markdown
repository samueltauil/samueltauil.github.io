---
layout: post
title:  "OpenShift 3 - Load Balance"
date:   2016-12-03 21:54:52 -0500
categories: openshift load balance containers
---


<!-- To add new posts, simply add a file in the `_posts` directory that follows the convention `YYYY-MM-DD-name-of-post.ext` and includes the necessary front matter. Take a look at the source for this post to get an idea about how it works. -->

[![asciicast](https://asciinema.org/a/90122.png)](https://asciinema.org/a/90122)

1. Create the app :
  ```
  oc new-app https://github.com/samueltauil/loadbalance
  ```

2. Expose the route:
  ```
  oc expose svc loadbalance
  ```

3. Take a note of the route URL:
  ```
  oc get routes
  ```

4. Scale up the pods:
  ```
  oc scale --replicas=5 dc/loadbalance
  ```

5. Show hostnames from pods:
  ```shell
  for x in {0..4}; do curl <route_url>; done
  ```


<!-- {% highlight shell %}
oc login -u system:admin
{% endhighlight %} -->

<!-- Check out the [Jekyll docs][jekyll-docs] for more info on how to get the most out of Jekyll. File all bugs/feature requests at [Jekyll’s GitHub repo][jekyll-gh]. If you have questions, you can ask them on [Jekyll Talk][jekyll-talk].

#[jekyll-docs]: http://jekyllrb.com/docs/home
#[jekyll-gh]:   https://github.com/jekyll/jekyll
#[jekyll-talk]: https://talk.jekyllrb.com/ -->
