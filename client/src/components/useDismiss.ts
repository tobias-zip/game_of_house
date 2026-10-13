import { type RefObject, useEffect } from "react";

// Closes a popup when the pointer goes down outside `containerRef` or Escape is pressed.
export const useDismiss = (
    containerRef: RefObject<HTMLElement | null>,
    isOpen: boolean,
    close: () => void,
) => {
    useEffect(() => {
        if (!isOpen) return;

        const onPointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) close();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [containerRef, isOpen, close]);
};
