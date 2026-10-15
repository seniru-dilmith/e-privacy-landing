// Classic script, not a module: Chrome refuses module scripts on file:// pages.
// Slow columns of hex behind the loop: the "crypto" texture, kept faint so captions stay readable.
// Throttled to ~20 fps because the same laptop is running the whole Docker stack.
function startBackdrop(canvas, { fps = 20, alpha = 0.16, slow = 1 } = {}) {
  const ctx = canvas.getContext('2d');
  const W = (canvas.width = 1920);
  const H = (canvas.height = 1080);
  const STEP = 30;
  const HEX = '0123456789abcdef';
  const cols = Array.from({ length: Math.ceil(W / STEP) }, () => ({
    y: Math.random() * H,
    speed: 0.6 + Math.random() * 1.6,
    len: 8 + Math.floor(Math.random() * 18),
    chars: [],
  }));
  for (const c of cols) c.chars = Array.from({ length: c.len }, () => HEX[(Math.random() * 16) | 0]);

  ctx.font = '500 18px "JetBrains Mono", monospace';
  let last = 0;
  // performance.now(), not the rAF timestamp: the recorder slows the document timeline, which skews it.
  function frame() {
    requestAnimationFrame(frame);
    const t = performance.now();
    if (t - last < 1000 / fps) return;
    last = t;
    ctx.clearRect(0, 0, W, H);
    cols.forEach((c, i) => {
      c.y += (c.speed * 3) / slow;
      if (c.y - c.len * STEP > H) {
        c.y = -Math.random() * 300;
        c.speed = 0.6 + Math.random() * 1.6;
      }
      if (Math.random() < 0.08 / slow) c.chars[(Math.random() * c.len) | 0] = HEX[(Math.random() * 16) | 0];
      for (let k = 0; k < c.len; k++) {
        const y = c.y - k * STEP;
        if (y < -STEP || y > H + STEP) continue;
        const a = k === 0 ? alpha * 2.4 : alpha * (1 - k / c.len);
        ctx.fillStyle = `oklch(0.82 0.2 144 / ${a})`;
        ctx.fillText(c.chars[k], i * STEP + 6, y);
      }
    });
  }
  requestAnimationFrame(frame);
}

// Reveal text by scrambling it through hex first, left to right.
function decode(el, { duration = 900 } = {}) {
  const target = el.dataset.text ?? (el.dataset.text = el.textContent);
  const HEX = '0123456789abcdef';
  const start = performance.now();
  function tick() {
    const p = Math.max(0, Math.min(1, (performance.now() - start) / duration));
    const fixed = Math.floor(p * target.length);
    let out = target.slice(0, fixed);
    for (let i = fixed; i < target.length; i++) {
      const ch = target[i];
      out += ch === ' ' ? ' ' : HEX[(Math.random() * 16) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

window.Stage = { startBackdrop, decode };
