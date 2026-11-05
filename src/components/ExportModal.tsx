import React, { useState } from 'react';
import { Notebook, Page } from '../types';
import { exportNotebookToPdf, exportPageToPng } from '../utils/pdfExport';
import { FileDown, Image, FileText, CheckCircle2, Loader2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notebook: Notebook;
  currentPage: Page;
  currentPageIndex: number;
}

export const ExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notebook,
  currentPage,
  currentPageIndex,
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportPagePng = async () => {
    try {
      setLoading(true);
      const dataUrl = await exportPageToPng(currentPage);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${notebook.title}_Page_${currentPageIndex + 1}.png`;
      a.click();
      setSuccessMsg('Page exported as high-res PNG!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setLoading(true);
      setProgress(0);
      const pdfBlob = await exportNotebookToPdf(notebook, (p) => setProgress(p));
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${notebook.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg(`All ${notebook.pages.length} pages exported to PDF!`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notebook, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${notebook.title}_backup.freenotes.json`;
    a.click();
    setSuccessMsg('Notebook JSON backup exported!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileDown size={22} className="text-blue-600" /> Export Notes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Free unlimited high-quality export
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        <div className="my-5 space-y-3">
          {/* Export Full PDF */}
          <button
            disabled={loading}
            onClick={handleExportPdf}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shadow-sm">
                <FileText size={20} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600">
                  Full Document PDF
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Export all {notebook.pages.length} pages into a vector-rendered PDF
                </div>
              </div>
            </div>
            {loading && progress > 0 ? (
              <span className="text-xs font-bold text-blue-600">{progress}%</span>
            ) : (
              <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                .PDF
              </span>
            )}
          </button>

          {/* Export Current Page as PNG */}
          <button
            disabled={loading}
            onClick={handleExportPagePng}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                <Image size={20} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600">
                  Current Page as Image
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  High-resolution PNG image of Page {currentPageIndex + 1}
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              .PNG
            </span>
          </button>

          {/* Export JSON Backup */}
          <button
            disabled={loading}
            onClick={handleExportJson}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
                <FileDown size={20} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600">
                  FreeNotes Backup JSON
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Raw data backup to restore anytime on any device
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              .JSON
            </span>
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-2">
            <Loader2 size={16} className="animate-spin text-blue-600" /> Generating export...
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
