export type ThemeName = "night" | "classic";

export type Theme = {
    label: string;
    fillColor: string;
    strokeColor: string;
    // House fill per number of connected sides, 0–5.
    coveredSidesPalette: string[];
};

// UI colors live in index.css under the matching `data-theme`.
export const THEMES: Record<ThemeName, Theme> = {
    night: {
        label: "Night",
        fillColor: "#e9e4d8",
        strokeColor: "#101418",
        coveredSidesPalette: ["#4b3f7a", "#4a6595", "#4c8ea8", "#5fb3a0", "#a8cf8a", "#f0e3a0"],
    },
    classic: {
        label: "Classic",
        fillColor: "#d9d9d9",
        strokeColor: "#000000",
        coveredSidesPalette: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"],
    },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const DEFAULT_THEME: ThemeName = "night";

const THEME_STORAGE_KEY = "overhouse:theme";

const isThemeName = (value: string | null): value is ThemeName => value !== null && value in THEMES;

// Storage can be unavailable (private mode, blocked site data); the theme is a convenience.
export const loadThemeName = (): ThemeName => {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isThemeName(stored) ? stored : DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
};

export const saveThemeName = (themeName: ThemeName) => {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch {
        // Ignored: the theme then resets on the next visit.
    }
};
