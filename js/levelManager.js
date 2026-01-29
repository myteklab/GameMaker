// ============================================
// LEVEL MANAGER
// ============================================
// Handles multi-level management: create, switch, delete, reorder

// BGM Preview for level settings
let bgmPreviewAudio = null;

function toggleBgmPreview() {
    const bgmUrl = document.getElementById('level-settings-bgm').value.trim();
    const btn = document.getElementById('level-settings-bgm-preview-btn');

    if (!bgmUrl) {
        showToast('No background music selected', 'error');
        return;
    }

    // If already playing, stop it
    if (bgmPreviewAudio && !bgmPreviewAudio.paused) {
        bgmPreviewAudio.pause();
        bgmPreviewAudio.currentTime = 0;
        btn.innerHTML = '▶ Preview';
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        return;
    }

    // Start playing
    const volume = parseInt(document.getElementById('level-settings-bgm-volume').value) / 100;

    bgmPreviewAudio = new Audio(bgmUrl);
    bgmPreviewAudio.volume = volume;
    bgmPreviewAudio.loop = true;

    bgmPreviewAudio.play().then(() => {
        btn.innerHTML = '⏸ Stop';
        btn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
    }).catch(err => {
        showToast('Could not play audio: ' + err.message, 'error');
    });

    // Update button when audio ends (shouldn't happen with loop, but just in case)
    bgmPreviewAudio.onended = function() {
        btn.innerHTML = '▶ Preview';
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    };
}

function updateBgmPreviewVolume(value) {
    // Update display
    document.getElementById('level-settings-bgm-volume-display').textContent = value + '%';

    // Update preview audio if playing
    if (bgmPreviewAudio && !bgmPreviewAudio.paused) {
        bgmPreviewAudio.volume = value / 100;
    }
}

