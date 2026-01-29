// ============================================
// PIXEL EDITOR - Built-in Tile Creator
// ============================================

// Save guard - must be on window object to prevent double-click issues
window.pixelEditorSaveInProgress = false;

// Pixel editor state
let pixelEditorCanvas = null;
let pixelEditorCtx = null;
let pixelEditorPreview = null;
let pixelEditorPreviewCtx = null;
let pixelEditorData = null; // ImageData for the actual tile
let pixelEditorDataBackup = null; // Backup for shape preview
let pixelEditorTileSize = 16; // Will match current tileSize
let pixelEditorScale = 8; // Canvas display scale (256 / 32 = 8)
let pixelEditorTool = 'pencil';
let pixelEditorColor = '#4a90d9';
let pixelEditorIsDrawing = false;
let pixelEditorEditingKey = null; // Key of tile being edited (null = new tile)

// Shape tool state
let shapeStartX = 0;
let shapeStartY = 0;
let isDrawingShape = false;

// Animation/frame state
let pixelEditorFrames = []; // Array of ImageData for each frame
let pixelEditorCurrentFrame = 0;
let pixelEditorFps = 8; // Default animation speed
let pixelEditorAnimationPreview = null; // Interval for animation preview
let pixelEditorOnionSkin = false;

// Move tool state
let moveStartX = 0;
let moveStartY = 0;
let isMoving = false;

// Tile effect state
let pixelEditorEffect = 'none';
let pixelEditorEffectIntensity = 5;
let pixelEditorEffectSpeed = 5;
let pixelEditorEffectPreview = null; // Animation frame for effect preview

// Hitbox state
let pixelEditorHitbox = 'full';

// Hitbox presets - normalized values (0-1) relative to tile size
const hitboxPresets = {
    full:   { x: 0,   y: 0,   w: 1,   h: 1   },
    top:    { x: 0,   y: 0,   w: 1,   h: 0.5 },
    bottom: { x: 0,   y: 0.5, w: 1,   h: 0.5 },
    left:   { x: 0,   y: 0,   w: 0.5, h: 1   },
    right:  { x: 0.5, y: 0,   w: 0.5, h: 1   }
};

// Undo/redo history
let pixelEditorHistory = [];
let pixelEditorHistoryIndex = -1;
const pixelEditorMaxHistory = 50;

// ============================================
// HELP MODAL
// ============================================

const pixelEditorHelpContent = {
    overview: {
        title: '🎨 Custom Tile Editor',
        content: `
            <div class="pixel-help-section">
                <h4>What is this?</h4>
                <p>The Custom Tile Editor lets you create your own pixel art tiles to use in your game. Tiles are the building blocks of your game levels - walls, floors, platforms, decorations, and more!</p>
            </div>
            <div class="pixel-help-section">
                <h4>Basic Steps</h4>
                <ul>
                    <li><strong>Name your tile</strong> - Give it a descriptive name like "Brick Wall" or "Grass"</li>
                    <li><strong>Check "Solid"</strong> - If players and enemies should collide with it</li>
                    <li><strong>Draw your tile</strong> - Use the drawing tools to create your pixel art</li>
                    <li><strong>Add animation</strong> - Optional: add frames to animate the tile</li>
                    <li><strong>Add effects</strong> - Optional: make the tile sway, pulse, or shake</li>
                    <li><strong>Save</strong> - Your tile appears in the Custom Tiles palette</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Tips</h4>
                <ul>
                    <li>Right-click to erase while using any tool</li>
                    <li>Use <span class="help-shortcut">Ctrl+Z</span> to undo mistakes</li>
                    <li>Click the <strong>?</strong> buttons for section-specific help</li>
                </ul>
            </div>
        `
    },
    tools: {
        title: '🛠️ Drawing Tools',
        content: `
            <div class="pixel-help-section">
                <h4>Draw Tools</h4>
                <ul>
                    <li><span class="help-emoji">✏️</span><strong>Pencil</strong> <span class="help-shortcut">P</span> - Draw single pixels</li>
                    <li><span class="help-emoji">🧹</span><strong>Eraser</strong> <span class="help-shortcut">E</span> - Erase to transparent</li>
                    <li><span class="help-emoji">🪣</span><strong>Fill</strong> <span class="help-shortcut">F</span> - Fill connected areas with color</li>
                    <li><span class="help-emoji">💧</span><strong>Eyedropper</strong> <span class="help-shortcut">I</span> - Pick a color from the canvas</li>
                    <li><span class="help-emoji">✥</span><strong>Move</strong> <span class="help-shortcut">M</span> - Drag to reposition all pixels</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Shape Tools</h4>
                <ul>
                    <li><span class="help-emoji">📏</span><strong>Line</strong> <span class="help-shortcut">L</span> - Draw straight lines</li>
                    <li><span class="help-emoji">⬜</span><strong>Rectangle</strong> <span class="help-shortcut">R</span> - Draw rectangle outlines</li>
                    <li><span class="help-emoji">🟦</span><strong>Filled Rect</strong> <span class="help-shortcut">Shift+R</span> - Draw filled rectangles</li>
                    <li><span class="help-emoji">⭕</span><strong>Circle</strong> <span class="help-shortcut">C</span> - Draw circle outlines</li>
                    <li><span class="help-emoji">🔵</span><strong>Filled Circle</strong> <span class="help-shortcut">Shift+C</span> - Draw filled circles</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Transform Tools</h4>
                <ul>
                    <li><span class="help-emoji">↔️</span><strong>Flip Horizontal</strong> <span class="help-shortcut">H</span> - Mirror left-to-right</li>
                    <li><span class="help-emoji">↕️</span><strong>Flip Vertical</strong> <span class="help-shortcut">V</span> - Mirror top-to-bottom</li>
                    <li><span class="help-emoji">🪞</span><strong>Mirror Mode</strong> <span class="help-shortcut">W</span> - Toggle symmetrical drawing (draws on both sides)</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Edit Tools</h4>
                <ul>
                    <li><span class="help-emoji">↩️</span><strong>Undo</strong> <span class="help-shortcut">Ctrl+Z</span> - Undo last action</li>
                    <li><span class="help-emoji">↪️</span><strong>Redo</strong> <span class="help-shortcut">Ctrl+Y</span> - Redo undone action</li>
                    <li><span class="help-emoji">🗑️</span><strong>Clear</strong> - Erase entire canvas</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Move Tool Tips</h4>
                <p>When the Move tool is selected:</p>
                <ul>
                    <li>Click and drag to move all pixels</li>
                    <li>Use <span class="help-shortcut">Arrow Keys</span> to nudge 1 pixel at a time</li>
                    <li>Pixels wrap around to the other side</li>
                </ul>
            </div>
        `
    },
    animation: {
        title: '🎬 Animation Frames',
        content: `
            <div class="pixel-help-section">
                <h4>What are Animation Frames?</h4>
                <p>Animation frames let you create tiles that change over time, like flickering torches, flowing water, or blinking lights. Each frame is a separate image that plays in sequence.</p>
            </div>
            <div class="pixel-help-section">
                <h4>Frame Controls</h4>
                <ul>
                    <li><span class="help-emoji">◀</span><span class="help-emoji">▶</span><strong>Navigate</strong> <span class="help-shortcut">←</span><span class="help-shortcut">→</span> - Move between frames</li>
                    <li><span class="help-emoji">➕</span><strong>Add Frame</strong> - Create a new blank frame</li>
                    <li><span class="help-emoji">📋</span><strong>Duplicate</strong> - Copy current frame</li>
                    <li><span class="help-emoji">🗑️</span><strong>Delete</strong> - Remove current frame</li>
                    <li><span class="help-emoji">▶️</span><strong>Preview</strong> <span class="help-shortcut">Space</span> - Play/stop animation</li>
                    <li><span class="help-emoji">🧅</span><strong>Onion Skin</strong> - Show previous frame faintly (helps align frames)</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Animation Speed (FPS)</h4>
                <p>FPS = Frames Per Second. Higher FPS = faster animation.</p>
                <ul>
                    <li><strong>2-4 fps</strong> - Slow, subtle movement</li>
                    <li><strong>6-8 fps</strong> - Standard game animation speed</li>
                    <li><strong>12-24 fps</strong> - Fast, smooth animation</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Tips</h4>
                <ul>
                    <li>Start with 2 frames for simple effects (on/off states)</li>
                    <li>Use "Duplicate" to copy a frame, then make small changes</li>
                    <li>The animation preview updates in real-time as you draw!</li>
                    <li>Onion skinning helps keep objects aligned between frames</li>
                </ul>
            </div>
        `
    },
    effects: {
        title: '🌊 Tile Motion Effects',
        content: `
            <div class="pixel-help-section">
                <h4>What are Motion Effects?</h4>
                <p>Motion effects add procedural movement to your tiles <em>without</em> needing multiple animation frames. They're great for adding life to static tiles like grass swaying in the wind or crystals pulsing with energy.</p>
            </div>
            <div class="pixel-help-section">
                <h4>Available Effects</h4>
                <ul>
                    <li><span class="help-emoji">🌿</span><strong>Sway</strong> - Gentle rotation, like wind blowing trees/grass</li>
                    <li><span class="help-emoji">💫</span><strong>Pulse</strong> - Grow and shrink, like breathing or glowing</li>
                    <li><span class="help-emoji">⬆️</span><strong>Bounce</strong> - Subtle up/down bounce, for coins or items</li>
                    <li><span class="help-emoji">☁️</span><strong>Float</strong> - Slow vertical floating, for clouds or ghosts</li>
                    <li><span class="help-emoji">✨</span><strong>Shimmer</strong> - Sparkly scale variation, for gems or magic</li>
                    <li><span class="help-emoji">🌊</span><strong>Wave</strong> - Horizontal wave distortion, for water or flags</li>
                    <li><span class="help-emoji">📳</span><strong>Shake</strong> - Quick vibration, for danger or explosions</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Settings</h4>
                <ul>
                    <li><strong>Intensity</strong> - How much the effect moves (1 = subtle, 10 = dramatic)</li>
                    <li><strong>Speed</strong> - How fast the movement cycles (1 = slow, 10 = fast)</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Animation vs Effects</h4>
                <p>You can use both together! Animation frames change the actual image, while effects add movement on top. For example:</p>
                <ul>
                    <li>Torch: 2-frame fire animation + subtle shake effect</li>
                    <li>Crystal: Static image + pulse effect</li>
                    <li>Tree: Static image + sway effect</li>
                </ul>
            </div>
        `
    },
    hitbox: {
        title: '📦 Tile Hitbox',
        content: `
            <div class="pixel-help-section">
                <h4>What is a Hitbox?</h4>
                <p>The hitbox defines the solid collision area of your tile. By default, the entire tile is solid, but you can adjust this for special cases.</p>
            </div>
            <div class="pixel-help-section">
                <h4>Hitbox Options</h4>
                <ul>
                    <li><strong>Full Tile</strong> - The entire tile is solid (default)</li>
                    <li><strong>Top Half</strong> - Only the top half blocks collision</li>
                    <li><strong>Bottom Half</strong> - Only the bottom half blocks collision (great for platforms!)</li>
                    <li><strong>Left Half</strong> - Only the left half blocks collision</li>
                    <li><strong>Right Half</strong> - Only the right half blocks collision</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Common Use Cases</h4>
                <ul>
                    <li><span class="help-emoji">🌿</span><strong>Grass/flowers</strong> - Use "Bottom Half" so players walk through the top</li>
                    <li><span class="help-emoji">🪵</span><strong>Platforms</strong> - Use "Top Half" for thin walkable surfaces</li>
                    <li><span class="help-emoji">🌳</span><strong>Tree tops</strong> - Use non-solid or adjust hitbox for canopy tiles</li>
                    <li><span class="help-emoji">🧱</span><strong>Decorative trim</strong> - Use appropriate half for overhanging decorations</li>
                </ul>
            </div>
            <div class="pixel-help-section">
                <h4>Tips</h4>
                <ul>
                    <li>The hitbox only applies when "Solid" is checked</li>
                    <li>A purple overlay on the preview shows the collision area</li>
                    <li>Test your tiles in Play mode to verify collision feels right</li>
                </ul>
            </div>
        `
    }
};

