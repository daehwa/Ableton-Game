import { clamp } from "./math_helpers.mjs";

/*
  Chord Trainer for Ableton Move — runs via Move Anything.

  Pads light up to show chord cue. Press the correct pads.
  Score and chord name shown on the Move display.

  Grid notes: 68-99 (bottom-left to top-right, 4 rows x 8 cols)
    Row 0 (bottom): 68-75
    Row 1:          76-83
    Row 2:          84-91
    Row 3 (top):    92-99

  Launch: ssh ableton@move.local
          cd /data/UserData/control_surface_move
          ./control_surface_move chord_trainer.js
*/

// ---------------------------------------------------------------------------
// Palette setup — custom colors for the game
// ---------------------------------------------------------------------------

const PAL_OFF      = 0;   // black/off
const PAL_CUE      = 1;   // teal — press this pad
const PAL_CORRECT  = 2;   // green — correct press
const PAL_WRONG    = 3;   // red — wrong press
const PAL_IDLE     = 4;   // dim grey — not part of chord

function setupPalette() {
    setPaletteEntry(PAL_OFF,     0,   0,   0,  0);
    setPaletteEntry(PAL_CUE,     0, 200, 180, 40);   // teal
    setPaletteEntry(PAL_CORRECT, 0, 255,  80, 20);    // green
    setPaletteEntry(PAL_WRONG, 255,  40,  40,  0);    // red
    setPaletteEntry(PAL_IDLE,   20,  20,  30, 10);    // dim
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
// Pad LED control
// ---------------------------------------------------------------------------

function setPadColor(note, paletteIndex) {
    move_midi_internal_send([0x00 << 4 | 0x9, 0x90, note, paletteIndex]);
}

function clearAllPads() {
    for (let n = 68; n <= 99; n++) {
        setPadColor(n, PAL_OFF);
    }
    // Also clear sequencer row and track selectors
    for (let n = 16; n <= 31; n++) {
        setPadColor(n, PAL_OFF);
    }
    for (let n = 40; n <= 43; n++) {
        setPadColor(n, PAL_OFF);
    }
}

// Clear buttons via CC
function clearButtons() {
    const buttons = [49, 50, 52, 54, 55, 56, 58, 60, 62, 63, 85, 86, 88, 118, 119];
    for (const cc of buttons) {
        move_midi_internal_send([0x00 << 4 | 0xB, 0xB0, cc, PAL_OFF]);
    }
    // Knob indicators
    for (let cc = 71; cc <= 78; cc++) {
        move_midi_internal_send([0x00 << 4 | 0xB, 0xB0, cc, PAL_OFF]);
    }
}

// ---------------------------------------------------------------------------
// Music theory
// ---------------------------------------------------------------------------

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiToName(midi) {
    const octave = Math.floor(midi / 12) - 1;
    return NOTE_NAMES[midi % 12] + octave;
}

// Chord intervals from root
const CHORD_TYPES = {
    "Maj":   [0, 4, 7],
    "Min":   [0, 3, 7],
    "Dim":   [0, 3, 6],
    "Aug":   [0, 4, 8],
    "Sus2":  [0, 2, 7],
    "Sus4":  [0, 5, 7],
    "Maj7":  [0, 4, 7, 11],
    "Min7":  [0, 3, 7, 10],
    "Dom7":  [0, 4, 7, 10],
};

const CHORD_TYPE_KEYS = Object.keys(CHORD_TYPES);

// Difficulty levels
const DIFFICULTY = {
    easy:   { types: ["Maj", "Min"], roots: [0, 2, 4, 5, 7, 9] },           // C D E F G A
    medium: { types: ["Maj", "Min", "Dim", "Sus2", "Dom7"], roots: [0,1,2,3,4,5,6,7,8,9,10,11] },
    hard:   { types: CHORD_TYPE_KEYS, roots: [0,1,2,3,4,5,6,7,8,9,10,11] },
};

// ---------------------------------------------------------------------------
// Pad layout — chromatic with 4ths (matches Move default)
// ---------------------------------------------------------------------------

const ROOT_MIDI = 48;  // C3
const ROW_INTERVAL = 5;  // perfect 4th
const COL_INTERVAL = 1;  // chromatic

// Build grid: gridNote[row][col] = MIDI note
const gridNote = [];
// Also: noteToGridPos[midiNote] = [{row, col}, ...]
const noteToGridPos = {};

for (let r = 0; r < 4; r++) {
    gridNote[r] = [];
    for (let c = 0; c < 8; c++) {
        const midi = ROOT_MIDI + r * ROW_INTERVAL + c * COL_INTERVAL;
        gridNote[r][c] = midi;
        if (!noteToGridPos[midi]) noteToGridPos[midi] = [];
        noteToGridPos[midi].push({ row: r, col: c });
    }
}

function gridPosToNote(row, col) {
    return 68 + row * 8 + col;
}

function noteNumberToGridPos(padNote) {
    // padNote 68-99 -> {row, col}
    if (padNote < 68 || padNote > 99) return null;
    const idx = padNote - 68;
    return { row: Math.floor(idx / 8), col: idx % 8 };
}

// Find best pad positions for a chord (tightest cluster)
function findChordPads(midiNotes) {
    const options = [];
    for (const n of midiNotes) {
        let positions = noteToGridPos[n];
        if (!positions || positions.length === 0) {
            // Try octave shift
            for (const shift of [-12, 12, -24, 24]) {
                positions = noteToGridPos[n + shift];
                if (positions && positions.length > 0) break;
            }
        }
        if (!positions || positions.length === 0) return null;
        options.push(positions);
    }

    // Brute-force best combo (small search space)
    let best = null;
    let bestScore = 99999;

    function search(depth, combo) {
        if (depth === options.length) {
            let score = 0;
            for (let i = 0; i < combo.length; i++) {
                for (let j = i + 1; j < combo.length; j++) {
                    score += Math.abs(combo[i].row - combo[j].row) +
                             Math.abs(combo[i].col - combo[j].col);
                }
            }
            if (score < bestScore) {
                bestScore = score;
                best = combo.slice();
            }
            return;
        }
        for (const pos of options[depth]) {
            combo.push(pos);
            search(depth + 1, combo);
            combo.pop();
        }
    }

    search(0, []);
    return best;
}

// ---------------------------------------------------------------------------
// Audio — sine wave synth through Move's speakers (based on move_audio.js)
// ---------------------------------------------------------------------------

const sampleRate = 44100;
const TWO_PI = 2 * Math.PI;
let soundingNotes = new Set();  // MIDI notes currently playing
let notePhases = {};            // MIDI note -> phase accumulator [0, TWO_PI)

function playAudioTick() {
    const notes = [...soundingNotes];
    const numNotes = notes.length;

    // Pre-compute frequency step for each note ONCE (not per-frame)
    const steps = new Array(numNotes);
    for (let i = 0; i < numNotes; i++) {
        const freq = 440 * Math.pow(2, (notes[i] - 69) / 12);
        steps[i] = (TWO_PI * freq) / sampleRate;
        if (notePhases[notes[i]] === undefined) {
            notePhases[notes[i]] = 0;
        }
    }

    for (let frame = 0; frame < 128; frame++) {
        let output = 0;

        for (let i = 0; i < numNotes; i++) {
            const n = notes[i];
            output += Math.sin(notePhases[n]);
            notePhases[n] += steps[i];
            if (notePhases[n] >= TWO_PI) {
                notePhases[n] -= TWO_PI;
            }
        }

        // Normalize by number of notes, then scale volume
        if (numNotes > 0) {
            output = output / numNotes / 10;
        }

        const sample = output * 32767;
        set_int16(256 + frame * 4 + 0, sample & 0xFFFF);
        set_int16(256 + frame * 4 + 2, sample & 0xFFFF);
    }
}

function playSilenceTick() {
    for (let frame = 0; frame < 128; frame++) {
        set_int16(256 + frame * 4 + 0, 0);
        set_int16(256 + frame * 4 + 2, 0);
    }
}

function startNote(midiNote) {
    soundingNotes.add(midiNote);
    notePhases[midiNote] = 0;  // start from zero phase for clean attack
}

function stopNote(midiNote) {
    soundingNotes.delete(midiNote);
    delete notePhases[midiNote];
}

function playChordSound(notes) {
    soundingNotes.clear();
    notePhases = {};
    for (const n of notes) {
        soundingNotes.add(n);
        notePhases[n] = 0;
    }
}

function stopAllSound() {
    soundingNotes.clear();
    notePhases = {};
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

let difficulty = "easy";
let score = 0;
let total = 0;
let streak = 0;
let bestStreak = 0;

let targetChordName = "";
let targetNotes = [];     // MIDI note numbers
let targetPadNotes = [];  // pad note numbers (68-99)
let targetPadSet = {};    // padNote -> true (for quick lookup)
let pressedPads = {};     // padNote -> true
let roundComplete = false;
let hasWrongPress = false;
let feedbackMsg = "";
let feedbackTimer = 0;
let animCounter = 0;
let pulsePhase = 0;

function nextChord() {
    const diff = DIFFICULTY[difficulty];
    let chordName, padPositions, notes;

    for (let attempt = 0; attempt < 100; attempt++) {
        const rootPc = diff.roots[Math.floor(Math.random() * diff.roots.length)];
        const type = diff.types[Math.floor(Math.random() * diff.types.length)];
        const rootMidi = ROOT_MIDI + rootPc; // octave 3
        const intervals = CHORD_TYPES[type];
        notes = intervals.map(i => rootMidi + i);
        padPositions = findChordPads(notes);

        if (padPositions) {
            chordName = NOTE_NAMES[rootPc] + " " + type;
            break;
        }
    }

    if (!padPositions) {
        // Fallback C Major
        notes = [48, 52, 55];
        padPositions = findChordPads(notes);
        chordName = "C Maj";
    }

    targetChordName = chordName;
    targetNotes = notes;
    targetPadNotes = padPositions.map(p => gridPosToNote(p.row, p.col));
    targetPadSet = {};
    for (const pn of targetPadNotes) targetPadSet[pn] = true;

    pressedPads = {};
    roundComplete = false;
    hasWrongPress = false;
    feedbackMsg = "";

    // Light up pads
    showChordOnPads();
    updateDisplay();
}

function showChordOnPads() {
    // Set all grid pads to idle
    for (let n = 68; n <= 99; n++) {
        setPadColor(n, PAL_IDLE);
    }
    // Highlight target pads
    for (const pn of targetPadNotes) {
        setPadColor(pn, PAL_CUE);
    }
}

function handlePadPress(padNote, velocity) {
    if (roundComplete) return;

    pressedPads[padNote] = true;

    // Play the note sound
    const pos = noteNumberToGridPos(padNote);
    if (pos) {
        const midiNote = gridNote[pos.row][pos.col];
        startNote(midiNote);
    }

    // Update LED
    if (targetPadSet[padNote]) {
        setPadColor(padNote, PAL_CORRECT);
    } else {
        setPadColor(padNote, PAL_WRONG);
        hasWrongPress = true;
    }

    // Check if all target pads are pressed
    let allPressed = true;
    for (const pn of targetPadNotes) {
        if (!pressedPads[pn]) {
            allPressed = false;
            break;
        }
    }

    if (allPressed) {
        completeRound();
    }
}

function handlePadRelease(padNote) {
    delete pressedPads[padNote];

    // Stop the note sound
    const pos = noteNumberToGridPos(padNote);
    if (pos) {
        const midiNote = gridNote[pos.row][pos.col];
        stopNote(midiNote);
    }

    if (!roundComplete) {
        // Restore cue color if it's a target pad
        if (targetPadSet[padNote]) {
            setPadColor(padNote, PAL_CUE);
        } else {
            setPadColor(padNote, PAL_IDLE);
        }
    }
}

function completeRound() {
    roundComplete = true;
    total++;

    if (!hasWrongPress) {
        score++;
        streak++;
        if (streak > bestStreak) bestStreak = streak;
        feedbackMsg = streak >= 3 ? "PERFECT!" : "CORRECT!";
    } else {
        streak = 0;
        feedbackMsg = "TRY AGAIN";
    }

    feedbackTimer = 60; // frames until auto-advance
    updateDisplay();

    // Play the full chord via external MIDI
    playChordSound(targetNotes);

    // Flash all target pads green
    for (const pn of targetPadNotes) {
        setPadColor(pn, PAL_CORRECT);
    }
}

// ---------------------------------------------------------------------------
// Display (128x64 monochrome)
// ---------------------------------------------------------------------------

function updateDisplay() {
    clear_screen();

    // print(x, y, string, color)  — color: 1=white, 0=black
    // Line 1: Chord name
    print(2, 2, targetChordName, 1);

    // Line 2: Note names
    const noteStr = targetNotes.map(n => midiToName(n)).join(" ");
    print(2, 16, noteStr, 1);

    // Line 3: Score
    print(2, 30, "Score:" + score + "/" + total + " Streak:" + streak, 1);

    // Line 4: Feedback or difficulty
    if (feedbackMsg) {
        print(2, 44, feedbackMsg, 1);
    } else {
        print(2, 44, "Diff:" + difficulty + " Best:" + bestStreak, 1);
    }

    // Line 5: Instructions
    if (roundComplete) {
        print(2, 56, "Press any pad for next", 1);
    } else {
        print(2, 56, "Press the lit pads!", 1);
    }
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

    // Ignore capacitive touch (notes < 10)
    if ((isNoteOn || isNoteOff) && note < 10) return;

    // Grid pad press (notes 68-99)
    if (isNoteOn && note >= 68 && note <= 99) {
        if (roundComplete) {
            // Any pad press advances to next chord
            nextChord();
            return;
        }
        handlePadPress(note, velocity);
        return;
    }

    if (isNoteOff && note >= 68 && note <= 99) {
        handlePadRelease(note);
        return;
    }

    // Button controls via CC
    if (isCC) {
        const cc = note;
        const val = velocity;
        if (val === 0) return; // ignore release

        if (cc === 54) {
            // Down button — decrease difficulty
            if (difficulty === "hard") difficulty = "medium";
            else if (difficulty === "medium") difficulty = "easy";
            nextChord();
        } else if (cc === 55) {
            // Up button — increase difficulty
            if (difficulty === "easy") difficulty = "medium";
            else if (difficulty === "medium") difficulty = "hard";
            nextChord();
        } else if (cc === 56) {
            // Undo button — reset score
            score = 0;
            total = 0;
            streak = 0;
            bestStreak = 0;
            feedbackMsg = "RESET";
            feedbackTimer = 30;
            updateDisplay();
        } else if (cc === 85) {
            // Play button — next chord
            nextChord();
        }
    }
};

globalThis.onMidiMessageExternal = function (data) {
    // Forward external MIDI to internal (for future use)
};

// ---------------------------------------------------------------------------
// Init and tick
// ---------------------------------------------------------------------------

globalThis.init = function () {
    console.log("Chord Trainer starting...");
    setupPalette();
    clearAllPads();
    clearButtons();

    // Light up control buttons
    move_midi_internal_send([0x00 << 4 | 0xB, 0xB0, 54, PAL_CUE]);  // Down
    move_midi_internal_send([0x00 << 4 | 0xB, 0xB0, 55, PAL_CUE]);  // Up
    move_midi_internal_send([0x00 << 4 | 0xB, 0xB0, 56, PAL_WRONG]); // Undo = reset
    move_midi_internal_send([0x00 << 4 | 0xB, 0xB0, 85, PAL_CORRECT]); // Play = next

    nextChord();
};

globalThis.tick = function (deltaTime) {
    // Audio — must run every tick
    if (soundingNotes.size > 0) {
        playAudioTick();
    } else {
        playSilenceTick();
    }

    // Auto-advance after round complete
    if (roundComplete && feedbackTimer > 0) {
        feedbackTimer--;
        if (feedbackTimer === 0) {
            stopAllSound();
            nextChord();
        }
    }

    // Pulse animation for cue pads
    if (!roundComplete) {
        pulsePhase += 0.15;
        if (Math.floor(pulsePhase * 2) % 20 === 0) {
            for (const pn of targetPadNotes) {
                if (!pressedPads[pn]) {
                    setPadColor(pn, PAL_CUE);
                }
            }
        }
    }
};
