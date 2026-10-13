import { type ReactNode, useCallback, useId, useRef, useState } from "react";
import { useHouseCanvas } from "../context/useHouseCanvas";
import { CLICK_ACTION_LABELS, CLICK_ACTION_OPTIONS, type ClickAction } from "../types";
import styles from "./ClickToolbar.module.css";
import { useDismiss } from "./useDismiss";

// Drawn on a 20 × 20 grid with the stroke style from `.icon`.
const TOOL_ICONS: Record<ClickAction, ReactNode> = {
    ripple: (
        <>
            <circle cx="10" cy="10" r="1.5" fill="currentColor" />
            <circle cx="10" cy="10" r="4.5" />
            <circle cx="10" cy="10" r="7.5" />
        </>
    ),
    echo: (
        <>
            <circle cx="10" cy="10" r="1.5" fill="currentColor" />
            <path d="M6.5 6.5a5 5 0 0 0 0 7M13.5 6.5a5 5 0 0 1 0 7" />
            <path d="M4 4a8.5 8.5 0 0 0 0 12M16 4a8.5 8.5 0 0 1 0 12" />
        </>
    ),
    lineage: (
        <>
            <path d="M5 16l5-6 5-6" />
            <circle cx="5" cy="16" r="1.8" fill="currentColor" />
            <circle cx="10" cy="10" r="1.8" fill="currentColor" />
            <circle cx="15" cy="4" r="1.8" fill="currentColor" />
        </>
    ),
    seed: <path d="M10 4v12M4 10h12" />,
    remove: <path d="M5 5l10 10M15 5L5 15" />,
    freeze: <path d="M10 3v14M4 6.5l12 7M4 13.5l12-7" />,
};

function ToolIcon({ action }: { action: ClickAction }) {
    return (
        <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.icon}>
            {TOOL_ICONS[action]}
        </svg>
    );
}

// The click tools in a row. On phones a single button shows the active tool and drops the
// list down when tapped.
function ClickToolbar() {
    const { clickAction, setClickAction } = useHouseCanvas();
    const [isExpanded, setIsExpanded] = useState(false);
    const pickerRef = useRef<HTMLDivElement | null>(null);
    const toolbarId = useId();
    const collapse = useCallback(() => setIsExpanded(false), []);
    useDismiss(pickerRef, isExpanded, collapse);

    return (
        <div ref={pickerRef} className={styles.picker}>
            <button
                type="button"
                className={styles.toggle}
                aria-label={`Tool: ${CLICK_ACTION_LABELS[clickAction]}`}
                aria-expanded={isExpanded}
                aria-controls={toolbarId}
                onClick={() => setIsExpanded((expanded) => !expanded)}
            >
                <ToolIcon action={clickAction} />
            </button>
            <div
                id={toolbarId}
                className={`${styles.toolbar} ${isExpanded ? styles.expanded : ""}`}
                role="toolbar"
                aria-label="Click a house to"
            >
                {CLICK_ACTION_OPTIONS.map((action) => (
                    <button
                        key={action}
                        type="button"
                        className={styles.tool}
                        aria-pressed={clickAction === action}
                        aria-label={CLICK_ACTION_LABELS[action]}
                        title={CLICK_ACTION_LABELS[action]}
                        onClick={() => {
                            setClickAction(action);
                            collapse();
                        }}
                    >
                        <ToolIcon action={action} />
                        <span className={styles.label}>{CLICK_ACTION_LABELS[action]}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default ClickToolbar;
