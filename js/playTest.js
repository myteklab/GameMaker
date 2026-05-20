// ============================================
// PLAY TEST MODE
// ============================================

// Pull the logged-in platform user's name (display_name preferred, then
// username) for prefilling the multiplayer join modal. Returns '' if not
// available, signed out, or the only available value is email-shaped.
// Hard timeout so a slow / hanging Platform bridge cannot block Play test
// (the bridge default is 30s, which would look like a dead iframe).
async function getPlatformPlayerName() {
    if (typeof Platform === 'undefined' || !Platform.getUserInfo) return '';
    try {
        const info = await Promise.race([
            Platform.getUserInfo(),
            new Promise(res => setTimeout(() => res(null), 1500))
        ]);
        if (!info) return '';
        const looksLikeEmail = (s) => typeof s === 'string' && s.indexOf('@') !== -1;
        let name = '';
        if (info.displayName && !looksLikeEmail(info.displayName)) name = info.displayName;
        else if (info.username && !looksLikeEmail(info.username)) name = info.username;
        else if (info.displayName && looksLikeEmail(info.displayName)) name = info.displayName.split('@')[0];
        else if (info.username && looksLikeEmail(info.username)) name = info.username.split('@')[0];
        return String(name || '').trim().slice(0, 20);
    } catch (e) {
        return '';
    }
}

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

    // If there's an active tile selection, let events.js handle Esc to cancel it
    if (typeof selection !== 'undefined' && selection) {
        return;
    }

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

async function loadGamePreview() {
    // Sync current level data to levels array before generating
    syncToCurrentLevel();

    const iframe = document.getElementById('game-preview-frame');
    // Show an immediate loading state. Without this, students with multiplayer
    // enabled (which forces an async sprite-bundle step) or with a slow
    // platform bridge stare at the iframe's default dark/blank background
    // for several seconds and assume Play is broken.
    iframe.srcdoc = '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#1a1a2e;color:#bbb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px}.spin{width:34px;height:34px;border:3px solid #444;border-top-color:#667eea;border-radius:50%;animation:s 0.8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}</style><div class="spin"></div><div>Loading game...</div>';

    const pixelScaleRadio = document.querySelector('input[name="pixel-scale"]:checked');
    const pixelScale = pixelScaleRadio ? parseInt(pixelScaleRadio.value) : 1;
    let gameHTML = await generateGameHTMLAsync(false, pixelScale);

    // Inject the platform user's name so multiplayer play-test prefills it,
    // matching the /p/ preview behavior. Skipped for downloaded exports.
    const playerName = await getPlatformPlayerName();
    if (playerName) {
        const escaped = playerName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const snippet = '<script>window.MP_DEFAULT_PLAYER_NAME = \'' + escaped + '\';</script>';
        // Drop it right after <head> so it runs before the join modal renders
        gameHTML = gameHTML.replace(/<head>/i, '<head>' + snippet);
    }

    // Clean up previous blob URL
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
    }

    // Use Blob URL instead of srcdoc to avoid iframe rendering issues.
    // Must remove the loading-state srcdoc first — srcdoc takes precedence
    // over src and would silently keep the spinner up forever.
    const blob = new Blob([gameHTML], { type: 'text/html' });
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.removeAttribute('srcdoc');
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

// Generate / fetch the project's public /p/{token} share link, copy it to
// the clipboard, and open it in a new tab. Replaces the old blob-URL
// approach which only worked inside the author's browser.
async function copyOrOpenShareLink() {
    var projectId = window.projectId;
    if (!projectId) {
        showToast('Save the project first to get a share link', 'warning');
        return;
    }
    if (typeof Platform === 'undefined' || !Platform.api) {
        showToast('Share Link only works inside the platform editor', 'warning');
        return;
    }
    showToast('Generating link...', 'info');
    var res;
    try {
        res = await Platform.api('/projects/' + projectId + '/preview-link', { method: 'POST' });
    } catch (e) {
        showToast('Could not generate link: ' + e.message, 'error');
        return;
    }
    if (!res || !res.ok) {
        var msg = (res && res.data && res.data.message) || 'Could not generate link';
        showToast(msg, 'error');
        return;
    }
    var shareUrl = res.data && res.data.data && res.data.data.share_url;
    if (!shareUrl) {
        showToast('Link not available', 'error');
        return;
    }
    try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied: ' + shareUrl, 'success');
    } catch (e) {
        showToast(shareUrl, 'info');
    }
    window.open(shareUrl, '_blank');
}
