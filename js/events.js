// ============================================
// EVENT HANDLERS
// ============================================
// Extracted from index.php lines 3995-4265

function setupEventListeners() {
    setupTilesetDropzone();

    // Canvas events
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseleave', onCanvasMouseLeave);
    canvas.addEventListener('wheel', onCanvasWheel);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Window resize
    window.addEventListener('resize', resizeCanvas);

    // Keyboard
    document.addEventListener('keydown', onKeyDown);

    // Initialize tileset click handler
    initTilesetClickHandler();
}

function screenToTile(screenX, screenY) {
    return {
        x: Math.floor((screenX / zoom + cameraX) / tileSize),
        y: Math.floor((screenY / zoom + cameraY) / tileSize)
    };
}

function onCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tile = screenToTile(x, y);
    hoverX = tile.x;
    hoverY = tile.y;

    document.getElementById('coordinates').textContent = `X: ${tile.x}, Y: ${tile.y}`;

    // Update cursor inspector
    updateCursorInspector(tile.x, tile.y);

    // Update cursor based on what's under it (unless dragging)
    // Show grab cursor over objects even if selectedObjectType is set (to indicate you can drag them)
    if (!isDragging && !isDraggingObject) {
        // Don't show grab cursor when using erase tool (erase deletes, doesn't drag)
        if (currentTool !== 'erase') {
            const hitResult = findObjectAtPixel(x, y);
            if (hitResult) {
                canvas.style.cursor = 'grab';
            } else if (currentTool === 'move' || e.altKey) {
                // In move mode or with Alt held, show grab cursor over tiles
                const tileKey = getTileAt(tile.x, tile.y);
                canvas.style.cursor = (tileKey !== '.') ? 'grab' : 'crosshair';
            } else if (selectedObjectType) {
                canvas.style.cursor = 'pointer'; // Placing objects
            } else {
                canvas.style.cursor = 'crosshair';
            }
        } else {
            // Erase tool - always show crosshair
            canvas.style.cursor = 'crosshair';
        }
    } else if (isDraggingObject) {
        canvas.style.cursor = 'grabbing';
    }

    // Handle terrain zone dragging (moving)
    if (window.isDraggingTerrainZone && selectedTerrainZone !== null && e.buttons === 1) {
        const zone = gameObjects[selectedTerrainZone];
        if (zone && zone.type === 'terrainZone') {
            const offset = window.terrainZoneDragOffset || { x: 0, y: 0 };
            zone.x = tile.x - offset.x;
            zone.y = tile.y - offset.y;
            canvas.style.cursor = 'grabbing';
            markDirty();
            draw();
            return;
        }
    }

    // Handle terrain zone drawing/resizing
    // Drawing new zone
    if (isDrawingTerrainZone && terrainZoneStart) {
        const minX = Math.min(terrainZoneStart.x, tile.x);
        const minY = Math.min(terrainZoneStart.y, tile.y);
        const maxX = Math.max(terrainZoneStart.x, tile.x);
        const maxY = Math.max(terrainZoneStart.y, tile.y);

        terrainZonePreview = {
            x: minX,
            y: minY,
            width: Math.max(1, maxX - minX + 1),
            height: Math.max(1, maxY - minY + 1)
        };
        canvas.style.cursor = 'crosshair';
        draw();
        return;
    }

    // Resizing existing zone
    if (resizingHandle !== null && selectedTerrainZone !== null) {
        const zone = gameObjects[selectedTerrainZone];
        if (zone && zone.type === 'terrainZone') {
            const origRight = zone.x + (zone.width || 1);
            const origBottom = zone.y + (zone.height || 1);

            // Resize based on handle being dragged
            switch (resizingHandle) {
                case 'nw':
                    zone.width = Math.max(1, origRight - tile.x);
                    zone.height = Math.max(1, origBottom - tile.y);
                    zone.x = Math.min(tile.x, origRight - 1);
                    zone.y = Math.min(tile.y, origBottom - 1);
                    break;
                case 'n':
                    zone.height = Math.max(1, origBottom - tile.y);
                    zone.y = Math.min(tile.y, origBottom - 1);
                    break;
                case 'ne':
                    zone.width = Math.max(1, tile.x - zone.x + 1);
                    zone.height = Math.max(1, origBottom - tile.y);
                    zone.y = Math.min(tile.y, origBottom - 1);
                    break;
                case 'e':
                    zone.width = Math.max(1, tile.x - zone.x + 1);
                    break;
                case 'se':
                    zone.width = Math.max(1, tile.x - zone.x + 1);
                    zone.height = Math.max(1, tile.y - zone.y + 1);
                    break;
                case 's':
                    zone.height = Math.max(1, tile.y - zone.y + 1);
                    break;
                case 'sw':
                    zone.width = Math.max(1, origRight - tile.x);
                    zone.height = Math.max(1, tile.y - zone.y + 1);
                    zone.x = Math.min(tile.x, origRight - 1);
                    break;
                case 'w':
                    zone.width = Math.max(1, origRight - tile.x);
                    zone.x = Math.min(tile.x, origRight - 1);
                    break;
            }
            canvas.style.cursor = getResizeHandleCursor(resizingHandle);
            markDirty();
            draw();
            return;
        }
    }

    // Hovering over terrain zones - update cursor based on position
    if (selectedTerrainZone !== null) {
        const handle = getResizeHandleAtPixel(x, y, selectedTerrainZone);
        if (handle) {
            canvas.style.cursor = getResizeHandleCursor(handle);
        } else {
            const zoneIndex = findTerrainZoneAtPixel(x, y);
            canvas.style.cursor = zoneIndex !== -1 ? 'grab' : 'default';
        }
    } else {
        // Check if hovering over any zone (for cursor feedback)
        const zoneIndex = findTerrainZoneAtPixel(x, y);
        if (zoneIndex !== -1 && !isDragging && !isDraggingObject && !selectedObjectType) {
            canvas.style.cursor = 'pointer';
        }
    }

    // Dragging object in move tool
    if (isDraggingObject) {
        if (isDraggingPlayer) {
            // Dragging the player - update spawn point position
            // Validate bounds
            if (tile.x >= 0 && tile.x < levelWidth && tile.y >= 0 && tile.y < levelHeight) {
                spawnPoint = { x: tile.x, y: tile.y };
                updateSpawnUI();
            }
        } else if (selectedMoveObject !== null) {
            // Dragging a game object
            const obj = gameObjects[selectedMoveObject];
            obj.x = tile.x;
            obj.y = tile.y;
        } else if (draggedTileKey !== null) {
            // Dragging a tile - just update hover position for preview
            // The actual placement happens on mouseup
        }
        draw();
        return;
    }

    // Panning
    if (isDragging) {
        cameraX = dragStartCamX - (e.clientX - dragStartX) / zoom;
        cameraY = dragStartCamY - (e.clientY - dragStartY) / zoom;
        clampCamera();
    }

    // Paint while dragging (only for draw/erase tools, not fill)
    if (e.buttons === 1 && !isDragging && !isDraggingObject && currentTool !== 'fill') {
        if (currentTool === 'draw') {
            setTileAt(tile.x, tile.y, selectedTileKey);
        } else if (currentTool === 'erase') {
            setTileAt(tile.x, tile.y, '.');
            removeGameObjectAt(tile.x, tile.y); // Also remove any game object
        }
    }

    // Erase while dragging with right button (not for fill tool)
    if (e.buttons === 2 && currentTool !== 'fill' && !isDraggingObject) {
        setTileAt(tile.x, tile.y, '.');
        removeGameObjectAt(tile.x, tile.y); // Also remove any game object
    }

    draw();
}

function onCanvasMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tile = screenToTile(x, y);

    // Universal object dragging: Check if clicking directly on an object/player
    // Works regardless of current tool, EXCEPT when using erase tool (erase should delete, not drag)
    // Also works even if an object type is selected for placement (clears selection first)
    if (e.button === 0 && currentTool !== 'erase') {
        const hitResult = findObjectAtPixel(x, y);

        if (hitResult) {
            // Clear any object placement selection so dragging works
            if (selectedObjectType) {
                clearObjectSelection();
            }

            if (hitResult.type === 'player') {
                // Clicking on player - start dragging
                isDraggingPlayer = true;
                isDraggingObject = true;
                saveUndoState('Move Player');
                startPulseAnimation();

                // Update code preview panel for player
                if (typeof CodePreview !== 'undefined') {
                    CodePreview.setContext('player', {
                        playerWidth: gameSettings.playerWidth,
                        playerHeight: gameSettings.playerHeight,
                        playerColor: gameSettings.playerColor,
                        playerSpriteURL: gameSettings.playerSpriteURL
                    });
                }
                return;
            } else if (hitResult.type === 'object') {
                // Clicking on a game object - start dragging
                selectedMoveObject = hitResult.index;
                isDraggingObject = true;
                saveUndoState('Move Object');
                startPulseAnimation();

                // Update code preview panel for selected object
                if (typeof CodePreview !== 'undefined') {
                    const obj = gameObjects[hitResult.index];
                    if (obj) {
                        const contextMap = {
                            'enemy': 'enemy',
                            'collectible': 'collectible',
                            'hazard': 'hazard',
                            'powerup': 'collectible',
                            'spring': 'spring',
                            'movingPlatform': 'movingPlatform',
                            'mysteryBlock': 'mysteryBlock',
                            'checkpoint': 'checkpoint',
                            'goal': 'checkpoint',
                            'npc': 'enemy',
                            'door': 'checkpoint'
                        };
                        const context = contextMap[obj.type] || 'idle';
                        const template = typeof getTemplate === 'function' ?
                            getTemplate(obj.type, obj.templateId) : {};
                        CodePreview.setContext(context, { template });
                    }
                }
                return;
            }
        }

        // Alt+click to grab and move tiles (works with any tool except erase)
        if (e.altKey) {
            const tileKey = getTileAt(tile.x, tile.y);
            if (tileKey !== '.') {
                // Pick up the tile
                draggedTileKey = tileKey;
                draggedTileOrigin = { x: tile.x, y: tile.y };
                isDraggingObject = true;
                saveUndoState('Move Tile');
                setTileAt(tile.x, tile.y, '.'); // Remove from original position
                canvas.style.cursor = 'grabbing';
                return;
            }
        }
    }

    // Handle move tool (for tile dragging - objects handled above)
    if (currentTool === 'move') {
        if (e.button === 0) {
            // Left click - try to drag a tile (objects already handled above)
            const tileKey = getTileAt(tile.x, tile.y);
            if (tileKey !== '.') {
                // Pick up the tile
                draggedTileKey = tileKey;
                draggedTileOrigin = { x: tile.x, y: tile.y };
                isDraggingObject = true; // Reuse the flag
                saveUndoState('Move Tile');
                setTileAt(tile.x, tile.y, '.'); // Remove from original position
            }
            return;
        } else if (e.button === 2) {
            // Right click - cancel selection
            if (isDraggingPlayer) {
                isDraggingPlayer = false;
                isDraggingObject = false;
                stopPulseAnimation();
                draw();
                showToast('Move cancelled');
            } else if (selectedMoveObject !== null) {
                selectedMoveObject = null;
                stopPulseAnimation();
                draw();
                showToast('Move cancelled');
            } else if (draggedTileKey !== null && draggedTileOrigin) {
                // Return dragged tile to original position
                setTileAt(draggedTileOrigin.x, draggedTileOrigin.y, draggedTileKey);
                draggedTileKey = null;
                draggedTileOrigin = null;
                draw();
                showToast('Move cancelled');
            }
            return;
        }
    }

    // Right-click to cancel object drag (works with any tool)
    if (e.button === 2 && (isDraggingPlayer || selectedMoveObject !== null)) {
        if (isDraggingPlayer) {
            isDraggingPlayer = false;
            isDraggingObject = false;
            stopPulseAnimation();
            draw();
            showToast('Move cancelled');
        } else if (selectedMoveObject !== null) {
            selectedMoveObject = null;
            isDraggingObject = false;
            stopPulseAnimation();
            draw();
            showToast('Move cancelled');
        }
        return;
    }

    // Handle terrain zone placement and interaction when in terrainZone mode
    if (selectedObjectType === 'terrainZone') {
        if (e.button === 0) {
            // Left click - first check if clicking on an existing zone
            const zoneIndex = findTerrainZoneAtPixel(x, y);

            if (zoneIndex !== -1) {
                // Clicked on an existing zone
                // Check if clicking on a resize handle of the SAME zone (already selected)
                if (selectedTerrainZone === zoneIndex) {
                    const handle = getResizeHandleAtPixel(x, y, zoneIndex);
                    if (handle) {
                        // Start resizing this zone
                        resizingHandle = handle;
                        saveUndoState('Resize Zone');
                        return;
                    }
                }

                // Select this zone and prepare for dragging
                selectedTerrainZone = zoneIndex;
                resizingHandle = null;
                const zone = gameObjects[zoneIndex];
                window.terrainZoneDragOffset = {
                    x: tile.x - zone.x,
                    y: tile.y - zone.y
                };
                window.isDraggingTerrainZone = true;
                saveUndoState('Move Zone');
                draw();
                return;
            } else {
                // Clicked on empty space - start drawing a new zone
                isDrawingTerrainZone = true;
                terrainZoneStart = { x: tile.x, y: tile.y };
                terrainZonePreview = { x: tile.x, y: tile.y, width: 1, height: 1 };
                selectedTerrainZone = null;
                saveUndoState('Add Zone');
                return;
            }
        } else if (e.button === 2) {
            // Right click - delete zone if selected, or cancel drawing
            if (selectedTerrainZone !== null) {
                saveUndoState('Delete Zone');
                gameObjects.splice(selectedTerrainZone, 1);
                selectedTerrainZone = null;
                markDirty();
                draw();
                showToast('Zone deleted', 'info');
                return;
            } else if (isDrawingTerrainZone) {
                isDrawingTerrainZone = false;
                terrainZoneStart = null;
                terrainZonePreview = null;
                draw();
                return;
            }
        }
    }

    // Handle terrain zone interaction when NOT in terrainZone mode (click to select/move/delete existing zones)
    if (e.button === 0 && selectedObjectType !== 'terrainZone') {
        const zoneIndex = findTerrainZoneAtPixel(x, y);
        if (zoneIndex !== -1) {
            // Check if clicking on a resize handle of the selected zone
            if (selectedTerrainZone === zoneIndex) {
                const handle = getResizeHandleAtPixel(x, y, zoneIndex);
                if (handle) {
                    resizingHandle = handle;
                    saveUndoState('Resize Zone');
                    return;
                }
            }
            // Select and prepare to drag
            selectedTerrainZone = zoneIndex;
            resizingHandle = null;
            const zone = gameObjects[zoneIndex];
            window.terrainZoneDragOffset = {
                x: tile.x - zone.x,
                y: tile.y - zone.y
            };
            window.isDraggingTerrainZone = true;
            saveUndoState('Move Zone');
            draw();
            return;
        } else if (selectedTerrainZone !== null) {
            // Clicked outside any zone - deselect
            selectedTerrainZone = null;
            draw();
        }
    }

    // Right-click to delete a selected terrain zone (works in any mode)
    if (e.button === 2 && selectedTerrainZone !== null) {
        saveUndoState('Delete Zone');
        gameObjects.splice(selectedTerrainZone, 1);
        selectedTerrainZone = null;
        markDirty();
        draw();
        showToast('Zone deleted', 'info');
        return;
    }

    // Handle game object placement (non-terrain-zone)
    if (selectedObjectType && selectedObjectType !== 'terrainZone') {
        if (e.button === 0) {
            // Left click - place object (with template ID)
            addGameObject(tile.x, tile.y, selectedObjectType, selectedTemplateId);
            return;
        } else if (e.button === 2) {
            // Right click - remove object if one exists, otherwise deselect object mode
            const objIndex = findObjectAt(tile.x, tile.y);
            if (objIndex >= 0) {
                removeGameObjectAt(tile.x, tile.y);
            } else {
                // No object here - deselect and return to tile editing mode
                clearObjectSelection();
            }
            return;
        }
    }

    if (e.button === 0) {
        // Left click - use current tool
        switch(currentTool) {
            case 'draw':
                // Save state at start of drawing stroke
                if (!isDrawingStroke) {
                    saveUndoState('Draw');
                    isDrawingStroke = true;
                }
                setTileAt(tile.x, tile.y, selectedTileKey);
                break;
            case 'fill':
                // Save state before fill (fill is a single operation)
                saveUndoState('Fill');
                floodFill(tile.x, tile.y, selectedTileKey);
                break;
            case 'erase':
                // Save state at start of erase stroke
                if (!isDrawingStroke) {
                    saveUndoState('Erase');
                    isDrawingStroke = true;
                }
                setTileAt(tile.x, tile.y, '.');
                removeGameObjectAt(tile.x, tile.y); // Also remove any game object at this location
                break;
        }
        draw();
    } else if (e.button === 1) {
        // Middle click - pan
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartCamX = cameraX;
        dragStartCamY = cameraY;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
    } else if (e.button === 2) {
        // Right click - erase (or fill with empty if using fill tool)
        if (currentTool === 'fill') {
            saveUndoState('Fill Erase');
            floodFill(tile.x, tile.y, '.');
        } else {
            if (!isDrawingStroke) {
                saveUndoState('Erase');
                isDrawingStroke = true;
            }
            setTileAt(tile.x, tile.y, '.');
            removeGameObjectAt(tile.x, tile.y); // Also remove any game object at this location
        }
        draw();
    }
}

