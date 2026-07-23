const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The hero's hover-reveal shader is meaningless on touch (no persistent
// hover), so touch/narrow devices skip the ~296KB gzipped React+Three.js
// bundle entirely and just see the static dithered poster in the CSS
// background of .hero-canvas-layer instead.
const isTouchOrNarrow = window.matchMedia('(max-width: 720px), (hover: none)').matches;
if (!isTouchOrNarrow) {
  const heroScript = document.createElement('script');
  heroScript.src = 'assets/hero-bundle.js?v=3';
  heroScript.defer = true;
  heroScript.fetchPriority = 'low';
  document.body.appendChild(heroScript);
}

// Stagger reveal delays per-section, then observe
const revealEls = document.querySelectorAll('.reveal, .reveal-mask');
const revealGroups = new Map();
revealEls.forEach((el) => {
  const section = el.closest('section') || document.body;
  const i = revealGroups.get(section) || 0;
  el.style.setProperty('--reveal-delay', `${Math.min(i, 4) * 90}ms`);
  revealGroups.set(section, i + 1);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach((el) => revealObserver.observe(el));

// Spec counter animation
const specEls = document.querySelectorAll('.spec-value');
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    countObserver.unobserve(el);

    if (prefersReducedMotion) {
      el.textContent = target + suffix;
      return;
    }

    const isDecimal = target % 1 !== 0;
    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = (isDecimal ? value.toFixed(1) : Math.round(value)) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}, { threshold: 0.4 });
specEls.forEach((el) => countObserver.observe(el));

// Live Oslo clock — small real detail, not decoration
const osloClock = document.getElementById('osloClock');
if (osloClock) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  function tickClock() {
    osloClock.textContent = `OSLO ${formatter.format(new Date())}`;
  }
  tickClock();
  setInterval(tickClock, 1000);
}

// Hero canvas: fades out as the hero scrolls out of view. (A scale-down
// was tried here first, but scaling an absolutely-positioned full-bleed
// layer leaves empty margins around it instead of reflowing — looked
// like a broken grey box mid-scroll. Plain opacity fade only.)
const heroSection = document.querySelector('.hero');
const heroCanvasLayer = document.getElementById('strid-hero-canvas');
const heroOverlay = document.querySelector('.hero-overlay');

if (heroSection && heroCanvasLayer) {
  if (prefersReducedMotion) {
    heroCanvasLayer.style.opacity = '1';
  } else {
    // Plain, unthrottled scroll handler: reading scrollY/offsetHeight and
    // setting one inline style is cheap enough to skip the rAF-gating
    // (which can stall entirely on backgrounded/non-visible tabs).
    function updateHeroFade() {
      const heroHeight = heroSection.offsetHeight || 1;
      const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
      const opacity = 1 - progress;

      heroCanvasLayer.style.opacity = String(opacity);
      if (heroOverlay) heroOverlay.style.opacity = String(opacity);
    }

    window.addEventListener('scroll', updateHeroFade, { passive: true });

    updateHeroFade();
  }
}

// Hero hint: dismiss the "hover the image" cue once the visitor either
// tries it or scrolls past — never nag after the first signal.
const heroHint = document.querySelector('.hero-hint');
if (heroHint && heroCanvasLayer) {
  const dismissHeroHint = () => heroHint.classList.add('is-dismissed');
  heroCanvasLayer.addEventListener('mouseenter', dismissHeroHint, { once: true });
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) dismissHeroHint();
  }, { passive: true, once: true });
}

// Mobile menu
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');

function closeMenu() {
  mobileMenu.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

menuToggle.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

mobileMenu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});
