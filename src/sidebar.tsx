import { useHouseCanvas } from './context/useHouseCanvas'
import {
  COVERED_SIDE_COUNTS,
  SIDE_BEHAVIOR_OPTIONS,
  type SideBehavior,
} from './types'

const isSideBehavior = (value: string): value is SideBehavior =>
  SIDE_BEHAVIOR_OPTIONS.includes(value as SideBehavior)

function Sidebar() {
  const {
    addHouse,
    allowOverlap,
    debugProfilingEnabled,
    fillColor,
    isPlaying,
    resetView,
    roofAngle,
    setIsPlaying,
    setSimulationSpeed,
    setSideScale,
    setAllowOverlap,
    setFillColor,
    setRoofAngle,
    setStrokeColor,
    setSideBehavior,
    setDebugProfilingEnabled,
    setUndersideScale,
    simulationSpeed,
    sideBehaviorByCoverage,
    sideScale,
    strokeColor,
    tickCount,
    undersideScale,
  } = useHouseCanvas()

  return (
    <aside style={{ width: 260, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Settings</h2>

      <fieldset style={{ margin: '0 0 12px 0' }}>
        <legend>Simulation</legend>
        <button
          type="button"
          onClick={() => setIsPlaying((current) => !current)}
          style={{ padding: '6px 10px', cursor: 'pointer' }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <p style={{ margin: '8px 0 0 0' }}>Tick: {tickCount}</p>
        <label style={{ display: 'block', marginTop: 8 }}>
          <input
            type="checkbox"
            checked={debugProfilingEnabled}
            onChange={(event) => setDebugProfilingEnabled(event.target.checked)}
          />{' '}
          Debug profiling logs
        </label>
        <label htmlFor="simulation-speed" style={{ display: 'block', marginTop: 12 }}>
          Speed: {simulationSpeed}
        </label>
        <input
          id="simulation-speed"
          type="range"
          min={1}
          max={10}
          step={1}
          value={simulationSpeed}
          onChange={(event) => setSimulationSpeed(Number(event.target.value))}
          style={{ width: '100%' }}
        />
        {COVERED_SIDE_COUNTS.map((coveredSides) => (
          <div key={coveredSides} style={{ marginTop: 12 }}>
            <label htmlFor={`coverage-${coveredSides}`} style={{ display: 'block' }}>
              {coveredSides} sides covered
            </label>
            <select
              id={`coverage-${coveredSides}`}
              value={sideBehaviorByCoverage[coveredSides]}
              onChange={(event) => {
                const { value } = event.target
                if (isSideBehavior(value)) {
                  setSideBehavior(coveredSides, value)
                }
              }}
              style={{ width: '100%' }}
            >
              {SIDE_BEHAVIOR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>

      <fieldset style={{ margin: '0 0 12px 0' }}>
        <legend>Growth</legend>
        <button
          type="button"
          onClick={addHouse}
          style={{ padding: '6px 10px', cursor: 'pointer' }}
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
      </fieldset>

      <fieldset style={{ margin: '0 0 12px 0' }}>
        <legend>Geometry</legend>
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
        <label htmlFor="side-scale" style={{ display: 'block', marginTop: 12 }}>
          Left/right side: {sideScale.toFixed(2)}
        </label>
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
        <label htmlFor="roof-angle" style={{ display: 'block', marginTop: 12 }}>
          Angle: {Math.round(roofAngle)}deg
        </label>
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
      </fieldset>

      <fieldset style={{ margin: '0 0 12px 0' }}>
        <legend>Style</legend>
        <label htmlFor="fill-color" style={{ display: 'block' }}>
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
      </fieldset>

      <fieldset style={{ margin: 0 }}>
        <legend>View</legend>
        <button type="button" onClick={resetView} style={{ padding: '6px 10px', cursor: 'pointer' }}>
          Reset view
        </button>
      </fieldset>

      <p style={{ color: '#666' }}>Drag to pan. Scroll to zoom.</p>
    </aside>
  )
}

export default Sidebar

