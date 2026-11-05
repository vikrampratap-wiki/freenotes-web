import React from 'react';
import { X, StickyNote } from 'lucide-react';
import { TextItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsertStickyNote: (note: TextItem) => void;
}

const STICKY_STYLES = [
  { id: 'yellow', name: 'Classic Yellow', bg: '#fef08a', text: '#713f12', border: '#facc15' },
  { id: 'mint', name: 'Pastel Mint', bg: '#bbf7d0', text: '#14532d', border: '#86efac' },
  { id: 'pink', name: 'Soft Rose', bg: '#fbcfe8', text: '#831843', border: '#f472b6' },
  { id: 'blue', name: 'Sky Memo', bg: '#bae6fd', text: '#0c4a6e', border: '#7dd3fc' },
  { id: 'lavender', name: 'Lavender Study', bg: '#e9d5ff', text: '#581c87', border: '#c084fc' },
  { id: 'orange', name: 'Warm Amber', bg: '#fed7aa', text: '#7c2d12', border: '#fb923c' },
];

export const StickyNotesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onInsertStickyNote,
}) => {
  if (!isOpen) return null;

  const handleSelect = (style: typeof STICKY_STYLES[0]) => {
    const newNote: TextItem = {
      id: 'sticky_' + Math.random().toString(36).substring(2, 9),
      x: 200,
      y: 250,
      text: '📌 New Sticky Note\n• Add key takeaway here\n• Formulas & highlights',
      fontSize: 16,
      color: style.text,
      backgroundColor: style.bg,
      isStickyNote: true,
      width: 220,
    };
    onInsertStickyNote(newNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600">
              <StickyNote size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Sticky Note Pads</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose a note pad to place on your page</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 my-6">
          {STICKY_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => handleSelect(style)}
              className="p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between h-32 border hover:scale-105"
              style={{
                backgroundColor: style.bg,
                borderColor: style.border,
                color: style.text,
              }}
            >
              <div className="font-bold text-sm">{style.name}</div>
              <div className="text-xs opacity-75 font-mono">
                • Memo item<br />• Study note
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
