// Returns a number in [0, 1), like Math.random.
export type RandomSource = () => number;

const SEED_RANGE = 2 ** 32;

export const createRandomSeed = () => Math.floor(Math.random() * SEED_RANGE);

export const isValidSeed = (value: number) =>
    Number.isInteger(value) && value >= 0 && value < SEED_RANGE;

// Mulberry32: a small, fast PRNG whose whole state is one 32-bit number, so a seed
// reproduces the same sequence.
export const createSeededRandom = (seed: number): RandomSource => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / SEED_RANGE;
    };
};

export const randomItem = <T>(items: T[], random: RandomSource) =>
    items[Math.floor(random() * items.length)];

export const shuffleInPlace = <T>(items: T[], random: RandomSource) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        const item = items[index];
        const swapItem = items[swapIndex];
        if (item === undefined || swapItem === undefined) continue;
        items[index] = swapItem;
        items[swapIndex] = item;
    }
};
