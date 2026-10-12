import { getHousePolygon } from "../../domain/house/geometry";
import type { CoveredSideCount, HouseNode } from "../../types";
import { tryGrowFromHost } from "./growFromHost";
import { shuffleInPlace } from "./random";
import { removeHouses } from "./removeHouses";
import type { RunSimulationTickInput, RunSimulationTickResult } from "./types";
import { insertIntoSpatialIndex } from "./worldState";

const countCoveredSides = (house: HouseNode) =>
    house.sides.filter(Boolean).length as CoveredSideCount;

export const runSimulationTick = ({
    houses,
    sideBehaviorByCoverage,
    houseGeometry,
    allowOverlap,
    growthOrder,
    nextHouseId,
    worldState,
    random,
}: RunSimulationTickInput): RunSimulationTickResult => {
    const tickStart = performance.now();

    // The world state is updated in place; it always matches `houses` on entry.
    const localHousePolygon = getHousePolygon(houseGeometry);

    const dieIds = new Set<number>();
    const growIds: number[] = [];

    for (const house of houses) {
        const behavior = sideBehaviorByCoverage[countCoveredSides(house)];

        if (behavior === "die" && !house.frozen) {
            dieIds.add(house.id);
        } else if (behavior === "grow") {
            growIds.push(house.id);
        }
    }
    const classifiedAt = performance.now();

    const houseById = removeHouses(houses, dieIds, worldState);
    const cleanedUpAt = performance.now();

    // `growIds` follows the order of `houses`, which is oldest first.
    if (growthOrder === "random") shuffleInPlace(growIds, random);

    let nextId = nextHouseId;
    let growAttempts = 0;

    for (const hostHouseId of growIds) {
        if (!allowOverlap && worldState.blockedHouseIds.has(hostHouseId)) continue;

        growAttempts += 1;

        const newHouseWorldData = tryGrowFromHost({
            houseById,
            hostHouseId,
            houseGeometry,
            allowOverlap,
            newHouseId: nextId,
            worldState,
            localHousePolygon,
            random,
        });

        if (!newHouseWorldData) {
            if (!allowOverlap) worldState.blockedHouseIds.add(hostHouseId);
            continue;
        }

        worldState.byHouseId.set(nextId, newHouseWorldData);
        insertIntoSpatialIndex(worldState.spatialIndex, nextId, newHouseWorldData.bounds);
        nextId += 1;
    }

    const nextHouses = Array.from(houseById.values());
    const tickEnd = performance.now();

    return {
        houses: nextHouses,
        nextHouseId: nextId,
        worldState,
        profile: {
            housesBefore: houses.length,
            housesAfter: nextHouses.length,
            dieCount: dieIds.size,
            growCandidates: growIds.length,
            growAttempts,
            growSuccesses: nextId - nextHouseId,
            spatialIndexCells: worldState.spatialIndex.cells.size,
            classifyMs: classifiedAt - tickStart,
            cleanupMs: cleanedUpAt - classifiedAt,
            growMs: tickEnd - cleanedUpAt,
            totalMs: tickEnd - tickStart,
        },
    };
};
