import("stdfaust.lib");

//------------------------------------------------------------------
// Frequency table
// Row r (0..9):  base = 48 + 50*r   -> 48, 98, 148, 198, 248, 298, 348, 398, 448, 498
// Column c (0..9): each pair of columns (0&1, 2&3, 4&5, 6&7, 8&9) adds
// floor(c/2) Hz on top of the row base -> 0,0,1,1,2,2,3,3,4,4
//------------------------------------------------------------------
freqOf(r, c) = 48 + 50 * r + c / 2;

//------------------------------------------------------------------
// Envelope: 20 ms attack, then an autonomous ~9.98 s release, so the
// total ring time is about 10 seconds regardless of how long the
// button is actually held -- like tapping a real chime/bell.
//------------------------------------------------------------------
attackTime = 0.02;
releaseTime = 9.98;

voice(r, c) = button("b%{r}_%{c}") : en.ar(attackTime, releaseTime) : *(os.osc(freqOf(r, c)));

grid = vgroup("Chime Matrix (10 x 10)",
         par(r, 10, hgroup("row %{r}", par(c, 10, voice(r, c))))
       );

masterGain = hslider("master gain", 0.15, 0, 1, 0.01) : si.smoo;

process = (grid :> _) * masterGain : ma.tanh;
