// ============================================
// GAME SETTINGS
// ============================================

// ============================================
// GAME TYPE SYSTEM
// ============================================

// Track pending game type switch for in-modal confirmation
let pendingGameTypeSwitch = null;

function setGameType(type) {
    const oldType = gameSettings.gameType || 'platformer';

    // If same type, do nothing
    if (oldType === type) return;

    // Check for incompatible objects
    if (gameObjects.length > 0) {
        const incompatible = checkIncompatibleObjects(type);
        if (incompatible.length > 0) {
            // Show in-modal confirmation instead of browser confirm()
            showGameTypeConfirmPanel(type, incompatible);
            return;
        }
    }

    // No incompatibilities, switch immediately
    applyGameTypeSwitch(type);
}

function showGameTypeConfirmPanel(type, warnings) {
    pendingGameTypeSwitch = type;

    const panel = document.getElementById('game-type-confirm-panel');
    const targetEl = document.getElementById('game-type-confirm-target');
    const warningsEl = document.getElementById('game-type-confirm-warnings');

    if (!panel || !targetEl || !warningsEl) return;

    // Set the target mode text
    const modeName = type === 'topdown' ? 'Top-Down RPG' : 'Platformer';
    targetEl.textContent = `You are about to switch to ${modeName} mode.`;

    // Set the warnings
    warningsEl.innerHTML = '<div style="margin-bottom: 6px; color: #ccc;">The following will be affected:</div>' +
        warnings.map(w => `<div>${w}</div>`).join('');

    // Show the panel with animation
    panel.style.display = 'block';

    // Re-trigger animation
    panel.style.animation = 'none';
    panel.offsetHeight; // Force reflow
    panel.style.animation = 'confirmPanelFadeIn 0.2s ease-out';
}

function cancelGameTypeSwitch() {
    pendingGameTypeSwitch = null;
    const panel = document.getElementById('game-type-confirm-panel');
    if (panel) panel.style.display = 'none';
}

function confirmGameTypeSwitch() {
    if (pendingGameTypeSwitch) {
        const type = pendingGameTypeSwitch;
        pendingGameTypeSwitch = null;

        // Hide the panel
        const panel = document.getElementById('game-type-confirm-panel');
        if (panel) panel.style.display = 'none';

        // Apply the switch
        applyGameTypeSwitch(type);
    }
}

function applyGameTypeSwitch(type) {
    gameSettings.gameType = type;
    updateGameTypeUI();
    markDirty();
    showToast(`Switched to ${type === 'topdown' ? 'Top-Down RPG' : 'Platformer'} mode`, 'success');
}

function checkIncompatibleObjects(newType) {
    const incompatible = [];
    if (newType === 'topdown') {
        // Springs become speed boosts (info, not warning)
        const springs = gameObjects.filter(o => o.type === 'spring').length;
        if (springs > 0) incompatible.push(`• ${springs} Spring(s) will become Speed Boosts`);

        // Enemies with 'jump' behavior won't work correctly
        const jumpEnemies = gameObjects.filter(o => {
            if (o.type !== 'enemy') return false;
            const t = enemyTemplates.find(t => t.id === o.templateId);
            return t && t.behavior === 'jump';
        }).length;
        if (jumpEnemies > 0) incompatible.push(`• ${jumpEnemies} Jumping enemy(ies) will pace instead`);
    } else if (newType === 'platformer') {
        // NPCs don't exist in platformer mode
        const npcs = gameObjects.filter(o => o.type === 'npc').length;
        if (npcs > 0) incompatible.push(`• ${npcs} NPC(s) will be hidden (no dialogue in platformer)`);

        // Doors don't exist in platformer mode
        const doors = gameObjects.filter(o => o.type === 'door').length;
        if (doors > 0) incompatible.push(`• ${doors} Door(s) will be hidden`);
    }
    return incompatible;
}

function updateGameTypeUI() {
    const type = gameSettings.gameType || 'platformer';
    const isPlatformer = type === 'platformer';
    const isTopdown = type === 'topdown';

    // Update game type buttons
    const platformerBtn = document.getElementById('game-type-platformer');
    const topdownBtn = document.getElementById('game-type-topdown');
    if (platformerBtn) platformerBtn.classList.toggle('active', isPlatformer);
    if (topdownBtn) topdownBtn.classList.toggle('active', isTopdown);

    // Update description
    const desc = document.getElementById('game-type-description');
    if (desc) {
        desc.textContent = isPlatformer
            ? 'Side-scrolling platformer with gravity, jumping, and physics.'
            : 'Top-down adventure with 8-direction movement, NPCs, and dialogue.';
    }

    // Show/hide platformer-specific settings
    document.querySelectorAll('.platformer-only').forEach(el => {
        if (isPlatformer) {
            // Restore proper display type (grid for preset grids, block for others)
            el.style.display = el.classList.contains('preset-grid') ? 'grid' : '';
        } else {
            el.style.display = 'none';
        }
    });

    // Show/hide topdown-specific settings
    document.querySelectorAll('.topdown-only').forEach(el => {
        if (isTopdown) {
            // Restore proper display type (grid for preset grids, block for others)
            el.style.display = el.classList.contains('preset-grid') ? 'grid' : '';
        } else {
            el.style.display = 'none';
        }
    });

    // Update Objects toolbar
    updateObjectsToolbarForGameType();

    // Update sidebar summary
    const summaryType = document.getElementById('summary-game-type');
    if (summaryType) {
        summaryType.textContent = isPlatformer ? 'Platformer' : 'Top-Down';
    }
}

function updateObjectsToolbarForGameType() {
    const isTopdown = (gameSettings.gameType === 'topdown');

    // Update spring button label
    const springBtn = document.getElementById('btn-spring');
    if (springBtn) {
        const label = springBtn.querySelector('.object-label');
        if (label) {
            label.textContent = isTopdown ? 'Boost' : 'Spring';
        }
    }

    // Show/hide game-type specific buttons in Objects toolbar
    document.querySelectorAll('#objects-toolbar .platformer-only').forEach(el => {
        el.style.display = isTopdown ? 'none' : '';
    });
    document.querySelectorAll('#objects-toolbar .topdown-only').forEach(el => {
        el.style.display = isTopdown ? '' : 'none';
    });
}

function updateGameSetting(key, value) {
    // Handle nested sound properties (e.g., 'sounds.shoot')
    if (key.startsWith('sounds.')) {
        const soundKey = key.split('.')[1];
        if (!gameSettings.sounds) gameSettings.sounds = {};
        gameSettings.sounds[soundKey] = value;
    }
    // String values (colors, URLs, modes)
    else if (key === 'playerColor' || key === 'playerSpriteURL' ||
             key === 'projectileColor' || key === 'projectileSpriteURL' ||
             key === 'projectileFireKey' || key === 'projectileMode' ||
             key === 'jumpMode' || key === 'playerIdleEffect') {
        gameSettings[key] = value;
    }
    // Boolean values
    else if (key === 'projectileEnabled' || key === 'enableMobileControls' ||
             key === 'screenShakeEnabled' || key === 'vibrationEnabled' ||
             key === 'hitPauseEnabled' || key === 'squashStretchEnabled' ||
             key === 'projectileCollectsItems' || key === 'saveRPGProgress' ||
             key === 'multiplayerEnabled' || key === 'multiplayerShowChat' ||
             key === 'multiplayerSyncItems' || key === 'multiplayerSyncEnemies' ||
             key === 'multiplayerPvPEnabled' || key === 'multiplayerAllowCustomSprites' ||
             key === 'cheatsEnabled' || key === 'cheatFeedbackEnabled' ||
             key === 'runTimerEnabled' || key === 'particleEffectsEnabled') {
        gameSettings[key] = value === true || value === 'true';
    }
    // Particle effect URLs (nested object)
    else if (key.startsWith('particleEffect_')) {
        var effectType = key.replace('particleEffect_', '');
        if (!gameSettings.particleEffects) {
            gameSettings.particleEffects = {};
        }
        gameSettings.particleEffects[effectType] = value || '';
    }
    // Run timer mode (string value)
    else if (key === 'runTimerMode') {
        gameSettings[key] = value;
    }
    // String values for multiplayer
    else if (key === 'multiplayerPlayerName') {
        gameSettings[key] = String(value).substring(0, 20); // Max 20 chars
    }
    // Integer values
    else if (key === 'playerFrameCount' || key === 'playerSpritesheetCols' || key === 'playerSpritesheetRows' ||
             key === 'playerWidth' || key === 'playerHeight' ||
             key === 'playerCollisionWidth' || key === 'playerCollisionHeight' ||
             key === 'playerCollisionOffsetX' || key === 'playerCollisionOffsetY' ||
             key === 'projectileWidth' || key === 'projectileHeight' || key === 'projectileFrameCount' ||
             key === 'projectileSpritesheetCols' || key === 'projectileSpritesheetRows' ||
             key === 'projectileCooldown' || key === 'projectileStartAmmo' || key === 'projectileMaxAmmo' ||
             key === 'projectileLifetime' || key === 'projectileDamage' || key === 'projectileSpeed' ||
             key === 'startLives' || key === 'invincibilityTime' || key === 'hitPauseDuration' ||
             key === 'coyoteTimeFrames' || key === 'multiplayerMaxPlayers' ||
             key === 'multiplayerPvPDamage' || key === 'multiplayerPvPKillScore' || key === 'multiplayerPvPLives' ||
             key === 'tileRenderScale' ||
             key === 'playerIdleEffectIntensity' || key === 'playerIdleEffectSpeed') {
        // Use parseInt without || 0 fallback for offsets (they can be negative or zero)
        var parsed = parseInt(value);
        gameSettings[key] = isNaN(parsed) ? 0 : parsed;

        // Special validation for multiplayerMaxPlayers (must be 2-12)
        if (key === 'multiplayerMaxPlayers') {
            gameSettings[key] = Math.max(2, Math.min(12, gameSettings[key]));
        }
        // Special validation for PvP settings
        if (key === 'multiplayerPvPDamage') {
            gameSettings[key] = Math.max(1, Math.min(10, gameSettings[key]));
        }
        if (key === 'multiplayerPvPKillScore') {
            gameSettings[key] = Math.max(0, Math.min(1000, gameSettings[key]));
        }
        if (key === 'multiplayerPvPLives') {
            gameSettings[key] = Math.max(1, Math.min(10, gameSettings[key]));
        }
        // Validate tileRenderScale (must be 1, 2, or 4)
        if (key === 'tileRenderScale') {
            if (![1, 2, 4].includes(gameSettings[key])) {
                gameSettings[key] = 1;
            }
            updateTileScalePreview();
        }
    }
    // Volume values (0.0 to 1.0)
    else if (key === 'masterVolume' || key === 'musicVolume' || key === 'sfxVolume') {
        gameSettings[key] = Math.max(0, Math.min(1, parseFloat(value)));
    }
    // Float values (physics)
    else {
        gameSettings[key] = parseFloat(value);
    }
    markDirty();

    // Update sidebar summary in real-time
    updateSidebarSummary(key, value);
}

