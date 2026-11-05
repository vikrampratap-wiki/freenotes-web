import React, { useRef, useState, useCallback, useEffect } from 'react';
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
import {
  isPointInPolygon,
  getBoundingBox,
  detectGeometricShape,
  detectScribbleScratch,
} from '../utils/shapeDetection';
import { Trash2, Copy, Move, Type, Loader2, Maximize2 } from 'lucide-react';
import { recognizeStrokesToText } from '../utils/handwritingOcr';
import { renderPdfPageToCanvas } from '../utils/pdfEngine';

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
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isOcrConverting, setIsOcrConverting] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
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
  const snappedShapeKindRef = useRef<ShapeKind | undefined>(undefined);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lasso State
  const [lassoingPoints, setLassoingPoints] = useState<Point[] | null>(null);
  const [lassoSelection, setLassoSelection] = useState<LassoSelection | null>(null);
  const [isDraggingLasso, setIsDraggingLasso] = useState(false);
  const lassoDragStartRef = useRef<{ mouseX: number; mouseY: number }>({ mouseX: 0, mouseY: 0 });

  // Image Drag & Resize State
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);
  const [resizingImageId, setResizingImageId] = useState<string | null>(null);
  const imgDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; origW: number; origH: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: 100,
    origH: 100,
  });

  // Laser pointer trail
  const [laserPoints, setLaserPoints] = useState<Point[]>([]);

  // Tape dragging
  const [tapeDragStart, setTapeDragStart] = useState<Point | null>(null);
  const [tapeDragCurrent, setTapeDragCurrent] = useState<Point | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const canvasWidth = page.width || 794;
  const canvasHeight = page.height || 1123;

  // Render Ultra-HD vector PDF page whenever page or zoom changes
  useEffect(() => {
    if (!page.pdfDocId || !page.pdfPageNumber || !pdfCanvasRef.current) return;
    let activeTask: { cancel: () => void } | null = null;
    let isMounted = true;

    renderPdfPageToCanvas(
      page.pdfDocId,
      page.pdfPageNumber,
      pdfCanvasRef.current,
      canvasWidth,
      canvasHeight,
      zoom
    ).then((task) => {
      if (isMounted) {
        activeTask = task;
      } else {
        task.cancel();
      }
    });

    return () => {
      isMounted = false;
      activeTask?.cancel();
    };
  }, [page.pdfDocId, page.pdfPageNumber, canvasWidth, canvasHeight, zoom]);

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

    const currentShapeKind = activeTool === 'shape' ? shapeKind : snappedShapeKindRef.current;

    if (currentShapeKind) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (currentShapeKind === 'rectangle') {
        ctx.strokeRect(
          Math.min(p1.x, p2.x),
          Math.min(p1.y, p2.y),
          Math.abs(p2.x - p1.x),
          Math.abs(p2.y - p1.y)
        );
      } else if (currentShapeKind === 'circle') {
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (currentShapeKind === 'triangle') {
        ctx.moveTo((p1.x + p2.x) / 2, p1.y);
        ctx.lineTo(p1.x, p2.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.stroke();
      } else if (currentShapeKind === 'arrow') {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 14 * Math.cos(angle - Math.PI / 6), p2.y - 14 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - 14 * Math.cos(angle + Math.PI / 6), p2.y - 14 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = strokeColor;
        ctx.fill();
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

    // Ruler edge snapping: if ruler is active, snap line near top or bottom edge of ruler
    if (isRulerActive && rulerState && ['ballpoint', 'fountain', 'brush', 'highlighter'].includes(activeTool)) {
      const rad = (rulerState.angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rcx = rulerState.x + rulerState.width / 2;
      const rcy = rulerState.y + rulerState.height / 2;
      const perpDist = (x - rcx) * -sin + (y - rcy) * cos;
      if (Math.abs(perpDist + rulerState.height / 2) < 24) {
        const parallelDist = (x - rcx) * cos + (y - rcy) * sin;
        x = rcx + parallelDist * cos + (rulerState.height / 2) * -sin;
        y = rcy + parallelDist * sin + (rulerState.height / 2) * cos;
      } else if (Math.abs(perpDist - rulerState.height / 2) < 24) {
        const parallelDist = (x - rcx) * cos + (y - rcy) * sin;
        x = rcx + parallelDist * cos - (rulerState.height / 2) * -sin;
        y = rcy + parallelDist * sin - (rulerState.height / 2) * cos;
      }
    }

    return { x, y, pressure, time: Date.now() };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isStylusOnly && e.pointerType === 'touch' && activeTool !== 'hand') {
      return;
    }

    if ((e.target as HTMLElement).closest('.interactive-item') && activeTool !== 'eraser') {
      return;
    }

    const pt = getCoordinates(e);

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
        text: 'यहाँ लिखें (Double-click to edit)...',
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

    if (['ballpoint', 'fountain', 'brush', 'highlighter', 'shape'].includes(activeTool)) {
      isDrawingRef.current = true;
      snappedShapeKindRef.current = undefined;
      activePointsRef.current = [pt];

      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

      renderLiveStroke();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = getCoordinates(e);

    if (activeTool === 'laser' && e.buttons === 1) {
      setLaserPoints((prev) => [...prev.slice(-18), pt]);
      return;
    }

    if (activeTool === 'tape' && tapeDragStart) {
      setTapeDragCurrent(pt);
      return;
    }

    if (activeTool === 'eraser' && (e.buttons === 1 || (e.pressure && e.pressure > 0))) {
      eraseAtPoint(pt);
      return;
    }

    if (activeTool === 'lasso' && lassoingPoints) {
      setLassoingPoints((prev) => (prev ? [...prev, pt] : [pt]));
      return;
    }

    if (!isDrawingRef.current) return;

    if (snappedShapeKindRef.current) {
      return;
    }

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    activePointsRef.current.push(pt);
    renderLiveStroke();

    holdTimerRef.current = setTimeout(() => {
      if (isDrawingRef.current && activePointsRef.current.length > 8 && activeTool !== 'shape') {
        const detected = detectGeometricShape(activePointsRef.current);
        if (detected) {
          snappedShapeKindRef.current = detected.kind;
          activePointsRef.current = detected.points;
          renderLiveStroke();
        }
      }
    }, 420);
  };

  const handlePointerUp = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    if (activeTool === 'laser') {
      setTimeout(() => setLaserPoints([]), 600);
      return;
    }

    if (activeTool === 'tape' && tapeDragStart && tapeDragCurrent) {
      const x = Math.min(tapeDragStart.x, tapeDragCurrent.x);
      const y = Math.min(tapeDragStart.y, tapeDragCurrent.y);
      const width = Math.max(50, Math.abs(tapeDragCurrent.x - tapeDragStart.x));
      const height = Math.max(26, Math.abs(tapeDragCurrent.y - tapeDragStart.y));

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
      setSelectedItemId(newTape.id);
      setTapeDragStart(null);
      setTapeDragCurrent(null);
      return;
    }

    // Finalize Lasso selection
    if (activeTool === 'lasso' && lassoingPoints && lassoingPoints.length > 5) {
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

      if (
        selectedStrokes.length > 0 ||
        selectedTexts.length > 0 ||
        selectedTapes.length > 0 ||
        selectedImages.length > 0
      ) {
        const allPoints: Point[] = [];
        selectedStrokes.forEach((s) => allPoints.push(...s.points));
        selectedTexts.forEach((t) => {
          allPoints.push({ x: t.x, y: t.y });
          allPoints.push({ x: t.x + 120, y: t.y + 40 });
        });
        selectedTapes.forEach((t) => {
          allPoints.push({ x: t.x, y: t.y });
          allPoints.push({ x: t.x + t.width, y: t.y + t.height });
        });
        selectedImages.forEach((img) => {
          allPoints.push({ x: img.x, y: img.y });
          allPoints.push({ x: img.x + img.width, y: img.y + img.height });
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
    const snappedKind = snappedShapeKindRef.current;
    activePointsRef.current = [];
    snappedShapeKindRef.current = undefined;
    clearLiveCanvas();

    if (pts.length === 0) return;

    if (activeTool !== 'shape' && !snappedKind && detectScribbleScratch(pts)) {
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

    const finalShapeKind: ShapeKind | undefined =
      activeTool === 'shape' ? shapeKind : snappedKind;

    const newStroke: Stroke = {
      id: 'stroke_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      type: finalShapeKind ? 'shape' : activeTool,
      points: pts,
      color: strokeColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
      shapeKind: finalShapeKind,
    };

    onUpdatePage({ ...page, strokes: [...page.strokes, newStroke] });
  };

  const eraseAtPoint = (pt: Point) => {
    const threshold = strokeSize * 2.2 + 10;
    let changed = false;
    const nextStrokes: Stroke[] = [];

    for (const s of page.strokes) {
      if (eraseHighlighterOnly && s.type !== 'highlighter') {
        nextStrokes.push(s);
        continue;
      }

      if (eraserType === 'pixel' && s.type !== 'shape' && s.points.length > 2) {
        let currentSegment: Point[] = [];
        let strokeHit = false;
        for (const p of s.points) {
          if (Math.hypot(p.x - pt.x, p.y - pt.y) < threshold) {
            strokeHit = true;
            if (currentSegment.length >= 2) {
              nextStrokes.push({
                ...s,
                id: 'stroke_split_' + Math.random().toString(36).substring(2, 9),
                points: currentSegment,
              });
            }
            currentSegment = [];
          } else {
            currentSegment.push(p);
          }
        }
        if (strokeHit) {
          changed = true;
          if (currentSegment.length >= 2) {
            nextStrokes.push({
              ...s,
              id: 'stroke_split_' + Math.random().toString(36).substring(2, 9),
              points: currentSegment,
            });
          }
        } else {
          nextStrokes.push(s);
        }
      } else {
        const hit = s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < threshold);
        if (hit) {
          changed = true;
        } else {
          nextStrokes.push(s);
        }
      }
    }

    const remainingTapes = page.tapes.filter((t) => {
      if (eraseHighlighterOnly) return true;
      const inBounds = pt.x >= t.x && pt.x <= t.x + t.width && pt.y >= t.y && pt.y <= t.y + t.height;
      if (inBounds) changed = true;
      return !inBounds;
    });

    if (changed) {
      onUpdatePage({
        ...page,
        strokes: nextStrokes,
        tapes: remainingTapes,
      });
    }
  };

  // Lasso Actions
  const handleLassoDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingLasso(true);
    lassoDragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLassoDragMove = (e: React.PointerEvent) => {
    if (!isDraggingLasso || !lassoSelection) return;
    const dx = (e.clientX - lassoDragStartRef.current.mouseX) / zoom;
    const dy = (e.clientY - lassoDragStartRef.current.mouseY) / zoom;
    lassoDragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY };

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

    const updatedImages = page.images.map((img) => {
      if (!lassoSelection.imageIds.includes(img.id)) return img;
      return { ...img, x: img.x + dx, y: img.y + dy };
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
      images: updatedImages,
    });
  };

  const handleLassoDragEnd = (e: React.PointerEvent) => {
    setIsDraggingLasso(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
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

    const newImages: ImageItem[] = [];
    page.images.forEach((img) => {
      if (lassoSelection.imageIds.includes(img.id)) {
        newImages.push({
          ...img,
          id: 'img_dup_' + Math.random().toString(36).substring(2, 9),
          x: img.x + 30,
          y: img.y + 30,
        });
      }
    });

    onUpdatePage({
      ...page,
      strokes: [...page.strokes, ...newStrokes],
      images: [...page.images, ...newImages],
    });
    setLassoSelection(null);
  };

  const handleLassoOcrConvert = async () => {
    if (!lassoSelection) return;
    const selectedStrokes = page.strokes.filter((s) => lassoSelection.strokeIds.includes(s.id));
    if (selectedStrokes.length === 0) return;

    try {
      setIsOcrConverting(true);
      setOcrNotice(null);
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
        setOcrNotice('हस्तलिपि स्पष्ट नहीं मिली — कृपया अक्षर साफ लिखें।');
        setTimeout(() => setOcrNotice(null), 3500);
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
    const updatedImages = page.images.filter((i) => !lassoSelection.imageIds.includes(i.id));
    onUpdatePage({
      ...page,
      strokes: updatedStrokes,
      texts: updatedTexts,
      tapes: updatedTapes,
      images: updatedImages,
    });
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
      : page.color === 'pink'
      ? '#fdf2f8'
      : '#ffffff';

  const paperLineColor = page.color === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <div
      style={{
        width: `${Math.round(canvasWidth * zoom)}px`,
        height: `${Math.round(canvasHeight * zoom)}px`,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => setSelectedItemId(null)}
        className={`relative shadow-2xl rounded-sm border border-slate-200/80 dark:border-slate-800 paper-pattern-${page.template} touch-none ${
          activeTool === 'eraser' ? 'canvas-eraser' : activeTool === 'hand' ? 'canvas-hand' : 'canvas-pen'
        }`}
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          minHeight: `${canvasHeight}px`,
          '--paper-bg': paperBgColor,
          '--line-color': paperLineColor,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        } as React.CSSProperties}
      >
        {/* OCR Feedback Notice */}
        {ocrNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg">
            {ocrNotice}
          </div>
        )}

        {/* Ultra-HD Vector PDF Canvas Layer (for pdfDocId pages) */}
        {page.pdfDocId && page.pdfPageNumber && (
          <canvas
            ref={pdfCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
          />
        )}

        {/* Legacy Background PDF image fallback */}
        {!page.pdfDocId && page.pdfBackground && (
          <img
            src={page.pdfBackground}
            alt="PDF Background"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
            style={{ imageRendering: 'auto' }}
            loading="eager"
          />
        )}

        {/* Interactive Inserted Images Layer */}
        {page.images.map((img) => {
          const isImgSelected = selectedItemId === img.id;
          return (
            <div
              key={img.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                setSelectedItemId(img.id);
                setDraggingImageId(img.id);
                imgDragRef.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: img.x,
                  origY: img.y,
                  origW: img.width,
                  origH: img.height,
                };
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (draggingImageId === img.id) {
                  const dx = (e.clientX - imgDragRef.current.startX) / zoom;
                  const dy = (e.clientY - imgDragRef.current.startY) / zoom;
                  onUpdatePage({
                    ...page,
                    images: page.images.map((item) =>
                      item.id === img.id
                        ? {
                            ...item,
                            x: Math.max(0, Math.round(imgDragRef.current.origX + dx)),
                            y: Math.max(0, Math.round(imgDragRef.current.origY + dy)),
                          }
                        : item
                    ),
                  });
                }
              }}
              onPointerUp={(e) => {
                if (draggingImageId === img.id) {
                  setDraggingImageId(null);
                  try {
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  } catch (_) {}
                }
              }}
              className={`interactive-item absolute z-10 select-none cursor-move group ${
                isImgSelected ? 'ring-2 ring-blue-500 rounded-lg shadow-xl' : ''
              }`}
              style={{
                left: `${img.x}px`,
                top: `${img.y}px`,
                width: `${img.width}px`,
                height: `${img.height}px`,
              }}
            >
              <img
                src={img.src}
                alt="Inserted note graphic"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded pointer-events-none select-none"
              />

              {isImgSelected && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePage({
                        ...page,
                        images: page.images.filter((item) => item.id !== img.id),
                      });
                    }}
                    className="absolute -top-3 -right-3 p-1.5 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 z-30"
                    title="Delete Image"
                  >
                    <Trash2 size={12} />
                  </button>

                  {/* Bottom-right resize handle */}
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setResizingImageId(img.id);
                      imgDragRef.current = {
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: img.x,
                        origY: img.y,
                        origW: img.width,
                        origH: img.height,
                      };
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (resizingImageId === img.id) {
                        e.stopPropagation();
                        const dx = (e.clientX - imgDragRef.current.startX) / zoom;
                        const ratio = imgDragRef.current.origH / Math.max(1, imgDragRef.current.origW);
                        const newW = Math.max(60, Math.round(imgDragRef.current.origW + dx));
                        const newH = Math.max(40, Math.round(newW * ratio));
                        onUpdatePage({
                          ...page,
                          images: page.images.map((item) =>
                            item.id === img.id ? { ...item, width: newW, height: newH } : item
                          ),
                        });
                      }
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      setResizingImageId(null);
                      try {
                        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                      } catch (_) {}
                    }}
                    className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center cursor-nwse-resize z-30"
                    title="Drag to resize image"
                  >
                    <Maximize2 size={11} />
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* SVG Vector Layer for all saved strokes */}
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
        >
          {page.strokes.map((stroke) => {
            if (stroke.shapeKind && stroke.points.length >= 2) {
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
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2 z-30 whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
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
              zoom={zoom}
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
              zoom={zoom}
              isSelected={selectedItemId === tape.id}
              onSelect={() => setSelectedItemId(tape.id)}
              onToggleReveal={() => {
                onUpdatePage({
                  ...page,
                  tapes: page.tapes.map((t) => (t.id === tape.id ? { ...t, isRevealed: !t.isRevealed } : t)),
                });
              }}
              onUpdate={(updated) => {
                onUpdatePage({
                  ...page,
                  tapes: page.tapes.map((t) => (t.id === updated.id ? updated : t)),
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
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
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
    </div>
  );
};
