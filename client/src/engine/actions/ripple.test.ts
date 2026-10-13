import { describe, expect, it } from "vitest";
import { connectExistingHouses, connectNewHouse, createRootHouse } from "../../domain/house/graph";
import { computeEchoEffect, computeLineageEffect, computeRippleEffect } from "./ripple";

// Houses 0–1–2–3 in a line, plus house 4 connected to nothing.
const createHouses = () => {
    const houses = [0, 1, 2, 3, 4].map(createRootHouse);
    const [first, second, third, fourth] = houses;
    if (!first || !second || !third || !fourth) throw new Error("Missing house");
    connectExistingHouses(first, 1, second, 4);
    connectExistingHouses(second, 1, third, 4);
    connectExistingHouses(third, 1, fourth, 4);
    return houses;
};

describe("computeRippleEffect", () => {
    it("reaches connected houses up to the range, by hop distance", () => {
        const reached = computeRippleEffect(createHouses(), 1, 1);
        expect(reached.sort((a, b) => a.houseId - b.houseId)).toEqual([
            { houseId: 0, distance: 1 },
            { houseId: 1, distance: 0 },
            { houseId: 2, distance: 1 },
        ]);
    });

    it("does not reach unconnected houses", () => {
        const reached = computeRippleEffect(createHouses(), 0, 10).map(({ houseId }) => houseId);
        expect(reached.sort()).toEqual([0, 1, 2, 3]);
    });

    it("returns nothing for an unknown origin", () => {
        expect(computeRippleEffect(createHouses(), 99, 10)).toEqual([]);
    });
});

describe("computeEchoEffect", () => {
    it("lights each house again on the way back from the dead end", () => {
        const pulses = computeEchoEffect(createHouses(), 0, 10)
            .map(({ houseId, distance }) => `${houseId}@${distance}`)
            .sort();
        // The wave turns at house 3, so house 3 lights once and the others twice.
        expect(pulses).toEqual(["0@0", "0@6", "1@1", "1@5", "2@2", "2@4", "3@3"]);
    });

    it("turns at the range limit", () => {
        const pulses = computeEchoEffect(createHouses(), 0, 1).map(
            ({ houseId, distance }) => `${houseId}@${distance}`,
        );
        expect(pulses.sort()).toEqual(["0@0", "0@2", "1@1"]);
    });
});

describe("computeLineageEffect", () => {
    it("walks from the house back through the houses that grew it", () => {
        const root = createRootHouse(0);
        const houseById = new Map([[root.id, root]]);
        const child = connectNewHouse(houseById, root, 2, 1, 3);
        const grandchild = connectNewHouse(houseById, child, 1, 2, 4);
        connectNewHouse(houseById, root, 1, 3, 4);
        const houses = Array.from(houseById.values());

        expect(computeLineageEffect(houses, grandchild.id)).toEqual([
            { houseId: 2, distance: 0 },
            { houseId: 1, distance: 1 },
            { houseId: 0, distance: 2 },
        ]);
    });
});
