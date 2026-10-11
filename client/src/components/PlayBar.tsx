import { useEffect } from 'react'
import { useHouseCanvas } from '../context/useHouseCanvas'
import styles from './PlayBar.module.css'

const MIN_SPEED = 1
const MAX_SPEED = 10

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.matches('input, select, textarea, button, summary') || target.isContentEditable)

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.icon}>
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.icon}>
      <path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" />
    </svg>
  )
}

function StepIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.icon}>
      <path d="M3 2.5v11l7.5-5.5zM11 2.5h2.5v11H11z" />
    </svg>
  )
}

function PlayBar() {
  const {
    isPlaying,
    setIsPlaying,
    stepSimulation,
    simulationSpeed,
    setSimulationSpeed,
    tickCount,
    world,
  } = useHouseCanvas()

  // Space toggles play/pause unless a control has focus (it handles Space itself).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isTypingTarget(event.target)) return
      event.preventDefault()
      setIsPlaying((current) => !current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setIsPlaying])

  return (
    <div className={styles.bar} role="toolbar" aria-label="Simulation">
      <button
        type="button"
        className={styles.roundButton}
        data-variant="primary"
        onClick={() => setIsPlaying((current) => !current)}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        className={styles.roundButton}
        onClick={stepSimulation}
        aria-label="Step one tick"
        title="Step one tick"
      >
        <StepIcon />
      </button>
      <label className={styles.speed}>
        <span className={styles.speedLabel}>{simulationSpeed}/s</span>
        <input
          type="range"
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={1}
          value={simulationSpeed}
          onChange={(event) => setSimulationSpeed(Number(event.target.value))}
          aria-label="Ticks per second"
        />
      </label>
      <p className={styles.stats}>
        <span>
          Tick <strong>{tickCount}</strong>
        </span>
        <span>
          <strong>{world.houses.length.toLocaleString()}</strong> houses
        </span>
      </p>
    </div>
  )
}

export default PlayBar
