import type {
  HouseGeometry,
  HouseConnection,
  HouseNode,
  Point,
  Polygon,
  Segment,
  SideIndex,
  SideKind,
  Transform,
} from '../types'

export const ALL_SIDES: SideIndex[] = [0, 1, 2, 3, 4]

export const SIDE_KIND_BY_INDEX: Record<SideIndex, SideKind> = {
  0: 'down',
  1: 'side',
  2: 'roof',
  3: 'roof',
  4: 'side',
}

export const VIEW_BOX = {
  minX: -500,
  minY: -350,
  width: 1000,
  height: 700,
}

const HOUSE_TOP_Y = -20

export const IDENTITY_TRANSFORM: Transform = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
}

export const OVERLAP_EPSILON = 0.0001
export const MAX_PLACEMENT_ATTEMPTS = 200

export const createEmptySides = () => [null, null, null, null, null] as Array<HouseConnection | null>

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const randomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

export const applyTransform = (transform: Transform, point: Point): Point => ({
  x: transform.a * point.x + transform.c * point.y + transform.e,
  y: transform.b * point.x + transform.d * point.y + transform.f,
})

export const getHousePolygon = (geometry: HouseGeometry): Polygon => {
  const halfUnderside = geometry.undersideLength / 2
  const topY = HOUSE_TOP_Y
  const bottomY = topY + geometry.sideLength
  const apexY = topY - geometry.roofHeight

  return [
    { x: -halfUnderside, y: bottomY },
    { x: halfUnderside, y: bottomY },
    { x: halfUnderside, y: topY },
    { x: 0, y: apexY },
    { x: -halfUnderside, y: topY },
  ]
}

export const transformPolygon = (polygon: Polygon, transform: Transform): Polygon => {
  return polygon.map((point) => applyTransform(transform, point))
}

const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y

const getAxes = (polygon: Polygon): Point[] => {
  const axes: Point[] = []
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]
    const edge = { x: end.x - start.x, y: end.y - start.y }
    const normal = { x: 0, y: 0 }
    normal.x = -edge.y
    normal.y = edge.x
    const length = Math.hypot(normal.x, normal.y)
    if (length < OVERLAP_EPSILON) continue
    axes.push({ x: normal.x / length, y: normal.y / length })
  }
  return axes
}

const getProjection = (polygon: Polygon, axis: Point) => {
  let min = dot(polygon[0], axis)
  let max = min
  for (let index = 1; index < polygon.length; index += 1) {
    const value = dot(polygon[index], axis)
    if (value < min) min = value
    if (value > max) max = value
  }
  return { min, max }
}

export const polygonsOverlapArea = (a: Polygon, b: Polygon) => {
  const axes = [...getAxes(a), ...getAxes(b)]
  for (const axis of axes) {
    const aProjection = getProjection(a, axis)
    const bProjection = getProjection(b, axis)

    if (
      aProjection.max <= bProjection.min + OVERLAP_EPSILON ||
      bProjection.max <= aProjection.min + OVERLAP_EPSILON
    ) {
      return false
    }
  }
  return true
}

export const getSideSegment = (side: SideIndex, geometry: HouseGeometry): Segment => {
  const polygon = getHousePolygon(geometry)

  if (side === 0) return { start: polygon[0], end: polygon[1] }
  if (side === 1) return { start: polygon[1], end: polygon[2] }
  if (side === 2) return { start: polygon[2], end: polygon[3] }
  if (side === 3) return { start: polygon[3], end: polygon[4] }
  return { start: polygon[4], end: polygon[0] }
}

export const getFreeSides = (house: HouseNode) => {
  return ALL_SIDES.filter((side) => house.sides[side] === null)
}

export const getCompatibleSides = (side: SideIndex) => {
  return ALL_SIDES.filter((candidate) => SIDE_KIND_BY_INDEX[candidate] === SIDE_KIND_BY_INDEX[side])
}

export const computeChildTransform = (
  parentTransform: Transform,
  parentSide: SideIndex,
  ownSide: SideIndex,
  geometry: HouseGeometry,
): Transform => {
  const parentSegment = getSideSegment(parentSide, geometry)
  const ownSegment = getSideSegment(ownSide, geometry)

  const targetStart = applyTransform(parentTransform, parentSegment.end)
  const targetEnd = applyTransform(parentTransform, parentSegment.start)

  const ownVector = {
    x: ownSegment.end.x - ownSegment.start.x,
    y: ownSegment.end.y - ownSegment.start.y,
  }
  const targetVector = {
    x: targetEnd.x - targetStart.x,
    y: targetEnd.y - targetStart.y,
  }

  const ownAngle = Math.atan2(ownVector.y, ownVector.x)
  const targetAngle = Math.atan2(targetVector.y, targetVector.x)
  const angle = targetAngle - ownAngle

  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const tx = targetStart.x - (cos * ownSegment.start.x - sin * ownSegment.start.y)
  const ty = targetStart.y - (sin * ownSegment.start.x + cos * ownSegment.start.y)

  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: tx,
    f: ty,
  }
}

export const computeTransforms = (houses: HouseNode[], geometry: HouseGeometry) => {
  const transforms = new Map<number, Transform>()
  if (houses.length === 0) return transforms

  transforms.set(houses[0].id, IDENTITY_TRANSFORM)

  for (const house of houses) {
    if (house.parentId === null || house.parentSide === null || house.ownSide === null) {
      continue
    }

    const parentTransform = transforms.get(house.parentId)
    if (!parentTransform) continue

    transforms.set(
      house.id,
      computeChildTransform(parentTransform, house.parentSide, house.ownSide, geometry),
    )
  }

  return transforms
}

export const connectHouses = (
  houses: HouseNode[],
  hostHouseId: number,
  hostSide: SideIndex,
  newHouseId: number,
  newHouseSide: SideIndex,
) => {
  const nextHouses = houses.map((house) => {
    if (house.id !== hostHouseId) return house

    const updatedSides = [...house.sides]
    updatedSides[hostSide] = { houseId: newHouseId, side: newHouseSide }
    return { ...house, sides: updatedSides }
  })

  const newHouseSides = createEmptySides()
  newHouseSides[newHouseSide] = { houseId: hostHouseId, side: hostSide }

  nextHouses.push({
    id: newHouseId,
    sides: newHouseSides,
    parentId: hostHouseId,
    parentSide: hostSide,
    ownSide: newHouseSide,
  })

  return nextHouses
}

