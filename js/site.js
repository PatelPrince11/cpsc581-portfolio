/* Shared page behaviour: nav state, scroll reveal, section highlighting,
   live-app embed loading, and the image lightbox. */
(function () {
  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Nav hairline appears only once content scrolls under the translucent bar.
  const nav = document.querySelector('.nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Reveal on scroll.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // Highlight the current section in the nav / table of contents.
  const links = [...document.querySelectorAll('.nav li a[href^="#"], .toc a[href^="#"]')];
  const toc = document.querySelector('.toc');
  const targets = [...new Set(links.map((a) => a.getAttribute('href')))]
    .map((h) => document.querySelector(h)).filter(Boolean);
  if (targets.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = '#' + e.target.id;
        links.forEach((a) => {
          const on = a.getAttribute('href') === id;
          a.setAttribute('aria-current', String(on));
          // On phones the TOC is a horizontal chip row: keep the active chip visible.
          if (on && toc && toc.contains(a) && toc.scrollWidth > toc.clientWidth) {
            const left = a.offsetLeft - (toc.clientWidth - a.offsetWidth) / 2;
            toc.scrollTo({ left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
          }
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach((t) => spy.observe(t));
  }

  // Live app embed. On phones it would trap scrolling, so show a poster and
  // load the app only when someone asks for it.
  document.querySelectorAll('.device').forEach((device) => {
    const frame = device.querySelector('iframe[data-src]');
    const poster = device.querySelector('.poster');
    if (!frame) return;
    const load = () => { if (!frame.src) frame.src = frame.dataset.src; device.classList.add('playing'); };
    if (!poster || !window.matchMedia('(max-width: 760px)').matches) { load(); return; }
    device.classList.add('has-poster');
    poster.addEventListener('click', load);
  });

  // Lightbox: the image grows out of the thumbnail you clicked and shrinks back
  // into it on close. Opening or closing can be reversed mid-flight.
  const figs = document.querySelectorAll('button.fig');
  if (!figs.length) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.innerHTML = '<button class="close" aria-label="Close image">✕</button><img alt=""><p></p>';
  document.body.appendChild(dlg);
  const img = dlg.querySelector('img'), cap = dlg.querySelector('p'), closeBtn = dlg.querySelector('.close');
  let source = null, anim = null, closing = false;

  // Transform that maps the full-size image back onto the thumbnail's rectangle.
  function fromThumb() {
    const t = source.querySelector('img').getBoundingClientRect();
    const f = img.getBoundingClientRect();
    const dx = t.left + t.width / 2 - (f.left + f.width / 2);
    const dy = t.top + t.height / 2 - (f.top + f.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${t.width / f.width}, ${t.height / f.height})`;
  }

  function play(opening) {
    closing = !opening;
    dlg.classList.toggle('closing', closing);
    // Reverse an animation that is still running instead of starting over:
    // the image continues from where it is on screen.
    if (anim && anim.playState === 'running') { anim.reverse(); return; }
    const frames = reduceMotion.matches
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ transform: fromThumb(), opacity: 0.6, borderRadius: '14px' }, { transform: 'none', opacity: 1 }];
    anim = img.animate(frames, {
      duration: reduceMotion.matches ? 180 : 380,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      direction: opening ? 'normal' : 'reverse',
      fill: 'both',
    });
    const a = anim;
    a.onfinish = () => {
      if (closing) { dlg.close(); dlg.classList.remove('closing'); }
      a.cancel(); // the resting state is the image's own style; don't stack fill effects
      if (anim === a) anim = null;
    };
  }

  figs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.querySelector('img');
      source = btn;
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      const fc = btn.closest('figure')?.querySelector('figcaption');
      cap.textContent = fc ? fc.textContent : src.alt;
      dlg.showModal();
      const go = () => play(true);
      img.complete ? go() : img.addEventListener('load', go, { once: true });
    });
  });

  const dismiss = () => { if (dlg.open && !closing) play(false); };
  closeBtn.addEventListener('click', dismiss);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dismiss(); });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); dismiss(); }); // Esc
  // Reopening the same image while it is closing reverses back to open.
  img.addEventListener('click', () => { if (closing) play(true); });
})();
