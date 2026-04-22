import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  createRootHouse,
} from '../domain/house/graph'
import { addRandomHouse } from '../domain/house/growth'
import { runSimulationTick } from '../engine/simulation/runTick'
import type { SimulationWorldState } from '../engine/simulation/types'
import { HouseCanvasContext } from './HouseCanvasContext'
import {
  type HouseGeometry,
  type HouseNode,
  type Point,
} from '../types'

type CoveredSideCount = 0 | 1 | 2 | 3 | 4 | 5
type SideBehavior = 'die' | 'nothing' | 'grow'
type SideBehaviorByCoverage = Record<CoveredSideCount, SideBehavior>

const DEFAULT_SIDE_BEHAVIOR_BY_COVERAGE: SideBehaviorByCoverage = {
  0: 'die',
  1: 'grow',
  2: 'grow',
  3: 'nothing',
  4: 'die',
  5: 'die',
}

type HouseCanvasProviderProps = {
  children: ReactNode
}

export function HouseCanvasProvider({ children }: HouseCanvasProviderProps) {
  const [undersideScale, setUndersideScale] = useState(1)
  const [sideScale, setSideScale] = useState(0.68)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [isPlaying, setIsPlaying] = useState(false)
  const [debugProfilingEnabled, setDebugProfilingEnabled] = useState(false)
  const [showConnectionSideIndicators, setShowConnectionSideIndicators] = useState(false)
  const [tickCount, setTickCount] = useState(0)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [sideBehaviorByCoverage, setSideBehaviorByCoverage] = useState<SideBehaviorByCoverage>(
    DEFAULT_SIDE_BEHAVIOR_BY_COVERAGE,
  )
  const [roofAngle, setRoofAngle] = useState(80)
  const [allowOverlap, setAllowOverlap] = useState(false)
  const [fillColor, setFillColor] = useState('#d9d9d9')
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [houses, setHouses] = useState<HouseNode[]>([
    createRootHouse(0),
  ])

  const nextHouseIdRef = useRef(1)
  const tickCountRef = useRef(0)
  const simulationWorldStateRef = useRef<SimulationWorldState | undefined>(undefined)

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
    setHouses((current: HouseNode[]) => {
      const nextHouseId = nextHouseIdRef.current
      const next = addRandomHouse(current, houseGeometry, allowOverlap, nextHouseId)

      if (next !== current) {
        nextHouseIdRef.current += 1
        simulationWorldStateRef.current = undefined
      }

      return next
    })
  }

  const setSideBehavior = (coveredSides: CoveredSideCount, behavior: SideBehavior) => {
    setSideBehaviorByCoverage((current: SideBehaviorByCoverage) => ({
      ...current,
      [coveredSides]: behavior,
    }))
  }

  useEffect(() => {
    simulationWorldStateRef.current = undefined
  }, [houseGeometry])

  useEffect(() => {
    if (!isPlaying) return

    const intervalMs = 1000 / simulationSpeed
    const intervalId = window.setInterval(() => {
      setHouses((current) => {
        const result = runSimulationTick({
          houses: current,
          sideBehaviorByCoverage,
          houseGeometry,
          allowOverlap,
          nextHouseId: nextHouseIdRef.current,
          worldState: simulationWorldStateRef.current,
          debugProfilingEnabled,
        })

        nextHouseIdRef.current = result.nextHouseId
        simulationWorldStateRef.current = result.worldState

        if (debugProfilingEnabled && result.profile) {
          const tick = tickCountRef.current + 1
          console.log('[sim-profile]', {
            tick,
            ...result.profile,
          })
        }

        return result.houses
      })
      tickCountRef.current += 1
      setTickCount(tickCountRef.current)
    }, intervalMs)

    return () => window.clearInterval(intervalId)
  }, [
    allowOverlap,
    debugProfilingEnabled,
    houseGeometry,
    isPlaying,
    sideBehaviorByCoverage,
    simulationSpeed,
  ])

  return (
    <HouseCanvasContext.Provider
      value={{
        zoom,
        pan,
        isPlaying,
        debugProfilingEnabled,
        showConnectionSideIndicators,
        tickCount,
        simulationSpeed,
        sideBehaviorByCoverage,
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
        setIsPlaying,
        setDebugProfilingEnabled,
        setShowConnectionSideIndicators,
        setSimulationSpeed,
        setSideBehavior,
        resetView,
        addHouse,
      }}
    >
      {children}
    </HouseCanvasContext.Provider>
  )
}





