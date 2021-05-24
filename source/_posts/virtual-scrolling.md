---
title: 'Virtual list in vanilla JavaScript'
date: Sun, 12 May 2013 21:20:28 +0000
draft: false
tags: [rendering,performance,browser,javascript,programming]
---

Let's say you need to show a scrolling list with millions of rows, or even a reasonably big list with visually complex rows, each one composed by several DOM elements or CSS3 effects.

If you try to render this the naive way, for example by appending rows into a DOM container with the CSS  `overflow` property set to `scroll` (or `auto`), you will most likely run into performance issues. This is because all the items in the list are cached, thus your memory consumption will certainly go up, and since all the DOM nodes composing the rows of the list are appended in the document, the browser is trying to properly render them all making your CPU pretty busy as you scroll. If these rows change any style say, on hover, you will trigger a [reflow](http://www-archive.mozilla.org/newlayout/doc/reflow.html) and the experience will be even more sluggish.

<!-- more -->

Many websites and apps have run into this issue before and solved it using _virtual renderers_, which trick the viewer into thinking that she is looking at a massive list, when in reality only the items that are currently in the viewport are being loaded and rendered. A popular application that does that is the [ACE editor](http://ace.ajax.org/), which can load a massively big source code file while keeping scrolling snappy using this technique.

Anyway, I needed a virtually rendered list and I couldn't find readily available components in simple JavaScript that I could use (and that I liked), so I created my own: [virtual-list](https://github.com/sergi/virtual-list). Virtual list is a short and simple piece of code that doesn't depend on anything else, so you can drop it into any website and use it right away.

For example, here you have a 1 million row list: https://codepen.io/sergimansilla/pen/EELdeP?editors=1010#0

Each of these rows is generated on demand, not wasting any memory, and the list never has to manage more than ~30 rows at a time, no matter how long the list is in reality.

Please read more about how to use it in the project's [README](https://github.com/sergi/virtual-list#virtual-dom-list) and report any bugs or improvements you may find if you happen to start using it in your projects.