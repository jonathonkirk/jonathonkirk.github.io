// deep-rhythms.js
//
// Generates Toussaint "deep rhythms": onset patterns on n pulses where every
// duration that actually occurs between pairs of onsets (measured as the
// shorter distance around the cycle) occurs a *different* number of times.
// Reference: G. Toussaint, "The Geometry of Musical Rhythm", Ch. 25.
//
// A rhythm here is a set of onset positions in Z_n. "Deep-ness" is a
// rotation-invariant property (it depends only on the multiset of pairwise
// distances, which is unchanged by rotation), so we enumerate rhythms as
// necklaces (equivalence classes under rotation) rather than raw subsets.

/** All k-combinations of {0, ..., n-1}, in lexicographic order, as arrays. */
function* combinations(n, k) {
  if (k === 0) { yield []; return; }
  if (k > n) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.slice();
    let i = k - 1;
    while (i >= 0 && idx[i] === i + n - k) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

function rotate(onsets, r, n) {
  return onsets.map((x) => (x + r) % n).sort((a, b) => a - b);
}

function tupleLess(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/** Canonical (lexicographically smallest) rotation of an onset set. */
function necklaceCanonical(onsets, n) {
  let best = onsets.slice().sort((a, b) => a - b);
  for (let r = 1; r < n; r++) {
    const rotated = rotate(onsets, r, n);
    if (tupleLess(rotated, best)) best = rotated;
  }
  return best;
}

/** Interval-content histogram: realized minimal cyclic distance -> count. */
function intervalContent(onsets, n) {
  const hist = new Map();
  for (let i = 0; i < onsets.length; i++) {
    for (let j = i + 1; j < onsets.length; j++) {
      let d = Math.abs(onsets[i] - onsets[j]) % n;
      d = Math.min(d, n - d);
      hist.set(d, (hist.get(d) || 0) + 1);
    }
  }
  return hist;
}

function isDeepHistogram(hist) {
  const counts = Array.from(hist.values());
  return new Set(counts).size === counts.length;
}

/** True if `onsets` is the perfectly evenly-spaced (isochronous) pattern. */
function isRegular(onsets, n) {
  const k = onsets.length;
  if (k === 0 || n % k !== 0) return false;
  const step = n / k;
  const sorted = onsets.slice().sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[0] !== i * step) return false;
  }
  return true;
}

function ioiSequence(onsets, n) {
  const s = onsets.slice().sort((a, b) => a - b);
  const iois = [];
  for (let i = 0; i < s.length; i++) {
    const next = s[(i + 1) % s.length];
    const d = (next - s[i] + n) % n || n; // wrap distance, full circle for k=1
    iois.push(d);
  }
  return iois;
}

/**
 * Find all deep-rhythm necklaces for k onsets on n pulses.
 * Returns { deep: [...], regular: {...}|null, truncated: bool }
 * Each deep entry: { onsets, ioi, hist } where onsets is the canonical
 * rotation (an onset placed at pulse 0).
 */
function findDeepRhythms(n, k, opts) {
  opts = opts || {};
  const maxCombinations = opts.maxCombinations || 4_000_000;
  const seen = new Set();
  const deep = [];
  let regular = null;
  let count = 0;
  let truncated = false;

  for (const combo of combinations(n, k)) {
    count++;
    if (count > maxCombinations) { truncated = true; break; }
    const canon = necklaceCanonical(combo, n);
    const key = canon.join(",");
    if (seen.has(key)) continue;
    seen.add(key);

    if (isRegular(canon, n)) {
      regular = { onsets: canon, ioi: ioiSequence(canon, n), hist: intervalContent(canon, n) };
      continue; // regular/isochronous rhythms are trivially "deep"; reported separately
    }

    const hist = intervalContent(canon, n);
    if (isDeepHistogram(hist)) {
      deep.push({ onsets: canon, ioi: ioiSequence(canon, n), hist });
    }
  }

  // Sort for stable, sensible display order (by first non-zero IOI gap shape)
  deep.sort((a, b) => {
    for (let i = 0; i < Math.min(a.ioi.length, b.ioi.length); i++) {
      if (a.ioi[i] !== b.ioi[i]) return a.ioi[i] - b.ioi[i];
    }
    return 0;
  });

  return { deep, regular, truncated };
}

/** Rotate a necklace's canonical onset set so `onsetIndex`-th onset sits at pulse 0. */
function anchorAt(onsets, n, onsetIndex) {
  const sorted = onsets.slice().sort((a, b) => a - b);
  const pivot = sorted[onsetIndex % sorted.length];
  return rotate(sorted, n - pivot, n).sort((a, b) => a - b);
}

function toPattern(onsets, n) {
  const pat = new Array(n).fill(0);
  onsets.forEach((o) => { pat[o] = 1; });
  return pat;
}

function histToString(hist) {
  const keys = Array.from(hist.keys()).sort((a, b) => a - b);
  return keys.map((k) => `d${k}×${hist.get(k)}`).join("  ");
}

export {
  combinations,
  necklaceCanonical,
  intervalContent,
  isDeepHistogram,
  isRegular,
  ioiSequence,
  findDeepRhythms,
  anchorAt,
  toPattern,
  histToString,
};
