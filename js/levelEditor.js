// ============================================
// LEVEL EDITING
// ============================================

function setTileAt(tileX, tileY, key) {
    if (tileY < 0 || tileY >= level.length) return;
    if (tileX < 0 || tileX >= level[tileY].length) return;

    // Validate key to prevent corruption
    if (key === undefined || key === null) {
        console.error('setTileAt: Invalid key (undefined/null)', { tileX, tileY, key });
        return;
    }
    if (typeof key !== 'string' || key.length !== 1) {
        console.error('setTileAt: Key must be single character', { tileX, tileY, key });
        return;
    }

    const row = level[tileY];
    const oldKey = row[tileX];
    if (oldKey === key) return; // No change

    level[tileY] = row.substring(0, tileX) + key + row.substring(tileX + 1);
    markDirty();

    // Update live data preview (debounced)
    if (window.liveDataTimeout) clearTimeout(window.liveDataTimeout);
    window.liveDataTimeout = setTimeout(updateLiveDataPreview, 100);
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

    // Bounds check
    if (startY < 0 || startY >= level.length) return;
    if (startX < 0 || startX >= level[startY].length) return;

    // Get the target tile we're replacing
    const targetKey = level[startY][startX];

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
        if (y < 0 || y >= level.length) continue;
        if (x < 0 || x >= level[y].length) continue;

        // Skip if not the target tile
        if (level[y][x] !== targetKey) continue;

        // Mark as visited and fill
        visited.add(key);
        level[y] = level[y].substring(0, x) + newKey + level[y].substring(x + 1);
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

function getTileAt(tileX, tileY) {
    if (tileY < 0 || tileY >= level.length) return '.';
    if (tileX < 0 || tileX >= level[tileY].length) return '.';
    return level[tileY][tileX];
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

    // Resize width
    for (let y = 0; y < level.length; y++) {
        if (level[y].length < newWidth) {
            level[y] += '.'.repeat(newWidth - level[y].length);
        } else if (level[y].length > newWidth) {
            level[y] = level[y].substring(0, newWidth);
        }
    }

    // Resize height
    while (level.length < newHeight) {
        level.push('.'.repeat(newWidth));
    }
    while (level.length > newHeight) {
        level.pop();
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
