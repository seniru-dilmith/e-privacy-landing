// The reading page: the scroll progress bar, and panels sliding in as they reach the screen.
// The game at /try is game.js.
(function () {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- scroll progress and entrances ----
  const progress = $('#progress');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!calm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.remove('pending'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px' });
    for (const el of $$('.reveal')) {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('pending'); io.observe(el); }
    }
  }

})();
