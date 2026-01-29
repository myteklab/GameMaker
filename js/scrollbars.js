// ============================================
// SCROLLBARS - Canvas panning scrollbars
// ============================================
// Provides visual scrollbars for panning the level editor
// without requiring a mouse scroll wheel or middle-click

// Scrollbar state
let scrollbarInitialized = false;
let isDraggingHScrollbar = false;
let isDraggingVScrollbar = false;
let scrollbarDragStartX = 0;
let scrollbarDragStartY = 0;
let scrollbarDragCamStartX = 0;
let scrollbarDragCamStartY = 0;

/**
 * Initialize scrollbars - call after DOM is ready
 */
function initScrollbars() {
    const scrollbarH = document.getElementById('scrollbar-horizontal');
    const scrollbarV = document.getElementById('scrollbar-vertical');
    const thumbH = document.getElementById('scrollbar-h-thumb');
    const thumbV = document.getElementById('scrollbar-v-thumb');

    if (!scrollbarH || !scrollbarV || !thumbH || !thumbV) {
        console.warn('Scrollbar elements not found');
        return;
    }

    // Horizontal thumb drag
    thumbH.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingHScrollbar = true;
        scrollbarDragStartX = e.clientX;
        scrollbarDragCamStartX = cameraX;
        thumbH.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    });

    // Vertical thumb drag
    thumbV.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingVScrollbar = true;
        scrollbarDragStartY = e.clientY;
        scrollbarDragCamStartY = cameraY;
        thumbV.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    });

    // Track click for horizontal scrollbar (jump to position)
    scrollbarH.addEventListener('mousedown', function(e) {
        if (e.target === thumbH) return; // Let thumb handle it
        e.preventDefault();
        e.stopPropagation();

        const rect = scrollbarH.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const trackWidth = rect.width;

        const contentWidth = levelWidth * tileSize;
        const viewportWidth = canvas.width / zoom;
        const maxCameraX = Math.max(0, contentWidth - viewportWidth);

        if (maxCameraX > 0 && trackWidth > 0) {
            const ratio = clickX / trackWidth;
            cameraX = ratio * maxCameraX;
            clampCamera();
            draw();
        }
    });

    // Track click for vertical scrollbar (jump to position)
    scrollbarV.addEventListener('mousedown', function(e) {
        if (e.target === thumbV) return; // Let thumb handle it
        e.preventDefault();
        e.stopPropagation();

        const rect = scrollbarV.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const trackHeight = rect.height;

        const contentHeight = levelHeight * tileSize;
        const viewportHeight = canvas.height / zoom;
        const maxCameraY = Math.max(0, contentHeight - viewportHeight);

        if (maxCameraY > 0 && trackHeight > 0) {
            const ratio = clickY / trackHeight;
            cameraY = ratio * maxCameraY;
            clampCamera();
            draw();
        }
    });

    // Global mouse move for dragging
    document.addEventListener('mousemove', function(e) {
        if (!isDraggingHScrollbar && !isDraggingVScrollbar) return;

        if (isDraggingHScrollbar) {
            const scrollbarH = document.getElementById('scrollbar-horizontal');
            const rect = scrollbarH.getBoundingClientRect();
            const trackWidth = rect.width;

            const contentWidth = levelWidth * tileSize;
            const viewportWidth = canvas.width / zoom;
            const maxCameraX = Math.max(0, contentWidth - viewportWidth);

            if (maxCameraX > 0 && trackWidth > 0) {
                const thumbWidth = Math.max(30, (viewportWidth / contentWidth) * trackWidth);
                const scrollableTrack = trackWidth - thumbWidth;

                if (scrollableTrack > 0) {
                    const deltaPixels = e.clientX - scrollbarDragStartX;
                    const deltaCam = (deltaPixels / scrollableTrack) * maxCameraX;
                    cameraX = scrollbarDragCamStartX + deltaCam;
                    clampCamera();
                    draw();
                }
            }
        }

        if (isDraggingVScrollbar) {
            const scrollbarV = document.getElementById('scrollbar-vertical');
            const rect = scrollbarV.getBoundingClientRect();
            const trackHeight = rect.height;

            const contentHeight = levelHeight * tileSize;
            const viewportHeight = canvas.height / zoom;
            const maxCameraY = Math.max(0, contentHeight - viewportHeight);

            if (maxCameraY > 0 && trackHeight > 0) {
                const thumbHeight = Math.max(30, (viewportHeight / contentHeight) * trackHeight);
                const scrollableTrack = trackHeight - thumbHeight;

                if (scrollableTrack > 0) {
                    const deltaPixels = e.clientY - scrollbarDragStartY;
                    const deltaCam = (deltaPixels / scrollableTrack) * maxCameraY;
                    cameraY = scrollbarDragCamStartY + deltaCam;
                    clampCamera();
                    draw();
                }
            }
        }
    });

    // Global mouse up to end drag
    document.addEventListener('mouseup', function(e) {
        if (isDraggingHScrollbar || isDraggingVScrollbar) {
            isDraggingHScrollbar = false;
            isDraggingVScrollbar = false;

            const thumbH = document.getElementById('scrollbar-h-thumb');
            const thumbV = document.getElementById('scrollbar-v-thumb');
            if (thumbH) thumbH.classList.remove('dragging');
            if (thumbV) thumbV.classList.remove('dragging');

            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    scrollbarInitialized = true;

    // Initial update with a small delay to ensure dimensions are calculated
    setTimeout(updateScrollbars, 50);
}

/**
 * Update scrollbar thumb positions and sizes
 * Call this whenever camera, zoom, or level size changes
 */
function updateScrollbars() {
    const scrollbarH = document.getElementById('scrollbar-horizontal');
    const scrollbarV = document.getElementById('scrollbar-vertical');
    const thumbH = document.getElementById('scrollbar-h-thumb');
    const thumbV = document.getElementById('scrollbar-v-thumb');

    if (!scrollbarH || !scrollbarV || !thumbH || !thumbV) return;
    if (!canvas || !levelWidth || !levelHeight) return;

    // Calculate content dimensions
    const contentWidth = levelWidth * tileSize;
    const contentHeight = levelHeight * tileSize;
    const viewportWidth = canvas.width / zoom;
    const viewportHeight = canvas.height / zoom;

    // Horizontal scrollbar
    const maxCameraX = Math.max(0, contentWidth - viewportWidth);

    if (maxCameraX > 0 && contentWidth > 0) {
        // Content wider than viewport - show scrollbar
        scrollbarH.style.display = 'block';
        const hTrackWidth = scrollbarH.offsetWidth;

        if (hTrackWidth > 0) {
            // Calculate thumb size (proportional to viewport/content)
            const thumbWidthRatio = Math.min(1, viewportWidth / contentWidth);
            const thumbWidth = Math.max(30, thumbWidthRatio * hTrackWidth);
            thumbH.style.width = thumbWidth + 'px';

            // Calculate thumb position
            const scrollableTrack = hTrackWidth - thumbWidth;
            const scrollRatio = maxCameraX > 0 ? (cameraX / maxCameraX) : 0;
            const thumbX = scrollRatio * scrollableTrack;
            thumbH.style.left = Math.max(0, Math.min(scrollableTrack, thumbX)) + 'px';
        }
    } else {
        // Content fits - hide scrollbar
        scrollbarH.style.display = 'none';
    }

    // Vertical scrollbar
    const maxCameraY = Math.max(0, contentHeight - viewportHeight);

    if (maxCameraY > 0 && contentHeight > 0) {
        // Content taller than viewport - show scrollbar
        scrollbarV.style.display = 'block';
        const vTrackHeight = scrollbarV.offsetHeight;

        if (vTrackHeight > 0) {
            // Calculate thumb size (proportional to viewport/content)
            const thumbHeightRatio = Math.min(1, viewportHeight / contentHeight);
            const thumbHeight = Math.max(30, thumbHeightRatio * vTrackHeight);
            thumbV.style.height = thumbHeight + 'px';

            // Calculate thumb position
            const scrollableTrack = vTrackHeight - thumbHeight;
            const scrollRatio = maxCameraY > 0 ? (cameraY / maxCameraY) : 0;
            const thumbY = scrollRatio * scrollableTrack;
            thumbV.style.top = Math.max(0, Math.min(scrollableTrack, thumbY)) + 'px';
        }
    } else {
        // Content fits - hide scrollbar
        scrollbarV.style.display = 'none';
    }

    // Hide corner if both scrollbars are hidden
    const corner = document.getElementById('scrollbar-corner');
    if (corner) {
        corner.style.display = (maxCameraX > 0 || maxCameraY > 0) ? 'block' : 'none';
    }
}
