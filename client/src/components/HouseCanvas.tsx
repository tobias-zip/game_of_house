import { type Ref, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { useHouseCanvas } from "../context/useHouseCanvas";
import { pointInPolygon } from "../domain/house/geometry";
import type { AABB } from "../engine/simulation/types";
import { querySpatialIndex } from "../engine/simulation/worldState";
import { isPulseKind, type Point } from "../types";
import {
    type Camera,
    type CanvasSize,
    fitCameraToBounds,
    INITIAL_CAMERA,
    panCamera,
    type ScreenInsets,
    screenToWorld,
    zoomCameraAt,
} from "./camera";
import {
    type ActiveRipple,
    buildHousePaths,
    drawWorld,
    type HousePaths,
    isRippleFinished,
    refreshRipplePaths,
} from "./drawWorld";
import styles from "./HouseCanvas.module.css";
import { saveCanvasScreenshot } from "./screenshot";

// Pointer movement (CSS px) before a press counts as a drag instead of a click.
const DRAG_THRESHOLD_PX = 5;
const WHEEL_ZOOM_SPEED = 0.001;
const WHEEL_LINE_HEIGHT_PX = 16;

// Canvas edges that Fit keeps houses away from, in CSS px: the top bar and the play bar.
const FIT_INSETS: ScreenInsets = { top: 72, right: 16, bottom: 72, left: 16 };

// What the top bar's actions can do with the canvas.
export type HouseCanvasHandle = {
    fit: () => void;
    resetView: () => void;
    saveScreenshot: () => void;
};

type HouseCanvasProps = {
    ref: Ref<HouseCanvasHandle>;
};

type Gesture = {
    start: Point;
    isDrag: boolean;
};

const getDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const getMidpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function HouseCanvas({ ref }: HouseCanvasProps) {
    const {
        world,
        houseGeometry,
        fillColor,
        strokeColor,
        colorBySides,
        palette,
        coveredSidesPalette: sidesPalette,
        showConnectionSideIndicators,
        clickAction,
        pulseParams,
        seedHouse,
        removeHouse,
        toggleFrozen,
    } = useHouseCanvas();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sizeRef = useRef<CanvasSize>({ width: 0, height: 0 });
    const cameraRef = useRef<Camera>(INITIAL_CAMERA);
    const ripplesRef = useRef<ActiveRipple[]>([]);
    const pointersRef = useRef(new Map<number, Point>());
    const gestureRef = useRef<Gesture | null>(null);
    const needsDrawRef = useRef(true);
    const housePathsRef = useRef<HousePaths | null>(null);

    const coveredSidesPalette = colorBySides ? sidesPalette : null;
    const { accentColor } = palette;

    // The draw loop reads the latest props from here instead of re-rendering.
    const sceneRef = useRef({
        world,
        houseGeometry,
        fillColor,
        strokeColor,
        accentColor,
        coveredSidesPalette,
        showConnectionSideIndicators,
    });
    useEffect(() => {
        sceneRef.current = {
            world,
            houseGeometry,
            fillColor,
            strokeColor,
            accentColor,
            coveredSidesPalette,
            showConnectionSideIndicators,
        };
        needsDrawRef.current = true;
    }, [
        world,
        houseGeometry,
        fillColor,
        strokeColor,
        accentColor,
        coveredSidesPalette,
        showConnectionSideIndicators,
    ]);

    const setCamera = useCallback((camera: Camera) => {
        cameraRef.current = camera;
        needsDrawRef.current = true;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const updateSize = () => {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const devicePixelRatio = window.devicePixelRatio || 1;
            sizeRef.current = { width, height };
            canvas.width = Math.floor(width * devicePixelRatio);
            canvas.height = Math.floor(height * devicePixelRatio);
            needsDrawRef.current = true;
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        let frameId = 0;
        const drawFrame = () => {
            frameId = requestAnimationFrame(drawFrame);

            const now = Date.now();
            const scene = sceneRef.current;
            refreshRipplePaths(ripplesRef.current, scene.world);
            ripplesRef.current = ripplesRef.current.filter(
                (ripple) => !isRippleFinished(ripple, now),
            );
            const hasRipples = ripplesRef.current.length > 0;
            // Keep drawing one frame after the last ripple expires to clear its overlay.
            if (!needsDrawRef.current && !hasRipples) return;
            needsDrawRef.current = hasRipples;

            const size = sizeRef.current;
            if (size.width === 0 || size.height === 0) return;

            const colorBySides = scene.coveredSidesPalette !== null;
            let housePaths = housePathsRef.current;
            if (housePaths?.world !== scene.world || housePaths.colorBySides !== colorBySides) {
                housePaths = buildHousePaths(
                    scene.world,
                    scene.coveredSidesPalette?.length ?? null,
                );
                housePathsRef.current = housePaths;
            }
            drawWorld({
                ctx,
                size,
                devicePixelRatio: canvas.width / size.width,
                camera: cameraRef.current,
                ripples: ripplesRef.current,
                now,
                housePaths,
                ...scene,
            });
        };

        frameId = requestAnimationFrame(drawFrame);
        return () => cancelAnimationFrame(frameId);
    }, []);

    // React registers wheel listeners as passive, which ignores preventDefault().
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const deltaY =
                event.deltaMode === WheelEvent.DOM_DELTA_LINE
                    ? event.deltaY * WHEEL_LINE_HEIGHT_PX
                    : event.deltaY;
            setCamera(
                zoomCameraAt(
                    cameraRef.current,
                    sizeRef.current,
                    { x: event.clientX - rect.left, y: event.clientY - rect.top },
                    Math.exp(-deltaY * WHEEL_ZOOM_SPEED),
                ),
            );
        };

        canvas.addEventListener("wheel", onWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", onWheel);
    }, [setCamera]);

    const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
        const rect = event.currentTarget.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const findHouseAt = (screenPoint: Point) => {
        const { worldState } = sceneRef.current.world;
        const worldPoint = screenToWorld(cameraRef.current, sizeRef.current, screenPoint);
        const pointBounds: AABB = {
            minX: worldPoint.x,
            minY: worldPoint.y,
            maxX: worldPoint.x,
            maxY: worldPoint.y,
        };

        for (const houseId of querySpatialIndex(worldState.spatialIndex, pointBounds)) {
            const worldData = worldState.byHouseId.get(houseId);
            if (worldData && pointInPolygon(worldPoint, worldData.polygon)) return houseId;
        }
        return null;
    };

    const runClickAction = (screenPoint: Point) => {
        const houseId = findHouseAt(screenPoint);
        if (houseId === null) return;

        if (clickAction === "seed") seedHouse(houseId);
        if (clickAction === "remove") removeHouse(houseId);
        if (clickAction === "freeze") toggleFrozen(houseId);
        if (!isPulseKind(clickAction)) return;

        ripplesRef.current.push({
            kind: clickAction,
            originHouseId: houseId,
            startTime: Date.now(),
            params: pulseParams[clickAction],
            pathsByDistance: [],
            pathsForWorld: null,
        });
    };

    const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const point = getCanvasPoint(event);
        pointersRef.current.set(event.pointerId, point);
        event.currentTarget.setPointerCapture(event.pointerId);

        if (pointersRef.current.size === 1) {
            gestureRef.current = { start: point, isDrag: false };
        } else if (gestureRef.current) {
            // A second finger turns the gesture into a pinch; it never ends in a click.
            gestureRef.current.isDrag = true;
        }
    };

    const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const pointers = pointersRef.current;
        const previous = pointers.get(event.pointerId);
        const gesture = gestureRef.current;
        if (!previous || !gesture) return;

        const point = getCanvasPoint(event);

        if (pointers.size === 1) {
            pointers.set(event.pointerId, point);
            if (!gesture.isDrag && getDistance(point, gesture.start) < DRAG_THRESHOLD_PX) return;
            gesture.isDrag = true;
            setCamera(panCamera(cameraRef.current, point.x - previous.x, point.y - previous.y));
            return;
        }

        const [first, second] = [...pointers.values()];
        pointers.set(event.pointerId, point);
        const [nextFirst, nextSecond] = [...pointers.values()];
        if (!first || !second || !nextFirst || !nextSecond) return;

        const previousMidpoint = getMidpoint(first, second);
        const nextMidpoint = getMidpoint(nextFirst, nextSecond);
        const previousDistance = getDistance(first, second);
        if (previousDistance === 0) return;

        const panned = panCamera(
            cameraRef.current,
            nextMidpoint.x - previousMidpoint.x,
            nextMidpoint.y - previousMidpoint.y,
        );
        setCamera(
            zoomCameraAt(
                panned,
                sizeRef.current,
                nextMidpoint,
                getDistance(nextFirst, nextSecond) / previousDistance,
            ),
        );
    };

    const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!pointersRef.current.delete(event.pointerId)) return;

        const gesture = gestureRef.current;
        if (pointersRef.current.size === 0) {
            gestureRef.current = null;
            if (gesture && !gesture.isDrag && event.type === "pointerup") {
                runClickAction(getCanvasPoint(event));
            }
        }
    };

    const fitView = () => {
        const bounds: AABB = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        for (const worldData of sceneRef.current.world.worldState.byHouseId.values()) {
            bounds.minX = Math.min(bounds.minX, worldData.bounds.minX);
            bounds.minY = Math.min(bounds.minY, worldData.bounds.minY);
            bounds.maxX = Math.max(bounds.maxX, worldData.bounds.maxX);
            bounds.maxY = Math.max(bounds.maxY, worldData.bounds.maxY);
        }
        if (bounds.minX === Infinity) return;
        setCamera(fitCameraToBounds(bounds, sizeRef.current, FIT_INSETS));
    };

    const saveScreenshot = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        saveCanvasScreenshot(canvas, getComputedStyle(canvas).getPropertyValue("--canvas-bg"));
    };

    useImperativeHandle(ref, () => ({
        fit: fitView,
        resetView: () => setCamera(INITIAL_CAMERA),
        saveScreenshot,
    }));

    return (
        <div className={styles.viewport}>
            <canvas
                ref={canvasRef}
                className={styles.canvas}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            />
        </div>
    );
}

export default HouseCanvas;
