import { describe, expect, it } from "vitest";
import { polygonsOverlapArea } from "../../domain/house/geometry";
import { connectNewHouse, createRootHouse, SIDE_KIND_BY_INDEX } from "../../domain/house/graph";
import type {
    GrowthOrder,
    HouseGeometry,
    HouseNode,
    SideBehaviorByCoverage,
    SideIndex,
} from "../../types";
import { createSeededRandom } from "./random";
import { runSimulationTick } from "./runTick";
import { buildWorldState } from "./worldState";

// The default shape: underside 1, walls 0.68, roof angle 80°.
const HOUSE_GEOMETRY: HouseGeometry = {
    undersideLength: 120,
    sideLength: 120 * 0.68,
    roofHeight: 60 / Math.tan((80 * Math.PI) / 360),
};

const rulesWith = (overrides: Partial<SideBehaviorByCoverage>): SideBehaviorByCoverage => ({
    0: "nothing",
    1: "nothing",
    2: "nothing",
    3: "nothing",
    4: "nothing",
    5: "nothing",
    ...overrides,
});

const WILDFIRE = rulesWith({ 0: "grow", 1: "grow", 2: "grow", 3: "grow", 4: "grow", 5: "grow" });
const CORAL = rulesWith({ 0: "grow", 1: "grow", 2: "die", 3: "grow", 4: "die", 5: "die" });

const runTicks = ({
    rules,
    tickCount,
    houses = [createRootHouse(0)],
    seed = 1,
    growthOrder = "random",
}: {
    rules: SideBehaviorByCoverage;
    tickCount: number;
    houses?: HouseNode[];
    seed?: number;
    growthOrder?: GrowthOrder;
}) => {
    const worldState = buildWorldState({ houses, houseGeometry: HOUSE_GEOMETRY });
    const random = createSeededRandom(seed);
    let currentHouses = houses;
    let nextHouseId = Math.max(...houses.map((house) => house.id)) + 1;

    for (let tick = 0; tick < tickCount; tick += 1) {
        const result = runSimulationTick({
            houses: currentHouses,
            sideBehaviorByCoverage: rules,
            houseGeometry: HOUSE_GEOMETRY,
            allowOverlap: false,
            growthOrder,
            nextHouseId,
            worldState,
            random,
        });
        currentHouses = result.houses;
        nextHouseId = result.nextHouseId;
    }

    return { houses: currentHouses, worldState };
};

describe("runSimulationTick", () => {
    it("applies the rule for a lone house's zero connected sides", () => {
        expect(runTicks({ rules: rulesWith({ 0: "die" }), tickCount: 1 }).houses).toEqual([]);
        expect(runTicks({ rules: rulesWith({ 0: "nothing" }), tickCount: 1 }).houses).toEqual([
            createRootHouse(0),
        ]);

        const { houses } = runTicks({ rules: rulesWith({ 0: "grow" }), tickCount: 1 });
        expect(houses).toHaveLength(2);
        expect(houses.every((house) => house.sides.filter(Boolean).length === 1)).toBe(true);
    });

    it("keeps frozen houses alive when the rules say die", () => {
        const frozenRoot = { ...createRootHouse(0), frozen: true };
        const { houses } = runTicks({
            rules: rulesWith({ 0: "die" }),
            tickCount: 3,
            houses: [frozenRoot],
        });
        expect(houses).toEqual([frozenRoot]);
    });

    it("removes dying houses and leaves their neighbours disconnected in place", () => {
        // House 1 hangs under house 0, house 2 on a wall of house 1.
        const root = createRootHouse(0);
        const houseById = new Map([[root.id, root]]);
        const middle = connectNewHouse(houseById, root, 0, 1, 0);
        connectNewHouse(houseById, middle, 1, 2, 4);
        const houses = Array.from(houseById.values());
        const transformBefore = buildWorldState({
            houses,
            houseGeometry: HOUSE_GEOMETRY,
        }).byHouseId.get(2)?.transform;

        const { houses: survivors, worldState } = runTicks({
            rules: rulesWith({ 2: "die" }),
            tickCount: 1,
            houses,
        });

        expect(survivors.map((house) => house.id)).toEqual([0, 2]);
        expect(survivors.every((house) => house.sides.every((side) => side === null))).toBe(true);
        expect(worldState.byHouseId.has(1)).toBe(false);
        expect(worldState.byHouseId.get(2)?.transform).toEqual(transformBefore);
    });

    it("grows houses that do not overlap and are connected on both ends", () => {
        const { houses, worldState } = runTicks({ rules: WILDFIRE, tickCount: 8 });
        const houseById = new Map(houses.map((house) => [house.id, house]));

        expect(houses.length).toBeGreaterThan(20);
        expect([...worldState.byHouseId.keys()].sort()).toEqual(
            houses.map((house) => house.id).sort(),
        );

        const polygons = houses.map((house) => worldState.byHouseId.get(house.id)?.polygon ?? []);
        for (const [index, polygon] of polygons.entries()) {
            for (const otherPolygon of polygons.slice(index + 1)) {
                expect(polygonsOverlapArea(polygon, otherPolygon)).toBe(false);
            }
        }

        for (const house of houses) {
            house.sides.forEach((connection, index) => {
                if (!connection) return;
                const side = index as SideIndex;
                const otherSide = houseById.get(connection.houseId)?.sides[connection.side];
                expect(otherSide).toEqual({ houseId: house.id, side });
                expect(SIDE_KIND_BY_INDEX[connection.side]).toBe(SIDE_KIND_BY_INDEX[side]);
            });
        }
    });

    it("grows the same world from the same seed", () => {
        for (const growthOrder of ["random", "oldest"] as const) {
            const first = runTicks({ rules: CORAL, tickCount: 20, seed: 42, growthOrder });
            const second = runTicks({ rules: CORAL, tickCount: 20, seed: 42, growthOrder });
            expect(first.houses.length).toBeGreaterThan(1);
            expect(second.houses).toEqual(first.houses);
        }
    });
});
