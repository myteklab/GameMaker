// ============================================
// DRAWING/RENDERING
// ============================================
// Extracted from index.php lines 3634-3993

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Check if current level is a menu level
    const currentLevel = typeof getCurrentLevel === 'function' ? getCurrentLevel() : null;
    const isMenuLevel = currentLevel && currentLevel.levelType === 'menu';

    if (isMenuLevel) {
        // Draw menu level preview
        drawMenuLevelEditor(currentLevel);
        // Update scrollbars for menu level too
        if (typeof updateScrollbars === 'function') {
            updateScrollbars();
        }
        return;
    }

    // Background
    if (document.getElementById('show-bg').checked) {
        drawBackground();
    } else {
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Tiles
    drawTiles();

    // Grid
    if (document.getElementById('show-grid').checked) {
        drawGrid();
    }

    // Hover highlight
    if (hoverX >= 0 && hoverY >= 0) {
        drawHoverHighlight();
    }

    // Draw game objects
    if (document.getElementById('show-objects')?.checked !== false) {
        drawGameObjects();
    }

    // Draw terrain zones (rendered over other objects)
    drawTerrainZones();

    // Draw terrain zone preview (when drawing new zone)
    drawTerrainZonePreview();

    // Draw spawn point indicator
    drawSpawnPoint();

    // Update scrollbars to reflect current camera position
    if (typeof updateScrollbars === 'function') {
        updateScrollbars();
    }
}

