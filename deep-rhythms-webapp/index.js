import { findDeepRhythms, anchorAt, toPattern, histToString } from "./deep-rhythms.js";

const FAUST_DSP_VOICES = 0;

const $onsetsInput = document.getElementById("onsets-input");
const $pulsesInput = document.getElementById("pulses-input");
const $generateBtn = document.getElementById("generate-btn");
const $resultsNote = document.getElementById("results-note");
const $resultsList = document.getElementById("results-list");
const $rhythmPanel = document.getElementById("rhythm-panel");
const $anchorRow = document.getElementById("anchor-row");
const $wheel = document.getElementById("wheel");
const $playBtn = document.getElementById("play-btn");
const $tempoSlider = document.getElementById("tempo-slider");
const $tempoVal = document.getElementById("tempo-val");
const $divFaustUI = document.getElementById("div-faust-ui");

const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioCtx({ latencyHint: 0.00001 });
audioContext.suspend();

let faustNode = null;
let gateAddress = null;

let currentN = 12;
let currentNecklace = null; // canonical onset array
let anchorIndex = 0;
let pattern = []; // 0/1 array, length n, rotated so pattern[0] === 1

// ---------- Faust setup ----------
(async () => {
    const { createFaustNode, createFaustUI } = await import("./create-node.js");
    const result = await createFaustNode(audioContext, "click", FAUST_DSP_VOICES);
    faustNode = result.faustNode;
    if (!faustNode) throw new Error("Faust DSP not compiled");

    await createFaustUI($divFaustUI, faustNode);
    faustNode.connect(audioContext.destination);

    // Find the gate control's address from the compiled metadata.
    const findGate = (items) => {
        for (const it of items) {
            if (it.address && /\/gate$/.test(it.address)) return it.address;
            if (it.items) {
                const found = findGate(it.items);
                if (found) return found;
            }
        }
        return null;
    };
    gateAddress = findGate(result.dspMeta.ui);

    $playBtn.disabled = false;
    $playBtn.textContent = "▶ Play";
})().catch((err) => {
    console.error(err);
    $playBtn.textContent = "Audio failed to load";
});

function triggerClick(time) {
    if (!faustNode || !gateAddress) return;
    const delayMs = Math.max(0, (time - audioContext.currentTime) * 1000);
    setTimeout(() => {
        faustNode.setParamValue(gateAddress, 1);
        setTimeout(() => faustNode.setParamValue(gateAddress, 0), 18);
    }, delayMs);
}

// ---------- Generator ----------
function renderResults(n, k) {
    const { deep, regular, truncated } = findDeepRhythms(n, k);
    $resultsList.innerHTML = "";

    let note = `${deep.length} deep rhythm${deep.length === 1 ? "" : "s"} found for ${k} onsets on ${n} pulses.`;
    if (regular) note += " The evenly-spaced pattern also exists for this (n, k) but is shown separately as a regular rhythm, not counted above.";
    if (truncated) note += " (Search was capped before finishing — try a smaller pulse count.)";
    $resultsNote.textContent = note;

    const makeCard = (entry, isRegular) => {
        const card = document.createElement("div");
        card.className = "result-card" + (isRegular ? "" : "");
        const ioiText = entry.ioi.join("‑");
        card.innerHTML = `<span class="ioi">${isRegular ? "Regular: " : ""}${ioiText}</span><span class="hist">${histToString(entry.hist)}</span>`;
        card.addEventListener("click", () => selectNecklace(n, entry.onsets));
        return card;
    };

    if (deep.length === 0 && !regular) {
        const hint = document.createElement("div");
        hint.className = "empty-hint";
        hint.textContent = "No deep rhythms exist for this combination. Try a different onset or pulse count.";
        $resultsList.appendChild(hint);
        $rhythmPanel.style.display = "none";
        return;
    }

    deep.forEach((entry) => $resultsList.appendChild(makeCard(entry, false)));
    if (regular) $resultsList.appendChild(makeCard(regular, true));

    // Auto-select the first deep rhythm (or the regular one if that's all there is).
    const first = deep[0] || regular;
    if (first) selectNecklace(n, first.onsets, $resultsList.children[0]);
}

function selectNecklace(n, onsets, cardEl) {
    currentN = n;
    currentNecklace = onsets.slice();
    anchorIndex = 0;

    Array.from($resultsList.children).forEach((c) => c.classList.remove("selected"));
    if (cardEl) cardEl.classList.add("selected");
    else {
        // find matching card by onsets identity fallback: re-render highlight via label match not critical
    }

    buildAnchorButtons();
    applyAnchor(0);
    $rhythmPanel.style.display = "block";
}

function buildAnchorButtons() {
    $anchorRow.innerHTML = "";
    currentNecklace.forEach((onset, i) => {
        const btn = document.createElement("button");
        btn.className = "ghost" + (i === 0 ? " selected" : "");
        btn.textContent = "Pulse " + onset;
        btn.addEventListener("click", () => {
            anchorIndex = i;
            Array.from($anchorRow.children).forEach((b) => b.classList.remove("selected"));
            btn.classList.add("selected");
            applyAnchor(i);
        });
        $anchorRow.appendChild(btn);
    });
}

function applyAnchor(i) {
    const rotated = anchorAt(currentNecklace, currentN, i);
    pattern = toPattern(rotated, currentN);
    drawWheel();
}

// ---------- Circular diagram ----------
let playheadStep = -1;

