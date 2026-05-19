// ============================================
// LEVEL EDITING
// ============================================

function setTileAt(tileX, tileY, key, layer) {
    // Default to whichever layer the editor is currently painting on
    const grid = (layer || currentTileLayer) === 'decor' ? decorLevel : level;

    if (tileY < 0 || tileY >= grid.length) return;
    if (tileX < 0 || tileX >= grid[tileY].length) return;

    // Validate key to prevent corruption
    if (key === undefined || key === null) {
        console.error('setTileAt: Invalid key (undefined/null)', { tileX, tileY, key });
        return;
    }
    if (typeof key !== 'string' || key.length !== 1) {
        console.error('setTileAt: Key must be single character', { tileX, tileY, key });
        return;
    }

    const row = grid[tileY];
    const oldKey = row[tileX];
    if (oldKey === key) return; // No change

    grid[tileY] = row.substring(0, tileX) + key + row.substring(tileX + 1);
    markDirty();

    // Update live data preview (debounced)
    if (window.liveDataTimeout) clearTimeout(window.liveDataTimeout);
    window.liveDataTimeout = setTimeout(updateLiveDataPreview, 100);
}

// ============================================
// STAMP BRUSH (multi-cell paint from a tileset selection)
// ============================================

// Paint a single Draw-tool action at (tx, ty). If a multi-cell brush is active,
// stamp the whole pattern; otherwise paint a single selectedTileKey.
// Returns true if anything was painted.
function drawAtTile(tx, ty) {
    if (tileBrush) {
        for (let by = 0; by < tileBrush.h; by++) {
            const row = tileBrush.tiles[by];
            for (let bx = 0; bx < tileBrush.w; bx++) {
                setTileAt(tx + bx, ty + by, row[bx]);
            }
        }
        return true;
    }
    setTileAt(tx, ty, selectedTileKey);
    return true;
}

// ============================================
// CLIPBOARD / SELECTION COPY-PASTE
// ============================================

// Capture the current selection rect into tileClipboard. Pulls from BOTH
// terrain and decoration layers so paste preserves stacking.
function copySelectionToClipboard() {
    if (!selection) return false;
    const x1 = selection.x1, y1 = selection.y1, x2 = selection.x2, y2 = selection.y2;
    const w = x2 - x1 + 1, h = y2 - y1 + 1;
    const terrain = [], decor = [];
    for (let y = y1; y <= y2; y++) {
        let trow = '', drow = '';
        for (let x = x1; x <= x2; x++) {
            trow += (level[y] && level[y][x]) || '.';
            drow += (decorLevel[y] && decorLevel[y][x]) || '.';
        }
        terrain.push(trow);
        decor.push(drow);
    }
    tileClipboard = { tiles: terrain, decorTiles: decor, w: w, h: h };
    return true;
}

// Stamp clipboard contents at (originX, originY), top-left aligned. If
// `transparent` is true, '.' cells in the clipboard leave existing tiles
// alone (so you can paste a tree shape over an existing snow base).
function pasteClipboardAt(originX, originY, transparent) {
    if (!tileClipboard) return false;
    const w = tileClipboard.w, h = tileClipboard.h;
    saveUndoState('Paste');
    for (let dy = 0; dy < h; dy++) {
        const ty = originY + dy;
        if (ty < 0 || ty >= level.length) continue;
        for (let dx = 0; dx < w; dx++) {
            const tx = originX + dx;
            if (tx < 0 || tx >= level[ty].length) continue;
            const tCh = tileClipboard.tiles[dy][dx];
            const dCh = tileClipboard.decorTiles[dy][dx];
            if (!transparent || tCh !== '.') setTileAt(tx, ty, tCh, 'terrain');
            if (!transparent || dCh !== '.') setTileAt(tx, ty, dCh, 'decor');
        }
    }
    markDirty();
    return true;
}

// Erase a rectangle on both layers
function eraseRect(x1, y1, x2, y2) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            setTileAt(x, y, '.', 'terrain');
            setTileAt(x, y, '.', 'decor');
        }
    }
}

function cutSelection() {
    if (!selection) return;
    if (!copySelectionToClipboard()) return;
    saveUndoState('Cut');
    eraseRect(selection.x1, selection.y1, selection.x2, selection.y2);
    markDirty();
    showToast('Cut ' + tileClipboard.w + '×' + tileClipboard.h);
}

function copySelection() {
    if (!selection) return;
    if (copySelectionToClipboard()) {
        showToast('Copied ' + tileClipboard.w + '×' + tileClipboard.h);
    }
}

