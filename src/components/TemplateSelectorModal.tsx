import React from 'react';
import { PageColor, PageTemplate } from '../types';
import { Check, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate: PageTemplate;
  currentColor: PageColor;
  onApply: (template: PageTemplate, color: PageColor) => void;
}

const TEMPLATES: { id: PageTemplate; name: string; previewClass: string; desc: string }[] = [
  { id: 'blank', name: 'Blank Page', previewClass: 'paper-pattern-blank', desc: 'Clean canvas for free sketching' },
  { id: 'ruled', name: 'Ruled / Lined', previewClass: 'paper-pattern-ruled', desc: 'Standard college-ruled notebook lines' },
  { id: 'ruled-narrow', name: 'Narrow Ruled', previewClass: 'paper-pattern-ruled-narrow', desc: 'Compact line spacing for dense writing' },
  { id: 'grid', name: 'Grid / Graph', previewClass: 'paper-pattern-grid', desc: 'Math, diagrams, and precise sketches' },
  { id: 'dotted', name: 'Dotted Journal', previewClass: 'paper-pattern-dotted', desc: 'Minimal dot-grid for bullet journaling' },
  { id: 'cornell', name: 'Cornell Notes', previewClass: 'paper-pattern-cornell', desc: 'Best for lectures, cues & summaries' },
  { id: 'planner', name: 'Daily Planner', previewClass: 'paper-pattern-planner', desc: 'Schedule timeline and task blocks' },
  { id: 'todo', name: 'Todo Checklist', previewClass: 'paper-pattern-todo', desc: 'Action items with checkboxes' },
];

const COLORS: { id: PageColor; name: string; bgHex: string; textHex: string }[] = [
  { id: 'white', name: 'Pure White', bgHex: '#ffffff', textHex: '#0f172a' },
  { id: 'sepia', name: 'Warm Sepia', bgHex: '#fbf0d9', textHex: '#451a03' },
  { id: 'dark', name: 'Dark Mode', bgHex: '#1e1e24', textHex: '#f8fafc' },
  { id: 'yellow', name: 'Legal Yellow', bgHex: '#fef3c7', textHex: '#78350f' },
  { id: 'mint', name: 'Soft Mint', bgHex: '#ecfdf5', textHex: '#064e3b' },
];

export const TemplateSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentTemplate,
  currentColor,
  onApply,
}) => {
  const [selectedTemplate, setSelectedTemplate] = React.useState<PageTemplate>(currentTemplate);
  const [selectedColor, setSelectedColor] = React.useState<PageColor>(currentColor);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Paper Templates & Color</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Choose paper styling for your notes (all templates free)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Paper Color Selection */}
        <div className="my-5">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Paper Color Tone</label>
          <div className="flex gap-3 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                  selectedColor === c.id
                    ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
                style={{ backgroundColor: c.bgHex, color: c.textHex }}
              >
                <span className="w-4 h-4 rounded-full border border-black/10 inline-block" style={{ backgroundColor: c.bgHex }} />
                <span>{c.name}</span>
                {selectedColor === c.id && <Check size={16} />}
              </button>
            ))}
          </div>
        </div>

        {/* Paper Pattern Template Grid */}
        <div className="my-5">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Page Layout Pattern</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto pr-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  selectedTemplate === t.id
                    ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                <div
                  className={`w-full h-20 rounded-lg border border-slate-300/60 dark:border-slate-600 mb-2 ${t.previewClass}`}
                  style={{
                    '--paper-bg': COLORS.find((c) => c.id === selectedColor)?.bgHex || '#ffffff',
                    '--line-color': selectedColor === 'dark' ? '#334155' : '#cbd5e1',
                  } as React.CSSProperties}
                />
                <div>
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-100 flex items-center justify-between">
                    <span>{t.name}</span>
                    {selectedTemplate === t.id && <Check size={14} className="text-blue-600" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply(selectedTemplate, selectedColor);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all"
          >
            Apply Template
          </button>
        </div>
      </div>
    </div>
  );
};
