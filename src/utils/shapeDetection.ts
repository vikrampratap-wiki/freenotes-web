import { Point, ShapeKind } from '../types';

export function isPointInPolygon(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;

    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getBoundingBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

export function detectGeometricShape(points: Point[]): { kind: ShapeKind; points: Point[] } | null {
  if (points.length < 5) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const distStartEnd = Math.hypot(end.x - start.x, end.y - start.y);
  const bbox = getBoundingBox(points);

  // Check total path length
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }

  // Check if nearly straight line: total path length is very close to direct distance
  if (distStartEnd > 30 && totalLength / distStartEnd < 1.12) {
    return {
      kind: 'line',
      points: [start, end]
    };
  }

  // Check if closed loop: start and end are close compared to perimeter
  const isClosed = distStartEnd < Math.max(30, totalLength * 0.2);

  if (isClosed) {
    // Check aspect ratio and circularity
    // Area of bbox vs circle/ellipse
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    const rx = bbox.width / 2;
    const ry = bbox.height / 2;

    // Check variance of radius for circle/ellipse
    let radiusDiffSum = 0;
    for (const p of points) {
      const normalizedDist = Math.hypot((p.x - cx) / Math.max(1, rx), (p.y - cy) / Math.max(1, ry));
      radiusDiffSum += Math.abs(normalizedDist - 1);
    }
    const avgRadiusDiff = radiusDiffSum / points.length;

    if (avgRadiusDiff < 0.22) {
      return {
        kind: 'circle',
        points: [{ x: bbox.minX, y: bbox.minY }, { x: bbox.maxX, y: bbox.maxY }]
      };
    }

    // Check rectangle: corners near bbox corners
    return {
      kind: 'rectangle',
      points: [{ x: bbox.minX, y: bbox.minY }, { x: bbox.maxX, y: bbox.maxY }]
    };
  }

  return null;
}

/**
 * FreeNotes Scratch-to-Erase gesture detector.
 * Detects rapid back-and-forth zigzag scribbles used to cross out notes.
 */
export function detectScribbleScratch(points: Point[]): boolean {
  if (points.length < 10) return false;

  const bbox = getBoundingBox(points);
  // Scribbles typically happen within a compact region (crossing out a word or line)
  if (bbox.width > 280 || bbox.height > 280) return false;
  if (bbox.width < 14 && bbox.height < 14) return false;

  let xReversals = 0;
  let yReversals = 0;
  let lastDx = 0;
  let lastDy = 0;
  let totalLength = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalLength += Math.hypot(dx, dy);

    if (Math.abs(dx) > 3) {
      if (lastDx !== 0 && (dx > 0) !== (lastDx > 0)) {
        xReversals++;
      }
      lastDx = dx;
    }

    if (Math.abs(dy) > 3) {
      if (lastDy !== 0 && (dy > 0) !== (lastDy > 0)) {
        yReversals++;
      }
      lastDy = dy;
    }
  }

  const diagonal = Math.hypot(bbox.width, bbox.height);
  const isHighDensity = totalLength > 3.0 * diagonal;

  return isHighDensity && (xReversals >= 4 || yReversals >= 4 || (xReversals + yReversals >= 5));
}
