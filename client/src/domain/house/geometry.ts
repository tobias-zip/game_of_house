import type {
    HouseGeometry,
    HouseNode,
    HousePolygon,
    Point,
    Polygon,
    Segment,
    SideIndex,
    Transform,
} from "../../types";

export const VIEW_BOX = {
    minX: -500,
    minY: -350,
    width: 1000,
    height: 700,
};

const HOUSE_TOP_Y = -20;

export const IDENTITY_TRANSFORM: Transform = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0,
};

export const OVERLAP_EPSILON = 0.0001;

export const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

export const applyTransform = (transform: Transform, point: Point): Point => ({
    x: transform.a * point.x + transform.c * point.y + transform.e,
    y: transform.b * point.x + transform.d * point.y + transform.f,
});

export const getHousePolygon = (geometry: HouseGeometry): HousePolygon => {
    const halfUnderside = geometry.undersideLength / 2;
    const topY = HOUSE_TOP_Y;
    const bottomY = topY + geometry.sideLength;
    const apexY = topY - geometry.roofHeight;

    return [
        { x: -halfUnderside, y: bottomY },
        { x: halfUnderside, y: bottomY },
        { x: halfUnderside, y: topY },
        { x: 0, y: apexY },
        { x: -halfUnderside, y: topY },
    ];
};

export const transformPolygon = (polygon: Polygon, transform: Transform): Polygon => {
    return polygon.map((point: Point) => applyTransform(transform, point));
};

/**
 * Checks if a point is inside a polygon using the ray casting algorithm
 */
export const pointInPolygon = (point: Point, polygon: Polygon): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const current = polygon[i];
        const previous = polygon[j];
        if (!current || !previous) continue;
        const xi = current.x;
        const yi = current.y;
        const xj = previous.x;
        const yj = previous.y;

        const intersect =
            yi > point.y !== yj > point.y &&
            point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
};

// True if some edge normal of `polygon` separates the two polygons (separating axis
// theorem). Touching polygons count as separated. Written without allocations because
// growth runs this test tens of thousands of times per tick.
const hasSeparatingEdgeNormal = (polygon: Polygon, other: Polygon) => {
    for (let index = 0; index < polygon.length; index += 1) {
        const start = polygon[index];
        const end = polygon[(index + 1) % polygon.length];
        if (!start || !end) continue;
        const normalX = start.y - end.y;
        const normalY = end.x - start.x;
        const length = Math.hypot(normalX, normalY);
        if (length < OVERLAP_EPSILON) continue;
        const axisX = normalX / length;
        const axisY = normalY / length;

        let polygonMin = Infinity;
        let polygonMax = -Infinity;
        for (const point of polygon) {
            const projection = point.x * axisX + point.y * axisY;
            if (projection < polygonMin) polygonMin = projection;
            if (projection > polygonMax) polygonMax = projection;
        }

        let otherMin = Infinity;
        let otherMax = -Infinity;
        for (const point of other) {
            const projection = point.x * axisX + point.y * axisY;
            if (projection < otherMin) otherMin = projection;
            if (projection > otherMax) otherMax = projection;
        }

        if (polygonMax <= otherMin + OVERLAP_EPSILON || otherMax <= polygonMin + OVERLAP_EPSILON) {
            return true;
        }
    }
    return false;
};

// Convex polygons only.
export const polygonsOverlapArea = (a: Polygon, b: Polygon) =>
    !hasSeparatingEdgeNormal(a, b) && !hasSeparatingEdgeNormal(b, a);

export const getSideSegment = (side: SideIndex, geometry: HouseGeometry): Segment => {
    const polygon = getHousePolygon(geometry);

    if (side === 0) return { start: polygon[0], end: polygon[1] };
    if (side === 1) return { start: polygon[1], end: polygon[2] };
    if (side === 2) return { start: polygon[2], end: polygon[3] };
    if (side === 3) return { start: polygon[3], end: polygon[4] };
    return { start: polygon[4], end: polygon[0] };
};

export const computeChildTransform = (
    parentTransform: Transform,
    parentSide: SideIndex,
    ownSide: SideIndex,
    geometry: HouseGeometry,
): Transform => {
    const parentSegment = getSideSegment(parentSide, geometry);
    const ownSegment = getSideSegment(ownSide, geometry);

    const targetStart = applyTransform(parentTransform, parentSegment.end);
    const targetEnd = applyTransform(parentTransform, parentSegment.start);

    const ownVector = {
        x: ownSegment.end.x - ownSegment.start.x,
        y: ownSegment.end.y - ownSegment.start.y,
    };
    const targetVector = {
        x: targetEnd.x - targetStart.x,
        y: targetEnd.y - targetStart.y,
    };

    const ownAngle = Math.atan2(ownVector.y, ownVector.x);
    const targetAngle = Math.atan2(targetVector.y, targetVector.x);
    const angle = targetAngle - ownAngle;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const tx = targetStart.x - (cos * ownSegment.start.x - sin * ownSegment.start.y);
    const ty = targetStart.y - (sin * ownSegment.start.x + cos * ownSegment.start.y);

    return {
        a: cos,
        b: sin,
        c: -sin,
        d: cos,
        e: tx,
        f: ty,
    };
};

export const computeTransforms = (houses: HouseNode[], geometry: HouseGeometry) => {
    const transforms = new Map<number, Transform>();
    if (houses.length === 0) return transforms;

    // Supports a forest of roots so detached survivors can still render and regrow.
    for (const house of houses) {
        if (house.parentId === null || house.parentSide === null || house.ownSide === null) {
            transforms.set(house.id, house.rootTransform ?? IDENTITY_TRANSFORM);
        }
    }

    let changed = true;
    while (changed) {
        changed = false;
        for (const house of houses) {
            if (transforms.has(house.id)) continue;
            if (house.parentId === null || house.parentSide === null || house.ownSide === null) {
                transforms.set(house.id, house.rootTransform ?? IDENTITY_TRANSFORM);
                changed = true;
                continue;
            }

            const parentTransform = transforms.get(house.parentId);
            if (!parentTransform) continue;

            transforms.set(
                house.id,
                computeChildTransform(parentTransform, house.parentSide, house.ownSide, geometry),
            );
            changed = true;
        }
    }

    for (const house of houses) {
        if (!transforms.has(house.id)) {
            transforms.set(house.id, IDENTITY_TRANSFORM);
        }
    }

    return transforms;
};
