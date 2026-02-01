// ============================================
// SCREENSHOT GENERATION
// ============================================

// Generate a preview screenshot of the level
function generateScreenshot() {
    const previewWidth = 600;
    const previewHeight = 400;

    // Calculate scale to fit the level
    const levelPixelWidth = levelWidth * tileSize;
    const levelPixelHeight = levelHeight * tileSize;
    const scaleX = previewWidth / levelPixelWidth;
    const scaleY = previewHeight / levelPixelHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    // Calculate offset to center
    const offsetX = (previewWidth - levelPixelWidth * scale) / 2;
    const offsetY = (previewHeight - levelPixelHeight * scale) / 2;

    // Test CORS on separate canvases BEFORE drawing to main canvas
    let canUseTileset = false;
    let safeBackgroundIndices = [];

    // Test each background image for CORS
    for (let i = 0; i < backgroundLayers.length; i++) {
        const layer = backgroundLayers[i];
        const img = loadedBackgroundImages[i];

        if (!layer || !layer.src) continue;
        if (layer.visible === false) continue;

        if (img && img.complete && img.naturalWidth > 0) {
            try {
                const testCanvas = document.createElement('canvas');
                testCanvas.width = 1;
                testCanvas.height = 1;
                const testCtx = testCanvas.getContext('2d');
                testCtx.drawImage(img, 0, 0, 1, 1);
                testCtx.getImageData(0, 0, 1, 1);
                safeBackgroundIndices.push(i);
            } catch (e) {
                // CORS blocked - skip this layer
            }
        }
    }

    // Test tileset image for CORS
    if (tilesetImage && tilesetImage.complete) {
        try {
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 1;
            testCanvas.height = 1;
            const testCtx = testCanvas.getContext('2d');
            testCtx.drawImage(tilesetImage, 0, 0, 1, 1);
            testCtx.getImageData(0, 0, 1, 1);
            canUseTileset = true;
        } catch (e) {
            // CORS blocked - will use fallback colors
        }
    }

    // Now create the actual screenshot canvas (guaranteed not tainted)
    const screenshotCanvas = document.createElement('canvas');
    const sctx = screenshotCanvas.getContext('2d');
    screenshotCanvas.width = previewWidth;
    screenshotCanvas.height = previewHeight;

    // Calculate the actual level area dimensions
    const levelAreaWidth = levelPixelWidth * scale;
    const levelAreaHeight = levelPixelHeight * scale;

    // Draw gradient background for full canvas
    const gradient = sctx.createLinearGradient(0, 0, 0, previewHeight);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#2d1b4e');
    sctx.fillStyle = gradient;
    sctx.fillRect(0, 0, previewWidth, previewHeight);

    // Draw ALL safe background layers - clipped to level area
    sctx.save();
    sctx.beginPath();
    sctx.rect(offsetX, offsetY, levelAreaWidth, levelAreaHeight);
    sctx.clip();

    for (let i = 0; i < safeBackgroundIndices.length; i++) {
        const idx = safeBackgroundIndices[i];
        const img = loadedBackgroundImages[idx];
        if (img) {
            // Scale background to match level height, not preview height
            const bgScale = levelAreaHeight / img.naturalHeight;
            const bgWidth = img.naturalWidth * bgScale;
            const bgHeight = levelAreaHeight;
            for (let x = offsetX; x < offsetX + levelAreaWidth; x += bgWidth) {
                sctx.drawImage(img, x, offsetY, bgWidth, bgHeight);
            }
        }
    }

    sctx.restore(); // Remove clipping

    // Draw tiles
    sctx.imageSmoothingEnabled = false;

    for (let y = 0; y < level.length; y++) {
        const row = level[y];
        if (!row) continue;

        for (let x = 0; x < row.length; x++) {
            const char = row[x];
            if (char === '.' || char === ' ') continue;

            // Check regular tiles first, then custom tiles
            const tile = tiles[char];
            const charCode = char.charCodeAt(0);
            const isCustom = (charCode >= 0xE000 && charCode <= 0xF8FF);

            if (!tile && !isCustom) {
                // Only log once per unique character to avoid console spam
                if (!window._screenshotUnknownChars) window._screenshotUnknownChars = new Set();
                if (!window._screenshotUnknownChars.has(char)) {
                    window._screenshotUnknownChars.add(char);
                    console.warn('[SCREENSHOT] Unknown tile char:', char, '(code:', charCode, ')');
                }
                continue;
            }

            const screenX = offsetX + x * tileSize * scale;
            const screenY = offsetY + y * tileSize * scale;
            const tileScreenSize = tileSize * scale;

            // Draw custom tiles from cached images (data URLs, no CORS issues)
            if (isCustom) {
                const customImg = customTileImageCache[char];
                if (customImg && customImg.complete && customImg.naturalWidth > 0) {
                    sctx.drawImage(customImg, screenX, screenY, tileScreenSize, tileScreenSize);
                } else {
                    // Fallback: colored square for custom tiles without cached images
                    sctx.fillStyle = '#4a90d9';
                    sctx.fillRect(screenX, screenY, tileScreenSize, tileScreenSize);
                }
                continue;
            }

            if (canUseTileset && tilesetImage) {
                // Draw actual tileset tile
                sctx.drawImage(
                    tilesetImage,
                    tile.x, tile.y, tileSize, tileSize,
                    screenX, screenY, tileScreenSize, tileScreenSize
                );
            } else {
                // Fallback: earthy/natural colored squares
                const earthyColors = [
                    { fill: '#8B4513', stroke: '#5D2E0C' },
                    { fill: '#A0522D', stroke: '#6B3720' },
                    { fill: '#CD853F', stroke: '#8B5A2B' },
                    { fill: '#6B8E23', stroke: '#4A6317' },
                    { fill: '#556B2F', stroke: '#3A4A20' },
                    { fill: '#708090', stroke: '#4A5568' },
                    { fill: '#696969', stroke: '#4A4A4A' },
                    { fill: '#2F4F4F', stroke: '#1A2F2F' },
                    { fill: '#B8860B', stroke: '#7D5A07' },
                    { fill: '#D2691E', stroke: '#8B4513' },
                ];
                const colorIdx = charCode % earthyColors.length;
                const colors = earthyColors[colorIdx];

                sctx.fillStyle = colors.fill;
                sctx.fillRect(screenX, screenY, tileScreenSize, tileScreenSize);

                if (tile.solid) {
                    sctx.strokeStyle = colors.stroke;
                    sctx.lineWidth = Math.max(1, scale);
                    sctx.strokeRect(screenX, screenY, tileScreenSize, tileScreenSize);
                }
            }
        }
    }

    try {
        return screenshotCanvas.toDataURL('image/png');
    } catch (e) {
        console.error('[SCREENSHOT] toDataURL failed:', e.message);
        return null;
    }
}

// Save screenshot silently (called after save)
// In standalone mode this is a no-op. Platform adapter overrides this.
async function saveScreenshotSilent() {
    // No-op in standalone mode
}
