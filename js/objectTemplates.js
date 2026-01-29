// ============================================
// OBJECT TEMPLATES - Template Management
// ============================================
// Handles CRUD operations for enemy, collectible, hazard, and powerup templates

// Currently editing template
let editingTemplateType = null;
let editingTemplateId = null;

// ============================================
// HELPER: Count and remove template instances across ALL levels
// ============================================

/**
 * Count how many objects use a specific template across all levels
 * @param {string} type - Object type (enemy, collectible, etc.)
 * @param {string} templateId - Template ID to count
 * @returns {number} Total count across all levels
 */
function countTemplateInstances(type, templateId) {
    // Make sure current level is synced
    if (typeof syncToCurrentLevel === 'function') {
        syncToCurrentLevel();
    }

    let count = 0;
    levels.forEach(lvl => {
        if (lvl.gameObjects && Array.isArray(lvl.gameObjects)) {
            lvl.gameObjects.forEach(obj => {
                if (obj.type === type && obj.templateId === templateId) {
                    count++;
                }
            });
        }
    });
    return count;
}

/**
 * Remove all objects using a specific template from ALL levels
 * @param {string} type - Object type (enemy, collectible, etc.)
 * @param {string} templateId - Template ID to remove
 * @returns {number} Number of objects removed
 */
function removeTemplateInstancesFromAllLevels(type, templateId) {
    // Make sure current level is synced first
    if (typeof syncToCurrentLevel === 'function') {
        syncToCurrentLevel();
    }

    let removedCount = 0;
    levels.forEach(lvl => {
        if (lvl.gameObjects && Array.isArray(lvl.gameObjects)) {
            const originalLength = lvl.gameObjects.length;
            lvl.gameObjects = lvl.gameObjects.filter(obj => {
                return !(obj.type === type && obj.templateId === templateId);
            });
            removedCount += originalLength - lvl.gameObjects.length;
        }
    });

    // Re-sync from current level to update global gameObjects
    if (typeof syncFromCurrentLevel === 'function') {
        syncFromCurrentLevel();
    }

    return removedCount;
}

// ============================================
// TEMPLATE PREVIEW HELPER
// ============================================

// Inject sprite animation CSS once on load
(function injectSpriteAnimationCSS() {
    const style = document.createElement('style');
    style.id = 'sprite-animation-styles';
    style.textContent = `
        .sprite-anim-preview {
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
            background-repeat: no-repeat;
        }
    `;
    document.head.appendChild(style);
})();

// Cache for generated keyframe animations
const _spriteAnimCache = new Set();

/**
 * Generate and inject keyframes for sprite animation
 * Uses step-end timing so frames hold until next keyframe
 */
function ensureSpriteKeyframes(frameCount) {
    const animName = `sprite-anim-${frameCount}`;
    if (_spriteAnimCache.has(animName)) return animName;

    // Generate keyframes at correct background-position percentages
    // For N frames with background-size: N*100%, frame K is at position (K-1)/(N-1)*100%
    let keyframes = `@keyframes ${animName} {\n`;
    for (let i = 0; i < frameCount; i++) {
        const timePercent = (i / frameCount) * 100;
        const posPercent = frameCount > 1 ? (i / (frameCount - 1)) * 100 : 0;
        keyframes += `  ${timePercent.toFixed(2)}% { background-position: ${posPercent.toFixed(2)}% 0; }\n`;
    }
    keyframes += `}\n`;

    // Inject the keyframes
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    _spriteAnimCache.add(animName);

    return animName;
}

/**
 * Generate preview HTML for a template
 * Handles: animated sprites, static sprites, tileKey (tileset/custom tiles), and fallback symbols
 * @param {Object} template - The template object
 * @param {string} defaultSymbol - Fallback symbol if no sprite/tile
 * @returns {string} HTML string for the preview content
 */
function getTemplatePreviewHTML(template, defaultSymbol = '?') {
    // Priority 1: Custom sprite URL
    if (template.sprite) {
        const cols = template.spritesheetCols || template.frameCount || 1;
        const rows = template.spritesheetRows || 1;

        // Animated spritesheet (multiple columns = animation frames)
        if (cols > 1) {
            // Calculate animation duration based on animSpeed
            // animSpeed is how many game frames before switching sprite frame
            // At 60fps, animSpeed of 8 = 8/60 seconds per frame
            const animSpeed = template.animSpeed || 8;
            const durationPerFrame = animSpeed / 60;
            const totalDuration = durationPerFrame * cols;

            // Ensure keyframes exist for this frame count
            const animName = ensureSpriteKeyframes(cols);

            // Use background-image with step-end timing for frame-by-frame animation
            // background-size: cols*100% rows*100% properly scales multi-row spritesheets
            // background-position-y: 0% ensures we show the first row (e.g., "down" direction)
            return `
                <div class="sprite-anim-preview" style="
                    background-image: url('${template.sprite}');
                    background-size: ${cols * 100}% ${rows * 100}%;
                    background-position-y: 0%;
                    animation: ${animName} ${totalDuration}s step-end infinite;
                "></div>
            `;
        }

        // Static sprite (single frame) or single-column multi-row sprite
        // For single column with multiple rows, just show the first frame
        if (rows > 1) {
            return `
                <div style="
                    width: 100%;
                    height: 100%;
                    background-image: url('${template.sprite}');
                    background-size: 100% ${rows * 100}%;
                    background-position: 0% 0%;
                    background-repeat: no-repeat;
                    image-rendering: pixelated;
                    image-rendering: crisp-edges;
                "></div>
            `;
        }

        // Truly static sprite (single frame, single row)
        return `<img src="${template.sprite}" alt="${template.name}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;">`;
    }

    // Priority 2: Tile key (for moving platforms, etc.)
    if (template.tileKey) {
        // Check if it's a custom tile
        if (typeof customTiles === 'object' && customTiles[template.tileKey]) {
            const ct = customTiles[template.tileKey];
            if (ct.dataURL) {
                return `<img src="${ct.dataURL}" alt="${template.name}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;">`;
            }
        }

        // Check if it's a tileset tile
        if (typeof tiles === 'object' && tiles[template.tileKey] && typeof tilesetImage !== 'undefined' && tilesetImage && tilesetImage.complete) {
            const tile = tiles[template.tileKey];
            // Create a small canvas to extract the tile
            const canvas = document.createElement('canvas');
            canvas.width = tileSize;
            canvas.height = tileSize;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tilesetImage, tile.x, tile.y, tileSize, tileSize, 0, 0, tileSize, tileSize);
            const dataURL = canvas.toDataURL();
            return `<img src="${dataURL}" alt="${template.name}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;">`;
        }
    }

    // Priority 3: Fallback to symbol/emoji
    return template.symbol || defaultSymbol;
}

/**
 * Get the background style for a template preview
 * @param {Object} template - The template object
 * @returns {string} CSS background style
 */
function getTemplatePreviewBackground(template) {
    // If template has a sprite or tile, use a neutral dark background
    if (template.sprite || template.tileKey) {
        return 'background-color: #2a2a3a;';
    }
    // Otherwise use the template's color
    return `background-color: ${template.color || '#666'};`;
}

// ============================================
// ENEMY TEMPLATE MANAGEMENT
// ============================================

function showEnemyTemplatesModal() {
    const modal = document.getElementById('enemy-templates-modal');
    modal.classList.add('visible');
    renderEnemyTemplatesList();
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        const template = enemyTemplates[0] || {};
        CodePreview.setContext('enemy', { template });
    }
}

function closeEnemyTemplatesModal() {
    document.getElementById('enemy-templates-modal').classList.remove('visible');
}

function renderEnemyTemplatesList() {
    const container = document.getElementById('enemy-templates-list');
    if (!container) return;

    let html = '';
    enemyTemplates.forEach((template, index) => {
        const behaviorLabel = {
            'pace': 'Paces back & forth',
            'stationary': 'Stays still',
            'follow': 'Follows player',
            'jump': 'Jumps around'
        }[template.behavior] || template.behavior;

        html += `
            <div class="template-item" data-id="${template.id}">
                <div class="template-preview" style="${getTemplatePreviewBackground(template)}">
                    ${getTemplatePreviewHTML(template, '👾')}
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${behaviorLabel} | Speed: ${template.speed} | Damage: ${template.damage}</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small" onclick="editEnemyTemplate('${template.id}')">Edit</button>
                    ${index > 0 ? `<button class="btn btn-small btn-danger" onclick="deleteEnemyTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddEnemyTemplate() {
    editingTemplateId = null;
    document.getElementById('enemy-template-title').textContent = 'Add Enemy Type';
    document.getElementById('enemy-template-name').value = '';
    populateObjectTileSelector('enemy-template-tile');
    document.getElementById('enemy-template-tile').value = '';
    updateObjectTilePreview('enemy-template-tile', 'enemy-tile-preview');
    document.getElementById('enemy-template-sprite').value = '';
    document.getElementById('enemy-template-cols').value = '1';
    document.getElementById('enemy-template-rows').value = '1';
    document.getElementById('enemy-template-animspeed').value = '8';
    document.getElementById('enemy-template-width').value = '32';
    document.getElementById('enemy-template-height').value = '32';
    document.getElementById('enemy-template-behavior').value = 'pace';
    document.getElementById('enemy-template-pace-distance').value = '3';
    const paceAxisEl = document.getElementById('enemy-template-pace-axis');
    if (paceAxisEl) paceAxisEl.value = 'horizontal';
    document.getElementById('enemy-template-speed').value = '2';
    document.getElementById('enemy-template-damage').value = '1';
    document.getElementById('enemy-template-color').value = '#ff4444';
    document.getElementById('enemy-template-contact-sound').value = '';
    document.getElementById('enemy-template-stompable').checked = false;
    document.getElementById('enemy-template-stomp-score').value = '50';
    document.getElementById('enemy-template-respawn-time').value = '0';

    // Reset behavior-specific options
    const followRangeEl = document.getElementById('enemy-template-follow-range');
    const jumpPowerEl = document.getElementById('enemy-template-jump-power');
    if (followRangeEl) followRangeEl.value = '5';
    if (jumpPowerEl) jumpPowerEl.value = '8';

    // Clear particle effect for new template
    const deathParticleEl = document.getElementById('enemy-template-death-particle');
    if (deathParticleEl) deathParticleEl.value = '';

    updateEnemyBehaviorOptions();
    toggleStompOptions();
    document.getElementById('enemy-template-editor').classList.add('visible');
}

function editEnemyTemplate(id) {
    const template = enemyTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('enemy-template-title').textContent = 'Edit Enemy Type';
    document.getElementById('enemy-template-name').value = template.name;
    populateObjectTileSelector('enemy-template-tile');
    document.getElementById('enemy-template-tile').value = template.tileKey || '';
    updateObjectTilePreview('enemy-template-tile', 'enemy-tile-preview');
    document.getElementById('enemy-template-sprite').value = template.sprite || '';
    document.getElementById('enemy-template-cols').value = template.spritesheetCols || template.frameCount || 1;
    document.getElementById('enemy-template-rows').value = template.spritesheetRows || 1;
    document.getElementById('enemy-template-animspeed').value = template.animSpeed || 8;
    document.getElementById('enemy-template-width').value = template.width || 32;
    document.getElementById('enemy-template-height').value = template.height || 32;
    document.getElementById('enemy-template-behavior').value = template.behavior || 'pace';
    document.getElementById('enemy-template-pace-distance').value = template.paceDistance || 3;
    const paceAxisEl = document.getElementById('enemy-template-pace-axis');
    if (paceAxisEl) paceAxisEl.value = template.paceAxis || 'horizontal';
    document.getElementById('enemy-template-speed').value = template.speed || 2;
    document.getElementById('enemy-template-damage').value = template.damage || 1;
    document.getElementById('enemy-template-color').value = template.color || '#ff4444';
    document.getElementById('enemy-template-contact-sound').value = template.contactSound || '';
    // Update button states for sfx: values
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('enemy-template-contact-sound');
    }
    document.getElementById('enemy-template-stompable').checked = template.stompable || false;
    document.getElementById('enemy-template-stomp-score').value = template.stompScore || 50;
    document.getElementById('enemy-template-respawn-time').value = template.respawnTime || 0;

    // Set behavior-specific options
    const followRangeEl = document.getElementById('enemy-template-follow-range');
    const jumpPowerEl = document.getElementById('enemy-template-jump-power');
    if (followRangeEl) followRangeEl.value = template.followRange || 5;
    if (jumpPowerEl) jumpPowerEl.value = template.jumpPower || 8;

    // Populate per-template particle effect
    const deathParticleEl = document.getElementById('enemy-template-death-particle');
    if (deathParticleEl) {
        deathParticleEl.value = template.particleEffect || '';
        // Update button states for pfx: values
        if (typeof updateParticleButtonStates === 'function') {
            updateParticleButtonStates('enemy-template-death-particle');
        }
    }

    updateEnemyBehaviorOptions();
    toggleStompOptions();
    document.getElementById('enemy-template-editor').classList.add('visible');
}

function updateEnemyBehaviorOptions() {
    const behavior = document.getElementById('enemy-template-behavior').value;
    const paceOptions = document.getElementById('enemy-pace-options');
    const followOptions = document.getElementById('enemy-follow-options');
    const jumpOptions = document.getElementById('enemy-jump-options');

    if (paceOptions) paceOptions.style.display = behavior === 'pace' ? 'block' : 'none';
    if (followOptions) followOptions.style.display = behavior === 'follow' ? 'block' : 'none';
    if (jumpOptions) jumpOptions.style.display = behavior === 'jump' ? 'block' : 'none';
}

function toggleStompOptions() {
    const checkbox = document.getElementById('enemy-template-stompable');
    const stompOptions = document.getElementById('stomp-options');
    if (stompOptions) {
        stompOptions.style.display = checkbox.checked ? 'block' : 'none';
    }
}

function toggleNPCWanderOptions() {
    const behavior = document.getElementById('npc-template-behavior').value;
    const wanderOptions = document.getElementById('npc-wander-options');
    if (wanderOptions) {
        wanderOptions.style.display = behavior === 'wander' ? 'block' : 'none';
    }
}

function saveEnemyTemplate() {
    const name = document.getElementById('enemy-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const cols = parseInt(document.getElementById('enemy-template-cols').value) || 1;
    const rows = parseInt(document.getElementById('enemy-template-rows').value) || 1;
    const templateData = {
        name: name,
        tileKey: document.getElementById('enemy-template-tile').value || '',
        sprite: document.getElementById('enemy-template-sprite').value.trim(),
        frameCount: cols,  // Keep for backward compatibility
        spritesheetCols: cols,
        spritesheetRows: rows,
        animSpeed: parseInt(document.getElementById('enemy-template-animspeed').value) || 8,
        width: parseInt(document.getElementById('enemy-template-width').value) || 32,
        height: parseInt(document.getElementById('enemy-template-height').value) || 32,
        behavior: document.getElementById('enemy-template-behavior').value,
        paceDistance: parseInt(document.getElementById('enemy-template-pace-distance').value) || 3,
        paceAxis: document.getElementById('enemy-template-pace-axis')?.value || 'horizontal',
        speed: parseFloat(document.getElementById('enemy-template-speed').value) || 2,
        damage: parseInt(document.getElementById('enemy-template-damage').value) || 1,
        followRange: parseInt(document.getElementById('enemy-template-follow-range')?.value) || 5,
        jumpPower: parseFloat(document.getElementById('enemy-template-jump-power')?.value) || 8,
        color: document.getElementById('enemy-template-color').value || '#ff4444',
        contactSound: document.getElementById('enemy-template-contact-sound').value.trim(),
        stompable: document.getElementById('enemy-template-stompable').checked,
        stompScore: parseInt(document.getElementById('enemy-template-stomp-score').value) || 50,
        respawnTime: parseInt(document.getElementById('enemy-template-respawn-time').value) || 0,
        particleEffect: document.getElementById('enemy-template-death-particle')?.value.trim() || ''
    };

    if (editingTemplateId) {
        // Update existing template
        const index = enemyTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            enemyTemplates[index] = templateData;
            showToast('Enemy type updated', 'success');
        }
        markDirty();
        closeEnemyTemplateEditor();
        renderEnemyTemplatesList();
        draw();
    } else {
        // Add new template
        templateData.id = generateTemplateId('enemy', name);
        enemyTemplates.push(templateData);
        markDirty();
        closeEnemyTemplateEditor();
        renderEnemyTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closeEnemyTemplatesModal();
        selectObjectForPlacement('enemy', templateData.id);
    }
}

function closeEnemyTemplateEditor() {
    document.getElementById('enemy-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

function deleteEnemyTemplate(id) {
    if (id === 'default') {
        showToast('Cannot delete the default enemy', 'error');
        return;
    }

    const template = enemyTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('enemy', id);

    let confirmMsg = `Delete enemy type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    // Remove template
    const index = enemyTemplates.findIndex(t => t.id === id);
    if (index > 0) {
        enemyTemplates.splice(index, 1);

        // Remove all placed objects using this template from ALL levels
        const removed = removeTemplateInstancesFromAllLevels('enemy', id);

        markDirty();
        renderEnemyTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`Enemy type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('Enemy type deleted', 'success');
        }
    }
}

// ============================================
// COLLECTIBLE TEMPLATE MANAGEMENT
// ============================================

function showCollectibleTemplatesModal() {
    const modal = document.getElementById('collectible-templates-modal');
    modal.classList.add('visible');
    renderCollectibleTemplatesList();
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        const template = collectibleTemplates[0] || {};
        CodePreview.setContext('collectible', { template });
    }
}

