// A very small text formatter shared by the build (Node) and the game (browser).
// issue.js text may use **bold**, `code` and [links](https://...). Longer "deeper" text may also use
// blank lines between paragraphs, "### " headings, "- " lists and ``` code blocks. Everything else is escaped,
// so issue.js never needs (or allows) raw HTML.
(function (root) {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function inline(text) {
    const codes = [];
    let s = esc(text).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#)[^)\s]*)\)/g, (_, label, href) => `<a href="${href}"${/^https?:/.test(href) ? ' rel="noopener"' : ''}>${label}</a>`);
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
  }

  function block(text) {
    const out = [];
    const parts = String(text).replace(/\r/g, '').split(/\n{2,}/);
    for (const part of parts) {
      const p = part.trim();
      if (!p) continue;
      if (p.startsWith('```')) {
        out.push(`<pre><code>${esc(p.replace(/^```\w*\n?/, '').replace(/\n?```$/, ''))}</code></pre>`);
      } else if (p.startsWith('### ')) {
        const [head, ...rest] = p.split('\n');
        out.push(`<h4>${inline(head.slice(4))}</h4>`);
        if (rest.length) out.push(`<p>${inline(rest.join(' '))}</p>`);
      } else if (/^- /.test(p)) {
        out.push(`<ul>${p.split(/\n(?=- )/).map((li) => `<li>${inline(li.replace(/^- /, '').replace(/\n/g, ' '))}</li>`).join('')}</ul>`);
      } else {
        out.push(`<p>${inline(p.replace(/\n/g, ' '))}</p>`);
      }
    }
    return out.join('\n');
  }

  root.MD = { esc, inline, block };
})(typeof window !== 'undefined' ? window : globalThis);
