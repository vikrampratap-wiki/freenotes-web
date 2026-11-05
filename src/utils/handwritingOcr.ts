import { createWorker } from 'tesseract.js';
import { Stroke, Point } from '../types';
import { renderPointsToPath } from './svgPath';
import { getBoundingBox } from './shapeDetection';

let workerPromise: Promise<any> | null = null;
let currentLanguage = 'eng';

export async function getOcrWorker(lang: 'eng' | 'hin' = 'eng', onProgress?: (percent: number) => void) {
  if (!workerPromise || currentLanguage !== lang) {
    currentLanguage = lang;
    workerPromise = (async () => {
      const worker = await createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress && typeof m.progress === 'number') {
            onProgress(Math.round(m.progress * 100));
          }
        },
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Fast handwriting OCR with stroke thickening and timeout protection.
 */
export async function recognizeStrokesToText(
  strokes: Stroke[],
  padding = 24,
  lang: 'eng' | 'hin' = 'eng',
  onProgress?: (percent: number) => void
): Promise<string> {
  if (strokes.length === 0) return '';

  const allPoints: Point[] = [];
  strokes.forEach((s) => allPoints.push(...s.points));
  if (allPoints.length === 0) return '';

  const bbox = getBoundingBox(allPoints);
  const width = Math.max(120, Math.ceil(bbox.width + padding * 2));
  const height = Math.max(80, Math.ceil(bbox.height + padding * 2));

  // Render strokes to offscreen canvas
  const canvas = document.createElement('canvas');
  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(dpr, dpr);
  // Pure white background for maximum contrast
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.translate(padding - bbox.minX, padding - bbox.minY);

  // Render strokes with bold black ink so OCR model recognizes handwriting easily
  for (const stroke of strokes) {
    // If stroke size is thin, boost it so characters aren't hairline
    const thickenedStroke: Stroke = {
      ...stroke,
      size: Math.max(5, stroke.size),
    };
    const pathStr = renderPointsToPath(thickenedStroke);
    if (!pathStr) continue;

    const path = new Path2D(pathStr);
    ctx.fillStyle = '#000000';
    ctx.fill(path);
  }

  // Recognition with 8s safety timeout to prevent hanging
  const ocrPromise = (async () => {
    const worker = await getOcrWorker(lang, onProgress);
    const ret = await worker.recognize(canvas);
    return ret.data.text.trim();
  })();

  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('OCR Timeout: network or recognition took too long')), 8500)
  );

  try {
    const text = await Promise.race([ocrPromise, timeoutPromise]);
    return text;
  } catch (err) {
    console.warn('OCR error or timeout:', err);
    return '';
  }
}

/**
 * Instant Web Speech Voice Dictation (Hindi & English).
 * Provides zero-latency speech-to-text without network model download!
 */
export function startVoiceDictation(
  lang: 'hi-IN' | 'en-US' | 'en-IN',
  onResult: (transcript: string) => void,
  onError?: (err: any) => void
): { stop: () => void } {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError(new Error('Speech recognition not supported in this browser.'));
    return { stop: () => {} };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0]?.[0]?.transcript || '';
    if (transcript) {
      onResult(transcript);
    }
  };

  recognition.onerror = (e: any) => {
    if (onError) onError(e);
  };

  try {
    recognition.start();
  } catch (e) {
    console.error('Speech recognition failed to start:', e);
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch (_) {}
    },
  };
}