function closeCollectibleTemplatesModal() {
    document.getElementById('collectible-templates-modal').classList.remove('visible');
}

function renderCollectibleTemplatesList() {
    const container = document.getElementById('collectible-templates-list');
    if (!container) return;

    let html = '';
    collectibleTemplates.forEach((template, index) => {
        html += `
            <div class="template-item" data-id="${template.id}">
                <div class="template-preview" style="${getTemplatePreviewBackground(template)}">
                    ${getTemplatePreviewHTML(template, '🪙')}
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">Value: ${template.value} points</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small" onclick="editCollectibleTemplate('${template.id}')">Edit</button>
                    ${index > 1 ? `<button class="btn btn-small btn-danger" onclick="deleteCollectibleTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddCollectibleTemplate() {
    editingTemplateId = null;
    document.getElementById('collectible-template-title').textContent = 'Add Collectible Type';
    document.getElementById('collectible-template-name').value = '';
    populateObjectTileSelector('collectible-template-tile');
    document.getElementById('collectible-template-tile').value = '';
    updateObjectTilePreview('collectible-template-tile', 'collectible-tile-preview');
    document.getElementById('collectible-template-sprite').value = '';
    document.getElementById('collectible-template-cols').value = '1';
    document.getElementById('collectible-template-rows').value = '1';
    document.getElementById('collectible-template-animspeed').value = '8';
    document.getElementById('collectible-template-width').value = '32';
    document.getElementById('collectible-template-height').value = '32';
    document.getElementById('collectible-template-value').value = '10';
    document.getElementById('collectible-template-symbol').value = '★';
    document.getElementById('collectible-template-color').value = '#ffd700';
    document.getElementById('collectible-template-sound').value = '';
    document.getElementById('collectible-template-respawns').checked = false;

    // Clear particle effect for new template
    const collectParticleEl = document.getElementById('collectible-template-collect-particle');
    if (collectParticleEl) collectParticleEl.value = '';

    document.getElementById('collectible-template-editor').classList.add('visible');
}

function editCollectibleTemplate(id) {
    const template = collectibleTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('collectible-template-title').textContent = 'Edit Collectible Type';
    document.getElementById('collectible-template-name').value = template.name;
    populateObjectTileSelector('collectible-template-tile');
    document.getElementById('collectible-template-tile').value = template.tileKey || '';
    updateObjectTilePreview('collectible-template-tile', 'collectible-tile-preview');
    document.getElementById('collectible-template-sprite').value = template.sprite || '';
    document.getElementById('collectible-template-cols').value = template.spritesheetCols || template.frameCount || 1;
    document.getElementById('collectible-template-rows').value = template.spritesheetRows || 1;
    document.getElementById('collectible-template-animspeed').value = template.animSpeed || 8;
    document.getElementById('collectible-template-width').value = template.width || 32;
    document.getElementById('collectible-template-height').value = template.height || 32;
    document.getElementById('collectible-template-value').value = template.value;
    document.getElementById('collectible-template-symbol').value = template.symbol || '●';
    document.getElementById('collectible-template-color').value = template.color || '#ffd700';
    document.getElementById('collectible-template-sound').value = template.sound || '';
    // Update button states for sfx: values
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('collectible-template-sound');
    }
    document.getElementById('collectible-template-respawns').checked = template.respawns === true;

    // Populate per-template particle effect
    const collectParticleEl = document.getElementById('collectible-template-collect-particle');
    if (collectParticleEl) {
        collectParticleEl.value = template.particleEffect || '';
        // Update button states for pfx: values
        if (typeof updateParticleButtonStates === 'function') {
            updateParticleButtonStates('collectible-template-collect-particle');
        }
    }

    document.getElementById('collectible-template-editor').classList.add('visible');
}

function saveCollectibleTemplate() {
    const name = document.getElementById('collectible-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const templateData = {
        name: name,
        tileKey: document.getElementById('collectible-template-tile').value || '',
        sprite: document.getElementById('collectible-template-sprite').value.trim(),
        frameCount: parseInt(document.getElementById('collectible-template-cols').value) || 1,
        spritesheetCols: parseInt(document.getElementById('collectible-template-cols').value) || 1,
        spritesheetRows: parseInt(document.getElementById('collectible-template-rows').value) || 1,
        animSpeed: parseInt(document.getElementById('collectible-template-animspeed').value) || 8,
        width: parseInt(document.getElementById('collectible-template-width').value) || 32,
        height: parseInt(document.getElementById('collectible-template-height').value) || 32,
        value: parseInt(document.getElementById('collectible-template-value').value) || 10,
        symbol: document.getElementById('collectible-template-symbol').value || '●',
        color: document.getElementById('collectible-template-color').value || '#ffd700',
        sound: document.getElementById('collectible-template-sound').value.trim(),
        respawns: document.getElementById('collectible-template-respawns').checked,
        particleEffect: document.getElementById('collectible-template-collect-particle')?.value.trim() || ''
    };

    if (editingTemplateId) {
        const index = collectibleTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            collectibleTemplates[index] = templateData;
            showToast('Collectible type updated', 'success');
        }
        markDirty();
        closeCollectibleTemplateEditor();
        renderCollectibleTemplatesList();
        draw();
    } else {
        templateData.id = generateTemplateId('collectible', name);
        collectibleTemplates.push(templateData);
        markDirty();
        closeCollectibleTemplateEditor();
        renderCollectibleTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closeCollectibleTemplatesModal();
        selectObjectForPlacement('collectible', templateData.id);
    }
}

function closeCollectibleTemplateEditor() {
    document.getElementById('collectible-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

function deleteCollectibleTemplate(id) {
    if (id === 'coin' || id === 'gem') {
        showToast('Cannot delete default collectibles', 'error');
        return;
    }

    const template = collectibleTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('collectible', id);

    let confirmMsg = `Delete collectible type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const index = collectibleTemplates.findIndex(t => t.id === id);
    if (index > 1) {
        collectibleTemplates.splice(index, 1);

        // Remove all placed objects using this template from ALL levels
        const removed = removeTemplateInstancesFromAllLevels('collectible', id);

        markDirty();
        renderCollectibleTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`Collectible type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('Collectible type deleted', 'success');
        }
    }
}

// ============================================
// HAZARD TEMPLATE MANAGEMENT
// ============================================

function showHazardTemplatesModal() {
    const modal = document.getElementById('hazard-templates-modal');
    modal.classList.add('visible');
    renderHazardTemplatesList();
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        const template = hazardTemplates[0] || {};
        CodePreview.setContext('hazard', { template });
    }
}

function closeHazardTemplatesModal() {
    document.getElementById('hazard-templates-modal').classList.remove('visible');
}