// Show help modal with specific content
function showPixelEditorHelp(section) {
    const modal = document.getElementById('pixel-editor-help-modal');
    const titleEl = document.getElementById('pixel-help-title');
    const contentEl = document.getElementById('pixel-help-content');

    if (!modal || !titleEl || !contentEl) return;

    const help = pixelEditorHelpContent[section];
    if (!help) return;

    titleEl.textContent = help.title;
    contentEl.innerHTML = help.content;

    modal.classList.add('visible');
}

// Close help modal
function closePixelEditorHelp() {
    const modal = document.getElementById('pixel-editor-help-modal');
    if (modal) {
        modal.classList.remove('visible');
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate next available tile name (Custom 1, Custom 2, etc.)
function generateNextTileName() {
    // Find all existing "Custom N" names and get the highest number
    let maxNumber = 0;

    if (typeof customTiles !== 'undefined') {
        Object.values(customTiles).forEach(tile => {
            if (tile.name) {
                const match = tile.name.match(/^Custom\s+(\d+)$/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNumber) {
                        maxNumber = num;
                    }
                }
            }
        });
    }

    return 'Custom ' + (maxNumber + 1);
}

// ============================================
// FRAME MANAGEMENT
// ============================================

// Create a blank frame
function createBlankFrame() {
    const data = new ImageData(pixelEditorTileSize, pixelEditorTileSize);
    // Fill with transparent
    for (let i = 0; i < data.data.length; i += 4) {
        data.data[i] = 0;
        data.data[i + 1] = 0;
        data.data[i + 2] = 0;
        data.data[i + 3] = 0;
    }
    return data;
}

// Clone an ImageData
function cloneImageData(imageData) {
    const clone = new ImageData(imageData.width, imageData.height);
    clone.data.set(imageData.data);
    return clone;
}

// Save current frame to frames array
function saveCurrentFrameToArray() {
    if (pixelEditorData && pixelEditorFrames.length > 0) {
        pixelEditorFrames[pixelEditorCurrentFrame] = cloneImageData(pixelEditorData);
    }
}

// Load a frame into the editor
function loadFrameIntoEditor(frameIndex) {
    if (frameIndex < 0 || frameIndex >= pixelEditorFrames.length) return;

    // Save current frame first
    saveCurrentFrameToArray();

    // Load the new frame
    pixelEditorCurrentFrame = frameIndex;
    pixelEditorData = cloneImageData(pixelEditorFrames[frameIndex]);

    // Clear history when switching frames
    pixelEditorHistory = [];
    pixelEditorHistoryIndex = -1;
    savePixelEditorHistory();

    renderPixelEditor();
    updateFrameStripUI();
}

// Add a new frame
function addFrame() {
    // Save current frame first
    saveCurrentFrameToArray();

    // Create new blank frame and add after current
    const newFrame = createBlankFrame();
    pixelEditorFrames.splice(pixelEditorCurrentFrame + 1, 0, newFrame);

    // Switch to new frame
    loadFrameIntoEditor(pixelEditorCurrentFrame + 1);

    updateAnimationStatus();
    showToast(`Frame ${pixelEditorCurrentFrame + 1} added`, 'success');
}

// Duplicate current frame
function duplicateFrame() {
    // Save current frame first
    saveCurrentFrameToArray();

    // Clone current frame and add after
    const clone = cloneImageData(pixelEditorFrames[pixelEditorCurrentFrame]);
    pixelEditorFrames.splice(pixelEditorCurrentFrame + 1, 0, clone);

    // Switch to new frame
    loadFrameIntoEditor(pixelEditorCurrentFrame + 1);

    updateAnimationStatus();
    showToast(`Frame duplicated`, 'success');
}

// Delete current frame
function deleteFrame() {
    if (pixelEditorFrames.length <= 1) {
        showToast('Cannot delete the only frame', 'error');
        return;
    }

    pixelEditorFrames.splice(pixelEditorCurrentFrame, 1);

    // Adjust current frame index if needed
    if (pixelEditorCurrentFrame >= pixelEditorFrames.length) {
        pixelEditorCurrentFrame = pixelEditorFrames.length - 1;
    }

    // Load the (new) current frame
    pixelEditorData = cloneImageData(pixelEditorFrames[pixelEditorCurrentFrame]);

    // Clear history
    pixelEditorHistory = [];
    pixelEditorHistoryIndex = -1;
    savePixelEditorHistory();

    renderPixelEditor();
    updateFrameStripUI();
    updateAnimationStatus();
    showToast('Frame deleted', 'info');
}

// Navigate to previous frame
function prevFrame() {
    if (pixelEditorCurrentFrame > 0) {
        loadFrameIntoEditor(pixelEditorCurrentFrame - 1);
    }
}

// Navigate to next frame
function nextFrame() {
    if (pixelEditorCurrentFrame < pixelEditorFrames.length - 1) {
        loadFrameIntoEditor(pixelEditorCurrentFrame + 1);
    }
}

// Update the frame strip UI
function updateFrameStripUI() {
    const strip = document.getElementById('pixel-editor-frame-strip');
    if (!strip) return;

    strip.innerHTML = '';

    pixelEditorFrames.forEach((frame, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'frame-thumbnail' + (index === pixelEditorCurrentFrame ? ' active' : '');
        thumb.onclick = () => loadFrameIntoEditor(index);
        thumb.title = `Frame ${index + 1}`;

        // Create thumbnail canvas
        const canvas = document.createElement('canvas');
        canvas.width = pixelEditorTileSize;
        canvas.height = pixelEditorTileSize;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(frame, 0, 0);

        // Add frame number
        const label = document.createElement('span');
        label.className = 'frame-number';
        label.textContent = index + 1;

        thumb.appendChild(canvas);
        thumb.appendChild(label);
        strip.appendChild(thumb);
    });

    // Update frame counter
    const counter = document.getElementById('pixel-editor-frame-counter');
    if (counter) {
        counter.textContent = `${pixelEditorCurrentFrame + 1} / ${pixelEditorFrames.length}`;
    }
}

// Update animation status display
function updateAnimationStatus() {
    const status = document.getElementById('pixel-editor-anim-status');
    const fpsControl = document.getElementById('pixel-editor-fps-control');

    if (status) {
        if (pixelEditorFrames.length > 1) {
            status.innerHTML = `<span style="color: #2ecc71;">🎬 Animated Tile (${pixelEditorFrames.length} frames)</span>`;
            if (fpsControl) fpsControl.style.display = 'flex';
        } else {
            status.innerHTML = `<span style="color: #888;">Static Tile (1 frame)</span>`;
            if (fpsControl) fpsControl.style.display = 'none';
        }
    }
}

// Toggle animation preview
function toggleAnimationPreview() {
    if (pixelEditorAnimationPreview) {
        stopAnimationPreview();
    } else {
        startAnimationPreview();
    }
}

// Start animation preview
function startAnimationPreview() {
    if (pixelEditorFrames.length <= 1) {
        showToast('Add more frames to preview animation', 'info');
        return;
    }

    let previewFrame = 0;
    const interval = 1000 / pixelEditorFps;

    pixelEditorAnimationPreview = setInterval(() => {
        // For the current frame being edited, use live pixelEditorData
        // For other frames, use the saved frames array
        let frame;
        if (previewFrame === pixelEditorCurrentFrame && pixelEditorData) {
            frame = pixelEditorData;
        } else {
            frame = pixelEditorFrames[previewFrame];
        }

        if (frame) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = pixelEditorTileSize;
            tempCanvas.height = pixelEditorTileSize;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(frame, 0, 0);

            pixelEditorPreviewCtx.clearRect(0, 0, pixelEditorPreview.width, pixelEditorPreview.height);
            pixelEditorPreviewCtx.drawImage(tempCanvas, 0, 0);

            // Draw hitbox overlay during animation preview
            const solidCheckbox = document.getElementById('pixel-editor-solid');
            if (solidCheckbox && solidCheckbox.checked && pixelEditorHitbox && pixelEditorHitbox !== 'full') {
                const hb = hitboxPresets[pixelEditorHitbox];
                if (hb) {
                    const previewSize = pixelEditorPreview.width;
                    const x = hb.x * previewSize;
                    const y = hb.y * previewSize;
                    const w = hb.w * previewSize;
                    const h = hb.h * previewSize;
                    pixelEditorPreviewCtx.fillStyle = 'rgba(102, 126, 234, 0.3)';
                    pixelEditorPreviewCtx.fillRect(x, y, w, h);
                    pixelEditorPreviewCtx.strokeStyle = 'rgba(102, 126, 234, 0.8)';
                    pixelEditorPreviewCtx.lineWidth = 2;
                    pixelEditorPreviewCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);
                }
            }
        }

        previewFrame = (previewFrame + 1) % pixelEditorFrames.length;
    }, interval);

    // Update button
    const btn = document.getElementById('pixel-editor-preview-btn');
    if (btn) {
        btn.textContent = '⏹️';
        btn.title = 'Stop Preview';
    }
}

