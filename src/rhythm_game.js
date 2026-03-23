import { clamp } from "./math_helpers.mjs";
import { song } from "./song_rock.mjs";  // ← change to song_pop.mjs or song_blues.mjs

/*
  Rhythm Game for Ableton Move — runs via Move Anything.

  Drum pads light up in time with a beat pattern.
  Press the highlighted pads with correct timing to score points.
  Drum sounds come from Ableton Live via USB MIDI (channel 10).

  Grid notes: 68-99 (bottom-left to top-right, 4 rows x 8 cols)
    Row 0 (bottom): 68-75   — Kick zone
    Row 1:          76-83   — Low Tom / unused
    Row 2:          84-91   — Snare + Hi Tom
    Row 3 (top):    92-99   — Hi-Hat + Cymbals

  Launch: ssh ableton@move.local
          cd /data/UserData/control_surface_move
          ./control_surface_move rhythm_game.js
*/

// ---------------------------------------------------------------------------
// Palette setup — custom colors for the game
// ---------------------------------------------------------------------------

const PAL_OFF      = 0;
const PAL_KICK     = 1;   // red
const PAL_SNARE    = 2;   // green
const PAL_HIHAT    = 3;   // yellow
const PAL_TOM      = 4;   // blue
const PAL_CYMBAL   = 5;   // cyan
const PAL_PERFECT  = 6;   // bright white
const PAL_GOOD     = 7;   // green flash
const PAL_MISS     = 8;   // red flash
const PAL_IDLE     = 9;   // dim gray — zone indicator
const PAL_BEAT     = 10;  // sequencer beat marker

function setupPalette() {
    setPaletteEntry(PAL_OFF,      0,   0,   0,  0);
    setPaletteEntry(PAL_KICK,   255,  40,  40,  0);
    setPaletteEntry(PAL_SNARE,    0, 255,  80, 20);
    setPaletteEntry(PAL_HIHAT,  255, 220,   0,  0);
    setPaletteEntry(PAL_TOM,     40,  80, 255,  0);
    setPaletteEntry(PAL_CYMBAL,   0, 200, 200, 30);
    setPaletteEntry(PAL_PERFECT, 255, 255, 255, 80);
    setPaletteEntry(PAL_GOOD,     0, 200, 100, 20);
    setPaletteEntry(PAL_MISS,   200,   0,   0,  0);
    setPaletteEntry(PAL_IDLE,    30,  30,  30,  5);
    setPaletteEntry(PAL_BEAT,   200, 120,   0, 10);
    reapplyPalette();
}

// ---------------------------------------------------------------------------
// SysEx helpers (from move_palette.js)
// ---------------------------------------------------------------------------

const INTERNAL_CABLE = 0;

function sendSysexInternal(data) {
    let output = [];
    for (let i = 0; i < data.length; i += 3) {
        const remaining = data.length - i;
        let cin;
        let b1 = data[i], b2 = 0, b3 = 0;
        if (remaining >= 3) {
            b2 = data[i + 1];
            b3 = data[i + 2];
            cin = (remaining === 3) ? 0x7 : 0x4;
        } else if (remaining === 2) {
            b2 = data[i + 1];
            cin = 0x6;
        } else {
            cin = 0x5;
        }
        output.push((INTERNAL_CABLE << 4) | cin, b1, b2, b3);
    }
    move_midi_internal_send(output);
}

function setPaletteEntry(index, r, g, b, w) {
    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);
    w = clamp(w, 0, 255);
    index = clamp(index, 0, 127);
    sendSysexInternal([
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x03,
        index,
        r & 0x7F, r >> 7,
        g & 0x7F, g >> 7,
        b & 0x7F, b >> 7,
        w & 0x7F, w >> 7,
        0xF7
    ]);
}

function reapplyPalette() {
    sendSysexInternal([0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x05, 0xF7]);
}

// ---------------------------------------------------------------------------
// Pad / Button LED control
// ---------------------------------------------------------------------------

function setPadColor(note, paletteIndex) {
    move_midi_internal_send([0x09, 0x90, note, paletteIndex]);
}

function setButtonColor(cc, paletteIndex) {
    move_midi_internal_send([0x0B, 0xB0, cc, paletteIndex]);
}

function clearAllPads() {
    for (let n = 68; n <= 99; n++) setPadColor(n, PAL_OFF);
    for (let n = 16; n <= 31; n++) setPadColor(n, PAL_OFF);
}