function renderHazardTemplatesList() {
    const container = document.getElementById('hazard-templates-list');
    if (!container) return;

    let html = '';
    hazardTemplates.forEach((template, index) => {
        const damageText = template.damage >= 999 ? 'Instant Kill' : `${template.damage} damage`;
        html += `
            <div class="template-item" data-id="${template.id}">
                <div class="template-preview" style="${getTemplatePreviewBackground(template)}">
                    ${getTemplatePreviewHTML(template, '▲')}
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${damageText}${template.continuous ? ' (continuous)' : ''}</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small" onclick="editHazardTemplate('${template.id}')">Edit</button>
                    ${index > 0 ? `<button class="btn btn-small btn-danger" onclick="deleteHazardTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddHazardTemplate() {
    editingTemplateId = null;
    document.getElementById('hazard-template-title').textContent = 'Add Hazard Type';
    document.getElementById('hazard-template-name').value = '';
    populateObjectTileSelector('hazard-template-tile');
    document.getElementById('hazard-template-tile').value = '';
    updateObjectTilePreview('hazard-template-tile', 'hazard-tile-preview');
    document.getElementById('hazard-template-sprite').value = '';
    document.getElementById('hazard-template-cols').value = '1';
    document.getElementById('hazard-template-rows').value = '1';
    document.getElementById('hazard-template-animspeed').value = '8';
    document.getElementById('hazard-template-damage').value = '1';
    document.getElementById('hazard-template-instant-kill').checked = false;
    document.getElementById('hazard-template-continuous').checked = false;
    document.getElementById('hazard-template-symbol').value = '▲';
    document.getElementById('hazard-template-color').value = '#888888';
    document.getElementById('hazard-template-damage-sound').value = '';

    // Clear particle effect for new template
    const hazardParticleEl = document.getElementById('hazard-template-particle');
    if (hazardParticleEl) hazardParticleEl.value = '';

    document.getElementById('hazard-template-editor').classList.add('visible');
}

function editHazardTemplate(id) {
    const template = hazardTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('hazard-template-title').textContent = 'Edit Hazard Type';
    document.getElementById('hazard-template-name').value = template.name;
    populateObjectTileSelector('hazard-template-tile');
    document.getElementById('hazard-template-tile').value = template.tileKey || '';
    updateObjectTilePreview('hazard-template-tile', 'hazard-tile-preview');
    document.getElementById('hazard-template-sprite').value = template.sprite || '';
    document.getElementById('hazard-template-cols').value = template.spritesheetCols || template.frameCount || 1;
    document.getElementById('hazard-template-rows').value = template.spritesheetRows || 1;
    document.getElementById('hazard-template-animspeed').value = template.animSpeed || 8;
    document.getElementById('hazard-template-damage').value = template.damage >= 999 ? 1 : template.damage;
    document.getElementById('hazard-template-instant-kill').checked = template.damage >= 999;
    document.getElementById('hazard-template-continuous').checked = template.continuous || false;
    document.getElementById('hazard-template-symbol').value = template.symbol || '▲';
    document.getElementById('hazard-template-color').value = template.color || '#888888';
    document.getElementById('hazard-template-damage-sound').value = template.damageSound || '';
    // Update button states for sfx: values
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('hazard-template-damage-sound');
    }

    // Populate per-template particle effect
    const hazardParticleEl = document.getElementById('hazard-template-particle');
    if (hazardParticleEl) {
        hazardParticleEl.value = template.particleEffect || '';
        // Update button states for pfx: values
        if (typeof updateParticleButtonStates === 'function') {
            updateParticleButtonStates('hazard-template-particle');
        }
    }

    document.getElementById('hazard-template-editor').classList.add('visible');
}

function saveHazardTemplate() {
    const name = document.getElementById('hazard-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const instantKill = document.getElementById('hazard-template-instant-kill').checked;
    const templateData = {
        name: name,
        tileKey: document.getElementById('hazard-template-tile').value || '',
        sprite: document.getElementById('hazard-template-sprite').value.trim(),
        frameCount: parseInt(document.getElementById('hazard-template-cols').value) || 1,
        spritesheetCols: parseInt(document.getElementById('hazard-template-cols').value) || 1,
        spritesheetRows: parseInt(document.getElementById('hazard-template-rows').value) || 1,
        animSpeed: parseInt(document.getElementById('hazard-template-animspeed').value) || 8,
        damage: instantKill ? 999 : (parseInt(document.getElementById('hazard-template-damage').value) || 1),
        continuous: document.getElementById('hazard-template-continuous').checked,
        symbol: document.getElementById('hazard-template-symbol').value || '▲',
        color: document.getElementById('hazard-template-color').value || '#888888',
        damageSound: document.getElementById('hazard-template-damage-sound').value.trim(),
        particleEffect: document.getElementById('hazard-template-particle')?.value.trim() || ''
    };

    if (editingTemplateId) {
        const index = hazardTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            hazardTemplates[index] = templateData;
            showToast('Hazard type updated', 'success');
        }
        markDirty();
        closeHazardTemplateEditor();
        renderHazardTemplatesList();
        draw();
    } else {
        templateData.id = generateTemplateId('hazard', name);
        hazardTemplates.push(templateData);
        markDirty();
        closeHazardTemplateEditor();
        renderHazardTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closeHazardTemplatesModal();
        selectObjectForPlacement('hazard', templateData.id);
    }
}

function closeHazardTemplateEditor() {
    document.getElementById('hazard-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

function deleteHazardTemplate(id) {
    if (id === 'spike') {
        showToast('Cannot delete the default hazard', 'error');
        return;
    }

    const template = hazardTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('hazard', id);

    let confirmMsg = `Delete hazard type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const index = hazardTemplates.findIndex(t => t.id === id);
    if (index > 0) {
        hazardTemplates.splice(index, 1);

        // Remove all placed objects using this template from ALL levels
        const removed = removeTemplateInstancesFromAllLevels('hazard', id);

        markDirty();
        renderHazardTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`Hazard type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('Hazard type deleted', 'success');
        }
    }
}

// ============================================
// POWERUP TEMPLATE MANAGEMENT
// ============================================

function showPowerupTemplatesModal() {
    const modal = document.getElementById('powerup-templates-modal');
    modal.classList.add('visible');
    renderPowerupTemplatesList();
}

function closePowerupTemplatesModal() {
    document.getElementById('powerup-templates-modal').classList.remove('visible');
}

function renderPowerupTemplatesList() {
    const container = document.getElementById('powerup-templates-list');
    if (!container) return;

    let html = '';
    powerupTemplates.forEach((template, index) => {
        const effectLabels = {
            'heal': `Heals ${template.amount} HP`,
            'shield': `Shield for ${template.duration}s`,
            'speed': `${template.amount}x speed for ${template.duration}s`,
            'jump': `${template.amount}x jump for ${template.duration}s`
        };
        const effectText = effectLabels[template.effect] || template.effect;

        html += `
            <div class="template-item" data-id="${template.id}">
                <div class="template-preview" style="${getTemplatePreviewBackground(template)}">
                    ${getTemplatePreviewHTML(template, '❤️')}
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${effectText}</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small" onclick="editPowerupTemplate('${template.id}')">Edit</button>
                    ${index > 0 ? `<button class="btn btn-small btn-danger" onclick="deletePowerupTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddPowerupTemplate() {
    editingTemplateId = null;
    document.getElementById('powerup-template-title').textContent = 'Add Powerup Type';
    document.getElementById('powerup-template-name').value = '';
    populateObjectTileSelector('powerup-template-tile');
    document.getElementById('powerup-template-tile').value = '';
    updateObjectTilePreview('powerup-template-tile', 'powerup-tile-preview');
    document.getElementById('powerup-template-sprite').value = '';
    document.getElementById('powerup-template-cols').value = '1';
    document.getElementById('powerup-template-rows').value = '1';
    document.getElementById('powerup-template-animspeed').value = '8';
    document.getElementById('powerup-template-width').value = '32';
    document.getElementById('powerup-template-height').value = '32';
    document.getElementById('powerup-template-effect').value = 'heal';
    document.getElementById('powerup-template-amount').value = '1';
    document.getElementById('powerup-template-duration').value = '0';
    document.getElementById('powerup-template-symbol').value = '♥';
    document.getElementById('powerup-template-color').value = '#ff6b6b';
    document.getElementById('powerup-template-sound').value = '';

    // Clear particle effect for new template
    const powerupParticleEl = document.getElementById('powerup-template-particle');
    if (powerupParticleEl) powerupParticleEl.value = '';

    updatePowerupEffectOptions();
    document.getElementById('powerup-template-editor').classList.add('visible');
}

function editPowerupTemplate(id) {
    const template = powerupTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('powerup-template-title').textContent = 'Edit Powerup Type';
    document.getElementById('powerup-template-name').value = template.name;
    populateObjectTileSelector('powerup-template-tile');
    document.getElementById('powerup-template-tile').value = template.tileKey || '';
    updateObjectTilePreview('powerup-template-tile', 'powerup-tile-preview');
    document.getElementById('powerup-template-sprite').value = template.sprite || '';
    document.getElementById('powerup-template-cols').value = template.spritesheetCols || template.frameCount || 1;
    document.getElementById('powerup-template-rows').value = template.spritesheetRows || 1;
    document.getElementById('powerup-template-animspeed').value = template.animSpeed || 8;
    document.getElementById('powerup-template-width').value = template.width || 32;
    document.getElementById('powerup-template-height').value = template.height || 32;
    document.getElementById('powerup-template-effect').value = template.effect;
    document.getElementById('powerup-template-amount').value = template.amount;
    document.getElementById('powerup-template-duration').value = template.duration || 0;
    document.getElementById('powerup-template-symbol').value = template.symbol || '♥';
    document.getElementById('powerup-template-color').value = template.color || '#ff6b6b';
    document.getElementById('powerup-template-sound').value = template.sound || '';
    // Update button states for sfx: values
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('powerup-template-sound');
    }

    // Populate per-template particle effect
    const powerupParticleEl = document.getElementById('powerup-template-particle');
    if (powerupParticleEl) {
        powerupParticleEl.value = template.particleEffect || '';
        // Update button states for pfx: values
        if (typeof updateParticleButtonStates === 'function') {
            updateParticleButtonStates('powerup-template-particle');
        }
    }

    updatePowerupEffectOptions();
    document.getElementById('powerup-template-editor').classList.add('visible');
}

function updatePowerupEffectOptions() {
    const effect = document.getElementById('powerup-template-effect').value;
    const durationGroup = document.getElementById('powerup-duration-group');
    const amountLabel = document.getElementById('powerup-amount-label');

    if (effect === 'heal') {
        if (durationGroup) durationGroup.style.display = 'none';
        if (amountLabel) amountLabel.textContent = 'Heal Amount:';
    } else if (effect === 'ammo') {
        if (durationGroup) durationGroup.style.display = 'none';
        if (amountLabel) amountLabel.textContent = 'Ammo to Restore:';
    } else {
        if (durationGroup) durationGroup.style.display = 'block';
        if (amountLabel) amountLabel.textContent = effect === 'shield' ? 'Hits Blocked:' : 'Multiplier:';
    }
}

function savePowerupTemplate() {
    const name = document.getElementById('powerup-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const templateData = {
        name: name,
        tileKey: document.getElementById('powerup-template-tile').value || '',
        sprite: document.getElementById('powerup-template-sprite').value.trim(),
        frameCount: parseInt(document.getElementById('powerup-template-cols').value) || 1,
        spritesheetCols: parseInt(document.getElementById('powerup-template-cols').value) || 1,
        spritesheetRows: parseInt(document.getElementById('powerup-template-rows').value) || 1,
        animSpeed: parseInt(document.getElementById('powerup-template-animspeed').value) || 8,
        width: parseInt(document.getElementById('powerup-template-width').value) || 32,
        height: parseInt(document.getElementById('powerup-template-height').value) || 32,
        effect: document.getElementById('powerup-template-effect').value,
        amount: parseFloat(document.getElementById('powerup-template-amount').value) || 1,
        duration: parseFloat(document.getElementById('powerup-template-duration').value) || 0,
        symbol: document.getElementById('powerup-template-symbol').value || '♥',
        color: document.getElementById('powerup-template-color').value || '#ff6b6b',
        sound: document.getElementById('powerup-template-sound').value.trim(),
        particleEffect: document.getElementById('powerup-template-particle')?.value.trim() || ''
    };

    if (editingTemplateId) {
        const index = powerupTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            powerupTemplates[index] = templateData;
            showToast('Powerup type updated', 'success');
        }
        markDirty();
        closePowerupTemplateEditor();
        renderPowerupTemplatesList();
        draw();
    } else {
        templateData.id = generateTemplateId('powerup', name);
        powerupTemplates.push(templateData);
        markDirty();
        closePowerupTemplateEditor();
        renderPowerupTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closePowerupTemplatesModal();
        selectObjectForPlacement('powerup', templateData.id);
    }
}

function closePowerupTemplateEditor() {
    document.getElementById('powerup-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

function deletePowerupTemplate(id) {
    if (id === 'heart') {
        showToast('Cannot delete the default powerup', 'error');
        return;
    }

    const template = powerupTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('powerup', id);

    let confirmMsg = `Delete powerup type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const index = powerupTemplates.findIndex(t => t.id === id);
    if (index > 0) {
        powerupTemplates.splice(index, 1);

        const removed = removeTemplateInstancesFromAllLevels('powerup', id);

        markDirty();
        renderPowerupTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`Powerup type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('Powerup type deleted', 'success');
        }
    }
}

// ============================================
// SPRING TEMPLATE MANAGEMENT
// ============================================

function showSpringTemplatesModal() {
    const modal = document.getElementById('spring-templates-modal');
    modal.classList.add('visible');
    renderSpringTemplatesList();
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        const template = springTemplates[0] || {};
        CodePreview.setContext('spring', { template });
    }
}

function closeSpringTemplatesModal() {
    document.getElementById('spring-templates-modal').classList.remove('visible');
}

function renderSpringTemplatesList() {
    const container = document.getElementById('spring-templates-list');
    if (!container) return;

    let html = '';
    springTemplates.forEach((template, index) => {
        html += `
            <div class="template-item" data-id="${template.id}">
                <div class="template-preview" style="${getTemplatePreviewBackground(template)}">
                    ${getTemplatePreviewHTML(template, '🔼')}
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">Bounce: ${template.bouncePower}x jump power</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small" onclick="editSpringTemplate('${template.id}')">Edit</button>
                    ${index > 0 ? `<button class="btn btn-small btn-danger" onclick="deleteSpringTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddSpringTemplate() {
    editingTemplateId = null;
    document.getElementById('spring-template-title').textContent = 'Add Spring Type';
    document.getElementById('spring-template-name').value = '';
    document.getElementById('spring-template-sprite').value = '';
    document.getElementById('spring-template-cols').value = '1';
    document.getElementById('spring-template-rows').value = '1';
    document.getElementById('spring-template-animspeed').value = '8';
    document.getElementById('spring-template-width').value = '32';
    document.getElementById('spring-template-height').value = '16';
    document.getElementById('spring-template-bouncepower').value = '1.5';
    document.getElementById('spring-template-symbol').value = '🔼';
    document.getElementById('spring-template-color').value = '#9b59b6';
    document.getElementById('spring-template-sound').value = '';

    // Clear particle effect for new template
    const springParticleEl = document.getElementById('spring-template-particle');
    if (springParticleEl) springParticleEl.value = '';

    document.getElementById('spring-template-editor').classList.add('visible');
}

function editSpringTemplate(id) {
    const template = springTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('spring-template-title').textContent = 'Edit Spring Type';
    document.getElementById('spring-template-name').value = template.name;
    document.getElementById('spring-template-sprite').value = template.sprite || '';
    document.getElementById('spring-template-cols').value = template.spritesheetCols || template.frameCount || 1;
    document.getElementById('spring-template-rows').value = template.spritesheetRows || 1;
    document.getElementById('spring-template-animspeed').value = template.animSpeed || 8;
    document.getElementById('spring-template-width').value = template.width || 32;
    document.getElementById('spring-template-height').value = template.height || 16;
    document.getElementById('spring-template-bouncepower').value = template.bouncePower || 1.5;
    document.getElementById('spring-template-symbol').value = template.symbol || '🔼';
    document.getElementById('spring-template-color').value = template.color || '#9b59b6';
    document.getElementById('spring-template-sound').value = template.bounceSound || '';
    // Update button states for sfx: values
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('spring-template-sound');
    }

    // Populate per-template particle effect
    const springParticleEl = document.getElementById('spring-template-particle');
    if (springParticleEl) {
        springParticleEl.value = template.particleEffect || '';
        // Update button states for pfx: values
        if (typeof updateParticleButtonStates === 'function') {
            updateParticleButtonStates('spring-template-particle');
        }
    }

    document.getElementById('spring-template-editor').classList.add('visible');
}

function saveSpringTemplate() {
    const name = document.getElementById('spring-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const templateData = {
        name: name,
        sprite: document.getElementById('spring-template-sprite').value.trim(),
        frameCount: parseInt(document.getElementById('spring-template-cols').value) || 1,
        spritesheetCols: parseInt(document.getElementById('spring-template-cols').value) || 1,
        spritesheetRows: parseInt(document.getElementById('spring-template-rows').value) || 1,
        animSpeed: parseInt(document.getElementById('spring-template-animspeed').value) || 8,
        width: parseInt(document.getElementById('spring-template-width').value) || 32,
        height: parseInt(document.getElementById('spring-template-height').value) || 16,
        bouncePower: parseFloat(document.getElementById('spring-template-bouncepower').value) || 1.5,
        symbol: document.getElementById('spring-template-symbol').value || '🔼',
        color: document.getElementById('spring-template-color').value || '#9b59b6',
        bounceSound: document.getElementById('spring-template-sound').value.trim(),
        particleEffect: document.getElementById('spring-template-particle')?.value.trim() || ''
    };

    if (editingTemplateId) {
        const index = springTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            springTemplates[index] = templateData;
            showToast('Spring type updated', 'success');
        }
        markDirty();
        closeSpringTemplateEditor();
        renderSpringTemplatesList();
        draw();
    } else {
        templateData.id = generateTemplateId('spring', name);
        springTemplates.push(templateData);
        markDirty();
        closeSpringTemplateEditor();
        renderSpringTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closeSpringTemplatesModal();
        selectObjectForPlacement('spring', templateData.id);
    }
}

