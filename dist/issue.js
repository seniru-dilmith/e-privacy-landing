// ePrivacy, Issue #2 · Trazeus. Prefilled from the stall backdrop.
// AGENTS.md explains every field. Everything below the ASK line is still to come from your group.
// The build refuses to run while anything is missing, so nothing half-done can go live.
window.ISSUE = {
  issue: 2,
  project: 'ePrivacy',
  wordmark: 'Privacy',
  kicker: 'Privacy-preserving analytics',
  group: 'Trazeus',
  says: "I can't see your data!",
  colors: { accent: '#22b573', accentDeep: '#0a6a58', onAccent: '#111111', shadow: '#0b4f42', ribbon: '#0b6b4f' },
  art: {
    cover: 'art/hero.webp',
    kind: 'hero',
    side: 'left',
    alt: 'The ePrivacy hero, blindfolded, pointing, with a sum symbol and numbered padlocks glowing at his hand',
    emblem: 'art/emblem.png',
    avatar: 'art/avatar.webp',
  },

  siteUrl: 'https://e-privacy.seniru.dev',
  title: "ePrivacy, Issue #2: the cloud that adds up what it can't read",
  description: 'How a hospital gets statistics from an untrusted cloud without the cloud seeing one patient value, and how anyone can check the answer. Encrypt, add and audit on your phone. A project by group Trazeus.',
  doors: { slidesHref: '/presentation/', slidesTitle: 'Watch the slides', slidesText: 'The stall loop: the idea, the app and how it works, in about two minutes.', playText: 'Be the records officer: lock a stay length, let the cloud add it blind, then catch it cheating. Two minutes.' },
  intro: [
    '**Hospitals want statistics, and the cloud is where they compute them.** Data is locked on disk and in transit, but to add anything up, a normal server must unlock it first. For that moment every record sits open in memory.',
    'We compute on data that stays locked. The cloud adds encrypted values it cannot read, and a public log lets anyone check the answer. Try it in the game: the cryptography runs on your phone, and nothing you type leaves it.',
  ],
  chapters: [
    {
      title: 'The data-in-use gap',
      lede: 'Encryption protects data on disk and on the wire. Analytics needs the values themselves, so the server decrypts them first. That open moment is the gap.',
      figure: {
        title: 'Where a record is protected',
        blocks: [
          { rules: [
            ['yes', '**At rest:** disk encryption.'],
            ['yes', '**In transit:** TLS.'],
            ['no', '**In use:** decrypted in server memory to compute.'],
          ] },
          { note: 'Removing names and ID numbers is not enough. Postcode, date of birth and sex together re-identify most people when joined with public records.' },
        ],
      },
      says: "Locked everywhere except where it matters.",
      deeper: `Insiders, compromised hosts and memory-scraping malware can all read data while it is being computed on. This is the data-in-use gap.

A second problem is the linkage attack: quasi-identifiers such as postcode, date of birth and sex, joined with a public record, single a person out even when direct identifiers are removed. So we do both things: direct identifiers never leave the hospital, and everything the cloud stores for computing stays encrypted.`,
    },
    {
      title: 'Add without unlocking',
      lede: 'With an additively homomorphic cipher, multiplying two ciphertexts gives the encryption of the sum. The cloud adds locked values and returns a locked total. Only the hospital can open it.',
      figure: {
        title: 'The trick, with small numbers',
        blocks: [
          { kv: [['Hospital locks', 'Enc(12) and Enc(30)'], ['Cloud multiplies', 'Enc(12) × Enc(30)']] },
          { via: 'Multiply ciphertexts, add values', icon: 'lock' },
          { kv: [['Hospital opens', 'Dec( … ) = 42', 'key']] },
          { tryLink: 'Do it yourself in the game' },
        ],
      },
      says: "I added it up. I never saw a number.",
      deeper: `### Paillier
We use the Paillier cryptosystem: Enc(a) · Enc(b) mod n² decrypts to a + b. A fresh keypair is generated for every analytics campaign and the private key never leaves the hospital's own service. Key length is chosen per campaign, 1024 or 2048 bits.

### Why not something heavier
Fully homomorphic encryption can compute more, but our benchmark put CKKS at about 617 GB for 2 million records at 2048 bits, against about 1 GB for Paillier. Sums, counts and averages need nothing more than addition, so we chose the narrowest scheme that does the job. The Cryptographic Design document has the benchmark.`,
    },
    {
      title: 'Only totals leave',
      lede: 'The hospital drops names, ID numbers, birth dates and postcodes, and encrypts every clinical and billing value. The cloud sees ciphertext and a few coarse labels. It only ever releases group totals.',
      figure: {
        title: 'What the cloud can see',
        blocks: [
          { rules: [
            ['yes', 'Public keys and ciphertext.'],
            ['yes', 'Coarse labels: department, ward, month, age band.'],
            ['no', 'Names, ID numbers, birth dates, postcodes.'],
            ['no', 'Any measured value: stay, cost, vitals, outcome.'],
          ] },
          { note: 'Groups smaller than the minimum size, 10 by default, are withheld so no individual can be singled out.' },
        ],
      },
      says: "Departments, yes. People, never.",
      deeper: `### Policy at the cloud
The cloud gateway enforces roles and a minimum group size (\`K_MIN\`, default 10). A result for a group below that size is refused rather than released.

### Honest limit
The coarse labels are visible to the cloud by design, since it needs them to group. They are chosen so a single group has many records.`,
    },
    {
      title: 'A receipt for every record',
      lede: 'When the cloud stores your ciphertexts it signs a receipt: the root of a Merkle tree over every record it got. Drop, add or change one record and the root changes.',
      figure: {
        title: 'Edit one record, break the root',
        blocks: [
          { merkleDemo: {
            entries: ['record 1 · cardiology', 'record 2 · cardiology', 'record 3 · oncology', 'record 4 · oncology', 'record 5 · neurology', 'record 6 · neurology', 'record 7 · paediatrics', 'record 8 · paediatrics'],
            edit: [2, 'record 3 · oncology (changed)'],
            rootLabel: 'Root the cloud signed',
          } },
          { note: 'This demo hashes short text labels. The real leaves are the stored ciphertext records.' },
          { tryLink: 'Edit a record yourself in the game' },
        ],
      },
      says: "Change one thing and every hash up shows it.",
      deeper: `### What the hospital does
After upload, the hospital compares the cloud's signed Merkle root with the one it computed itself. Any single record can later be proven still stored as uploaded, from the Receipts page, with a Merkle proof.

### Where the code lives
Record layout, leaf and Merkle hashing and the signatures live in one shared module, \`shared/protocol.js\`, used by the hospital agent, the cloud and the auditor's browser, so all three agree byte for byte.`,
    },
    {
      title: 'Five checks, then decrypt',
      lede: 'The hospital does not trust the cloud\'s answer. A result is accepted only when five independent checks all agree. Only then are the sums decrypted and charted.',
      figure: {
        title: 'Before anything is opened',
        blocks: [
          { timeline: [
            ['Signature', 'The result is signed by the cloud.'],
            ['Board copy', 'It matches what the public log shows.'],
            ['Input root', 'It was computed over the records the hospital sent.'],
            ['Record count', 'No record was left out or added.'],
            ['Recompute', 'It agrees with a recomputation from local plaintext.'],
          ] },
        ],
      },
      says: "Trust, but check five times.",
      deeper: `After the checks pass, the hospital decrypts the sums and publishes the decrypted value m together with the randomness r used in the ciphertext. Anyone can then check that gᵐ · rⁿ ≡ C (mod n²) with only public information, so even the hospital cannot misreport a result.`,
    },
    {
      title: 'Anyone can audit',
      lede: 'Every step goes on a signed, hash-chained public bulletin board. An auditor needs no key and no trust in the hospital or the cloud: the browser replays everything.',
      figure: {
        title: 'The four public checks',
        blocks: [
          { checks: [
            'The hash chain and every signature hold.',
            'Every Merkle root rebuilds from the published ciphertexts.',
            'Every encrypted sum recomputes.',
            'Every published plaintext matches its ciphertext.',
          ] },
          { note: 'Run all four from the Bulletin board page. They run in a Web Worker in your browser and use only public data.' },
        ],
      },
      says: "Don't take my word. Run it yourself.",
      deeper: `Individual verifiability: the hospital proves its own records were stored as uploaded and used in its query. Universal verifiability: any auditor checks the signed log, rebuilds the input set, recomputes every encrypted sum and verifies every published result using public data only.`,
    },
    {
      title: 'Catching a cheating cloud',
      lede: 'The cloud can misbehave, but not silently. The app ships with a switch that makes it cheat on purpose, so you can watch the hospital and the auditor catch it.',
      figure: {
        title: 'Two ways to cheat, both caught',
        blocks: [
          { table: {
            head: ['The cloud…', 'Caught by'],
            rows: [
              ['drops a record from a query', 'Record count and input root'],
              ['doubles one ciphertext', 'The recomputation, and the auditor\'s sum check'],
            ],
            win: 0,
          } },
          { note: 'Run an analysis with the switch on and the hospital rejects it. Run the audit and the matching check fails.' },
        ],
      },
      says: "I tried. It noticed.",
      deeper: `On the Monitor page an admin can turn on drop, which leaves a record out of each query, or tamper, which doubles one ciphertext. Neither can hide: dropping a record or changing a ciphertext alters a root, a count or an encrypted sum that someone is checking independently.`,
    },
    {
      title: "What we don't claim",
      lede: 'This is an academic project. Here is what it does not do.',
      cards: [
        ['Not security-audited', 'It shows the design end to end. It is not cleared for real patient data.'],
        ['No differential privacy yet', 'Released totals carry no noise. This is still to build.'],
        ['One hospital only', 'Multi-hospital studies with threshold decryption are still to build.'],
        ['Synthetic data', 'The 540,000 admissions are generated. No real patient data is used anywhere.'],
      ],
    },
  ],
  closing: ['Encrypted.', 'Added blind.', 'Checked by anyone.'],
  footnote: 'This site sends nothing anywhere. The game runs entirely on your phone. An academic project by group Trazeus.',
  game: {
    title: 'Try it · ePrivacy',
    description: 'Lock a value, let the cloud add it blind, then catch the cloud cheating. Runs on your phone in two minutes.',
    steps: [
      {
        type: 'story', tag: 'Step 1 · The job', title: "You're the records officer",
        text: "The hospital wants the **total** of patient stays on a ward. The cloud can add them up, but the cloud must never see a single stay. You hold the key.",
        says: "I can't see your data!", saysTop: true, next: 'Start',
      },
      {
        type: 'input', tag: 'Step 2 · A patient', title: 'How long did they stay?',
        text: 'Pick a length of stay for one patient.',
        key: 'stay', kind: 'number', label: 'Length of stay', example: '5', min: 1, max: 60,
        error: 'Enter a whole number of days from 1 to 60.',
      },
      {
        type: 'custom', badge: 'toy', tag: 'Step 3 · Lock and add', title: 'The cloud adds blind',
        text: 'Your {stay:raw} days and two other stays, **4** and **9**, are each locked with a fresh Paillier key. The cloud multiplies the three locks. Then you open the result.',
        next: 'Next',
        render: async (api) => { await paillierStep(api); },
        reset: (api) => { api.body.textContent = ''; api.ready(false); },
      },
      {
        type: 'merkle', badge: 'live', tag: 'Step 4 · The receipt', title: 'Try to alter a record',
        text: 'The cloud signed a receipt over eight stored records. Edit yours and see what happens to the root.',
        entries: ['stay · {stay:raw} days', 'stay · 4 days', 'stay · 9 days', 'stay · 6 days', 'stay · 3 days', 'stay · 12 days', 'stay · 2 days', 'stay · 8 days'],
        mine: 0, rootLabel: 'Root the cloud signed',
      },
      {
        type: 'choice', badge: 'illustration', required: true, tag: 'Step 5 · Cheat', title: 'Make the cloud cheat',
        text: 'Pick how the cloud misbehaves, then see what the hospital does.',
        options: [
          { label: 'Drop a record', good: false, reply: '**Rejected.** The record count is 7, not 8, and the input root does not match.' },
          { label: 'Double a ciphertext', good: false, reply: '**Rejected.** The recomputation from local data disagrees, and the auditor\'s sum check fails.' },
        ],
      },
      {
        type: 'checks', badge: 'illustration', tag: 'Step 6 · The honest run', title: 'Now the hospital accepts',
        text: 'With no cheating, an analysis passes all five checks before anything is decrypted.',
        items: ['Signature holds', 'Matches the public log', 'Input root matches', 'Record count matches', 'Matches local plaintext'],
        result: 'All five checks passed. Now the sums are decrypted.', next: 'Finish',
      },
      {
        type: 'recap', title: 'What you just did',
        lines: [
          'You locked **{stay:raw} days** so the cloud could add it without reading it.',
          'You tried to change a record and the root **broke**.',
          'You made the cloud cheat and the hospital **rejected** it.',
        ],
        readHref: '/#ch1',
      },
    ],
  },
};

