/*
  Bad Habit — Arya Yildirim
  128 BPM

  Adjust drum patterns below to match the actual song.
  Each step = one 8th note. 8 steps = 1 bar at 4/4.

  step 0 = beat 1
  step 1 = beat 1 &
  step 2 = beat 2
  step 3 = beat 2 &
  step 4 = beat 3
  step 5 = beat 3 &
  step 6 = beat 4
  step 7 = beat 4 &
*/

const KICK  = 36;
const SNARE = 38;
const HIHAT = 42;
const CLAP  = 39;  // GM hand clap
const TOM_H = 50;
const TOM_L = 43;
const CRASH = 49;

export const song = {
    name: "Bad Habit",

    drumPatterns: [
        {
            name: "level 1",
            bpm: 94,
            steps: 8,
            events: [
                { step: 6, drum: HIHAT }, 
                
            ],
        },
        {
            name: "level 2",
            bpm: 94,
            steps: 8,
            events: [
                { step: 2, drum: HIHAT }, 
                { step: 6, drum: HIHAT }, 
            ],
        },
        {
            name: "level 3",
            bpm: 94,
            steps: 8,
            events: [
                { step: 0, drum: HIHAT }, 
                { step: 2, drum: HIHAT }, 
                { step: 4, drum: HIHAT }, 
                { step: 6, drum: HIHAT }, 
            ],
        },
        {
            name: "level 4",
            bpm: 94,
            steps: 8,
            events: [
                { step: 0, drum: HIHAT }, 
                { step: 2, drum: SNARE }, 
                { step: 4, drum: HIHAT }, 
                { step: 6, drum: SNARE }, 
            ],
        },
        {
            name: "level 5",
            bpm: 94,
            steps: 8,
            events: [
                { step: 0, drum: HIHAT }, 
                { step: 2, drum: SNARE }, 
                { step: 4, drum: HIHAT }, 
                { step: 6, drum: SNARE }, 
            ],
        },
        {
            name: "level 6",
            bpm: 94,
            steps: 8,
            events: [
                { step: 0, drum: HIHAT }, 
                { step: 1, drum: HIHAT }, 
                { step: 2, drum: SNARE }, 
                { step: 4, drum: HIHAT }, 
                { step: 5, drum: HIHAT }, 
                { step: 6, drum: SNARE }, 
            ],
        },
    ],

    practiceChords: [
        { rootPc: 9,  type: "Min" },  // Am
        { rootPc: 5,  type: "Maj" },  // F
        { rootPc: 0,  type: "Maj" },  // C
        { rootPc: 7,  type: "Maj" },  // G
    ],

    chordProgressions: [
        {
            name: "Bad Habit",
            chords: [
                { rootPc: 9, type: "Min", numeral: "vi" },
                { rootPc: 5, type: "Maj", numeral: "IV" },
                { rootPc: 0, type: "Maj", numeral: "I" },
                { rootPc: 7, type: "Maj", numeral: "V" },
            ],
        },
    ],
};