function closeSpringTemplateEditor() {
    document.getElementById('spring-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

function deleteSpringTemplate(id) {
    if (id === 'spring') {
        showToast('Cannot delete the default spring', 'error');
        return;
    }

    const template = springTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('spring', id);

    let confirmMsg = `Delete spring type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const index = springTemplates.findIndex(t => t.id === id);
    if (index > 0) {
        springTemplates.splice(index, 1);

        const removed = removeTemplateInstancesFromAllLevels('spring', id);

        markDirty();
        renderSpringTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`Spring type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('Spring type deleted', 'success');
        }
    }
}

// ============================================
// TERRAIN ZONE TEMPLATE MANAGEMENT
// ============================================

function showTerrainZoneTemplatesModal() {
    const modal = document.getElementById('terrain-zone-templates-modal');
    modal.classList.add('visible');
    renderTerrainZoneTemplatesList();
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        const template = terrainZoneTemplates[0] || {};
        CodePreview.setContext('terrainZone', { template });
    }
}

function closeTerrainZoneTemplatesModal() {
    document.getElementById('terrain-zone-templates-modal').classList.remove('visible');
}

function renderTerrainZoneTemplatesList() {
    const container = document.getElementById('terrain-zone-templates-list');
    if (!container) return;

    let html = '';
    terrainZoneTemplates.forEach((template, index) => {
        const speedLabel = template.speedMultiplier < 1 ? 'Slow' : (template.speedMultiplier > 1 ? 'Fast' : 'Normal');
        const damageLabel = template.damagePerSecond > 0 ? `${template.damagePerSecond} DPS` : 'No damage';

        html += `
            <div class="template-item" data-id="${template.id}" onclick="selectTerrainZoneForPlacement('${template.id}')" style="cursor: pointer;">
                <div class="template-preview" style="background-color: ${template.tintColor}; opacity: ${template.opacity};">
                    <span style="font-size: 24px; opacity: 1;">${template.symbol || '~'}</span>
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${speedLabel} (${template.speedMultiplier}x) | ${damageLabel}</div>
                    <div class="template-hint" style="font-size: 10px; color: #888; margin-top: 2px;">Click to select for placement</div>
                </div>
                <div class="template-actions" onclick="event.stopPropagation();">
                    <button class="btn btn-small" onclick="editTerrainZoneTemplate('${template.id}')">Edit</button>
                    ${index > 0 ? `<button class="btn btn-small btn-danger" onclick="deleteTerrainZoneTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddTerrainZoneTemplate() {
    editingTemplateId = null;
    document.getElementById('terrain-zone-template-title').textContent = 'Add Terrain Zone Type';
    document.getElementById('terrain-zone-template-name').value = '';
    document.getElementById('terrain-zone-template-image').value = '';
    document.getElementById('terrain-zone-template-tint').value = '#4a90d9';
    document.getElementById('terrain-zone-template-opacity').value = '0.6';
    document.getElementById('terrain-zone-opacity-display').textContent = '0.6';
    document.getElementById('terrain-zone-template-speed').value = '0.5';
    document.getElementById('terrain-zone-speed-display').textContent = '0.5x';
    document.getElementById('terrain-zone-template-jump').value = '0.7';
    document.getElementById('terrain-zone-jump-display').textContent = '0.7x';
    document.getElementById('terrain-zone-template-gravity').value = '0.8';
    document.getElementById('terrain-zone-gravity-display').textContent = '0.8x';
    document.getElementById('terrain-zone-template-damage').value = '0';
    document.getElementById('terrain-zone-template-entry-sound').value = '';
    document.getElementById('terrain-zone-template-loop-sound').value = '';
    document.getElementById('terrain-zone-template-affects-enemies').checked = true;
    document.getElementById('terrain-zone-template-symbol').value = '~';

    document.getElementById('terrain-zone-template-editor').classList.add('visible');
}

function editTerrainZoneTemplate(id) {
    const template = terrainZoneTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('terrain-zone-template-title').textContent = 'Edit Terrain Zone Type';
    document.getElementById('terrain-zone-template-name').value = template.name;
    document.getElementById('terrain-zone-template-image').value = template.imageURL || '';
    document.getElementById('terrain-zone-template-tint').value = template.tintColor || '#4a90d9';
    document.getElementById('terrain-zone-template-opacity').value = template.opacity !== undefined ? template.opacity : 0.6;
    document.getElementById('terrain-zone-opacity-display').textContent = template.opacity !== undefined ? template.opacity : 0.6;
    document.getElementById('terrain-zone-template-speed').value = template.speedMultiplier !== undefined ? template.speedMultiplier : 0.5;
    document.getElementById('terrain-zone-speed-display').textContent = (template.speedMultiplier !== undefined ? template.speedMultiplier : 0.5) + 'x';
    document.getElementById('terrain-zone-template-jump').value = template.jumpMultiplier !== undefined ? template.jumpMultiplier : 0.7;
    document.getElementById('terrain-zone-jump-display').textContent = (template.jumpMultiplier !== undefined ? template.jumpMultiplier : 0.7) + 'x';
    document.getElementById('terrain-zone-template-gravity').value = template.gravityMultiplier !== undefined ? template.gravityMultiplier : 0.8;
    document.getElementById('terrain-zone-gravity-display').textContent = (template.gravityMultiplier !== undefined ? template.gravityMultiplier : 0.8) + 'x';
    document.getElementById('terrain-zone-template-damage').value = template.damagePerSecond || 0;
    document.getElementById('terrain-zone-template-entry-sound').value = template.entrySound || '';
    document.getElementById('terrain-zone-template-loop-sound').value = template.loopSound || '';
    // Update button states for sfx: values
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('terrain-zone-template-entry-sound');
        updateSoundButtonStates('terrain-zone-template-loop-sound');
    }
    document.getElementById('terrain-zone-template-affects-enemies').checked = template.affectsEnemies !== false;
    document.getElementById('terrain-zone-template-symbol').value = template.symbol || '~';

    document.getElementById('terrain-zone-template-editor').classList.add('visible');
}

function saveTerrainZoneTemplate() {
    const name = document.getElementById('terrain-zone-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const templateData = {
        name: name,
        imageURL: document.getElementById('terrain-zone-template-image').value.trim(),
        tintColor: document.getElementById('terrain-zone-template-tint').value || '#4a90d9',
        opacity: parseFloat(document.getElementById('terrain-zone-template-opacity').value) || 0.6,
        speedMultiplier: parseFloat(document.getElementById('terrain-zone-template-speed').value) || 0.5,
        jumpMultiplier: parseFloat(document.getElementById('terrain-zone-template-jump').value) || 0.7,
        gravityMultiplier: parseFloat(document.getElementById('terrain-zone-template-gravity').value) || 0.8,
        damagePerSecond: parseFloat(document.getElementById('terrain-zone-template-damage').value) || 0,
        entrySound: document.getElementById('terrain-zone-template-entry-sound').value.trim(),
        loopSound: document.getElementById('terrain-zone-template-loop-sound').value.trim(),
        affectsEnemies: document.getElementById('terrain-zone-template-affects-enemies').checked,
        symbol: document.getElementById('terrain-zone-template-symbol').value || '~'
    };

    if (editingTemplateId) {
        const index = terrainZoneTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            terrainZoneTemplates[index] = templateData;
            showToast('Terrain zone type updated', 'success');
        }
        markDirty();
        closeTerrainZoneTemplateEditor();
        renderTerrainZoneTemplatesList();
        draw();
    } else {
        templateData.id = generateTemplateId('terrainZone', name);
        terrainZoneTemplates.push(templateData);
        markDirty();
        closeTerrainZoneTemplateEditor();
        renderTerrainZoneTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closeTerrainZoneTemplatesModal();
        selectTerrainZoneForPlacement(templateData.id);
    }
}

function closeTerrainZoneTemplateEditor() {
    document.getElementById('terrain-zone-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

function deleteTerrainZoneTemplate(id) {
    if (id === 'water') {
        showToast('Cannot delete the default water zone', 'error');
        return;
    }

    const template = terrainZoneTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('terrainZone', id);

    let confirmMsg = `Delete terrain zone type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const index = terrainZoneTemplates.findIndex(t => t.id === id);
    if (index > 0) {
        terrainZoneTemplates.splice(index, 1);

        const removed = removeTemplateInstancesFromAllLevels('terrainZone', id);

        markDirty();
        renderTerrainZoneTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`Terrain zone type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('Terrain zone type deleted', 'success');
        }
    }
}

// Select a terrain zone template for placement (rectangle drag mode)
function selectTerrainZoneForPlacement(templateId) {
    selectedObjectType = 'terrainZone';
    selectedTemplateId = templateId || 'water';
    selectedTerrainZone = null; // Deselect any selected zone
    resizingHandle = null;

    // Update UI to show selection
    const template = getTemplate('terrainZone', selectedTemplateId);

    // Update selection status display
    const statusEl = document.getElementById('object-selection-status');
    const nameEl = document.getElementById('selected-object-name');
    if (statusEl) {
        statusEl.style.display = 'block';
    }
    if (nameEl) {
        nameEl.innerHTML = `<span style="color: ${template.tintColor};">🌊</span> ${template.name}`;
    }

    // Update cursor and tool hint
    canvas.style.cursor = 'crosshair';
    const hint = document.getElementById('tool-hint');
    if (hint) {
        hint.textContent = 'Click and drag to place zone | Right-click to cancel/delete';
    }

    closeTerrainZoneTemplatesModal();
    showToast(`Click and drag to place ${template.name} zone`, 'info');
    draw(); // Redraw to show any visual feedback
}

// ============================================
// MOVING PLATFORM TEMPLATE MANAGEMENT
// ============================================

function showMovingPlatformTemplatesModal() {
    const modal = document.getElementById('moving-platform-templates-modal');
    modal.classList.add('visible');
    renderMovingPlatformTemplatesList();
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        const template = movingPlatformTemplates[0] || {};
        CodePreview.setContext('movingPlatform', { template });
    }
}

function closeMovingPlatformTemplatesModal() {
    document.getElementById('moving-platform-templates-modal').classList.remove('visible');
}

