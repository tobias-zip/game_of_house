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
import { type RandomSource, shuffleInPlace } from "./random";
import type { AABB, HouseWorldData, SimulationWorldState } from "./types";
import { getPolygonBounds, querySpatialIndex } from "./worldState";

const aabbsOverlap = (a: AABB, b: AABB) =>
    !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);

const overlapsExistingHouse = (
    polygon: Polygon,
    bounds: AABB,
    worldState: SimulationWorldState,
) => {
    for (const nearbyHouseId of querySpatialIndex(worldState.spatialIndex, bounds)) {
        const worldData = worldState.byHouseId.get(nearbyHouseId);
        if (!worldData || !aabbsOverlap(bounds, worldData.bounds)) continue;
        if (polygonsOverlapArea(polygon, worldData.polygon)) return true;
    }
    return false;
};

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

// Mutates `houseById` (which must hold houses owned by the caller) when a house is placed.
// Returns the world data of the new house, which the caller adds to the world state, or
// null when no free side fits a house.
export const tryGrowFromHost = ({
    houseById,
    hostHouseId,
    houseGeometry,
    allowOverlap,
    newHouseId,
    worldState,
    localHousePolygon,
    random,
}: {
    houseById: Map<number, HouseNode>;
    hostHouseId: number;
    houseGeometry: HouseGeometry;
    allowOverlap: boolean;
    newHouseId: number;
    worldState: SimulationWorldState;
    localHousePolygon: Polygon;
    random: RandomSource;
}): HouseWorldData | null => {
    const hostHouse = houseById.get(hostHouseId);
    const parentTransform = worldState.byHouseId.get(hostHouseId)?.transform;
    if (!hostHouse || !parentTransform) return null;

    const candidates: Array<{ hostSide: SideIndex; newHouseSide: SideIndex }> = [];
    for (const hostSide of getFreeSides(hostHouse)) {
        for (const newHouseSide of getCompatibleSides(hostSide)) {
            candidates.push({ hostSide, newHouseSide });
        }
    }
    shuffleInPlace(candidates, random);

    for (const { hostSide, newHouseSide } of candidates) {
        const newTransform = computeChildTransform(
            parentTransform,
            hostSide,
            newHouseSide,
            houseGeometry,
        );
        const polygon = transformPolygon(localHousePolygon, newTransform);
        const bounds = getPolygonBounds(polygon);

        if (!allowOverlap && overlapsExistingHouse(polygon, bounds, worldState)) continue;

        const newHouse = connectNewHouse(houseById, hostHouse, hostSide, newHouseId, newHouseSide);

        if (!allowOverlap) {
            connectNearbyHouseSides({
                houseById,
                newHouse,
                newHouseTransform: newTransform,
                candidateNearbyHouseIds: querySpatialIndex(worldState.spatialIndex, bounds),
                worldState,
                houseGeometry,
            });
        }

        return { transform: newTransform, polygon, bounds };
    }

    return null;
};
