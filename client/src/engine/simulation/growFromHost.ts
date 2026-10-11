import {
    applyTransform,
    computeChildTransform,
    getSideSegment,
    OVERLAP_EPSILON,
    polygonsOverlapArea,
    transformPolygon,
} from "../../domain/house/geometry";
import {
    connectExistingHouses,
    connectNewHouse,
    getCompatibleSides,
    getFreeSides,
} from "../../domain/house/graph";
import type { HouseGeometry, HouseNode, Polygon, SideIndex, Transform } from "../../types";
import { EMPTY_GROW_TIMING_STATS } from "./profiling";
import type { AABB, SimulationWorldState, TryGrowFromHostResult } from "./types";
import { getPolygonBounds, querySpatialIndex } from "./worldState";

const aabbsOverlap = (a: AABB, b: AABB) =>
    !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);

const pointsAreNear = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y) <= OVERLAP_EPSILON;

const transformedSegmentMatches = ({
    firstTransform,
    firstSide,
    secondTransform,
    secondSide,
    houseGeometry,
}: {
    firstTransform: Transform;
    firstSide: SideIndex;
    secondTransform: Transform;
    secondSide: SideIndex;
    houseGeometry: HouseGeometry;
}) => {
    const firstSegment = getSideSegment(firstSide, houseGeometry);
    const secondSegment = getSideSegment(secondSide, houseGeometry);

    const firstStart = applyTransform(firstTransform, firstSegment.start);
    const firstEnd = applyTransform(firstTransform, firstSegment.end);
    const secondStart = applyTransform(secondTransform, secondSegment.start);
    const secondEnd = applyTransform(secondTransform, secondSegment.end);

    const sameDirection =
        pointsAreNear(firstStart, secondStart) && pointsAreNear(firstEnd, secondEnd);
    const oppositeDirection =
        pointsAreNear(firstStart, secondEnd) && pointsAreNear(firstEnd, secondStart);

    return sameDirection || oppositeDirection;
};

const connectNearbyHouseSides = ({
    houseById,
    newHouse,
    newHouseTransform,
    candidateNearbyHouseIds,
    worldState,
    houseGeometry,
}: {
    houseById: Map<number, HouseNode>;
    newHouse: HouseNode;
    newHouseTransform: Transform;
    candidateNearbyHouseIds: Iterable<number>;
    worldState: SimulationWorldState;
    houseGeometry: HouseGeometry;
}) => {
    for (const nearbyHouseId of candidateNearbyHouseIds) {
        if (nearbyHouseId === newHouse.id) continue;

        const nearbyWorldData = worldState.byHouseId.get(nearbyHouseId);
        if (!nearbyWorldData) continue;

        const nearbyHouse = houseById.get(nearbyHouseId);
        if (!nearbyHouse) continue;

        const newHouseFreeSides = getFreeSides(newHouse);
        if (newHouseFreeSides.length === 0) break;

        const nearbyFreeSides = new Set(getFreeSides(nearbyHouse));
        if (nearbyFreeSides.size === 0) continue;

        let linked = false;
        for (const newHouseSide of newHouseFreeSides) {
            const compatibleSides = getCompatibleSides(newHouseSide);
            for (const nearbySide of compatibleSides) {
                if (!nearbyFreeSides.has(nearbySide)) continue;

                const matches = transformedSegmentMatches({
                    firstTransform: newHouseTransform,
                    firstSide: newHouseSide,
                    secondTransform: nearbyWorldData.transform,
                    secondSide: nearbySide,
                    houseGeometry,
                });

                if (!matches) continue;

                connectExistingHouses(newHouse, newHouseSide, nearbyHouse, nearbySide);
                linked = true;
                break;
            }

            if (linked) break;
        }
    }
};

const shuffleInPlace = <T>(items: T[]) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const item = items[index];
        const swapItem = items[swapIndex];
        if (item === undefined || swapItem === undefined) continue;
        items[index] = swapItem;
        items[swapIndex] = item;
    }
};

