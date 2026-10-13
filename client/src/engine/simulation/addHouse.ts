import { getHousePolygon, IDENTITY_TRANSFORM } from "../../domain/house/geometry";
import { copyHouses, createRootHouse, getFreeSides } from "../../domain/house/graph";
import type { HouseGeometry, HouseNode } from "../../types";
import { tryGrowFromHost } from "./growFromHost";
import { type RandomSource, randomItem } from "./random";
import type { SimulationWorldState } from "./types";
import { getPolygonBounds, insertIntoSpatialIndex } from "./worldState";

type AddHouseInput = {
    houses: HouseNode[];
    worldState: SimulationWorldState;
    houseGeometry: HouseGeometry;
    allowOverlap: boolean;
    newHouseId: number;
    random: RandomSource;
};

// Attaches a new house to a random free side of the given host. Returns the new house
// list, or null when no house fits. Updates `worldState` in place.
export const addHouseToHost = ({
    houses,
    worldState,
    houseGeometry,
    allowOverlap,
    newHouseId,
    random,
    hostHouseId,
}: AddHouseInput & { hostHouseId: number }): HouseNode[] | null => {
    const houseById = copyHouses(houses);
    const newHouseWorldData = tryGrowFromHost({
        houseById,
        hostHouseId,
        houseGeometry,
        allowOverlap,
        newHouseId,
        worldState,
        localHousePolygon: getHousePolygon(houseGeometry),
        random,
    });
    if (!newHouseWorldData) return null;

    worldState.byHouseId.set(newHouseId, newHouseWorldData);
    insertIntoSpatialIndex(worldState.spatialIndex, newHouseId, newHouseWorldData.bounds);
    return Array.from(houseById.values());
};

// Attaches a new house to a random host with a free side; with no houses it places a root.
// Returns the new house list, or null when no house fits. Updates `worldState` in place.
export const addRandomHouse = (input: AddHouseInput): HouseNode[] | null => {
    const { houses, worldState, houseGeometry, newHouseId, random } = input;

    if (houses.length === 0) {
        const polygon = getHousePolygon(houseGeometry);
        const bounds = getPolygonBounds(polygon);
        worldState.byHouseId.set(newHouseId, { transform: IDENTITY_TRANSFORM, polygon, bounds });
        insertIntoSpatialIndex(worldState.spatialIndex, newHouseId, bounds);
        return [createRootHouse(newHouseId)];
    }

    const host = randomItem(
        houses.filter((house) => getFreeSides(house).length > 0),
        random,
    );
    if (!host) return null;

    return addHouseToHost({ ...input, hostHouseId: host.id });
};
