/*
  Pop Song Pack
  - Drum patterns: pop/dance beats
  - Chords: pop-friendly triads
  - Progressions: I-V-vi-IV (the "pop progression")
*/

const KICK  = 36;
const SNARE = 38;
const HIHAT = 42;
const TOM_H = 50;
const TOM_L = 43;
const CRASH = 49;

export const song = {
    name: "Pop",

    drumPatterns: [
        {
            name: "Four Floor",
            bpm: 120,
            steps: 8,
            events: [
                { step: 0, drum: KICK },  { step: 0, drum: HIHAT },
                { step: 1, drum: HIHAT },
                { step: 2, drum: KICK },  { step: 2, drum: SNARE }, { step: 2, drum: HIHAT },
                { step: 3, drum: HIHAT },
                { step: 4, drum: KICK },  { step: 4, drum: HIHAT },
                { step: 5, drum: HIHAT },
                { step: 6, drum: KICK },  { step: 6, drum: SNARE }, { step: 6, drum: HIHAT },
                { step: 7, drum: HIHAT },
            ],
        },
        {
            name: "Pop Groove",
            bpm: 108,
            steps: 8,
            events: [
                { step: 0, drum: KICK },  { step: 0, drum: HIHAT },
                { step: 1, drum: HIHAT },
                { step: 2, drum: SNARE }, { step: 2, drum: HIHAT },
                { step: 3, drum: KICK },  { step: 3, drum: HIHAT },
                { step: 4, drum: HIHAT },
                { step: 5, drum: KICK },  { step: 5, drum: HIHAT },
                { step: 6, drum: SNARE }, { step: 6, drum: HIHAT },
                { step: 7, drum: HIHAT },
            ],
        },
        {
            name: "Clap Beat",
            bpm: 110,
            steps: 8,
            events: [
                { step: 0, drum: KICK },
                { step: 1, drum: HIHAT },
                { step: 2, drum: SNARE },
                { step: 3, drum: HIHAT },
                { step: 4, drum: KICK },  { step: 4, drum: KICK },
                { step: 5, drum: HIHAT },
                { step: 6, drum: SNARE },
                { step: 7, drum: HIHAT },
            ],
        },
        {
            name: "Build Up",
            bpm: 125,
            steps: 8,
            events: [
                { step: 0, drum: KICK },
                { step: 1, drum: SNARE },
                { step: 2, drum: KICK },
                { step: 3, drum: SNARE },
                { step: 4, drum: TOM_H },
                { step: 5, drum: TOM_H },
                { step: 6, drum: TOM_L },
                { step: 7, drum: CRASH },
            ],
        },
    ],

    practiceChords: [
        { rootPc: 0,  type: "Maj" },  // C
        { rootPc: 5,  type: "Maj" },  // F
        { rootPc: 7,  type: "Maj" },  // G
        { rootPc: 9,  type: "Min" },  // Am
        { rootPc: 2,  type: "Min" },  // Dm
        { rootPc: 4,  type: "Min" },  // Em
    ],

    chordProgressions: [
        {
            name: "I-V-vi-IV",
            chords: [
                { rootPc: 0, type: "Maj", numeral: "I" },
                { rootPc: 7, type: "Maj", numeral: "V" },
                { rootPc: 9, type: "Min", numeral: "vi" },
                { rootPc: 5, type: "Maj", numeral: "IV" },
            ],
        },
        {
            name: "vi-IV-I-V",
            chords: [
                { rootPc: 9, type: "Min", numeral: "vi" },
                { rootPc: 5, type: "Maj", numeral: "IV" },
                { rootPc: 0, type: "Maj", numeral: "I" },
                { rootPc: 7, type: "Maj", numeral: "V" },
            ],
        },
    ],
};
