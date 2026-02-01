// ============================================
// TILES PANEL RESIZE
// ============================================
// Allows resizing the custom tiles section in the sidebar

(function() {
    const STORAGE_KEY = 'gamemaker_custom_tiles_height';
    const MIN_TILES_HEIGHT = 100;
    const MIN_CUSTOM_HEIGHT = 80;
    const DEFAULT_CUSTOM_HEIGHT = 150;

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    function initTilesPanelResize() {
        const handle = document.getElementById('tiles-resize-handle');
        const tilesContainer = document.getElementById('tiles-container');
        const customSection = document.getElementById('custom-tiles-section');
        const tilePalette = document.getElementById('tile-palette');

        if (!handle || !tilesContainer || !customSection || !tilePalette) return;

        // Load saved height
        const savedHeight = localStorage.getItem(STORAGE_KEY);
        if (savedHeight) {
            customSection.style.height = savedHeight + 'px';
            customSection.style.flex = 'none';
        } else {
            customSection.style.height = DEFAULT_CUSTOM_HEIGHT + 'px';
            customSection.style.flex = 'none';
        }

        // Mouse down on handle
        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            isResizing = true;
            startY = e.clientY;
            startHeight = customSection.offsetHeight;
            handle.classList.add('resizing');
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        });

        // Mouse move
        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;

            const containerRect = tilesContainer.getBoundingClientRect();
            const deltaY = startY - e.clientY; // Inverted because dragging up increases custom section
            let newHeight = startHeight + deltaY;

            // Calculate available space
            const totalHeight = tilesContainer.offsetHeight - handle.offsetHeight;
            const maxCustomHeight = totalHeight - MIN_TILES_HEIGHT;

            // Clamp height
            newHeight = Math.max(MIN_CUSTOM_HEIGHT, Math.min(newHeight, maxCustomHeight));

            customSection.style.height = newHeight + 'px';
            localStorage.setItem(STORAGE_KEY, newHeight);
        });

        // Mouse up
        document.addEventListener('mouseup', function() {
            if (isResizing) {
                isResizing = false;
                handle.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', initTilesPanelResize);
})();
