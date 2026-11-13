'use strict';

const root = String(hexo.config.root || '/');

const homeLink = [
  `<a class="main-nav-link home-nav-link" href="${root}" title="Home" aria-label="Home">`,
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">',
  '<path d="M12 3 2 12h3v9h5v-6h4v6h5v-9h3z"/>',
  '</svg>',
  '</a>'
].join('');

// Put the home link first in the nav; CSS floats it left so it sits before
// the right-floated "Articles" and "About" links.
hexo.extend.filter.register('_after_html_render', function(html) {
  return html.replace(/(<nav id="main-nav">)/i, `$1${homeLink}`);
}, 20);
