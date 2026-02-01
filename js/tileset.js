// ============================================
// TILESET HANDLING
// ============================================

function setupTilesetDropzone() {
    const dropzone = document.getElementById('tileset-dropzone');
    const input = document.getElementById('tileset-input');

    dropzone.addEventListener('click', () => input.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadTilesetFile(file);
        }
    });

    input.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            loadTilesetFile(e.target.files[0]);
        }
    });
}

function loadTilesetFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            tilesetImage = img;
            tilesetDataURLCache = e.target.result; // Store data URL for export
            tilesetSourceURL = ''; // Clear URL source since this is a file upload

            // Keep existing tile size if set, otherwise auto-detect
            if (tileSize && tileSize >= 4 && tileSize <= 128) {
                // Just update the info display
                const w = img.width;
                const h = img.height;
                const tilesX = Math.floor(w / tileSize);
                const tilesY = Math.floor(h / tileSize);
                const totalTiles = tilesX * tilesY;
                const infoEl = document.getElementById('tileset-info');
                if (infoEl) {
                    infoEl.innerHTML = `${w}×${h}px → <strong>${tilesX}×${tilesY}</strong> tiles (${totalTiles} total)`;
                }
            } else {
                autoDetectTileSize();
            }

            renderTilesetPreview();
            document.getElementById('tileset-preview').classList.add('visible');
            document.getElementById('tileset-dropzone').style.display = 'none';
            document.getElementById('tileset-url-section').style.display = 'none';
            showToast('Tileset loaded! Click tiles to add them.');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadTilesetFromURL(url, customTileSize) {
    showToast('Loading tileset...', 'info');

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS for cross-origin images

    img.onload = () => {
        tilesetImage = img;
        tilesetSourceURL = url; // Store URL for refresh functionality

        // Try to convert to data URL for export (may fail due to CORS)
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0);
            tilesetDataURLCache = tempCanvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Could not convert tileset to data URL (CORS). Game preview may not show tiles correctly.');
            tilesetDataURLCache = url; // Fallback to URL (may not work in sandboxed iframe)
        }

        // Use custom tile size if provided, keep existing tile size if set, otherwise auto-detect
        if (customTileSize && customTileSize >= 4 && customTileSize <= 128) {
            tileSize = customTileSize;
            document.getElementById('tile-size-select').value =
                [8, 16, 32, 64].includes(tileSize) ? tileSize : 'custom';
            if (![8, 16, 32, 64].includes(tileSize)) {
                document.getElementById('tile-size-custom').value = tileSize;
                document.getElementById('tile-size-custom').style.display = 'inline-block';
            }
        } else if (tileSize && tileSize >= 4 && tileSize <= 128) {
            // Keep existing tile size - just update the info display
            const w = img.width;
            const h = img.height;
            const tilesX = Math.floor(w / tileSize);
            const tilesY = Math.floor(h / tileSize);
            const totalTiles = tilesX * tilesY;
            const infoEl = document.getElementById('tileset-info');
            if (infoEl) {
                infoEl.innerHTML = `${w}×${h}px → <strong>${tilesX}×${tilesY}</strong> tiles (${totalTiles} total)`;
            }
        } else {
            autoDetectTileSize();
        }

        renderTilesetPreview();
        document.getElementById('tileset-preview').classList.add('visible');
        document.getElementById('tileset-dropzone').style.display = 'none';
        document.getElementById('tileset-url-section').style.display = 'none';
        showToast('Tileset loaded from URL! Click tiles to add them.');
    };

    img.onerror = () => {
        console.error('Failed to load tileset from URL:', url);
        showToast('Failed to load tileset. Check the URL or try uploading directly.', 'error');
    };

    img.src = url;
}

// Load tileset from the URL input field
function loadTilesetFromURLInput() {
    const urlInput = document.getElementById('tileset-url-input');
    const url = urlInput.value.trim();

    if (!url) {
        showToast('Please enter a tileset URL', 'error');
        return;
    }

    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showToast('Please enter a valid URL (http:// or https://)', 'error');
        return;
    }

    loadTilesetFromURL(url);
    urlInput.value = ''; // Clear input after loading
}

