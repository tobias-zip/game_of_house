export type Point = {
    x: number;
    y: number;
};

export type SideKind = "down" | "side" | "roof";
export type SideIndex = 0 | 1 | 2 | 3 | 4;
export type CoveredSideCount = 0 | 1 | 2 | 3 | 4 | 5;
export type SideBehavior = "die" | "nothing" | "grow";
export type SideBehaviorByCoverage = Record<CoveredSideCount, SideBehavior>;
// What clicking a house does. Ripple, echo and lineage only light houses up; seed, remove
// and freeze change the world.
export type ClickAction = "ripple" | "echo" | "lineage" | "seed" | "remove" | "freeze";
// The order in which growing houses take their turn within a tick. Earlier houses get the
// first pick of free space.
export type GrowthOrder = "random" | "oldest";

export const COVERED_SIDE_COUNTS: CoveredSideCount[] = [0, 1, 2, 3, 4, 5];
export const SIDE_BEHAVIOR_OPTIONS: SideBehavior[] = ["die", "nothing", "grow"];
export const CLICK_ACTION_OPTIONS: ClickAction[] = [
    "ripple",
    "echo",
    "lineage",
    "seed",
    "remove",
    "freeze",
];
export const GROWTH_ORDER_OPTIONS: GrowthOrder[] = ["random", "oldest"];
export const DEFAULT_GROWTH_ORDER: GrowthOrder = "random";
export const DEFAULT_SIDE_BEHAVIOR_BY_COVERAGE: SideBehaviorByCoverage = {
    0: "die",
    1: "grow",
    2: "grow",
    3: "nothing",
    4: "die",
    5: "die",
};

export type HouseConnection = {
    houseId: number;
    side: SideIndex;
};

export type HouseNode = {
    id: number;
    sides: Array<HouseConnection | null>;
    parentId: number | null;
    parentSide: SideIndex | null;
    ownSide: SideIndex | null;
    rootTransform: Transform | null;
    // Frozen houses ignore the "die" rule; only the player can remove them.
    frozen: boolean;
};

export type Transform = {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
};

export type Segment = {
    start: Point;
    end: Point;
};

export type Polygon = Point[];
// The five corners of a house, starting at the left end of the underside.
export type HousePolygon = [Point, Point, Point, Point, Point];

export type HouseGeometry = {
    undersideLength: number;
    sideLength: number;
    roofHeight: number;
};

export type RippleParams = {
    speed: number;
    color: string;
    opacity: number;
    range: number;
    lifetime: number;
};
