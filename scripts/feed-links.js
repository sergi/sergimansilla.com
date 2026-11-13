'use strict';

const { escapeHTML } = require('hexo-util');

// The theme already advertises the Atom feed. Add the RSS feed alongside it
// so feed readers can discover both formats.
const root = String(hexo.config.root || '/').replace(/\/+$/, '');
const rssPath = `${root}/rss.xml`;

hexo.extend.injector.register(
  'head_end',
  () => `<link rel="alternate" type="application/rss+xml" href="${rssPath}" title="${escapeHTML(hexo.config.title)}">`,
  'default'
);