function pasteClipboard() {
    if (!tileClipboard) {
        showToast('Clipboard empty', 'warning');
        return;
    }
    // Anchor: current hover tile if known, else original selection top-left,
    // else top-left of viewport. Hover is set by mousemove → hoverX/hoverY.
    let ox, oy;
    if (typeof hoverX === 'number' && hoverX >= 0 && typeof hoverY === 'number' && hoverY >= 0) {
        ox = hoverX;
        oy = hoverY;
    } else if (selection) {
        ox = selection.x1;
        oy = selection.y1;
    } else {
        ox = Math.floor(cameraX / tileSize);
        oy = Math.floor(cameraY / tileSize);
    }
    pasteClipboardAt(ox, oy, /* transparent */ true);
    showToast('Pasted at ' + ox + ',' + oy);
}

function duplicateSelection() {
    if (!selection) return;
    if (!copySelectionToClipboard()) return;
    // Paste immediately to the right of the original selection
    pasteClipboardAt(selection.x2 + 1, selection.y1, /* transparent */ false);
    showToast('Duplicated ' + tileClipboard.w + '×' + tileClipboard.h);
}

// ============================================
// TILE LAYER (terrain / decoration)
// ============================================

function setTileLayer(layer) {
    if (layer !== 'terrain' && layer !== 'decor') return;
    if (currentTileLayer === layer) return;
    currentTileLayer = layer;
    updateTileLayerUI();
    draw(); // active layer affects which one is dimmed
}

function toggleDecorVisibility() {
    decorLayerVisible = !decorLayerVisible;
    updateTileLayerUI();
    draw();
}

function updateTileLayerUI() {
    const terrainBtn = document.getElementById('layer-btn-terrain');
    const decorBtn = document.getElementById('layer-btn-decor');
    const visBtn = document.getElementById('layer-btn-vis');
    if (terrainBtn && decorBtn) {
        const onTerrain = currentTileLayer === 'terrain';
        terrainBtn.style.background = onTerrain ? '#667eea' : '#1a1a2e';
        terrainBtn.style.color = onTerrain ? '#fff' : '#888';
        terrainBtn.style.borderColor = onTerrain ? '#667eea' : '#444';
        decorBtn.style.background = !onTerrain ? '#9b59b6' : '#1a1a2e';
        decorBtn.style.color = !onTerrain ? '#fff' : '#888';
        decorBtn.style.borderColor = !onTerrain ? '#9b59b6' : '#444';
    }
    if (visBtn) {
        visBtn.style.color = decorLayerVisible ? '#fff' : '#666';
        visBtn.style.borderColor = decorLayerVisible ? '#888' : '#444';
        visBtn.style.opacity = decorLayerVisible ? '1' : '0.5';
        visBtn.title = decorLayerVisible
            ? 'Hide overlay layer in editor'
            : 'Show overlay layer in editor';
    }
}

// ============================================
// TOOL MANAGEMENT
// ============================================

function setTool(tool) {
    currentTool = tool;

    // Clear move selection when switching away from move tool
    if (tool !== 'move') {
        // Return dragged tile to original position if any
        if (draggedTileKey !== null && draggedTileOrigin) {
            setTileAt(draggedTileOrigin.x, draggedTileOrigin.y, draggedTileKey);
            draggedTileKey = null;
            draggedTileOrigin = null;
        }

        selectedMoveObject = null;
        if (typeof stopPulseAnimation === 'function') {
            stopPulseAnimation();
        }
    }

    // Update button states
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tool-' + tool).classList.add('active');

    // Update cursor and status hint
    const hint = document.getElementById('tool-hint');
    switch(tool) {
        case 'draw':
            canvas.style.cursor = 'crosshair';
            hint.textContent = 'Left-click: Draw | Right-click: Erase | Middle-drag: Pan';
            break;
        case 'fill':
            canvas.style.cursor = 'cell';
            hint.textContent = 'Left-click: Fill area | Right-click: Fill with empty | Middle-drag: Pan';
            break;
        case 'erase':
            canvas.style.cursor = 'crosshair';
            hint.textContent = 'Left-click: Erase | Middle-drag: Pan';
            break;
        case 'move':
            canvas.style.cursor = 'move';
            hint.textContent = 'Drag player, objects, or tiles to move them | Right-click: Cancel';
            break;
    }

    // Redraw to update any visual changes
    draw();
}

// ============================================
// GAME OBJECT FUNCTIONS
// ============================================