function clearButtons() {
    const buttons = [49, 50, 52, 54, 55, 56, 58, 60, 62, 63, 85, 86, 88, 118, 119];
    for (const cc of buttons) setButtonColor(cc, PAL_OFF);
    for (let cc = 40; cc <= 43; cc++) setButtonColor(cc, PAL_OFF);
    for (let cc = 71; cc <= 78; cc++) setButtonColor(cc, PAL_OFF);
}

// ---------------------------------------------------------------------------
// Drum zone definitions
// ---------------------------------------------------------------------------

// GM drum notes
const GM_KICK  = 36;
const GM_SNARE = 38;
const GM_HIHAT = 42;
const GM_TOM_H = 50;  // high tom
const GM_TOM_M = 47;  // mid tom
const GM_TOM_L = 43;  // floor tom
const GM_CRASH = 49;
const GM_RIDE  = 51;

const DRUM_ZONES = {};
DRUM_ZONES[GM_KICK]  = { name: "Kick",   pads: [68, 69, 70, 71], pal: PAL_KICK };
DRUM_ZONES[GM_SNARE] = { name: "Snare",  pads: [84, 85, 86, 87], pal: PAL_SNARE };
DRUM_ZONES[GM_HIHAT] = { name: "HiHat",  pads: [96, 97, 98, 99], pal: PAL_HIHAT };
DRUM_ZONES[GM_TOM_H] = { name: "HiTom",  pads: [88, 89],         pal: PAL_TOM };
DRUM_ZONES[GM_TOM_M] = { name: "MidTom", pads: [90, 91],         pal: PAL_TOM };
DRUM_ZONES[GM_TOM_L] = { name: "FlrTom", pads: [82, 83],         pal: PAL_TOM };
DRUM_ZONES[GM_CRASH] = { name: "Crash",  pads: [92, 93],         pal: PAL_CYMBAL };
DRUM_ZONES[GM_RIDE]  = { name: "Ride",   pads: [94, 95],         pal: PAL_CYMBAL };

// Reverse map: pad note -> GM drum note
const PAD_TO_DRUM = {};
const DRUM_KEYS = [GM_KICK, GM_SNARE, GM_HIHAT, GM_TOM_H, GM_TOM_M, GM_TOM_L, GM_CRASH, GM_RIDE];
for (const dk of DRUM_KEYS) {
    for (const pad of DRUM_ZONES[dk].pads) {
        PAD_TO_DRUM[pad] = dk;
    }
}

// Pads not assigned to any drum (row 1 middle: 76-81)
// Left unlit / unused

// ---------------------------------------------------------------------------
// Timing constants
// ---------------------------------------------------------------------------

const TICKS_PER_SEC = 44100 / 128;  // ~344.53
const MS_TO_TICKS = TICKS_PER_SEC / 1000;

const PERFECT_TICKS = Math.round(35 * MS_TO_TICKS);   // ~12 ticks = ±35ms
const GOOD_TICKS    = Math.round(90 * MS_TO_TICKS);    // ~31 ticks = ±90ms
const CUE_LEAD_TICKS = Math.round(400 * MS_TO_TICKS);  // ~138 ticks = cue appears 400ms early
const FLASH_TICKS   = Math.round(150 * MS_TO_TICKS);   // ~52 ticks for feedback flash

// ---------------------------------------------------------------------------
// Beat patterns — loaded from song file
// ---------------------------------------------------------------------------

const PATTERNS = song.drumPatterns;
let patternIdx = 0;

// ---------------------------------------------------------------------------
// Audio passthrough — all sound from Ableton via USB
// ---------------------------------------------------------------------------

function audioPassthrough() {
    for (let frame = 0; frame < 128; frame++) {
        const inL = get_int16(2048 + 256 + frame * 4 + 0);
        const inR = get_int16(2048 + 256 + frame * 4 + 2);
        set_int16(256 + frame * 4 + 0, inL & 0xFFFF);
        set_int16(256 + frame * 4 + 2, inR & 0xFFFF);
    }
}

function audioSilence() {
    for (let frame = 0; frame < 128; frame++) {
        set_int16(256 + frame * 4 + 0, 0);
        set_int16(256 + frame * 4 + 2, 0);
    }
}

// ---------------------------------------------------------------------------
// Drum MIDI helpers — channel 10, cable 2
// ---------------------------------------------------------------------------