function autoDetectTileSize() {
    if (!tilesetImage) return;

    const w = tilesetImage.width;
    const h = tilesetImage.height;

    // Calculate GCD to find the most likely tile size
    function gcd(a, b) {
        return b === 0 ? a : gcd(b, a % b);
    }

    const commonDivisor = gcd(w, h);

    // Common tile sizes (preferred)
    const commonSizes = [8, 16, 32, 64];

    // First, check if GCD is a common tile size
    if (commonSizes.includes(commonDivisor)) {
        tileSize = commonDivisor;
    }
    // Check if GCD is divisible by common sizes (e.g., GCD=48 -> use 16)
    else {
        let bestSize = 16; // default
        for (const size of commonSizes) {
            if (commonDivisor % size === 0 && w % size === 0 && h % size === 0) {
                bestSize = size;
            }
        }
        tileSize = bestSize;
    }

    // Update the UI
    if (commonSizes.includes(tileSize)) {
        document.getElementById('tile-size-select').value = tileSize;
        document.getElementById('tile-size-custom').style.display = 'none';
    } else {
        document.getElementById('tile-size-select').value = 'custom';
        document.getElementById('tile-size-custom').value = tileSize;
        document.getElementById('tile-size-custom').style.display = 'inline-block';
    }

    // Calculate and display tileset info
    const tilesX = Math.floor(w / tileSize);
    const tilesY = Math.floor(h / tileSize);
    const totalTiles = tilesX * tilesY;

    // Update info display
    const infoEl = document.getElementById('tileset-info');
    if (infoEl) {
        infoEl.innerHTML = `${w}×${h}px → <strong>${tilesX}×${tilesY}</strong> tiles (${totalTiles} total)`;
    }

    console.log(`Tileset: ${w}x${h}px, detected ${tileSize}x${tileSize} tiles (${tilesX}x${tilesY} = ${totalTiles} tiles)`);
}

function updateTileSize() {
    const select = document.getElementById('tile-size-select');
    const customInput = document.getElementById('tile-size-custom');

    if (select.value === 'custom') {
        customInput.style.display = 'inline-block';
        tileSize = parseInt(customInput.value) || 16;
    } else {
        customInput.style.display = 'none';
        tileSize = parseInt(select.value);
    }

    // Update tileset info display
    if (tilesetImage) {
        const w = tilesetImage.width;
        const h = tilesetImage.height;
        const tilesX = Math.floor(w / tileSize);
        const tilesY = Math.floor(h / tileSize);
        const totalTiles = tilesX * tilesY;

        const infoEl = document.getElementById('tileset-info');
        if (infoEl) {
            infoEl.innerHTML = `${w}×${h}px → <strong>${tilesX}×${tilesY}</strong> tiles (${totalTiles} total)`;
        }
    }

    renderTilesetPreview();
}

function renderTilesetPreview() {
    if (!tilesetImage) return;

    const tilesetCanvas = document.getElementById('tileset-canvas');
    const tctx = tilesetCanvas.getContext('2d');

    // Scale for display
    const scale = 2;
    tilesetCanvas.width = tilesetImage.width * scale;
    tilesetCanvas.height = tilesetImage.height * scale;

    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(tilesetImage, 0, 0, tilesetCanvas.width, tilesetCanvas.height);

    // Draw grid
    tctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
    tctx.lineWidth = 1;

    const scaledTileSize = tileSize * scale;

    for (let x = 0; x <= tilesetCanvas.width; x += scaledTileSize) {
        tctx.beginPath();
        tctx.moveTo(x, 0);
        tctx.lineTo(x, tilesetCanvas.height);
        tctx.stroke();
    }

    for (let y = 0; y <= tilesetCanvas.height; y += scaledTileSize) {
        tctx.beginPath();
        tctx.moveTo(0, y);
        tctx.lineTo(tilesetCanvas.width, y);
        tctx.stroke();
    }

    // Highlight tiles that are already added
    for (const key in tiles) {
        const tile = tiles[key];
        tctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
        tctx.fillRect(tile.x * scale, tile.y * scale, tileSize * scale, tileSize * scale);
    }
}

function clearTileset() {
    tilesetImage = null;
    tilesetDataURLCache = '';
    tilesetSourceURL = '';
    tiles = {};
    nextTileKey = 'A';
    document.getElementById('tileset-preview').classList.remove('visible');
    document.getElementById('tileset-dropzone').style.display = 'block';
    document.getElementById('tileset-url-section').style.display = 'block';
    document.getElementById('selected-tile-info').classList.remove('visible');
    renderTilePalette();
    draw();
}

