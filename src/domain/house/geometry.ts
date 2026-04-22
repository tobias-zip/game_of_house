import type {
  HouseGeometry,
  HouseNode,
  Point,
  Polygon,
  Segment,
  SideIndex,
  Transform,
} from '../../types'


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
  return polygon.map((point: Point) => applyTransform(transform, point))
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

  // Supports a forest of roots so detached survivors can still render and regrow.
  for (const house of houses) {
    if (house.parentId === null || house.parentSide === null || house.ownSide === null) {
      transforms.set(house.id, house.rootTransform ?? IDENTITY_TRANSFORM)
    }
  }

  let changed = true
  while (changed) {
    changed = false
    for (const house of houses) {
      if (transforms.has(house.id)) continue
      if (house.parentId === null || house.parentSide === null || house.ownSide === null) {
        transforms.set(house.id, house.rootTransform ?? IDENTITY_TRANSFORM)
        changed = true
        continue
      }

      const parentTransform = transforms.get(house.parentId)
      if (!parentTransform) continue

      transforms.set(
        house.id,
        computeChildTransform(parentTransform, house.parentSide, house.ownSide, geometry),
      )
      changed = true
    }
  }

  for (const house of houses) {
    if (!transforms.has(house.id)) {
      transforms.set(house.id, IDENTITY_TRANSFORM)
    }
  }

  return transforms
}