// Mutates `houseById` (which must hold houses owned by the caller) when a house is placed.
// The caller adds the returned world data of the new house to the world state.
export const tryGrowFromHost = ({
    houseById,
    hostHouseId,
    houseGeometry,
    allowOverlap,
    newHouseId,
    worldState,
    localHousePolygon,
    debugProfilingEnabled = false,
}: {
    houseById: Map<number, HouseNode>;
    hostHouseId: number;
    houseGeometry: HouseGeometry;
    allowOverlap: boolean;
    newHouseId: number;
    worldState: SimulationWorldState;
    localHousePolygon: Polygon;
    debugProfilingEnabled?: boolean;
}): TryGrowFromHostResult => {
    const growTiming = { ...EMPTY_GROW_TIMING_STATS };
    let candidateCount = 0;
    let candidateUniqueCount = 0;
    let indexQueryMs = 0;
    const indexUpdateMs = 0;

    const hostLookupStart = debugProfilingEnabled ? performance.now() : 0;
    const hostHouse = houseById.get(hostHouseId);
    growTiming.hostLookupMs = debugProfilingEnabled ? performance.now() - hostLookupStart : 0;
    if (!hostHouse) {
        return { growTiming, candidateCount, candidateUniqueCount, indexQueryMs, indexUpdateMs };
    }

    const freeSidesStart = debugProfilingEnabled ? performance.now() : 0;
    const freeSides = getFreeSides(hostHouse);
    growTiming.freeSidesMs = debugProfilingEnabled ? performance.now() - freeSidesStart : 0;
    if (freeSides.length === 0) {
        return { growTiming, candidateCount, candidateUniqueCount, indexQueryMs, indexUpdateMs };
    }

    const candidateBuildStart = debugProfilingEnabled ? performance.now() : 0;
    const candidates: Array<{ hostSide: SideIndex; newHouseSide: SideIndex }> = [];

    for (const hostSide of freeSides) {
        const compatibleSides = getCompatibleSides(hostSide);
        for (const newHouseSide of compatibleSides) {
            candidates.push({ hostSide, newHouseSide });
        }
    }

    candidateCount = candidates.length;
    candidateUniqueCount = candidates.length;
    shuffleInPlace(candidates);
    growTiming.candidateBuildMs = debugProfilingEnabled
        ? performance.now() - candidateBuildStart
        : 0;

    const parentTransformLookupStart = debugProfilingEnabled ? performance.now() : 0;
    const parentTransform = worldState.byHouseId.get(hostHouse.id)?.transform;
    growTiming.parentTransformLookupMs = debugProfilingEnabled
        ? performance.now() - parentTransformLookupStart
        : 0;
    if (!parentTransform) {
        return { growTiming, candidateCount, candidateUniqueCount, indexQueryMs, indexUpdateMs };
    }

    const attemptsLoopStart = debugProfilingEnabled ? performance.now() : 0;

    for (const candidate of candidates) {
        const randomSelectionStart = debugProfilingEnabled ? performance.now() : 0;
        const hostSide = candidate.hostSide;
        const newHouseSide = candidate.newHouseSide;
        growTiming.randomSelectionMs += debugProfilingEnabled
            ? performance.now() - randomSelectionStart
            : 0;

        const childTransformStart = debugProfilingEnabled ? performance.now() : 0;
        const newTransform = computeChildTransform(
            parentTransform,
            hostSide,
            newHouseSide,
            houseGeometry,
        );
        growTiming.childTransformMs += debugProfilingEnabled
            ? performance.now() - childTransformStart
            : 0;

        let newPolygon: Polygon | undefined;
        let newBounds: AABB | undefined;

        if (!allowOverlap) {
            const overlapPrepStart = debugProfilingEnabled ? performance.now() : 0;
            newPolygon = transformPolygon(localHousePolygon, newTransform);
            growTiming.overlapPrepMs += debugProfilingEnabled
                ? performance.now() - overlapPrepStart
                : 0;

            const aabbPrepStart = debugProfilingEnabled ? performance.now() : 0;
            newBounds = getPolygonBounds(newPolygon);
            growTiming.aabbPrepMs += debugProfilingEnabled ? performance.now() - aabbPrepStart : 0;

            let overlaps = false;
            const overlapCheckStart = debugProfilingEnabled ? performance.now() : 0;

            const indexQueryStart = debugProfilingEnabled ? performance.now() : 0;
            const nearbyHouseIds = querySpatialIndex(worldState.spatialIndex, newBounds);
            const indexQueryTime = debugProfilingEnabled ? performance.now() - indexQueryStart : 0;
            growTiming.indexQueryMs += indexQueryTime;
            indexQueryMs += indexQueryTime;

            for (const nearbyHouseId of nearbyHouseIds) {
                const worldData = worldState.byHouseId.get(nearbyHouseId);
                if (!worldData) continue;

                const aabbCheckStart = debugProfilingEnabled ? performance.now() : 0;
                growTiming.aabbChecks += 1;
                const boundsOverlap = aabbsOverlap(newBounds, worldData.bounds);
                growTiming.aabbCheckMs += debugProfilingEnabled
                    ? performance.now() - aabbCheckStart
                    : 0;

                if (!boundsOverlap) continue;

                growTiming.aabbHits += 1;
                growTiming.overlapChecks += 1;

                if (polygonsOverlapArea(newPolygon, worldData.polygon)) {
                    overlaps = true;
                    growTiming.overlapHits += 1;
                    break;
                }
            }

            growTiming.overlapCheckMs += debugProfilingEnabled
                ? performance.now() - overlapCheckStart
                : 0;

            if (overlaps) continue;
        }

        const connectHousesStart = debugProfilingEnabled ? performance.now() : 0;
        const newHouse = connectNewHouse(houseById, hostHouse, hostSide, newHouseId, newHouseSide);
        const polygon = newPolygon ?? transformPolygon(localHousePolygon, newTransform);
        const bounds = newBounds ?? getPolygonBounds(polygon);

        if (!allowOverlap) {
            const nearbyHouseIds = querySpatialIndex(worldState.spatialIndex, bounds);

            connectNearbyHouseSides({
                houseById,
                newHouse,
                newHouseTransform: newTransform,
                candidateNearbyHouseIds: nearbyHouseIds,
                worldState,
                houseGeometry,
            });
        }

        growTiming.connectHousesMs += debugProfilingEnabled
            ? performance.now() - connectHousesStart
            : 0;

        growTiming.attemptsLoopMs = debugProfilingEnabled
            ? performance.now() - attemptsLoopStart
            : 0;

        return {
            growTiming,
            candidateCount,
            candidateUniqueCount,
            indexQueryMs,
            indexUpdateMs,
            newHouse: { transform: newTransform, polygon, bounds },
        };
    }

    growTiming.attemptsLoopMs = debugProfilingEnabled ? performance.now() - attemptsLoopStart : 0;

    return { growTiming, candidateCount, candidateUniqueCount, indexQueryMs, indexUpdateMs };
};