// Change to a different tileset (keeps existing tile selections)
function changeTileset() {
    const tileCount = Object.keys(tiles).length;

    let message = `<p>Load a different tileset image?</p>`;

    if (tileCount > 0) {
        message += `
            <div class="warning">
                <strong>⚠️ Warning:</strong> You have <strong>${tileCount} tile${tileCount > 1 ? 's' : ''}</strong> selected from the current tileset.
                <br><br>
                If the new tileset has a different layout, your tiles will reference wrong positions and your game may look broken.
                <br><br>
                <strong>Safe to change if:</strong>
                <ul style="margin: 8px 0 0 20px; text-align: left;">
                    <li>New tileset has the same grid layout</li>
                    <li>You're replacing with an edited version of the same tileset</li>
                </ul>
            </div>
        `;
    }

    showConfirmModal({
        title: 'Change Tileset',
        message: message,
        confirmText: 'Change Tileset',
        cancelText: 'Cancel',
        confirmStyle: tileCount > 0 ? 'danger' : 'primary',
        onConfirm: () => {
            // Show the dropzone and URL input without clearing tiles
            tilesetImage = null;
            tilesetDataURLCache = '';
            tilesetSourceURL = '';
            document.getElementById('tileset-preview').classList.remove('visible');
            document.getElementById('tileset-dropzone').style.display = 'block';
            document.getElementById('tileset-url-section').style.display = 'block';
            showToast('Select a new tileset image', 'info');
        }
    });
}

// Refresh/reload the current tileset
function refreshTileset() {
    if (!tilesetImage && !tilesetDataURLCache) {
        showToast('No tileset loaded to refresh', 'error');
        return;
    }

    const tileCount = Object.keys(tiles).length;

    let message = `<p>Reload the current tileset image?</p>`;

    if (tileCount > 0) {
        message += `
            <div class="warning">
                <strong>⚠️ Warning:</strong> You have <strong>${tileCount} tile${tileCount > 1 ? 's' : ''}</strong> selected.
                <br><br>
                If you've changed the tileset externally (added/removed/moved tiles), your existing tile selections may no longer match.
                <br><br>
                <strong>Safe to refresh if:</strong>
                <ul style="margin: 8px 0 0 20px; text-align: left;">
                    <li>You only edited existing tile graphics</li>
                    <li>You only added new tiles at the end</li>
                    <li>The grid layout is unchanged</li>
                </ul>
            </div>
        `;
    }

    showConfirmModal({
        title: 'Refresh Tileset',
        message: message,
        confirmText: 'Refresh',
        cancelText: 'Cancel',
        confirmStyle: tileCount > 0 ? 'danger' : 'primary',
        onConfirm: () => {
            if (tilesetSourceURL) {
                // Reload from URL with cache-busting
                const cacheBustURL = tilesetSourceURL + (tilesetSourceURL.includes('?') ? '&' : '?') + '_t=' + Date.now();
                const img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = () => {
                    tilesetImage = img;

                    // Re-cache as data URL
                    try {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = img.width;
                        tempCanvas.height = img.height;
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.drawImage(img, 0, 0);
                        tilesetDataURLCache = tempCanvas.toDataURL('image/png');
                    } catch (e) {
                        console.warn('Could not convert refreshed tileset to data URL (CORS)');
                        tilesetDataURLCache = tilesetSourceURL;
                    }

                    renderTilesetPreview();
                    renderTilePalette();
                    draw();
                    showToast('Tileset refreshed!', 'success');
                };

                img.onerror = () => {
                    showToast('Failed to reload tileset from URL', 'error');
                };

                img.src = cacheBustURL;
            } else if (tilesetDataURLCache) {
                // For file uploads, we can only reload from cached data URL
                // This won't pick up external changes, but at least re-renders
                const img = new Image();
                img.onload = () => {
                    tilesetImage = img;
                    renderTilesetPreview();
                    renderTilePalette();
                    draw();
                    showToast('Tileset re-rendered from cache', 'info');
                };
                img.src = tilesetDataURLCache;
            } else {
                showToast('Cannot refresh - no tileset source available', 'error');
            }
        }
    });
}

// Tileset click handler - attached after DOM loads
function initTilesetClickHandler() {
    document.getElementById('tileset-canvas').addEventListener('click', (e) => {
        if (!tilesetImage) return;

        const rect = e.target.getBoundingClientRect();
        const scale = 2;
        const x = Math.floor((e.clientX - rect.left) / scale / tileSize) * tileSize;
        const y = Math.floor((e.clientY - rect.top) / scale / tileSize) * tileSize;

        // Check if this tile already exists
        for (const key in tiles) {
            if (tiles[key].x === x && tiles[key].y === y) {
                selectTile(key);
                return;
            }
        }

        // Add new tile
        addTileFromTileset(x, y);
    });
}