// Stop animation preview
function stopAnimationPreview() {
    if (pixelEditorAnimationPreview) {
        clearInterval(pixelEditorAnimationPreview);
        pixelEditorAnimationPreview = null;
    }

    // Restore preview to current frame
    updatePixelEditorPreview();

    // Update button
    const btn = document.getElementById('pixel-editor-preview-btn');
    if (btn) {
        btn.textContent = '▶️';
        btn.title = 'Preview Animation';
    }
}

// Update FPS
function updatePixelEditorFps(value) {
    pixelEditorFps = parseInt(value) || 8;
    const display = document.getElementById('pixel-editor-fps-value');
    if (display) display.textContent = pixelEditorFps + ' fps';

    // Restart preview if running
    if (pixelEditorAnimationPreview) {
        stopAnimationPreview();
        startAnimationPreview();
    }
}

// Toggle onion skinning
function toggleOnionSkin() {
    pixelEditorOnionSkin = !pixelEditorOnionSkin;
    const btn = document.getElementById('pixel-editor-onion-btn');
    if (btn) {
        btn.classList.toggle('active', pixelEditorOnionSkin);
    }
    renderPixelEditor();
}

// ============================================
// MOVE TOOL
// ============================================

// Move all pixels by offset
function movePixels(dx, dy) {
    if (!pixelEditorData) return;

    savePixelEditorHistory();

    const size = pixelEditorTileSize;
    const oldData = new Uint8ClampedArray(pixelEditorData.data);

    // Clear all pixels
    for (let i = 0; i < pixelEditorData.data.length; i++) {
        pixelEditorData.data[i] = 0;
    }

    // Copy pixels with offset (with wrapping)
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const srcI = (y * size + x) * 4;

            // Calculate new position (wrap around)
            let newX = (x + dx) % size;
            let newY = (y + dy) % size;
            if (newX < 0) newX += size;
            if (newY < 0) newY += size;

            const destI = (newY * size + newX) * 4;

            pixelEditorData.data[destI] = oldData[srcI];
            pixelEditorData.data[destI + 1] = oldData[srcI + 1];
            pixelEditorData.data[destI + 2] = oldData[srcI + 2];
            pixelEditorData.data[destI + 3] = oldData[srcI + 3];
        }
    }

    renderPixelEditor();
}

// Nudge pixels with arrow keys (for move tool)
function nudgePixels(direction) {
    switch (direction) {
        case 'up': movePixels(0, -1); break;
        case 'down': movePixels(0, 1); break;
        case 'left': movePixels(-1, 0); break;
        case 'right': movePixels(1, 0); break;
    }
}

// ============================================
// TILE EFFECTS
// ============================================

// Update tile effect settings from UI
function updateTileEffect() {
    const typeSelect = document.getElementById('pixel-editor-effect-type');
    const intensitySlider = document.getElementById('pixel-editor-effect-intensity');
    const speedSlider = document.getElementById('pixel-editor-effect-speed');
    const intensityValue = document.getElementById('pixel-editor-intensity-value');
    const speedValue = document.getElementById('pixel-editor-speed-value');
    const statusEl = document.getElementById('pixel-editor-effect-status');

    if (typeSelect) pixelEditorEffect = typeSelect.value;
    if (intensitySlider) {
        pixelEditorEffectIntensity = parseInt(intensitySlider.value);
        if (intensityValue) intensityValue.textContent = pixelEditorEffectIntensity;
    }
    if (speedSlider) {
        pixelEditorEffectSpeed = parseInt(speedSlider.value);
        if (speedValue) speedValue.textContent = pixelEditorEffectSpeed;
    }

    // Update status
    if (statusEl) {
        if (pixelEditorEffect === 'none') {
            statusEl.textContent = '(None)';
            statusEl.style.color = '#555';
        } else {
            const effectNames = {
                'sway': 'Sway',
                'pulse': 'Pulse',
                'bounce': 'Bounce',
                'float': 'Float',
                'shimmer': 'Shimmer',
                'wave': 'Wave',
                'shake': 'Shake'
            };
            statusEl.textContent = `(${effectNames[pixelEditorEffect]} active)`;
            statusEl.style.color = '#2ecc71';
        }
    }

    // Update effect preview if it's running
    if (pixelEditorEffectPreview) {
        stopEffectPreview();
        startEffectPreview();
    }
}

// Toggle effect preview animation
function toggleEffectPreview() {
    if (pixelEditorEffectPreview) {
        stopEffectPreview();
    } else {
        startEffectPreview();
    }
}

// Start effect preview
function startEffectPreview() {
    if (pixelEditorEffect === 'none') {
        showToast('Select an effect to preview', 'info');
        return;
    }

    const canvas = document.getElementById('pixel-editor-effect-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const time = elapsed / 1000; // Time in seconds
        const speed = pixelEditorEffectSpeed / 5; // Normalize around 1
        const intensity = pixelEditorEffectIntensity / 5; // Normalize around 1

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context
        ctx.save();

        // Move to center for transformations
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.translate(cx, cy);

        // Apply effect transformation
        switch (pixelEditorEffect) {
            case 'sway':
                // Rotate back and forth (pivot from bottom)
                const swayAngle = Math.sin(time * speed * 3) * 0.15 * intensity;
                ctx.translate(0, canvas.height / 2 - 4); // Move pivot to bottom
                ctx.rotate(swayAngle);
                ctx.translate(0, -(canvas.height / 2 - 4));
                break;

            case 'pulse':
                // Scale up and down
                const pulseScale = 1 + Math.sin(time * speed * 4) * 0.1 * intensity;
                ctx.scale(pulseScale, pulseScale);
                break;

            case 'bounce':
                // Move up and down
                const bounceY = -Math.abs(Math.sin(time * speed * 5)) * 4 * intensity;
                ctx.translate(0, bounceY);
                break;

            case 'float':
                // Gentle up and down floating
                const floatY = Math.sin(time * speed * 2) * 3 * intensity;
                ctx.translate(0, floatY);
                break;

            case 'shimmer':
                // Alpha pulsing (handled in draw)
                const shimmerAlpha = 0.7 + Math.sin(time * speed * 6) * 0.3 * intensity;
                ctx.globalAlpha = shimmerAlpha;
                break;

            case 'wave':
                // Horizontal wave distortion (simplified as skew)
                const waveSkew = Math.sin(time * speed * 4) * 0.1 * intensity;
                ctx.transform(1, 0, waveSkew, 1, 0, 0);
                break;

            case 'shake':
                // Random shake
                const shakeX = (Math.random() - 0.5) * 4 * intensity;
                const shakeY = (Math.random() - 0.5) * 4 * intensity;
                ctx.translate(shakeX, shakeY);
                break;
        }

        // Draw the tile preview
        if (pixelEditorData) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = pixelEditorTileSize;
            tempCanvas.height = pixelEditorTileSize;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(pixelEditorData, 0, 0);

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tempCanvas, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        }

        ctx.restore();

        pixelEditorEffectPreview = requestAnimationFrame(animate);
    }

    animate();

    // Update button
    const btn = document.getElementById('effect-preview-btn');
    if (btn) {
        btn.textContent = '⏹️';
        btn.title = 'Stop Preview';
    }
}

// Stop effect preview
function stopEffectPreview() {
    if (pixelEditorEffectPreview) {
        cancelAnimationFrame(pixelEditorEffectPreview);
        pixelEditorEffectPreview = null;
    }

    // Draw static preview
    updateEffectPreviewStatic();

    // Update button
    const btn = document.getElementById('effect-preview-btn');
    if (btn) {
        btn.textContent = '▶️';
        btn.title = 'Preview Effect';
    }
}

