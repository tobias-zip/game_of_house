import type { HouseNode } from "../../types";

// A house lit by a pulse `distance` hops after the click. Ripple, echo and lineage all
// light houses this way; they differ in which houses they reach and when.
export type RippleEffect = {
    houseId: number;
    distance: number;
};

const indexHouses = (houses: HouseNode[]) => new Map(houses.map((house) => [house.id, house]));

/**
 * Computes which houses are affected by a ripple.
 * Uses BFS to find all reachable houses and calculates their distance from origin.
 */
export function computeRippleEffect(
    houses: HouseNode[],
    originHouseId: number,
    range: number,
): RippleEffect[] {
    const houseById = indexHouses(houses);

    if (!houseById.has(originHouseId)) return [];

    const affectedHouses: RippleEffect[] = [];
    const visited = new Set<number>();
    const queue: Array<[houseId: number, distance: number]> = [[originHouseId, 0]];

    // Iterating also visits the entries pushed during the loop, which makes this a
    // breadth-first search.
    for (const [currentHouseId, currentDistance] of queue) {
        if (visited.has(currentHouseId)) continue;
        visited.add(currentHouseId);

        if (currentDistance <= range) {
            affectedHouses.push({
                houseId: currentHouseId,
                distance: currentDistance,
            });
        }

        // Find connected houses
        const currentHouse = houseById.get(currentHouseId);
        if (!currentHouse) continue;

        for (const connection of currentHouse.sides) {
            if (!connection) continue;
            const nextDistance = currentDistance + 1; // Each connection is 1 unit
            if (nextDistance <= range && !visited.has(connection.houseId)) {
                queue.push([connection.houseId, nextDistance]);
            }
        }
    }

    return affectedHouses;
}

/**
 * A ripple that bounces back from dead ends: along each branch the wave runs outwards
 * until it cannot go further (or reaches the range), then returns the same way. A house
 * at distance d whose branch turns at distance t lights up again at 2t − d.
 */
export function computeEchoEffect(
    houses: HouseNode[],
    originHouseId: number,
    range: number,
): RippleEffect[] {
    const outgoing = computeRippleEffect(houses, originHouseId, range);
    const houseById = indexHouses(houses);
    const distanceById = new Map(outgoing.map(({ houseId, distance }) => [houseId, distance]));

    // The farthest distance reachable from each house by stepping strictly outwards,
    // worked out from the outermost houses inwards.
    const turnDistanceById = new Map<number, number>();
    const outermostFirst = [...outgoing].sort((a, b) => b.distance - a.distance);
    for (const { houseId, distance } of outermostFirst) {
        let turnDistance = distance;
        for (const connection of houseById.get(houseId)?.sides ?? []) {
            if (!connection || distanceById.get(connection.houseId) !== distance + 1) continue;
            turnDistance = Math.max(turnDistance, turnDistanceById.get(connection.houseId) ?? 0);
        }
        turnDistanceById.set(houseId, turnDistance);
    }

    const returning = outgoing.flatMap(({ houseId, distance }) => {
        const turnDistance = turnDistanceById.get(houseId) ?? distance;
        return turnDistance > distance ? [{ houseId, distance: 2 * turnDistance - distance }] : [];
    });

    return [...outgoing, ...returning];
}

/**
 * Lights the house and then, one hop at a time, the houses that grew it, back to its
 * oldest living ancestor (a parent link ends where a parent died).
 */
export function computeLineageEffect(houses: HouseNode[], originHouseId: number): RippleEffect[] {
    const houseById = indexHouses(houses);
    const lineage: RippleEffect[] = [];
    const visited = new Set<number>();
    let house = houseById.get(originHouseId);

    while (house && !visited.has(house.id)) {
        visited.add(house.id);
        lineage.push({ houseId: house.id, distance: lineage.length });
        house = house.parentId === null ? undefined : houseById.get(house.parentId);
    }

    return lineage;
}

/**
 * Time (ms) until the ripple reaches a house at a given hop distance.
 * `speed` is interpreted as "houses per second".
 */
export function rippleReachDelayMs(distance: number, speed: number): number {
    const safeSpeed = Math.max(0.0001, speed);
    return (distance / safeSpeed) * 1000;
}
