/*
  Blues Song Pack
  - Drum patterns: shuffle/swing feels
  - Chords: dominant 7th chords
  - Progressions: 12-bar blues (I-IV-V with Dom7)
*/

const KICK  = 36;
const SNARE = 38;
const HIHAT = 42;
const RIDE  = 51;
const CRASH = 49;

export const song = {
    name: "Blues",

    drumPatterns: [
        {
            name: "Shuffle",
            bpm: 85,
            steps: 8,
            events: [
                { step: 0, drum: KICK },  { step: 0, drum: RIDE },
                { step: 1, drum: RIDE },
                { step: 2, drum: SNARE }, { step: 2, drum: RIDE },
                { step: 3, drum: RIDE },
                { step: 4, drum: KICK },  { step: 4, drum: RIDE },
                { step: 5, drum: KICK },  { step: 5, drum: RIDE },
                { step: 6, drum: SNARE }, { step: 6, drum: RIDE },
                { step: 7, drum: RIDE },
            ],
        },
        {
            name: "Slow Blues",
            bpm: 70,
            steps: 8,
            events: [
                { step: 0, drum: KICK },  { step: 0, drum: HIHAT },
                { step: 2, drum: SNARE }, { step: 2, drum: HIHAT },
                { step: 4, drum: KICK },  { step: 4, drum: HIHAT },
                { step: 6, drum: SNARE }, { step: 6, drum: HIHAT },
            ],
        },
        {
            name: "Swing Ride",
            bpm: 130,
            steps: 8,
            events: [
                { step: 0, drum: KICK },  { step: 0, drum: RIDE },
                { step: 1, drum: RIDE },
                { step: 2, drum: RIDE },
                { step: 3, drum: RIDE },
                { step: 4, drum: SNARE }, { step: 4, drum: RIDE },
                { step: 5, drum: RIDE },
                { step: 6, drum: RIDE },
                { step: 7, drum: RIDE },
            ],
        },
        {
            name: "Turnaround",
            bpm: 90,
            steps: 8,
            events: [
                { step: 0, drum: CRASH }, { step: 0, drum: KICK },
                { step: 2, drum: SNARE },
                { step: 3, drum: KICK },
                { step: 4, drum: SNARE }, { step: 4, drum: HIHAT },
                { step: 5, drum: KICK },
                { step: 6, drum: SNARE }, { step: 6, drum: HIHAT },
                { step: 7, drum: KICK },
            ],
        },
    ],

    practiceChords: [
        { rootPc: 0,  type: "Dom7" },  // C7
        { rootPc: 5,  type: "Dom7" },  // F7
        { rootPc: 7,  type: "Dom7" },  // G7
        { rootPc: 0,  type: "Maj" },   // C
        { rootPc: 5,  type: "Maj" },   // F
        { rootPc: 7,  type: "Maj" },   // G
        { rootPc: 9,  type: "Min7" },  // Am7
    ],

    chordProgressions: [
        {
            name: "12-Bar Blues",
            chords: [
                { rootPc: 0, type: "Dom7", numeral: "I7" },
                { rootPc: 0, type: "Dom7", numeral: "I7" },
                { rootPc: 0, type: "Dom7", numeral: "I7" },
                { rootPc: 0, type: "Dom7", numeral: "I7" },
                { rootPc: 5, type: "Dom7", numeral: "IV7" },
                { rootPc: 5, type: "Dom7", numeral: "IV7" },
                { rootPc: 0, type: "Dom7", numeral: "I7" },
                { rootPc: 0, type: "Dom7", numeral: "I7" },
                { rootPc: 7, type: "Dom7", numeral: "V7" },
                { rootPc: 5, type: "Dom7", numeral: "IV7" },
                { rootPc: 0, type: "Dom7", numeral: "I7" },
                { rootPc: 7, type: "Dom7", numeral: "V7" },
            ],
        },
        {
            name: "Quick Change",
            chords: [
                { rootPc: 0, type: "Dom7", numeral: "I7" },
                { rootPc: 5, type: "Dom7", numeral: "IV7" },
                { rootPc: 0, type: "Dom7", numeral: "I7" },
                { rootPc: 7, type: "Dom7", numeral: "V7" },
            ],
        },
    ],
};
