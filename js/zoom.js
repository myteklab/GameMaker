// ============================================
// ZOOM - Zoom Controls
// ============================================

function zoomIn() {
    zoom = Math.min(5, zoom + 0.25);
    document.getElementById('zoom-display').textContent = Math.round(zoom * 100) + '%';
    clampCamera();
    draw();
}

function zoomOut() {
    zoom = Math.max(0.25, zoom - 0.25);
    document.getElementById('zoom-display').textContent = Math.round(zoom * 100) + '%';
    clampCamera();
    draw();
}
