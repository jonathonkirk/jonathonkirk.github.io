// sine.dsp
// A minimal Faust program: one sine-wave oscillator with a
// frequency slider that sweeps from 20 Hz to 10,000 Hz (10 kHz).
//
// This file is the "pure" Faust source, kept here for reference and
// for use in the Faust Web IDE (https://faustide.grame.fr) if you
// want to edit/experiment with it directly. The actual web page
// (index.html) embeds this same code and compiles it live in the
// browser, so you do NOT need to install the Faust compiler to use
// index.html — this .dsp file is just documentation/backup.

import("stdfaust.lib");

// Frequency slider: label, default, min, max, step
freq = hslider("freq [unit:Hz]", 440, 20, 10000, 0.01) : si.smoo;

// Gain slider so students can control volume without touching OS volume
gain = hslider("gain", 0.3, 0, 1, 0.01) : si.smoo;

process = os.osc(freq) * gain;
