import { useContext } from 'react'
import { HouseCanvasContext } from './HouseCanvasContext'

export function useHouseCanvas() {
  const context = useContext(HouseCanvasContext)
  if (!context) {
    throw new Error('useHouseCanvas must be used inside HouseCanvasProvider')
  }
  return context
}