// Legacy function - now handled by modal system in objectTemplates.js
function selectGameObject(type) {
    // Map old types to new template system
    const typeMapping = {
        'enemy': { type: 'enemy', templateId: 'default' },
        'coin': { type: 'collectible', templateId: 'coin' },
        'gem': { type: 'collectible', templateId: 'gem' },
        'goal': { type: 'goal', templateId: null },
        'spike': { type: 'hazard', templateId: 'spike' },
        'heart': { type: 'powerup', templateId: 'heart' }
    };

    const mapping = typeMapping[type];
    if (mapping) {
        selectedObjectType = mapping.type;
        selectedTemplateId = mapping.templateId;
        updateObjectSelectionStatus();
        canvas.style.cursor = 'pointer';
        const template = getTemplate(mapping.type, mapping.templateId);
        document.getElementById('tool-hint').textContent =
            `Left-click: Place ${template?.name || type} | Right-click: Remove object | Middle-drag: Pan`;
    }
}

function addGameObject(tileX, tileY, type, templateId = null) {
    // Handle legacy calls without templateId
    if (!templateId && type) {
        // Convert legacy types to new format
        const legacyMapping = {
            'enemy': { type: 'enemy', templateId: 'default' },
            'coin': { type: 'collectible', templateId: 'coin' },
            'gem': { type: 'collectible', templateId: 'gem' },
            'goal': { type: 'goal', templateId: null },
            'spike': { type: 'hazard', templateId: 'spike' },
            'heart': { type: 'powerup', templateId: 'heart' }
        };
        const mapping = legacyMapping[type];
        if (mapping) {
            type = mapping.type;
            templateId = mapping.templateId;
        }
    }

    // Save state for undo before making changes
    const template = getTemplate ? getTemplate(type, templateId) : null;
    const objectName = template?.name || type;

    // For movingPlatform, check if placing here would overlap with existing platforms
    if (type === 'movingPlatform' && template) {
        const newWidth = template.width || 64;
        const newHeight = template.height || 16;
        const newTilesX = Math.ceil(newWidth / tileSize);
        const newTilesY = Math.ceil(newHeight / tileSize);

        // Check for overlapping platforms
        for (let i = 0; i < gameObjects.length; i++) {
            const obj = gameObjects[i];
            if (obj.type === 'movingPlatform') {
                const existingTemplate = getTemplate('movingPlatform', obj.templateId);
                const existingWidth = existingTemplate?.width || 64;
                const existingHeight = existingTemplate?.height || 16;
                const existingTilesX = Math.ceil(existingWidth / tileSize);
                const existingTilesY = Math.ceil(existingHeight / tileSize);

                // Check if bounding boxes overlap
                const newLeft = tileX;
                const newRight = tileX + newTilesX;
                const newTop = tileY;
                const newBottom = tileY + newTilesY;

                const existLeft = obj.x;
                const existRight = obj.x + existingTilesX;
                const existTop = obj.y;
                const existBottom = obj.y + existingTilesY;

                if (newLeft < existRight && newRight > existLeft &&
                    newTop < existBottom && newBottom > existTop) {
                    showToast('Platform would overlap with existing platform', 'error');
                    return;
                }
            }
        }
    }

    saveUndoState('Place ' + objectName);

    // Check if object already exists at this position
    const existingIndex = gameObjects.findIndex(obj => obj.x === tileX && obj.y === tileY);
    if (existingIndex >= 0) {
        // Replace existing object
        gameObjects[existingIndex] = { x: tileX, y: tileY, type: type, templateId: templateId };
    } else {
        gameObjects.push({ x: tileX, y: tileY, type: type, templateId: templateId });
    }
    updateObjectCount();
    markDirty();
    draw();
}

// Add object using current selection
function addSelectedObject(tileX, tileY) {
    if (!selectedObjectType) return false;

    addGameObject(tileX, tileY, selectedObjectType, selectedTemplateId);
    return true;
}

function removeGameObjectAt(tileX, tileY) {
    // Find object at this tile - check bounding boxes for multi-tile objects
    const index = gameObjects.findIndex(obj => {
        const template = getTemplate ? getTemplate(obj.type, obj.templateId) : null;
        const objWidth = template?.width || tileSize;
        const objHeight = template?.height || tileSize;
        const tilesX = Math.ceil(objWidth / tileSize);
        const tilesY = Math.ceil(objHeight / tileSize);

        // Check if clicked tile is within this object's bounding box
        return tileX >= obj.x && tileX < obj.x + tilesX &&
               tileY >= obj.y && tileY < obj.y + tilesY;
    });

    if (index >= 0) {
        saveUndoState('Remove Object');
        gameObjects.splice(index, 1);
        updateObjectCount();
        markDirty();
        draw();
    }
}