// Draw menu level in the editor
function drawMenuLevelEditor(lvl) {
    // Draw background gradient or image
    if (document.getElementById('show-bg').checked) {
        // Try to draw background layers
        const bgLayers = lvl.backgroundLayers || [];
        if (bgLayers.length > 0 && loadedBackgroundImages && loadedBackgroundImages.length > 0) {
            // Draw all visible background layers
            for (let i = 0; i < bgLayers.length; i++) {
                const layer = bgLayers[i];
                if (layer.visible === false) continue;

                const img = loadedBackgroundImages[i];
                if (img && img.complete && img.naturalWidth > 0) {
                    // Scale to fit canvas, centered
                    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
                    const drawWidth = img.naturalWidth * scale;
                    const drawHeight = img.naturalHeight * scale;
                    const drawX = (canvas.width - drawWidth) / 2;
                    const drawY = (canvas.height - drawHeight) / 2;

                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                }
            }
        } else {
            // Default gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1a1a3e');
            gradient.addColorStop(1, '#2d1b4e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } else {
        // No background - dark fill
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw menu buttons
    const buttons = lvl.menuButtons || [];
    buttons.forEach((button, index) => {
        drawMenuButton(button, index);
    });

    // Draw "Press Any Key" text if enabled
    if (lvl.pressAnyKey) {
        const text = lvl.pressAnyKeyText || 'Press any key to start';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(text, canvas.width / 2, canvas.height - 60);
        ctx.shadowBlur = 0;
    }

    // Draw editor overlay/help text
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(233, 69, 96, 0.8)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Menu Level - Edit buttons in Level Settings', 10, 10);
}

// Draw a single menu button in the editor
function drawMenuButton(button, index) {
    // Convert percentage position to pixel position
    const btnX = (button.x / 100) * canvas.width;
    const btnY = (button.y / 100) * canvas.height;
    const btnWidth = (button.width / 100) * canvas.width;
    const btnHeight = button.height || 50;

    const style = button.style || {};
    const bgColor = style.bgColor || '#e94560';
    const textColor = style.textColor || '#ffffff';
    const borderColor = style.borderColor || '#ffffff';
    const borderRadius = style.borderRadius || 10;
    const fontSize = style.fontSize || 20;

    // Draw button background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, borderRadius);
    ctx.fill();

    // Draw button border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw button text
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text || 'Button', btnX, btnY);

    // Draw button index for editor reference
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`#${index + 1}`, btnX - btnWidth / 2 + 4, btnY - btnHeight / 2 + 4);
}

// Cache for loaded object sprites
const objectSpriteCache = {};

function drawGameObjects() {
    const scaledTileSize = tileSize * zoom;

    for (let i = 0; i < gameObjects.length; i++) {
        const obj = gameObjects[i];
        // Get template for this object to get custom size
        const template = getTemplate(obj.type, obj.templateId);
        const objWidth = (template?.width || tileSize) * zoom;
        const objHeight = (template?.height || tileSize) * zoom;

        // Position: center X in tile, bottom-aligned with tile bottom
        const screenX = (obj.x * tileSize - cameraX) * zoom + (scaledTileSize - objWidth) / 2;
        const screenY = (obj.y * tileSize - cameraY) * zoom + (scaledTileSize - objHeight);

        // Skip if off-screen
        if (screenX + objWidth < 0 || screenX > canvas.width ||
            screenY + objHeight < 0 || screenY > canvas.height) {
            continue;
        }

        ctx.save();

        // Draw highlight if this object is selected for moving
        const isSelected = (selectedMoveObject === i);
        if (isSelected) {
            // Draw pulsing glow effect
            const pulseAmount = Math.sin(Date.now() / 200) * 0.3 + 0.7; // Oscillate between 0.4 and 1.0
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 15 * pulseAmount;

            // Draw selection border around the object
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX - 3, screenY - 3, objWidth + 6, objHeight + 6);
        }

        const color = getObjectColor(obj.type, obj.templateId);
        const symbol = getObjectSymbol(obj.type, obj.templateId);

        const centerX = screenX + objWidth / 2;
        const centerY = screenY + objHeight / 2;
        const radius = Math.min(objWidth, objHeight) / 2 * 0.8;

        // Special rendering for moving platforms - draw as rectangle at actual size
        if (obj.type === 'movingPlatform') {
            let platformDrawn = false;
            const spriteUrl = template?.sprite;
            const tileKey = template?.tileKey;

            // Option 1: Draw sprite if available
            if (spriteUrl && !objectSpriteCache[spriteUrl]?.error) {
                if (!objectSpriteCache[spriteUrl]) {
                    // Load sprite
                    objectSpriteCache[spriteUrl] = { loading: true };
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        objectSpriteCache[spriteUrl] = { img: img, loaded: true };
                        draw(); // Redraw when loaded
                    };
                    img.onerror = () => {
                        objectSpriteCache[spriteUrl] = { error: true };
                    };
                    img.src = spriteUrl;
                }

                const cached = objectSpriteCache[spriteUrl];
                if (cached.loaded && cached.img) {
                    // Draw sprite stretched across platform - supports grid-based spritesheets
                    const spriteCols = template?.spritesheetCols || template?.frameCount || 1;
                    const spriteRows = template?.spritesheetRows || 1;
                    const frameWidth = cached.img.naturalWidth / spriteCols;
                    const frameHeight = cached.img.naturalHeight / spriteRows;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(
                        cached.img,
                        0, 0, frameWidth, frameHeight,
                        screenX, screenY, objWidth, objHeight
                    );
                    platformDrawn = true;
                }
            }

            // Option 2: Draw surface tile if available (and no sprite was drawn)
            if (!platformDrawn && tileKey && tiles[tileKey] && tilesetImage) {
                const tile = tiles[tileKey];
                ctx.imageSmoothingEnabled = false;
                // Tile the surface across the platform width
                const scaledTileSize = tileSize * zoom;
                const tilesNeeded = Math.ceil(objWidth / scaledTileSize);
                for (let t = 0; t < tilesNeeded; t++) {
                    const tileX = screenX + t * scaledTileSize;
                    const drawWidth = Math.min(scaledTileSize, screenX + objWidth - tileX);
                    const srcWidth = (drawWidth / scaledTileSize) * tileSize;
                    ctx.drawImage(
                        tilesetImage,
                        tile.x, tile.y, srcWidth, tileSize,
                        tileX, screenY, drawWidth, objHeight
                    );
                }
                platformDrawn = true;
            }

            // Option 3: Fallback to colored rectangle with 3D effect
            if (!platformDrawn) {
                ctx.fillStyle = color;
                ctx.fillRect(screenX, screenY, objWidth, objHeight);

                // Light edge on top (3D effect)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(screenX, screenY, objWidth, 2 * zoom);

                // Dark edge on bottom (3D effect)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(screenX, screenY + objHeight - 2 * zoom, objWidth, 2 * zoom);
            }

            // Draw movement direction indicator
            const axis = template?.axis || 'x';
            const distance = (template?.distance || 100) * zoom;
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            if (axis === 'x') {
                // Horizontal movement - draw arrow line to the right
                ctx.moveTo(screenX + objWidth, centerY);
                ctx.lineTo(screenX + objWidth + Math.min(distance, 50 * zoom), centerY);
            } else {
                // Vertical movement - draw arrow line downward
                ctx.moveTo(centerX, screenY + objHeight);
                ctx.lineTo(centerX, screenY + objHeight + Math.min(distance, 50 * zoom));
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Only draw symbol in center if using fallback (no sprite/tile)
            if (!platformDrawn) {
                ctx.font = `${Math.max(10, objHeight * 0.6)}px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(symbol, centerX, centerY);
            }

            ctx.restore();
            continue;
        }

        // Special rendering for mystery blocks - draw as solid rectangle like a block
        if (obj.type === 'mysteryBlock') {
            const spriteUrl = template?.sprite;

            // Try to draw sprite first
            if (spriteUrl && !objectSpriteCache[spriteUrl]?.error) {
                if (!objectSpriteCache[spriteUrl]) {
                    objectSpriteCache[spriteUrl] = { loading: true };
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        objectSpriteCache[spriteUrl] = { img: img, loaded: true };
                        draw();
                    };
                    img.onerror = () => {
                        objectSpriteCache[spriteUrl] = { error: true };
                    };
                    img.src = spriteUrl;
                }

                const cached = objectSpriteCache[spriteUrl];
                if (cached.loaded && cached.img) {
                    // Supports grid-based spritesheets
                    const spriteCols = template?.spritesheetCols || template?.frameCount || 1;
                    const spriteRows = template?.spritesheetRows || 1;
                    const frameWidth = cached.img.naturalWidth / spriteCols;
                    const frameHeight = cached.img.naturalHeight / spriteRows;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(
                        cached.img,
                        0, 0, frameWidth, frameHeight,
                        screenX, screenY, objWidth, objHeight
                    );
                    ctx.restore();
                    continue;
                }
            }

            // Fallback: Draw solid rectangle with 3D effect
            ctx.fillStyle = color;
            ctx.fillRect(screenX, screenY, objWidth, objHeight);

            // Light edge on top and left (3D effect)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(screenX, screenY, objWidth, 3 * zoom);
            ctx.fillRect(screenX, screenY, 3 * zoom, objHeight);

            // Dark edge on bottom and right (3D effect)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(screenX, screenY + objHeight - 3 * zoom, objWidth, 3 * zoom);
            ctx.fillRect(screenX + objWidth - 3 * zoom, screenY, 3 * zoom, objHeight);

            // Draw symbol in center
            ctx.font = `bold ${Math.max(14, objHeight * 0.6)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(symbol, centerX, centerY);

            ctx.restore();
            continue;
        }

        // Check if template has a sprite or tile
        const spriteUrl = template?.sprite;
        const tileKey = template?.tileKey;
        let objectDrawn = false;

        // Option 1: Try to draw sprite if available (takes priority)
        if (spriteUrl && !objectSpriteCache[spriteUrl]?.error) {
            if (!objectSpriteCache[spriteUrl]) {
                // Load sprite
                objectSpriteCache[spriteUrl] = { loading: true };
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    objectSpriteCache[spriteUrl] = { img: img, loaded: true };
                    draw(); // Redraw when loaded
                };
                img.onerror = () => {
                    objectSpriteCache[spriteUrl] = { error: true };
                };
                img.src = spriteUrl;
            }

            const cached = objectSpriteCache[spriteUrl];
            if (cached.loaded && cached.img) {
                // Draw only the first frame of the sprite - supports grid-based spritesheets
                const spriteCols = template?.spritesheetCols || template?.frameCount || 1;
                const spriteRows = template?.spritesheetRows || 1;
                const frameWidth = cached.img.naturalWidth / spriteCols;
                const frameHeight = cached.img.naturalHeight / spriteRows;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(
                    cached.img,
                    0, 0, frameWidth, frameHeight,  // Source: first frame only
                    screenX, screenY, objWidth, objHeight  // Destination
                );
                ctx.restore();
                continue;
            }
        }

        // Option 2: Try to draw tile if available (and no sprite was drawn)
        if (tileKey) {
            // Check custom tiles first
            if (typeof customTiles === 'object' && customTiles[tileKey] && customTiles[tileKey].dataURL) {
                const ct = customTiles[tileKey];
                const cacheKey = 'custom_' + tileKey;
                if (!objectSpriteCache[cacheKey]) {
                    objectSpriteCache[cacheKey] = { loading: true };
                    const img = new Image();
                    img.onload = () => {
                        objectSpriteCache[cacheKey] = { img: img, loaded: true };
                        draw();
                    };
                    img.onerror = () => {
                        objectSpriteCache[cacheKey] = { error: true };
                    };
                    img.src = ct.dataURL;
                }
                const cached = objectSpriteCache[cacheKey];
                if (cached.loaded && cached.img) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(cached.img, screenX, screenY, objWidth, objHeight);
                    objectDrawn = true;
                }
            }
            // Check tileset tiles
            else if (typeof tiles === 'object' && tiles[tileKey] && tilesetImage) {
                const tile = tiles[tileKey];
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(
                    tilesetImage,
                    tile.x, tile.y, tileSize, tileSize,
                    screenX, screenY, objWidth, objHeight
                );
                objectDrawn = true;
            }
        }

        if (objectDrawn) {
            ctx.restore();
            continue;
        }

        // Option 3: Draw object background circle (fallback)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fill();

        // Draw symbol/emoji
        ctx.globalAlpha = 1;
        ctx.font = `${Math.max(12, Math.min(objWidth, objHeight) * 0.5)}px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(symbol, centerX, centerY);

        ctx.restore();
    }
}

// Cache for player sprite
let playerSpriteCache = null;
let playerSpriteCacheUrl = '';

function drawSpawnPoint() {
    // Get spawn position using the helper function
    const pos = typeof getSpawnPosition === 'function' ? getSpawnPosition() : null;
    if (!pos) return;

    const spawnX = pos.x;
    const spawnY = pos.y;
    const isManualSpawn = spawnPoint !== null;

    const scaledTileSize = tileSize * zoom;
    const screenX = (spawnX * tileSize - cameraX) * zoom;
    const screenY = (spawnY * tileSize - cameraY) * zoom;

    // Get player dimensions from gameSettings
    const playerW = (gameSettings.playerWidth || 32) * zoom;
    const playerH = (gameSettings.playerHeight || 32) * zoom;

    // Position: center X in tile, bottom-aligned with tile bottom
    const playerScreenX = screenX + (scaledTileSize - playerW) / 2;
    const playerScreenY = screenY + scaledTileSize - playerH;

    ctx.save();

    // Draw selection highlight when being dragged
    if (isDraggingPlayer) {
        const pulseAmount = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 15 * pulseAmount;

        // Draw selection border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.strokeRect(playerScreenX - 3, playerScreenY - 3, playerW + 6, playerH + 6);
    }

    // Try to draw player sprite
    const spriteUrl = gameSettings.playerSpriteURL;
    if (spriteUrl) {
        // Load sprite if needed
        if (playerSpriteCacheUrl !== spriteUrl) {
            playerSpriteCacheUrl = spriteUrl;
            playerSpriteCache = null;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                playerSpriteCache = img;
                draw(); // Redraw when loaded
            };
            img.onerror = () => {
                playerSpriteCache = null;
            };
            img.src = spriteUrl;
        }

        if (playerSpriteCache) {
            // Draw sprite (first frame only) - supports grid-based spritesheets
            const spriteCols = gameSettings.playerSpritesheetCols || gameSettings.playerFrameCount || 1;
            const spriteRows = gameSettings.playerSpritesheetRows || 1;
            const frameWidth = playerSpriteCache.naturalWidth / spriteCols;
            const frameHeight = playerSpriteCache.naturalHeight / spriteRows;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                playerSpriteCache,
                0, 0, frameWidth, frameHeight,
                playerScreenX, playerScreenY, playerW, playerH
            );
        } else {
            // Sprite loading - draw placeholder
            drawPlayerFallback(playerScreenX, playerScreenY, playerW, playerH, isManualSpawn);
        }
    } else {
        // No sprite - draw colored rectangle with player color
        drawPlayerFallback(playerScreenX, playerScreenY, playerW, playerH, isManualSpawn);
    }

    // Draw "PLAYER" label above
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.max(10, scaledTileSize * 0.35)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = isManualSpawn ? '#00ff88' : '#ffaa00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const label = 'PLAYER';
    ctx.fillText(label, screenX + scaledTileSize / 2, playerScreenY - 4);

    ctx.restore();
}

function drawPlayerFallback(x, y, w, h, isManualSpawn) {
    // Use player color from settings or default
    const playerColor = gameSettings.playerColor || '#ff6b6b';

    // Fill with player color
    ctx.fillStyle = playerColor;
    ctx.fillRect(x, y, w, h);

    // Draw outline
    ctx.strokeStyle = isManualSpawn ? '#00ff88' : '#ffaa00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Draw a simple face to indicate it's the player
    ctx.fillStyle = '#ffffff';
    const eyeSize = Math.max(2, w * 0.12);
    const eyeY = y + h * 0.35;
    ctx.fillRect(x + w * 0.25, eyeY, eyeSize, eyeSize);
    ctx.fillRect(x + w * 0.65, eyeY, eyeSize, eyeSize);
}

function drawBackground() {
    // Draw default gradient first (fallback)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#2d1b4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw parallax background layers
    // Layer 0 = furthest back (slowest), higher indices = closer (faster)
    // Background fills the visible level area, anchored to the bottom

    const levelWorldHeight = levelHeight * tileSize;
    const levelTopOnScreen = -cameraY * zoom;
    const levelBottomOnScreen = (levelWorldHeight - cameraY) * zoom;

    // Calculate visible level bounds on screen
    const visibleTop = Math.max(0, levelTopOnScreen);
    const visibleBottom = Math.min(canvas.height, levelBottomOnScreen);
    const visibleLevelHeight = visibleBottom - visibleTop;

    if (visibleLevelHeight <= 0) return; // Level not visible

    for (let i = 0; i < backgroundLayers.length; i++) {
        const layer = backgroundLayers[i];

        // Skip hidden layers
        if (layer.visible === false) continue;

        const img = loadedBackgroundImages[i];

        if (img && img.complete && img.naturalWidth > 0) {
            // Calculate parallax offset (speed 0 = static, 1 = moves with camera)
            const parallaxX = cameraX * layer.speed * zoom;

            // Scale image to fit the visible level height
            const scale = visibleLevelHeight / img.naturalHeight;
            const scaledWidth = Math.ceil(img.naturalWidth * scale);
            const scaledHeight = Math.ceil(visibleLevelHeight);

            // Position background to fill visible level area
            const bgY = visibleTop;

            // Calculate starting position (tile horizontally)
            const startX = Math.round(-(parallaxX % scaledWidth));

            // Draw tiled background
            for (let x = startX; x < canvas.width; x += scaledWidth) {
                ctx.drawImage(img, Math.round(x), bgY, scaledWidth + 1, scaledHeight);
            }

            // Also draw one more tile to the left if needed
            if (startX > 0) {
                ctx.drawImage(img, Math.round(startX - scaledWidth), bgY, scaledWidth + 1, scaledHeight);
            }
        }
    }
}

function drawTiles() {
    const scaledTileSize = tileSize * zoom;
    const startCol = Math.floor(cameraX / tileSize);
    const startRow = Math.floor(cameraY / tileSize);
    const endCol = startCol + Math.ceil(canvas.width / scaledTileSize) + 1;
    const endRow = startRow + Math.ceil(canvas.height / scaledTileSize) + 1;

    // Learning mode disabled in GameMaker (no-code environment)
    const showLetters = false;

    for (let y = Math.max(0, startRow); y < Math.min(level.length, endRow); y++) {
        for (let x = Math.max(0, startCol); x < Math.min(level[y].length, endCol); x++) {
            const char = level[y][x];
            if (char === '.') continue;

            const screenX = (x * tileSize - cameraX) * zoom;
            const screenY = (y * tileSize - cameraY) * zoom;

            // Check if this is a custom tile
            if (isCustomTile(char) && customTiles[char]) {
                const customTile = customTiles[char];
                const img = getCustomTileImage(char);
                if (img && img.complete) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(img, 0, 0, tileSize, tileSize,
                        screenX, screenY, scaledTileSize, scaledTileSize);
                } else {
                    // Fallback while image loads
                    ctx.fillStyle = '#6b5b95';
                    ctx.fillRect(screenX, screenY, scaledTileSize, scaledTileSize);
                }
                continue;
            }

            // Regular tileset tile
            const tile = tiles[char];
            if (!tile) continue;

            if (showLetters) {
                // Learning mode: Show colored squares with letter labels
                // Use a color based on the character for visual distinction
                const charCode = char.charCodeAt(0);
                const hue = (charCode * 37) % 360;
                const bgColor = `hsl(${hue}, 60%, ${tile.solid ? '35%' : '50%'})`;
                const borderColor = `hsl(${hue}, 70%, ${tile.solid ? '25%' : '40%'})`;

                // Draw background square
                ctx.fillStyle = bgColor;
                ctx.fillRect(screenX, screenY, scaledTileSize, scaledTileSize);

                // Draw border
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = Math.max(1, zoom);
                ctx.strokeRect(screenX, screenY, scaledTileSize, scaledTileSize);

                // Draw the letter
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.max(10, scaledTileSize * 0.6)}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(char, screenX + scaledTileSize/2, screenY + scaledTileSize/2);

                // Draw small "solid" indicator for solid tiles
                if (tile.solid) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.font = `${Math.max(6, scaledTileSize * 0.2)}px sans-serif`;
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('■', screenX + scaledTileSize - 2, screenY + scaledTileSize - 1);
                }
            } else if (tilesetImage) {
                // Normal mode: Draw tile image
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(
                    tilesetImage,
                    tile.x, tile.y, tileSize, tileSize,
                    screenX, screenY, scaledTileSize, scaledTileSize
                );
            } else {
                // Fallback colored square (no tileset loaded)
                ctx.fillStyle = tile.solid ? '#445566' : '#334455';
                ctx.fillRect(screenX, screenY, scaledTileSize, scaledTileSize);
                ctx.fillStyle = '#fff';
                ctx.font = `${12 * zoom}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(char, screenX + scaledTileSize/2, screenY + scaledTileSize/2);
            }
        }
    }
}