// Update sidebar summary values in real-time
function updateSidebarSummary(key, value) {
    const summaryMap = {
        'gravity': 'summary-gravity',
        'jumpPower': 'summary-jump',
        'moveSpeed': 'summary-speed',
        'startLives': 'summary-lives'
    };

    if (summaryMap[key]) {
        const el = document.getElementById(summaryMap[key]);
        if (el) {
            el.textContent = value;
        }
    }
}

// Update volume display labels (both modal and sidebar)
function updateVolumeDisplay(type, value) {
    const displayId = type + '-volume-display';
    const el = document.getElementById(displayId);
    if (el) {
        el.textContent = Math.round(value) + '%';
    }

    // Also update sidebar summary
    const summaryId = 'summary-' + type + '-vol';
    const summaryEl = document.getElementById(summaryId);
    if (summaryEl) {
        summaryEl.textContent = Math.round(value) + '%';
    }
}

// Update tile scale preview text
function updateTileScalePreview() {
    const previewEl = document.getElementById('tile-scale-preview');
    if (previewEl) {
        const scale = gameSettings.tileRenderScale || 1;
        const renderSize = tileSize * scale;
        previewEl.textContent = `${renderSize}×${renderSize}`;
    }
}

function updateGameSettingsUI() {
    // Helper to safely set input value
    function setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    // Helper to safely set text content
    function setTextContent(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // Player physics
    setInputValue('setting-gravity', gameSettings.gravity);
    setInputValue('setting-jump', gameSettings.jumpPower);
    setInputValue('setting-speed', gameSettings.moveSpeed);
    setInputValue('setting-bounciness', gameSettings.bounciness || 0);
    setInputValue('setting-friction', gameSettings.friction || 0.85);
    setInputValue('setting-color', gameSettings.playerColor);
    setInputValue('setting-sprite-url', gameSettings.playerSpriteURL || '');
    // Restore custom tile selection if saved
    const customTileSelect = document.getElementById('setting-player-custom-tile');
    if (customTileSelect && gameSettings.playerCustomTileKey) {
        customTileSelect.value = gameSettings.playerCustomTileKey;
    }
    setInputValue('setting-sprite-cols', gameSettings.playerSpritesheetCols || gameSettings.playerFrameCount || 1);
    setInputValue('setting-sprite-rows', gameSettings.playerSpritesheetRows || 1);
    setInputValue('setting-player-width', gameSettings.playerWidth || 32);
    setInputValue('setting-player-height', gameSettings.playerHeight || 32);
    // Collision size (0 means use visual size)
    const collisionW = gameSettings.playerCollisionWidth || gameSettings.playerWidth || 32;
    const collisionH = gameSettings.playerCollisionHeight || gameSettings.playerHeight || 32;
    setInputValue('setting-collision-width', collisionW);
    setInputValue('setting-collision-height', collisionH);
    // Collision offset (default 0)
    setInputValue('setting-collision-offset-x', gameSettings.playerCollisionOffsetX || 0);
    setInputValue('setting-collision-offset-y', gameSettings.playerCollisionOffsetY || 0);
    setInputValue('setting-lives', gameSettings.startLives || 3);

    // Checkbox for mobile controls
    const mobileControlsCheckbox = document.getElementById('setting-mobile-controls');
    if (mobileControlsCheckbox) {
        mobileControlsCheckbox.checked = (gameSettings.enableMobileControls !== false); // Default true
    }

    // Tile render scale dropdown
    const tileRenderScaleSelect = document.getElementById('setting-tile-render-scale');
    if (tileRenderScaleSelect) {
        tileRenderScaleSelect.value = gameSettings.tileRenderScale || 1;
        updateTileScalePreview();
    }

    // Jump mode dropdown
    const jumpModeSelect = document.getElementById('setting-jump-mode');
    if (jumpModeSelect) {
        // Handle migration from old doubleJumpEnabled boolean
        let jumpMode = gameSettings.jumpMode || 'normal';
        if (gameSettings.doubleJumpEnabled === true && jumpMode === 'normal') {
            jumpMode = 'double';
            gameSettings.jumpMode = 'double';
        }
        jumpModeSelect.value = jumpMode;
    }
    setInputValue('setting-flap-power', gameSettings.flyFlapPower || 6);
    toggleFlyOptions();

    // Game Feel settings
    setInputValue('setting-invincibility-time', gameSettings.invincibilityTime ?? 1500);

    const screenShakeCheckbox = document.getElementById('setting-screen-shake');
    if (screenShakeCheckbox) {
        screenShakeCheckbox.checked = gameSettings.screenShakeEnabled !== false; // Default true
    }

    const vibrationCheckbox = document.getElementById('setting-vibration');
    if (vibrationCheckbox) {
        vibrationCheckbox.checked = gameSettings.vibrationEnabled !== false; // Default true
    }


    // RPG Progress Saving (Top-Down only)
    const saveRPGProgressCheckbox = document.getElementById('setting-save-rpg-progress');
    if (saveRPGProgressCheckbox) {
        saveRPGProgressCheckbox.checked = gameSettings.saveRPGProgress !== false; // Default true
    }

    // Hit pause settings
    const hitPauseCheckbox = document.getElementById('setting-hit-pause');
    if (hitPauseCheckbox) {
        hitPauseCheckbox.checked = gameSettings.hitPauseEnabled !== false; // Default true
    }
    setInputValue('setting-hit-pause-duration', gameSettings.hitPauseDuration ?? 80);
    toggleHitPauseOptions();

    // Squash & stretch setting
    const squashStretchCheckbox = document.getElementById('setting-squash-stretch');
    if (squashStretchCheckbox) {
        squashStretchCheckbox.checked = gameSettings.squashStretchEnabled !== false; // Default true
    }
    const squashStretchIntensity = gameSettings.squashStretchIntensity ?? 1.0;
    setInputValue('setting-squash-stretch-intensity', squashStretchIntensity);
    updateSquashStretchIntensityDisplay(squashStretchIntensity);
    toggleSquashStretchOptions();

    // Player idle effect settings
    const idleEffectSelect = document.getElementById('setting-player-idle-effect');
    if (idleEffectSelect) {
        idleEffectSelect.value = gameSettings.playerIdleEffect || 'none';
    }
    const idleIntensitySlider = document.getElementById('setting-player-idle-intensity');
    const idleIntensityDisplay = document.getElementById('idle-effect-intensity-display');
    if (idleIntensitySlider) {
        idleIntensitySlider.value = gameSettings.playerIdleEffectIntensity || 5;
        if (idleIntensityDisplay) idleIntensityDisplay.textContent = idleIntensitySlider.value;
    }
    const idleSpeedSlider = document.getElementById('setting-player-idle-speed');
    const idleSpeedDisplay = document.getElementById('idle-effect-speed-display');
    if (idleSpeedSlider) {
        idleSpeedSlider.value = gameSettings.playerIdleEffectSpeed || 5;
        if (idleSpeedDisplay) idleSpeedDisplay.textContent = idleSpeedSlider.value;
    }
    toggleIdleEffectOptions();

    // Run timer settings
    const runTimerCheckbox = document.getElementById('setting-run-timer');
    if (runTimerCheckbox) {
        runTimerCheckbox.checked = gameSettings.runTimerEnabled === true; // Default false
    }
    const runTimerModeSelect = document.getElementById('setting-run-timer-mode');
    if (runTimerModeSelect) {
        runTimerModeSelect.value = gameSettings.runTimerMode || 'level';
    }
    // Show/hide mode dropdown based on checkbox
    const runTimerOptions = document.getElementById('run-timer-options');
    if (runTimerOptions) {
        runTimerOptions.style.display = gameSettings.runTimerEnabled ? 'block' : 'none';
    }

    // Coyote time setting
    const coyoteTimeValue = gameSettings.coyoteTimeFrames ?? 6;
    setInputValue('setting-coyote-time', coyoteTimeValue);
    updateCoyoteTimeDisplay(coyoteTimeValue);

    // Update summary values in sidebar
    setTextContent('summary-gravity', gameSettings.gravity);
    setTextContent('summary-jump', gameSettings.jumpPower);
    setTextContent('summary-speed', gameSettings.moveSpeed);
    setTextContent('summary-lives', gameSettings.startLives || 3);

    // Player sound effects (in Game Properties Modal)
    if (gameSettings.sounds) {
        setInputValue('setting-sound-jump', gameSettings.sounds.jump || '');
        setInputValue('setting-sound-hurt', gameSettings.sounds.hurt || '');
    }

    // Volume settings (convert 0-1 to 0-100 for sliders)
    const masterVol = Math.round((gameSettings.masterVolume ?? 1.0) * 100);
    const musicVol = Math.round((gameSettings.musicVolume ?? 0.5) * 100);
    const sfxVol = Math.round((gameSettings.sfxVolume ?? 0.7) * 100);

    setInputValue('setting-master-volume', masterVol);
    setInputValue('setting-music-volume', musicVol);
    setInputValue('setting-sfx-volume', sfxVol);

    // Update volume display labels in modal
    setTextContent('master-volume-display', masterVol + '%');
    setTextContent('music-volume-display', musicVol + '%');
    setTextContent('sfx-volume-display', sfxVol + '%');

    // Update volume summary in sidebar
    setTextContent('summary-master-vol', masterVol + '%');
    setTextContent('summary-music-vol', musicVol + '%');
    setTextContent('summary-sfx-vol', sfxVol + '%');

    // Projectile settings
    const projectileEnabledCheckbox = document.getElementById('setting-projectile-enabled');
    if (projectileEnabledCheckbox) {
        projectileEnabledCheckbox.checked = gameSettings.projectileEnabled === true;
    }
    setInputValue('setting-projectile-fire-key', gameSettings.projectileFireKey || 'KeyX');
    setInputValue('setting-projectile-mode', gameSettings.projectileMode || 'cooldown');
    setInputValue('setting-projectile-cooldown', gameSettings.projectileCooldown || 500);
    setInputValue('setting-projectile-speed', gameSettings.projectileSpeed || 8);
    setInputValue('setting-projectile-start-ammo', gameSettings.projectileStartAmmo || 10);
    setInputValue('setting-projectile-max-ammo', gameSettings.projectileMaxAmmo || 30);
    setInputValue('setting-projectile-damage', gameSettings.projectileDamage || 1);
    setInputValue('setting-projectile-lifetime', gameSettings.projectileLifetime || 2000);
    setInputValue('setting-projectile-color', gameSettings.projectileColor || '#ffff00');
    setInputValue('setting-projectile-width', gameSettings.projectileWidth || 8);
    setInputValue('setting-projectile-height', gameSettings.projectileHeight || 8);
    setInputValue('setting-projectile-sprite', gameSettings.projectileSpriteURL || '');
    setInputValue('setting-projectile-cols', gameSettings.projectileSpritesheetCols || gameSettings.projectileFrameCount || 1);
    setInputValue('setting-projectile-rows', gameSettings.projectileSpritesheetRows || 1);

    // Projectile collects items checkbox
    const projectileCollectsCheckbox = document.getElementById('setting-projectile-collects');
    if (projectileCollectsCheckbox) {
        projectileCollectsCheckbox.checked = gameSettings.projectileCollectsItems === true;
    }

    // Projectile sounds
    if (gameSettings.sounds) {
        setInputValue('setting-sound-shoot', gameSettings.sounds.shoot || '');
        setInputValue('setting-sound-projectile-hit', gameSettings.sounds.projectileHit || '');
    }

    // Toggle visibility based on settings
    toggleProjectileOptions();
    toggleAmmoOptions();

    // Update panel summaries
    updateMobileSummary();
    updatePlayerSizeSummary();
    updateProjectileSummary();

    // Particle effects settings
    const particleEnabledCheckbox = document.getElementById('setting-particle-effects-enabled');
    if (particleEnabledCheckbox) {
        particleEnabledCheckbox.checked = gameSettings.particleEffectsEnabled === true;
    }
    // Populate individual particle effect inputs (main Particles tab)
    // NOTE: enemyDeath and collectItem are now per-template (see object templates)
    if (gameSettings.particleEffects) {
        setInputValue('setting-particle-player-damage', gameSettings.particleEffects.playerDamage || '');
        setInputValue('setting-particle-player-jump', gameSettings.particleEffects.playerJump || '');
        setInputValue('setting-particle-checkpoint', gameSettings.particleEffects.checkpoint || '');
        setInputValue('setting-particle-level-complete', gameSettings.particleEffects.levelComplete || '');
        // Also populate contextual inputs in Player Properties modal
        setInputValue('player-particle-jump', gameSettings.particleEffects.playerJump || '');
        setInputValue('player-particle-damage', gameSettings.particleEffects.playerDamage || '');
    }
    toggleParticleEffectsOptions();

    // Update SoundEffectStudio button states for all sound inputs
    if (typeof updateSoundButtonStates === 'function') {
        updateSoundButtonStates('setting-sound-jump');
        updateSoundButtonStates('setting-sound-hurt');
        updateSoundButtonStates('setting-sound-shoot');
        updateSoundButtonStates('setting-sound-projectile-hit');
        updateSoundButtonStates('level-settings-complete-sound');
        updateSoundButtonStates('level-settings-gameover-sound');
    }

    // Update ParticleFX button states for all particle effect inputs
    if (typeof updateParticleButtonStates === 'function') {
        updateParticleButtonStates('setting-particle-player-damage');
        updateParticleButtonStates('setting-particle-player-jump');
        updateParticleButtonStates('setting-particle-checkpoint');
        updateParticleButtonStates('setting-particle-level-complete');
        updateParticleButtonStates('player-particle-jump');
        updateParticleButtonStates('player-particle-damage');
    }

    // Update multiplayer UI
    if (typeof updateMultiplayerUI === 'function') {
        updateMultiplayerUI();
    }

    // Update game type UI
    updateGameTypeUI();
}

// Toggle projectile options visibility
function toggleProjectileOptions() {
    const checkbox = document.getElementById('setting-projectile-enabled');
    const options = document.getElementById('projectile-options');
    if (checkbox && options) {
        options.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Toggle ammo options visibility
function toggleAmmoOptions() {
    const modeSelect = document.getElementById('setting-projectile-mode');
    const ammoOptions = document.getElementById('ammo-options');
    if (modeSelect && ammoOptions) {
        ammoOptions.style.display = modeSelect.value === 'ammo' ? 'block' : 'none';
    }
}

// Toggle fly options visibility and update description
function toggleFlyOptions() {
    const modeSelect = document.getElementById('setting-jump-mode');
    const flyOptions = document.getElementById('fly-options');
    const descEl = document.getElementById('jump-mode-desc');

    if (!modeSelect) return;

    const mode = modeSelect.value;

    // Update description
    if (descEl) {
        const descriptions = {
            'normal': 'Standard platformer jumping',
            'double': 'Jump once more while in the air',
            'fly': 'Tap to flap upward - Flappy Bird style!'
        };
        descEl.textContent = descriptions[mode] || '';
    }

    // Show/hide fly options
    if (flyOptions) {
        flyOptions.style.display = mode === 'fly' ? 'block' : 'none';
    }
}

// Toggle hit pause options visibility
function toggleHitPauseOptions() {
    const checkbox = document.getElementById('setting-hit-pause');
    const options = document.getElementById('hit-pause-options');
    if (checkbox && options) {
        options.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Toggle squash & stretch intensity options visibility
function toggleSquashStretchOptions() {
    const checkbox = document.getElementById('setting-squash-stretch');
    const options = document.getElementById('squash-stretch-options');
    if (checkbox && options) {
        options.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Toggle idle effect options visibility
function toggleIdleEffectOptions() {
    const select = document.getElementById('setting-player-idle-effect');
    const options = document.getElementById('idle-effect-options');
    if (select && options) {
        const showOptions = select.value !== 'none';
        options.style.display = showOptions ? 'block' : 'none';
        if (!showOptions) {
            stopIdleEffectPreview();
        }
    }
}

// Idle effect preview animation state
let idleEffectPreviewAnimationId = null;
let idleEffectPreviewImage = null;

// Start the idle effect preview animation
function startIdleEffectPreview() {
    const canvas = document.getElementById('idle-effect-preview-canvas');
    if (!canvas) return;

    const effect = document.getElementById('setting-player-idle-effect')?.value || 'none';
    if (effect === 'none') {
        stopIdleEffectPreview();
        return;
    }

    // Load the player sprite or use color
    loadIdleEffectPreviewImage();

    // Start animation loop
    if (!idleEffectPreviewAnimationId) {
        animateIdleEffectPreview();
    }
}

// Load the player image for preview
function loadIdleEffectPreviewImage() {
    const spriteUrl = gameSettings.playerSpriteURL;
    if (spriteUrl && spriteUrl.startsWith('data:')) {
        // Data URL - load directly
        idleEffectPreviewImage = new Image();
        idleEffectPreviewImage.src = spriteUrl;
    } else if (spriteUrl) {
        // External URL
        idleEffectPreviewImage = new Image();
        idleEffectPreviewImage.crossOrigin = 'anonymous';
        idleEffectPreviewImage.src = spriteUrl;
    } else {
        // No sprite - will use colored rectangle
        idleEffectPreviewImage = null;
    }
}

// Update preview when sliders change
function updateIdleEffectPreview() {
    // Preview will update on next animation frame automatically
}

// Animate the idle effect preview
function animateIdleEffectPreview() {
    const canvas = document.getElementById('idle-effect-preview-canvas');
    if (!canvas) {
        idleEffectPreviewAnimationId = null;
        return;
    }

    const ctx = canvas.getContext('2d');
    const effect = document.getElementById('setting-player-idle-effect')?.value || 'none';

    if (effect === 'none') {
        stopIdleEffectPreview();
        return;
    }

    const intensity = parseInt(document.getElementById('setting-player-idle-intensity')?.value) || 5;
    const speed = parseInt(document.getElementById('setting-player-idle-speed')?.value) || 5;

    const time = Date.now() / 1000;
    const normalizedSpeed = speed / 5;
    const normalizedIntensity = intensity / 5;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context and move to center
    ctx.save();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.translate(cx, cy);

    // Apply effect transformation
    switch (effect) {
        case 'sway':
            const swayAngle = Math.sin(time * normalizedSpeed * 3) * 0.15 * normalizedIntensity;
            ctx.translate(0, canvas.height / 4);
            ctx.rotate(swayAngle);
            ctx.translate(0, -canvas.height / 4);
            break;
        case 'pulse':
            const pulseScale = 1 + Math.sin(time * normalizedSpeed * 4) * 0.1 * normalizedIntensity;
            ctx.scale(pulseScale, pulseScale);
            break;
        case 'bounce':
            const bounceY = -Math.abs(Math.sin(time * normalizedSpeed * 5)) * 6 * normalizedIntensity;
            ctx.translate(0, bounceY);
            break;
        case 'float':
            const floatY = Math.sin(time * normalizedSpeed * 2) * 4 * normalizedIntensity;
            ctx.translate(0, floatY);
            break;
        case 'shimmer':
            const shimmerAlpha = 0.7 + Math.sin(time * normalizedSpeed * 6) * 0.3 * normalizedIntensity;
            ctx.globalAlpha = shimmerAlpha;
            break;
        case 'wave':
            const waveSkew = Math.sin(time * normalizedSpeed * 4) * 0.1 * normalizedIntensity;
            ctx.transform(1, 0, waveSkew, 1, 0, 0);
            break;
        case 'shake':
            const shakeX = (Math.random() - 0.5) * 6 * normalizedIntensity;
            const shakeY = (Math.random() - 0.5) * 6 * normalizedIntensity;
            ctx.translate(shakeX, shakeY);
            break;
    }

    // Draw player
    const size = 32;
    if (idleEffectPreviewImage && idleEffectPreviewImage.complete && idleEffectPreviewImage.naturalWidth > 0) {
        // Draw sprite (first frame only)
        ctx.imageSmoothingEnabled = false;
        const cols = gameSettings.playerSpritesheetCols || 1;
        const rows = gameSettings.playerSpritesheetRows || 1;
        const frameW = idleEffectPreviewImage.naturalWidth / cols;
        const frameH = idleEffectPreviewImage.naturalHeight / rows;
        ctx.drawImage(idleEffectPreviewImage, 0, 0, frameW, frameH, -size/2, -size/2, size, size);
    } else {
        // Draw colored rectangle with face
        ctx.fillStyle = gameSettings.playerColor || '#ff6b6b';
        ctx.fillRect(-size/2, -size/2, size, size);
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(-size/2 + 4, -size/2 + 6, 4, 4);
        ctx.fillRect(-size/2 + 12, -size/2 + 6, 4, 4);
        ctx.fillStyle = '#333';
        ctx.fillRect(-size/2 + 5, -size/2 + 8, 2, 2);
        ctx.fillRect(-size/2 + 13, -size/2 + 8, 2, 2);
    }

    ctx.restore();

    // Continue animation
    idleEffectPreviewAnimationId = requestAnimationFrame(animateIdleEffectPreview);
}

// Stop the idle effect preview animation
function stopIdleEffectPreview() {
    if (idleEffectPreviewAnimationId) {
        cancelAnimationFrame(idleEffectPreviewAnimationId);
        idleEffectPreviewAnimationId = null;
    }

    // Clear canvas
    const canvas = document.getElementById('idle-effect-preview-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Toggle particle effects options visibility
function toggleParticleEffectsOptions() {
    const checkbox = document.getElementById('setting-particle-effects-enabled');
    const options = document.getElementById('particle-effects-options');
    if (checkbox && options) {
        options.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Update squash & stretch intensity display label
function updateSquashStretchIntensityDisplay(value) {
    const el = document.getElementById('squash-stretch-intensity-display');
    if (el) {
        const v = parseFloat(value);
        let label;
        if (v <= 0.5) {
            label = 'Subtle';
        } else if (v <= 0.8) {
            label = 'Light';
        } else if (v <= 1.2) {
            label = 'Normal';
        } else if (v <= 1.6) {
            label = 'Strong';
        } else {
            label = 'Exaggerated';
        }
        el.textContent = label + ' (' + v.toFixed(1) + 'x)';
    }
}

// Update coyote time display label
function updateCoyoteTimeDisplay(value) {
    const el = document.getElementById('coyote-time-display');
    if (el) {
        const frames = parseInt(value) || 0;
        const ms = Math.round(frames * 16.67); // ~60fps, so each frame is ~16.67ms
        el.textContent = frames + ' frames (~' + ms + 'ms)';
    }
}

// ============================================
// GAME FEEL PRESETS
// ============================================

const gameFeelPresets = {
    balanced: {
        name: 'Balanced',
        description: 'A well-rounded starting point that works for most platformers. Medium gravity, responsive controls, and all effects enabled for good game feel.',
        gravity: 0.5,
        jumpPower: 10,
        moveSpeed: 4,
        friction: 0.85,
        bounciness: 0,
        jumpMode: 'normal',
        coyoteTimeFrames: 6,
        hitPauseEnabled: true,
        hitPauseDuration: 80,
        squashStretchEnabled: true,
        screenShakeEnabled: true,
        invincibilityTime: 1500
    },
    floaty: {
        name: 'Floaty (Kirby)',
        description: 'Inspired by Kirby games. Low gravity makes you float longer in the air. Double jump enabled for extra forgiveness. Great for beginners or dreamy atmospheres.',
        gravity: 0.25,
        jumpPower: 8,
        moveSpeed: 3.5,
        friction: 0.9,
        bounciness: 0,
        jumpMode: 'double',
        coyoteTimeFrames: 10,
        hitPauseEnabled: true,
        hitPauseDuration: 60,
        squashStretchEnabled: true,
        screenShakeEnabled: true,
        invincibilityTime: 2000
    },
    tight: {
        name: 'Tight (Celeste)',
        description: 'Inspired by Celeste. High gravity and fast movement for precise, responsive controls. Quick hit pauses and shorter coyote time reward skilled play.',
        gravity: 0.7,
        jumpPower: 12,
        moveSpeed: 5,
        friction: 0.75,
        bounciness: 0,
        jumpMode: 'normal',
        coyoteTimeFrames: 4,
        hitPauseEnabled: true,
        hitPauseDuration: 50,
        squashStretchEnabled: true,
        screenShakeEnabled: true,
        invincibilityTime: 1000
    },
    heavy: {
        name: 'Heavy (Castlevania)',
        description: 'Inspired by classic Castlevania. Very high gravity with committed jumps (no coyote time). Slow, deliberate movement. Long hit pause for impactful combat.',
        gravity: 0.8,
        jumpPower: 11,
        moveSpeed: 3,
        friction: 0.7,
        bounciness: 0,
        jumpMode: 'normal',
        coyoteTimeFrames: 0,
        hitPauseEnabled: true,
        hitPauseDuration: 120,
        squashStretchEnabled: false,
        screenShakeEnabled: true,
        invincibilityTime: 2000
    },
    bouncy: {
        name: 'Bouncy (Sonic)',
        description: 'Inspired by Sonic games. Fast movement with high friction (momentum preserved). Bouncy landings add spring to your step. No hit pause keeps the speed flowing.',
        gravity: 0.5,
        jumpPower: 12,
        moveSpeed: 6,
        friction: 0.95,
        bounciness: 0.3,
        jumpMode: 'normal',
        coyoteTimeFrames: 6,
        hitPauseEnabled: false,
        hitPauseDuration: 80,
        squashStretchEnabled: true,
        screenShakeEnabled: true,
        invincibilityTime: 2000
    },
    flappy: {
        name: 'Flappy',
        description: 'Inspired by Flappy Bird. Tap-to-flap flight mode with no horizontal movement (auto-scrolling style). Each tap gives a boost upward against constant gravity.',
        gravity: 0.4,
        jumpPower: 8,
        moveSpeed: 0,
        friction: 1.0,
        bounciness: 0,
        jumpMode: 'fly',
        flyFlapPower: 7,
        coyoteTimeFrames: 0,
        hitPauseEnabled: true,
        hitPauseDuration: 100,
        squashStretchEnabled: true,
        screenShakeEnabled: true,
        invincibilityTime: 1000
    },
    // Top-Down RPG Presets
    topdown_rpg: {
        name: 'RPG (Top-Down)',
        description: 'Classic RPG style movement. Smooth 8-directional movement, moderate speed, high friction for precise control. Perfect for exploration and NPC interactions.',
        gameType: 'topdown',
        gravity: 0,
        jumpPower: 0,
        moveSpeed: 3.5,
        friction: 0.8,
        bounciness: 0,
        jumpMode: 'normal',
        coyoteTimeFrames: 0,
        hitPauseEnabled: true,
        hitPauseDuration: 80,
        squashStretchEnabled: false,
        screenShakeEnabled: true,
        invincibilityTime: 1500
    },
    topdown_action: {
        name: 'Action (Top-Down)',
        description: 'Fast-paced action style. Quick movement with lower friction for momentum-based dodging. Great for top-down shooters or action games.',
        gameType: 'topdown',
        gravity: 0,
        jumpPower: 0,
        moveSpeed: 5,
        friction: 0.75,
        bounciness: 0,
        jumpMode: 'normal',
        coyoteTimeFrames: 0,
        hitPauseEnabled: true,
        hitPauseDuration: 50,
        squashStretchEnabled: false,
        screenShakeEnabled: true,
        invincibilityTime: 1000
    },
    topdown_zelda: {
        name: 'Zelda (Top-Down)',
        description: 'Inspired by classic Zelda games. Balanced movement speed with responsive controls. Perfect for adventure games with combat and exploration.',
        gameType: 'topdown',
        gravity: 0,
        jumpPower: 0,
        moveSpeed: 4,
        friction: 0.85,
        bounciness: 0,
        jumpMode: 'normal',
        coyoteTimeFrames: 0,
        hitPauseEnabled: true,
        hitPauseDuration: 100,
        squashStretchEnabled: false,
        screenShakeEnabled: true,
        invincibilityTime: 2000
    }
};

// Preset details metadata for display
const presetDetails = {
    balanced: { icon: '⚖️', color: '#3498db' },
    floaty: { icon: '☁️', color: '#e91e63' },
    tight: { icon: '⚡', color: '#9b59b6' },
    heavy: { icon: '🏰', color: '#607d8b' },
    bouncy: { icon: '🔵', color: '#ff9800' },
    flappy: { icon: '🐦', color: '#4caf50' },
    topdown_rpg: { icon: '🗺️', color: '#27ae60' },
    topdown_action: { icon: '🎯', color: '#e74c3c' },
    topdown_zelda: { icon: '⚔️', color: '#f39c12' }
};

function showPresetDetails(presetName) {
    const preset = gameFeelPresets[presetName];
    const details = presetDetails[presetName];
    if (!preset || !details) return;

    const panel = document.getElementById('preset-details-panel');
    const titleEl = document.getElementById('preset-details-title');
    const descEl = document.getElementById('preset-details-description');
    const valuesEl = document.getElementById('preset-details-values');

    if (!panel || !titleEl || !descEl || !valuesEl) return;

    // Set title with icon
    titleEl.innerHTML = details.icon + ' ' + preset.name;
    titleEl.style.color = details.color;

    // Set description
    descEl.textContent = preset.description;

    // Build values display
    const valueLabels = {
        gravity: { label: 'Gravity', format: v => v.toFixed(2) },
        jumpPower: { label: 'Jump Power', format: v => v },
        moveSpeed: { label: 'Move Speed', format: v => v },
        friction: { label: 'Friction', format: v => (v * 100).toFixed(0) + '%' },
        bounciness: { label: 'Bounciness', format: v => (v * 100).toFixed(0) + '%' },
        jumpMode: { label: 'Jump Mode', format: v => v.charAt(0).toUpperCase() + v.slice(1) },
        coyoteTimeFrames: { label: 'Coyote Time', format: v => v + ' frames' },
        hitPauseEnabled: { label: 'Hit Pause', format: v => v ? 'On' : 'Off' },
        hitPauseDuration: { label: 'Pause Duration', format: v => v + 'ms' },
        squashStretchEnabled: { label: 'Squash/Stretch', format: v => v ? 'On' : 'Off' },
        screenShakeEnabled: { label: 'Screen Shake', format: v => v ? 'On' : 'Off' },
        invincibilityTime: { label: 'Invincibility', format: v => (v / 1000).toFixed(1) + 's' }
    };

    let valuesHTML = '';
    for (const [key, config] of Object.entries(valueLabels)) {
        if (preset[key] !== undefined) {
            const value = config.format(preset[key]);
            valuesHTML += '<div style="color: #888;">' + config.label + ':</div>';
            valuesHTML += '<div style="color: #fff; font-weight: bold;">' + value + '</div>';
        }
    }
    valuesEl.innerHTML = valuesHTML;

    // Update border color
    panel.style.borderLeftColor = details.color;

    // Show the panel
    panel.style.display = 'block';
}

function applyGameFeelPreset(presetName) {
    const preset = gameFeelPresets[presetName];
    if (!preset) {
        console.warn('Unknown preset:', presetName);
        return;
    }

    // Apply all preset values to gameSettings
    Object.keys(preset).forEach(key => {
        if (key === 'name' || key === 'description') return; // Skip metadata
        gameSettings[key] = preset[key];
    });

    // Update all UI elements
    updateGameSettingsUI();

    // If preset includes gameType, also update the game type UI
    if (preset.gameType && typeof updateGameTypeUI === 'function') {
        updateGameTypeUI();
    }

    // Mark project as dirty
    if (typeof markDirty === 'function') {
        markDirty();
    }

    // Show toast notification
    if (typeof showToast === 'function') {
        showToast(preset.name + ' preset applied!', 'success');
    }
}

// ============================================
// GAME PROPERTIES MODAL
// ============================================

let playerSpritePreviewInterval = null;
let playerPreviewImage = null;
let playerPreviewFrame = 0;

function showGamePropertiesModal() {
    // Update modal inputs with current values
    updateGameSettingsUI();
    document.getElementById('game-properties-modal').style.display = 'flex';
    // Update sprite preview
    updatePlayerSpritePreview();
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        CodePreview.setContext('physics', {
            gravity: gameSettings.gravity,
            jumpPower: gameSettings.jumpPower,
            moveSpeed: gameSettings.moveSpeed,
            friction: gameSettings.friction
        });
    }
}

function closeGamePropertiesModal() {
    document.getElementById('game-properties-modal').style.display = 'none';
    // Update summary when closing
    updateGameSettingsUI();
}

// ============================================
// PLAYER PROPERTIES MODAL
// ============================================

function showPlayerPropertiesModal() {
    // Update modal inputs with current values
    updateGameSettingsUI();
    document.getElementById('player-properties-modal').style.display = 'flex';
    // Populate custom tile dropdown
    populatePlayerCustomTileSelector();
    // Update sprite preview
    updatePlayerSpritePreview();
    // Update hitbox preview
    updateCollisionPreview();
    // Update spawn UI
    if (typeof updateSpawnUI === 'function') {
        updateSpawnUI();
    }
    // Update code preview panel
    if (typeof CodePreview !== 'undefined') {
        CodePreview.setContext('player', {
            playerWidth: gameSettings.playerWidth,
            playerHeight: gameSettings.playerHeight,
            playerColor: gameSettings.playerColor,
            playerSpriteURL: gameSettings.playerSpriteURL
        });
    }
    // Start idle effect preview if effect is selected
    if (gameSettings.playerIdleEffect && gameSettings.playerIdleEffect !== 'none') {
        startIdleEffectPreview();
    }
}

function closePlayerPropertiesModal() {
    document.getElementById('player-properties-modal').style.display = 'none';
    // Stop animation when closing
    stopPlayerSpriteAnimation();
    // Stop idle effect preview
    stopIdleEffectPreview();
    // Update summary when closing
    updateGameSettingsUI();
}

// ============================================
// SUMMARY UPDATE FUNCTIONS
// ============================================

function updateMobileSummary() {
    const checkbox = document.getElementById('setting-mobile-controls');
    const summaryEl = document.getElementById('summary-mobile');
    if (summaryEl && checkbox) {
        summaryEl.textContent = checkbox.checked ? 'On' : 'Off';
    }
}

function updatePlayerSizeSummary() {
    const width = document.getElementById('setting-player-width')?.value || 32;
    const height = document.getElementById('setting-player-height')?.value || 32;
    const summaryEl = document.getElementById('summary-player-size');
    if (summaryEl) {
        summaryEl.textContent = `${width}×${height}`;
    }
}

function updateCollisionPreview() {
    // Redraw the editor canvas to reflect collision changes
    if (typeof draw === 'function') {
        draw();
    }

    // Draw hitbox preview in Player Properties modal
    const canvas = document.getElementById('hitbox-preview-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const canvasSize = 100;

    // Get current values
    const spriteW = parseInt(document.getElementById('setting-player-width')?.value) || 32;
    const spriteH = parseInt(document.getElementById('setting-player-height')?.value) || 32;
    const hitboxW = parseInt(document.getElementById('setting-collision-width')?.value) || spriteW;
    const hitboxH = parseInt(document.getElementById('setting-collision-height')?.value) || spriteH;
    const offsetX = parseInt(document.getElementById('setting-collision-offset-x')?.value) || 0;
    const offsetY = parseInt(document.getElementById('setting-collision-offset-y')?.value) || 0;
    const playerColor = document.getElementById('setting-color')?.value || '#ff6b6b';

    // Calculate scale to fit in canvas with padding
    const padding = 10;
    const maxDim = Math.max(spriteW, spriteH);
    const scale = Math.min((canvasSize - padding * 2) / maxDim, 2); // Cap at 2x scale

    // Calculate positions (centered in canvas)
    const scaledSpriteW = spriteW * scale;
    const scaledSpriteH = spriteH * scale;
    const spriteX = (canvasSize - scaledSpriteW) / 2;
    const spriteY = (canvasSize - scaledSpriteH) / 2;

    // Hitbox position (centered horizontally, bottom-aligned, plus offsets)
    const baseHitboxOffsetX = (spriteW - hitboxW) / 2;
    const baseHitboxOffsetY = spriteH - hitboxH;
    const hitboxX = spriteX + (baseHitboxOffsetX + offsetX) * scale;
    const hitboxY = spriteY + (baseHitboxOffsetY + offsetY) * scale;
    const scaledHitboxW = hitboxW * scale;
    const scaledHitboxH = hitboxH * scale;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw ground line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, spriteY + scaledSpriteH);
    ctx.lineTo(canvasSize, spriteY + scaledSpriteH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw sprite (player color or sprite image)
    const spriteUrl = gameSettings.playerSpriteURL;
    if (spriteUrl && playerSpriteCache && playerSpriteCacheUrl === spriteUrl) {
        // Draw sprite image
        const frameCount = gameSettings.playerFrameCount || 1;
        const frameWidth = playerSpriteCache.naturalWidth / frameCount;
        const frameHeight = playerSpriteCache.naturalHeight;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            playerSpriteCache,
            0, 0, frameWidth, frameHeight,
            spriteX, spriteY, scaledSpriteW, scaledSpriteH
        );
    } else {
        // Draw colored rectangle
        ctx.fillStyle = playerColor;
        ctx.fillRect(spriteX, spriteY, scaledSpriteW, scaledSpriteH);

        // Draw simple face
        ctx.fillStyle = '#ffffff';
        const eyeSize = Math.max(2, scaledSpriteW * 0.12);
        const eyeY = spriteY + scaledSpriteH * 0.35;
        ctx.fillRect(spriteX + scaledSpriteW * 0.25, eyeY, eyeSize, eyeSize);
        ctx.fillRect(spriteX + scaledSpriteW * 0.65, eyeY, eyeSize, eyeSize);
    }

    // Draw sprite outline (dashed)
    ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(spriteX, spriteY, scaledSpriteW, scaledSpriteH);
    ctx.setLineDash([]);

    // Draw hitbox (green, semi-transparent)
    ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.fillRect(hitboxX, hitboxY, scaledHitboxW, scaledHitboxH);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(hitboxX, hitboxY, scaledHitboxW, scaledHitboxH);

    // Draw dimensions text
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${hitboxW}×${hitboxH}`, canvasSize / 2, canvasSize - 3);
}

function updateProjectileSummary() {
    const checkbox = document.getElementById('setting-projectile-enabled');
    const summaryEl = document.getElementById('summary-projectiles');
    if (summaryEl && checkbox) {
        summaryEl.textContent = checkbox.checked ? 'On' : 'Off';
    }
}

function updatePlayerSpritePreview() {
    const previewContainer = document.getElementById('player-sprite-preview');
    const spriteUrl = document.getElementById('setting-sprite-url').value.trim();
    // Use new cols/rows inputs for grid-based spritesheets
    const spriteCols = parseInt(document.getElementById('setting-sprite-cols')?.value) || 1;
    const spriteRows = parseInt(document.getElementById('setting-sprite-rows')?.value) || 1;
    const frameCount = spriteCols; // Animate across the first row

    // Stop any existing animation
    stopPlayerSpriteAnimation();

    if (!spriteUrl) {
        previewContainer.innerHTML = '<span style="color: #555; font-size: 10px;">No sprite</span>';
        return;
    }

    // Show loading state
    previewContainer.innerHTML = '<span style="color: #888; font-size: 10px;">Loading...</span>';

    // Load the image
    playerPreviewImage = new Image();
    playerPreviewImage.crossOrigin = 'anonymous';

    playerPreviewImage.onload = function() {
        // Grid-based spritesheet: divide by cols and rows
        const frameWidth = playerPreviewImage.width / spriteCols;
        const frameHeight = playerPreviewImage.height / spriteRows;

        // Calculate display size (fit within 80x80 while maintaining aspect ratio)
        const maxSize = 70;
        const scale = Math.min(maxSize / frameWidth, maxSize / frameHeight, 2); // Max 2x scale
        const displayWidth = Math.round(frameWidth * scale);
        const displayHeight = Math.round(frameHeight * scale);

        // Create canvas for animation
        const canvas = document.createElement('canvas');
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        canvas.style.imageRendering = 'pixelated';
        canvas.style.imageRendering = 'crisp-edges';

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        previewContainer.innerHTML = '';
        previewContainer.appendChild(canvas);

        // Add frame indicator if animated
        if (frameCount > 1) {
            const frameIndicator = document.createElement('div');
            frameIndicator.id = 'frame-indicator';
            frameIndicator.style.cssText = 'position: absolute; bottom: 2px; right: 4px; font-size: 9px; color: #888;';
            frameIndicator.textContent = '1/' + frameCount;
            previewContainer.appendChild(frameIndicator);
        }

        // Draw initial frame
        playerPreviewFrame = 0;
        drawPlayerPreviewFrame(ctx, frameWidth, frameHeight, displayWidth, displayHeight, spriteCols);

        // Start animation if multiple frames
        if (frameCount > 1) {
            playerSpritePreviewInterval = setInterval(() => {
                playerPreviewFrame = (playerPreviewFrame + 1) % frameCount;
                drawPlayerPreviewFrame(ctx, frameWidth, frameHeight, displayWidth, displayHeight, spriteCols);

                // Update frame indicator
                const indicator = document.getElementById('frame-indicator');
                if (indicator) {
                    indicator.textContent = (playerPreviewFrame + 1) + '/' + frameCount;
                }
            }, 150); // ~6.6 fps animation
        }
    };

    playerPreviewImage.onerror = function() {
        previewContainer.innerHTML = '<span style="color: #f66; font-size: 10px;">Failed to load</span>';
    };

    playerPreviewImage.src = spriteUrl;
}

function drawPlayerPreviewFrame(ctx, frameWidth, frameHeight, displayWidth, displayHeight, spriteCols) {
    if (!playerPreviewImage) return;

    // Calculate source position in grid (first row only for preview)
    const col = playerPreviewFrame % spriteCols;
    const srcX = col * frameWidth;
    const srcY = 0; // Always use first row for preview animation

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(
        playerPreviewImage,
        srcX, srcY, frameWidth, frameHeight,  // Source from grid
        0, 0, displayWidth, displayHeight  // Destination
    );
}

function stopPlayerSpriteAnimation() {
    if (playerSpritePreviewInterval) {
        clearInterval(playerSpritePreviewInterval);
        playerSpritePreviewInterval = null;
    }
    playerPreviewFrame = 0;
}

// ============================================
// PLAYER CUSTOM TILE SELECTOR
// ============================================

// Populate the player custom tile dropdown with available custom tiles
function populatePlayerCustomTileSelector() {
    const select = document.getElementById('setting-player-custom-tile');
    if (!select) return;

    // Keep the "None" option
    let html = '<option value="">-- None (use sprite URL or color) --</option>';

    // Add custom tiles only (not tileset tiles - those are typically 16x16 and not suitable for player sprites)
    if (typeof customTiles === 'object') {
        const customKeys = Object.keys(customTiles);
        if (customKeys.length > 0) {
            html += '<optgroup label="Custom Tiles">';
            customKeys.forEach((key, index) => {
                const ct = customTiles[key];
                const name = ct.name || `Custom Tile #${index + 1}`;
                const frameInfo = ct.animated && ct.frames ? ` (${ct.frames.length} frames)` : '';
                html += `<option value="${key}">${name}${frameInfo}</option>`;
            });
            html += '</optgroup>';
        }
    }

    select.innerHTML = html;

    // If player already has a custom tile selected (stored in playerCustomTileKey), select it
    if (gameSettings.playerCustomTileKey) {
        select.value = gameSettings.playerCustomTileKey;
        updatePlayerCustomTilePreview(gameSettings.playerCustomTileKey);
    }
}

// Handle custom tile selection for player
function selectPlayerCustomTile(tileKey) {
    const preview = document.getElementById('player-custom-tile-preview');
    const spriteUrlInput = document.getElementById('setting-sprite-url');
    const colsInput = document.getElementById('setting-sprite-cols');
    const rowsInput = document.getElementById('setting-sprite-rows');

    if (!tileKey) {
        // Cleared selection
        gameSettings.playerCustomTileKey = '';
        if (preview) {
            preview.innerHTML = '<span style="color:#666;font-size:10px;">Select a custom tile to use as player sprite</span>';
        }
        markDirty();
        return;
    }

    // Check if custom tile exists
    if (typeof customTiles !== 'object' || !customTiles[tileKey]) {
        if (preview) {
            preview.innerHTML = '<span style="color:#f66;font-size:10px;">Custom tile not found</span>';
        }
        return;
    }

    const ct = customTiles[tileKey];

    // Store the custom tile key in gameSettings
    gameSettings.playerCustomTileKey = tileKey;

    // Set the sprite URL from the custom tile's dataURL
    if (ct.dataURL) {
        gameSettings.playerSpriteURL = ct.dataURL;
        if (spriteUrlInput) {
            spriteUrlInput.value = ct.dataURL;
        }
    }

    // Transfer motion effect settings from custom tile to player idle effect
    if (ct.effect && ct.effect !== 'none') {
        gameSettings.playerIdleEffect = ct.effect;
        gameSettings.playerIdleEffectIntensity = ct.effectIntensity || 5;
        gameSettings.playerIdleEffectSpeed = ct.effectSpeed || 5;

        // Update UI controls to reflect the transferred settings
        const idleEffectSelect = document.getElementById('setting-player-idle-effect');
        if (idleEffectSelect) idleEffectSelect.value = ct.effect;
        const idleIntensitySlider = document.getElementById('setting-player-idle-intensity');
        const idleIntensityDisplay = document.getElementById('idle-effect-intensity-display');
        if (idleIntensitySlider) {
            idleIntensitySlider.value = gameSettings.playerIdleEffectIntensity;
            if (idleIntensityDisplay) idleIntensityDisplay.textContent = gameSettings.playerIdleEffectIntensity;
        }
        const idleSpeedSlider = document.getElementById('setting-player-idle-speed');
        const idleSpeedDisplay = document.getElementById('idle-effect-speed-display');
        if (idleSpeedSlider) {
            idleSpeedSlider.value = gameSettings.playerIdleEffectSpeed;
            if (idleSpeedDisplay) idleSpeedDisplay.textContent = gameSettings.playerIdleEffectSpeed;
        }
        toggleIdleEffectOptions();

        showToast(`Idle effect "${ct.effect}" applied to player`, 'info');
    } else {
        // Reset idle effect if custom tile has no effect
        gameSettings.playerIdleEffect = 'none';
        gameSettings.playerIdleEffectIntensity = 5;
        gameSettings.playerIdleEffectSpeed = 5;

        // Update UI controls
        const idleEffectSelect = document.getElementById('setting-player-idle-effect');
        if (idleEffectSelect) idleEffectSelect.value = 'none';
        toggleIdleEffectOptions();
    }

    // Auto-set cols and rows based on custom tile data
    let cols = 1;
    let rows = 1;

    if (ct.animated && ct.frames && ct.frames.length > 1) {
        // Animated tile - frames are separate images, so cols = frame count, rows = 1
        // But we need to construct a spritesheet or use a different approach
        // For now, we'll use the first frame and indicate animation info
        cols = ct.frames.length;
        rows = 1;

        // Note: Custom tiles store frames as separate images, not a spritesheet
        // The player sprite system expects a spritesheet URL
        // We need to build a spritesheet from the frames
        buildCustomTileSpritesheet(ct, function(spritesheetDataURL) {
            gameSettings.playerSpriteURL = spritesheetDataURL;
            if (spriteUrlInput) {
                spriteUrlInput.value = spritesheetDataURL;
            }
            updatePlayerSpritePreview();
        });
    } else {
        // Static tile - single frame
        cols = 1;
        rows = 1;
    }

    // Update cols/rows inputs and gameSettings
    gameSettings.playerSpritesheetCols = cols;
    gameSettings.playerSpritesheetRows = rows;

    if (colsInput) colsInput.value = cols;
    if (rowsInput) rowsInput.value = rows;

    // Update preview
    updatePlayerCustomTilePreview(tileKey);

    // Update player sprite preview
    updatePlayerSpritePreview();

    markDirty();
    showToast(`Player sprite set to "${ct.name || tileKey}"`, 'success');
}

// Build a horizontal spritesheet from custom tile frames
function buildCustomTileSpritesheet(customTile, callback) {
    if (!customTile.frames || customTile.frames.length === 0) {
        callback(customTile.dataURL);
        return;
    }

    const frames = customTile.frames;
    const frameCount = frames.length;

    // Load first frame to get dimensions
    const firstImg = new Image();
    firstImg.onload = function() {
        const frameWidth = firstImg.width;
        const frameHeight = firstImg.height;

        // Create canvas for horizontal spritesheet
        const canvas = document.createElement('canvas');
        canvas.width = frameWidth * frameCount;
        canvas.height = frameHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Load and draw all frames
        let loadedCount = 0;
        const images = [];

        frames.forEach((frameDataURL, index) => {
            const img = new Image();
            img.onload = function() {
                images[index] = img;
                loadedCount++;

                if (loadedCount === frameCount) {
                    // All frames loaded, draw them
                    images.forEach((frameImg, i) => {
                        ctx.drawImage(frameImg, i * frameWidth, 0);
                    });

                    // Return the combined spritesheet
                    callback(canvas.toDataURL('image/png'));
                }
            };
            img.src = frameDataURL;
        });
    };
    firstImg.src = frames[0];
}

// Update the custom tile preview in the player modal
function updatePlayerCustomTilePreview(tileKey) {
    const preview = document.getElementById('player-custom-tile-preview');
    if (!preview) return;

    if (!tileKey) {
        preview.innerHTML = '<span style="color:#666;font-size:10px;">Select a custom tile to use as player sprite</span>';
        return;
    }

    // Check if custom tile exists
    if (typeof customTiles !== 'object' || !customTiles[tileKey]) {
        preview.innerHTML = '<span style="color:#f66;font-size:10px;">Custom tile not found</span>';
        return;
    }

    const ct = customTiles[tileKey];
    const frameInfo = ct.animated && ct.frames ? ` (${ct.frames.length} frames @ ${ct.fps || 8}fps)` : '';

    if (ct.dataURL) {
        preview.innerHTML = `
            <img src="${ct.dataURL}" style="width:24px;height:24px;image-rendering:pixelated;border:1px solid #555;">
            <span style="color:#4ecdc4;font-size:10px;">${ct.name || tileKey}${frameInfo}</span>
        `;
    } else {
        preview.innerHTML = '<span style="color:#f66;font-size:10px;">No image data</span>';
    }
}

// Clear the custom tile selection when user manually enters a URL
function clearPlayerCustomTileSelection() {
    const select = document.getElementById('setting-player-custom-tile');
    if (select && select.value) {
        select.value = '';
        gameSettings.playerCustomTileKey = '';
        updatePlayerCustomTilePreview('');
    }
}

// ============================================
// COLLAPSIBLE SECTIONS
// ============================================

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.classList.toggle('open');
}

// Note: Object sprites are now managed through the template system
// See objectTemplates.js for sprite management

// ============================================
// SOUND EFFECTS
// ============================================

let testAudio = null;

function updateSound(type, url) {
    if (!gameSettings.sounds) gameSettings.sounds = {};
    gameSettings.sounds[type] = url.trim();
    markDirty();
}

function testSound(type) {
    // Try the setting-sound- prefix first (modal inputs), then fall back to sound- prefix
    let inputEl = document.getElementById('setting-sound-' + type);
    if (!inputEl) {
        inputEl = document.getElementById('sound-' + type);
    }
    const url = inputEl ? inputEl.value.trim() : '';

    // Debug logging
    console.log('testSound called with type:', type);
    console.log('Input element found:', inputEl ? inputEl.id : 'none');
    console.log('URL value:', url);
    console.log('gameSettings.sounds:', gameSettings.sounds);

    if (!url) {
        showToast('No sound URL entered', 'error');
        return;
    }

    // Check if it's a SoundEffectStudio project reference (sfx:12345)
    if (url.indexOf('sfx:') === 0) {
        const projectId = url.substring(4);
        console.log('Playing SFX project:', projectId);
        testSfxSound(projectId);
        return;
    }

    console.log('Playing as regular URL:', url);

    // Stop any currently playing test audio
    if (testAudio) {
        testAudio.pause();
        testAudio = null;
    }

    testAudio = new Audio(url);

    // Calculate volume based on settings
    const masterVol = gameSettings.masterVolume ?? 1.0;
    const isMusic = (type === 'bgm' || type === 'levelComplete' || type === 'gameOver');
    const typeVol = isMusic ? (gameSettings.musicVolume ?? 0.5) : (gameSettings.sfxVolume ?? 0.7);
    testAudio.volume = masterVol * typeVol;

    testAudio.oncanplaythrough = function() {
        testAudio.play().catch(err => {
            showToast('Could not play audio: ' + err.message, 'error');
        });
    };

    testAudio.onerror = function() {
        showToast('Could not load audio file', 'error');
    };

    // For background music, just play a short sample
    if (type === 'bgm') {
        setTimeout(() => {
            if (testAudio) {
                testAudio.pause();
                testAudio = null;
            }
        }, 5000); // Play 5 seconds for BGM test
    }
}

// Test a sound from any input element by its ID
// Used by template modals (enemies, collectibles, hazards, etc.)
function testSoundFromInput(inputId) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) {
        showToast('Input element not found', 'error');
        return;
    }

    const url = inputEl.value.trim();
    if (!url) {
        showToast('No sound configured', 'info');
        return;
    }

    // Check if it's a SoundEffectStudio project reference (sfx:12345)
    if (url.indexOf('sfx:') === 0) {
        const projectId = url.substring(4);
        testSfxSound(projectId);
        return;
    }

    // Play as regular URL
    if (testAudio) {
        testAudio.pause();
        testAudio = null;
    }

    testAudio = new Audio(url);
    const masterVol = gameSettings.masterVolume ?? 1.0;
    const typeVol = gameSettings.sfxVolume ?? 0.7;
    testAudio.volume = masterVol * typeVol;

    testAudio.oncanplaythrough = function() {
        testAudio.play().catch(err => {
            showToast('Could not play audio: ' + err.message, 'error');
        });
    };

    testAudio.onerror = function() {
        showToast('Could not load audio file', 'error');
    };
}

// Audio context for testing SFX sounds
let testSfxContext = null;

// Test a SoundEffectStudio sound by project ID
function testSfxSound(projectId) {
    // Check inline data first (from embedded SFX studio)
    if (gameSettings.sfxData && gameSettings.sfxData[projectId]) {
        console.log('Playing SFX from inline data, layers:', gameSettings.sfxData[projectId].layers?.length || 0);
        playTestSynthesizedSound(gameSettings.sfxData[projectId]);
        return;
    }

    // No inline data found — sound reference is orphaned
    console.warn('No inline data for SFX project:', projectId);
    showToast('Sound data not found. Unlink this sound and create a new one.', 'error');
}

// Play a synthesized sound for testing (simplified version of gameGenerator's playSynthesizedSound)
function playTestSynthesizedSound(synthData) {
    // Create or reuse audio context
    if (!testSfxContext || testSfxContext.state === 'closed') {
        testSfxContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume context if suspended (browser autoplay policy)
    if (testSfxContext.state === 'suspended') {
        testSfxContext.resume();
    }

    const ctx = testSfxContext;
    const masterSettings = synthData.masterSettings || {};
    const layers = synthData.layers || [];

    if (layers.length === 0) {
        showToast('No sound layers defined - add some layers in Sound Effect Studio first!', 'info');
        return;
    }

    // Check if any layers are enabled
    const enabledLayers = layers.filter(l => l.enabled !== false);
    if (enabledLayers.length === 0) {
        showToast('All sound layers are disabled - enable at least one layer!', 'info');
        return;
    }

    // Use master duration, or fall back to first layer's duration, or default 0.5s
    const masterDuration = masterSettings.duration ||
                           (layers[0] && layers[0].duration) ||
                           0.5;
    const masterVolume = (masterSettings.volume || 100) / 100;

    // Create master gain
    const masterGain = ctx.createGain();
    const finalVolume = masterVolume * (gameSettings.masterVolume ?? 1.0) * (gameSettings.sfxVolume ?? 0.7);
    masterGain.gain.value = finalVolume;
    masterGain.connect(ctx.destination);


    // Play each layer
    const now = ctx.currentTime;
    enabledLayers.forEach(layer => {
        const layerGain = ctx.createGain();
        const layerType = layer.type || 'sine';
        let sourceNode;

        // Use layer-specific duration if available, otherwise master duration
        const duration = layer.duration || masterDuration;
        // Apply layer delay - this offsets when the layer starts playing
        const layerDelay = layer.delay || 0;
        const startTime = now + layerDelay;

        // ADSR envelope - SoundEffectStudio stores values in SECONDS already
        // Values like 0.01 = 10ms, 0.1 = 100ms, etc.
        const attack = layer.attack !== undefined ? layer.attack : 0.01;
        const decay = layer.decay !== undefined ? layer.decay : 0.1;
        const sustain = layer.sustain !== undefined ? layer.sustain : 0.5;
        const release = layer.release !== undefined ? layer.release : 0.2;
        // Volume is already 0-1 range from SoundEffectStudio
        const layerVolume = layer.volume !== undefined ? layer.volume : 0.5;

        if (layerType === 'noise') {
            // Create noise using a buffer source
            const bufferSize = ctx.sampleRate * duration;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            sourceNode = ctx.createBufferSource();
            sourceNode.buffer = noiseBuffer;
        } else {
            // Standard oscillator (sine, square, sawtooth, triangle)
            sourceNode = ctx.createOscillator();
            sourceNode.type = layerType;

            // Set frequency with optional frequency sweep
            const startFreq = layer.frequency || 440;
            const endFreq = layer.frequencyEnd || startFreq;

            sourceNode.frequency.setValueAtTime(startFreq, startTime);
            if (endFreq !== startFreq) {
                sourceNode.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
            }
        }

        // Apply ADSR envelope
        layerGain.gain.setValueAtTime(0, startTime);
        layerGain.gain.linearRampToValueAtTime(layerVolume, startTime + attack);
        layerGain.gain.linearRampToValueAtTime(layerVolume * sustain, startTime + attack + decay);

        // Hold sustain until release phase
        const sustainEnd = Math.max(startTime + duration - release, startTime + attack + decay);
        layerGain.gain.setValueAtTime(layerVolume * sustain, sustainEnd);
        layerGain.gain.linearRampToValueAtTime(0, startTime + duration);

        sourceNode.connect(layerGain);
        layerGain.connect(masterGain);

        sourceNode.start(startTime);
        sourceNode.stop(startTime + duration + 0.1);
    });

    showToast('Playing sound...', 'info', 1000);
}


// ============================================
// GAME SETTINGS MODAL NAVIGATION
// ============================================

function showGameSettingsSection(sectionName) {
    // Update nav buttons
    document.querySelectorAll(".game-settings-nav-item").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.section === sectionName);
    });

    // Update content sections
    document.querySelectorAll(".game-settings-section").forEach(section => {
        section.classList.toggle("active", section.id === "game-settings-section-" + sectionName);
    });
}

// ============================================
// PLAYER PROPERTIES MODAL NAVIGATION
// ============================================

function showPlayerSection(sectionName) {
    // Update nav buttons
    document.querySelectorAll(".player-props-nav-item").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.section === sectionName);
    });

    // Update content sections
    document.querySelectorAll(".player-section").forEach(section => {
        section.classList.toggle("active", section.id === "player-section-" + sectionName);
    });
}

