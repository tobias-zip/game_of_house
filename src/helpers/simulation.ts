import {
  computeChildTransform,
  computeTransforms,
  getHousePolygon,
  IDENTITY_TRANSFORM,
  polygonsOverlapArea,
  randomItem,
  transformPolygon,
} from './geometry'
import { connectHouses, getCompatibleSides, getFreeSides } from './houseGraph'
import type { HouseGeometry, HouseNode } from '../types'

type CoveredSideCount = 0 | 1 | 2 | 3 | 4 | 5
type SideBehavior = 'die' | 'nothing' | 'grow'
type SideBehaviorByCoverage = Record<CoveredSideCount, SideBehavior>

type RunSimulationTickInput = {
  houses: HouseNode[]
  sideBehaviorByCoverage: SideBehaviorByCoverage
  houseGeometry: HouseGeometry
  allowOverlap: boolean
  nextHouseId: number
  debugProfilingEnabled?: boolean
}

export type SimulationTickProfile = {
  housesBefore: number
  housesAfter: number
  dieCount: number
  growCandidates: number
  growAttempts: number
  growSuccesses: number
  computeTransformsMs: number
  classifyMs: number
  cleanupMs: number
  growMs: number
  totalMs: number
}

type RunSimulationTickResult = {
  houses: HouseNode[]
  nextHouseId: number
  profile?: SimulationTickProfile
}

const countCoveredSides = (house: HouseNode): CoveredSideCount =>
  house.sides.filter(Boolean).length as CoveredSideCount

const tryGrowFromHost = (
  houses: HouseNode[],
  hostHouseId: number,
  houseGeometry: HouseGeometry,
  allowOverlap: boolean,
  newHouseId: number,
) => {
  const hostHouse = houses.find((house) => house.id === hostHouseId)
  if (!hostHouse) return houses

  const freeSides = getFreeSides(hostHouse)
  if (freeSides.length === 0) return houses

  const currentTransforms = computeTransforms(houses, houseGeometry)
  const localHousePolygon = getHousePolygon(houseGeometry)
  const parentTransform = currentTransforms.get(hostHouse.id)
  if (!parentTransform) return houses

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const hostSide = randomItem(freeSides)
    const newHouseSide = randomItem(getCompatibleSides(hostSide))

    const newTransform = computeChildTransform(
      parentTransform,
      hostSide,
      newHouseSide,
      houseGeometry,
    )

    if (!allowOverlap) {
      const newPolygon = transformPolygon(localHousePolygon, newTransform)
      let overlaps = false

      for (const house of houses) {
        const transform = currentTransforms.get(house.id)
        if (!transform) continue

        const polygon = transformPolygon(localHousePolygon, transform)
        if (polygonsOverlapArea(newPolygon, polygon)) {
          overlaps = true
          break
        }
      }

      if (overlaps) continue
    }

    return connectHouses(houses, hostHouse.id, hostSide, newHouseId, newHouseSide)
  }

  return houses
}

export const runSimulationTick = ({
  houses,
  sideBehaviorByCoverage,
  houseGeometry,
  allowOverlap,
  nextHouseId,
  debugProfilingEnabled = false,
}: RunSimulationTickInput): RunSimulationTickResult => {
  const tickStart = debugProfilingEnabled ? performance.now() : 0
  if (houses.length === 0) {
    return { houses, nextHouseId }
  }

  const transformsStart = debugProfilingEnabled ? performance.now() : 0
  const currentTransforms = computeTransforms(houses, houseGeometry)
  const computeTransformsMs = debugProfilingEnabled ? performance.now() - transformsStart : 0
  const dieIds = new Set<number>()
  const growIds: number[] = []
  const classifyStart = debugProfilingEnabled ? performance.now() : 0

  for (const house of houses) {
    const coveredSideCount = countCoveredSides(house)
    const behavior = sideBehaviorByCoverage[coveredSideCount]

    if (behavior === 'die') {
      dieIds.add(house.id)
    } else if (behavior === 'grow') {
      growIds.push(house.id)
    }
  }
  const classifyMs = debugProfilingEnabled ? performance.now() - classifyStart : 0

  const cleanupStart = debugProfilingEnabled ? performance.now() : 0
  let nextHouses = houses.filter((house) => !dieIds.has(house.id))
  const survivorIds = new Set(nextHouses.map((house) => house.id))

  nextHouses = nextHouses.map((house) => {
    const parentStillAlive = house.parentId !== null && survivorIds.has(house.parentId)
    const anchorTransform = currentTransforms.get(house.id) ?? IDENTITY_TRANSFORM

    return {
      ...house,
      parentId: parentStillAlive ? house.parentId : null,
      parentSide: parentStillAlive ? house.parentSide : null,
      ownSide: parentStillAlive ? house.ownSide : null,
      rootTransform: parentStillAlive ? null : anchorTransform,
      sides: house.sides.map((connection) => {
        if (!connection) return null
        return survivorIds.has(connection.houseId) ? connection : null
      }),
    }
  })
  const cleanupMs = debugProfilingEnabled ? performance.now() - cleanupStart : 0

  let nextId = nextHouseId
  let growAttempts = 0
  let growSuccesses = 0
  const growStart = debugProfilingEnabled ? performance.now() : 0
  for (const hostHouseId of growIds) {
    const hostStillAlive = nextHouses.some((house) => house.id === hostHouseId)
    if (!hostStillAlive) continue

    growAttempts += 1
    const grown = tryGrowFromHost(nextHouses, hostHouseId, houseGeometry, allowOverlap, nextId)
    if (grown !== nextHouses) {
      nextHouses = grown
      nextId += 1
      growSuccesses += 1
    }
  }
  const growMs = debugProfilingEnabled ? performance.now() - growStart : 0

  const result: RunSimulationTickResult = {
    houses: nextHouses,
    nextHouseId: nextId,
  }

  if (debugProfilingEnabled) {
    result.profile = {
      housesBefore: houses.length,
      housesAfter: nextHouses.length,
      dieCount: dieIds.size,
      growCandidates: growIds.length,
      growAttempts,
      growSuccesses,
      computeTransformsMs,
      classifyMs,
      cleanupMs,
      growMs,
      totalMs: performance.now() - tickStart,
    }
  }

  return result
}


