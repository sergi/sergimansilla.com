'use strict';

/**
 * Adds complete Open Graph, Twitter Card and schema.org metadata to every
 * generated HTML page.
 *
 * Per-post overrides (all optional) go in the post front matter:
 *
 *   description: A short summary shown when the post is shared.
 *   image: /images/my-post-cover.jpg
 *   image_alt: A description of the image for screen readers.
 *   image_width: 1200
 *   image_height: 630
 *
 * If no image is set, the first <img> in the post is used. Otherwise the
 * site-wide fallback from _config.yml (`social.image`) is used.
 */

const fs = require('fs');
const path = require('path');
const { stripHTML, encodeURL } = require('hexo-util');

const FALLBACK_DESCRIPTION = "Sergi Mansilla's thoughts and articles";
const FALLBACK_IMAGE = '/images/social-card.jpg';
const FALLBACK_IMAGE_WIDTH = 1200;
const FALLBACK_IMAGE_HEIGHT = 630;

const LOCALES = {
  ca: 'ca_ES',
  de: 'de_DE',
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  it: 'it_IT',
  ja: 'ja_JP',
  ko: 'ko_KR',
  nl: 'nl_NL',
  pt: 'pt_PT',
  ru: 'ru_RU',
  zh: 'zh_CN'
};

const IMAGE_TYPES = {
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
};

const EXISTING_TAG_PATTERNS = [
  /<meta\s+name=["']description["'][^>]*>\s*/gi,
  /<meta\s+property=["']og:[^"']*["'][^>]*>\s*/gi,
  /<meta\s+property=["'](?:article|book|profile):[^"']*["'][^>]*>\s*/gi,
  /<meta\s+name=["']twitter:[^"']*["'][^>]*>\s*/gi,
  /<meta\s+property=["']fb:[^"']*["'][^>]*>\s*/gi,
  /<link\s+rel=["']canonical["'][^>]*>\s*/gi,
  /<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi
];

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value.toArray === 'function') return value.toArray();
  if (typeof value.each === 'function') {
    const items = [];
    value.each(item => items.push(item));
    return items;
  }
  return [value];
}

function firstImageIn(html) {
  const match = /<img\b[^>]*\bsrc=["']([^"']+)["']/i.exec(html || '');
  return match ? match[1] : '';
}

function normalizeImage(image) {
  if (!image) return '';
  const value = String(image).trim();
  if (!value || /^data:/i.test(value)) return '';
  if (value.startsWith('//')) return `https:${value}`;
  return value;
}

function pickImage(page, config) {
  const candidates = [
    page.image,
    page.cover,
    page.thumbnail,
    page.og_image,
    ...toArray(page.photos).map(photo => {
      if (typeof photo === 'string') return photo;
      return photo && (photo.src || photo.url);
    }),
    firstImageIn(page.content),
    config.social && config.social.image,
    FALLBACK_IMAGE
  ];

  for (const candidate of candidates) {
    const image = normalizeImage(candidate);
    if (image) return image;
  }
  return FALLBACK_IMAGE;
}

function toAbsoluteUrl(value, config) {
  if (!value) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  const base = String(config.url || '').replace(/\/+$/, '');
  return encodeURL(`${base}/${String(value).replace(/^\/+/, '')}`);
}

function getCanonical(pathname, config) {
  let relative = String(pathname || '')
    .replace(/^\/+/, '')
    .replace(/index\.html$/i, '');

  if (relative && !relative.endsWith('/') && !/\.[a-z0-9]+$/i.test(relative)) {
    relative += '/';
  }

  const base = String(config.url || '').replace(/\/+$/, '');
  return encodeURL(`${base}/${relative}`);
}