function drawGrid() {
    const scaledTileSize = tileSize * zoom;

    // Calculate level bounds in screen coordinates
    const levelLeft = -cameraX * zoom;
    const levelTop = -cameraY * zoom;
    const levelRight = (levelWidth * tileSize - cameraX) * zoom;
    const levelBottom = (levelHeight * tileSize - cameraY) * zoom;

    // Draw out-of-bounds area (darker)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    // Top area (above level)
    if (levelTop > 0) {
        ctx.fillRect(0, 0, canvas.width, levelTop);
    }
    // Bottom area (below level)
    if (levelBottom < canvas.height) {
        ctx.fillRect(0, levelBottom, canvas.width, canvas.height - levelBottom);
    }
    // Left area (left of level)
    if (levelLeft > 0) {
        ctx.fillRect(0, Math.max(0, levelTop), levelLeft, Math.min(canvas.height, levelBottom) - Math.max(0, levelTop));
    }
    // Right area (right of level)
    if (levelRight < canvas.width) {
        ctx.fillRect(levelRight, Math.max(0, levelTop), canvas.width - levelRight, Math.min(canvas.height, levelBottom) - Math.max(0, levelTop));
    }

    // Draw level boundary
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(levelLeft, levelTop, levelWidth * tileSize * zoom, levelHeight * tileSize * zoom);

    // Draw grid only within level bounds
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    const startX = Math.max(0, Math.floor(cameraX / tileSize));
    const startY = Math.max(0, Math.floor(cameraY / tileSize));
    const endX = Math.min(levelWidth, Math.ceil((cameraX + canvas.width / zoom) / tileSize));
    const endY = Math.min(levelHeight, Math.ceil((cameraY + canvas.height / zoom) / tileSize));

    // Vertical lines
    for (let x = startX; x <= endX; x++) {
        const screenX = (x * tileSize - cameraX) * zoom;
        ctx.beginPath();
        ctx.moveTo(screenX, Math.max(0, levelTop));
        ctx.lineTo(screenX, Math.min(canvas.height, levelBottom));
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y++) {
        const screenY = (y * tileSize - cameraY) * zoom;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, levelLeft), screenY);
        ctx.lineTo(Math.min(canvas.width, levelRight), screenY);
        ctx.stroke();
    }
}

