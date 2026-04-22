import { createContext, type Dispatch, type SetStateAction } from 'react'
import type {
  HouseGeometry,
  HouseNode,
  Point,
} from '../types'

type CoveredSideCount = 0 | 1 | 2 | 3 | 4 | 5
type SideBehavior = 'die' | 'nothing' | 'grow'
type SideBehaviorByCoverage = Record<CoveredSideCount, SideBehavior>

export type HouseCanvasContextValue = {
  zoom: number
  pan: Point
  isPlaying: boolean
  debugProfilingEnabled: boolean
  tickCount: number
  simulationSpeed: number
  sideBehaviorByCoverage: SideBehaviorByCoverage
  undersideScale: number
  sideScale: number
  roofAngle: number
  roofHeight: number
  houseGeometry: HouseGeometry
  allowOverlap: boolean
  fillColor: string
  strokeColor: string
  houses: HouseNode[]
  setUndersideScale: Dispatch<SetStateAction<number>>
  setSideScale: Dispatch<SetStateAction<number>>
  setRoofAngle: Dispatch<SetStateAction<number>>
  setAllowOverlap: Dispatch<SetStateAction<boolean>>
  setFillColor: Dispatch<SetStateAction<string>>
  setStrokeColor: Dispatch<SetStateAction<string>>
  setPan: Dispatch<SetStateAction<Point>>
  setZoom: Dispatch<SetStateAction<number>>
  setIsPlaying: Dispatch<SetStateAction<boolean>>
  setDebugProfilingEnabled: Dispatch<SetStateAction<boolean>>
  setSimulationSpeed: Dispatch<SetStateAction<number>>
  setSideBehavior: (coveredSides: CoveredSideCount, behavior: SideBehavior) => void
  resetView: () => void
  addHouse: () => void
}

export const HouseCanvasContext = createContext<HouseCanvasContextValue | null>(null)

