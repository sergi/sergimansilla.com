'use strict';

// hexo-renderer-marked appends an empty anchor to every heading:
//   <a href="#id" class="headerlink" title="Heading text"></a>
// The title attribute duplicates the heading's accessible name, so
// screen readers announce every heading twice, and each empty anchor
// is a pointless keyboard focus stop. Hide the anchors from the
// accessibility tree and the tab order instead of patching
// node_modules. Same filter pattern as page-classes.js.
hexo.extend.filter.register('_after_html_render', function (html) {
  if (typeof html !== 'string') return html;

  return html.replace(
    /<a\b([^>]*\bclass=(["'])headerlink\2[^>]*)>/gi,
    function (anchor, attrs) {
      if (/\btabindex=/i.test(attrs)) return anchor;
      return '<a' + attrs + ' aria-hidden="true" tabindex="-1">';
    }
  );
}, 10);