// ============================================
// LEVEL SETTINGS MODAL NAVIGATION
// ============================================

function showLevelSettingsSection(sectionName) {
    // Update nav buttons
    document.querySelectorAll(".level-settings-nav-item").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.section === sectionName);
    });

    // Update content sections
    document.querySelectorAll(".level-settings-section").forEach(section => {
        section.classList.toggle("active", section.id === "level-settings-section-" + sectionName);
    });
}

// ============================================
// MULTIPLAYER SETTINGS (EXPERIMENTAL)
// ============================================

function toggleMultiplayer(enabled) {
    // Multiplayer only works with Top-Down RPG mode
    if (enabled && gameSettings.gameType !== 'topdown') {
        showToast('⚠️ Multiplayer only works with Top-Down RPG mode', 'warning');
        const checkbox = document.getElementById('setting-multiplayer-enabled');
        if (checkbox) checkbox.checked = false;
        return;
    }

    updateGameSetting('multiplayerEnabled', enabled);

    const settingsPanel = document.getElementById('multiplayer-settings-panel');
    if (settingsPanel) {
        settingsPanel.style.display = enabled ? 'block' : 'none';
    }

    // Update summary panel
    const summaryOnline = document.getElementById('summary-online');
    if (summaryOnline) {
        summaryOnline.textContent = enabled ? 'On' : 'Off';
    }

    if (enabled) {
        showToast('🌐 Multiplayer enabled (Experimental)', 'info');
    }
}

