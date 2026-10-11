import { useHouseCanvas } from '../context/useHouseCanvas'
import styles from './Sidebar.module.css'
import {
  COVERED_SIDE_COUNTS,
  SIDE_BEHAVIOR_OPTIONS,
  CLICK_ACTION_OPTIONS,
  type CoveredSideCount,
  type SideBehavior,
  type ClickAction,
} from '../types'

const isSideBehavior = (value: string): value is SideBehavior =>
  SIDE_BEHAVIOR_OPTIONS.includes(value as SideBehavior)

const isClickAction = (value: string): value is ClickAction =>
  CLICK_ACTION_OPTIONS.includes(value as ClickAction)

function Sidebar() {
  const {
    addHouse,
    allowOverlap,
    debugProfilingEnabled,
    showConnectionSideIndicators,
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
    setShowConnectionSideIndicators,
    setUndersideScale,
    simulationSpeed,
    sideBehaviorByCoverage,
    sideScale,
    strokeColor,
    tickCount,
    undersideScale,
    clickAction,
    rippleParams,
    setClickAction,
    setRippleParams,
  } = useHouseCanvas()

  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>Settings</h2>

      <fieldset className={styles.section}>
        <legend>Simulation</legend>
        <button
          type="button"
          onClick={() => setIsPlaying((current: boolean) => !current)}
          className={styles.button}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <p className={styles.tick}>Tick: {tickCount}</p>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={debugProfilingEnabled}
            onChange={(event) => setDebugProfilingEnabled(event.target.checked)}
          />{' '}
          Debug profiling logs
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={showConnectionSideIndicators}
            onChange={(event) => setShowConnectionSideIndicators(event.target.checked)}
          />{' '}
          Show connected sides
        </label>
        <label htmlFor="simulation-speed" className={styles.spacedLabel}>
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
          className={styles.fullWidth}
        />
        {COVERED_SIDE_COUNTS.map((coveredSides: CoveredSideCount) => (
          <div key={coveredSides} className={styles.group}>
            <label htmlFor={`coverage-${coveredSides}`} className={styles.label}>
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
              className={styles.fullWidth}
            >
              {SIDE_BEHAVIOR_OPTIONS.map((option: SideBehavior) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>

      <fieldset className={styles.section}>
        <legend>Growth</legend>
        <button type="button" onClick={addHouse} className={styles.button}>
          Add house
        </button>
        <label className={styles.spacedLabel}>
          <input
            type="checkbox"
            checked={allowOverlap}
            onChange={(event) => setAllowOverlap(event.target.checked)}
          />{' '}
          Allow overlap
        </label>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>Click Action</legend>
        <label htmlFor="click-action" className={styles.label}>
          Action
        </label>
        <select
          id="click-action"
          value={clickAction}
          onChange={(event) => {
            const { value } = event.target
            if (isClickAction(value)) {
              setClickAction(value)
            }
          }}
          className={styles.fullWidth}
        >
          {CLICK_ACTION_OPTIONS.map((option: ClickAction) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {clickAction === 'ripple' && (
          <div className={styles.group}>
            <label htmlFor="ripple-color" className={styles.label}>
              Color
            </label>
            <input
              id="ripple-color"
              type="color"
              value={rippleParams.color}
              onChange={(event) =>
                setRippleParams((current) => ({
                  ...current,
                  color: event.target.value,
                }))
              }
              className={styles.fullWidth}
            />

            <label htmlFor="ripple-opacity" className={styles.spacedLabel}>
              Opacity: {rippleParams.opacity.toFixed(2)}
            </label>
            <input
              id="ripple-opacity"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={rippleParams.opacity}
              onChange={(event) =>
                setRippleParams((current) => ({
                  ...current,
                  opacity: Number(event.target.value),
                }))
              }
              className={styles.fullWidth}
            />

            <label htmlFor="ripple-speed" className={styles.spacedLabel}>
              Speed: {rippleParams.speed.toFixed(0)}
            </label>
            <input
              id="ripple-speed"
              type="range"
              min={10}
              max={100}
              step={1}
              value={rippleParams.speed}
              onChange={(event) =>
                setRippleParams((current) => ({
                  ...current,
                  speed: Number(event.target.value),
                }))
              }
              className={styles.fullWidth}
            />

            <label htmlFor="ripple-range" className={styles.spacedLabel}>
              Range (hops): {rippleParams.range.toFixed(0)}
            </label>
            <input
              id="ripple-range"
              type="range"
              min={1}
              max={100}
              step={1}
              value={rippleParams.range}
              onChange={(event) =>
                setRippleParams((current) => ({
                  ...current,
                  range: Number(event.target.value),
                }))
              }
              className={styles.fullWidth}
            />

            <label htmlFor="ripple-lifetime" className={styles.spacedLabel}>
              Lifetime: {rippleParams.lifetime.toFixed(0)}ms
            </label>
            <input
              id="ripple-lifetime"
              type="range"
              min={10}
              max={1000}
              step={10}
              value={rippleParams.lifetime}
              onChange={(event) =>
                setRippleParams((current) => ({
                  ...current,
                  lifetime: Number(event.target.value),
                }))
              }
              className={styles.fullWidth}
            />
          </div>
        )}
      </fieldset>

      <fieldset className={styles.section}>
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
          className={styles.fullWidth}
        />
        <label htmlFor="side-scale" className={styles.spacedLabel}>
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
          className={styles.fullWidth}
        />
        <label htmlFor="roof-angle" className={styles.spacedLabel}>
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
          className={styles.fullWidth}
        />
      </fieldset>

      <fieldset className={styles.section}>
        <legend>Style</legend>
        <label htmlFor="fill-color" className={styles.label}>
          Fill color
        </label>
        <input
          id="fill-color"
          type="color"
          value={fillColor}
          onChange={(event) => setFillColor(event.target.value)}
        />
        <label htmlFor="stroke-color" className={styles.spacedLabel}>
          Stroke color
        </label>
        <input
          id="stroke-color"
          type="color"
          value={strokeColor}
          onChange={(event) => setStrokeColor(event.target.value)}
        />
      </fieldset>

      <fieldset className={styles.section}>
        <legend>View</legend>
        <button type="button" onClick={resetView} className={styles.button}>
          Reset view
        </button>
      </fieldset>

      <p className={styles.hint}>Drag to pan. Scroll to zoom.</p>
    </aside>
  )
}

export default Sidebar
