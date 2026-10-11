import { getHousePolygon, IDENTITY_TRANSFORM } from '../../domain/house/geometry'
import type { CoveredSideCount, HouseNode } from '../../types'
import { EMPTY_GROW_TIMING_STATS } from './profiling'
import type { RunSimulationTickInput, RunSimulationTickResult } from './types'
import { tryGrowFromHost } from './growFromHost'
import {
  insertIntoSpatialIndex,
  removeFromSpatialIndex,
  unblockHousesNear,
} from './worldState'

const countCoveredSides = (house: HouseNode) => house.sides.filter(Boolean).length as CoveredSideCount

export const runSimulationTick = ({
  houses,
  sideBehaviorByCoverage,
  houseGeometry,
  allowOverlap,
  nextHouseId,
  worldState,
  debugProfilingEnabled = false,
}: RunSimulationTickInput): RunSimulationTickResult => {
  const tickStart = debugProfilingEnabled ? performance.now() : 0

  if (houses.length === 0) {
    const result: RunSimulationTickResult = { houses, nextHouseId, worldState }

    if (debugProfilingEnabled) {
      result.profile = {
        generalStats: {
          housesBefore: 0,
          housesAfter: 0,
          dieCount: 0,
          survivorCount: 0,
          growCandidates: 0,
          growAttempts: 0,
          growSuccesses: 0,
        },
        timeStats: {
          classifyMs: 0,
          cleanupFilterMs: 0,
          survivorIdsBuildMs: 0,
          cleanupRemapMs: 0,
          cacheCleanupMs: 0,
          cleanupTotalMs: 0,
          growMs: 0,
          indexQueryMs: 0,
          indexUpdateMs: 0,
          growthCandidateCount: 0,
          growthCandidateUniqueCount: 0,
          spatialIndexCells: worldState.spatialIndex.cells.size,
          totalMs: performance.now() - tickStart,
          growingStats: {
            ...EMPTY_GROW_TIMING_STATS,
            totalGrowCalls: 0,
          },
        },
      }
    }

    return result
  }

  // The world state is updated in place; it always matches `houses` on entry.
  const nextWorldState = worldState

  const localHousePolygon = getHousePolygon(houseGeometry)

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

  const cleanupFilterStart = debugProfilingEnabled ? performance.now() : 0
  let nextHouses = houses.filter((house) => !dieIds.has(house.id))
  const cleanupFilterMs = debugProfilingEnabled ? performance.now() - cleanupFilterStart : 0

  const survivorIdsBuildStart = debugProfilingEnabled ? performance.now() : 0
  const survivorIds = new Set(nextHouses.map((house) => house.id))
  const survivorIdsBuildMs = debugProfilingEnabled
    ? performance.now() - survivorIdsBuildStart
    : 0

  // Every survivor is copied here, so growth below may mutate them through `houseById`.
  const cleanupRemapStart = debugProfilingEnabled ? performance.now() : 0
  nextHouses = nextHouses.map((house) => {
    const parentStillAlive = house.parentId !== null && survivorIds.has(house.parentId)
    const anchorTransform = nextWorldState.byHouseId.get(house.id)?.transform ?? IDENTITY_TRANSFORM

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
  const cleanupRemapMs = debugProfilingEnabled ? performance.now() - cleanupRemapStart : 0

  const cacheCleanupStart = debugProfilingEnabled ? performance.now() : 0
  for (const deadHouseId of dieIds) {
    const deadWorldData = nextWorldState.byHouseId.get(deadHouseId)
    if (!deadWorldData) continue
    removeFromSpatialIndex(nextWorldState.spatialIndex, deadHouseId, deadWorldData.bounds)
    nextWorldState.byHouseId.delete(deadHouseId)
    nextWorldState.blockedHouseIds.delete(deadHouseId)
    unblockHousesNear(nextWorldState, deadWorldData.bounds)
  }
  const cacheCleanupMs = debugProfilingEnabled ? performance.now() - cacheCleanupStart : 0
  const cleanupTotalMs = debugProfilingEnabled ? performance.now() - cleanupStart : 0

  const houseById = new Map(nextHouses.map((house) => [house.id, house]))
  let nextId = nextHouseId
  let growAttempts = 0
  let growSuccesses = 0
  let indexQueryMs = 0
  let indexUpdateMs = 0
  let growthCandidateCount = 0
  let growthCandidateUniqueCount = 0

  const growingStats = {
    ...EMPTY_GROW_TIMING_STATS,
    totalGrowCalls: 0,
  }

  const growStart = debugProfilingEnabled ? performance.now() : 0
  for (const hostHouseId of growIds) {
    const hostStillAlive = survivorIds.has(hostHouseId)
    if (!hostStillAlive) continue
    if (!allowOverlap && nextWorldState.blockedHouseIds.has(hostHouseId)) continue

    growAttempts += 1

    const grown = tryGrowFromHost({
      houseById,
      hostHouseId,
      houseGeometry,
      allowOverlap,
      newHouseId: nextId,
      debugProfilingEnabled,
      worldState: nextWorldState,
      localHousePolygon,
    })

    growthCandidateCount += grown.candidateCount
    growthCandidateUniqueCount += grown.candidateUniqueCount
    indexQueryMs += grown.indexQueryMs
    indexUpdateMs += grown.indexUpdateMs

    growingStats.totalGrowCalls += 1
    growingStats.hostLookupMs += grown.growTiming.hostLookupMs
    growingStats.freeSidesMs += grown.growTiming.freeSidesMs
    growingStats.candidateBuildMs += grown.growTiming.candidateBuildMs
    growingStats.parentTransformLookupMs += grown.growTiming.parentTransformLookupMs
    growingStats.attemptsLoopMs += grown.growTiming.attemptsLoopMs
    growingStats.randomSelectionMs += grown.growTiming.randomSelectionMs
    growingStats.childTransformMs += grown.growTiming.childTransformMs
    growingStats.overlapPrepMs += grown.growTiming.overlapPrepMs
    growingStats.overlapCheckMs += grown.growTiming.overlapCheckMs
    growingStats.indexQueryMs += grown.growTiming.indexQueryMs
    growingStats.aabbPrepMs += grown.growTiming.aabbPrepMs
    growingStats.aabbCheckMs += grown.growTiming.aabbCheckMs
    growingStats.connectHousesMs += grown.growTiming.connectHousesMs
    growingStats.aabbChecks += grown.growTiming.aabbChecks
    growingStats.aabbHits += grown.growTiming.aabbHits
    growingStats.overlapChecks += grown.growTiming.overlapChecks
    growingStats.overlapHits += grown.growTiming.overlapHits

    if (!grown.newHouse && !allowOverlap) {
      nextWorldState.blockedHouseIds.add(hostHouseId)
    }

    if (grown.newHouse) {
      const indexUpdateStart = debugProfilingEnabled ? performance.now() : 0
      nextWorldState.byHouseId.set(nextId, grown.newHouse)
      insertIntoSpatialIndex(nextWorldState.spatialIndex, nextId, grown.newHouse.bounds)
      indexUpdateMs += debugProfilingEnabled ? performance.now() - indexUpdateStart : 0

      survivorIds.add(nextId)
      nextId += 1
      growSuccesses += 1
    }
  }
  const growMs = debugProfilingEnabled ? performance.now() - growStart : 0

  nextHouses = Array.from(houseById.values())

  const result: RunSimulationTickResult = {
    houses: nextHouses,
    nextHouseId: nextId,
    worldState: nextWorldState,
  }

  if (debugProfilingEnabled) {
    result.profile = {
      generalStats: {
        housesBefore: houses.length,
        housesAfter: nextHouses.length,
        dieCount: dieIds.size,
        survivorCount: survivorIds.size,
        growCandidates: growIds.length,
        growAttempts,
        growSuccesses,
      },
      timeStats: {
        classifyMs,
        cleanupFilterMs,
        survivorIdsBuildMs,
        cleanupRemapMs,
        cacheCleanupMs,
        cleanupTotalMs,
        growMs,
        indexQueryMs,
        indexUpdateMs,
        growthCandidateCount,
        growthCandidateUniqueCount,
        spatialIndexCells: nextWorldState.spatialIndex.cells.size,
        totalMs: performance.now() - tickStart,
        growingStats,
      },
    }
  }

  return result
}

