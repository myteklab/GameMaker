// ============================================
// RESIZABLE PANELS
// ============================================
// Allows left and right sidebars to be resized by dragging

const PanelResize = {
    MIN_LEFT_WIDTH: 200,
    MAX_LEFT_WIDTH: 450,
    MIN_RIGHT_WIDTH: 180,
    MAX_RIGHT_WIDTH: 400,
    STORAGE_KEY_LEFT: 'gamemaker_left_panel_width',
    STORAGE_KEY_RIGHT: 'gamemaker_right_panel_width',

    isResizing: false,
    currentPanel: null,
    startX: 0,
    startWidth: 0,

    init: function() {
        const leftHandle = document.getElementById('left-panel-handle');
        const rightHandle = document.getElementById('right-panel-handle');

        if (leftHandle) {
            leftHandle.addEventListener('mousedown', (e) => this.startResize(e, 'left'), false);
        }

        if (rightHandle) {
            rightHandle.addEventListener('mousedown', (e) => this.startResize(e, 'right'), false);
        }

        // Global mouse events
        document.addEventListener('mousemove', (e) => this.doResize(e), false);
        document.addEventListener('mouseup', (e) => this.stopResize(e), false);

        // Load saved sizes
        this.loadPanelSizes();
    },

    startResize: function(e, panel) {
        e.preventDefault();
        e.stopPropagation();

        this.isResizing = true;
        this.currentPanel = panel;
        this.startX = e.clientX;

        if (panel === 'left') {
            this.startWidth = document.getElementById('sidebar').offsetWidth;
            document.getElementById('left-panel-handle').classList.add('resizing');
        } else {
            this.startWidth = document.getElementById('right-sidebar').offsetWidth;
            document.getElementById('right-panel-handle').classList.add('resizing');
        }

        document.body.classList.add('resizing-panels');
        document.body.style.cursor = 'ew-resize';

        // Prevent text selection during drag
        document.addEventListener('selectstart', this.preventSelect, false);
    },

    preventSelect: function(e) {
        e.preventDefault();
        return false;
    },

    doResize: function(e) {
        if (!this.isResizing) return;

        e.preventDefault();

        const deltaX = e.clientX - this.startX;

        if (this.currentPanel === 'left') {
            // Left panel: dragging right increases width
            const newWidth = Math.max(this.MIN_LEFT_WIDTH, Math.min(this.MAX_LEFT_WIDTH, this.startWidth + deltaX));
            document.getElementById('sidebar').style.width = newWidth + 'px';
            localStorage.setItem(this.STORAGE_KEY_LEFT, newWidth);
        } else {
            // Right panel: dragging left increases width
            const newWidth = Math.max(this.MIN_RIGHT_WIDTH, Math.min(this.MAX_RIGHT_WIDTH, this.startWidth - deltaX));
            document.getElementById('right-sidebar').style.width = newWidth + 'px';
            localStorage.setItem(this.STORAGE_KEY_RIGHT, newWidth);
        }

        // Trigger canvas resize
        if (typeof resizeCanvas === 'function') {
            resizeCanvas();
        }
    },

    stopResize: function(e) {
        if (!this.isResizing) return;

        this.isResizing = false;

        document.getElementById('left-panel-handle')?.classList.remove('resizing');
        document.getElementById('right-panel-handle')?.classList.remove('resizing');
        document.body.classList.remove('resizing-panels');
        document.body.style.cursor = '';

        // Remove selectstart prevention
        document.removeEventListener('selectstart', this.preventSelect, false);

        this.currentPanel = null;

        // Final canvas resize
        if (typeof resizeCanvas === 'function') {
            resizeCanvas();
        }
    },

    loadPanelSizes: function() {
        const savedLeftWidth = localStorage.getItem(this.STORAGE_KEY_LEFT);
        const savedRightWidth = localStorage.getItem(this.STORAGE_KEY_RIGHT);

        if (savedLeftWidth) {
            const width = parseInt(savedLeftWidth);
            if (width >= this.MIN_LEFT_WIDTH && width <= this.MAX_LEFT_WIDTH) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.style.width = width + 'px';
            }
        }

        if (savedRightWidth) {
            const width = parseInt(savedRightWidth);
            if (width >= this.MIN_RIGHT_WIDTH && width <= this.MAX_RIGHT_WIDTH) {
                const rightSidebar = document.getElementById('right-sidebar');
                if (rightSidebar) rightSidebar.style.width = width + 'px';
            }
        }
    }
};

// Initialize when DOM is ready - but since scripts are at bottom, DOM should be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PanelResize.init());
} else {
    // Small delay to ensure elements are rendered
    setTimeout(() => PanelResize.init(), 0);
}
