// The /try game. It plays the steps listed in issue.js (ISSUE.game.steps), one per screen.
// Step types: story, input, seal, shamir, hash, merkle, aggregate, choice, checks, recap and custom.
// AGENTS.md documents every field. Cryptography comes from crypto.js (window.ETC), text formatting from md.js.
(function () {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const E = window.ETC;
  const { inline, block, esc } = window.MD;
  const ISSUE = window.ISSUE;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, calm ? 0 : ms));
  const h = (tag, cls, html) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html !== undefined) el.innerHTML = html; return el; };
  const avatar = document.body.dataset.avatar;

  // ---- state shared by the steps, and {name} templates ----
  let state;
  function fresh() { state = { values: {}, display: {}, flags: {}, sealed: null, shares: null, vars: {} }; }
  fresh();
  // {name} is the display form ("LKR 12,000,000"); {name:raw} is the plain value ("12000000").
  const fill = (text) => String(text ?? '').replace(/\{(\w+)(:raw)?\}/g, (m, k, raw) => {
    if (raw && k in state.values) return String(state.values[k]);
    if (k in state.display) return state.display[k];
    if (k in state.vars) return state.vars[k];
    if (k in state.values) return String(state.values[k]);
    return m;
  });
  const pick = (v) => (v && typeof v === 'object' && 'if' in v ? (state.flags[v.if] ? v.then : v.else) : v);
  const fmtNumber = (n, unit) => (unit ? unit + ' ' : '') + Number(n).toLocaleString('en-LK');
  function say(el, text, kind) { el.innerHTML = text ? inline(fill(text)) : ''; el.className = 'status' + (kind ? ' ' + kind : ''); }

  // ---- step types ----
  const T = {};

  T.story = () => ({});

  T.input = (s, body) => {
    body.append(h('label', 'field', esc(s.label || 'Your answer')));
    const input = h('input', 'input big');
    input.id = `in-${s.key}`;
    body.lastChild.htmlFor = input.id;
    input.autocomplete = 'off';
    if (s.kind === 'number') input.inputMode = 'numeric';
    if (s.example) input.placeholder = s.example;
    input.maxLength = s.maxLength || 40;
    const st = h('p', 'status');
    st.setAttribute('role', 'status');
    body.append(input, st);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#next').click(); });
    return {
      reset() { input.value = ''; say(st, ''); },
      check() {
        const raw = input.value.trim();
        if (s.kind === 'number') {
          const clean = raw.replace(/[,\s]/g, '').replace(new RegExp('^' + (s.unit || '') + '', 'i'), '');
          const n = Number(clean);
          if (!/^\d+(\.\d+)?$/.test(clean) || (s.min !== undefined && n < s.min) || (s.max !== undefined && n > s.max)) {
            say(st, s.error || 'Please type a number.', 'bad'); input.focus(); return false;
          }
          state.values[s.key] = n;
          state.display[s.key] = fmtNumber(n, s.unit);
        } else {
          if (!raw) { say(st, s.error || 'Please type something first.', 'bad'); input.focus(); return false; }
          state.values[s.key] = raw;
          state.display[s.key] = raw;
        }
        say(st, '');
        return true;
      },
    };
  };

  T.seal = (s, body) => {
    const dl = h('dl', 'out');
    const row = (label, cls) => { const d = h('div', 'kv' + (cls ? ' ' + cls : '')); d.append(h('dt', '', esc(label)), h('dd')); dl.append(d); return d.lastChild; };
    const plain = row(s.labels?.plain || 'What you typed');
    const stored = row(s.labels?.stored || 'What the platform stores');
    const key = row(s.labels?.key || 'The key that opens it', 'key');
    body.append(dl);
    return {
      async enter() {
        const text = fill(s.plain || '{' + s.from + '}');
        if (!state.sealed || state.sealed.text !== text) {
          state.sealed = { ...(await E.seal(text)), text };
          state.shares = null;
          state.vars.sealedHash = E.hex(state.sealed.ct).slice(0, 16);
        }
        plain.textContent = fill(s.show || '{' + s.from + '}');
        key.textContent = E.hex(state.sealed.keyBytes);
        const target = E.hex(state.sealed.ct);
        if (calm) { stored.textContent = target; return; }
        const HEX = '0123456789abcdef';
        for (let k = 0; k <= 12; k++) {
          const fixed = Math.floor((k / 12) * target.length);
          stored.textContent = target.slice(0, fixed) + Array.from({ length: target.length - fixed }, () => HEX[(Math.random() * 16) | 0]).join('');
          await wait(45);
        }
        stored.textContent = target;
      },
    };
  };

  T.shamir = (s, body) => {
    const box = h('div', 'custodians');
    const st = h('p', 'status');
    body.append(box, st);
    const names = s.holders || ['Custodian 1', 'Custodian 2', 'Custodian 3'];
    let picked = new Set();
    async function render() {
      const chosen = state.shares.filter((x) => picked.has(x.x));
      if (!chosen.length) return say(st, '');
      if (chosen.length === 1) return say(st, (s.one || '{holder} alone holds pure noise: every possible key is still equally likely. Now tap a second one.').replace('{holder}', names[chosen[0].x - 1]), 'bad');
      const key = E.combine2(chosen[0], chosen[1]);
      try {
        const text = await E.open(key, state.sealed.nonce, state.sealed.ct);
        state.flags.rebuilt = true;
        state.vars.rebuiltBy = chosen.slice(0, 2).map((x) => names[x.x - 1]).join(' and ');
        state.vars.opened = text;
        say(st, s.two || '{rebuiltBy} together rebuilt the key, and it opens what you sealed.', 'good');
      } catch { say(st, 'Those shares do not fit together.', 'bad'); }
    }
    return {
      enter() {
        if (!state.sealed) throw new Error('A shamir step needs a seal step before it.');
        if (!state.shares) { state.shares = E.split2of3(state.sealed.keyBytes); picked = new Set(); }
        box.textContent = '';
        for (const share of state.shares) {
          const b = h('button', 'cust');
          b.type = 'button';
          b.setAttribute('aria-pressed', String(picked.has(share.x)));
          b.append(h('b', '', esc(names[share.x - 1])), h('span', '', E.hex(share.y)));
          b.addEventListener('click', () => { picked.has(share.x) ? picked.delete(share.x) : picked.add(share.x); b.setAttribute('aria-pressed', String(picked.has(share.x))); render(); });
          box.append(b);
        }
        render();
      },
    };
  };

  T.hash = (s, body) => {
    body.append(h('label', 'field', esc(s.label || 'Change anything')));
    const input = h('input', 'input');
    input.id = `hash-${Math.random().toString(36).slice(2)}`;
    body.lastChild.htmlFor = input.id;
    input.autocomplete = 'off';
    input.spellcheck = false;
    const dl = h('dl', 'out');
    const orig = h('div', 'kv'); orig.append(h('dt', '', 'SHA-256 of the original'), h('dd'));
    const now = h('div', 'kv'); now.append(h('dt', '', 'SHA-256 of your version'), h('dd'));
    dl.append(orig, now);
    const st = h('p', 'status');
    body.append(input, dl, st);
    let original = '';
    const digest = async (t) => E.hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))));
    async function render() {
      const a = await digest(original);
      const b = await digest(input.value);
      orig.lastChild.textContent = a;
      now.lastChild.textContent = b;
      now.className = 'kv' + (a === b ? '' : ' bad');
      if (a === b) say(st, s.same || 'Identical text, identical hash.', 'good');
      else { state.flags[s.flag || 'changed'] = true; say(st, s.changed || 'One small change, and the whole hash is different. Nobody can hide an edit.', 'bad'); }
    }
    input.addEventListener('input', render);
    return { enter() { original = fill(s.text || '{' + s.from + '}'); if (!input.value) input.value = original; render(); } };
  };

  T.merkle = (s, body) => {
    body.append(h('label', 'field', esc(s.label || 'Your entry')));
    const input = h('input', 'input');
    input.id = `merkle-${Math.random().toString(36).slice(2)}`;
    body.lastChild.htmlFor = input.id;
    input.autocomplete = 'off';
    input.spellcheck = false;
    const tree = h('div', 'tree mini');
    const pub = h('div', 'published');
    const a = h('div', 'kv'); a.append(h('dt', '', esc(s.rootLabel || 'Cosigned root')), h('dd'));
    const b = h('div', 'kv'); b.append(h('dt', '', 'Root with your edit'), h('dd'));
    pub.append(a, b);
    const reset = h('div', 'row');
    const rb = h('button', 'btn alt', 'Put it back');
    rb.type = 'button';
    reset.append(rb);
    const st = h('p', 'status');
    body.append(input, tree, pub, reset, st);
    let entries, mine, original, id = 0;
    async function render() {
      const my = ++id;
      const texts = entries.slice();
      texts[mine] = input.value;
      const levels = await E.merkleLevels(texts);
      if (my !== id) return;
      tree.textContent = '';
      for (let l = levels.length - 1; l >= 0; l--) {
        const row = h('div', `lvl n${levels[l].length}`);
        levels[l].forEach((hash, i) => {
          const hx = E.hex(hash);
          const c = h('div', 'h' + (hx !== original[l][i] ? ' bad' : l === 0 && i === mine ? ' mine' : ''));
          c.textContent = hx.slice(0, l === 0 ? 4 : 6);
          row.append(c);
        });
        tree.append(row);
      }
      const p = original.at(-1)[0];
      const n = E.hex(levels.at(-1)[0]);
      a.lastChild.textContent = p.slice(0, 20) + '…';
      b.lastChild.textContent = n.slice(0, 20) + '…';
      b.className = 'kv' + (n === p ? '' : ' bad');
      if (n === p) say(st, s.ok || 'Your receipt checks out: your entry is in the log, under the cosigned root.', 'good');
      else { state.flags.tampered = true; say(st, s.caught || '`LEAF_MISMATCH`. Caught. Your edit changed every hash up to the root, and the witnesses already signed the old root.', 'bad'); }
    }
    input.addEventListener('input', render);
    rb.addEventListener('click', () => { input.value = entries[mine]; render(); });
    return {
      async enter() {
        entries = s.entries.map(fill);
        mine = s.mine;
        original = (await E.merkleLevels(entries)).map((l) => l.map(E.hex));
        input.value = entries[mine];
        render();
      },
    };
  };

  T.aggregate = (s, body) => {
    const box = h('div', 'rivals');
    const row = h('div', 'row');
    const go = h('button', 'btn', esc(s.button || 'Compute in private'));
    go.type = 'button';
    row.append(go);
    const st = h('p', 'status');
    body.append(box, row, st);
    let people = [];
    let done = false;
    const unit = s.unit || '';
    const show = (n) => (s.op === 'average' ? (unit ? unit + ' ' : '') + Number(n).toFixed(1) : fmtNumber(n, unit));
    go.addEventListener('click', async () => {
      go.disabled = true;
      for (const p of people) p.shares = E.shareAdditive(Math.round(p.value * 100));
      for (let k = 0; k < 6; k++) { for (const p of people) p.card.lastChild.textContent = E.hex(E.random(4)) + '…'; await wait(160); }
      const sums = people.map((p) => Number(E.addShares(p.shares)) / 100);
      if (s.op === 'min' || s.op === 'max') {
        const best = s.op === 'min' ? Math.min(...sums) : Math.max(...sums);
        const winners = people.filter((_, i) => sums[i] === best);
        for (const p of people) {
          const won = winners.includes(p);
          p.card.classList.toggle('win', won);
          p.card.lastChild.textContent = won ? `${s.winnerLabel || 'Winner'} · ${show(p.value)}` : (s.hiddenLabel || 'Never opened');
        }
        const youWon = winners.some((p) => p.you);
        state.flags.won = youWon && winners.length === 1;
        state.flags.tie = youWon && winners.length > 1;
        state.flags.lost = !youWon;
        state.vars.winner = winners[0].name;
        state.vars.winnerValue = show(winners[0].value);
        say(st, state.flags.won ? s.win : state.flags.tie ? (s.tie || s.win) : s.lose, state.flags.lost ? 'bad' : 'good');
      } else {
        const total = sums.reduce((a, b) => a + b, 0);
        const result = s.op === 'average' ? total / sums.length : total;
        for (const p of people) p.card.lastChild.textContent = s.hiddenLabel || 'Never opened';
        state.vars.result = show(result);
        state.flags.computed = true;
        say(st, s.result || 'Result: {result}. No single value was ever opened.', 'good');
      }
      done = true;
      refresh();
    });
    return {
      ready: () => done,
      enter() {
        if (done) return;
        const o = s.others || {};
        const count = o.count ?? 3;
        const names = o.names || Array.from({ length: count }, (_, i) => `${o.label || 'Entry'} ${'BCDEFGHIJ'[i]}`);
        const rand = () => { const steps = Math.round(((o.max ?? 10) - (o.min ?? 0)) / (o.step ?? 1)); return (o.min ?? 0) + Math.round(Math.random() * steps) * (o.step ?? 1); };
        people = [{ name: s.youLabel || 'You', value: state.values[s.from], you: true }, ...names.map((name) => ({ name, value: rand() }))];
        box.textContent = '';
        for (const p of people) {
          const card = h('div', 'rival' + (p.you ? ' you' : ''));
          card.append(h('b', '', esc(p.name)), h('span', 'mono', 'tag ' + E.hex(E.random(6))), h('strong', '', esc(s.sealedLabel || 'Sealed')));
          p.card = card;
          box.append(card);
        }
        go.disabled = false;
        say(st, '');
      },
      reset() { done = false; },
    };
  };

  T.choice = (s, body) => {
    const row = h('div', 'rules');
    const st = h('p', 'status');
    body.append(row, st);
    let chosen = false;
    (s.options || []).forEach((o, i) => {
      const b = h('button', 'btn alt', esc(o.label));
      b.type = 'button';
      b.addEventListener('click', () => {
        chosen = true;
        state.flags[s.key || 'choice'] = i;
        if (o.flag) state.flags[o.flag] = true;
        say(st, o.reply, o.good === false ? 'bad' : 'good');
        refresh();
      });
      row.append(b);
    });
    return { ready: () => chosen || !s.required, reset() { chosen = false; say(st, ''); } };
  };

  T.checks = (s, body) => {
    const ol = h('ol', 'checks');
    for (const item of s.items || []) ol.append(h('li', '', inline(item)));
    const st = h('p', 'status');
    body.append(ol, st);
    let done = false;
    return {
      ready: () => done,
      async enter() {
        if (done) return;
        $$('li', ol).forEach((li) => li.classList.remove('ok'));
        say(st, 'Checking…');
        for (const li of $$('li', ol)) { await wait(320); li.classList.add('ok'); }
        say(st, s.result || 'All checks passed.', 'good');
        done = true;
      },
      reset() { done = false; },
    };
  };

  T.recap = (s, body) => {
    const ul = h('ul', 'recap');
    const row = h('div', 'row');
    const read = h('a', 'btn', esc(s.readLabel || 'Read how it works'));
    read.href = s.readHref || '/#ch1';
    const again = h('button', 'btn alt', esc(s.againLabel || 'Play again'));
    again.type = 'button';
    again.addEventListener('click', () => {
      fresh();
      for (const st of steps) st.api.reset?.();
      const first = steps.findIndex((x) => x.s.type === 'input'); // replay from the first question, past the intro
      go(first > 0 ? first : 0);
    });
    row.append(read, again);
    body.append(ul, row);
    return {
      enter() {
        ul.textContent = '';
        for (const line of s.lines || []) { const t = pick(line); if (t) ul.append(h('li', '', inline(fill(t)))); }
      },
    };
  };

  T.custom = (s, body) => {
    let ok = true;
    const api = { body, get state() { return state; }, E, MD: window.MD, fill, say, wait, ready: (v) => { ok = !!v; refresh(); } };
    return { ready: () => ok, enter: () => s.render?.(api), reset: () => s.reset?.(api) };
  };

  // ---- build the screens ----
  const play = $('#play');
  const steps = ISSUE.game.steps.map((s, i) => {
    const sec = h('section', 'step');
    sec.dataset.step = s.id || String(i);
    const saysEl = s.says ? h('div', 'says' + (s.saysBig ? ' big' : ''), `<img src="${avatar}" alt="" width="64" height="64"><p></p>`) : null;
    const panel = h('div', 'panel');
    if (s.badge) panel.append(h('span', 'badge' + (s.badge === 'live' ? '' : s.badge === 'toy' ? ' toy' : ' illus'), esc({ live: 'Live · on your phone', toy: 'Toy · simplified', illustration: 'Illustration' }[s.badge] || s.badge)));
    if (s.tag) panel.append(h('span', 'tag', esc(s.tag)));
    const title = h('h2', 'letter dark', esc(s.title || ''));
    title.id = `t${i}`;
    sec.setAttribute('aria-labelledby', title.id);
    panel.append(title);
    const text = h('div', 'text');
    panel.append(text);
    const body = h('div', 'body');
    panel.append(body);
    if (saysEl && s.saysTop) sec.append(saysEl);
    sec.append(panel);
    if (saysEl && !s.saysTop) sec.append(saysEl);
    play.append(sec);
    if (!T[s.type]) throw new Error(`Unknown step type "${s.type}" in issue.js`);
    return { s, sec, text, saysEl, api: T[s.type](s, body) };
  });
  const dots = $('#dots');
  steps.forEach(() => dots.append(document.createElement('li')));
  const next = $('#next');
  const back = $('#back');
  let at = 0;

  function refresh() {
    const cur = steps[at];
    next.textContent = cur.s.next || 'Next';
    next.disabled = cur.api.ready ? !cur.api.ready() : false;
    back.hidden = at === 0;
    $('.controls').hidden = cur.s.type === 'recap';
  }

  async function go(n, push = true) {
    at = Math.max(0, Math.min(steps.length - 1, n));
    const cur = steps[at];
    steps.forEach((x, i) => x.sec.classList.toggle('on', i === at));
    [...dots.children].forEach((d, i) => { d.className = i < at ? 'done' : i === at ? 'now' : ''; });
    if (push) history.pushState({ at }, '', '#' + cur.sec.dataset.step);
    scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    refresh();
    const t = cur.sec.querySelector('h2');
    t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
    await cur.api.enter?.();
    cur.text.innerHTML = block(fill(pick(cur.s.text) || ''));
    if (cur.saysEl) cur.saysEl.querySelector('p').innerHTML = inline(fill(pick(cur.s.says)));
    refresh();
  }
  addEventListener('popstate', (e) => go(e.state?.at ?? 0, false));
  next.addEventListener('click', () => { const cur = steps[at]; if (cur.api.check && !cur.api.check()) return; go(at + 1); });
  back.addEventListener('click', () => history.back());

  history.replaceState({ at: 0 }, '', location.pathname);
  go(0, false);
})();