// Update the effect preview canvas with current tile (static, no animation)
// Called from renderPixelEditor() to keep effect preview in sync with changes
function updateEffectPreviewStatic() {
    // Don't update if effect animation is running - it handles its own updates
    if (pixelEditorEffectPreview) return;

    const canvas = document.getElementById('pixel-editor-effect-preview');
    if (!canvas || !pixelEditorData) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = pixelEditorTileSize;
    tempCanvas.height = pixelEditorTileSize;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(pixelEditorData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
}

// Reset effect settings
function resetEffectSettings() {
    pixelEditorEffect = 'none';
    pixelEditorEffectIntensity = 5;
    pixelEditorEffectSpeed = 5;

    const typeSelect = document.getElementById('pixel-editor-effect-type');
    const intensitySlider = document.getElementById('pixel-editor-effect-intensity');
    const speedSlider = document.getElementById('pixel-editor-effect-speed');
    const intensityValue = document.getElementById('pixel-editor-intensity-value');
    const speedValue = document.getElementById('pixel-editor-speed-value');
    const statusEl = document.getElementById('pixel-editor-effect-status');

    if (typeSelect) typeSelect.value = 'none';
    if (intensitySlider) intensitySlider.value = 5;
    if (speedSlider) speedSlider.value = 5;
    if (intensityValue) intensityValue.textContent = '5';
    if (speedValue) speedValue.textContent = '5';
    if (statusEl) {
        statusEl.textContent = '(None)';
        statusEl.style.color = '#555';
    }
}

// Load effect settings from tile data
function loadEffectSettings(tileData) {
    if (tileData.effect) {
        pixelEditorEffect = tileData.effect;
        pixelEditorEffectIntensity = tileData.effectIntensity || 5;
        pixelEditorEffectSpeed = tileData.effectSpeed || 5;

        const typeSelect = document.getElementById('pixel-editor-effect-type');
        const intensitySlider = document.getElementById('pixel-editor-effect-intensity');
        const speedSlider = document.getElementById('pixel-editor-effect-speed');

        if (typeSelect) typeSelect.value = pixelEditorEffect;
        if (intensitySlider) intensitySlider.value = pixelEditorEffectIntensity;
        if (speedSlider) speedSlider.value = pixelEditorEffectSpeed;

        updateTileEffect();
    } else {
        resetEffectSettings();
    }
}

// ============================================
// HITBOX FUNCTIONS
// ============================================

// Show/hide hitbox dropdown based on solid checkbox
function updateHitboxVisibility() {
    const solidCheckbox = document.getElementById('pixel-editor-solid');
    const hitboxContainer = document.getElementById('pixel-editor-hitbox-container');

    if (hitboxContainer) {
        hitboxContainer.style.display = solidCheckbox && solidCheckbox.checked ? 'flex' : 'none';
    }
    updateHitboxPreview();
}

// Update the hitbox preview overlay on the preview canvas
function updateHitboxPreview() {
    const select = document.getElementById('pixel-editor-hitbox');
    if (select) {
        pixelEditorHitbox = select.value;
    }
    // Re-render to show hitbox overlay
    renderPixelEditor();
}

// Reset hitbox settings to default
function resetHitboxSettings() {
    pixelEditorHitbox = 'full';

    const select = document.getElementById('pixel-editor-hitbox');
    if (select) select.value = 'full';

    updateHitboxVisibility();
}

// Load hitbox settings from tile data
function loadHitboxSettings(tileData) {
    if (tileData.hitbox) {
        pixelEditorHitbox = tileData.hitbox;

        const select = document.getElementById('pixel-editor-hitbox');
        if (select) select.value = pixelEditorHitbox;
    } else {
        resetHitboxSettings();
    }
    updateHitboxVisibility();
}

// ============================================
// INITIALIZATION
// ============================================

function initPixelEditor() {
    pixelEditorCanvas = document.getElementById('pixel-editor-canvas');
    pixelEditorPreview = document.getElementById('pixel-editor-preview');

    if (!pixelEditorCanvas || !pixelEditorPreview) return;

    pixelEditorCtx = pixelEditorCanvas.getContext('2d');
    pixelEditorPreviewCtx = pixelEditorPreview.getContext('2d');

    // Disable image smoothing for crisp pixels
    pixelEditorCtx.imageSmoothingEnabled = false;
    pixelEditorPreviewCtx.imageSmoothingEnabled = false;

    // Set up event listeners
    pixelEditorCanvas.addEventListener('mousedown', onPixelEditorMouseDown);
    pixelEditorCanvas.addEventListener('mousemove', onPixelEditorMouseMove);
    pixelEditorCanvas.addEventListener('mouseup', onPixelEditorMouseUp);
    // Use document-level listeners for shape tools to handle drag outside canvas
    document.addEventListener('mousemove', onPixelEditorDocumentMouseMove);
    document.addEventListener('mouseup', onPixelEditorDocumentMouseUp);
    pixelEditorCanvas.addEventListener('contextmenu', e => e.preventDefault());

    // Color picker change
    const colorInput = document.getElementById('pixel-editor-color');
    if (colorInput) {
        colorInput.addEventListener('input', e => {
            pixelEditorColor = e.target.value;
            // Update color preview swatch and hex display
            updateColorPreview(pixelEditorColor);
            // Update used colors palette to reflect selection
            updateUsedColorsPalette();
        });
    }

    // Save button - use timestamp debounce to prevent double-click issues
    const saveBtn = document.getElementById('pixel-editor-save-btn');
    if (saveBtn && !saveBtn.hasAttribute('data-listener-added')) {
        saveBtn.setAttribute('data-listener-added', 'true');
        let lastClickTime = 0;
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const now = Date.now();
            if (now - lastClickTime < 500) return;
            lastClickTime = now;
            saveCustomTile();
        });
    }

    // Keyboard shortcuts when modal is open
    document.addEventListener('keydown', onPixelEditorKeyDown);
}

// ============================================
// MODAL OPEN/CLOSE
// ============================================

function openPixelEditor(editKey = null) {
    pixelEditorEditingKey = editKey;

    // Ensure initialization (in case DOMContentLoaded ran before modal was in DOM)
    if (!pixelEditorCanvas || !pixelEditorCtx) {
        initPixelEditor();
    }

    // Stop any running previews
    stopAnimationPreview();
    stopEffectPreview();

    // Match current tile size from main editor
    pixelEditorTileSize = tileSize || 32;
    pixelEditorScale = Math.floor(256 / pixelEditorTileSize);

    // Update canvas size
    const canvasSize = pixelEditorTileSize * pixelEditorScale;
    pixelEditorCanvas.width = canvasSize;
    pixelEditorCanvas.height = canvasSize;

    // Update preview canvas size
    pixelEditorPreview.width = pixelEditorTileSize;
    pixelEditorPreview.height = pixelEditorTileSize;

    // Update size display
    document.getElementById('pixel-editor-size').textContent =
        `${pixelEditorTileSize}×${pixelEditorTileSize}`;

    // Clear history first (before loading data)
    pixelEditorHistory = [];
    pixelEditorHistoryIndex = -1;

    // Reset animation state
    pixelEditorFrames = [];
    pixelEditorCurrentFrame = 0;
    pixelEditorOnionSkin = false;

    // Initialize or load pixel data
    if (editKey && customTiles[editKey]) {
        // Editing existing tile
        document.getElementById('pixel-editor-title').textContent = 'Edit Custom Tile';
        document.getElementById('pixel-editor-name').value = customTiles[editKey].name || '';
        document.getElementById('pixel-editor-solid').checked = customTiles[editKey].solid !== false;

        // Load FPS if saved
        if (customTiles[editKey].fps) {
            pixelEditorFps = customTiles[editKey].fps;
            const fpsSlider = document.getElementById('pixel-editor-fps');
            const fpsValue = document.getElementById('pixel-editor-fps-value');
            if (fpsSlider) fpsSlider.value = pixelEditorFps;
            if (fpsValue) fpsValue.textContent = pixelEditorFps + ' fps';
        } else {
            pixelEditorFps = 8;
        }

        // Load existing tile (handles both static and animated)
        loadTileIntoEditor(customTiles[editKey]);

        // Load effect settings
        loadEffectSettings(customTiles[editKey]);

        // Load hitbox settings
        loadHitboxSettings(customTiles[editKey]);
    } else {
        // Creating new tile
        document.getElementById('pixel-editor-title').textContent = 'Create Custom Tile';
        document.getElementById('pixel-editor-name').value = generateNextTileName();
        document.getElementById('pixel-editor-solid').checked = true;
        pixelEditorFps = 8;

        // Reset FPS slider
        const fpsSlider = document.getElementById('pixel-editor-fps');
        const fpsValue = document.getElementById('pixel-editor-fps-value');
        if (fpsSlider) fpsSlider.value = 8;
        if (fpsValue) fpsValue.textContent = '8 fps';

        // Create blank canvas
        pixelEditorData = pixelEditorCtx.createImageData(pixelEditorTileSize, pixelEditorTileSize);
        // Fill with transparent
        for (let i = 0; i < pixelEditorData.data.length; i += 4) {
            pixelEditorData.data[i] = 0;
            pixelEditorData.data[i + 1] = 0;
            pixelEditorData.data[i + 2] = 0;
            pixelEditorData.data[i + 3] = 0;
        }

        // Initialize frames array with the blank frame
        pixelEditorFrames = [cloneImageData(pixelEditorData)];

        // Save initial state to history (only for new tiles - existing tiles do this in loadTileIntoEditor)
        savePixelEditorHistory();

        // Render and update frame strip
        renderPixelEditor();
        updateFrameStripUI();
        updateAnimationStatus();

        // Reset effect settings for new tile
        resetEffectSettings();

        // Reset hitbox settings for new tile
        resetHitboxSettings();
    }

    // Reset tool
    selectPixelTool('pencil');

    // Reset mirror mode
    pixelEditorMirrorMode = false;
    const mirrorBtn = document.getElementById('tool-mirror-toggle');
    if (mirrorBtn) {
        mirrorBtn.classList.remove('active');
        mirrorBtn.title = 'Mirror Mode OFF (W) - Click to enable';
    }

    // Reset onion skin button state
    const onionBtn = document.getElementById('pixel-editor-onion-btn');
    if (onionBtn) onionBtn.classList.remove('active');

    // Initialize color preview swatch to match current color
    updateColorPreview(pixelEditorColor);

    // Show modal
    document.getElementById('pixel-editor-modal').classList.add('visible');
}

function closePixelEditor() {
    // Stop previews if running
    stopAnimationPreview();
    stopEffectPreview();

    document.getElementById('pixel-editor-modal').classList.remove('visible');
    pixelEditorEditingKey = null;

    // Reset save guard and re-enable button
    window.pixelEditorSaveInProgress = false;
    const saveBtn = document.getElementById('pixel-editor-save-btn');
    if (saveBtn) saveBtn.disabled = false;
}

function loadTileIntoEditor(tileData) {
    // Handle both old format (dataURL string) and new format (tile object)
    if (typeof tileData === 'string') {
        // Legacy: just a dataURL string
        loadSingleFrameFromDataURL(tileData, true);
    } else if (tileData.frames && Array.isArray(tileData.frames) && tileData.frames.length > 0) {
        // Animated tile with multiple frames
        loadAnimatedFrames(tileData.frames);
    } else if (tileData.dataURL) {
        // Static tile with dataURL
        loadSingleFrameFromDataURL(tileData.dataURL, true);
    }
}