// Helper function to find an object at a specific tile position (legacy - base tile only)
function findObjectAt(tileX, tileY) {
    return gameObjects.findIndex(obj => obj.x === tileX && obj.y === tileY);
}

// Pixel-based hit detection - checks actual bounding box of objects
// Returns { type: 'player'|'object', index: number } or null
function findObjectAtPixel(screenX, screenY) {
    const scaledTileSize = tileSize * zoom;

    // Check player first (highest priority for selection)
    const playerPos = typeof getSpawnPosition === 'function' ? getSpawnPosition() : null;
    if (playerPos) {
        const playerW = (gameSettings.playerWidth || 32) * zoom;
        const playerH = (gameSettings.playerHeight || 32) * zoom;

        // Player position: centered X, bottom-aligned in tile
        const pTileScreenX = (playerPos.x * tileSize - cameraX) * zoom;
        const pTileScreenY = (playerPos.y * tileSize - cameraY) * zoom;
        const pScreenX = pTileScreenX + (scaledTileSize - playerW) / 2;
        const pScreenY = pTileScreenY + scaledTileSize - playerH;

        if (screenX >= pScreenX && screenX <= pScreenX + playerW &&
            screenY >= pScreenY && screenY <= pScreenY + playerH) {
            return { type: 'player', index: -1 };
        }
    }

    // Check objects (iterate in reverse so top-rendered objects are checked first)
    for (let i = gameObjects.length - 1; i >= 0; i--) {
        const obj = gameObjects[i];
        const template = getTemplate(obj.type, obj.templateId);
        const objWidth = (template?.width || tileSize) * zoom;
        const objHeight = (template?.height || tileSize) * zoom;

        // Object position: centered X, bottom-aligned in tile
        const objTileScreenX = (obj.x * tileSize - cameraX) * zoom;
        const objTileScreenY = (obj.y * tileSize - cameraY) * zoom;
        const objScreenX = objTileScreenX + (scaledTileSize - objWidth) / 2;
        const objScreenY = objTileScreenY + scaledTileSize - objHeight;

        if (screenX >= objScreenX && screenX <= objScreenX + objWidth &&
            screenY >= objScreenY && screenY <= objScreenY + objHeight) {
            return { type: 'object', index: i };
        }
    }

    return null;
}

