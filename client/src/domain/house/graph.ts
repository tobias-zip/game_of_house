import type { HouseConnection, HouseNode, SideIndex, SideKind } from "../../types";

export const ALL_SIDES: SideIndex[] = [0, 1, 2, 3, 4];

export const SIDE_KIND_BY_INDEX: Record<SideIndex, SideKind> = {
    0: "down",
    1: "side",
    2: "roof",
    3: "roof",
    4: "side",
};

export const createEmptySides = () =>
    [null, null, null, null, null] as Array<HouseConnection | null>;

export const createRootHouse = (id: number): HouseNode => ({
    id,
    sides: createEmptySides(),
    parentId: null,
    parentSide: null,
    ownSide: null,
    rootTransform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
});

export const getFreeSides = (house: HouseNode) => {
    return ALL_SIDES.filter((side) => house.sides[side] === null);
};

export const getCompatibleSides = (side: SideIndex) => {
    return ALL_SIDES.filter(
        (candidate) => SIDE_KIND_BY_INDEX[candidate] === SIDE_KIND_BY_INDEX[side],
    );
};

// The connect functions mutate the given houses. Callers pass houses they own,
// for example copies made for the current tick, never houses already in React state.
export const connectNewHouse = (
    houseById: Map<number, HouseNode>,
    hostHouse: HouseNode,
    hostSide: SideIndex,
    newHouseId: number,
    newHouseSide: SideIndex,
) => {
    hostHouse.sides[hostSide] = { houseId: newHouseId, side: newHouseSide };

    const newHouseSides = createEmptySides();
    newHouseSides[newHouseSide] = { houseId: hostHouse.id, side: hostSide };

    const newHouse: HouseNode = {
        id: newHouseId,
        sides: newHouseSides,
        parentId: hostHouse.id,
        parentSide: hostSide,
        ownSide: newHouseSide,
        rootTransform: null,
    };
    houseById.set(newHouseId, newHouse);
    return newHouse;
};

export const connectExistingHouses = (
    firstHouse: HouseNode,
    firstSide: SideIndex,
    secondHouse: HouseNode,
    secondSide: SideIndex,
) => {
    if (firstHouse === secondHouse) return;
    if (firstHouse.sides[firstSide] || secondHouse.sides[secondSide]) return;

    firstHouse.sides[firstSide] = { houseId: secondHouse.id, side: secondSide };
    secondHouse.sides[secondSide] = { houseId: firstHouse.id, side: firstSide };
};

export const copyHouses = (houses: HouseNode[]) =>
    new Map(houses.map((house) => [house.id, { ...house, sides: [...house.sides] }]));
