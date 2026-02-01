// ============================================
// SAVE / LOAD
// ============================================

function serializeProject() {
    // Sync current level data before saving
    syncToCurrentLevel();

    return {
        version: '3.1', // Updated for custom tiles feature
        tileSize: tileSize,
        tiles: tiles, // Tile definitions (shared across levels)
        // Custom tiles (built-in pixel editor)
        customTiles: customTiles,
        nextCustomTileId: nextCustomTileId,
        // Multi-level data
        levels: levels,
        currentLevelIndex: currentLevelIndex,
        // Game settings (shared across levels)
        gameSettings: gameSettings,
        // Object templates (shared across levels)
        enemyTemplates: enemyTemplates,
        collectibleTemplates: collectibleTemplates,
        hazardTemplates: hazardTemplates,
        powerupTemplates: powerupTemplates,
        springTemplates: springTemplates,
        movingPlatformTemplates: movingPlatformTemplates,
        npcTemplates: npcTemplates,
        doorTemplates: doorTemplates,
        mysteryBlockTemplates: mysteryBlockTemplates,
        terrainZoneTemplates: terrainZoneTemplates,
        checkpointTemplate: checkpointTemplate,
        goalTemplate: goalTemplate,
        cheatCodeTemplates: cheatCodeTemplates,
        // Prefer base64 cache for portability, fallback to URL if CORS prevented conversion
        tilesetData: tilesetDataURLCache || (tilesetImage ? tilesetImage.src : null)
    };
}

// Sanitize level data to prevent corruption issues
function sanitizeLevelData(lvl) {
    const MAX_WIDTH = 500;
    const MAX_HEIGHT = 100;
    const MIN_WIDTH = 10;
    const MIN_HEIGHT = 5;

    // Clamp dimensions
    lvl.width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(lvl.width) || 150));
    lvl.height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.floor(lvl.height) || 30));

    // Ensure tiles array exists and has correct dimensions
    if (!Array.isArray(lvl.tiles)) {
        lvl.tiles = [];
    }

    // Fix row count
    while (lvl.tiles.length < lvl.height) {
        lvl.tiles.push('.'.repeat(lvl.width));
    }
    while (lvl.tiles.length > lvl.height) {
        lvl.tiles.pop();
    }

    // Fix each row's length and clean invalid characters
    for (let y = 0; y < lvl.tiles.length; y++) {
        let row = lvl.tiles[y];

        // Ensure row is a string
        if (typeof row !== 'string') {
            row = '.'.repeat(lvl.width);
        }

        // Truncate or pad to correct width
        if (row.length > lvl.width) {
            row = row.substring(0, lvl.width);
        } else if (row.length < lvl.width) {
            row = row + '.'.repeat(lvl.width - row.length);
        }

        lvl.tiles[y] = row;
    }

    return lvl;
}