// Animation loop for pulsing selected object
let pulseAnimationFrame = null;
function startPulseAnimation() {
    if (pulseAnimationFrame) return; // Already running

    function pulse() {
        if (selectedMoveObject !== null) {
            draw();
            pulseAnimationFrame = requestAnimationFrame(pulse);
        } else {
            pulseAnimationFrame = null;
        }
    }
    pulse();
}

function stopPulseAnimation() {
    if (pulseAnimationFrame) {
        cancelAnimationFrame(pulseAnimationFrame);
        pulseAnimationFrame = null;
    }
}

// Get the current spawn position (manual or auto-detected)
function getSpawnPosition() {
    if (spawnPoint) {
        return { x: spawnPoint.x, y: spawnPoint.y };
    }

    // Auto-detect first valid spawn position
    for (let y = 0; y < level.length - 1; y++) {
        for (let x = 0; x < (level[y] ? level[y].length : 0); x++) {
            const current = level[y][x];
            const below = level[y + 1] ? level[y + 1][x] : '.';
            if (current === '.' && tiles[below] && tiles[below].solid) {
                // Check if there's a game object at this position - skip if so
                const hasObject = gameObjects.some(obj => obj.x === x && obj.y === y);
                if (!hasObject) {
                    return { x: x, y: y };
                }
            }
        }
    }

    // Default to top-left if nothing found
    return { x: 0, y: Math.max(0, levelHeight - 2) };
}

