import { IDENTITY_TRANSFORM } from "../../domain/house/geometry";
import type { HouseNode } from "../../types";
import type { SimulationWorldState } from "./types";
import { removeFromSpatialIndex, unblockHousesNear } from "./worldState";

// Removes the given houses and disconnects their neighbours. A survivor whose parent was
// removed becomes a root anchored where it is. Returns copies of all survivors by id,
// which the caller may mutate, and updates `worldState` in place.
export const removeHouses = (
    houses: HouseNode[],
    removedIds: Set<number>,
    worldState: SimulationWorldState,
): Map<number, HouseNode> => {
    const isSurvivor = (houseId: number) => !removedIds.has(houseId);
    const houseById = new Map<number, HouseNode>();

    for (const house of houses) {
        if (!isSurvivor(house.id)) continue;

        const parentStillAlive = house.parentId !== null && isSurvivor(house.parentId);
        const anchorTransform = worldState.byHouseId.get(house.id)?.transform ?? IDENTITY_TRANSFORM;

        houseById.set(house.id, {
            ...house,
            parentId: parentStillAlive ? house.parentId : null,
            parentSide: parentStillAlive ? house.parentSide : null,
            ownSide: parentStillAlive ? house.ownSide : null,
            rootTransform: parentStillAlive ? null : anchorTransform,
            sides: house.sides.map((connection) =>
                connection && isSurvivor(connection.houseId) ? connection : null,
            ),
        });
    }

    for (const removedId of removedIds) {
        const removedWorldData = worldState.byHouseId.get(removedId);
        if (!removedWorldData) continue;
        removeFromSpatialIndex(worldState.spatialIndex, removedId, removedWorldData.bounds);
        worldState.byHouseId.delete(removedId);
        worldState.blockedHouseIds.delete(removedId);
        unblockHousesNear(worldState, removedWorldData.bounds);
    }

    return houseById;
};