function addTileFromTileset(x, y) {
    const key = getNextTileKey();
    tiles[key] = {
        x: x,
        y: y,
        solid: true,
        name: `Tile ${key}`
    };

    markDirty();
    renderTilePalette();
    renderTilesetPreview();
    selectTile(key);
    showToast(`Added tile "${key}"`);
}

function getNextTileKey() {
    // Skip used keys
    while (tiles[nextTileKey] || nextTileKey === '.') {
        if (nextTileKey === 'Z') {
            nextTileKey = 'a';
        } else if (nextTileKey === 'z') {
            nextTileKey = '0';
        } else if (nextTileKey === '9') {
            nextTileKey = '!';
        } else {
            nextTileKey = String.fromCharCode(nextTileKey.charCodeAt(0) + 1);
        }
    }
    const key = nextTileKey;
    nextTileKey = String.fromCharCode(nextTileKey.charCodeAt(0) + 1);
    return key;
}

// ============================================
// TILE PALETTE
// ============================================

function renderTilePalette() {
    const grid = document.getElementById('tile-grid');
    grid.innerHTML = '';

    // Eraser tile (shortcut: 0)
    const eraserDiv = document.createElement('div');
    eraserDiv.className = 'tile-item eraser' + (selectedTileKey === '.' ? ' selected' : '');
    eraserDiv.dataset.key = '.';
    eraserDiv.dataset.shortcut = '0';
    eraserDiv.innerHTML = '<span class="tile-key" title="Press 0">0</span>';
    eraserDiv.onclick = () => selectTile('.');
    grid.appendChild(eraserDiv);

    // User-added tiles (shortcuts: 1-9 for first 9 tiles)
    let tileIndex = 0;
    for (const key in tiles) {
        const tile = tiles[key];
        const div = document.createElement('div');
        div.className = 'tile-item' + (selectedTileKey === key ? ' selected' : '');
        div.dataset.key = key;

        // Create mini canvas for tile preview
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = tileSize;
        miniCanvas.height = tileSize;
        const mctx = miniCanvas.getContext('2d');

        if (tilesetImage) {
            mctx.drawImage(tilesetImage, tile.x, tile.y, tileSize, tileSize, 0, 0, tileSize, tileSize);
        }

        div.appendChild(miniCanvas);

        const keySpan = document.createElement('span');
        keySpan.className = 'tile-key';

        // Show shortcut number for first 9 tiles, otherwise show internal key
        if (tileIndex < 9) {
            const shortcut = tileIndex + 1;
            keySpan.textContent = shortcut;
            keySpan.title = `Press ${shortcut}`;
            div.dataset.shortcut = shortcut;
        } else {
            keySpan.textContent = key;
            keySpan.title = `Internal key: ${key}`;
        }
        div.appendChild(keySpan);

        // Delete button (appears on hover)
        const actions = document.createElement('div');
        actions.className = 'tile-actions';
        actions.innerHTML = `<button onclick="event.stopPropagation(); deleteTile('${key}')" title="Remove tile">×</button>`;
        div.appendChild(actions);

        div.onclick = () => selectTile(key);
        grid.appendChild(div);
        tileIndex++;
    }
}

// Delete a tile from the palette
function deleteTile(key) {
    if (!tiles[key]) return;

    const tileName = tiles[key].name || `Tile ${key}`;

    // Count how many times this tile is used in current level
    let usageCount = 0;
    for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[y].length; x++) {
            if (level[y][x] === key) usageCount++;
        }
    }

    // Also check all other levels
    let totalUsage = usageCount;
    for (let i = 0; i < levels.length; i++) {
        if (i === currentLevelIndex) continue; // Already counted current level
        const lvl = levels[i];
        if (lvl.tiles) {
            for (let y = 0; y < lvl.tiles.length; y++) {
                for (let x = 0; x < lvl.tiles[y].length; x++) {
                    if (lvl.tiles[y][x] === key) totalUsage++;
                }
            }
        }
    }

    // Build message with optional warning
    let message = `Remove <strong>"${tileName}"</strong> from the tile palette?`;
    if (totalUsage > 0) {
        message += `<div class="warning">⚠️ This tile is used <strong>${totalUsage} time${totalUsage > 1 ? 's' : ''}</strong> in your level${levels.length > 1 ? 's' : ''}. Those tiles will be cleared.</div>`;
    }

    showConfirmModal({
        title: 'Remove Tile',
        message: message,
        confirmText: 'Remove',
        cancelText: 'Cancel',
        confirmStyle: 'danger',
        onConfirm: () => {
            // Remove from current level
            for (let y = 0; y < level.length; y++) {
                level[y] = level[y].split('').map(c => c === key ? '.' : c).join('');
            }

            // Remove from all other levels
            for (let i = 0; i < levels.length; i++) {
                if (i === currentLevelIndex) continue;
                const lvl = levels[i];
                if (lvl.tiles) {
                    for (let y = 0; y < lvl.tiles.length; y++) {
                        lvl.tiles[y] = lvl.tiles[y].split('').map(c => c === key ? '.' : c).join('');
                    }
                }
            }

            // Remove from tiles object
            delete tiles[key];

            // If this was selected, select eraser
            if (selectedTileKey === key) {
                selectTile('.');
            }

            markDirty();
            renderTilePalette();
            renderTilesetPreview();
            draw();
            showToast(`Removed "${tileName}" from palette`, 'info');
        }
    });
}

