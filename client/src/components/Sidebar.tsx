import { useState } from "react";
import { useHouseCanvas } from "../context/useHouseCanvas";
import { getHousePolygon } from "../domain/house/geometry";
import { createRandomRules, decodeRules, findPresetForRules, RULE_PRESETS } from "../rules";
import { THEME_NAMES, THEMES, type ThemeName } from "../theme";
import {
    CLICK_ACTION_OPTIONS,
    type ClickAction,
    COVERED_SIDE_COUNTS,
    type CoveredSideCount,
    type HouseGeometry,
    SIDE_BEHAVIOR_OPTIONS,
    type SideBehavior,
} from "../types";
import styles from "./Sidebar.module.css";

const CUSTOM_PRESET_VALUE = "custom";
const COPY_STATUS_RESET_MS = 2000;

const isSideBehavior = (value: string): value is SideBehavior =>
    SIDE_BEHAVIOR_OPTIONS.includes(value as SideBehavior);

const isClickAction = (value: string): value is ClickAction =>
    CLICK_ACTION_OPTIONS.includes(value as ClickAction);

const isThemeName = (value: string): value is ThemeName => THEME_NAMES.includes(value as ThemeName);

function HouseShapePreview({ houseGeometry }: { houseGeometry: HouseGeometry }) {
    const polygon = getHousePolygon(houseGeometry);
    const xs = polygon.map((point) => point.x);
    const ys = polygon.map((point) => point.y);
    const padding = 4;
    const minX = Math.min(...xs) - padding;
    const minY = Math.min(...ys) - padding;
    const width = Math.max(...xs) - Math.min(...xs) + padding * 2;
    const height = Math.max(...ys) - Math.min(...ys) + padding * 2;

    return (
        <svg
            className={styles.shapePreview}
            viewBox={`${minX} ${minY} ${width} ${height}`}
            role="img"
            aria-label="House shape preview"
        >
            <polygon points={polygon.map((point) => `${point.x},${point.y}`).join(" ")} />
        </svg>
    );
}

type SidebarProps = {
    isOpen: boolean;
    onClose: () => void;
};

