export type Point = {
  x: number
  y: number
}

export type SideKind = 'down' | 'side' | 'roof'
export type SideIndex = 0 | 1 | 2 | 3 | 4

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