// Load a single frame from dataURL
function loadSingleFrameFromDataURL(dataURL, isInitial = false) {
    const img = new Image();
    img.onload = () => {
        // Create temporary canvas to get image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pixelEditorTileSize;
        tempCanvas.height = pixelEditorTileSize;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, pixelEditorTileSize, pixelEditorTileSize);

        pixelEditorData = tempCtx.getImageData(0, 0, pixelEditorTileSize, pixelEditorTileSize);

        // Initialize frames array with this frame
        if (isInitial) {
            pixelEditorFrames = [cloneImageData(pixelEditorData)];
            pixelEditorCurrentFrame = 0;
        }

        // Save initial state to history (after async load completes)
        savePixelEditorHistory();

        renderPixelEditor();
        updateFrameStripUI();
        updateAnimationStatus();
    };
    img.src = dataURL;
}

// Load multiple frames for animated tile
function loadAnimatedFrames(frameDataURLs) {
    let loadedCount = 0;
    const totalFrames = frameDataURLs.length;
    pixelEditorFrames = new Array(totalFrames);

    frameDataURLs.forEach((dataURL, index) => {
        const img = new Image();
        img.onload = () => {
            // Create temporary canvas to get image data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = pixelEditorTileSize;
            tempCanvas.height = pixelEditorTileSize;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0, pixelEditorTileSize, pixelEditorTileSize);

            pixelEditorFrames[index] = tempCtx.getImageData(0, 0, pixelEditorTileSize, pixelEditorTileSize);
            loadedCount++;

            // Once all frames are loaded, set up the editor
            if (loadedCount === totalFrames) {
                pixelEditorCurrentFrame = 0;
                pixelEditorData = cloneImageData(pixelEditorFrames[0]);

                // Save initial state to history
                savePixelEditorHistory();

                renderPixelEditor();
                updateFrameStripUI();
                updateAnimationStatus();
            }
        };
        img.src = dataURL;
    });
}

// ============================================
// RENDERING
// ============================================

function renderPixelEditor() {
    if (!pixelEditorCtx || !pixelEditorData) return;

    // Clear canvas with transparency checker pattern (done via CSS)
    pixelEditorCtx.clearRect(0, 0, pixelEditorCanvas.width, pixelEditorCanvas.height);

    // Draw onion skin (previous frame) if enabled and we have previous frames
    if (pixelEditorOnionSkin && pixelEditorCurrentFrame > 0 && pixelEditorFrames.length > 1) {
        const prevFrame = pixelEditorFrames[pixelEditorCurrentFrame - 1];
        if (prevFrame) {
            // Draw previous frame with red tint and lower opacity
            for (let y = 0; y < pixelEditorTileSize; y++) {
                for (let x = 0; x < pixelEditorTileSize; x++) {
                    const i = (y * pixelEditorTileSize + x) * 4;
                    const r = prevFrame.data[i];
                    const g = prevFrame.data[i + 1];
                    const b = prevFrame.data[i + 2];
                    const a = prevFrame.data[i + 3];

                    if (a > 0) {
                        // Tint toward red for visibility
                        const tintedR = Math.min(255, r + 80);
                        const tintedG = Math.max(0, g - 40);
                        const tintedB = Math.max(0, b - 40);
                        pixelEditorCtx.fillStyle = `rgba(${tintedR}, ${tintedG}, ${tintedB}, ${(a / 255) * 0.35})`;
                        pixelEditorCtx.fillRect(
                            x * pixelEditorScale,
                            y * pixelEditorScale,
                            pixelEditorScale,
                            pixelEditorScale
                        );
                    }
                }
            }
        }
    }

    // Draw scaled pixels (current frame)
    for (let y = 0; y < pixelEditorTileSize; y++) {
        for (let x = 0; x < pixelEditorTileSize; x++) {
            const i = (y * pixelEditorTileSize + x) * 4;
            const r = pixelEditorData.data[i];
            const g = pixelEditorData.data[i + 1];
            const b = pixelEditorData.data[i + 2];
            const a = pixelEditorData.data[i + 3];

            if (a > 0) {
                pixelEditorCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                pixelEditorCtx.fillRect(
                    x * pixelEditorScale,
                    y * pixelEditorScale,
                    pixelEditorScale,
                    pixelEditorScale
                );
            }
        }
    }

    // Draw grid
    pixelEditorCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    pixelEditorCtx.lineWidth = 1;
    for (let i = 0; i <= pixelEditorTileSize; i++) {
        // Vertical lines
        pixelEditorCtx.beginPath();
        pixelEditorCtx.moveTo(i * pixelEditorScale + 0.5, 0);
        pixelEditorCtx.lineTo(i * pixelEditorScale + 0.5, pixelEditorCanvas.height);
        pixelEditorCtx.stroke();
        // Horizontal lines
        pixelEditorCtx.beginPath();
        pixelEditorCtx.moveTo(0, i * pixelEditorScale + 0.5);
        pixelEditorCtx.lineTo(pixelEditorCanvas.width, i * pixelEditorScale + 0.5);
        pixelEditorCtx.stroke();
    }

    // Update preview
    updatePixelEditorPreview();

    // Update effect preview (keeps it in sync with canvas changes)
    updateEffectPreviewStatic();

    // Update used colors palette
    updateUsedColorsPalette();
}

function updatePixelEditorPreview() {
    if (!pixelEditorPreviewCtx || !pixelEditorData) return;

    // Create temporary canvas with pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = pixelEditorTileSize;
    tempCanvas.height = pixelEditorTileSize;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(pixelEditorData, 0, 0);

    // Draw to preview
    pixelEditorPreviewCtx.clearRect(0, 0, pixelEditorPreview.width, pixelEditorPreview.height);
    pixelEditorPreviewCtx.drawImage(tempCanvas, 0, 0);

    // Draw hitbox overlay if solid and not full hitbox
    const solidCheckbox = document.getElementById('pixel-editor-solid');
    if (solidCheckbox && solidCheckbox.checked && pixelEditorHitbox && pixelEditorHitbox !== 'full') {
        const hb = hitboxPresets[pixelEditorHitbox];
        if (hb) {
            const previewSize = pixelEditorPreview.width;
            const x = hb.x * previewSize;
            const y = hb.y * previewSize;
            const w = hb.w * previewSize;
            const h = hb.h * previewSize;

            // Draw semi-transparent overlay for the hitbox area
            pixelEditorPreviewCtx.fillStyle = 'rgba(102, 126, 234, 0.3)';
            pixelEditorPreviewCtx.fillRect(x, y, w, h);

            // Draw border around hitbox
            pixelEditorPreviewCtx.strokeStyle = 'rgba(102, 126, 234, 0.8)';
            pixelEditorPreviewCtx.lineWidth = 2;
            pixelEditorPreviewCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        }
    }
}

// ============================================
// DRAWING TOOLS
// ============================================

function selectPixelTool(tool) {
    pixelEditorTool = tool;

    // Cancel any in-progress shape drawing
    if (isDrawingShape) {
        isDrawingShape = false;
        if (pixelEditorDataBackup) {
            restorePixelData();
            pixelEditorDataBackup = null;
            renderPixelEditor();
        }
    }

    // Update button states
    document.querySelectorAll('.pixel-tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`tool-${tool}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update cursor
    switch (tool) {
        case 'eyedropper':
            pixelEditorCanvas.style.cursor = 'copy';
            break;
        case 'fill':
            pixelEditorCanvas.style.cursor = 'cell';
            break;
        case 'move':
            pixelEditorCanvas.style.cursor = 'move';
            break;
        default:
            pixelEditorCanvas.style.cursor = 'crosshair';
    }
}

function getPixelCoords(e) {
    const rect = pixelEditorCanvas.getBoundingClientRect();
    const scaleX = pixelEditorCanvas.width / rect.width;
    const scaleY = pixelEditorCanvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / pixelEditorScale);
    const y = Math.floor((e.clientY - rect.top) * scaleY / pixelEditorScale);
    return { x: Math.max(0, Math.min(x, pixelEditorTileSize - 1)),
             y: Math.max(0, Math.min(y, pixelEditorTileSize - 1)) };
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= pixelEditorTileSize || y < 0 || y >= pixelEditorTileSize) return;
    const i = (y * pixelEditorTileSize + x) * 4;
    pixelEditorData.data[i] = r;
    pixelEditorData.data[i + 1] = g;
    pixelEditorData.data[i + 2] = b;
    pixelEditorData.data[i + 3] = a;
}

function getPixel(x, y) {
    if (x < 0 || x >= pixelEditorTileSize || y < 0 || y >= pixelEditorTileSize) return null;
    const i = (y * pixelEditorTileSize + x) * 4;
    return {
        r: pixelEditorData.data[i],
        g: pixelEditorData.data[i + 1],
        b: pixelEditorData.data[i + 2],
        a: pixelEditorData.data[i + 3]
    };
}

function drawPixel(x, y, erase = false) {
    if (erase) {
        setPixel(x, y, 0, 0, 0, 0);
    } else {
        const color = hexToRgb(pixelEditorColor);
        setPixel(x, y, color.r, color.g, color.b, 255);
    }
}

// ============================================
// FILL TOOL (Flood Fill)
// ============================================

function pixelEditorFloodFill(startX, startY) {
    // Defensive check
    if (!pixelEditorData) return;

    const targetColor = getPixel(startX, startY);
    if (!targetColor) return;

    const fillColor = hexToRgb(pixelEditorColor);

    // Check if already same color
    if (targetColor.r === fillColor.r &&
        targetColor.g === fillColor.g &&
        targetColor.b === fillColor.b &&
        targetColor.a === 255) {
        return;
    }

    const stack = [[startX, startY]];
    const visited = new Set();
    let pixelsFilled = 0;

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        if (x < 0 || x >= pixelEditorTileSize || y < 0 || y >= pixelEditorTileSize) continue;

        const pixel = getPixel(x, y);
        if (!pixel) continue;

        // Check if this pixel matches target color
        if (pixel.r !== targetColor.r ||
            pixel.g !== targetColor.g ||
            pixel.b !== targetColor.b ||
            pixel.a !== targetColor.a) {
            continue;
        }

        visited.add(key);
        setPixel(x, y, fillColor.r, fillColor.g, fillColor.b, 255);
        pixelsFilled++;

        // Add neighbors
        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
    }
}

// ============================================
// SHAPE TOOLS
// ============================================

