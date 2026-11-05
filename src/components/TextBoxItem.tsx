import React, { useState, useRef, useEffect } from 'react';
import { TextItem } from '../types';
import { Trash2, Move, Mic, MicOff, Plus, Minus } from 'lucide-react';
import { startVoiceDictation } from '../utils/handwritingOcr';

interface Props {
  item: TextItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: TextItem) => void;
  onDelete: () => void;
  zoom?: number;
}

export const TextBoxItem: React.FC<Props> = ({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  zoom = 1,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [isDragging, setIsDragging] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: item.x, posY: item.y });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dictationStopperRef = useRef<{ stop: () => void } | null>(null);

  const toggleDictation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDictating) {
      dictationStopperRef.current?.stop();
      setIsDictating(false);
      return;
    }

    setIsDictating(true);
    const stopper = startVoiceDictation(
      'hi-IN',
      (transcript) => {
        setIsDictating(false);
        if (transcript) {
          const newText = text ? `${text} ${transcript}` : transcript;
          setText(newText);
          onUpdate({ ...item, text: newText });
        }
      },
      () => setIsDictating(false)
    );
    dictationStopperRef.current = stopper;
  };

  useEffect(() => {
    setText(item.text);
  }, [item.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    onUpdate({ ...item, text });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: item.x,
      posY: item.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStartRef.current.mouseX) / zoom;
    const dy = (e.clientY - dragStartRef.current.mouseY) / zoom;
    onUpdate({
      ...item,
      x: Math.max(0, Math.round(dragStartRef.current.posX + dx)),
      y: Math.max(0, Math.round(dragStartRef.current.posY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`absolute group select-none transition-shadow ${
        isSelected ? 'ring-2 ring-blue-500 rounded-lg shadow-lg' : ''
      } ${item.isStickyNote ? 'shadow-md rounded-xl p-3.5 border border-black/10' : ''}`}
      style={{
        left: `${item.x}px`,
        top: `${item.y}px`,
        minWidth: item.isStickyNote ? '190px' : '90px',
        maxWidth: item.width ? `${item.width}px` : '450px',
        backgroundColor: item.backgroundColor || 'transparent',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Drag handle & Floating Actions */}
      {isSelected && (
        <div
          className="absolute -top-9 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-2 py-1 flex items-center gap-1.5 z-30"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 pr-1 border-r border-slate-200 dark:border-slate-700">
            <Move size={10} /> Drag
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ ...item, fontSize: Math.max(11, item.fontSize - 2) });
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Decrease Font Size"
          >
            <Minus size={11} />
          </button>
          <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
            {item.fontSize}px
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ ...item, fontSize: Math.min(48, item.fontSize + 2) });
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Increase Font Size"
          >
            <Plus size={11} />
          </button>

          <button
            onClick={toggleDictation}
            className={`p-1 rounded-lg text-white shadow-sm transition-all ${
              isDictating ? 'bg-red-500 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            title="बोलकर लिखें (Dictate)"
          >
            {isDictating ? <MicOff size={12} /> : <Mic size={12} />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleBlur();
            }
          }}
          className="bg-transparent border border-blue-400 rounded p-1 outline-none resize w-full font-sans leading-relaxed"
          style={{
            fontSize: `${item.fontSize}px`,
            color: item.color,
            fontFamily: item.fontFamily || 'Inter, sans-serif',
            minHeight: `${item.fontSize * 2.2}px`,
          }}
        />
      ) : (
        <div
          className="p-1 whitespace-pre-wrap break-words leading-relaxed"
          style={{
            fontSize: `${item.fontSize}px`,
            color: item.color,
            fontFamily: item.fontFamily || 'Inter, sans-serif',
          }}
        >
          {item.text || 'Double-click to type...'}
        </div>
      )}
    </div>
  );
};
