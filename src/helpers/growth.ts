import type { HouseGeometry, HouseNode } from '../types'
import {
  computeChildTransform,
  computeTransforms,
  getHousePolygon,
  polygonsOverlapArea,
  randomItem,
  transformPolygon,
} from './geometry'
import { connectHouses, createRootHouse, getCompatibleSides, getFreeSides } from './houseGraph'

const MAX_PLACEMENT_ATTEMPTS = 200

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

    return connectHouses(houses, hostHouse.id, hostSide, newHouseId, newHouseSide)
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

