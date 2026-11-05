# FreeNotes Web 📝 (फ्रीनोट्स वेब)

A full-featured, open-source, digital handwriting note-taking application inspired by **FreeNotes** and **GoodNotes**. Designed for students, researchers, teachers, and professionals, featuring high-DPI document rendering, zero-latency vector inking, study mode tape, and handwriting-to-text OCR with Hindi & English voice dictation.

---

## ✨ Features (मुख्य विशेषताएं)

- 🖊️ **Ultra-Smooth Low-Latency Inking (शून्य-विलंबता डिजिटल स्याही)**
  - 120 FPS hardware-accelerated live canvas overlay.
  - Realistic pressure-sensitive pens: **Ballpoint Pen**, **Fountain Pen (Calligraphic)**, and **Brush Pen**.
  - **Highlighter** with real `multiply` blend mode (never hides the text underneath).
  - Scratch-to-Erase gesture: rapidly scribble back and forth over ink to instantly erase it.

- 📄 **Crystal-Sharp High-DPI PDF Import (अल्ट्रा-एचडी पीडीएफ रेंडरिंग)**
  - Lossless Retina vector PDF rendering (`scale: 2.5`).
  - Dynamic page aspect ratio matching (A4, US Letter, Landscape slides).
  - Crisp text rendering across all zoom levels without blurriness or compression artifacts.

- 🔍 **Zoom Writing Pad for Finger Writing (उंगली से आसान लेखन विंडो)**
  - 2.8x magnification writing box for touchscreens and mobile devices.
  - Auto-Advance zone: moving near the right edge automatically steps forward.
  - New Line (↵) button to smoothly return to the left margin on ruled lines.

- 🎙️ **OCR & Voice-to-Text Dictation (हस्तलिपि पहचान व बोलकर लिखें)**
  - Instant handwriting to digital computerized text using neural OCR with English and Hindi support.
  - Instant zero-latency Voice Dictation ("🎙️ बोलकर लिखें") using Web Speech API in Hindi (`hi-IN`) and English (`en-IN`/`en-US`).

- 🎙️ **Audio Lecture Recorder (कक्षा व व्याख्यान रिकॉर्डर)**
  - Record lectures and meetings directly inside the notebook.
  - Sync audio memos with your handwritten notes and review playback anytime.

- 🎯 **FreeNotes Study Tape (स्टडी टेप - परीक्षा अभ्यास)**
  - Cover exam answers and formulas with colorful tape.
  - One-tap "Reveal All" and "Hide All" quiz mode for active recall studying.

- 📐 **Acrylic 360° Virtual Ruler (वर्चुअल पैमाना)**
  - Rotatable acrylic ruler with millimeter marks and straight-line edge snapping.

- ✂️ **Lasso Selection & Manipulation (लासो टूल)**
  - True polygon lasso: select ink, move, duplicate, recolor, delete, or convert to digital text.

- 📦 **Offline & Local-First Privacy (ऑफलाइन व पूर्णतः सुरक्षित)**
  - All notebooks, pages, and recordings are stored directly in your browser's IndexedDB.
  - Export notebooks to vector PDF, PNG, or JSON backup files.

---

## 🚀 Getting Started (शुरू कैसे करें)

### Prerequisites
- Node.js >= 18.0.0
- npm or pnpm

### Installation
```bash
git clone https://github.com/your-username/freenotes-web.git
cd freenotes-web
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ Tech Stack
- **Framework**: React 18 + TypeScript + Vite 6
- **Styling**: Tailwind CSS + Lucide Icons
- **Inking**: `perfect-freehand` + HTML5 2D Canvas + SVG
- **Storage**: IndexedDB (`idb-keyval`)
- **PDF Engine**: `pdfjs-dist` + `jspdf`
- **OCR Engine**: `tesseract.js` + Web Speech API

---

## 📜 License
MIT License. Free and open source for everyone.
