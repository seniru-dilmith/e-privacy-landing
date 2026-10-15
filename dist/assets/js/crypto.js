// The maths behind the live panels. Everything runs on the visitor's own device:
// nothing here talks to a network, and nothing typed into the page leaves it.
// AES-GCM and SHA-256 come from the browser's built-in WebCrypto; the rest is small enough to write out.
(function (root) {
  'use strict';
  const subtle = root.crypto.subtle;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const fromHex = (h) => Uint8Array.from(h.match(/../g), (b) => parseInt(b, 16));
  const random = (n) => root.crypto.getRandomValues(new Uint8Array(n));
  const toBig = (bytes) => BigInt('0x' + (hex(bytes) || '0'));
  const fromBig = (x, n) => fromHex(x.toString(16).padStart(n * 2, '0'));

  // ---- Chapter 1: seal a price with AES-128-GCM ----
  async function seal(text) {
    const keyBytes = random(16);
    const nonce = random(12);
    const key = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, enc.encode(text)));
    return { keyBytes, nonce, ct };
  }

  // Resolves to the plaintext, or rejects when the key is wrong or a single bit of the ciphertext changed.
  async function open(keyBytes, nonce, ct) {
    const key = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
    return dec.decode(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct));
  }

  // ---- Chapter 2: Shamir 2-of-3 over GF(2^128) ----
  // Field: polynomials over GF(2) modulo x^128 + x^7 + x^2 + x + 1, bytes read big-endian.
  const MOD = (1n << 128n) | 0x87n;
  function gfMul(a, b) {
    let r = 0n;
    while (b) {
      if (b & 1n) r ^= a;
      b >>= 1n;
      a <<= 1n;
      if (a >> 128n) a ^= MOD;
    }
    return r;
  }
  function gfInv(a) {
    // a^(2^128 - 2): every non-zero element has order dividing 2^128 - 1.
    let result = 1n;
    let base = a;
    let e = (1n << 128n) - 2n;
    while (e) {
      if (e & 1n) result = gfMul(result, base);
      base = gfMul(base, base);
      e >>= 1n;
    }
    return result;
  }

  // f(x) = secret + a·x with a random; custodian i gets (i, f(i)). Any two points fix the line, one point fixes nothing.
  function split2of3(secretBytes) {
    const s = toBig(secretBytes);
    let a = 0n;
    while (a === 0n) a = toBig(random(16)); // a zero slope would hand every custodian the key itself
    return [1n, 2n, 3n].map((x) => ({ x: Number(x), y: fromBig(s ^ gfMul(a, x), 16) }));
  }

  // Lagrange interpolation at x = 0. In characteristic 2, subtraction is the same as addition (XOR).
  function combine2(p, q) {
    const x1 = BigInt(p.x);
    const x2 = BigInt(q.x);
    const d = gfInv(x1 ^ x2);
    const s = gfMul(toBig(p.y), gfMul(x2, d)) ^ gfMul(toBig(q.y), gfMul(x1, d));
    return fromBig(s, 16);
  }

  // ---- Chapter 3: an RFC 9162 Merkle tree ----
  async function sha256(...parts) {
    const len = parts.reduce((n, p) => n + p.length, 0);
    const buf = new Uint8Array(len);
    let o = 0;
    for (const p of parts) { buf.set(p, o); o += p.length; }
    return new Uint8Array(await subtle.digest('SHA-256', buf));
  }
  const leafHash = (text) => sha256(Uint8Array.of(0), enc.encode(text));
  const nodeHash = (l, r) => sha256(Uint8Array.of(1), l, r);

  // Levels from the leaves up to the root, for a power-of-two number of leaves.
  async function merkleLevels(texts) {
    const levels = [await Promise.all(texts.map(leafHash))];
    while (levels.at(-1).length > 1) {
      const prev = levels.at(-1);
      const next = [];
      for (let i = 0; i < prev.length; i += 2) next.push(await nodeHash(prev[i], prev[i + 1]));
      levels.push(next);
    }
    return levels;
  }

  // The sibling hashes a verifier needs to recompute the root from one leaf.
  function inclusionPath(levels, index) {
    const path = [];
    for (let l = 0, i = index; l < levels.length - 1; l++, i >>= 1) path.push({ level: l, index: i ^ 1, hash: levels[l][i ^ 1] });
    return path;
  }

  async function rootFromPath(leafText, index, path) {
    let h = await leafHash(leafText);
    let i = index;
    for (const step of path) {
      h = i & 1 ? await nodeHash(step.hash, h) : await nodeHash(h, step.hash);
      i >>= 1;
    }
    return h;
  }

  // ---- Chapter 4: an illustration of the per-tender tag (not the real BBS04 maths) ----
  async function tagFor(memberSecret, tenderId) {
    return hex(await sha256(enc.encode(`tag|${memberSecret}|${tenderId}`))).slice(0, 16);
  }

  // ---- Chapter 6: additive shares mod r, the BLS12-381 group order our MPC works in ----
  const R = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;
  function randomModR() {
    for (;;) {
      const b = random(32);
      b[0] &= 0x7f; // r is just under 2^255
      const x = toBig(b);
      if (x < R) return x;
    }
  }
  function shareAdditive(value) {
    const a = randomModR();
    const b = randomModR();
    const c = (((BigInt(value) - a - b) % R) + R) % R;
    return [a, b, c];
  }
  const addShares = (shares) => shares.reduce((s, x) => (s + x) % R, 0n);

  root.ETC = { hex, fromHex, random, seal, open, split2of3, combine2, gfMul, gfInv, merkleLevels, inclusionPath, rootFromPath, leafHash, tagFor, shareAdditive, addShares, R };
})(typeof window !== 'undefined' ? window : globalThis);
