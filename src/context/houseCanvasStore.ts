import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { HouseGeometry, HouseNode, Point } from '../types'

export type HouseCanvasContextValue = {
  zoom: number
  pan: Point
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
  resetView: () => void
  addHouse: () => void
}

export const HouseCanvasContext = createContext<HouseCanvasContextValue | null>(null)

