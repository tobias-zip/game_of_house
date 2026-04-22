import {
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  MAX_PLACEMENT_ATTEMPTS,
  computeChildTransform,
  computeTransforms,
  connectHouses,
  createEmptySides,
  getCompatibleSides,
  getFreeSides,
  getHousePolygon,
  polygonsOverlapArea,
  randomItem,
  transformPolygon,
} from '../helpers/geometry'
import { HouseCanvasContext } from './houseCanvasStore'
import type { HouseGeometry, HouseNode, Point } from '../types'

type HouseCanvasProviderProps = {
  children: ReactNode
}

export function HouseCanvasProvider({ children }: HouseCanvasProviderProps) {
  const [undersideScale, setUndersideScale] = useState(1)
  const [sideScale, setSideScale] = useState(0.68)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [roofAngle, setRoofAngle] = useState(80)
  const [allowOverlap, setAllowOverlap] = useState(false)
  const [fillColor, setFillColor] = useState('#d9d9d9')
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [houses, setHouses] = useState<HouseNode[]>([
    {
      id: 0,
      sides: createEmptySides(),
      parentId: null,
      parentSide: null,
      ownSide: null,
    },
  ])

  const nextHouseIdRef = useRef(1)

  const houseGeometry = useMemo<HouseGeometry>(() => {
    const baseUnderside = 120
    const undersideLength = baseUnderside * undersideScale
    const sideLength = baseUnderside * sideScale
    const halfAngleRad = (roofAngle * Math.PI) / 360
    const roofHeight = (undersideLength / 2) / Math.tan(halfAngleRad)

    return {
      undersideLength,
      sideLength,
      roofHeight,
    }
  }, [roofAngle, sideScale, undersideScale])

  const roofHeight = houseGeometry.roofHeight

  const resetView = () => {
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }

  const addHouse = () => {
    setHouses((current) => {
      const candidates = current.filter((house) => getFreeSides(house).length > 0)
      if (candidates.length === 0) return current

      const currentTransforms = computeTransforms(current, houseGeometry)
      const localHousePolygon = getHousePolygon(houseGeometry)

      for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
        const hostHouse = randomItem(candidates)
        const hostSide = randomItem(getFreeSides(hostHouse))
        const newHouseSide = randomItem(getCompatibleSides(hostSide))

        const parentTransform = currentTransforms.get(hostHouse.id)
        if (!parentTransform) continue

        const newTransform = computeChildTransform(
          parentTransform,
          hostSide,
          newHouseSide,
          houseGeometry,
        )

        if (!allowOverlap) {
          const newPolygon = transformPolygon(localHousePolygon, newTransform)
          let overlaps = false

          for (const house of current) {
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

        const newHouseId = nextHouseIdRef.current
        nextHouseIdRef.current += 1

        return connectHouses(current, hostHouse.id, hostSide, newHouseId, newHouseSide)
      }

      return current
    })
  }

  return (
    <HouseCanvasContext.Provider
      value={{
        zoom,
        pan,
        undersideScale,
        sideScale,
        roofAngle,
        roofHeight,
        houseGeometry,
        allowOverlap,
        fillColor,
        strokeColor,
        houses,
        setUndersideScale,
        setSideScale,
        setRoofAngle,
        setAllowOverlap,
        setFillColor,
        setStrokeColor,
        setPan,
        setZoom,
        resetView,
        addHouse,
      }}
    >
      {children}
    </HouseCanvasContext.Provider>
  )
}