function renderMovingPlatformTemplatesList() {
    const container = document.getElementById('moving-platform-templates-list');
    if (!container) return;

    let html = '';
    movingPlatformTemplates.forEach((template, index) => {
        const axisLabel = template.axis === 'y' ? 'Vertical' : 'Horizontal';
        const modeLabel = template.collisionMode === 'oneway' ? 'One-way' : 'Solid';
        const activationLabel = template.activation === 'touch' ? 'Touch-activated' : 'Always moving';

        html += `
            <div class="template-item" data-id="${template.id}">
                <div class="template-preview" style="${getTemplatePreviewBackground(template)}">
                    ${getTemplatePreviewHTML(template, '═')}
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${axisLabel} | ${template.distance}px | ${modeLabel}</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small" onclick="editMovingPlatformTemplate('${template.id}')">Edit</button>
                    ${index > 0 ? `<button class="btn btn-small btn-danger" onclick="deleteMovingPlatformTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddMovingPlatformTemplate() {
    editingTemplateId = null;
    document.getElementById('moving-platform-template-title').textContent = 'Add Moving Platform Type';
    document.getElementById('moving-platform-template-name').value = '';
    document.getElementById('moving-platform-template-sprite').value = '';
    document.getElementById('moving-platform-template-cols').value = '1';
    document.getElementById('moving-platform-template-rows').value = '1';
    document.getElementById('moving-platform-template-animspeed').value = '8';
    document.getElementById('moving-platform-template-width').value = '64';
    document.getElementById('moving-platform-template-height').value = '16';
    document.getElementById('moving-platform-template-axis').value = 'x';
    document.getElementById('moving-platform-template-distance').value = '100';
    document.getElementById('moving-platform-template-speed').value = '2';
    document.getElementById('moving-platform-template-collision').value = 'solid';
    document.getElementById('moving-platform-template-activation').value = 'always';
    document.getElementById('moving-platform-template-symbol').value = '═';
    document.getElementById('moving-platform-template-color').value = '#8B4513';
    document.getElementById('moving-platform-template-sound').value = '';
    document.getElementById('moving-platform-template-show-outline').checked = true;
    document.getElementById('moving-platform-template-outline-color').value = '#ffff00';

    // Populate tile selector and reset
    populatePlatformTileSelector();
    document.getElementById('moving-platform-template-tile').value = '';
    updatePlatformTilePreview();

    // Reset collapsing options to defaults
    document.getElementById('moving-platform-template-collapsing').checked = false;
    document.getElementById('moving-platform-template-collapse-delay').value = '1.0';
    document.getElementById('moving-platform-template-collapse-shake').value = '0.5';
    document.getElementById('moving-platform-template-collapse-respawn').value = '3.0';
    document.getElementById('moving-platform-template-collapse-sound').value = '';

    // Show/hide outline options based on activation mode (hidden for "always" default)
    togglePlatformOutlineOptions();
    // Show/hide collapsing options (hidden by default)
    toggleCollapsingOptions();

    document.getElementById('moving-platform-template-editor').classList.add('visible');
}

function editMovingPlatformTemplate(id) {
    const template = movingPlatformTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('moving-platform-template-title').textContent = 'Edit Moving Platform Type';
    document.getElementById('moving-platform-template-name').value = template.name;
    document.getElementById('moving-platform-template-sprite').value = template.sprite || '';
    document.getElementById('moving-platform-template-cols').value = template.spritesheetCols || template.frameCount || 1;
    document.getElementById('moving-platform-template-rows').value = template.spritesheetRows || 1;
    document.getElementById('moving-platform-template-animspeed').value = template.animSpeed || 8;
    document.getElementById('moving-platform-template-width').value = template.width || 64;
    document.getElementById('moving-platform-template-height').value = template.height || 16;
    document.getElementById('moving-platform-template-axis').value = template.axis || 'x';
    document.getElementById('moving-platform-template-distance').value = template.distance || 100;
    document.getElementById('moving-platform-template-speed').value = template.speed || 2;
    document.getElementById('moving-platform-template-collision').value = template.collisionMode || 'solid';
    document.getElementById('moving-platform-template-activation').value = template.activation || 'always';
    document.getElementById('moving-platform-template-symbol').value = template.symbol || '═';
    document.getElementById('moving-platform-template-color').value = template.color || '#8B4513';
    document.getElementById('moving-platform-template-sound').value = template.moveSound || '';
    document.getElementById('moving-platform-template-show-outline').checked = template.showInactiveOutline !== false;
    document.getElementById('moving-platform-template-outline-color').value = template.inactiveOutlineColor || '#ffff00';

    // Populate tile selector and set value
    populatePlatformTileSelector();
    document.getElementById('moving-platform-template-tile').value = template.tileKey || '';
    updatePlatformTilePreview();

    // Collapsing options
    document.getElementById('moving-platform-template-collapsing').checked = template.collapsing || false;
    document.getElementById('moving-platform-template-collapse-delay').value = template.collapseDelay || 1.0;
    document.getElementById('moving-platform-template-collapse-shake').value = template.collapseShakeDuration || 0.5;
    document.getElementById('moving-platform-template-collapse-respawn').value = (template.collapseRespawnTime !== undefined ? template.collapseRespawnTime : 3.0);
    document.getElementById('moving-platform-template-collapse-sound').value = template.collapseSound || '';
    // Update button states for sfx: values
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('moving-platform-template-sound');
        updateSoundButtonStates('moving-platform-template-collapse-sound');
    }

    // Randomize start option
    document.getElementById('moving-platform-template-randomize').checked = template.randomizeStart || false;

    // Show/hide outline options based on activation mode
    togglePlatformOutlineOptions();
    // Show/hide collapsing options based on checkbox
    toggleCollapsingOptions();

    document.getElementById('moving-platform-template-editor').classList.add('visible');
}

function saveMovingPlatformTemplate() {
    const name = document.getElementById('moving-platform-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const templateData = {
        name: name,
        sprite: document.getElementById('moving-platform-template-sprite').value.trim(),
        frameCount: parseInt(document.getElementById('moving-platform-template-cols').value) || 1,
        spritesheetCols: parseInt(document.getElementById('moving-platform-template-cols').value) || 1,
        spritesheetRows: parseInt(document.getElementById('moving-platform-template-rows').value) || 1,
        animSpeed: parseInt(document.getElementById('moving-platform-template-animspeed').value) || 8,
        width: parseInt(document.getElementById('moving-platform-template-width').value) || 64,
        height: parseInt(document.getElementById('moving-platform-template-height').value) || 16,
        axis: document.getElementById('moving-platform-template-axis').value || 'x',
        distance: parseInt(document.getElementById('moving-platform-template-distance').value) || 100,
        speed: parseFloat(document.getElementById('moving-platform-template-speed').value) || 2,
        collisionMode: document.getElementById('moving-platform-template-collision').value || 'solid',
        activation: document.getElementById('moving-platform-template-activation').value || 'always',
        tileKey: document.getElementById('moving-platform-template-tile').value || '',
        symbol: document.getElementById('moving-platform-template-symbol').value || '═',
        color: document.getElementById('moving-platform-template-color').value || '#8B4513',
        moveSound: document.getElementById('moving-platform-template-sound').value.trim(),
        showInactiveOutline: document.getElementById('moving-platform-template-show-outline').checked,
        inactiveOutlineColor: document.getElementById('moving-platform-template-outline-color').value || '#ffff00',
        // Collapsing options
        collapsing: document.getElementById('moving-platform-template-collapsing').checked,
        collapseDelay: parseFloat(document.getElementById('moving-platform-template-collapse-delay').value) || 1.0,
        collapseShakeDuration: parseFloat(document.getElementById('moving-platform-template-collapse-shake').value) || 0.5,
        collapseRespawnTime: (function() {
            var val = parseFloat(document.getElementById('moving-platform-template-collapse-respawn').value);
            return isNaN(val) ? 3.0 : val; // Allow 0 as valid value (never respawn)
        })(),
        collapseSound: document.getElementById('moving-platform-template-collapse-sound').value.trim(),
        // Randomize start option
        randomizeStart: document.getElementById('moving-platform-template-randomize').checked
    };

    if (editingTemplateId) {
        const index = movingPlatformTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            movingPlatformTemplates[index] = templateData;
            showToast('Moving platform type updated', 'success');
        }
        markDirty();
        closeMovingPlatformTemplateEditor();
        renderMovingPlatformTemplatesList();
        draw();
    } else {
        templateData.id = generateTemplateId('movingPlatform', name);
        movingPlatformTemplates.push(templateData);
        markDirty();
        closeMovingPlatformTemplateEditor();
        renderMovingPlatformTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closeMovingPlatformTemplatesModal();
        selectObjectForPlacement('movingPlatform', templateData.id);
    }
}

function closeMovingPlatformTemplateEditor() {
    document.getElementById('moving-platform-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

// Toggle visibility of outline options based on activation mode
function togglePlatformOutlineOptions() {
    const activation = document.getElementById('moving-platform-template-activation').value;
    const outlineOptions = document.getElementById('platform-outline-options');
    if (outlineOptions) {
        outlineOptions.style.display = (activation === 'touch') ? 'flex' : 'none';
    }
}

// Toggle visibility of collapsing options
function toggleCollapsingOptions() {
    const collapsing = document.getElementById('moving-platform-template-collapsing').checked;
    const collapseOptions = document.getElementById('platform-collapse-options');
    if (collapseOptions) {
        collapseOptions.style.display = collapsing ? 'block' : 'none';
    }
}

function deleteMovingPlatformTemplate(id) {
    if (id === 'platform') {
        showToast('Cannot delete the default moving platform', 'error');
        return;
    }

    const template = movingPlatformTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('movingPlatform', id);

    let confirmMsg = `Delete moving platform type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const index = movingPlatformTemplates.findIndex(t => t.id === id);
    if (index > 0) {
        movingPlatformTemplates.splice(index, 1);

        const removed = removeTemplateInstancesFromAllLevels('movingPlatform', id);

        markDirty();
        renderMovingPlatformTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`Moving platform type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('Moving platform type deleted', 'success');
        }
    }
}

// Populate tile selector for moving platforms
function populatePlatformTileSelector() {
    const select = document.getElementById('moving-platform-template-tile');
    if (!select) return;

    // Keep the "None" option
    let html = '<option value="">-- None (use color/sprite) --</option>';

    // Add tiles from tileset
    if (typeof tiles === 'object') {
        const tileKeys = Object.keys(tiles).filter(k => k !== '.');
        if (tileKeys.length > 0) {
            html += '<optgroup label="Tileset Tiles">';
            tileKeys.forEach(key => {
                const tile = tiles[key];
                const name = tile.name || `Tile "${key}"`;
                html += `<option value="${key}">${name} (${key})</option>`;
            });
            html += '</optgroup>';
        }
    }

    // Add custom tiles
    if (typeof customTiles === 'object') {
        const customKeys = Object.keys(customTiles);
        if (customKeys.length > 0) {
            html += '<optgroup label="Custom Tiles">';
            customKeys.forEach((key, index) => {
                const ct = customTiles[key];
                const name = ct.name || `Custom Tile #${index + 1}`;
                html += `<option value="${key}">${name}</option>`;
            });
            html += '</optgroup>';
        }
    }

    select.innerHTML = html;
}

// Update tile preview for moving platform editor
function updatePlatformTilePreview() {
    const preview = document.getElementById('platform-tile-preview');
    const tileKey = document.getElementById('moving-platform-template-tile').value;

    if (!preview) return;

    if (!tileKey) {
        preview.innerHTML = '<span style="color:#888;font-size:11px;">Select a tile to preview</span>';
        return;
    }

    // Check if it's a custom tile
    if (typeof customTiles === 'object' && customTiles[tileKey]) {
        const ct = customTiles[tileKey];
        if (ct.dataURL) {
            preview.innerHTML = `
                <img src="${ct.dataURL}" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #555;">
                <img src="${ct.dataURL}" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #555;">
                <img src="${ct.dataURL}" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #555;">
                <span style="color:#888;font-size:11px;margin-left:5px;">Custom tile "${tileKey}"</span>
            `;
            return;
        }
    }

    // Check if it's a tileset tile
    if (typeof tiles === 'object' && tiles[tileKey] && typeof tilesetImage !== 'undefined' && tilesetImage) {
        const tile = tiles[tileKey];
        // Create a small canvas to extract the tile
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tilesetImage, tile.x, tile.y, 16, 16, 0, 0, 32, 32);
        const dataURL = canvas.toDataURL();
        preview.innerHTML = `
            <img src="${dataURL}" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #555;">
            <img src="${dataURL}" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #555;">
            <img src="${dataURL}" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #555;">
            <span style="color:#888;font-size:11px;margin-left:5px;">Tile "${tile.name || tileKey}"</span>
        `;
        return;
    }

    preview.innerHTML = '<span style="color:#f66;font-size:11px;">Tile not found</span>';
}

// ============================================
// GENERIC OBJECT TILE SELECTOR (for enemies, collectibles, hazards, powerups)
// ============================================

// Populate tile selector for any object type
function populateObjectTileSelector(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Keep the "None" option
    let html = '<option value="">-- None (use sprite/color) --</option>';

    // Add tiles from tileset
    if (typeof tiles === 'object') {
        const tileKeys = Object.keys(tiles).filter(k => k !== '.');
        if (tileKeys.length > 0) {
            html += '<optgroup label="Tileset Tiles">';
            tileKeys.forEach(key => {
                const tile = tiles[key];
                const name = tile.name || `Tile "${key}"`;
                html += `<option value="${key}">${name} (${key})</option>`;
            });
            html += '</optgroup>';
        }
    }

    // Add custom tiles
    if (typeof customTiles === 'object') {
        const customKeys = Object.keys(customTiles);
        if (customKeys.length > 0) {
            html += '<optgroup label="Custom Tiles">';
            customKeys.forEach((key, index) => {
                const ct = customTiles[key];
                const name = ct.name || `Custom Tile #${index + 1}`;
                html += `<option value="${key}">${name}</option>`;
            });
            html += '</optgroup>';
        }
    }

    select.innerHTML = html;
}

// Update tile preview for any object type
function updateObjectTilePreview(selectId, previewId) {
    const preview = document.getElementById(previewId);
    const select = document.getElementById(selectId);
    if (!preview || !select) return;

    const tileKey = select.value;

    if (!tileKey) {
        preview.innerHTML = '<span style="color:#888;font-size:11px;">Select a tile to use as sprite</span>';
        return;
    }

    // Check if it's a custom tile
    if (typeof customTiles === 'object' && customTiles[tileKey]) {
        const ct = customTiles[tileKey];
        if (ct.dataURL) {
            preview.innerHTML = `
                <img src="${ct.dataURL}" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #555;">
                <span style="color:#888;font-size:11px;margin-left:5px;">Custom tile "${ct.name || tileKey}"</span>
            `;
            return;
        }
    }

    // Check if it's a tileset tile
    if (typeof tiles === 'object' && tiles[tileKey] && typeof tilesetImage !== 'undefined' && tilesetImage) {
        const tile = tiles[tileKey];
        // Create a small canvas to extract the tile
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tilesetImage, tile.x, tile.y, 16, 16, 0, 0, 32, 32);
        const dataURL = canvas.toDataURL();
        preview.innerHTML = `
            <img src="${dataURL}" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #555;">
            <span style="color:#888;font-size:11px;margin-left:5px;">Tile "${tile.name || tileKey}"</span>
        `;
        return;
    }

    preview.innerHTML = '<span style="color:#f66;font-size:11px;">Tile not found</span>';
}

// Populate all object tile selectors (call when tileset changes or modal opens)
function populateAllObjectTileSelectors() {
    populateObjectTileSelector('enemy-template-tile');
    populateObjectTileSelector('collectible-template-tile');
    populateObjectTileSelector('hazard-template-tile');
    populateObjectTileSelector('powerup-template-tile');
    populatePlatformTileSelector(); // Keep existing platform function
}

