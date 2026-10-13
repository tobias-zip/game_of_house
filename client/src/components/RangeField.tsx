import styles from "./RangeField.module.css";

type RangeFieldProps = {
    id: string;
    label: string;
    valueText: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => void;
};

// A labelled slider that shows its current value next to the label.
function RangeField({ id, label, valueText, min, max, step, value, onChange }: RangeFieldProps) {
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
                className={styles.slider}
            />
        </>
    );
}

export default RangeField;
