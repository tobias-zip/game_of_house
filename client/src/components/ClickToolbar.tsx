import type { ReactNode } from "react";
import { useHouseCanvas } from "../context/useHouseCanvas";
import { CLICK_ACTION_OPTIONS, type ClickAction } from "../types";
import styles from "./ClickToolbar.module.css";

type Tool = {
    label: string;
    hint: string;
    icon: ReactNode;
};

const TOOLS: Record<ClickAction, Tool> = {
    ripple: {
        label: "Ripple",
        hint: "A wave travels outwards through connected houses.",
        icon: (
            <>
                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                <circle cx="10" cy="10" r="4.5" />
                <circle cx="10" cy="10" r="7.5" />
            </>
        ),
    },
    echo: {
        label: "Echo",
        hint: "A wave that bounces back from dead ends.",
        icon: (
            <>
                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                <path d="M6.5 6.5a5 5 0 0 0 0 7M13.5 6.5a5 5 0 0 1 0 7" />
                <path d="M4 4a8.5 8.5 0 0 0 0 12M16 4a8.5 8.5 0 0 1 0 12" />
            </>
        ),
    },
    lineage: {
        label: "Lineage",
        hint: "Lights the houses that grew this one, back to its oldest living ancestor.",
        icon: (
            <>
                <path d="M5 16l5-6 5-6" />
                <circle cx="5" cy="16" r="1.8" fill="currentColor" />
                <circle cx="10" cy="10" r="1.8" fill="currentColor" />
                <circle cx="15" cy="4" r="1.8" fill="currentColor" />
            </>
        ),
    },
    seed: {
        label: "Seed",
        hint: "Grows a new house on a free side of this one.",
        icon: <path d="M10 4v12M4 10h12" />,
    },
    remove: {
        label: "Remove",
        hint: "Removes the house; its neighbours stay where they are.",
        icon: <path d="M5 5l10 10M15 5L5 15" />,
    },
    freeze: {
        label: "Freeze",
        hint: "Pins the house so the rules can't kill it. Click again to thaw.",
        icon: <path d="M10 3v14M4 6.5l12 7M4 13.5l12-7" />,
    },
};

function ClickToolbar() {
    const { clickAction, setClickAction } = useHouseCanvas();

    return (
        <div className={styles.panel}>
            <div className={styles.toolbar} role="toolbar" aria-label="Click a house to">
                {CLICK_ACTION_OPTIONS.map((action) => (
                    <button
                        key={action}
                        type="button"
                        className={styles.tool}
                        aria-pressed={clickAction === action}
                        title={TOOLS[action].hint}
                        onClick={() => setClickAction(action)}
                    >
                        <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.icon}>
                            {TOOLS[action].icon}
                        </svg>
                        <span className={styles.label}>{TOOLS[action].label}</span>
                    </button>
                ))}
            </div>
            <p className={styles.hint}>{TOOLS[clickAction].hint}</p>
        </div>
    );
}

export default ClickToolbar;