// ============================================
// NPC TEMPLATE MANAGEMENT (Top-Down RPG)
// ============================================

function showNPCTemplatesModal() {
    const modal = document.getElementById('npc-templates-modal');
    modal.classList.add('visible');
    renderNPCTemplatesList();
}

function closeNPCTemplatesModal() {
    document.getElementById('npc-templates-modal').classList.remove('visible');
}

function renderNPCTemplatesList() {
    const container = document.getElementById('npc-templates-list');
    if (!container) return;

    let html = '';
    npcTemplates.forEach((template, index) => {
        const behaviorLabel = template.behavior === 'wander' ? 'Wanders' : 'Stationary';
        const dialogueCount = (template.dialogueLines || []).length;

        html += `
            <div class="template-item" data-id="${template.id}">
                <div class="template-preview" style="${getTemplatePreviewBackground(template)}">
                    ${getTemplatePreviewHTML(template, '👤')}
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${behaviorLabel} | ${dialogueCount} dialogue line(s)</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small" onclick="editNPCTemplate('${template.id}')">Edit</button>
                    ${index > 0 ? `<button class="btn btn-small btn-danger" onclick="deleteNPCTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddNPCTemplate() {
    editingTemplateId = null;
    document.getElementById('npc-template-title').textContent = 'Add NPC Type';
    document.getElementById('npc-template-name').value = '';
    document.getElementById('npc-template-sprite').value = '';
    document.getElementById('npc-template-cols').value = '1';
    document.getElementById('npc-template-rows').value = '1';
    document.getElementById('npc-template-width').value = '32';
    document.getElementById('npc-template-height').value = '32';
    document.getElementById('npc-template-color').value = '#3498db';
    document.getElementById('npc-template-symbol').value = '👤';
    document.getElementById('npc-template-dialogue').value = 'Hello!\nHow are you?';
    document.getElementById('npc-template-radius').value = '48';
    document.getElementById('npc-template-behavior').value = 'stationary';
    // Wander options
    document.getElementById('npc-template-wander-speed').value = '1';
    document.getElementById('npc-template-wander-radius').value = '3';
    document.getElementById('npc-template-solid-collision').checked = true;
    // Hide wander options by default
    document.getElementById('npc-wander-options').style.display = 'none';

    document.getElementById('npc-template-editor').classList.add('visible');
}

function editNPCTemplate(id) {
    const template = npcTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('npc-template-title').textContent = 'Edit NPC Type';
    document.getElementById('npc-template-name').value = template.name;
    document.getElementById('npc-template-sprite').value = template.sprite || '';
    document.getElementById('npc-template-cols').value = template.spritesheetCols || template.frameCount || 1;
    document.getElementById('npc-template-rows').value = template.spritesheetRows || 1;
    document.getElementById('npc-template-width').value = template.width || 32;
    document.getElementById('npc-template-height').value = template.height || 32;
    document.getElementById('npc-template-color').value = template.color || '#3498db';
    document.getElementById('npc-template-symbol').value = template.symbol || '👤';
    document.getElementById('npc-template-dialogue').value = (template.dialogueLines || []).join('\n');
    document.getElementById('npc-template-radius').value = template.interactionRadius || 48;
    document.getElementById('npc-template-behavior').value = template.behavior || 'stationary';
    // Wander options
    document.getElementById('npc-template-wander-speed').value = template.wanderSpeed || 1;
    document.getElementById('npc-template-wander-radius').value = template.wanderRadius || 3;
    document.getElementById('npc-template-solid-collision').checked = template.solidCollision !== false;
    // Show/hide wander options based on behavior
    document.getElementById('npc-wander-options').style.display =
        template.behavior === 'wander' ? 'block' : 'none';

    document.getElementById('npc-template-editor').classList.add('visible');
}

function saveNPCTemplate() {
    const name = document.getElementById('npc-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const dialogueText = document.getElementById('npc-template-dialogue').value.trim();
    const dialogueLines = dialogueText ? dialogueText.split('\n').filter(line => line.trim()) : [];

    const templateData = {
        name: name,
        sprite: document.getElementById('npc-template-sprite').value.trim(),
        frameCount: parseInt(document.getElementById('npc-template-cols').value) || 1,
        spritesheetCols: parseInt(document.getElementById('npc-template-cols').value) || 1,
        spritesheetRows: parseInt(document.getElementById('npc-template-rows').value) || 1,
        width: parseInt(document.getElementById('npc-template-width').value) || 32,
        height: parseInt(document.getElementById('npc-template-height').value) || 32,
        color: document.getElementById('npc-template-color').value || '#3498db',
        symbol: document.getElementById('npc-template-symbol').value || '👤',
        dialogueLines: dialogueLines,
        interactionRadius: parseInt(document.getElementById('npc-template-radius').value) || 48,
        behavior: document.getElementById('npc-template-behavior').value || 'stationary',
        // Wander options
        wanderSpeed: parseFloat(document.getElementById('npc-template-wander-speed').value) || 1,
        wanderRadius: parseInt(document.getElementById('npc-template-wander-radius').value) || 3,
        solidCollision: document.getElementById('npc-template-solid-collision').checked
    };

    if (editingTemplateId) {
        const index = npcTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            npcTemplates[index] = templateData;
            showToast('NPC type updated', 'success');
        }
        markDirty();
        closeNPCTemplateEditor();
        renderNPCTemplatesList();
        draw();
    } else {
        templateData.id = generateTemplateId('npc', name);
        npcTemplates.push(templateData);
        markDirty();
        closeNPCTemplateEditor();
        renderNPCTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closeNPCTemplatesModal();
        selectObjectForPlacement('npc', templateData.id);
    }
}

function closeNPCTemplateEditor() {
    document.getElementById('npc-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

function deleteNPCTemplate(id) {
    if (id === 'villager') {
        showToast('Cannot delete the default NPC', 'error');
        return;
    }

    const template = npcTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('npc', id);

    let confirmMsg = `Delete NPC type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const index = npcTemplates.findIndex(t => t.id === id);
    if (index > 0) {
        npcTemplates.splice(index, 1);

        const removed = removeTemplateInstancesFromAllLevels('npc', id);

        markDirty();
        renderNPCTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`NPC type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('NPC type deleted', 'success');
        }
    }
}

function selectNPCForPlacement() {
    selectedObjectType = 'npc';
    selectedTemplateId = npcTemplates[0]?.id || 'villager';

    // Clear tile selection when selecting an object (mutual exclusivity)
    clearTileSelection();

    updateObjectSelectionUI('npc', getTemplate('npc', selectedTemplateId));
    showToast('Selected: NPC. Click on the level to place.', 'info');
}

// ============================================
// DOOR TEMPLATE MANAGEMENT (Top-Down RPG)
// ============================================

function showDoorTemplatesModal() {
    const modal = document.getElementById('door-templates-modal');
    modal.classList.add('visible');
    renderDoorTemplatesList();
}

function closeDoorTemplatesModal() {
    document.getElementById('door-templates-modal').classList.remove('visible');
}

function renderDoorTemplatesList() {
    const container = document.getElementById('door-templates-list');
    if (!container) return;

    let html = '';
    doorTemplates.forEach((template, index) => {
        let destText = 'Not configured';
        if (template.destinationType === 'level' && template.destinationLevelId) {
            const destLevel = levels.find(l => l.id === template.destinationLevelId);
            destText = `→ ${destLevel?.name || template.destinationLevelId}`;
        } else if (template.destinationType === 'position' && template.destinationX !== null) {
            destText = `→ (${template.destinationX}, ${template.destinationY})`;
        }

        html += `
            <div class="template-item" data-id="${template.id}">
                <div class="template-preview" style="${getTemplatePreviewBackground(template)}">
                    ${getTemplatePreviewHTML(template, '🚪')}
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${destText}</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small" onclick="editDoorTemplate('${template.id}')">Edit</button>
                    ${index > 0 ? `<button class="btn btn-small btn-danger" onclick="deleteDoorTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddDoorTemplate() {
    editingTemplateId = null;
    document.getElementById('door-template-title').textContent = 'Add Door Type';
    document.getElementById('door-template-name').value = '';
    document.getElementById('door-template-sprite').value = '';
    document.getElementById('door-template-cols').value = '1';
    document.getElementById('door-template-rows').value = '1';
    document.getElementById('door-template-width').value = '32';
    document.getElementById('door-template-height').value = '48';
    document.getElementById('door-template-color').value = '#8b4513';
    document.getElementById('door-template-symbol').value = '🚪';
    document.getElementById('door-template-dest-type').value = 'level';
    document.getElementById('door-template-sound').value = '';

    updateDoorDestinationOptions();
    populateDoorLevelDropdown();
    document.getElementById('door-template-editor').classList.add('visible');
}

function editDoorTemplate(id) {
    const template = doorTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('door-template-title').textContent = 'Edit Door Type';
    document.getElementById('door-template-name').value = template.name;
    document.getElementById('door-template-sprite').value = template.sprite || '';
    document.getElementById('door-template-cols').value = template.spritesheetCols || template.frameCount || 1;
    document.getElementById('door-template-rows').value = template.spritesheetRows || 1;
    document.getElementById('door-template-width').value = template.width || 32;
    document.getElementById('door-template-height').value = template.height || 48;
    document.getElementById('door-template-color').value = template.color || '#8b4513';
    document.getElementById('door-template-symbol').value = template.symbol || '🚪';
    document.getElementById('door-template-dest-type').value = template.destinationType || 'level';
    document.getElementById('door-template-sound').value = template.interactSound || '';
    document.getElementById('door-template-particle').value = template.particleEffect || '';

    // Update sound effect button states
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('door-template-sound');
    }

    // Update particle effect button states
    if (typeof updateParticleButtonStates === 'function') {
        updateParticleButtonStates('door-template-particle');
    }

    updateDoorDestinationOptions();
    populateDoorLevelDropdown();

    // Set destination values after dropdown is populated
    setTimeout(() => {
        if (template.destinationType === 'level') {
            document.getElementById('door-template-dest-level').value = template.destinationLevelId || '';
        } else {
            document.getElementById('door-template-dest-x').value = template.destinationX || 0;
            document.getElementById('door-template-dest-y').value = template.destinationY || 0;
        }
    }, 0);

    document.getElementById('door-template-editor').classList.add('visible');
}

function updateDoorDestinationOptions() {
    const destType = document.getElementById('door-template-dest-type').value;
    const levelOptions = document.getElementById('door-level-options');
    const posOptions = document.getElementById('door-position-options');

    if (levelOptions) levelOptions.style.display = destType === 'level' ? 'block' : 'none';
    if (posOptions) posOptions.style.display = destType === 'position' ? 'block' : 'none';
}

function populateDoorLevelDropdown() {
    const dropdown = document.getElementById('door-template-dest-level');
    if (!dropdown) return;

    let html = '<option value="">-- Select Level --</option>';
    levels.forEach(lvl => {
        html += `<option value="${lvl.id}">${lvl.name}</option>`;
    });
    dropdown.innerHTML = html;
}

function saveDoorTemplate() {
    const name = document.getElementById('door-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const destType = document.getElementById('door-template-dest-type').value;

    const templateData = {
        name: name,
        sprite: document.getElementById('door-template-sprite').value.trim(),
        frameCount: parseInt(document.getElementById('door-template-cols').value) || 1,
        spritesheetCols: parseInt(document.getElementById('door-template-cols').value) || 1,
        spritesheetRows: parseInt(document.getElementById('door-template-rows').value) || 1,
        width: parseInt(document.getElementById('door-template-width').value) || 32,
        height: parseInt(document.getElementById('door-template-height').value) || 48,
        color: document.getElementById('door-template-color').value || '#8b4513',
        symbol: document.getElementById('door-template-symbol').value || '🚪',
        destinationType: destType,
        destinationLevelId: destType === 'level' ? document.getElementById('door-template-dest-level').value : null,
        destinationX: destType === 'position' ? parseInt(document.getElementById('door-template-dest-x').value) || 0 : null,
        destinationY: destType === 'position' ? parseInt(document.getElementById('door-template-dest-y').value) || 0 : null,
        interactSound: document.getElementById('door-template-sound').value.trim(),
        particleEffect: document.getElementById('door-template-particle').value.trim()
    };

    if (editingTemplateId) {
        const index = doorTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            doorTemplates[index] = templateData;
            showToast('Door type updated', 'success');
        }
        markDirty();
        closeDoorTemplateEditor();
        renderDoorTemplatesList();
        draw();
    } else {
        templateData.id = generateTemplateId('door', name);
        doorTemplates.push(templateData);
        markDirty();
        closeDoorTemplateEditor();
        renderDoorTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closeDoorTemplatesModal();
        selectObjectForPlacement('door', templateData.id);
    }
}

function closeDoorTemplateEditor() {
    document.getElementById('door-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

function deleteDoorTemplate(id) {
    if (id === 'door') {
        showToast('Cannot delete the default door', 'error');
        return;
    }

    const template = doorTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('door', id);

    let confirmMsg = `Delete door type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const index = doorTemplates.findIndex(t => t.id === id);
    if (index > 0) {
        doorTemplates.splice(index, 1);

        const removed = removeTemplateInstancesFromAllLevels('door', id);

        markDirty();
        renderDoorTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`Door type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('Door type deleted', 'success');
        }
    }
}

function selectDoorForPlacement() {
    selectedObjectType = 'door';
    selectedTemplateId = doorTemplates[0]?.id || 'door';

    // Clear tile selection when selecting an object (mutual exclusivity)
    clearTileSelection();

    updateObjectSelectionUI('door', getTemplate('door', selectedTemplateId));
    showToast('Selected: Door. Click on the level to place.', 'info');
}

// ============================================
// MYSTERY BLOCK TEMPLATE MANAGEMENT
// ============================================

function showMysteryBlockTemplatesModal() {
    const modal = document.getElementById('mystery-block-templates-modal');
    modal.classList.add('visible');
    renderMysteryBlockTemplatesList();
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        const template = mysteryBlockTemplates[0] || {};
        CodePreview.setContext('mysteryBlock', { template });
    }
}

function closeMysteryBlockTemplatesModal() {
    document.getElementById('mystery-block-templates-modal').classList.remove('visible');
}

function renderMysteryBlockTemplatesList() {
    const container = document.getElementById('mystery-block-templates-list');
    if (!container) return;

    let html = '';
    mysteryBlockTemplates.forEach((template, index) => {
        const emitLabel = `${template.emitCount}x ${template.emitType}`;
        const modeLabel = template.depletedBehavior === 'infinite' ? 'Infinite' :
                          template.depletedBehavior === 'disappear' ? 'Disappears' : 'Becomes Solid';

        html += `
            <div class="template-item" data-id="${template.id}">
                <div class="template-preview" style="${getTemplatePreviewBackground(template)}">
                    ${getTemplatePreviewHTML(template, '?')}
                </div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${emitLabel} | ${modeLabel}</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-small" onclick="editMysteryBlockTemplate('${template.id}')">Edit</button>
                    ${index > 0 ? `<button class="btn btn-small btn-danger" onclick="deleteMysteryBlockTemplate('${template.id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showAddMysteryBlockTemplate() {
    editingTemplateId = null;
    document.getElementById('mystery-block-template-title').textContent = 'Add Mystery Block Type';

    // Reset all fields to defaults
    document.getElementById('mystery-block-template-name').value = '';
    document.getElementById('mystery-block-template-sprite').value = '';
    document.getElementById('mystery-block-template-empty-sprite').value = '';
    document.getElementById('mystery-block-template-cols').value = '1';
    document.getElementById('mystery-block-template-rows').value = '1';
    document.getElementById('mystery-block-template-width').value = '32';
    document.getElementById('mystery-block-template-height').value = '32';
    document.getElementById('mystery-block-template-color').value = '#f1c40f';
    document.getElementById('mystery-block-template-empty-color').value = '#8B4513';
    document.getElementById('mystery-block-template-symbol').value = '?';

    // Populate and reset empty tile selector
    populateMysteryBlockEmptyTileSelector();
    document.getElementById('mystery-block-template-empty-tile-key').value = '';
    updateMysteryBlockEmptyTilePreview();

    // Emit settings
    document.getElementById('mystery-block-template-emit-type').value = 'collectible';
    populateMysteryBlockEmitTemplates();
    document.getElementById('mystery-block-template-emit-count').value = '1';
    document.getElementById('mystery-block-template-depleted-behavior').value = 'solid';

    // Physics settings
    document.getElementById('mystery-block-template-emit-mode').value = 'popup';
    document.getElementById('mystery-block-template-emit-direction').value = 'up';
    document.getElementById('mystery-block-template-emit-speed').value = '3';
    document.getElementById('mystery-block-template-emit-pop-height').value = '32';
    document.getElementById('mystery-block-template-emit-gravity').checked = true;

    // Collection settings
    document.getElementById('mystery-block-template-collect-mode').value = 'manual';
    document.getElementById('mystery-block-template-auto-collect-delay').value = '500';

    // Sounds
    document.getElementById('mystery-block-template-hit-sound').value = '';
    document.getElementById('mystery-block-template-empty-hit-sound').value = '';

    updateMysteryBlockEmitOptions();
    updateMysteryBlockCollectOptions();
    document.getElementById('mystery-block-template-editor').classList.add('visible');
}

function editMysteryBlockTemplate(id) {
    const template = mysteryBlockTemplates.find(t => t.id === id);
    if (!template) return;

    editingTemplateId = id;
    document.getElementById('mystery-block-template-title').textContent = 'Edit Mystery Block Type';

    // Populate all fields from template
    document.getElementById('mystery-block-template-name').value = template.name || '';
    document.getElementById('mystery-block-template-sprite').value = template.sprite || '';
    document.getElementById('mystery-block-template-empty-sprite').value = template.emptySprite || '';
    document.getElementById('mystery-block-template-cols').value = template.spritesheetCols || template.frameCount || 1;
    document.getElementById('mystery-block-template-rows').value = template.spritesheetRows || 1;
    document.getElementById('mystery-block-template-width').value = template.width || 32;
    document.getElementById('mystery-block-template-height').value = template.height || 32;
    document.getElementById('mystery-block-template-color').value = template.color || '#f1c40f';
    document.getElementById('mystery-block-template-empty-color').value = template.emptyColor || '#8B4513';
    document.getElementById('mystery-block-template-symbol').value = template.symbol || '?';

    // Populate empty tile selector and set value
    populateMysteryBlockEmptyTileSelector();
    document.getElementById('mystery-block-template-empty-tile-key').value = template.emptyTileKey || '';
    updateMysteryBlockEmptyTilePreview();

    // Emit settings
    document.getElementById('mystery-block-template-emit-type').value = template.emitType || 'collectible';
    populateMysteryBlockEmitTemplates();
    document.getElementById('mystery-block-template-emit-template').value = template.emitTemplateId || '';
    document.getElementById('mystery-block-template-emit-count').value = template.emitCount || 1;
    document.getElementById('mystery-block-template-depleted-behavior').value = template.depletedBehavior || 'solid';

    // Physics settings
    document.getElementById('mystery-block-template-emit-mode').value = template.emitMode || 'popup';
    document.getElementById('mystery-block-template-emit-direction').value = template.emitDirection || 'up';
    document.getElementById('mystery-block-template-emit-speed').value = template.emitSpeed || 3;
    document.getElementById('mystery-block-template-emit-pop-height').value = template.emitPopHeight || 32;
    document.getElementById('mystery-block-template-emit-gravity').checked = template.emitGravity !== false;

    // Collection settings
    document.getElementById('mystery-block-template-collect-mode').value = template.collectMode || 'manual';
    document.getElementById('mystery-block-template-auto-collect-delay').value = template.autoCollectDelay || 500;

    // Sounds
    document.getElementById('mystery-block-template-hit-sound').value = template.hitSound || '';
    document.getElementById('mystery-block-template-empty-hit-sound').value = template.emptyHitSound || '';

    // Particle effect
    document.getElementById('mystery-block-template-particle').value = template.particleEffect || '';

    // Update sound effect button states
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('mystery-block-template-hit-sound');
        updateSoundButtonStates('mystery-block-template-empty-hit-sound');
    }

    // Update particle effect button states
    if (typeof updateParticleButtonStates === 'function') {
        updateParticleButtonStates('mystery-block-template-particle');
    }

    updateMysteryBlockEmitOptions();
    updateMysteryBlockCollectOptions();
    document.getElementById('mystery-block-template-editor').classList.add('visible');
}

function saveMysteryBlockTemplate() {
    const name = document.getElementById('mystery-block-template-name').value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    const templateData = {
        name: name,
        sprite: document.getElementById('mystery-block-template-sprite').value.trim(),
        emptySprite: document.getElementById('mystery-block-template-empty-sprite').value.trim(),
        emptyTileKey: document.getElementById('mystery-block-template-empty-tile-key').value.trim(),
        frameCount: parseInt(document.getElementById('mystery-block-template-cols').value) || 1,
        spritesheetCols: parseInt(document.getElementById('mystery-block-template-cols').value) || 1,
        spritesheetRows: parseInt(document.getElementById('mystery-block-template-rows').value) || 1,
        animSpeed: 8,
        width: parseInt(document.getElementById('mystery-block-template-width').value) || 32,
        height: parseInt(document.getElementById('mystery-block-template-height').value) || 32,
        color: document.getElementById('mystery-block-template-color').value || '#f1c40f',
        emptyColor: document.getElementById('mystery-block-template-empty-color').value || '#8B4513',
        symbol: document.getElementById('mystery-block-template-symbol').value || '?',

        // Emit settings
        emitType: document.getElementById('mystery-block-template-emit-type').value,
        emitTemplateId: document.getElementById('mystery-block-template-emit-template').value,
        emitCount: parseInt(document.getElementById('mystery-block-template-emit-count').value) || 1,
        depletedBehavior: document.getElementById('mystery-block-template-depleted-behavior').value,

        // Physics
        emitMode: document.getElementById('mystery-block-template-emit-mode').value,
        emitDirection: document.getElementById('mystery-block-template-emit-direction').value,
        emitSpeed: parseFloat(document.getElementById('mystery-block-template-emit-speed').value) || 3,
        emitPopHeight: parseInt(document.getElementById('mystery-block-template-emit-pop-height').value) || 32,
        emitGravity: document.getElementById('mystery-block-template-emit-gravity').checked,

        // Collection
        collectMode: document.getElementById('mystery-block-template-collect-mode').value,
        autoCollectDelay: parseInt(document.getElementById('mystery-block-template-auto-collect-delay').value) || 500,

        // Sounds
        hitSound: document.getElementById('mystery-block-template-hit-sound').value.trim(),
        emptyHitSound: document.getElementById('mystery-block-template-empty-hit-sound').value.trim(),

        // Particle effect
        particleEffect: document.getElementById('mystery-block-template-particle').value.trim()
    };

    if (editingTemplateId) {
        const index = mysteryBlockTemplates.findIndex(t => t.id === editingTemplateId);
        if (index !== -1) {
            templateData.id = editingTemplateId;
            mysteryBlockTemplates[index] = templateData;
            showToast('Mystery Block type updated', 'success');
        }
        markDirty();
        closeMysteryBlockTemplateEditor();
        renderMysteryBlockTemplatesList();
        draw();
    } else {
        templateData.id = generateTemplateId('mysteryBlock', name);
        mysteryBlockTemplates.push(templateData);
        markDirty();
        closeMysteryBlockTemplateEditor();
        renderMysteryBlockTemplatesList();
        draw();
        // Auto-select the new template for immediate placement
        closeMysteryBlockTemplatesModal();
        selectObjectForPlacement('mysteryBlock', templateData.id);
    }
}

function closeMysteryBlockTemplateEditor() {
    document.getElementById('mystery-block-template-editor').classList.remove('visible');
    editingTemplateId = null;
}

function deleteMysteryBlockTemplate(id) {
    if (id === 'question_block') {
        showToast('Cannot delete the default mystery block', 'error');
        return;
    }

    const template = mysteryBlockTemplates.find(t => t.id === id);
    const instanceCount = countTemplateInstances('mysteryBlock', id);

    let confirmMsg = `Delete mystery block type "${template?.name}"?`;
    if (instanceCount > 0) {
        confirmMsg += `\n\n⚠️ This will also remove ${instanceCount} placed instance${instanceCount > 1 ? 's' : ''} from your game (across all levels).`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const index = mysteryBlockTemplates.findIndex(t => t.id === id);
    if (index > 0) {
        mysteryBlockTemplates.splice(index, 1);

        const removed = removeTemplateInstancesFromAllLevels('mysteryBlock', id);

        markDirty();
        renderMysteryBlockTemplatesList();
        updateObjectCount();
        draw();

        if (removed > 0) {
            showToast(`Mystery Block type deleted and ${removed} instance${removed > 1 ? 's' : ''} removed`, 'success');
        } else {
            showToast('Mystery Block type deleted', 'success');
        }
    }
}

// Populate empty tile selector for mystery blocks
function populateMysteryBlockEmptyTileSelector() {
    const select = document.getElementById('mystery-block-template-empty-tile-key');
    if (!select) return;

    // Keep the "None" option
    let html = '<option value="">-- None (use sprite URL or color) --</option>';

    // Add tiles from tileset
    if (typeof tiles === 'object') {
        const tileKeys = Object.keys(tiles).filter(k => k !== '.');
        if (tileKeys.length > 0) {
            html += '<optgroup label="Tileset Tiles">';
            tileKeys.forEach(key => {
                const tile = tiles[key];
                const name = tile.name || `Tile "${key}"`;
                html += `<option value="${key}">${name} (${key})</option>`;
            });
            html += '</optgroup>';
        }
    }

    // Add custom tiles
    if (typeof customTiles === 'object') {
        const customKeys = Object.keys(customTiles);
        if (customKeys.length > 0) {
            html += '<optgroup label="Custom Tiles">';
            customKeys.forEach((key, index) => {
                const ct = customTiles[key];
                const name = ct.name || `Custom Tile #${index + 1}`;
                html += `<option value="${key}">${name}</option>`;
            });
            html += '</optgroup>';
        }
    }

    select.innerHTML = html;
}

// Update empty tile preview for mystery block editor
function updateMysteryBlockEmptyTilePreview() {
    const preview = document.getElementById('mystery-block-empty-tile-preview');
    const tileKey = document.getElementById('mystery-block-template-empty-tile-key').value;

    if (!preview) return;

    if (!tileKey) {
        preview.innerHTML = '<span style="color:#888;font-size:11px;">Select a tile to preview what the block looks like when empty</span>';
        return;
    }

    // Check if it's a custom tile
    if (typeof customTiles === 'object' && customTiles[tileKey]) {
        const ct = customTiles[tileKey];
        if (ct.dataURL) {
            preview.innerHTML = `
                <img src="${ct.dataURL}" style="width:32px;height:32px;image-rendering:pixelated;border:1px solid #555;">
                <span style="color:#888;font-size:11px;margin-left:5px;">Custom tile "${tileKey}" - shown when block is empty</span>
            `;
        } else {
            preview.innerHTML = '<span style="color:#888;font-size:11px;">Custom tile (no preview available)</span>';
        }
        return;
    }

    // Check if it's a tileset tile
    if (typeof tiles === 'object' && tiles[tileKey] && tilesetImage) {
        const tile = tiles[tileKey];
        // Create a canvas to draw the tile preview
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        canvas.style.border = '1px solid #555';
        canvas.style.imageRendering = 'pixelated';
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        if (tilesetImage.complete && tilesetImage.naturalWidth > 0) {
            ctx.drawImage(tilesetImage, tile.x, tile.y, tileSize, tileSize, 0, 0, 32, 32);
        }

        const tileName = tile.name || `Tile "${tileKey}"`;
        preview.innerHTML = '';
        preview.appendChild(canvas);
        const label = document.createElement('span');
        label.style.cssText = 'color:#888;font-size:11px;margin-left:5px;';
        label.textContent = `${tileName} - shown when block is empty`;
        preview.appendChild(label);
        return;
    }

    preview.innerHTML = '<span style="color:#f00;font-size:11px;">Tile not found in tileset</span>';
}

// Populate the emit template dropdown based on emit type
function populateMysteryBlockEmitTemplates() {
    const emitType = document.getElementById('mystery-block-template-emit-type').value;
    const dropdown = document.getElementById('mystery-block-template-emit-template');

    let templates = [];
    if (emitType === 'collectible') {
        templates = collectibleTemplates;
    } else if (emitType === 'powerup') {
        templates = powerupTemplates;
    }

    let html = '';
    templates.forEach(t => {
        html += `<option value="${t.id}">${t.name}</option>`;
    });
    dropdown.innerHTML = html;
}

// Show/hide emit mode options based on selected mode
function updateMysteryBlockEmitOptions() {
    const emitMode = document.getElementById('mystery-block-template-emit-mode').value;
    const directionGroup = document.getElementById('mystery-block-direction-group');
    const speedGroup = document.getElementById('mystery-block-speed-group');
    const popHeightGroup = document.getElementById('mystery-block-pop-height-group');
    const gravityGroup = document.getElementById('mystery-block-gravity-group');

    if (emitMode === 'static') {
        directionGroup.style.display = 'none';
        speedGroup.style.display = 'none';
        popHeightGroup.style.display = 'none';
        gravityGroup.style.display = 'none';
    } else if (emitMode === 'popup') {
        directionGroup.style.display = 'none';
        speedGroup.style.display = 'none';
        popHeightGroup.style.display = 'block';
        gravityGroup.style.display = 'block';
    } else { // moving
        directionGroup.style.display = 'block';
        speedGroup.style.display = 'block';
        popHeightGroup.style.display = 'block';
        gravityGroup.style.display = 'block';
    }
}

// Show/hide auto-collect delay option based on collection mode
function updateMysteryBlockCollectOptions() {
    const collectMode = document.getElementById('mystery-block-template-collect-mode').value;
    const delayGroup = document.getElementById('mystery-block-auto-delay-group');
    delayGroup.style.display = (collectMode === 'auto_after_anim') ? 'block' : 'none';
}

function selectMysteryBlockForPlacement() {
    selectedObjectType = 'mysteryBlock';
    selectedTemplateId = mysteryBlockTemplates[0]?.id || 'question_block';

    // Clear tile selection when selecting an object (mutual exclusivity)
    clearTileSelection();

    updateObjectSelectionUI('mysteryBlock', getTemplate('mysteryBlock', selectedTemplateId));
    showToast('Selected: Mystery Block. Click on the level to place.', 'info');
}

// ============================================
// OBJECT PLACEMENT MODAL
// ============================================

function showObjectPlacementModal(type) {
    const modal = document.getElementById('object-placement-modal');
    const title = document.getElementById('object-placement-title');
    const container = document.getElementById('object-placement-list');

    const titles = {
        'enemy': 'Select Enemy Type',
        'collectible': 'Select Collectible',
        'hazard': 'Select Hazard',
        'powerup': 'Select Powerup',
        'spring': 'Select Spring Type',
        'movingPlatform': 'Select Moving Platform',
        'npc': 'Select NPC Type',
        'door': 'Select Door Type',
        'mysteryBlock': 'Select Mystery Block'
    };

    const addLabels = {
        'enemy': '+ Add Enemy',
        'collectible': '+ Add Collectible',
        'hazard': '+ Add Hazard',
        'powerup': '+ Add Powerup',
        'spring': '+ Add Spring',
        'movingPlatform': '+ Add Platform',
        'npc': '+ Add NPC',
        'door': '+ Add Door',
        'mysteryBlock': '+ Add Mystery Block'
    };

    const editFuncs = {
        'enemy': 'editEnemyTemplate',
        'collectible': 'editCollectibleTemplate',
        'hazard': 'editHazardTemplate',
        'powerup': 'editPowerupTemplate',
        'spring': 'editSpringTemplate',
        'movingPlatform': 'editMovingPlatformTemplate',
        'npc': 'editNPCTemplate',
        'door': 'editDoorTemplate',
        'mysteryBlock': 'editMysteryBlockTemplate'
    };

    const deleteFuncs = {
        'enemy': 'deleteEnemyTemplate',
        'collectible': 'deleteCollectibleTemplate',
        'hazard': 'deleteHazardTemplate',
        'powerup': 'deletePowerupTemplate',
        'spring': 'deleteSpringTemplate',
        'movingPlatform': 'deleteMovingPlatformTemplate',
        'npc': 'deleteNPCTemplate',
        'door': 'deleteDoorTemplate',
        'mysteryBlock': 'deleteMysteryBlockTemplate'
    };

    const addFuncs = {
        'enemy': 'showAddEnemyTemplate',
        'collectible': 'showAddCollectibleTemplate',
        'hazard': 'showAddHazardTemplate',
        'powerup': 'showAddPowerupTemplate',
        'spring': 'showAddSpringTemplate',
        'movingPlatform': 'showAddMovingPlatformTemplate',
        'npc': 'showAddNPCTemplate',
        'door': 'showAddDoorTemplate',
        'mysteryBlock': 'showAddMysteryBlockTemplate'
    };

    title.textContent = titles[type] || 'Select Object';

    const templates = getTemplates(type);
    let html = '';

    // Default symbols for each type (used as fallback)
    const defaultSymbols = {
        'enemy': '👾',
        'collectible': '🪙',
        'hazard': '▲',
        'powerup': '❤️',
        'spring': '🔼',
        'movingPlatform': '═',
        'npc': '👤',
        'door': '🚪',
        'mysteryBlock': '?'
    };

    templates.forEach((template, index) => {
        const isSelected = selectedObjectType === type && selectedTemplateId === template.id;
        const isDefault = index === 0; // First template is the default, can't delete

        // Get preview content and background using helper functions
        const previewContent = getTemplatePreviewHTML(template, defaultSymbols[type] || '?');
        const previewBackground = getTemplatePreviewBackground(template);

        html += `
            <div class="placement-item ${isSelected ? 'selected' : ''}">
                <div class="placement-clickable" onclick="selectObjectForPlacement('${type}', '${template.id}')">
                    <div class="placement-preview" style="${previewBackground}">
                        ${previewContent}
                    </div>
                    <div class="placement-name">${template.name}</div>
                </div>
                <div class="placement-actions">
                    <button class="placement-action-btn edit" onclick="event.stopPropagation(); closeObjectPlacementModal(); ${editFuncs[type]}('${template.id}')" title="Edit">✏️</button>
                    ${!isDefault ? `<button class="placement-action-btn delete" onclick="event.stopPropagation(); ${deleteFuncs[type]}('${template.id}'); showObjectPlacementModal('${type}');" title="Delete">🗑️</button>` : ''}
                </div>
            </div>
        `;
    });

    // Add "Add New" button
    html += `
        <div class="placement-item add-item" onclick="closeObjectPlacementModal(); ${addFuncs[type]}();">
            <div class="placement-preview" style="background: linear-gradient(135deg, #667eea, #764ba2);">+</div>
            <div class="placement-name">${addLabels[type]}</div>
        </div>
    `;

    container.innerHTML = html;
    modal.dataset.type = type;
    modal.classList.add('visible');
}

function closeObjectPlacementModal() {
    document.getElementById('object-placement-modal').classList.remove('visible');
}

function selectObjectForPlacement(type, templateId) {
    selectedObjectType = type;
    selectedTemplateId = templateId;

    // Clear tile selection when selecting an object (mutual exclusivity)
    clearTileSelection();

    // Update UI to show selected object
    const template = getTemplate(type, templateId);
    updateObjectSelectionUI(type, template);

    closeObjectPlacementModal();
    showToast(`Selected: ${template.name}. Click on the level to place.`, 'info');

    // Update code preview panel based on object type
    if (typeof CodePreview !== 'undefined') {
        const contextMap = {
            'enemy': 'enemy',
            'collectible': 'collectible',
            'hazard': 'hazard',
            'powerup': 'collectible',  // powerups use similar logic
            'spring': 'spring',
            'movingPlatform': 'movingPlatform',
            'mysteryBlock': 'mysteryBlock',
            'npc': 'enemy',  // NPCs have similar AI logic
            'door': 'checkpoint'  // doors are like checkpoints (destinations)
        };
        const context = contextMap[type] || 'idle';
        CodePreview.setContext(context, { template });
    }
}

function updateObjectSelectionUI(type, template) {
    // Update the object buttons to show which is selected
    document.querySelectorAll('.object-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    const btnId = {
        'enemy': 'btn-enemy',
        'collectible': 'btn-collectible',
        'hazard': 'btn-hazard',
        'powerup': 'btn-powerup',
        'goal': 'btn-goal'
    }[type];

    const btn = document.getElementById(btnId);
    if (btn) {
        btn.classList.add('selected');
    }
}

// Goal doesn't need templates - just one type
function selectGoalForPlacement() {
    selectedObjectType = 'goal';
    selectedTemplateId = null;

    // Clear tile selection when selecting an object (mutual exclusivity)
    clearTileSelection();

    updateObjectSelectionUI('goal', goalTemplate);
    showToast('Selected: Goal Flag. Click on the level to place.', 'info');
}

function selectCheckpointForPlacement() {
    selectedObjectType = 'checkpoint';
    selectedTemplateId = null;

    // Clear tile selection when selecting an object (mutual exclusivity)
    clearTileSelection();

    updateObjectSelectionUI('checkpoint', checkpointTemplate);
    showToast('Selected: Checkpoint. Click on the level to place.', 'info');
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        CodePreview.setContext('checkpoint', {});
    }
}

function clearObjectSelection() {
    selectedObjectType = null;
    selectedTemplateId = null;
    document.querySelectorAll('.object-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

// Clear tile selection when an object is selected (mutual exclusivity)
function clearTileSelection() {
    // Reset to eraser (no active tile for placement)
    selectedTileKey = '.';

    // Update visual selection in tile palette
    document.querySelectorAll('.tile-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.key === '.');
    });

    // Hide the selected tile info panel
    const infoPanel = document.getElementById('selected-tile-info');
    if (infoPanel) {
        infoPanel.classList.remove('visible');
    }
}

// ============================================
// GOAL TEMPLATE MANAGEMENT
// ============================================

function showGoalTemplateEditor() {
    document.getElementById('goal-template-sprite').value = goalTemplate.sprite || '';
    document.getElementById('goal-template-cols').value = goalTemplate.spritesheetCols || goalTemplate.frameCount || 1;
    document.getElementById('goal-template-rows').value = goalTemplate.spritesheetRows || 1;
    document.getElementById('goal-template-animspeed').value = goalTemplate.animSpeed || 8;
    document.getElementById('goal-template-width').value = goalTemplate.width || 32;
    document.getElementById('goal-template-height').value = goalTemplate.height || 32;
    document.getElementById('goal-template-symbol').value = goalTemplate.symbol || '⚑';
    document.getElementById('goal-template-color').value = goalTemplate.color || '#00ff00';
    document.getElementById('goal-template-reach-sound').value = goalTemplate.reachSound || '';

    // Populate goal particle effect
    const goalParticleEl = document.getElementById('goal-template-particle');
    if (goalParticleEl) {
        goalParticleEl.value = goalTemplate.particleEffect || '';
        // Update button states for pfx: values
        if (typeof updateParticleButtonStates === 'function') {
            updateParticleButtonStates('goal-template-particle');
        }
    }

    document.getElementById('goal-template-editor').classList.add('visible');
}

function closeGoalTemplateEditor() {
    document.getElementById('goal-template-editor').classList.remove('visible');
}

function saveGoalTemplate() {
    goalTemplate.sprite = document.getElementById('goal-template-sprite').value.trim();
    goalTemplate.frameCount = parseInt(document.getElementById('goal-template-cols').value) || 1;
    goalTemplate.spritesheetCols = parseInt(document.getElementById('goal-template-cols').value) || 1;
    goalTemplate.spritesheetRows = parseInt(document.getElementById('goal-template-rows').value) || 1;
    goalTemplate.animSpeed = parseInt(document.getElementById('goal-template-animspeed').value) || 8;
    goalTemplate.width = parseInt(document.getElementById('goal-template-width').value) || 32;
    goalTemplate.height = parseInt(document.getElementById('goal-template-height').value) || 32;
    goalTemplate.symbol = document.getElementById('goal-template-symbol').value || '⚑';
    goalTemplate.color = document.getElementById('goal-template-color').value || '#00ff00';
    goalTemplate.reachSound = document.getElementById('goal-template-reach-sound').value.trim();
    goalTemplate.particleEffect = document.getElementById('goal-template-particle')?.value.trim() || '';

    markDirty();
    closeGoalTemplateEditor();
    draw(); // Redraw to show updated goal appearance
    showToast('Goal settings saved', 'success');
}