function setSpawnPoint(tileX, tileY) {
    // Validate tile position is within level bounds
    if (tileX < 0 || tileX >= levelWidth || tileY < 0 || tileY >= levelHeight) {
        showToast('Spawn point must be within level bounds', 'error');
        return;
    }

    saveUndoState('Set Spawn Point');
    spawnPoint = { x: tileX, y: tileY };
    markDirty();
    updateSpawnUI();
    showToast(`Spawn point set at (${tileX}, ${tileY})`);
}

function clearSpawnPoint() {
    saveUndoState('Clear Spawn Point');

    // If editing a level via Level Settings modal, clear that level's spawn point
    if (typeof editingLevelIndex !== 'undefined' && editingLevelIndex >= 0 && levels[editingLevelIndex]) {
        if (editingLevelIndex === currentLevelIndex) {
            // Current level - clear both global and stored
            spawnPoint = null;
            levels[editingLevelIndex].spawnPoint = null;
        } else {
            // Different level - only clear stored spawn point
            levels[editingLevelIndex].spawnPoint = null;
        }
    } else {
        // No modal open - just clear global (current level)
        spawnPoint = null;
    }

    markDirty();
    updateSpawnUI();
    showToast('Spawn point cleared - using auto-detect');
    draw();
}

function updateSpawnUI() {
    // Update Level Settings modal spawn UI
    // Use the level being edited in the modal, or fall back to global spawnPoint
    let sp = spawnPoint;

    // If Level Settings modal is open for a specific level, use that level's spawn point
    if (typeof editingLevelIndex !== 'undefined' && editingLevelIndex >= 0 && levels[editingLevelIndex]) {
        if (editingLevelIndex === currentLevelIndex) {
            // Current level - use global spawnPoint (it's the working copy)
            sp = spawnPoint;
        } else {
            // Different level - use stored spawn point
            sp = levels[editingLevelIndex].spawnPoint;
        }
    }

    const statusEl = document.getElementById('level-spawn-status');
    const clearBtn = document.getElementById('level-clear-spawn-btn');

    if (statusEl) {
        if (sp) {
            statusEl.textContent = `Custom (${sp.x}, ${sp.y})`;
            statusEl.style.color = '#00ff88';
        } else {
            statusEl.textContent = 'Auto-Detect';
            statusEl.style.color = '#ffaa00';
        }
    }

    if (clearBtn) {
        clearBtn.style.display = sp ? 'block' : 'none';
    }
}