function drawWheel() {
    const n = currentN;
    const size = 400, cx = 200, cy = 200, r = 150, dotR = 9;
    const ns = "http://www.w3.org/2000/svg";
    $wheel.innerHTML = "";
    $wheel.setAttribute("viewBox", `0 0 ${size} ${size}`);

    const angleFor = (i) => (i / n) * Math.PI * 2 - Math.PI / 2;
    const pointFor = (i, radius) => {
        const a = angleFor(i);
        return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
    };

    const group = document.createElementNS(ns, "g");

    // base circle
    const base = document.createElementNS(ns, "circle");
    base.setAttribute("cx", cx); base.setAttribute("cy", cy); base.setAttribute("r", r);
    base.setAttribute("fill", "none");
    base.setAttribute("stroke", "#33383e");
    base.setAttribute("stroke-width", "1.5");
    group.appendChild(base);

    // chords between onsets
    const onsetIdx = pattern.reduce((acc, v, i) => { if (v) acc.push(i); return acc; }, []);
    for (let a = 0; a < onsetIdx.length; a++) {
        for (let b = a + 1; b < onsetIdx.length; b++) {
            const [x1, y1] = pointFor(onsetIdx[a], r);
            const [x2, y2] = pointFor(onsetIdx[b], r);
            const line = document.createElementNS(ns, "line");
            line.setAttribute("x1", x1); line.setAttribute("y1", y1);
            line.setAttribute("x2", x2); line.setAttribute("y2", y2);
            line.setAttribute("stroke", "#6fb3a8");
            line.setAttribute("stroke-opacity", "0.35");
            line.setAttribute("stroke-width", "1.3");
            group.appendChild(line);
        }
    }

    // pulse dots
    for (let i = 0; i < n; i++) {
        const [x, y] = pointFor(i, r);
        const isOnset = pattern[i] === 1;
        const dot = document.createElementNS(ns, "circle");
        dot.setAttribute("cx", x); dot.setAttribute("cy", y);
        dot.setAttribute("r", isOnset ? dotR : 4);
        dot.setAttribute("fill", isOnset ? "#e0a458" : "#2b2f34");
        dot.setAttribute("stroke", isOnset ? "#e0a458" : "#4a5058");
        dot.setAttribute("stroke-width", "1.5");
        dot.setAttribute("data-step", i);
        dot.setAttribute("id", "dot-" + i);
        group.appendChild(dot);

        if (i === 0) {
            const [tx, ty] = pointFor(i, r + 22);
            const label = document.createElementNS(ns, "text");
            label.setAttribute("x", tx); label.setAttribute("y", ty);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("fill", "#9aa1ab");
            label.setAttribute("font-size", "11");
            label.setAttribute("font-family", "ui-monospace, monospace");
            label.textContent = "0";
            group.appendChild(label);
        }
    }

    $wheel.appendChild(group);
    playheadStep = -1;
}

function setPlayheadVisual(step) {
    if (step === playheadStep) return;
    if (playheadStep >= 0) {
        const prev = document.getElementById("dot-" + playheadStep);
        if (prev) prev.setAttribute("r", pattern[playheadStep] ? "9" : "4");
    }
    if (step >= 0) {
        const cur = document.getElementById("dot-" + step);
        if (cur) cur.setAttribute("r", pattern[step] ? "13" : "7");
    }
    playheadStep = step;
}

// ---------- Scheduler (lookahead) ----------
let isPlaying = false;
let schedulerTimer = null;
let nextNoteTime = 0.0;
let schedulerStep = 0;
const scheduleAheadTime = 0.12;
const lookaheadMs = 25;
const scheduledSteps = []; // {step, time}

function secondsPerPulse() {
    const bpm = parseFloat($tempoSlider.value);
    return 60.0 / bpm;
}

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        const step = schedulerStep % pattern.length;
        if (pattern[step] === 1) triggerClick(nextNoteTime);
        scheduledSteps.push({ step, time: nextNoteTime });
        nextNoteTime += secondsPerPulse();
        schedulerStep++;
    }
    // trim old entries
    while (scheduledSteps.length > 64) scheduledSteps.shift();
}

function animatePlayhead() {
    if (!isPlaying) return;
    const now = audioContext.currentTime;
    let active = -1;
    for (const s of scheduledSteps) {
        if (s.time <= now) active = s.step;
    }
    setPlayheadVisual(active);
    requestAnimationFrame(animatePlayhead);
}

function startPlayback() {
    if (!pattern.length) return;
    isPlaying = true;
    schedulerStep = 0;
    nextNoteTime = audioContext.currentTime + 0.05;
    scheduledSteps.length = 0;
    schedulerTimer = setInterval(scheduler, lookaheadMs);
    requestAnimationFrame(animatePlayhead);
    $playBtn.textContent = "■ Stop";
}

function stopPlayback() {
    isPlaying = false;
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
    setPlayheadVisual(-1);
    $playBtn.textContent = "▶ Play";
}

$playBtn.addEventListener("click", async () => {
    const { requestPermissions } = await import("./create-node.js");
    await requestPermissions();
    if (audioContext.state !== "running") await audioContext.resume();

    if (isPlaying) stopPlayback();
    else startPlayback();
});

$tempoSlider.addEventListener("input", () => {
    $tempoVal.textContent = $tempoSlider.value + " bpm";
});

// ---------- Wire up generator controls ----------
$generateBtn.addEventListener("click", () => {
    const k = Math.max(2, Math.min(12, parseInt($onsetsInput.value, 10) || 3));
    const n = Math.max(3, Math.min(24, parseInt($pulsesInput.value, 10) || 12));
    $onsetsInput.value = k;
    $pulsesInput.value = n;
    if (k >= n) {
        $resultsNote.textContent = "Onsets must be fewer than pulses.";
        $resultsList.innerHTML = "";
        $rhythmPanel.style.display = "none";
        return;
    }
    renderResults(n, k);
});

// Initial example: the four classic deep rhythms with 3 onsets on 12 pulses.
renderResults(12, 3);
