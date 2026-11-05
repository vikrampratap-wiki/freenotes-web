import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Page,
  ToolType,
  ShapeKind,
  EraserType,
  Stroke,
  Point,
  TextItem,
  TapeItem as TapeItemType,
  ImageItem,
} from '../types';
import { renderPointsToPath } from '../utils/svgPath';
import { TapeItem } from './TapeItem';
import { TextBoxItem } from './TextBoxItem';
import { isPointInPolygon, getBoundingBox, detectGeometricShape, detectScribbleScratch } from '../utils/shapeDetection';
import { Trash2, Copy, Palette, Move, Check, Type, Loader2, Sparkles } from 'lucide-react';
import { recognizeStrokesToText } from '../utils/handwritingOcr';

interface Props {
  page: Page;
  onUpdatePage: (updated: Page) => void;
  activeTool: ToolType;
  strokeColor: string;
  strokeSize: number;
  shapeKind: ShapeKind;
  eraserType: EraserType;
  eraseHighlighterOnly?: boolean;
  zoom: number;
  rulerState?: { x: number; y: number; angle: number; width: number; height: number } | null;
  isRulerActive?: boolean;
  isZoomWindowOpen?: boolean;
  zoomTargetBox?: { x: number; y: number; width: number; height: number };
  onUpdateZoomTargetBox?: (box: { x: number; y: number; width: number; height: number }) => void;
  isStylusOnly?: boolean;
}

interface LassoSelection {
  strokeIds: string[];
  textIds: string[];
  tapeIds: string[];
  imageIds: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}

