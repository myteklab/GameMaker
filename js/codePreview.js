/**
 * Code Preview Panel - Educational code display for GameMaker
 *
 * This module manages the bottom panel that shows context-aware code snippets
 * as students build their games visually. It helps bridge the gap between
 * visual game building and understanding the underlying code.
 */

const CodePreview = {
    // Configuration
    MIN_HEIGHT: 100,
    MAX_HEIGHT: 400,
    DEFAULT_HEIGHT: 200,
    STORAGE_KEY: 'gamemaker_code_panel_height',
    STORAGE_KEY_COLLAPSED: 'gamemaker_code_panel_collapsed',

    // State
    currentContext: 'idle',
    currentHeight: 200,
    isCollapsed: true,
    isResizing: false,
    startY: 0,
    startHeight: 0,
    promptTimeout: null,

    /**
     * Initialize the code preview panel
     */
    init: function() {
        const panel = document.getElementById('code-preview-panel');
        const handle = document.getElementById('code-panel-handle');

        if (!panel || !handle) {
            console.warn('Code Preview: Panel elements not found');
            return;
        }

        // Load saved state
        this.loadState();

        // Set initial height if not collapsed
        if (!this.isCollapsed) {
            panel.style.height = this.currentHeight + 'px';
            panel.classList.remove('collapsed');
        }

        // Setup resize handle
        handle.addEventListener('mousedown', (e) => this.startResize(e));
        document.addEventListener('mousemove', (e) => this.doResize(e));
        document.addEventListener('mouseup', () => this.stopResize());

        // Prevent text selection during resize
        handle.addEventListener('selectstart', (e) => e.preventDefault());

        console.log('Code Preview: Initialized');
    },

    /**
     * Load saved panel state from localStorage
     */
    loadState: function() {
        const savedHeight = localStorage.getItem(this.STORAGE_KEY);
        const savedCollapsed = localStorage.getItem(this.STORAGE_KEY_COLLAPSED);

        if (savedHeight) {
            const height = parseInt(savedHeight);
            if (height >= this.MIN_HEIGHT && height <= this.MAX_HEIGHT) {
                this.currentHeight = height;
            }
        }

        // Default to collapsed for new users
        if (savedCollapsed === null) {
            this.isCollapsed = true;
        } else {
            this.isCollapsed = savedCollapsed === 'true';
        }
    },

    /**
     * Save panel state to localStorage
     */
    saveState: function() {
        localStorage.setItem(this.STORAGE_KEY, this.currentHeight);
        localStorage.setItem(this.STORAGE_KEY_COLLAPSED, this.isCollapsed);
    },

    /**
     * Toggle panel collapsed/expanded state
     */
    toggle: function() {
        const panel = document.getElementById('code-preview-panel');
        if (!panel) return;

        this.isCollapsed = !this.isCollapsed;

        if (this.isCollapsed) {
            panel.classList.add('collapsed');
            panel.style.height = '';
        } else {
            panel.classList.remove('collapsed');
            panel.style.height = this.currentHeight + 'px';
        }

        this.saveState();

        // Trigger canvas resize
        if (typeof resizeCanvas === 'function') {
            setTimeout(resizeCanvas, 350); // Wait for transition
        }
    },

    /**
     * Start resizing the panel
     */
    startResize: function(e) {
        if (this.isCollapsed) return;

        this.isResizing = true;
        this.startY = e.clientY;
        this.startHeight = this.currentHeight;

        document.body.classList.add('resizing-panels');
        document.getElementById('code-panel-handle').classList.add('resizing');
    },

    /**
     * Handle resize movement
     */
    doResize: function(e) {
        if (!this.isResizing) return;

        const deltaY = this.startY - e.clientY; // Inverted because dragging up increases height
        let newHeight = this.startHeight + deltaY;

        // Clamp to min/max
        newHeight = Math.max(this.MIN_HEIGHT, Math.min(this.MAX_HEIGHT, newHeight));

        this.currentHeight = newHeight;

        const panel = document.getElementById('code-preview-panel');
        if (panel) {
            panel.style.height = newHeight + 'px';
        }

        // Trigger canvas resize during drag for smooth feedback
        if (typeof resizeCanvas === 'function') {
            resizeCanvas();
        }
    },

    /**
     * Stop resizing
     */
    stopResize: function() {
        if (!this.isResizing) return;

        this.isResizing = false;
        document.body.classList.remove('resizing-panels');
        document.getElementById('code-panel-handle')?.classList.remove('resizing');

        this.saveState();
    },

    /**
     * Set the current context and update display
     * @param {string} context - The context type (physics, enemy, collectible, etc.)
     * @param {object} data - Optional data to pass to the snippet generator
     */
    setContext: function(context, data = {}) {
        // Always update, even if same context (values may have changed)
        this.currentContext = context;
        this.updateDisplay(context, data);
        this.hideEditPrompt();
    },

    /**
     * Update the display with the appropriate code snippet
     */
    updateDisplay: function(context, data) {
        const titleEl = document.getElementById('code-context-title');
        const codeEl = document.getElementById('code-snippet-display');

        if (!titleEl || !codeEl) return;

        // Check if CodeSnippets is available
        if (typeof CodeSnippets === 'undefined') {
            console.warn('Code Preview: CodeSnippets not loaded');
            return;
        }

        const snippet = CodeSnippets[context];
        if (!snippet) {
            console.warn('Code Preview: Unknown context:', context);
            return;
        }

        // Update title
        titleEl.innerHTML = `<strong>${snippet.title}</strong> - ${snippet.description}`;

        // Generate and display code
        const code = snippet.getCode(data);
        codeEl.innerHTML = this.highlightSyntax(code);
    },

    /**
     * Apply syntax highlighting to code
     */
    highlightSyntax: function(code) {
        // Escape HTML first
        let html = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Apply highlighting in order (comments last to not break other patterns)

        // Strings (single and double quotes)
        html = html.replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g,
            '<span class="code-string">$1</span>');

        // Keywords
        html = html.replace(/\b(if|else|function|var|let|const|return|true|false|null|undefined|this|new|for|while|break|continue|switch|case|default)\b/g,
            '<span class="code-keyword">$1</span>');

        // Numbers (including decimals and negatives)
        html = html.replace(/\b(-?\d+\.?\d*)\b/g,
            '<span class="code-number">$1</span>');

        // Properties (word followed by colon or after dot)
        html = html.replace(/\.(\w+)/g, '.<span class="code-property">$1</span>');

        // User values marker [YOUR:value]
        html = html.replace(/\[YOUR:([^\]]+)\]/g,
            '<span class="code-user-value">$1</span>');

        // Comments (must be last to not interfere with other patterns)
        html = html.replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>');

        return html;
    },

    /**
     * Show the edit prompt when user clicks on code
     */
    showEditPrompt: function() {
        const prompt = document.getElementById('code-edit-prompt');
        if (!prompt) return;

        prompt.style.display = 'flex';

        // Clear existing timeout
        if (this.promptTimeout) {
            clearTimeout(this.promptTimeout);
        }

        // Auto-hide after 5 seconds
        this.promptTimeout = setTimeout(() => {
            this.hideEditPrompt();
        }, 5000);
    },

    /**
     * Hide the edit prompt
     */
    hideEditPrompt: function() {
        const prompt = document.getElementById('code-edit-prompt');
        if (prompt) {
            prompt.style.display = 'none';
        }
        if (this.promptTimeout) {
            clearTimeout(this.promptTimeout);
            this.promptTimeout = null;
        }
    },

    /**
     * Expand the panel if collapsed (convenience method)
     */
    expand: function() {
        if (this.isCollapsed) {
            this.toggle();
        }
    },

    /**
     * Collapse the panel if expanded (convenience method)
     */
    collapse: function() {
        if (!this.isCollapsed) {
            this.toggle();
        }
    }
};

// Global functions for onclick handlers
function toggleCodePanel() {
    CodePreview.toggle();
}

function showCodeEditPrompt() {
    CodePreview.showEditPrompt();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CodePreview.init());
} else {
    // DOM already loaded
    CodePreview.init();
}
