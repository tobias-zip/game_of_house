import { describe, expect, it } from "vitest";
import { connectExistingHouses, createRootHouse, getCompatibleSides, getFreeSides } from "./graph";

describe("getCompatibleSides", () => {
    it("matches sides of the same kind only", () => {
        expect(getCompatibleSides(0)).toEqual([0]);
        expect(getCompatibleSides(1)).toEqual([1, 4]);
        expect(getCompatibleSides(4)).toEqual([1, 4]);
        expect(getCompatibleSides(2)).toEqual([2, 3]);
        expect(getCompatibleSides(3)).toEqual([2, 3]);
    });
});

describe("connectExistingHouses", () => {
    it("connects both houses to each other", () => {
        const first = createRootHouse(1);
        const second = createRootHouse(2);

        connectExistingHouses(first, 2, second, 3);

        expect(first.sides[2]).toEqual({ houseId: 2, side: 3 });
        expect(second.sides[3]).toEqual({ houseId: 1, side: 2 });
        expect(getFreeSides(first)).toEqual([0, 1, 3, 4]);
    });

    it("leaves sides that are already connected alone", () => {
        const first = createRootHouse(1);
        const second = createRootHouse(2);
        const third = createRootHouse(3);
        connectExistingHouses(first, 0, second, 0);

        connectExistingHouses(third, 0, first, 0);

        expect(first.sides[0]).toEqual({ houseId: 2, side: 0 });
        expect(third.sides[0]).toBeNull();
    });
});
