// ============================================
// VIEW MENU SYNC & UI FEEDBACK
// ============================================
// Extracted from index.php lines 3731-3765
// Handles view checkbox synchronization and pixel scale radio feedback

// Sync view menu checkboxes with hidden checkboxes
function syncViewCheckboxes() {
    const showGrid = document.getElementById('show-grid');
    const showBg = document.getElementById('show-bg');
    const showObjects = document.getElementById('show-objects');
    const menuGrid = document.getElementById('menu-show-grid');
    const menuBg = document.getElementById('menu-show-bg');
    const menuObjects = document.getElementById('menu-show-objects');

    if (menuGrid && showGrid) menuGrid.checked = showGrid.checked;
    if (menuBg && showBg) menuBg.checked = showBg.checked;
    if (menuObjects && showObjects) menuObjects.checked = showObjects.checked;
}

// Sync on page load
document.addEventListener('DOMContentLoaded', syncViewCheckboxes);

// Visual feedback for pixel scale radio buttons
document.addEventListener('change', function(e) {
    if (e.target.name === 'pixel-scale') {
        // Remove highlight from all labels
        document.querySelectorAll('input[name="pixel-scale"]').forEach(radio => {
            const label = radio.closest('label');
            if (label) {
                if (radio.checked) {
                    label.style.border = '2px solid #667eea';
                    label.style.background = 'rgba(102, 126, 234, 0.15)';
                } else {
                    label.style.border = '1px solid transparent';
                    label.style.background = 'rgba(0, 0, 0, 0.2)';
                }
            }
        });
    }
});
