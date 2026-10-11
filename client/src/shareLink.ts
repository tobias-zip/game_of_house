import { decodeRules, encodeRules } from "./rules";
import type { SideBehaviorByCoverage } from "./types";

// The setup a link reproduces: rules and house shape. Viewing preferences stay local.
export type SharedSetup = {
    rules: SideBehaviorByCoverage;
    undersideScale: number;
    sideScale: number;
    roofAngle: number;
    allowOverlap: boolean;
};

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

    return {
        rules: rules ?? undefined,
        undersideScale: readNumber(params, "underside", 0.2, 1.8),
        sideScale: readNumber(params, "side", 0.2, 1),
        roofAngle: readNumber(params, "angle", 20, 160),
        allowOverlap: params.has("overlap") ? params.get("overlap") === "1" : undefined,
    };
};

export const formatSharedSetup = (setup: SharedSetup) =>
    new URLSearchParams({
        rules: encodeRules(setup.rules),
        underside: setup.undersideScale.toFixed(2),
        side: setup.sideScale.toFixed(2),
        angle: String(Math.round(setup.roofAngle)),
        overlap: setup.allowOverlap ? "1" : "0",
    }).toString();