function stopBgmPreview() {
    if (bgmPreviewAudio) {
        bgmPreviewAudio.pause();
        bgmPreviewAudio.currentTime = 0;
        bgmPreviewAudio = null;
    }
    const btn = document.getElementById('level-settings-bgm-preview-btn');
    if (btn) {
        btn.innerHTML = '▶ Preview';
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// Initialize levels system
function initLevels() {
    if (levels.length === 0) {
        // Create default first level with current data
        const firstLevel = createNewLevel('level_1', 'Level 1');
        firstLevel.width = levelWidth;
        firstLevel.height = levelHeight;
        firstLevel.tiles = level.length > 0 ? level.slice() : [];
        firstLevel.gameObjects = gameObjects.slice();
        firstLevel.spawnPoint = spawnPoint;
        firstLevel.backgroundLayers = backgroundLayers.slice();
        levels.push(firstLevel);
    }
    currentLevelIndex = 0;
    syncFromCurrentLevel();
    updateLevelsList();
    updateLevelIndicator();
}

// Sync global variables from current level
function syncFromCurrentLevel() {
    const lvl = getCurrentLevel();
    levelWidth = lvl.width;
    levelHeight = lvl.height;
    level = lvl.tiles;
    gameObjects = lvl.gameObjects;
    spawnPoint = lvl.spawnPoint;
    backgroundLayers = lvl.backgroundLayers || [];

    // Validate level data to catch corruption
    if (!Array.isArray(level)) {
        console.error('syncFromCurrentLevel: level is not an array!', level);
        initLevelTiles();
        return;
    }
    for (let y = 0; y < level.length; y++) {
        if (typeof level[y] !== 'string') {
            console.error('syncFromCurrentLevel: level[' + y + '] is not a string!', level[y]);
            level[y] = '.'.repeat(levelWidth);
        }
    }

    // Initialize empty tiles if needed
    if (level.length === 0) {
        initLevelTiles();
    }
}

// Initialize level tiles array
function initLevelTiles() {
    level = [];
    for (let y = 0; y < levelHeight; y++) {
        level.push('.'.repeat(levelWidth));
    }
    const lvl = getCurrentLevel();
    lvl.tiles = level;
}

// Sync current level from global variables (before switching)
function syncToCurrentLevel() {
    const lvl = getCurrentLevel();
    lvl.width = levelWidth;
    lvl.height = levelHeight;

    // Validate level before saving to catch corruption early
    if (!Array.isArray(level)) {
        console.error('syncToCurrentLevel: level is corrupted (not an array)!', level);
        console.trace('Stack trace for corruption');
        return; // Don't save corrupted data
    }
    for (let y = 0; y < level.length; y++) {
        if (typeof level[y] !== 'string') {
            console.error('syncToCurrentLevel: level[' + y + '] is corrupted!', level[y]);
            console.trace('Stack trace for corruption');
            return; // Don't save corrupted data
        }
        // Check for "undefined" string corruption
        if (level[y].includes('undefined')) {
            console.error('syncToCurrentLevel: level[' + y + '] contains "undefined" string!', level[y]);
            console.trace('Stack trace for corruption');
        }
    }

    lvl.tiles = level;
    lvl.gameObjects = gameObjects;
    lvl.spawnPoint = spawnPoint;
    lvl.backgroundLayers = backgroundLayers;
}

// ============================================
// LEVEL SWITCHING
// ============================================

function switchToLevel(index) {
    if (index < 0 || index >= levels.length) return;
    if (index === currentLevelIndex) return;

    // Save current level state
    syncToCurrentLevel();

    // Switch to new level
    currentLevelIndex = index;
    syncFromCurrentLevel();

    // Reset camera and clear undo
    cameraX = 0;
    cameraY = 0;
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();

    // Reload background images for this level
    loadBackgroundImages();

    // Update UI
    updateLevelsList();
    updateLevelIndicator();
    updateLevelSizeDisplay();
    updateSpawnUI();
    updateObjectCount();
    renderBackgroundLayers();
    clampCamera();

    // Update editor UI for level type (show/hide tile palette etc)
    updateEditorForLevelType();

    draw();

    showToast(`Switched to: ${getCurrentLevel().name}`);
}

// Update editor UI based on level type (menu vs gameplay)
function updateEditorForLevelType() {
    const lvl = getCurrentLevel();
    const isMenu = lvl && lvl.levelType === 'menu';

    // Hide/show tile palette
    const tilePanel = document.querySelector('.tile-palette') || document.getElementById('tile-palette');
    if (tilePanel) {
        tilePanel.style.display = isMenu ? 'none' : '';
    }

    // Hide/show objects toolbar
    const objectsToolbar = document.getElementById('objects-toolbar');
    if (objectsToolbar) {
        objectsToolbar.style.display = isMenu ? 'none' : '';
    }

    // Hide/show spawn button
    const spawnBtn = document.getElementById('set-spawn-btn');
    if (spawnBtn) {
        spawnBtn.style.display = isMenu ? 'none' : '';
    }

    // Show menu editor notification if it's a menu level
    const editorCanvas = document.getElementById('editor-canvas');
    if (editorCanvas && isMenu) {
        // Add a class to indicate menu editing mode
        editorCanvas.classList.add('menu-level-editing');
    } else if (editorCanvas) {
        editorCanvas.classList.remove('menu-level-editing');
    }
}

// ============================================
// LEVEL CRUD
// ============================================

function addNewLevel() {
    // Save current level first
    syncToCurrentLevel();

    // Create new level
    const newIndex = levels.length + 1;
    const newLevel = createNewLevel(null, `Level ${newIndex}`);

    // Initialize empty tiles
    newLevel.tiles = [];
    for (let y = 0; y < newLevel.height; y++) {
        newLevel.tiles.push('.'.repeat(newLevel.width));
    }

    // Set previous level to progress to this one
    if (levels.length > 0) {
        levels[levels.length - 1].nextLevelId = newLevel.id;
    }

    levels.push(newLevel);

    // Switch to new level
    switchToLevel(levels.length - 1);

    markDirty();
    showToast(`Created: ${newLevel.name}`);
}

function duplicateCurrentLevel() {
    syncToCurrentLevel();

    const current = getCurrentLevel();
    const newLevel = createNewLevel(null, `${current.name} (Copy)`);

    // Deep copy level data
    newLevel.width = current.width;
    newLevel.height = current.height;
    newLevel.tiles = current.tiles.map(row => row);
    newLevel.gameObjects = current.gameObjects.map(obj => ({...obj}));
    newLevel.spawnPoint = current.spawnPoint ? {...current.spawnPoint} : null;
    newLevel.backgroundLayers = current.backgroundLayers.map(layer => ({...layer}));
    newLevel.goalCondition = current.goalCondition;
    newLevel.requiredScore = current.requiredScore;
    newLevel.timeLimit = current.timeLimit;
    // Copy level sounds
    if (current.sounds) {
        newLevel.sounds = {...current.sounds};
    }

    // Insert after current level
    levels.splice(currentLevelIndex + 1, 0, newLevel);

    // Update nextLevelId references
    updateLevelProgression();

    // Switch to duplicated level
    switchToLevel(currentLevelIndex + 1);

    markDirty();
    showToast(`Duplicated: ${newLevel.name}`);
}

function deleteLevel(index) {
    if (levels.length <= 1) {
        showToast('Cannot delete the only level', 'error');
        return;
    }

    const levelName = levels[index].name;

    if (!confirm(`Delete "${levelName}"? This cannot be undone.`)) {
        return;
    }

    levels.splice(index, 1);

    // Adjust current index if needed
    if (currentLevelIndex >= levels.length) {
        currentLevelIndex = levels.length - 1;
    } else if (currentLevelIndex > index) {
        currentLevelIndex--;
    }

    // Update level progression
    updateLevelProgression();

    // Sync to current level
    syncFromCurrentLevel();

    updateLevelsList();
    updateLevelIndicator();
    markDirty();
    draw();

    showToast(`Deleted: ${levelName}`);
}

function moveLevelUp(index) {
    if (index <= 0) return;

    const temp = levels[index];
    levels[index] = levels[index - 1];
    levels[index - 1] = temp;

    // Update current index if affected
    if (currentLevelIndex === index) {
        currentLevelIndex--;
    } else if (currentLevelIndex === index - 1) {
        currentLevelIndex++;
    }

    updateLevelProgression();
    updateLevelsList();
    updateLevelIndicator();
    markDirty();
}

function moveLevelDown(index) {
    if (index >= levels.length - 1) return;

    const temp = levels[index];
    levels[index] = levels[index + 1];
    levels[index + 1] = temp;

    // Update current index if affected
    if (currentLevelIndex === index) {
        currentLevelIndex++;
    } else if (currentLevelIndex === index + 1) {
        currentLevelIndex--;
    }

    updateLevelProgression();
    updateLevelsList();
    updateLevelIndicator();
    markDirty();
}

// Update nextLevelId to follow array order
function updateLevelProgression() {
    for (let i = 0; i < levels.length; i++) {
        if (i < levels.length - 1) {
            levels[i].nextLevelId = levels[i + 1].id;
        } else {
            levels[i].nextLevelId = null; // Last level
        }
    }
}

// ============================================
// LEVEL SETTINGS
// ============================================

function renameLevel(index, newName) {
    if (!newName || newName.trim() === '') {
        showToast('Level name cannot be empty', 'error');
        return;
    }

    levels[index].name = newName.trim();
    updateLevelsList();
    updateLevelIndicator();
    markDirty();
}

function setLevelGoalCondition(index, condition) {
    levels[index].goalCondition = condition;
    markDirty();
}

function setLevelRequiredScore(index, score) {
    levels[index].requiredScore = parseInt(score) || 0;
    markDirty();
}

function setLevelTimeLimit(index, time) {
    levels[index].timeLimit = parseInt(time) || 0;
    markDirty();
}

// ============================================
// UI UPDATES
// ============================================

function updateLevelIndicator() {
    const indicator = document.getElementById('current-level-indicator');
    if (indicator) {
        const lvl = getCurrentLevel();
        indicator.textContent = `${lvl.name} (${currentLevelIndex + 1}/${levels.length})`;
    }
}

function updateLevelsList() {
    const list = document.getElementById('levels-list');
    if (!list) return;

    list.innerHTML = '';

    levels.forEach((lvl, index) => {
        const item = document.createElement('div');
        item.className = 'level-list-item' + (index === currentLevelIndex ? ' active' : '');
        item.onclick = function(e) {
            // Only switch if clicking on the card itself, not buttons
            if (e.target.closest('.level-action-btn')) return;
            switchToLevel(index);
        };

        const isCurrent = index === currentLevelIndex;
        const isFirst = index === 0;
        const isLast = index === levels.length - 1;

        // Create preview canvas
        const previewId = `level-preview-${index}`;

        const isMenuLevel = lvl.levelType === 'menu';
        const levelTypeBadge = isMenuLevel ? '<span class="level-type-badge menu">Menu</span>' : '';

        item.innerHTML = `
            <div class="level-preview">
                <canvas id="${previewId}" width="80" height="60"></canvas>
                <span class="level-preview-number">${index + 1}</span>
                ${isMenuLevel ? '<span class="level-preview-type">📋</span>' : ''}
            </div>
            <div class="level-content">
                <div class="level-header">
                    <span class="level-name">${escapeHtml(lvl.name)}</span>
                    ${levelTypeBadge}
                    ${isCurrent ? '<span class="level-current-badge">Editing</span>' : ''}
                </div>
                <div class="level-meta">
                    ${isMenuLevel
                        ? `<span class="level-buttons">${(lvl.menuButtons || []).length} buttons</span>`
                        : `<span class="level-size">${lvl.width} x ${lvl.height}</span>
                           <span class="level-objects">${lvl.gameObjects.length} obj</span>
                           <span class="level-goal">${getGoalConditionLabel(lvl.goalCondition)}</span>`
                    }
                </div>
            </div>
            <div class="level-actions">
                <div class="level-actions-row">
                    <button class="level-action-btn settings" onclick="event.stopPropagation(); showLevelSettingsModal(${index});" title="Level Settings">⚙️ Settings</button>
                </div>
                <div class="level-actions-row">
                    <button class="level-action-btn" onclick="event.stopPropagation(); moveLevelUp(${index});" ${isFirst ? 'disabled' : ''} title="Move Up">▲</button>
                    <button class="level-action-btn" onclick="event.stopPropagation(); moveLevelDown(${index});" ${isLast ? 'disabled' : ''} title="Move Down">▼</button>
                    <button class="level-action-btn danger" onclick="event.stopPropagation(); deleteLevel(${index});" ${levels.length <= 1 ? 'disabled' : ''} title="Delete">🗑️</button>
                </div>
            </div>
        `;

        list.appendChild(item);

        // Render the preview after adding to DOM
        setTimeout(() => renderLevelPreview(lvl, previewId), 0);
    });
}

// Render a mini preview of a level onto a canvas
function renderLevelPreview(lvl, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // If it's a menu level, render menu preview instead
    if (lvl.levelType === 'menu') {
        renderMenuLevelPreview(ctx, lvl, width, height);
        return;
    }

    // Calculate scale to fit level in preview
    const levelTiles = lvl.tiles || [];
    const levelWidth = lvl.width || 150;
    const levelHeight = lvl.height || 30;

    const scaleX = width / levelWidth;
    const scaleY = height / levelHeight;
    const scale = Math.min(scaleX, scaleY);

    // Center the level in the preview
    const offsetX = (width - levelWidth * scale) / 2;
    const offsetY = (height - levelHeight * scale) / 2;

    // Draw background layers first (behind everything else)
    const bgLayers = lvl.backgroundLayers || [];
    // Filter to only visible layers with valid src
    const validBgLayers = bgLayers.filter(layer => layer.src && layer.src.trim() !== '' && layer.visible !== false);
    let bgLoadCount = 0;
    const totalBgLayers = validBgLayers.length;

    // Calculate level bounds in preview coordinates
    const levelPixelWidth = levelWidth * scale;
    const levelPixelHeight = levelHeight * scale;

    if (totalBgLayers === 0) {
        // No backgrounds to load, draw the rest immediately
        drawLevelContent(ctx, lvl, width, height, scale, offsetX, offsetY);
    } else {
        // Load background images, then draw all in order
        const loadedImages = [];

        validBgLayers.forEach((layer, layerIndex) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                loadedImages[layerIndex] = img;
                bgLoadCount++;

                // After all backgrounds loaded, draw them in order then content
                if (bgLoadCount >= totalBgLayers) {
                    // Clip to level bounds
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(offsetX, offsetY, levelPixelWidth, levelPixelHeight);
                    ctx.clip();

                    // Draw all backgrounds in order
                    validBgLayers.forEach((bgLayer, idx) => {
                        const bgImg = loadedImages[idx];
                        if (!bgImg) return;

                        // Scale background to fit level width, align to bottom
                        const bgScale = levelPixelWidth / bgImg.width;
                        const drawWidth = levelPixelWidth;
                        const drawHeight = bgImg.height * bgScale;
                        const drawX = offsetX;
                        // Align background to bottom of level (like in-game)
                        const drawY = offsetY + levelPixelHeight - drawHeight;

                        ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
                    });

                    ctx.restore();

                    // Draw level content on top
                    drawLevelContent(ctx, lvl, width, height, scale, offsetX, offsetY);
                }
            };
            img.onerror = function() {
                loadedImages[layerIndex] = null;
                bgLoadCount++;
                if (bgLoadCount >= totalBgLayers) {
                    // Clip to level bounds
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(offsetX, offsetY, levelPixelWidth, levelPixelHeight);
                    ctx.clip();

                    // Draw any successfully loaded backgrounds
                    validBgLayers.forEach((bgLayer, idx) => {
                        const bgImg = loadedImages[idx];
                        if (!bgImg) return;

                        const bgScale = levelPixelWidth / bgImg.width;
                        const drawWidth = levelPixelWidth;
                        const drawHeight = bgImg.height * bgScale;
                        const drawX = offsetX;
                        const drawY = offsetY + levelPixelHeight - drawHeight;

                        ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
                    });

                    ctx.restore();

                    drawLevelContent(ctx, lvl, width, height, scale, offsetX, offsetY);
                }
            };
            img.src = layer.src;
        });
    }
}