function updateMultiplayerUI() {
    // Helper to safely set input value
    function setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    // Update multiplayer checkbox
    const enabledCheckbox = document.getElementById('setting-multiplayer-enabled');
    if (enabledCheckbox) {
        enabledCheckbox.checked = gameSettings.multiplayerEnabled === true;
    }

    // Update settings panel visibility
    const settingsPanel = document.getElementById('multiplayer-settings-panel');
    if (settingsPanel) {
        settingsPanel.style.display = gameSettings.multiplayerEnabled ? 'block' : 'none';
    }

    // Update summary panel
    const summaryOnline = document.getElementById('summary-online');
    if (summaryOnline) {
        summaryOnline.textContent = gameSettings.multiplayerEnabled ? 'On' : 'Off';
    }

    // Update max players slider
    const maxPlayersSlider = document.getElementById('setting-multiplayer-max-players');
    if (maxPlayersSlider) {
        maxPlayersSlider.value = gameSettings.multiplayerMaxPlayers || 4;
    }
    const maxPlayersDisplay = document.getElementById('max-players-display');
    if (maxPlayersDisplay) {
        maxPlayersDisplay.textContent = gameSettings.multiplayerMaxPlayers || 4;
    }

    // Update player name
    setInputValue('setting-multiplayer-player-name', gameSettings.multiplayerPlayerName || '');

    // Update checkboxes
    const showChatCheckbox = document.getElementById('setting-multiplayer-show-chat');
    if (showChatCheckbox) {
        showChatCheckbox.checked = gameSettings.multiplayerShowChat !== false; // Default true
    }

    const syncItemsCheckbox = document.getElementById('setting-multiplayer-sync-items');
    if (syncItemsCheckbox) {
        syncItemsCheckbox.checked = gameSettings.multiplayerSyncItems !== false; // Default true
    }

    const syncEnemiesCheckbox = document.getElementById('setting-multiplayer-sync-enemies');
    if (syncEnemiesCheckbox) {
        syncEnemiesCheckbox.checked = gameSettings.multiplayerSyncEnemies !== false; // Default true
    }


    // PvP Settings
    const pvpEnabledCheckbox = document.getElementById('setting-multiplayer-pvp-enabled');
    if (pvpEnabledCheckbox) {
        pvpEnabledCheckbox.checked = gameSettings.multiplayerPvPEnabled === true;
    }

    // Show/hide PvP settings panel based on PvP enabled
    const pvpSettingsPanel = document.getElementById('pvp-settings-panel');
    if (pvpSettingsPanel) {
        pvpSettingsPanel.style.display = gameSettings.multiplayerPvPEnabled ? 'block' : 'none';
    }

    // Update PvP sliders
    setInputValue('setting-multiplayer-pvp-damage', gameSettings.multiplayerPvPDamage || 1);
    const pvpDamageDisplay = document.getElementById('pvp-damage-display');
    if (pvpDamageDisplay) pvpDamageDisplay.textContent = gameSettings.multiplayerPvPDamage || 1;

    setInputValue('setting-multiplayer-pvp-kill-score', gameSettings.multiplayerPvPKillScore || 100);
    const pvpKillScoreDisplay = document.getElementById('pvp-kill-score-display');
    if (pvpKillScoreDisplay) pvpKillScoreDisplay.textContent = gameSettings.multiplayerPvPKillScore || 100;

    setInputValue('setting-multiplayer-pvp-lives', gameSettings.multiplayerPvPLives || 3);
    const pvpLivesDisplay = document.getElementById('pvp-lives-display');
    if (pvpLivesDisplay) pvpLivesDisplay.textContent = gameSettings.multiplayerPvPLives || 3;

    // Custom Player Sprites checkbox
    const customSpritesCheckbox = document.getElementById('setting-multiplayer-custom-sprites');
    if (customSpritesCheckbox) {
        customSpritesCheckbox.checked = gameSettings.multiplayerAllowCustomSprites === true;
    }
}

