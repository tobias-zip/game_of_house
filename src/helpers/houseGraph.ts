import type { HouseConnection, HouseNode, SideIndex, SideKind } from '../types'

export const ALL_SIDES: SideIndex[] = [0, 1, 2, 3, 4]

export const SIDE_KIND_BY_INDEX: Record<SideIndex, SideKind> = {
  0: 'down',
  1: 'side',
  2: 'roof',
  3: 'roof',
  4: 'side',
}

export const createEmptySides = () => [null, null, null, null, null] as Array<HouseConnection | null>

export const createRootHouse = (id: number): HouseNode => ({
  id,
  sides: createEmptySides(),
  parentId: null,
  parentSide: null,
  ownSide: null,
  rootTransform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
})

export const getFreeSides = (house: HouseNode) => {
  return ALL_SIDES.filter((side) => house.sides[side] === null)
}

export const getCompatibleSides = (side: SideIndex) => {
  return ALL_SIDES.filter((candidate) => SIDE_KIND_BY_INDEX[candidate] === SIDE_KIND_BY_INDEX[side])
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
    rootTransform: null,
  })

  return nextHouses
}