function loadProjectData(data) {
    if (!data) return;

    // Load shared data
    if (data.tileSize) tileSize = data.tileSize;
    if (data.tiles) tiles = data.tiles;

    // Load custom tiles (v3.1+)
    if (data.customTiles) {
        customTiles = data.customTiles;
        // Clear and rebuild image cache for custom tiles
        clearCustomTileCache();
        // Pre-load all custom tile images
        Object.keys(customTiles).forEach(key => {
            getCustomTileImage(key);
        });
    } else {
        customTiles = {};
    }
    if (data.nextCustomTileId) {
        nextCustomTileId = data.nextCustomTileId;
    } else {
        // Calculate next ID from existing custom tiles (Unicode Private Use Area keys)
        const existingIds = Object.keys(customTiles)
            .filter(k => isCustomTile(k))
            .map(k => k.charCodeAt(0) - 0xE000);
        nextCustomTileId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    }

    // Migrate old gameSettings.sounds to new distributed format
    let legacySounds = null;
    if (data.gameSettings && data.gameSettings.sounds) {
        legacySounds = data.gameSettings.sounds;
        // Keep only player sounds in gameSettings
        data.gameSettings.sounds = {
            jump: legacySounds.jump || '',
            hurt: legacySounds.hurt || ''
        };
    }

    if (data.gameSettings) {
        gameSettings = { ...gameSettings, ...data.gameSettings };
        // Migrate old projects: default to platformer if no gameType
        if (gameSettings.gameType === undefined) {
            gameSettings.gameType = 'platformer';
        }
        // Ensure sounds object has correct structure (including projectile sounds)
        if (!gameSettings.sounds) {
            gameSettings.sounds = { jump: '', hurt: '', shoot: '', projectileHit: '' };
        } else {
            // Ensure projectile sounds exist for older projects
            if (gameSettings.sounds.shoot === undefined) gameSettings.sounds.shoot = '';
            if (gameSettings.sounds.projectileHit === undefined) gameSettings.sounds.projectileHit = '';
        }
        // Ensure projectile settings have defaults for older projects
        if (gameSettings.projectileEnabled === undefined) gameSettings.projectileEnabled = false;
        if (gameSettings.projectileFireKey === undefined) gameSettings.projectileFireKey = 'KeyX';
        if (gameSettings.projectileMode === undefined) gameSettings.projectileMode = 'cooldown';
        if (gameSettings.projectileCooldown === undefined) gameSettings.projectileCooldown = 500;
        if (gameSettings.projectileStartAmmo === undefined) gameSettings.projectileStartAmmo = 10;
        if (gameSettings.projectileMaxAmmo === undefined) gameSettings.projectileMaxAmmo = 30;
        if (gameSettings.projectileSpeed === undefined) gameSettings.projectileSpeed = 8;
        if (gameSettings.projectileLifetime === undefined) gameSettings.projectileLifetime = 2000;
        if (gameSettings.projectileDamage === undefined) gameSettings.projectileDamage = 1;
        if (gameSettings.projectileWidth === undefined) gameSettings.projectileWidth = 8;
        if (gameSettings.projectileHeight === undefined) gameSettings.projectileHeight = 8;
        if (gameSettings.projectileColor === undefined) gameSettings.projectileColor = '#ffff00';
        if (gameSettings.projectileSpriteURL === undefined) gameSettings.projectileSpriteURL = '';
        if (gameSettings.projectileFrameCount === undefined) gameSettings.projectileFrameCount = 1;
        // Migrate old doubleJumpEnabled to new jumpMode system
        if (gameSettings.jumpMode === undefined) {
            if (gameSettings.doubleJumpEnabled === true) {
                gameSettings.jumpMode = 'double';
            } else {
                gameSettings.jumpMode = 'normal';
            }
        }
        if (gameSettings.flyFlapPower === undefined) gameSettings.flyFlapPower = 6;
        // Ensure particle effects settings exist for older projects
        if (gameSettings.particleEffectsEnabled === undefined) gameSettings.particleEffectsEnabled = false;
        if (gameSettings.particleEffects === undefined) {
            gameSettings.particleEffects = {
                enemyDeath: '',
                collectItem: '',
                playerDamage: '',
                playerJump: '',
                checkpoint: '',
                levelComplete: ''
            };
        }
        updateGameSettingsUI();
    }

    // Load object templates (v2.0+) with sound, spritesheet, and particle effect migration
    if (data.enemyTemplates && data.enemyTemplates.length > 0) {
        enemyTemplates = data.enemyTemplates.map(t => ({
            ...t,
            contactSound: t.contactSound || '', // Ensure sound property exists
            // Migrate spritesheet properties for older projects
            spritesheetCols: t.spritesheetCols || t.frameCount || 1,
            spritesheetRows: t.spritesheetRows || 1,
            particleEffect: t.particleEffect || '' // Per-template particle effect
        }));
    }
    if (data.collectibleTemplates && data.collectibleTemplates.length > 0) {
        collectibleTemplates = data.collectibleTemplates.map(t => ({
            ...t,
            sound: t.sound || (legacySounds?.collect || ''), // Migrate from legacy collect sound
            // Migrate spritesheet properties for older projects
            spritesheetCols: t.spritesheetCols || t.frameCount || 1,
            spritesheetRows: t.spritesheetRows || 1,
            particleEffect: t.particleEffect || '' // Per-template particle effect
        }));
    }
    if (data.hazardTemplates && data.hazardTemplates.length > 0) {
        hazardTemplates = data.hazardTemplates.map(t => ({
            ...t,
            damageSound: t.damageSound || '', // Ensure sound property exists
            // Migrate spritesheet properties for older projects
            spritesheetCols: t.spritesheetCols || t.frameCount || 1,
            spritesheetRows: t.spritesheetRows || 1,
            particleEffect: t.particleEffect || '' // Per-template particle effect
        }));
    }
    if (data.powerupTemplates && data.powerupTemplates.length > 0) {
        powerupTemplates = data.powerupTemplates.map(t => ({
            ...t,
            sound: t.sound || '', // Ensure sound property exists
            // Migrate spritesheet properties for older projects
            spritesheetCols: t.spritesheetCols || t.frameCount || 1,
            spritesheetRows: t.spritesheetRows || 1,
            particleEffect: t.particleEffect || '' // Per-template particle effect
        }));
    }
    if (data.springTemplates && data.springTemplates.length > 0) {
        springTemplates = data.springTemplates.map(t => ({
            ...t,
            bounceSound: t.bounceSound || '', // Ensure sound property exists
            // Migrate spritesheet properties for older projects
            spritesheetCols: t.spritesheetCols || t.frameCount || 1,
            spritesheetRows: t.spritesheetRows || 1,
            particleEffect: t.particleEffect || '' // Per-template particle effect
        }));
    }
    // Load Moving Platform templates
    if (data.movingPlatformTemplates && data.movingPlatformTemplates.length > 0) {
        movingPlatformTemplates = data.movingPlatformTemplates.map(t => ({
            ...t,
            axis: t.axis || 'x',
            distance: t.distance || 100,
            speed: t.speed || 2,
            collisionMode: t.collisionMode || 'solid',
            activation: t.activation || 'always',
            tileKey: t.tileKey || '',
            moveSound: t.moveSound || '',
            showInactiveOutline: t.showInactiveOutline !== false, // Default true
            inactiveOutlineColor: t.inactiveOutlineColor || '#ffff00'
        }));
    }
    // Load NPC templates (for top-down RPG mode)
    if (data.npcTemplates && data.npcTemplates.length > 0) {
        npcTemplates = data.npcTemplates.map(t => ({
            ...t,
            dialogueLines: t.dialogueLines || [],
            interactionRadius: t.interactionRadius || 48,
            behavior: t.behavior || 'stationary',
            // Migrate spritesheet properties for older projects
            spritesheetCols: t.spritesheetCols || t.frameCount || 1,
            spritesheetRows: t.spritesheetRows || 1
        }));
    }
    // Load Door templates (for top-down RPG mode)
    if (data.doorTemplates && data.doorTemplates.length > 0) {
        doorTemplates = data.doorTemplates.map(t => ({
            ...t,
            destinationType: t.destinationType || 'level',
            interactSound: t.interactSound || '',
            // Migrate spritesheet properties for older projects
            spritesheetCols: t.spritesheetCols || t.frameCount || 1,
            spritesheetRows: t.spritesheetRows || 1
        }));
    }
    // Load Mystery Block templates
    if (data.mysteryBlockTemplates && data.mysteryBlockTemplates.length > 0) {
        mysteryBlockTemplates = data.mysteryBlockTemplates.map(t => ({
            ...t,
            emptySprite: t.emptySprite || '',
            emptyTileKey: t.emptyTileKey || '',
            emitType: t.emitType || 'collectible',
            emitTemplateId: t.emitTemplateId || 'coin',
            emitCount: t.emitCount || 1,
            depletedBehavior: t.depletedBehavior || 'solid',
            emitMode: t.emitMode || 'popup',
            emitDirection: t.emitDirection || 'up',
            emitSpeed: t.emitSpeed || 3,
            emitPopHeight: t.emitPopHeight || 32,
            emitGravity: t.emitGravity !== false,
            collectMode: t.collectMode || 'manual',
            autoCollectDelay: t.autoCollectDelay || 500,
            hitSound: t.hitSound || '',
            emptyHitSound: t.emptyHitSound || '',
            // Migrate spritesheet properties for older projects
            spritesheetCols: t.spritesheetCols || t.frameCount || 1,
            spritesheetRows: t.spritesheetRows || 1
        }));
    }
    // Load Terrain Zone templates
    if (data.terrainZoneTemplates && data.terrainZoneTemplates.length > 0) {
        terrainZoneTemplates = data.terrainZoneTemplates.map(t => ({
            ...t,
            imageURL: t.imageURL || '',
            tintColor: t.tintColor || '#4a90d9',
            opacity: t.opacity !== undefined ? t.opacity : 0.6,
            speedMultiplier: t.speedMultiplier !== undefined ? t.speedMultiplier : 0.5,
            jumpMultiplier: t.jumpMultiplier !== undefined ? t.jumpMultiplier : 0.7,
            gravityMultiplier: t.gravityMultiplier !== undefined ? t.gravityMultiplier : 0.8,
            damagePerSecond: t.damagePerSecond || 0,
            entrySound: t.entrySound || '',
            loopSound: t.loopSound || '',
            affectsEnemies: t.affectsEnemies !== false,
            symbol: t.symbol || '~'
        }));
    }
    if (data.checkpointTemplate) {
        checkpointTemplate = {
            ...data.checkpointTemplate,
            width: data.checkpointTemplate.width || 32,
            height: data.checkpointTemplate.height || 48,
            activateSound: data.checkpointTemplate.activateSound || '',
            // Migrate spritesheet properties for older projects
            spritesheetCols: data.checkpointTemplate.spritesheetCols || data.checkpointTemplate.frameCount || 1,
            spritesheetRows: data.checkpointTemplate.spritesheetRows || 1
        };
    }
    if (data.goalTemplate) {
        goalTemplate = {
            ...data.goalTemplate,
            width: data.goalTemplate.width || 32, // Ensure width exists
            height: data.goalTemplate.height || 32, // Ensure height exists
            reachSound: data.goalTemplate.reachSound || '', // Ensure sound property exists
            // Migrate spritesheet properties for older projects
            spritesheetCols: data.goalTemplate.spritesheetCols || data.goalTemplate.frameCount || 1,
            spritesheetRows: data.goalTemplate.spritesheetRows || 1
        };
    }
    // Load Cheat Code templates
    if (data.cheatCodeTemplates && data.cheatCodeTemplates.length > 0) {
        cheatCodeTemplates = data.cheatCodeTemplates.map(t => ({
            id: t.id || 'cheat_' + Date.now(),
            name: t.name || 'Custom Cheat',
            code: t.code || 'CODE',
            effect: t.effect || 'scoreBoost',
            duration: t.duration !== undefined ? t.duration : 0,
            enabled: t.enabled === true,
            description: t.description || ''
        }));

        // Migrate old cheat names to new names
        const cheatNameMigrations = {
            'God Mode': 'Invincible',
            'Speed Demon': 'Super Speed'
        };
        cheatCodeTemplates.forEach(cheat => {
            if (cheatNameMigrations[cheat.name]) {
                cheat.name = cheatNameMigrations[cheat.name];
            }
        });
    }

    // Check version and load levels accordingly
    const version = parseFloat(data.version) || 1.0;

    if (version >= 3.0 && data.levels && data.levels.length > 0) {
        // Version 3.0+: Multi-level format
        levels = data.levels.map(lvl => migrateGameObjects(lvl));
        // Sanitize level data to prevent corruption issues
        levels = levels.map(lvl => sanitizeLevelData(lvl));
        currentLevelIndex = data.currentLevelIndex || 0;
        if (currentLevelIndex >= levels.length) currentLevelIndex = 0;
    } else {
        // Version 1.0-2.0: Single level format - migrate to multi-level
        const singleLevel = createNewLevel('level_1', 'Level 1');
        singleLevel.width = data.levelWidth || 150;
        singleLevel.height = data.levelHeight || 30;
        singleLevel.tiles = data.level || [];
        singleLevel.spawnPoint = data.spawnPoint || null;
        singleLevel.backgroundLayers = data.backgroundLayers || [];

        // Migrate game objects
        if (data.gameObjects) {
            singleLevel.gameObjects = data.gameObjects.map(obj => {
                if (!obj.templateId) {
                    const legacyMapping = {
                        'enemy': { type: 'enemy', templateId: 'default' },
                        'coin': { type: 'collectible', templateId: 'coin' },
                        'gem': { type: 'collectible', templateId: 'gem' },
                        'goal': { type: 'goal', templateId: null },
                        'spike': { type: 'hazard', templateId: 'spike' },
                        'heart': { type: 'powerup', templateId: 'heart' }
                    };
                    const mapping = legacyMapping[obj.type];
                    if (mapping) {
                        return { ...obj, type: mapping.type, templateId: mapping.templateId };
                    }
                }
                return obj;
            });
        }

        levels = [sanitizeLevelData(singleLevel)];
        currentLevelIndex = 0;
    }

    // Migrate levelType for projects created before menu levels feature
    // Default all levels without levelType to 'gameplay'
    levels = levels.map(lvl => {
        if (!lvl.levelType) {
            lvl.levelType = 'gameplay';
        }
        return lvl;
    });

    // Ensure level progression is properly set (auto-link levels in sequence)
    if (typeof updateLevelProgression === 'function') {
        updateLevelProgression();
    }

    // Sync from current level
    syncFromCurrentLevel();

    // Load background images for current level
    loadBackgroundImages();

    // Update UI
    updateLevelsList();
    updateLevelIndicator();
    updateSpawnUI();
    updateObjectCount();

    // Load tileset image
    if (data.tilesetData) {
        const img = new Image();
        img.onload = () => {
            tilesetImage = img;
            tilesetDataURLCache = data.tilesetData;
            renderTilesetPreview();
            document.getElementById('tileset-preview').classList.add('visible');
            document.getElementById('tileset-dropzone').style.display = 'none';
            document.getElementById('tileset-url-section').style.display = 'none';
            renderTilePalette();
            draw();
        };
        img.src = data.tilesetData;
    }

    document.getElementById('tile-size-select').value = tileSize;
    renderTilePalette();
    renderCustomTilesPalette();
    renderBackgroundLayers();
    updateLevelSizeDisplay();
    updateLiveDataPreview();
    draw();

    showToast('Project loaded!');
}

