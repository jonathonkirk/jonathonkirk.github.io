// click.dsp — a small percussive "wood click" voice for triggering rhythm patterns.
// Fired from the host page once per active pulse via the "gate" button parameter.

import("stdfaust.lib");

declare name "Deep Rhythm Click";
declare author "Faust rhythm demo";

gate  = button("gate");
pitch = hslider("pitch[unit:Hz][style:knob]", 1400, 300, 4000, 1);
decay = hslider("decay[unit:s][style:knob]", 0.07, 0.01, 0.4, 0.001);
tone  = hslider("tone[style:knob]", 0.5, 0, 1, 0.01) : si.smoo;
level = hslider("level[unit:dB][style:knob]", -8, -36, 0, 0.1) : ba.db2linear : si.smoo;

env = en.ar(0.0005, decay, gate);

body  = no.noise : fi.resonbp(pitch, 10, 1);
snap  = no.noise : fi.highpass(2, 3500);

voice = (body * (1.0 - tone) + snap * tone) * env * env * level;

process = voice <: _, _;
