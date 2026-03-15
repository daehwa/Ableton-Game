import { aftertouchToModwheel } from "./aftertouch_to_modwheel.mjs";
import { handleMoveKnobs } from "./move_virtual_knobs.mjs";
import { clamp } from "./math_helpers.mjs";

/*
Notes: 
Sequencer 16 - 31
Grid 68-99 (Bottom left to top right)
Sequencer steps: 16-31
Track selectors 40-43

CCs:
UI items below sequencer steps: 16-31
Shift 49
Menu 50
Capture 52
Down 54
Up 55
Undo 56
Loop 58
Copy 60
Left 62
Right 63
Knob Indicators 71-78
Play 85
Rec 86
Mute 88
Record (audio) 118
Delete 119
*/

globalThis.onMidiMessageExternal = function (data) {
    console.log(`onMidiMessageExternal ${data[0].toString(16)} ${data[1].toString(16)} ${data[2].toString(16)}`);

    move_midi_internal_send([0 << 4 | (data[0] / 16), data[0], data[1], data[2]]);
}

let jogwheelValue = 0;

// 4ths-in-key layout: columns = scale steps, rows = diatonic 4th (3 scale steps)
let rootMidi = 48; // C3
const SCALE = [0, 2, 4, 5, 7, 9, 11]; // C major

// Map pad note (68-99) to MIDI note in diatonic 4ths layout
function padToMidi(pad) {
    if (pad < 68 || pad > 99) return pad;
    const idx = pad - 68;
    const row = Math.floor(idx / 8);
    const col = idx % 8;
    const degree = col + row * 3; // each row = diatonic 4th = 3 scale steps
    const octave = Math.floor(degree / 7);
    const note = SCALE[degree % 7];
    return rootMidi + octave * 12 + note;
}

let noteDown = new Set();

globalThis.onMidiMessageInternal = function (data) {
    console.log(`onMidiMessageInternal ${data[0].toString(16)} ${data[1].toString(16)} ${data[2].toString(16)}`);

    let isNote = (data[0] & 0xF0) === 0x80 || (data[0] & 0xF0) === 0x90;

    let ignoreCapacitiveTouch = isNote && data[1] < 10;

    if (ignoreCapacitiveTouch) {
        return;
    }

    if (handleMoveKnobs(data)) {
        return;
    }

    if (aftertouchToModwheel(data)) {
        return;
    }

    move_midi_external_send([2 << 4 | (data[0] / 16), data[0], data[1], data[2]]);

    if (isNote) {
        let midiNote = padToMidi(data[1]);
        if ((data[0] & 0xF0) === 0x90) {
            console.log(`Adding pad ${data[1]} -> MIDI ${midiNote}`);
            noteDown.add(midiNote);
        }

        if ((data[0] & 0xF0) === 0x80) {
            console.log(`Deleting pad ${data[1]} -> MIDI ${midiNote}`);
            noteDown.delete(midiNote);
        }

        move_midi_internal_send([0 << 4 | (data[0] / 16), data[0], data[1], 23]);
        return;
    }

    let isCC = data[0] === 0xb0;
    if (isCC) {
        let ccNumber = data[1];
        let ccValue = data[2];

        // Up button (CC 55) = octave up
        if (ccNumber === 55 && ccValue === 127) {
            rootMidi += 12;
            if (rootMidi > 96) rootMidi = 96;
            noteDown.clear();
            console.log(`Octave up: root=${rootMidi}`);
            return;
        }
        // Down button (CC 54) = octave down
        if (ccNumber === 54 && ccValue === 127) {
            rootMidi -= 12;
            if (rootMidi < 24) rootMidi = 24;
            noteDown.clear();
            console.log(`Octave down: root=${rootMidi}`);
            return;
        }

        if (ccNumber === 14) {
            jogwheelValue += (ccValue === 1 ? 1 : -1);
            console.log(jogwheelValue);
        }

        let controlColor = 23;
        move_midi_internal_send([0 << 4 | (data[0] / 16), data[0], data[1], controlColor]);

    }
}

/*
        https://www.usb.org/sites/default/files/midi10.pdf

        0x5     1               Single-byte System Common Message or SysEx ends with following single byte.
        0x6     2               SysEx ends with following two bytes.
        0x7     3               SysEx ends with following three bytes.
*/

// Example: [F0 00 21 1D 01 01 05 F7] = trigger palette reapplication

// Example: [F0 00 21 1D 01 01 03 7D 00 00 00 00 7F 01 7E 00 F7] = set entry 125 to 0/0/255 and 126

// CC 16-31 icons
// 40-43 track selectors
// 71 - 78 knob LEDs

let displayWidth = 128;
let displayHeight = 64;
let positionX = displayWidth / 2;
let positionY = displayHeight / 2;
let speedX = 0.5;
let speedY = 0.3;
// let failCounter = 0;

let sampleRate = 44100;
let numSamples = 1 * sampleRate;
let sampleBuffer = new Int16Array(numSamples);

let outputFrame = 0;
function playNotes(notes) {
    for (let frame = 0; frame < 512 / 4; frame++) {
        let outputL = 0;
        let outputR = 0;

        for (let i = 0; i < notes.length; i++) {
            const frequency = 440 * Math.pow(2, (notes[i] - 69) / 12);
            const step = (2 * Math.PI * frequency) / sampleRate;
            outputL += Math.sin(outputFrame * step);
            outputR += Math.sin(outputFrame * step);
        }

        outputL = outputL / notes.length / 10;
        outputR = outputR / notes.length / 10;
        outputFrame++;

        set_int16(256 + frame * 4 + 0, outputL * 32767 & 0xFFFF);
        set_int16(256 + frame * 4 + 2, outputR * 32767 & 0xFFFF);
    }
}

function playSilence() {
    let audioInOffset = 2048 + 256;
    for (let frame = 0; frame < 512 / 4; frame++) {
        set_int16(256 + frame * 4 + 0, 0 * 32767 & 0xFFFF);
        set_int16(256 + frame * 4 + 2, 0 * 32767 & 0xFFFF);
    }
}

// globalThis.init = function () {
// }


globalThis.tick = function (deltaTime) {

    let notes = [...noteDown];
    
    let oct = Math.floor(rootMidi / 12) - 1;
    if (notes.length) {
        playNotes(notes);
        clear_screen();
        print(0, 0, "4ths in C maj  Oct:" + oct, 1);
        print(0, 18, "Notes:" + notes.join(","), 1);
        print(0, 36, "Up/Down = octave", 1);

    } else {
        playSilence();
        clear_screen();
        print(0, 0, "4ths in C maj  Oct:" + oct, 1);
        print(0, 18, "Press a key!", 1);
        print(0, 36, "Up/Down = octave", 1);

    }
}