export const CanvasPage: React.FC<Props> = ({
  page,
  onUpdatePage,
  activeTool,
  strokeColor,
  strokeSize,
  shapeKind,
  eraserType,
  eraseHighlighterOnly = false,
  zoom,
  rulerState,
  isRulerActive,
  isZoomWindowOpen,
  zoomTargetBox,
  onUpdateZoomTargetBox,
  isStylusOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isOcrConverting, setIsOcrConverting] = useState(false);
  const [isDraggingZoomBox, setIsDraggingZoomBox] = useState(false);
  const zoomBoxDragStartRef = useRef<{ mouseX: number; mouseY: number; boxX: number; boxY: number }>({
    mouseX: 0,
    mouseY: 0,
    boxX: 0,
    boxY: 0,
  });

  // Active inking state via refs for 120fps zero-latency rendering
  const isDrawingRef = useRef(false);
  const activePointsRef = useRef<Point[]>([]);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lasso State
  const [lassoingPoints, setLassoingPoints] = useState<Point[] | null>(null);
  const [lassoSelection, setLassoSelection] = useState<LassoSelection | null>(null);
  const [isDraggingLasso, setIsDraggingLasso] = useState(false);
  const lassoDragStartRef = useRef<{ mouseX: number; mouseY: number }>({ mouseX: 0, mouseY: 0 });

  // Laser pointer trail
  const [laserPoints, setLaserPoints] = useState<Point[]>([]);

  // Tape dragging
  const [tapeDragStart, setTapeDragStart] = useState<Point | null>(null);
  const [tapeDragCurrent, setTapeDragCurrent] = useState<Point | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Dynamic canvas dimensions: adapts to PDF page size or standard A4 (794x1123)
  const canvasWidth = page.width || 794;
  const canvasHeight = page.height || 1123;

  // Clear live overlay canvas
  const clearLiveCanvas = useCallback(() => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Render live stroke directly to canvas for zero latency
  const renderLiveStroke = useCallback(() => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pts = activePointsRef.current;
    if (pts.length < 2) return;

    if (activeTool === 'shape') {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeSize;
      ctx.beginPath();
      if (shapeKind === 'rectangle') {
        ctx.strokeRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
      } else if (shapeKind === 'circle') {
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      return;
    }

    // Freehand Pen / Highlighter rendering
    const dummyStroke: Stroke = {
      id: 'live_stroke',
      type: activeTool,
      points: pts,
      color: strokeColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
    };

    const pathStr = renderPointsToPath(dummyStroke);
    if (!pathStr) return;

    const path = new Path2D(pathStr);
    ctx.fillStyle = strokeColor;
    ctx.globalAlpha = dummyStroke.opacity;
    if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fill(path);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }, [activeTool, strokeColor, strokeSize, shapeKind]);

  // Transform coordinates
  const getCoordinates = (e: React.PointerEvent<HTMLDivElement>): Point => {
    if (!containerRef.current) return { x: 0, y: 0, pressure: 0.5 };
    const rect = containerRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left) / zoom;
    let y = (e.clientY - rect.top) / zoom;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    // Ruler edge snapping: if ruler is active, snap line near top edge of ruler
    if (isRulerActive && rulerState && ['ballpoint', 'fountain', 'brush', 'highlighter'].includes(activeTool)) {
      const rad = (rulerState.angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      // Ruler center
      const rcx = rulerState.x + rulerState.width / 2;
      const rcy = rulerState.y + rulerState.height / 2;
      // Distance from ruler centerline
      const perpDist = (x - rcx) * -sin + (y - rcy) * cos;
      if (Math.abs(perpDist - rulerState.height / 2) < 22) {
        // Snap directly onto top edge
        const parallelDist = (x - rcx) * cos + (y - rcy) * sin;
        x = rcx + parallelDist * cos - (rulerState.height / 2) * -sin;
        y = rcy + parallelDist * sin - (rulerState.height / 2) * cos;
      }
    }

    return { x, y, pressure, time: Date.now() };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If stylus-only mode is active, ignore finger touch on canvas for drawing
    if (isStylusOnly && e.pointerType === 'touch' && activeTool !== 'hand') {
      return;
    }

    if ((e.target as HTMLElement).closest('.interactive-item') && activeTool !== 'eraser') {
      return;
    }

    const pt = getCoordinates(e);

    // If clicking outside existing lasso selection, clear it
    if (lassoSelection && activeTool === 'lasso') {
      const b = lassoSelection.bounds;
      const insideBox = pt.x >= b.minX - 10 && pt.x <= b.maxX + 10 && pt.y >= b.minY - 10 && pt.y <= b.maxY + 10;
      if (!insideBox) {
        setLassoSelection(null);
      }
    }

    if (activeTool === 'hand') return;

    if (activeTool === 'text') {
      const newText: TextItem = {
        id: 'txt_' + Math.random().toString(36).substring(2, 9),
        x: pt.x,
        y: pt.y,
        text: 'Type your note...',
        fontSize: 20,
        color: strokeColor,
      };
      onUpdatePage({ ...page, texts: [...page.texts, newText] });
      setSelectedItemId(newText.id);
      return;
    }

    if (activeTool === 'tape') {
      setTapeDragStart(pt);
      setTapeDragCurrent(pt);
      return;
    }

    if (activeTool === 'laser') {
      setLaserPoints([pt]);
      return;
    }

    if (activeTool === 'eraser') {
      eraseAtPoint(pt);
      return;
    }

    if (activeTool === 'lasso') {
      if (!lassoSelection) {
        setLassoingPoints([pt]);
      }
      return;
    }

    // Inking tools: Ballpoint, Fountain, Brush, Highlighter, Shape
    if (['ballpoint', 'fountain', 'brush', 'highlighter', 'shape'].includes(activeTool)) {
      isDrawingRef.current = true;
      activePointsRef.current = [pt];

      // Draw and hold shape detection timer (450ms stationary)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

      renderLiveStroke();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = getCoordinates(e);

    if (activeTool === 'laser' && e.buttons === 1) {
      setLaserPoints((prev) => [...prev.slice(-15), pt]);
      return;
    }

    if (activeTool === 'tape' && tapeDragStart) {
      setTapeDragCurrent(pt);
      return;
    }

    if (activeTool === 'eraser' && (e.buttons === 1 || e.pressure > 0)) {
      eraseAtPoint(pt);
      return;
    }

    if (activeTool === 'lasso' && lassoingPoints) {
      setLassoingPoints((prev) => (prev ? [...prev, pt] : [pt]));
      return;
    }

    if (!isDrawingRef.current) return;

    // Reset hold timer on motion
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    activePointsRef.current.push(pt);
    renderLiveStroke();

    // Trigger shape snap if held still at the end of stroke for 450ms
    holdTimerRef.current = setTimeout(() => {
      if (isDrawingRef.current && activePointsRef.current.length > 8) {
        const detected = detectGeometricShape(activePointsRef.current);
        if (detected) {
          activePointsRef.current = detected.points;
          renderLiveStroke();
        }
      }
    }, 450);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    if (activeTool === 'laser') {
      setTimeout(() => setLaserPoints([]), 600);
      return;
    }

    if (activeTool === 'tape' && tapeDragStart && tapeDragCurrent) {
      const x = Math.min(tapeDragStart.x, tapeDragCurrent.x);
      const y = Math.min(tapeDragStart.y, tapeDragCurrent.y);
      const width = Math.max(40, Math.abs(tapeDragCurrent.x - tapeDragStart.x));
      const height = Math.max(24, Math.abs(tapeDragCurrent.y - tapeDragStart.y));

      const newTape: TapeItemType = {
        id: 'tape_' + Math.random().toString(36).substring(2, 9),
        x,
        y,
        width,
        height,
        color: '#f59e0b',
        isRevealed: false,
      };

      onUpdatePage({ ...page, tapes: [...page.tapes, newTape] });
      setTapeDragStart(null);
      setTapeDragCurrent(null);
      return;
    }

    // Finalize Lasso selection
    if (activeTool === 'lasso' && lassoingPoints && lassoingPoints.length > 5) {
      // Find strokes inside lasso
      const selectedStrokes = page.strokes.filter((s) =>
        s.points.some((p) => isPointInPolygon(p, lassoingPoints))
      );
      const selectedTexts = page.texts.filter((t) =>
        isPointInPolygon({ x: t.x, y: t.y }, lassoingPoints)
      );
      const selectedTapes = page.tapes.filter((t) =>
        isPointInPolygon({ x: t.x + t.width / 2, y: t.y + t.height / 2 }, lassoingPoints)
      );
      const selectedImages = page.images.filter((img) =>
        isPointInPolygon({ x: img.x + img.width / 2, y: img.y + img.height / 2 }, lassoingPoints)
      );

      if (selectedStrokes.length > 0 || selectedTexts.length > 0 || selectedTapes.length > 0 || selectedImages.length > 0) {
        const allPoints: Point[] = [];
        selectedStrokes.forEach((s) => allPoints.push(...s.points));
        selectedTexts.forEach((t) => {
          allPoints.push({ x: t.x, y: t.y });
          allPoints.push({ x: t.x + 100, y: t.y + 40 });
        });
        selectedTapes.forEach((t) => {
          allPoints.push({ x: t.x, y: t.y });
          allPoints.push({ x: t.x + t.width, y: t.y + t.height });
        });

        const bounds = getBoundingBox(allPoints.length > 0 ? allPoints : lassoingPoints);
        setLassoSelection({
          strokeIds: selectedStrokes.map((s) => s.id),
          textIds: selectedTexts.map((t) => t.id),
          tapeIds: selectedTapes.map((t) => t.id),
          imageIds: selectedImages.map((i) => i.id),
          bounds,
        });
      }

      setLassoingPoints(null);
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const pts = [...activePointsRef.current];
    activePointsRef.current = [];
    clearLiveCanvas();

    if (pts.length === 0) return;

    // FreeNotes Scratch-to-Erase gesture: rapidly scribbling back and forth over ink erases it!
    if (activeTool !== 'shape' && detectScribbleScratch(pts)) {
      const scribbleBbox = getBoundingBox(pts);
      const pad = 12;
      const minX = scribbleBbox.minX - pad;
      const maxX = scribbleBbox.maxX + pad;
      const minY = scribbleBbox.minY - pad;
      const maxY = scribbleBbox.maxY + pad;

      const remainingStrokes = page.strokes.filter((s) => {
        const hit = s.points.some((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
        return !hit;
      });

      if (remainingStrokes.length < page.strokes.length) {
        onUpdatePage({ ...page, strokes: remainingStrokes });
        return;
      }
    }

    // Check if shape was selected or auto-detected
    let finalShapeKind: ShapeKind | undefined = undefined;
    if (activeTool === 'shape') {
      finalShapeKind = shapeKind;
    }

    const newStroke: Stroke = {
      id: 'stroke_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      type: activeTool,
      points: pts,
      color: strokeColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
      shapeKind: finalShapeKind,
    };

    onUpdatePage({ ...page, strokes: [...page.strokes, newStroke] });
  };

  const eraseAtPoint = (pt: Point) => {
    const threshold = strokeSize * 2.5 + 12;

    const remainingStrokes = page.strokes.filter((s) => {
      // If erase highlighter only is active, skip regular pen strokes
      if (eraseHighlighterOnly && s.type !== 'highlighter') {
        return true;
      }
      const hit = s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < threshold);
      return !hit;
    });

    const remainingTapes = page.tapes.filter((t) => {
      if (eraseHighlighterOnly) return true;
      const inBounds = pt.x >= t.x && pt.x <= t.x + t.width && pt.y >= t.y && pt.y <= t.y + t.height;
      return !inBounds;
    });

    if (remainingStrokes.length !== page.strokes.length || remainingTapes.length !== page.tapes.length) {
      onUpdatePage({
        ...page,
        strokes: remainingStrokes,
        tapes: remainingTapes,
      });
    }
  };

  // Lasso Actions: Move, Color Change, Duplicate, Delete
  const handleLassoDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingLasso(true);
    lassoDragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLassoDragMove = (e: React.PointerEvent) => {
    if (!isDraggingLasso || !lassoSelection) return;
    const dx = (e.clientX - lassoDragStartRef.current.mouseX) / zoom;
    const dy = (e.clientY - lassoDragStartRef.current.mouseY) / zoom;
    lassoDragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY };

    // Move all selected strokes, texts, tapes
    const updatedStrokes = page.strokes.map((s) => {
      if (!lassoSelection.strokeIds.includes(s.id)) return s;
      return {
        ...s,
        points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
      };
    });

    const updatedTexts = page.texts.map((t) => {
      if (!lassoSelection.textIds.includes(t.id)) return t;
      return { ...t, x: t.x + dx, y: t.y + dy };
    });

    const updatedTapes = page.tapes.map((t) => {
      if (!lassoSelection.tapeIds.includes(t.id)) return t;
      return { ...t, x: t.x + dx, y: t.y + dy };
    });

    setLassoSelection((prev) =>
      prev
        ? {
            ...prev,
            bounds: {
              ...prev.bounds,
              minX: prev.bounds.minX + dx,
              maxX: prev.bounds.maxX + dx,
              minY: prev.bounds.minY + dy,
              maxY: prev.bounds.maxY + dy,
            },
          }
        : null
    );

    onUpdatePage({
      ...page,
      strokes: updatedStrokes,
      texts: updatedTexts,
      tapes: updatedTapes,
    });
  };

  const handleLassoDragEnd = (e: React.PointerEvent) => {
    setIsDraggingLasso(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleLassoChangeColor = (newColor: string) => {
    if (!lassoSelection) return;
    const updatedStrokes = page.strokes.map((s) =>
      lassoSelection.strokeIds.includes(s.id) ? { ...s, color: newColor } : s
    );
    const updatedTexts = page.texts.map((t) =>
      lassoSelection.textIds.includes(t.id) ? { ...t, color: newColor } : t
    );
    onUpdatePage({ ...page, strokes: updatedStrokes, texts: updatedTexts });
  };

  const handleLassoDuplicate = () => {
    if (!lassoSelection) return;
    const newStrokes: Stroke[] = [];
    page.strokes.forEach((s) => {
      if (lassoSelection.strokeIds.includes(s.id)) {
        newStrokes.push({
          ...s,
          id: 'stroke_dup_' + Math.random().toString(36).substring(2, 9),
          points: s.points.map((p) => ({ ...p, x: p.x + 30, y: p.y + 30 })),
        });
      }
    });

    onUpdatePage({ ...page, strokes: [...page.strokes, ...newStrokes] });
    setLassoSelection(null);
  };

  const handleLassoOcrConvert = async () => {
    if (!lassoSelection) return;
    const selectedStrokes = page.strokes.filter((s) => lassoSelection.strokeIds.includes(s.id));
    if (selectedStrokes.length === 0) return;

    try {
      setIsOcrConverting(true);
      const recognizedText = await recognizeStrokesToText(selectedStrokes);
      if (recognizedText) {
        const remainingStrokes = page.strokes.filter((s) => !lassoSelection.strokeIds.includes(s.id));
        const newTextItem: TextItem = {
          id: 'txt_ocr_' + Math.random().toString(36).substring(2, 9),
          x: lassoSelection.bounds.minX,
          y: lassoSelection.bounds.minY,
          text: recognizedText,
          fontSize: 20,
          color: selectedStrokes[0]?.color || '#0f172a',
        };

        onUpdatePage({
          ...page,
          strokes: remainingStrokes,
          texts: [...page.texts, newTextItem],
        });
        setLassoSelection(null);
      } else {
        alert('Could not recognize handwriting. Please ensure letters are clear.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsOcrConverting(false);
    }
  };

  const handleLassoDelete = () => {
    if (!lassoSelection) return;
    const updatedStrokes = page.strokes.filter((s) => !lassoSelection.strokeIds.includes(s.id));
    const updatedTexts = page.texts.filter((t) => !lassoSelection.textIds.includes(t.id));
    const updatedTapes = page.tapes.filter((t) => !lassoSelection.tapeIds.includes(t.id));
    onUpdatePage({ ...page, strokes: updatedStrokes, texts: updatedTexts, tapes: updatedTapes });
    setLassoSelection(null);
  };

  const paperBgColor =
    page.color === 'dark'
      ? '#1e1e24'
      : page.color === 'sepia'
      ? '#fbf0d9'
      : page.color === 'yellow'
      ? '#fef3c7'
      : page.color === 'mint'
      ? '#ecfdf5'
      : '#ffffff';

  const paperLineColor = page.color === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={() => setSelectedItemId(null)}
      className={`relative shadow-2xl rounded-sm transition-transform border border-slate-200/80 dark:border-slate-800 paper-pattern-${page.template} touch-none ${
        activeTool === 'eraser' ? 'canvas-eraser' : activeTool === 'hand' ? 'canvas-hand' : 'canvas-pen'
      }`}
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        minHeight: `${canvasHeight}px`,
        '--paper-bg': paperBgColor,
        '--line-color': paperLineColor,
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
      } as React.CSSProperties}
    >
      {/* Background PDF image if imported (High-DPI sharp rendering) */}
      {page.pdfBackground && (
        <img
          src={page.pdfBackground}
          alt="PDF Background"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          style={{ imageRendering: 'auto' }}
          loading="eager"
        />
      )}

      {/* SVG Vector Layer for all saved strokes */}
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
      >
        {page.strokes.map((stroke) => {
          if (stroke.type === 'shape' && stroke.shapeKind && stroke.points.length >= 2) {
            const p1 = stroke.points[0];
            const p2 = stroke.points[stroke.points.length - 1];
            return (
              <g key={stroke.id}>
                {stroke.shapeKind === 'rectangle' && (
                  <rect
                    x={Math.min(p1.x, p2.x)}
                    y={Math.min(p1.y, p2.y)}
                    width={Math.abs(p2.x - p1.x)}
                    height={Math.abs(p2.y - p1.y)}
                    stroke={stroke.color}
                    strokeWidth={stroke.size}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {stroke.shapeKind === 'circle' && (
                  <ellipse
                    cx={(p1.x + p2.x) / 2}
                    cy={(p1.y + p2.y) / 2}
                    rx={Math.abs(p2.x - p1.x) / 2}
                    ry={Math.abs(p2.y - p1.y) / 2}
                    stroke={stroke.color}
                    strokeWidth={stroke.size}
                    fill="none"
                  />
                )}
                {stroke.shapeKind === 'line' && (
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={stroke.color}
                    strokeWidth={stroke.size}
                    strokeLinecap="round"
                  />
                )}
                {stroke.shapeKind === 'arrow' && (
                  <g>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={stroke.color}
                      strokeWidth={stroke.size}
                      strokeLinecap="round"
                    />
                    <polygon
                      points={`${p2.x},${p2.y} ${p2.x - 12},${p2.y - 7} ${p2.x - 12},${p2.y + 7}`}
                      fill={stroke.color}
                      transform={`rotate(${
                        (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI
                      }, ${p2.x}, ${p2.y})`}
                    />
                  </g>
                )}
                {stroke.shapeKind === 'triangle' && (
                  <polygon
                    points={`${(p1.x + p2.x) / 2},${p1.y} ${p1.x},${p2.y} ${p2.x},${p2.y}`}
                    stroke={stroke.color}
                    strokeWidth={stroke.size}
                    fill="none"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            );
          }

          const pathData = renderPointsToPath(stroke);
          if (!pathData) return null;

          return (
            <path
              key={stroke.id}
              d={pathData}
              fill={stroke.color}
              opacity={stroke.opacity}
              style={{
                mixBlendMode: stroke.type === 'highlighter' ? 'multiply' : 'normal',
              }}
            />
          );
        })}

        {/* Live Lasso loop preview */}
        {lassoingPoints && lassoingPoints.length > 1 && (
          <path
            d={`M ${lassoingPoints.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`}
            fill="rgba(147, 51, 234, 0.12)"
            stroke="#9333ea"
            strokeWidth="1.5"
            strokeDasharray="5 5"
          />
        )}

        {/* Tape drag live preview */}
        {tapeDragStart && tapeDragCurrent && (
          <rect
            x={Math.min(tapeDragStart.x, tapeDragCurrent.x)}
            y={Math.min(tapeDragStart.y, tapeDragCurrent.y)}
            width={Math.abs(tapeDragCurrent.x - tapeDragStart.x)}
            height={Math.abs(tapeDragCurrent.y - tapeDragStart.y)}
            fill="#f59e0b"
            opacity={0.8}
            stroke="#d97706"
            strokeDasharray="4 4"
          />
        )}

        {/* Laser pointer trail */}
        {laserPoints.length > 0 && (
          <g>
            {laserPoints.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={idx === laserPoints.length - 1 ? 6 : (idx / laserPoints.length) * 5}
                fill="#ef4444"
                opacity={idx / laserPoints.length}
                className="blur-[1px]"
              />
            ))}
          </g>
        )}
      </svg>

      {/* Zero-latency Live Inking HTML5 Canvas Overlay */}
      <canvas
        ref={liveCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0 pointer-events-none z-15"
      />

      {/* Lasso Selection Bounding Box & Floating Action Menu */}
      {lassoSelection && (
        <div
          className="absolute border-2 border-dashed border-purple-600 bg-purple-500/10 z-25 pointer-events-auto rounded cursor-move select-none"
          style={{
            left: `${lassoSelection.bounds.minX - 8}px`,
            top: `${lassoSelection.bounds.minY - 8}px`,
            width: `${lassoSelection.bounds.width + 16}px`,
            height: `${lassoSelection.bounds.height + 16}px`,
          }}
          onPointerDown={handleLassoDragStart}
          onPointerMove={handleLassoDragMove}
          onPointerUp={handleLassoDragEnd}
        >
          {/* Floating Action Bar */}
          <div
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick color change */}
            <div className="flex items-center gap-1">
              {['#0f172a', '#2563eb', '#dc2626', '#059669', '#7c3aed'].map((col) => (
                <button
                  key={col}
                  onClick={() => handleLassoChangeColor(col)}
                  className="w-4 h-4 rounded-full border border-black/20 hover:scale-125 transition-transform"
                  style={{ backgroundColor: col }}
                  title="Change color"
                />
              ))}
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

            <button
              onClick={handleLassoOcrConvert}
              disabled={isOcrConverting}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
              title="Convert selected handwriting to computerized digital text"
            >
              {isOcrConverting ? <Loader2 size={12} className="animate-spin" /> : <Type size={12} />}
              <span className="text-[11px]">हस्तलिपि ➔ टेक्स्ट (OCR)</span>
            </button>

            <button
              onClick={handleLassoDuplicate}
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:text-blue-600"
              title="Duplicate"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={handleLassoDelete}
              className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Text & Sticky Notes Layer */}
      {page.texts.map((txt) => (
        <div key={txt.id} className="interactive-item z-20">
          <TextBoxItem
            item={txt}
            isSelected={selectedItemId === txt.id}
            onSelect={() => setSelectedItemId(txt.id)}
            onUpdate={(updated) => {
              onUpdatePage({
                ...page,
                texts: page.texts.map((t) => (t.id === updated.id ? updated : t)),
              });
            }}
            onDelete={() => {
              onUpdatePage({
                ...page,
                texts: page.texts.filter((t) => t.id !== txt.id),
              });
            }}
          />
        </div>
      ))}

      {/* Interactive Study Tape Layer */}
      {page.tapes.map((tape) => (
        <div key={tape.id} className="interactive-item z-20">
          <TapeItem
            tape={tape}
            isSelected={selectedItemId === tape.id}
            onSelect={() => setSelectedItemId(tape.id)}
            onToggleReveal={() => {
              onUpdatePage({
                ...page,
                tapes: page.tapes.map((t) => (t.id === tape.id ? { ...t, isRevealed: !t.isRevealed } : t)),
              });
            }}
            onDelete={() => {
              onUpdatePage({
                ...page,
                tapes: page.tapes.filter((t) => t.id !== tape.id),
              });
            }}
            isEditing={activeTool === 'lasso'}
          />
        </div>
      ))}

      {/* Target Box for Zoom Writing Window */}
      {isZoomWindowOpen && zoomTargetBox && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/15 rounded z-25 cursor-move flex items-center justify-between px-2 select-none shadow-md group"
          style={{
            left: `${zoomTargetBox.x}px`,
            top: `${zoomTargetBox.y}px`,
            width: `${zoomTargetBox.width}px`,
            height: `${zoomTargetBox.height}px`,
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setIsDraggingZoomBox(true);
            zoomBoxDragStartRef.current = {
              mouseX: e.clientX,
              mouseY: e.clientY,
              boxX: zoomTargetBox.x,
              boxY: zoomTargetBox.y,
            };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!isDraggingZoomBox || !onUpdateZoomTargetBox) return;
            const dx = (e.clientX - zoomBoxDragStartRef.current.mouseX) / zoom;
            const dy = (e.clientY - zoomBoxDragStartRef.current.mouseY) / zoom;
            onUpdateZoomTargetBox({
              ...zoomTargetBox,
              x: Math.max(0, zoomBoxDragStartRef.current.boxX + dx),
              y: Math.max(0, zoomBoxDragStartRef.current.boxY + dy),
            });
          }}
          onPointerUp={(e) => {
            setIsDraggingZoomBox(false);
            try {
              (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            } catch (_) {}
          }}
        >
          <span className="text-[10px] font-bold text-blue-700 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded shadow-sm">
            Writing Box
          </span>
          <Move size={12} className="text-blue-700" />
        </div>
      )}
    </div>
  );
};
