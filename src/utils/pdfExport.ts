import { jsPDF } from 'jspdf';
import { Notebook, Page } from '../types';
import { renderPointsToPath } from './svgPath';

export async function exportPageToPng(page: Page, paperWidth = 794, paperHeight = 1123): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = paperWidth * 2; // High DPI
  canvas.height = paperHeight * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  ctx.scale(2, 2);

  // Background color
  const bgColor = page.color === 'dark' ? '#1e1e24' : page.color === 'sepia' ? '#fbf0d9' : page.color === 'yellow' ? '#fef3c7' : page.color === 'mint' ? '#ecfdf5' : '#ffffff';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, paperWidth, paperHeight);

  // Draw background PDF if any
  if (page.pdfBackground) {
    const img = new Image();
    img.src = page.pdfBackground;
    await new Promise((res) => {
      img.onload = res;
    });
    ctx.drawImage(img, 0, 0, paperWidth, paperHeight);
  }

  // Draw pattern lines if not blank
  if (page.template === 'ruled' || page.template === 'ruled-narrow') {
    const lineGap = page.template === 'ruled' ? 32 : 24;
    ctx.strokeStyle = page.color === 'dark' ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 1;
    for (let y = 50; y < paperHeight - 20; y += lineGap) {
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

  // Draw images
  for (const item of page.images) {
    const img = new Image();
    img.src = item.src;
    await new Promise((res) => {
      img.onload = res;
    });
    ctx.drawImage(img, item.x, item.y, item.width, item.height);
  }

  // Draw strokes
  for (const stroke of page.strokes) {
    if (stroke.type === 'shape' && stroke.shapeKind && stroke.points.length >= 2) {
      const p1 = stroke.points[0];
      const p2 = stroke.points[stroke.points.length - 1];
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      if (stroke.shapeKind === 'rectangle') {
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      } else if (stroke.shapeKind === 'circle') {
        const radius = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) / 2;
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
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

  // Draw texts
  for (const txt of page.texts) {
    ctx.fillStyle = txt.color;
    ctx.font = `${txt.fontSize}px Inter, sans-serif`;
    const lines = txt.text.split('\n');
    lines.forEach((line, idx) => {
      ctx.fillText(line, txt.x, txt.y + (idx + 1) * (txt.fontSize * 1.2));
    });
  }

  // Draw tapes
  for (const tape of page.tapes) {
    if (!tape.isRevealed) {
      ctx.fillStyle = tape.color;
      ctx.fillRect(tape.x, tape.y, tape.width, tape.height);
    }
  }

  return canvas.toDataURL('image/png');
}

export async function exportNotebookToPdf(notebook: Notebook, onProgress?: (percent: number) => void): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < notebook.pages.length; i++) {
    if (i > 0) pdf.addPage();
    const page = notebook.pages[i];
    const imgData = await exportPageToPng(page);
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    if (onProgress) {
      onProgress(Math.round(((i + 1) / notebook.pages.length) * 100));
    }
  }

  return pdf.output('blob');
}
