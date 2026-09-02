# Deep Rhythms — web app

A self-contained Web Audio app (no build step, no server-side code) that finds and
plays Toussaint's "deep rhythms" — see G. Toussaint, *The Geometry of Musical
Rhythm*, Chapter 25. Sound comes from a small Faust-compiled percussion voice
(`click.dsp`, included) run via WebAssembly.

## What counts as "deep"

For k onsets placed on n pulses arranged in a circle, look at every pair of
onsets and measure the shorter distance between them around the circle. A
rhythm is **deep** if every distance that actually occurs does so a
*different* number of times (no two distances tie in how often they appear).
This mirrors the classic "deep scale" property from scale theory (the
diatonic scale is the textbook example), applied to onset patterns instead of
pitch-class sets.

The evenly-spaced (isochronous) pattern — when k divides n — always satisfies
this condition too, but trivially (there's only one distance to begin with).
The app reports it separately as a "regular" rhythm rather than mixing it
into the deep-rhythm results, which is how the concept is normally discussed.

Deep-ness only depends on the *set* of pairwise distances, which doesn't
change under rotation — so the app searches for necklaces (rotation classes)
rather than raw onset sets, then lets you pick which onset of the necklace
you want anchored at pulse 0.

The default example on load — 3 onsets on 12 pulses — reproduces the four
classic deep rhythms from the book: IOI patterns 1-1-10, 2-2-8, 2-5-5, and
3-3-6 (plus the regular 4-4-4, shown separately).

## Host it on GitHub Pages

1. Copy every file in this folder into your GitHub Pages repo — either the
   repo root, or a subfolder like `deep-rhythms/` if it's one page among
   several on your site.
2. Commit and push.
3. In the repo's Settings → Pages, make sure the source is set to the branch
   and folder you pushed to.
4. Visit the published URL. Click **Play** (a click is required — browsers
   block audio from starting on page load).

No build tools or server are needed at hosting time — everything here is
static files.

## Test it locally first

Browsers block `fetch()` of local files opened directly (`file://`), so
double-clicking `index.html` won't work — serve it over HTTP instead:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/`.

## Files

- `index.html` / `index.js` — the UI: the deep-rhythm search, the circular
  diagram, the anchor picker, and the lookahead-scheduled transport.
- `deep-rhythms.js` — the actual math: combination enumeration, necklace
  canonicalization, interval-content histograms, and the deep-rhythm search.
  No dependencies; readable on its own if you want to reuse the algorithm
  elsewhere.
- `click.dsp` — the Faust source for the percussion voice (pitch, decay,
  tone, and level are all exposed as knobs in the app). Edit it and
  recompile with:

  ```
  npx faust2wasm click.dsp ./out -standalone
  ```

  then copy the regenerated `dsp-module.wasm` and `dsp-meta.json` back in.
- `dsp-module.wasm` / `dsp-meta.json` — the compiled DSP.
- `faust-ui/`, `faustwasm/`, `create-node.js` — small runtime libraries that
  build the on-page knobs and connect the compiled DSP to the Web Audio
  graph.

## A note on the math

The search is a plain brute-force enumeration of onset combinations
(deduplicated into rotation classes), which is instant for the pulse counts
this app allows (capped at 24). It isn't the fast algorithm you'd want for
much larger pulse counts, but it's easy to read and easy to check against
the book by hand — which mattered more here than raw speed.
