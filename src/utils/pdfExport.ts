import { Notebook, Page } from '../types';
import { renderPointsToPath } from './svgPath';
import { getPdfDocument } from './pdfEngine';

export async function exportPageToPng(page: Page): Promise<string> {
  const paperWidth = page.width || 794;
  const paperHeight = page.height || 1123;
  const exportScale = 2.5; // High-DPI export quality

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(paperWidth * exportScale);
  canvas.height = Math.round(paperHeight * exportScale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(exportScale, exportScale);

  // Background color
  const bgColor =
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
      : '#ffffff';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, paperWidth, paperHeight);

  // 1. Draw vector PDF page if backed by pdfDocId
  if (page.pdfDocId && page.pdfPageNumber) {
    try {
      const pdfDoc = await getPdfDocument(page.pdfDocId);
      if (pdfDoc) {
        const pdfPage = await pdfDoc.getPage(page.pdfPageNumber);
        const unscaledVp = pdfPage.getViewport({ scale: 1.0 });
        const pdfScale = (paperWidth / Math.max(1, unscaledVp.width)) * exportScale;
        const viewport = pdfPage.getViewport({ scale: pdfScale });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.round(viewport.width);
        tempCanvas.height = Math.round(viewport.height);
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          await pdfPage.render({ canvasContext: tempCtx, viewport }).promise;
          ctx.drawImage(tempCanvas, 0, 0, paperWidth, paperHeight);
        }
      }
    } catch (err) {
      console.error('Error rendering PDF page during export:', err);
    }
  } else if (page.pdfBackground) {
    // Fallback for legacy base64 PDF background
    const img = new Image();
    img.src = page.pdfBackground;
    await new Promise((res) => {
      img.onload = res;
      img.onerror = res;
    });
    ctx.drawImage(img, 0, 0, paperWidth, paperHeight);
  }

  // 2. Draw pattern lines if not blank and no PDF background
  if (!page.pdfDocId && !page.pdfBackground) {
    if (page.template === 'ruled' || page.template === 'ruled-narrow') {
      const lineGap = page.template === 'ruled' ? 32 : 24;
      ctx.strokeStyle = page.color === 'dark' ? '#334155' : '#e2e8f0';
      ctx.lineWidth = 1;
      for (let y = 40; y < paperHeight - 20; y += lineGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(paperWidth, y);
        ctx.stroke();
      }
    } else if (page.template === 'grid') {
      ctx.strokeStyle = page.color === 'dark' ? '#334155' : '#e2e8f0';
      ctx.lineWidth = 1;
      for (let x = 0; x < paperWidth; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, paperHeight);
        ctx.stroke();
      }
      for (let y = 0; y < paperHeight; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(paperWidth, y);
        ctx.stroke();
      }
    }
  }

  // 3. Draw inserted images
  for (const item of page.images) {
    const img = new Image();
    img.src = item.src;
    await new Promise((res) => {
      img.onload = res;
      img.onerror = res;
    });
    ctx.drawImage(img, item.x, item.y, item.width, item.height);
  }

  // 4. Draw strokes & shapes
  for (const stroke of page.strokes) {
    if (stroke.shapeKind && stroke.points.length >= 2) {
      const p1 = stroke.points[0];
      const p2 = stroke.points[stroke.points.length - 1];
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (stroke.shapeKind === 'rectangle') {
        ctx.strokeRect(
          Math.min(p1.x, p2.x),
          Math.min(p1.y, p2.y),
          Math.abs(p2.x - p1.x),
          Math.abs(p2.y - p1.y)
        );
      } else if (stroke.shapeKind === 'circle') {
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (stroke.shapeKind === 'triangle') {
        ctx.moveTo((p1.x + p2.x) / 2, p1.y);
        ctx.lineTo(p1.x, p2.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.stroke();
      } else if (stroke.shapeKind === 'arrow') {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 14 * Math.cos(angle - Math.PI / 6), p2.y - 14 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - 14 * Math.cos(angle + Math.PI / 6), p2.y - 14 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      continue;
    }

    const svgPathStr = renderPointsToPath(stroke);
    if (!svgPathStr) continue;

    const path = new Path2D(svgPathStr);
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity;
    if (stroke.type === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fill(path);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  // 5. Draw texts & sticky notes
  for (const txt of page.texts) {
    if (txt.isStickyNote && txt.backgroundColor) {
      ctx.fillStyle = txt.backgroundColor;
      const w = txt.width || 220;
      const lines = txt.text.split('\n');
      const h = Math.max(90, lines.length * (txt.fontSize * 1.35) + 24);
      ctx.fillRect(txt.x, txt.y, w, h);
    }
    ctx.fillStyle = txt.color;
    ctx.font = `${txt.fontSize}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Devanagari', sans-serif`;
    const lines = txt.text.split('\n');
    lines.forEach((line, idx) => {
      ctx.fillText(line, txt.x + (txt.isStickyNote ? 12 : 0), txt.y + (idx + 1) * (txt.fontSize * 1.25));
    });
  }

  // 6. Draw unrevealed study tapes
  for (const tape of page.tapes) {
    if (!tape.isRevealed) {
      ctx.fillStyle = tape.color;
      ctx.fillRect(tape.x, tape.y, tape.width, tape.height);
    }
  }

  return canvas.toDataURL('image/png');
}

export async function exportNotebookToPdf(
  notebook: Notebook,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const firstPage = notebook.pages[0];
  const firstW = firstPage?.width || 794;
  const firstH = firstPage?.height || 1123;
  const firstOrientation = firstW > firstH ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation: firstOrientation,
    unit: 'pt',
    format: [firstW * 0.75, firstH * 0.75],
  });

  for (let i = 0; i < notebook.pages.length; i++) {
    const page = notebook.pages[i];
    const pw = (page.width || 794) * 0.75;
    const ph = (page.height || 1123) * 0.75;
    const orient = pw > ph ? 'landscape' : 'portrait';

    if (i > 0) {
      pdf.addPage([pw, ph], orient);
    }
    const imgData = await exportPageToPng(page);
    pdf.addImage(imgData, 'PNG', 0, 0, pw, ph);
    if (onProgress) {
      onProgress(Math.round(((i + 1) / notebook.pages.length) * 100));
    }
  }

  return pdf.output('blob');
}
