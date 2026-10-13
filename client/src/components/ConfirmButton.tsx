import { type ReactNode, useCallback, useId, useRef, useState } from "react";
import styles from "./ConfirmButton.module.css";
import { useDismiss } from "./useDismiss";

type ConfirmButtonProps = {
    label: string;
    // Button content; defaults to the label.
    children?: ReactNode;
    question: string;
    confirmLabel: string;
    onConfirm: () => void;
};

// A button that asks in a small popup above it before running `onConfirm`.
function ConfirmButton({ label, children, question, confirmLabel, onConfirm }: ConfirmButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const popupId = useId();
    const close = useCallback(() => setIsOpen(false), []);
    useDismiss(containerRef, isOpen, close);

    return (
        <div ref={containerRef} className={styles.anchor}>
            <button
                type="button"
                aria-label={label}
                title={label}
                aria-expanded={isOpen}
                aria-controls={popupId}
                onClick={() => setIsOpen((open) => !open)}
            >
                {children ?? label}
            </button>
            {isOpen && (
                <div id={popupId} className={styles.popup} role="dialog" aria-label={label}>
                    <p className={styles.question}>{question}</p>
                    <div className={styles.buttons}>
                        <button
                            type="button"
                            data-variant="primary"
                            onClick={() => {
                                close();
                                onConfirm();
                            }}
                        >
                            {confirmLabel}
                        </button>
                        <button type="button" onClick={close}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ConfirmButton;