// Toggle PvP settings visibility
function togglePvPSettings(enabled) {
    if (enabled && !gameSettings.multiplayerEnabled) {
        showToast('Enable Multiplayer first to use PvP mode', 'warning');
        const checkbox = document.getElementById('setting-multiplayer-pvp-enabled');
        if (checkbox) checkbox.checked = false;
        return;
    }

    updateGameSetting('multiplayerPvPEnabled', enabled);

    const pvpSettingsPanel = document.getElementById('pvp-settings-panel');
    if (pvpSettingsPanel) {
        pvpSettingsPanel.style.display = enabled ? 'block' : 'none';
    }
}

// ============================================
// CHEAT CODES SYSTEM
// ============================================

// Available cheat effects with display names
const cheatEffects = {
    invincibility: { name: 'Invincibility', icon: '🛡️', hasDuration: true },
    infiniteLives: { name: 'Infinite Lives (99)', icon: '❤️', hasDuration: false },
    speedBoost: { name: 'Speed Boost (2x)', icon: '⚡', hasDuration: true },
    jumpBoost: { name: 'Super Jump (1.5x)', icon: '🦘', hasDuration: true },
    lowGravity: { name: 'Low Gravity (Moon)', icon: '🌙', hasDuration: true },
    oneHitKill: { name: 'One-Hit Kill', icon: '💥', hasDuration: false },
    maxAmmo: { name: 'Max Ammo', icon: '🔫', hasDuration: false },
    levelSkip: { name: 'Skip Level', icon: '⏭️', hasDuration: false },
    scoreBoost: { name: 'Score +1000', icon: '💰', hasDuration: false },
    tinyMode: { name: 'Tiny Mode (0.5x)', icon: '🐜', hasDuration: true },
    giantMode: { name: 'Giant Mode (1.5x)', icon: '🦖', hasDuration: true },
    turboFire: { name: 'Turbo Fire (3x)', icon: '🔥', hasDuration: true }
};

