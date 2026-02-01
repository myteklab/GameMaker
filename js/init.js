// ============================================
// INITIALIZATION
// ============================================
// Note: PHP variables (projectId, projectName, loginId, INITIAL_DATA, URL_*)

function init() {
    // Apply URL parameters for level size before initializing
    if (URL_WIDTH && URL_WIDTH >= 10 && URL_WIDTH <= 500) {
        levelWidth = URL_WIDTH;
    }
    if (URL_HEIGHT && URL_HEIGHT >= 5 && URL_HEIGHT <= 100) {
        levelHeight = URL_HEIGHT;
    }

    initLevel();
    resizeCanvas();
    setupEventListeners();
    initScrollbars();
    draw();
    updateLiveDataPreview();

    // Load initial project if exists
    if (INITIAL_DATA) {
        try {
            const data = JSON.parse(INITIAL_DATA);
            loadProjectData(data);
        } catch (e) {
            console.error('Failed to load project:', e);
        }
    } else {
        // Initialize levels system for new project
        initLevels();

        // Check for tileset URL parameter
        if (URL_TILESET) {
            loadTilesetFromURL(URL_TILESET, URL_TILESIZE);
        }

        // Load background layers from URL parameters
        if (URL_BACKGROUNDS && URL_BACKGROUNDS.length > 0 && backgroundLayers.length === 0) {
            backgroundLayers = URL_BACKGROUNDS.map(bg => ({ ...bg }));
            renderBackgroundLayers();
            loadBackgroundImages();
            showToast(`Loaded ${backgroundLayers.length} background layer(s) from URL`);
        }
    }

    // Auto-save every 60 seconds for existing projects
    setInterval(function() {
        if (projectId && hasUnsavedChanges) {
            saveProjectSilent();
        }
    }, 60000);

    // Warn about unsaved changes when leaving
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Leave anyway?';
            return e.returnValue;
        }
    });

    // Auto-focus for keyboard shortcuts to work immediately
    setupAutoFocus();
}

// Make keyboard shortcuts work without requiring a click first
function setupAutoFocus() {
    // Make body focusable
    document.body.tabIndex = -1;

    // Focus on load (with slight delay to ensure iframe is ready)
    setTimeout(function() {
        window.focus();
        document.body.focus();
    }, 100);

    // Focus when mouse enters the page
    document.addEventListener('mouseenter', function() {
        // Only focus if not in an input field
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
            window.focus();
        }
    });

    // Focus when mouse moves over canvas (main work area)
    if (container) {
        container.addEventListener('mouseenter', function() {
            const tag = document.activeElement.tagName.toLowerCase();
            if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
                window.focus();
            }
        });
    }
}

function initLevel() {
    level = [];
    for (let y = 0; y < levelHeight; y++) {
        level.push('.'.repeat(levelWidth));
    }
    updateLevelSizeDisplay();
}

function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();
    if (typeof updateScrollbars === 'function') {
        updateScrollbars();
    }
}

// Start the application when page loads
window.addEventListener('load', init);