function drumNoteOn(note, vel) {
    move_midi_external_send([0x29, 0x99, note, vel || 100]);
}

function drumNoteOff(note) {
    move_midi_external_send([0x28, 0x89, note, 0]);
}

// ---------------------------------------------------------------------------
// Game state machine
// ---------------------------------------------------------------------------

const PH_SPLASH   = 0;
const PH_SCREEN   = 1;
const PH_FREE     = 2;  // free drum mode
const PH_PRACTICE = 3;  // pattern with teacher + cues, no scoring
const PH_PLAY     = 4;  // pattern with cues + scoring

const MODE_FREE     = 0;
const MODE_PRACTICE = 1;
const MODE_PLAY     = 2;
let gameMode = MODE_PRACTICE;

let phase = PH_SPLASH;
let phaseTimer = 0;
let screenText1 = "";
let screenText2 = "";
let afterScreenFn = null;

// Global tick counter
let globalTick = 0;

// Pattern playback
let ticksPerStep = 0;
let patternStartTick = 0;
let lastStep = -1;

// Pending events: { scheduledTick, drum, state: "pending"|"hit"|"missed" }
let pendingEvents = [];

// Scoring
let score = 0;
let combo = 0;
let maxCombo = 0;
let perfectCount = 0;
let goodCount = 0;
let missCount = 0;

// Feedback flash
let feedbackText = "";
let feedbackTimer = 0;

// Pad flash timers: padNote -> { timer, restorePal }
let padFlashes = {};

// Pattern loop tracking
let loopCount = 0;
const PLAY_LOOPS = 4;  // play mode ends after 4 loops

// ---------------------------------------------------------------------------
// Track button LED management
// ---------------------------------------------------------------------------

function updateTrackLEDs() {
    for (let n = 40; n <= 43; n++) setButtonColor(n, PAL_OFF);
    if (gameMode === MODE_FREE) setButtonColor(42, PAL_HIHAT);
    else if (gameMode === MODE_PRACTICE) setButtonColor(40, PAL_SNARE);
    else if (gameMode === MODE_PLAY) setButtonColor(41, PAL_KICK);
}

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

function enterScreen(line1, line2, ticks, nextFn) {
    phase = PH_SCREEN;
    screenText1 = line1;
    screenText2 = line2;
    afterScreenFn = nextFn;
    phaseTimer = ticks;
    clearAllPads();
    updateTrackLEDs();
    clear_screen();
    print(2, 16, line1, 1);
    if (line2) print(2, 36, line2, 1);
}

function computeTicksPerStep(bpm) {
    // 8th note duration in ticks: 1 beat = bpm/60 per sec, 8th = half beat
    return Math.round(TICKS_PER_SEC / (bpm * 2 / 60));
}

function startFreeDrum() {
    phase = PH_FREE;
    clearAllPads();
    updateTrackLEDs();
    // Light all drum zone pads with idle colors
    for (const dk of DRUM_KEYS) {
        const zone = DRUM_ZONES[dk];
        for (const pad of zone.pads) setPadColor(pad, zone.pal);
    }
}

function startPractice() {
    phase = PH_PRACTICE;
    const pat = PATTERNS[patternIdx];
    // Slow down to 75% for practice
    ticksPerStep = computeTicksPerStep(Math.round(pat.bpm * 0.75));
    patternStartTick = globalTick;
    lastStep = -1;
    loopCount = 0;
    pendingEvents = [];
    score = 0; combo = 0; maxCombo = 0;
    perfectCount = 0; goodCount = 0; missCount = 0;
    feedbackText = ""; feedbackTimer = 0;
    padFlashes = {};

    clearAllPads();
    updateTrackLEDs();
    cuedPadState = {};
    seqState = {};
    // Show zone layout dimly
    for (const dk of DRUM_KEYS) {
        const zone = DRUM_ZONES[dk];
        for (const pad of zone.pads) setPadColor(pad, PAL_IDLE);
    }
}

function startPlay() {
    phase = PH_PLAY;
    const pat = PATTERNS[patternIdx];
    ticksPerStep = computeTicksPerStep(pat.bpm);
    patternStartTick = globalTick;
    lastStep = -1;
    loopCount = 0;
    pendingEvents = [];
    score = 0; combo = 0; maxCombo = 0;
    perfectCount = 0; goodCount = 0; missCount = 0;
    feedbackText = ""; feedbackTimer = 0;
    padFlashes = {};

    clearAllPads();
    updateTrackLEDs();
    cuedPadState = {};
    seqState = {};
}

