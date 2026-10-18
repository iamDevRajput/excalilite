// ExcaliLite — Hand-Drawn Whiteboard Logic (Excalidraw Clone)
// Features: Box creation, Arrow connection, Inside text editing, Outline/Fill editing, Save/Load to JSON

(function () {
  'use strict';

  // --- Canvas & Rough.js Context ---
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const rc = rough.canvas(canvas);

  // --- DOM Elements ---
  const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
  const deleteBtn = document.getElementById('deleteBtn');
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const fileInput = document.getElementById('fileInput');
  const clearBtn = document.getElementById('clearBtn');
  const inlineTextInput = document.getElementById('inlineTextInput');

  // Styles Panel Controls
  const strokeSwatches = document.querySelectorAll('#strokePalette .color-swatch');
  const bgSwatches = document.querySelectorAll('#bgPalette .color-swatch');
  const strokeWidthSegments = document.querySelectorAll('#strokeWidthControl .segment');
  const strokeStyleSegments = document.querySelectorAll('#strokeStyleControl .segment');
  const fillStyleSegments = document.querySelectorAll('#fillStyleControl .segment');
  const roughnessSegments = document.querySelectorAll('#roughnessControl .segment');
  const fontSizeSegments = document.querySelectorAll('#fontSizeControl .segment');

  // --- App State ---
  let activeTool = 'select'; // 'select' | 'rectangle' | 'connector' | 'text'
  let elements = [];
  let selectedElement = null;
  let isDrawing = false;
  let isDragging = false;
  let isConnecting = false;
  let startX = 0;
  let startY = 0;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let currentTempElement = null;
  let connectorStartBox = null;
  let connectorEndBox = null;

  // Active default styling
  const currentStyle = {
    stroke: '#1e1e1e',
    strokeWidth: 1.5,
    strokeStyle: 'solid',
    fill: 'transparent',
    fillStyle: 'hachure',
    roughness: 1.4,
    fontSize: 20
  };

  // Resize canvas to fill window
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

  // Helper ID generator
  function generateId() {
    return 'el_' + Math.random().toString(36).substr(2, 9);
  }

  // --- Elements Model ---
  // Box: { id, type: 'rectangle', x, y, width, height, stroke, strokeWidth, strokeStyle, fill, fillStyle, roughness, text, fontSize, seed }
  // Connector: { id, type: 'connector', startBoxId, endBoxId, startX, startY, endX, endY, stroke, strokeWidth, strokeStyle, roughness, seed }

  function createBox(x, y, w, h) {
    return {
      id: generateId(),
      type: 'rectangle',
      x: Math.min(x, x + w),
      y: Math.min(y, y + h),
      width: Math.abs(w),
      height: Math.abs(h),
      stroke: currentStyle.stroke,
      strokeWidth: currentStyle.strokeWidth,
      strokeStyle: currentStyle.strokeStyle,
      fill: currentStyle.fill,
      fillStyle: currentStyle.fillStyle,
      roughness: currentStyle.roughness,
      text: '',
      fontSize: currentStyle.fontSize,
      seed: Math.floor(Math.random() * 100000)
    };
  }

  function createConnector(fromBox, toBox, fallbackStartX, fallbackStartY, fallbackEndX, fallbackEndY) {
    return {
      id: generateId(),
      type: 'connector',
      startBoxId: fromBox ? fromBox.id : null,
      endBoxId: toBox ? toBox.id : null,
      startX: fallbackStartX,
      startY: fallbackStartY,
      endX: fallbackEndX,
      endY: fallbackEndY,
      stroke: currentStyle.stroke,
      strokeWidth: currentStyle.strokeWidth,
      strokeStyle: currentStyle.strokeStyle,
      roughness: currentStyle.roughness,
      seed: Math.floor(Math.random() * 100000)
    };
  }

  // --- Rendering Functions ---
  function getBoxCenter(box) {
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  }

  // Calculate intersection point between line and rectangle boundary
  function getBoxEdgePoint(box, targetX, targetY) {
    const center = getBoxCenter(box);
    const dx = targetX - center.x;
    const dy = targetY - center.y;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return center;

    const halfW = box.width / 2;
    const halfH = box.height / 2;

    const scaleX = halfW / Math.abs(dx);
    const scaleY = halfH / Math.abs(dy);
    const scale = Math.min(scaleX, scaleY);

    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale
    };
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Connectors first
    elements.filter(el => el.type === 'connector').forEach(conn => drawConnector(conn));

    // 2. Draw Boxes and their inside text
    elements.filter(el => el.type === 'rectangle').forEach(box => drawBox(box));

    // 3. Draw temporary preview element during drag/draw
    if (currentTempElement) {
      if (currentTempElement.type === 'rectangle') {
        drawBox(currentTempElement, true);
      } else if (currentTempElement.type === 'connector') {
        drawConnector(currentTempElement, true);
      }
    }

    // 4. Draw Selection Handles if an element is selected
    if (selectedElement) {
      drawSelectionBox(selectedElement);
    }
  }

  function getStrokeDash(style, width) {
    if (style === 'dashed') return [8, 6];
    if (style === 'dotted') return [3, 4];
    return undefined;
  }

  function drawBox(box, isTemp = false) {
    const roughOptions = {
      seed: box.seed,
      stroke: box.stroke,
      strokeWidth: box.strokeWidth,
      strokeLineDash: getStrokeDash(box.strokeStyle, box.strokeWidth),
      roughness: box.roughness,
      fill: box.fill === 'transparent' ? undefined : box.fill,
      fillStyle: box.fillStyle
    };

    if (box.width > 2 && box.height > 2) {
      rc.rectangle(box.x, box.y, box.width, box.height, roughOptions);
    }

    // Draw inside text centered
    if (box.text && box.text.trim()) {
      ctx.save();
      ctx.font = `${box.fontSize || 20}px 'Architects Daughter', cursive, sans-serif`;
      ctx.fillStyle = box.stroke === 'transparent' ? '#1e1e1e' : box.stroke;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = box.text.split('\n');
      const lineHeight = (box.fontSize || 20) * 1.3;
      const totalTextHeight = lines.length * lineHeight;
      const startTextY = box.y + (box.height - totalTextHeight) / 2 + lineHeight / 2;

      lines.forEach((line, i) => {
        ctx.fillText(line, box.x + box.width / 2, startTextY + i * lineHeight);
      });
      ctx.restore();
    }
  }

  function drawConnector(conn, isTemp = false) {
    let x1 = conn.startX;
    let y1 = conn.startY;
    let x2 = conn.endX;
    let y2 = conn.endY;

    const fromBox = elements.find(e => e.id === conn.startBoxId);
    const toBox = elements.find(e => e.id === conn.endBoxId);

    if (fromBox && toBox) {
      const p1 = getBoxEdgePoint(fromBox, getBoxCenter(toBox).x, getBoxCenter(toBox).y);
      const p2 = getBoxEdgePoint(toBox, getBoxCenter(fromBox).x, getBoxCenter(fromBox).y);
      x1 = p1.x;
      y1 = p1.y;
      x2 = p2.x;
      y2 = p2.y;
    } else if (fromBox) {
      const p1 = getBoxEdgePoint(fromBox, x2, y2);
      x1 = p1.x;
      y1 = p1.y;
    } else if (toBox) {
      const p2 = getBoxEdgePoint(toBox, x1, y1);
      x2 = p2.x;
      y2 = p2.y;
    }

    const roughOptions = {
      seed: conn.seed,
      stroke: conn.stroke,
      strokeWidth: conn.strokeWidth,
      strokeLineDash: getStrokeDash(conn.strokeStyle, conn.strokeWidth),
      roughness: conn.roughness
    };

    // Draw connecting shaft
    rc.line(x1, y1, x2, y2, roughOptions);

    // Draw arrow head at (x2, y2)
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 14 + conn.strokeWidth * 2;
    const arrowAngle = Math.PI / 6;

    const leftX = x2 - headLength * Math.cos(angle - arrowAngle);
    const leftY = y2 - headLength * Math.sin(angle - arrowAngle);
    const rightX = x2 - headLength * Math.cos(angle + arrowAngle);
    const rightY = y2 - headLength * Math.sin(angle + arrowAngle);

    rc.line(x2, y2, leftX, leftY, roughOptions);
    rc.line(x2, y2, rightX, rightY, roughOptions);
  }

  function drawSelectionBox(el) {
    ctx.save();
    ctx.strokeStyle = '#6965db';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);

    if (el.type === 'rectangle') {
      const padding = 5;
      ctx.strokeRect(el.x - padding, el.y - padding, el.width + padding * 2, el.height + padding * 2);

      // Draw corner dots
      ctx.fillStyle = '#6965db';
      const corners = [
        [el.x - padding, el.y - padding],
        [el.x + el.width + padding, el.y - padding],
        [el.x - padding, el.y + el.height + padding],
        [el.x + el.width + padding, el.y + el.height + padding]
      ];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
      });
    }
    ctx.restore();
  }

  // --- Hit Testing ---
  function findElementAt(x, y) {
    // Check boxes first (in reverse render order)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'rectangle') {
        if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
          return el;
        }
      }
    }

    // Check connectors (distance to line segment)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'connector') {
        let x1 = el.startX, y1 = el.startY, x2 = el.endX, y2 = el.endY;
        const b1 = elements.find(b => b.id === el.startBoxId);
        const b2 = elements.find(b => b.id === el.endBoxId);
        if (b1) { const c = getBoxCenter(b1); x1 = c.x; y1 = c.y; }
        if (b2) { const c = getBoxCenter(b2); x2 = c.x; y2 = c.y; }

        const dist = distToSegment(x, y, x1, y1, x2, y2);
        if (dist < 10) return el;
      }
    }
    return null;
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // --- Interaction Event Listeners ---
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    startX = x;
    startY = y;

    if (inlineTextInput.style.display !== 'none') {
      commitInlineText();
    }

    if (activeTool === 'select') {
      const hit = findElementAt(x, y);
      if (hit) {
        selectedElement = hit;
        syncPanelWithElement(hit);
        isDragging = true;
        dragOffsetX = x - (hit.x || 0);
        dragOffsetY = y - (hit.y || 0);
      } else {
        selectedElement = null;
      }
      render();
    } else if (activeTool === 'rectangle') {
      isDrawing = true;
      currentTempElement = createBox(x, y, 0, 0);
    } else if (activeTool === 'connector') {
      isConnecting = true;
      connectorStartBox = findElementAt(x, y);
      const startPt = connectorStartBox ? getBoxCenter(connectorStartBox) : { x, y };
      currentTempElement = createConnector(connectorStartBox, null, startPt.x, startPt.y, x, y);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && selectedElement && selectedElement.type === 'rectangle') {
      selectedElement.x = x - dragOffsetX;
      selectedElement.y = y - dragOffsetY;
      render();
    } else if (isDrawing && currentTempElement) {
      currentTempElement.x = Math.min(startX, x);
      currentTempElement.y = Math.min(startY, y);
      currentTempElement.width = Math.abs(x - startX);
      currentTempElement.height = Math.abs(y - startY);
      render();
    } else if (isConnecting && currentTempElement) {
      currentTempElement.endX = x;
      currentTempElement.endY = y;
      const hoveredBox = findElementAt(x, y);
      if (hoveredBox && hoveredBox.type === 'rectangle' && hoveredBox !== connectorStartBox) {
        currentTempElement.endBoxId = hoveredBox.id;
      } else {
        currentTempElement.endBoxId = null;
      }
      render();
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDrawing && currentTempElement) {
      if (currentTempElement.width > 5 && currentTempElement.height > 5) {
        elements.push(currentTempElement);
        selectedElement = currentTempElement;
        syncPanelWithElement(selectedElement);
      }
      isDrawing = false;
      currentTempElement = null;
      setTool('select');
      render();
    } else if (isConnecting && currentTempElement) {
      const endBox = findElementAt(x, y);
      if (endBox && endBox.type === 'rectangle' && endBox !== connectorStartBox) {
        currentTempElement.endBoxId = endBox.id;
      }
      elements.push(currentTempElement);
      selectedElement = currentTempElement;
      syncPanelWithElement(selectedElement);
      isConnecting = false;
      currentTempElement = null;
      setTool('select');
      render();
    }

    isDragging = false;
  });

  // Double click on box to edit text inside
  canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = findElementAt(x, y);
    if (hit && hit.type === 'rectangle') {
      openInlineTextEditor(hit);
    }
  });

  function openInlineTextEditor(box) {
    selectedElement = box;
    inlineTextInput.style.display = 'block';
    inlineTextInput.style.left = (box.x + 4) + 'px';
    inlineTextInput.style.top = (box.y + 4) + 'px';
    inlineTextInput.style.width = Math.max(box.width - 8, 100) + 'px';
    inlineTextInput.style.height = Math.max(box.height - 8, 40) + 'px';
    inlineTextInput.style.fontSize = (box.fontSize || 20) + 'px';
    inlineTextInput.value = box.text || '';
    inlineTextInput.focus();
    inlineTextInput.select();
  }

  function commitInlineText() {
    if (selectedElement && selectedElement.type === 'rectangle') {
      selectedElement.text = inlineTextInput.value;
      // Auto expand box height if text overflows
      const lines = selectedElement.text.split('\n');
      const minNeededH = lines.length * (selectedElement.fontSize * 1.4) + 20;
      if (selectedElement.height < minNeededH) {
        selectedElement.height = minNeededH;
      }
    }
    inlineTextInput.style.display = 'none';
    render();
  }

  inlineTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      inlineTextInput.style.display = 'none';
      render();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      commitInlineText();
    }
  });

  inlineTextInput.addEventListener('blur', commitInlineText);

  // --- Tool Selection Handlers ---
  function setTool(toolName) {
    activeTool = toolName;
    toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });
    canvas.style.cursor = toolName === 'select' ? 'default' : 'crosshair';
  }

  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  // Keyboard shortcuts (1, 2, 3, 4, v, r, a, t, Delete)
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === inlineTextInput) return;

    if (e.key === '1' || e.key.toLowerCase() === 'v') setTool('select');
    if (e.key === '2' || e.key.toLowerCase() === 'r') setTool('rectangle');
    if (e.key === '3' || e.key.toLowerCase() === 'a') setTool('connector');
    if (e.key === '4' || e.key.toLowerCase() === 't') {
      if (selectedElement && selectedElement.type === 'rectangle') {
        openInlineTextEditor(selectedElement);
      } else {
        setTool('rectangle');
      }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelectedElement();
    }
  });

  function deleteSelectedElement() {
    if (!selectedElement) return;
    const targetId = selectedElement.id;
    // Remove element and any connectors attached to it
    elements = elements.filter(el => {
      if (el.id === targetId) return false;
      if (el.type === 'connector' && (el.startBoxId === targetId || el.endBoxId === targetId)) {
        return false;
      }
      return true;
    });
    selectedElement = null;
    render();
  }
  deleteBtn.addEventListener('click', deleteSelectedElement);

  // --- Property Panel Controls & Sync ---
  function syncPanelWithElement(el) {
    if (!el) return;

    // Stroke Color
    strokeSwatches.forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.color === el.stroke);
    });

    // Background Color
    bgSwatches.forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.color === el.fill);
    });

    // Stroke Width
    strokeWidthSegments.forEach(seg => {
      seg.classList.toggle('active', parseFloat(seg.dataset.val) === el.strokeWidth);
    });

    // Stroke Style
    strokeStyleSegments.forEach(seg => {
      seg.classList.toggle('active', seg.dataset.val === el.strokeStyle);
    });

    // Fill Style
    fillStyleSegments.forEach(seg => {
      seg.classList.toggle('active', seg.dataset.val === el.fillStyle);
    });

    // Roughness
    roughnessSegments.forEach(seg => {
      seg.classList.toggle('active', parseFloat(seg.dataset.val) === el.roughness);
    });

    // Font Size
    fontSizeSegments.forEach(seg => {
      seg.classList.toggle('active', parseInt(seg.dataset.val) === (el.fontSize || 20));
    });
  }

  // Stroke Color swatch click
  strokeSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      strokeSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentStyle.stroke = swatch.dataset.color;
      if (selectedElement) {
        selectedElement.stroke = currentStyle.stroke;
        render();
      }
    });
  });

  // Background Fill swatch click
  bgSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      bgSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentStyle.fill = swatch.dataset.color;
      if (selectedElement && selectedElement.type === 'rectangle') {
        selectedElement.fill = currentStyle.fill;
        render();
      }
    });
  });

  // Stroke width segment click
  strokeWidthSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      strokeWidthSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      currentStyle.strokeWidth = parseFloat(seg.dataset.val);
      if (selectedElement) {
        selectedElement.strokeWidth = currentStyle.strokeWidth;
        render();
      }
    });
  });

  // Stroke style segment click
  strokeStyleSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      strokeStyleSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      currentStyle.strokeStyle = seg.dataset.val;
      if (selectedElement) {
        selectedElement.strokeStyle = currentStyle.strokeStyle;
        render();
      }
    });
  });

  // Fill style segment click
  fillStyleSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      fillStyleSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      currentStyle.fillStyle = seg.dataset.val;
      if (selectedElement && selectedElement.type === 'rectangle') {
        selectedElement.fillStyle = currentStyle.fillStyle;
        render();
      }
    });
  });

  // Roughness segment click
  roughnessSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      roughnessSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      currentStyle.roughness = parseFloat(seg.dataset.val);
      if (selectedElement) {
        selectedElement.roughness = currentStyle.roughness;
        render();
      }
    });
  });

  // Font size segment click
  fontSizeSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      fontSizeSegments.forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      currentStyle.fontSize = parseInt(seg.dataset.val);
      if (selectedElement && selectedElement.type === 'rectangle') {
        selectedElement.fontSize = currentStyle.fontSize;
        render();
      }
    });
  });

  // --- Save & Load ---
  saveBtn.addEventListener('click', () => {
    const data = {
      type: 'excalilite',
      version: 1,
      createdAt: new Date().toISOString(),
      elements: elements
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  loadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.elements && Array.isArray(parsed.elements)) {
          elements = parsed.elements;
          selectedElement = null;
          render();
        } else {
          alert('Invalid ExcaliLite JSON format');
        }
      } catch (err) {
        alert('Could not read file: ' + err.message);
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Clear the entire whiteboard?')) {
      elements = [];
      selectedElement = null;
      render();
    }
  });

  // Initial setup with a demo diagram
  function initDemoDiagram() {
    const startBox = {
      id: 'box_start',
      type: 'rectangle',
      x: 140,
      y: 200,
      width: 170,
      height: 90,
      stroke: '#1e1e1e',
      strokeWidth: 2.5,
      strokeStyle: 'solid',
      fill: '#a5d8ff',
      fillStyle: 'hachure',
      roughness: 1.4,
      text: 'User Request\n(Client App)',
      fontSize: 20,
      seed: 42
    };

    const processBox = {
      id: 'box_process',
      type: 'rectangle',
      x: 440,
      y: 200,
      width: 180,
      height: 90,
      stroke: '#1971c2',
      strokeWidth: 2.5,
      strokeStyle: 'solid',
      fill: '#b2f2bb',
      fillStyle: 'hachure',
      roughness: 1.4,
      text: 'ExcaliLite\n(Rough.js Engine)',
      fontSize: 20,
      seed: 99
    };

    const doneBox = {
      id: 'box_done',
      type: 'rectangle',
      x: 740,
      y: 200,
      width: 170,
      height: 90,
      stroke: '#2f9e44',
      strokeWidth: 2.5,
      strokeStyle: 'solid',
      fill: '#ffec99',
      fillStyle: 'hachure',
      roughness: 1.4,
      text: 'Saved Diagram\n(.JSON File)',
      fontSize: 20,
      seed: 123
    };

    const conn1 = createConnector(startBox, processBox, 0, 0, 0, 0);
    conn1.stroke = '#1e1e1e';
    conn1.strokeWidth = 2.5;

    const conn2 = createConnector(processBox, doneBox, 0, 0, 0, 0);
    conn2.stroke = '#1971c2';
    conn2.strokeWidth = 2.5;

    elements = [startBox, processBox, doneBox, conn1, conn2];
    resizeCanvas();
  }

  // Initialize
  initDemoDiagram();

})();
