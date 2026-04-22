import type { HouseGeometry, HouseNode, Polygon, Transform } from '../../types'
import type { GrowTimingStats, SimulationTickProfile } from './profiling'

export type CoveredSideCount = 0 | 1 | 2 | 3 | 4 | 5
export type SideBehavior = 'die' | 'nothing' | 'grow'
export type SideBehaviorByCoverage = Record<CoveredSideCount, SideBehavior>

export type AABB = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type HouseWorldData = {
  transform: Transform
  polygon: Polygon
  bounds: AABB
}

export type SpatialIndex = {
  cellSize: number
  cells: Map<string, Set<number>>
}

export type SimulationWorldState = {
  geometryKey: string
  byHouseId: Map<number, HouseWorldData>
  spatialIndex: SpatialIndex
}

export type RunSimulationTickInput = {
  houses: HouseNode[]
  sideBehaviorByCoverage: SideBehaviorByCoverage
  houseGeometry: HouseGeometry
  allowOverlap: boolean
  nextHouseId: number
  worldState?: SimulationWorldState
  debugProfilingEnabled?: boolean
}

export type RunSimulationTickResult = {
  houses: HouseNode[]
  nextHouseId: number
  worldState?: SimulationWorldState
  profile?: SimulationTickProfile
}

export type TryGrowFromHostResult = {
  houses: HouseNode[]
  growTiming: GrowTimingStats
  candidateCount: number
  candidateUniqueCount: number
  indexQueryMs: number
  indexUpdateMs: number
  newHouseTransform?: Transform
  newHousePolygon?: Polygon
  newHouseBounds?: AABB
}