function showResults() {
    phase = PH_SCREEN;
    phaseTimer = 999999;  // stays until button press
    afterScreenFn = null;
    clearAllPads();
    // Results drawn in tick
}

function switchMode(mode) {
    gameMode = mode;
    clearAllPads();
    clearButtons();
    updateTrackLEDs();

    if (mode === MODE_FREE) {
        enterScreen("Free Drum!", "", 400, startFreeDrum);
    } else if (mode === MODE_PRACTICE) {
        enterScreen("Practice!", PATTERNS[patternIdx].name, 500, startPractice);
    } else if (mode === MODE_PLAY) {
        enterScreen("Play!", PATTERNS[patternIdx].name, 500, startPlay);
    }
}

// ---------------------------------------------------------------------------
// Pattern engine — scheduling and teacher playback
// ---------------------------------------------------------------------------

// Track which pads/seq LEDs are already set to avoid redundant sends
let cuedPadState = {};   // padNote -> paletteIndex currently shown
let seqState = {};       // seqPad -> paletteIndex currently shown

function setPadIfChanged(pad, pal) {
    if (cuedPadState[pad] !== pal) {
        cuedPadState[pad] = pal;
        setPadColor(pad, pal);
    }
}

function setSeqIfChanged(pad, pal) {
    if (seqState[pad] !== pal) {
        seqState[pad] = pal;
        setPadColor(pad, pal);
    }
}

function tickPattern() {
    const pat = PATTERNS[patternIdx];
    const elapsed = globalTick - patternStartTick;
    const totalPatternTicks = pat.steps * ticksPerStep;
    const elapsedInPattern = elapsed % totalPatternTicks;
    const currentStep = Math.floor(elapsedInPattern / ticksPerStep);

    // Detect loop boundary
    const currentLoop = Math.floor(elapsed / totalPatternTicks);
    if (currentLoop > loopCount) {
        loopCount = currentLoop;
        if (phase === PH_PLAY && loopCount >= PLAY_LOOPS) {
            showResults();
            return;
        }
    }

    // Once per step change
    if (currentStep !== lastStep) {
        lastStep = currentStep;

        // Teacher beat in practice mode
        if (phase === PH_PRACTICE) {
            for (const ev of pat.events) {
                if (ev.step === currentStep) {
                    drumNoteOn(ev.drum, 80);
                }
            }
        }

        // Schedule pending events for upcoming steps (look ahead)
        const lookAheadSteps = Math.ceil(CUE_LEAD_TICKS / ticksPerStep) + 1;
        for (let s = 0; s <= lookAheadSteps; s++) {
            const futureStep = (currentStep + s) % pat.steps;
            const futureLoop = currentLoop + Math.floor((currentStep + s) / pat.steps);
            const scheduledTick = patternStartTick + futureLoop * totalPatternTicks + futureStep * ticksPerStep;

            for (const ev of pat.events) {
                if (ev.step !== futureStep) continue;
                let alreadyScheduled = false;
                for (const pe of pendingEvents) {
                    if (pe.scheduledTick === scheduledTick && pe.drum === ev.drum) {
                        alreadyScheduled = true;
                        break;
                    }
                }
                if (!alreadyScheduled) {
                    pendingEvents.push({
                        scheduledTick: scheduledTick,
                        drum: ev.drum,
                        state: "pending",
                        cued: false,
                    });
                }
            }
        }

        // Update sequencer row (only on step change)
        for (let s = 0; s < 8; s++) {
            const seqPad = 16 + s;
            if (s === currentStep) {
                setSeqIfChanged(seqPad, PAL_BEAT);
            } else {
                let hasEvent = false;
                for (const ev of pat.events) {
                    if (ev.step === s) { hasEvent = true; break; }
                }
                setSeqIfChanged(seqPad, hasEvent ? PAL_IDLE : PAL_OFF);
            }
        }
        for (let s = 8; s < 16; s++) setSeqIfChanged(16 + s, PAL_OFF);
    }

    // Light cue pads — only when first entering the cue window
    for (const pe of pendingEvents) {
        if (pe.state !== "pending" || pe.cued) continue;
        const ticksUntil = pe.scheduledTick - globalTick;
        if (ticksUntil <= CUE_LEAD_TICKS && ticksUntil >= -GOOD_TICKS) {
            pe.cued = true;
            const zone = DRUM_ZONES[pe.drum];
            if (zone) {
                for (const pad of zone.pads) {
                    if (!padFlashes[pad]) setPadIfChanged(pad, zone.pal);
                }
            }
        }
    }

    // Expire missed events
    for (let i = pendingEvents.length - 1; i >= 0; i--) {
        const pe = pendingEvents[i];
        if (pe.state === "pending" && (globalTick - pe.scheduledTick) > GOOD_TICKS) {
            pe.state = "missed";
            missCount++;
            combo = 0;
            if (phase === PH_PLAY) {
                feedbackText = "Miss";
                feedbackTimer = FLASH_TICKS;
            }
            const zone = DRUM_ZONES[pe.drum];
            if (zone) {
                for (const pad of zone.pads) {
                    setPadColor(pad, PAL_MISS);
                    cuedPadState[pad] = PAL_MISS;
                    padFlashes[pad] = { timer: FLASH_TICKS, restorePal: phase === PH_PRACTICE ? PAL_IDLE : PAL_OFF };
                }
            }
        }
        // Remove old events
        if (pe.state !== "pending" && (globalTick - pe.scheduledTick) > GOOD_TICKS * 3) {
            pendingEvents.splice(i, 1);
        }
    }
}

