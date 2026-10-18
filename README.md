# ExcaliLite 🎨 — Hand-Drawn Whiteboard & Diagram Workspace

A complete, feature-rich web application inspired by **[Excalidraw](https://excalidraw.com)**, built using **Rough.js** and HTML5 Canvas with native client-side document management and zero external backend overhead.

![ExcaliLite](https://raw.githubusercontent.com/iamDevRajput/excalilite/main/preview.png) *(or run locally)*

---

## ✨ Features Overview

### 1. Workspace Dashboard & Document Manager
* **Multi-Diagram Management**: Create, rename, duplicate, and delete multiple diagrams.
* **Instant Search & Filter**: Search across all your local diagrams in real-time.
* **Persistent Storage**: All diagrams, camera zoom/pan states, titles, and timestamps are saved privately in your browser's local storage.
* **Document Renaming**: Click the diagram title in the top navigation bar to rename your diagram anytime.

### 2. Complete Hand-Drawn Drawing Suite
* **Hand / Pan (`0` or `H` or Space+Drag)**: Pan the infinite canvas smoothly.
* **Selection (`1` or `V`)**: Single selection with corner resize handles, multi-selection (`Shift+Click`), and rectangular marquee box.
* **Geometric Shapes**:
  * **Rectangle (`2` or `R`)**: Hand-drawn boxes with customizable roughness and fills.
  * **Diamond (`3` or `D`)**: Decision/flowchart diamonds with centered inside text.
  * **Ellipse (`4` or `O`)**: Circles and ovals with sketchy hand-drawn borders.
* **Smart Connectors & Lines**:
  * **Arrow (`5` or `A`)**: Links shapes; dynamically finds shape boundary intersection points and updates when shapes move.
  * **Straight Line (`6` or `L`)**: Two-point straight line with hand-drawn roughness.
* **Freehand Pencil (`7` or `P`)**: Smooth natural freehand sketching.
* **Text (`8` or `T`)**: Standalone text or centered inside any geometric shape.
* **Eraser (`9` or `E`)**: Click any element to remove it cleanly along with dependent connector lines.
* **Image Insertion**: Insert local PNG, JPG, or SVG images directly onto the canvas.

### 3. Contextual Properties & Styling
* **Stroke Outline**: 8 curated colors + native color picker for custom hex colors.
* **Background Fill**: Transparent, 7 pastel shades + custom color picker.
* **Fill Styles**: `hachure` sketch, `cross-hatch`, and `solid`.
* **Stroke Width**: Thin (`1.5px`), Medium (`2.8px`), Thick (`4.5px`).
* **Stroke Style**: Solid, Dashed, Dotted.
* **Sloppiness**: Neat (`0`), Artist (`1.2`), Sketch (`2.4`).
* **Opacity Slider**: Smooth transparency adjustments from 10% to 100%.
* **Text Styling**: Font sizes (`S`, `M`, `L`, `XL`) and alignments (`Left`, `Center`, `Right`).

### 4. Layer Ordering & Clipboard
* **Bring Forward (`]`)** & **Send Backward (`[`)**
* **Duplicate (`Ctrl+D`)**
* **Delete (`Del` or `Backspace`)**
* **Copy / Cut / Paste (`Ctrl+C` / `Ctrl+X` / `Ctrl+V`)**
* **Select All (`Ctrl+A`)**

### 5. Document Operations & Exports
* **Save as JSON (`Ctrl+S`)**: Exports complete document state (.json / .excalilite).
* **Open Document**: Upload and restore saved drawings.
* **Export to PNG Image**: Retina 2x high-resolution offscreen raster export with automatic content bounding box crop.
* **Export to SVG Vector**: Scalable vector graphics export using Rough.js SVG generator.
* **Reset Canvas**: Clear canvas to start fresh.

### 6. Canvas Navigation & Themes
* **Zoom**: Zoom In (`Ctrl++`), Zoom Out (`Ctrl+-`), Reset to 100% (`Ctrl+0`), and Fit to Content (`Shift+1`).
* **Mouse Wheel / Trackpad**: Natural two-finger scroll panning and `Ctrl+Wheel` zooming.
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

## 🚀 Running Locally

No heavy build steps or npm installations needed! It runs in standard browsers:

```bash
# Clone the repository
git clone https://github.com/iamDevRajput/excalilite.git

cd excalilite

# Start a simple HTTP server
python3 -m http.server 3030
```

Open [http://localhost:3030](http://localhost:3030) in your web browser.

---

## 🌐 Deployment

ExcaliLite is pre-configured for instant zero-config deployments to static hosting platforms:

### Deploy to Vercel
```bash
vercel
```
*(Pre-configured with `vercel.json` routing and security headers)*

### Deploy to Netlify
```bash
netlify deploy --prod --dir=.
```
*(Pre-configured with `netlify.toml` security headers)*

### Deploy to GitHub Pages
Simply enable GitHub Pages in your repository settings pointing to the `main` branch.

---

## 🛠 Tech Stack

* **Rendering Engine**: HTML5 Canvas 2D + **[Rough.js](https://roughjs.com/)**
* **Fonts**: `Architects Daughter` (Hand-drawn look) & `Inter`
* **Zero Dependencies**: Lightweight, fast, runs directly in modern browsers without compilation steps.
