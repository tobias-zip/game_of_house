import type { HouseNode } from '../../types'

export type RippleEffect = {
  houseId: number
  distance: number
}

/**
 * Computes which houses are affected by a ripple.
 * Uses BFS to find all reachable houses and calculates their distance from origin.
 */
export function computeRippleEffect(
  houses: HouseNode[],
  originHouseId: number,
  range: number
): RippleEffect[] {
  const houseById = new Map<number, HouseNode>()
  for (const house of houses) houseById.set(house.id, house)

  if (!houseById.has(originHouseId)) return []

  const affectedHouses: RippleEffect[] = []
  const visited = new Set<number>()
  const queue: Array<[houseId: number, distance: number]> = [[originHouseId, 0]]
  let queueIndex = 0

  while (queueIndex < queue.length) {
    const [currentHouseId, currentDistance] = queue[queueIndex]!
    queueIndex += 1
    if (visited.has(currentHouseId)) continue
    visited.add(currentHouseId)

    if (currentDistance <= range) {
      affectedHouses.push({
        houseId: currentHouseId,
        distance: currentDistance,
      })
    }

    // Find connected houses
    const currentHouse = houseById.get(currentHouseId)
    if (!currentHouse) continue

    for (const connection of currentHouse.sides) {
      if (!connection) continue
      const nextDistance = currentDistance + 1 // Each connection is 1 unit
      if (nextDistance <= range && !visited.has(connection.houseId)) {
        queue.push([connection.houseId, nextDistance])
      }
    }
  }

  return affectedHouses
}

/**
 * Time (ms) until the ripple reaches a house at a given hop distance.
 * `speed` is interpreted as "houses per second".
 */
export function rippleReachDelayMs(distance: number, speed: number): number {
  const safeSpeed = Math.max(0.0001, speed)
  return (distance / safeSpeed) * 1000
}

/**
 * Determines if a house should be colored in the ripple effect.
 * Returns true if the ripple wave has reached the house.
 */
export function isHouseInRippleWave(
  elapsedTime: number,
  distance: number,
  speed: number
): boolean {
  // Distance in time = distance / speed (assuming distance in units, speed in units/ms)
  const distanceInTime = (distance / speed) * 1000
  return elapsedTime >= distanceInTime
}

/**
 * Converts a hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * Blends two RGBA colors additively
 */
export function blendRgbaAdditive(
  r1: number,
  g1: number,
  b1: number,
  a1: number,
  r2: number,
  g2: number,
  b2: number,
  a2: number
): [number, number, number, number] {
  return [
    Math.min(r1 + r2 * a2, 255),
    Math.min(g1 + g2 * a2, 255),
    Math.min(b1 + b2 * a2, 255),
    Math.min(a1 + a2, 1),
  ]
}