function clearAllObjects() {
    if (gameObjects.length === 0) {
        showToast('No objects to clear', 'info');
        return;
    }
    if (confirm('Remove all ' + gameObjects.length + ' game objects?')) {
        saveUndoState('Clear All Objects');
        gameObjects = [];
        updateObjectCount();
        markDirty();
        draw();
        showToast('All objects cleared');
    }
}

function updateObjectCount() {
    const countEl = document.getElementById('object-count');
    if (countEl) {
        countEl.textContent = gameObjects.length;
    }
}

// Update the selection status display
function updateObjectSelectionStatus() {
    const statusEl = document.getElementById('object-selection-status');
    const nameEl = document.getElementById('selected-object-name');

    if (!selectedObjectType) {
        if (statusEl) statusEl.style.display = 'none';
        return;
    }

    const template = getTemplate(selectedObjectType, selectedTemplateId);
    if (statusEl) {
        statusEl.style.display = 'block';
    }
    if (nameEl && template) {
        nameEl.textContent = template.name || selectedObjectType;
    }

    // Update button visual state
    document.querySelectorAll('.object-category .object-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    const btnId = 'btn-' + selectedObjectType;
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.classList.add('selected');
    }
}

function getObjectColor(type, templateId) {
    // If template info provided, use template color
    const template = getTemplate(type, templateId);
    if (template && template.color) {
        return template.color;
    }

    // Legacy fallback colors
    const colors = {
        enemy: '#e74c3c',
        collectible: '#f1c40f',
        hazard: '#7f8c8d',
        powerup: '#e91e63',
        spring: '#9b59b6',
        movingPlatform: '#8B4513',
        mysteryBlock: '#f1c40f',
        checkpoint: '#3498db',
        goal: '#2ecc71',
        npc: '#3498db',
        door: '#8b4513',
        terrainZone: '#4a90d9',
        // Legacy types
        coin: '#f1c40f',
        gem: '#9b59b6',
        spike: '#7f8c8d',
        heart: '#e91e63'
    };
    return colors[type] || '#ffffff';
}

function getObjectSymbol(type, templateId) {
    // If template info provided, use template symbol
    const template = getTemplate(type, templateId);
    if (template) {
        if (template.symbol) return template.symbol;
        // Default symbols by type
        const typeSymbols = {
            enemy: '👾',
            collectible: '●',
            hazard: '▲',
            powerup: '♥',
            spring: '🔼',
            movingPlatform: '═',
            mysteryBlock: '?',
            checkpoint: '⛳',
            goal: '🚩',
            npc: '👤',
            door: '🚪',
            terrainZone: '~'
        };
        return typeSymbols[type] || '?';
    }

    // Legacy fallback emojis
    const emojis = {
        enemy: '👾',
        coin: '🪙',
        gem: '💎',
        goal: '🚩',
        spike: '⚠️',
        heart: '❤️',
        collectible: '●',
        hazard: '▲',
        powerup: '♥',
        npc: '👤',
        door: '🚪'
    };
    return emojis[type] || '?';
}

// Legacy alias for backward compatibility
function getObjectEmoji(type) {
    return getObjectSymbol(type, null);
}

// Flood fill algorithm (4-direction)
function floodFill(startX, startY, newKey) {
    // Validate newKey to prevent corruption
    if (newKey === undefined || newKey === null) {
        console.error('floodFill: Invalid key (undefined/null)', { startX, startY, newKey });
        return;
    }
    if (typeof newKey !== 'string' || newKey.length !== 1) {
        console.error('floodFill: Key must be single character', { startX, startY, newKey });
        return;
    }

    // Flood fill operates on whichever layer the editor is currently painting on
    const grid = currentTileLayer === 'decor' ? decorLevel : level;

    // Bounds check
    if (startY < 0 || startY >= grid.length) return;
    if (startX < 0 || startX >= grid[startY].length) return;

    // Get the target tile we're replacing
    const targetKey = grid[startY][startX];

    // Don't fill if clicking on same tile type
    if (targetKey === newKey) return;

    // Use a queue-based flood fill (iterative to avoid stack overflow)
    const queue = [[startX, startY]];
    const visited = new Set();
    let tilesChanged = 0;
    const maxTiles = 10000; // Safety limit

    while (queue.length > 0 && tilesChanged < maxTiles) {
        const [x, y] = queue.shift();
        const key = `${x},${y}`;

        // Skip if already visited or out of bounds
        if (visited.has(key)) continue;
        if (y < 0 || y >= grid.length) continue;
        if (x < 0 || x >= grid[y].length) continue;

        // Skip if not the target tile
        if (grid[y][x] !== targetKey) continue;

        // Mark as visited and fill
        visited.add(key);
        grid[y] = grid[y].substring(0, x) + newKey + grid[y].substring(x + 1);
        tilesChanged++;

        // Add neighbors to queue (4-direction: up, down, left, right)
        queue.push([x + 1, y]);
        queue.push([x - 1, y]);
        queue.push([x, y + 1]);
        queue.push([x, y - 1]);
    }

    if (tilesChanged > 0) {
        markDirty();
        updateLiveDataPreview();
        showToast(`Filled ${tilesChanged} tiles`);
    }
}

