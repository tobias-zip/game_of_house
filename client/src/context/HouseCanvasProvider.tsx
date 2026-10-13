import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRootHouse } from "../domain/house/graph";
import { addHouseToHost, addRandomHouse } from "../engine/simulation/addHouse";
import { createRandomSeed, createSeededRandom } from "../engine/simulation/random";
import { removeHouses } from "../engine/simulation/removeHouses";
import { runSimulationTick } from "../engine/simulation/runTick";
import type { SimulationWorld } from "../engine/simulation/types";
import { buildWorldState } from "../engine/simulation/worldState";
import { DEFAULT_RULES } from "../rules";
import { formatSharedSetup, parseSharedSetup } from "../shareLink";
import {
    DEFAULT_FILL_COLOR,
    DEFAULT_STROKE_COLOR,
    getAccentContrastColor,
    getCoveredSidesPalette,
    loadPalette,
    type Palette,
    savePalette,
} from "../theme";
import {
    type ClickAction,
    type CoveredSideCount,
    DEFAULT_GROWTH_ORDER,
    type GrowthOrder,
    type HouseGeometry,
    type PulseKind,
    type RippleParams,
    type SideBehavior,
    type SideBehaviorByCoverage,
} from "../types";
import { HouseCanvasContext, type OverloadNotice } from "./HouseCanvasContext";

const BASE_UNDERSIDE_LENGTH = 120;
const DEFAULT_SIMULATION_SPEED = 2;

// The simulation pauses itself after this many consecutive ticks that took longer than
// the limit or started that much late.
const SLOW_TICK_LIMIT_MS = 200;
const SLOW_TICKS_BEFORE_PAUSE = 3;

// Pulses use the accent color. Every pulse kind starts with these settings; lineage
// ignores the range, since it always follows the parent chain to the oldest ancestor.
const DEFAULT_PULSE_PARAMS: RippleParams = {
    // speed is in "houses per second"
    speed: 40,
    opacity: 0.5,
    // range is in graph hops
    range: 100,
    // lifetime is per-house (ms)
    lifetime: 500,
};

const createInitialWorld = (rootHouseId: number, houseGeometry: HouseGeometry): SimulationWorld => {
    const houses = [createRootHouse(rootHouseId)];
    return { houses, worldState: buildWorldState({ houses, houseGeometry }) };
};

type HouseCanvasProviderProps = {
    children: ReactNode;
};

