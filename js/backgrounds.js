// ============================================
// BACKGROUND LAYERS
// ============================================

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
                ${hasImage ? `<img src="${layer.src}" style="width: 100%; height: 100%; object-fit: cover;" onerror="bgPreviewFailed(this)">` : '<span style="font-size: 10px; color: var(--text-3);">No img</span>'}
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; gap: 4px;">
                    <input type="text" id="bg-layer-url-${index}" value="${layer.src || ''}" placeholder="Image URL..."
                        style="flex: 1; min-width: 0; font-size: 11px;"
                        onchange="updateBgLayer(${index}, this.value); updateBgPreview(${index}, this.value);"
                        onblur="loadBackgroundImages()"
                        oninput="updateBgPreview(${index}, this.value);">
                    <button type="button" class="browse-library-btn" onclick="browseBgLayerImage(${index})" style="padding: 4px 8px; font-size: 11px;">Browse</button>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 10px; color: var(--text-3);">Speed:</span>
                    <input type="number" value="${layer.speed}" step="0.1" min="0" max="1" title="Parallax speed"
                        style="width: 60px; font-size: 11px;"
                        onchange="updateBgLayerSpeed(${index}, this.value)">
                    <span style="font-size: 10px; color: var(--text-3); margin-left: 6px;">Opacity:</span>
                    <input type="range" min="0" max="100" step="5" value="${Math.round(bgLayerAlpha(layer) * 100)}" title="Layer opacity"
                        style="width: 70px; accent-color: var(--accent);"
                        oninput="updateBgLayerOpacity(${index}, this.value)">
                    <span id="bg-opacity-${index}" style="font-size: 10px; color: var(--text-2); min-width: 30px;">${Math.round(bgLayerAlpha(layer) * 100)}%</span>
                    <button class="visibility-btn" onclick="toggleBgLayerVisibility(${index})" title="${layer.visible ? 'Hide layer' : 'Show layer'}"
                        style="opacity:${layer.visible ? '1' : '0.4'}; background: none; border: none; cursor: pointer; font-size: 14px;"><svg class="gm-icon"><use href="#icon-${layer.visible ? 'eye' : 'eye-off'}"/></svg></button>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 10px; color: var(--text-3);">Drift:</span>
                    <input type="number" value="${bgLayerDrift(layer)}" step="5" min="-200" max="200"
                        title="Pixels per second the layer moves on its own, like clouds (negative moves left)"
                        style="width: 60px; font-size: 11px;"
                        onchange="updateBgLayerDrift(${index}, this.value)">
                    <span style="font-size: 10px; color: var(--text-3);">px/s</span>
                    <span style="font-size: 10px; color: var(--text-3); margin-left: 6px;">Edges:</span>
                    <select title="How repeated copies of the image meet" style="font-size: 11px; padding: 2px 6px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: var(--text);"
                        onchange="updateBgLayerSeam(${index}, this.value)">
                        <option value="repeat"${bgLayerSeam(layer) === 'repeat' ? ' selected' : ''}>Repeat</option>
                        <option value="mirror"${bgLayerSeam(layer) === 'mirror' ? ' selected' : ''}>Mirror</option>
                        <option value="blend"${bgLayerSeam(layer) === 'blend' ? ' selected' : ''}>Blend</option>
                    </select>
                </div>
            </div>
            <button onclick="removeBgLayer(${index})" title="Remove layer" style="background: rgba(231,76,60,0.3); border: none; color: var(--danger); width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 14px;">×</button>
        `;
        list.appendChild(div);
    });
}

// The thumbnail's failure mark used to be inlined in the onerror attribute,
// and the SVG icon's double quotes closed the attribute early, leaking '">
// as text beside every layer image. A named handler has no quoting to break.
function bgPreviewFailed(img) {
    const box = img && img.parentElement;
    if (box) box.innerHTML = '<span style="font-size: 10px; color: var(--danger);"><svg class="gm-icon"><use href="#icon-x-mark"/></svg></span>';
}

// Update background layer preview thumbnail
function updateBgPreview(index, url) {
    const preview = document.getElementById('bg-preview-' + index);
    if (!preview) return;

    url = url.trim();
    if (!url) {
        preview.innerHTML = '<span style="font-size: 10px; color: var(--text-3);">No img</span>';
        return;
    }

    // Show loading state
    preview.innerHTML = '<span style="font-size: 10px; color: var(--text-3);">...</span>';

    // Create test image
    const img = new Image();
    img.onload = function() {
        preview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    };
    img.onerror = function() {
        preview.innerHTML = '<span style="font-size: 10px; color: var(--danger);"><svg class="gm-icon"><use href="#icon-x-mark"/></svg></span>';
    };
    img.src = url;
}

// Pick a layer image from the Asset Library or My Files. The picker hands
// back a permanent URL (a private file is made link-viewable on the way),
// so the layer is set, the row redrawn, and the canvas reloaded here rather
// than waiting for the URL field's blur like typed input does.
function browseBgLayerImage(index) {
    if (typeof openAssetPickerWithCallback !== 'function') {
        showToast('Asset Library is not available', 'error');
        return;
    }
    openAssetPickerWithCallback(function(url) {
        const layers = getEditingBgLayers();
        if (!url || !layers[index]) return;
        updateBgLayer(index, url);
        renderBackgroundLayers();
        if (typeof editingLevelIndex === 'undefined' || editingLevelIndex < 0 || editingLevelIndex === currentLevelIndex) {
            loadBackgroundImages();
        }
    }, 'tiles-backgrounds');
}

// 0..1. Layers saved before opacity existed have none and draw fully opaque.
function bgLayerAlpha(layer) {
    const a = parseFloat(layer && layer.opacity);
    return isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
}

function updateBgLayerOpacity(index, percent) {
    const layers = getEditingBgLayers();
    if (!layers[index]) return;
    const a = Math.max(0, Math.min(100, parseInt(percent, 10) || 0)) / 100;
    layers[index].opacity = a;
    const label = document.getElementById('bg-opacity-' + index);
    if (label) label.textContent = Math.round(a * 100) + '%';
    markDirty();
    if (typeof editingLevelIndex === 'undefined' || editingLevelIndex < 0 || editingLevelIndex === currentLevelIndex) {
        draw();
    }
}

// Pixels per second the layer slides on its own, whatever the camera does:
// a sky of clouds that keeps moving while the player stands still.
function bgLayerDrift(layer) {
    const d = parseFloat(layer && layer.drift);
    return isNaN(d) ? 0 : Math.max(-200, Math.min(200, d));
}

// How repeated copies of the image meet. 'mirror' flips every other copy so
// neighbouring edges are always identical; 'blend' fades the image's right
// edge into its left once, so a texture that differs at its sides has no line.
function bgLayerSeam(layer) {
    const s = layer && layer.seam;
    return s === 'mirror' || s === 'blend' ? s : 'repeat';
}

function bgLayerSource(layer, img) {
    return bgLayerSeam(layer) === 'blend' ? blendedSeamCanvas(img) : img;
}

// The last 15% of the image is faded over its first 15% and then dropped, so
// the tile's right edge continues straight into its own left edge. Built once
// per image. No pixel reads, so it works for images from any host.
function blendedSeamCanvas(img) {
    if (img.__seamBlend) return img.__seamBlend;
    const w = img.naturalWidth, h = img.naturalHeight;
    const o = Math.max(1, Math.round(w * 0.15));
    const c = document.createElement('canvas');
    c.width = w - o;
    c.height = h;
    const q = c.getContext('2d');
    q.drawImage(img, 0, 0, w - o, h, 0, 0, w - o, h);
    const tail = document.createElement('canvas');
    tail.width = o;
    tail.height = h;
    const tq = tail.getContext('2d');
    tq.drawImage(img, w - o, 0, o, h, 0, 0, o, h);
    tq.globalCompositeOperation = 'destination-in';
    const fade = tq.createLinearGradient(0, 0, o, 0);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    tq.fillStyle = fade;
    tq.fillRect(0, 0, o, h);
    q.drawImage(tail, 0, 0);
    img.__seamBlend = c;
    return c;
}

// Repeats src across [0, viewW) with offsetX screen pixels already scrolled.
// Copy numbers stay attached to the world as it scrolls, so a mirrored copy
// never flips back and forth.
function drawTiledBgLayer(c, src, layer, offsetX, y, w, h, viewW) {
    const mirror = bgLayerSeam(layer) === 'mirror';
    let x = -(((offsetX % w) + w) % w);
    let copy = Math.floor(offsetX / w);
    for (; x < viewW; x += w, copy++) {
        const dx = Math.round(x);
        if (mirror && (copy & 1)) {
            c.save();
            c.translate(dx + w, y);
            c.scale(-1, 1);
            c.drawImage(src, 0, 0, w + 1, h);
            c.restore();
        } else {
            c.drawImage(src, dx, y, w + 1, h);
        }
    }
}

// Screen pixels a drifting layer has moved so far, at editor zoom. Drift is in
// game pixels, so it is scaled the same way the camera offset is. Positive
// drift moves the picture right.
function bgDriftOffset(layer) {
    const d = bgLayerDrift(layer);
    if (!d) return 0;
    const renderScale = (typeof gameSettings !== 'undefined' && gameSettings.tileRenderScale) || 1;
    return -(performance.now() / 1000) * d * zoom / renderScale;
}

function updateBgLayerDrift(index, value) {
    const layers = getEditingBgLayers();
    if (!layers[index]) return;
    layers[index].drift = bgLayerDrift({ drift: value });
    markDirty();
    ensureBgDriftLoop();
    draw();
}

function updateBgLayerSeam(index, value) {
    const layers = getEditingBgLayers();
    if (!layers[index]) return;
    layers[index].seam = bgLayerSeam({ seam: value });
    markDirty();
    if (typeof editingLevelIndex === 'undefined' || editingLevelIndex < 0 || editingLevelIndex === currentLevelIndex) {
        draw();
    }
}

// The editor only redraws on input, so a drifting layer needs its own clock.
// It runs while the current level has a visible drifting layer, at about
// 24fps, skips frames while the tab is hidden or backgrounds are switched
// off, and ends itself when nothing drifts.
let bgDriftRAF = null;
let bgDriftLastDraw = 0;
function ensureBgDriftLoop() {
    if (bgDriftRAF) return;
    const tick = (now) => {
        const drifting = (backgroundLayers || []).some(l => l && l.visible !== false && bgLayerDrift(l) !== 0);
        if (!drifting) {
            bgDriftRAF = null;
            return;
        }
        bgDriftRAF = requestAnimationFrame(tick);
        if (now - bgDriftLastDraw < 42) return;
        const showBg = document.getElementById('show-bg');
        if (document.hidden || (showBg && !showBg.checked)) return;
        bgDriftLastDraw = now;
        draw();
    };
    bgDriftRAF = requestAnimationFrame(tick);
}

function addBackgroundLayer() {
    const layers = getEditingBgLayers();
    layers.push({ src: '', speed: 0.5, visible: true, opacity: 1, drift: 0, seam: 'repeat' });
    markDirty();
    renderBackgroundLayers();
}

function toggleBgLayerVisibility(index) {
    const layers = getEditingBgLayers();
    layers[index].visible = !layers[index].visible;
    markDirty();
    renderBackgroundLayers();
    ensureBgDriftLoop();
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
// Each call starts a new generation. Without it a slow image from an earlier
// call (the project's old layer, or the URL before a Browse pick) could finish
// last and replace the layer the student just set.
let bgImageLoadSeq = 0;
function loadBackgroundImages() {
    const seq = ++bgImageLoadSeq;
    loadedBackgroundImages = [];

    backgroundLayers.forEach((layer, index) => {
        if (layer.src && layer.src.trim() !== '') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                if (seq !== bgImageLoadSeq) return;
                loadedBackgroundImages[index] = img;
                draw();
            };
            img.onerror = function() {
                if (seq !== bgImageLoadSeq) return;
                console.warn(`Failed to load background layer ${index}: ${layer.src}`);
                loadedBackgroundImages[index] = null;
            };
            img.src = layer.src;
        } else {
            loadedBackgroundImages[index] = null;
        }
    });
    ensureBgDriftLoop();
}
