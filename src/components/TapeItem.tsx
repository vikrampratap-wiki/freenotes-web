import React, { useState, useRef } from 'react';
import { TapeItem as TapeItemType } from '../types';
import { Eye, EyeOff, Trash2, Move } from 'lucide-react';

interface Props {
  tape: TapeItemType;
  isSelected: boolean;
  onSelect: () => void;
  onToggleReveal: () => void;
  onUpdate: (updated: TapeItemType) => void;
  onDelete: () => void;
  isEditing: boolean;
  zoom?: number;
}

const TAPE_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];

export const TapeItem: React.FC<Props> = ({
  tape,
  isSelected,
  onSelect,
  onToggleReveal,
  onUpdate,
  onDelete,
  isEditing,
  zoom = 1,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, origX: tape.x, origY: tape.y, moved: false });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: tape.x,
      origY: tape.y,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragRef.current.startX) / zoom;
    const dy = (e.clientY - dragRef.current.startY) / zoom;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
      onUpdate({
        ...tape,
        x: Math.max(0, Math.round(dragRef.current.origX + dx)),
        y: Math.max(0, Math.round(dragRef.current.origY + dy)),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    if (!dragRef.current.moved && !isEditing) {
      onToggleReveal();
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`absolute select-none cursor-pointer transition-shadow group ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2 rounded' : ''
      }`}
      style={{
        left: `${tape.x}px`,
        top: `${tape.y}px`,
        width: `${tape.width}px`,
        height: `${tape.height}px`,
      }}
    >
      <div
        className={`w-full h-full rounded shadow-sm border border-black/15 flex items-center justify-between px-2.5 transition-all duration-200 ${
          tape.isRevealed ? 'opacity-20 hover:opacity-40' : 'opacity-95 hover:brightness-105'
        }`}
        style={{
          backgroundColor: tape.color,
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.18) 10px, rgba(255,255,255,0.18) 20px)',
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-black/70 select-none truncate">
          {tape.isRevealed ? 'दिख रहा है (Tap to hide)' : 'छुपा हुआ उत्तर (Tap to reveal)'}
        </span>
        <div className="text-black/70 shrink-0 ml-1">
          {tape.isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </div>
      </div>

      {isSelected && (
        <div
          className="absolute -top-9 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-2 py-1 flex items-center gap-1.5 z-30"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5 pr-1">
            <Move size={10} />
          </span>
          {TAPE_COLORS.map((col) => (
            <button
              key={col}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ ...tape, color: col });
              }}
              className={`w-3.5 h-3.5 rounded-full border border-black/20 ${
                tape.color === col ? 'scale-125 ring-1 ring-blue-500' : ''
              }`}
              style={{ backgroundColor: col }}
              title="Change Tape Color"
            />
          ))}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all ml-1"
            title="Delete Tape"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
};
