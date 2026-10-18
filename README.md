# ExcaliLite 🎨

A lightweight, hand-drawn whiteboard application inspired by **[Excalidraw](https://excalidraw.com)**, built using **Rough.js** and HTML5 Canvas.

![ExcaliLite](https://raw.githubusercontent.com/iamDevRajput/excalilite/main/preview.png) *(or run locally)*

---

## ✨ Features

- **Boxes & Shapes**: Create hand-drawn boxes with customizable roughness, sloppy sketches, or neat geometric shapes.
- **Dynamic Connectors**: Connect boxes with arrows that automatically compute boundary edge intersections and stay connected when moving elements.
- **Inside Text Editor**: Double-click any box to write multi-line text inside; automatically centers and adjusts.
- **Customizable Outline**:
  - Color palette (Black, Red, Green, Blue, Orange, Purple)
  - Stroke width (Thin, Medium, Thick)
  - Stroke styles (Solid, Dashed, Dotted)
  - Sloppiness / Roughness (Neat, Hand-drawn, Sketch)
- **Inside Background Fill**:
  - Transparent or pastel fills (Pink, Green, Blue, Yellow, Purple)
  - Fill styles (`hachure` sketch, `cross-hatch`, `solid`)
- **Save & Open**:
  - **Save**: Download your diagrams as `.json` files.
  - **Open**: Re-open and edit any previously saved diagram.
- **Clean Keyboard Shortcuts**:
  - `1` / `V` : Select & Move tool
  - `2` / `R` : Rectangle tool
  - `3` / `A` : Connector Arrow tool
  - `4` / `T` : Text tool
  - `Delete` / `Backspace` : Delete selected element

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

Now open [http://localhost:3030](http://localhost:3030) in your web browser.

---

## 🛠 Tech Stack

- **HTML5 Canvas & JavaScript**
- **[Rough.js](https://roughjs.com/)** for the sketchy, hand-drawn vector rendering
- **Google Fonts** (`Architects Daughter` & `Inter`)