// Get tile key by shortcut number (0 = eraser, 1-9 = tiles)
function getTileKeyByShortcut(shortcutNum) {
    if (shortcutNum === 0) return '.';

    const tileKeys = Object.keys(tiles);
    const index = shortcutNum - 1;

    if (index >= 0 && index < tileKeys.length) {
        return tileKeys[index];
    }
    return null;
}

function selectTile(key) {
    selectedTileKey = key;

    // Clear any selected object when selecting a tile (mutual exclusivity)
    if (typeof clearObjectSelection === 'function') {
        clearObjectSelection();
    }

    // Update palette selection (both regular and custom tiles)
    document.querySelectorAll('.tile-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.key === key);
    });

    // Update selected tile info panel
    const infoPanel = document.getElementById('selected-tile-info');

    if (key === '.') {
        infoPanel.classList.remove('visible');
    } else if (isCustomTile(key) && customTiles[key]) {
        // Custom tile selected
        infoPanel.classList.add('visible');

        // Draw preview from custom tile
        const previewCanvas = document.getElementById('selected-tile-preview');
        const pctx = previewCanvas.getContext('2d');
        pctx.imageSmoothingEnabled = false;
        pctx.clearRect(0, 0, 48, 48);

        const img = getCustomTileImage(key);
        if (img && img.complete) {
            pctx.drawImage(img, 0, 0, tileSize, tileSize, 0, 0, 48, 48);
        } else if (img) {
            img.onload = () => {
                pctx.drawImage(img, 0, 0, tileSize, tileSize, 0, 0, 48, 48);
            };
        }

        document.getElementById('tile-key-input').value = customTiles[key].name || key;
        document.getElementById('tile-key-input').disabled = true; // Can't change custom tile key directly
        document.getElementById('tile-solid-checkbox').checked = customTiles[key].solid !== false;
    } else if (tiles[key]) {
        // Regular tileset tile selected
        infoPanel.classList.add('visible');

        // Draw preview
        const previewCanvas = document.getElementById('selected-tile-preview');
        const pctx = previewCanvas.getContext('2d');
        pctx.imageSmoothingEnabled = false;
        pctx.clearRect(0, 0, 48, 48);

        if (tilesetImage) {
            pctx.drawImage(tilesetImage, tiles[key].x, tiles[key].y, tileSize, tileSize, 0, 0, 48, 48);
        }

        document.getElementById('tile-key-input').value = key;
        document.getElementById('tile-key-input').disabled = false;
        document.getElementById('tile-solid-checkbox').checked = tiles[key].solid;
    }
}

function updateSelectedTileKey() {
    const newKey = document.getElementById('tile-key-input').value.trim();
    if (!newKey || newKey === selectedTileKey) return;

    if (tiles[newKey] || newKey === '.') {
        showToast('Key already in use!', 'error');
        document.getElementById('tile-key-input').value = selectedTileKey;
        return;
    }

    // Update tile key
    tiles[newKey] = tiles[selectedTileKey];
    delete tiles[selectedTileKey];

    // Update level data
    for (let y = 0; y < level.length; y++) {
        level[y] = level[y].split('').map(c => c === selectedTileKey ? newKey : c).join('');
    }

    selectedTileKey = newKey;
    markDirty();
    renderTilePalette();
    renderTilesetPreview();
    draw();
}

function updateSelectedTileSolid() {
    const isSolid = document.getElementById('tile-solid-checkbox').checked;
    if (isCustomTile(selectedTileKey) && customTiles[selectedTileKey]) {
        customTiles[selectedTileKey].solid = isSolid;
        markDirty();
    } else if (tiles[selectedTileKey]) {
        tiles[selectedTileKey].solid = isSolid;
        markDirty();
    }
}

