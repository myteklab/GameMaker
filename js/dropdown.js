// ============================================
// DROPDOWN MENU FUNCTIONALITY
// ============================================
// Handles dropdown menu toggle, close, and keyboard navigation

// Toggle dropdown menu visibility
function toggleDropdown(menuId) {
    const menu = document.getElementById(menuId);
    const wasOpen = menu.classList.contains('show');

    // Close all dropdowns first
    closeAllDropdowns();

    // If it wasn't open, open it
    if (!wasOpen) {
        menu.classList.add('show');
        // Mark toggle button as active
        menu.parentElement.querySelector('.dropdown-toggle').classList.add('active');
    }
}

// Close all dropdown menus
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.classList.remove('active');
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
        closeAllDropdowns();
    }
});

// Close dropdowns on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllDropdowns();
    }
});
