import { createContext, type Dispatch, type SetStateAction } from "react";
import type { SimulationWorld } from "../engine/simulation/types";
import type { Palette } from "../theme";
import type {
    ClickAction,
    CoveredSideCount,
    GrowthOrder,
    HouseGeometry,
    PulseKind,
    RippleParams,
    SideBehavior,
    SideBehaviorByCoverage,
} from "../types";

// Shown when the simulation paused itself because ticks got too slow.
export type OverloadNotice = {
    houseCount: number;
};

export type HouseCanvasContextValue = {
    world: SimulationWorld;
    isPlaying: boolean;
    debugProfilingEnabled: boolean;
    showConnectionSideIndicators: boolean;
    tickCount: number;
    simulationSpeed: number;
    sideBehaviorByCoverage: SideBehaviorByCoverage;
    undersideScale: number;
    sideScale: number;
    roofAngle: number;
    houseGeometry: HouseGeometry;
    allowOverlap: boolean;
    growthOrder: GrowthOrder;
    palette: Palette;
    // House fill per number of connected sides, 0–5, derived from the palette.
    coveredSidesPalette: string[];
    colorBySides: boolean;
    fillColor: string;
    strokeColor: string;
    clickAction: ClickAction;
    pulseParams: Record<PulseKind, RippleParams>;
    overload: OverloadNotice | null;
    setUndersideScale: Dispatch<SetStateAction<number>>;
    setSideScale: Dispatch<SetStateAction<number>>;
    setRoofAngle: Dispatch<SetStateAction<number>>;
    setAllowOverlap: Dispatch<SetStateAction<boolean>>;
    setGrowthOrder: Dispatch<SetStateAction<GrowthOrder>>;
    setPaletteColor: (key: keyof Palette, color: string) => void;
    setColorBySides: Dispatch<SetStateAction<boolean>>;
    setFillColor: Dispatch<SetStateAction<string>>;
    setStrokeColor: Dispatch<SetStateAction<string>>;
    setIsPlaying: Dispatch<SetStateAction<boolean>>;
    setDebugProfilingEnabled: Dispatch<SetStateAction<boolean>>;
    setShowConnectionSideIndicators: Dispatch<SetStateAction<boolean>>;
    setSimulationSpeed: Dispatch<SetStateAction<number>>;
    setSideBehavior: (coveredSides: CoveredSideCount, behavior: SideBehavior) => void;
    applyRules: (rules: SideBehaviorByCoverage) => void;
    setClickAction: Dispatch<SetStateAction<ClickAction>>;
    setPulseParam: (kind: PulseKind, key: keyof RippleParams, value: number) => void;
    stepSimulation: () => void;
    addHouse: () => void;
    // Click actions on a house.
    seedHouse: (hostHouseId: number) => void;
    removeHouse: (houseId: number) => void;
    toggleFrozen: (houseId: number) => void;
    resetWorld: () => void;
    keepGoingAfterOverload: () => void;
};

export const HouseCanvasContext = createContext<HouseCanvasContextValue | null>(null);
