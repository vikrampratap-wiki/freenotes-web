import React, { useState } from 'react';
import { X, StickyNote, Award } from 'lucide-react';
import { TextItem } from '../types';
import { generateId } from '../utils/storage';

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

const STUDY_STICKERS = [
  { id: 'exam', label: '🔥 अति महत्वपूर्ण (Exam VIP)', bg: '#fee2e2', text: '#991b1b', content: '🔥 EXAM IMPORTANT\nयहाँ मुख्य प्रश्न/उत्तर लिखें' },
  { id: 'formula', label: '📐 मुख्य सूत्र (Formula Box)', bg: '#e0e7ff', text: '#1e40af', content: '📐 FORMULA / प्रमेय:\nE = mc² | a² + b² = c²' },
  { id: 'def', label: '💡 मुख्य परिभाषा (Definition)', bg: '#fef3c7', text: '#92400e', content: '💡 परिभाषा (Definition):\nमुख्य बिंदु यहाँ लिखें' },
  { id: 'revise', label: '📌 रिवीजन ज़रूरी (Revise)', bg: '#f3e8ff', text: '#6b21a8', content: '📌 REVISE BEFORE EXAM\nपरीक्षा से पहले दोहराएं' },
  { id: 'check', label: '✅ पूर्ण / हल किया (Solved)', bg: '#dcfce7', text: '#166534', content: '✅ SOLVED & VERIFIED\nउत्तर सही है' },
  { id: 'doubt', label: '❓ डाउट / प्रश्न (Doubt)', bg: '#ffedd5', text: '#9a3412', content: '❓ DOUBT / शिक्षक से पूछें:\nयहाँ अपना प्रश्न लिखें' },
];

export const StickyNotesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onInsertStickyNote,
}) => {
  const [tab, setTab] = useState<'sticky' | 'stickers'>('sticky');

  if (!isOpen) return null;

  const handleSelectSticky = (style: typeof STICKY_STYLES[0]) => {
    const newNote: TextItem = {
      id: generateId('sticky'),
      x: 60 + Math.round(Math.random() * 40),
      y: 120 + Math.round(Math.random() * 40),
      text: '📌 स्टिकी नोट (Sticky Note)\n• मुख्य बिंदु यहाँ लिखें\n• सूत्र और सारांश',
      fontSize: 16,
      color: style.text,
      backgroundColor: style.bg,
      isStickyNote: true,
      width: 220,
    };
    onInsertStickyNote(newNote);
    onClose();
  };

  const handleSelectSticker = (sticker: typeof STUDY_STICKERS[0]) => {
    const newSticker: TextItem = {
      id: generateId('sticker'),
      x: 60 + Math.round(Math.random() * 40),
      y: 120 + Math.round(Math.random() * 40),
      text: sticker.content,
      fontSize: 15,
      color: sticker.text,
      backgroundColor: sticker.bg,
      isStickyNote: true,
      width: 220,
    };
    onInsertStickyNote(newSticker);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600">
              <StickyNote size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Sticky Notes & Study Stickers
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                पेज पर मेमो पैड या स्टडी स्टैम्प जोड़ें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mt-4">
          <button
            onClick={() => setTab('sticky')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'sticky'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <StickyNote size={14} /> Sticky Note Pads (मेमो पैड)
          </button>
          <button
            onClick={() => setTab('stickers')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'stickers'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award size={14} /> Exam & Study Stickers (स्टडी स्टैम्प)
          </button>
        </div>

        {tab === 'sticky' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
            {STICKY_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => handleSelectSticky(style)}
                className="p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between h-28 border hover:scale-[1.02]"
                style={{
                  backgroundColor: style.bg,
                  borderColor: style.border,
                  color: style.text,
                }}
              >
                <div className="font-bold text-xs">{style.name}</div>
                <div className="text-[11px] opacity-80 font-mono leading-snug">
                  • मुख्य बिंदु<br />• Study note
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 my-5">
            {STUDY_STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => handleSelectSticker(sticker)}
                className="p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between border border-black/10 hover:scale-[1.02]"
                style={{
                  backgroundColor: sticker.bg,
                  color: sticker.text,
                }}
              >
                <div className="font-bold text-xs mb-1.5">{sticker.label}</div>
                <div className="text-[11px] opacity-85 whitespace-pre-line leading-snug">
                  {sticker.content}
                </div>
              </button>
            ))}
          </div>
        )}

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
