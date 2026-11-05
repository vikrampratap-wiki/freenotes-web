import React from 'react';
import { TapeItem as TapeItemType } from '../types';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

interface Props {
  tape: TapeItemType;
  isSelected: boolean;
  onSelect: () => void;
  onToggleReveal: () => void;
  onDelete: () => void;
  isEditing: boolean;
}

export const TapeItem: React.FC<Props> = ({
  tape,
  isSelected,
  onSelect,
  onToggleReveal,
  onDelete,
  isEditing,
}) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (isEditing) {
          onSelect();
        } else {
          onToggleReveal();
        }
      }}
      className={`absolute select-none cursor-pointer transition-all group ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      style={{
        left: `${tape.x}px`,
        top: `${tape.y}px`,
        width: `${tape.width}px`,
        height: `${tape.height}px`,
      }}
    >
      <div
        className={`w-full h-full rounded shadow-sm border border-black/10 flex items-center justify-between px-2 transition-all duration-200 ${
          tape.isRevealed ? 'opacity-20 hover:opacity-40' : 'opacity-95 hover:brightness-105'
        }`}
        style={{
          backgroundColor: tape.color,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 20px)'
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-black/60 select-none">
          {tape.isRevealed ? 'Revealed' : 'Tap to reveal'}
        </span>
        <div className="text-black/60">
          {tape.isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </div>
      </div>

      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-3 -right-3 p-1 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-all z-20"
          title="Delete Tape"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};
