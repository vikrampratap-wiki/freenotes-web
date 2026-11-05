import React, { useRef, useState } from 'react';
import {
  ToolType,
  ShapeKind,
  EraserType,
} from '../types';
import {
  PenTool,
  Feather,
  Paintbrush,
  Highlighter,
  Eraser,
  Lasso,
  Square,
  Type,
  Sparkles,
  Image as ImageIcon,
  Hand,
  Undo2,
  Redo2,
  ChevronLeft,
  Share2,
  Sliders,
  PanelLeft,
  Plus,
  ZoomIn,
  ZoomOut,
  Circle,
  Minus,
  ArrowRight,
  Triangle,
  Compass,
  Radio,
  StickyNote,
  Eye,
  EyeOff,
  Trash,
  Mic,
  Maximize2,
  Palette,
} from 'lucide-react';

interface Props {
  notebookTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  onBackToShelf: () => void;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeSize: number;
  setStrokeSize: (size: number) => void;
  shapeKind: ShapeKind;
  setShapeKind: (kind: ShapeKind) => void;
  eraserType: EraserType;
  setEraserType: (type: EraserType) => void;
  eraseHighlighterOnly: boolean;
  setEraseHighlighterOnly: React.Dispatch<React.SetStateAction<boolean>>;
  onClearPage: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  currentPageIndex: number;
  totalPages: number;
  onAddPage: () => void;
  onToggleSidebar: () => void;
  onOpenTemplateModal: () => void;
  onOpenExportModal: () => void;
  onOpenStickyNotesModal: () => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  onInsertImage: (file: File) => void;
  isRulerActive: boolean;
  onToggleRuler: () => void;
  tapeCount: number;
  onRevealAllTapes: () => void;
  onHideAllTapes: () => void;
  isZoomWindowOpen: boolean;
  onToggleZoomWindow: () => void;
  isStylusOnly: boolean;
  onToggleStylusOnly: () => void;
  isAudioRecorderOpen: boolean;
  onToggleAudioRecorder: () => void;
  audioCount: number;
}

const FAVORITE_COLORS = [
  '#0f172a', // Midnight Black
  '#2563eb', // Royal Blue
  '#dc2626', // Crimson Red
  '#059669', // Forest Green
  '#7c3aed', // Royal Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
];

const PRESET_SIZES = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Bold', value: 8 },
  { label: 'Marker', value: 16 },
];