function drawHoverHighlight() {
    // Only show hover highlight within level bounds
    if (hoverX < 0 || hoverX >= levelWidth || hoverY < 0 || hoverY >= levelHeight) {
        return;
    }

    const scaledTileSize = tileSize * zoom;
    const screenX = (hoverX * tileSize - cameraX) * zoom;
    const screenY = (hoverY * tileSize - cameraY) * zoom;

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, screenY, scaledTileSize, scaledTileSize);

    // Preview for dragged tile (in move tool)
    if (draggedTileKey && tiles[draggedTileKey] && tilesetImage) {
        ctx.globalAlpha = 0.7;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            tilesetImage,
            tiles[draggedTileKey].x, tiles[draggedTileKey].y, tileSize, tileSize,
            screenX, screenY, scaledTileSize, scaledTileSize
        );
        ctx.globalAlpha = 1;
    }
    // Preview for selected tile (in draw tool)
    else if (selectedTileKey !== '.' && tiles[selectedTileKey] && tilesetImage) {
        ctx.globalAlpha = 0.5;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            tilesetImage,
            tiles[selectedTileKey].x, tiles[selectedTileKey].y, tileSize, tileSize,
            screenX, screenY, scaledTileSize, scaledTileSize
        );
        ctx.globalAlpha = 1;
    }
}

