import { applyTransform, getHousePolygon } from "../domain/house/geometry";
import {
    computeRippleEffect,
    type RippleEffect,
    rippleReachDelayMs,
} from "../engine/actions/ripple";
import type { AABB, SimulationWorld } from "../engine/simulation/types";
import type { HouseGeometry, HouseNode, Point, Polygon, RippleParams } from "../types";
import {
    type Camera,
    type CanvasSize,
    getCameraOrigin,
    getCameraScale,
    getVisibleWorldBounds,
} from "./camera";

export type ActiveRipple = {
    originHouseId: number;
    startTime: number;
    params: RippleParams;
    // Hop distances, recomputed whenever the houses change.
    effects: RippleEffect[];
    effectsForHouses: HouseNode[] | null;
};

type DrawWorldInput = {
    ctx: CanvasRenderingContext2D;
    size: CanvasSize;
    devicePixelRatio: number;
    camera: Camera;
    world: SimulationWorld;
    houseGeometry: HouseGeometry;
    fillColor: string;
    strokeColor: string;
    // When set, houses are filled by their number of connected sides (index 0–5).
    coveredSidesPalette: string[] | null;
    showConnectionSideIndicators: boolean;
    ripples: ActiveRipple[];
    now: number;
};

const CONNECTION_INDICATOR_COLOR = "#c00";
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
    path.moveTo(polygon[0].x, polygon[0].y);
    for (let index = 1; index < polygon.length; index += 1) {
        path.lineTo(polygon[index].x, polygon[index].y);
    }
    path.closePath();
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
            housePolygon[(sideIndex + 1) % housePolygon.length],
            centroid,
        ),
    );
};

// Draws all visible houses as one path, then one overlay path per active ripple.
export const drawWorld = ({
    ctx,
    size,
    devicePixelRatio,
    camera,
    world,
    houseGeometry,
    fillColor,
    strokeColor,
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

    const visibleBounds = getVisibleWorldBounds(camera, size);
    const visibleHouses = world.houses.filter((house) => {
        const worldData = world.worldState.byHouseId.get(house.id);
        return worldData !== undefined && boundsOverlap(worldData.bounds, visibleBounds);
    });

    // One path per fill color: a single color, or one per connected-side count.
    const fillPaths = (coveredSidesPalette ?? [fillColor]).map(() => new Path2D());
    const outlinePath = new Path2D();
    for (const house of visibleHouses) {
        const { polygon } = world.worldState.byHouseId.get(house.id)!;
        const fillIndex = coveredSidesPalette ? countConnectedSides(house) : 0;
        addPolygonToPath(fillPaths[fillIndex], polygon);
        addPolygonToPath(outlinePath, polygon);
    }
    fillPaths.forEach((path, index) => {
        ctx.fillStyle = coveredSidesPalette ? coveredSidesPalette[index] : fillColor;
        ctx.fill(path);
    });
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke(outlinePath);

    ctx.globalCompositeOperation = "lighter";
    for (const ripple of ripples) {
        const elapsedMs = now - ripple.startTime;
        const ripplePath = new Path2D();
        let hasActiveHouse = false;

        for (const effect of ripple.effects) {
            const reachDelayMs = rippleReachDelayMs(effect.distance, ripple.params.speed);
            const isActive =
                elapsedMs >= reachDelayMs && elapsedMs <= reachDelayMs + ripple.params.lifetime;
            const worldData = world.worldState.byHouseId.get(effect.houseId);
            if (!isActive || !worldData || !boundsOverlap(worldData.bounds, visibleBounds))
                continue;

            addPolygonToPath(ripplePath, worldData.polygon);
            hasActiveHouse = true;
        }

        if (!hasActiveHouse) continue;
        ctx.globalAlpha = ripple.params.opacity;
        ctx.fillStyle = ripple.params.color;
        ctx.fill(ripplePath);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (showConnectionSideIndicators) {
        const triangles = getConnectedSideTriangles(houseGeometry);
        const indicatorsPath = new Path2D();

        for (const house of visibleHouses) {
            const { transform } = world.worldState.byHouseId.get(house.id)!;
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

// Recomputes ripple hop distances after the houses changed.
export const refreshRippleEffects = (ripples: ActiveRipple[], houses: HouseNode[]) => {
    for (const ripple of ripples) {
        if (ripple.effectsForHouses === houses) continue;
        ripple.effects = computeRippleEffect(houses, ripple.originHouseId, ripple.params.range);
        ripple.effectsForHouses = houses;
    }
};
