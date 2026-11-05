import React from 'react';
import { Page } from '../types';
import { Plus, Copy, Trash2, ArrowUp, ArrowDown, X, Sliders } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pages: Page[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: (afterIndex: number) => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onOpenTemplateModal: () => void;
}

export const PageThumbnailSidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  pages,
  currentPageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
  onOpenTemplateModal,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 shadow-xl z-40 flex flex-col animate-in slide-in-from-left duration-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Notebook Pages</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{pages.length} pages total</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddPage(pages.length - 1)}
            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-medium text-xs flex items-center gap-1"
            title="Add Page at End"
          >
            <Plus size={14} /> Add
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pages.map((page, idx) => {
          const isCurrent = idx === currentPageIndex;
          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(idx)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer group ${
                isCurrent
                  ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                <span className={isCurrent ? 'text-blue-600 dark:text-blue-400' : ''}>
                  Page {idx + 1}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {page.template}
                </span>
              </div>

              {/* Page Miniature Thumbnail */}
              <div
                className={`w-full h-32 rounded-lg border border-slate-300/80 dark:border-slate-700 relative overflow-hidden shadow-sm paper-pattern-${page.template}`}
                style={{
                  '--paper-bg': page.color === 'dark' ? '#1e1e24' : page.color === 'sepia' ? '#fbf0d9' : page.color === 'yellow' ? '#fef3c7' : page.color === 'mint' ? '#ecfdf5' : '#ffffff',
                  '--line-color': page.color === 'dark' ? '#334155' : '#e2e8f0',
                } as React.CSSProperties}
              >
                {/* Visual miniature representation */}
                <div className="absolute inset-0 p-2 flex flex-col justify-center items-center pointer-events-none opacity-60">
                  {page.strokes.length > 0 && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      {page.strokes.length} strokes
                    </div>
                  )}
                  {page.texts.length > 0 && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      {page.texts.length} text items
                    </div>
                  )}
                  {page.strokes.length === 0 && page.texts.length === 0 && (
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">Blank</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMovePage(idx, idx - 1);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    disabled={idx === pages.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMovePage(idx, idx + 1);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTemplateModal();
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Change Template"
                  >
                    <Sliders size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(idx);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-blue-600"
                    title="Duplicate Page"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    disabled={pages.length <= 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(idx);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-red-600 disabled:opacity-30"
                    title="Delete Page"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