// Helper function to draw tiles, objects, spawn point, and border
function drawLevelContent(ctx, lvl, width, height, scale, offsetX, offsetY) {
    const levelTiles = lvl.tiles || [];

    // Draw tiles
    for (let y = 0; y < levelTiles.length; y++) {
        const row = levelTiles[y] || '';
        for (let x = 0; x < row.length; x++) {
            const tileKey = row[x];
            if (tileKey !== '.') {
                // Get tile color from tiles object or use default
                let color = '#4a9eff'; // Default blue for solid
                if (typeof tiles !== 'undefined' && tiles[tileKey]) {
                    color = tiles[tileKey].color || color;
                }
                ctx.fillStyle = color;
                ctx.fillRect(
                    offsetX + x * scale,
                    offsetY + y * scale,
                    Math.max(1, scale),
                    Math.max(1, scale)
                );
            }
        }
    }

    // Draw game objects (collectibles, enemies, etc.)
    const objects = lvl.gameObjects || [];
    objects.forEach(obj => {
        let color = '#ffdd00'; // Default yellow for collectibles
        if (obj.type === 'enemy') color = '#ff4444';
        else if (obj.type === 'goal') color = '#00ff88';
        else if (obj.type === 'spring') color = '#ff88ff';
        else if (obj.type === 'checkpoint') color = '#4488ff';
        else if (obj.type === 'hazard') color = '#ff8800';

        ctx.fillStyle = color;
        ctx.fillRect(
            offsetX + obj.x * scale,
            offsetY + obj.y * scale,
            Math.max(2, scale * 1.5),
            Math.max(2, scale * 1.5)
        );
    });

    // Draw spawn point
    const spawn = lvl.spawnPoint;
    if (spawn) {
        ctx.fillStyle = '#00ffaa';
        ctx.beginPath();
        ctx.arc(
            offsetX + spawn.x * scale + scale / 2,
            offsetY + spawn.y * scale + scale / 2,
            Math.max(3, scale),
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    // Draw border
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
}

// Render a menu level preview
function renderMenuLevelPreview(ctx, lvl, width, height) {
    // Draw background layers first if any
    const bgLayers = lvl.backgroundLayers || [];
    const validBgLayers = bgLayers.filter(layer => layer.src && layer.src.trim() !== '' && layer.visible !== false);

    if (validBgLayers.length > 0) {
        // Load first background for preview
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            // Scale to fit preview
            const scale = Math.min(width / img.width, height / img.height);
            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;
            const drawX = (width - drawWidth) / 2;
            const drawY = (height - drawHeight) / 2;

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            drawMenuButtonsPreview(ctx, lvl, width, height);
        };
        img.onerror = function() {
            drawMenuButtonsPreview(ctx, lvl, width, height);
        };
        img.src = validBgLayers[0].src;
    } else {
        // No background, draw gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        drawMenuButtonsPreview(ctx, lvl, width, height);
    }

    // Draw border
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
}

// Draw menu buttons in preview
function drawMenuButtonsPreview(ctx, lvl, width, height) {
    const buttons = lvl.menuButtons || [];

    buttons.forEach(button => {
        // Convert percentage position to pixel position
        const btnX = (button.x / 100) * width;
        const btnY = (button.y / 100) * height;
        const btnWidth = (button.width / 100) * width;
        const btnHeight = Math.min(button.height / 4, height / 3); // Scale down for preview

        // Draw button background
        ctx.fillStyle = button.style?.bgColor || '#e94560';
        ctx.beginPath();
        const radius = Math.min((button.style?.borderRadius || 10) / 4, btnHeight / 2);
        ctx.roundRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, radius);
        ctx.fill();

        // Draw button border
        ctx.strokeStyle = button.style?.borderColor || '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Draw "MENU" label if no buttons
    if (buttons.length === 0) {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#e94560';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('MENU', width / 2, height / 2);
    }
}

function getGoalConditionLabel(condition) {
    const labels = {
        'goal': '🚩 Reach Goal',
        'collect_all': '⭐ Collect All',
        'score': '🎯 Reach Score',
        'survive': '⏱️ Survive Time'
    };
    return labels[condition] || condition;
}

// ============================================
// LEVEL MANAGEMENT MODAL
// ============================================

function showLevelManagerModal() {
    syncToCurrentLevel(); // Save current changes
    updateLevelsList();
    document.getElementById('level-manager-modal').style.display = 'flex';
}

function closeLevelManagerModal() {
    document.getElementById('level-manager-modal').style.display = 'none';
}

// ============================================
// LEVEL SETTINGS MODAL
// ============================================

let editingLevelIndex = -1;

function showLevelSettingsModal(index) {
    editingLevelIndex = index;
    const lvl = levels[index];

    // If editing the current level, sync global vars to level first
    if (index === currentLevelIndex) {
        syncToCurrentLevel();
    }

    // Ensure backgroundLayers array exists for this level
    if (!lvl.backgroundLayers) {
        lvl.backgroundLayers = [];
    }

    document.getElementById('level-settings-name').value = lvl.name;
    document.getElementById('level-settings-width').value = lvl.width;
    document.getElementById('level-settings-height').value = lvl.height;
    document.getElementById('level-settings-goal').value = lvl.goalCondition;
    document.getElementById('level-settings-score').value = lvl.requiredScore;
    document.getElementById('level-settings-time').value = lvl.timeLimit;

    // Load level sounds (with safe defaults for older projects)
    const sounds = lvl.sounds || {};
    document.getElementById('level-settings-bgm').value = sounds.bgm || '';
    const bgmVolume = sounds.bgmVolume !== undefined ? sounds.bgmVolume : 0.5;
    document.getElementById('level-settings-bgm-volume').value = Math.round(bgmVolume * 100);
    document.getElementById('level-settings-bgm-volume-display').textContent = Math.round(bgmVolume * 100) + '%';
    document.getElementById('level-settings-complete-sound').value = sounds.levelComplete || '';
    document.getElementById('level-settings-gameover-sound').value = sounds.gameOver || '';

    // Update SoundEffectStudio button states for level sounds
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('level-settings-complete-sound');
        updateSoundButtonStates('level-settings-gameover-sound');
    }

    // Load autoscroll settings
    document.getElementById('level-settings-autoscroll').checked = lvl.autoscrollEnabled || false;
    document.getElementById('level-settings-autoscroll-speed').value = lvl.autoscrollSpeed || 3;
    document.getElementById('level-settings-autoscroll-mode').value = lvl.autoscrollMode || 'end';
    toggleAutoscrollOptions();

    // Load background particle effect
    document.getElementById('level-settings-bg-particle').value = lvl.backgroundParticleEffect || '';
    document.getElementById('level-settings-bg-particle-spawn').value = lvl.backgroundParticleSpawnMode || 'auto';
    if (typeof updateParticleButtonStates === 'function') {
        updateParticleButtonStates('level-settings-bg-particle');
    }

    // Load level type (default to 'gameplay' for older projects)
    const levelType = lvl.levelType || 'gameplay';
    updateLevelTypeUI(levelType);

    // Update spawn point UI for this level
    updateSpawnUI();

    // Load menu settings if it's a menu level
    if (levelType === 'menu') {
        // Load press any key settings
        document.getElementById('menu-press-any-key').checked = lvl.pressAnyKey || false;
        document.getElementById('menu-press-any-key-text').value = lvl.pressAnyKeyText || '';
        togglePressAnyKeyText();

        // Render menu buttons list
        selectedMenuButtonIndex = -1;
        renderMenuButtonsList();
    }

    // Render background layers (uses editingLevelIndex automatically)
    renderBackgroundLayers();

    // Show/hide conditional fields
    updateLevelSettingsFields();

    // Update next level dropdown
    updateNextLevelDropdown(index);

    // Reset to Basics section
    showLevelSettingsSection('basics');

    document.getElementById('level-settings-modal').style.display = 'flex';
}

function closeLevelSettingsModal() {
    // Stop BGM preview if playing
    stopBgmPreview();

    // If we were editing the current level, sync backgrounds to global
    if (editingLevelIndex === currentLevelIndex && editingLevelIndex >= 0) {
        backgroundLayers = levels[editingLevelIndex].backgroundLayers;
        loadBackgroundImages();
    }

    document.getElementById('level-settings-modal').style.display = 'none';
    editingLevelIndex = -1;
}

function updateLevelSettingsFields() {
    const condition = document.getElementById('level-settings-goal').value;

    document.getElementById('score-settings-group').style.display =
        condition === 'score' ? 'block' : 'none';
    document.getElementById('time-settings-group').style.display =
        condition === 'survive' ? 'block' : 'none';
}

function toggleAutoscrollOptions() {
    const checkbox = document.getElementById('level-settings-autoscroll');
    const options = document.getElementById('autoscroll-options');
    if (checkbox && options) {
        options.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Update level background particle effect (called from input onchange)
function updateLevelBackgroundParticle(value) {
    if (editingLevelIndex < 0) return;
    const lvl = levels[editingLevelIndex];
    lvl.backgroundParticleEffect = value.trim();
    markDirty();
}

// Update level background particle spawn mode (called from select onchange)
function updateLevelBackgroundParticleSpawn(value) {
    if (editingLevelIndex < 0) return;
    const lvl = levels[editingLevelIndex];
    lvl.backgroundParticleSpawnMode = value;
    markDirty();
}

function updateNextLevelDropdown(currentIndex) {
    const select = document.getElementById('level-settings-next');
    const currentLvl = levels[currentIndex];

    select.innerHTML = '<option value="">Game Complete (End)</option>';

    levels.forEach((lvl, index) => {
        if (index !== currentIndex) {
            const option = document.createElement('option');
            option.value = lvl.id;
            option.textContent = `${index + 1}. ${lvl.name}`;
            if (currentLvl.nextLevelId === lvl.id) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    });
}

function saveLevelSettings() {
    if (editingLevelIndex < 0) return;

    const lvl = levels[editingLevelIndex];

    const name = document.getElementById('level-settings-name').value.trim();
    if (!name) {
        showToast('Level name cannot be empty', 'error');
        return;
    }

    // Get new dimensions with safety limits
    let newWidth = parseInt(document.getElementById('level-settings-width').value) || 150;
    let newHeight = parseInt(document.getElementById('level-settings-height').value) || 30;

    // Enforce dimension limits to prevent browser freezing
    const MAX_WIDTH = 500;
    const MAX_HEIGHT = 100;
    const MIN_WIDTH = 10;
    const MIN_HEIGHT = 5;

    if (newWidth > MAX_WIDTH || newHeight > MAX_HEIGHT) {
        showToast(`Max level size is ${MAX_WIDTH}x${MAX_HEIGHT}`, 'error');
        newWidth = Math.min(newWidth, MAX_WIDTH);
        newHeight = Math.min(newHeight, MAX_HEIGHT);
        document.getElementById('level-settings-width').value = newWidth;
        document.getElementById('level-settings-height').value = newHeight;
    }
    if (newWidth < MIN_WIDTH || newHeight < MIN_HEIGHT) {
        showToast(`Min level size is ${MIN_WIDTH}x${MIN_HEIGHT}`, 'error');
        newWidth = Math.max(newWidth, MIN_WIDTH);
        newHeight = Math.max(newHeight, MIN_HEIGHT);
        document.getElementById('level-settings-width').value = newWidth;
        document.getElementById('level-settings-height').value = newHeight;
    }

    // Check if dimensions changed and resize level tiles if needed
    const widthChanged = newWidth !== lvl.width;
    const heightChanged = newHeight !== lvl.height;

    if (widthChanged || heightChanged) {
        // Resize the level tiles array
        const oldTiles = lvl.tiles || [];
        const newTiles = [];

        for (let y = 0; y < newHeight; y++) {
            if (y < oldTiles.length) {
                // Existing row - resize width
                const oldRow = oldTiles[y] || '';
                if (newWidth > oldRow.length) {
                    // Expand row
                    newTiles.push(oldRow + '.'.repeat(newWidth - oldRow.length));
                } else {
                    // Shrink row
                    newTiles.push(oldRow.substring(0, newWidth));
                }
            } else {
                // New row - fill with empty
                newTiles.push('.'.repeat(newWidth));
            }
        }

        lvl.tiles = newTiles;
        lvl.width = newWidth;
        lvl.height = newHeight;

        // If this is the current level, sync to globals
        if (editingLevelIndex === currentLevelIndex) {
            levelWidth = newWidth;
            levelHeight = newHeight;
            level = newTiles;
            updateLevelSizeDisplay();
            clampCamera();
        }
    }

    lvl.name = name;
    lvl.goalCondition = document.getElementById('level-settings-goal').value;
    lvl.requiredScore = parseInt(document.getElementById('level-settings-score').value) || 0;
    lvl.timeLimit = parseInt(document.getElementById('level-settings-time').value) || 0;
    lvl.nextLevelId = document.getElementById('level-settings-next').value || null;

    // Save level sounds
    if (!lvl.sounds) lvl.sounds = {};
    lvl.sounds.bgm = document.getElementById('level-settings-bgm').value.trim();
    lvl.sounds.bgmVolume = parseInt(document.getElementById('level-settings-bgm-volume').value) / 100;
    lvl.sounds.levelComplete = document.getElementById('level-settings-complete-sound').value.trim();
    lvl.sounds.gameOver = document.getElementById('level-settings-gameover-sound').value.trim();

    // Save autoscroll settings
    lvl.autoscrollEnabled = document.getElementById('level-settings-autoscroll').checked;
    lvl.autoscrollSpeed = parseFloat(document.getElementById('level-settings-autoscroll-speed').value) || 3;
    lvl.autoscrollMode = document.getElementById('level-settings-autoscroll-mode').value || 'end';

    // Save background particle effect
    lvl.backgroundParticleEffect = document.getElementById('level-settings-bg-particle').value.trim();
    lvl.backgroundParticleSpawnMode = document.getElementById('level-settings-bg-particle-spawn').value || 'auto';

    // Save level type
    const activeTypeBtn = document.querySelector('.level-type-btn.active');
    lvl.levelType = activeTypeBtn ? activeTypeBtn.dataset.type : 'gameplay';

    // Save menu settings if it's a menu level
    if (lvl.levelType === 'menu') {
        lvl.pressAnyKey = document.getElementById('menu-press-any-key').checked;
        lvl.pressAnyKeyText = document.getElementById('menu-press-any-key-text').value.trim();
        // menuButtons are updated in real-time, so they're already saved
    }

    updateLevelsList();
    updateLevelIndicator();
    closeLevelSettingsModal();
    markDirty();
    draw();

    showToast(`Saved: ${lvl.name}`);
}

// Helper to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// LEVEL TYPE & MENU LEVEL FUNCTIONS
// ============================================

let selectedMenuButtonIndex = -1;

// Set the level type (gameplay or menu)
function setLevelType(type) {
    if (editingLevelIndex < 0) return;

    const lvl = levels[editingLevelIndex];
    const oldType = lvl.levelType || 'gameplay';

    if (oldType === type) return;

    // Update the level type
    lvl.levelType = type;

    // If switching to menu, initialize menu data
    if (type === 'menu') {
        if (!lvl.menuButtons || lvl.menuButtons.length === 0) {
            lvl.menuButtons = [createDefaultMenuButton()];
        }
        if (typeof lvl.pressAnyKey === 'undefined') {
            lvl.pressAnyKey = false;
        }
        if (typeof lvl.pressAnyKeyText === 'undefined') {
            lvl.pressAnyKeyText = '';
        }

        // Load menu settings into UI
        document.getElementById('menu-press-any-key').checked = lvl.pressAnyKey;
        document.getElementById('menu-press-any-key-text').value = lvl.pressAnyKeyText;
        togglePressAnyKeyText();
        selectedMenuButtonIndex = -1;
        renderMenuButtonsList();
    }

    // Update UI
    updateLevelTypeUI(type);

    showToast(type === 'menu' ? 'Switched to Menu Screen' : 'Switched to Gameplay Level');
}

// Update the level type UI (toggle buttons and show/hide sections)
function updateLevelTypeUI(type) {
    // Update toggle buttons
    document.querySelectorAll('.level-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    const isMenu = type === 'menu';
    const isGameplay = type === 'gameplay';
    const isPlatformer = gameSettings.gameType === 'platformer';

    // Show/hide gameplay-only elements
    document.querySelectorAll('.gameplay-level-only').forEach(el => {
        // Check if it's also platformer-only
        if (el.classList.contains('platformer-only')) {
            el.style.display = (isGameplay && isPlatformer) ? '' : 'none';
        } else {
            el.style.display = isGameplay ? '' : 'none';
        }
    });

    // Show/hide menu-only elements
    document.querySelectorAll('.menu-level-only').forEach(el => {
        el.style.display = isMenu ? '' : 'none';
    });

    // If we're on a gameplay-only section and switched to menu, go to basics
    if (isMenu) {
        const activeSection = document.querySelector('.level-settings-nav-item.active');
        if (activeSection && (activeSection.classList.contains('gameplay-level-only'))) {
            showLevelSettingsSection('basics');
        }
    }
}

// Toggle press any key text input visibility
function togglePressAnyKeyText() {
    const checkbox = document.getElementById('menu-press-any-key');
    const container = document.getElementById('press-any-key-text-container');
    const warning = document.getElementById('press-any-key-warning');
    if (checkbox && container) {
        container.style.display = checkbox.checked ? 'block' : 'none';
    }
    if (warning) {
        warning.style.display = checkbox && checkbox.checked ? 'block' : 'none';
    }
}

// Add a new menu button
function addMenuButton() {
    if (editingLevelIndex < 0) return;

    const lvl = levels[editingLevelIndex];
    if (!lvl.menuButtons) {
        lvl.menuButtons = [];
    }

    // Create a new button with default values
    const newButton = createMenuButton();
    lvl.menuButtons.push(newButton);

    // Select the new button for editing
    selectedMenuButtonIndex = lvl.menuButtons.length - 1;
    renderMenuButtonsList();
    loadMenuButtonToEditor(newButton);
    document.getElementById('menu-button-editor').style.display = 'block';

    markDirty();
}

// Select a menu button for editing
function selectMenuButton(index) {
    if (editingLevelIndex < 0) return;

    const lvl = levels[editingLevelIndex];
    if (!lvl.menuButtons || index < 0 || index >= lvl.menuButtons.length) return;

    selectedMenuButtonIndex = index;
    renderMenuButtonsList();
    loadMenuButtonToEditor(lvl.menuButtons[index]);
    document.getElementById('menu-button-editor').style.display = 'block';
}

// Load a button's data into the editor
function loadMenuButtonToEditor(button) {
    document.getElementById('menu-button-text').value = button.text || '';
    document.getElementById('menu-button-action').value = button.action || 'start_game';
    document.getElementById('menu-button-x').value = button.x || 50;
    document.getElementById('menu-button-y').value = button.y || 50;
    document.getElementById('menu-button-width').value = button.width || 30;
    document.getElementById('menu-button-height').value = button.height || 50;

    const style = button.style || {};
    document.getElementById('menu-button-bg-color').value = style.bgColor || '#e94560';
    document.getElementById('menu-button-text-color').value = style.textColor || '#ffffff';
    document.getElementById('menu-button-border-color').value = style.borderColor || '#ffffff';
    document.getElementById('menu-button-radius').value = style.borderRadius || 10;
    document.getElementById('menu-button-font-size').value = style.fontSize || 20;

    // Show/hide URL input and level selector based on action (without triggering save)
    showMenuButtonActionContainers(button.action);

    // Set actionTarget fields based on action type
    if (button.action === 'open_url') {
        document.getElementById('menu-button-url').value = button.actionTarget || '';
    } else if (button.action === 'go_to_level') {
        populateMenuButtonLevelDropdown();
        const levelSelect = document.getElementById('menu-button-level');
        if (levelSelect && button.actionTarget) {
            levelSelect.value = button.actionTarget;
        }
    }
}

// Show/hide URL and level containers based on action type (no save)
function showMenuButtonActionContainers(action) {
    const urlContainer = document.getElementById('menu-button-url-container');
    const levelContainer = document.getElementById('menu-button-level-container');

    if (urlContainer) {
        urlContainer.style.display = action === 'open_url' ? 'block' : 'none';
    }
    if (levelContainer) {
        levelContainer.style.display = action === 'go_to_level' ? 'block' : 'none';
    }
}

// Update the selected menu button with editor values
function updateSelectedMenuButton() {
    if (editingLevelIndex < 0 || selectedMenuButtonIndex < 0) return;

    const lvl = levels[editingLevelIndex];
    if (!lvl.menuButtons || selectedMenuButtonIndex >= lvl.menuButtons.length) return;

    const button = lvl.menuButtons[selectedMenuButtonIndex];

    button.text = document.getElementById('menu-button-text').value;
    button.action = document.getElementById('menu-button-action').value;

    // Set actionTarget based on action type
    if (button.action === 'open_url') {
        button.actionTarget = document.getElementById('menu-button-url').value;
    } else if (button.action === 'go_to_level') {
        button.actionTarget = document.getElementById('menu-button-level').value;
    } else {
        button.actionTarget = null;
    }

    button.x = parseInt(document.getElementById('menu-button-x').value) || 50;
    button.y = parseInt(document.getElementById('menu-button-y').value) || 50;
    button.width = parseInt(document.getElementById('menu-button-width').value) || 30;
    button.height = parseInt(document.getElementById('menu-button-height').value) || 50;

    if (!button.style) button.style = {};
    button.style.bgColor = document.getElementById('menu-button-bg-color').value;
    button.style.textColor = document.getElementById('menu-button-text-color').value;
    button.style.borderColor = document.getElementById('menu-button-border-color').value;
    button.style.borderRadius = parseInt(document.getElementById('menu-button-radius').value) || 10;
    button.style.fontSize = parseInt(document.getElementById('menu-button-font-size').value) || 20;

    renderMenuButtonsList();
    markDirty();
}

// Show/hide URL input and level selector based on action type (called when user changes action dropdown)
function updateMenuButtonActionTarget() {
    const action = document.getElementById('menu-button-action').value;

    // Show/hide the appropriate container
    showMenuButtonActionContainers(action);

    // Populate level dropdown when showing go_to_level
    if (action === 'go_to_level') {
        populateMenuButtonLevelDropdown();
    }

    // Save the button with new action
    updateSelectedMenuButton();
}

// Populate the level dropdown with all levels (including menu levels for flexibility)
function populateMenuButtonLevelDropdown() {
    const select = document.getElementById('menu-button-level');
    if (!select) return;

    // Remember current selection
    const currentValue = select.value;

    select.innerHTML = '';

    levels.forEach((lvl, index) => {
        const option = document.createElement('option');
        option.value = lvl.id;
        const typeLabel = lvl.levelType === 'menu' ? ' [Menu]' : '';
        option.textContent = `${index + 1}. ${lvl.name}${typeLabel}`;
        select.appendChild(option);
    });

    // Restore selection if it still exists
    if (currentValue) {
        select.value = currentValue;
    }
}

// Delete the selected menu button
function deleteSelectedMenuButton() {
    if (editingLevelIndex < 0 || selectedMenuButtonIndex < 0) return;

    const lvl = levels[editingLevelIndex];
    if (!lvl.menuButtons || selectedMenuButtonIndex >= lvl.menuButtons.length) return;

    lvl.menuButtons.splice(selectedMenuButtonIndex, 1);
    selectedMenuButtonIndex = -1;

    document.getElementById('menu-button-editor').style.display = 'none';
    renderMenuButtonsList();
    markDirty();

    showToast('Button deleted');
}

// Render the list of menu buttons
function renderMenuButtonsList() {
    const container = document.getElementById('menu-buttons-list');
    if (!container || editingLevelIndex < 0) return;

    const lvl = levels[editingLevelIndex];
    const buttons = lvl.menuButtons || [];

    if (buttons.length === 0) {
        container.innerHTML = '<p style="font-size: 11px; color: #666; text-align: center; padding: 10px;">No buttons yet. Add one to get started!</p>';
        return;
    }

    container.innerHTML = '';

    buttons.forEach((button, index) => {
        const item = document.createElement('div');
        item.className = 'menu-button-item' + (index === selectedMenuButtonIndex ? ' selected' : '');
        item.onclick = () => selectMenuButton(index);

        // Get action label with level name if applicable
        let actionLabel = '';
        switch (button.action) {
            case 'start_game':
                actionLabel = 'Start Game';
                break;
            case 'toggle_sound':
                actionLabel = 'Toggle Sound';
                break;
            case 'open_url':
                actionLabel = 'Open URL';
                break;
            case 'go_to_level':
                // Find level name
                const targetLevel = levels.find(l => l.id === button.actionTarget);
                actionLabel = targetLevel ? `→ ${targetLevel.name}` : 'Go to Level';
                break;
            default:
                actionLabel = button.action;
        }

        item.innerHTML = `
            <div class="button-preview" style="background: ${button.style?.bgColor || '#e94560'}; border: 2px solid ${button.style?.borderColor || '#ffffff'}; border-radius: ${button.style?.borderRadius || 10}px;"></div>
            <div class="button-info">
                <div class="button-text">${escapeHtml(button.text || 'Button')}</div>
                <div class="button-action">${escapeHtml(actionLabel)}</div>
            </div>
        `;

        container.appendChild(item);
    });
}

// Show a specific level settings section
function showLevelSettingsSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.level-settings-section').forEach(section => {
        section.classList.remove('active');
    });

    // Deactivate all nav items
    document.querySelectorAll('.level-settings-nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show the selected section
    const targetSection = document.getElementById(`level-settings-section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Activate the nav item
    const targetNav = document.querySelector(`.level-settings-nav-item[data-section="${sectionName}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }
}
