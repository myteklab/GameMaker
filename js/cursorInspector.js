// ============================================
// CURSOR INSPECTOR
// ============================================

function updateCursorInspector(tileX, tileY) {
    // Cursor inspector elements are optional (not used in GameMaker)
    const posEl = document.getElementById('inspect-position');
    if (!posEl) return; // Skip if inspector panel doesn't exist

    const keyEl = document.getElementById('inspect-key');
    const infoEl = document.getElementById('inspect-info');
    const indexEl = document.getElementById('inspect-index');

    if (tileX < 0 || tileY < 0 || tileX >= levelWidth || tileY >= levelHeight) {
        if (posEl) posEl.textContent = '-';
        if (keyEl) keyEl.textContent = '-';
        if (infoEl) infoEl.textContent = '-';
        if (indexEl) indexEl.textContent = '-';
        return;
    }

    const char = getTileAt(tileX, tileY);
    const tile = tiles[char];

    if (posEl) posEl.textContent = `(${tileX}, ${tileY})`;
    if (keyEl) keyEl.innerHTML = char === '.' ?
        '<span class="empty">. (empty)</span>' :
        `"<span style="color: #e94560;">${char}</span>"`;

    if (infoEl) {
        if (char === '.') {
            infoEl.innerHTML = '<span class="empty">No tile</span>';
        } else if (tile) {
            infoEl.textContent = `${tile.solid ? 'Solid' : 'Non-solid'} @ row ${Math.floor(tile.y / tileSize)}, col ${Math.floor(tile.x / tileSize)}`;
        } else {
            infoEl.innerHTML = '<span class="empty">Unknown tile</span>';
        }
    }

    if (indexEl) indexEl.textContent = `level[${tileY}][${tileX}]`;
}
