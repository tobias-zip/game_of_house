// The player picks three colors; the rest of the look is fixed in index.css.
export type Palette = {
    // House fill for 0 and 5 connected sides; the counts in between blend from one to the other.
    fewSidesColor: string;
    manySidesColor: string;
    // UI highlights (`--accent` in index.css), pulses and the outline of frozen houses.
    accentColor: string;
};

export const DEFAULT_PALETTE: Palette = {
    fewSidesColor: "#14213d",
    manySidesColor: "#8ff0a4",
    accentColor: "#5aa9ff",
};

// Used when houses are not colored by connected sides.
export const DEFAULT_FILL_COLOR = "#d9d2c0";
// The canvas background, so outlines read as gaps between houses.
export const DEFAULT_STROKE_COLOR = "#0a0c12";

const COVERED_SIDES_STEPS = 6;

type Rgb = [number, number, number];

const parseHexColor = (hex: string): Rgb => [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
];

const formatHexColor = (rgb: Rgb) =>
    `#${rgb
        .map((channel) =>
            Math.round(Math.min(1, Math.max(0, channel)) * 255)
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;

const toLinear = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const fromLinear = (channel: number) =>
    channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.max(channel, 0) ** (1 / 2.4) - 0.055;

// sRGB to OKLab and back (Björn Ottosson's matrices). OKLab spaces the steps evenly in
// perceived lightness, so neighbouring counts stay distinguishable.
const toOklab = (rgb: Rgb): Rgb => {
    const [r, g, b] = rgb.map(toLinear) as Rgb;
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
};

const fromOklab = ([lightness, a, b]: Rgb): Rgb => {
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map(fromLinear) as Rgb;
};

// OKLab as lightness, chroma and hue in degrees.
const toOklch = (rgb: Rgb): Rgb => {
    const [lightness, a, b] = toOklab(rgb);
    return [lightness, Math.hypot(a, b), (Math.atan2(b, a) * 180) / Math.PI];
};

const fromOklch = ([lightness, chroma, hueInDegrees]: Rgb): Rgb => {
    const hueInRadians = (hueInDegrees * Math.PI) / 180;
    return fromOklab([lightness, chroma * Math.cos(hueInRadians), chroma * Math.sin(hueInRadians)]);
};

// House fill per number of connected sides, 0–5.
// Lightness and chroma blend linearly; the hue always turns in the decreasing direction
// (CSS's "decreasing hue"), so distant colors blend through the hues between them (e.g.
// indigo through blue and teal to bone) instead of through grey.
export const getCoveredSidesPalette = ({ fewSidesColor, manySidesColor }: Palette): string[] => {
    const [fromLightness, fromChroma, fromHue] = toOklch(parseHexColor(fewSidesColor));
    const [toLightness, toChroma, toHue] = toOklch(parseHexColor(manySidesColor));
    const hueTurnInDegrees = toHue > fromHue ? toHue - fromHue - 360 : toHue - fromHue;
    return Array.from({ length: COVERED_SIDES_STEPS }, (_, step) => {
        const amount = step / (COVERED_SIDES_STEPS - 1);
        return formatHexColor(
            fromOklch([
                fromLightness + (toLightness - fromLightness) * amount,
                fromChroma + (toChroma - fromChroma) * amount,
                fromHue + hueTurnInDegrees * amount,
            ]),
        );
    });
};

// Text on accent-colored buttons: dark on light accents, light on dark ones.
export const getAccentContrastColor = (accentColor: string) =>
    toOklab(parseHexColor(accentColor))[0] > 0.6 ? "#14110a" : "#f4f1e8";

const PALETTE_STORAGE_KEY = "overhouse:palette";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// Storage can be unavailable (private mode, blocked site data); the palette is a convenience.
export const loadPalette = (): Palette => {
    try {
        const stored = JSON.parse(localStorage.getItem(PALETTE_STORAGE_KEY) ?? "null");
        const palette = { ...DEFAULT_PALETTE };
        for (const key of Object.keys(palette) as (keyof Palette)[]) {
            if (typeof stored?.[key] === "string" && HEX_COLOR.test(stored[key])) {
                palette[key] = stored[key];
            }
        }
        return palette;
    } catch {
        return DEFAULT_PALETTE;
    }
};

export const clearSavedPalette = () => {
    try {
        localStorage.removeItem(PALETTE_STORAGE_KEY);
    } catch {
        // Ignored: nothing was stored then.
    }
};

export const savePalette = (palette: Palette) => {
    try {
        localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palette));
    } catch {
        // Ignored: the palette then resets on the next visit.
    }
};
