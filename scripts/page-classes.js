'use strict';

// Add a page-specific class to <body> so CSS can target individual pages
// without changing the theme templates.
hexo.extend.filter.register('_after_html_render', function(html, locals) {
  const page = locals.page || {};
  const path = String(locals.path || '')
    .replace(/\/?index\.html$/i, '')
    .replace(/\/+$/, '');

  const classes = [];

  if (page.__index) classes.push('page-home');
  if (page.__post) classes.push('page-post');
  if (page.__page) classes.push('page-page');
  if (page.archive) classes.push('page-archive');
  if (page.category) classes.push('page-category');
  if (page.tag) classes.push('page-tag');
  if (path) classes.push(`page-${path.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);

  if (!classes.length) return html;

  return html.replace(/<body([^>]*)>/i, (match, attrs) => {
    const classNames = classes.join(' ');

    if (/\bclass=(["'])/i.test(attrs)) {
      return `<body${attrs.replace(/\bclass=(["'])(.*?)\1/i, (m, quote, existing) => `class=${quote}${existing} ${classNames}${quote}`)}>`;
    }

    return `<body${attrs} class="${classNames}">`;
  });
}, 10);