// Alias for clarity in Level Settings context
function updateLevelSpawnUI() {
    updateSpawnUI();
}

function onCanvasMouseUp(e) {
    // Finish terrain zone drawing
    if (e.button === 0 && isDrawingTerrainZone && terrainZonePreview) {
        isDrawingTerrainZone = false;

        // Create the terrain zone object
        const newZone = {
            type: 'terrainZone',
            templateId: selectedTemplateId,
            x: terrainZonePreview.x,
            y: terrainZonePreview.y,
            width: terrainZonePreview.width,
            height: terrainZonePreview.height
        };

        gameObjects.push(newZone);
        selectedTerrainZone = gameObjects.length - 1; // Select the new zone
        updateObjectCount();
        markDirty();

        terrainZoneStart = null;
        terrainZonePreview = null;

        const template = getTemplate('terrainZone', selectedTemplateId);
        showToast(`Created ${template?.name || 'Zone'} (${newZone.width}x${newZone.height} tiles)`);
        draw();
        return;
    }

    // Finish terrain zone resizing
    if (e.button === 0 && resizingHandle !== null) {
        resizingHandle = null;
        markDirty();
        showToast('Zone resized');
        draw();
        return;
    }

    // Finish terrain zone dragging (moving)
    if (e.button === 0 && window.isDraggingTerrainZone) {
        window.isDraggingTerrainZone = false;
        window.terrainZoneDragOffset = null;
        canvas.style.cursor = 'grab';
        markDirty();
        showToast('Zone moved');
        draw();
        return;
    }

    // Finish dragging in move tool
    if (e.button === 0 && isDraggingObject) {
        isDraggingObject = false;
        canvas.style.cursor = 'crosshair'; // Reset cursor after drag

        // Finish dragging player
        if (isDraggingPlayer) {
            isDraggingPlayer = false;
            stopPulseAnimation();
            markDirty();
            draw();
            showToast(`Player moved to (${spawnPoint.x}, ${spawnPoint.y})`);
            return;
        }

        // Place dragged tile
        if (draggedTileKey !== null) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const tile = screenToTile(x, y);

            // Place the tile at the new position
            setTileAt(tile.x, tile.y, draggedTileKey);
            draggedTileKey = null;
            draggedTileOrigin = null;
        }

        // Clear object selection
        selectedMoveObject = null;
        stopPulseAnimation();
        markDirty();
        draw();
        return;
    }

    if (e.button === 1) {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    }
    // End drawing stroke on mouse up (left or right button)
    if (e.button === 0 || e.button === 2) {
        isDrawingStroke = false;
    }
}

