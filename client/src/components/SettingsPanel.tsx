import { useHouseCanvas } from "../context/useHouseCanvas";
import { getHousePolygon } from "../domain/house/geometry";
import { createRandomRules, decodeRules, findPresetForRules, RULE_PRESETS } from "../rules";
import {
    CLICK_ACTION_LABELS,
    COVERED_SIDE_COUNTS,
    GROWTH_ORDER_OPTIONS,
    type GrowthOrder,
    type HouseGeometry,
    isPulseKind,
    SIDE_BEHAVIOR_OPTIONS,
    type SideBehavior,
} from "../types";
import PulseSettings from "./PulseSettings";
import RangeField from "./RangeField";
import styles from "./SettingsPanel.module.css";

const CUSTOM_PRESET_VALUE = "custom";

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

type SettingsPanelProps = {
    isOpen: boolean;
};

// All settings, one column per section; opened from the top bar.
function SettingsPanel({ isOpen }: SettingsPanelProps) {
    const {
        addHouse,
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
        palette,
        setPaletteColor,
        coveredSidesPalette,
        colorBySides,
        setColorBySides,
        clickAction,
    } = useHouseCanvas();

    const activePreset = findPresetForRules(sideBehaviorByCoverage);

    return (
        <aside
            id="settings"
            className={`${styles.panel} ${isOpen ? styles.open : ""}`}
            aria-label="Settings"
        >
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Tool settings</h2>
                <p className={styles.label}>{CLICK_ACTION_LABELS[clickAction]}</p>
                {isPulseKind(clickAction) ? (
                    <PulseSettings kind={clickAction} />
                ) : (
                    <p className={styles.hint}>This tool has no settings.</p>
                )}
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Rules</h2>
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
                <div className={styles.ruleTable}>
                    {COVERED_SIDE_COUNTS.map((coveredSides) => (
                        <div key={coveredSides} className={styles.ruleRow}>
                            <span
                                className={styles.swatch}
                                style={{
                                    background: colorBySides
                                        ? coveredSidesPalette[coveredSides]
                                        : "none",
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
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>World</h2>
                <p className={styles.label}>Growth order</p>
                <Segmented
                    name="growth-order"
                    legend="Growth order"
                    options={GROWTH_ORDER_OPTIONS}
                    labels={GROWTH_ORDER_LABELS}
                    value={growthOrder}
                    onChange={setGrowthOrder}
                />
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
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Shape</h2>
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
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Look</h2>
                <label className={styles.colorField}>
                    <input
                        type="color"
                        value={palette.accentColor}
                        onChange={(event) => setPaletteColor("accentColor", event.target.value)}
                    />
                    Accent
                </label>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={colorBySides}
                        onChange={(event) => setColorBySides(event.target.checked)}
                    />
                    Color houses by connected sides
                </label>
                <div className={styles.row}>
                    {colorBySides && (
                        <>
                            <label className={styles.colorField}>
                                <input
                                    type="color"
                                    value={palette.fewSidesColor}
                                    onChange={(event) =>
                                        setPaletteColor("fewSidesColor", event.target.value)
                                    }
                                />
                                Few sides
                            </label>
                            <label className={styles.colorField}>
                                <input
                                    type="color"
                                    value={palette.manySidesColor}
                                    onChange={(event) =>
                                        setPaletteColor("manySidesColor", event.target.value)
                                    }
                                />
                                Many sides
                            </label>
                        </>
                    )}
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
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Debug</h2>
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
                <p className={styles.footer}>
                    Drag to pan · scroll or pinch to zoom · click a house · Space to play/pause
                </p>
            </section>
        </aside>
    );
}

export default SettingsPanel;
