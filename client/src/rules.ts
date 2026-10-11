import {
    COVERED_SIDE_COUNTS,
    SIDE_BEHAVIOR_OPTIONS,
    type SideBehavior,
    type SideBehaviorByCoverage,
} from "./types";

// Rule tables written as one letter per covered-side count 0–5: d(ie), n(othing), g(row).
const LETTER_BY_BEHAVIOR: Record<SideBehavior, string> = { die: "d", nothing: "n", grow: "g" };
const BEHAVIOR_BY_LETTER: Record<string, SideBehavior> = { d: "die", n: "nothing", g: "grow" };

export const encodeRules = (rules: SideBehaviorByCoverage) =>
    COVERED_SIDE_COUNTS.map((count) => LETTER_BY_BEHAVIOR[rules[count]]).join("");

export const decodeRules = (code: string): SideBehaviorByCoverage | null => {
    if (!/^[dng]{6}$/.test(code)) return null;
    const [r0, r1, r2, r3, r4, r5] = [...code].map((letter) => BEHAVIOR_BY_LETTER[letter]);
    return { 0: r0, 1: r1, 2: r2, 3: r3, 4: r4, 5: r5 };
};

export type RulePreset = {
    name: string;
    description: string;
    code: string;
};

// Picked from a sweep of all rule tables starting from one house with the default shape.
// Every preset grows a lone house (0 → grow), otherwise a fresh world does nothing.
export const RULE_PRESETS: RulePreset[] = [
    { name: "Slow bloom", description: "Grows steadily outwards.", code: "ggnggn" },
    { name: "Crystal", description: "Grows briefly, then freezes.", code: "ggngnn" },
    { name: "Lace", description: "Houses with 3 or 5 neighbours die.", code: "ggndgd" },
    { name: "Coral", description: "Fast growth with constant dying.", code: "ggdgdd" },
    { name: "Wildfire", description: "Every house grows.", code: "gggggg" },
];

export const DEFAULT_RULE_PRESET = RULE_PRESETS[0];

export const findPresetForRules = (rules: SideBehaviorByCoverage) =>
    RULE_PRESETS.find((preset) => preset.code === encodeRules(rules)) ?? null;

// A lone house must grow or a fresh world never changes, so only counts 1–5 are random.
export const createRandomRules = (): SideBehaviorByCoverage => {
    const randomBehavior = () =>
        SIDE_BEHAVIOR_OPTIONS[Math.floor(Math.random() * SIDE_BEHAVIOR_OPTIONS.length)];
    return {
        0: "grow",
        1: randomBehavior(),
        2: randomBehavior(),
        3: randomBehavior(),
        4: randomBehavior(),
        5: randomBehavior(),
    };
};
