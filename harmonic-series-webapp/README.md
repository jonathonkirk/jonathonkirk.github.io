# Harmonic Series Explorer — web app

A self-contained Web Audio app (no build step, no server-side code) that runs
the 8-oscillator harmonic series demo in the browser. Generated from
`harmonic.dsp` (included) using Faust's WebAssembly compiler.

## Host it on GitHub Pages

1. Copy every file in this folder into your GitHub Pages repo — either the
   repo root, or a subfolder like `harmonic-series/` if it's one page among
   several on your site.
2. Commit and push.
3. In the repo's Settings → Pages, make sure the source is set to the branch
   and folder you pushed to (e.g. `main` / `/ (root)`, or `main` / `/docs`).
4. Visit the published URL. Click **Start** (a click is required — browsers
   block audio from starting on page load).

No build tools, npm install, or server are needed at hosting time — everything
here is static files. `dsp-module.wasm` and `dsp-meta.json` are the compiled
DSP; `faust-ui/` and `faustwasm/` are the small runtime libraries that build
the on-page controls and connect them to the Web Audio graph.

## Test it locally first

Browsers block `fetch()` of local files opened directly (`file://`), so
double-clicking `index.html` won't work — serve it over HTTP instead, e.g.
from this folder:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/`.

## Editing the sound

`harmonic.dsp` is the actual DSP source (same code from our conversation). If
you change it, you'll need the Faust compiler to regenerate `dsp-module.wasm`
and `dsp-meta.json` — the easiest way is to paste the edited code into
[faustide.grame.fr](https://faustide.grame.fr) and use its export options, or
use the `@grame/faustwasm` npm package's `faust2wasm` script locally:

```
npx faust2wasm harmonic.dsp ./out -standalone
```

One thing to know if you regenerate: Faust's compiler doesn't lay out the
on-page controls in source-code order — it follows its own internal signal
ordering, which for this DSP scrambles the 17 controls. `dsp-meta.json` in
this folder has already been reordered by hand (grouped as Fundamental, then
one box per harmonic pairing its level slider with its frequency readout) so
what you see matches what's in the code. A regenerated `dsp-meta.json` will
revert to the compiler's default order.