function onCanvasMouseLeave() {
    hoverX = -1;
    hoverY = -1;
    isDragging = false;
    isDrawingStroke = false; // End drawing stroke when leaving canvas

    // Cancel terrain zone drawing if mouse leaves canvas
    if (isDrawingTerrainZone) {
        isDrawingTerrainZone = false;
        terrainZoneStart = null;
        terrainZonePreview = null;
    }

    // Cancel terrain zone resizing if mouse leaves canvas
    if (resizingHandle !== null) {
        resizingHandle = null;
    }

    // Cancel terrain zone dragging if mouse leaves canvas
    if (window.isDraggingTerrainZone) {
        window.isDraggingTerrainZone = false;
        window.terrainZoneDragOffset = null;
    }

    // Cancel drag if mouse leaves canvas
    if (isDraggingObject) {
        isDraggingObject = false;

        // Return dragged tile to original position
        if (draggedTileKey !== null && draggedTileOrigin) {
            setTileAt(draggedTileOrigin.x, draggedTileOrigin.y, draggedTileKey);
            draggedTileKey = null;
            draggedTileOrigin = null;
        }

        selectedMoveObject = null;
        stopPulseAnimation();
        draw();
    }

    canvas.style.cursor = 'crosshair';
    draw();
}

function onCanvasWheel(e) {
    e.preventDefault();

    // Support two-finger trackpad scrolling (deltaX and deltaY)
    // Also support Shift+scroll for horizontal when using mouse wheel
    if (e.shiftKey) {
        // Shift + scroll = horizontal pan
        cameraX += e.deltaY * 0.5;
    } else {
        // Normal scroll = vertical pan (most intuitive)
        // Also handle horizontal trackpad scrolling via deltaX
        cameraY += e.deltaY * 0.5;
        cameraX += e.deltaX * 0.5;
    }

    clampCamera();
    draw();
}

function clampCamera() {
    const maxX = Math.max(0, levelWidth * tileSize - canvas.width / zoom);
    const maxY = Math.max(0, levelHeight * tileSize - canvas.height / zoom);
    cameraX = Math.max(0, Math.min(cameraX, maxX));
    cameraY = Math.max(0, Math.min(cameraY, maxY));
}

// ============================================
// TERRAIN ZONE HELPER FUNCTIONS
// ============================================

// Find terrain zone at a pixel position (for selection)
function findTerrainZoneAtPixel(screenX, screenY) {
    const tile = screenToTile(screenX, screenY);

    // Search in reverse order (topmost zones first)
    for (let i = gameObjects.length - 1; i >= 0; i--) {
        const obj = gameObjects[i];
        if (obj.type !== 'terrainZone') continue;

        // Check if tile is within zone bounds
        const zoneWidth = obj.width || 1;
        const zoneHeight = obj.height || 1;

        if (tile.x >= obj.x && tile.x < obj.x + zoneWidth &&
            tile.y >= obj.y && tile.y < obj.y + zoneHeight) {
            return i;
        }
    }
    return -1;
}

