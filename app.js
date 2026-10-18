// ExcaliLite — Full-Featured Hand-Drawn Whiteboard Application
// Reverse-engineered architecture inspired by Excalidraw (Rough.js + Canvas2D + Vector Math)

(function () {
  'use strict';

  // --- Canvas & Rendering Context ---
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const rc = rough.canvas(canvas);

  // --- DOM Elements ---
  const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
  const mainToolbar = document.getElementById('mainToolbar');
  const imageToolBtn = document.getElementById('imageToolBtn');
  const imageInput = document.getElementById('imageInput');

  // History & Actions
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeMoonIcon = document.getElementById('themeMoonIcon');
  const themeSunIcon = document.getElementById('themeSunIcon');
  const helpBtn = document.getElementById('helpBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  // Dropdown Export Menu
  const exportMenuBtn = document.getElementById('exportMenuBtn');
  const exportDropdown = document.getElementById('exportDropdown');
  const saveJsonItem = document.getElementById('saveJsonItem');
  const exportPngItem = document.getElementById('exportPngItem');
  const exportSvgItem = document.getElementById('exportSvgItem');
  const openJsonItem = document.getElementById('openJsonItem');
  const newDocItem = document.getElementById('newDocItem');
  const docFileInput = document.getElementById('docFileInput');
  const saveIndicator = document.getElementById('saveIndicator');

  // Zoom controls
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const fitContentBtn = document.getElementById('fitContentBtn');

  // Contextual Properties Panel
  const propertyPanel = document.getElementById('propertyPanel');
  const strokeSwatches = document.querySelectorAll('#strokePalette .color-swatch');
  const customStrokeInput = document.getElementById('customStrokeInput');
  const bgSwatches = document.querySelectorAll('#bgPalette .color-swatch');
  const customBgInput = document.getElementById('customBgInput');
  const fillStyleSegments = document.querySelectorAll('#fillStyleControl .segment');
  const strokeWidthSegments = document.querySelectorAll('#strokeWidthControl .segment');
  const strokeStyleSegments = document.querySelectorAll('#strokeStyleControl .segment');
  const roughnessSegments = document.querySelectorAll('#roughnessControl .segment');
  const opacitySlider = document.getElementById('opacitySlider');
  const opacityVal = document.getElementById('opacityVal');
  const fontSizeSegments = document.querySelectorAll('#fontSizeControl .segment');
  const textAlignSegments = document.querySelectorAll('#textAlignControl .segment');

  // Selection actions
  const bringForwardBtn = document.getElementById('bringForwardBtn');
  const sendBackwardBtn = document.getElementById('sendBackwardBtn');
  const duplicateBtn = document.getElementById('duplicateBtn');
  const deleteSelectionBtn = document.getElementById('deleteSelectionBtn');

  // Inline text editor
  const inlineTextInput = document.getElementById('inlineTextInput');

  // --- Application State ---
  let activeTool = 'select'; // 'hand' | 'select' | 'rectangle' | 'diamond' | 'ellipse' | 'arrow' | 'line' | 'freedraw' | 'text' | 'eraser'
  let elements = [];
  let selectedElementIds = new Set();
  let clipboard = [];

  // Viewport / Camera Pan & Zoom
  let camera = {
    x: 0,
    y: 0,
    zoom: 1.0
  };

  // History Stacks (Undo / Redo)
  let historyStack = [];
  let redoStack = [];
  const MAX_HISTORY = 40;

  // Active default styling
  const currentStyle = {
    stroke: '#1e1e1e',
    fill: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1.5,
    strokeStyle: 'solid',
    roughness: 1.2,
    opacity: 100,
    fontSize: 22,
    textAlign: 'center'
  };

  // Interaction tracking
  let isPointerDown = false;
  let isPanning = false;
  let isDraggingElements = false;
  let isSelectingBox = false;
  let isDrawingShape = false;
  let isResizing = false;
  let activeResizeHandle = null;

  let pointerStartScreen = { x: 0, y: 0 };
  let pointerStartScene = { x: 0, y: 0 };
  let currentTempElement = null;
  let selectionBox = null; // { x, y, width, height }
  let connectorStartBox = null;
  let activeTextEditingElement = null;

  // Track initial positions for drag & resize operations
  let dragElementInitialPositions = new Map();

  // Helper ID generator
  function generateId() {
    return 'el_' + Math.random().toString(36).substr(2, 9);
  }

  // --- Coordinates Transformation (Screen <-> Scene) ---
  function screenToScene(sx, sy) {
    return {
      x: (sx - camera.x) / camera.zoom,
      y: (sy - camera.y) / camera.zoom
    };
  }

  function sceneToScreen(cx, cy) {
    return {
      x: cx * camera.zoom + camera.x,
      y: cy * camera.zoom + camera.y
    };
  }

  // --- Resize Canvas ---
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    render();
  }
  window.addEventListener('resize', resizeCanvas);

  // --- History Management (Undo / Redo) ---
  function pushHistory() {
    const snapshot = JSON.stringify(elements);
    // Don't push duplicate states
    if (historyStack.length > 0 && historyStack[historyStack.length - 1] === snapshot) {
      return;
    }
    historyStack.push(snapshot);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    redoStack = []; // Clear redo
    updateHistoryButtons();
    markUnsaved();
  }

  function undo() {
    if (historyStack.length <= 1) return;
    const current = historyStack.pop();
    redoStack.push(current);
    const previous = historyStack[historyStack.length - 1];
    elements = JSON.parse(previous);
    selectedElementIds.clear();
    updateHistoryButtons();
    render();
    markUnsaved();
  }

  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack.pop();
    historyStack.push(next);
    elements = JSON.parse(next);
    selectedElementIds.clear();
    updateHistoryButtons();
    render();
    markUnsaved();
  }

  function updateHistoryButtons() {
    undoBtn.disabled = historyStack.length <= 1;
    redoBtn.disabled = redoStack.length === 0;
  }

  function markUnsaved() {
    saveIndicator.textContent = 'Unsaved changes';
    saveIndicator.classList.add('unsaved');
    saveToLocalStorage();
  }

  function markSaved() {
    saveIndicator.textContent = 'Saved';
    saveIndicator.classList.remove('unsaved');
  }

  function saveToLocalStorage() {
    try {
      const data = {
        elements,
        camera,
        theme: document.body.classList.contains('theme-dark') ? 'dark' : 'light'
      };
      localStorage.setItem('excalilite_doc', JSON.stringify(data));
    } catch (e) {
      // LocalStorage might be quota limited with images
    }
  }

  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('excalilite_doc');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.elements && Array.isArray(parsed.elements)) {
          elements = parsed.elements;
          if (parsed.camera) camera = parsed.camera;
          if (parsed.theme === 'dark') setTheme('dark');
          updateZoomDisplay();
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  // --- Element Creators ---
  function createBaseElement(type, x, y) {
    return {
      id: generateId(),
      type,
      x,
      y,
      width: 0,
      height: 0,
      stroke: currentStyle.stroke,
      fill: currentStyle.fill,
      fillStyle: currentStyle.fillStyle,
      strokeWidth: currentStyle.strokeWidth,
      strokeStyle: currentStyle.strokeStyle,
      roughness: currentStyle.roughness,
      opacity: currentStyle.opacity,
      seed: Math.floor(Math.random() * 100000)
    };
  }

  function createShapeElement(type, x, y) {
    const el = createBaseElement(type, x, y);
    el.text = '';
    el.fontSize = currentStyle.fontSize;
    el.textAlign = currentStyle.textAlign;
    return el;
  }

  function createConnectorElement(type, fromBox, startPt) {
    const el = createBaseElement(type, startPt.x, startPt.y);
    el.startBoxId = fromBox ? fromBox.id : null;
    el.endBoxId = null;
    el.startX = startPt.x;
    el.startY = startPt.y;
    el.endX = startPt.x;
    el.endY = startPt.y;
    return el;
  }

  function createFreedrawElement(x, y) {
    const el = createBaseElement('freedraw', x, y);
    el.points = [{ x, y }];
    return el;
  }

  function createTextElement(x, y) {
    const el = createShapeElement('text', x, y);
    el.width = 120;
    el.height = 40;
    return el;
  }

  // --- Vector & Geometry Helpers ---
  function getBoxCenter(box) {
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  }

  function getBoxEdgePoint(box, targetX, targetY) {
    const center = getBoxCenter(box);
    const dx = targetX - center.x;
    const dy = targetY - center.y;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return center;

    const halfW = Math.max(box.width / 2, 5);
    const halfH = Math.max(box.height / 2, 5);

    const scaleX = halfW / Math.abs(dx);
    const scaleY = halfH / Math.abs(dy);
    const scale = Math.min(scaleX, scaleY);

    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale
    };
  }

  function getStrokeDash(style, width) {
    if (style === 'dashed') return [8 + width, 6 + width];
    if (style === 'dotted') return [2 + width, 4 + width];
    return undefined;
  }

  // Distance from point to line segment
  function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // --- Hit Testing ---
  function hitTestElement(el, sceneX, sceneY) {
    // Basic Bounding Box test for shapes
    if (['rectangle', 'diamond', 'ellipse', 'text', 'image'].includes(el.type)) {
      const minX = Math.min(el.x, el.x + el.width);
      const maxX = Math.max(el.x, el.x + el.width);
      const minY = Math.min(el.y, el.y + el.height);
      const maxY = Math.max(el.y, el.y + el.height);
      const padding = 6;
      return sceneX >= minX - padding && sceneX <= maxX + padding &&
             sceneY >= minY - padding && sceneY <= maxY + padding;
    }

    if (el.type === 'line' || el.type === 'arrow') {
      const pts = getConnectorPoints(el);
      return distToSegment(sceneX, sceneY, pts.x1, pts.y1, pts.x2, pts.y2) < 8;
    }

    if (el.type === 'freedraw') {
      if (!el.points || el.points.length === 0) return false;
      for (let i = 0; i < el.points.length - 1; i++) {
        const d = distToSegment(sceneX, sceneY, el.points[i].x, el.points[i].y, el.points[i+1].x, el.points[i+1].y);
        if (d < 8) return true;
      }
      return false;
    }

    return false;
  }

  function getConnectorPoints(conn) {
    let x1 = conn.startX, y1 = conn.startY;
    let x2 = conn.endX, y2 = conn.endY;

    const fromBox = elements.find(e => e.id === conn.startBoxId);
    const toBox = elements.find(e => e.id === conn.endBoxId);

    if (fromBox && toBox) {
      const p1 = getBoxEdgePoint(fromBox, getBoxCenter(toBox).x, getBoxCenter(toBox).y);
      const p2 = getBoxEdgePoint(toBox, getBoxCenter(fromBox).x, getBoxCenter(fromBox).y);
      x1 = p1.x; y1 = p1.y; x2 = p2.x; y2 = p2.y;
    } else if (fromBox) {
      const p1 = getBoxEdgePoint(fromBox, x2, y2);
      x1 = p1.x; y1 = p1.y;
    } else if (toBox) {
      const p2 = getBoxEdgePoint(toBox, x1, y1);
      x2 = p2.x; y2 = p2.y;
    }

    return { x1, y1, x2, y2 };
  }

  function getElementAtPosition(sceneX, sceneY) {
    // Top-to-bottom search (elements rendered later are on top)
    for (let i = elements.length - 1; i >= 0; i--) {
      if (hitTestElement(elements[i], sceneX, sceneY)) {
        return elements[i];
      }
    }
    return null;
  }

  // --- Resize Handles Detection ---
  // Returns 'nw', 'ne', 'se', 'sw' or null
  function getResizeHandleAt(sceneX, sceneY) {
    if (selectedElementIds.size !== 1) return null;
    const el = elements.find(e => selectedElementIds.has(e.id));
    if (!el || !['rectangle', 'diamond', 'ellipse', 'image'].includes(el.type)) return null;

    const minX = Math.min(el.x, el.x + el.width);
    const maxX = Math.max(el.x, el.x + el.width);
    const minY = Math.min(el.y, el.y + el.height);
    const maxY = Math.max(el.y, el.y + el.height);

    const handleRadius = 8 / camera.zoom;

    const handles = [
      { name: 'nw', x: minX, y: minY },
      { name: 'ne', x: maxX, y: minY },
      { name: 'se', x: maxX, y: maxY },
      { name: 'sw', x: minX, y: maxY }
    ];

    for (const h of handles) {
      if (Math.hypot(sceneX - h.x, sceneY - h.y) <= handleRadius) {
        return h.name;
      }
    }
    return null;
  }

  // --- Rendering Pipeline ---
  function render() {
    ctx.save();
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Transform
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // 1. Draw Connectors / Lines first
    elements.filter(el => el.type === 'line' || el.type === 'arrow').forEach(el => drawElement(el));

    // 2. Draw Shapes, Images, Freedraw, Text
    elements.filter(el => el.type !== 'line' && el.type !== 'arrow').forEach(el => drawElement(el));

    // 3. Draw temporary creation preview
    if (currentTempElement) {
      drawElement(currentTempElement, true);
    }

    // 4. Draw Selection Highlights & Handles
    drawSelection();

    // 5. Draw Selection Box when marquee dragging
    if (selectionBox) {
      ctx.save();
      ctx.fillStyle = 'rgba(105, 101, 219, 0.08)';
      ctx.strokeStyle = '#6965db';
      ctx.lineWidth = 1 / camera.zoom;
      ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
      ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawElement(el, isTemp = false) {
    ctx.save();
    ctx.globalAlpha = (el.opacity !== undefined ? el.opacity : 100) / 100;

    const roughOptions = {
      seed: el.seed || 1,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth || 1.5,
      strokeLineDash: getStrokeDash(el.strokeStyle, el.strokeWidth),
      roughness: el.roughness !== undefined ? el.roughness : 1.2,
      fill: el.fill === 'transparent' ? undefined : el.fill,
      fillStyle: el.fillStyle || 'hachure'
    };

    const minX = Math.min(el.x, el.x + el.width);
    const minY = Math.min(el.y, el.y + el.height);
    const absW = Math.abs(el.width);
    const absH = Math.abs(el.height);

    switch (el.type) {
      case 'rectangle':
        if (absW > 1 && absH > 1) {
          rc.rectangle(minX, minY, absW, absH, roughOptions);
        }
        drawElementText(el, minX, minY, absW, absH);
        break;

      case 'diamond':
        if (absW > 1 && absH > 1) {
          const cx = minX + absW / 2;
          const cy = minY + absH / 2;
          rc.polygon([
            [cx, minY],
            [minX + absW, cy],
            [cx, minY + absH],
            [minX, cy]
          ], roughOptions);
        }
        drawElementText(el, minX, minY, absW, absH);
        break;

      case 'ellipse':
        if (absW > 1 && absH > 1) {
          rc.ellipse(minX + absW / 2, minY + absH / 2, absW, absH, roughOptions);
        }
        drawElementText(el, minX, minY, absW, absH);
        break;

      case 'line':
      case 'arrow':
        const pts = getConnectorPoints(el);
        rc.line(pts.x1, pts.y1, pts.x2, pts.y2, roughOptions);

        if (el.type === 'arrow') {
          // Arrow Head
          const angle = Math.atan2(pts.y2 - pts.y1, pts.x2 - pts.x1);
          const headLen = 14 + (el.strokeWidth || 1.5) * 2;
          const arrowAngle = Math.PI / 6;

          const lx = pts.x2 - headLen * Math.cos(angle - arrowAngle);
          const ly = pts.y2 - headLen * Math.sin(angle - arrowAngle);
          const rx = pts.x2 - headLen * Math.cos(angle + arrowAngle);
          const ry = pts.y2 - headLen * Math.sin(angle + arrowAngle);

          rc.line(pts.x2, pts.y2, lx, ly, roughOptions);
          rc.line(pts.x2, pts.y2, rx, ry, roughOptions);
        }
        break;

      case 'freedraw':
        if (el.points && el.points.length > 1) {
          for (let i = 0; i < el.points.length - 1; i++) {
            rc.line(el.points[i].x, el.points[i].y, el.points[i+1].x, el.points[i+1].y, roughOptions);
          }
        }
        break;

      case 'text':
        drawStandaloneText(el);
        break;

      case 'image':
        drawImageElement(el, minX, minY, absW, absH);
        break;
    }

    ctx.restore();
  }

  function drawElementText(el, x, y, width, height) {
    if (!el.text || !el.text.trim()) return;
    ctx.save();
    const fontSize = el.fontSize || 22;
    ctx.font = `${fontSize}px 'Architects Daughter', cursive, sans-serif`;
    ctx.fillStyle = el.stroke === 'transparent' ? '#1e1e1e' : el.stroke;
    ctx.textAlign = el.textAlign || 'center';
    ctx.textBaseline = 'middle';

    const lines = el.text.split('\n');
    const lineHeight = fontSize * 1.35;
    const totalHeight = lines.length * lineHeight;
    const startY = y + (height - totalHeight) / 2 + lineHeight / 2;

    let posX = x + width / 2;
    if (el.textAlign === 'left') posX = x + 12;
    if (el.textAlign === 'right') posX = x + width - 12;

    lines.forEach((line, idx) => {
      ctx.fillText(line, posX, startY + idx * lineHeight);
    });
    ctx.restore();
  }

  function drawStandaloneText(el) {
    if (!el.text || !el.text.trim()) return;
    ctx.save();
    const fontSize = el.fontSize || 22;
    ctx.font = `${fontSize}px 'Architects Daughter', cursive, sans-serif`;
    ctx.fillStyle = el.stroke === 'transparent' ? '#1e1e1e' : el.stroke;
    ctx.textAlign = el.textAlign || 'left';
    ctx.textBaseline = 'top';

    const lines = el.text.split('\n');
    const lineHeight = fontSize * 1.35;

    lines.forEach((line, idx) => {
      ctx.fillText(line, el.x, el.y + idx * lineHeight);
    });
    ctx.restore();
  }

  // Cached Image elements
  const imageElementCache = new Map();

  function drawImageElement(el, x, y, w, h) {
    if (!el.dataUrl) return;
    let img = imageElementCache.get(el.dataUrl);
    if (!img) {
      img = new Image();
      img.src = el.dataUrl;
      img.onload = () => render();
      imageElementCache.set(el.dataUrl, img);
    }
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, x, y, w, h);
      // Rough dashed border around image
      rc.rectangle(x, y, w, h, {
        stroke: el.stroke,
        strokeWidth: 1,
        roughness: 0.5,
        strokeLineDash: [4, 4]
      });
    }
  }

  // Draw selection outlines and handles
  function drawSelection() {
    if (selectedElementIds.size === 0) return;

    ctx.save();
    ctx.strokeStyle = '#6965db';
    ctx.lineWidth = 1.4 / camera.zoom;
    ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);

    selectedElementIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (!el) return;

      const minX = Math.min(el.x, el.x + el.width);
      const maxX = Math.max(el.x, el.x + el.width);
      const minY = Math.min(el.y, el.y + el.height);
      const maxY = Math.max(el.y, el.y + el.height);
      const pad = 6 / camera.zoom;

      if (['rectangle', 'diamond', 'ellipse', 'text', 'image'].includes(el.type)) {
        ctx.strokeRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);

        // Corner handles for single selection resize
        if (selectedElementIds.size === 1 && el.type !== 'text') {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#6965db';
          ctx.lineWidth = 1.5 / camera.zoom;
          ctx.setLineDash([]);
          const handleSize = 7 / camera.zoom;

          const handles = [
            [minX - pad, minY - pad],
            [maxX + pad, minY - pad],
            [maxX + pad, maxY + pad],
            [minX - pad, maxY + pad]
          ];

          handles.forEach(([hx, hy]) => {
            ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
          });
        }
      } else if (el.type === 'line' || el.type === 'arrow') {
        const pts = getConnectorPoints(el);
        ctx.beginPath();
        ctx.arc(pts.x1, pts.y1, 5 / camera.zoom, 0, Math.PI * 2);
        ctx.arc(pts.x2, pts.y2, 5 / camera.zoom, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  // --- Zoom & Pan Logic ---
  function zoomAt(screenX, screenY, factor) {
    const newZoom = Math.min(Math.max(camera.zoom * factor, 0.15), 5.0);
    const scenePt = screenToScene(screenX, screenY);
    camera.zoom = newZoom;
    camera.x = screenX - scenePt.x * newZoom;
    camera.y = screenY - scenePt.y * newZoom;
    updateZoomDisplay();
    render();
  }

  function updateZoomDisplay() {
    zoomResetBtn.textContent = `${Math.round(camera.zoom * 100)}%`;
  }

  function resetZoom() {
    camera.zoom = 1.0;
    camera.x = 0;
    camera.y = 0;
    updateZoomDisplay();
    render();
  }

  function fitToContent() {
    if (elements.length === 0) {
      resetZoom();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      if (['line', 'arrow'].includes(el.type)) {
        minX = Math.min(minX, el.startX, el.endX);
        maxX = Math.max(maxX, el.startX, el.endX);
        minY = Math.min(minY, el.startY, el.endY);
        maxY = Math.max(maxY, el.startY, el.endY);
      } else if (el.type === 'freedraw') {
        el.points?.forEach(p => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });
      } else {
        minX = Math.min(minX, el.x, el.x + el.width);
        maxX = Math.max(maxX, el.x, el.x + el.width);
        minY = Math.min(minY, el.y, el.y + el.height);
        maxY = Math.max(maxY, el.y, el.y + el.height);
      }
    });

    const padding = 60;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const scaleX = window.innerWidth / contentW;
    const scaleY = window.innerHeight / contentH;
    camera.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 2.0);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    camera.x = window.innerWidth / 2 - centerX * camera.zoom;
    camera.y = window.innerHeight / 2 - centerY * camera.zoom;

    updateZoomDisplay();
    render();
  }

  // --- Wheel Zoom & Trackpad Pan ---
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      zoomAt(e.clientX, e.clientY, zoomFactor);
    } else {
      // Pan
      camera.x -= e.deltaX;
      camera.y -= e.deltaY;
      render();
    }
  }, { passive: false });

  // --- Canvas Pointer Interactions ---
  canvas.addEventListener('mousedown', (e) => {
    if (inlineTextInput.style.display !== 'none') {
      commitInlineText();
    }

    pointerStartScreen = { x: e.clientX, y: e.clientY };
    pointerStartScene = screenToScene(e.clientX, e.clientY);
    isPointerDown = true;

    // Check Space key or Middle Click for Panning
    if (e.button === 1 || e.spaceKey || activeTool === 'hand') {
      isPanning = true;
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return; // Only left button for drawing

    const hit = getElementAtPosition(pointerStartScene.x, pointerStartScene.y);

    // Eraser Tool
    if (activeTool === 'eraser') {
      if (hit) {
        deleteElements([hit.id]);
        pushHistory();
      }
      return;
    }

    // Select Tool
    if (activeTool === 'select') {
      const resizeHandle = getResizeHandleAt(pointerStartScene.x, pointerStartScene.y);
      if (resizeHandle) {
        isResizing = true;
        activeResizeHandle = resizeHandle;
        return;
      }

      if (hit) {
        if (e.shiftKey) {
          // Toggle selection
          if (selectedElementIds.has(hit.id)) {
            selectedElementIds.delete(hit.id);
          } else {
            selectedElementIds.add(hit.id);
          }
        } else {
          if (!selectedElementIds.has(hit.id)) {
            selectedElementIds.clear();
            selectedElementIds.add(hit.id);
          }
        }
        isDraggingElements = true;
        dragElementInitialPositions.clear();
        selectedElementIds.forEach(id => {
          const el = elements.find(e => e.id === id);
          if (el) {
            dragElementInitialPositions.set(id, {
              x: el.x, y: el.y,
              startX: el.startX, startY: el.startY,
              endX: el.endX, endY: el.endY,
              points: el.points ? el.points.map(p => ({ ...p })) : undefined
            });
          }
        });
        syncPanelWithSelection();
      } else {
        if (!e.shiftKey) {
          selectedElementIds.clear();
        }
        isSelectingBox = true;
        selectionBox = { x: pointerStartScene.x, y: pointerStartScene.y, width: 0, height: 0 };
      }
      render();
      return;
    }

    // Creation Tools
    if (['rectangle', 'diamond', 'ellipse'].includes(activeTool)) {
      isDrawingShape = true;
      currentTempElement = createShapeElement(activeTool, pointerStartScene.x, pointerStartScene.y);
    } else if (activeTool === 'line' || activeTool === 'arrow') {
      isDrawingShape = true;
      connectorStartBox = hit && ['rectangle', 'diamond', 'ellipse'].includes(hit.type) ? hit : null;
      const startPt = connectorStartBox ? getBoxCenter(connectorStartBox) : pointerStartScene;
      currentTempElement = createConnectorElement(activeTool, connectorStartBox, startPt);
    } else if (activeTool === 'freedraw') {
      isDrawingShape = true;
      currentTempElement = createFreedrawElement(pointerStartScene.x, pointerStartScene.y);
    } else if (activeTool === 'text') {
      const newText = createTextElement(pointerStartScene.x, pointerStartScene.y);
      elements.push(newText);
      selectedElementIds.clear();
      selectedElementIds.add(newText.id);
      pushHistory();
      render();
      openInlineTextEditor(newText);
      setTool('select');
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPointerDown) {
      // Hover effects for cursor
      const scene = screenToScene(e.clientX, e.clientY);
      const resizeHandle = getResizeHandleAt(scene.x, scene.y);
      if (resizeHandle) {
        canvas.style.cursor = `${resizeHandle}-resize`;
      } else if (activeTool === 'select') {
        const hit = getElementAtPosition(scene.x, scene.y);
        canvas.style.cursor = hit ? 'move' : 'default';
      }
      return;
    }

    const currentScene = screenToScene(e.clientX, e.clientY);
    const dx = currentScene.x - pointerStartScene.x;
    const dy = currentScene.y - pointerStartScene.y;

    if (isPanning) {
      camera.x += e.clientX - pointerStartScreen.x;
      camera.y += e.clientY - pointerStartScreen.y;
      pointerStartScreen = { x: e.clientX, y: e.clientY };
      render();
      return;
    }

    // Dragging selected elements
    if (isDraggingElements) {
      selectedElementIds.forEach(id => {
        const el = elements.find(e => e.id === id);
        const init = dragElementInitialPositions.get(id);
        if (el && init) {
          el.x = init.x + dx;
          el.y = init.y + dy;
          if (init.startX !== undefined) el.startX = init.startX + dx;
          if (init.startY !== undefined) el.startY = init.startY + dy;
          if (init.endX !== undefined) el.endX = init.endX + dx;
          if (init.endY !== undefined) el.endY = init.endY + dy;
          if (init.points) {
            el.points = init.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          }
        }
      });
      render();
      return;
    }

    // Resizing single element
    if (isResizing && selectedElementIds.size === 1) {
      const el = elements.find(e => selectedElementIds.has(e.id));
      if (el) {
        if (activeResizeHandle.includes('e')) el.width = currentScene.x - el.x;
        if (activeResizeHandle.includes('s')) el.height = currentScene.y - el.y;
        if (activeResizeHandle.includes('w')) {
          const right = el.x + el.width;
          el.x = currentScene.x;
          el.width = right - currentScene.x;
        }
        if (activeResizeHandle.includes('n')) {
          const bottom = el.y + el.height;
          el.y = currentScene.y;
          el.height = bottom - currentScene.y;
        }
        render();
      }
      return;
    }

    // Selection marquee box
    if (isSelectingBox && selectionBox) {
      selectionBox.x = Math.min(pointerStartScene.x, currentScene.x);
      selectionBox.y = Math.min(pointerStartScene.y, currentScene.y);
      selectionBox.width = Math.abs(currentScene.x - pointerStartScene.x);
      selectionBox.height = Math.abs(currentScene.y - pointerStartScene.y);

      // Select elements colliding with marquee
      elements.forEach(el => {
        if (['rectangle', 'diamond', 'ellipse', 'text', 'image'].includes(el.type)) {
          const elMinX = Math.min(el.x, el.x + el.width);
          const elMaxX = Math.max(el.x, el.x + el.width);
          const elMinY = Math.min(el.y, el.y + el.height);
          const elMaxY = Math.max(el.y, el.y + el.height);

          const intersect = !(elMinX > selectionBox.x + selectionBox.width ||
                              elMaxX < selectionBox.x ||
                              elMinY > selectionBox.y + selectionBox.height ||
                              elMaxY < selectionBox.y);
          if (intersect) {
            selectedElementIds.add(el.id);
          } else if (!e.shiftKey) {
            selectedElementIds.delete(el.id);
          }
        }
      });
      syncPanelWithSelection();
      render();
      return;
    }

    // Drawing in progress
    if (isDrawingShape && currentTempElement) {
      if (['rectangle', 'diamond', 'ellipse'].includes(currentTempElement.type)) {
        currentTempElement.x = Math.min(pointerStartScene.x, currentScene.x);
        currentTempElement.y = Math.min(pointerStartScene.y, currentScene.y);
        currentTempElement.width = Math.abs(currentScene.x - pointerStartScene.x);
        currentTempElement.height = Math.abs(currentScene.y - pointerStartScene.y);
      } else if (currentTempElement.type === 'line' || currentTempElement.type === 'arrow') {
        currentTempElement.endX = currentScene.x;
        currentTempElement.endY = currentScene.y;
        const hoverBox = getElementAtPosition(currentScene.x, currentScene.y);
        if (hoverBox && ['rectangle', 'diamond', 'ellipse'].includes(hoverBox.type) && hoverBox !== connectorStartBox) {
          currentTempElement.endBoxId = hoverBox.id;
        } else {
          currentTempElement.endBoxId = null;
        }
      } else if (currentTempElement.type === 'freedraw') {
        currentTempElement.points.push({ x: currentScene.x, y: currentScene.y });
      }
      render();
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = activeTool === 'hand' ? 'grab' : 'default';
      return;
    }

    if (isDraggingElements || isResizing) {
      isDraggingElements = false;
      isResizing = false;
      activeResizeHandle = null;
      pushHistory();
      return;
    }

    if (isSelectingBox) {
      isSelectingBox = false;
      selectionBox = null;
      render();
      return;
    }

    if (isDrawingShape && currentTempElement) {
      let shouldCommit = false;
      if (['rectangle', 'diamond', 'ellipse'].includes(currentTempElement.type)) {
        if (currentTempElement.width > 5 && currentTempElement.height > 5) shouldCommit = true;
      } else if (['line', 'arrow'].includes(currentTempElement.type)) {
        if (Math.hypot(currentTempElement.endX - currentTempElement.startX, currentTempElement.endY - currentTempElement.startY) > 5) {
          shouldCommit = true;
        }
      } else if (currentTempElement.type === 'freedraw') {
        if (currentTempElement.points.length > 2) shouldCommit = true;
      }

      if (shouldCommit) {
        elements.push(currentTempElement);
        selectedElementIds.clear();
        selectedElementIds.add(currentTempElement.id);
        pushHistory();
        syncPanelWithSelection();
      }

      isDrawingShape = false;
      currentTempElement = null;
      connectorStartBox = null;
      setTool('select');
      render();
    }
  });

  // Double-click to edit text inside shape or standalone text
  canvas.addEventListener('dblclick', (e) => {
    const scene = screenToScene(e.clientX, e.clientY);
    const hit = getElementAtPosition(scene.x, scene.y);
    if (hit && ['rectangle', 'diamond', 'ellipse', 'text'].includes(hit.type)) {
      openInlineTextEditor(hit);
    }
  });

  function openInlineTextEditor(el) {
    activeTextEditingElement = el;
    selectedElementIds.clear();
    selectedElementIds.add(el.id);

    const screenPos = sceneToScreen(el.x, el.y);
    const screenW = Math.max(Math.abs(el.width) * camera.zoom, 140);
    const screenH = Math.max(Math.abs(el.height) * camera.zoom, 50);

    inlineTextInput.style.display = 'block';
    inlineTextInput.style.left = `${screenPos.x}px`;
    inlineTextInput.style.top = `${screenPos.y}px`;
    inlineTextInput.style.width = `${screenW}px`;
    inlineTextInput.style.height = `${screenH}px`;
    inlineTextInput.style.fontSize = `${(el.fontSize || 22) * camera.zoom}px`;
    inlineTextInput.style.textAlign = el.textAlign || 'center';
    inlineTextInput.value = el.text || '';
    inlineTextInput.focus();
    inlineTextInput.select();
  }

  function commitInlineText() {
    if (activeTextEditingElement) {
      activeTextEditingElement.text = inlineTextInput.value;
      // Auto expand box height if text overflows
      const lines = activeTextEditingElement.text.split('\n');
      const minH = lines.length * ((activeTextEditingElement.fontSize || 22) * 1.4) + 24;
      if (activeTextEditingElement.height < minH) {
        activeTextEditingElement.height = minH;
      }
      pushHistory();
      activeTextEditingElement = null;
    }
    inlineTextInput.style.display = 'none';
    render();
  }

  inlineTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      inlineTextInput.style.display = 'none';
      activeTextEditingElement = null;
      render();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      commitInlineText();
    }
  });

  inlineTextInput.addEventListener('blur', commitInlineText);

  // --- Tool Switching ---
  function setTool(toolName) {
    activeTool = toolName;
    toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });

    if (toolName === 'hand') {
      canvas.style.cursor = 'grab';
    } else if (toolName === 'select') {
      canvas.style.cursor = 'default';
    } else if (toolName === 'eraser') {
      canvas.style.cursor = 'cell';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }

  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  // --- Image Tool ---
  imageToolBtn.addEventListener('click', () => imageInput.click());

  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        // Compute scaled size
        const maxDim = 320;
        let w = img.naturalWidth || 200;
        let h = img.naturalHeight || 150;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = w * ratio;
          h = h * ratio;
        }

        const centerScene = screenToScene(window.innerWidth / 2 - w / 2, window.innerHeight / 2 - h / 2);
        const imageEl = createBaseElement('image', centerScene.x, centerScene.y);
        imageEl.width = w;
        imageEl.height = h;
        imageEl.dataUrl = dataUrl;

        elements.push(imageEl);
        selectedElementIds.clear();
        selectedElementIds.add(imageEl.id);
        pushHistory();
        render();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
  });

  // --- Deletion, Duplication, Layer Ordering ---
  function deleteElements(ids) {
    const idSet = new Set(ids);
    elements = elements.filter(el => {
      if (idSet.has(el.id)) return false;
      // Auto delete attached connectors
      if (el.type === 'line' || el.type === 'arrow') {
        if (idSet.has(el.startBoxId) || idSet.has(el.endBoxId)) return false;
      }
      return true;
    });
    selectedElementIds.clear();
    render();
  }

  function duplicateSelected() {
    if (selectedElementIds.size === 0) return;
    const newSelected = new Set();
    const copies = [];

    selectedElementIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (el) {
        const copy = JSON.parse(JSON.stringify(el));
        copy.id = generateId();
        copy.x += 24;
        copy.y += 24;
        if (copy.startX !== undefined) copy.startX += 24;
        if (copy.startY !== undefined) copy.startY += 24;
        if (copy.endX !== undefined) copy.endX += 24;
        if (copy.endY !== undefined) copy.endY += 24;
        if (copy.points) copy.points = copy.points.map(p => ({ x: p.x + 24, y: p.y + 24 }));
        copy.seed = Math.floor(Math.random() * 100000);
        copies.push(copy);
        newSelected.add(copy.id);
      }
    });

    elements.push(...copies);
    selectedElementIds = newSelected;
    pushHistory();
    render();
  }

  function bringForward() {
    if (selectedElementIds.size === 0) return;
    for (let i = elements.length - 2; i >= 0; i--) {
      if (selectedElementIds.has(elements[i].id)) {
        const temp = elements[i];
        elements[i] = elements[i + 1];
        elements[i + 1] = temp;
      }
    }
    pushHistory();
    render();
  }

  function sendBackward() {
    if (selectedElementIds.size === 0) return;
    for (let i = 1; i < elements.length; i++) {
      if (selectedElementIds.has(elements[i].id)) {
        const temp = elements[i];
        elements[i] = elements[i - 1];
        elements[i - 1] = temp;
      }
    }
    pushHistory();
    render();
  }

  bringForwardBtn.addEventListener('click', bringForward);
  sendBackwardBtn.addEventListener('click', sendBackward);
  duplicateBtn.addEventListener('click', duplicateSelected);
  deleteSelectionBtn.addEventListener('click', () => {
    deleteElements(Array.from(selectedElementIds));
    pushHistory();
  });

  // --- Contextual Properties Panel Sync & Actions ---
  function syncPanelWithSelection() {
    if (selectedElementIds.size === 0) return;
    const firstSelected = elements.find(e => selectedElementIds.has(e.id));
    if (!firstSelected) return;

    // Stroke
    strokeSwatches.forEach(s => s.classList.toggle('active', s.dataset.color === firstSelected.stroke));
    // Bg Fill
    bgSwatches.forEach(s => s.classList.toggle('active', s.dataset.color === firstSelected.fill));
    // Stroke Width
    strokeWidthSegments.forEach(s => s.classList.toggle('active', parseFloat(s.dataset.val) === firstSelected.strokeWidth));
    // Stroke Style
    strokeStyleSegments.forEach(s => s.classList.toggle('active', s.dataset.val === firstSelected.strokeStyle));
    // Fill Style
    fillStyleSegments.forEach(s => s.classList.toggle('active', s.dataset.val === firstSelected.fillStyle));
    // Roughness
    roughnessSegments.forEach(s => s.classList.toggle('active', parseFloat(s.dataset.val) === firstSelected.roughness));
    // Opacity
    opacitySlider.value = firstSelected.opacity !== undefined ? firstSelected.opacity : 100;
    opacityVal.textContent = `${opacitySlider.value}%`;
    // Font Size
    fontSizeSegments.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) === (firstSelected.fontSize || 22)));
    // Text Align
    textAlignSegments.forEach(s => s.classList.toggle('active', s.dataset.val === (firstSelected.textAlign || 'center')));
  }

  function updateSelectedElements(key, value) {
    currentStyle[key] = value;
    selectedElementIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (el) el[key] = value;
    });
    pushHistory();
    render();
  }

  strokeSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      strokeSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      updateSelectedElements('stroke', swatch.dataset.color);
    });
  });

  customStrokeInput.addEventListener('input', (e) => {
    strokeSwatches.forEach(s => s.classList.remove('active'));
    updateSelectedElements('stroke', e.target.value);
  });

  bgSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      bgSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      updateSelectedElements('fill', swatch.dataset.color);
    });
  });

  customBgInput.addEventListener('input', (e) => {
    bgSwatches.forEach(s => s.classList.remove('active'));
    updateSelectedElements('fill', e.target.value);
  });

  strokeWidthSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      strokeWidthSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      updateSelectedElements('strokeWidth', parseFloat(seg.dataset.val));
    });
  });

  strokeStyleSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      strokeStyleSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      updateSelectedElements('strokeStyle', seg.dataset.val);
    });
  });

  fillStyleSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      fillStyleSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      updateSelectedElements('fillStyle', seg.dataset.val);
    });
  });

  roughnessSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      roughnessSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      updateSelectedElements('roughness', parseFloat(seg.dataset.val));
    });
  });

  opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    opacityVal.textContent = `${val}%`;
    updateSelectedElements('opacity', val);
  });

  fontSizeSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      fontSizeSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      updateSelectedElements('fontSize', parseInt(seg.dataset.val));
    });
  });

  textAlignSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      textAlignSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      updateSelectedElements('textAlign', seg.dataset.val);
    });
  });

  // --- Document Operations: Save, Open, Export PNG, Export SVG ---
  exportMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle('open');
  });

  window.addEventListener('click', () => {
    exportDropdown.classList.remove('open');
  });

  // 1. Save JSON
  saveJsonItem.addEventListener('click', () => {
    const docData = {
      type: 'excalilite',
      version: 2,
      createdAt: new Date().toISOString(),
      elements,
      camera
    };
    const blob = new Blob([JSON.stringify(docData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `excalilite-drawing-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    markSaved();
  });

  // 2. Open Document
  openJsonItem.addEventListener('click', () => docFileInput.click());

  docFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.elements && Array.isArray(parsed.elements)) {
          elements = parsed.elements;
          if (parsed.camera) camera = parsed.camera;
          selectedElementIds.clear();
          pushHistory();
          render();
          markSaved();
        } else {
          alert('Invalid ExcaliLite document structure');
        }
      } catch (err) {
        alert('Could not parse file: ' + err.message);
      }
    };
    reader.readAsText(file);
    docFileInput.value = '';
  });

  // 3. New Document
  newDocItem.addEventListener('click', () => {
    if (confirm('Create new drawing? Unsaved changes will be cleared.')) {
      elements = [];
      selectedElementIds.clear();
      resetZoom();
      pushHistory();
      render();
    }
  });

  // 4. Export PNG
  exportPngItem.addEventListener('click', () => {
    // Render on an offscreen canvas fitted exactly to content bounding box
    if (elements.length === 0) {
      alert('Canvas is empty!');
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      if (['line', 'arrow'].includes(el.type)) {
        minX = Math.min(minX, el.startX, el.endX);
        maxX = Math.max(maxX, el.startX, el.endX);
        minY = Math.min(minY, el.startY, el.endY);
        maxY = Math.max(maxY, el.startY, el.endY);
      } else {
        minX = Math.min(minX, el.x, el.x + el.width);
        maxX = Math.max(maxX, el.x, el.x + el.width);
        minY = Math.min(minY, el.y, el.y + el.height);
        maxY = Math.max(maxY, el.y, el.y + el.height);
      }
    });

    const pad = 40;
    const offW = Math.max(maxX - minX + pad * 2, 200);
    const offH = Math.max(maxY - minY + pad * 2, 200);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = offW * 2; // 2x for Retina sharp output
    offCanvas.height = offH * 2;
    const offCtx = offCanvas.getContext('2d');
    offCtx.scale(2, 2);

    // Background color based on current theme
    const isDark = document.body.classList.contains('theme-dark');
    offCtx.fillStyle = isDark ? '#18181b' : '#ffffff';
    offCtx.fillRect(0, 0, offW, offH);

    // Transform to content origin
    offCtx.translate(pad - minX, pad - minY);

    const offRc = rough.canvas(offCanvas);
    // Draw elements onto offscreen canvas
    elements.forEach(el => {
      // Temporarily swap context for drawing
      drawElementWithContext(offRc, offCtx, el);
    });

    const dataUrl = offCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `excalilite-export-${Date.now()}.png`;
    a.click();
  });

  // 5. Export SVG
  exportSvgItem.addEventListener('click', () => {
    if (elements.length === 0) {
      alert('Canvas is empty!');
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      minX = Math.min(minX, el.x, el.startX || el.x);
      maxX = Math.max(maxX, el.x + (el.width || 0), el.endX || el.x);
      minY = Math.min(minY, el.y, el.startY || el.y);
      maxY = Math.max(maxY, el.y + (el.height || 0), el.endY || el.y);
    });

    const pad = 40;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;

    const svgNs = 'http://www.w3.org/2000/svg';
    const svgEl = document.createElementNS(svgNs, 'svg');
    svgEl.setAttribute('width', `${w}`);
    svgEl.setAttribute('height', `${h}`);
    svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const isDark = document.body.classList.contains('theme-dark');
    const bgRect = document.createElementNS(svgNs, 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', isDark ? '#18181b' : '#ffffff');
    svgEl.appendChild(bgRect);

    const g = document.createElementNS(svgNs, 'g');
    g.setAttribute('transform', `translate(${pad - minX}, ${pad - minY})`);

    const rcSvg = rough.svg(svgEl);

    elements.forEach(el => {
      const minElX = Math.min(el.x, el.x + el.width);
      const minElY = Math.min(el.y, el.y + el.height);
      const absW = Math.abs(el.width);
      const absH = Math.abs(el.height);

      const opts = {
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        roughness: el.roughness,
        fill: el.fill === 'transparent' ? undefined : el.fill,
        fillStyle: el.fillStyle
      };

      let node = null;
      if (el.type === 'rectangle') node = rcSvg.rectangle(minElX, minElY, absW, absH, opts);
      else if (el.type === 'ellipse') node = rcSvg.ellipse(minElX + absW/2, minElY + absH/2, absW, absH, opts);
      else if (el.type === 'line' || el.type === 'arrow') {
        const pts = getConnectorPoints(el);
        node = rcSvg.line(pts.x1, pts.y1, pts.x2, pts.y2, opts);
      }

      if (node) g.appendChild(node);
    });

    svgEl.appendChild(g);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `excalilite-vector-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  });

  function drawElementWithContext(roughC, targetCtx, el) {
    targetCtx.save();
    targetCtx.globalAlpha = (el.opacity !== undefined ? el.opacity : 100) / 100;

    const roughOptions = {
      seed: el.seed || 1,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth || 1.5,
      strokeLineDash: getStrokeDash(el.strokeStyle, el.strokeWidth),
      roughness: el.roughness !== undefined ? el.roughness : 1.2,
      fill: el.fill === 'transparent' ? undefined : el.fill,
      fillStyle: el.fillStyle || 'hachure'
    };

    const minX = Math.min(el.x, el.x + el.width);
    const minY = Math.min(el.y, el.y + el.height);
    const absW = Math.abs(el.width);
    const absH = Math.abs(el.height);

    if (el.type === 'rectangle') {
      roughC.rectangle(minX, minY, absW, absH, roughOptions);
    } else if (el.type === 'diamond') {
      const cx = minX + absW / 2;
      const cy = minY + absH / 2;
      roughC.polygon([[cx, minY], [minX + absW, cy], [cx, minY + absH], [minX, cy]], roughOptions);
    } else if (el.type === 'ellipse') {
      roughC.ellipse(minX + absW / 2, minY + absH / 2, absW, absH, roughOptions);
    } else if (el.type === 'line' || el.type === 'arrow') {
      const pts = getConnectorPoints(el);
      roughC.line(pts.x1, pts.y1, pts.x2, pts.y2, roughOptions);
      if (el.type === 'arrow') {
        const angle = Math.atan2(pts.y2 - pts.y1, pts.x2 - pts.x1);
        const headLen = 14 + (el.strokeWidth || 1.5) * 2;
        const arrowAngle = Math.PI / 6;
        roughC.line(pts.x2, pts.y2, pts.x2 - headLen * Math.cos(angle - arrowAngle), pts.y2 - headLen * Math.sin(angle - arrowAngle), roughOptions);
        roughC.line(pts.x2, pts.y2, pts.x2 - headLen * Math.cos(angle + arrowAngle), pts.y2 - headLen * Math.sin(angle + arrowAngle), roughOptions);
      }
    } else if (el.type === 'freedraw') {
      if (el.points) {
        for (let i = 0; i < el.points.length - 1; i++) {
          roughC.line(el.points[i].x, el.points[i].y, el.points[i+1].x, el.points[i+1].y, roughOptions);
        }
      }
    }

    if (el.text && el.text.trim()) {
      targetCtx.font = `${el.fontSize || 22}px 'Architects Daughter', cursive, sans-serif`;
      targetCtx.fillStyle = el.stroke;
      targetCtx.textAlign = el.textAlign || 'center';
      targetCtx.textBaseline = 'middle';
      const lines = el.text.split('\n');
      const lineHeight = (el.fontSize || 22) * 1.35;
      const startY = minY + (absH - lines.length * lineHeight) / 2 + lineHeight / 2;
      lines.forEach((line, idx) => {
        targetCtx.fillText(line, minX + absW / 2, startY + idx * lineHeight);
      });
    }

    targetCtx.restore();
  }

  // --- Zoom Buttons ---
  zoomInBtn.addEventListener('click', () => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.2));
  zoomOutBtn.addEventListener('click', () => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8));
  zoomResetBtn.addEventListener('click', resetZoom);
  fitContentBtn.addEventListener('click', fitToContent);

  // --- Theme Toggle ---
  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('theme-dark');
      themeMoonIcon.style.display = 'none';
      themeSunIcon.style.display = 'block';
    } else {
      document.body.classList.remove('theme-dark');
      themeMoonIcon.style.display = 'block';
      themeSunIcon.style.display = 'none';
    }
    render();
  }

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('theme-dark');
    setTheme(isDark ? 'light' : 'dark');
  });

  // --- Shortcuts Modal ---
  helpBtn.addEventListener('click', () => shortcutsModal.style.display = 'flex');
  closeModalBtn.addEventListener('click', () => shortcutsModal.style.display = 'none');
  shortcutsModal.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) shortcutsModal.style.display = 'none';
  });

  // --- Keyboard Shortcuts ---
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === inlineTextInput || document.activeElement.tagName === 'INPUT') return;

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    // Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveJsonItem.click();
      return;
    }

    // Select All
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectedElementIds = new Set(elements.map(el => el.id));
      syncPanelWithSelection();
      render();
      return;
    }

    // Duplicate
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateSelected();
      return;
    }

    // Copy / Cut / Paste
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      clipboard = elements.filter(el => selectedElementIds.has(el.id));
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      clipboard = elements.filter(el => selectedElementIds.has(el.id));
      deleteElements(Array.from(selectedElementIds));
      pushHistory();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      if (clipboard.length > 0) {
        const copies = clipboard.map(el => {
          const cp = JSON.parse(JSON.stringify(el));
          cp.id = generateId();
          cp.x += 30; cp.y += 30;
          if (cp.startX !== undefined) { cp.startX += 30; cp.startY += 30; cp.endX += 30; cp.endY += 30; }
          return cp;
        });
        elements.push(...copies);
        selectedElementIds = new Set(copies.map(c => c.id));
        pushHistory();
        render();
      }
      return;
    }

    // Zoom shortcuts
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.15);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.85);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      resetZoom();
      return;
    }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedElementIds.size > 0) {
        deleteElements(Array.from(selectedElementIds));
        pushHistory();
      }
      return;
    }

    // Layer ordering [ and ]
    if (e.key === ']') { bringForward(); return; }
    if (e.key === '[') { sendBackward(); return; }

    // Number & letter tool shortcuts
    if (e.key === '0' || e.key.toLowerCase() === 'h') setTool('hand');
    if (e.key === '1' || e.key.toLowerCase() === 'v') setTool('select');
    if (e.key === '2' || e.key.toLowerCase() === 'r') setTool('rectangle');
    if (e.key === '3' || e.key.toLowerCase() === 'd') setTool('diamond');
    if (e.key === '4' || e.key.toLowerCase() === 'o') setTool('ellipse');
    if (e.key === '5' || e.key.toLowerCase() === 'a') setTool('arrow');
    if (e.key === '6' || e.key.toLowerCase() === 'l') setTool('line');
    if (e.key === '7' || e.key.toLowerCase() === 'p') setTool('freedraw');
    if (e.key === '8' || e.key.toLowerCase() === 't') setTool('text');
    if (e.key === '9' || e.key.toLowerCase() === 'e') setTool('eraser');
    if (e.key === '?') shortcutsModal.style.display = 'flex';
  });

  // Undo / Redo buttons
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  // --- Initial Default Diagram Setup ---
  function initDefaultDiagram() {
    if (loadFromLocalStorage()) {
      pushHistory();
      render();
      return;
    }

    const box1 = {
      id: 'box_client',
      type: 'rectangle',
      x: 140,
      y: 200,
      width: 170,
      height: 90,
      stroke: '#1e1e1e',
      strokeWidth: 2,
      strokeStyle: 'solid',
      fill: '#a5d8ff',
      fillStyle: 'hachure',
      roughness: 1.2,
      opacity: 100,
      text: 'ExcaliLite\n(Drawing Canvas)',
      fontSize: 20,
      textAlign: 'center',
      seed: 42
    };

    const diamond1 = {
      id: 'diamond_decision',
      type: 'diamond',
      x: 420,
      y: 190,
      width: 130,
      height: 110,
      stroke: '#f08c00',
      strokeWidth: 2,
      strokeStyle: 'solid',
      fill: '#ffec99',
      fillStyle: 'cross-hatch',
      roughness: 1.2,
      opacity: 100,
      text: 'Valid\nTool?',
      fontSize: 18,
      textAlign: 'center',
      seed: 88
    };

    const ellipse1 = {
      id: 'ellipse_done',
      type: 'ellipse',
      x: 680,
      y: 195,
      width: 160,
      height: 100,
      stroke: '#2f9e44',
      strokeWidth: 2,
      strokeStyle: 'solid',
      fill: '#b2f2bb',
      fillStyle: 'solid',
      roughness: 1.0,
      opacity: 100,
      text: 'Export PNG,\nSVG or JSON',
      fontSize: 18,
      textAlign: 'center',
      seed: 101
    };

    const arrow1 = {
      id: 'arrow_1',
      type: 'arrow',
      startBoxId: 'box_client',
      endBoxId: 'diamond_decision',
      startX: 0, startY: 0, endX: 0, endY: 0,
      stroke: '#1e1e1e',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1.2,
      opacity: 100,
      seed: 201
    };

    const arrow2 = {
      id: 'arrow_2',
      type: 'arrow',
      startBoxId: 'diamond_decision',
      endBoxId: 'ellipse_done',
      startX: 0, startY: 0, endX: 0, endY: 0,
      stroke: '#f08c00',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1.2,
      opacity: 100,
      seed: 202
    };

    elements = [box1, diamond1, ellipse1, arrow1, arrow2];
    pushHistory();
    resizeCanvas();
  }

  // Start app
  initDefaultDiagram();

})();
