/* Bubble playground — a re-creation of the Project 1 "family of buttons".
   Direct manipulation: 1:1 drag that respects the grab offset, release
   velocity carried into the bubble (momentum), rubber-banded walls, and
   per-member wandering parameters. Pauses when off-screen. */

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Colours and identity emoji match the shipped Project 1 app.
  const MEMBERS = {
    prince: { name: 'Prince', emoji: '🏎️', color: 'var(--prince)', count: 4 },
    mark:   { name: 'Mark',   emoji: '🚴', color: 'var(--mark)', count: 5 },
    ayushi: { name: 'Ayushi', emoji: '🌙', color: 'var(--ayushi)', count: 5 },
    adrian: { name: 'Adrian', emoji: '📚', color: 'var(--adrian)', count: 5 },
  };

  // Movement values from the shipped app's MOVEMENT table, converted from
  // per-frame (60 fps) units: speed = mid of min/max speed × 60 px/s,
  // turnRate = wanderChance × 60 per second, turnAmount = wanderStrength (rad).
  const PERSONALITY = {
    prince: { speed: 7.8,  turnRate: 2.1,  turnAmount: 0.75 },
    mark:   { speed: 28.5, turnRate: 2.1,  turnAmount: 0.70 },
    ayushi: { speed: 15.6, turnRate: 0.84, turnAmount: 0.35 },
    adrian: { speed: 19.5, turnRate: 0.72, turnAmount: 0.30 },
  };
  // Everyone identical: the average of the four, so only the differences disappear.
  const UNIFORM = { speed: 17.9, turnRate: 1.44, turnAmount: 0.53 };

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
      el.innerHTML = `<span class="emo" aria-hidden="true">${m.emoji}</span>`
        + `<span class="dots" aria-hidden="true">${'<i></i>'.repeat(m.count)}</span>`
        + `<span class="name" aria-hidden="true">${m.name}</span>`
        + `<span class="tag" aria-hidden="true"><b>${m.name}</b><small>Drag to move · ${m.count} interests in the real app</small></span>`;
      root.appendChild(el);
      const heading = Math.random() * Math.PI * 2;
      return { id, el, x: 0, y: 0, vx: 0, vy: 0, r: 40, heading, drag: null, i };
    });

    function params(b) { return mode === 'personality' ? PERSONALITY[b.id] : UNIFORM; }

    // One set of limits for dragging and for the walls, so a release never jumps.
    // The floor leaves room for the interest dots under each bubble.
    const threaded = root.classList.contains('constellation');
    const FLOOR = threaded ? 38 : 20;

    // Constellation mode: one dotted thread per pair, fading in as two bubbles
    // approach. It is the "space between" made visible.
    const pairs = [];
    if (threaded) {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'threads');
      svg.setAttribute('aria-hidden', 'true');
      root.prepend(svg);
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const line = document.createElementNS(NS, 'line');
          const knot = document.createElementNS(NS, 'circle');
          knot.setAttribute('r', '2.5');
          svg.append(line, knot);
          pairs.push({ a: bubbles[i], b: bubbles[j], line, knot });
        }
      }
    }
    function bounds(b) { return { x0: b.r, x1: W - b.r, y0: b.r, y1: H - b.r - FLOOR }; }

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
      if (!pairs.length) return;
      const reach = Math.max(300, Math.hypot(W, H) * 0.55);
      for (const p of pairs) {
        const dx = p.b.x - p.a.x, dy = p.b.y - p.a.y, d = Math.hypot(dx, dy) || 1;
        const t = Math.max(0, 1 - d / reach);
        const o = (Math.pow(t, 1.4) * 0.85).toFixed(3);
        // Run the thread edge to edge, not centre to centre.
        const ux = dx / d, uy = dy / d;
        p.line.setAttribute('x1', p.a.x + ux * (p.a.r + 6)); p.line.setAttribute('y1', p.a.y + uy * (p.a.r + 6));
        p.line.setAttribute('x2', p.b.x - ux * (p.b.r + 6)); p.line.setAttribute('y2', p.b.y - uy * (p.b.r + 6));
        p.line.style.opacity = d < p.a.r + p.b.r + 14 ? 0 : o; // touching: no gap left to draw
        p.knot.setAttribute('cx', (p.a.x + p.b.x) / 2); p.knot.setAttribute('cy', (p.a.y + p.b.y) / 2);
        p.knot.style.opacity = (t > 0.35 ? (t - 0.35) * 1.4 : 0).toFixed(3);
      }
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

        // Walls: bounce away, and if a drag left the bubble past an edge, ease it
        // back (critically damped) instead of snapping it there in one frame.
        const { x0, x1, y0, y1 } = bounds(b);
        const back = still || dt === 0 ? 1 : 1 - Math.exp(-14 * dt);
        let hit = false;
        if (b.x < x0) { if (b.vx < 0) { b.vx = -b.vx * 0.8; hit = true; } b.x += (x0 - b.x) * (x0 - b.x < 1 ? 1 : back); }
        if (b.x > x1) { if (b.vx > 0) { b.vx = -b.vx * 0.8; hit = true; } b.x += (x1 - b.x) * (b.x - x1 < 1 ? 1 : back); }
        if (b.y < y0) { if (b.vy < 0) { b.vy = -b.vy * 0.8; hit = true; } b.y += (y0 - b.y) * (y0 - b.y < 1 ? 1 : back); }
        if (b.y > y1) { if (b.vy > 0) { b.vy = -b.vy * 0.8; hit = true; } b.y += (y1 - b.y) * (b.y - y1 < 1 ? 1 : back); }
        if (hit) b.heading = Math.atan2(b.vy, b.vx);
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
        // Rubber-band past the walls instead of a hard stop (same limits as the physics).
        const { x0, x1, y0, y1 } = bounds(b);
        if (x < x0) x = x0 - rubberband(x0 - x, W);
        if (x > x1) x = x1 + rubberband(x - x1, W);
        if (y < y0) y = y0 - rubberband(y0 - y, H);
        if (y > y1) y = y1 + rubberband(y - y1, H);
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
        const { x0, x1, y0, y1 } = bounds(b);
        b.x = Math.min(Math.max(x0, (b.x / oldW) * W), x1);
        b.y = Math.min(Math.max(y0, (b.y / oldH) * H), y1);
      });
      render();
    }).observe(root);

    let onScreen = false;
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      onScreen && !document.hidden ? start() : stop();
    }).observe(root);
    // Coming back to the tab only restarts demos that are actually on screen.
    document.addEventListener('visibilitychange', () => { onScreen && !document.hidden ? start() : stop(); });

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
