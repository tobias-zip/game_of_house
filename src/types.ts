export type Point = {
  x: number
  y: number
}

export type SideKind = 'down' | 'side' | 'roof'
export type SideIndex = 0 | 1 | 2 | 3 | 4
export type CoveredSideCount = 0 | 1 | 2 | 3 | 4 | 5
export type SideBehavior = 'die' | 'nothing' | 'grow'
export type SideBehaviorByCoverage = Record<CoveredSideCount, SideBehavior>

export const COVERED_SIDE_COUNTS: CoveredSideCount[] = [0, 1, 2, 3, 4, 5]
export const SIDE_BEHAVIOR_OPTIONS: SideBehavior[] = ['die', 'nothing', 'grow']
export const DEFAULT_SIDE_BEHAVIOR_BY_COVERAGE: SideBehaviorByCoverage = {
  0: 'die',
  1: 'grow',
  2: 'grow',
  3: 'nothing',
  4: 'die',
  5: 'die',
}

export type HouseConnection = {
  houseId: number
  side: SideIndex
}

export type HouseNode = {
  id: number
  sides: Array<HouseConnection | null>
  parentId: number | null
  parentSide: SideIndex | null
  ownSide: SideIndex | null
  rootTransform: Transform | null
}

export type Transform = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export type Segment = {
  start: Point
  end: Point
}

export type Polygon = Point[]

export type HouseGeometry = {
  undersideLength: number
  sideLength: number
  roofHeight: number
}

