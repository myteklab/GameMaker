// ============================================
// BACKGROUND LAYERS
// ============================================
// Extracted from index.php lines 4283-4362

// Helper to get the background layers array for the level being edited
function getEditingBgLayers() {
    // If Level Settings modal is open and editing a specific level
    if (typeof editingLevelIndex !== 'undefined' && editingLevelIndex >= 0 && levels[editingLevelIndex]) {
        return levels[editingLevelIndex].backgroundLayers;
    }
    // Otherwise use the current level's global backgroundLayers
    return backgroundLayers;
}

// Helper to set background layers for the level being edited
function setEditingBgLayers(newLayers) {
    if (typeof editingLevelIndex !== 'undefined' && editingLevelIndex >= 0 && levels[editingLevelIndex]) {
        levels[editingLevelIndex].backgroundLayers = newLayers;
        // If editing current level, also update global
        if (editingLevelIndex === currentLevelIndex) {
            backgroundLayers = newLayers;
        }
    } else {
        backgroundLayers = newLayers;
        // Also update current level
        const lvl = getCurrentLevel();
        if (lvl) lvl.backgroundLayers = newLayers;
    }
}

function renderBackgroundLayers() {
    const list = document.getElementById('bg-layers-list');
    if (!list) return;
    list.innerHTML = '';

    const layers = getEditingBgLayers();

    layers.forEach((layer, index) => {
        // Ensure visible property exists (default to true for legacy data)
        if (layer.visible === undefined) layer.visible = true;

        const div = document.createElement('div');
        div.className = 'bg-layer-item';
        div.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;';

        // Create preview thumbnail
        const previewId = 'bg-preview-' + index;
        const hasImage = layer.src && layer.src.trim() !== '';

        div.innerHTML = `
            <div class="bg-layer-preview" id="${previewId}" style="width: 50px; height: 35px; min-width: 50px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1);">
                ${hasImage ? `<img src="${layer.src}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<span style=\\'font-size:10px;color:#666;\\'>❌</span>'">` : '<span style="font-size: 10px; color: #555;">No img</span>'}
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <input type="text" value="${layer.src || ''}" placeholder="Image URL..."
                    style="width: 100%; font-size: 11px;"
                    onchange="updateBgLayer(${index}, this.value); updateBgPreview(${index}, this.value);"
                    onblur="loadBackgroundImages()"
                    oninput="updateBgPreview(${index}, this.value);">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 10px; color: #888;">Speed:</span>
                    <input type="number" value="${layer.speed}" step="0.1" min="0" max="1" title="Parallax speed"
                        style="width: 60px; font-size: 11px;"
                        onchange="updateBgLayerSpeed(${index}, this.value)">
                    <button class="visibility-btn" onclick="toggleBgLayerVisibility(${index})" title="${layer.visible ? 'Hide layer' : 'Show layer'}"
                        style="opacity:${layer.visible ? '1' : '0.4'}; background: none; border: none; cursor: pointer; font-size: 14px;">${layer.visible ? '👁' : '👁‍🗨'}</button>
                </div>
            </div>
            <button onclick="removeBgLayer(${index})" title="Remove layer" style="background: rgba(231,76,60,0.3); border: none; color: #e74c3c; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 14px;">×</button>
        `;
        list.appendChild(div);
    });
}

// Update background layer preview thumbnail
function updateBgPreview(index, url) {
    const preview = document.getElementById('bg-preview-' + index);
    if (!preview) return;

    url = url.trim();
    if (!url) {
        preview.innerHTML = '<span style="font-size: 10px; color: #555;">No img</span>';
        return;
    }

    // Show loading state
    preview.innerHTML = '<span style="font-size: 10px; color: #888;">...</span>';

    // Create test image
    const img = new Image();
    img.onload = function() {
        preview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    };
    img.onerror = function() {
        preview.innerHTML = '<span style="font-size: 10px; color: #e74c3c;">❌</span>';
    };
    img.src = url;
}

function addBackgroundLayer() {
    const layers = getEditingBgLayers();
    layers.push({ src: '', speed: 0.5, visible: true });
    markDirty();
    renderBackgroundLayers();
}

function toggleBgLayerVisibility(index) {
    const layers = getEditingBgLayers();
    layers[index].visible = !layers[index].visible;
    markDirty();
    renderBackgroundLayers();
    // Only redraw if editing current level
    if (typeof editingLevelIndex === 'undefined' || editingLevelIndex < 0 || editingLevelIndex === currentLevelIndex) {
        draw();
    }
}

function updateBgLayer(index, src) {
    const layers = getEditingBgLayers();
    layers[index].src = src;
    markDirty();
    // Clear cached image so it reloads (only if editing current level)
    if (typeof editingLevelIndex === 'undefined' || editingLevelIndex < 0 || editingLevelIndex === currentLevelIndex) {
        loadedBackgroundImages[index] = null;
    }
}

function updateBgLayerSpeed(index, speed) {
    const layers = getEditingBgLayers();
    layers[index].speed = parseFloat(speed);
    markDirty();
    // Only redraw if editing current level
    if (typeof editingLevelIndex === 'undefined' || editingLevelIndex < 0 || editingLevelIndex === currentLevelIndex) {
        draw();
    }
}

function removeBgLayer(index) {
    const layers = getEditingBgLayers();
    layers.splice(index, 1);
    // Only modify cached images if editing current level
    if (typeof editingLevelIndex === 'undefined' || editingLevelIndex < 0 || editingLevelIndex === currentLevelIndex) {
        loadedBackgroundImages.splice(index, 1);
        draw();
    }
    markDirty();
    renderBackgroundLayers();
}

// Load all background images from URLs
function loadBackgroundImages() {
    loadedBackgroundImages = [];

    backgroundLayers.forEach((layer, index) => {
        if (layer.src && layer.src.trim() !== '') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                loadedBackgroundImages[index] = img;
                draw();
            };
            img.onerror = function() {
                console.warn(`Failed to load background layer ${index}: ${layer.src}`);
                loadedBackgroundImages[index] = null;
            };
            img.src = layer.src;
        } else {
            loadedBackgroundImages[index] = null;
        }
    });
}