// Check if current tool is a shape tool
function isShapeTool(tool) {
    return ['line', 'rect', 'rect-fill', 'circle', 'circle-fill'].includes(tool);
}

// Backup pixel data for shape preview
function backupPixelData() {
    if (!pixelEditorData) return;
    pixelEditorDataBackup = new Uint8ClampedArray(pixelEditorData.data);
}

// Restore pixel data from backup (cancel shape preview)
function restorePixelData() {
    if (!pixelEditorData || !pixelEditorDataBackup) return;
    pixelEditorData.data.set(pixelEditorDataBackup);
}

// Draw line using Bresenham's algorithm
function drawLine(x0, y0, x1, y1, erase = false) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        drawPixel(x0, y0, erase);

        if (x0 === x1 && y0 === y1) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

// Draw rectangle outline
function drawRect(x0, y0, x1, y1, erase = false) {
    // Ensure x0,y0 is top-left and x1,y1 is bottom-right
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);

    // Draw four lines
    drawLine(left, top, right, top, erase);      // Top
    drawLine(left, bottom, right, bottom, erase); // Bottom
    drawLine(left, top, left, bottom, erase);     // Left
    drawLine(right, top, right, bottom, erase);   // Right
}

// Draw filled rectangle
function drawRectFilled(x0, y0, x1, y1, erase = false) {
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);

    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            drawPixel(x, y, erase);
        }
    }
}

// Draw circle outline using midpoint algorithm
function drawCircle(cx, cy, ex, ey, erase = false) {
    // Calculate radius from center to edge point
    const rx = Math.abs(ex - cx);
    const ry = Math.abs(ey - cy);
    const r = Math.max(rx, ry);

    if (r === 0) {
        drawPixel(cx, cy, erase);
        return;
    }

    // Midpoint circle algorithm
    let x = r;
    let y = 0;
    let err = 1 - r;

    while (x >= y) {
        // Draw 8 symmetric points
        drawPixel(cx + x, cy + y, erase);
        drawPixel(cx - x, cy + y, erase);
        drawPixel(cx + x, cy - y, erase);
        drawPixel(cx - x, cy - y, erase);
        drawPixel(cx + y, cy + x, erase);
        drawPixel(cx - y, cy + x, erase);
        drawPixel(cx + y, cy - x, erase);
        drawPixel(cx - y, cy - x, erase);

        y++;
        if (err < 0) {
            err += 2 * y + 1;
        } else {
            x--;
            err += 2 * (y - x) + 1;
        }
    }
}

// Draw filled circle
function drawCircleFilled(cx, cy, ex, ey, erase = false) {
    const rx = Math.abs(ex - cx);
    const ry = Math.abs(ey - cy);
    const r = Math.max(rx, ry);

    if (r === 0) {
        drawPixel(cx, cy, erase);
        return;
    }

    // Fill circle by drawing horizontal lines
    for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r) {
                drawPixel(cx + x, cy + y, erase);
            }
        }
    }
}

// Draw shape based on current tool
function drawShape(x0, y0, x1, y1, erase = false) {
    switch (pixelEditorTool) {
        case 'line':
            drawLine(x0, y0, x1, y1, erase);
            break;
        case 'rect':
            drawRect(x0, y0, x1, y1, erase);
            break;
        case 'rect-fill':
            drawRectFilled(x0, y0, x1, y1, erase);
            break;
        case 'circle':
            drawCircle(x0, y0, x1, y1, erase);
            break;
        case 'circle-fill':
            drawCircleFilled(x0, y0, x1, y1, erase);
            break;
    }
}

// ============================================
// EYEDROPPER TOOL
// ============================================

function pickColor(x, y) {
    const pixel = getPixel(x, y);
    if (pixel && pixel.a > 0) {
        pixelEditorColor = rgbToHex(pixel.r, pixel.g, pixel.b);
        document.getElementById('pixel-editor-color').value = pixelEditorColor;
        // Switch back to pencil after picking
        selectPixelTool('pencil');
    }
}

// ============================================
// MOUSE EVENTS
// ============================================

function onPixelEditorMouseDown(e) {
    e.preventDefault();

    // Defensive check - can't draw if no data exists yet (e.g., image still loading)
    if (!pixelEditorData) return;

    const { x, y } = getPixelCoords(e);

    if (pixelEditorTool === 'eyedropper') {
        pickColor(x, y);
        return;
    }

    // Move tool - start tracking drag
    if (pixelEditorTool === 'move') {
        isMoving = true;
        moveStartX = x;
        moveStartY = y;
        savePixelEditorHistory();
        return;
    }

    if (pixelEditorTool === 'fill') {
        savePixelEditorHistory();
        if (e.button === 2) {
            // Right-click fill with transparent
            const targetColor = getPixel(x, y);
            if (targetColor) {
                const oldColor = pixelEditorColor;
                pixelEditorColor = '#000000';
                // Special fill to transparent
                pixelEditorFloodFillTransparent(x, y);
                pixelEditorColor = oldColor;
            }
        } else {
            pixelEditorFloodFill(x, y);
        }
        renderPixelEditor();
        return;
    }

    // Shape tools
    if (isShapeTool(pixelEditorTool)) {
        isDrawingShape = true;
        shapeStartX = x;
        shapeStartY = y;
        savePixelEditorHistory();
        backupPixelData();
        // Draw initial point
        const erase = e.button === 2;
        drawShape(x, y, x, y, erase);
        renderPixelEditor();
        return;
    }

    // Pencil or Eraser
    pixelEditorIsDrawing = true;
    savePixelEditorHistory();

    const erase = e.button === 2 || pixelEditorTool === 'eraser';
    // Use mirror drawing for pencil tool if mirror mode is enabled
    if (pixelEditorTool === 'pencil' && pixelEditorMirrorMode) {
        drawPixelWithMirror(x, y, erase);
    } else {
        drawPixel(x, y, erase);
    }
    renderPixelEditor();
}

function onPixelEditorMouseMove(e) {
    const { x, y } = getPixelCoords(e);

    // Move tool - drag to move content
    if (isMoving && pixelEditorTool === 'move') {
        const dx = x - moveStartX;
        const dy = y - moveStartY;

        if (dx !== 0 || dy !== 0) {
            // Move without saving history (already saved on mousedown)
            const size = pixelEditorTileSize;
            const oldData = new Uint8ClampedArray(pixelEditorData.data);

            // Clear all pixels
            for (let i = 0; i < pixelEditorData.data.length; i++) {
                pixelEditorData.data[i] = 0;
            }

            // Copy pixels with offset (with wrapping)
            for (let py = 0; py < size; py++) {
                for (let px = 0; px < size; px++) {
                    const srcI = (py * size + px) * 4;

                    // Calculate new position (wrap around)
                    let newX = (px + dx) % size;
                    let newY = (py + dy) % size;
                    if (newX < 0) newX += size;
                    if (newY < 0) newY += size;

                    const destI = (newY * size + newX) * 4;

                    pixelEditorData.data[destI] = oldData[srcI];
                    pixelEditorData.data[destI + 1] = oldData[srcI + 1];
                    pixelEditorData.data[destI + 2] = oldData[srcI + 2];
                    pixelEditorData.data[destI + 3] = oldData[srcI + 3];
                }
            }

            // Update start position for next movement
            moveStartX = x;
            moveStartY = y;
            renderPixelEditor();
        }
        return;
    }

    // Shape tool preview
    if (isDrawingShape && isShapeTool(pixelEditorTool)) {
        // Restore from backup before drawing new preview
        restorePixelData();
        const erase = e.buttons === 2;
        drawShape(shapeStartX, shapeStartY, x, y, erase);
        renderPixelEditor();
        return;
    }

    // Pencil/eraser continuous drawing
    if (!pixelEditorIsDrawing) return;

    const erase = e.buttons === 2 || pixelEditorTool === 'eraser';
    // Use mirror drawing for pencil tool if mirror mode is enabled
    if (pixelEditorTool === 'pencil' && pixelEditorMirrorMode) {
        drawPixelWithMirror(x, y, erase);
    } else {
        drawPixel(x, y, erase);
    }
    renderPixelEditor();
}

function onPixelEditorMouseUp(e) {
    // Stop move tool
    if (isMoving) {
        isMoving = false;
        return;
    }

    // Finalize shape
    if (isDrawingShape && isShapeTool(pixelEditorTool)) {
        isDrawingShape = false;
        pixelEditorDataBackup = null;
        // Shape is already drawn from last mousemove, just clear backup
        return;
    }

    pixelEditorIsDrawing = false;
}

// Document-level mouse move for shape tools (handles dragging outside canvas)
function onPixelEditorDocumentMouseMove(e) {
    // Only handle if we're drawing a shape and the modal is open
    if (!isDrawingShape || !isShapeTool(pixelEditorTool)) return;

    const modal = document.getElementById('pixel-editor-modal');
    if (!modal || !modal.classList.contains('visible')) return;

    // Get coordinates relative to canvas, clamped to valid range
    const { x, y } = getPixelCoordsFromEvent(e);

    // Restore from backup before drawing new preview
    restorePixelData();
    const erase = e.buttons === 2;
    drawShape(shapeStartX, shapeStartY, x, y, erase);
    renderPixelEditor();
}

// Document-level mouse up for shape tools (handles release outside canvas)
function onPixelEditorDocumentMouseUp(e) {
    if (!isDrawingShape || !isShapeTool(pixelEditorTool)) return;

    const modal = document.getElementById('pixel-editor-modal');
    if (!modal || !modal.classList.contains('visible')) return;

    // Finalize the shape
    isDrawingShape = false;
    pixelEditorDataBackup = null;
}

// Get pixel coordinates from any mouse event (handles events outside canvas)
function getPixelCoordsFromEvent(e) {
    if (!pixelEditorCanvas) return { x: 0, y: 0 };

    const rect = pixelEditorCanvas.getBoundingClientRect();
    const scaleX = pixelEditorCanvas.width / rect.width;
    const scaleY = pixelEditorCanvas.height / rect.height;

    // Calculate position relative to canvas
    const rawX = (e.clientX - rect.left) * scaleX / pixelEditorScale;
    const rawY = (e.clientY - rect.top) * scaleY / pixelEditorScale;

    // Clamp to valid pixel range
    const x = Math.max(0, Math.min(Math.floor(rawX), pixelEditorTileSize - 1));
    const y = Math.max(0, Math.min(Math.floor(rawY), pixelEditorTileSize - 1));

    return { x, y };
}

