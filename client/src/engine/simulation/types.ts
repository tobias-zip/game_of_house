import type {
    HouseGeometry,
    HouseNode,
    Polygon,
    SideBehaviorByCoverage,
    Transform,
} from "../../types";
import type { GrowTimingStats, SimulationTickProfile } from "./profiling";

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
    nextHouseId: number;
    worldState: SimulationWorldState;
    debugProfilingEnabled?: boolean;
};

export type RunSimulationTickResult = {
    houses: HouseNode[];
    nextHouseId: number;
    worldState: SimulationWorldState;
    profile?: SimulationTickProfile;
};

export type TryGrowFromHostResult = {
    growTiming: GrowTimingStats;
    candidateCount: number;
    candidateUniqueCount: number;
    indexQueryMs: number;
    indexUpdateMs: number;
    newHouse?: HouseWorldData;
};

// Houses and their cached world data; always replaced together.
export type SimulationWorld = {
    houses: HouseNode[];
    worldState: SimulationWorldState;
};
