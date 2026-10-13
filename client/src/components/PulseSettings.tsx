import { useHouseCanvas } from "../context/useHouseCanvas";
import type { PulseKind, RippleParams } from "../types";
import RangeField from "./RangeField";

type PulseSettingsProps = {
    kind: PulseKind;
};

// Sliders for one pulse kind (ripple, echo or lineage).
function PulseSettings({ kind }: PulseSettingsProps) {
    const { pulseParams, setPulseParam } = useHouseCanvas();
    const rippleParams = pulseParams[kind];

    const setRippleParam = (key: keyof RippleParams) => (value: number) =>
        setPulseParam(kind, key, value);

    return (
        <>
            {/* Lineage always goes back to the oldest ancestor, so it has no range. */}
            {kind !== "lineage" && (
                <RangeField
                    id={`${kind}-range`}
                    label="Range"
                    valueText={`${rippleParams.range.toFixed(0)} hops`}
                    min={1}
                    max={300}
                    step={1}
                    value={rippleParams.range}
                    onChange={setRippleParam("range")}
                />
            )}
            <RangeField
                id={`${kind}-speed`}
                label="Speed"
                valueText={`${rippleParams.speed.toFixed(0)} hops/s`}
                min={10}
                max={100}
                step={1}
                value={rippleParams.speed}
                onChange={setRippleParam("speed")}
            />
            <RangeField
                id={`${kind}-lifetime`}
                label="Glow time"
                valueText={`${rippleParams.lifetime.toFixed(0)} ms`}
                min={10}
                max={1000}
                step={10}
                value={rippleParams.lifetime}
                onChange={setRippleParam("lifetime")}
            />
            <RangeField
                id={`${kind}-opacity`}
                label="Strength"
                valueText={rippleParams.opacity.toFixed(2)}
                min={0}
                max={1}
                step={0.01}
                value={rippleParams.opacity}
                onChange={setRippleParam("opacity")}
            />
        </>
    );
}

export default PulseSettings;