// Get resize handle at pixel position (returns handle name or null)
// Handle positions: 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
function getResizeHandleAtPixel(screenX, screenY, zoneIndex) {
    if (zoneIndex === -1 || zoneIndex >= gameObjects.length) return null;

    const zone = gameObjects[zoneIndex];
    if (zone.type !== 'terrainZone') return null;

    const handleSize = 8; // Size of handle in pixels
    const halfHandle = handleSize / 2;

    // Calculate zone screen coordinates
    const zoneLeft = (zone.x * tileSize - cameraX) * zoom;
    const zoneTop = (zone.y * tileSize - cameraY) * zoom;
    const zoneRight = ((zone.x + (zone.width || 1)) * tileSize - cameraX) * zoom;
    const zoneBottom = ((zone.y + (zone.height || 1)) * tileSize - cameraY) * zoom;
    const zoneMidX = (zoneLeft + zoneRight) / 2;
    const zoneMidY = (zoneTop + zoneBottom) / 2;

    // Define handle positions
    const handles = {
        'nw': { x: zoneLeft, y: zoneTop },
        'n':  { x: zoneMidX, y: zoneTop },
        'ne': { x: zoneRight, y: zoneTop },
        'e':  { x: zoneRight, y: zoneMidY },
        'se': { x: zoneRight, y: zoneBottom },
        's':  { x: zoneMidX, y: zoneBottom },
        'sw': { x: zoneLeft, y: zoneBottom },
        'w':  { x: zoneLeft, y: zoneMidY }
    };

    // Check if click is within any handle
    for (const [name, pos] of Object.entries(handles)) {
        if (screenX >= pos.x - halfHandle && screenX <= pos.x + halfHandle &&
            screenY >= pos.y - halfHandle && screenY <= pos.y + halfHandle) {
            return name;
        }
    }

    return null;
}

// Get cursor style for a resize handle
function getResizeHandleCursor(handle) {
    const cursors = {
        'nw': 'nwse-resize',
        'n': 'ns-resize',
        'ne': 'nesw-resize',
        'e': 'ew-resize',
        'se': 'nwse-resize',
        's': 'ns-resize',
        'sw': 'nesw-resize',
        'w': 'ew-resize'
    };
    return cursors[handle] || 'default';
}

function onKeyDown(e) {
    // Ignore keyboard shortcuts when typing in inputs
    const tag = document.activeElement.tagName.toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea';

    // Escape key - deselect object placement mode and return to tile editing
    if (!isTyping && e.key === 'Escape') {
        if (selectedObjectType) {
            clearObjectSelection();
            e.preventDefault();
            return;
        }
        // Also deselect any selected terrain zone
        if (selectedTerrainZone !== null) {
            selectedTerrainZone = null;
            draw();
            e.preventDefault();
            return;
        }
    }

    // Tool shortcuts (D=Draw, F=Fill, E=Erase, M=Move)
    if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'd') {
            setTool('draw');
            e.preventDefault();
            return;
        } else if (key === 'f') {
            setTool('fill');
            e.preventDefault();
            return;
        } else if (key === 'e') {
            setTool('erase');
            e.preventDefault();
            return;
        } else if (key === 'm') {
            setTool('move');
            e.preventDefault();
            return;
        }
    }

    // Tile selection by number shortcut (0-9)
    if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 0 && num <= 9) {
            const tileKey = getTileKeyByShortcut(num);
            if (tileKey !== null) {
                selectTile(tileKey);
                e.preventDefault();
                return;
            }
        }
    }

    // Ctrl+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
    }

    // Ctrl+Z to undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }

    // Ctrl+Y or Ctrl+Shift+Z to redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
        e.preventDefault();
        redo();
    }

    // Arrow keys to pan
    const panSpeed = 32;
    if (e.key === 'ArrowLeft') cameraX -= panSpeed;
    if (e.key === 'ArrowRight') cameraX += panSpeed;
    if (e.key === 'ArrowUp') cameraY -= panSpeed;
    if (e.key === 'ArrowDown') cameraY += panSpeed;

    clampCamera();
    draw();
}