// ============================================
// TERRAIN ZONE RENDERING
// ============================================

// Cache for terrain zone textures
const terrainZoneImageCache = {};

function drawTerrainZones() {
    const scaledTileSize = tileSize * zoom;

    // Draw all terrain zones
    for (let i = 0; i < gameObjects.length; i++) {
        const obj = gameObjects[i];
        if (obj.type !== 'terrainZone') continue;

        const template = getTemplate('terrainZone', obj.templateId);
        if (!template) continue;

        const zoneWidth = (obj.width || 1) * tileSize;
        const zoneHeight = (obj.height || 1) * tileSize;

        // Calculate screen position
        const screenX = (obj.x * tileSize - cameraX) * zoom;
        const screenY = (obj.y * tileSize - cameraY) * zoom;
        const screenWidth = zoneWidth * zoom;
        const screenHeight = zoneHeight * zoom;

        // Skip if off-screen
        if (screenX + screenWidth < 0 || screenX > canvas.width ||
            screenY + screenHeight < 0 || screenY > canvas.height) {
            continue;
        }

        ctx.save();

        // Set opacity
        ctx.globalAlpha = template.opacity !== undefined ? template.opacity : 0.6;

        // Try to draw tiled image if available
        let imageDrawn = false;
        if (template.imageURL) {
            const img = getTerrainZoneImage(template.imageURL);
            if (img && img.complete && img.naturalWidth > 0) {
                // Tile the image across the zone
                const imgWidth = img.naturalWidth * zoom;
                const imgHeight = img.naturalHeight * zoom;

                // Create clipping region for the zone
                ctx.beginPath();
                ctx.rect(screenX, screenY, screenWidth, screenHeight);
                ctx.clip();

                // Draw tiled image
                for (let ty = screenY; ty < screenY + screenHeight; ty += imgHeight) {
                    for (let tx = screenX; tx < screenX + screenWidth; tx += imgWidth) {
                        ctx.drawImage(img, tx, ty, imgWidth, imgHeight);
                    }
                }

                imageDrawn = true;
            }
        }

        // Draw color fill (as overlay if image exists, or as primary fill)
        if (template.tintColor) {
            if (imageDrawn) {
                // Draw as tint overlay
                ctx.globalAlpha = (template.opacity || 0.6) * 0.5;
            }
            ctx.fillStyle = template.tintColor;
            ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
        } else if (!imageDrawn) {
            // No image or tint - use default color
            ctx.fillStyle = '#4a90d9';
            ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
        }

        ctx.globalAlpha = 1;

        // Draw border
        ctx.strokeStyle = template.tintColor || '#4a90d9';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
        ctx.setLineDash([]);

        // Draw zone name label
        ctx.font = `bold ${Math.max(10, 12 * zoom)}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 3;
        ctx.fillText(template.name || 'Zone', screenX + 4, screenY + 4);
        ctx.shadowBlur = 0;

        // Draw symbol in center if zone is small
        if (screenWidth < 100 * zoom || screenHeight < 100 * zoom) {
            const symbol = template.symbol || '~';
            ctx.font = `${Math.max(16, Math.min(screenWidth, screenHeight) * 0.4)}px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(symbol, screenX + screenWidth / 2, screenY + screenHeight / 2);
        }

        ctx.restore();

        // Draw selection highlight and resize handles if selected
        if (selectedTerrainZone === i) {
            drawTerrainZoneSelection(screenX, screenY, screenWidth, screenHeight);
        }
    }
}