export const Toolbar: React.FC<Props> = ({
  notebookTitle,
  onUpdateTitle,
  onBackToShelf,
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  strokeSize,
  setStrokeSize,
  shapeKind,
  setShapeKind,
  eraserType,
  setEraserType,
  eraseHighlighterOnly,
  setEraseHighlighterOnly,
  onClearPage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  currentPageIndex,
  totalPages,
  onAddPage,
  onToggleSidebar,
  onOpenTemplateModal,
  onOpenExportModal,
  onOpenStickyNotesModal,
  zoom,
  setZoom,
  onInsertImage,
  isRulerActive,
  onToggleRuler,
  tapeCount,
  onRevealAllTapes,
  onHideAllTapes,
  isZoomWindowOpen,
  onToggleZoomWindow,
  isStylusOnly,
  onToggleStylusOnly,
  isAudioRecorderOpen,
  onToggleAudioRecorder,
  audioCount,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onInsertImage(e.target.files[0]);
    }
  };

  const isInkTool = ['ballpoint', 'fountain', 'brush', 'highlighter'].includes(activeTool);

  return (
    <header className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-30 select-none">
      {/* Tier 1: Main Primary Navigation & Inking Tools */}
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80">
        {/* Left: Library Back, Title, Undo / Redo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onBackToShelf}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1 font-semibold text-xs"
            title="Library"
          >
            <ChevronLeft size={18} />
            <span className="hidden md:inline">Library</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <input
            type="text"
            value={notebookTitle}
            onChange={(e) => onUpdateTitle(e.target.value)}
            className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 px-2 py-1 rounded-lg outline-none max-w-[120px] sm:max-w-[180px] truncate transition-all"
            title="Notebook Title"
          />

          <div className="flex items-center gap-0.5">
            <button
              disabled={!canUndo}
              onClick={onUndo}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              disabled={!canRedo}
              onClick={onRedo}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>

        {/* Center: Primary Inking Tool Dock */}
        <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-inner overflow-x-auto">
          {/* Ballpoint Pen */}
          <button
            onClick={() => setActiveTool('ballpoint')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all relative ${
              activeTool === 'ballpoint'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Ballpoint Pen (बॉलपॉइंट पेन)"
          >
            <PenTool size={17} />
            {activeTool === 'ballpoint' && (
              <span
                className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white"
                style={{ backgroundColor: strokeColor }}
              />
            )}
          </button>

          {/* Fountain Pen */}
          <button
            onClick={() => setActiveTool('fountain')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all relative ${
              activeTool === 'fountain'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Fountain Pen (फाउंटेन पेन - प्रेशर सेंसिटिव)"
          >
            <Feather size={17} />
            {activeTool === 'fountain' && (
              <span
                className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white"
                style={{ backgroundColor: strokeColor }}
              />
            )}
          </button>

          {/* Brush Pen */}
          <button
            onClick={() => setActiveTool('brush')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all relative ${
              activeTool === 'brush'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Brush Pen (ब्रश पेन)"
          >
            <Paintbrush size={17} />
            {activeTool === 'brush' && (
              <span
                className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white"
                style={{ backgroundColor: strokeColor }}
              />
            )}
          </button>

          {/* Highlighter */}
          <button
            onClick={() => setActiveTool('highlighter')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all relative ${
              activeTool === 'highlighter'
                ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Highlighter (हाइलाइटर)"
          >
            <Highlighter size={17} />
          </button>

          {/* Eraser */}
          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all ${
              activeTool === 'eraser'
                ? 'bg-white dark:bg-slate-700 text-red-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Eraser Tool (इरेज़र)"
          >
            <Eraser size={17} />
          </button>

          {/* Lasso Tool */}
          <button
            onClick={() => setActiveTool('lasso')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all ${
              activeTool === 'lasso'
                ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Lasso Selection (लासो चयन - सेलेक्ट, मूव, डुप्लिकेट, OCR)"
          >
            <Lasso size={17} />
          </button>

          {/* Geometric Shapes */}
          <button
            onClick={() => setActiveTool('shape')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all ${
              activeTool === 'shape'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Shapes & Lines (आकृतियाँ व रेखाएँ)"
          >
            <Square size={17} />
          </button>

          {/* FreeNotes Study Tape Tool */}
          <button
            onClick={() => setActiveTool('tape')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all relative ${
              activeTool === 'tape'
                ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="FreeNotes Study Tape (स्टडी टेप - परीक्षा अभ्यास)"
          >
            <Sparkles size={17} />
            {tapeCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-full">
                {tapeCount}
              </span>
            )}
          </button>

          {/* Text Tool */}
          <button
            onClick={() => setActiveTool('text')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all ${
              activeTool === 'text'
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Text Box (टाइप करें या बोलकर लिखें)"
          >
            <Type size={17} />
          </button>

          {/* Sticky Notes */}
          <button
            onClick={onOpenStickyNotesModal}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all"
            title="Sticky Note Pad (स्टिकर नोट्स)"
          >
            <StickyNote size={17} className="text-amber-500" />
          </button>

          {/* Ruler Guide */}
          <button
            onClick={onToggleRuler}
            className={`p-1.5 sm:p-2 rounded-xl transition-all ${
              isRulerActive
                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Ruler Guide (360° वर्चुअल पैमाना)"
          >
            <Compass size={17} />
          </button>

          {/* Laser Pointer */}
          <button
            onClick={() => setActiveTool('laser')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all ${
              activeTool === 'laser'
                ? 'bg-white dark:bg-slate-700 text-red-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Laser Pointer (लेज़र पॉइंटर)"
          >
            <Radio size={17} />
          </button>

          {/* Image Insert */}
          <button
            onClick={() => imageInputRef.current?.click()}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all"
            title="Insert Image (चित्र जोड़ें)"
          >
            <ImageIcon size={17} />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </button>

          {/* Hand Pan Tool */}
          <button
            onClick={() => setActiveTool('hand')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all ${
              activeTool === 'hand'
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Hand Tool (कैनवास घुमाएँ)"
          >
            <Hand size={17} />
          </button>

          {/* Zoom Writing Window Button */}
          <button
            onClick={onToggleZoomWindow}
            className={`p-1.5 sm:p-2 rounded-xl transition-all relative ${
              isZoomWindowOpen
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Finger Zoom Writing Pad (उंगली से बड़ा लिखकर छोटा बैठाएँ)"
          >
            <Maximize2 size={17} />
          </button>

          {/* Audio Lecture Recorder Button */}
          <button
            onClick={onToggleAudioRecorder}
            className={`p-1.5 sm:p-2 rounded-xl transition-all relative ${
              isAudioRecorderOpen
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
            title="Audio Lecture Recorder (कक्षा रिकॉर्डिंग)"
          >
            <Mic size={17} />
            {audioCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-red-500 text-white text-[8px] font-bold rounded-full">
                {audioCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: Palm Rejection, Page Navigator, Templates, Zoom, Export */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Stylus / Finger Mode */}
          <button
            onClick={onToggleStylusOnly}
            className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-all ${
              isStylusOnly
                ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title={isStylusOnly ? "Stylus Only Mode (Palm Rejection Active)" : "Finger Mode (उंगली व स्टाइलस दोनों)"}
          >
            <span>{isStylusOnly ? '✏️ Stylus' : '👆 Finger'}</span>
          </button>

          {/* Page Navigator */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:text-blue-600"
              title="Page Thumbnails"
            >
              <PanelLeft size={15} />
            </button>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 px-1">
              {currentPageIndex + 1}/{totalPages}
            </span>
            <button
              onClick={onAddPage}
              className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              title="Add Page"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Paper template button */}
          <button
            onClick={onOpenTemplateModal}
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Paper Templates & Background"
          >
            <Sliders size={17} />
          </button>

          {/* Zoom */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
              className="p-0.5 rounded text-slate-500 hover:text-slate-800"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(1))))}
              className="p-0.5 rounded text-slate-500 hover:text-slate-800"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
            title="Export PDF / PNG / Backup"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Tier 2: Docked Secondary Property Ribbon (Pushes Canvas cleanly down, never obscures notes!) */}
      <div className="h-10 px-4 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between text-xs overflow-x-auto">
        {/* Pen or Highlighter Properties */}
        {isInkTool && (
          <div className="flex items-center gap-4">
            {/* 3 Quick Color Swatches + Palette Button */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Color:</span>
              {FAVORITE_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c}
                  onClick={() => setStrokeColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform border border-black/20 ${
                    strokeColor === c ? 'scale-125 ring-2 ring-blue-500 shadow-sm' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}

              <div className="relative flex items-center ml-1">
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-5 h-5 rounded-full overflow-hidden cursor-pointer border border-slate-300"
                  title="Pick any color"
                />
              </div>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

            {/* Stroke Thickness Slots & Slider */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Size:</span>
              {PRESET_SIZES.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setStrokeSize(item.value)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                    strokeSize === item.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label} ({item.value}px)
                </button>
              ))}

              <input
                type="range"
                min="1"
                max="30"
                value={strokeSize}
                onChange={(e) => setStrokeSize(Number(e.target.value))}
                className="w-16 accent-blue-600 cursor-pointer"
                title={`${strokeSize}px`}
              />
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* Scratch-to-Erase Hint */}
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              ⚡ Scratch scribble over ink to auto-erase
            </span>
          </div>
        )}

        {/* Eraser Properties */}
        {activeTool === 'eraser' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setEraserType('stroke')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  eraserType === 'stroke'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Stroke Eraser (पूरा स्ट्रोक)
              </button>
              <button
                onClick={() => setEraserType('pixel')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  eraserType === 'pixel'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Precision Area (बारीक)
              </button>
            </div>

            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={eraseHighlighterOnly}
                onChange={(e) => setEraseHighlighterOnly(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Erase Highlighter Only</span>
            </label>

            <button
              onClick={onClearPage}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all ml-auto"
              title="Clear all ink on this page"
            >
              <Trash size={13} /> Clear Entire Page
            </button>
          </div>
        )}

        {/* Shape Properties */}
        {activeTool === 'shape' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shapes:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShapeKind('rectangle')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs ${
                  shapeKind === 'rectangle' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Square size={13} /> Rect
              </button>
              <button
                onClick={() => setShapeKind('circle')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs ${
                  shapeKind === 'circle' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Circle size={13} /> Circle
              </button>
              <button
                onClick={() => setShapeKind('line')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs ${
                  shapeKind === 'line' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Minus size={13} /> Line
              </button>
              <button
                onClick={() => setShapeKind('arrow')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs ${
                  shapeKind === 'arrow' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ArrowRight size={13} /> Arrow
              </button>
              <button
                onClick={() => setShapeKind('triangle')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs ${
                  shapeKind === 'triangle' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Triangle size={13} /> Triangle
              </button>
            </div>
          </div>
        )}

        {/* Tape Properties */}
        {activeTool === 'tape' && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
              <Sparkles size={13} /> Study Tape Quiz Mode ({tapeCount} tapes on page):
            </span>
            <button
              onClick={onRevealAllTapes}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200 transition-all"
            >
              <Eye size={12} /> Reveal All (सब दिखाएं)
            </button>
            <button
              onClick={onHideAllTapes}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-all"
            >
              <EyeOff size={12} /> Hide All (छुपाएं)
            </button>
          </div>
        )}

        {/* Text Properties */}
        {activeTool === 'text' && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Text Box:</span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Click anywhere on page to create text box • Double click to edit • Mic button inside box to dictate
            </span>
          </div>
        )}

        {/* Lasso Properties */}
        {activeTool === 'lasso' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lasso Tool:</span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Draw loop around handwriting to Select, Move, Recolor, Delete, or Convert to OCR Computerized Text
            </span>
          </div>
        )}

        {/* Laser Properties */}
        {activeTool === 'laser' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-500 flex items-center gap-1">
              <Radio size={13} /> Laser Presentation:
            </span>
            <span className="text-xs text-slate-500">Draw trails to point out items during lectures and presentations</span>
          </div>
        )}

        {/* Hand Pan Tool */}
        {activeTool === 'hand' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
              <Hand size={13} /> Hand Pan:
            </span>
            <span className="text-xs text-slate-500">Drag to scroll smoothly around the canvas without making marks</span>
          </div>
        )}
      </div>
    </header>
  );
};
