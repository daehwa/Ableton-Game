/*
  Rock Song Pack
  - Drum patterns: basic rock beats with variations
  - Chords: diatonic triads in C major
  - Progressions: I-IV-V
*/

// GM drum note numbers
const KICK  = 36;
const SNARE = 38;
const HIHAT = 42;
const TOM_H = 50;
const TOM_M = 47;
const TOM_L = 43;
const CRASH = 49;

export const song = {
    name: "Rock",

    drumPatterns: [
        {
            name: "Kick-Snare",
            bpm: 90,
            steps: 8,
            events: [
                { step: 0, drum: KICK },
                { step: 2, drum: SNARE },
                { step: 4, drum: KICK },
                { step: 6, drum: SNARE },
            ],
        },
        {
            name: "Rock Beat",
            bpm: 100,
            steps: 8,
            events: [
                { step: 0, drum: KICK },  { step: 0, drum: HIHAT },
                { step: 1, drum: HIHAT },
                { step: 2, drum: SNARE }, { step: 2, drum: HIHAT },
                { step: 3, drum: HIHAT },
                { step: 4, drum: KICK },  { step: 4, drum: HIHAT },
                { step: 5, drum: HIHAT },
                { step: 6, drum: SNARE }, { step: 6, drum: HIHAT },
                { step: 7, drum: HIHAT },
            ],
        },
        {
            name: "Disco",
            bpm: 115,
            steps: 8,
            events: [
                { step: 0, drum: KICK },  { step: 0, drum: HIHAT },
                { step: 1, drum: HIHAT },
                { step: 2, drum: SNARE }, { step: 2, drum: HIHAT },
                { step: 3, drum: KICK },  { step: 3, drum: HIHAT },
                { step: 4, drum: KICK },  { step: 4, drum: HIHAT },
                { step: 5, drum: HIHAT },
                { step: 6, drum: SNARE }, { step: 6, drum: HIHAT },
                { step: 7, drum: HIHAT },
            ],
        },
        {
            name: "Tom Fill",
            bpm: 100,
            steps: 8,
            events: [
                { step: 0, drum: SNARE },
                { step: 1, drum: SNARE },
                { step: 2, drum: TOM_H },
                { step: 3, drum: TOM_H },
                { step: 4, drum: TOM_M },
                { step: 5, drum: TOM_M },
                { step: 6, drum: TOM_L },
                { step: 7, drum: KICK }, { step: 7, drum: CRASH },
            ],
        },
    ],

    practiceChords: [
        { rootPc: 0,  type: "Maj" },  // C
        { rootPc: 2,  type: "Min" },  // Dm
        { rootPc: 4,  type: "Min" },  // Em
        { rootPc: 5,  type: "Maj" },  // F
        { rootPc: 7,  type: "Maj" },  // G
        { rootPc: 9,  type: "Min" },  // Am
        { rootPc: 11, type: "Dim" },  // Bdim
    ],

    chordProgressions: [
        {
            name: "I-IV-V",
            chords: [
                { rootPc: 0, type: "Maj", numeral: "I" },
                { rootPc: 5, type: "Maj", numeral: "IV" },
                { rootPc: 7, type: "Maj", numeral: "V" },
            ],
        },
    ],
};
