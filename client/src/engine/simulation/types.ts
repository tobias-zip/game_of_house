import type {
    GrowthOrder,
    HouseGeometry,
    HouseNode,
    Polygon,
    SideBehaviorByCoverage,
    Transform,
} from "../../types";
import type { RandomSource } from "./random";

export type AABB = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

export type HouseWorldData = {
    transform: Transform;
    polygon: Polygon;
    bounds: AABB;
};

export type SpatialIndex = {
    cellSize: number;
    cells: Map<number, Set<number>>;
};

export type SimulationWorldState = {
    byHouseId: Map<number, HouseWorldData>;
    spatialIndex: SpatialIndex;
    // Houses whose growth candidates all overlapped existing houses. Placing houses never
    // frees a slot, so they stay blocked until a nearby house dies.
    blockedHouseIds: Set<number>;
};

export type RunSimulationTickInput = {
    houses: HouseNode[];
    sideBehaviorByCoverage: SideBehaviorByCoverage;
    houseGeometry: HouseGeometry;
    allowOverlap: boolean;
    growthOrder: GrowthOrder;
    nextHouseId: number;
    worldState: SimulationWorldState;
    random: RandomSource;
};

// Counts and timings of one tick, logged to the console when debug profiling is on.
export type SimulationTickProfile = {
    housesBefore: number;
    housesAfter: number;
    dieCount: number;
    growCandidates: number;
    growAttempts: number;
    growSuccesses: number;
    spatialIndexCells: number;
    classifyMs: number;
    cleanupMs: number;
    growMs: number;
    totalMs: number;
};

export type RunSimulationTickResult = {
    houses: HouseNode[];
    nextHouseId: number;
    worldState: SimulationWorldState;
    profile: SimulationTickProfile;
};

// Houses and their cached world data; always replaced together.
export type SimulationWorld = {
    houses: HouseNode[];
    worldState: SimulationWorldState;
};
