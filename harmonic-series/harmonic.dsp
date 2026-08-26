import("stdfaust.lib");

declare name "Harmonic Series Explorer";
declare author "Your Name";

// ---- Fundamental frequency ----
fundamental = hslider("[0] Fundamental [unit:Hz] [style:knob]", 220, 55, 880, 1) : si.smoo;

// ---- Per-harmonic amplitude sliders (0 = silent, 1 = full) ----
// Defaults follow 1/n, the natural harmonic amplitude decay of a sawtooth wave.
lvl1 = hslider("[1] H1 level (fundamental)", 1.00, 0, 1, 0.01) : si.smoo;
lvl2 = hslider("[2] H2 level", 0.50, 0, 1, 0.01) : si.smoo;
lvl3 = hslider("[3] H3 level", 0.33, 0, 1, 0.01) : si.smoo;
lvl4 = hslider("[4] H4 level", 0.25, 0, 1, 0.01) : si.smoo;
lvl5 = hslider("[5] H5 level", 0.20, 0, 1, 0.01) : si.smoo;
lvl6 = hslider("[6] H6 level", 0.16, 0, 1, 0.01) : si.smoo;
lvl7 = hslider("[7] H7 level", 0.14, 0, 1, 0.01) : si.smoo;
lvl8 = hslider("[8] H8 level", 0.12, 0, 1, 0.01) : si.smoo;

// ---- Harmonic frequencies: integer multiples of the fundamental ----
// Each is also displayed live as a read-only number in the UI.
f1 = fundamental*1 : hbargraph("[9]  H1 freq [unit:Hz]",  0, 2000);
f2 = fundamental*2 : hbargraph("[10] H2 freq [unit:Hz]",  0, 2000);
f3 = fundamental*3 : hbargraph("[11] H3 freq [unit:Hz]",  0, 2000);
f4 = fundamental*4 : hbargraph("[12] H4 freq [unit:Hz]",  0, 2000);
f5 = fundamental*5 : hbargraph("[13] H5 freq [unit:Hz]",  0, 2000);
f6 = fundamental*6 : hbargraph("[14] H6 freq [unit:Hz]",  0, 2000);
f7 = fundamental*7 : hbargraph("[15] H7 freq [unit:Hz]",  0, 2000);
f8 = fundamental*8 : hbargraph("[16] H8 freq [unit:Hz]",  0, 2000);

// ---- 8 sine oscillators, each at its own harmonic frequency and level ----
osc1 = os.osc(f1) * lvl1;
osc2 = os.osc(f2) * lvl2;
osc3 = os.osc(f3) * lvl3;
osc4 = os.osc(f4) * lvl4;
osc5 = os.osc(f5) * lvl5;
osc6 = os.osc(f6) * lvl6;
osc7 = os.osc(f7) * lvl7;
osc8 = os.osc(f8) * lvl8;

// ---- Sum and scale down by 8 so it can never clip, however the sliders are set ----
mix = (osc1 + osc2 + osc3 + osc4 + osc5 + osc6 + osc7 + osc8) / 8;

process = mix <: _,_;
