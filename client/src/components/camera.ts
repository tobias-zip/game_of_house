import { clamp, VIEW_BOX } from "../domain/house/geometry";
import type { AABB } from "../engine/simulation/types";
import type { Point } from "../types";

// `pan` is in screen pixels; at zoom 1 the view box fits the canvas.
export type Camera = {
    pan: Point;
    zoom: number;
};

export type CanvasSize = {
    width: number;
    height: number;
};

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 4;
const FIT_PADDING = 0.9;

export const INITIAL_CAMERA: Camera = { pan: { x: 0, y: 0 }, zoom: 0.6 };

const getFitScale = (size: CanvasSize) =>
    Math.min(size.width / VIEW_BOX.width, size.height / VIEW_BOX.height);

// World units to screen pixels; the world origin sits at the canvas center plus `pan`.
export const getCameraScale = (camera: Camera, size: CanvasSize) => getFitScale(size) * camera.zoom;

export const getCameraOrigin = (camera: Camera, size: CanvasSize): Point => ({
    x: size.width / 2 + camera.pan.x,
    y: size.height / 2 + camera.pan.y,
});

export const screenToWorld = (camera: Camera, size: CanvasSize, screenPoint: Point): Point => {
    const scale = getCameraScale(camera, size);
    const origin = getCameraOrigin(camera, size);
    return {
        x: (screenPoint.x - origin.x) / scale,
        y: (screenPoint.y - origin.y) / scale,
    };
};

export const getVisibleWorldBounds = (camera: Camera, size: CanvasSize): AABB => {
    const topLeft = screenToWorld(camera, size, { x: 0, y: 0 });
    const bottomRight = screenToWorld(camera, size, { x: size.width, y: size.height });
    return { minX: topLeft.x, minY: topLeft.y, maxX: bottomRight.x, maxY: bottomRight.y };
};

export const panCamera = (camera: Camera, deltaX: number, deltaY: number): Camera => ({
    ...camera,
    pan: { x: camera.pan.x + deltaX, y: camera.pan.y + deltaY },
});

// Zooms by `factor` while keeping the world point under `screenPoint` in place.
export const zoomCameraAt = (
    camera: Camera,
    size: CanvasSize,
    screenPoint: Point,
    factor: number,
): Camera => {
    const zoom = clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const appliedFactor = zoom / camera.zoom;
    const fromCenterX = screenPoint.x - size.width / 2;
    const fromCenterY = screenPoint.y - size.height / 2;

    return {
        zoom,
        pan: {
            x: fromCenterX - (fromCenterX - camera.pan.x) * appliedFactor,
            y: fromCenterY - (fromCenterY - camera.pan.y) * appliedFactor,
        },
    };
};

export const fitCameraToBounds = (bounds: AABB, size: CanvasSize): Camera => {
    const boundsWidth = Math.max(1, bounds.maxX - bounds.minX);
    const boundsHeight = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(size.width / boundsWidth, size.height / boundsHeight) * FIT_PADDING;
    const zoom = clamp(scale / getFitScale(size), MIN_ZOOM, MAX_ZOOM);
    const appliedScale = getFitScale(size) * zoom;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    return { zoom, pan: { x: -centerX * appliedScale, y: -centerY * appliedScale } };
};
