# ExcaliLite 🎨 — Hand-Drawn Whiteboard

A feature-rich, lightweight whiteboard application inspired by **[Excalidraw](https://excalidraw.com)**, built using **Rough.js** and HTML5 Canvas.

---

## 🚀 Quick Start

Start a local HTTP server:

```bash
cd "/Users/devrajput/DEV RAJPUT/REA/excalidraw-clone"
python3 -m http.server 3030
```

Open **[http://localhost:3030](http://localhost:3030)** in your browser.

---

## ✨ Full Suite of Tools & Features

### 1. Drawing & Vector Tools
* **Selection (`1` or `V`)**: Single selection with resize corner handles, multi-selection with Shift-click, and marquee rectangular selection box.
* **Hand Pan (`0` or `H` or Space+Drag)**: Pan the infinite canvas smoothly.
* **Geometric Shapes**:
  * **Rectangle (`2` or `R`)**: Hand-drawn boxes with customizable roughness and fills.
  * **Diamond (`3` or `D`)**: Decision/flowchart diamonds.
  * **Ellipse (`4` or `O`)**: Circles and ovals with sketch outlines.
* **Connectors & Lines**:
  * **Arrow (`5` or `A`)**: Connects shapes; dynamically finds shape boundary intersection points and updates when shapes move.
  * **Straight Line (`6` or `L`)**: Two-point straight line with hand-drawn roughness.
* **Freehand Pencil (`7` or `P`)**: Smooth natural freehand sketching.
* **Text (`8` or `T`)**: Standalone text or inside any geometric shape.
* **Eraser (`9` or `E`)**: Click any element to remove it cleanly.
* **Image Insertion**: Insert local PNG, JPG, or SVG images directly onto the canvas.

### 2. Contextual Property Styling
* **Stroke Color**: 8 curated colors + native color picker for custom hex colors.
* **Background Fill**: Transparent, soft pastel swatches + native color picker.
* **Fill Styles**: `hachure` sketch, `cross-hatch`, and `solid`.
* **Stroke Width**: Thin (1.5px), Medium (2.8px), Thick (4.5px).
* **Stroke Style**: Solid, Dashed, Dotted.
* **Sloppiness**: Neat (0), Artist (1.2), Sketch (2.4).
* **Opacity Slider**: 10% to 100% alpha transparency.
* **Text Styling**: Font sizes (S, M, L, XL) and alignments (Left, Center, Right).

### 3. Layer Ordering & Selection Actions
* **Bring Forward (`]`)** & **Send Backward (`[`)**
* **Duplicate (`Ctrl+D`)**
* **Delete (`Del` or `Backspace`)**
* **Copy / Cut / Paste (`Ctrl+C` / `Ctrl+X` / `Ctrl+V`)**

### 4. Document Management & Exports
* **Save as JSON (`Ctrl+S`)**: Exports complete document state (.json / .excalilite).
* **Open Document**: Upload and restore saved drawings.
* **Export to PNG Image**: Retina 2x high-resolution offscreen raster export with automatic content bounding box crop.
* **Export to SVG Vector**: Scalable vector graphics export using Rough.js SVG generator.
* **Reset Canvas**: Clear canvas to start fresh.
* **Local Persistence**: Automatically saves changes to browser storage so your diagram survives page refreshes.

### 5. Canvas Navigation & Themes
* **Zoom**: Zoom In (`Ctrl++`), Zoom Out (`Ctrl+-`), Reset to 100% (`Ctrl+0`), and Fit to Content (`Shift+1`).
* **Trackpad / Mouse Wheel**: Pan with mouse wheel / trackpad swipe, zoom with Ctrl+wheel.
* **Theme Toggle**: Light mode and Dark mode.
* **Keyboard Shortcuts Modal (`?`)**: Full interactive cheat sheet of hotkeys.

---

## ⌨️ Keyboard Shortcuts Reference

| Action | Shortcut |
| :--- | :--- |
| **Hand (Pan)** | `H` or `0` or `Space + Drag` |
| **Selection** | `V` or `1` |
| **Rectangle** | `R` or `2` |
| **Diamond** | `D` or `3` |
| **Ellipse** | `O` or `4` |
| **Arrow Connector** | `A` or `5` |
| **Line** | `L` or `6` |
| **Pencil (Freedraw)** | `P` or `7` |
| **Text** | `T` or `8` |
| **Eraser** | `E` or `9` |
| **Undo / Redo** | `Ctrl+Z` / `Ctrl+Y` (or `Ctrl+Shift+Z`) |
| **Duplicate** | `Ctrl+D` |
| **Delete** | `Backspace` or `Delete` |
| **Select All** | `Ctrl+A` |
| **Bring Forward / Backward** | `]` / `[` |
| **Save Drawing** | `Ctrl+S` |
| **Shortcuts Help** | `?` |

---

## 🛠 Tech Stack

* **Rendering Engine**: HTML5 Canvas 2D + **[Rough.js](https://roughjs.com/)**
* **Fonts**: `Architects Daughter` (Hand-drawn look) & `Inter`
* **Zero Dependencies**: Lightweight, fast, runs directly in modern browsers without compilation steps.
