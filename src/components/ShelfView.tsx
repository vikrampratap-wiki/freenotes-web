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
  Calendar,
  Layers,
  Sparkles,
  Check,
  X,
  FileText,
  Star,
  Folder,
} from 'lucide-react';
import { createNewPage, saveNotebook, deleteNotebook } from '../utils/storage';
import { importPdfFileToPages } from '../utils/pdfEngine';

interface Props {
  notebooks: Notebook[];
  onSelectNotebook: (nb: Notebook) => void;
  onRefreshNotebooks: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const COVER_COLORS = [
  '#2563eb', // Ocean Blue
  '#7c3aed', // Lavender Purple
  '#059669', // Sage Green
  '#d97706', // Amber Honey
  '#dc2626', // Coral Red
  '#0891b2', // Sky Cyan
  '#db2777', // Berry Pink
  '#334155', // Slate Charcoal
];

const CATEGORIES = ['All', 'Favorites', 'Study', 'PDF', 'Personal'];

export const ShelfView: React.FC<Props> = ({
  notebooks,
  onSelectNotebook,
  onRefreshNotebooks,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New Notebook Form
  const [newTitle, setNewTitle] = useState('My Notes');
  const [newCoverColor, setNewCoverColor] = useState('#2563eb');
  const [newCoverPattern, setNewCoverPattern] = useState<Notebook['coverPattern']>('minimal');
  const [newCategory, setNewCategory] = useState('Study');
  const [newTemplate, setNewTemplate] = useState<PageTemplate>('ruled');
  const [newPaperColor, setNewPaperColor] = useState<PageColor>('white');

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3200);
  };

  const filteredNotebooks = notebooks.filter((nb) => {
    const matchesSearch = nb.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Favorites') return Boolean(nb.isFavorite);
    return (nb.tags || []).some((t) => t.toLowerCase() === activeCategory.toLowerCase());
  });

  const handleCreateNotebook = async () => {
    const newNb: Notebook = {
      id: 'nb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      title: newTitle.trim() || 'Untitled Notebook',
      coverColor: newCoverColor,
      coverPattern: newCoverPattern,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [newCategory],
      pages: [createNewPage(newTemplate, newPaperColor)],
    };

    await saveNotebook(newNb);
    setIsCreateModalOpen(false);
    onRefreshNotebooks();
    onSelectNotebook(newNb);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, nb: Notebook) => {
    e.stopPropagation();
    await saveNotebook({ ...nb, isFavorite: !nb.isFavorite });
    onRefreshNotebooks();
  };

  const handleDuplicate = async (nb: Notebook) => {
    const duplicated: Notebook = {
      ...nb,
      id: 'nb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      title: `${nb.title} (Copy)`,
      updatedAt: Date.now(),
      pages: nb.pages.map((p) => ({
        ...p,
        id: 'page_' + Math.random().toString(36).substring(2, 9),
        strokes: [...p.strokes],
        texts: [...p.texts],
        tapes: [...p.tapes],
        images: [...p.images],
      })),
    };
    await saveNotebook(duplicated);
    onRefreshNotebooks();
    showToast('नोटबुक की कॉपी बना दी गई है!');
  };

