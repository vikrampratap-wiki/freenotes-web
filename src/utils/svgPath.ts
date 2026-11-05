import { getStroke } from 'perfect-freehand';
import { Point, Stroke, ToolType } from '../types';

export function getStrokeOptions(type: ToolType, size: number) {
  switch (type) {
    case 'ballpoint':
      return {
        size,
        thinning: 0.1,
        smoothing: 0.5,
        streamline: 0.45,
        simulatePressure: true,
      };
    case 'fountain':
      return {
        size,
        thinning: 0.6,
        smoothing: 0.65,
        streamline: 0.6,
        simulatePressure: true,
      };
    case 'brush':
      return {
        size: size * 1.3,
        thinning: 0.8,
        smoothing: 0.75,
        streamline: 0.7,
        simulatePressure: true,
      };
    case 'highlighter':
      return {
        size: size * 2.2,
        thinning: 0,
        smoothing: 0.3,
        streamline: 0.3,
        simulatePressure: false,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
      };
    default:
      return {
        size,
        thinning: 0.3,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: true,
      };
  }
}

export function getSvgPathFromStroke(stroke: number[][], closed = true): string {
  const len = stroke.length;
  if (len < 4) return '';

  let a = stroke[0];
  let b = stroke[1];
  const c = stroke[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${((b[0] + c[0]) / 2).toFixed(2)},${((b[1] + c[1]) / 2).toFixed(2)}`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = stroke[i];
    b = stroke[i + 1];
    result += ` T${((a[0] + b[0]) / 2).toFixed(2)},${((a[1] + b[1]) / 2).toFixed(2)}`;
  }

  if (closed) {
    result += 'Z';
  }

  return result;
}

export function renderPointsToPath(stroke: Stroke): string {
  if (stroke.points.length === 0) return '';
  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    const r = stroke.size / 2;
    return `M ${p.x - r} ${p.y} A ${r} ${r} 0 1 0 ${p.x + r} ${p.y} A ${r} ${r} 0 1 0 ${p.x - r} ${p.y} Z`;
  }

  const options = getStrokeOptions(stroke.type, stroke.size);
  const inputPoints = stroke.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]);
  const outline = getStroke(inputPoints, options);
  return getSvgPathFromStroke(outline);
}
