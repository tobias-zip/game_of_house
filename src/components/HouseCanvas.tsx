import { useEffect, useRef, useState } from 'react'
import {
  clamp,
  computeTransforms,
  getHousePolygon,
  VIEW_BOX,
} from '../domain/house/geometry'
import { useHouseCanvas } from '../context/useHouseCanvas'

const getCentroid = (polygon: { x: number; y: number }[]) => {
  let x = 0
  let y = 0
  for (const point of polygon) {
    x += point.x
    y += point.y
  }
  return { x: x / polygon.length, y: y / polygon.length }
}

const drawConnectedSideTriangle = ({
  ctx,
  start,
  end,
  centroid,
}: {
  ctx: CanvasRenderingContext2D
  start: { x: number; y: number }
  end: { x: number; y: number }
  centroid: { x: number; y: number }
}) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length < 0.0001) return

  const ux = dx / length
  const uy = dy / length
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }

  const normalA = { x: -uy, y: ux }
  const normalB = { x: uy, y: -ux }
  const towardCenter = { x: centroid.x - midpoint.x, y: centroid.y - midpoint.y }
  const normal =
    normalA.x * towardCenter.x + normalA.y * towardCenter.y >= 0 ? normalA : normalB

  const baseHalf = 5
  const baseInset = 2
  const tipInset = 10

  const baseCenter = {
    x: midpoint.x + normal.x * baseInset,
    y: midpoint.y + normal.y * baseInset,
  }

  const left = {
    x: baseCenter.x - ux * baseHalf,
    y: baseCenter.y - uy * baseHalf,
  }
  const right = {
    x: baseCenter.x + ux * baseHalf,
    y: baseCenter.y + uy * baseHalf,
  }
  const tip = {
    x: midpoint.x + normal.x * tipInset,
    y: midpoint.y + normal.y * tipInset,
  }

  ctx.fillStyle = '#c00'
  ctx.beginPath()
  ctx.moveTo(left.x, left.y)
  ctx.lineTo(right.x, right.y)
  ctx.lineTo(tip.x, tip.y)
  ctx.closePath()
  ctx.fill()
}

function HouseCanvas() {
  const {
    houses,
    houseGeometry,
    pan,
    setPan,
    setZoom,
    zoom,
    fillColor,
    strokeColor,
    showConnectionSideIndicators,
  } =
    useHouseCanvas()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragState = useRef({ active: false, x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvas.parentElement) return

    const parent = canvas.parentElement
    const updateSize = () => {
      const width = parent.clientWidth
      const height = parent.clientHeight
      setCanvasSize((current) => {
        if (current.width === width && current.height === height) return current
        return { width, height }
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(canvasSize.width * dpr)
    canvas.height = Math.floor(canvasSize.height * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    const fitScale = Math.min(
      canvasSize.width / VIEW_BOX.width,
      canvasSize.height / VIEW_BOX.height,
    )
    const offsetX = (canvasSize.width - VIEW_BOX.width * fitScale) / 2
    const offsetY = (canvasSize.height - VIEW_BOX.height * fitScale) / 2

    ctx.translate(offsetX, offsetY)
    ctx.scale(fitScale, fitScale)
    ctx.translate(-VIEW_BOX.minX, -VIEW_BOX.minY)

    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    ctx.fillStyle = fillColor
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 1

    const transforms = computeTransforms(houses, houseGeometry)
    const housePolygon = getHousePolygon(houseGeometry)
    const centroid = getCentroid(housePolygon)

    for (const house of houses) {
      const transform = transforms.get(house.id)
      if (!transform) continue

      ctx.save()
      ctx.transform(
        transform.a,
        transform.b,
        transform.c,
        transform.d,
        transform.e,
        transform.f,
      )

      ctx.beginPath()
      ctx.moveTo(housePolygon[0].x, housePolygon[0].y)
      for (let index = 1; index < housePolygon.length; index += 1) {
        ctx.lineTo(housePolygon[index].x, housePolygon[index].y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      if (showConnectionSideIndicators) {
        for (let sideIndex = 0; sideIndex < house.sides.length; sideIndex += 1) {
          if (!house.sides[sideIndex]) continue
          const start = housePolygon[sideIndex]
          const end = housePolygon[(sideIndex + 1) % housePolygon.length]
          drawConnectedSideTriangle({ ctx, start, end, centroid })
        }

        ctx.fillStyle = fillColor
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 1
      }

      ctx.restore()
    }
  }, [
    canvasSize,
    fillColor,
    houseGeometry,
    houses,
    pan,
    showConnectionSideIndicators,
    strokeColor,
    zoom,
  ])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { active: true, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return
    const dx = event.clientX - dragState.current.x
    const dy = event.clientY - dragState.current.y
    dragState.current = { active: true, x: event.clientX, y: event.clientY }
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }))
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const factor = event.deltaY < 0 ? 1.1 : 0.9
    setZoom((current) => clamp(current * factor, 0.05, 4))
  }

  return (
    <div
      style={{ flex: 1, borderRight: '1px solid #ccc', overflow: 'hidden' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      />
    </div>
  )
}

export default HouseCanvas