function getTileAt(tileX, tileY, layer) {
    // Defaults to whichever layer the editor is currently painting on so that
    // move-tool drags, selection copies, and the cursor inspector all operate
    // on the layer the user is looking at.
    const grid = (layer || currentTileLayer) === 'decor' ? decorLevel : level;
    if (tileY < 0 || tileY >= grid.length) return '.';
    if (tileX < 0 || tileX >= grid[tileY].length) return '.';
    return grid[tileY][tileX];
}

// Note: Level resizing is now handled in the Level Settings modal (saveLevelSettings)
// This function is kept for backwards compatibility and programmatic resizing
// Maximum level dimensions to prevent browser freezing
const MAX_LEVEL_WIDTH = 500;
const MAX_LEVEL_HEIGHT = 100;
const MIN_LEVEL_WIDTH = 10;
const MIN_LEVEL_HEIGHT = 5;

function resizeLevel(newWidth, newHeight) {
    // If no params passed, use current levelWidth/levelHeight (no-op check)
    newWidth = newWidth || levelWidth;
    newHeight = newHeight || levelHeight;

    // Enforce dimension limits to prevent corruption/freezing
    newWidth = Math.max(MIN_LEVEL_WIDTH, Math.min(MAX_LEVEL_WIDTH, Math.floor(newWidth)));
    newHeight = Math.max(MIN_LEVEL_HEIGHT, Math.min(MAX_LEVEL_HEIGHT, Math.floor(newHeight)));

    // Don't save undo if nothing changed
    if (newWidth === levelWidth && newHeight === levelHeight) return;

    // Save state before resize
    saveUndoState('Resize Level');

    // Resize width (both layers in lockstep)
    for (let y = 0; y < level.length; y++) {
        if (level[y].length < newWidth) {
            level[y] += '.'.repeat(newWidth - level[y].length);
        } else if (level[y].length > newWidth) {
            level[y] = level[y].substring(0, newWidth);
        }
    }
    for (let y = 0; y < decorLevel.length; y++) {
        if (decorLevel[y].length < newWidth) {
            decorLevel[y] += '.'.repeat(newWidth - decorLevel[y].length);
        } else if (decorLevel[y].length > newWidth) {
            decorLevel[y] = decorLevel[y].substring(0, newWidth);
        }
    }

    // Resize height (both layers in lockstep)
    while (level.length < newHeight) {
        level.push('.'.repeat(newWidth));
        decorLevel.push('.'.repeat(newWidth));
    }
    while (level.length > newHeight) {
        level.pop();
        decorLevel.pop();
    }

    levelWidth = newWidth;
    levelHeight = newHeight;
    markDirty();
    updateLevelSizeDisplay();
    updateLiveDataPreview();
    draw();
}

function newLevel() {
    if (!confirm('Create a new level? Unsaved changes will be lost.')) return;

    // Use default dimensions for new level
    levelWidth = 150;
    levelHeight = 30;
    initLevel();
    cameraX = 0;
    cameraY = 0;
    projectId = null; // Reset project ID for new level
    markDirty();
    updateLiveDataPreview();
    draw();
    showToast('New level created');
}

function clearLevel() {
    if (!confirm('Clear all tiles?')) return;
    saveUndoState('Clear Level');
    initLevel();
    markDirty();
    updateLiveDataPreview();
    draw();
    showToast('Level cleared');
}

function fillRow() {
    if (selectedTileKey === '.') {
        showToast('Select a tile first', 'error');
        return;
    }

    saveUndoState('Fill Bottom Row');
    const lastRow = level.length - 1;
    level[lastRow] = selectedTileKey.repeat(levelWidth);
    markDirty();
    updateLiveDataPreview();
    draw();
    showToast('Bottom row filled');
}

function updateLevelSizeDisplay() {
    document.getElementById('level-size-display').textContent = `Level: ${levelWidth} x ${levelHeight}`;
}