// ---------------------------------------------------------------------------
// Hit detection
// ---------------------------------------------------------------------------

function handleDrumPadPress(padNote, velocity) {
    const drumNote = PAD_TO_DRUM[padNote];
    if (drumNote === undefined) return;

    // Always send MIDI to Ableton so player hears the sound
    drumNoteOn(drumNote, velocity);

    // In free mode, just flash the pad
    if (phase === PH_FREE) {
        const zone = DRUM_ZONES[drumNote];
        if (zone) {
            for (const pad of zone.pads) {
                setPadColor(pad, PAL_PERFECT);
                padFlashes[pad] = { timer: FLASH_TICKS, restorePal: zone.pal };
            }
        }
        return;
    }

    // Find nearest pending event for this drum
    let bestIdx = -1;
    let bestDelta = 999999;
    for (let i = 0; i < pendingEvents.length; i++) {
        const pe = pendingEvents[i];
        if (pe.state !== "pending" || pe.drum !== drumNote) continue;
        const delta = Math.abs(globalTick - pe.scheduledTick);
        if (delta < bestDelta) {
            bestDelta = delta;
            bestIdx = i;
        }
    }

    if (bestIdx === -1 || bestDelta > GOOD_TICKS) {
        // No matching event — wrong drum or too early/late
        if (phase === PH_PLAY) {
            combo = 0;
        }
        return;
    }

    const pe = pendingEvents[bestIdx];
    pe.state = "hit";

    let flashPal;
    if (bestDelta <= PERFECT_TICKS) {
        perfectCount++;
        combo++;
        const mult = Math.min(Math.floor(combo / 10) + 1, 4);
        score += 100 * mult;
        feedbackText = "Perfect!";
        flashPal = PAL_PERFECT;
    } else {
        goodCount++;
        combo++;
        const mult = Math.min(Math.floor(combo / 10) + 1, 4);
        score += 50 * mult;
        feedbackText = "Good";
        flashPal = PAL_GOOD;
    }

    if (combo > maxCombo) maxCombo = combo;
    feedbackTimer = FLASH_TICKS;

    // Flash zone
    const zone = DRUM_ZONES[drumNote];
    if (zone) {
        for (const pad of zone.pads) {
            setPadColor(pad, flashPal);
            padFlashes[pad] = { timer: FLASH_TICKS, restorePal: phase === PH_PRACTICE ? PAL_IDLE : PAL_OFF };
        }
    }
}

