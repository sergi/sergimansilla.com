'use strict';

// Floating "back to top" button. Long posts scroll for thousands of
// pixels with no way back up (the slim nav is the only top anchor),
// so inject a small fixed button after ~600px of scrolling. Respects
// prefers-reduced-motion: jump instead of smooth-scroll.
hexo.extend.injector.register(
  'body_end',
  () => `
<button type="button" id="back-to-top" aria-label="Back to top">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</button>
<script>
  (function () {
    var btn = document.getElementById('back-to-top');
    if (!btn) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function onScroll() {
      btn.classList.toggle('visible', window.scrollY > 600);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
    });
  })();
</script>`,
  'default'
);