function resolveLocalImage(image, config) {
  if (!image || /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(image)) return '';

  const clean = image.split(/[?#]/)[0];
  const sourceDir = hexo.source_dir;
  const themeDir = hexo.theme_dir || path.join(hexo.base_dir, 'themes', hexo.config.theme);
  const candidates = [];

  if (clean.startsWith('/')) {
    const relative = clean.replace(/^\/+/, '');
    candidates.push(path.join(sourceDir, relative));
    candidates.push(path.join(themeDir, 'source', relative));
  } else {
    candidates.push(path.join(sourceDir, clean));
  }

  return candidates.find(file => fs.existsSync(file)) || '';
}

function readImageSize(file) {
  try {
    const buffer = fs.readFileSync(file);

    // PNG: IHDR width/height are at bytes 16 and 20.
    if (buffer.length > 24 && buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
      };
    }

    // JPEG: walk the markers until a start-of-frame segment.
    if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;

      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }

        const marker = buffer[offset + 1];

        if (marker === 0xd8 || marker === 0xd9) {
          offset += 2;
          continue;
        }

        if (marker === 0xda) break;

        const length = buffer.readUInt16BE(offset + 2);
        if (length < 2) break;

        const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf &&
          marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

        if (isStartOfFrame) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7)
          };
        }

        offset += 2 + length;
      }
    }
  } catch (err) {
    // Image dimensions are optional; ignore unreadable files.
  }

  return null;
}

function getImageSize(image, page, config) {
  const width = Number(page.image_width);
  const height = Number(page.image_height);

  if (width > 0 && height > 0) return { width, height };

  if (image === FALLBACK_IMAGE) {
    return { width: FALLBACK_IMAGE_WIDTH, height: FALLBACK_IMAGE_HEIGHT };
  }

  const file = resolveLocalImage(image, config);
  return file ? readImageSize(file) : null;
}

function getType(page) {
  return page.__post || page.layout === 'post' ? 'article' : 'website';
}

function getTitle(page, config) {
  if (page.title) return page.title;
  if (page.archive) return 'Archives';
  if (page.category) return `Category: ${page.category}`;
  if (page.tag) return `Tag: ${page.tag}`;
  return config.title;
}

function getImageAlt(page, config, title, image) {
  if (page.image_alt) return page.image_alt;

  const fallback = config.social && config.social.image;
  if (image === FALLBACK_IMAGE || image === fallback) return config.title;

  return title;
}

function shorten(value, maxLength = 200) {
  if (!value) return '';

  let text = stripHTML(String(value)).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;

  text = text.slice(0, maxLength - 1);
  const lastSpace = text.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) text = text.slice(0, lastSpace);

  return `${text.replace(/[\s.,;:!?\-–—]+$/, '')}…`;
}

function getDescription(page, config) {
  const candidates = [
    page.description,
    page.excerpt,
    page.__post || page.__page ? page.content : '',
    config.description,
    FALLBACK_DESCRIPTION
  ];

  for (const candidate of candidates) {
    const text = shorten(candidate);
    if (text) return text;
  }

  return FALLBACK_DESCRIPTION;
}

function getTags(page) {
  const tags = toArray(page.tags)
    .map(tag => (typeof tag === 'string' ? tag : tag && tag.name))
    .filter(Boolean);

  return Array.from(new Set(tags));
}

function getCategories(page) {
  const categories = toArray(page.categories)
    .map(category => (typeof category === 'string' ? category : category && category.name))
    .filter(Boolean);

  return Array.from(new Set(categories));
}

function getLocale(config) {
  const language = String(config.language || 'en').toLowerCase();
  return LOCALES[language] || language.replace('-', '_');
}

function getTwitterHandle(config) {
  const handle = (config.social && config.social.twitter) || config.twitter;
  if (!handle) return '';
  return String(handle).startsWith('@') ? String(handle) : `@${handle}`;
}

function getSameAs(config) {
  const social = config.social || {};
  return [social.bluesky, social.linkedin, social.github]
    .filter(Boolean)
    .map(value => String(value));
}

function toIso(value) {
  if (!value) return '';
  const date = value instanceof Date
    ? value
    : new Date(typeof value.valueOf === 'function' ? value.valueOf() : value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function imageTypeFor(image) {
  const match = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(image || '');
  return match ? IMAGE_TYPES[match[1].toLowerCase()] || '' : '';
}

function buildJsonLd(options) {
  const { page, config, canonical, title, description, image, imageAlt, imageSize, tags, categories } = options;
  const author = {
    '@type': 'Person',
    name: config.author || config.title,
    url: getCanonical('about/index.html', config)
  };

  const sameAs = getSameAs(config);
  if (sameAs.length) author.sameAs = sameAs;

  if (getType(page) === 'article') {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      url: canonical,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonical
      },
      image: imageSize
        ? {
            '@type': 'ImageObject',
            url: image,
            width: imageSize.width,
            height: imageSize.height,
            caption: imageAlt
          }
        : image,
      author,
      publisher: author,
      inLanguage: config.language || 'en'
    };

    const published = toIso(page.date);
    const modified = toIso(page.updated);

    if (published) data.datePublished = published;
    if (modified) data.dateModified = modified;
    if (tags.length) data.keywords = tags.join(', ');
    if (categories.length) data.articleSection = categories[0];

    return data;
  }

  const siteUrl = getCanonical('index.html', config);

  if (page.__index) {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.title,
      url: siteUrl,
      description,
      inLanguage: config.language || 'en',
      author
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url: canonical,
    description,
    isPartOf: {
      '@type': 'WebSite',
      name: config.title,
      url: siteUrl
    },
    inLanguage: config.language || 'en',
    author
  };
}