export function HouseCanvasProvider({ children }: HouseCanvasProviderProps) {
    // A shared link (see shareLink.ts) overrides the defaults once, on load.
    const [sharedSetup] = useState(() => parseSharedSetup(window.location.hash));

    const [undersideScale, setUndersideScale] = useState(sharedSetup.undersideScale ?? 1);
    const [sideScale, setSideScale] = useState(sharedSetup.sideScale ?? 0.68);
    const [roofAngle, setRoofAngle] = useState(sharedSetup.roofAngle ?? 80);
    const [allowOverlap, setAllowOverlap] = useState(sharedSetup.allowOverlap ?? false);
    const [growthOrder, setGrowthOrder] = useState<GrowthOrder>(
        sharedSetup.growthOrder ?? DEFAULT_GROWTH_ORDER,
    );
    // Every world gets its own seed; the share link holds the seed of the current one.
    const [seed, setSeed] = useState(() => sharedSetup.seed ?? createRandomSeed());
    const [sideBehaviorByCoverage, setSideBehaviorByCoverage] = useState<SideBehaviorByCoverage>(
        () => sharedSetup.rules ?? DEFAULT_RULES,
    );
    const [isPlaying, setIsPlaying] = useState(true);
    const [simulationSpeed, setSimulationSpeed] = useState(DEFAULT_SIMULATION_SPEED);
    const [tickCount, setTickCount] = useState(0);
    const [overload, setOverload] = useState<OverloadNotice | null>(null);
    const [debugProfilingEnabled, setDebugProfilingEnabled] = useState(false);
    const [showConnectionSideIndicators, setShowConnectionSideIndicators] = useState(false);
    const [palette, setPaletteState] = useState<Palette>(loadPalette);
    const [colorBySides, setColorBySides] = useState(true);
    const [fillColor, setFillColor] = useState(DEFAULT_FILL_COLOR);
    const [strokeColor, setStrokeColor] = useState(DEFAULT_STROKE_COLOR);
    const [clickAction, setClickAction] = useState<ClickAction>("ripple");
    const [pulseParams, setPulseParams] = useState<Record<PulseKind, RippleParams>>({
        ripple: DEFAULT_PULSE_PARAMS,
        echo: DEFAULT_PULSE_PARAMS,
        lineage: DEFAULT_PULSE_PARAMS,
    });

    const coveredSidesPalette = useMemo(() => getCoveredSidesPalette(palette), [palette]);

    const houseGeometry = useMemo<HouseGeometry>(() => {
        const undersideLength = BASE_UNDERSIDE_LENGTH * undersideScale;
        const sideLength = BASE_UNDERSIDE_LENGTH * sideScale;
        const halfAngleRad = (roofAngle * Math.PI) / 360;
        const roofHeight = undersideLength / 2 / Math.tan(halfAngleRad);

        return {
            undersideLength,
            sideLength,
            roofHeight,
        };
    }, [roofAngle, sideScale, undersideScale]);

    // The simulation reads and writes `worldRef` outside of React updaters (StrictMode runs
    // those twice); `world` state mirrors it so components re-render.
    const [world, setWorld] = useState(() => createInitialWorld(0, houseGeometry));
    const worldRef = useRef(world);
    const randomRef = useRef(createSeededRandom(seed));
    const nextHouseIdRef = useRef(1);
    const tickCountRef = useRef(0);
    const slowTickStreakRef = useRef(0);
    const overloadGuardEnabledRef = useRef(true);

    const publishWorld = useCallback((nextWorld: SimulationWorld) => {
        worldRef.current = nextWorld;
        setWorld(nextWorld);
    }, []);

    const advanceTick = () => {
        const tickStart = performance.now();
        const result = runSimulationTick({
            houses: worldRef.current.houses,
            sideBehaviorByCoverage,
            houseGeometry,
            allowOverlap,
            growthOrder,
            nextHouseId: nextHouseIdRef.current,
            worldState: worldRef.current.worldState,
            random: randomRef.current,
        });
        const tickMs = performance.now() - tickStart;

        nextHouseIdRef.current = result.nextHouseId;
        tickCountRef.current += 1;
        publishWorld({ houses: result.houses, worldState: result.worldState });
        setTickCount(tickCountRef.current);

        if (debugProfilingEnabled) {
            console.log("[sim-profile]", {
                tick: tickCountRef.current,
                ...result.profile,
            });
        }

        return { tickMs, houseCount: result.houses.length };
    };

    const stepSimulation = () => {
        setIsPlaying(false);
        advanceTick();
    };

    // `hostHouseId` grows the house from that host instead of a random one.
    const addHouse = (hostHouseId?: number) => {
        const input = {
            houses: worldRef.current.houses,
            worldState: worldRef.current.worldState,
            houseGeometry,
            allowOverlap,
            newHouseId: nextHouseIdRef.current,
            random: randomRef.current,
        };
        const houses =
            hostHouseId === undefined
                ? addRandomHouse(input)
                : addHouseToHost({ ...input, hostHouseId });
        if (!houses) return;

        nextHouseIdRef.current += 1;
        publishWorld({ houses, worldState: worldRef.current.worldState });
    };

    const removeHouse = (houseId: number) => {
        const { houses, worldState } = worldRef.current;
        const houseById = removeHouses(houses, new Set([houseId]), worldState);
        publishWorld({ houses: Array.from(houseById.values()), worldState });
    };

    const toggleFrozen = (houseId: number) => {
        const { houses, worldState } = worldRef.current;
        publishWorld({
            houses: houses.map((house) =>
                house.id === houseId ? { ...house, frozen: !house.frozen } : house,
            ),
            worldState,
        });
    };

    const resetWorld = () => {
        publishWorld(createInitialWorld(nextHouseIdRef.current, houseGeometry));
        nextHouseIdRef.current += 1;
        const nextSeed = createRandomSeed();
        setSeed(nextSeed);
        randomRef.current = createSeededRandom(nextSeed);
        tickCountRef.current = 0;
        setTickCount(0);
        slowTickStreakRef.current = 0;
        overloadGuardEnabledRef.current = true;
        setOverload(null);
    };

    // Rule changes from presets restart from a single house so their effect is visible.
    const applyRules = (rules: SideBehaviorByCoverage) => {
        setSideBehaviorByCoverage(rules);
        resetWorld();
        setIsPlaying(true);
    };

    const keepGoingAfterOverload = () => {
        overloadGuardEnabledRef.current = false;
        setOverload(null);
        setIsPlaying(true);
    };

    const setSideBehavior = (coveredSides: CoveredSideCount, behavior: SideBehavior) => {
        setSideBehaviorByCoverage((current: SideBehaviorByCoverage) => ({
            ...current,
            [coveredSides]: behavior,
        }));
    };

    const setPulseParam = (kind: PulseKind, key: keyof RippleParams, value: number) => {
        setPulseParams((current) => ({ ...current, [kind]: { ...current[kind], [key]: value } }));
    };

    const setPaletteColor = (key: keyof Palette, color: string) => {
        const nextPalette = { ...palette, [key]: color };
        setPaletteState(nextPalette);
        savePalette(nextPalette);
    };

    useEffect(() => {
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty("--accent", palette.accentColor);
        rootStyle.setProperty("--accent-contrast", getAccentContrastColor(palette.accentColor));
    }, [palette.accentColor]);

    // Keeps the address bar a shareable link to the current setup.
    useEffect(() => {
        const hash = formatSharedSetup({
            rules: sideBehaviorByCoverage,
            undersideScale,
            sideScale,
            roofAngle,
            allowOverlap,
            growthOrder,
            seed,
        });
        window.history.replaceState(null, "", `#${hash}`);
    }, [
        allowOverlap,
        growthOrder,
        roofAngle,
        seed,
        sideBehaviorByCoverage,
        sideScale,
        undersideScale,
    ]);

    // House positions depend on the geometry, so the cached world data is rebuilt.
    useEffect(() => {
        const { houses } = worldRef.current;
        publishWorld({ houses, worldState: buildWorldState({ houses, houseGeometry }) });
    }, [houseGeometry, publishWorld]);

    // advanceTick is recreated on every render, so the dependencies list the values it
    // reads instead; depending on advanceTick would restart the interval on every render.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above.
    useEffect(() => {
        if (!isPlaying) return;

        // Resuming by hand dismisses an earlier overload notice; the guard stays active.
        setOverload(null);
        slowTickStreakRef.current = 0;

        const intervalMs = 1000 / simulationSpeed;
        // Timer lag also catches slow drawing. Browsers throttle timers in hidden tabs, so lag
        // is only measured between two visible ticks.
        let previousVisibleTickAt: number | null = null;
        const intervalId = window.setInterval(() => {
            const tickStartedAt = performance.now();
            const lagMs =
                previousVisibleTickAt === null
                    ? 0
                    : tickStartedAt - previousVisibleTickAt - intervalMs;
            previousVisibleTickAt = document.hidden ? null : tickStartedAt;

            const { tickMs, houseCount } = advanceTick();
            const isSlow = Math.max(tickMs, lagMs) > SLOW_TICK_LIMIT_MS;
            slowTickStreakRef.current = isSlow ? slowTickStreakRef.current + 1 : 0;

            if (
                overloadGuardEnabledRef.current &&
                slowTickStreakRef.current >= SLOW_TICKS_BEFORE_PAUSE
            ) {
                // Stop right away; the effect cleanup only runs after React re-renders.
                window.clearInterval(intervalId);
                setIsPlaying(false);
                setOverload({ houseCount });
            }
        }, intervalMs);

        return () => window.clearInterval(intervalId);
    }, [
        allowOverlap,
        debugProfilingEnabled,
        growthOrder,
        houseGeometry,
        isPlaying,
        sideBehaviorByCoverage,
        simulationSpeed,
    ]);

    return (
        <HouseCanvasContext.Provider
            value={{
                world,
                isPlaying,
                debugProfilingEnabled,
                showConnectionSideIndicators,
                tickCount,
                simulationSpeed,
                sideBehaviorByCoverage,
                undersideScale,
                sideScale,
                roofAngle,
                houseGeometry,
                allowOverlap,
                growthOrder,
                palette,
                coveredSidesPalette,
                colorBySides,
                fillColor,
                strokeColor,
                clickAction,
                pulseParams,
                overload,
                setUndersideScale,
                setSideScale,
                setRoofAngle,
                setAllowOverlap,
                setGrowthOrder,
                setPaletteColor,
                setColorBySides,
                setFillColor,
                setStrokeColor,
                setIsPlaying,
                setDebugProfilingEnabled,
                setShowConnectionSideIndicators,
                setSimulationSpeed,
                setSideBehavior,
                applyRules,
                setClickAction,
                setPulseParam,
                stepSimulation,
                addHouse: () => addHouse(),
                seedHouse: addHouse,
                removeHouse,
                toggleFrozen,
                resetWorld,
                keepGoingAfterOverload,
            }}
        >
            {children}
        </HouseCanvasContext.Provider>
    );
}