// ============================================
// CUSTOM TILES PALETTE
// ============================================

function renderCustomTilesPalette() {
    const grid = document.getElementById('custom-tile-grid');
    const emptyMsg = document.getElementById('custom-tiles-empty');
    if (!grid) return;

    // Clear existing tiles (keep empty message)
    const existingTiles = grid.querySelectorAll('.custom-tile-item');
    existingTiles.forEach(el => el.remove());

    const customTileKeys = Object.keys(customTiles);

    // Show/hide empty message
    if (emptyMsg) {
        emptyMsg.style.display = customTileKeys.length === 0 ? 'block' : 'none';
    }

    // Render each custom tile
    customTileKeys.forEach((key, index) => {
        const tile = customTiles[key];
        const div = document.createElement('div');
        div.className = 'tile-item custom-tile-item';
        div.dataset.key = key;
        if (selectedTileKey === key) {
            div.classList.add('selected');
        }

        // Create mini canvas for preview
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = tileSize;
        miniCanvas.height = tileSize;
        miniCanvas.style.imageRendering = 'pixelated';
        const mctx = miniCanvas.getContext('2d');
        mctx.imageSmoothingEnabled = false;

        // Draw from cached image or load from data URL
        const img = getCustomTileImage(key);
        if (img && img.complete) {
            mctx.drawImage(img, 0, 0, tileSize, tileSize);
        } else if (img) {
            img.onload = () => {
                mctx.drawImage(img, 0, 0, tileSize, tileSize);
            };
        }

        div.appendChild(miniCanvas);

        // Set tooltip to show tile name on hover
        div.title = tile.name || 'Custom Tile';

        // Click to select
        div.onclick = (e) => {
            if (!e.target.closest('.custom-tile-actions')) {
                selectTile(key);
            }
        };

        // Hover actions (edit/delete)
        const actions = document.createElement('div');
        actions.className = 'custom-tile-actions';
        actions.innerHTML = `
            <button onclick="openPixelEditor('${key}')" title="Edit">✏️</button>
            <button onclick="deleteCustomTile('${key}')" title="Delete">🗑️</button>
        `;
        div.appendChild(actions);

        grid.appendChild(div);
    });
}

function deleteCustomTile(key) {
    if (!customTiles[key]) return;

    const tileName = customTiles[key].name || key;

    // Count usage in current level
    let usageCount = 0;
    for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[y].length; x++) {
            if (level[y][x] === key) usageCount++;
        }
    }

    // Count usage in other levels
    let totalUsage = usageCount;
    for (let i = 0; i < levels.length; i++) {
        if (i === currentLevelIndex) continue;
        const lvl = levels[i];
        if (lvl.tiles) {
            for (let y = 0; y < lvl.tiles.length; y++) {
                for (let x = 0; x < lvl.tiles[y].length; x++) {
                    if (lvl.tiles[y][x] === key) totalUsage++;
                }
            }
        }
    }

    // Build message
    let message = `Delete custom tile <strong>"${tileName}"</strong>?`;
    if (totalUsage > 0) {
        message += `<div class="warning">⚠️ This tile is used <strong>${totalUsage} time${totalUsage > 1 ? 's' : ''}</strong> in your level${levels.length > 1 ? 's' : ''}. Those tiles will be cleared.</div>`;
    }

    showConfirmModal({
        title: 'Delete Custom Tile',
        message: message,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmStyle: 'danger',
        onConfirm: () => {
            // Remove from current level
            for (let y = 0; y < level.length; y++) {
                level[y] = level[y].split('').map(c => c === key ? '.' : c).join('');
            }

            // Remove from all other levels
            for (let i = 0; i < levels.length; i++) {
                if (i === currentLevelIndex) continue;
                const lvl = levels[i];
                if (lvl.tiles) {
                    for (let y = 0; y < lvl.tiles.length; y++) {
                        lvl.tiles[y] = lvl.tiles[y].split('').map(c => c === key ? '.' : c).join('');
                    }
                }
            }

            // Remove from customTiles
            delete customTiles[key];

            // Remove from cache
            delete customTileImageCache[key];

            // If this was selected, deselect
            if (selectedTileKey === key) {
                selectTile('.');
            }

            markDirty();
            renderCustomTilesPalette();
            draw();
            showToast(`Deleted custom tile "${tileName}"`, 'info');
        }
    });
}
