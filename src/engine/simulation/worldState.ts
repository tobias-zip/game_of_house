import {
  computeTransforms,
  getHousePolygon,
  IDENTITY_TRANSFORM,
  transformPolygon,
} from '../../domain/house/geometry'
import type { HouseGeometry, HouseNode, Polygon } from '../../types'
import type { AABB, HouseWorldData, SimulationWorldState, SpatialIndex } from './types'

export const getPolygonBounds = (polygon: Polygon): AABB => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of polygon) {
    if (point.x < minX) minX = point.x
    if (point.y < minY) minY = point.y
    if (point.x > maxX) maxX = point.x
    if (point.y > maxY) maxY = point.y
  }

  return { minX, minY, maxX, maxY }
}

export const getGeometryKey = (houseGeometry: HouseGeometry) =>
  [
    houseGeometry.undersideLength,
    houseGeometry.sideLength,
    houseGeometry.roofHeight,
  ].join(':')

const toCellCoord = (value: number, cellSize: number) => Math.floor(value / cellSize)

const getCellKeysForBounds = (bounds: AABB, cellSize: number) => {
  const minCellX = toCellCoord(bounds.minX, cellSize)
  const maxCellX = toCellCoord(bounds.maxX, cellSize)
  const minCellY = toCellCoord(bounds.minY, cellSize)
  const maxCellY = toCellCoord(bounds.maxY, cellSize)

  const keys: string[] = []

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      keys.push(`${cellX}:${cellY}`)
    }
  }

  return keys
}

const createSpatialIndex = (cellSize: number): SpatialIndex => ({
  cellSize,
  cells: new Map<string, Set<number>>(),
})

export const insertIntoSpatialIndex = (
  spatialIndex: SpatialIndex,
  houseId: number,
  bounds: AABB,
) => {
  const cellKeys = getCellKeysForBounds(bounds, spatialIndex.cellSize)

  for (const cellKey of cellKeys) {
    const ids = spatialIndex.cells.get(cellKey)
    if (ids) {
      ids.add(houseId)
      continue
    }

    spatialIndex.cells.set(cellKey, new Set<number>([houseId]))
  }
}

export const removeFromSpatialIndex = (
  spatialIndex: SpatialIndex,
  houseId: number,
  bounds: AABB,
) => {
  const cellKeys = getCellKeysForBounds(bounds, spatialIndex.cellSize)

  for (const cellKey of cellKeys) {
    const ids = spatialIndex.cells.get(cellKey)
    if (!ids) continue

    ids.delete(houseId)
    if (ids.size === 0) {
      spatialIndex.cells.delete(cellKey)
    }
  }
}

export const querySpatialIndex = (spatialIndex: SpatialIndex, bounds: AABB) => {
  const houseIds = new Set<number>()
  const cellKeys = getCellKeysForBounds(bounds, spatialIndex.cellSize)

  for (const cellKey of cellKeys) {
    const ids = spatialIndex.cells.get(cellKey)
    if (!ids) continue
    for (const houseId of ids) {
      houseIds.add(houseId)
    }
  }

  return houseIds
}

export const worldStateNeedsRebuild = ({
  worldState,
  houses,
  houseGeometry,
}: {
  worldState?: SimulationWorldState
  houses: HouseNode[]
  houseGeometry: HouseGeometry
}) => {
  if (!worldState) return true
  if (worldState.geometryKey !== getGeometryKey(houseGeometry)) return true
  if (worldState.byHouseId.size !== houses.length) return true

  for (const house of houses) {
    if (!worldState.byHouseId.has(house.id)) {
      return true
    }
  }

  return false
}

export const buildWorldState = ({
  houses,
  houseGeometry,
}: {
  houses: HouseNode[]
  houseGeometry: HouseGeometry
}) => {
  const transforms = computeTransforms(houses, houseGeometry)
  const localHousePolygon = getHousePolygon(houseGeometry)
  const localBounds = getPolygonBounds(localHousePolygon)
  const maxSpan = Math.max(
    localBounds.maxX - localBounds.minX,
    localBounds.maxY - localBounds.minY,
  )
  const spatialIndex = createSpatialIndex(Math.max(1, maxSpan))
  const byHouseId = new Map<number, HouseWorldData>()

  for (const house of houses) {
    const transform = transforms.get(house.id) ?? IDENTITY_TRANSFORM
    const polygon = transformPolygon(localHousePolygon, transform)
    const bounds = getPolygonBounds(polygon)

    byHouseId.set(house.id, {
      transform,
      polygon,
      bounds,
    })
    insertIntoSpatialIndex(spatialIndex, house.id, bounds)
  }

  return {
    geometryKey: getGeometryKey(houseGeometry),
    byHouseId,
    spatialIndex,
  } satisfies SimulationWorldState
}
