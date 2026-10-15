// The icon sprite for the loop. Use an icon with <svg class="ico"><use href="#i-lock"/></svg>.
// To add one, add a <symbol> with a 24x24 viewBox, drawn in strokes (no fills), like the others.
// It is a script rather than an .svg file because pages opened from file:// cannot fetch,
// and <use href="file.svg#id"> is blocked there too.
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="i-mail" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M3 6.5l9 6.5 9-6.5"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v3"/></symbol>
    <symbol id="i-unlock" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/></symbol>
    <symbol id="i-key" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20.5 2.5"/><path d="M16.5 6.5l3 3"/><path d="M18.5 4.5l2 2"/></symbol>
    <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
    <symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></symbol>
    <symbol id="i-mega" viewBox="0 0 24 24"><path d="M3 10.5v3a1 1 0 0 0 1 1h3l5.5 4.5v-14L7 9.5H4a1 1 0 0 0-1 1z"/><path d="M16 9a3.5 3.5 0 0 1 0 6"/><path d="M18.5 6.5a7 7 0 0 1 0 11"/></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><path d="M8 13h8M8 17h5"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6.5L9.5 17 4 11.5"/></symbol>
    <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
    <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 21.5s8-3.8 8-10V5.2l-8-3-8 3v6.3c0 6.2 8 10 8 10z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></symbol>
    <symbol id="i-mask" viewBox="0 0 24 24"><path d="M2.5 9.5c0-1.8 1-2.8 3-2.8h13c2 0 3 1 3 2.8 0 4.3-2.8 7.5-5.8 7.5-2 0-2.3-2-3.7-2s-1.7 2-3.7 2c-3 0-5.8-3.2-5.8-7.5z"/><circle cx="8.3" cy="10.8" r="1.6"/><circle cx="15.7" cy="10.8" r="1.6"/></symbol>
    <symbol id="i-server" viewBox="0 0 24 24"><rect x="3" y="3.5" width="18" height="7" rx="1.5"/><rect x="3" y="13.5" width="18" height="7" rx="1.5"/><path d="M7 7h.01M7 17h.01"/></symbol>
    <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 13.5a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7L12 5.5"/><path d="M14 10.5a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 18.5"/></symbol>
    <symbol id="i-trophy" viewBox="0 0 24 24"><path d="M8 21h8M12 16.5V21"/><path d="M7 3.5h10V9a5 5 0 0 1-10 0z"/><path d="M17 5h3v1.5a3.5 3.5 0 0 1-3.5 3.5M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10"/></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></symbol>
    <symbol id="i-clip" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17.5" rx="2"/><path d="M9 2.5h6V6H9z"/><path d="M9 13.5l2 2 4-4"/></symbol>
    <symbol id="i-cpu" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></symbol>
    <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/></symbol>
    <symbol id="i-browser" viewBox="0 0 24 24"><rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M2.5 8.5h19"/><path d="M5.5 6.3h.01M8 6.3h.01"/></symbol>
    <symbol id="i-building" viewBox="0 0 24 24"><path d="M4 21.5V5l8-2.5V21.5"/><path d="M12 8.5l8 2.5v10.5"/><path d="M2.5 21.5h19"/><path d="M7.5 8h1.5M7.5 12h1.5M7.5 16h1.5M15.5 13.5H17M15.5 17H17"/></symbol>
    <symbol id="i-vault" viewBox="0 0 24 24"><rect x="3" y="3.5" width="18" height="16" rx="2"/><circle cx="12" cy="11.5" r="4"/><path d="M12 7.5v1.5M12 14v1.5M8 11.5h1.5M14.5 11.5H16"/><path d="M6 19.5v1.5M18 19.5v1.5"/></symbol>
    <symbol id="i-gavel" viewBox="0 0 24 24"><path d="M14.5 3.5l6 6M12 6l6 6M13.3 4.8l-5.6 5.6 6 6 5.6-5.6"/><path d="M10.5 13.5l-7 7"/><path d="M3 21.5h9"/></symbol>
  </defs>
</svg>`);