function buildMetaTags(options) {
  const { page, config, canonical, title, description, image, imageAlt, imageSize, tags, categories } = options;
  const lines = [];

  const meta = (name, content) => {
    if (content === undefined || content === null || content === '') return;
    lines.push(`  <meta name="${escapeAttr(name)}" content="${escapeAttr(content)}">`);
  };

  const og = (property, content) => {
    if (content === undefined || content === null || content === '') return;
    lines.push(`  <meta property="${escapeAttr(property)}" content="${escapeAttr(content)}">`);
  };

  meta('description', description);
  meta('keywords', tags.length ? tags.join(', ') : config.keywords);
  lines.push(`  <link rel="canonical" href="${escapeAttr(canonical)}">`);

  og('og:type', getType(page));
  og('og:title', title);
  og('og:description', description);
  og('og:url', canonical);
  og('og:site_name', config.title);
  og('og:locale', getLocale(config));
  og('og:image', image);
  if (image.startsWith('https://')) og('og:image:secure_url', image);
  if (imageSize) {
    og('og:image:width', imageSize.width);
    og('og:image:height', imageSize.height);
  }
  og('og:image:alt', imageAlt);

  const imageType = imageTypeFor(image);
  if (imageType) og('og:image:type', imageType);

  if (getType(page) === 'article') {
    og('article:published_time', toIso(page.date));
    og('article:modified_time', toIso(page.updated));
    og('article:author', config.author || config.title);
    if (categories.length) og('article:section', categories[0]);
    tags.forEach(tag => og('article:tag', tag));
  }

  const twitter = getTwitterHandle(config);
  meta('twitter:card', image ? 'summary_large_image' : 'summary');
  if (twitter) {
    meta('twitter:site', twitter);
    meta('twitter:creator', twitter);
  }
  meta('twitter:title', title);
  meta('twitter:description', description);
  if (image) {
    meta('twitter:image', image);
    meta('twitter:image:alt', imageAlt);
  }

  const jsonLd = JSON.stringify(buildJsonLd(options), null, 2)
    .replace(/<\/script/gi, '<\\/script');

  lines.push(`  <script type="application/ld+json">\n${jsonLd}\n  </script>`);

  return `  <!-- Social sharing metadata (Open Graph, Twitter Cards, JSON-LD) -->\n${lines.join('\n')}`;
}

function removeExistingTags(html) {
  return EXISTING_TAG_PATTERNS.reduce((result, pattern) => result.replace(pattern, ''), html);
}

function injectTags(html, block) {
  const cleaned = removeExistingTags(html);
  if (!/<\/head>/i.test(cleaned)) return cleaned;
  return cleaned.replace(/<\/head>/i, `\n${block}\n</head>`);
}

hexo.extend.filter.register('_after_html_render', function(html, locals) {
  if (!html || !locals || !locals.page || !/<head[\s>]/i.test(html)) return html;

  try {
    const page = locals.page;
    const config = locals.config || hexo.config;
    const canonical = getCanonical(locals.path || page.path, config);
    const title = getTitle(page, config);
    const description = getDescription(page, config);
    const image = pickImage(page, config);

    const options = {
      page,
      config,
      canonical,
      title,
      description,
      image: toAbsoluteUrl(image, config),
      imageAlt: getImageAlt(page, config, title, image),
      imageSize: getImageSize(image, page, config),
      tags: getTags(page),
      categories: getCategories(page)
    };

    return injectTags(html, buildMetaTags(options));
  } catch (err) {
    hexo.log.warn('social-meta: %s', err && err.message ? err.message : err);
    return html;
  }
}, 100);