function Sidebar({ isOpen, onClose }: SidebarProps) {
    const {
        addHouse,
        resetWorld,
        applyRules,
        allowOverlap,
        debugProfilingEnabled,
        showConnectionSideIndicators,
        fillColor,
        roofAngle,
        houseGeometry,
        setSideScale,
        setAllowOverlap,
        setFillColor,
        setRoofAngle,
        setStrokeColor,
        setSideBehavior,
        setDebugProfilingEnabled,
        setShowConnectionSideIndicators,
        setUndersideScale,
        sideBehaviorByCoverage,
        sideScale,
        strokeColor,
        undersideScale,
        themeName,
        setThemeName,
        colorBySides,
        setColorBySides,
        clickAction,
        rippleParams,
        setClickAction,
        setRippleParams,
    } = useHouseCanvas();
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

    const activePreset = findPresetForRules(sideBehaviorByCoverage);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopyStatus("copied");
        } catch {
            setCopyStatus("failed");
        }
        window.setTimeout(() => setCopyStatus("idle"), COPY_STATUS_RESET_MS);
    };

    return (
        <aside
            id="settings"
            className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}
            aria-label="Settings"
        >
            <div className={styles.header}>
                <h2 className={styles.title}>Settings</h2>
                <button type="button" onClick={onClose}>
                    Close
                </button>
            </div>

            <details className={styles.section} open>
                <summary>Rules</summary>
                <label htmlFor="rule-preset" className={styles.label}>
                    Preset
                </label>
                <div className={styles.row}>
                    <select
                        id="rule-preset"
                        className={styles.grow}
                        value={activePreset?.code ?? CUSTOM_PRESET_VALUE}
                        onChange={(event) => {
                            const rules = decodeRules(event.target.value);
                            if (rules) applyRules(rules);
                        }}
                    >
                        {!activePreset && <option value={CUSTOM_PRESET_VALUE}>Custom</option>}
                        {RULE_PRESETS.map((preset) => (
                            <option key={preset.code} value={preset.code}>
                                {preset.name}
                            </option>
                        ))}
                    </select>
                    <button type="button" onClick={() => applyRules(createRandomRules())}>
                        Random
                    </button>
                </div>
                <p className={styles.hint}>
                    {activePreset?.description ?? "Your own rule set."} Choosing a preset restarts
                    the world.
                </p>

                <p className={styles.label}>Connected sides → behavior</p>
                <div className={styles.ruleGrid}>
                    {COVERED_SIDE_COUNTS.map((coveredSides: CoveredSideCount) => (
                        <label key={coveredSides} className={styles.rule}>
                            <span className={styles.ruleCount}>{coveredSides}</span>
                            <select
                                value={sideBehaviorByCoverage[coveredSides]}
                                onChange={(event) => {
                                    const { value } = event.target;
                                    if (isSideBehavior(value)) {
                                        setSideBehavior(coveredSides, value);
                                    }
                                }}
                                aria-label={`${coveredSides} connected sides`}
                            >
                                {SIDE_BEHAVIOR_OPTIONS.map((option: SideBehavior) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ))}
                </div>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={allowOverlap}
                        onChange={(event) => setAllowOverlap(event.target.checked)}
                    />
                    Allow overlap
                </label>
                <div className={styles.row}>
                    <button type="button" onClick={addHouse}>
                        Add house
                    </button>
                    <button type="button" onClick={resetWorld}>
                        Reset world
                    </button>
                </div>
            </details>

            <details className={styles.section} open>
                <summary>Shape</summary>
                <HouseShapePreview houseGeometry={houseGeometry} />
                <label htmlFor="underside-scale" className={styles.label}>
                    Underside <span className={styles.value}>{undersideScale.toFixed(2)}</span>
                </label>
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
                <label htmlFor="side-scale" className={styles.label}>
                    Walls <span className={styles.value}>{sideScale.toFixed(2)}</span>
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
                <label htmlFor="roof-angle" className={styles.label}>
                    Roof angle <span className={styles.value}>{Math.round(roofAngle)}°</span>
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
                <p className={styles.hint}>Presets were tuned for the default shape.</p>
            </details>

            <details className={styles.section}>
                <summary>Click action</summary>
                <label htmlFor="click-action" className={styles.label}>
                    On click
                </label>
                <select
                    id="click-action"
                    value={clickAction}
                    onChange={(event) => {
                        const { value } = event.target;
                        if (isClickAction(value)) {
                            setClickAction(value);
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

                {clickAction === "ripple" && (
                    <>
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
                        />

                        <label htmlFor="ripple-opacity" className={styles.label}>
                            Opacity{" "}
                            <span className={styles.value}>{rippleParams.opacity.toFixed(2)}</span>
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

                        <label htmlFor="ripple-speed" className={styles.label}>
                            Speed{" "}
                            <span className={styles.value}>{rippleParams.speed.toFixed(0)}</span>
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

                        <label htmlFor="ripple-range" className={styles.label}>
                            Range{" "}
                            <span className={styles.value}>
                                {rippleParams.range.toFixed(0)} hops
                            </span>
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

                        <label htmlFor="ripple-lifetime" className={styles.label}>
                            Lifetime{" "}
                            <span className={styles.value}>
                                {rippleParams.lifetime.toFixed(0)} ms
                            </span>
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
                    </>
                )}
            </details>

            <details className={styles.section}>
                <summary>Appearance</summary>
                <label htmlFor="theme" className={styles.label}>
                    Theme
                </label>
                <select
                    id="theme"
                    value={themeName}
                    onChange={(event) => {
                        const { value } = event.target;
                        if (isThemeName(value)) setThemeName(value);
                    }}
                    className={styles.fullWidth}
                >
                    {THEME_NAMES.map((name) => (
                        <option key={name} value={name}>
                            {THEMES[name].label}
                        </option>
                    ))}
                </select>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={colorBySides}
                        onChange={(event) => setColorBySides(event.target.checked)}
                    />
                    Color by connected sides
                </label>
                {colorBySides && (
                    <ol className={styles.legend} aria-label="Connected sides legend">
                        {THEMES[themeName].coveredSidesPalette.map((color, coveredSides) => (
                            <li key={color}>
                                <span className={styles.swatch} style={{ background: color }} />
                                {coveredSides}
                            </li>
                        ))}
                    </ol>
                )}

                <div className={styles.row}>
                    {!colorBySides && (
                        <label className={styles.colorField}>
                            <input
                                type="color"
                                value={fillColor}
                                onChange={(event) => setFillColor(event.target.value)}
                            />
                            Fill
                        </label>
                    )}
                    <label className={styles.colorField}>
                        <input
                            type="color"
                            value={strokeColor}
                            onChange={(event) => setStrokeColor(event.target.value)}
                        />
                        Outline
                    </label>
                </div>
            </details>

            <details className={styles.section}>
                <summary>Share</summary>
                <p className={styles.hint}>
                    The link holds the rules and the house shape, so others can grow the same setup.
                </p>
                <button type="button" onClick={copyLink}>
                    {copyStatus === "copied"
                        ? "Link copied"
                        : copyStatus === "failed"
                          ? "Copy failed: use the address bar"
                          : "Copy link"}
                </button>
            </details>

            <details className={styles.section}>
                <summary>Debug</summary>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={showConnectionSideIndicators}
                        onChange={(event) => setShowConnectionSideIndicators(event.target.checked)}
                    />
                    Show connected sides
                </label>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={debugProfilingEnabled}
                        onChange={(event) => setDebugProfilingEnabled(event.target.checked)}
                    />
                    Profiling logs in console
                </label>
            </details>

            <p className={styles.footer}>
                Drag to pan · scroll or pinch to zoom · click a house for a ripple · Space to
                play/pause
            </p>
        </aside>
    );
}

export default Sidebar;