// Helper to migrate game objects in a level
function migrateGameObjects(lvl) {
    if (lvl.gameObjects) {
        lvl.gameObjects = lvl.gameObjects.map(obj => {
            if (!obj.templateId) {
                const legacyMapping = {
                    'enemy': { type: 'enemy', templateId: 'default' },
                    'coin': { type: 'collectible', templateId: 'coin' },
                    'gem': { type: 'collectible', templateId: 'gem' },
                    'goal': { type: 'goal', templateId: null },
                    'spike': { type: 'hazard', templateId: 'spike' },
                    'heart': { type: 'powerup', templateId: 'heart' }
                };
                const mapping = legacyMapping[obj.type];
                if (mapping) {
                    return { ...obj, type: mapping.type, templateId: mapping.templateId };
                }
            }
            return obj;
        });
    }
    return lvl;
}

// ============================================
// SAVE / EXPORT
// ============================================

// Save project as a JSON file download.
// Platform adapter overrides this to save to server.
async function saveProject() {
    try {
        const projectData = serializeProject();
        const json = JSON.stringify(projectData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = (projectName || 'gamemaker-project') + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        markClean();
        showToast('Project saved!');
    } catch (error) {
        console.error('Save error:', error);
        showToast('Failed to save: ' + error.message, 'error');
    }
}

// Save project and reload the page
async function reloadGame() {
    showToast('Reloading...');
    window.location.reload();
}

// Silent save (no-op in standalone mode, platform adapter overrides)
async function saveProjectSilent() {
    // No-op in standalone mode
}

// ============================================
// SHARE PROJECT
// ============================================

// Share project (stub in standalone mode, platform adapter overrides)
async function shareProject() {
    showToast('Share is available when using the platform', 'info');
}

function showShareModal(url) {
    // Remove existing modal if any
    const existing = document.getElementById('share-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeShareModal()"></div>
        <div class="modal-content share-modal-content">
            <div class="modal-header">
                <h3>Share Level</h3>
                <button class="modal-close" onclick="closeShareModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 12px; color: #aaa; font-size: 13px;">
                    Anyone with this link can preview your level:
                </p>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="share-url-input" value="${url}" readonly
                        style="flex: 1; padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff; font-size: 12px;">
                    <button onclick="copyShareUrl()" class="btn" style="white-space: nowrap;">
                        Copy Link
                    </button>
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                    <button onclick="openShareUrl()" class="btn" style="padding: 8px 24px; background: linear-gradient(135deg, #e94560, #ff6b6b);">
                        Open Preview
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal styles if not already present
    if (!document.getElementById('share-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'share-modal-styles';
        styles.textContent = `
            #share-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #share-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
            }
            #share-modal .share-modal-content {
                position: relative;
                background: #1e1e2e;
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                border: 1px solid rgba(233, 69, 96, 0.3);
            }
            #share-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            #share-modal .modal-header h3 {
                margin: 0;
                color: #fff;
                font-size: 16px;
            }
            #share-modal .modal-close {
                background: none;
                border: none;
                color: #888;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            #share-modal .modal-close:hover {
                color: #fff;
            }
            #share-modal .modal-body {
                padding: 20px;
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(modal);
}

function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) modal.remove();
}

function copyShareUrl() {
    const input = document.getElementById('share-url-input');
    input.select();
    document.execCommand('copy');
    showToast('Link copied to clipboard!');
}

function openShareUrl() {
    const input = document.getElementById('share-url-input');
    window.open(input.value, '_blank');
}
