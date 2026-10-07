/* Shared page behaviour: nav state, scroll reveal, section highlighting, lightbox. */
(function () {
  document.documentElement.classList.add('js');

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
  const targets = [...new Set(links.map((a) => a.getAttribute('href')))]
    .map((h) => document.querySelector(h)).filter(Boolean);
  if (targets.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = '#' + e.target.id;
        links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === id)));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach((t) => spy.observe(t));
  }

  // Lightbox for figures.
  const figs = document.querySelectorAll('button.fig');
  if (!figs.length) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.innerHTML = '<button class="close" aria-label="Close image">✕</button><img alt=""><p></p>';
  document.body.appendChild(dlg);
  const img = dlg.querySelector('img'), cap = dlg.querySelector('p');
  figs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.querySelector('img');
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      const fc = btn.closest('figure')?.querySelector('figcaption');
      cap.textContent = fc ? fc.textContent : src.alt;
      dlg.showModal();
    });
  });
  dlg.querySelector('.close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
})();
