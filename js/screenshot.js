// ============================================
// SCREENSHOT GENERATION
// ============================================

// A card should show the game, not wherever the student happened to scroll.
// With a flat sky, a view holding nothing captures as one color and the
// server's blank guard refuses it (27 times on 2026-09-08, all fresh levels).
// If the current view has no tiles or objects, the snapshot is taken from the
// spawn point, or the first tiles, and the camera is put back afterwards.
function snapshotViewHasContent(left, top, width, height) {
    const c0 = Math.max(0, Math.floor(left / tileSize));
    const c1 = Math.ceil((left + width) / tileSize);
    const r0 = Math.max(0, Math.floor(top / tileSize));
    const r1 = Math.ceil((top + height) / tileSize);
    const layers = [level];
    if (typeof decorTiles !== 'undefined' && Array.isArray(decorTiles)) layers.push(decorTiles);
    for (const rows of layers) {
        for (let y = r0; y < Math.min(rows.length, r1); y++) {
            const row = rows[y];
            if (!row) continue;
            for (let x = c0; x < Math.min(row.length, c1); x++) {
                const ch = row[x];
                if (ch !== '.' && ch !== ' ') return true;
            }
        }
    }
    for (let i = 0; i < gameObjects.length; i++) {
        const o = gameObjects[i];
        if (o.x >= c0 && o.x < c1 && o.y >= r0 && o.y < r1) return true;
    }
    return false;
}

function snapshotFocusTarget() {
    const sp = typeof getSpawnPosition === 'function' ? getSpawnPosition() : spawnPoint;
    if (sp) return sp;
    for (let y = 0; y < level.length; y++) {
        const row = level[y];
        if (!row) continue;
        for (let x = 0; x < row.length; x++) {
            if (row[x] !== '.' && row[x] !== ' ') return { x: x, y: y };
        }
    }
    if (gameObjects.length) return { x: gameObjects[0].x, y: gameObjects[0].y };
    return null;
}

// Returns the camera to restore, or null when the view was fine as it was
function snapshotAimCamera() {
    if (!canvas || !canvas.width) return null;
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    if (snapshotViewHasContent(cameraX, cameraY, viewW, viewH)) return null;
    const target = snapshotFocusTarget();
    if (!target) return null;
    const saved = { x: cameraX, y: cameraY };
    cameraX = Math.max(0, target.x * tileSize - viewW / 2);
    cameraY = Math.max(0, target.y * tileSize - viewH / 2);
    if (typeof clampCamera === 'function') clampCamera();
    return saved;
}

function generateScreenshot() {
    const saved = snapshotAimCamera();
    try {
        return generateScreenshotFromView();
    } finally {
        if (saved) {
            cameraX = saved.x;
            cameraY = saved.y;
            if (typeof updateScrollbars === 'function') updateScrollbars();
            if (typeof draw === 'function') draw();
        }
    }
}

