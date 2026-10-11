import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { SimulationWorld } from '../engine/simulation/types'
import type { ThemeName } from '../theme'
import type {
  HouseGeometry,
  ClickAction,
  RippleParams,
  CoveredSideCount,
  SideBehavior,
  SideBehaviorByCoverage,
} from '../types'

// Shown when the simulation paused itself because ticks got too slow.
export type OverloadNotice = {
  houseCount: number
}

export type HouseCanvasContextValue = {
  world: SimulationWorld
  isPlaying: boolean
  debugProfilingEnabled: boolean
  showConnectionSideIndicators: boolean
  tickCount: number
  simulationSpeed: number
  sideBehaviorByCoverage: SideBehaviorByCoverage
  undersideScale: number
  sideScale: number
  roofAngle: number
  houseGeometry: HouseGeometry
  allowOverlap: boolean
  themeName: ThemeName
  colorBySides: boolean
  fillColor: string
  strokeColor: string
  clickAction: ClickAction
  rippleParams: RippleParams
  overload: OverloadNotice | null
  setUndersideScale: Dispatch<SetStateAction<number>>
  setSideScale: Dispatch<SetStateAction<number>>
  setRoofAngle: Dispatch<SetStateAction<number>>
  setAllowOverlap: Dispatch<SetStateAction<boolean>>
  setThemeName: (themeName: ThemeName) => void
  setColorBySides: Dispatch<SetStateAction<boolean>>
  setFillColor: Dispatch<SetStateAction<string>>
  setStrokeColor: Dispatch<SetStateAction<string>>
  setIsPlaying: Dispatch<SetStateAction<boolean>>
  setDebugProfilingEnabled: Dispatch<SetStateAction<boolean>>
  setShowConnectionSideIndicators: Dispatch<SetStateAction<boolean>>
  setSimulationSpeed: Dispatch<SetStateAction<number>>
  setSideBehavior: (coveredSides: CoveredSideCount, behavior: SideBehavior) => void
  applyRules: (rules: SideBehaviorByCoverage) => void
  setClickAction: Dispatch<SetStateAction<ClickAction>>
  setRippleParams: Dispatch<SetStateAction<RippleParams>>
  stepSimulation: () => void
  addHouse: () => void
  resetWorld: () => void
  keepGoingAfterOverload: () => void
}

export const HouseCanvasContext = createContext<HouseCanvasContextValue | null>(null)
