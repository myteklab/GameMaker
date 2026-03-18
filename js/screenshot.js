// ============================================
// SCREENSHOT GENERATION
// ============================================

// Generate a preview screenshot of the current editor viewport
function generateScreenshot() {
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

            // Redraw without grid
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

            // Restore grid
            if (gridCheckbox && gridWasChecked) {
                gridCheckbox.checked = true;
                draw();
            }

            return screenshotCanvas.toDataURL('image/png');
        }
    } catch (e) {
        // Canvas tainted by CORS images, fall back to manual rendering
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
            var bgScale = renderH / img.naturalHeight;
            var bgWidth = img.naturalWidth * bgScale;
            var parallaxX = viewLeft * (backgroundLayers[idx].speed || 0);
            var startBgX = offsetX - (parallaxX * scale) % bgWidth;
            for (var bx = startBgX; bx < offsetX + renderW; bx += bgWidth) {
                sctx.drawImage(img, bx, offsetY, bgWidth, renderH);
            }
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

    for (var y = Math.max(0, startRow); y < Math.min(level.length, endRow); y++) {
        var row = level[y];
        if (!row) continue;
        for (var x = Math.max(0, startCol); x < Math.min(row.length, endCol); x++) {
            var char = row[x];
            if (char === '.' || char === ' ') continue;

            var tile = tiles[char];
            var charCode = char.charCodeAt(0);
            var isCustom = (charCode >= 0xE000 && charCode <= 0xF8FF);

            if (!tile && !isCustom) continue;

            var screenX = offsetX + (x * tileSize - viewLeft) * scale;
            var screenY = offsetY + (y * tileSize - viewTop) * scale;

            if (isCustom) {
                var customImg = customTileImageCache[char];
                if (customImg && customImg.complete && customImg.naturalWidth > 0) {
                    sctx.drawImage(customImg, screenX, screenY, tileScreenSize, tileScreenSize);
                } else {
                    sctx.fillStyle = '#4a90d9';
                    sctx.fillRect(screenX, screenY, tileScreenSize, tileScreenSize);
                }
                continue;
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
    }

    // Draw game objects in view
    if (typeof gameObjects !== 'undefined') {
        for (var i = 0; i < gameObjects.length; i++) {
            var obj = gameObjects[i];
            var objX = obj.x * tileSize;
            var objY = obj.y * tileSize;

            // Skip objects outside view
            if (objX + tileSize < viewLeft || objX > viewLeft + viewWidth ||
                objY + tileSize < viewTop || objY > viewTop + viewHeight) continue;

            var sx = offsetX + (objX - viewLeft) * scale;
            var sy = offsetY + (objY - viewTop) * scale;
            var objSize = tileSize * scale;

            var colors = {
                enemy: '#e74c3c', collectible: '#f1c40f', hazard: '#7f8c8d',
                powerup: '#e91e63', goal: '#2ecc71', spring: '#9b59b6',
                checkpoint: '#3498db', npc: '#3498db', door: '#8b4513',
                movingPlatform: '#8B4513', mysteryBlock: '#f1c40f'
            };
            sctx.fillStyle = colors[obj.type] || '#888';
            sctx.globalAlpha = 0.8;
            sctx.fillRect(sx, sy, objSize, objSize);
            sctx.globalAlpha = 1;
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