function getTerrainZoneImage(url) {
    if (!url) return null;

    if (!terrainZoneImageCache[url]) {
        terrainZoneImageCache[url] = { loading: true };
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            terrainZoneImageCache[url] = img;
            draw(); // Redraw when loaded
        };
        img.onerror = () => {
            terrainZoneImageCache[url] = { error: true };
        };
        img.src = url;
        return null;
    }

    const cached = terrainZoneImageCache[url];
    if (cached.loading || cached.error) return null;
    return cached;
}

function drawTerrainZoneSelection(screenX, screenY, screenWidth, screenHeight) {
    ctx.save();

    // Draw selection border with pulsing effect
    const pulseAmount = Math.sin(Date.now() / 200) * 0.3 + 0.7;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10 * pulseAmount;
    ctx.strokeRect(screenX - 2, screenY - 2, screenWidth + 4, screenHeight + 4);
    ctx.shadowBlur = 0;

    // Draw resize handles (8 handles: corners + edge midpoints)
    const handleSize = 8;
    const halfHandle = handleSize / 2;
    const handles = [
        { x: screenX, y: screenY, name: 'nw' },
        { x: screenX + screenWidth / 2, y: screenY, name: 'n' },
        { x: screenX + screenWidth, y: screenY, name: 'ne' },
        { x: screenX + screenWidth, y: screenY + screenHeight / 2, name: 'e' },
        { x: screenX + screenWidth, y: screenY + screenHeight, name: 'se' },
        { x: screenX + screenWidth / 2, y: screenY + screenHeight, name: 's' },
        { x: screenX, y: screenY + screenHeight, name: 'sw' },
        { x: screenX, y: screenY + screenHeight / 2, name: 'w' }
    ];

    for (const handle of handles) {
        // White fill
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize);

        // Dark border
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.strokeRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize);
    }

    ctx.restore();
}

function drawTerrainZonePreview() {
    // Draw preview rectangle when creating new zone
    if (!isDrawingTerrainZone || !terrainZonePreview) return;

    const template = getTemplate('terrainZone', selectedTemplateId);
    if (!template) return;

    const screenX = (terrainZonePreview.x * tileSize - cameraX) * zoom;
    const screenY = (terrainZonePreview.y * tileSize - cameraY) * zoom;
    const screenWidth = terrainZonePreview.width * tileSize * zoom;
    const screenHeight = terrainZonePreview.height * tileSize * zoom;

    ctx.save();

    // Semi-transparent fill
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = template.tintColor || '#4a90d9';
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight);

    // Dashed border
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = template.tintColor || '#4a90d9';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
    ctx.setLineDash([]);

    // Size label
    ctx.globalAlpha = 1;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(
        `${terrainZonePreview.width} x ${terrainZonePreview.height}`,
        screenX + screenWidth / 2,
        screenY + screenHeight / 2
    );
    ctx.shadowBlur = 0;

    ctx.restore();
}
