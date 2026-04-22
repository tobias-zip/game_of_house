import { useContext } from 'react'
import { HouseCanvasContext } from './houseCanvasStore'

export function useHouseCanvas() {
  const context = useContext(HouseCanvasContext)
  if (!context) {
    throw new Error('useHouseCanvas must be used inside HouseCanvasProvider')
  }
  return context
}


