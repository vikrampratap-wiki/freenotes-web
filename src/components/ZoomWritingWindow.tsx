import React, { useRef, useState, useEffect } from 'react';
import { Point, Stroke, ToolType } from '../types';
import { renderPointsToPath } from '../utils/svgPath';
import { recognizeStrokesToText, startVoiceDictation } from '../utils/handwritingOcr';
import {
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Trash2,
  X,
  Type,
  Loader2,
  Sparkles,
  Mic,
  MicOff,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetBox: { x: number; y: number; width: number; height: number };
  onUpdateTargetBox: (newBox: { x: number; y: number; width: number; height: number }) => void;
  onAddStrokeToPage: (stroke: Stroke) => void;
  onAddTextToPage: (text: string, x: number, y: number) => void;
  strokeColor: string;
  strokeSize: number;
  activeTool: ToolType;
}

export const ZoomWritingWindow: React.FC<Props> = ({
  isOpen,
  onClose,
  targetBox,
  onUpdateTargetBox,
  onAddStrokeToPage,
  onAddTextToPage,
  strokeColor,
  strokeSize,
  activeTool,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const activePointsRef = useRef<Point[]>([]);
  const [localStrokes, setLocalStrokes] = useState<Stroke[]>([]);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLang, setOcrLang] = useState<'eng' | 'hin'>('eng');
  const [isDictating, setIsDictating] = useState(false);
  const dictationStopperRef = useRef<{ stop: () => void } | null>(null);

  // Zoom scale: 3x magnification for easy finger writing
  const SCALE = 2.8;
  const PAD_WIDTH = Math.round(targetBox.width * SCALE);
  const PAD_HEIGHT = Math.round(targetBox.height * SCALE);
  const AUTO_ADVANCE_WIDTH = Math.round(PAD_WIDTH * 0.22); // Right 22% blue zone

  // Clear live canvas overlay
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved local strokes in this box
    for (const s of localStrokes) {
      const pathStr = renderPointsToPath(s);
      if (pathStr) {
        ctx.fillStyle = s.color;
        ctx.fill(new Path2D(pathStr));
      }
    }

    // Draw active drawing points
    if (activePointsRef.current.length > 1) {
      const dummyStroke: Stroke = {
        id: 'live_zoom_stroke',
        type: activeTool,
        points: activePointsRef.current,
        color: strokeColor,
        size: strokeSize * SCALE,
        opacity: 1.0,
      };
      const pathStr = renderPointsToPath(dummyStroke);
      if (pathStr) {
        ctx.fillStyle = strokeColor;
        ctx.fill(new Path2D(pathStr));
      }
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [localStrokes, strokeColor, strokeSize, activeTool]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    setIsDrawing(true);
    activePointsRef.current = [{ x, y, pressure }];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    activePointsRef.current.push({ x, y, pressure });
    redrawCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    const pts = [...activePointsRef.current];
    activePointsRef.current = [];

    if (pts.length < 2) return;

    // 1. Save locally to show in zoom window
    const newLocalStroke: Stroke = {
      id: 'z_stroke_' + Math.random().toString(36).substring(2, 9),
      type: activeTool,
      points: pts,
      color: strokeColor,
      size: strokeSize * SCALE,
      opacity: 1.0,
    };
    setLocalStrokes((prev) => [...prev, newLocalStroke]);

    // 2. Map coordinates back down to page targetBox
    const scaledPoints = pts.map((p) => ({
      x: targetBox.x + p.x / SCALE,
      y: targetBox.y + p.y / SCALE,
      pressure: p.pressure,
    }));

    const pageStroke: Stroke = {
      id: 'p_stroke_' + Math.random().toString(36).substring(2, 9),
      type: activeTool,
      points: scaledPoints,
      color: strokeColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
    };
    onAddStrokeToPage(pageStroke);

    // 3. Auto-Advance Check: If last point was written in the right blue zone
    const lastPt = pts[pts.length - 1];
    if (lastPt.x > PAD_WIDTH - AUTO_ADVANCE_WIDTH) {
      setTimeout(() => {
        handleStepForward();
      }, 350);
    }
  };

  const handleStepForward = () => {
    setLocalStrokes([]);
    onUpdateTargetBox({
      ...targetBox,
      x: targetBox.x + 140,
    });
  };

  const handleStepBackward = () => {
    setLocalStrokes([]);
    onUpdateTargetBox({
      ...targetBox,
      x: Math.max(60, targetBox.x - 140),
    });
  };

  const handleNewLine = () => {
    setLocalStrokes([]);
    onUpdateTargetBox({
      ...targetBox,
      x: 80, // reset to left margin
      y: targetBox.y + 36, // step down to next ruled line
    });
  };

  const handleOcrConvert = async () => {
    if (localStrokes.length === 0) return;
    try {
      setIsOcrLoading(true);
      setOcrProgress(10);
      const text = await recognizeStrokesToText(localStrokes, 24, ocrLang, (p) => setOcrProgress(p));
      if (text) {
        onAddTextToPage(text, targetBox.x, targetBox.y);
        setLocalStrokes([]);
        handleStepForward();
      } else {
        alert('Could not recognize handwriting. Please try again or use the Microphone button to dictate directly.');
      }
    } catch (err) {
      console.error(err);
      alert('OCR error. Please write clearly or use Voice Dictation.');
    } finally {
      setIsOcrLoading(false);
      setOcrProgress(0);
    }
  };

  const toggleVoiceDictation = () => {
    if (isDictating) {
      dictationStopperRef.current?.stop();
      setIsDictating(false);
      return;
    }

    setIsDictating(true);
    const speechLang = ocrLang === 'hin' ? 'hi-IN' : 'en-US';
    const stopper = startVoiceDictation(
      speechLang,
      (transcript) => {
        setIsDictating(false);
        if (transcript) {
          onAddTextToPage(transcript, targetBox.x, targetBox.y);
          handleStepForward();
        }
      },
      (err) => {
        console.error('Dictation error:', err);
        setIsDictating(false);
        alert('Voice recognition ended or permission not granted.');
      }
    );
    dictationStopperRef.current = stopper;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-300 dark:border-slate-800 shadow-2xl flex flex-col items-center p-3 animate-in slide-in-from-bottom-6 duration-200 select-none">
      {/* Top Header Bar of Zoom Window */}
      <div className="w-full max-w-4xl flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-bold flex items-center gap-1 text-[11px]">
            <Sparkles size={13} />
            <span>Finger Writing Pad (Zoom Box)</span>
          </div>
          <span className="text-slate-400 text-[11px]">
            Write comfortably here; text scales neatly onto your notebook line
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language selector for OCR / Voice */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setOcrLang('eng')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                ocrLang === 'eng' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setOcrLang('hin')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                ocrLang === 'hin' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Handwriting to Digital Text OCR button */}
          <button
            onClick={handleOcrConvert}
            disabled={isOcrLoading || localStrokes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all disabled:opacity-40"
            title="Convert handwriting in box to computerized digital text"
          >
            {isOcrLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>पहचान जारी है {ocrProgress > 0 ? `${ocrProgress}%` : ''}</span>
              </>
            ) : (
              <>
                <Type size={13} />
                <span>हस्तलिपि ➔ डिजिटल (OCR)</span>
              </>
            )}
          </button>

          {/* Instant Voice Dictation */}
          <button
            onClick={toggleVoiceDictation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold shadow-sm transition-all ${
              isDictating
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="बोलकर लिखें (Voice to Text)"
          >
            {isDictating ? <MicOff size={13} /> : <Mic size={13} />}
            <span>{isDictating ? 'सुन रहे हैं...' : '🎙️ बोलकर लिखें'}</span>
          </button>

          <button
            onClick={() => setLocalStrokes([])}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            title="Clear Box"
          >
            <Trash2 size={15} />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Close Zoom Window"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Expanded Canvas with Auto-Advance Zone */}
      <div className="relative mt-2 rounded-xl border-2 border-blue-500/80 overflow-hidden shadow-inner bg-slate-50 dark:bg-slate-950">
        <canvas
          ref={canvasRef}
          width={PAD_WIDTH}
          height={PAD_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="cursor-crosshair touch-none"
        />

        {/* Ruled guide lines inside zoom window */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-evenly opacity-30">
          <div className="border-b border-dashed border-blue-400 w-full" />
          <div className="border-b border-blue-500 w-full" />
        </div>

        {/* Auto-Advance Zone on right */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-blue-500/15 border-l-2 border-dashed border-blue-500/50 pointer-events-none flex items-center justify-center text-blue-600 text-[10px] font-bold uppercase tracking-wider"
          style={{ width: `${AUTO_ADVANCE_WIDTH}px` }}
        >
          Auto Advance
        </div>
      </div>

      {/* Bottom Step & Return Navigation Controls */}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={handleStepBackward}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-sm"
          title="Step Backward"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <button
          onClick={handleStepForward}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-sm"
          title="Step Forward"
        >
          Forward <ChevronRight size={16} />
        </button>

        <button
          onClick={handleNewLine}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
          title="New Line (Move down & return to left margin)"
        >
          <CornerDownLeft size={15} /> New Line (↵)
        </button>
      </div>
    </div>
  );
};
