import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRootHouse } from "../domain/house/graph";
import { addRandomHouse } from "../engine/simulation/addRandomHouse";
import { runSimulationTick } from "../engine/simulation/runTick";
import type { SimulationWorld } from "../engine/simulation/types";
import { buildWorldState } from "../engine/simulation/worldState";
import { DEFAULT_RULES } from "../rules";
import { formatSharedSetup, parseSharedSetup } from "../shareLink";
import { loadThemeName, saveThemeName, THEMES, type ThemeName } from "../theme";
import type {
    ClickAction,
    CoveredSideCount,
    HouseGeometry,
    RippleParams,
    SideBehavior,
    SideBehaviorByCoverage,
} from "../types";
import { HouseCanvasContext, type OverloadNotice } from "./HouseCanvasContext";

const BASE_UNDERSIDE_LENGTH = 120;
const DEFAULT_SIMULATION_SPEED = 2;

// The simulation pauses itself after this many consecutive ticks that took longer than
// the limit or started that much late.
const SLOW_TICK_LIMIT_MS = 200;
const SLOW_TICKS_BEFORE_PAUSE = 3;

const DEFAULT_RIPPLE_PARAMS: RippleParams = {
    // speed is in "houses per second"
    speed: 40,
    color: "#ff5a36",
    opacity: 0.5,
    // range is in graph hops
    range: 10,
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
    const [sideBehaviorByCoverage, setSideBehaviorByCoverage] = useState<SideBehaviorByCoverage>(
        () => sharedSetup.rules ?? DEFAULT_RULES,
    );
    const [isPlaying, setIsPlaying] = useState(true);
    const [simulationSpeed, setSimulationSpeed] = useState(DEFAULT_SIMULATION_SPEED);
    const [tickCount, setTickCount] = useState(0);
    const [overload, setOverload] = useState<OverloadNotice | null>(null);
    const [debugProfilingEnabled, setDebugProfilingEnabled] = useState(false);
    const [showConnectionSideIndicators, setShowConnectionSideIndicators] = useState(false);
    const [themeName, setThemeNameState] = useState<ThemeName>(loadThemeName);
    const [colorBySides, setColorBySides] = useState(true);
    const [fillColor, setFillColor] = useState(() => THEMES[themeName].fillColor);
    const [strokeColor, setStrokeColor] = useState(() => THEMES[themeName].strokeColor);
    const [clickAction, setClickAction] = useState<ClickAction>("ripple");
    const [rippleParams, setRippleParams] = useState<RippleParams>(DEFAULT_RIPPLE_PARAMS);

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
            nextHouseId: nextHouseIdRef.current,
            worldState: worldRef.current.worldState,
            debugProfilingEnabled,
        });
        const tickMs = performance.now() - tickStart;

        nextHouseIdRef.current = result.nextHouseId;
        tickCountRef.current += 1;
        publishWorld({ houses: result.houses, worldState: result.worldState });
        setTickCount(tickCountRef.current);

        if (debugProfilingEnabled && result.profile) {
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

    const addHouse = () => {
        const houses = addRandomHouse({
            houses: worldRef.current.houses,
            worldState: worldRef.current.worldState,
            houseGeometry,
            allowOverlap,
            newHouseId: nextHouseIdRef.current,
        });
        if (!houses) return;

        nextHouseIdRef.current += 1;
        publishWorld({ houses, worldState: worldRef.current.worldState });
    };

    const resetWorld = () => {
        publishWorld(createInitialWorld(nextHouseIdRef.current, houseGeometry));
        nextHouseIdRef.current += 1;
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

    const setThemeName = (nextThemeName: ThemeName) => {
        setThemeNameState(nextThemeName);
        saveThemeName(nextThemeName);
        setFillColor(THEMES[nextThemeName].fillColor);
        setStrokeColor(THEMES[nextThemeName].strokeColor);
    };

    useEffect(() => {
        document.documentElement.dataset.theme = themeName;
    }, [themeName]);

    // Keeps the address bar a shareable link to the current rules and shape.
    useEffect(() => {
        const hash = formatSharedSetup({
            rules: sideBehaviorByCoverage,
            undersideScale,
            sideScale,
            roofAngle,
            allowOverlap,
        });
        window.history.replaceState(null, "", `#${hash}`);
    }, [allowOverlap, roofAngle, sideBehaviorByCoverage, sideScale, undersideScale]);

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
                themeName,
                colorBySides,
                fillColor,
                strokeColor,
                clickAction,
                rippleParams,
                overload,
                setUndersideScale,
                setSideScale,
                setRoofAngle,
                setAllowOverlap,
                setThemeName,
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
                setRippleParams,
                stepSimulation,
                addHouse,
                resetWorld,
                keepGoingAfterOverload,
            }}
        >
            {children}
        </HouseCanvasContext.Provider>
    );
}
