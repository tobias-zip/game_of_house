import { getHousePolygon, IDENTITY_TRANSFORM, randomItem } from '../../domain/house/geometry'
import { copyHouses, createRootHouse, getFreeSides } from '../../domain/house/graph'
import type { HouseGeometry, HouseNode } from '../../types'
import { tryGrowFromHost } from './growFromHost'
import type { SimulationWorldState } from './types'
import { getPolygonBounds, insertIntoSpatialIndex } from './worldState'

// Attaches a new house to a random host with a free side; with no houses it places a root.
// Returns the new house list, or null when no house fits. Updates `worldState` in place.
export const addRandomHouse = ({
  houses,
  worldState,
  houseGeometry,
  allowOverlap,
  newHouseId,
}: {
  houses: HouseNode[]
  worldState: SimulationWorldState
  houseGeometry: HouseGeometry
  allowOverlap: boolean
  newHouseId: number
}): HouseNode[] | null => {
  const localHousePolygon = getHousePolygon(houseGeometry)

  if (houses.length === 0) {
    const polygon = localHousePolygon
    const bounds = getPolygonBounds(polygon)
    worldState.byHouseId.set(newHouseId, { transform: IDENTITY_TRANSFORM, polygon, bounds })
    insertIntoSpatialIndex(worldState.spatialIndex, newHouseId, bounds)
    return [createRootHouse(newHouseId)]
  }

  const hosts = houses.filter((house) => getFreeSides(house).length > 0)
  if (hosts.length === 0) return null

  const houseById = copyHouses(houses)
  const grown = tryGrowFromHost({
    houseById,
    hostHouseId: randomItem(hosts).id,
    houseGeometry,
    allowOverlap,
    newHouseId,
    worldState,
    localHousePolygon,
  })
  if (!grown.newHouse) return null

  worldState.byHouseId.set(newHouseId, grown.newHouse)
  insertIntoSpatialIndex(worldState.spatialIndex, newHouseId, grown.newHouse.bounds)
  return Array.from(houseById.values())
}
