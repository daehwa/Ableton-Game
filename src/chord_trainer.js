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

function setupPalette() {
    setPaletteEntry(PAL_OFF,     0,   0,   0,  0);
    setPaletteEntry(PAL_CUE,     0, 200, 180, 40);
    setPaletteEntry(PAL_CORRECT, 0, 255,  80, 20);
    setPaletteEntry(PAL_WRONG, 255,  40,  40,  0);
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
// Pad layout — diatonic 4ths-in-key (C major)
// ---------------------------------------------------------------------------

let rootMidi = 48;  // C3
const SCALE = [0, 2, 4, 5, 7, 9, 11]; // C major

// Build grid: gridNote[row][col] = MIDI note
let gridNote = [];
// Also: noteToGridPos[midiNote] = [{row, col}, ...]
let noteToGridPos = {};

function buildGrid() {
    gridNote = [];
    noteToGridPos = {};
    for (let r = 0; r < 4; r++) {
        gridNote[r] = [];
        for (let c = 0; c < 8; c++) {
            const degree = c + r * 3; // each row = diatonic 4th = 3 scale steps
            const octave = Math.floor(degree / 7);
            const midi = rootMidi + octave * 12 + SCALE[degree % 7];
            gridNote[r][c] = midi;
            if (!noteToGridPos[midi]) noteToGridPos[midi] = [];
            noteToGridPos[midi].push({ row: r, col: c });
        }
    }
}

buildGrid();

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
    notePhases[midiNote] = 0;
    // Send note-on to Ableton via USB
    move_midi_external_send([0x09, 0x90, midiNote, 100]);
}

function stopNote(midiNote) {
    soundingNotes.delete(midiNote);
    delete notePhases[midiNote];
    // Send note-off to Ableton via USB
    move_midi_external_send([0x08, 0x80, midiNote, 0]);
}

function playChordSound(notes) {
    stopAllSound();
    for (const n of notes) {
        soundingNotes.add(n);
        notePhases[n] = 0;
        move_midi_external_send([0x09, 0x90, n, 100]);
    }
}

function stopAllSound() {
    // Send note-off for all sounding notes before clearing
    for (const n of soundingNotes) {
        move_midi_external_send([0x08, 0x80, n, 0]);
    }
    soundingNotes.clear();
    notePhases = {};
}

// ---------------------------------------------------------------------------
// Game state machine
// ---------------------------------------------------------------------------

// Phases
const PH_SPLASH   = 0;
const PH_SCREEN   = 1;  // timed transition screen
const PH_PRACTICE = 2;
const PH_QUIZ     = 3;

let phase = PH_SPLASH;
let phaseTimer = 0;
let screenText1 = "";
let screenText2 = "";
let afterScreenFn = null;  // function to call when screen timer expires

// Stage = inversion level: 0=root, 1=1st, 2=2nd
let stage = 0;

// Practice: diatonic triads in C major, C through B
const PRACTICE_CHORDS = [
    { rootPc: 0,  type: "Maj" },
    { rootPc: 2,  type: "Min" },
    { rootPc: 4,  type: "Min" },
    { rootPc: 5,  type: "Maj" },
    { rootPc: 7,  type: "Maj" },
    { rootPc: 9,  type: "Min" },
    { rootPc: 11, type: "Dim" },
];
let practiceIdx = 0;

// Quiz state
let quizScore = 0;
let hintPadNote = -1;

// Shared chord state
let targetChordName = "";
let targetNotes = [];
let targetPadNotes = [];
let targetPadSet = {};
let hitPads = {};      // pads correctly pressed (persist across release)
let roundComplete = false;
let hasWrongPress = false;
let feedbackTimer = 0;

// ---------------------------------------------------------------------------
// Chord builder with inversion
// ---------------------------------------------------------------------------

function makeChord(rootPc, type, inversion) {
    const intervals = CHORD_TYPES[type];
    const chordRoot = rootMidi + rootPc;
    let notes = intervals.map(function(i) { return chordRoot + i; });
    for (let i = 0; i < inversion; i++) {
        notes.push(notes.shift() + 12);
    }
    return notes;
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
    stopAllSound();
    clearAllPads();
    clear_screen();
    print(2, 16, line1, 1);
    if (line2) print(2, 36, line2, 1);
}

