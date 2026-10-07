/* Bubble playground — a re-creation of the Project 1 "family of buttons".
   Direct manipulation: 1:1 drag that respects the grab offset, release
   velocity carried into the bubble (momentum), rubber-banded walls, and
   per-member wandering parameters. Pauses when off-screen. */

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const MEMBERS = {
    prince: { name: 'Prince', emoji: '🚗', color: 'var(--prince)' },
    mark:   { name: 'Mark',   emoji: '🚲', color: 'var(--mark)' },
    ayushi: { name: 'Ayushi', emoji: '🌙', color: 'var(--ayushi)' },
    adrian: { name: 'Adrian', emoji: '📖', color: 'var(--adrian)' },
  };

  // Illustrative wandering parameters. As in the original project, Mark moves
  // fastest (High Activity Level); everyone else is tuned to be perceptibly different.
  const PERSONALITY = {
    prince: { speed: 34, turnRate: 0.55, turnAmount: 0.9 },
    mark:   { speed: 70, turnRate: 0.9,  turnAmount: 1.1 },
    ayushi: { speed: 26, turnRate: 0.35, turnAmount: 0.6 },
    adrian: { speed: 30, turnRate: 0.7,  turnAmount: 1.3 },
  };
  const UNIFORM = { speed: 36, turnRate: 0.6, turnAmount: 0.9 };

  function rubberband(over, dim, c = 0.55) {
    return (over * dim * c) / (dim + c * Math.abs(over));
  }

  function createPlayground(root, opts = {}) {
    const ids = opts.members || Object.keys(MEMBERS);
    let mode = opts.mode || 'personality';
    let W = 0, H = 0, running = false, last = 0, raf = 0;

    const bubbles = ids.map((id, i) => {
      const m = MEMBERS[id];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'bubble';
      el.style.setProperty('--c', m.color);
      el.setAttribute('aria-label', `${m.name}'s bubble. Drag or flick it, or press arrow keys to push it.`);
      el.innerHTML = `<span aria-hidden="true">${m.emoji}</span><span class="tag">${m.name}</span>`;
      root.appendChild(el);
      const heading = Math.random() * Math.PI * 2;
      return { id, el, x: 0, y: 0, vx: 0, vy: 0, r: 40, heading, drag: null, i };
    });

    function params(b) { return mode === 'personality' ? PERSONALITY[b.id] : UNIFORM; }

    function measure() {
      W = root.clientWidth; H = root.clientHeight;
      bubbles.forEach((b) => { b.r = b.el.offsetWidth / 2; });
    }

    function layout() {
      measure();
      const n = bubbles.length;
      bubbles.forEach((b, i) => {
        b.x = W * ((i + 0.5) / n);
        b.y = H * (i % 2 ? 0.62 : 0.38);
        const p = params(b);
        b.vx = Math.cos(b.heading) * p.speed;
        b.vy = Math.sin(b.heading) * p.speed;
      });
      render();
    }

    function render() {
      bubbles.forEach((b) => {
        b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)`;
      });
    }

    function step(dt) {
      const still = reduceMotion.matches;
      for (const b of bubbles) {
        if (b.drag) continue;
        const p = params(b);
        if (!still) {
          // Wander: occasionally change heading, steer gently toward cruising velocity.
          if (Math.random() < p.turnRate * dt) b.heading += (Math.random() * 2 - 1) * p.turnAmount;
          const k = 1 - Math.exp(-1.1 * dt); // smooth, frame-rate independent steering
          b.vx += (Math.cos(b.heading) * p.speed - b.vx) * k;
          b.vy += (Math.sin(b.heading) * p.speed - b.vy) * k;
        } else {
          const f = Math.exp(-6 * dt);
          b.vx *= f; b.vy *= f;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Walls — bounce and turn the heading away.
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.8; b.heading = Math.PI - b.heading; }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.8; b.heading = Math.PI - b.heading; }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.8; b.heading = -b.heading; }
        if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * 0.8; b.heading = -b.heading; }
      }

      // Soft separation so bubbles never sit on top of each other.
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const a = bubbles[i], c = bubbles[j];
          const dx = c.x - a.x, dy = c.y - a.y;
          const d = Math.hypot(dx, dy) || 0.01, min = a.r + c.r + 4;
          if (d < min) {
            const nx = dx / d, ny = dy / d, push = (min - d);
            const wa = a.drag ? 0 : c.drag ? 1 : 0.5, wc = 1 - wa;
            a.x -= nx * push * wa; a.y -= ny * push * wa;
            c.x += nx * push * wc; c.y += ny * push * wc;
            const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
            if (rel < 0) {
              if (!a.drag) { a.vx += rel * nx * 0.9; a.vy += rel * ny * 0.9; a.heading = Math.atan2(a.vy, a.vx); }
              if (!c.drag) { c.vx -= rel * nx * 0.9; c.vy -= rel * ny * 0.9; c.heading = Math.atan2(c.vy, c.vx); }
            }
          }
        }
      }
    }

    function frame(t) {
      const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
      last = t;
      step(dt);
      render();
      raf = requestAnimationFrame(frame);
    }

    function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    // ---- Direct manipulation ------------------------------------------------
    bubbles.forEach((b) => {
      const el = b.el;
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        el.setPointerCapture(e.pointerId);
        root.classList.add('touched');
        const rect = root.getBoundingClientRect();
        const px = e.clientX - rect.left, py = e.clientY - rect.top;
        // Respect where the bubble was grabbed — never snap its centre to the pointer.
        b.drag = { id: e.pointerId, ox: px - b.x, oy: py - b.y, rect, hist: [{ x: px, y: py, t: e.timeStamp }] };
        b.vx = b.vy = 0;
        el.classList.add('grabbed');
      });
      el.addEventListener('pointermove', (e) => {
        const d = b.drag;
        if (!d || d.id !== e.pointerId) return;
        const px = e.clientX - d.rect.left, py = e.clientY - d.rect.top;
        let x = px - d.ox, y = py - d.oy;
        // Rubber-band past the walls instead of a hard stop.
        if (x < b.r) x = b.r - rubberband(b.r - x, W);
        if (x > W - b.r) x = W - b.r + rubberband(x - (W - b.r), W);
        if (y < b.r) y = b.r - rubberband(b.r - y, H);
        if (y > H - b.r) y = H - b.r + rubberband(y - (H - b.r), H);
        b.x = x; b.y = y;
        d.hist.push({ x: px, y: py, t: e.timeStamp });
        if (d.hist.length > 6) d.hist.shift();
        if (!running) render();
      });
      const release = (e) => {
        const d = b.drag;
        if (!d || d.id !== e.pointerId) return;
        // Hand the pointer's release velocity to the bubble so there is no seam.
        const h = d.hist, a = h[0], z = h[h.length - 1];
        const dt = (z.t - a.t) / 1000;
        if (dt > 0 && e.timeStamp - z.t < 80 && !reduceMotion.matches) {
          const cap = 1600;
          b.vx = Math.max(-cap, Math.min(cap, (z.x - a.x) / dt));
          b.vy = Math.max(-cap, Math.min(cap, (z.y - a.y) / dt));
          b.heading = Math.atan2(b.vy, b.vx);
        }
        b.drag = null;
        el.classList.remove('grabbed');
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);

      // Keyboard: arrow keys push the bubble, Enter/Space gives it a random nudge.
      el.addEventListener('keydown', (e) => {
        const push = 260;
        const map = { ArrowLeft: [-push, 0], ArrowRight: [push, 0], ArrowUp: [0, -push], ArrowDown: [0, push] };
        let v = map[e.key];
        if (!v && (e.key === 'Enter' || e.key === ' ')) {
          const a = Math.random() * Math.PI * 2; v = [Math.cos(a) * push, Math.sin(a) * push];
        }
        if (!v) return;
        e.preventDefault();
        root.classList.add('touched');
        b.vx += v[0]; b.vy += v[1]; b.heading = Math.atan2(b.vy, b.vx);
        if (reduceMotion.matches) { b.x += v[0] / 8; b.y += v[1] / 8; step(0); render(); }
      });
    });

    // ---- Lifecycle ---------------------------------------------------------
    layout();
    new ResizeObserver(() => {
      const oldW = W || 1, oldH = H || 1;
      measure();
      bubbles.forEach((b) => {
        b.x = Math.min(Math.max(b.r, (b.x / oldW) * W), W - b.r);
        b.y = Math.min(Math.max(b.r, (b.y / oldH) * H), H - b.r);
      });
      render();
    }).observe(root);

    new IntersectionObserver(([entry]) => {
      entry.isIntersecting && !document.hidden ? start() : stop();
    }).observe(root);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

    return {
      setMode(m) { mode = m; },
    };
  }

  window.BubblePlayground = { create: createPlayground };

  document.querySelectorAll('[data-playground]').forEach((root) => {
    const pg = createPlayground(root, { mode: root.dataset.mode || 'personality' });
    const controls = document.querySelector(`[data-controls="${root.id}"]`);
    if (!controls) return;
    controls.querySelectorAll('button[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        controls.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
        pg.setMode(btn.dataset.mode);
      });
    });
  });
})();
