import { useHouseCanvas } from './context/useHouseCanvas'

function Sidebar() {
  const {
    addHouse,
    allowOverlap,
    fillColor,
    resetView,
    roofAngle,
    setSideScale,
    setAllowOverlap,
    setFillColor,
    setRoofAngle,
    setStrokeColor,
    setUndersideScale,
    sideScale,
    strokeColor,
    undersideScale,
  } = useHouseCanvas()

  return (
    <aside style={{ width: 260, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Settings</h2>
      <label htmlFor="underside-scale">Underside: {undersideScale.toFixed(2)}</label>
      <input
        id="underside-scale"
        type="range"
        min={0.2}
        max={1.8}
        step={0.01}
        value={undersideScale}
        onChange={(event) => setUndersideScale(Number(event.target.value))}
        style={{ width: '100%' }}
      />
      <label htmlFor="side-scale">Left/right side: {sideScale.toFixed(2)}</label>
      <input
        id="side-scale"
        type="range"
        min={0.2}
        max={1}
        step={0.01}
        value={sideScale}
        onChange={(event) => setSideScale(Number(event.target.value))}
        style={{ width: '100%' }}
      />
      <label htmlFor="roof-angle">Angle: {Math.round(roofAngle)}deg</label>
      <input
        id="roof-angle"
        type="range"
        min={20}
        max={160}
        step={1}
        value={roofAngle}
        onChange={(event) => setRoofAngle(Number(event.target.value))}
        style={{ width: '100%' }}
      />
      <button
        type="button"
        onClick={resetView}
        style={{ marginTop: 12, padding: '6px 10px', cursor: 'pointer' }}
      >
        Reset view
      </button>
      <button
        type="button"
        onClick={addHouse}
        style={{ marginTop: 8, padding: '6px 10px', cursor: 'pointer' }}
      >
        Add house
      </button>
      <label style={{ display: 'block', marginTop: 12 }}>
        <input
          type="checkbox"
          checked={allowOverlap}
          onChange={(event) => setAllowOverlap(event.target.checked)}
        />{' '}
        Allow overlap
      </label>
      <label htmlFor="fill-color" style={{ display: 'block', marginTop: 12 }}>
        Fill color
      </label>
      <input
        id="fill-color"
        type="color"
        value={fillColor}
        onChange={(event) => setFillColor(event.target.value)}
      />
      <label htmlFor="stroke-color" style={{ display: 'block', marginTop: 12 }}>
        Stroke color
      </label>
      <input
        id="stroke-color"
        type="color"
        value={strokeColor}
        onChange={(event) => setStrokeColor(event.target.value)}
      />
      <p style={{ color: '#666' }}>Drag to pan. Scroll to zoom.</p>
    </aside>
  )
}

export default Sidebar