// A small, real Paillier: BigInt, a fresh 256-bit key each run (the system uses 1024 or 2048 bits).
async function paillierStep(api) {
  const mod = (a, m) => ((a % m) + m) % m;
  const pow = (b, e, m) => { let r = 1n; b = mod(b, m); while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; } return r; };
  const rnd = (bits) => { const a = new Uint8Array(bits / 8); crypto.getRandomValues(a); a[0] |= 0x80; a[a.length - 1] |= 1; return BigInt('0x' + [...a].map((x) => x.toString(16).padStart(2, '0')).join('')); };
  const prime = (bits) => { for (;;) { const c = rnd(bits); let ok = true; for (let i = 0; i < 20 && ok; i++) { const a = 2n + (rnd(64) % (c - 4n)); let d = c - 1n, s = 0; while (!(d & 1n)) { d >>= 1n; s++; } let x = pow(a, d, c); if (x === 1n || x === c - 1n) continue; let f = false; for (let j = 1; j < s; j++) { x = (x * x) % c; if (x === c - 1n) { f = true; break; } } if (!f) ok = false; } if (ok) return c; } };
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  api.body.textContent = 'Making a key…';
  await api.wait(30);
  let p = prime(128), q = prime(128);
  while (p === q) q = prime(128);
  const n = p * q, n2 = n * n, g = n + 1n, lam = ((p - 1n) * (q - 1n)) / gcd(p - 1n, q - 1n);
  const L = (x) => (x - 1n) / n;
  const inv = (a, m) => { let [r0, r1, t0, t1] = [m, mod(a, m), 0n, 1n]; while (r1) { const k = r0 / r1; [r0, r1] = [r1, r0 - k * r1]; [t0, t1] = [t1, t0 - k * t1]; } return mod(t0, m); };
  const mu = inv(L(pow(g, lam, n2)), n);
  const enc = (m) => { let r; do { r = rnd(128) % n; } while (gcd(r, n) !== 1n); return (pow(g, BigInt(m), n2) * pow(r, n, n2)) % n2; };
  const dec = (c) => (L(pow(c, lam, n2)) * mu) % n;
  const mine = Number(api.state.values.stay);
  const vals = [mine, 4, 9];
  const cts = vals.map(enc);
  const prod = cts.reduce((a, b) => (a * b) % n2, 1n);
  const sum = dec(prod);
  const short = (x) => x.toString(16).slice(0, 28) + '…';
  const row = (l, v, c) => `<div class="kv${c ? ' ' + c : ''}"><dt>${l}</dt><dd>${v}</dd></div>`;
  api.body.innerHTML = `<dl class="out">${row('Your stay, locked', short(cts[0]))}${row('The two others, locked', short(cts[1]) + '<br>' + short(cts[2]))}<div class="via"><span>The cloud multiplies the three. It never sees a number.</span></div>${row('What the cloud returns', short(prod))}${row('You open it', 'Total = ' + sum + ' days', 'key')}</dl><p class="fig-note">Real Paillier with a 256-bit key made just now. The system uses 1024 or 2048 bits.</p>`;
  api.ready(true);
}
