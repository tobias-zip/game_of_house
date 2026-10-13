import { useState } from "react";
import { useHouseCanvas } from "../context/useHouseCanvas";
import { getHousePolygon } from "../domain/house/geometry";
import { createRandomRules, decodeRules, findPresetForRules, RULE_PRESETS } from "../rules";
import { THEME_NAMES, THEMES } from "../theme";
import {
    COVERED_SIDE_COUNTS,
    GROWTH_ORDER_OPTIONS,
    type GrowthOrder,
    type HouseGeometry,
    type RippleParams,
    SIDE_BEHAVIOR_OPTIONS,
    type SideBehavior,
} from "../types";
import styles from "./Sidebar.module.css";

const CUSTOM_PRESET_VALUE = "custom";
const COPY_STATUS_RESET_MS = 2000;

const SIDE_BEHAVIOR_LABELS: Record<SideBehavior, string> = {
    die: "die",
    nothing: "stay",
    grow: "grow",
};

const GROWTH_ORDER_LABELS: Record<GrowthOrder, string> = {
    random: "random",
    oldest: "oldest first",
};

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

// A row of radio buttons that looks like joined toggle buttons.
function Segmented<T extends string>({
    name,
    legend,
    options,
    labels,
    value,
    onChange,
}: {
    name: string;
    legend: string;
    options: T[];
    labels: Record<T, string>;
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <fieldset className={styles.segmented}>
            <legend className={styles.visuallyHidden}>{legend}</legend>
            {options.map((option) => (
                <label key={option} className={styles.segment}>
                    <input
                        type="radio"
                        name={name}
                        value={option}
                        checked={value === option}
                        onChange={() => onChange(option)}
                    />
                    <span>{labels[option]}</span>
                </label>
            ))}
        </fieldset>
    );
}