function handleDrumPadRelease(padNote) {
    // Drums are one-shot — don't send note-off on pad release
    // This lets the sample ring out naturally in Ableton
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function updatePlayDisplay() {
    clear_screen();
    const pat = PATTERNS[patternIdx];
    const bpmShow = phase === PH_PRACTICE ? Math.round(pat.bpm * 0.75) : pat.bpm;
    print(2, 0, pat.name + " " + bpmShow, 1);
    print(2, 18, "Score:" + score + " x" + combo, 1);
    if (feedbackTimer > 0) {
        print(2, 38, feedbackText, 1);
    } else {
        const loopStr = phase === PH_PLAY ? "Loop " + (loopCount + 1) + "/" + PLAY_LOOPS : "Practice";
        print(2, 38, loopStr, 1);
    }
}

function updateFreeDisplay() {
    clear_screen();
    print(2, 10, "Free Drum!", 1);
    print(2, 30, "Press any pad", 1);
    print(2, 48, "Up/Down=pattern", 1);
}

function updateResultsDisplay() {
    clear_screen();
    print(2, 0, "Results!", 1);
    print(2, 16, "P:" + perfectCount + " G:" + goodCount + " M:" + missCount, 1);
    print(2, 32, "Combo:" + maxCombo, 1);
    print(2, 48, "Score:" + score, 1);
}

// ---------------------------------------------------------------------------
// Pad flash timer updates
// ---------------------------------------------------------------------------

function tickFlashes() {
    for (const padStr in padFlashes) {
        const pad = Number(padStr);
        const f = padFlashes[pad];
        f.timer--;
        if (f.timer <= 0) {
            setPadColor(pad, f.restorePal);
            cuedPadState[pad] = f.restorePal;
            delete padFlashes[pad];
        }
    }
    if (feedbackTimer > 0) feedbackTimer--;
}

// ---------------------------------------------------------------------------
// MIDI message handlers
// ---------------------------------------------------------------------------

globalThis.onMidiMessageInternal = function (data) {
    const status = data[0];
    const note = data[1];
    const velocity = data[2];

    const isNoteOn = status === 0x90 && velocity > 0;
    const isNoteOff = status === 0x80 || (status === 0x90 && velocity === 0);
    const isCC = status === 0xB0;

    // Filter capacitive touch
    if ((isNoteOn || isNoteOff) && note < 10) return;

    // Pad press
    if (isNoteOn && note >= 68 && note <= 99) {
        handleDrumPadPress(note, velocity);
        return;
    }

    // Pad release
    if (isNoteOff && note >= 68 && note <= 99) {
        handleDrumPadRelease(note);
        return;
    }

    if (isCC) {
        const cc = note;
        const val = velocity;
        if (val === 0) return;

        // Track buttons — mode switch
        if (cc === 40) { switchMode(MODE_PRACTICE); return; }
        if (cc === 41) { switchMode(MODE_PLAY); return; }
        if (cc === 42) { switchMode(MODE_FREE); return; }

        // Up/Down — switch pattern
        if (cc === 55) {
            patternIdx = (patternIdx + 1) % PATTERNS.length;
            switchMode(gameMode);
            return;
        }
        if (cc === 54) {
            patternIdx = (patternIdx + PATTERNS.length - 1) % PATTERNS.length;
            switchMode(gameMode);
            return;
        }

        // Play button — restart current mode
        if (cc === 85) {
            switchMode(gameMode);
            return;
        }
    }
};

globalThis.onMidiMessageExternal = function (data) {};

// ---------------------------------------------------------------------------
// Init and tick
// ---------------------------------------------------------------------------

globalThis.init = function () {
    console.log("Rhythm Game starting...");
    setupPalette();
    clearAllPads();
    clearButtons();
    updateTrackLEDs();

    phase = PH_SPLASH;
    phaseTimer = 520; // ~1.5 seconds
    clear_screen();
    print(2, 24, "Rhythm Game!", 1);
};

globalThis.tick = function (deltaTime) {
    globalTick++;

    // Audio passthrough every tick
    audioPassthrough();

    // Splash
    if (phase === PH_SPLASH) {
        clear_screen();
        print(2, 24, "Rhythm Game!", 1);
        phaseTimer--;
        if (phaseTimer <= 0) {
            switchMode(MODE_PRACTICE);
        }
        return;
    }

    // Transition screen
    if (phase === PH_SCREEN) {
        clear_screen();
        print(2, 16, screenText1, 1);
        if (screenText2) print(2, 36, screenText2, 1);

        // If showing results, draw results instead
        if (!afterScreenFn && phaseTimer === 999999) {
            updateResultsDisplay();
        }

        phaseTimer--;
        if (phaseTimer <= 0 && afterScreenFn) {
            afterScreenFn();
        }
        return;
    }

    // Free drum mode
    if (phase === PH_FREE) {
        updateFreeDisplay();
        tickFlashes();
        return;
    }

    // Practice / Play mode
    if (phase === PH_PRACTICE || phase === PH_PLAY) {
        tickPattern();
        tickFlashes();
        updatePlayDisplay();
        return;
    }
};
