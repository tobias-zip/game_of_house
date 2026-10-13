import { applyTransform, getHousePolygon } from "../domain/house/geometry";
import {
    computeEchoEffect,
    computeLineageEffect,
    computeRippleEffect,
    type RippleEffect,
    rippleReachDelayMs,
} from "../engine/actions/ripple";
import type { AABB, SimulationWorld } from "../engine/simulation/types";
import type { ClickAction, HouseGeometry, HouseNode, Point, Polygon, RippleParams } from "../types";
import {
    type Camera,
    type CanvasSize,
    getCameraOrigin,
    getCameraScale,
    getVisibleWorldBounds,
} from "./camera";

export type PulseKind = Extract<ClickAction, "ripple" | "echo" | "lineage">;

export const isPulseKind = (action: ClickAction): action is PulseKind =>
    action === "ripple" || action === "echo" || action === "lineage";

// A ripple, echo or lineage pulse started by a click.
export type ActiveRipple = {
    kind: PulseKind;
    originHouseId: number;
    startTime: number;
    params: RippleParams;
    // The reached houses as one path per hop distance, rebuilt whenever the world changes.
    pathsByDistance: Path2D[];
    pathsForWorld: SimulationWorld | null;
};

// Outlines and fills of all houses, built once per world instead of on every frame.
export type HousePaths = {
    world: SimulationWorld;
    colorBySides: boolean;
    // One path per fill color: a single color, or one per connected-side count.
    fillPaths: Path2D[];
    outlinePath: Path2D;
    frozenPath: Path2D;
};

type DrawWorldInput = {
    ctx: CanvasRenderingContext2D;
    size: CanvasSize;
    devicePixelRatio: number;
    camera: Camera;
    world: SimulationWorld;
    housePaths: HousePaths;
    houseGeometry: HouseGeometry;
    fillColor: string;
    strokeColor: string;
    frozenColor: string;
    // When set, houses are filled by their number of connected sides (index 0–5).
    coveredSidesPalette: string[] | null;
    showConnectionSideIndicators: boolean;
    ripples: ActiveRipple[];
    now: number;
};

const CONNECTION_INDICATOR_COLOR = "#c00";
// In world units, like the house outline (1).
const FROZEN_OUTLINE_WIDTH = 5;
const CONNECTION_INDICATOR_BASE_HALF_WIDTH = 5;
const CONNECTION_INDICATOR_BASE_INSET = 2;
const CONNECTION_INDICATOR_TIP_INSET = 10;

const boundsOverlap = (a: AABB, b: AABB) =>
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;

const countConnectedSides = (house: HouseNode) => {
    let count = 0;
    for (const connection of house.sides) {
        if (connection) count += 1;
    }
    return count;
};

const addPolygonToPath = (path: Path2D, polygon: Polygon) => {
    for (let index = 0; index < polygon.length; index += 1) {
        const point = polygon[index];
        if (!point) continue;
        if (index === 0) path.moveTo(point.x, point.y);
        else path.lineTo(point.x, point.y);
    }
    path.closePath();
};

// Browsers parse an SVG path string several times faster than they take thousands of
// separate moveTo/lineTo calls.
const createPolygonsPath = (polygons: Polygon[]) => {
    const commands: string[] = [];
    for (const polygon of polygons) {
        polygon.forEach((point, index) => {
            commands.push(`${index === 0 ? "M" : "L"}${point.x} ${point.y}`);
        });
        commands.push("Z");
    }
    return new Path2D(commands.join(""));
};

// `paletteSize` is the number of fill colors when houses are colored by connected sides.
export const buildHousePaths = (world: SimulationWorld, paletteSize: number | null): HousePaths => {
    const polygonsByFill: Polygon[][] = Array.from({ length: paletteSize ?? 1 }, () => []);
    const allPolygons: Polygon[] = [];
    const frozenPolygons: Polygon[] = [];
    for (const house of world.houses) {
        const polygon = world.worldState.byHouseId.get(house.id)?.polygon;
        if (!polygon) continue;
        polygonsByFill[paletteSize ? countConnectedSides(house) : 0]?.push(polygon);
        allPolygons.push(polygon);
        if (house.frozen) frozenPolygons.push(polygon);
    }

    return {
        world,
        colorBySides: paletteSize !== null,
        fillPaths: polygonsByFill.map(createPolygonsPath),
        outlinePath: createPolygonsPath(allPolygons),
        frozenPath: createPolygonsPath(frozenPolygons),
    };
};

const getCentroid = (polygon: Polygon): Point => {
    let x = 0;
    let y = 0;
    for (const point of polygon) {
        x += point.x;
        y += point.y;
    }
    return { x: x / polygon.length, y: y / polygon.length };
};

