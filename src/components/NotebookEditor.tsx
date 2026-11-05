import React, { useState, useEffect, useCallback } from 'react';
import {
  Notebook,
  Page,
  ToolType,
  ShapeKind,
  EraserType,
  PageTemplate,
  PageColor,
  TextItem,
} from '../types';
import { Toolbar } from './Toolbar';
import { CanvasPage } from './CanvasPage';
import { PageThumbnailSidebar } from './PageThumbnailSidebar';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { ExportModal } from './ExportModal';
import { StickyNotesModal } from './StickyNotesModal';
import { RulerGuide } from './RulerGuide';
import { ZoomWritingWindow } from './ZoomWritingWindow';
import { AudioRecorder } from './AudioRecorder';
import { saveNotebook, createNewPage } from '../utils/storage';
import { AudioRecording } from '../types';

interface Props {
  initialNotebook: Notebook;
  onBackToShelf: () => void;
}

export const NotebookEditor: React.FC<Props> = ({
  initialNotebook,
  onBackToShelf,
}) => {
  const [notebook, setNotebook] = useState<Notebook>(initialNotebook);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<ToolType>('ballpoint');
  const [strokeColor, setStrokeColor] = useState<string>('#0f172a');
  const [strokeSize, setStrokeSize] = useState<number>(4);
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rectangle');
  const [eraserType, setEraserType] = useState<EraserType>('stroke');
  const [eraseHighlighterOnly, setEraseHighlighterOnly] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);

  // Ruler state
  const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
  const [rulerState, setRulerState] = useState<{ x: number; y: number; angle: number; width: number; height: number } | null>(null);

  // Zoom Writing Window (FreeNotes Finger Writing Box) & Palm Rejection
  const [isZoomWindowOpen, setIsZoomWindowOpen] = useState<boolean>(false);
  const [zoomTargetBox, setZoomTargetBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 80,
    y: 120,
    width: 220,
    height: 80,
  });
  const [isStylusOnly, setIsStylusOnly] = useState<boolean>(false);

  // Modals & Panels
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isStickyNotesModalOpen, setIsStickyNotesModalOpen] = useState<boolean>(false);
  const [isAudioRecorderOpen, setIsAudioRecorderOpen] = useState<boolean>(false);

  // Undo / Redo Stacks for current page
  const [undoStack, setUndoStack] = useState<Page[]>([]);
  const [redoStack, setRedoStack] = useState<Page[]>([]);

  const currentPage = notebook.pages[currentPageIndex] || notebook.pages[0];

  // Auto-save notebook changes to IndexedDB
  const persistNotebook = useCallback((updated: Notebook) => {
    setNotebook(updated);
    saveNotebook(updated);
  }, []);

  const handleUpdatePage = (updatedPage: Page) => {
    setUndoStack((prev) => [...prev.slice(-30), currentPage]);
    setRedoStack([]);

    const updatedPages = notebook.pages.map((p, idx) =>
      idx === currentPageIndex ? updatedPage : p
    );
    persistNotebook({ ...notebook, pages: updatedPages });
  };

  const handleClearPage = () => {
    if (confirm('Clear all strokes and items on this page?')) {
      handleUpdatePage({
        ...currentPage,
        strokes: [],
        texts: [],
        tapes: [],
        images: [],
      });
    }
  };

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevPage = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, currentPage]);

    const updatedPages = notebook.pages.map((p, idx) =>
      idx === currentPageIndex ? prevPage : p
    );
    persistNotebook({ ...notebook, pages: updatedPages });
  }, [undoStack, currentPage, currentPageIndex, notebook, persistNotebook]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextPage = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, currentPage]);

    const updatedPages = notebook.pages.map((p, idx) =>
      idx === currentPageIndex ? nextPage : p
    );
    persistNotebook({ ...notebook, pages: updatedPages });
  }, [redoStack, currentPage, currentPageIndex, notebook, persistNotebook]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleAddPage = (afterIndex = currentPageIndex) => {
    const newPage = createNewPage(currentPage.template, currentPage.color);
    const newPages = [...notebook.pages];
    newPages.splice(afterIndex + 1, 0, newPage);
    persistNotebook({ ...notebook, pages: newPages });
    setCurrentPageIndex(afterIndex + 1);
  };

  const handleDuplicatePage = (index: number) => {
    const sourcePage = notebook.pages[index];
    const duplicatedPage: Page = {
      ...JSON.parse(JSON.stringify(sourcePage)),
      id: 'page_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    };
    const newPages = [...notebook.pages];
    newPages.splice(index + 1, 0, duplicatedPage);
    persistNotebook({ ...notebook, pages: newPages });
    setCurrentPageIndex(index + 1);
  };

  const handleDeletePage = (index: number) => {
    if (notebook.pages.length <= 1) return;
    const newPages = notebook.pages.filter((_, i) => i !== index);
    const newIndex = Math.min(currentPageIndex, newPages.length - 1);
    persistNotebook({ ...notebook, pages: newPages });
    setCurrentPageIndex(newIndex);
  };

  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= notebook.pages.length) return;
    const newPages = [...notebook.pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    persistNotebook({ ...notebook, pages: newPages });
    setCurrentPageIndex(toIndex);
  };

  const handleApplyTemplate = (template: PageTemplate, color: PageColor) => {
    handleUpdatePage({
      ...currentPage,
      template,
      color,
    });
  };

  const handleInsertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 350;
        const scale = maxWidth / img.width;
        const width = Math.min(maxWidth, img.width);
        const height = img.height * scale;

        const newImageItem = {
          id: 'img_' + Math.random().toString(36).substring(2, 9),
          x: 100,
          y: 200,
          width,
          height,
          src,
        };

        handleUpdatePage({
          ...currentPage,
          images: [...currentPage.images, newImageItem],
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleInsertStickyNote = (note: TextItem) => {
    handleUpdatePage({
      ...currentPage,
      texts: [...currentPage.texts, note],
    });
  };

  // Tape Quiz Mode
  const handleRevealAllTapes = () => {
    const updatedTapes = currentPage.tapes.map((t) => ({ ...t, isRevealed: true }));
    handleUpdatePage({ ...currentPage, tapes: updatedTapes });
  };

  const handleHideAllTapes = () => {
    const updatedTapes = currentPage.tapes.map((t) => ({ ...t, isRevealed: false }));
    handleUpdatePage({ ...currentPage, tapes: updatedTapes });
  };

  const handleAddRecording = (rec: AudioRecording) => {
    const updatedRecordings = [...(notebook.audioRecordings || []), rec];
    persistNotebook({ ...notebook, audioRecordings: updatedRecordings });
  };

  const handleDeleteRecording = (id: string) => {
    const updatedRecordings = (notebook.audioRecordings || []).filter((r) => r.id !== id);
    persistNotebook({ ...notebook, audioRecordings: updatedRecordings });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-200/80 dark:bg-slate-950">
      {/* Top FreeNotes Toolbar */}
      <Toolbar
        notebookTitle={notebook.title}
        onUpdateTitle={(title) => persistNotebook({ ...notebook, title })}
        onBackToShelf={onBackToShelf}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        strokeSize={strokeSize}
        setStrokeSize={setStrokeSize}
        shapeKind={shapeKind}
        setShapeKind={setShapeKind}
        eraserType={eraserType}
        setEraserType={setEraserType}
        eraseHighlighterOnly={eraseHighlighterOnly}
        setEraseHighlighterOnly={setEraseHighlighterOnly}
        onClearPage={handleClearPage}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        currentPageIndex={currentPageIndex}
        totalPages={notebook.pages.length}
        onAddPage={() => handleAddPage(currentPageIndex)}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenStickyNotesModal={() => setIsStickyNotesModalOpen(true)}
        zoom={zoom}
        setZoom={setZoom}
        onInsertImage={handleInsertImage}
        isRulerActive={isRulerActive}
        onToggleRuler={() => setIsRulerActive((prev) => !prev)}
        tapeCount={currentPage.tapes.length}
        onRevealAllTapes={handleRevealAllTapes}
        onHideAllTapes={handleHideAllTapes}
        isZoomWindowOpen={isZoomWindowOpen}
        onToggleZoomWindow={() => setIsZoomWindowOpen((prev) => !prev)}
        isStylusOnly={isStylusOnly}
        onToggleStylusOnly={() => setIsStylusOnly((prev) => !prev)}
        isAudioRecorderOpen={isAudioRecorderOpen}
        onToggleAudioRecorder={() => setIsAudioRecorderOpen((prev) => !prev)}
        audioCount={(notebook.audioRecordings || []).length}
      />

      {/* Main Interactive Canvas Workspace */}
      <main className="flex-1 overflow-auto p-8 flex justify-center items-start relative pb-64">
        <CanvasPage
          page={currentPage}
          onUpdatePage={handleUpdatePage}
          activeTool={activeTool}
          strokeColor={strokeColor}
          strokeSize={strokeSize}
          shapeKind={shapeKind}
          eraserType={eraserType}
          eraseHighlighterOnly={eraseHighlighterOnly}
          zoom={zoom}
          rulerState={rulerState}
          isRulerActive={isRulerActive}
          isZoomWindowOpen={isZoomWindowOpen}
          zoomTargetBox={zoomTargetBox}
          onUpdateZoomTargetBox={setZoomTargetBox}
          isStylusOnly={isStylusOnly}
        />

        {/* Acrylic Virtual Ruler */}
        <RulerGuide
          isVisible={isRulerActive}
          onClose={() => setIsRulerActive(false)}
          onRulerPositionChange={setRulerState}
        />
      </main>

      {/* FreeNotes Finger Writing Pad (Zoom Window) */}
      <ZoomWritingWindow
        isOpen={isZoomWindowOpen}
        onClose={() => setIsZoomWindowOpen(false)}
        targetBox={zoomTargetBox}
        onUpdateTargetBox={setZoomTargetBox}
        onAddStrokeToPage={(stroke) => {
          handleUpdatePage({
            ...currentPage,
            strokes: [...currentPage.strokes, stroke],
          });
        }}
        onAddTextToPage={(text, x, y) => {
          const newTextItem: TextItem = {
            id: 'txt_zoom_' + Math.random().toString(36).substring(2, 9),
            x,
            y,
            text,
            fontSize: 20,
            color: strokeColor,
          };
          handleUpdatePage({
            ...currentPage,
            texts: [...currentPage.texts, newTextItem],
          });
        }}
        strokeColor={strokeColor}
        strokeSize={strokeSize}
        activeTool={activeTool}
      />

      {/* Pages Drawer Sidebar */}
      <PageThumbnailSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        pages={notebook.pages}
        currentPageIndex={currentPageIndex}
        onSelectPage={(idx) => {
          setCurrentPageIndex(idx);
          setUndoStack([]);
          setRedoStack([]);
        }}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onMovePage={handleMovePage}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
      />

      {/* Template & Paper Selector Modal */}
      <TemplateSelectorModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentTemplate={currentPage.template}
        currentColor={currentPage.color}
        onApply={handleApplyTemplate}
      />

      {/* Sticky Notes Selector Modal */}
      <StickyNotesModal
        isOpen={isStickyNotesModalOpen}
        onClose={() => setIsStickyNotesModalOpen(false)}
        onInsertStickyNote={handleInsertStickyNote}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        notebook={notebook}
        currentPage={currentPage}
        currentPageIndex={currentPageIndex}
      />

      {/* Audio Lecture Recorder Modal */}
      <AudioRecorder
        isOpen={isAudioRecorderOpen}
        onClose={() => setIsAudioRecorderOpen(false)}
        recordings={notebook.audioRecordings || []}
        onAddRecording={handleAddRecording}
        onDeleteRecording={handleDeleteRecording}
      />
    </div>
  );
};