function startPractice() {
    phase = PH_PRACTICE;
    practiceIdx = 0;
    loadPracticeChord();
}

function startQuiz() {
    phase = PH_QUIZ;
    quizScore = 0;
    loadQuizChord();
}

function loadPracticeChord() {
    if (practiceIdx >= PRACTICE_CHORDS.length) {
        onPracticeDone();
        return;
    }
    const ch = PRACTICE_CHORDS[practiceIdx];
    const notes = makeChord(ch.rootPc, ch.type, stage);
    const padPositions = findChordPads(notes);

    if (!padPositions) {
        practiceIdx++;
        loadPracticeChord();
        return;
    }

    targetChordName = NOTE_NAMES[ch.rootPc] + " " + ch.type;
    targetNotes = notes;
    targetPadNotes = padPositions.map(function(p) { return gridPosToNote(p.row, p.col); });
    targetPadSet = {};
    for (const pn of targetPadNotes) targetPadSet[pn] = true;
    hitPads = {};
    roundComplete = false;
    hasWrongPress = false;
    feedbackTimer = 0;

    clearAllPads();
    for (const pn of targetPadNotes) setPadColor(pn, PAL_CUE);
    updatePracticeDisplay();
}

function loadQuizChord() {
    const ch = PRACTICE_CHORDS[Math.floor(Math.random() * PRACTICE_CHORDS.length)];
    const notes = makeChord(ch.rootPc, ch.type, stage);
    const padPositions = findChordPads(notes);

    if (!padPositions) {
        loadQuizChord();
        return;
    }

    targetChordName = NOTE_NAMES[ch.rootPc] + " " + ch.type;
    targetNotes = notes;
    targetPadNotes = padPositions.map(function(p) { return gridPosToNote(p.row, p.col); });
    targetPadSet = {};
    for (const pn of targetPadNotes) targetPadSet[pn] = true;
    hitPads = {};
    roundComplete = false;
    hasWrongPress = false;
    feedbackTimer = 0;

    // Light only ONE random hint pad
    clearAllPads();
    hintPadNote = targetPadNotes[Math.floor(Math.random() * targetPadNotes.length)];
    setPadColor(hintPadNote, PAL_CUE);
    updateQuizDisplay();
}

function onPracticeDone() {
    const labels = ["Chord", "1st Inv", "2nd Inv"];
    enterScreen("Quiz!", labels[stage], 700, startQuiz);
}

