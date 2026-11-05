import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCw } from 'lucide-react';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onRulerPositionChange?: (rulerState: { x: number; y: number; angle: number; width: number; height: number }) => void;
}

export const RulerGuide: React.FC<Props> = ({
  isVisible,
  onClose,
  onRulerPositionChange,
}) => {
  const [pos, setPos] = useState({ x: 120, y: 350 });
  const [angle, setAngle] = useState(0); // in degrees
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const rotateStartRef = useRef({ mouseX: 0, mouseY: 0, startAngle: 0, centerX: 0, centerY: 0 });

  const RULER_WIDTH = 550;
  const RULER_HEIGHT = 80;

  useEffect(() => {
    if (onRulerPositionChange && isVisible) {
      onRulerPositionChange({
        x: pos.x,
        y: pos.y,
        angle,
        width: RULER_WIDTH,
        height: RULER_HEIGHT,
      });
    }
  }, [pos, angle, isVisible, onRulerPositionChange]);

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPos({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    } else if (isRotating) {
      const { centerX, centerY, startAngle } = rotateStartRef.current;
      const curAngleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      let deg = Math.round((curAngleRad * 180) / Math.PI);
      // Snap to common angles (0, 30, 45, 60, 90, 180, -90, etc.)
      const snapPoints = [0, 30, 45, 60, 90, 120, 135, 150, 180, -30, -45, -60, -90, -120, -135, -150, -180];
      for (const snap of snapPoints) {
        if (Math.abs(deg - snap) < 4) {
          deg = snap;
          break;
        }
      }
      setAngle(deg);
    }
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsRotating(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    rotateStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startAngle: angle,
      centerX,
      centerY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  if (!isVisible) return null;

  return (
    <div
      onPointerMove={handlePointerMoveDrag}
      onPointerUp={handlePointerUpDrag}
      className="absolute select-none z-30 cursor-move"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${RULER_WIDTH}px`,
        height: `${RULER_HEIGHT}px`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'center center',
      }}
    >
      {/* Acrylic Translucent Ruler Body */}
      <div
        onPointerDown={handlePointerDownDrag}
        className="w-full h-full rounded-xl bg-white/75 dark:bg-slate-800/80 backdrop-blur-md border-2 border-slate-400/60 dark:border-slate-500/60 shadow-2xl relative overflow-hidden flex items-center justify-between px-6"
      >
        {/* Top Edge Tick Marks (Centimeters / Millimeters) */}
        <div className="absolute top-0 left-0 right-0 h-5 flex justify-between px-4 pointer-events-none">
          {Array.from({ length: 45 }).map((_, i) => (
            <div
              key={i}
              className={`bg-slate-700 dark:bg-slate-300 ${
                i % 5 === 0 ? 'h-4 w-[1.5px]' : 'h-2 w-[1px] opacity-60'
              }`}
            >
              {i % 5 === 0 && (
                <span className="text-[9px] font-mono font-bold block -mt-0.5 ml-1 text-slate-800 dark:text-slate-200">
                  {i / 5}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Center Angle Dial Controller */}
        <div className="mx-auto flex items-center gap-4 z-10">
          <div
            onPointerDown={handleRotateStart}
            className="w-12 h-12 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center cursor-ew-resize transition-transform hover:scale-105 active:scale-95"
            title="Drag to rotate ruler (snaps to 0°, 45°, 90°)"
          >
            <RotateCw size={18} />
          </div>

          <div className="bg-slate-900/80 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg shadow-inner">
            {angle}°
          </div>
        </div>

        {/* Close Ruler Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-red-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors z-10"
          title="Close Ruler"
        >
          <X size={15} />
        </button>

        {/* Bottom Edge Tick Marks (Inches) */}
        <div className="absolute bottom-0 left-0 right-0 h-4 flex justify-between px-4 pointer-events-none">
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className={`bg-slate-600 dark:bg-slate-400 self-end ${
                i % 4 === 0 ? 'h-3.5 w-[1.5px]' : 'h-2 w-[1px] opacity-50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