// Render the cheat codes list in the Cheats tab
function renderCheatCodesList() {
    const container = document.getElementById('cheat-codes-list');
    if (!container) return;

    if (cheatCodeTemplates.length === 0) {
        container.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No cheat codes configured</div>';
        return;
    }

    let html = '';
    cheatCodeTemplates.forEach((cheat, index) => {
        const effectInfo = cheatEffects[cheat.effect] || { name: cheat.effect, icon: '🎮' };
        const durationText = cheat.duration > 0 ? cheat.duration + 's' : 'Permanent';

        html += `
            <div class="cheat-code-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: ${cheat.enabled ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border-radius: 6px; margin-bottom: 6px; border: 1px solid ${cheat.enabled ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255, 255, 255, 0.1)'};">
                <input type="checkbox" ${cheat.enabled ? 'checked' : ''} onchange="toggleCheatCode('${cheat.id}', this.checked)" style="width: 16px; height: 16px; cursor: pointer;">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 14px;">${effectInfo.icon}</span>
                        <span style="font-weight: bold; color: #fff;">${cheat.name}</span>
                    </div>
                    <div style="font-size: 10px; color: #888; margin-top: 2px;">
                        Code: <code style="background: #0f3460; padding: 1px 4px; border-radius: 3px; color: #e94560;">${formatCheatCodeDisplay(cheat.code)}</code>
                        &nbsp;|&nbsp; ${durationText}
                    </div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-small" onclick="editCheatCode('${cheat.id}')" title="Edit" style="padding: 4px 8px; font-size: 11px;">✏️</button>
                    <button class="btn btn-small btn-danger" onclick="deleteCheatCode('${cheat.id}')" title="Delete" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Format cheat code for display (shorten arrow sequences)
function formatCheatCodeDisplay(code) {
    return code
        .replace(/UP/g, '↑')
        .replace(/DOWN/g, '↓')
        .replace(/LEFT/g, '←')
        .replace(/RIGHT/g, '→')
        .replace(/,/g, '');
}

// Toggle a cheat code on/off
function toggleCheatCode(id, enabled) {
    const cheat = cheatCodeTemplates.find(c => c.id === id);
    if (cheat) {
        cheat.enabled = enabled;
        markDirty();
        renderCheatCodesList();
    }
}

// Show the cheat code editor modal
let editingCheatId = null;

function showAddCheatCode() {
    editingCheatId = null;
    document.getElementById('cheat-editor-title').textContent = 'Add Cheat Code';
    document.getElementById('cheat-editor-name').value = '';
    document.getElementById('cheat-editor-code').value = '';
    document.getElementById('cheat-editor-effect').value = 'scoreBoost';
    document.getElementById('cheat-editor-duration').value = 30;
    document.getElementById('cheat-editor-duration-display').textContent = '30s';
    document.getElementById('cheat-editor-enabled').checked = true;
    updateCheatDurationVisibility();
    document.getElementById('cheat-editor-modal').style.display = 'flex';
}

function editCheatCode(id) {
    const cheat = cheatCodeTemplates.find(c => c.id === id);
    if (!cheat) return;

    editingCheatId = id;
    document.getElementById('cheat-editor-title').textContent = 'Edit Cheat Code';
    document.getElementById('cheat-editor-name').value = cheat.name;
    document.getElementById('cheat-editor-code').value = cheat.code;
    document.getElementById('cheat-editor-effect').value = cheat.effect;
    document.getElementById('cheat-editor-duration').value = cheat.duration;
    document.getElementById('cheat-editor-duration-display').textContent = cheat.duration > 0 ? cheat.duration + 's' : 'Permanent';
    document.getElementById('cheat-editor-enabled').checked = cheat.enabled;
    updateCheatDurationVisibility();
    document.getElementById('cheat-editor-modal').style.display = 'flex';
}

function closeCheatEditorModal() {
    document.getElementById('cheat-editor-modal').style.display = 'none';
    editingCheatId = null;
}

function saveCheatCode() {
    const name = document.getElementById('cheat-editor-name').value.trim();
    const code = document.getElementById('cheat-editor-code').value.trim().toUpperCase();
    const effect = document.getElementById('cheat-editor-effect').value;
    const duration = parseInt(document.getElementById('cheat-editor-duration').value) || 0;
    const enabled = document.getElementById('cheat-editor-enabled').checked;

    if (!name) {
        showToast('Please enter a name for the cheat', 'error');
        return;
    }
    if (!code || code.length < 2) {
        showToast('Please enter a cheat code (at least 2 characters)', 'error');
        return;
    }

    // Check for duplicate codes (excluding current if editing)
    const duplicate = cheatCodeTemplates.find(c => c.code.toUpperCase() === code && c.id !== editingCheatId);
    if (duplicate) {
        showToast('This code is already used by "' + duplicate.name + '"', 'error');
        return;
    }

    if (editingCheatId) {
        // Update existing
        const cheat = cheatCodeTemplates.find(c => c.id === editingCheatId);
        if (cheat) {
            cheat.name = name;
            cheat.code = code;
            cheat.effect = effect;
            cheat.duration = duration;
            cheat.enabled = enabled;
            cheat.description = cheatEffects[effect]?.name || effect;
        }
        showToast('Cheat code updated!', 'success');
    } else {
        // Add new
        const newCheat = {
            id: 'cheat_' + Date.now(),
            name: name,
            code: code,
            effect: effect,
            duration: duration,
            enabled: enabled,
            description: cheatEffects[effect]?.name || effect
        };
        cheatCodeTemplates.push(newCheat);
        showToast('Cheat code added!', 'success');
    }

    markDirty();
    renderCheatCodesList();
    closeCheatEditorModal();
}

function deleteCheatCode(id) {
    const cheat = cheatCodeTemplates.find(c => c.id === id);
    if (!cheat) return;

    if (confirm('Delete cheat code "' + cheat.name + '"?')) {
        const index = cheatCodeTemplates.findIndex(c => c.id === id);
        if (index !== -1) {
            cheatCodeTemplates.splice(index, 1);
            markDirty();
            renderCheatCodesList();
            showToast('Cheat code deleted', 'success');
        }
    }
}

// Update duration slider visibility based on effect type
function updateCheatDurationVisibility() {
    const effect = document.getElementById('cheat-editor-effect').value;
    const effectInfo = cheatEffects[effect];
    const durationGroup = document.getElementById('cheat-duration-group');

    if (durationGroup) {
        durationGroup.style.display = effectInfo?.hasDuration ? 'block' : 'none';
    }
}

// Update duration display when slider changes
function updateCheatDurationDisplay(value) {
    const display = document.getElementById('cheat-editor-duration-display');
    if (display) {
        display.textContent = value > 0 ? value + 's' : 'Permanent';
    }
}

// Update cheats UI when opening the tab
function updateCheatsUI() {
    // Update master toggles
    const cheatsEnabled = document.getElementById('setting-cheats-enabled');
    if (cheatsEnabled) cheatsEnabled.checked = gameSettings.cheatsEnabled === true;

    const cheatFeedback = document.getElementById('setting-cheat-feedback');
    if (cheatFeedback) cheatFeedback.checked = gameSettings.cheatFeedbackEnabled !== false;

    // Render cheat codes list
    renderCheatCodesList();
}

