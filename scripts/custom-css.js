'use strict';

const fs = require('fs');
const path = require('path');

// Append site-level CSS to the theme stylesheet so small theme overrides
// can live in the main repository instead of the theme submodule, without
// costing an extra request. The leading underscore keeps Hexo from also
// publishing source/css/_custom.css as its own file.
const customCssPath = path.join(hexo.source_dir, 'css', '_custom.css');

hexo.extend.filter.register('after_render:css', (str, data) => {
  if (!data.path || !data.path.endsWith(path.join('css', 'style.styl'))) return str;
  return str + '\n' + fs.readFileSync(customCssPath, 'utf8');
});
