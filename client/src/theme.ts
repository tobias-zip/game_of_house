export type ThemeName = "nocturne" | "spore" | "kiln" | "xenolith";

export type Theme = {
    label: string;
    description: string;
    fillColor: string;
    strokeColor: string;
    rippleColor: string;
    // Outline of frozen houses; the same as `--accent` in index.css.
    markColor: string;
    // House fill per number of connected sides, 0–5.
    coveredSidesPalette: string[];
};

// UI colors and fonts live in index.css under the matching `data-theme`. All designs are dark.
export const THEMES: Record<ThemeName, Theme> = {
    nocturne: {
        label: "Nocturne",
        description: "A star chart: moonlit blues and bone, serif and plate lettering.",
        fillColor: "#d9d2c0",
        strokeColor: "#0a0c12",
        rippleColor: "#f3d48a",
        markColor: "#e6c983",
        coveredSidesPalette: ["#2b2547", "#33406b", "#3b6585", "#58918f", "#a3c09b", "#ece0b4"],
    },
    spore: {
        label: "Spore",
        description: "Deep-sea glow: dark water, lichen greens, soft organic shapes.",
        fillColor: "#7fdc9a",
        strokeColor: "#040a09",
        rippleColor: "#ff5fa2",
        markColor: "#b9f56b",
        coveredSidesPalette: ["#10302e", "#11504a", "#127a66", "#22a37a", "#7ed97a", "#e3fb7c"],
    },
    kiln: {
        label: "Kiln",
        description: "Fired clay: charcoal, terracotta and ochre, like a riso print.",
        fillColor: "#e3c79a",
        strokeColor: "#15100d",
        rippleColor: "#f6e7c8",
        markColor: "#e2733c",
        coveredSidesPalette: ["#3a2724", "#6a352a", "#a24c2e", "#cf733b", "#dca75c", "#ecdcae"],
    },
    xenolith: {
        label: "Xenolith",
        description: "A specimen from elsewhere: violet dark, rose and mineral light.",
        fillColor: "#c9b8f0",
        strokeColor: "#0b0810",
        rippleColor: "#8ff0ff",
        markColor: "#8ff0ff",
        coveredSidesPalette: ["#25142f", "#4a1d5c", "#7b2f7c", "#b6578b", "#e8918e", "#ffd8a8"],
    },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const DEFAULT_THEME: ThemeName = "nocturne";

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
