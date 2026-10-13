import { isValidSeed } from "./engine/simulation/random";
import { decodeRules, encodeRules } from "./rules";
import { GROWTH_ORDER_OPTIONS, type GrowthOrder, type SideBehaviorByCoverage } from "./types";

// The setup a link reproduces: rules, house shape and the seed of the current world, so a
// fresh world grows the same way. Viewing preferences stay local.
export type SharedSetup = {
    rules: SideBehaviorByCoverage;
    undersideScale: number;
    sideScale: number;
    roofAngle: number;
    allowOverlap: boolean;
    growthOrder: GrowthOrder;
    seed: number;
};

const isGrowthOrder = (value: string | null): value is GrowthOrder =>
    GROWTH_ORDER_OPTIONS.includes(value as GrowthOrder);

const readNumber = (params: URLSearchParams, key: string, min: number, max: number) => {
    const value = Number(params.get(key));
    return params.has(key) && Number.isFinite(value) && value >= min && value <= max
        ? value
        : undefined;
};

// Ranges match the sidebar sliders.
export const parseSharedSetup = (hash: string): Partial<SharedSetup> => {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const rules = decodeRules(params.get("rules") ?? "");
    const growthOrder = params.get("order");
    const seed = Number(params.get("seed"));

    return {
        rules: rules ?? undefined,
        undersideScale: readNumber(params, "underside", 0.2, 1.8),
        sideScale: readNumber(params, "side", 0.2, 1),
        roofAngle: readNumber(params, "angle", 20, 160),
        allowOverlap: params.has("overlap") ? params.get("overlap") === "1" : undefined,
        growthOrder: isGrowthOrder(growthOrder) ? growthOrder : undefined,
        seed: params.has("seed") && isValidSeed(seed) ? seed : undefined,
    };
};

export const formatSharedSetup = (setup: SharedSetup) =>
    new URLSearchParams({
        rules: encodeRules(setup.rules),
        underside: setup.undersideScale.toFixed(2),
        side: setup.sideScale.toFixed(2),
        angle: String(Math.round(setup.roofAngle)),
        overlap: setup.allowOverlap ? "1" : "0",
        order: setup.growthOrder,
        seed: String(setup.seed),
    }).toString();
