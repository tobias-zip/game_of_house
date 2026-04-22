import type { HouseGeometry, HouseNode, SideIndex, Transform } from '../../types'
import {
  OVERLAP_EPSILON,
  applyTransform,
  computeChildTransform,
  computeTransforms,
  getHousePolygon,
  getSideSegment,
  polygonsOverlapArea,
  randomItem,
  transformPolygon,
} from './geometry'
import {
  connectExistingHouses,
  connectHouses,
  createRootHouse,
  getCompatibleSides,
  getFreeSides,
} from './graph'

const MAX_PLACEMENT_ATTEMPTS = 200

const pointsAreNear = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y) <= OVERLAP_EPSILON

const transformedSegmentMatches = ({
  firstTransform,
  firstSide,
  secondTransform,
  secondSide,
  houseGeometry,
}: {
  firstTransform: Transform
  firstSide: SideIndex
  secondTransform: Transform
  secondSide: SideIndex
  houseGeometry: HouseGeometry
}) => {
  const firstSegment = getSideSegment(firstSide, houseGeometry)
  const secondSegment = getSideSegment(secondSide, houseGeometry)

  const firstStart = applyTransform(firstTransform, firstSegment.start)
  const firstEnd = applyTransform(firstTransform, firstSegment.end)
  const secondStart = applyTransform(secondTransform, secondSegment.start)
  const secondEnd = applyTransform(secondTransform, secondSegment.end)

  const sameDirection = pointsAreNear(firstStart, secondStart) && pointsAreNear(firstEnd, secondEnd)
  const oppositeDirection =
    pointsAreNear(firstStart, secondEnd) && pointsAreNear(firstEnd, secondStart)

  return sameDirection || oppositeDirection
}

const connectNearbyHouseSides = ({
  houses,
  newHouseId,
  newHouseTransform,
  currentTransforms,
  houseGeometry,
}: {
  houses: HouseNode[]
  newHouseId: number
  newHouseTransform: Transform
  currentTransforms: Map<number, Transform>
  houseGeometry: HouseGeometry
}) => {
  let nextHouses = houses

  for (const [nearbyHouseId, nearbyTransform] of currentTransforms) {
    if (nearbyHouseId === newHouseId) continue

    const newHouse = nextHouses.find((house) => house.id === newHouseId)
    const nearbyHouse = nextHouses.find((house) => house.id === nearbyHouseId)
    if (!newHouse || !nearbyHouse) continue

    const newHouseFreeSides = getFreeSides(newHouse)
    if (newHouseFreeSides.length === 0) break

    const nearbyFreeSides = new Set(getFreeSides(nearbyHouse))
    if (nearbyFreeSides.size === 0) continue

    let linked = false

    for (const newHouseSide of newHouseFreeSides) {
      const compatibleSides = getCompatibleSides(newHouseSide)

      for (const nearbySide of compatibleSides) {
        if (!nearbyFreeSides.has(nearbySide)) continue

        const matches = transformedSegmentMatches({
          firstTransform: newHouseTransform,
          firstSide: newHouseSide,
          secondTransform: nearbyTransform,
          secondSide: nearbySide,
          houseGeometry,
        })

        if (!matches) continue

        nextHouses = connectExistingHouses(
          nextHouses,
          newHouseId,
          newHouseSide,
          nearbyHouseId,
          nearbySide,
        )

        linked = true
        break
      }

      if (linked) break
    }
  }

  return nextHouses
}

const tryAttachHouse = (
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

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
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

    const attachedHouses = connectHouses(houses, hostHouse.id, hostSide, newHouseId, newHouseSide)

    return connectNearbyHouseSides({
      houses: attachedHouses,
      newHouseId,
      newHouseTransform: newTransform,
      currentTransforms,
      houseGeometry,
    })
  }

  return houses
}

export const addHouseToHost = (
  houses: HouseNode[],
  hostHouseId: number,
  houseGeometry: HouseGeometry,
  allowOverlap: boolean,
  newHouseId: number,
) => {
  return tryAttachHouse(houses, hostHouseId, houseGeometry, allowOverlap, newHouseId)
}

export const addRandomHouse = (
  houses: HouseNode[],
  houseGeometry: HouseGeometry,
  allowOverlap: boolean,
  newHouseId: number,
) => {
  if (houses.length === 0) return [createRootHouse(newHouseId)]

  const candidates = houses.filter((house) => getFreeSides(house).length > 0)
  if (candidates.length === 0) return houses

  const hostHouse = randomItem(candidates)
  return tryAttachHouse(houses, hostHouse.id, houseGeometry, allowOverlap, newHouseId)
}