// A small triangle inside the house pointing inwards from the middle of a connected side,
// in local house coordinates.
const getConnectedSideTriangle = (start: Point, end: Point, centroid: Point): Polygon | null => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) return null;

    const ux = dx / length;
    const uy = dy / length;
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

    const normalA = { x: -uy, y: ux };
    const normalB = { x: uy, y: -ux };
    const towardCenter = { x: centroid.x - midpoint.x, y: centroid.y - midpoint.y };
    const normal = normalA.x * towardCenter.x + normalA.y * towardCenter.y >= 0 ? normalA : normalB;

    const baseCenter = {
        x: midpoint.x + normal.x * CONNECTION_INDICATOR_BASE_INSET,
        y: midpoint.y + normal.y * CONNECTION_INDICATOR_BASE_INSET,
    };

    return [
        {
            x: baseCenter.x - ux * CONNECTION_INDICATOR_BASE_HALF_WIDTH,
            y: baseCenter.y - uy * CONNECTION_INDICATOR_BASE_HALF_WIDTH,
        },
        {
            x: baseCenter.x + ux * CONNECTION_INDICATOR_BASE_HALF_WIDTH,
            y: baseCenter.y + uy * CONNECTION_INDICATOR_BASE_HALF_WIDTH,
        },
        {
            x: midpoint.x + normal.x * CONNECTION_INDICATOR_TIP_INSET,
            y: midpoint.y + normal.y * CONNECTION_INDICATOR_TIP_INSET,
        },
    ];
};

const getConnectedSideTriangles = (houseGeometry: HouseGeometry) => {
    const housePolygon = getHousePolygon(houseGeometry);
    const centroid = getCentroid(housePolygon);
    return housePolygon.map((start, sideIndex) =>
        getConnectedSideTriangle(
            start,
            // The last side ends where the first one starts.
            housePolygon[sideIndex + 1] ?? housePolygon[0],
            centroid,
        ),
    );
};

// Draws the cached house paths, then the houses each ripple currently tints.
export const drawWorld = ({
    ctx,
    size,
    devicePixelRatio,
    camera,
    world,
    housePaths,
    houseGeometry,
    fillColor,
    strokeColor,
    frozenColor,
    coveredSidesPalette,
    showConnectionSideIndicators,
    ripples,
    now,
}: DrawWorldInput) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const scale = getCameraScale(camera, size) * devicePixelRatio;
    const origin = getCameraOrigin(camera, size);
    ctx.setTransform(scale, 0, 0, scale, origin.x * devicePixelRatio, origin.y * devicePixelRatio);

    housePaths.fillPaths.forEach((path, index) => {
        ctx.fillStyle = coveredSidesPalette?.[index] ?? fillColor;
        ctx.fill(path);
    });
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke(housePaths.outlinePath);
    ctx.strokeStyle = frozenColor;
    ctx.lineWidth = FROZEN_OUTLINE_WIDTH;
    ctx.lineJoin = "round";
    ctx.stroke(housePaths.frozenPath);

    ctx.globalCompositeOperation = "lighter";
    for (const ripple of ripples) {
        const elapsedMs = now - ripple.startTime;
        ctx.globalAlpha = ripple.params.opacity;
        ctx.fillStyle = ripple.params.color;

        ripple.pathsByDistance.forEach((path, distance) => {
            const reachDelayMs = rippleReachDelayMs(distance, ripple.params.speed);
            if (elapsedMs >= reachDelayMs && elapsedMs <= reachDelayMs + ripple.params.lifetime) {
                ctx.fill(path);
            }
        });
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (showConnectionSideIndicators) {
        const visibleBounds = getVisibleWorldBounds(camera, size);
        const visibleHouses = world.houses.flatMap((house) => {
            const worldData = world.worldState.byHouseId.get(house.id);
            return worldData && boundsOverlap(worldData.bounds, visibleBounds)
                ? [{ house, worldData }]
                : [];
        });
        const triangles = getConnectedSideTriangles(houseGeometry);
        const indicatorsPath = new Path2D();

        for (const { house, worldData } of visibleHouses) {
            const { transform } = worldData;
            house.sides.forEach((connection, sideIndex) => {
                const triangle = triangles[sideIndex];
                if (!connection || !triangle) return;
                addPolygonToPath(
                    indicatorsPath,
                    triangle.map((point) => applyTransform(transform, point)),
                );
            });
        }

        ctx.fillStyle = CONNECTION_INDICATOR_COLOR;
        ctx.fill(indicatorsPath);
    }
};

const computePulseEffects = (ripple: ActiveRipple, houses: HouseNode[]): RippleEffect[] => {
    switch (ripple.kind) {
        case "ripple":
            return computeRippleEffect(houses, ripple.originHouseId, ripple.params.range);
        case "echo":
            return computeEchoEffect(houses, ripple.originHouseId, ripple.params.range);
        case "lineage":
            return computeLineageEffect(houses, ripple.originHouseId);
    }
};

// A pulse ends once its last lit houses have faded.
export const isRippleFinished = (ripple: ActiveRipple, now: number) =>
    ripple.pathsForWorld !== null &&
    now - ripple.startTime >
        rippleReachDelayMs(ripple.pathsByDistance.length - 1, ripple.params.speed) +
            ripple.params.lifetime;

// Recomputes which houses each pulse reaches after the world changed.
export const refreshRipplePaths = (ripples: ActiveRipple[], world: SimulationWorld) => {
    for (const ripple of ripples) {
        if (ripple.pathsForWorld === world) continue;

        const effects = computePulseEffects(ripple, world.houses);
        const polygonsByDistance: Polygon[][] = [];
        for (const { houseId, distance } of effects) {
            const polygon = world.worldState.byHouseId.get(houseId)?.polygon;
            if (!polygon) continue;
            polygonsByDistance[distance] ??= [];
            polygonsByDistance[distance].push(polygon);
        }

        ripple.pathsByDistance = Array.from(polygonsByDistance, (polygons) =>
            createPolygonsPath(polygons ?? []),
        );
        ripple.pathsForWorld = world;
    }
};
