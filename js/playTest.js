// ============================================
// PLAY TEST MODE
// ============================================
// Extracted from index.php lines 6119-6162

// Toggle play test modal with Escape key
function togglePlayTestModal() {
    const modal = document.getElementById('playtest-modal');
    if (modal.classList.contains('visible')) {
        closePlayTestModal();
    } else {
        showPlayTestModal();
    }
}

// Check if play test modal is open
function isPlayTestModalOpen() {
    const modal = document.getElementById('playtest-modal');
    return modal && modal.classList.contains('visible');
}

// Listen for Escape key to toggle play test
document.addEventListener('keydown', function(e) {
    // Only handle Escape key
    if (e.key !== 'Escape') return;

    // Check if we're typing in an input field
    const tag = document.activeElement.tagName.toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea';

    // Check if any other modal is open (not play test)
    const otherModals = document.querySelectorAll('.modal-overlay.visible:not(#playtest-modal)');
    if (otherModals.length > 0) {
        // Close the other modal instead
        return;
    }

    // Toggle play test modal if not typing
    if (!isTyping) {
        e.preventDefault();
        togglePlayTestModal();
    }
});

// Listen for messages from iframe (for Escape key when game has focus)
window.addEventListener('message', function(e) {
    if (e.data && e.data.action === 'closePlayTest') {
        if (isPlayTestModalOpen()) {
            closePlayTestModal();
        }
    }
});

function showPlayTestModal() {
    const modal = document.getElementById('playtest-modal');
    modal.classList.add('visible');

    // Stop background animations to prevent resource contention with game iframe
    // This fixes lag that occurs when testing after making player property changes
    if (typeof stopPlayerSpriteAnimation === 'function') {
        stopPlayerSpriteAnimation();
    }
    if (typeof stopPulseAnimation === 'function') {
        stopPulseAnimation();
    }
    // Clear any selected object to stop the pulse animation from restarting
    if (typeof selectedMoveObject !== 'undefined') {
        selectedMoveObject = null;
    }

    // Update shoot controls display based on projectile settings
    const shootPlaceholder = document.getElementById('shoot-controls-placeholder');
    if (shootPlaceholder) {
        if (gameSettings.projectileEnabled) {
            const keyName = formatFireKey(gameSettings.projectileFireKey);
            shootPlaceholder.innerHTML = `<span class="control-sep">|</span><span class="key-badge">${keyName}</span> Shoot`;
        } else {
            shootPlaceholder.innerHTML = '';
        }
    }

    // Generate and load the game
    loadGamePreview();
}

// Store blob URL for cleanup
let currentBlobUrl = null;

function closePlayTestModal() {
    document.getElementById('playtest-modal').classList.remove('visible');
    // Clear iframe and revoke blob URL
    const iframe = document.getElementById('game-preview-frame');
    iframe.src = 'about:blank';
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }
}

function restartGame() {
    loadGamePreview();
}

function loadGamePreview() {
    // Sync current level data to levels array before generating
    syncToCurrentLevel();

    const iframe = document.getElementById('game-preview-frame');
    const pixelScaleRadio = document.querySelector('input[name="pixel-scale"]:checked');
    const pixelScale = pixelScaleRadio ? parseInt(pixelScaleRadio.value) : 1;
    const gameHTML = generateGameHTML(false, pixelScale);

    // Clean up previous blob URL
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
    }

    // Use Blob URL instead of srcdoc to avoid iframe rendering issues
    const blob = new Blob([gameHTML], { type: 'text/html' });
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.src = currentBlobUrl;

    // Auto-focus iframe after it loads so keyboard controls work immediately
    iframe.onload = function() {
        iframe.focus();
        let statusText = 'Use arrow keys or WASD to move, Space to jump';
        if (gameSettings.projectileEnabled) {
            statusText += ', ' + formatFireKey(gameSettings.projectileFireKey) + ' to shoot';
        }
        statusText += '!';
        document.getElementById('game-status-text').textContent = statusText;
    };
}

function exportFullGame() {
    // Close playtest modal first, then open export modal with platformer format
    closePlayTestModal();
    showExportModal();
    setExportFormat('platformer');
}

// Debug: Open game in new tab to test if iframe is causing the issue
function openGameInNewTab() {
    // Sync current level data to levels array before generating
    syncToCurrentLevel();

    const pixelScaleRadio = document.querySelector('input[name="pixel-scale"]:checked');
    const pixelScale = pixelScaleRadio ? parseInt(pixelScaleRadio.value) : 1;
    const gameHTML = generateGameHTML(false, pixelScale);
    const blob = new Blob([gameHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}
