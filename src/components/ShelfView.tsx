import React, { useState, useRef } from 'react';
import { Notebook, PageColor, PageTemplate } from '../types';
import {
  Plus,
  BookOpen,
  Search,
  FileUp,
  Moon,
  Sun,
  MoreVertical,
  Trash2,
  Copy,
  Download,
  Calendar,
  Layers,
  Sparkles,
  Check,
  X,
  FileText
} from 'lucide-react';
import { createNewPage, saveNotebook, deleteNotebook } from '../utils/storage';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface Props {
  notebooks: Notebook[];
  onSelectNotebook: (nb: Notebook) => void;
  onRefreshNotebooks: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const COVER_COLORS = [
  '#3b82f6', // Ocean Blue
  '#8b5cf6', // Lavender Purple
  '#10b981', // Sage Green
  '#f59e0b', // Amber Honey
  '#ef4444', // Coral Red
  '#06b6d4', // Sky Cyan
  '#ec4899', // Berry Pink
  '#334155', // Slate Charcoal
];

export const ShelfView: React.FC<Props> = ({
  notebooks,
  onSelectNotebook,
  onRefreshNotebooks,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // New Notebook Form
  const [newTitle, setNewTitle] = useState('My Notes');
  const [newCoverColor, setNewCoverColor] = useState('#3b82f6');
  const [newTemplate, setNewTemplate] = useState<PageTemplate>('ruled');
  const [newPaperColor, setNewPaperColor] = useState<PageColor>('white');

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const filteredNotebooks = notebooks.filter((nb) =>
    nb.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNotebook = async () => {
    const newNb: Notebook = {
      id: 'nb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      title: newTitle.trim() || 'Untitled Notebook',
      coverColor: newCoverColor,
      coverPattern: 'minimal',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['General'],
      pages: [createNewPage(newTemplate, newPaperColor)],
    };

    await saveNotebook(newNb);
    setIsCreateModalOpen(false);
    onRefreshNotebooks();
    onSelectNotebook(newNb);
  };

  const handleDuplicate = async (nb: Notebook) => {
    const duplicated: Notebook = {
      ...JSON.parse(JSON.stringify(nb)),
      id: 'nb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      title: `${nb.title} (Copy)`,
      updatedAt: Date.now(),
    };
    await saveNotebook(duplicated);
    onRefreshNotebooks();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this notebook?')) {
      await deleteNotebook(id);
      onRefreshNotebooks();
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportProgress('Reading PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const newPages = [];

      for (let i = 1; i <= numPages; i++) {
        setImportProgress(`Rendering Page ${i} / ${numPages}...`);
        const page = await pdf.getPage(i);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        // High-DPI Retina scale (2.5x) for crystal-sharp text and diagrams
        const renderScale = 2.5;
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          await page.render({ canvasContext: ctx, viewport }).promise;
          // Lossless PNG data URL: eliminates all blurry JPEG compression artifacts
          const bgDataUrl = canvas.toDataURL('image/png');

          // Compute logical canvas coordinates (1 pt = 1.3333 px at standard 96 DPI)
          const logicalWidth = Math.round(unscaledViewport.width * 1.3333);
          const logicalHeight = Math.round(unscaledViewport.height * 1.3333);

          newPages.push({
            id: 'page_pdf_' + i + '_' + Date.now(),
            template: 'blank' as PageTemplate,
            color: 'white' as PageColor,
            strokes: [],
            texts: [],
            tapes: [],
            images: [],
            pdfBackground: bgDataUrl,
            width: logicalWidth,
            height: logicalHeight,
          });
        }
      }

      const importedNotebook: Notebook = {
        id: 'nb_pdf_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        title: file.name.replace(/\.pdf$/i, ''),
        coverColor: '#ef4444',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['PDF', 'Document'],
        pages: newPages.length > 0 ? newPages : [createNewPage()],
      };

      await saveNotebook(importedNotebook);
      onRefreshNotebooks();
      onSelectNotebook(importedNotebook);
    } catch (err) {
      console.error('PDF Import error:', err);
      alert('Failed to import PDF file. Please try another PDF.');
    } finally {
      setIsImporting(false);
      setImportProgress('');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleJsonRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.id && parsed.pages) {
          parsed.id = 'nb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          parsed.title = parsed.title + ' (Restored)';
          await saveNotebook(parsed);
          onRefreshNotebooks();
          alert('Notebook restored successfully!');
        }
      } catch (err) {
        alert('Invalid backup JSON format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                FreeNotes Web
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700">
                100% Free & Unlimited
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your free digital notebook with realistic pens, PDF annotation & study tools
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search notebooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-56 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Import PDF Button */}
          <button
            onClick={() => pdfInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-all"
            title="Import PDF to annotate"
          >
            <FileUp size={16} className="text-red-500" />
            <span className="hidden sm:inline">Import PDF</span>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
          </button>

          {/* Restore JSON Backup */}
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-all"
            title="Restore from JSON Backup"
          >
            <FileText size={16} className="text-amber-500" />
            <span className="hidden md:inline">Restore</span>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonRestore}
              className="hidden"
            />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            title="Toggle Dark / Light Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* New Notebook Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all"
          >
            <Plus size={18} />
            <span>New Notebook</span>
          </button>
        </div>
      </header>

      {/* Importing indicator */}
      {isImporting && (
        <div className="bg-blue-600 text-white text-xs font-semibold py-2 px-4 text-center animate-pulse flex items-center justify-center gap-2">
          <Sparkles size={16} /> {importProgress}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">My Notebook Shelf</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {notebooks.length} {notebooks.length === 1 ? 'notebook' : 'notebooks'} available offline in browser storage
            </p>
          </div>
        </div>

        {/* Notebooks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {/* Quick Create Card */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 p-6 flex flex-col items-center justify-center gap-3 transition-all hover:bg-blue-50/30 dark:hover:bg-blue-900/10 text-slate-400 hover:text-blue-600"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
              <Plus size={24} />
            </div>
            <div className="text-xs font-bold">New Note</div>
          </button>

          {/* Render Existing Notebooks */}
          {filteredNotebooks.map((nb) => (
            <div
              key={nb.id}
              onClick={() => onSelectNotebook(nb)}
              className="group aspect-[3/4] rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between p-4 border border-black/5 hover:-translate-y-1"
              style={{
                backgroundColor: nb.coverColor,
                backgroundImage:
                  'linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 12%, rgba(255,255,255,0.05) 16%, transparent 22%)',
              }}
            >
              {/* Spine Stitch effect */}
              <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-white/20 border-r border-dashed border-white/40" />

              {/* Top Tag & Card Actions */}
              <div className="flex items-center justify-between z-10 pl-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {nb.pages.length} {nb.pages.length === 1 ? 'Page' : 'Pages'}
                </span>

                <div className="relative group/menu" onClick={(e) => e.stopPropagation()}>
                  <button className="p-1 rounded-full text-white/80 hover:text-white hover:bg-black/20 transition-all">
                    <MoreVertical size={16} />
                  </button>
                  <div className="absolute right-0 top-6 hidden group-hover/menu:flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 min-w-[130px] z-30 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => handleDuplicate(nb)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Copy size={13} /> Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(nb.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Title & Metadata Card */}
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3.5 rounded-xl shadow-sm pl-4 border border-white/40 dark:border-slate-700/60 transition-transform group-hover:scale-[1.02]">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                  {nb.title}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(nb.updatedAt).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers size={11} />
                    {nb.pages[0]?.template || 'Ruled'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Create Notebook Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Create New Notebook</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Notebook Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Physics Notes, Daily Journal..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Cover Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COVER_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCoverColor(color)}
                      className={`w-7 h-7 rounded-xl transition-all border border-black/10 flex items-center justify-center ${
                        newCoverColor === color ? 'scale-110 ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {newCoverColor === color && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Initial Paper Style
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['ruled', 'grid', 'dotted', 'blank', 'cornell', 'planner'] as PageTemplate[]).map((tmpl) => (
                    <button
                      key={tmpl}
                      onClick={() => setNewTemplate(tmpl)}
                      className={`p-2.5 rounded-xl border text-left font-medium capitalize transition-all ${
                        newTemplate === tmpl
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNotebook}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 transition-all"
              >
                Create Notebook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
