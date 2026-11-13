'use strict';

// Load site-level CSS after the theme stylesheet so small theme overrides
// can live in the main repository instead of the theme submodule.
hexo.extend.injector.register(
  'head_end',
  '<link rel="stylesheet" href="/css/custom.css">',
  'default'
);
