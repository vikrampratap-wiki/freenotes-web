import React, { useState, useRef, useEffect } from 'react';
import { TextItem } from '../types';
import { Trash2, Move, Mic, MicOff } from 'lucide-react';
import { startVoiceDictation } from '../utils/handwritingOcr';

interface Props {
  item: TextItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: TextItem) => void;
  onDelete: () => void;
}

export const TextBoxItem: React.FC<Props> = ({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
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
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    onUpdate({
      ...item,
      x: Math.max(0, dragStartRef.current.posX + dx),
      y: Math.max(0, dragStartRef.current.posY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
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
      } ${item.isStickyNote ? 'shadow-md rounded-xl p-3 border border-black/10' : ''}`}
      style={{
        left: `${item.x}px`,
        top: `${item.y}px`,
        minWidth: item.isStickyNote ? '180px' : '80px',
        maxWidth: item.width ? `${item.width}px` : '450px',
        backgroundColor: item.backgroundColor || 'transparent',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Drag handle & Actions */}
      {isSelected && (
        <>
          <div className="absolute -top-3 left-2 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] flex items-center gap-1 shadow cursor-move z-20">
            <Move size={10} /> Drag
          </div>

          <button
            onClick={toggleDictation}
            className={`absolute -top-3 right-6 p-1 rounded-full text-white shadow-md transition-all z-20 ${
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
            className="absolute -top-3 -right-3 p-1 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-all z-20"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </>
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
            minHeight: `${item.fontSize * 2}px`,
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