function RangeField({
    id,
    label,
    valueText,
    min,
    max,
    step,
    value,
    onChange,
}: {
    id: string;
    label: string;
    valueText: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <>
            <label htmlFor={id} className={styles.label}>
                {label} <span className={styles.value}>{valueText}</span>
            </label>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className={styles.fullWidth}
            />
        </>
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
        growthOrder,
        setGrowthOrder,
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
        rippleParams,
        setRippleParams,
    } = useHouseCanvas();
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

    const activePreset = findPresetForRules(sideBehaviorByCoverage);
    const palette = THEMES[themeName].coveredSidesPalette;

    const setRippleParam = (key: keyof Omit<RippleParams, "color">) => (value: number) =>
        setRippleParams((current) => ({ ...current, [key]: value }));

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
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close settings"
                >
                    ×
                </button>
            </div>

            <details className={styles.section} open>
                <summary>Rules</summary>
                <div className={styles.row}>
                    <select
                        aria-label="Rule preset"
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

                <p className={styles.label}>What a house does with n connected sides</p>
                <div className={styles.ruleTable}>
                    {COVERED_SIDE_COUNTS.map((coveredSides) => (
                        <div key={coveredSides} className={styles.ruleRow}>
                            <span
                                className={styles.swatch}
                                style={{
                                    background: colorBySides ? palette[coveredSides] : "none",
                                }}
                                aria-hidden="true"
                            />
                            <span className={styles.ruleCount}>{coveredSides}</span>
                            <Segmented
                                name={`rule-${coveredSides}`}
                                legend={`${coveredSides} connected sides`}
                                options={SIDE_BEHAVIOR_OPTIONS}
                                labels={SIDE_BEHAVIOR_LABELS}
                                value={sideBehaviorByCoverage[coveredSides]}
                                onChange={(behavior) => setSideBehavior(coveredSides, behavior)}
                            />
                        </div>
                    ))}
                </div>
            </details>

            <details className={styles.section} open>
                <summary>World</summary>
                <p className={styles.label}>Growth order</p>
                <Segmented
                    name="growth-order"
                    legend="Growth order"
                    options={GROWTH_ORDER_OPTIONS}
                    labels={GROWTH_ORDER_LABELS}
                    value={growthOrder}
                    onChange={setGrowthOrder}
                />
                <p className={styles.hint}>
                    Growing houses take turns in this order; earlier ones get the first pick of free
                    space.
                </p>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={allowOverlap}
                        onChange={(event) => setAllowOverlap(event.target.checked)}
                    />
                    Let houses overlap
                </label>
                <div className={styles.row}>
                    <button type="button" className={styles.grow} onClick={addHouse}>
                        Add house
                    </button>
                    <button type="button" className={styles.grow} onClick={resetWorld}>
                        Reset world
                    </button>
                </div>
            </details>

            <details className={styles.section}>
                <summary>Shape</summary>
                <HouseShapePreview houseGeometry={houseGeometry} />
                <RangeField
                    id="underside-scale"
                    label="Underside"
                    valueText={undersideScale.toFixed(2)}
                    min={0.2}
                    max={1.8}
                    step={0.01}
                    value={undersideScale}
                    onChange={setUndersideScale}
                />
                <RangeField
                    id="side-scale"
                    label="Walls"
                    valueText={sideScale.toFixed(2)}
                    min={0.2}
                    max={1}
                    step={0.01}
                    value={sideScale}
                    onChange={setSideScale}
                />
                <RangeField
                    id="roof-angle"
                    label="Roof angle"
                    valueText={`${Math.round(roofAngle)}°`}
                    min={20}
                    max={160}
                    step={1}
                    value={roofAngle}
                    onChange={setRoofAngle}
                />
                <p className={styles.hint}>Presets were tuned for the default shape.</p>
            </details>

            <details className={styles.section}>
                <summary>Pulse</summary>
                <p className={styles.hint}>Ripple, echo and lineage use these settings.</p>
                <RangeField
                    id="ripple-range"
                    label="Range"
                    valueText={`${rippleParams.range.toFixed(0)} hops`}
                    min={1}
                    max={100}
                    step={1}
                    value={rippleParams.range}
                    onChange={setRippleParam("range")}
                />
                <RangeField
                    id="ripple-speed"
                    label="Speed"
                    valueText={`${rippleParams.speed.toFixed(0)} hops/s`}
                    min={10}
                    max={100}
                    step={1}
                    value={rippleParams.speed}
                    onChange={setRippleParam("speed")}
                />
                <RangeField
                    id="ripple-lifetime"
                    label="Glow time"
                    valueText={`${rippleParams.lifetime.toFixed(0)} ms`}
                    min={10}
                    max={1000}
                    step={10}
                    value={rippleParams.lifetime}
                    onChange={setRippleParam("lifetime")}
                />
                <RangeField
                    id="ripple-opacity"
                    label="Strength"
                    valueText={rippleParams.opacity.toFixed(2)}
                    min={0}
                    max={1}
                    step={0.01}
                    value={rippleParams.opacity}
                    onChange={setRippleParam("opacity")}
                />
                <label className={styles.colorField}>
                    <input
                        type="color"
                        value={rippleParams.color}
                        onChange={(event) =>
                            setRippleParams((current) => ({
                                ...current,
                                color: event.target.value,
                            }))
                        }
                    />
                    Color
                </label>
            </details>

            <details className={styles.section}>
                <summary>Look</summary>
                <fieldset className={styles.designs}>
                    <legend className={styles.visuallyHidden}>Design</legend>
                    {THEME_NAMES.map((name) => (
                        <label key={name} className={styles.design}>
                            <input
                                type="radio"
                                name="design"
                                value={name}
                                checked={themeName === name}
                                onChange={() => setThemeName(name)}
                            />
                            <span className={styles.designName}>{THEMES[name].label}</span>
                            <span className={styles.designPalette} aria-hidden="true">
                                {THEMES[name].coveredSidesPalette.map((color) => (
                                    <span
                                        key={color}
                                        className={styles.designChip}
                                        style={{ background: color }}
                                    />
                                ))}
                            </span>
                        </label>
                    ))}
                </fieldset>
                <p className={styles.hint}>{THEMES[themeName].description}</p>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={colorBySides}
                        onChange={(event) => setColorBySides(event.target.checked)}
                    />
                    Color houses by connected sides
                </label>
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
                    The link holds the rules, the house shape and the world's seed, so others can
                    grow the same world from its first house.
                </p>
                <button type="button" className={styles.fullWidth} onClick={copyLink}>
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
                Drag to pan · scroll or pinch to zoom · click a house · Space to play/pause
            </p>
        </aside>
    );
}

export default Sidebar;