// Generate a preview screenshot of the current editor viewport
function generateScreenshotFromView() {
    const previewWidth = 800;
    const previewHeight = 500;

    // Create screenshot canvas
    const screenshotCanvas = document.createElement('canvas');
    const sctx = screenshotCanvas.getContext('2d');
    screenshotCanvas.width = previewWidth;
    screenshotCanvas.height = previewHeight;

    // Try to capture the editor canvas directly (best quality)
    try {
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            // Temporarily hide grid for clean screenshot
            var gridCheckbox = document.getElementById('show-grid');
            var gridWasChecked = gridCheckbox && gridCheckbox.checked;
            if (gridCheckbox) gridCheckbox.checked = false;

            // Suppress the editor's active-layer dimming so both layers
            // render at full opacity in the preview.
            window.__snapshotMode = true;
            // Force the decoration layer visible for the snapshot even if the
            // author has the editor's eye toggle hiding it.
            var prevDecorVisible = decorLayerVisible;
            decorLayerVisible = true;

            // Redraw without grid / without dim
            if (typeof draw === 'function') {
                draw();
            }
            // Scale the editor canvas to fit the screenshot
            var scaleX = previewWidth / canvas.width;
            var scaleY = previewHeight / canvas.height;
            var scale = Math.min(scaleX, scaleY);
            var drawW = canvas.width * scale;
            var drawH = canvas.height * scale;
            var drawX = (previewWidth - drawW) / 2;
            var drawY = (previewHeight - drawH) / 2;

            // Fill background
            sctx.fillStyle = '#1a1a2e';
            sctx.fillRect(0, 0, previewWidth, previewHeight);

            sctx.drawImage(canvas, drawX, drawY, drawW, drawH);

            // Restore snapshot-mode + decoration visibility + grid
            window.__snapshotMode = false;
            decorLayerVisible = prevDecorVisible;
            if (gridCheckbox && gridWasChecked) {
                gridCheckbox.checked = true;
            }
            draw();

            return screenshotCanvas.toDataURL('image/png');
        }
    } catch (e) {
        // Canvas tainted by CORS images, fall back to manual rendering.
        // Always clear the snapshot-mode flag and restore decor visibility.
        window.__snapshotMode = false;
        if (typeof prevDecorVisible !== 'undefined') decorLayerVisible = prevDecorVisible;
        // Restore grid if we toggled it
        if (typeof gridCheckbox !== 'undefined' && gridCheckbox && gridWasChecked) {
            gridCheckbox.checked = true;
            if (typeof draw === 'function') draw();
        }
    }

    // Fallback: render the visible portion manually (CORS-safe)
    var viewLeft = Math.floor(cameraX);
    var viewTop = Math.floor(cameraY);
    var viewWidth = Math.ceil(canvas.width / zoom);
    var viewHeight = Math.ceil(canvas.height / zoom);

    var scale = Math.min(previewWidth / viewWidth, previewHeight / viewHeight, 2);
    var renderW = viewWidth * scale;
    var renderH = viewHeight * scale;
    var offsetX = (previewWidth - renderW) / 2;
    var offsetY = (previewHeight - renderH) / 2;

    // Test CORS on tileset
    var canUseTileset = false;
    if (tilesetImage && tilesetImage.complete) {
        try {
            var testCanvas = document.createElement('canvas');
            testCanvas.width = 1;
            testCanvas.height = 1;
            var testCtx = testCanvas.getContext('2d');
            testCtx.drawImage(tilesetImage, 0, 0, 1, 1);
            testCtx.getImageData(0, 0, 1, 1);
            canUseTileset = true;
        } catch (e) {}
    }

    // Test CORS on background images
    var safeBackgroundIndices = [];
    for (var i = 0; i < backgroundLayers.length; i++) {
        var layer = backgroundLayers[i];
        var img = loadedBackgroundImages[i];
        if (!layer || !layer.src || layer.visible === false) continue;
        if (img && img.complete && img.naturalWidth > 0) {
            try {
                var testCanvas = document.createElement('canvas');
                testCanvas.width = 1;
                testCanvas.height = 1;
                var testCtx = testCanvas.getContext('2d');
                testCtx.drawImage(img, 0, 0, 1, 1);
                testCtx.getImageData(0, 0, 1, 1);
                safeBackgroundIndices.push(i);
            } catch (e) {}
        }
    }

    // Draw background color or default gradient
    var currentLevel = typeof getCurrentLevel === 'function' ? getCurrentLevel() : null;
    var bgColor = currentLevel && currentLevel.bgColor;
    if (bgColor) {
        sctx.fillStyle = bgColor;
        sctx.fillRect(0, 0, previewWidth, previewHeight);
    } else {
        var gradient = sctx.createLinearGradient(0, 0, 0, previewHeight);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#2d1b4e');
        sctx.fillStyle = gradient;
        sctx.fillRect(0, 0, previewWidth, previewHeight);
    }

    // Draw safe background layers
    sctx.save();
    sctx.beginPath();
    sctx.rect(offsetX, offsetY, renderW, renderH);
    sctx.clip();

    for (var i = 0; i < safeBackgroundIndices.length; i++) {
        var idx = safeBackgroundIndices[i];
        var img = loadedBackgroundImages[idx];
        if (img) {
            var bgLayer = backgroundLayers[idx];
            var src = bgLayerSource(bgLayer, img);
            var bgScale = renderH / (src.naturalHeight || src.height);
            var bgWidth = Math.ceil((src.naturalWidth || src.width) * bgScale);
            var parallaxX = viewLeft * (bgLayer.speed || 0);
            // a preview card is a still frame, so drift is left out
            sctx.globalAlpha = bgLayerAlpha(bgLayer);
            sctx.save();
            sctx.translate(offsetX, offsetY);
            drawTiledBgLayer(sctx, src, bgLayer, parallaxX * scale, 0, bgWidth, renderH, renderW);
            sctx.restore();
            sctx.globalAlpha = 1;
        }
    }
    sctx.restore();

    // Draw visible tiles
    sctx.imageSmoothingEnabled = false;
    var startCol = Math.floor(viewLeft / tileSize);
    var endCol = Math.ceil((viewLeft + viewWidth) / tileSize);
    var startRow = Math.floor(viewTop / tileSize);
    var endRow = Math.ceil((viewTop + viewHeight) / tileSize);
    var tileScreenSize = tileSize * scale;

    // Helper: draw one cell of a grid into sctx
    function drawGridCell(char, x, y) {
        if (char === '.' || char === ' ') return;
        var tile = tiles[char];
        var charCode = char.charCodeAt(0);
        var isCustom = (charCode >= 0xE000 && charCode <= 0xF8FF);
        if (!tile && !isCustom) return;
        var screenX = offsetX + (x * tileSize - viewLeft) * scale;
        var screenY = offsetY + (y * tileSize - viewTop) * scale;
        if (isCustom) {
            var customImg = customTileImageCache[char];
            if (customImg && customImg.complete && customImg.naturalWidth > 0) {
                sctx.imageSmoothingEnabled = !!(customTiles[char] && customTiles[char].detail);
                sctx.drawImage(customImg, screenX, screenY, tileScreenSize, tileScreenSize);
                sctx.imageSmoothingEnabled = false;
            } else {
                sctx.fillStyle = '#4a90d9';
                sctx.fillRect(screenX, screenY, tileScreenSize, tileScreenSize);
            }
            return;
        }
        if (canUseTileset && tilesetImage) {
            sctx.drawImage(
                tilesetImage,
                tile.x, tile.y, tileSize, tileSize,
                screenX, screenY, tileScreenSize, tileScreenSize
            );
        } else {
            sctx.fillStyle = tile.solid ? '#6B5B40' : '#4A6B40';
            sctx.fillRect(screenX, screenY, tileScreenSize, tileScreenSize);
        }
    }

    // Terrain layer
    for (var y = Math.max(0, startRow); y < Math.min(level.length, endRow); y++) {
        var row = level[y];
        if (!row) continue;
        for (var x = Math.max(0, startCol); x < Math.min(row.length, endCol); x++) {
            drawGridCell(row[x], x, y);
        }
    }

    // Decoration overlay (rendered above terrain, below objects — matches runtime)
    if (typeof decorLevel !== 'undefined' && Array.isArray(decorLevel)) {
        for (var dy = Math.max(0, startRow); dy < Math.min(decorLevel.length, endRow); dy++) {
            var drow = decorLevel[dy];
            if (!drow) continue;
            for (var dx = Math.max(0, startCol); dx < Math.min(drow.length, endCol); dx++) {
                drawGridCell(drow[dx], dx, dy);
            }
        }
    }

    // Draw game objects in view the way the editor does: the sprite's first frame,
    // else the template's tile, else a colored block with its symbol. This path only
    // runs because some image tainted the editor canvas, so each image gets the same
    // test as the tileset; an unsafe one would make toDataURL throw here as well.
    var cleanImages = new Map();
    function imageIsClean(img) {
        if (!img || !img.complete || !img.naturalWidth) return false;
        if (cleanImages.has(img)) return cleanImages.get(img);
        var ok = false;
        try {
            var t = document.createElement('canvas');
            t.width = 1;
            t.height = 1;
            var tctx = t.getContext('2d');
            tctx.drawImage(img, 0, 0, 1, 1);
            tctx.getImageData(0, 0, 1, 1);
            ok = true;
        } catch (e) {}
        cleanImages.set(img, ok);
        return ok;
    }
    if (typeof gameObjects !== 'undefined') {
        for (var i = 0; i < gameObjects.length; i++) {
            var obj = gameObjects[i];
            var template = typeof getTemplate === 'function' ? getTemplate(obj.type, obj.templateId) : null;
            // platforms keep their real size; everything else fits its cell, as in the editor
            var isPlatform = obj.type === 'movingPlatform';
            var ow = isPlatform ? ((template && template.width) || tileSize) : tileSize;
            var oh = isPlatform ? ((template && template.height) || tileSize) : tileSize;
            var objX = obj.x * tileSize + (tileSize - ow) / 2;
            var objY = obj.y * tileSize + (tileSize - oh) / 2;

            // Skip objects outside view
            if (objX + ow < viewLeft || objX > viewLeft + viewWidth ||
                objY + oh < viewTop || objY > viewTop + viewHeight) continue;

            var sx = offsetX + (objX - viewLeft) * scale;
            var sy = offsetY + (objY - viewTop) * scale;
            var sw = ow * scale;
            var sh = oh * scale;

            sctx.save();
            if (isPlatform && template && template.cornerRadius && typeof platformCornerPath === 'function') {
                platformCornerPath(sctx, sx, sy, sw, sh, template.cornerRadius * scale);
            }
            sctx.imageSmoothingEnabled = false;
            var drawn = false;
            var sprite = template && template.sprite ? objectSpriteCache[template.sprite] : null;
            if (sprite && sprite.loaded && imageIsClean(sprite.img)) {
                var cols = template.spritesheetCols || template.frameCount || 1;
                var rows = template.spritesheetRows || 1;
                sctx.drawImage(sprite.img, 0, 0, sprite.img.naturalWidth / cols, sprite.img.naturalHeight / rows, sx, sy, sw, sh);
                drawn = true;
            } else if (template && template.tileKey) {
                var customTile = objectSpriteCache['custom_' + template.tileKey] || null;
                if (customTile && customTile.loaded && imageIsClean(customTile.img)) {
                    sctx.drawImage(customTile.img, sx, sy, sw, sh);
                    drawn = true;
                } else if (canUseTileset && tiles[template.tileKey]) {
                    var tt = tiles[template.tileKey];
                    sctx.drawImage(tilesetImage, tt.x, tt.y, tileSize, tileSize, sx, sy, sw, sh);
                    drawn = true;
                }
            }
            if (!drawn) {
                sctx.fillStyle = typeof getObjectColor === 'function' ? getObjectColor(obj.type, obj.templateId) : '#888';
                sctx.globalAlpha = 0.9;
                sctx.fillRect(sx, sy, sw, sh);
                sctx.globalAlpha = 1;
                var symbol = typeof getObjectSymbol === 'function' ? getObjectSymbol(obj.type, obj.templateId) : '';
                if (symbol) {
                    sctx.fillStyle = '#ffffff';
                    sctx.font = Math.max(8, Math.min(sw, sh) * 0.6) + "px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
                    sctx.textAlign = 'center';
                    sctx.textBaseline = 'middle';
                    sctx.fillText(symbol, sx + sw / 2, sy + sh / 2);
                }
            }
            sctx.restore();
        }
    }

    try {
        return screenshotCanvas.toDataURL('image/png');
    } catch (e) {
        return null;
    }
}

// Save screenshot silently (called after save)
// In standalone mode this is a no-op. Platform adapter overrides this.
async function saveScreenshotSilent() {
    // No-op in standalone mode
}