function pixelEditorFloodFillTransparent(startX, startY) {
    const targetColor = getPixel(startX, startY);
    if (!targetColor) return;

    // Already transparent
    if (targetColor.a === 0) return;

    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        if (x < 0 || x >= pixelEditorTileSize || y < 0 || y >= pixelEditorTileSize) continue;

        const pixel = getPixel(x, y);
        if (!pixel) continue;

        if (pixel.r !== targetColor.r ||
            pixel.g !== targetColor.g ||
            pixel.b !== targetColor.b ||
            pixel.a !== targetColor.a) {
            continue;
        }

        visited.add(key);
        setPixel(x, y, 0, 0, 0, 0);

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
    }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function onPixelEditorKeyDown(e) {
    // Only handle when pixel editor is open
    const modal = document.getElementById('pixel-editor-modal');
    if (!modal || !modal.classList.contains('visible')) return;

    // Don't capture shortcuts when typing in input fields
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    );

    // Tool shortcuts (only when not typing in an input)
    if (!e.ctrlKey && !e.metaKey && !isTyping) {
        switch (e.key.toLowerCase()) {
            case 'p':
                selectPixelTool('pencil');
                e.preventDefault();
                break;
            case 'e':
                selectPixelTool('eraser');
                e.preventDefault();
                break;
            case 'f':
                selectPixelTool('fill');
                e.preventDefault();
                break;
            case 'i':
                selectPixelTool('eyedropper');
                e.preventDefault();
                break;
            case 'l':
                selectPixelTool('line');
                e.preventDefault();
                break;
            case 'r':
                selectPixelTool(e.shiftKey ? 'rect-fill' : 'rect');
                e.preventDefault();
                break;
            case 'c':
                selectPixelTool(e.shiftKey ? 'circle-fill' : 'circle');
                e.preventDefault();
                break;
            case 'm':
                selectPixelTool('move');
                e.preventDefault();
                break;
            case 'h':
                flipHorizontal();
                e.preventDefault();
                break;
            case 'v':
                flipVertical();
                e.preventDefault();
                break;
            case 'w':
                toggleMirrorMode();
                e.preventDefault();
                break;
        }

        // Arrow keys: nudge pixels if move tool, otherwise frame navigation
        switch (e.key) {
            case 'ArrowLeft':
                if (pixelEditorTool === 'move') {
                    nudgePixels('left');
                } else {
                    prevFrame();
                }
                e.preventDefault();
                break;
            case 'ArrowRight':
                if (pixelEditorTool === 'move') {
                    nudgePixels('right');
                } else {
                    nextFrame();
                }
                e.preventDefault();
                break;
            case 'ArrowUp':
                if (pixelEditorTool === 'move') {
                    nudgePixels('up');
                    e.preventDefault();
                }
                break;
            case 'ArrowDown':
                if (pixelEditorTool === 'move') {
                    nudgePixels('down');
                    e.preventDefault();
                }
                break;
            case ' ': // Space
                toggleAnimationPreview();
                e.preventDefault();
                break;
            case '+':
            case '=':
                addFrame();
                e.preventDefault();
                break;
        }
    }

    // Undo/Redo (these work even when typing - standard behavior)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        // Only handle if not in an input field (let browser handle undo in inputs)
        if (!isTyping) {
            e.preventDefault();
            if (e.shiftKey) {
                pixelEditorRedo();
            } else {
                pixelEditorUndo();
            }
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (!isTyping) {
            e.preventDefault();
            pixelEditorRedo();
        }
    }
}

// ============================================
// UNDO/REDO
// ============================================

function savePixelEditorHistory() {
    // Defensive check - can't save history if no data exists
    if (!pixelEditorData || !pixelEditorData.data) return;

    // Remove any redo states
    if (pixelEditorHistoryIndex < pixelEditorHistory.length - 1) {
        pixelEditorHistory = pixelEditorHistory.slice(0, pixelEditorHistoryIndex + 1);
    }

    // Save current state
    const snapshot = new Uint8ClampedArray(pixelEditorData.data);
    pixelEditorHistory.push(snapshot);

    // Limit history size
    if (pixelEditorHistory.length > pixelEditorMaxHistory) {
        pixelEditorHistory.shift();
    }

    pixelEditorHistoryIndex = pixelEditorHistory.length - 1;
}

function pixelEditorUndo() {
    if (pixelEditorHistoryIndex <= 0) {
        showToast('Nothing to undo', 'info');
        return;
    }

    pixelEditorHistoryIndex--;
    pixelEditorData.data.set(pixelEditorHistory[pixelEditorHistoryIndex]);
    renderPixelEditor();
}

function pixelEditorRedo() {
    if (pixelEditorHistoryIndex >= pixelEditorHistory.length - 1) {
        showToast('Nothing to redo', 'info');
        return;
    }

    pixelEditorHistoryIndex++;
    pixelEditorData.data.set(pixelEditorHistory[pixelEditorHistoryIndex]);
    renderPixelEditor();
}

// ============================================
// TRANSFORM TOOLS (Flip & Mirror)
// ============================================

// Mirror mode state - when enabled, pencil draws symmetrically
let pixelEditorMirrorMode = false;

// Toggle mirror drawing mode
function toggleMirrorMode() {
    pixelEditorMirrorMode = !pixelEditorMirrorMode;
    const btn = document.getElementById('tool-mirror-toggle');
    if (btn) {
        btn.classList.toggle('active', pixelEditorMirrorMode);
        btn.title = pixelEditorMirrorMode ? 'Mirror Mode ON (W) - Click to disable' : 'Mirror Mode OFF (W) - Click to enable';
    }
    showToast(pixelEditorMirrorMode ? 'Mirror mode ON - Drawing will be mirrored' : 'Mirror mode OFF', 'info');
}

// Flip the current frame horizontally (left-right)
function flipHorizontal() {
    if (!pixelEditorData) return;

    savePixelEditorHistory();

    const size = pixelEditorTileSize;
    const oldData = new Uint8ClampedArray(pixelEditorData.data);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const srcI = (y * size + x) * 4;
            const destX = size - 1 - x;
            const destI = (y * size + destX) * 4;

            pixelEditorData.data[destI] = oldData[srcI];
            pixelEditorData.data[destI + 1] = oldData[srcI + 1];
            pixelEditorData.data[destI + 2] = oldData[srcI + 2];
            pixelEditorData.data[destI + 3] = oldData[srcI + 3];
        }
    }

    renderPixelEditor();
    showToast('Flipped horizontally', 'success');
}

// Flip the current frame vertically (top-bottom)
function flipVertical() {
    if (!pixelEditorData) return;

    savePixelEditorHistory();

    const size = pixelEditorTileSize;
    const oldData = new Uint8ClampedArray(pixelEditorData.data);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const srcI = (y * size + x) * 4;
            const destY = size - 1 - y;
            const destI = (destY * size + x) * 4;

            pixelEditorData.data[destI] = oldData[srcI];
            pixelEditorData.data[destI + 1] = oldData[srcI + 1];
            pixelEditorData.data[destI + 2] = oldData[srcI + 2];
            pixelEditorData.data[destI + 3] = oldData[srcI + 3];
        }
    }

    renderPixelEditor();
    showToast('Flipped vertically', 'success');
}

// Draw a pixel with optional mirror (used by pencil when mirror mode is on)
function drawPixelWithMirror(x, y, erase = false) {
    // Draw the primary pixel
    drawPixel(x, y, erase);

    // If mirror mode is on, also draw the mirrored pixel (vertical axis mirror = left-right symmetry)
    if (pixelEditorMirrorMode) {
        const mirrorX = pixelEditorTileSize - 1 - x;
        drawPixel(mirrorX, y, erase);
    }
}

// ============================================
// CLEAR CANVAS
// ============================================

function clearPixelCanvas() {
    savePixelEditorHistory();

    // Fill with transparent
    for (let i = 0; i < pixelEditorData.data.length; i += 4) {
        pixelEditorData.data[i] = 0;
        pixelEditorData.data[i + 1] = 0;
        pixelEditorData.data[i + 2] = 0;
        pixelEditorData.data[i + 3] = 0;
    }

    renderPixelEditor();
}

// ============================================
// SAVE CUSTOM TILE
// ============================================