function onQuizDone() {
    stage++;
    if (stage > 2) {
        enterScreen("Complete!", "", 999999, null);
        return;
    }
    const labels = ["Chord", "1st Inv", "2nd Inv"];
    enterScreen("Practice!", labels[stage], 700, startPractice);
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function updatePracticeDisplay() {
    clear_screen();
    print(2, 16, "Practice!", 1);
    print(2, 36, targetChordName, 1);
}

function updateQuizDisplay() {
    clear_screen();
    print(2, 16, targetChordName, 1);
    print(2, 36, "" + quizScore + "/10", 1);
}

// ---------------------------------------------------------------------------
// Pad handlers
// ---------------------------------------------------------------------------

function handlePadPress(padNote, velocity) {
    if (roundComplete) return;

    const pos = noteNumberToGridPos(padNote);
    if (pos) startNote(gridNote[pos.row][pos.col]);

    if (targetPadSet[padNote]) {
        hitPads[padNote] = true;
        setPadColor(padNote, PAL_CORRECT);
    } else {
        setPadColor(padNote, PAL_WRONG);
        hasWrongPress = true;
    }

    // Check if all target pads have been hit
    let allHit = true;
    for (const pn of targetPadNotes) {
        if (!hitPads[pn]) { allHit = false; break; }
    }

    if (allHit) {
        roundComplete = true;

        if (phase === PH_QUIZ && !hasWrongPress) quizScore++;

        playChordSound(targetNotes);
        for (const pn of targetPadNotes) setPadColor(pn, PAL_CORRECT);
        feedbackTimer = 200;

        if (phase === PH_PRACTICE) updatePracticeDisplay();
        else updateQuizDisplay();
    }
}

function handlePadRelease(padNote) {
    const pos = noteNumberToGridPos(padNote);
    if (pos) stopNote(gridNote[pos.row][pos.col]);

    if (!roundComplete) {
        if (targetPadSet[padNote] && hitPads[padNote]) {
            // Already correctly hit — keep green
            setPadColor(padNote, PAL_CORRECT);
        } else if (targetPadSet[padNote]) {
            // Target pad not yet hit — restore cue (practice) or hint
            if (phase === PH_QUIZ && padNote !== hintPadNote) {
                setPadColor(padNote, PAL_OFF);
            } else {
                setPadColor(padNote, PAL_CUE);
            }
        } else {
            setPadColor(padNote, PAL_OFF);
        }
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

    if ((isNoteOn || isNoteOff) && note < 10) return;

    if (isNoteOn && note >= 68 && note <= 99) {
        if (phase === PH_PRACTICE || phase === PH_QUIZ) {
            handlePadPress(note, velocity);
        }
        return;
    }

    if (isNoteOff && note >= 68 && note <= 99) {
        if (phase === PH_PRACTICE || phase === PH_QUIZ) {
            handlePadRelease(note);
        }
        return;
    }

    if (isCC) {
        const cc = note;
        const val = velocity;
        if (val === 0) return;

        // Up/Down octave (during practice/quiz)
        if (cc === 55 && (phase === PH_PRACTICE || phase === PH_QUIZ)) {
            rootMidi += 12;
            if (rootMidi > 96) rootMidi = 96;
            stopAllSound();
            buildGrid();
            if (phase === PH_PRACTICE) loadPracticeChord();
            else loadQuizChord();
        } else if (cc === 54 && (phase === PH_PRACTICE || phase === PH_QUIZ)) {
            rootMidi -= 12;
            if (rootMidi < 24) rootMidi = 24;
            stopAllSound();
            buildGrid();
            if (phase === PH_PRACTICE) loadPracticeChord();
            else loadQuizChord();
        }
    }
};

globalThis.onMidiMessageExternal = function (data) {};

// ---------------------------------------------------------------------------
// Init and tick
// ---------------------------------------------------------------------------

globalThis.init = function () {
    console.log("Chord Trainer starting...");
    setupPalette();
    clearAllPads();
    clearButtons();

    phase = PH_SPLASH;
    phaseTimer = 520; // ~1.5 seconds
    clear_screen();
    print(2, 24, "Move Game!", 1);
};

globalThis.tick = function (deltaTime) {
    // Audio every tick
    if (soundingNotes.size > 0) {
        playAudioTick();
    } else {
        playSilenceTick();
    }

    // Splash timer — redraw every tick so palette init doesn't blank it
    if (phase === PH_SPLASH) {
        clear_screen();
        print(2, 24, "Move Game!", 1);
        phaseTimer--;
        if (phaseTimer <= 0) {
            stage = 0;
            startPractice();
        }
        return;
    }

    // Transition screen timer — redraw every tick
    if (phase === PH_SCREEN) {
        clear_screen();
        print(2, 16, screenText1, 1);
        if (screenText2) print(2, 36, screenText2, 1);
        phaseTimer--;
        if (phaseTimer <= 0 && afterScreenFn) {
            afterScreenFn();
        }
        return;
    }

    // Redraw display every tick
    if (phase === PH_PRACTICE) updatePracticeDisplay();
    else if (phase === PH_QUIZ) updateQuizDisplay();

    // Feedback timer after completing a chord
    if (roundComplete && feedbackTimer > 0) {
        feedbackTimer--;
        if (feedbackTimer === 0) {
            stopAllSound();

            if (phase === PH_PRACTICE) {
                practiceIdx++;
                loadPracticeChord();
            } else if (phase === PH_QUIZ) {
                if (quizScore >= 10) {
                    onQuizDone();
                } else {
                    loadQuizChord();
                }
            }
        }
    }
};
