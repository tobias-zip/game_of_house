export type GrowTimingStats = {
  hostLookupMs: number
  freeSidesMs: number
  computeTransformsMs: number
  candidateBuildMs: number
  parentTransformLookupMs: number
  attemptsLoopMs: number
  randomSelectionMs: number
  childTransformMs: number
  overlapPrepMs: number
  overlapCheckMs: number
  indexQueryMs: number
  aabbPrepMs: number
  aabbCheckMs: number
  connectHousesMs: number
  aabbChecks: number
  aabbHits: number
  overlapChecks: number
  overlapHits: number
}

export type SimulationTickProfile = {
  generalStats: {
    housesBefore: number
    housesAfter: number
    dieCount: number
    survivorCount: number
    growCandidates: number
    growAttempts: number
    growSuccesses: number
  }
  timeStats: {
    computeTransformsMs: number
    classifyMs: number
    cleanupFilterMs: number
    survivorIdsBuildMs: number
    cleanupRemapMs: number
    cacheCleanupMs: number
    cleanupTotalMs: number
    growMs: number
    indexQueryMs: number
    indexUpdateMs: number
    growthCandidateCount: number
    growthCandidateUniqueCount: number
    spatialIndexCells: number
    totalMs: number
    growingStats: GrowTimingStats & {
      totalGrowCalls: number
    }
  }
}

export const EMPTY_GROW_TIMING_STATS: GrowTimingStats = {
  hostLookupMs: 0,
  freeSidesMs: 0,
  computeTransformsMs: 0,
  candidateBuildMs: 0,
  parentTransformLookupMs: 0,
  attemptsLoopMs: 0,
  randomSelectionMs: 0,
  childTransformMs: 0,
  overlapPrepMs: 0,
  overlapCheckMs: 0,
  indexQueryMs: 0,
  aabbPrepMs: 0,
  aabbCheckMs: 0,
  connectHousesMs: 0,
  aabbChecks: 0,
  aabbHits: 0,
  overlapChecks: 0,
  overlapHits: 0,
}


