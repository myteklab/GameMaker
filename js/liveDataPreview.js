// ============================================
// LIVE DATA PREVIEW
// ============================================

function updateLiveDataPreview() {
    const display = document.getElementById('live-data-display');
    if (!display) return;

    let html = '';

    switch (currentDataFormat) {
        case 'array':
            html = generateArrayPreview();
            break;
        case 'json':
            html = generateJsonPreview();
            break;
        case 'tiles':
            html = generateTilesPreview();
            break;
    }

    display.innerHTML = html;
}

function generateArrayPreview() {
    let html = '<span class="comment">// Level array (each row is a string)</span>\n';
    html += '<span style="color: #c792ea;">const</span> level = [\n';

    level.forEach((row, index) => {
        const highlighted = highlightedRow === index ? ' highlighted' : '';
        html += `<span class="row-line${highlighted}" data-row="${index}" onclick="highlightLevelRow(${index})">`;
        html += `<span class="line-number">${index}</span>`;
        html += `<span style="color: #c3e88d;">"${escapeHtml(row)}"</span>,`;
        html += '</span>\n';
    });

    html += '];';
    return html;
}

function generateJsonPreview() {
    const data = {
        width: levelWidth,
        height: levelHeight,
        tileSize: tileSize,
        tiles: Object.keys(tiles).map(key => ({
            key: key,
            solid: tiles[key].solid,
            row: Math.floor(tiles[key].y / tileSize),
            col: Math.floor(tiles[key].x / tileSize)
        })),
        level: level
    };

    let html = '<span class="comment">// JSON format (portable)</span>\n';
    html += '<span style="color: #f78c6c;">' + JSON.stringify(data, null, 2) + '</span>';
    return html;
}

function generateTilesPreview() {
    let html = '<span class="comment">// Tile definitions</span>\n';
    html += '<span style="color: #c792ea;">const</span> tileTypes = {\n';
    html += '  <span style="color: #c3e88d">\'.\'</span>: <span style="color: #c792ea">null</span>,\n';

    for (const key in tiles) {
        const tile = tiles[key];
        html += `  <span style="color: #c3e88d">'${key}'</span>: { `;
        html += `<span style="color: #82aaff">row</span>: <span style="color: #f78c6c">${Math.floor(tile.y / tileSize)}</span>, `;
        html += `<span style="color: #82aaff">col</span>: <span style="color: #f78c6c">${Math.floor(tile.x / tileSize)}</span>, `;
        html += `<span style="color: #82aaff">solid</span>: <span style="color: #c792ea">${tile.solid}</span> },\n`;
    }

    html += '};';
    return html;
}

function setDataFormat(format) {
    currentDataFormat = format;

    // Update tab buttons
    document.querySelectorAll('.data-format-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase() === format);
    });

    updateLiveDataPreview();
}

// ============================================
// EXPANDED DATA PREVIEW MODAL
// ============================================

function showDataExpandModal() {
    const modal = document.getElementById('data-expand-modal');
    modal.classList.add('visible');

    // Sync the format tabs with current selection
    const tabs = modal.querySelectorAll('.data-format-tab');
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase() === currentDataFormat);
    });

    updateExpandedDataPreview();
}

function closeDataExpandModal() {
    document.getElementById('data-expand-modal').classList.remove('visible');
}

function setExpandedDataFormat(format) {
    currentDataFormat = format;

    // Update tabs in both the sidebar and the modal
    document.querySelectorAll('.data-format-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase() === format);
    });

    updateLiveDataPreview();
    updateExpandedDataPreview();
}

function updateExpandedDataPreview() {
    const display = document.getElementById('expanded-data-display');
    if (!display) return;

    let html = '';

    switch (currentDataFormat) {
        case 'array':
            html = generateExpandedArrayPreview();
            break;
        case 'json':
            html = generateExpandedJsonPreview();
            break;
        case 'tiles':
            html = generateExpandedTilesPreview();
            break;
    }

    display.innerHTML = html;
}