  const handleDelete = async (id: string) => {
    await deleteNotebook(id);
    setDeletingId(null);
    onRefreshNotebooks();
    showToast('नोटबुक हटा दी गई है।');
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportProgress('बड़ी PDF फ़ाइल लोड हो रही है...');
      const { pages: newPages } = await importPdfFileToPages(file, (msg) => setImportProgress(msg));

      const importedNotebook: Notebook = {
        id: 'nb_pdf_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        title: file.name.replace(/\.pdf$/i, ''),
        coverColor: '#dc2626',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['PDF', 'Study'],
        pages: newPages.length > 0 ? newPages : [createNewPage()],
      };

      await saveNotebook(importedNotebook);
      onRefreshNotebooks();
      onSelectNotebook(importedNotebook);
    } catch (err) {
      console.error('PDF Import error:', err);
      showToast('PDF इम्पोर्ट करने में समस्या आई। कृपया अन्य PDF फ़ाइल चुनें।');
    } finally {
      setIsImporting(false);
      setImportProgress('');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleJsonRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportProgress('बैकअप फ़ाइल रीस्टोर हो रही है...');
      const textContent = await file.text();
      const parsed = JSON.parse(textContent);
      if (parsed.id && parsed.pages) {
        parsed.id = 'nb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        parsed.title = parsed.title + ' (Restored)';
        await saveNotebook(parsed);
        onRefreshNotebooks();
        showToast('नोटबुक सफलतापूर्वक रीस्टोर हो गई!');
      } else {
        showToast('अमान्य बैकअप JSON फ़ाइल।');
      }
    } catch (_) {
      showToast('अमान्य बैकअप JSON फ़ाइल।');
    } finally {
      setIsImporting(false);
      setImportProgress('');
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <BookOpen size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            FreeNotes Web
          </span>
        </div>

        {/* Category Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeCategory === cat
                  ? 'text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat === 'All'
                ? 'All Notebooks'
                : cat === 'Favorites'
                ? 'Favorites'
                : cat === 'Study'
                ? 'Study Notes'
                : cat === 'PDF'
                ? 'PDF Books'
                : 'Personal'}
            </button>
          ))}
        </nav>

        {/* Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            title="Toggle Dark / Light Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap shrink-0"
          >
            <Plus size={17} />
            <span>New Notebook</span>
          </button>
        </div>
      </header>

      {/* Toast message */}
      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold">
          {statusMessage}
        </div>
      )}

      {/* Importing indicator */}
      {isImporting && (
        <div className="bg-blue-600 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
          <Sparkles size={15} /> {importProgress}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {/* Workspace Toolbar: Search, Category Filter & PDF/Backup Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              My Notebook Shelf
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              {filteredNotebooks.length} {filteredNotebooks.length === 1 ? 'notebook' : 'notebooks'} · Saved offline in browser IndexedDB
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search bar */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search notebooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-48 sm:w-56 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Import PDF Button */}
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-800 transition-all whitespace-nowrap shrink-0"
              title="Import PDF to annotate"
            >
              <FileUp size={15} className="text-red-500" />
              <span>Import PDF</span>
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-800 transition-all whitespace-nowrap shrink-0"
              title="Restore from JSON Backup"
            >
              <FileText size={15} className="text-amber-500" />
              <span>Restore Backup</span>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json"
                onChange={handleJsonRestore}
                className="hidden"
              />
            </button>
          </div>
        </div>

        {/* Mobile Category Filter Tabs */}
        <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-4 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notebooks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {/* Quick Create Card */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 p-6 flex flex-col items-center justify-center gap-3 transition-all hover:bg-blue-50/30 dark:hover:bg-blue-900/10 text-slate-400 hover:text-blue-600"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
              <Plus size={24} />
            </div>
            <div className="text-xs font-bold">New Notebook</div>
          </button>

          {/* Render Existing Notebooks */}
          {filteredNotebooks.map((nb) => {
            const patternOverlay =
              nb.coverPattern === 'stripes'
                ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 10px, transparent 10px, transparent 20px)'
                : nb.coverPattern === 'geometric'
                ? 'radial-gradient(rgba(255,255,255,0.16) 1.5px, transparent 1.5px)'
                : 'linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 12%, rgba(255,255,255,0.05) 16%, transparent 22%)';

            return (
              <div
                key={nb.id}
                onClick={() => onSelectNotebook(nb)}
                className="group aspect-[3/4] rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between p-4 border border-black/5 hover:-translate-y-1"
                style={{
                  backgroundColor: nb.coverColor,
                  backgroundImage: patternOverlay,
                  backgroundSize: nb.coverPattern === 'geometric' ? '16px 16px' : 'auto',
                }}
              >
                {/* Spine Stitch effect */}
                <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-white/20 border-r border-dashed border-white/40" />

                {/* Top Metadata & Card Actions */}
                <div className="flex items-center justify-between z-10 pl-3">
                  <span className="text-[11px] font-semibold text-white/90 tabular-nums">
                    {nb.pages.length} {nb.pages.length === 1 ? 'Page' : 'Pages'}
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleToggleFavorite(e, nb)}
                      className="p-1 rounded-full text-white/85 hover:text-amber-300 transition-colors"
                      title="Favorite Notebook"
                    >
                      <Star
                        size={15}
                        fill={nb.isFavorite ? '#fcd34d' : 'none'}
                        color={nb.isFavorite ? '#fcd34d' : 'currentColor'}
                      />
                    </button>

                    <div className="relative group/menu">
                      <button className="p-1 rounded-full text-white/80 hover:text-white hover:bg-black/20 transition-all">
                        <MoreVertical size={16} />
                      </button>
                      <div className="absolute right-0 top-6 hidden group-hover/menu:flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 min-w-[140px] z-30">
                        <button
                          onClick={() => handleDuplicate(nb)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Copy size={13} /> Duplicate
                        </button>
                        {deletingId === nb.id ? (
                          <button
                            onClick={() => handleDelete(nb.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-2"
                          >
                            <Trash2 size={13} /> Confirm Delete
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeletingId(nb.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title & Unboxed Metadata Card */}
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3.5 rounded-xl shadow-sm pl-4 border border-white/40 dark:border-slate-700/60">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                    {nb.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>{new Date(nb.updatedAt).toLocaleDateString()}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{nb.pages[0]?.template || 'Ruled'}</span>
                    {nb.tags?.[0] && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{nb.tags[0]}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    Subject Folder
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
                  >
                    <option value="Study">Study Notes</option>
                    <option value="Personal">Personal</option>
                    <option value="PDF">PDF Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    Cover Style
                  </label>
                  <select
                    value={newCoverPattern}
                    onChange={(e) => setNewCoverPattern(e.target.value as Notebook['coverPattern'])}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
                  >
                    <option value="minimal">Classic Spine</option>
                    <option value="stripes">Diagonal Stripes</option>
                    <option value="geometric">Dot Matrix</option>
                  </select>
                </div>
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
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['ruled', 'grid', 'dotted', 'blank', 'cornell', 'planner'] as PageTemplate[]).map((tmpl) => (
                    <button
                      key={tmpl}
                      onClick={() => setNewTemplate(tmpl)}
                      className={`p-2 rounded-xl border text-left font-medium capitalize transition-all ${
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
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
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
