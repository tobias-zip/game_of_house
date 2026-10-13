import { type ReactNode, useState } from "react";
import { useHouseCanvas } from "../context/useHouseCanvas";
import { clearSavedPalette } from "../theme";
import styles from "./Actions.module.css";
import ConfirmButton from "./ConfirmButton";

const COPY_STATUS_RESET_MS = 2000;

// Drawn on a 20 × 20 grid with the stroke style from `.icon`; shown instead of the text on
// phones.
const ICONS = {
    fit: <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />,
    resetView: (
        <>
            <circle cx="10" cy="10" r="4.5" />
            <path d="M10 2v4M10 14v4M2 10h4M14 10h4" />
        </>
    ),
    resetWorld: <path d="M16 10a6 6 0 1 1-1.8-4.3M15 2.5v3.7h-3.7" />,
    resetAll: (
        <path d="M4 10a6 6 0 0 1 10.4-4.1M16 10a6 6 0 0 1-10.4 4.1M14.8 2.5v3.6h-3.6M5.2 17.5v-3.6h3.6" />
    ),
    screenshot: (
        <>
            <path d="M3 6.5h3.2L7.7 4.5h4.6l1.5 2H17V16H3z" />
            <circle cx="10" cy="11" r="2.8" />
        </>
    ),
    share: (
        <>
            <circle cx="5" cy="10" r="2" />
            <circle cx="15" cy="5" r="2" />
            <circle cx="15" cy="15" r="2" />
            <path d="M6.8 9.1l6.4-3.2M6.8 10.9l6.4 3.2" />
        </>
    ),
};

function ActionContent({ icon, text }: { icon: ReactNode; text: string }) {
    return (
        <>
            <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.icon}>
                {icon}
            </svg>
            <span className={styles.text}>{text}</span>
        </>
    );
}

type ActionsProps = {
    onFit: () => void;
    onResetView: () => void;
    onScreenshot: () => void;
};

// View, reset, screenshot and share buttons in the top bar.
function Actions({ onFit, onResetView, onScreenshot }: ActionsProps) {
    const { resetWorld } = useHouseCanvas();
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopyStatus("copied");
        } catch {
            setCopyStatus("failed");
        }
        window.setTimeout(() => setCopyStatus("idle"), COPY_STATUS_RESET_MS);
    };

    // Like a fresh visit: no stored colors, and a page load without the setup in the link.
    const resetAll = () => {
        clearSavedPalette();
        window.location.assign(window.location.pathname);
    };

    const shareText =
        copyStatus === "copied" ? "Link copied" : copyStatus === "failed" ? "Copy failed" : "Share";

    return (
        <div className={styles.actions}>
            <button type="button" aria-label="Fit" title="Fit" onClick={onFit}>
                <ActionContent icon={ICONS.fit} text="Fit" />
            </button>
            <button type="button" aria-label="Reset view" title="Reset view" onClick={onResetView}>
                <ActionContent icon={ICONS.resetView} text="Reset view" />
            </button>
            <ConfirmButton
                label="Reset world"
                question="Start over from a single house?"
                confirmLabel="Reset"
                onConfirm={resetWorld}
            >
                <ActionContent icon={ICONS.resetWorld} text="Reset world" />
            </ConfirmButton>
            <ConfirmButton
                label="Reset all"
                question="Reset every setting and start over, like a fresh visit?"
                confirmLabel="Reset all"
                onConfirm={resetAll}
            >
                <ActionContent icon={ICONS.resetAll} text="Reset all" />
            </ConfirmButton>
            <button type="button" aria-label="Screenshot" title="Screenshot" onClick={onScreenshot}>
                <ActionContent icon={ICONS.screenshot} text="Screenshot" />
            </button>
            <button
                type="button"
                data-variant="primary"
                aria-label={shareText}
                title={shareText}
                onClick={copyLink}
            >
                <ActionContent icon={ICONS.share} text={shareText} />
            </button>
        </div>
    );
}

export default Actions;