function generateExpandedArrayPreview() {
    let html = '<span class="comment">// Level array (each row is a string)</span>\n';
    html += '<span class="comment">// Click a row to highlight it on the canvas</span>\n\n';
    html += '<span style="color: #c792ea;">const</span> level = [\n';

    level.forEach((row, index) => {
        const highlighted = highlightedRow === index ? ' highlighted' : '';
        html += `<span class="row-line${highlighted}" data-row="${index}" onclick="highlightLevelRow(${index})">`;
        html += `<span class="line-number">${String(index).padStart(3, ' ')}</span>`;
        html += `<span style="color: #c3e88d;">"${escapeHtml(row)}"</span>,`;
        html += '</span>\n';
    });

    html += '];';
    return html;
}

function generateExpandedJsonPreview() {
    const data = {
        width: levelWidth,
        height: levelHeight,
        tileSize: tileSize,
        tiles: Object.keys(tiles).map(key => ({
            key: key,
            solid: tiles[key].solid,
            row: Math.floor(tiles[key].y / tileSize),
            col: Math.floor(tiles[key].x / tileSize)
        })),
        level: level
    };

    let html = '<span class="comment">// JSON format (portable)</span>\n';
    html += '<span class="comment">// Can be parsed with JSON.parse()</span>\n\n';

    // Pretty print with syntax highlighting
    const jsonStr = JSON.stringify(data, null, 2);
    html += '<span style="color: #f78c6c;">' + escapeHtml(jsonStr) + '</span>';
    return html;
}

function generateExpandedTilesPreview() {
    let html = '<span class="comment">// Tile definitions</span>\n';
    html += '<span class="comment">// Maps each character key to tileset coordinates</span>\n\n';
    html += '<span style="color: #c792ea;">const</span> tileTypes = {\n';
    html += '  <span style="color: #c3e88d">\'.\'</span>: <span style="color: #c792ea">null</span>,  <span class="comment">// Empty space</span>\n';

    for (const key in tiles) {
        const tile = tiles[key];
        html += `  <span style="color: #c3e88d">'${key}'</span>: { `;
        html += `<span style="color: #82aaff">row</span>: <span style="color: #f78c6c">${Math.floor(tile.y / tileSize)}</span>, `;
        html += `<span style="color: #82aaff">col</span>: <span style="color: #f78c6c">${Math.floor(tile.x / tileSize)}</span>, `;
        html += `<span style="color: #82aaff">solid</span>: <span style="color: #c792ea">${tile.solid}</span> },`;
        if (tile.name) {
            html += `  <span class="comment">// ${escapeHtml(tile.name)}</span>`;
        }
        html += '\n';
    }

    html += '};';
    return html;
}

function copyExpandedData() {
    let text = '';

    switch (currentDataFormat) {
        case 'array':
            text = 'const level = [\n';
            level.forEach(row => {
                text += `  "${row}",\n`;
            });
            text += '];';
            break;
        case 'json':
            const data = {
                width: levelWidth,
                height: levelHeight,
                tileSize: tileSize,
                tiles: Object.keys(tiles).map(key => ({
                    key: key,
                    solid: tiles[key].solid,
                    row: Math.floor(tiles[key].y / tileSize),
                    col: Math.floor(tiles[key].x / tileSize)
                })),
                level: level
            };
            text = JSON.stringify(data, null, 2);
            break;
        case 'tiles':
            text = 'const tileTypes = {\n';
            text += "  '.': null,\n";
            for (const key in tiles) {
                const tile = tiles[key];
                text += `  '${key}': { row: ${Math.floor(tile.y / tileSize)}, col: ${Math.floor(tile.x / tileSize)}, solid: ${tile.solid} },\n`;
            }
            text += '};';
            break;
    }

    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    }).catch(err => {
        showToast('Failed to copy', 'error');
    });
}

// toggleSection is defined in gameSettings.js for collapsible sections

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightLevelRow(rowIndex) {
    highlightedRow = highlightedRow === rowIndex ? -1 : rowIndex;

    // Update preview
    updateLiveDataPreview();

    // Scroll canvas to show this row
    if (highlightedRow >= 0) {
        cameraY = Math.max(0, highlightedRow * tileSize - canvas.height / zoom / 2);
        clampCamera();
        draw();
    }
}