function saveCustomTile() {
    // Additional guard (timestamp debounce is primary protection)
    if (window.pixelEditorSaveInProgress) return;
    window.pixelEditorSaveInProgress = true;

    const name = document.getElementById('pixel-editor-name').value.trim();
    const solid = document.getElementById('pixel-editor-solid').checked;

    // Get effect settings
    const effectType = document.getElementById('pixel-editor-effect-type')?.value || 'none';
    const effectIntensity = parseInt(document.getElementById('pixel-editor-effect-intensity')?.value) || 5;
    const effectSpeed = parseInt(document.getElementById('pixel-editor-effect-speed')?.value) || 5;

    // Get hitbox setting (only relevant for solid tiles)
    const hitbox = solid ? (document.getElementById('pixel-editor-hitbox')?.value || 'full') : 'full';

    if (!name) {
        showToast('Please enter a tile name', 'error');
        window.pixelEditorSaveInProgress = false;
        return;
    }

    // Save current frame to frames array first
    saveCurrentFrameToArray();

    // Check if any frame has content
    let hasContent = false;
    for (let f = 0; f < pixelEditorFrames.length; f++) {
        const frame = pixelEditorFrames[f];
        for (let i = 3; i < frame.data.length; i += 4) {
            if (frame.data[i] > 0) {
                hasContent = true;
                break;
            }
        }
        if (hasContent) break;
    }

    if (!hasContent) {
        showToast('Tile is empty - please draw something', 'error');
        window.pixelEditorSaveInProgress = false;
        return;
    }

    // Determine key
    let key;
    if (pixelEditorEditingKey) {
        key = pixelEditorEditingKey;
    } else {
        key = generateCustomTileKey();
    }

    // Helper function to convert ImageData to dataURL
    function imageDataToDataURL(imageData) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pixelEditorTileSize;
        tempCanvas.height = pixelEditorTileSize;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        return tempCanvas.toDataURL('image/png');
    }

    // Check if this is an animated tile (more than 1 frame)
    const isAnimated = pixelEditorFrames.length > 1;

    if (isAnimated) {
        // Save as animated tile with all frames
        const frames = pixelEditorFrames.map(frame => imageDataToDataURL(frame));

        customTiles[key] = {
            dataURL: frames[0], // First frame for backward compatibility and preview
            frames: frames,     // All frames
            fps: pixelEditorFps,
            solid: solid,
            hitbox: hitbox,     // Hitbox preset (full, top, bottom, left, right)
            name: name,
            animated: true,
            effect: effectType,
            effectIntensity: effectIntensity,
            effectSpeed: effectSpeed
        };

        // Update image cache with first frame
        const img = new Image();
        img.src = frames[0];
        customTileImageCache[key] = img;

        // Also cache all frame images for animation
        if (typeof customTileAnimationCache === 'undefined') {
            window.customTileAnimationCache = {};
        }
        customTileAnimationCache[key] = {
            frames: frames.map(dataURL => {
                const frameImg = new Image();
                frameImg.src = dataURL;
                return frameImg;
            }),
            fps: pixelEditorFps,
            currentFrame: 0
        };

        showToast(`Animated tile saved! (${frames.length} frames at ${pixelEditorFps} fps)`, 'success');
    } else {
        // Save as static tile (single frame)
        const dataURL = imageDataToDataURL(pixelEditorFrames[0]);

        customTiles[key] = {
            dataURL: dataURL,
            solid: solid,
            hitbox: hitbox,     // Hitbox preset (full, top, bottom, left, right)
            name: name,
            effect: effectType,
            effectIntensity: effectIntensity,
            effectSpeed: effectSpeed
        };

        // Update image cache
        const img = new Image();
        img.src = dataURL;
        customTileImageCache[key] = img;

        // Clear animation cache if was previously animated
        if (typeof customTileAnimationCache !== 'undefined' && customTileAnimationCache[key]) {
            delete customTileAnimationCache[key];
        }

        showToast(pixelEditorEditingKey ? 'Custom tile updated!' : 'Custom tile created!', 'success');
    }

    // Mark project as dirty
    markDirty();

    // Update UI
    if (typeof renderCustomTilesPalette === 'function') {
        renderCustomTilesPalette();
    }

    // Auto-select the saved tile for immediate use
    if (typeof selectTile === 'function') {
        selectTile(key);
    }

    // Close modal
    closePixelEditor();
}

// ============================================
// DOWNLOAD CUSTOM TILE AS PNG
// ============================================

function downloadCustomTilePNG() {
    // Save current frame to array first
    saveCurrentFrameToArray();

    // Check if we have any frames
    if (!pixelEditorFrames || pixelEditorFrames.length === 0) {
        showToast('No tile data to download', 'error');
        return;
    }

    // Check if any frame has content
    let hasContent = false;
    for (let f = 0; f < pixelEditorFrames.length; f++) {
        const frame = pixelEditorFrames[f];
        for (let i = 3; i < frame.data.length; i += 4) {
            if (frame.data[i] > 0) {
                hasContent = true;
                break;
            }
        }
        if (hasContent) break;
    }

    if (!hasContent) {
        showToast('Draw something first before downloading', 'error');
        return;
    }

    // Get tile name for filename
    const nameInput = document.getElementById('pixel-editor-name');
    let filename = (nameInput && nameInput.value.trim()) || 'custom-tile';
    // Sanitize filename (remove special characters)
    filename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');

    const isAnimated = pixelEditorFrames.length > 1;

    // Create canvas for the output
    let outputCanvas, outputCtx;

    if (isAnimated) {
        // Create horizontal spritesheet for animated tiles
        outputCanvas = document.createElement('canvas');
        outputCanvas.width = pixelEditorTileSize * pixelEditorFrames.length;
        outputCanvas.height = pixelEditorTileSize;
        outputCtx = outputCanvas.getContext('2d');
        outputCtx.imageSmoothingEnabled = false;

        // Draw each frame side by side
        pixelEditorFrames.forEach((frame, index) => {
            // Create temp canvas for this frame
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = pixelEditorTileSize;
            tempCanvas.height = pixelEditorTileSize;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(frame, 0, 0);

            // Draw to output canvas
            outputCtx.drawImage(tempCanvas, index * pixelEditorTileSize, 0);
        });

        filename += '_spritesheet_' + pixelEditorFrames.length + 'frames';
    } else {
        // Single frame - just export it directly
        outputCanvas = document.createElement('canvas');
        outputCanvas.width = pixelEditorTileSize;
        outputCanvas.height = pixelEditorTileSize;
        outputCtx = outputCanvas.getContext('2d');
        outputCtx.putImageData(pixelEditorFrames[0], 0, 0);
    }

    // Convert to data URL and trigger download
    const dataURL = outputCanvas.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.download = filename + '.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    if (isAnimated) {
        showToast(`Downloaded spritesheet (${pixelEditorFrames.length} frames, ${outputCanvas.width}×${outputCanvas.height}px)`, 'success');
    } else {
        showToast(`Downloaded ${pixelEditorTileSize}×${pixelEditorTileSize}px PNG`, 'success');
    }
}

// ============================================
// USED COLORS PALETTE
// ============================================

// Extract unique colors from current tile
function getUsedColors() {
    if (!pixelEditorData) return [];

    const colors = new Map(); // Map to track colors and their count

    for (let i = 0; i < pixelEditorData.data.length; i += 4) {
        const r = pixelEditorData.data[i];
        const g = pixelEditorData.data[i + 1];
        const b = pixelEditorData.data[i + 2];
        const a = pixelEditorData.data[i + 3];

        // Skip transparent pixels
        if (a === 0) continue;

        const hex = rgbToHex(r, g, b);
        colors.set(hex, (colors.get(hex) || 0) + 1);
    }

    // Sort by usage count (most used first)
    return Array.from(colors.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
}

// Update the used colors palette UI
function updateUsedColorsPalette() {
    const container = document.getElementById('pixel-editor-used-colors');
    if (!container) return;

    const colors = getUsedColors();

    if (colors.length === 0) {
        container.innerHTML = '<div style="font-size: 9px; color: #555; text-align: center; width: 100%;">Draw to see colors</div>';
        return;
    }

    container.innerHTML = colors.map(hex => `
        <div class="used-color-swatch"
             onclick="selectUsedColor('${hex}')"
             title="${hex}"
             style="
                width: 18px;
                height: 18px;
                background: ${hex};
                border: 2px solid ${hex === pixelEditorColor ? '#fff' : 'rgba(255,255,255,0.2)'};
                border-radius: 3px;
                cursor: pointer;
                transition: border-color 0.15s, transform 0.1s;
             "
             onmouseover="this.style.transform='scale(1.15)'"
             onmouseout="this.style.transform='scale(1)'"
        ></div>
    `).join('');
}

// Select a color from the used colors palette
function selectUsedColor(hex) {
    pixelEditorColor = hex;
    const colorInput = document.getElementById('pixel-editor-color');
    if (colorInput) {
        colorInput.value = hex;
    }
    // Update color preview swatch
    updateColorPreview(hex);
    // Update the palette to show selection
    updateUsedColorsPalette();
}

// ============================================
// TILE PREVIEW (TILING PATTERN)
// ============================================

let tilePreviewMode = 'both'; // 'horizontal', 'vertical', or 'both'

// Open the tile preview modal
function openTilePreviewModal() {
    const modal = document.getElementById('tile-preview-modal');
    if (modal) {
        modal.classList.add('visible');
        updateTilePreview();
    }
}

// Close the tile preview modal
function closeTilePreviewModal() {
    const modal = document.getElementById('tile-preview-modal');
    if (modal) {
        modal.classList.remove('visible');
    }
}

// Set the tile preview mode
function setTilePreviewMode(mode) {
    tilePreviewMode = mode;

    // Update button states
    document.querySelectorAll('.tile-mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`tile-mode-${mode}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    updateTilePreview();
}

// Update the tile preview canvas
function updateTilePreview() {
    const canvas = document.getElementById('tile-preview-canvas');
    if (!canvas || !pixelEditorData) return;

    const ctx = canvas.getContext('2d');
    const zoomSlider = document.getElementById('tile-preview-zoom');
    const zoomValue = document.getElementById('tile-preview-zoom-value');
    const zoom = parseInt(zoomSlider?.value || 2);

    if (zoomValue) {
        zoomValue.textContent = zoom + '×';
    }

    // Create a temporary canvas with the current tile
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = pixelEditorTileSize;
    tileCanvas.height = pixelEditorTileSize;
    const tileCtx = tileCanvas.getContext('2d');
    tileCtx.putImageData(pixelEditorData, 0, 0);

    // Calculate grid size and canvas dimensions based on mode
    let cols, rows;
    switch (tilePreviewMode) {
        case 'horizontal':
            cols = 5;
            rows = 1;
            break;
        case 'vertical':
            cols = 1;
            rows = 5;
            break;
        case 'both':
        default:
            cols = 3;
            rows = 3;
            break;
    }

    // Calculate canvas size
    const tileDisplaySize = pixelEditorTileSize * zoom;
    const canvasWidth = cols * tileDisplaySize;
    const canvasHeight = rows * tileDisplaySize;

    // Resize canvas
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Disable smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false;

    // Draw the tiled pattern
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            ctx.drawImage(
                tileCanvas,
                col * tileDisplaySize,
                row * tileDisplaySize,
                tileDisplaySize,
                tileDisplaySize
            );
        }
    }
}

// Update color preview swatch and hex display
function updateColorPreview(color) {
    const preview = document.getElementById('pixel-editor-color-preview');
    const hexDisplay = document.getElementById('pixel-editor-color-hex');
    if (preview) {
        preview.style.background = color;
    }
    if (hexDisplay) {
        hexDisplay.textContent = color.toUpperCase();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPixelEditor);
