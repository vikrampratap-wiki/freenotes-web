import React, { useState } from 'react';
import { Page } from '../types';
import { Plus, Copy, Trash2, ArrowUp, ArrowDown, X, Sliders, Bookmark } from 'lucide-react';

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
  onTogglePageBookmark: (index: number) => void;
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
  onTogglePageBookmark,
  onOpenTemplateModal,
}) => {
  const [filterBookmarked, setFilterBookmarked] = useState(false);

  if (!isOpen) return null;

  const displayedPages = pages
    .map((page, idx) => ({ page, idx }))
    .filter(({ page }) => (!filterBookmarked ? true : Boolean(page.isBookmarked)));

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 shadow-xl z-40 flex flex-col animate-in slide-in-from-left duration-200">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Notebook Pages</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{pages.length} pages total</p>
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

        {/* Filter Tabs: All vs Bookmarked */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setFilterBookmarked(false)}
            className={`flex-1 py-1 rounded-md font-semibold transition-all ${
              !filterBookmarked
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Pages ({pages.length})
          </button>
          <button
            onClick={() => setFilterBookmarked(true)}
            className={`flex-1 py-1 rounded-md font-semibold flex items-center justify-center gap-1 transition-all ${
              filterBookmarked
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bookmark size={12} /> Bookmarked ({pages.filter((p) => p.isBookmarked).length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {displayedPages.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            कोई बुकमार्क पेज नहीं है। किसी भी पेज के बुकमार्क आइकन पर क्लिक करें।
          </div>
        ) : (
          displayedPages.map(({ page, idx }) => {
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
                  <span className={isCurrent ? 'text-blue-600 dark:text-blue-400 tabular-nums' : 'tabular-nums'}>
                    Page {idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">{page.template}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePageBookmark(idx);
                      }}
                      className={`p-0.5 rounded ${
                        page.isBookmarked ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                      }`}
                      title="Toggle Bookmark"
                    >
                      <Bookmark size={12} fill={page.isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                {/* Page Miniature Thumbnail */}
                <div
                  className={`w-full h-32 rounded-lg border border-slate-300/80 dark:border-slate-700 relative overflow-hidden shadow-sm paper-pattern-${page.template}`}
                  style={{
                    '--paper-bg':
                      page.color === 'dark'
                        ? '#1e1e24'
                        : page.color === 'sepia'
                        ? '#fbf0d9'
                        : page.color === 'yellow'
                        ? '#fef3c7'
                        : page.color === 'mint'
                        ? '#ecfdf5'
                        : page.color === 'pink'
                        ? '#fdf2f8'
                        : '#ffffff',
                    '--line-color': page.color === 'dark' ? '#334155' : '#e2e8f0',
                  } as React.CSSProperties}
                >
                  <div className="absolute inset-0 p-2 flex flex-col justify-center items-center pointer-events-none opacity-60">
                    {page.strokes.length > 0 && (
                      <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                        {page.strokes.length} strokes
                      </div>
                    )}
                    {page.texts.length > 0 && (
                      <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                        {page.texts.length} notes
                      </div>
                    )}
                    {page.images.length > 0 && (
                      <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                        {page.images.length} images
                      </div>
                    )}
                    {page.strokes.length === 0 && page.texts.length === 0 && page.images.length === 0 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-600">Empty Page</span>
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
          })
        )}
      </div>
    </aside>
  );
};
