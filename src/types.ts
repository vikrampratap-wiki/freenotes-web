export type ToolType = 
  | 'ballpoint' 
  | 'fountain' 
  | 'brush' 
  | 'highlighter' 
  | 'eraser' 
  | 'lasso' 
  | 'shape' 
  | 'text' 
  | 'image' 
  | 'tape' 
  | 'ruler' 
  | 'laser' 
  | 'hand';

export type EraserType = 'stroke' | 'pixel';

export type ShapeKind = 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'auto';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface Stroke {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  shapeKind?: ShapeKind;
}

export interface TextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  width?: number;
  backgroundColor?: string;
  isStickyNote?: boolean;
}

export interface TapeItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isRevealed: boolean;
  label?: string;
}

export interface ImageItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

export interface AudioRecording {
  id: string;
  url: string;
  duration: number;
  createdAt: number;
  name: string;
}

export type PageTemplate = 
  | 'blank' 
  | 'ruled' 
  | 'ruled-narrow' 
  | 'grid' 
  | 'dotted' 
  | 'cornell' 
  | 'planner' 
  | 'todo' 
  | 'music';

export type PageColor = 'white' | 'sepia' | 'dark' | 'yellow' | 'mint' | 'pink';

export interface Page {
  id: string;
  template: PageTemplate;
  color: PageColor;
  strokes: Stroke[];
  texts: TextItem[];
  tapes: TapeItem[];
  images: ImageItem[];
  pdfBackground?: string;
  pdfDocId?: string; // Reference to binary PDF stored in IndexedDB for large files
  pdfPageNumber?: number; // 1-based page number in the referenced PDF
  width?: number; // Custom page width for high-res PDF pages
  height?: number; // Custom page height for high-res PDF pages
  isBookmarked?: boolean;
}

export interface QuickPen {
  id: string;
  type: 'ballpoint' | 'fountain' | 'brush' | 'highlighter';
  color: string;
  size: number;
}

export interface Notebook {
  id: string;
  title: string;
  coverColor: string;
  coverPattern?: 'solid' | 'stripes' | 'geometric' | 'minimal';
  createdAt: number;
  updatedAt: number;
  pages: Page[];
  tags: string[];
  audioRecordings?: AudioRecording[];
  isFavorite?: boolean;
}
