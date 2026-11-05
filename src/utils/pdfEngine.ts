import * as pdfjsLib from 'pdfjs-dist';
import { Page, PageColor, PageTemplate } from '../types';
import { dbGet, dbSet, dbDel, generateId } from './storage';

const PDF_BLOB_PREFIX = 'freenotes_pdf_blob_';

// Configure PDF.js worker with CDN fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (_) {}

// In-memory cache of loaded PDFDocumentProxy objects for instant page switching and zooming
const pdfDocCache = new Map<string, pdfjsLib.PDFDocumentProxy>();
const pdfBytesCache = new Map<string, Uint8Array>();

export async function savePdfBinary(pdfDocId: string, bytes: Uint8Array): Promise<void> {
  pdfBytesCache.set(pdfDocId, bytes);
  try {
    await dbSet(PDF_BLOB_PREFIX + pdfDocId, bytes);
  } catch (err) {
    console.error('Failed to persist PDF binary in IndexedDB:', err);
  }
}

export async function deletePdfBinary(pdfDocId: string): Promise<void> {
  pdfDocCache.delete(pdfDocId);
  pdfBytesCache.delete(pdfDocId);
  try {
    await dbDel(PDF_BLOB_PREFIX + pdfDocId);
  } catch (_) {}
}

export async function getPdfDocument(pdfDocId: string): Promise<pdfjsLib.PDFDocumentProxy | null> {
  if (pdfDocCache.has(pdfDocId)) {
    return pdfDocCache.get(pdfDocId)!;
  }

  let rawBytes: Uint8Array | undefined = pdfBytesCache.get(pdfDocId);
  if (!rawBytes) {
    try {
      const stored = await dbGet<Uint8Array | ArrayBuffer>(PDF_BLOB_PREFIX + pdfDocId);
      if (stored) {
        rawBytes = stored instanceof Uint8Array ? stored : new Uint8Array(stored);
        pdfBytesCache.set(pdfDocId, rawBytes);
      }
    } catch (err) {
      console.error('Error reading PDF binary from IndexedDB:', err);
    }
  }

  if (!rawBytes) return null;

  // Pass a fresh slice to getDocument because PDF.js transfers the underlying ArrayBuffer to the worker
  const dataCopy = rawBytes.slice(0);
  const loadingTask = pdfjsLib.getDocument({
    data: dataCopy,
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`,
  });

  const pdfDoc = await loadingTask.promise;
  pdfDocCache.set(pdfDocId, pdfDoc);
  return pdfDoc;
}

/**
 * Fast, memory-efficient import for PDF files of any size (1 page to 1000+ pages).
 * Stores the raw PDF binary once in IndexedDB and creates lightweight Page descriptors for on-demand Ultra-HD vector rendering.
 */
export async function importPdfFileToPages(
  file: File,
  onProgress?: (msg: string) => void
): Promise<{ pdfDocId: string; pages: Page[] }> {
  onProgress?.('PDF फ़ाइल पढ़ी जा रही है (Reading file)...');
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const pdfDocId = generateId('pdfdoc');

  onProgress?.('PDF सुरक्षित स्टोरेज में सेव हो रही है...');
  await savePdfBinary(pdfDocId, bytes);

  const pdfDoc = await getPdfDocument(pdfDocId);
  if (!pdfDoc) {
    throw new Error('Could not parse PDF document.');
  }

  const numPages = pdfDoc.numPages;
  const pages: Page[] = [];

  // Read first page dimensions as default logical size
  const firstPage = await pdfDoc.getPage(1);
  const defaultVp = firstPage.getViewport({ scale: 1.0 });
  const defaultWidth = Math.round(defaultVp.width * 1.3333);
  const defaultHeight = Math.round(defaultVp.height * 1.3333);

  const inspectEachPage = numPages <= 60;

  for (let i = 1; i <= numPages; i++) {
    let logicalWidth = defaultWidth;
    let logicalHeight = defaultHeight;

    if (inspectEachPage) {
      if (i % 5 === 0 || i === numPages) {
        onProgress?.(`पेज तैयार हो रहे हैं (${i} / ${numPages})...`);
      }
      try {
        const p = await pdfDoc.getPage(i);
        const vp = p.getViewport({ scale: 1.0 });
        logicalWidth = Math.round(vp.width * 1.3333);
        logicalHeight = Math.round(vp.height * 1.3333);
      } catch (_) {}
    } else if (i % 25 === 0 || i === numPages) {
      onProgress?.(`बड़ी PDF तैयार हो रही है (${i} / ${numPages} पेज)...`);
    }

    pages.push({
      id: `page_pdf_${pdfDocId}_${i}`,
      template: 'blank' as PageTemplate,
      color: 'white' as PageColor,
      strokes: [],
      texts: [],
      tapes: [],
      images: [],
      pdfDocId,
      pdfPageNumber: i,
      width: logicalWidth,
      height: logicalHeight,
    });
  }

  return { pdfDocId, pages };
}

/**
 * Renders a single PDF page onto a target <canvas> at Ultra-HD vector resolution
 * matching the current zoom level and screen devicePixelRatio.
 */
export async function renderPdfPageToCanvas(
  pdfDocId: string,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
  zoom = 1.0
): Promise<{ cancel: () => void }> {
  let cancelled = false;
  let renderTask: pdfjsLib.RenderTask | null = null;

  const run = async () => {
    const pdfDoc = await getPdfDocument(pdfDocId);
    if (!pdfDoc || cancelled) return;

    const page = await pdfDoc.getPage(pageNumber);
    if (cancelled) return;

    const unscaledVp = page.getViewport({ scale: 1.0 });
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const desiredPixelRatio = Math.min(4.5, Math.max(2.6, dpr * Math.max(1.2, zoom) * 1.4));
    const baseScale = logicalWidth / Math.max(1, unscaledVp.width);
    const totalScale = baseScale * desiredPixelRatio;

    const viewport = page.getViewport({ scale: totalScale });

    if (cancelled) return;
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    renderTask = page.render({
      canvasContext: ctx,
      viewport,
    });

    try {
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('PDF page render error:', err);
      }
    }
  };

  run();

  return {
    cancel: () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (_) {}
      }
    },
  };
}
