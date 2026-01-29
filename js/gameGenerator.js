// GAME HTML GENERATOR
// ============================================
// Extracted from index.php lines 6164-7488

// Collect all sfx: IDs from game data for bundling
function collectSfxIds() {
    const sfxIds = new Set();

    // Helper to check and add sfx ID
    function checkValue(val) {
        if (typeof val === 'string' && val.indexOf('sfx:') === 0) {
            sfxIds.add(val.substring(4));
        }
    }

    // Player sounds
    if (gameSettings.sounds) {
        checkValue(gameSettings.sounds.jump);
        checkValue(gameSettings.sounds.hurt);
        checkValue(gameSettings.sounds.shoot);
        checkValue(gameSettings.sounds.projectileHit);
    }

    // Level sounds
    if (typeof allLevels !== 'undefined') {
        allLevels.forEach(level => {
            if (level.sounds) {
                checkValue(level.sounds.levelComplete);
                checkValue(level.sounds.gameOver);
            }
        });
    }

    // Object template sounds (arrays)
    const templateArrays = [
        { arr: typeof enemyTemplates !== 'undefined' ? enemyTemplates : [], props: ['contactSound'] },
        { arr: typeof collectibleTemplates !== 'undefined' ? collectibleTemplates : [], props: ['sound'] },
        { arr: typeof hazardTemplates !== 'undefined' ? hazardTemplates : [], props: ['damageSound'] },
        { arr: typeof powerupTemplates !== 'undefined' ? powerupTemplates : [], props: ['sound'] },
        { arr: typeof springTemplates !== 'undefined' ? springTemplates : [], props: ['bounceSound'] },
        { arr: typeof npcTemplates !== 'undefined' ? npcTemplates : [], props: ['interactSound'] },
        { arr: typeof doorTemplates !== 'undefined' ? doorTemplates : [], props: ['interactSound'] },
        { arr: typeof mysteryBlockTemplates !== 'undefined' ? mysteryBlockTemplates : [], props: ['hitSound', 'emptyHitSound'] },
        { arr: typeof movingPlatformTemplates !== 'undefined' ? movingPlatformTemplates : [], props: ['moveSound', 'collapseSound'] },
        { arr: typeof terrainZoneTemplates !== 'undefined' ? terrainZoneTemplates : [], props: ['entrySound', 'loopSound'] }
    ];

    templateArrays.forEach(({ arr, props }) => {
        if (Array.isArray(arr)) {
            arr.forEach(template => {
                if (template) {
                    props.forEach(prop => checkValue(template[prop]));
                }
            });
        }
    });

    // Single object templates (not arrays)
    if (typeof checkpointTemplate !== 'undefined' && checkpointTemplate) {
        checkValue(checkpointTemplate.activateSound);
    }
    if (typeof goalTemplate !== 'undefined' && goalTemplate) {
        checkValue(goalTemplate.reachSound);
    }

    return Array.from(sfxIds);
}

// Fetch all SFX data for bundling (async)
async function fetchAllSfxData(sfxIds) {
    const sfxData = {};

    await Promise.all(sfxIds.map(async (id) => {
        try {
            const response = await fetch('/beta/applications/SoundEffectStudio/get_synthesis_data.php?id=' + id);
            const result = await response.json();
            if (result.success && result.data) {
                sfxData[id] = result.data;
            }
        } catch (e) {
            console.warn('Failed to fetch SFX data for project ' + id);
        }
    }));

    return sfxData;
}

// Async wrapper to generate game with bundled SFX data
async function generateGameHTMLAsync(includeComments = false, pixelScale = 1) {
    const sfxIds = collectSfxIds();
    let bundledSfxData = {};

    if (sfxIds.length > 0) {
        bundledSfxData = await fetchAllSfxData(sfxIds);
    }

    return generateGameHTML(includeComments, pixelScale, bundledSfxData);
}

// Helper function to format fire key for display
function formatFireKey(keyCode) {
    if (!keyCode) return 'X';
    const keyMap = {
        'KeyX': 'X',
        'KeyZ': 'Z',
        'KeyC': 'C',
        'ShiftLeft': 'Shift',
        'ShiftRight': 'Shift',
        'ControlLeft': 'Ctrl',
        'ControlRight': 'Ctrl',
        'Enter': 'Enter',
        'Space': 'Space'
    };
    return keyMap[keyCode] || keyCode.replace('Key', '');
}

function generateGameHTML(includeComments = false, pixelScale = 1, bundledSfxData = {}) {
    // Check if any templates have particle effects configured (auto-enable feature)
    const templateArrays = [enemyTemplates, collectibleTemplates, hazardTemplates, powerupTemplates, springTemplates, mysteryBlockTemplates, doorTemplates];
    const hasTemplateParticleEffects = templateArrays.some(templates =>
        templates && Array.isArray(templates) && templates.some(t => t && t.particleEffect)
    );
    // Also check if any global particle effects are configured
    const hasGlobalParticleEffects = gameSettings.particleEffects && (
        gameSettings.particleEffects.playerDamage ||
        gameSettings.particleEffects.playerJump ||
        gameSettings.particleEffects.checkpoint ||
        gameSettings.particleEffects.levelComplete
    );

    // Generate tile types from our tiles
    let tileTypesCode = '';
    if (includeComments) {
        tileTypesCode += `    // ═══════════════════════════════════════════════════════════════════════════
    // TILE DEFINITIONS - This is where you define what each character means
    // ═══════════════════════════════════════════════════════════════════════════
    // Each character in the level array maps to a tile definition here.
    //
    // Properties:
    //   row: Which row in the tileset image (0 = top row)
    //   col: Which column in the tileset image (0 = left column)
    //   solid: true = player can stand on it, false = player passes through
    //
    // TO ADD NEW TILES:
    // 1. Add a new entry like: 'X': { row: 2, col: 0, solid: true },
    // 2. Use that character in your level array below
    // 3. Make sure your tileset image has a tile at that row/column
    //
    // EXAMPLE: Add a ladder tile:
    //   'L': { row: 5, col: 0, solid: false },  // Ladder - not solid, player passes through
    //
    // TIP: Use solid:false for decorations, backgrounds, or special tiles
    // ═══════════════════════════════════════════════════════════════════════════
`;
    }
    tileTypesCode += '    const tileTypes = {\n';
    tileTypesCode += "        '.': null,  // Empty space - no tile is drawn\n";

    for (const key in tiles) {
        const tile = tiles[key];
        const row = Math.floor(tile.y / tileSize);
        const col = Math.floor(tile.x / tileSize);
        tileTypesCode += `        '${key}': { row: ${row}, col: ${col}, solid: ${tile.solid} },\n`;
    }

    // Helper to validate custom tile keys
    function isValidCustomTileKey(key) {
        if (!key) return false;
        // New format: alphanumeric keys starting with "custom_"
        if (/^custom_\d+$/.test(key)) return true;
        // Legacy format: single Unicode character in Private Use Area (U+E000 to U+F8FF)
        if (key.length === 1) {
            const code = key.charCodeAt(0);
            return code >= 0xE000 && code <= 0xF8FF;
        }
        return false;
    }

    // Helper to escape a key for safe embedding in JavaScript strings
    // This converts Unicode characters to \uXXXX escape sequences
    function escapeKeyForJS(key) {
        let escaped = '';
        for (let i = 0; i < key.length; i++) {
            const code = key.charCodeAt(i);
            if (code > 127) {
                // Escape non-ASCII characters as \uXXXX
                escaped += '\\u' + code.toString(16).padStart(4, '0');
            } else {
                escaped += key[i];
            }
        }
        return escaped;
    }

    // Add custom tiles (built-in pixel editor tiles)
    for (const key in customTiles) {
        // Skip empty or invalid keys (defensive check)
        if (!isValidCustomTileKey(key)) {
            console.warn('GameMaker: Skipping invalid custom tile key:', JSON.stringify(key));
            continue;
        }
        const escapedKey = escapeKeyForJS(key);
        const customTile = customTiles[key];
        // Custom tiles use 'custom: true' flag and reference customTileImages
        // Animated tiles also include fps and frameCount
        // Hitbox presets: full, top, bottom, left, right (normalized 0-1 values)
        const hitbox = customTile.hitbox || 'full';
        const hitboxData = hitbox !== 'full' ? `, hitbox: '${hitbox}'` : '';
        if (customTile.animated && customTile.frames && customTile.frames.length > 1) {
            tileTypesCode += `        '${escapedKey}': { custom: true, solid: ${customTile.solid !== false}${hitboxData}, animated: true, fps: ${customTile.fps || 8}, frameCount: ${customTile.frames.length} },\n`;
        } else {
            tileTypesCode += `        '${escapedKey}': { custom: true, solid: ${customTile.solid !== false}${hitboxData} },\n`;
        }
    }
    tileTypesCode += '    };\n';

    // Generate custom tile images data
    let customTileImagesCode = '    var customTileImages = {};\n';
    let animatedTilesCode = '    var animatedTileFrames = {};\n';
    // Filter out invalid keys using the same validation as above
    const customTileKeys = Object.keys(customTiles).filter(isValidCustomTileKey);
    if (customTileKeys.length > 0) {
        customTileImagesCode += '    var customTileDataURLs = {\n';
        for (const key of customTileKeys) {
            // For animated tiles, use the first frame for the main image
            const escapedKey = escapeKeyForJS(key);
            customTileImagesCode += `        '${escapedKey}': '${customTiles[key].dataURL}',\n`;
        }
        customTileImagesCode += '    };\n';

        // Generate animated tile frames
        let hasAnimatedTiles = false;
        for (const key of customTileKeys) {
            const tile = customTiles[key];
            if (tile.animated && tile.frames && tile.frames.length > 1) {
                hasAnimatedTiles = true;
                const escapedKey = escapeKeyForJS(key);
                animatedTilesCode += `    animatedTileFrames['${escapedKey}'] = [\n`;
                for (const frame of tile.frames) {
                    animatedTilesCode += `        '${frame}',\n`;
                }
                animatedTilesCode += `    ];\n`;
            }
        }

        customTileImagesCode += `
    // Pre-load custom tile images
    for (var ctKey in customTileDataURLs) {
        var ctImg = new Image();
        ctImg.src = customTileDataURLs[ctKey];
        customTileImages[ctKey] = ctImg;
    }
`;

        if (hasAnimatedTiles) {
            // Add animatedTileFrames data BEFORE it's used
            customTileImagesCode += animatedTilesCode;
            customTileImagesCode += `
    // Pre-load animated tile frames
    var animatedTileImages = {};
    for (var atKey in animatedTileFrames) {
        animatedTileImages[atKey] = [];
        for (var fi = 0; fi < animatedTileFrames[atKey].length; fi++) {
            var frameImg = new Image();
            frameImg.src = animatedTileFrames[atKey][fi];
            animatedTileImages[atKey].push(frameImg);
        }
    }

    // Track animation timing for animated tiles
    var animatedTileTimers = {};
    var animatedTileCurrentFrames = {};
    for (var atKey in animatedTileFrames) {
        animatedTileTimers[atKey] = 0;
        animatedTileCurrentFrames[atKey] = 0;
    }
`;
        }

        // Generate tile effect data
        let hasTileEffects = false;
        let tileEffectsCode = '    var tileEffects = {};\n';
        for (const key of customTileKeys) {
            const tile = customTiles[key];
            if (tile.effect && tile.effect !== 'none') {
                hasTileEffects = true;
                const escapedKey = escapeKeyForJS(key);
                tileEffectsCode += `    tileEffects['${escapedKey}'] = { effect: '${tile.effect}', intensity: ${tile.effectIntensity || 5}, speed: ${tile.effectSpeed || 5} };\n`;
            }
        }
        if (hasTileEffects) {
            customTileImagesCode += tileEffectsCode;
            customTileImagesCode += `
    // Tile effect timing
    var tileEffectTime = 0;
`;
        }
    }

    // Sync current level before generating
    if (typeof syncToCurrentLevel === 'function') {
        syncToCurrentLevel();
    }

    // Ensure level progression is properly set (auto-link levels in sequence)
    if (typeof updateLevelProgression === 'function') {
        updateLevelProgression();
    }

    // Generate levels array (multi-level system)
    let levelsCode = '';
    if (includeComments) {
        levelsCode += `
    // ═══════════════════════════════════════════════════════════════════════════
    // LEVEL DATA - Multiple levels for your game!
    // ═══════════════════════════════════════════════════════════════════════════
    // Each level contains:
    //   - id: Unique identifier for the level
    //   - name: Display name shown to player
    //   - tiles: Array of strings representing the map
    //   - gameObjects: Enemies, collectibles, hazards, powerups, goals
    //   - spawnPoint: Where the player starts (null = auto-detect)
    //   - goalCondition: How to complete the level
    //     - 'goal': Reach the goal flag
    //     - 'collect_all': Collect all collectibles
    //     - 'score': Reach the required score
    //     - 'survive': Survive for the time limit
    //   - nextLevelId: ID of next level (null = game complete)
    //   - requiredScore: Score needed for 'score' condition
    //   - timeLimit: Seconds for 'survive' condition
    // ═══════════════════════════════════════════════════════════════════════════
`;
    }
    levelsCode += '    var allLevels = ' + JSON.stringify(levels, null, 8) + ';\n';
    levelsCode += '    var startingLevelIndex = ' + currentLevelIndex + ';\n';
    levelsCode += '    var currentLevelIndex = startingLevelIndex;\n';
    levelsCode += '    var level = [];\n';
    levelsCode += '    var levelWidth = 0;\n';
    levelsCode += '    var levelHeight = 0;\n';
    levelsCode += '    var gameObjectsData = [];\n';
    levelsCode += '    var spawnPoint = null;\n';
    levelsCode += '    var goalCondition = "goal";\n';
    levelsCode += '    var nextLevelId = null;\n';
    levelsCode += '    var requiredScore = 0;\n';
    levelsCode += '    var timeLimit = 0;\n';
    levelsCode += '    var levelTimer = 0;\n';
    levelsCode += '    var collectiblesTotal = 0;\n';
    levelsCode += '    var collectiblesCollected = 0;\n';
    levelsCode += '    // Autoscroll settings\n';
    levelsCode += '    var autoscrollEnabled = false;\n';
    levelsCode += '    var autoscrollSpeed = 3;\n';
    levelsCode += '    var autoscrollMode = "end";\n';
    levelsCode += '    var autoscrollX = 0;\n';

    // Get tileset as base64 - use cached version if available
    let tilesetDataURL = tilesetDataURLCache || '';

    // If no cached version, try to generate one (for backwards compatibility)
    if (!tilesetDataURL && tilesetImage) {
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = tilesetImage.width;
            tempCanvas.height = tilesetImage.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(tilesetImage, 0, 0);
            tilesetDataURL = tempCanvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Could not export tileset as base64:', e);
        }
    }

    // Generate background layers code
    let bgLayersCode = '';
    if (includeComments) {
        bgLayersCode += `
    // ═══════════════════════════════════════════════════════════════════════════
    // PARALLAX BACKGROUND LAYERS
    // ═══════════════════════════════════════════════════════════════════════════
    // Parallax creates depth by moving background layers at different speeds.
    // Slower layers appear farther away, faster layers appear closer.
    //
    // Each layer has:
    //   src: URL to the image (can be a web URL or data:image)
    //   speed: 0.0 (stationary) to 1.0 (moves with camera)
    //
    // TYPICAL SPEEDS:
    //   0.1 - 0.2: Distant sky, clouds, mountains
    //   0.3 - 0.5: Mid-distance buildings, trees
    //   0.6 - 0.8: Close foreground elements
    //
    // TO ADD A NEW LAYER:
    // 1. Add an object to the array: { src: 'your-image-url.png', speed: 0.3 }
    // 2. Layers are drawn back-to-front (first layer = farthest back)
    //
    // TIP: Use transparent PNGs so layers can overlap nicely!
    // ═══════════════════════════════════════════════════════════════════════════
`;
    }
    bgLayersCode += '    var backgroundLayers = [\n';
    let validLayerCount = 0;
    backgroundLayers.forEach((layer, i) => {
        // Only include visible layers with valid URLs
        if (layer.src && layer.src.trim() !== '' && layer.visible !== false) {
            // Escape special characters in the URL to prevent JavaScript syntax errors
            const escapedSrc = layer.src
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/\n/g, '')
                .replace(/\r/g, '');
            if (validLayerCount > 0) {
                bgLayersCode += ',\n';
            }
            bgLayersCode += `        { src: '${escapedSrc}', speed: ${layer.speed} }`;
            validLayerCount++;
        }
    });
    if (validLayerCount > 0) {
        bgLayersCode += '\n';
    }
    bgLayersCode += '    ];\n';
    bgLayersCode += '    var loadedBgImages = [];\n';

    // Build the comprehensive learning mode header
    let learningHeader = '';
    if (includeComments) {
        learningHeader = `
// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║                         MY PLATFORMER GAME                                     ║
// ║                   Created with Game Maker - mytekOS                         ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝
//
// Welcome to your game's source code! This file contains everything needed to run
// your platformer game in any web browser. Let's learn how it works!
//
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ TABLE OF CONTENTS                                                            │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │ 1. HTML STRUCTURE      - The page layout (canvas + controls info)            │
// │ 2. CSS STYLES          - How the page looks (colors, centering)              │
// │ 3. GAME CONFIGURATION  - Tile size, canvas dimensions, physics               │
// │ 4. TILE DEFINITIONS    - What each character means in your level             │
// │ 5. LEVEL DATA          - Your actual game map (the fun part!)                │
// │ 6. PLAYER SETUP        - Player properties and movement settings             │
// │ 7. INPUT HANDLING      - Keyboard controls                                   │
// │ 8. COLLISION DETECTION - How the player interacts with tiles                 │
// │ 9. GAME LOOP           - Update and draw, 60 times per second                │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ HOW TO CUSTOMIZE YOUR GAME                                                   │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │ EASY CHANGES:                                                                │
// │   • Change colors: Search for '#' followed by 6 characters                   │
// │   • Adjust physics: Modify GRAVITY, JUMP_POWER, MOVE_SPEED                   │
// │   • Edit level: Change the characters in the level array                     │
// │                                                                               │
// │ MEDIUM CHANGES:                                                              │
// │   • Add new tile types in the tileTypes object                               │
// │   • Change player size (width/height)                                        │
// │   • Add sound effects (use Audio API)                                        │
// │                                                                               │
// │ ADVANCED CHANGES:                                                            │
// │   • Add enemies (create enemy objects, update/draw them)                     │
// │   • Add collectibles (coins, power-ups)                                      │
// │   • Add a score system                                                       │
// │   • Add multiple levels                                                      │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ JAVASCRIPT BASICS USED IN THIS GAME                                          │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │ Variables:    var x = 5;              // Stores a value                      │
// │ Objects:      { name: 'value' }       // Groups related data                 │
// │ Arrays:       [item1, item2, item3]   // Lists of items                      │
// │ Functions:    function name() { }     // Reusable code blocks                │
// │ Conditionals: if (condition) { }      // Do something if true                │
// │ Loops:        for (var i=0; i<10; i++)// Repeat code                         │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// Ready to learn? Let's dive in! Each section below has detailed explanations.
// ═══════════════════════════════════════════════════════════════════════════════

`;
    }

    return `<!DOCTYPE html>
${includeComments ? `<!--
═══════════════════════════════════════════════════════════════════════════════
PLATFORMER GAME - HTML STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

This is an HTML5 game that runs entirely in the browser - no server needed!

HTML BASICS:
- <!DOCTYPE html> tells the browser this is HTML5
- <html> is the root element containing everything
- <head> contains metadata (title, styles) - not visible on page
- <body> contains visible content (canvas, controls info)

KEY ELEMENTS:
- <canvas> is where the game is drawn (like a digital drawing board)
- <style> contains CSS to control how things look
- <script> contains JavaScript that makes the game work
═══════════════════════════════════════════════════════════════════════════════
-->
` : ''}<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>My Platformer Game</title>
${(gameSettings.multiplayerEnabled && gameSettings.gameType === 'topdown') ? '    <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>\n' : ''}${(gameSettings.multiplayerEnabled && gameSettings.gameType === 'topdown' && (gameSettings.multiplayerAllowCustomSprites === true || gameSettings.multiplayerAllowCustomSprites === 'true')) ? '    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">\n    <link rel="stylesheet" href="https://www.mytekos.com/beta/applications/components/asset-library-picker/asset-library-picker.css">\n    <script src="https://www.mytekos.com/beta/applications/components/asset-library-picker/asset-library-picker.js"></script>\n' : ''}    ${includeComments ? `<!--
    ═══════════════════════════════════════════════════════════════════════════
    CSS STYLES - How the page looks
    ═══════════════════════════════════════════════════════════════════════════
    CSS (Cascading Style Sheets) controls appearance. Each rule has:
    - A selector (what to style): body, canvas, #info
    - Properties (how to style): color, margin, background

    COMMON PROPERTIES:
    - margin: space outside an element
    - padding: space inside an element
    - background: background color or image
    - color: text color
    - display: how element behaves (block, flex, etc.)

    TRY: Change #1a1a2e to #2a4a6a for a blue theme!
    ═══════════════════════════════════════════════════════════════════════════
    -->` : ''}
    <style>
        html, body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #1a1a2e;
            width: 100%;
            height: 100%;
        }
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        #game {
            /* Crisp pixel art scaling */
            image-rendering: -moz-crisp-edges;
            image-rendering: -webkit-crisp-edges;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        }
        canvas {
            display: block;
            background: #0d0d1a;
            border-radius: 8px;
        }
        #info {
            color: #888;
            font-family: 'Segoe UI', sans-serif;
            font-size: 12px;
            margin-top: 10px;
            text-align: center;
        }
        /* Mobile touch controls */
        .mobile-controls {
            display: none; /* Hidden by default, shown on touch devices */
            position: fixed;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 1000;
        }
        .mobile-control-btn {
            position: absolute;
            width: 90px;
            height: 90px;
            background: rgba(255, 255, 255, 0.1);
            border: 3px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 40px;
            user-select: none;
            pointer-events: auto;
            touch-action: none;
            transition: all 0.1s;
        }
        .mobile-control-btn:active {
            background: rgba(255, 255, 255, 0.35);
            border-color: rgba(255, 255, 255, 0.6);
            color: rgba(255, 255, 255, 1);
            transform: scale(1.05);
        }
        #mobile-left {
            bottom: 100px;
            left: 20px;
        }
        #mobile-right {
            bottom: 100px;
            left: 130px;
        }
        #mobile-jump {
            bottom: 100px;
            right: 20px;
        }
        /* Top-down mode D-pad layout */
        #mobile-up {
            bottom: 190px;
            left: 75px;
        }
        #mobile-down {
            bottom: 10px;
            left: 75px;
        }
        #mobile-interact {
            bottom: 100px;
            right: 20px;
            background: rgba(100, 200, 255, 0.15);
            border-color: rgba(100, 200, 255, 0.3);
            color: rgba(100, 200, 255, 0.9);
        }
        #mobile-interact:active {
            background: rgba(100, 200, 255, 0.4);
            border-color: rgba(100, 200, 255, 0.7);
        }
        #mobile-inventory {
            top: 10px;
            right: 20px;
            width: 60px;
            height: 60px;
            font-size: 28px;
            background: rgba(200, 150, 100, 0.15);
            border-color: rgba(200, 150, 100, 0.3);
            color: rgba(200, 150, 100, 0.9);
        }
        #mobile-inventory:active {
            background: rgba(200, 150, 100, 0.4);
            border-color: rgba(200, 150, 100, 0.7);
        }
        #mobile-shoot {
            bottom: 210px;
            right: 20px;
            background: rgba(255, 200, 0, 0.15);
            border-color: rgba(255, 200, 0, 0.3);
            color: rgba(255, 200, 0, 0.8);
        }
        #mobile-shoot:active {
            background: rgba(255, 200, 0, 0.4);
            border-color: rgba(255, 200, 0, 0.7);
        }
        /* Landscape mode adjustments - move controls lower and make smaller */
        @media (orientation: landscape) and (max-height: 500px) {
            .mobile-control-btn {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.15);
                width: 70px;
                height: 70px;
                font-size: 28px;
            }
            #mobile-left {
                bottom: 15px;
                left: 15px;
            }
            #mobile-right {
                bottom: 15px;
                left: 100px;
            }
            #mobile-jump {
                bottom: 15px;
                right: 15px;
            }
            #mobile-shoot {
                bottom: 100px;
                right: 15px;
            }
            /* Top-down mode landscape D-pad layout - proper spacing to avoid overlap */
            /* D-pad arrangement: Up on top, Left/Right in middle row, Down at bottom */
            /* With 70px buttons: Left(5-75), gap, Up/Down(80-150), gap, Right(155-225) */
            body.topdown-mode #mobile-left {
                bottom: 42px;
                left: 5px;
            }
            body.topdown-mode #mobile-right {
                bottom: 42px;
                left: 155px;
            }
            #mobile-up {
                bottom: 88px;
                left: 80px;
            }
            #mobile-down {
                bottom: 0px;
                left: 80px;
            }
            #mobile-interact {
                bottom: 10px;
                right: 15px;
            }
        }
        /* Keyboard controls overlay - desktop only */
        #keyboard-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 10px 14px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 11px;
            color: #ccc;
            z-index: 100;
            max-width: 200px;
            pointer-events: none;
            transition: opacity 0.5s ease-out;
            opacity: 1;
        }
        #keyboard-controls.hidden {
            opacity: 0;
        }
        #keyboard-controls .controls-title {
            color: #667eea;
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        #keyboard-controls .control-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
        }
        #keyboard-controls .control-key {
            background: rgba(102, 126, 234, 0.3);
            border: 1px solid rgba(102, 126, 234, 0.5);
            border-radius: 3px;
            padding: 1px 5px;
            font-family: monospace;
            font-size: 10px;
            color: #fff;
            min-width: 20px;
            text-align: center;
        }
        #keyboard-controls .control-action {
            color: #aaa;
            margin-left: 8px;
        }
        #keyboard-controls .controls-hint {
            color: #666;
            font-size: 9px;
            margin-top: 6px;
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 5px;
        }
        @media (max-width: 600px), (pointer: coarse) {
            #keyboard-controls {
                display: none !important;
            }
        }
    </style>
</head>
<body class="${gameSettings.gameType === 'topdown' ? 'topdown-mode' : 'platformer-mode'}">
${includeComments ? `<!--
The <canvas> element is where all the game graphics are drawn.
It's like a blank piece of paper that JavaScript can draw on.
The id="game" lets JavaScript find this specific canvas.
-->` : ''}
<canvas id="game"></canvas>
<div id="info">${gameSettings.gameType === 'topdown'
    ? `WASD to move | E to interact${gameSettings.projectileEnabled ? ` | ${formatFireKey(gameSettings.projectileFireKey)} to shoot` : ''} | R to restart`
    : `Arrow Keys / WASD to move | Space to jump${gameSettings.projectileEnabled ? ` | ${formatFireKey(gameSettings.projectileFireKey)} to shoot` : ''} | R to restart`}</div>

${includeComments ? `<!-- Mobile touch controls - shown only on touch devices -->` : ''}
<div class="mobile-controls" id="mobile-controls">
    <div class="mobile-control-btn" id="mobile-left">◄</div>
    <div class="mobile-control-btn" id="mobile-right">►</div>
${gameSettings.gameType === 'topdown' ? `    <div class="mobile-control-btn" id="mobile-up">▲</div>
    <div class="mobile-control-btn" id="mobile-down">▼</div>
    <div class="mobile-control-btn" id="mobile-interact">E</div>
    <div class="mobile-control-btn" id="mobile-inventory">📦</div>` : `    <div class="mobile-control-btn" id="mobile-jump">▲</div>`}
${gameSettings.projectileEnabled ? `    <div class="mobile-control-btn" id="mobile-shoot">🎯</div>` : ''}
</div>

${includeComments ? `<!-- Keyboard controls overlay - shown only on desktop -->` : ''}
<div id="keyboard-controls">
    <div class="controls-title">⌨️ Controls</div>
    ${gameSettings.gameType === 'topdown'
        ? `<div class="control-row"><span class="control-key">WASD</span><span class="control-action">Move</span></div>
    <div class="control-row"><span class="control-key">E</span><span class="control-action">Interact</span></div>
    <div class="control-row"><span class="control-key">I</span><span class="control-action">Inventory</span></div>`
        : `<div class="control-row"><span class="control-key">←→</span><span class="control-action">Move</span></div>
    <div class="control-row"><span class="control-key">Space</span><span class="control-action">Jump</span></div>`}
    ${gameSettings.projectileEnabled ? `<div class="control-row"><span class="control-key">${formatFireKey(gameSettings.projectileFireKey)}</span><span class="control-action">Shoot</span></div>` : ''}
    ${gameSettings.multiplayerEnabled ? `<div class="control-row"><span class="control-key">T</span><span class="control-action">Chat</span></div>` : ''}
    <div class="control-row"><span class="control-key">R</span><span class="control-action">Restart</span></div>
    <div class="controls-hint">Hides when you start playing</div>
</div>

<script>
${learningHeader}
${includeComments ? `// ═══════════════════════════════════════════════════════════════════════════
// IIFE (Immediately Invoked Function Expression)
// ═══════════════════════════════════════════════════════════════════════════
// We wrap everything in (function() { ... })(); to create a private scope.
// This prevents our variables from conflicting with other scripts on the page.
// Think of it as putting our code in a protective bubble!
// ═══════════════════════════════════════════════════════════════════════════
` : ''}(function() {
${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // GAME CONFIGURATION - The core settings that define your game
    // ═══════════════════════════════════════════════════════════════════════════
    // These constants control fundamental aspects of the game.
    // "const" means these values won't change while the game runs.
    //
    // TILE_SIZE: How many pixels wide/tall each tile is
    //   - Smaller = more detailed but smaller sprites needed
    //   - Larger = simpler but sprites appear bigger
    //
    // CANVAS_WIDTH/HEIGHT: The game window size in pixels
    //   - Try 1024x600 for a wider view
    //   - Try 640x480 for a classic retro feel
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    var TILE_SIZE = ${tileSize};
    var TILE_SCALE = ${gameSettings.tileRenderScale || 1};
    var RENDER_SIZE = TILE_SIZE * TILE_SCALE;
    // Use wider aspect ratio for better landscape mobile fit when scaled
    var baseWidth = ${pixelScale > 1 ? 960 : 800};
    var baseHeight = ${pixelScale > 1 ? 540 : 500};
    var CANVAS_WIDTH = ${pixelScale > 1 ? Math.floor(960 / pixelScale) : Math.floor(800 / pixelScale)};
    var CANVAS_HEIGHT = ${pixelScale > 1 ? Math.floor(540 / pixelScale) : Math.floor(500 / pixelScale)};
    var PIXEL_SCALE = ${pixelScale};
    console.log('Tile Scale: ' + TILE_SCALE + 'x (Source: ' + TILE_SIZE + 'px → Rendered: ' + RENDER_SIZE + 'px)');

${tileTypesCode}
${levelsCode}
${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // TILESET IMAGE
    // ═══════════════════════════════════════════════════════════════════════════
    // The tileset is stored as a Base64-encoded data URL. This embeds the image
    // directly in the code so the game works as a single file!
    //
    // HOW TILESETS WORK:
    // - A tileset is a grid of small images (tiles) in one file
    // - Each tile has a row and column position
    // - The tileTypes object maps characters to positions in this grid
    //
    // TO USE A DIFFERENT TILESET:
    // 1. Create a tileset image with tiles arranged in a grid
    // 2. Convert it to Base64 (search "image to base64 converter")
    // 3. Replace the TILESET_SRC string below
    // 4. Update tileTypes to match your new tile positions
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    var TILESET_SRC = '${tilesetDataURL || ''}';

${customTileImagesCode}
${bgLayersCode}
${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // CANVAS SETUP - Getting ready to draw
    // ═══════════════════════════════════════════════════════════════════════════
    // document.getElementById('game') finds our canvas element by its id
    // getContext('2d') gives us tools to draw 2D graphics
    //
    // The 'ctx' (context) object has drawing methods:
    //   ctx.fillRect(x, y, width, height) - Draw a filled rectangle
    //   ctx.drawImage(img, x, y)          - Draw an image
    //   ctx.fillStyle = '#ff0000'         - Set fill color (red)
    //   ctx.save() / ctx.restore()        - Save/restore drawing state
    //
    // COORDINATE SYSTEM:
    //   (0, 0) is the TOP-LEFT corner
    //   x increases going RIGHT
    //   y increases going DOWN (opposite of math class!)
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Polyfill for roundRect (not supported in all browsers)
    if (!ctx.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.moveTo(x + r, y);
            this.arcTo(x + w, y, x + w, y + h, r);
            this.arcTo(x + w, y + h, x, y + h, r);
            this.arcTo(x, y + h, x, y, r);
            this.arcTo(x, y, x + w, y, r);
            this.closePath();
            return this;
        };
    }

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // RESPONSIVE SCALING - Make game fit any screen size
    // ═══════════════════════════════════════════════════════════════════════════
    // This scales the canvas to fit the screen while maintaining aspect ratio.
    // The internal resolution stays the same for crisp pixel art.
    // We use CSS transforms to scale the visual size.
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    function scaleCanvas() {
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;

        // Calculate scale to fit screen while maintaining aspect ratio
        var scaleX = windowWidth / CANVAS_WIDTH;
        var scaleY = windowHeight / CANVAS_HEIGHT;
        var scale = Math.min(scaleX, scaleY);

        // Apply scale via CSS (keeps internal resolution sharp)
        canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
        canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';

        // Center the canvas
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';

        console.log('Canvas scaled:', scale.toFixed(2) + 'x', 'Display size:',
                    Math.round(CANVAS_WIDTH * scale) + 'x' + Math.round(CANVAS_HEIGHT * scale));
    }

    // Scale on load and when window resizes (orientation change)
    scaleCanvas();
    window.addEventListener('resize', scaleCanvas);
    window.addEventListener('orientationchange', function() {
        setTimeout(scaleCanvas, 100); // Small delay for orientation change
    });

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // IMAGE LOADING
    // ═══════════════════════════════════════════════════════════════════════════
    // Images are loaded asynchronously (in the background).
    // We create Image objects and set their src property to start loading.
    //
    // IMPORTANT: Images aren't ready immediately! The browser needs time to
    // download/decode them. That's why we check img.complete before drawing.
    //
    // crossOrigin = 'anonymous' allows loading images from other websites
    // without security errors (CORS - Cross-Origin Resource Sharing).
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    var tileset = new Image();
    if (TILESET_SRC) tileset.src = TILESET_SRC;

    function loadBackgrounds() {
        for (var i = 0; i < backgroundLayers.length; i++) {
            (function(index) {
                var img = new Image();
                img.crossOrigin = 'anonymous';
                img.onerror = function() {
                    console.warn('Failed to load background image:', backgroundLayers[index] ? backgroundLayers[index].src : 'unknown');
                };
                img.src = backgroundLayers[index].src;
                loadedBgImages[index] = img;
            })(i);
        }
    }
    loadBackgrounds();

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // PHYSICS SETTINGS - How the game world behaves
    // ═══════════════════════════════════════════════════════════════════════════
    // These values control how the player moves and feels. Tweak these to
    // completely change how your game plays!
    //
    // GRAVITY: How fast the player falls (added to speedY each frame)
    //   0.3 = Floaty, moon-like gravity
    //   0.5 = Normal, balanced feel
    //   0.8 = Heavy, challenging platforming
    //   1.0+ = Very heavy, hard to control jumps
    //
    // JUMP_POWER: Initial upward velocity when jumping (negative = up)
    //   8  = Small hop
    //   12 = Standard jump
    //   15 = High jump
    //   20 = Super jump!
    //
    // MOVE_SPEED: Horizontal movement speed (pixels per frame)
    //   2 = Slow, methodical
    //   4 = Normal speed
    //   6 = Fast, action-oriented
    //
    // PRO TIP: Gravity and Jump Power work together!
    //   - Higher gravity + higher jump = snappy, responsive feel
    //   - Lower gravity + lower jump = floaty, exploration feel
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    // Game Type
    var GAME_TYPE = '${gameSettings.gameType || 'platformer'}';
    var IS_TOPDOWN = GAME_TYPE === 'topdown';

    // RPG Progress Saving (localStorage)
    var SAVE_RPG_PROGRESS = IS_TOPDOWN && ${gameSettings.saveRPGProgress !== false};
    var STORAGE_KEY = 'gamemaker_rpg_' + '${(projectName || 'game').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}';

    // Physics (gravity disabled in top-down mode)
    var GRAVITY = IS_TOPDOWN ? 0 : ${gameSettings.gravity};
    var JUMP_POWER = IS_TOPDOWN ? 0 : ${gameSettings.jumpPower};
    var MOVE_SPEED = ${gameSettings.moveSpeed};
    var BOUNCINESS = ${gameSettings.bounciness || 0};
    var FRICTION = ${gameSettings.friction || 0.85};
    var ENABLE_MOBILE_CONTROLS = ${gameSettings.enableMobileControls !== false};
    var IS_TOUCH_DEVICE = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    var PLAYER_COLOR = '${gameSettings.playerColor}';

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // PLAYER SPRITE (Optional)
    // ═══════════════════════════════════════════════════════════════════════════
    // If a sprite URL is provided, the player is drawn as an animated sprite
    // instead of a colored rectangle.
    //
    // SPRITE SHEETS:
    // A sprite sheet is a single image containing animation frames side by side.
    // Example: A 4-frame walk animation would be 4 character poses in a row.
    //
    // FRAME_COUNT tells the game how many frames are in your sprite sheet.
    // The game divides the image width by FRAME_COUNT to get each frame.
    //
    // TO ADD YOUR OWN SPRITE:
    // 1. Create or find a sprite sheet (frames in a horizontal row)
    // 2. Host the image online or convert to Base64
    // 3. Set PLAYER_SPRITE_URL to the image URL
    // 4. Set PLAYER_FRAME_COUNT to the number of frames
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    var PLAYER_SPRITE_URL = '${gameSettings.playerSpriteURL || ''}';
    var PLAYER_FRAME_COUNT = ${gameSettings.playerFrameCount || 1};
    var PLAYER_SPRITESHEET_COLS = ${gameSettings.playerSpritesheetCols || gameSettings.playerFrameCount || 1};
    var PLAYER_SPRITESHEET_ROWS = ${gameSettings.playerSpritesheetRows || 1};

    var playerSprite = null;
    if (PLAYER_SPRITE_URL) {
        playerSprite = new Image();
        playerSprite.crossOrigin = 'anonymous';
        playerSprite.src = PLAYER_SPRITE_URL;
    }

    // Projectile System Settings
    var PROJECTILE_ENABLED = ${gameSettings.projectileEnabled === true};
    var PROJECTILE_FIRE_KEY = '${gameSettings.projectileFireKey || 'KeyX'}';
    var PROJECTILE_MODE = '${gameSettings.projectileMode || 'cooldown'}';
    var PROJECTILE_COOLDOWN = ${gameSettings.projectileCooldown || 500};
    var PROJECTILE_START_AMMO = ${gameSettings.projectileStartAmmo || 10};
    var PROJECTILE_MAX_AMMO = ${gameSettings.projectileMaxAmmo || 30};
    var PROJECTILE_SPEED = ${gameSettings.projectileSpeed || 8};
    var PROJECTILE_LIFETIME = ${gameSettings.projectileLifetime || 2000};
    var PROJECTILE_DAMAGE = ${gameSettings.projectileDamage || 1};
    var PROJECTILE_WIDTH = ${gameSettings.projectileWidth || 8};
    var PROJECTILE_HEIGHT = ${gameSettings.projectileHeight || 8};
    var PROJECTILE_COLOR = '${gameSettings.projectileColor || '#ffff00'}';
    var PROJECTILE_SPRITE_URL = '${gameSettings.projectileSpriteURL || ''}';
    var PROJECTILE_FRAME_COUNT = ${gameSettings.projectileFrameCount || 1};
    var PROJECTILE_SPRITESHEET_COLS = ${gameSettings.projectileSpritesheetCols || gameSettings.projectileFrameCount || 1};
    var PROJECTILE_SPRITESHEET_ROWS = ${gameSettings.projectileSpritesheetRows || 1};
    var PROJECTILE_COLLECTS_ITEMS = ${gameSettings.projectileCollectsItems === true};
    var SOUND_SHOOT = '${(gameSettings.sounds && gameSettings.sounds.shoot) || ''}';
    var SOUND_PROJECTILE_HIT = '${(gameSettings.sounds && gameSettings.sounds.projectileHit) || ''}';

    // Enhanced Gameplay Features (Quick Wins)
    var JUMP_MODE = '${gameSettings.jumpMode || (gameSettings.doubleJumpEnabled ? 'double' : 'normal')}';
    var FLY_FLAP_POWER = ${gameSettings.flyFlapPower || 6};
    var INVINCIBILITY_TIME = ${gameSettings.invincibilityTime || 1500};
    var SCREEN_SHAKE_ENABLED = ${gameSettings.screenShakeEnabled !== false};
    var VIBRATION_ENABLED = ${gameSettings.vibrationEnabled !== false};
    var HIT_PAUSE_ENABLED = ${gameSettings.hitPauseEnabled !== false};
    var HIT_PAUSE_DURATION = ${gameSettings.hitPauseDuration || 80};
    var SQUASH_STRETCH_ENABLED = ${gameSettings.squashStretchEnabled !== false};
    var SQUASH_STRETCH_INTENSITY = ${gameSettings.squashStretchIntensity ?? 1.0};
    var COYOTE_TIME_FRAMES = ${gameSettings.coyoteTimeFrames ?? 6};

    // Player Idle Effect (motion effect when standing still)
    var PLAYER_IDLE_EFFECT = '${gameSettings.playerIdleEffect || 'none'}';
    var PLAYER_IDLE_EFFECT_INTENSITY = ${gameSettings.playerIdleEffectIntensity || 5};
    var PLAYER_IDLE_EFFECT_SPEED = ${gameSettings.playerIdleEffectSpeed || 5};
    console.log('Player Idle Effect:', PLAYER_IDLE_EFFECT, 'Intensity:', PLAYER_IDLE_EFFECT_INTENSITY, 'Speed:', PLAYER_IDLE_EFFECT_SPEED);

    // Run Timer (Speedrun Feature)
    var RUN_TIMER_ENABLED = ${gameSettings.runTimerEnabled === true};
    var RUN_TIMER_MODE = '${gameSettings.runTimerMode || 'level'}';

    // Particle Effects System
    // NOTE: enemyDeath, collectItem, hazardHit, powerupCollect, springBounce are now per-template
    // Only player-related effects remain global
    // Auto-enables if any template or global setting has a particle effect configured
    var PARTICLE_EFFECTS_ENABLED = ${!!(gameSettings.particleEffectsEnabled === true || hasTemplateParticleEffects || hasGlobalParticleEffects)};
    var PARTICLE_EFFECT_URLS = {
        playerDamage: '${(gameSettings.particleEffects?.playerDamage || '').replace(/'/g, "\\'")}',
        playerJump: '${(gameSettings.particleEffects?.playerJump || '').replace(/'/g, "\\'")}',
        checkpoint: '${(gameSettings.particleEffects?.checkpoint || '').replace(/'/g, "\\'")}',
        levelComplete: '${(gameSettings.particleEffects?.levelComplete || '').replace(/'/g, "\\'")}'
    };
    var particleEffectsData = {}; // Cached effect data loaded from URLs (by URL)
    var particleEffectsByType = {}; // Cached effect data by type (for global effects)
    var activeParticleEmitters = []; // Currently running particle emitters
    var backgroundParticleEmitter = null; // Continuous background particle effect (snow, rain, etc.)
    var backgroundParticles = []; // Particles for background effect

    // Cheat Code System
    var CHEATS_ENABLED = ${gameSettings.cheatsEnabled === true};
    var CHEAT_FEEDBACK_ENABLED = ${gameSettings.cheatFeedbackEnabled !== false};
    var cheatCodes = ${JSON.stringify(cheatCodeTemplates.filter(c => c.enabled), null, 8)};
    var cheatBuffer = '';
    var cheatBufferTimeout = null;
    var CHEAT_BUFFER_CLEAR_TIME = 2000; // Clear buffer after 2s of no input

    // Key to cheat character mapping for special keys
    var keyToCheatChar = {
        'ArrowUp': 'UP',
        'ArrowDown': 'DOWN',
        'ArrowLeft': 'LEFT',
        'ArrowRight': 'RIGHT',
        'Space': 'SPACE',
        'Enter': 'ENTER'
    };

    // Active cheat effects state
    var activeCheatEffects = {
        invincibility: 0,    // Timer in seconds
        speedBoost: 0,       // Timer in seconds
        jumpBoost: 0,        // Timer in seconds
        lowGravity: 0,       // Timer in seconds
        oneHitKill: false,   // Permanent until level change
        turboFire: 0,        // Timer in seconds
        tinyMode: 0,         // Timer in seconds
        giantMode: 0         // Timer in seconds
    };

    // Cheat message display state
    var cheatMessage = { text: '', timer: 0 };

    // Check if buffer matches any cheat code
    function checkCheatCodes() {
        for (var i = 0; i < cheatCodes.length; i++) {
            var cheat = cheatCodes[i];
            // Check if buffer ends with this cheat code (case insensitive)
            if (cheatBuffer.toUpperCase().endsWith(cheat.code.toUpperCase())) {
                activateCheat(cheat);
                cheatBuffer = ''; // Clear buffer after successful cheat
                break;
            }
        }
    }

    // Activate a cheat effect
    function activateCheat(cheat) {
        var duration = cheat.duration || 30;

        switch (cheat.effect) {
            case 'invincibility':
                activeCheatEffects.invincibility = duration;
                break;
            case 'speedBoost':
                activeCheatEffects.speedBoost = duration;
                break;
            case 'jumpBoost':
                activeCheatEffects.jumpBoost = duration;
                break;
            case 'infiniteLives':
                lives = 99;
                maxLives = 99;
                break;
            case 'lowGravity':
                activeCheatEffects.lowGravity = duration;
                break;
            case 'oneHitKill':
                activeCheatEffects.oneHitKill = true;
                break;
            case 'maxAmmo':
                if (PROJECTILE_ENABLED && PROJECTILE_MODE === 'ammo') {
                    currentAmmo = PROJECTILE_MAX_AMMO;
                }
                break;
            case 'levelSkip':
                handleLevelComplete();
                break;
            case 'scoreBoost':
                score += 1000;
                // Check if score goal is met
                if (goalCondition === 'score' && checkGoalCondition()) {
                    handleLevelComplete();
                }
                break;
            case 'tinyMode':
                activeCheatEffects.tinyMode = duration;
                activeCheatEffects.giantMode = 0; // Cancel giant
                break;
            case 'giantMode':
                activeCheatEffects.giantMode = duration;
                activeCheatEffects.tinyMode = 0; // Cancel tiny
                break;
            case 'turboFire':
                activeCheatEffects.turboFire = duration;
                break;
        }

        // Show feedback
        if (CHEAT_FEEDBACK_ENABLED) {
            showCheatMessage(cheat.name + ' ACTIVATED!');
        }

        // Vibration feedback
        vibrate([50, 30, 50]);
    }

    // Show cheat activation message
    function showCheatMessage(text) {
        cheatMessage.text = text;
        cheatMessage.timer = 120; // Show for 2 seconds at 60fps
    }

    // Update cheat effect timers (call once per frame)
    function updateCheatEffects() {
        var dt = 1/60; // Assuming 60fps
        if (activeCheatEffects.invincibility > 0) activeCheatEffects.invincibility -= dt;
        if (activeCheatEffects.speedBoost > 0) activeCheatEffects.speedBoost -= dt;
        if (activeCheatEffects.jumpBoost > 0) activeCheatEffects.jumpBoost -= dt;
        if (activeCheatEffects.lowGravity > 0) activeCheatEffects.lowGravity -= dt;
        if (activeCheatEffects.turboFire > 0) activeCheatEffects.turboFire -= dt;
        if (activeCheatEffects.tinyMode > 0) activeCheatEffects.tinyMode -= dt;
        if (activeCheatEffects.giantMode > 0) activeCheatEffects.giantMode -= dt;
    }

    // Reset cheat effects (on death or level change)
    function resetCheatEffects(keepPermanent) {
        activeCheatEffects.invincibility = 0;
        activeCheatEffects.speedBoost = 0;
        activeCheatEffects.jumpBoost = 0;
        activeCheatEffects.lowGravity = 0;
        activeCheatEffects.turboFire = 0;
        activeCheatEffects.tinyMode = 0;
        activeCheatEffects.giantMode = 0;
        if (!keepPermanent) {
            activeCheatEffects.oneHitKill = false;
        }
    }

    // Get effective gravity with cheat modifier
    function getEffectiveGravity() {
        var g = GRAVITY;
        if (activeCheatEffects.lowGravity > 0) g *= 0.4;
        return g;
    }

    // Get effective move speed with cheat modifier
    function getEffectiveMoveSpeed() {
        var speed = MOVE_SPEED;
        if (activeCheatEffects.speedBoost > 0) speed *= 2;
        if (activeEffects.speedBoost > 0) speed *= 1.5; // Powerup boost stacks
        return speed;
    }

    // Get effective jump power with cheat modifier
    function getEffectiveJumpPower() {
        var power = JUMP_POWER;
        if (activeCheatEffects.jumpBoost > 0) power *= 1.5;
        if (activeEffects.jumpBoost > 0) power *= 1.3; // Powerup boost stacks
        return power;
    }

    // Get effective projectile cooldown with cheat modifier
    function getEffectiveProjectileCooldown() {
        var cooldown = PROJECTILE_COOLDOWN;
        if (activeCheatEffects.turboFire > 0) cooldown *= 0.3;
        return cooldown;
    }

    // Get player size multiplier from cheat effects
    function getCheatSizeMultiplier() {
        if (activeCheatEffects.tinyMode > 0) return 0.5;
        if (activeCheatEffects.giantMode > 0) return 1.5;
        return 1;
    }

    // Check if player is invincible from cheat
    function isCheatInvincible() {
        return activeCheatEffects.invincibility > 0;
    }

    // Projectile state
    var projectiles = [];
    var lastFireTime = 0;
    var currentAmmo = PROJECTILE_START_AMMO;
    var projectileSprite = null;
    if (PROJECTILE_SPRITE_URL) {
        projectileSprite = new Image();
        projectileSprite.crossOrigin = 'anonymous';
        projectileSprite.src = PROJECTILE_SPRITE_URL;
    }

    // Screen shake state
    var screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };

    // Hit pause (freeze frame) state
    var hitPauseUntil = 0; // Timestamp when hit pause ends

    // Helper: Trigger screen shake effect
    function triggerScreenShake(intensity, duration) {
        if (!SCREEN_SHAKE_ENABLED) return;
        screenShake.intensity = intensity;
        screenShake.duration = duration;
    }

    // Helper: Trigger hit pause (freeze frame effect)
    function triggerHitPause() {
        if (!HIT_PAUSE_ENABLED) return;
        hitPauseUntil = Date.now() + HIT_PAUSE_DURATION;
    }

    // Helper: Vibration feedback (Android only - iOS doesn't support Web Vibration API)
    function vibrate(pattern) {
        if (VIBRATION_ENABLED && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    // Helper: Format run timer as M:SS.ms or SS.ms
    function formatRunTime(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        var ms = Math.floor((seconds % 1) * 100);
        if (mins > 0) {
            return mins + ':' + String(secs).padStart(2, '0') + '.' + String(ms).padStart(2, '0');
        }
        return secs + '.' + String(ms).padStart(2, '0');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PARTICLE EFFECTS SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════

    // Convert pfx:projectId to API URL
    function convertPfxToUrl(value) {
        if (!value) return value;
        if (value.indexOf('pfx:') === 0) {
            var projectId = value.substring(4);
            return 'https://www.mytekos.com/beta/applications/ParticleFX/get_effect.php?id=' + projectId;
        }
        return value;
    }

    // Load particle effect data from URL (async, caches result by effectType)
    function loadParticleEffect(effectType) {
        if (!PARTICLE_EFFECTS_ENABLED) return;
        var url = PARTICLE_EFFECT_URLS[effectType];
        if (!url || particleEffectsByType[effectType]) return; // Already loaded or no URL

        // Handle pfx:projectId format
        url = convertPfxToUrl(url);

        // Convert relative URL to full URL if needed
        if (!url.startsWith('http')) {
            url = 'https://www.mytekos.com/beta/' + url;
        }

        fetch(url)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                particleEffectsByType[effectType] = data;
                particleEffectsData[url] = data; // Also cache by URL
                // Also cache under original pfx: key if applicable
                var originalUrl = PARTICLE_EFFECT_URLS[effectType];
                if (originalUrl && originalUrl !== url) {
                    particleEffectsData[originalUrl] = data;
                }
                console.log('Loaded particle effect: ' + effectType);
            })
            .catch(function(err) {
                console.warn('Failed to load particle effect ' + effectType + ':', err);
            });
    }

    // Load particle effect by URL (for per-template effects)
    function loadParticleEffectURL(url) {
        if (!PARTICLE_EFFECTS_ENABLED || !url) return;
        var originalUrl = url;
        if (particleEffectsData[url]) return; // Already loaded

        // Handle pfx:projectId format
        url = convertPfxToUrl(url);

        // Convert relative URL to full URL if needed
        var fullUrl = url;
        if (!url.startsWith('http')) {
            fullUrl = 'https://www.mytekos.com/beta/' + url;
        }

        // Check if already loaded under full URL
        if (particleEffectsData[fullUrl]) {
            particleEffectsData[originalUrl] = particleEffectsData[fullUrl];
            return;
        }

        fetch(fullUrl)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                particleEffectsData[originalUrl] = data;
                particleEffectsData[url] = data;
                particleEffectsData[fullUrl] = data;
            })
            .catch(function(err) {
                console.warn('Failed to load particle effect from URL:', err);
            });
    }

    // Preload all configured particle effects (global + per-template)
    function preloadParticleEffects() {
        if (!PARTICLE_EFFECTS_ENABLED) return;
        // Load global player effects
        for (var effectType in PARTICLE_EFFECT_URLS) {
            if (PARTICLE_EFFECT_URLS[effectType]) {
                loadParticleEffect(effectType);
            }
        }
        // Load per-template effects from all template types
        var templateArrays = [enemyTemplates, collectibleTemplates, hazardTemplates,
                              powerupTemplates, springTemplates, mysteryBlockTemplates, doorTemplates];
        templateArrays.forEach(function(templates) {
            if (templates && Array.isArray(templates)) {
                templates.forEach(function(t) {
                    if (t && t.particleEffect) loadParticleEffectURL(t.particleEffect);
                });
            }
        });
    }

    // Extract emitter configs from effect data (handles both v1.0 and v2.0 formats)
    function extractEmitterConfigs(effectData) {
        if (!effectData) return [];

        // v2.0 format with layers
        if (effectData.version === '2.0' && Array.isArray(effectData.layers)) {
            return effectData.layers
                .filter(function(layer) { return layer.visible !== false; })
                .map(function(layer) {
                    var emitter = layer.emitter || {};
                    var particle = layer.particle || {};
                    return {
                        rate: emitter.rate || 50,
                        lifetime: particle.lifetime || emitter.lifetime || 1,
                        speed: emitter.speed || 100,
                        spread: emitter.spread || 45,
                        gravity: emitter.gravity || 0,
                        angle: emitter.angle || -90,
                        shape: particle.shape || 'circle',
                        sizeStart: particle.sizeStart || 10,
                        sizeEnd: particle.sizeEnd || 2,
                        colorStart: particle.colorStart || '#ffffff',
                        colorEnd: particle.colorEnd || '#888888',
                        opacityStart: particle.opacityStart !== undefined ? particle.opacityStart : 1,
                        opacityEnd: particle.opacityEnd !== undefined ? particle.opacityEnd : 0,
                        blendMode: particle.blendMode || 'source-over'
                    };
                });
        }

        // v1.0/v1.1 format (single emitter)
        var emitter = effectData.emitter || {};
        var particle = effectData.particle || {};
        return [{
            rate: emitter.rate || 50,
            lifetime: particle.lifetime || emitter.lifetime || 1,
            speed: emitter.speed || 100,
            spread: emitter.spread || 45,
            gravity: emitter.gravity || 0,
            angle: emitter.angle || -90,
            shape: particle.shape || 'circle',
            sizeStart: particle.sizeStart || 10,
            sizeEnd: particle.sizeEnd || 2,
            colorStart: particle.colorStart || '#ffffff',
            colorEnd: particle.colorEnd || '#888888',
            opacityStart: particle.opacityStart !== undefined ? particle.opacityStart : 1,
            opacityEnd: particle.opacityEnd !== undefined ? particle.opacityEnd : 0,
            blendMode: particle.blendMode || 'source-over'
        }];
    }

    // Spawn a particle emitter at position (by effect type for global effects)
    function spawnParticleEffect(effectType, x, y, duration) {
        if (!PARTICLE_EFFECTS_ENABLED) return;
        var effectData = particleEffectsByType[effectType];
        if (!effectData) return; // Effect not loaded

        var configs = extractEmitterConfigs(effectData);
        var now = Date.now();

        configs.forEach(function(config) {
            activeParticleEmitters.push({
                x: x,
                y: y,
                rate: config.rate,
                lifetime: config.lifetime,
                speed: config.speed,
                spread: config.spread,
                gravity: config.gravity,
                angle: config.angle,
                shape: config.shape,
                sizeStart: config.sizeStart,
                sizeEnd: config.sizeEnd,
                colorStart: config.colorStart,
                colorEnd: config.colorEnd,
                opacityStart: config.opacityStart,
                opacityEnd: config.opacityEnd,
                blendMode: config.blendMode,
                particles: [],
                accumulator: 0,
                duration: duration || 500,
                startTime: now
            });
        });
    }

    // Spawn a particle effect from a URL (for per-template effects)
    function spawnParticleEffectFromURL(url, x, y, duration) {
        if (!PARTICLE_EFFECTS_ENABLED || !url) return;
        var effectData = particleEffectsData[url];
        if (!effectData) {
            // Try with converted pfx: URL
            var convertedUrl = convertPfxToUrl(url);
            effectData = particleEffectsData[convertedUrl];
        }
        if (!effectData) {
            // Try with full URL
            var fullUrl = url.startsWith('http') ? url : 'https://www.mytekos.com/beta/' + url;
            effectData = particleEffectsData[fullUrl];
        }
        if (!effectData) return; // Effect not loaded

        var configs = extractEmitterConfigs(effectData);
        var now = Date.now();

        configs.forEach(function(config) {
            activeParticleEmitters.push({
                x: x,
                y: y,
                rate: config.rate,
                lifetime: config.lifetime,
                speed: config.speed,
                spread: config.spread,
                gravity: config.gravity,
                angle: config.angle,
                shape: config.shape,
                sizeStart: config.sizeStart,
                sizeEnd: config.sizeEnd,
                colorStart: config.colorStart,
                colorEnd: config.colorEnd,
                opacityStart: config.opacityStart,
                opacityEnd: config.opacityEnd,
                blendMode: config.blendMode,
                particles: [],
                accumulator: 0,
                duration: duration || 500,
                startTime: now
            });
        });
    }

    // Update all active particle emitters
    function updateParticles(dt) {
        if (!PARTICLE_EFFECTS_ENABLED) return;
        var now = Date.now();

        for (var e = activeParticleEmitters.length - 1; e >= 0; e--) {
            var emitter = activeParticleEmitters[e];
            var elapsed = now - emitter.startTime;

            // Spawn new particles if emitter still active
            if (elapsed < emitter.duration) {
                emitter.accumulator += emitter.rate * dt;
                while (emitter.accumulator >= 1) {
                    // Create new particle
                    var angleRad = (emitter.angle + (Math.random() - 0.5) * emitter.spread) * Math.PI / 180;
                    var speed = emitter.speed * (0.8 + Math.random() * 0.4);
                    emitter.particles.push({
                        x: emitter.x,
                        y: emitter.y,
                        vx: Math.cos(angleRad) * speed,
                        vy: Math.sin(angleRad) * speed,
                        age: 0,
                        lifetime: emitter.lifetime * (0.8 + Math.random() * 0.4)
                    });
                    emitter.accumulator -= 1;
                }
            }

            // Update particles
            for (var p = emitter.particles.length - 1; p >= 0; p--) {
                var particle = emitter.particles[p];
                particle.age += dt;
                particle.vy += emitter.gravity * dt;
                particle.x += particle.vx * dt;
                particle.y += particle.vy * dt;

                if (particle.age >= particle.lifetime) {
                    emitter.particles.splice(p, 1);
                }
            }

            // Remove emitter if done and no particles left
            if (elapsed >= emitter.duration && emitter.particles.length === 0) {
                activeParticleEmitters.splice(e, 1);
            }
        }
    }

    // Draw all active particles
    function drawParticles() {
        if (!PARTICLE_EFFECTS_ENABLED) return;

        for (var e = 0; e < activeParticleEmitters.length; e++) {
            var emitter = activeParticleEmitters[e];

            // Apply blend mode for this emitter's particles
            ctx.save();
            if (emitter.blendMode && emitter.blendMode !== 'source-over') {
                ctx.globalCompositeOperation = emitter.blendMode;
            }

            for (var p = 0; p < emitter.particles.length; p++) {
                var particle = emitter.particles[p];
                var t = particle.age / particle.lifetime; // 0 to 1

                // Interpolate size
                var size = emitter.sizeStart + (emitter.sizeEnd - emitter.sizeStart) * t;

                // Interpolate opacity
                var opacity = emitter.opacityStart + (emitter.opacityEnd - emitter.opacityStart) * t;

                // Interpolate color
                var color = lerpColor(emitter.colorStart, emitter.colorEnd, t);

                ctx.globalAlpha = opacity;
                ctx.fillStyle = color;

                // Draw relative to camera
                var drawX = particle.x - cameraX;
                var drawY = particle.y - cameraY;

                // Draw shape
                if (emitter.shape === 'square') {
                    ctx.fillRect(drawX - size/2, drawY - size/2, size, size);
                } else {
                    ctx.beginPath();
                    ctx.arc(drawX, drawY, size/2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }
    }

    // Helper: Linear interpolate between two colors
    function lerpColor(color1, color2, t) {
        // Parse hex colors
        var r1 = parseInt(color1.slice(1,3), 16);
        var g1 = parseInt(color1.slice(3,5), 16);
        var b1 = parseInt(color1.slice(5,7), 16);
        var r2 = parseInt(color2.slice(1,3), 16);
        var g2 = parseInt(color2.slice(3,5), 16);
        var b2 = parseInt(color2.slice(5,7), 16);

        // Interpolate
        var r = Math.round(r1 + (r2 - r1) * t);
        var g = Math.round(g1 + (g2 - g1) * t);
        var b = Math.round(b1 + (b2 - b1) * t);

        return '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BACKGROUND PARTICLE SYSTEM (Snow, Rain, Fog, etc.)
    // ═══════════════════════════════════════════════════════════════════════════

    var backgroundParticleSpawnMode = 'auto'; // 'auto', 'top', 'bottom', 'full'

    // Load and start background particle effect for current level
    function loadBackgroundParticleEffect(url, spawnMode) {
        // Clear existing background particles
        backgroundParticleEmitter = null;
        backgroundParticles = [];
        backgroundParticleSpawnMode = spawnMode || 'auto';

        if (!url) return;

        // Handle pfx:projectId format
        var fetchUrl = convertPfxToUrl(url);
        if (!fetchUrl.startsWith('http')) {
            fetchUrl = 'https://www.mytekos.com/beta/' + fetchUrl;
        }

        // Check if already cached
        if (particleEffectsData[url] || particleEffectsData[fetchUrl]) {
            var data = particleEffectsData[url] || particleEffectsData[fetchUrl];
            setupBackgroundEmitter(data);
            return;
        }

        // Fetch the particle effect data
        fetch(fetchUrl)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                particleEffectsData[url] = data;
                particleEffectsData[fetchUrl] = data;
                setupBackgroundEmitter(data);
                console.log('Loaded background particle effect');
            })
            .catch(function(err) {
                console.warn('Failed to load background particle effect:', err);
            });
    }

    // Set up the background emitter from loaded effect data
    function setupBackgroundEmitter(effectData) {
        var emitter = effectData.emitter || {};
        var particle = effectData.particle || {};

        // Helper to get value with proper default (handles 0 correctly)
        function val(v, def) {
            return (v !== undefined && v !== null) ? v : def;
        }

        backgroundParticleEmitter = {
            rate: val(emitter.rate, 30),
            lifetime: val(particle.lifetime, val(emitter.lifetime, 2)),
            speed: val(emitter.speed, 50),
            spread: val(emitter.spread, 30),
            gravity: val(emitter.gravity, 0),
            angle: val(emitter.angle, 90),
            shape: val(particle.shape, 'circle'),
            // Only use emoji if shape is 'emoji' and emoji value exists
            emoji: (particle.shape === 'emoji' && particle.emoji) ? particle.emoji : null,
            sizeStart: val(particle.sizeStart, 6),
            sizeEnd: val(particle.sizeEnd, 4),
            colorStart: val(particle.colorStart, '#ffffff'),
            colorEnd: val(particle.colorEnd, '#cccccc'),
            opacityStart: val(particle.opacityStart, 1),
            opacityEnd: val(particle.opacityEnd, 0),
            accumulator: 0
        };
    }

    // Update background particles (call every frame)
    function updateBackgroundParticles(dt) {
        if (!backgroundParticleEmitter) return;

        var emitter = backgroundParticleEmitter;

        // Determine spawn position based on spawn mode or auto-detect
        var spawnMode = backgroundParticleSpawnMode;

        if (spawnMode === 'auto') {
            // Auto-detect based on particle direction
            var angleRad = emitter.angle * Math.PI / 180;
            var baseVy = Math.sin(angleRad) * emitter.speed;
            var effectiveVy = baseVy + emitter.gravity;

            if (effectiveVy > 10) {
                spawnMode = 'top';
            } else if (effectiveVy < -10) {
                spawnMode = 'bottom';
            } else {
                spawnMode = 'full';
            }
        }

        // Spawn new particles
        emitter.accumulator += emitter.rate * dt;
        while (emitter.accumulator >= 1) {
            var particleAngleRad = (emitter.angle + (Math.random() - 0.5) * emitter.spread) * Math.PI / 180;
            var speed = emitter.speed * (0.7 + Math.random() * 0.6);

            var spawnX, spawnY;

            switch (spawnMode) {
                case 'top':
                    // Spawn at top - for rain, snow
                    spawnX = Math.random() * (CANVAS_WIDTH + 100) - 50;
                    spawnY = -20;
                    break;
                case 'bottom':
                    // Spawn at bottom - for smoke, embers
                    spawnX = Math.random() * (CANVAS_WIDTH + 100) - 50;
                    spawnY = CANVAS_HEIGHT + 20;
                    break;
                case 'full':
                default:
                    // Spawn across entire screen - for fog, dust
                    spawnX = Math.random() * (CANVAS_WIDTH + 100) - 50;
                    spawnY = Math.random() * (CANVAS_HEIGHT + 100) - 50;
                    break;
            }

            backgroundParticles.push({
                x: spawnX,
                y: spawnY,
                vx: Math.cos(particleAngleRad) * speed,
                vy: Math.sin(particleAngleRad) * speed,
                age: 0,
                lifetime: emitter.lifetime * (0.7 + Math.random() * 0.6)
            });
            emitter.accumulator -= 1;
        }

        // Update existing particles
        for (var p = backgroundParticles.length - 1; p >= 0; p--) {
            var particle = backgroundParticles[p];
            particle.age += dt;
            particle.vy += emitter.gravity * dt;
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;

            // Remove if too old or off screen (check all edges)
            if (particle.age >= particle.lifetime ||
                particle.y > CANVAS_HEIGHT + 50 ||
                particle.y < -50 ||
                particle.x > CANVAS_WIDTH + 50 ||
                particle.x < -50) {
                backgroundParticles.splice(p, 1);
            }
        }
    }

    // Draw background particles (call before other game elements)
    function drawBackgroundParticles() {
        if (!backgroundParticleEmitter || backgroundParticles.length === 0) return;

        var emitter = backgroundParticleEmitter;

        for (var p = 0; p < backgroundParticles.length; p++) {
            var particle = backgroundParticles[p];
            var t = particle.age / particle.lifetime;

            var size = emitter.sizeStart + (emitter.sizeEnd - emitter.sizeStart) * t;
            var opacity = emitter.opacityStart + (emitter.opacityEnd - emitter.opacityStart) * t;
            var color = lerpColor(emitter.colorStart, emitter.colorEnd, t);

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = color;

            switch (emitter.shape) {
                case 'emoji':
                    if (emitter.emoji) {
                        ctx.font = size + 'px Arial, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(emitter.emoji, particle.x, particle.y);
                    }
                    break;

                case 'square':
                    ctx.fillRect(particle.x - size/2, particle.y - size/2, size, size);
                    break;

                case 'star':
                    drawBgStar(ctx, particle.x, particle.y, 5, size/2, size/2 * 0.4);
                    break;

                case 'spark':
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y - size/2);
                    ctx.lineTo(particle.x, particle.y + size/2);
                    ctx.stroke();
                    break;

                case 'snowflake':
                    drawBgSnowflake(ctx, particle.x, particle.y, size/2, color);
                    break;

                case 'circle':
                default:
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, size/2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }

            ctx.restore();
        }
    }

    // Helper to draw star shape for background particles
    function drawBgStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        var rot = Math.PI / 2 * 3;
        var step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (var i = 0; i < spikes; i++) {
            var x = cx + Math.cos(rot) * outerRadius;
            var y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    // Helper to draw snowflake shape for background particles
    function drawBgSnowflake(ctx, cx, cy, size, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        for (var i = 0; i < 6; i++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(i * Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -size);
            // Small branches
            ctx.moveTo(0, -size * 0.6);
            ctx.lineTo(-size * 0.3, -size * 0.8);
            ctx.moveTo(0, -size * 0.6);
            ctx.lineTo(size * 0.3, -size * 0.8);
            ctx.stroke();
            ctx.restore();
        }
    }

    // NOTE: preloadParticleEffects() is called after templates are defined (see below)

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // PLAYER OBJECT - All the data about the player in one place
    // ═══════════════════════════════════════════════════════════════════════════
    // Objects group related data together. The player object stores:
    //
    // POSITION:
    //   x, y: Current position in the game world (top-left corner of player)
    //
    // SIZE:
    //   width, height: Collision box dimensions (used for hit detection)
    //
    // VELOCITY (speed with direction):
    //   speedX: Horizontal speed (negative = left, positive = right)
    //   speedY: Vertical speed (negative = up, positive = down)
    //
    // STATE:
    //   onGround: Is the player standing on something? (used for jump logic)
    //   facingRight: Which direction is the player facing? (for sprite flip)
    //
    // ANIMATION:
    //   animFrame: Current frame of the animation (0, 1, 2, etc.)
    //   animTimer: Counter for timing frame changes
    //
    // TO ADD HEALTH: Add health: 3 to this object, then check it in update()
    // TO ADD LIVES: Add lives: 3, then decrement in restartGame()
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    var player = {
        x: 50,
        y: 50,
        width: ${gameSettings.playerWidth || 32} * TILE_SCALE,
        height: ${gameSettings.playerHeight || 32} * TILE_SCALE,
        // Collision hitbox (centered horizontally, bottom-aligned vertically, with optional offset)
        collisionWidth: ${gameSettings.playerCollisionWidth || gameSettings.playerWidth || 32} * TILE_SCALE,
        collisionHeight: ${gameSettings.playerCollisionHeight || gameSettings.playerHeight || 32} * TILE_SCALE,
        collisionOffsetX: ${gameSettings.playerCollisionOffsetX || 0} * TILE_SCALE,
        collisionOffsetY: ${gameSettings.playerCollisionOffsetY || 0} * TILE_SCALE,
        speedX: 0,
        speedY: 0,
        onGround: false,
        color: PLAYER_COLOR,
        facingRight: true,
        facingDirection: IS_TOPDOWN ? 'down' : 'right', // For top-down: 'up', 'down', 'left', 'right' (default 'down' for RPG)
        animFrame: 0,
        animTimer: 0,
        // Enhanced gameplay state
        invincibleUntil: 0,    // Timestamp when invincibility ends
        canDoubleJump: false,  // Whether double jump is available
        jumpKeyHeld: false,    // Prevents holding jump for continuous jumps
        lastFlapTime: 0,       // Last flap timestamp for fly mode cooldown
        // Squash & stretch animation
        scaleX: 1.0,           // Horizontal scale (> 1 = wider)
        scaleY: 1.0,           // Vertical scale (> 1 = taller)
        wasOnGround: false,    // Track landing for squash effect
        // Platform riding - keeps player attached to fast-moving platforms
        ridingPlatformIndex: -1,  // Index of platform player is standing on (-1 = none)
        previousRidingPlatformIndex: -1, // Previous frame's platform index (for edge tolerance)
        platformGraceFrames: 0    // Extra coyote frames after leaving a moving platform
    };

    // Helper to apply squash & stretch intensity
    // baseAmount is how much to deviate from 1.0 (e.g., 0.3 means stretch to 1.3 or squash to 0.7)
    function applySquashStretch(baseAmount, isStretch) {
        var scaledAmount = baseAmount * SQUASH_STRETCH_INTENSITY;
        // Clamp to reasonable range (0.4 to 1.6 deviation from 1.0)
        scaledAmount = Math.min(scaledAmount, 0.6);
        return isStretch ? (1 + scaledAmount) : (1 - scaledAmount);
    }

    // Helper to get player collision box (hitbox centered in sprite, bottom-aligned, with user offsets)
    function getPlayerHitbox() {
        // Base position: centered horizontally, bottom-aligned vertically
        var baseOffsetX = (player.width - player.collisionWidth) / 2;
        var baseOffsetY = player.height - player.collisionHeight;
        // Apply user-defined offsets
        var finalOffsetX = baseOffsetX + player.collisionOffsetX;
        var finalOffsetY = baseOffsetY + player.collisionOffsetY;
        return {
            x: player.x + finalOffsetX,
            y: player.y + finalOffsetY,
            width: player.collisionWidth,
            height: player.collisionHeight
        };
    }

    // Game state
    var score = 0;
    var lives = ${gameSettings.startLives || 3};
    var maxLives = lives;
    var gameOver = false;
    var levelComplete = false;
    var showHitboxDebug = false; // Toggle with H key to visualize collision box
    var activeCheckpoint = null; // { x, y } - last checkpoint reached
    var checkpointMessage = { text: '', timer: 0 }; // Temporary message display
    var progressMessage = { text: '', timer: 0 }; // Progress loaded/cleared message
    var restartButton = { x: 0, y: 0, width: 200, height: 50, visible: false }; // Touch-friendly restart button

    // Run timer state (speedrun feature)
    var runTimer = 0;           // Current level elapsed time (seconds)
    var totalRunTime = 0;       // Cumulative time across all levels

    // Menu level state
    var isMenuLevel = false;
    var menuButtons = [];
    var menuPressAnyKey = false;
    var menuPressAnyKeyText = '';
    var menuWaitingForKey = false; // True when waiting for "press any key"
    var soundEnabled = true; // For toggle sound button

    // NPC/Door/Player interaction state (Top-Down RPG)
    var interactionPrompt = { visible: false, x: 0, y: 0, text: '', npc: null, door: null, remotePlayer: null };
    var dialogueState = { active: false, npc: null, lineIndex: 0, text: '', displayedChars: 0, charTimer: 0, remotePlayer: null };
    var nearestInteractable = null; // The NPC, door, or remote player closest to player for interaction

    // Inventory system (Top-Down RPG)
    var inventory = {}; // { templateId: { count: N, template: {...} } }
    var inventoryOpen = false;

    // ═══════════════════════════════════════════════════════════════════════════
    // MULTIPLAYER STATE (Experimental - Top-Down RPG Only)
    // ═══════════════════════════════════════════════════════════════════════════
    var MULTIPLAYER_ENABLED = ${gameSettings.multiplayerEnabled && gameSettings.gameType === 'topdown'};
    var MULTIPLAYER_SERVER = 'https://www.mytekos.com:5096';
    var MULTIPLAYER_MAX_PLAYERS = ${gameSettings.multiplayerMaxPlayers || 4};
    var MULTIPLAYER_PLAYER_NAME = '${(gameSettings.multiplayerPlayerName || 'Player').replace(/'/g, "\\'")}';
    var MULTIPLAYER_SHOW_CHAT = ${gameSettings.multiplayerShowChat !== false};
    var MULTIPLAYER_SYNC_ITEMS = ${gameSettings.multiplayerSyncItems !== false};
    var MULTIPLAYER_SYNC_ENEMIES = ${gameSettings.multiplayerSyncEnemies !== false};
    // PvP Battle Mode Settings
    var PVP_ENABLED = ${gameSettings.multiplayerPvPEnabled === true};
    var PVP_DAMAGE = ${gameSettings.multiplayerPvPDamage || 1};
    var PVP_KILL_SCORE = ${gameSettings.multiplayerPvPKillScore || 100};
    var PVP_STARTING_LIVES = ${gameSettings.multiplayerPvPLives || 3};
    // Custom Player Sprites - allow players to bring their own sprite URL
    var MULTIPLAYER_ALLOW_CUSTOM_SPRITES = ${gameSettings.multiplayerAllowCustomSprites === true};

    var socket = null;
    var myPlayerId = null;
    var myPlayerName = '';   // Store local player's chosen name
    var roomCode = null;
    var remotePlayers = {};  // { odlKx123: { x, y, targetX, targetY, name, facingDirection, color, score, lives, customSprite, customSpriteImage, customSpriteLoaded } }
    var myCustomSprite = null; // { url, frames } - local player's custom sprite data
    var myCustomSpriteImage = null; // Image object for local player's custom sprite
    var myCustomSpriteLoaded = false; // Whether the custom sprite has loaded
    var myGreetingMessage = null; // Local player's greeting message for other players to read
    var remoteProjectiles = []; // Projectiles fired by other players
    var chatMessages = [];   // Recent chat messages for overlay
    var lastPositionSend = 0;
    var POSITION_SEND_INTERVAL = 50; // Send position every 50ms (20 times/sec)
    var REMOTE_PLAYER_LERP_SPEED = 0.25; // Interpolation speed (0-1, higher = faster/snappier)
    var multiplayerReady = false;    // True when connected and in-game
    var mpPanelCollapsed = false;    // Track if multiplayer panel is collapsed
    var myPvPLives = PVP_ENABLED ? PVP_STARTING_LIVES : 0;  // Local player's PvP lives
    var pvpEliminated = false;       // True when player has been eliminated

    // RPG Progress Save/Load Functions
    function saveRPGProgress() {
        if (!SAVE_RPG_PROGRESS) return;
        try {
            var progress = {
                inventory: inventory,
                currentLevelIndex: currentLevelIndex,
                activeCheckpointLevel: activeCheckpoint ? currentLevelIndex : null,
                activeCheckpoint: activeCheckpoint,
                score: score,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } catch (e) {
            console.warn('Could not save RPG progress:', e);
        }
    }

    function loadRPGProgress() {
        if (!SAVE_RPG_PROGRESS) return false;
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                var progress = JSON.parse(saved);
                // Only load if saved within last 7 days
                if (progress.timestamp && (Date.now() - progress.timestamp) < 7 * 24 * 60 * 60 * 1000) {
                    inventory = progress.inventory || {};
                    score = progress.score || 0;
                    // Restore checkpoint if on same level
                    if (progress.activeCheckpointLevel === currentLevelIndex && progress.activeCheckpoint) {
                        activeCheckpoint = progress.activeCheckpoint;
                    }
                    // Show progress loaded message
                    var itemCount = Object.keys(inventory).reduce(function(sum, key) { return sum + inventory[key].count; }, 0);
                    if (itemCount > 0 || activeCheckpoint) {
                        progressMessage.text = '💾 Progress Restored!';
                        progressMessage.timer = 180; // 3 seconds at 60fps
                    }
                    return true;
                }
            }
        } catch (e) {
            console.warn('Could not load RPG progress:', e);
        }
        return false;
    }

    function showProgressMessage(text) {
        progressMessage.text = text;
        progressMessage.timer = 180; // 3 seconds at 60fps
    }

    function clearRPGProgress() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            inventory = {};
            activeCheckpoint = null;
            score = 0;
            showProgressMessage('🗑️ Progress Cleared!');
        } catch (e) {
            console.warn('Could not clear RPG progress:', e);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MULTIPLAYER FUNCTIONS (Experimental - Top-Down RPG Only)
    // ═══════════════════════════════════════════════════════════════════════════
    function initMultiplayer() {
        if (!MULTIPLAYER_ENABLED) return;
        showJoinUI();
    }

    function showJoinUI() {
        var overlay = document.createElement('div');
        overlay.id = 'mp-join-overlay';

        var customSpriteHTML = '';
        if (MULTIPLAYER_ALLOW_CUSTOM_SPRITES) {
            customSpriteHTML =
                '<div style="margin: 15px 0; padding: 12px; background: rgba(155, 89, 182, 0.1); border: 1px solid rgba(155, 89, 182, 0.3); border-radius: 8px; text-align: left;">' +
                '<div style="color: #9b59b6; font-size: 11px; font-weight: bold; margin-bottom: 8px;">🎨 Custom Sprite (optional)</div>' +
                '<div style="display: flex; gap: 8px; margin-bottom: 8px;">' +
                '<input type="text" id="mp-sprite-url" placeholder="Sprite URL (https://...)" ' +
                'style="flex: 1; padding: 10px; background: #16213e; border: 1px solid #9b59b6; border-radius: 6px; color: #fff; font-size: 12px; box-sizing: border-box;">' +
                '<button onclick="openMPSpritePicker()" style="padding: 10px 14px; background: linear-gradient(135deg, #9b59b6, #8e44ad); border: none; border-radius: 6px; color: #fff; font-size: 11px; cursor: pointer; white-space: nowrap;">📁 Browse</button>' +
                '</div>' +
                '<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">' +
                '<label style="color: #888; font-size: 11px; white-space: nowrap;">Cols:</label>' +
                '<input type="number" id="mp-sprite-cols" value="1" min="1" max="16" ' +
                'style="width: 50px; padding: 6px; background: #16213e; border: 1px solid #9b59b6; border-radius: 6px; color: #fff; font-size: 12px; text-align: center;">' +
                '<label style="color: #888; font-size: 11px; white-space: nowrap;">Rows:</label>' +
                '<input type="number" id="mp-sprite-rows" value="1" min="1" max="8" ' +
                'style="width: 50px; padding: 6px; background: #16213e; border: 1px solid #9b59b6; border-radius: 6px; color: #fff; font-size: 12px; text-align: center;">' +
                '<span style="color: #666; font-size: 10px;">(spritesheet layout)</span>' +
                '</div>' +
                '</div>';
        }

        // Greeting message section - allows players to set a message others can read
        var greetingHTML =
            '<div style="margin: 15px 0; padding: 12px; background: rgba(46, 204, 113, 0.1); border: 1px solid rgba(46, 204, 113, 0.3); border-radius: 8px; text-align: left;">' +
            '<div style="color: #2ecc71; font-size: 11px; font-weight: bold; margin-bottom: 8px;">💬 Greeting Message (optional)</div>' +
            '<input type="text" id="mp-greeting-message" placeholder="Say hi to other players!" maxlength="200" ' +
            'style="width: 100%; padding: 10px; background: #16213e; border: 1px solid #2ecc71; border-radius: 6px; color: #fff; font-size: 12px; box-sizing: border-box;">' +
            '<div style="color: #666; font-size: 10px; margin-top: 6px;">Other players can approach you and press E to read this message</div>' +
            '</div>';

        overlay.innerHTML = '<div style="background: rgba(0,0,0,0.95); position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 9999;">' +
            '<div style="background: #1a1a2e; padding: 30px; border-radius: 15px; border: 2px solid #667eea; max-width: 400px; text-align: center; max-height: 90vh; overflow-y: auto;">' +
            '<div style="font-size: 24px; margin-bottom: 10px; color: #fff;">🌐 Multiplayer</div>' +
            '<div style="color: #888; font-size: 12px; margin-bottom: 20px;">' +
            '<span style="background: #f39c12; color: #000; padding: 2px 6px; border-radius: 3px; font-size: 10px;">EXPERIMENTAL</span>' +
            '</div>' +
            '<input type="text" id="mp-player-name" placeholder="Your Name" value="' + MULTIPLAYER_PLAYER_NAME + '" maxlength="20" ' +
            'style="width: 100%; padding: 12px; margin-bottom: 10px; background: #16213e; border: 1px solid #667eea; border-radius: 8px; color: #fff; font-size: 14px; box-sizing: border-box;">' +
            '<input type="text" id="mp-room-code" placeholder="Room Code (leave empty to create)" maxlength="20" ' +
            'style="width: 100%; padding: 12px; background: #16213e; border: 1px solid #667eea; border-radius: 8px; color: #fff; font-size: 14px; box-sizing: border-box;">' +
            greetingHTML +
            customSpriteHTML +
            '<button onclick="connectMultiplayer()" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 8px; color: #fff; font-size: 14px; cursor: pointer; font-weight: bold; margin-top: 15px;">🎮 Join Game</button>' +
            '<button onclick="startSinglePlayer()" style="width: 100%; padding: 10px; background: transparent; border: 1px solid #444; border-radius: 8px; color: #888; font-size: 12px; cursor: pointer; margin-top: 10px;">Play Solo Instead</button>' +
            '</div></div>';
        document.body.appendChild(overlay);
    }

    // Open asset library picker for multiplayer sprite
    function openMPSpritePicker() {
        // Callback to handle asset selection
        function handleAssetSelect(url, metadata) {
            var urlInput = document.getElementById('mp-sprite-url');
            if (urlInput && url) {
                urlInput.value = url;

                // Try to auto-fill cols/rows from metadata
                if (metadata) {
                    try {
                        var meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
                        if (meta.columns) {
                            var colsInput = document.getElementById('mp-sprite-cols');
                            if (colsInput) colsInput.value = meta.columns;
                        }
                        if (meta.rows) {
                            var rowsInput = document.getElementById('mp-sprite-rows');
                            if (rowsInput) rowsInput.value = meta.rows;
                        }
                    } catch (e) {}
                }
            }
        }

        // Option 1: Try parent window callback (iframe mode)
        var pickerFn = (window.parent && window.parent !== window && window.parent.openAssetPickerWithCallback) || window.openAssetPickerWithCallback;
        if (typeof pickerFn === 'function') {
            pickerFn(handleAssetSelect, 'sprites');
            return;
        }

        // Option 2: Use AssetLibraryPicker directly (standalone mode)
        if (typeof AssetLibraryPicker === 'function') {
            var picker = new AssetLibraryPicker({
                categories: ['sprites'],
                apiBase: 'https://www.mytekos.com/beta/api/v1',
                onSelect: function(asset) {
                    var fileUrl = asset.file_url || ('https://www.mytekos.com/beta/file.php?file=' + asset.file_path);
                    handleAssetSelect(fileUrl, asset.metadata);
                },
                onError: function(error) {
                    console.error('Asset picker error:', error);
                    alert('Error loading assets. Please try again or paste a URL manually.');
                }
            });
            picker.open({ category: 'sprites' });
            return;
        }

        // No picker available
        alert('Asset Library not available. Please paste a sprite URL manually.');
    }
    window.openMPSpritePicker = openMPSpritePicker;

    // Load a custom sprite for a remote player
    function loadRemotePlayerSprite(playerId, url) {
        var rp = remotePlayers[playerId];
        if (!rp) return;

        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            rp.customSpriteImage = img;
            rp.customSpriteLoaded = true;
            rp.customSpriteError = false;
        };
        img.onerror = function() {
            rp.customSpriteError = true;
            rp.customSpriteLoaded = false;
            console.warn('Failed to load custom sprite for player:', playerId, url);
        };
        img.src = url;
    }

    function connectMultiplayer() {
        myPlayerName = document.getElementById('mp-player-name').value.trim() || 'Player';
        var inputRoomCode = document.getElementById('mp-room-code').value.trim();

        // Capture custom sprite data if enabled
        if (MULTIPLAYER_ALLOW_CUSTOM_SPRITES) {
            var spriteUrlInput = document.getElementById('mp-sprite-url');
            var spriteColsInput = document.getElementById('mp-sprite-cols');
            var spriteRowsInput = document.getElementById('mp-sprite-rows');
            var spriteUrl = spriteUrlInput ? spriteUrlInput.value.trim() : '';
            var spriteCols = spriteColsInput ? Math.max(1, Math.min(16, parseInt(spriteColsInput.value) || 1)) : 1;
            var spriteRows = spriteRowsInput ? Math.max(1, Math.min(8, parseInt(spriteRowsInput.value) || 1)) : 1;

            // Validate URL (basic check)
            if (spriteUrl && (spriteUrl.startsWith('http://') || spriteUrl.startsWith('https://'))) {
                myCustomSprite = { url: spriteUrl, cols: spriteCols, rows: spriteRows };
                // Load the custom sprite image for local player
                myCustomSpriteImage = new Image();
                myCustomSpriteImage.crossOrigin = 'anonymous';
                myCustomSpriteImage.onload = function() {
                    myCustomSpriteLoaded = true;
                    console.log('Local player custom sprite loaded:', spriteUrl, 'cols:', spriteCols, 'rows:', spriteRows);
                };
                myCustomSpriteImage.onerror = function() {
                    myCustomSpriteLoaded = false;
                    myCustomSpriteImage = null;
                    console.warn('Failed to load custom sprite:', spriteUrl);
                };
                myCustomSpriteImage.src = spriteUrl;
            } else {
                myCustomSprite = null;
                myCustomSpriteImage = null;
                myCustomSpriteLoaded = false;
            }
        }

        // Capture greeting message (always available)
        var greetingInput = document.getElementById('mp-greeting-message');
        var greetingText = greetingInput ? greetingInput.value.trim() : '';
        if (greetingText && greetingText.length > 0) {
            myGreetingMessage = greetingText.substring(0, 200); // Max 200 chars
        } else {
            myGreetingMessage = null;
        }

        roomCode = inputRoomCode || 'gm-' + Math.random().toString(36).substring(2, 8);

        // Show connecting status
        var joinBtn = document.querySelector('#mp-join-overlay button');
        var originalBtnText = joinBtn ? joinBtn.innerHTML : '';
        if (joinBtn) {
            joinBtn.innerHTML = '⏳ Connecting...';
            joinBtn.disabled = true;
        }

        socket = io(MULTIPLAYER_SERVER, {
            timeout: 10000,  // 10 second timeout
            reconnectionAttempts: 3
        });

        socket.on('connect', function() {
            socket.emit('join_room', {
                roomCode: roomCode,
                name: myPlayerName
            });
        });

        socket.on('connect_error', function(err) {
            console.error('Multiplayer connection error:', err);
            if (joinBtn) {
                joinBtn.innerHTML = originalBtnText;
                joinBtn.disabled = false;
            }
            // Show error message to user
            var errorDiv = document.getElementById('mp-error-message');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.id = 'mp-error-message';
                errorDiv.style.cssText = 'color: #ff6b6b; background: rgba(255,107,107,0.1); border: 1px solid #ff6b6b; border-radius: 8px; padding: 10px; margin-top: 10px; font-size: 12px; text-align: center;';
                var overlay = document.getElementById('mp-join-overlay');
                if (overlay) {
                    var innerDiv = overlay.querySelector('div > div');
                    if (innerDiv) innerDiv.appendChild(errorDiv);
                }
            }
            errorDiv.innerHTML = '❌ Could not connect to multiplayer server.<br><span style="color: #888; font-size: 11px;">The server may be down. Try again later or Play Solo.</span>';
            // Clean up failed socket
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        });

        socket.on('joined_room', function(data) {
            myPlayerId = data.playerId;
            // MOVE_SPEED is pixels per frame at 60fps
            // Convert to tiles per second: (pixels/frame) * 60 frames/sec / (pixels/tile)
            var tilesPerSecond = (MOVE_SPEED * 60) / RENDER_SIZE;
            socket.emit('gm_init_room', {
                moveSpeed: tilesPerSecond,
                tileSize: RENDER_SIZE,
                projectileCooldown: 500,
                gameType: 'topdown',
                levelWidth: levelWidth,
                levelHeight: levelHeight
            });
        });

        socket.on('gm_room_initialized', function(data) {
            // Make sure player is at spawn position before joining
            findStartPosition();

            // In PvP mode, add random offset to prevent spawn camping
            var spawnX = player.x;
            var spawnY = player.y;
            if (PVP_ENABLED) {
                // Add random offset of 1-3 tiles in random direction
                var offsetTiles = 1 + Math.floor(Math.random() * 3);
                var direction = Math.random() < 0.5 ? -1 : 1;
                spawnX = player.x + (offsetTiles * RENDER_SIZE * direction);
                // Keep within level bounds
                spawnX = Math.max(RENDER_SIZE, Math.min(spawnX, levelWidth * RENDER_SIZE - RENDER_SIZE * 2));
                player.x = spawnX;
            }

            socket.emit('gm_join_game', {
                x: spawnX,
                y: spawnY,
                customSprite: myCustomSprite,  // Include custom sprite data (null if none)
                greetingMessage: myGreetingMessage  // Include greeting message (null if none)
            });
            var overlay = document.getElementById('mp-join-overlay');
            if (overlay) overlay.remove();
            showRoomCodeOverlay();
            multiplayerReady = true;
            requestAnimationFrame(gameLoop);
        });

        socket.on('gm_player_joined', function(data) {
            remotePlayers[data.playerId] = {
                x: data.position.x,
                y: data.position.y,
                targetX: data.position.x,  // Initialize target for interpolation
                targetY: data.position.y,
                name: data.name,
                facingDirection: 'down',
                color: getPlayerColor(Object.keys(remotePlayers).length),
                // Custom sprite support
                customSprite: data.customSprite || null,
                customSpriteImage: null,
                customSpriteLoaded: false,
                customSpriteError: false,
                // Player greeting message (for Press E interaction)
                greetingMessage: data.greetingMessage || null
            };

            // Load custom sprite if provided
            if (data.customSprite && data.customSprite.url) {
                loadRemotePlayerSprite(data.playerId, data.customSprite.url);
            }

            // Show notification if player has a greeting
            var joinMessage = '👋 ' + data.name + ' joined the game';
            if (data.greetingMessage) {
                joinMessage += ' 💬';  // Indicate they have a greeting
            }
            showChatMessage('System', joinMessage);
            updatePlayerCount();
        });

        socket.on('gm_player_moved', function(data) {
            if (data.playerId === myPlayerId) return;
            if (!remotePlayers[data.playerId]) {
                remotePlayers[data.playerId] = {
                    color: getPlayerColor(Object.keys(remotePlayers).length),
                    // Initialize position directly on first receive (no interpolation needed)
                    x: data.x,
                    y: data.y
                };
            }
            // Set target position for interpolation (smooth movement)
            remotePlayers[data.playerId].targetX = data.x;
            remotePlayers[data.playerId].targetY = data.y;
            remotePlayers[data.playerId].facingDirection = data.facingDirection;
            // Update score if provided
            if (typeof data.score !== 'undefined') {
                remotePlayers[data.playerId].score = data.score;
            }
            // Update lives if provided (for PvP mode)
            if (typeof data.lives !== 'undefined') {
                remotePlayers[data.playerId].lives = data.lives;
            }
        });

        socket.on('gm_player_left', function(data) {
            var leavingPlayer = remotePlayers[data.playerId];
            var pName = leavingPlayer ? leavingPlayer.name : 'A player';
            delete remotePlayers[data.playerId];
            showChatMessage('System', '👋 ' + pName + ' left the game');
            updatePlayerCount();
        });

        socket.on('gm_player_died', function(data) {
            var deadPlayer = remotePlayers[data.playerId];
            if (deadPlayer) {
                deadPlayer.isDead = true;
                var pName = deadPlayer.name || 'A player';
                showChatMessage('System', '💀 ' + pName + ' died!');
            }
        });

        socket.on('gm_player_respawn', function(data) {
            var respawnedPlayer = remotePlayers[data.playerId];
            if (respawnedPlayer) {
                respawnedPlayer.isDead = false;
                respawnedPlayer.lives = maxLives; // Reset their health display
                var pName = respawnedPlayer.name || 'A player';
                showChatMessage('System', '🔄 ' + pName + ' respawned!');
            }
        });

        socket.on('gm_position_correction', function(data) {
            player.x = data.x;
            player.y = data.y;
            if (data.softBanned) {
                showChatMessage('System', '⚠️ Movement restricted - stop cheating!');
            }
        });

        socket.on('gm_item_collected', function(data) {
            if (!MULTIPLAYER_SYNC_ITEMS) return;
            removeCollectedItem(data.itemId, data.position);
        });

        socket.on('gm_enemy_killed', function(data) {
            if (!MULTIPLAYER_SYNC_ENEMIES) return;
            // Find and deactivate the enemy
            for (var i = 0; i < activeObjects.length; i++) {
                var obj = activeObjects[i];
                if (obj.type === 'enemy' && obj.active) {
                    // Match by unique enemyId first (most reliable)
                    if (data.enemyId && obj.enemyId === data.enemyId) {
                        obj.active = false;
                        obj.deathTime = Date.now(); // Record death time for respawn
                        // Don't add score - only the killer gets points
                        break;
                    }
                    // Fallback to position matching for backward compatibility
                    if (!data.enemyId) {
                        var dx = Math.abs(obj.x - data.x);
                        var dy = Math.abs(obj.y - data.y);
                        if (dx < RENDER_SIZE && dy < RENDER_SIZE) {
                            obj.active = false;
                            obj.deathTime = Date.now();
                            break;
                        }
                    }
                }
            }
        });

        // Handle collectible respawn from another player
        socket.on('gm_collectible_respawn', function(data) {
            handleRemoteCollectibleRespawn(data);
        });

        // Handle enemy respawn from another player
        socket.on('gm_enemy_respawn', function(data) {
            if (!MULTIPLAYER_SYNC_ENEMIES) return;
            // Find and reactivate the enemy
            for (var i = 0; i < activeObjects.length; i++) {
                var obj = activeObjects[i];
                if (obj.type === 'enemy' && !obj.active && obj.enemyId === data.enemyId) {
                    obj.active = true;
                    obj.x = data.x || obj.startX;
                    obj.y = data.y || obj.startY;
                    obj.direction = 1;
                    obj.velocityY = 0;
                    obj.deathTime = 0;
                    break;
                }
            }
        });

        // Handle remote player projectiles
        socket.on('gm_projectile_spawned', function(data) {
            if (data.playerId === myPlayerId) return; // Ignore our own projectiles
            var playerColor = remotePlayers[data.playerId] ? remotePlayers[data.playerId].color : '#00d9ff';
            // Calculate speed from direction (server sends direction, not speed)
            var speedX = 0, speedY = 0;
            if (data.facingDirection === 'up') speedY = -PROJECTILE_SPEED;
            else if (data.facingDirection === 'down') speedY = PROJECTILE_SPEED;
            else if (data.facingDirection === 'left') speedX = -PROJECTILE_SPEED;
            else if (data.facingDirection === 'right') speedX = PROJECTILE_SPEED;
            else speedX = (data.direction || 1) * PROJECTILE_SPEED; // Platformer fallback

            remoteProjectiles.push({
                x: data.x,
                y: data.y,
                speedX: speedX,
                speedY: speedY,
                width: PROJECTILE_WIDTH,
                height: PROJECTILE_HEIGHT,
                color: playerColor, // Use player's color for their projectiles
                spawnTime: Date.now(),
                playerId: data.playerId
            });
        });

        socket.on('gm_chat_message', function(data) {
            if (MULTIPLAYER_SHOW_CHAT) {
                showChatMessage(data.playerName, data.message);
            }
        });

        // PvP: Handle being hit by another player's projectile
        socket.on('gm_pvp_hit_received', function(data) {
            if (!PVP_ENABLED) return;
            // Process if WE are the target
            if (data.targetId === myPlayerId) {
                // Take damage
                myPvPLives -= data.damage;
                triggerScreenShake(6, 12); // Quick shake (~0.2s at 60fps)
                vibrate([100, 50, 100]);
                player.invincibleUntil = Date.now() + 1500; // Brief invincibility
                showChatMessage('System', '💥 Hit by ' + data.attackerName + '!');

                // Check for elimination
                if (myPvPLives <= 0) {
                    myPvPLives = 0;
                    pvpEliminated = true;
                    // Notify server of elimination
                    socket.emit('gm_pvp_elimination', {
                        killerId: data.attackerId
                    });
                }
                updateMpLeaderboard();
            } else if (remotePlayers[data.targetId]) {
                // Another player was hit - update their lives locally for leaderboard
                var rp = remotePlayers[data.targetId];
                if (typeof rp.lives === 'number') {
                    rp.lives = Math.max(0, rp.lives - (data.damage || 1));
                }
                updateMpLeaderboard();
            }
        });

        // PvP: Handle elimination announcement
        socket.on('gm_pvp_player_eliminated', function(data) {
            if (!PVP_ENABLED) return;
            showChatMessage('System', '💀 ' + data.victimName + ' was eliminated by ' + data.killerName + '!');

            // If killer is us, add score
            if (data.killerId === myPlayerId) {
                score += PVP_KILL_SCORE;
                showChatMessage('System', '🎯 +' + PVP_KILL_SCORE + ' points!');
                // Check if score goal is met
                if (goalCondition === 'score' && checkGoalCondition()) {
                    handleLevelComplete();
                }
            }

            // If victim is us, handle respawn
            if (data.victimId === myPlayerId) {
                setTimeout(function() {
                    // Respawn with reset
                    pvpEliminated = false;
                    myPvPLives = PVP_STARTING_LIVES;
                    score = 0;
                    // Reset position to spawn with random offset to prevent camping
                    findStartPosition();
                    var offsetTiles = 1 + Math.floor(Math.random() * 3);
                    var direction = Math.random() < 0.5 ? -1 : 1;
                    player.x = player.x + (offsetTiles * RENDER_SIZE * direction);
                    player.x = Math.max(RENDER_SIZE, Math.min(player.x, levelWidth * RENDER_SIZE - RENDER_SIZE * 2));
                    player.speedX = 0;
                    player.speedY = 0;
                    showChatMessage('System', '🔄 Respawned! Score reset.');
                    updateMpLeaderboard();
                }, 2000); // 2 second respawn delay
            } else if (remotePlayers[data.victimId]) {
                // Remote player eliminated - show skull, then reset after respawn
                remotePlayers[data.victimId].lives = 0;
                setTimeout(function() {
                    if (remotePlayers[data.victimId]) {
                        remotePlayers[data.victimId].lives = PVP_STARTING_LIVES;
                        updateMpLeaderboard();
                    }
                }, 2000);
            }
            updateMpLeaderboard();
        });

        socket.on('error', function(err) {
            console.error('Multiplayer error:', err);
            showChatMessage('System', '❌ ' + (err.message || 'Connection error'));
        });

        socket.on('disconnect', function() {
            showChatMessage('System', '🔌 Disconnected from server');
            multiplayerReady = false;
        });
    }

    function startSinglePlayer() {
        MULTIPLAYER_ENABLED = false;
        var overlay = document.getElementById('mp-join-overlay');
        if (overlay) overlay.remove();
        requestAnimationFrame(gameLoop);
    }

    function showRoomCodeOverlay() {
        // Prevent duplicate overlays
        var existingOverlay = document.getElementById('mp-room-overlay');
        if (existingOverlay) existingOverlay.remove();

        var overlay = document.createElement('div');
        overlay.id = 'mp-room-overlay';

        // Position relative to canvas (accounting for scaling)
        var canvasRect = canvas.getBoundingClientRect();
        var scale = canvasRect.height / CANVAS_HEIGHT;
        // Position below the HUD elements (level name at y=25, goal at y=45, plus padding)
        var topOffset = canvasRect.top + (55 * scale) + 10;
        var rightOffset = window.innerWidth - canvasRect.right + 10;

        overlay.style.cssText = 'position: fixed; top: ' + topOffset + 'px; right: ' + rightOffset + 'px; background: rgba(0,0,0,0.85); padding: 8px 12px; border-radius: 8px; z-index: 1000; font-size: 11px; font-family: sans-serif; min-width: 140px; max-width: 200px; border: 1px solid rgba(102,126,234,0.3);';
        overlay.innerHTML =
            '<div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleMpPanel()">' +
                '<div style="color: #667eea; font-weight: bold; font-size: 13px;">🎮 ' + roomCode + '</div>' +
                '<div id="mp-collapse-icon" style="color: #666; font-size: 10px;">' + (mpPanelCollapsed ? '▶' : '▼') + '</div>' +
            '</div>' +
            '<div id="mp-panel-content" style="' + (mpPanelCollapsed ? 'display:none;' : '') + '">' +
                '<div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0; padding-top: 6px;">' +
                    '<div style="color: #888; font-size: 9px; margin-bottom: 4px;">SCORES</div>' +
                    '<div id="mp-leaderboard"></div>' +
                '</div>' +
                '<div id="mp-chat-section" style="border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0; padding-top: 6px;">' +
                    '<div style="color: #888; font-size: 9px; margin-bottom: 4px;">MESSAGES <span style="color: #555;">(T to chat)</span></div>' +
                    '<div id="mp-chat-messages" style="max-height: 80px; overflow-y: auto; word-wrap: break-word; overflow-wrap: break-word;"></div>' +
                    '<input type="text" id="mp-chat-input" placeholder="Press T to chat..." maxlength="100" ' +
                        'style="display: none; width: 100%; box-sizing: border-box; margin-top: 4px; padding: 4px 6px; font-size: 10px; ' +
                        'background: rgba(255,255,255,0.1); border: 1px solid rgba(102,126,234,0.5); border-radius: 4px; color: #fff; outline: none;">' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        updateMpLeaderboard();
        setupChatInput();

        // Update position on resize
        window.addEventListener('resize', updateMpOverlayPosition);
    }

    function updateMpOverlayPosition() {
        var overlay = document.getElementById('mp-room-overlay');
        if (!overlay) return;

        var canvasRect = canvas.getBoundingClientRect();
        var scale = canvasRect.height / CANVAS_HEIGHT;
        var topOffset = canvasRect.top + (55 * scale) + 10;
        var rightOffset = window.innerWidth - canvasRect.right + 10;

        overlay.style.top = topOffset + 'px';
        overlay.style.right = rightOffset + 'px';
    }

    function toggleMpPanel() {
        mpPanelCollapsed = !mpPanelCollapsed;
        var content = document.getElementById('mp-panel-content');
        var icon = document.getElementById('mp-collapse-icon');
        if (content) content.style.display = mpPanelCollapsed ? 'none' : 'block';
        if (icon) icon.textContent = mpPanelCollapsed ? '▶' : '▼';
    }

    var chatInputActive = false;

    function openChatInput() {
        if (!MULTIPLAYER_ENABLED || !multiplayerReady) return;
        var input = document.getElementById('mp-chat-input');
        if (!input) return;

        // Expand panel if collapsed
        if (mpPanelCollapsed) {
            toggleMpPanel();
        }

        chatInputActive = true;
        window.chatInputActive = true;
        input.style.display = 'block';
        input.value = '';
        input.focus();
    }

    function closeChatInput() {
        var input = document.getElementById('mp-chat-input');
        if (input) {
            input.style.display = 'none';
            input.blur();
        }
        chatInputActive = false;
        window.chatInputActive = false;
    }

    function sendChatMessage() {
        var input = document.getElementById('mp-chat-input');
        if (!input) return;

        var message = input.value.trim();
        if (message.length > 0 && socket && socket.connected) {
            socket.emit('gm_chat', { message: message });
        }
        closeChatInput();
    }

    // Set up chat input event listeners after panel is created
    function setupChatInput() {
        var input = document.getElementById('mp-chat-input');
        if (!input) return;

        input.addEventListener('keydown', function(e) {
            e.stopPropagation(); // Prevent game from receiving key events
            if (e.key === 'Enter') {
                sendChatMessage();
            } else if (e.key === 'Escape') {
                closeChatInput();
            }
        });

        input.addEventListener('blur', function() {
            // Small delay to allow Enter key to process first
            setTimeout(function() {
                if (chatInputActive) closeChatInput();
            }, 100);
        });
    }

    function updateMpPlayerList() {
        var listDiv = document.getElementById('mp-player-list');
        if (!listDiv) return;

        var html = '';
        // Add local player first (with "you" indicator)
        html += '<div style="color: #2ecc71; font-size: 10px; padding: 2px 0;">● ' + truncateName(myPlayerName) + ' <span style="color: #666;">(you)</span></div>';

        // Add remote players
        for (var id in remotePlayers) {
            var rp = remotePlayers[id];
            html += '<div style="color: ' + (rp.color || '#00d9ff') + '; font-size: 10px; padding: 2px 0;">● ' + truncateName(rp.name) + '</div>';
        }

        listDiv.innerHTML = html;
    }

    function updateMpLeaderboard() {
        var lbDiv = document.getElementById('mp-leaderboard');
        if (!lbDiv) return;

        // Build array of all players with scores
        var players = [];

        // Add local player
        players.push({
            name: myPlayerName,
            score: score,
            lives: PVP_ENABLED ? myPvPLives : lives,
            isLocal: true,
            color: '#2ecc71'
        });

        // Add remote players
        for (var id in remotePlayers) {
            var rp = remotePlayers[id];
            players.push({
                name: rp.name || 'Player',
                score: rp.score || 0,
                lives: rp.lives || 0,
                isLocal: false,
                color: rp.color || '#00d9ff'
            });
        }

        // Sort by score (highest first)
        players.sort(function(a, b) { return b.score - a.score; });

        // Render leaderboard
        var html = '';
        for (var i = 0; i < players.length; i++) {
            var p = players[i];
            var medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i + 1) + '.'));
            // Build lives display (hearts)
            var livesStr = '';
            if (PVP_ENABLED) {
                for (var h = 0; h < p.lives; h++) livesStr += '❤️';
                if (p.lives <= 0) livesStr = '💀';
            }
            html += '<div style="display: flex; justify-content: space-between; align-items: center; color: ' + p.color + '; font-size: 10px; padding: 2px 0;">' +
                '<span>' + medal + ' ' + truncateName(p.name, 10) + (p.isLocal ? '*' : '') + '</span>' +
                '<span>' + (PVP_ENABLED ? '<span style="font-size: 8px; margin-right: 4px;">' + livesStr + '</span>' : '') + '<span style="color: #ffcc00;">' + p.score + '</span></span>' +
            '</div>';
        }

        lbDiv.innerHTML = html;
    }

    function getPlayerColor(index) {
        var colors = ['#00d9ff', '#ff006e', '#8338ec', '#fb5607', '#ffbe0b', '#06ffa5', '#ff595e', '#1982c4'];
        return colors[index % colors.length];
    }

    // Truncate player names to prevent UI overflow
    function truncateName(name, maxLen) {
        maxLen = maxLen || 12;
        if (!name) return 'Player';
        if (name.length <= maxLen) return name;
        return name.substring(0, maxLen - 1) + '…';
    }

    function updatePlayerCount() {
        // Update leaderboard when player count changes
        updateMpLeaderboard();
    }

    function showChatMessage(sender, message) {
        chatMessages.push({ sender: sender, message: message, time: Date.now() });
        if (chatMessages.length > 5) chatMessages.shift();
        updateChatOverlay();
    }

    function updateChatOverlay() {
        if (!MULTIPLAYER_SHOW_CHAT) return;
        // Use the chat section inside the multiplayer panel
        var chatDiv = document.getElementById('mp-chat-messages');
        if (!chatDiv) return; // Panel not created yet

        chatDiv.innerHTML = chatMessages.map(function(m) {
            return '<div style="padding: 3px 0; font-size: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); word-wrap: break-word; overflow-wrap: break-word;">' +
                '<span style="color: #667eea; font-weight: bold;">' + truncateName(m.sender, 12) + ':</span> ' +
                '<span style="color: #ccc;">' + m.message + '</span></div>';
        }).join('');

        // Auto-scroll to bottom
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }

    function sendPlayerPosition() {
        if (!multiplayerReady || !socket || !socket.connected) return;
        var now = Date.now();
        if (now - lastPositionSend > POSITION_SEND_INTERVAL) {
            socket.emit('gm_player_move', {
                x: player.x,
                y: player.y,
                facingDirection: player.facingDirection,
                score: score,  // Include score for leaderboard
                lives: PVP_ENABLED ? myPvPLives : lives  // Include lives for PvP leaderboard
            });
            lastPositionSend = now;
            // Update local leaderboard display
            updateMpLeaderboard();
        }
    }

    // Interpolate remote player positions for smooth movement
    function updateRemotePlayerPositions() {
        for (var id in remotePlayers) {
            var rp = remotePlayers[id];
            // Skip if no target position set yet
            if (typeof rp.targetX === 'undefined' || typeof rp.targetY === 'undefined') continue;
            // Skip if current position not initialized
            if (typeof rp.x === 'undefined' || typeof rp.y === 'undefined') {
                rp.x = rp.targetX;
                rp.y = rp.targetY;
                continue;
            }
            // Lerp toward target position
            var dx = rp.targetX - rp.x;
            var dy = rp.targetY - rp.y;

            // Check if remote player is moving (for animation)
            var isMoving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;

            // If very close, snap to target
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
                rp.x = rp.targetX;
                rp.y = rp.targetY;
            } else {
                // Smooth interpolation
                rp.x += dx * REMOTE_PLAYER_LERP_SPEED;
                rp.y += dy * REMOTE_PLAYER_LERP_SPEED;
            }

            // Animate remote player sprite when moving
            if (isMoving && PLAYER_SPRITESHEET_COLS > 1) {
                // Initialize animation state if needed
                if (typeof rp.animFrame === 'undefined') rp.animFrame = 0;
                if (typeof rp.animTimer === 'undefined') rp.animTimer = 0;

                rp.animTimer++;
                if (rp.animTimer >= 8) { // Same timing as local player
                    rp.animTimer = 0;
                    rp.animFrame = (rp.animFrame + 1) % PLAYER_SPRITESHEET_COLS;
                }
            } else {
                // Reset to idle frame when not moving
                rp.animFrame = 0;
                rp.animTimer = 0;
            }
        }
    }

    function sendItemCollected(obj) {
        if (!multiplayerReady || !socket || !MULTIPLAYER_SYNC_ITEMS) return;
        socket.emit('gm_collect_item', {
            itemId: (obj.templateId || 'item') + '_' + Math.floor(obj.x) + '_' + Math.floor(obj.y),
            itemType: 'collectible',
            x: obj.x,
            y: obj.y
        });
    }

    function sendEnemyKilled(obj) {
        if (!multiplayerReady || !socket || !MULTIPLAYER_SYNC_ENEMIES) return;
        socket.emit('gm_enemy_killed', {
            enemyId: obj.enemyId, // Use unique ID for reliable sync
            x: obj.x, // Keep position for backward compatibility
            y: obj.y,
            templateId: obj.templateId
        });
    }

    function removeCollectedItem(itemId, position) {
        // Remove item from activeObjects if it matches the position
        for (var i = activeObjects.length - 1; i >= 0; i--) {
            var obj = activeObjects[i];
            if (obj.type === 'collectible') {
                var objId = (obj.templateId || 'item') + '_' + Math.floor(obj.x) + '_' + Math.floor(obj.y);
                if (objId === itemId) {
                    activeObjects.splice(i, 1);
                    break;
                }
            }
        }
    }

    // Find a random accessible tile position for respawning collectibles
    // Spawns anywhere in the level, including over solid tiles (collectibles float above)
    // Returns tile coordinates { x: tileX, y: tileY }
    function findRandomAccessiblePosition() {
        var maxAttempts = 100;
        // Get current level's actual dimensions from allLevels data
        var currentLevel = allLevels[currentLevelIndex];
        var lvlWidth = (currentLevel && currentLevel.width) || levelWidth || 150;
        var lvlHeight = (currentLevel && currentLevel.height) || levelHeight || 30;

        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            var tx = Math.floor(Math.random() * lvlWidth);
            var ty = Math.floor(Math.random() * lvlHeight);

            // Check if position is not too close to the player
            var px = tx * RENDER_SIZE + RENDER_SIZE / 2;
            var py = ty * RENDER_SIZE + RENDER_SIZE / 2;

            var playerDist = Math.sqrt((px - player.x) * (px - player.x) + (py - player.y) * (py - player.y));
            if (playerDist < RENDER_SIZE * 4) continue;

            // Check if position is not too close to another active collectible
            // Note: obj.x and obj.y are already in PIXEL coordinates (from initializeLevel)
            var tooClose = false;
            for (var i = 0; i < activeObjects.length; i++) {
                var obj = activeObjects[i];
                if (obj.type === 'collectible' && obj.active !== false) {
                    // obj.x and obj.y are in pixels, no conversion needed
                    var dist = Math.sqrt((px - obj.x) * (px - obj.x) + (py - obj.y) * (py - obj.y));
                    if (dist < RENDER_SIZE * 2) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (tooClose) continue;

            // Found a valid position
            return { x: tx, y: ty };
        }

        // Fallback: return a random position in the level bounds
        return {
            x: Math.floor(Math.random() * lvlWidth),
            y: Math.floor(Math.random() * lvlHeight)
        };
    }

    // Respawn a collected collectible at a new random position
    // newX and newY are in TILE coordinates (from findRandomAccessiblePosition)
    function respawnCollectible(obj, newX, newY) {
        // Convert tile coordinates to pixel coordinates (matching initializeLevel logic)
        var objWidth = obj.width || RENDER_SIZE;
        var objHeight = obj.height || RENDER_SIZE;
        var pixelX = newX * RENDER_SIZE + RENDER_SIZE / 2;
        var pixelY = newY * RENDER_SIZE + RENDER_SIZE - objHeight / 2;

        // Create a new collectible with same properties at new position
        var newCollectible = {
            type: 'collectible',
            templateId: obj.templateId,
            x: pixelX,
            y: pixelY,
            width: objWidth,
            height: objHeight,
            active: true,
            value: obj.value,
            symbol: obj.symbol,
            color: obj.color,
            name: obj.name,
            spriteURL: obj.spriteURL,
            sprite: obj.sprite,
            sounds: obj.sounds,
            respawns: obj.respawns,  // Keep the respawns property
            frameCount: obj.frameCount || 1,
            spritesheetCols: obj.spritesheetCols || 1,
            spritesheetRows: obj.spritesheetRows || 1,
            animSpeed: obj.animSpeed || 8,
            animFrame: 0,
            animTimer: 0
        };
        activeObjects.push(newCollectible);
    }

    // Send collectible respawn event to other players
    function sendCollectibleRespawn(obj, newX, newY) {
        if (!multiplayerReady || !socket) return;
        socket.emit('gm_collectible_respawn', {
            templateId: obj.templateId,
            newX: newX,
            newY: newY,
            // Send all properties needed to recreate the collectible
            value: obj.value,
            symbol: obj.symbol,
            color: obj.color,
            name: obj.name,
            spriteURL: obj.spriteURL,
            respawns: obj.respawns
        });
    }

    // Handle collectible respawn from another player - create new collectible at new position
    // data.newX and data.newY are in TILE coordinates (sent via socket)
    function handleRemoteCollectibleRespawn(data) {
        // Convert tile coordinates to pixel coordinates
        var objWidth = RENDER_SIZE;
        var objHeight = RENDER_SIZE;
        var pixelX = data.newX * RENDER_SIZE + RENDER_SIZE / 2;
        var pixelY = data.newY * RENDER_SIZE + RENDER_SIZE - objHeight / 2;

        // Create a new collectible at the respawn position
        var newCollectible = {
            type: 'collectible',
            templateId: data.templateId,
            x: pixelX,
            y: pixelY,
            width: objWidth,
            height: objHeight,
            active: true,
            value: data.value || 10,
            symbol: data.symbol || '●',
            color: data.color || '#ffd700',
            name: data.name || 'Item',
            spriteURL: data.spriteURL || '',
            sprite: null,
            respawns: data.respawns === true,
            frameCount: 1,
            spritesheetCols: 1,
            spritesheetRows: 1,
            animSpeed: 8,
            animFrame: 0,
            animTimer: 0
        };

        // Load sprite if URL provided
        if (newCollectible.spriteURL) {
            var img = new Image();
            img.src = newCollectible.spriteURL;
            newCollectible.sprite = img;
        }

        activeObjects.push(newCollectible);
    }

    function drawRemotePlayers(camX, camY) {
        for (var id in remotePlayers) {
            var rp = remotePlayers[id];

            // Skip dead players
            if (rp.isDead) continue;

            var screenX = rp.x - camX;
            var screenY = rp.y - camY;

            // Skip if off-screen
            if (screenX + player.width < 0 || screenX > CANVAS_WIDTH ||
                screenY + player.height < 0 || screenY > CANVAS_HEIGHT) {
                continue;
            }

            ctx.save();

            // Determine which sprite to use: custom sprite > game sprite > fallback
            var spriteToUse = null;
            var frameCount = PLAYER_SPRITESHEET_COLS;
            var rowCount = PLAYER_SPRITESHEET_ROWS;
            var useCustomSprite = false;

            // Check for custom sprite first
            if (rp.customSpriteLoaded && rp.customSpriteImage && rp.customSpriteImage.complete && rp.customSpriteImage.naturalWidth > 0) {
                spriteToUse = rp.customSpriteImage;
                frameCount = (rp.customSprite && rp.customSprite.cols) ? rp.customSprite.cols : 1;
                rowCount = (rp.customSprite && rp.customSprite.rows) ? rp.customSprite.rows : 1;
                useCustomSprite = true;
            } else if (playerSprite && playerSprite.complete && playerSprite.naturalWidth > 0) {
                // Fall back to game's player sprite
                spriteToUse = playerSprite;
                frameCount = PLAYER_SPRITESHEET_COLS;
                rowCount = PLAYER_SPRITESHEET_ROWS;
            }

            if (spriteToUse) {
                ctx.imageSmoothingEnabled = false;
                var frameWidth = spriteToUse.naturalWidth / frameCount;
                var frameHeight = spriteToUse.naturalHeight / rowCount;

                // Use remote player's own animation frame
                var animFrame = rp.animFrame || 0;
                if (animFrame >= frameCount) animFrame = 0;
                var srcX = (animFrame % frameCount) * frameWidth;
                var srcY = 0;

                if (IS_TOPDOWN && rowCount > 1) {
                    // Multi-row sprite: select row based on direction (works for both game and custom sprites)
                    var dirRow = 0;
                    if (rp.facingDirection === 'down') dirRow = 0;
                    else if (rp.facingDirection === 'left') dirRow = Math.min(1, rowCount - 1);
                    else if (rp.facingDirection === 'right') dirRow = Math.min(2, rowCount - 1);
                    else if (rp.facingDirection === 'up') dirRow = Math.min(3, rowCount - 1);
                    srcY = dirRow * frameHeight;
                    ctx.drawImage(spriteToUse,
                        srcX, srcY, frameWidth, frameHeight,
                        screenX, screenY, player.width, player.height);
                } else if (IS_TOPDOWN) {
                    // Single-row sprite: rotate based on direction
                    var centerX = screenX + player.width / 2;
                    var centerY = screenY + player.height / 2;
                    ctx.translate(centerX, centerY);
                    switch (rp.facingDirection) {
                        case 'up':    ctx.rotate(-Math.PI / 2); break;
                        case 'down':  ctx.rotate(Math.PI / 2); break;
                        case 'left':  ctx.rotate(Math.PI); break;
                        case 'right': default: break;
                    }
                    ctx.drawImage(spriteToUse,
                        srcX, srcY, frameWidth, frameHeight,
                        -player.width / 2, -player.height / 2, player.width, player.height);
                } else {
                    // Platformer mode: flip based on facing direction
                    var facingRight = rp.facingDirection === 'right' || rp.facingRight;
                    if (!facingRight) {
                        ctx.translate(screenX + player.width, screenY);
                        ctx.scale(-1, 1);
                        ctx.drawImage(spriteToUse,
                            srcX, srcY, frameWidth, frameHeight,
                            0, 0, player.width, player.height);
                    } else {
                        ctx.drawImage(spriteToUse,
                            srcX, srcY, frameWidth, frameHeight,
                            screenX, screenY, player.width, player.height);
                    }
                }
            } else {
                // Fallback: colored rectangle with face (same as local player)
                if (IS_TOPDOWN) {
                    var centerX = screenX + player.width / 2;
                    var centerY = screenY + player.height / 2;
                    ctx.translate(centerX, centerY);
                    switch (rp.facingDirection) {
                        case 'up':    ctx.rotate(-Math.PI / 2); break;
                        case 'down':  ctx.rotate(Math.PI / 2); break;
                        case 'left':  ctx.rotate(Math.PI); break;
                        case 'right': default: break;
                    }
                    ctx.fillStyle = player.color;
                    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(-player.width / 2 + player.width - 10, -player.height / 2 + 6, 4, 4);
                    ctx.fillRect(-player.width / 2 + player.width - 10, -player.height / 2 + 14, 4, 4);
                    ctx.fillStyle = '#333';
                    ctx.fillRect(-player.width / 2 + player.width - 8, -player.height / 2 + 8, 2, 2);
                    ctx.fillRect(-player.width / 2 + player.width - 8, -player.height / 2 + 16, 2, 2);
                } else {
                    var facingRight = rp.facingDirection === 'right' || rp.facingRight;
                    var drawX = screenX;
                    var drawY = screenY;
                    if (facingRight) {
                        ctx.translate(screenX + player.width, screenY);
                        ctx.scale(-1, 1);
                        drawX = 0;
                        drawY = 0;
                    }
                    ctx.fillStyle = player.color;
                    ctx.fillRect(drawX, drawY, player.width, player.height);
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(drawX + 4, drawY + 6, 4, 4);
                    ctx.fillRect(drawX + 12, drawY + 6, 4, 4);
                    ctx.fillStyle = '#333';
                    ctx.fillRect(drawX + 5, drawY + 8, 2, 2);
                    ctx.fillRect(drawX + 13, drawY + 8, 2, 2);
                }
            }

            ctx.restore();

            // Draw name and health bar above player
            var nameText = truncateName(rp.name, 12) || 'Player';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            var textWidth = ctx.measureText(nameText).width;
            var nameX = rp.x - camX + player.width / 2;
            var nameY = rp.y - camY - 18; // Moved up to make room for health bar

            // Name background
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(nameX - textWidth / 2 - 3, nameY - 10, textWidth + 6, 14);

            // Name text with dark outline
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 2;
            ctx.strokeText(nameText, nameX, nameY);
            ctx.fillStyle = '#fff';
            ctx.fillText(nameText, nameX, nameY);

            // Health bar below name, above player
            var healthBarWidth = Math.max(player.width, 30);
            var healthBarHeight = 4;
            var healthBarX = rp.x - camX + player.width / 2 - healthBarWidth / 2;
            var healthBarY = rp.y - camY - 6;
            var rpLives = typeof rp.lives !== 'undefined' ? rp.lives : maxLives;
            var healthPercent = Math.max(0, Math.min(1, rpLives / maxLives));

            // Health bar background
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(healthBarX - 1, healthBarY - 1, healthBarWidth + 2, healthBarHeight + 2);

            // Health bar fill (color based on health)
            var barColor;
            if (healthPercent > 0.6) {
                barColor = '#2ecc71'; // Green
            } else if (healthPercent > 0.3) {
                barColor = '#f1c40f'; // Yellow
            } else {
                barColor = '#e74c3c'; // Red
            }
            ctx.fillStyle = barColor;
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
        }
    }

    // Expose multiplayer functions to global scope for onclick handlers
    if (MULTIPLAYER_ENABLED) {
        window.connectMultiplayer = connectMultiplayer;
        window.startSinglePlayer = startSinglePlayer;
        window.toggleMpPanel = toggleMpPanel;
        window.openChatInput = openChatInput;
        window.chatInputActive = false; // Expose for keydown check
    }

    // Object templates (define behaviors and properties)
    var enemyTemplates = ${JSON.stringify(enemyTemplates)};
    var collectibleTemplates = ${JSON.stringify(collectibleTemplates)};
    var hazardTemplates = ${JSON.stringify(hazardTemplates)};
    var powerupTemplates = ${JSON.stringify(powerupTemplates)};
    var springTemplates = ${JSON.stringify(springTemplates)};
    var movingPlatformTemplates = ${JSON.stringify(movingPlatformTemplates)};
    var npcTemplates = ${JSON.stringify(npcTemplates)};
    var doorTemplates = ${JSON.stringify(doorTemplates)};
    var mysteryBlockTemplates = ${JSON.stringify(mysteryBlockTemplates)};
    var terrainZoneTemplates = ${JSON.stringify(terrainZoneTemplates)};

    // Preload particle effects now that templates are defined
    preloadParticleEffects();

    // Terrain zone state tracking
    var activeTerrainZones = [];  // Terrain zones loaded from level data
    var playerCurrentZone = null; // Currently active zone affecting player
    var lastZoneDamageTime = 0;   // For throttling zone damage

    // Helper to find template by ID
    function getTemplateById(templates, id) {
        for (var i = 0; i < templates.length; i++) {
            if (templates[i].id === id) return templates[i];
        }
        return templates[0]; // Default to first template
    }

    // Active game objects (populated by loadLevel)
    var activeObjects = [];

    // Unique ID counter for enemies (for reliable multiplayer sync)
    var enemyIdCounter = 0;

    // Emitted items from mystery blocks
    var emittedItems = [];

    // Mystery block runtime states (tracks remaining items per block)
    // Key: object index in activeObjects, Value: { remaining: number, depleted: boolean }
    var mysteryBlockStates = {};

    // Powerup effects (active temporary buffs)
    var activeEffects = {
        shield: 0,     // Remaining shield hits
        speedBoost: 0, // Speed multiplier timer
        jumpBoost: 0   // Jump multiplier timer
    };

    // Load sprites from templates
    var loadedSprites = {};

    // Pre-load sprites from all templates
    function loadTemplateSprites() {
        var allTemplates = [].concat(enemyTemplates, collectibleTemplates, hazardTemplates, powerupTemplates, npcTemplates, doorTemplates);
        for (var i = 0; i < allTemplates.length; i++) {
            var tmpl = allTemplates[i];
            if (tmpl.sprite && !loadedSprites[tmpl.sprite]) {
                var img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = tmpl.sprite;
                loadedSprites[tmpl.sprite] = img;
            }
        }
        // Also preload mystery block empty sprites
        for (var j = 0; j < mysteryBlockTemplates.length; j++) {
            var mbTmpl = mysteryBlockTemplates[j];
            if (mbTmpl.sprite && !loadedSprites[mbTmpl.sprite]) {
                var sImg = new Image();
                sImg.crossOrigin = 'anonymous';
                sImg.src = mbTmpl.sprite;
                loadedSprites[mbTmpl.sprite] = sImg;
            }
            if (mbTmpl.emptySprite && !loadedSprites[mbTmpl.emptySprite]) {
                var eImg = new Image();
                eImg.crossOrigin = 'anonymous';
                eImg.src = mbTmpl.emptySprite;
                loadedSprites[mbTmpl.emptySprite] = eImg;
            }
        }
    }

    // Player sound effects (from game settings)
    var playerSounds = {
        jump: ${gameSettings.sounds?.jump ? `'${gameSettings.sounds.jump}'` : 'null'},
        hurt: ${gameSettings.sounds?.hurt ? `'${gameSettings.sounds.hurt}'` : 'null'}
    };

    // Volume settings (from game settings)
    var volumeSettings = {
        master: ${gameSettings.masterVolume ?? 1.0},
        music: ${gameSettings.musicVolume ?? 0.5},
        sfx: ${gameSettings.sfxVolume ?? 0.7}
    };

    // Helper to calculate actual volume
    function getSfxVolume() {
        return volumeSettings.master * volumeSettings.sfx;
    }
    function getMusicVolume() {
        return volumeSettings.master * volumeSettings.music;
    }

    // Checkpoint template
    var checkpointTemplate = ${JSON.stringify(checkpointTemplate)};

    // Goal template with sound
    var goalTemplate = ${JSON.stringify(goalTemplate)};

    // Loaded sounds cache
    var loadedSounds = {};

    // BGM using Web Audio API (more reliable on mobile than HTML5 Audio)
    var bgmAudioContext = null;
    var bgmBuffer = null;
    var bgmSource = null;
    var bgmGainNode = null;
    var currentBgmUrl = null;
    var bgmStartTime = 0;
    var bgmPauseTime = 0;
    var bgmIsPlaying = false;

    // SoundEffectStudio synthesis cache and audio context
    // Pre-populated with bundled data for offline support
    var sfxDataCache = ${JSON.stringify(bundledSfxData)};
    var sfxAudioContext = null;

    // Get or create audio context (shared for BGM and SFX on mobile)
    function getAudioContext() {
        if (!bgmAudioContext) {
            bgmAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume if suspended (required on mobile after user gesture)
        if (bgmAudioContext.state === 'suspended') {
            bgmAudioContext.resume();
        }
        return bgmAudioContext;
    }

    // Initialize Web Audio context for synthesized sounds (use shared context)
    function getSfxAudioContext() {
        if (!sfxAudioContext) {
            sfxAudioContext = getAudioContext();
        }
        return sfxAudioContext;
    }

    // Create reverb impulse response
    function createReverbImpulse(ctx) {
        var length = ctx.sampleRate * 2;
        var impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        var left = impulse.getChannelData(0);
        var right = impulse.getChannelData(1);
        for (var i = 0; i < length; i++) {
            var decay = Math.pow(1 - i / length, 3);
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        return impulse;
    }

    // Create distortion curve
    function createDistortionCurve(amount) {
        var samples = 44100;
        var curve = new Float32Array(samples);
        if (amount === 0) {
            for (var i = 0; i < samples; i++) {
                curve[i] = (i * 2) / samples - 1;
            }
        } else {
            var deg = Math.PI / 180;
            for (var i = 0; i < samples; i++) {
                var x = (i * 2) / samples - 1;
                curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
            }
        }
        return curve;
    }

    // Play synthesized sound from SoundEffectStudio data
    function playSynthesizedSound(synthData) {
        var ctx = getSfxAudioContext();
        var now = ctx.currentTime;
        // Use master duration, or fall back to first layer's duration, or default 0.5s
        var masterDuration = (synthData.masterSettings && synthData.masterSettings.duration) ||
                             (synthData.layers && synthData.layers[0] && synthData.layers[0].duration) ||
                             0.5;
        var masterVolume = ((synthData.masterSettings && synthData.masterSettings.volume) || 100) / 100 * getSfxVolume();
        var reverbMix = ((synthData.masterSettings && synthData.masterSettings.reverbMix) || 0) / 100;
        var filterFreq = (synthData.masterSettings && synthData.masterSettings.filterFreq) || 20000;
        var distortionAmount = (synthData.masterSettings && synthData.masterSettings.distortion) || 0;

        // Create effects chain
        var masterGain = ctx.createGain();
        var filter = ctx.createBiquadFilter();
        var distortion = ctx.createWaveShaper();
        var convolver = ctx.createConvolver();
        var dryGain = ctx.createGain();
        var wetGain = ctx.createGain();

        masterGain.gain.value = masterVolume;
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;
        distortion.curve = createDistortionCurve(distortionAmount);
        distortion.oversample = '4x';
        convolver.buffer = createReverbImpulse(ctx);
        dryGain.gain.value = 1 - reverbMix;
        wetGain.gain.value = reverbMix;

        // Connect chain
        masterGain.connect(distortion);
        distortion.connect(filter);
        filter.connect(dryGain);
        filter.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(ctx.destination);
        wetGain.connect(ctx.destination);

        // Play each layer
        var layers = synthData.layers || [];
        layers.forEach(function(layer) {
            if (layer.enabled === false) return;
            if (layer.type === 'sample') return; // Skip sample layers

            // Use layer-specific duration if available, otherwise master duration
            var duration = layer.duration || masterDuration;
            // Apply layer delay - this offsets when the layer starts playing
            var layerDelay = layer.delay || 0;
            var startTime = now + layerDelay;

            if (layer.type === 'noise') {
                // Noise layer
                var bufferSize = ctx.sampleRate * duration;
                var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                var data = buffer.getChannelData(0);
                for (var i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                var noiseSource = ctx.createBufferSource();
                var noiseGain = ctx.createGain();
                var noiseFilter = ctx.createBiquadFilter();
                noiseSource.buffer = buffer;
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.value = layer.frequency || 1000;
                noiseFilter.Q.value = 1.0;

                // Volume is already 0-1 range from SoundEffectStudio
                var vol = layer.volume !== undefined ? layer.volume : 0.8;
                var attack = layer.attack || 0.01;
                var decay = layer.decay || 0.1;
                var sustain = (layer.sustain !== undefined ? layer.sustain : 0.5) * vol;
                var release = layer.release || 0.2;

                noiseGain.gain.setValueAtTime(0, startTime);
                noiseGain.gain.linearRampToValueAtTime(vol, startTime + attack);
                noiseGain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
                noiseGain.gain.setValueAtTime(sustain, startTime + duration - release);
                noiseGain.gain.linearRampToValueAtTime(0, startTime + duration);

                noiseSource.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(masterGain);
                noiseSource.start(startTime);
                noiseSource.stop(startTime + duration);
            } else {
                // Oscillator layer
                var oscillator = ctx.createOscillator();
                var gainNode = ctx.createGain();
                oscillator.type = layer.type || 'sine';
                oscillator.frequency.value = layer.frequency || 440;

                // Frequency sweep
                if (layer.frequencyEnd && layer.frequencyEnd !== layer.frequency) {
                    oscillator.frequency.setValueAtTime(layer.frequency, startTime);
                    oscillator.frequency.exponentialRampToValueAtTime(layer.frequencyEnd, startTime + duration);
                }

                // ADSR envelope - volume is already 0-1 range from SoundEffectStudio
                var vol = layer.volume !== undefined ? layer.volume : 0.8;
                var attack = layer.attack || 0.01;
                var decay = layer.decay || 0.1;
                var sustain = (layer.sustain !== undefined ? layer.sustain : 0.5) * vol;
                var release = layer.release || 0.2;

                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(vol, startTime + attack);
                gainNode.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
                gainNode.gain.setValueAtTime(sustain, startTime + duration - release);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

                oscillator.connect(gainNode);
                gainNode.connect(masterGain);
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            }
        });
    }

    // Fetch and cache SoundEffectStudio synthesis data
    function fetchSfxData(projectId, callback) {
        // Note: We still use cache for performance during gameplay, but with cache-busting on the URL
        // to ensure we get fresh data when the game starts. The server has a 60s cache header.
        if (sfxDataCache[projectId]) {
            callback(sfxDataCache[projectId]);
            return;
        }

        var xhr = new XMLHttpRequest();
        // Add cache-busting to get fresh data (especially important after editing sounds)
        xhr.open('GET', 'https://www.mytekos.com/beta/applications/SoundEffectStudio/get_synthesis_data.php?id=' + projectId + '&_t=' + Date.now(), true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response.success && response.data) {
                            sfxDataCache[projectId] = response.data;
                            callback(response.data);
                        }
                    } catch (e) {
                        console.warn('Failed to parse SFX data for project ' + projectId);
                    }
                }
            }
        };
        xhr.send();
    }

    // Load and cache a sound (with volume applied)
    function loadSound(url, isMusic) {
        if (!url) return null;
        if (loadedSounds[url]) {
            // Update volume in case settings changed
            loadedSounds[url].volume = isMusic ? getMusicVolume() : getSfxVolume();
            return loadedSounds[url];
        }
        var audio = new Audio(url);
        audio.volume = isMusic ? getMusicVolume() : getSfxVolume();
        loadedSounds[url] = audio;
        return audio;
    }

    // Pre-load player sounds (skip sfx: references - they're synthesized on-the-fly)
    if (playerSounds.jump && playerSounds.jump.indexOf('sfx:') !== 0) loadSound(playerSounds.jump, false);
    if (playerSounds.hurt && playerSounds.hurt.indexOf('sfx:') !== 0) loadSound(playerSounds.hurt, false);

    // Play a sound by URL, player sound name, or SoundEffectStudio project ID
    function playSound(nameOrUrl) {
        if (!nameOrUrl) return;

        // Check if it's a SoundEffectStudio project reference (sfx:12345)
        if (typeof nameOrUrl === 'string' && nameOrUrl.indexOf('sfx:') === 0) {
            var projectId = nameOrUrl.substring(4);
            fetchSfxData(projectId, function(synthData) {
                if (synthData) {
                    playSynthesizedSound(synthData);
                }
            });
            return;
        }

        // Check if it's a player sound name
        if (playerSounds[nameOrUrl]) {
            var actualUrl = playerSounds[nameOrUrl];
            // Player sound might also be an sfx: reference
            if (typeof actualUrl === 'string' && actualUrl.indexOf('sfx:') === 0) {
                var projectId = actualUrl.substring(4);
                fetchSfxData(projectId, function(synthData) {
                    if (synthData) {
                        playSynthesizedSound(synthData);
                    }
                });
                return;
            }
            var snd = loadSound(actualUrl, false);
            if (snd) {
                snd.volume = getSfxVolume();
                snd.currentTime = 0;
                snd.play().catch(function() {});
            }
            return;
        }

        // Otherwise treat as URL (assume SFX)
        var snd = loadSound(nameOrUrl, false);
        if (snd) {
            snd.volume = getSfxVolume();
            snd.currentTime = 0;
            snd.play().catch(function() {});
        }
    }

    // Play object-specific sound from template
    function playObjectSound(obj, soundType) {
        var template = obj.template;
        if (!template) return;

        var soundUrl = null;
        switch (soundType) {
            case 'collect': soundUrl = template.sound; break;
            case 'contact': soundUrl = template.contactSound; break;
            case 'damage': soundUrl = template.damageSound; break;
            case 'reach': soundUrl = template.reachSound; break;
            case 'pickup': soundUrl = template.sound; break;
        }

        if (soundUrl) {
            playSound(soundUrl);
        }
    }

    // Stop background music
    function stopBGM() {
        if (bgmSource) {
            try {
                bgmSource.stop();
            } catch(e) {}
            bgmSource = null;
        }
        bgmIsPlaying = false;
    }

    // Play BGM using Web Audio API (more reliable on mobile)
    function playBGMBuffer(buffer, volume) {
        var ctx = getAudioContext();

        // Stop any currently playing BGM
        stopBGM();

        // Create gain node for volume control
        bgmGainNode = ctx.createGain();
        bgmGainNode.gain.value = volume;
        bgmGainNode.connect(ctx.destination);

        // Create buffer source
        bgmSource = ctx.createBufferSource();
        bgmSource.buffer = buffer;
        bgmSource.loop = true;
        bgmSource.connect(bgmGainNode);

        // Start playback
        bgmSource.start(0);
        bgmIsPlaying = true;
        bgmStartTime = ctx.currentTime;
    }

    // Load and play BGM from URL using Web Audio API
    function loadAndPlayBGM(url, volume) {
        var ctx = getAudioContext();

        fetch(url)
            .then(function(response) { return response.arrayBuffer(); })
            .then(function(arrayBuffer) { return ctx.decodeAudioData(arrayBuffer); })
            .then(function(audioBuffer) {
                bgmBuffer = audioBuffer;
                playBGMBuffer(audioBuffer, volume);
            })
            .catch(function(e) {
                console.log('BGM load failed:', e);
            });
    }

    // Start level-specific background music
    function startLevelBGM() {
        var lvl = allLevels[currentLevelIndex];
        var bgmUrl = lvl.sounds ? lvl.sounds.bgm : null;

        // If same as current and playing, do nothing
        if (bgmUrl === currentBgmUrl && bgmIsPlaying) return;

        // Stop current bgm
        stopBGM();

        // Start new bgm if exists
        if (bgmUrl) {
            // Use global music volume * per-level bgmVolume (default 1.0 if not set)
            var levelBgmVolume = (lvl.sounds && lvl.sounds.bgmVolume !== undefined) ? lvl.sounds.bgmVolume : 1.0;
            var volume = getMusicVolume() * levelBgmVolume;

            // If same URL and we have the buffer cached, just replay it
            if (bgmUrl === currentBgmUrl && bgmBuffer) {
                playBGMBuffer(bgmBuffer, volume);
            } else {
                // Load new BGM
                loadAndPlayBGM(bgmUrl, volume);
            }
            currentBgmUrl = bgmUrl;
        } else {
            currentBgmUrl = null;
        }
    }

    // Play level complete sound (treated as music/event sound)
    function playLevelCompleteSound() {
        var lvl = allLevels[currentLevelIndex];
        var soundUrl = lvl.sounds ? lvl.sounds.levelComplete : null;
        if (soundUrl) {
            var snd = loadSound(soundUrl, true); // isMusic = true for event sounds
            if (snd) {
                snd.volume = getMusicVolume();
                snd.currentTime = 0;
                snd.play().catch(function() {});
            }
        }
    }

    // Play game over sound (treated as music/event sound)
    function playGameOverSound() {
        var lvl = allLevels[currentLevelIndex];
        var soundUrl = lvl.sounds ? lvl.sounds.gameOver : null;
        if (soundUrl) {
            var snd = loadSound(soundUrl, true); // isMusic = true for event sounds
            if (snd) {
                snd.volume = getMusicVolume();
                snd.currentTime = 0;
                snd.play().catch(function() {});
            }
        }
    }

    // Load a level by index
    function loadLevel(index) {
        if (index < 0 || index >= allLevels.length) {
            return false;
        }

        currentLevelIndex = index;
        var lvl = allLevels[index];

        // Check if this is a menu level
        isMenuLevel = lvl.levelType === 'menu';

        if (isMenuLevel) {
            // Load menu level data
            menuButtons = lvl.menuButtons || [];
            menuPressAnyKey = lvl.pressAnyKey || false;
            menuPressAnyKeyText = lvl.pressAnyKeyText || 'Press any key to start';
            menuWaitingForKey = menuPressAnyKey; // Start waiting if press any key is enabled

            // Load background layers for menu
            backgroundLayers = lvl.backgroundLayers || [];
            loadedBgImages = [];
            loadBackgrounds();

            // Load background particle effect for menu
            loadBackgroundParticleEffect(lvl.backgroundParticleEffect || '', lvl.backgroundParticleSpawnMode || 'auto');

            // Reset game state
            gameOver = false;
            levelComplete = false;

            // Hide mobile controls for menu levels
            var mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) {
                mobileControls.style.display = 'none';
            }

            return true;
        }

        // Show mobile controls for gameplay levels
        if (ENABLE_MOBILE_CONTROLS && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
            var mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) {
                mobileControls.style.display = 'block';
            }
        }

        // Set level data
        level = lvl.tiles || [];
        levelWidth = lvl.width || level[0].length;
        levelHeight = lvl.height || level.length;
        gameObjectsData = lvl.gameObjects || [];
        spawnPoint = lvl.spawnPoint;

        // Set goal conditions
        goalCondition = lvl.goalCondition || 'goal';
        nextLevelId = lvl.nextLevelId;
        requiredScore = lvl.requiredScore || 0;
        timeLimit = lvl.timeLimit || 0;
        levelTimer = 0;

        // Handle run timer on level load
        if (RUN_TIMER_ENABLED) {
            if (RUN_TIMER_MODE === 'level') {
                runTimer = 0; // Per-level: reset each level
            } else {
                // Cumulative: add current to total, reset current
                totalRunTime += runTimer;
                runTimer = 0;
            }
        }

        // Set autoscroll settings
        autoscrollEnabled = lvl.autoscrollEnabled || false;
        autoscrollSpeed = lvl.autoscrollSpeed || 3;
        autoscrollMode = lvl.autoscrollMode || 'end';
        autoscrollX = 0; // Reset autoscroll position for new level

        // Load level-specific background layers
        backgroundLayers = lvl.backgroundLayers || [];
        loadedBgImages = []; // Clear old images
        loadBackgrounds(); // Load new background images

        // Load background particle effect (snow, rain, fog, etc.)
        loadBackgroundParticleEffect(lvl.backgroundParticleEffect || '', lvl.backgroundParticleSpawnMode || 'auto');

        // Reset enemy ID counter for consistent IDs across all clients
        enemyIdCounter = 0;

        // Count collectibles for 'collect_all' condition
        collectiblesTotal = 0;
        collectiblesCollected = 0;
        for (var i = 0; i < gameObjectsData.length; i++) {
            if (gameObjectsData[i].type === 'collectible') {
                collectiblesTotal++;
            }
        }

        // Reset game state for new level (keep score across levels)
        levelComplete = false;
        activeEffects = { shield: 0, speedBoost: 0, jumpBoost: 0 };
        activeCheckpoint = null; // Reset checkpoint for new level
        emittedItems = []; // Clear emitted items from mystery blocks

        // Initialize objects and player
        initGameObjects();
        findStartPosition();

        return true;
    }

    // Find next level by ID
    function findLevelIndexById(id) {
        for (var i = 0; i < allLevels.length; i++) {
            if (allLevels[i].id === id) return i;
        }
        return -1;
    }

    // Find the first gameplay level (skip menu levels)
    function findFirstGameplayLevel() {
        for (var i = 0; i < allLevels.length; i++) {
            if (allLevels[i].levelType !== 'menu') {
                return i;
            }
        }
        return 0; // Fallback to first level if no gameplay levels exist
    }

    // Execute a menu button action
    function executeMenuButtonAction(button) {
        switch (button.action) {
            case 'start_game':
                var firstGameplay = findFirstGameplayLevel();
                loadLevel(firstGameplay);
                startLevelBGM();
                break;
            case 'go_to_level':
                if (button.actionTarget) {
                    var targetIndex = findLevelIndexById(button.actionTarget);
                    if (targetIndex >= 0) {
                        loadLevel(targetIndex);
                        startLevelBGM();
                    }
                }
                break;
            case 'toggle_sound':
                soundEnabled = !soundEnabled;
                // Update all audio elements
                var allAudio = document.querySelectorAll('audio');
                allAudio.forEach(function(audio) {
                    audio.muted = !soundEnabled;
                });
                // Update button text to show current state
                button.text = 'Sound: ' + (soundEnabled ? 'ON' : 'OFF');
                break;
            case 'open_url':
                if (button.actionTarget) {
                    window.open(button.actionTarget, '_blank');
                }
                break;
        }
    }

    // Handle "press any key" - advance to first gameplay level
    function handlePressAnyKey() {
        if (menuWaitingForKey) {
            menuWaitingForKey = false;
            var firstGameplay = findFirstGameplayLevel();
            loadLevel(firstGameplay);
            startLevelBGM();
        }
    }

    // Check if a point is inside a menu button
    function isPointInMenuButton(x, y, button) {
        var btnX = (button.x / 100) * CANVAS_WIDTH;
        var btnY = (button.y / 100) * CANVAS_HEIGHT;
        var btnWidth = (button.width / 100) * CANVAS_WIDTH;
        var btnHeight = button.height || 50;

        return x >= btnX - btnWidth / 2 &&
               x <= btnX + btnWidth / 2 &&
               y >= btnY - btnHeight / 2 &&
               y <= btnY + btnHeight / 2;
    }

    // Handle menu click/touch
    function handleMenuClick(canvasX, canvasY) {
        if (menuWaitingForKey) {
            handlePressAnyKey();
            return;
        }

        // Check each button
        for (var i = 0; i < menuButtons.length; i++) {
            var button = menuButtons[i];
            if (isPointInMenuButton(canvasX, canvasY, button)) {
                executeMenuButtonAction(button);
                break;
            }
        }
    }

    // Draw menu level
    function drawMenu() {
        // Draw background gradient
        var gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#2d1b4e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw background layers
        for (var i = 0; i < backgroundLayers.length; i++) {
            var layer = backgroundLayers[i];
            var img = loadedBgImages[i];
            if (img && img.complete && img.naturalWidth > 0) {
                // Scale to cover canvas
                var scale = Math.max(CANVAS_WIDTH / img.naturalWidth, CANVAS_HEIGHT / img.naturalHeight);
                var drawWidth = img.naturalWidth * scale;
                var drawHeight = img.naturalHeight * scale;
                var drawX = (CANVAS_WIDTH - drawWidth) / 2;
                var drawY = (CANVAS_HEIGHT - drawHeight) / 2;

                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            }
        }

        // Update and draw background particle effect (snow, rain, etc.)
        updateBackgroundParticles(1/60);
        drawBackgroundParticles();

        // Draw menu buttons (unless waiting for key press)
        if (!menuWaitingForKey) {
            for (var i = 0; i < menuButtons.length; i++) {
                drawMenuButton(menuButtons[i]);
            }
        }

        // Draw "Press Any Key" text if waiting
        if (menuWaitingForKey) {
            var pulseAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.3;
            ctx.font = 'bold 28px sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, ' + pulseAlpha + ')';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 8;
            ctx.fillText(menuPressAnyKeyText, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.7);
            ctx.shadowBlur = 0;
        }
    }

    // Draw a single menu button
    function drawMenuButton(button) {
        var btnX = (button.x / 100) * CANVAS_WIDTH;
        var btnY = (button.y / 100) * CANVAS_HEIGHT;
        var btnWidth = (button.width / 100) * CANVAS_WIDTH;
        var btnHeight = button.height || 50;

        var style = button.style || {};
        var bgColor = style.bgColor || '#e94560';
        var textColor = style.textColor || '#ffffff';
        var borderColor = style.borderColor || '#ffffff';
        var borderRadius = style.borderRadius || 10;
        var fontSize = style.fontSize || 20;

        // Draw button shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(btnX - btnWidth / 2 + 3, btnY - btnHeight / 2 + 3, btnWidth, btnHeight, borderRadius);
        ctx.fill();

        // Draw button background
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, borderRadius);
        ctx.fill();

        // Draw button border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw button text
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.text || 'Button', btnX, btnY);
    }

    // Check if goal condition is met
    function checkGoalCondition() {
        switch (goalCondition) {
            case 'goal':
                // Handled by goal object collision
                return false;
            case 'collect_all':
                return collectiblesCollected >= collectiblesTotal && collectiblesTotal > 0;
            case 'score':
                return score >= requiredScore;
            case 'survive':
                return levelTimer >= timeLimit && timeLimit > 0;
            default:
                return false;
        }
    }

    // Handle level completion - go to next level or show win
    function handleLevelComplete() {
        levelComplete = true;
        playLevelCompleteSound();
        // Spawn level complete celebration particles
        spawnParticleEffect('levelComplete', player.x + player.width/2, player.y + player.height/2);
        // Also play goal reach sound if available
        if (goalTemplate.reachSound) playSound(goalTemplate.reachSound);
        // Victory vibration pattern
        vibrate([50, 50, 100, 50, 150]);

        if (nextLevelId) {
            var nextIndex = findLevelIndexById(nextLevelId);
            if (nextIndex >= 0) {
                // Show brief "Level Complete" then load next
                setTimeout(function() {
                    loadLevel(nextIndex);
                    startLevelBGM(); // Start new level's BGM
                }, 2000);
                return;
            }
        }

        // No next level - game complete!
        stopBGM();
    }

    function initGameObjects() {
        loadTemplateSprites();
        // Filter out terrain zones - they are handled separately in activeTerrainZones
        activeObjects = gameObjectsData.filter(function(obj) {
            return obj.type !== 'terrainZone';
        }).map(function(obj) {
            var template = null;
            var templates = null;

            // Get the appropriate template
            if (obj.type === 'enemy') templates = enemyTemplates;
            else if (obj.type === 'collectible') templates = collectibleTemplates;
            else if (obj.type === 'hazard') templates = hazardTemplates;
            else if (obj.type === 'powerup') templates = powerupTemplates;
            else if (obj.type === 'spring') templates = springTemplates;
            else if (obj.type === 'movingPlatform') templates = movingPlatformTemplates;
            else if (obj.type === 'npc') templates = npcTemplates;
            else if (obj.type === 'door') templates = doorTemplates;
            else if (obj.type === 'mysteryBlock') templates = mysteryBlockTemplates;
            else if (obj.type === 'checkpoint') template = checkpointTemplate;
            else if (obj.type === 'goal') template = goalTemplate;

            if (templates) {
                template = getTemplateById(templates, obj.templateId);
            }

            // Get size from template or default to RENDER_SIZE (scale applied)
            var objWidth = (template && template.width) ? template.width * TILE_SCALE : RENDER_SIZE;
            var objHeight = (template && template.height) ? template.height * TILE_SCALE : RENDER_SIZE;

            // Position: center X in tile, but align bottom with tile bottom (so objects stand ON tiles)
            var objX = obj.x * RENDER_SIZE + RENDER_SIZE / 2;
            var objY = obj.y * RENDER_SIZE + RENDER_SIZE - objHeight / 2; // Bottom-aligned

            var gameObj = {
                x: objX,
                y: objY,
                startX: objX, // Remember start position for pacing/wandering
                startY: objY, // Remember start Y for top-down wandering
                width: objWidth,
                height: objHeight,
                type: obj.type,
                templateId: obj.templateId,
                active: true,
                direction: 1,
                moveTimer: 0,
                animFrame: 0,
                animTimer: 0
            };

            // Copy template properties
            if (template) {
                gameObj.template = template;
                gameObj.color = template.color;
                gameObj.symbol = template.symbol;
                gameObj.tileKey = template.tileKey || '';
                gameObj.sprite = template.sprite;
                gameObj.frameCount = template.frameCount || 1;
                gameObj.spritesheetCols = template.spritesheetCols || template.frameCount || 1;
                gameObj.spritesheetRows = template.spritesheetRows || 1;
                gameObj.animSpeed = template.animSpeed || 8;

                // Enemy-specific properties
                if (obj.type === 'enemy') {
                    gameObj.enemyId = 'enemy_' + (enemyIdCounter++); // Unique ID for multiplayer sync
                    gameObj.behavior = template.behavior || 'pace';
                    gameObj.paceDistance = (template.paceDistance || 3) * RENDER_SIZE;
                    gameObj.paceAxis = template.paceAxis || 'horizontal'; // For top-down mode
                    gameObj.speed = (template.speed || 2) * TILE_SCALE;
                    gameObj.damage = template.damage || 1;
                    gameObj.followRange = (template.followRange || 5) * RENDER_SIZE;
                    gameObj.jumpPower = template.jumpPower || 8;
                    gameObj.stompable = template.stompable || false;
                    gameObj.stompScore = template.stompScore || 50;
                    gameObj.respawnTime = (template.respawnTime || 0) * 1000; // Convert seconds to ms
                    gameObj.deathTime = 0; // Timestamp when enemy was killed (for respawn)
                    gameObj.velocityY = 0;
                    gameObj.onGround = false;
                }

                // Collectible-specific
                if (obj.type === 'collectible') {
                    gameObj.name = template.name || 'Item';
                    gameObj.value = template.value || 10;
                    gameObj.respawns = template.respawns === true;
                }

                // Hazard-specific
                if (obj.type === 'hazard') {
                    gameObj.damage = template.damage || 1;
                    gameObj.continuous = template.continuous || false;
                }

                // Powerup-specific
                if (obj.type === 'powerup') {
                    gameObj.effect = template.effect || 'heal';
                    gameObj.amount = template.amount || 1;
                    gameObj.duration = template.duration || 0;
                }

                // Spring-specific
                if (obj.type === 'spring') {
                    gameObj.bouncePower = template.bouncePower || 1.5;
                    gameObj.bounceSound = template.bounceSound || '';
                }

                // Checkpoint-specific
                if (obj.type === 'checkpoint') {
                    gameObj.activated = false;
                    gameObj.activatedColor = template.activatedColor || '#2ecc71';
                    gameObj.activateSound = template.activateSound || '';
                }

                // Moving Platform-specific
                if (obj.type === 'movingPlatform') {
                    gameObj.axis = template.axis || 'x';
                    gameObj.distance = template.distance || 100;
                    gameObj.speed = template.speed || 2;
                    gameObj.collisionMode = template.collisionMode || 'solid';
                    gameObj.activation = template.activation || 'always';
                    gameObj.activated = (template.activation === 'always');
                    gameObj.tileKey = template.tileKey || '';
                    gameObj.moveSound = template.moveSound || '';
                    gameObj.showInactiveOutline = template.showInactiveOutline !== false;
                    gameObj.inactiveOutlineColor = template.inactiveOutlineColor || '#ffff00';
                    gameObj.startX = objX;
                    gameObj.startY = objY;

                    // Randomize start position if enabled and always-moving
                    if (template.randomizeStart && template.activation === 'always') {
                        var randomOffset = Math.random() * gameObj.distance;
                        if (gameObj.axis === 'y') {
                            gameObj.y = objY + randomOffset;
                            gameObj.startY = objY; // Keep original start for boundary calc
                        } else {
                            gameObj.x = objX + randomOffset;
                            gameObj.startX = objX; // Keep original start for boundary calc
                        }
                        // Also randomize initial direction
                        gameObj.direction = Math.random() < 0.5 ? 1 : -1;
                    } else {
                        gameObj.direction = 1; // 1 = forward, -1 = backward
                    }

                    gameObj.lastX = gameObj.x;
                    gameObj.lastY = gameObj.y;
                    gameObj.deltaX = 0;
                    gameObj.deltaY = 0;
                    // Collapsing platform properties
                    gameObj.collapsing = template.collapsing || false;
                    gameObj.collapseDelay = (template.collapseDelay || 1.0) * 1000; // Convert to ms
                    gameObj.collapseShakeDuration = (template.collapseShakeDuration || 0.5) * 1000;
                    gameObj.collapseRespawnTime = (template.collapseRespawnTime !== undefined ? template.collapseRespawnTime : 3.0) * 1000; // 0 = never respawn
                    gameObj.collapseSound = template.collapseSound || '';
                    // Collapse state tracking
                    gameObj.collapseState = 'solid'; // 'solid', 'shaking', 'collapsed'
                    gameObj.collapseTimer = 0;
                    gameObj.playerStandingTime = 0;
                    gameObj.shakeOffset = 0;
                }

                // NPC-specific (Top-Down RPG)
                if (obj.type === 'npc') {
                    gameObj.dialogueLines = template.dialogueLines || ['Hello!'];
                    gameObj.interactionRadius = template.interactionRadius || 48;
                    gameObj.behavior = template.behavior || 'stationary';
                    gameObj.name = template.name || 'NPC';
                    gameObj.solidCollision = template.solidCollision !== false; // Default true
                    // Wander behavior state
                    gameObj.speedX = 0;
                    gameObj.speedY = 0;
                    gameObj.wanderTimer = 0;
                    gameObj.wanderPauseTimer = 0;
                    gameObj.wanderDirection = 'down'; // Current facing direction
                    gameObj.wanderSpeed = template.wanderSpeed || 1;
                    gameObj.wanderRadius = (template.wanderRadius || 3) * RENDER_SIZE;
                }

                // Door-specific (Top-Down RPG)
                if (obj.type === 'door') {
                    gameObj.destinationType = template.destinationType || 'position';
                    gameObj.destinationLevelId = template.destinationLevelId || null;
                    gameObj.destinationX = template.destinationX || null;
                    gameObj.destinationY = template.destinationY || null;
                    gameObj.interactionRadius = template.interactionRadius || 48;
                    gameObj.interactSound = template.interactSound || '';
                    gameObj.particleEffect = template.particleEffect || '';
                }

                // Mystery Block-specific (Platformer)
                if (obj.type === 'mysteryBlock') {
                    gameObj.emitType = template.emitType || 'collectible';
                    gameObj.emitTemplateId = template.emitTemplateId || 'coin';
                    gameObj.emitCount = template.emitCount || 1;
                    gameObj.depletedBehavior = template.depletedBehavior || 'solid';
                    gameObj.emitMode = template.emitMode || 'popup';
                    gameObj.emitDirection = template.emitDirection || 'up';
                    gameObj.emitSpeed = template.emitSpeed || 3;
                    gameObj.emitPopHeight = template.emitPopHeight || 32;
                    gameObj.emitGravity = template.emitGravity !== false;
                    gameObj.collectMode = template.collectMode || 'manual';
                    gameObj.autoCollectDelay = template.autoCollectDelay || 500;
                    gameObj.emptyColor = template.emptyColor || '#8B4513';
                    gameObj.emptySprite = template.emptySprite || '';
                    gameObj.emptyTileKey = template.emptyTileKey || '';
                    gameObj.hitSound = template.hitSound || '';
                    gameObj.emptyHitSound = template.emptyHitSound || '';
                    gameObj.particleEffect = template.particleEffect || '';
                    // Runtime state - remaining items tracked in mysteryBlockStates
                    gameObj.depleted = false;
                }
            }

            return gameObj;
        });

        // Initialize mystery block states (remaining item counts)
        mysteryBlockStates = {};
        for (var i = 0; i < activeObjects.length; i++) {
            var obj = activeObjects[i];
            if (obj.type === 'mysteryBlock') {
                mysteryBlockStates[i] = {
                    remaining: obj.emitCount,
                    depleted: false
                };
            }
        }

        // Initialize terrain zones (separate from activeObjects for special handling)
        activeTerrainZones = [];
        for (var j = 0; j < gameObjectsData.length; j++) {
            var zoneData = gameObjectsData[j];
            if (zoneData.type === 'terrainZone') {
                var zoneTemplate = getTemplateById(terrainZoneTemplates, zoneData.templateId);
                activeTerrainZones.push({
                    x: zoneData.x * RENDER_SIZE,
                    y: zoneData.y * RENDER_SIZE,
                    width: (zoneData.width || 1) * RENDER_SIZE,
                    height: (zoneData.height || 1) * RENDER_SIZE,
                    templateId: zoneData.templateId,
                    template: zoneTemplate,
                    // Copy template properties for easy access
                    tintColor: zoneTemplate ? zoneTemplate.tintColor : '#4a90d9',
                    opacity: zoneTemplate ? (zoneTemplate.opacity || 0.6) : 0.6,
                    speedMultiplier: zoneTemplate ? (zoneTemplate.speedMultiplier || 1) : 1,
                    jumpMultiplier: zoneTemplate ? (zoneTemplate.jumpMultiplier || 1) : 1,
                    gravityMultiplier: zoneTemplate ? (zoneTemplate.gravityMultiplier || 1) : 1,
                    damagePerSecond: zoneTemplate ? (zoneTemplate.damagePerSecond || 0) : 0,
                    affectsEnemies: zoneTemplate ? (zoneTemplate.affectsEnemies !== false) : true,
                    imageURL: zoneTemplate ? (zoneTemplate.imageURL || '') : '',
                    name: zoneTemplate ? (zoneTemplate.name || 'Zone') : 'Zone'
                });
            }
        }
        lastZoneDamageTime = 0;
        playerCurrentZone = null;
    }

    // Check if a point is inside a terrain zone (returns zone or null)
    function getTerrainZoneAt(px, py) {
        for (var i = activeTerrainZones.length - 1; i >= 0; i--) {
            var zone = activeTerrainZones[i];
            if (px >= zone.x && px < zone.x + zone.width &&
                py >= zone.y && py < zone.y + zone.height) {
                return zone;
            }
        }
        return null;
    }

    // Check if player center is in a terrain zone
    function getPlayerTerrainZone() {
        var centerX = player.x + player.width / 2;
        var centerY = player.y + player.height / 2;
        return getTerrainZoneAt(centerX, centerY);
    }

    // Get current movement speed multiplier from terrain zone
    function getTerrainSpeedMultiplier() {
        var zone = getPlayerTerrainZone();
        return zone ? zone.speedMultiplier : 1;
    }

    // Get current gravity multiplier from terrain zone (platformer only)
    function getTerrainGravityMultiplier() {
        var zone = getPlayerTerrainZone();
        return zone ? zone.gravityMultiplier : 1;
    }

    // Get current jump multiplier from terrain zone (platformer only)
    function getTerrainJumpMultiplier() {
        var zone = getPlayerTerrainZone();
        return zone ? zone.jumpMultiplier : 1;
    }

    // Apply terrain zone damage to player
    function applyTerrainZoneDamage() {
        var zone = getPlayerTerrainZone();
        if (!zone || zone.damagePerSecond <= 0) return;

        var now = Date.now();
        // Apply damage once per second (1000ms) - skip if already game over
        if (now - lastZoneDamageTime >= 1000 && !gameOver) {
            lastZoneDamageTime = now;
            // Only damage if not invincible
            if (now >= player.invincibleUntil) {
                lives -= zone.damagePerSecond;
                player.invincibleUntil = now + 500; // Brief invincibility after zone damage
                triggerScreenShake(3, 100);
                vibrate([50, 30, 50]);
                playSound('hurt');
                if (lives <= 0) {
                    lives = 0;
                    gameOver = true;
                }
            }
        }
    }

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // SPAWN POINT - Where the player starts
    // ═══════════════════════════════════════════════════════════════════════════
    // SPAWN_POINT can be:
    //   null: Auto-detect (find first empty space above solid ground)
    //   { x: 5, y: 10 }: Specific tile coordinates
    //
    // The findStartPosition() function handles both cases.
    // It converts tile coordinates to pixel coordinates.
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}
    function findStartPosition() {
        // First check if there's an active checkpoint to respawn at
        if (activeCheckpoint) {
            player.x = activeCheckpoint.x;
            player.y = activeCheckpoint.y;
            return;
        }
        // Use spawn point if set (per-level, loaded in loadLevel())
        if (spawnPoint) {
            player.x = spawnPoint.x * RENDER_SIZE + RENDER_SIZE / 2 - player.width / 2;
            player.y = spawnPoint.y * RENDER_SIZE + RENDER_SIZE - player.height;
            return;
        }
        // Helper to check if a game object exists at tile position
        function hasObjectAt(tx, ty) {
            for (var i = 0; i < gameObjectsData.length; i++) {
                if (gameObjectsData[i].x === tx && gameObjectsData[i].y === ty) {
                    return true;
                }
            }
            return false;
        }
        // Find first valid position (empty tile above solid, with no game object)
        for (var y = 0; y < level.length - 1; y++) {
            for (var x = 0; x < level[y].length; x++) {
                var current = level[y][x];
                var below = level[y + 1] ? level[y + 1][x] : '.';
                if (current === '.' && tileTypes[below] && tileTypes[below].solid && !hasObjectAt(x, y)) {
                    player.x = x * RENDER_SIZE + RENDER_SIZE / 2 - player.width / 2;
                    player.y = y * RENDER_SIZE + RENDER_SIZE - player.height;
                    return;
                }
            }
        }
    }

    function showCheckpointMessage() {
        checkpointMessage.text = 'CHECKPOINT!';
        checkpointMessage.timer = 90; // Show for 90 frames (~1.5 seconds at 60fps)
    }

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // CAMERA - Following the player through the level
    // ═══════════════════════════════════════════════════════════════════════════
    // The camera determines what part of the level we see. We don't move the
    // level - instead, we offset everything we draw by the camera position.
    //
    // cameraX: How far right the camera has scrolled
    // cameraY: How far down the camera has scrolled
    //
    // When drawing, we subtract camera position from object position:
    //   screenX = worldX - cameraX
    //
    // This creates the illusion of movement through a larger world!
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    var cameraX = 0;
    var cameraY = 0;
    var keys = {};
    var coyoteTime = 0; // Frames player can still jump after leaving ground

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // INPUT HANDLING - Responding to keyboard
    // ═══════════════════════════════════════════════════════════════════════════
    // We use event listeners to detect key presses and releases.
    //
    // keydown: Fires when a key is pressed
    // keyup: Fires when a key is released
    //
    // The 'keys' object tracks which keys are currently held:
    //   keys['ArrowLeft'] = true  (when left arrow is held)
    //   keys['ArrowLeft'] = false (when left arrow is released)
    //
    // e.code gives us the key's physical position name:
    //   'ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyW', etc.
    //
    // e.preventDefault() stops the browser from scrolling when you press
    // Space or arrow keys - we want those keys for our game!
    //
    // TO ADD NEW CONTROLS:
    //   if (e.code === 'KeyE') { /* do something */ }
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    // Track if controls hint has been hidden
    var controlsHintHidden = false;
    function hideControlsHint() {
        if (!controlsHintHidden) {
            var hint = document.getElementById('keyboard-controls');
            if (hint) hint.classList.add('hidden');
            controlsHintHidden = true;
        }
    }

    document.addEventListener('keydown', function(e) {
        keys[e.code] = true;
        // Only prevent default if not typing in an input field
        var isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
        if (!isTyping && ['Space', 'ArrowUp', 'ArrowDown'].indexOf(e.code) >= 0) e.preventDefault();
        if (e.code === 'KeyR' && !isTyping) restartGame();

        // Hide controls hint on first game input (movement or action keys)
        if (!isTyping && !controlsHintHidden) {
            var gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];
            if (gameKeys.indexOf(e.code) >= 0) {
                hideControlsHint();
            }
        }

        // Cheat code input handling (not when typing)
        if (CHEATS_ENABLED && !gameOver && !levelComplete && !isTyping) {
            // Convert key to cheat character
            var cheatChar = keyToCheatChar[e.code] || e.key.toUpperCase();

            // Add to buffer (with comma separator for special keys)
            if (cheatBuffer.length > 0 && (keyToCheatChar[e.code] || cheatBuffer.endsWith(','))) {
                cheatBuffer += ',';
            }
            cheatBuffer += cheatChar;

            // Keep buffer reasonable length (max 50 chars)
            if (cheatBuffer.length > 50) {
                cheatBuffer = cheatBuffer.substring(cheatBuffer.length - 50);
            }

            // Check for matches
            checkCheatCodes();

            // Reset timeout
            clearTimeout(cheatBufferTimeout);
            cheatBufferTimeout = setTimeout(function() {
                cheatBuffer = '';
            }, CHEAT_BUFFER_CLEAR_TIME);
        }
        // H key - toggle hitbox debug visualization (not when typing)
        if (e.code === 'KeyH' && !isTyping) {
            showHitboxDebug = !showHitboxDebug;
        }
        // E key - interact with NPCs/doors (Top-Down RPG, not when typing)
        if (e.code === 'KeyE' && IS_TOPDOWN && !isTyping) {
            handleInteraction();
        }
        // I key - toggle inventory (Top-Down RPG, not when typing)
        if (e.code === 'KeyI' && IS_TOPDOWN && !isTyping) {
            inventoryOpen = !inventoryOpen;
        }
        // Escape key - close inventory or tell parent to close play test modal
        if (e.code === 'Escape') {
            if (inventoryOpen) {
                inventoryOpen = false;
            } else if (window.parent !== window) {
                window.parent.postMessage({ action: 'closePlayTest' }, '*');
            }
        }
        // Delete/Backspace key - clear saved progress when inventory is open (RPG mode)
        if ((e.code === 'Delete' || e.code === 'Backspace') && IS_TOPDOWN && inventoryOpen && SAVE_RPG_PROGRESS) {
            e.preventDefault();
            clearRPGProgress();
            inventoryOpen = false;
        }
        // T key - open chat input (Multiplayer, not when typing)
        if (e.code === 'KeyT' && MULTIPLAYER_ENABLED && multiplayerReady && !window.chatInputActive && !isTyping) {
            e.preventDefault();
            openChatInput();
        }
        // ? key - toggle keyboard controls visibility (not when typing)
        if (e.key === '?' && !isTyping) {
            toggleKeyboardControls();
        }
    });
    document.addEventListener('keyup', function(e) { keys[e.code] = false; });

    function resetPlayer() {
        if (autoscrollEnabled) {
            // In autoscroll mode, respawn near current camera position
            player.x = cameraX + CANVAS_WIDTH / 4;
            player.y = CANVAS_HEIGHT / 3; // Start near top so player can control fall
        } else {
            findStartPosition();
        }
        player.speedX = 0;
        player.speedY = 0;
        player.canDoubleJump = false;
        player.jumpKeyHeld = false;
    }

    function restartGame() {
        cameraX = 0;
        cameraY = 0;
        autoscrollX = 0; // Reset autoscroll position
        score = 0;
        lives = ${gameSettings.startLives || 3};
        gameOver = false;
        levelComplete = false;
        restartButton.visible = false;
        player.invincibleUntil = 0;
        player.canDoubleJump = false;
        player.jumpKeyHeld = false;
        screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };

        // Reset cheat effects (all including permanent)
        resetCheatEffects(false);

        // Reset PvP state for multiplayer
        if (PVP_ENABLED && MULTIPLAYER_ENABLED) {
            myPvPLives = PVP_STARTING_LIVES;
            pvpEliminated = false;
            updateMpLeaderboard();
        }

        // Notify other players that we respawned
        if (MULTIPLAYER_ENABLED && socket && socket.connected) {
            socket.emit('gm_player_respawn', { roomCode: roomCode });
        }

        // Restart from level 1
        loadLevel(0);
        startLevelBGM();
    }

    function loseLife() {
        // Don't lose lives during level transitions or after game over
        if (levelComplete || gameOver) return;

        lives--;
        playSound('hurt');

        // Game feel effects on damage
        triggerScreenShake(8, 15); // Strong shake (~0.25s at 60fps)
        triggerHitPause(); // Freeze frame for impact
        vibrate(150); // 150ms vibration
        spawnParticleEffect('playerDamage', player.x + player.width/2, player.y + player.height/2, 400);

        if (lives <= 0) {
            gameOver = true;
            playGameOverSound();
            vibrate([100, 50, 150]); // Death vibration pattern
            stopBGM();
            // Notify other players of death
            if (MULTIPLAYER_ENABLED && socket && socket.connected) {
                socket.emit('gm_player_died', { roomCode: roomCode });
            }
        } else {
            resetPlayer();
            // Start invincibility period after respawn
            player.invincibleUntil = Date.now() + INVINCIBILITY_TIME;
        }
    }

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // COLLISION DETECTION - How the player interacts with the world
    // ═══════════════════════════════════════════════════════════════════════════
    // These functions determine if the player is touching solid tiles.
    //
    // getTileAt(px, py):
    //   - Takes a pixel position (px, py)
    //   - Converts to tile coordinates: Math.floor(px / RENDER_SIZE)
    //   - Returns the tile object from tileTypes, or null if empty
    //
    // isSolidAt(px, py):
    //   - Uses getTileAt to get the tile
    //   - Returns true if the tile exists AND has solid: true
    //
    // WHY CHECK MULTIPLE POINTS?
    // Instead of checking one point, we check corners of the player hitbox.
    // This prevents the player from clipping through thin walls or floors.
    //
    //   Player hitbox:     Points we check:
    //   +----------+       +--*----*--+  <- Top corners (for ceiling)
    //   |          |       *          *  <- Side points (for walls)
    //   |          |       *          *
    //   |          |       *          *
    //   +----------+       +--*----*--+  <- Bottom corners (for floor)
    //
    // The +4 and -4 offsets prevent edge cases where the player
    // gets stuck on single-tile gaps.
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    function getTileAt(px, py) {
        var tx = Math.floor(px / RENDER_SIZE);
        var ty = Math.floor(py / RENDER_SIZE);
        if (ty < 0 || ty >= level.length) return null;
        if (tx < 0 || tx >= level[ty].length) return null;
        return tileTypes[level[ty][tx]] || null;
    }

    // Hitbox presets for custom tiles (normalized coordinates 0-1)
    var hitboxPresets = {
        full:   { x: 0,   y: 0,   w: 1,   h: 1   },
        top:    { x: 0,   y: 0,   w: 1,   h: 0.5 },
        bottom: { x: 0,   y: 0.5, w: 1,   h: 0.5 },
        left:   { x: 0,   y: 0,   w: 0.5, h: 1   },
        right:  { x: 0.5, y: 0,   w: 0.5, h: 1   }
    };

    function isSolidAt(px, py) {
        var tile = getTileAt(px, py);
        if (!tile || !tile.solid) return false;

        // If tile has a hitbox preset, check if point is within hitbox bounds
        if (tile.hitbox && hitboxPresets[tile.hitbox]) {
            var hb = hitboxPresets[tile.hitbox];
            var tx = Math.floor(px / RENDER_SIZE);
            var ty = Math.floor(py / RENDER_SIZE);
            // Get position within tile (0 to RENDER_SIZE)
            var localX = px - (tx * RENDER_SIZE);
            var localY = py - (ty * RENDER_SIZE);
            // Convert to normalized (0 to 1)
            var normX = localX / RENDER_SIZE;
            var normY = localY / RENDER_SIZE;
            // Check if point is within hitbox bounds
            if (normX < hb.x || normX >= hb.x + hb.w ||
                normY < hb.y || normY >= hb.y + hb.h) {
                return false; // Point is outside hitbox
            }
        }
        return true;
    }

    // Get the Y coordinate of the top of the solid surface at a given position
    // For partial hitboxes, this returns the top of the hitbox area, not the tile
    function getSolidSurfaceY(px, py) {
        var tx = Math.floor(px / RENDER_SIZE);
        var ty = Math.floor(py / RENDER_SIZE);
        var tileTop = ty * RENDER_SIZE;

        var tile = getTileAt(px, py);
        if (tile && tile.hitbox && hitboxPresets[tile.hitbox]) {
            var hb = hitboxPresets[tile.hitbox];
            // Return the top of the hitbox area within the tile
            return tileTop + (hb.y * RENDER_SIZE);
        }
        // Default: top of the full tile
        return tileTop;
    }

    // Get the Y coordinate of the bottom of the solid surface at a given position
    // For partial hitboxes (like "top half"), returns the bottom of the hitbox area
    function getSolidCeilingY(px, py) {
        var tx = Math.floor(px / RENDER_SIZE);
        var ty = Math.floor(py / RENDER_SIZE);
        var tileTop = ty * RENDER_SIZE;

        var tile = getTileAt(px, py);
        if (tile && tile.hitbox && hitboxPresets[tile.hitbox]) {
            var hb = hitboxPresets[tile.hitbox];
            // Return the bottom of the hitbox area within the tile
            return tileTop + ((hb.y + hb.h) * RENDER_SIZE);
        }
        // Default: bottom of the full tile
        return tileTop + RENDER_SIZE;
    }

    // Get the X coordinate of the left edge of the solid area (for right-side wall collision)
    function getSolidWallLeftX(px, py) {
        var tx = Math.floor(px / RENDER_SIZE);
        var tileLeft = tx * RENDER_SIZE;

        var tile = getTileAt(px, py);
        if (tile && tile.hitbox && hitboxPresets[tile.hitbox]) {
            var hb = hitboxPresets[tile.hitbox];
            return tileLeft + (hb.x * RENDER_SIZE);
        }
        return tileLeft;
    }

    // Get the X coordinate of the right edge of the solid area (for left-side wall collision)
    function getSolidWallRightX(px, py) {
        var tx = Math.floor(px / RENDER_SIZE);
        var tileLeft = tx * RENDER_SIZE;

        var tile = getTileAt(px, py);
        if (tile && tile.hitbox && hitboxPresets[tile.hitbox]) {
            var hb = hitboxPresets[tile.hitbox];
            return tileLeft + ((hb.x + hb.w) * RENDER_SIZE);
        }
        return tileLeft + RENDER_SIZE;
    }

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE FUNCTION - Game logic runs here (60 times per second)
    // ═══════════════════════════════════════════════════════════════════════════
    // This function is called every frame. It:
    // 1. Reads player input
    // 2. Updates player position based on physics
    // 3. Checks for collisions and corrects position
    // 4. Updates the camera
    //
    // The order matters! We:
    // 1. First move horizontally, then check horizontal collisions
    // 2. Then move vertically, then check vertical collisions
    // This "separate axis" approach prevents corner-case bugs.
    //
    // TO ADD ENEMIES:
    // Create an enemies array, loop through it in update() to:
    //   - Move each enemy
    //   - Check enemy-player collision
    //   - Handle damage/death
    //
    // TO ADD COLLECTIBLES:
    // Create a coins array, in update() check if player overlaps any coin:
    //   if (player.x < coin.x + 16 && player.x + player.width > coin.x && ...)
    //     { remove coin, add score }
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    function update() {
        // Skip gameplay updates for menu levels
        if (isMenuLevel) {
            return;
        }

        // Hit pause: freeze game briefly for impact
        if (Date.now() < hitPauseUntil) {
            // Still update screen shake during hit pause for visual feedback
            if (screenShake.duration > 0) {
                screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
                screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
                screenShake.duration--;
            } else {
                screenShake.x = 0;
                screenShake.y = 0;
            }
            return; // Skip all other updates during hit pause
        }

        // Update cheat effect timers
        if (CHEATS_ENABLED) {
            updateCheatEffects();
        }

        // Update animated tile frames
        if (typeof animatedTileTimers !== 'undefined') {
            var now = Date.now();
            for (var atKey in animatedTileTimers) {
                var tile = tileTypes[atKey];
                if (tile && tile.animated && tile.fps) {
                    var frameInterval = 1000 / tile.fps;
                    if (now - animatedTileTimers[atKey] >= frameInterval) {
                        animatedTileTimers[atKey] = now;
                        animatedTileCurrentFrames[atKey] = (animatedTileCurrentFrames[atKey] + 1) % tile.frameCount;
                    }
                }
            }
        }

        // Update tile effect time (for procedural effects like sway, pulse, etc.)
        if (typeof tileEffectTime !== 'undefined') {
            tileEffectTime += 16; // ~60fps increment
        }

        // Squash & stretch: lerp scales back to 1.0
        if (SQUASH_STRETCH_ENABLED) {
            player.scaleX += (1.0 - player.scaleX) * 0.2;
            player.scaleY += (1.0 - player.scaleY) * 0.2;
            // Snap to 1.0 when close enough
            if (Math.abs(player.scaleX - 1.0) < 0.01) player.scaleX = 1.0;
            if (Math.abs(player.scaleY - 1.0) < 0.01) player.scaleY = 1.0;
        }

        // Platform riding: Apply platform movement BEFORE player physics
        // This keeps player attached to fast-moving platforms
        var wasRidingPlatform = false; // Track for jump grace period
        player.previousRidingPlatformIndex = player.ridingPlatformIndex; // Save for tolerance check (used in updateGameObjects)
        if (!IS_TOPDOWN && player.ridingPlatformIndex >= 0) {
            var ridingPlatform = activeObjects[player.ridingPlatformIndex];
            if (ridingPlatform && ridingPlatform.type === 'movingPlatform' && ridingPlatform.active !== false) {
                // Update the platform first to get its current delta
                updateMovingPlatform(ridingPlatform);
                ridingPlatform.updatedThisFrame = true; // Prevent double-update in collision loop
                // Apply platform movement to player
                player.x += ridingPlatform.deltaX;
                player.y += ridingPlatform.deltaY;
                wasRidingPlatform = true; // Player was on platform this frame
                // Give extra grace frames for jumping off moving platforms
                player.platformGraceFrames = 6; // ~100ms at 60fps
            }
            // Clear riding state - will be re-set if still on platform after collision
            player.ridingPlatformIndex = -1;
        }
        // Count down platform grace frames
        if (player.platformGraceFrames > 0 && !wasRidingPlatform) {
            player.platformGraceFrames--;
        }

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // HORIZONTAL MOVEMENT
        // Check if left or right keys are pressed, set speed accordingly.
        // When no keys pressed, apply friction to slow down gradually.
        // ───────────────────────────────────────────────────────────────────────
` : ''}        // Freeze player movement when inventory is open (Top-Down RPG)
        if (IS_TOPDOWN && inventoryOpen) {
            player.speedX = 0;
            player.speedY = 0;
            return; // Skip rest of update, just draw
        }

        if (autoscrollEnabled) {
            // Autoscroll mode: Player moves automatically with camera
            // Left/right keys provide minor speed adjustments
            if (keys['ArrowLeft'] || keys['KeyA']) {
                player.speedX = autoscrollSpeed - MOVE_SPEED * 0.5; // Slow down slightly
                player.facingRight = false;
            } else if (keys['ArrowRight'] || keys['KeyD']) {
                player.speedX = autoscrollSpeed + MOVE_SPEED * 0.3; // Speed up slightly
                player.facingRight = true;
            } else {
                player.speedX = autoscrollSpeed; // Match camera speed
                player.facingRight = true;
            }
        } else {
            // Normal mode: Standard left/right movement
            // Apply terrain zone speed multiplier and cheat modifiers
            var terrainSpeedMult = getTerrainSpeedMultiplier();
            var effectiveSpeed = getEffectiveMoveSpeed() * terrainSpeedMult;

            if (keys['ArrowLeft'] || keys['KeyA']) {
                player.speedX = -effectiveSpeed;
                player.facingRight = false;
                if (IS_TOPDOWN) player.facingDirection = 'left';
            } else if (keys['ArrowRight'] || keys['KeyD']) {
                player.speedX = effectiveSpeed;
                player.facingRight = true;
                if (IS_TOPDOWN) player.facingDirection = 'right';
            } else {
                // Different friction for ground vs air - maintain momentum when jumping
                // In top-down mode, always use full friction (no air/ground distinction)
                var friction = IS_TOPDOWN ? FRICTION : (player.onGround ? FRICTION : 0.98);
                player.speedX *= friction;
                if (Math.abs(player.speedX) < 0.1) player.speedX = 0;
            }
        }

        // Top-down mode: Add vertical movement with up/down keys
        if (IS_TOPDOWN) {
            // Apply terrain zone speed multiplier and cheat modifiers
            var terrainSpeedMultTopDown = getTerrainSpeedMultiplier();
            var effectiveSpeedTopDown = getEffectiveMoveSpeed() * terrainSpeedMultTopDown;

            if (keys['ArrowUp'] || keys['KeyW']) {
                player.speedY = -effectiveSpeedTopDown;
                player.facingDirection = 'up';
            } else if (keys['ArrowDown'] || keys['KeyS']) {
                player.speedY = effectiveSpeedTopDown;
                player.facingDirection = 'down';
            } else {
                player.speedY *= FRICTION;
                if (Math.abs(player.speedY) < 0.1) player.speedY = 0;
            }
        }

        // Apply terrain zone damage (if in a damaging zone)
        applyTerrainZoneDamage();

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // SPRITE ANIMATION
        // Cycle through animation frames when the player is moving.
        // animTimer counts up, and every 8 frames we advance to next frame.
        // The % (modulo) operator wraps back to 0 after the last frame.
        // ───────────────────────────────────────────────────────────────────────
` : ''}        // Animate when moving (check both X and Y in top-down mode)
        var isMoving = IS_TOPDOWN
            ? (Math.abs(player.speedX) > 0.5 || Math.abs(player.speedY) > 0.5)
            : (Math.abs(player.speedX) > 0.5);
        if (isMoving && PLAYER_SPRITESHEET_COLS > 1) {
            player.animTimer++;
            if (player.animTimer >= 8) {
                player.animTimer = 0;
                player.animFrame = (player.animFrame + 1) % PLAYER_SPRITESHEET_COLS;
            }
        } else {
            player.animFrame = 0;
            player.animTimer = 0;
        }

        // Platformer-only: Jump mechanics and gravity
        if (!IS_TOPDOWN) {
${includeComments ? `            // ───────────────────────────────────────────────────────────────────────
            // JUMPING with Coyote Time
            // Coyote time: A few frames after leaving the ground where jump still works.
            // This makes jumping feel more responsive, especially on mobile.
            // We set a negative speedY because Y increases downward in canvas.
            // Jump modes: 'normal' (standard), 'double' (air jump), 'fly' (flappy bird)
            // ───────────────────────────────────────────────────────────────────────
` : ''}            // Update coyote time: give player configurable frames to jump after leaving ground
            // Also count platform riding as grounded (for fast-moving platform support)
            var onPlatform = wasRidingPlatform || player.platformGraceFrames > 0;
            if (player.onGround || onPlatform) {
                coyoteTime = COYOTE_TIME_FRAMES;
                player.canDoubleJump = (JUMP_MODE === 'double'); // Reset double jump when grounded
            } else if (coyoteTime > 0) {
                coyoteTime--;
            }

            // Allow jumping if on ground, on/near a platform, OR within coyote time window
            var canJump = player.onGround || onPlatform || coyoteTime > 0;
            var jumpKeyPressed = (keys['ArrowUp'] || keys['KeyW'] || keys['Space']);

            if (JUMP_MODE === 'fly') {
                // Fly mode (Flappy Bird style): tap to flap anytime with cooldown
                var now = Date.now();
                var flapCooldown = 150; // 150ms between flaps
                if (jumpKeyPressed && !player.jumpKeyHeld && (now - player.lastFlapTime > flapCooldown)) {
                    // Flap! Give upward boost, cap upward speed
                    player.speedY = Math.max(player.speedY - FLY_FLAP_POWER, -FLY_FLAP_POWER * 1.5);
                    player.lastFlapTime = now;
                    playSound('jump');
                    vibrate(20); // Light haptic feedback on flap
                    // Quick stretch on flap
                    if (SQUASH_STRETCH_ENABLED) {
                        player.scaleX = applySquashStretch(0.15, false);
                        player.scaleY = applySquashStretch(0.15, true);
                    }
                }
                player.jumpKeyHeld = jumpKeyPressed;
            } else {
                // Normal and Double jump modes
                // Apply terrain zone jump multiplier and cheat modifiers
                var terrainJumpMult = getTerrainJumpMultiplier();
                var effectiveJumpPower = getEffectiveJumpPower() * terrainJumpMult;

                if (jumpKeyPressed && !player.jumpKeyHeld) {
                    if (canJump) {
                        // Normal ground/coyote jump
                        player.speedY = -effectiveJumpPower;
                        player.onGround = false;
                        coyoteTime = 0; // Use up coyote time
                        player.ridingPlatformIndex = -1; // Detach from platform
                        player.platformGraceFrames = 0; // Use up platform grace
                        playSound('jump');
                        // Dust particle effect on jump
                        spawnParticleEffect('playerJump', player.x + player.width/2, player.y + player.height, 150);
                        // Stretch effect on jump
                        if (SQUASH_STRETCH_ENABLED) {
                            player.scaleX = applySquashStretch(0.3, false);
                            player.scaleY = applySquashStretch(0.3, true);
                        }
                    } else if (player.canDoubleJump && JUMP_MODE === 'double') {
                        // Double jump (slightly weaker, 85% power)
                        player.speedY = -effectiveJumpPower * 0.85;
                        player.canDoubleJump = false;
                        player.ridingPlatformIndex = -1; // Detach from platform
                        player.platformGraceFrames = 0; // Use up platform grace
                        playSound('jump');
                        // Stretch effect on double jump
                        if (SQUASH_STRETCH_ENABLED) {
                            player.scaleX = applySquashStretch(0.25, false);
                            player.scaleY = applySquashStretch(0.25, true);
                        }
                    }
                    player.jumpKeyHeld = true;
                } else if (!jumpKeyPressed) {
                    player.jumpKeyHeld = false;
                }
            }

${includeComments ? `            // ───────────────────────────────────────────────────────────────────────
            // GRAVITY - The magic that makes platformers feel real
            // Every frame, we add GRAVITY to speedY (accelerating downward).
            // We cap the speed at 12 to prevent falling too fast (terminal velocity).
            // ───────────────────────────────────────────────────────────────────────
` : ''}            // Apply terrain zone gravity multiplier and cheat modifiers
            var terrainGravityMult = getTerrainGravityMultiplier();
            player.speedY += getEffectiveGravity() * terrainGravityMult;
            if (player.speedY > 12) player.speedY = 12;
        } // End platformer-only jump/gravity

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // HORIZONTAL MOVEMENT AND COLLISION
        // Move first, then check if we hit a wall and correct position.
        // This is called "collision response" - we push the player back out.
        // We check 3 points on each side (top, middle, bottom) to catch 1-tile walls.
        // Uses hitbox (collision bounds) which can be smaller than visual sprite.
        // ───────────────────────────────────────────────────────────────────────
` : ''}        player.x += player.speedX;

        // Get hitbox for collision (may be smaller than visual sprite)
        var hb = getPlayerHitbox();

        // Calculate full hitbox offset (base + user offset)
        var hitboxOffsetX = (player.width - player.collisionWidth) / 2 + player.collisionOffsetX;

        if (player.speedX > 0) {
            if (isSolidAt(hb.x + hb.width, hb.y + 4) ||
                isSolidAt(hb.x + hb.width, hb.y + hb.height / 2) ||
                isSolidAt(hb.x + hb.width, hb.y + hb.height - 4)) {
                // Align hitbox right edge with solid wall left edge (accounts for partial hitboxes)
                var wallLeftX = getSolidWallLeftX(hb.x + hb.width, hb.y + hb.height / 2);
                player.x = wallLeftX - player.collisionWidth - hitboxOffsetX;
                player.speedX = 0;
            }
        } else if (player.speedX < 0) {
            if (isSolidAt(hb.x, hb.y + 4) ||
                isSolidAt(hb.x, hb.y + hb.height / 2) ||
                isSolidAt(hb.x, hb.y + hb.height - 4)) {
                // Align hitbox left edge with solid wall right edge (accounts for partial hitboxes)
                var wallRightX = getSolidWallRightX(hb.x, hb.y + hb.height / 2);
                player.x = wallRightX - hitboxOffsetX;
                player.speedX = 0;
            }
        }

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // VERTICAL MOVEMENT AND COLLISION
        // Same approach: move, then correct. When we land, set onGround = true.
        // This allows jumping again on the next frame.
        // We check 3 points on top/bottom (left, middle, right) to catch 1-tile platforms.
        // Uses hitbox for collision detection.
        // ───────────────────────────────────────────────────────────────────────
` : ''}        player.y += player.speedY;
        var wasOnGroundBefore = player.onGround;
        player.onGround = false;

        // Update hitbox after vertical movement
        hb = getPlayerHitbox();
        // Calculate full hitbox offset (base + user offset)
        var hitboxOffsetY = (player.height - player.collisionHeight) + player.collisionOffsetY;

        if (player.speedY > 0) {
            if (isSolidAt(hb.x + 4, hb.y + hb.height) ||
                isSolidAt(hb.x + hb.width / 2, hb.y + hb.height) ||
                isSolidAt(hb.x + hb.width - 4, hb.y + hb.height)) {
                // Align hitbox bottom with solid surface top (accounts for partial hitboxes)
                var surfaceY = getSolidSurfaceY(hb.x + hb.width / 2, hb.y + hb.height);
                player.y = surfaceY - player.collisionHeight - hitboxOffsetY;
                if (IS_TOPDOWN) {
                    // Top-down: just stop, no bouncing
                    player.speedY = 0;
                } else {
                    // Platformer: Apply bounciness (restitution) - bounce back up proportional to landing speed
                    player.speedY = -player.speedY * BOUNCINESS;
                    // Only set onGround if bounce is minimal (prevents double jumps while bouncing)
                    player.onGround = (Math.abs(player.speedY) < 1);
                    // Squash effect on landing
                    if (SQUASH_STRETCH_ENABLED && player.onGround && !wasOnGroundBefore) {
                        player.scaleX = applySquashStretch(0.3, true);
                        player.scaleY = applySquashStretch(0.3, false);
                    }
                }
            }
        } else if (player.speedY < 0) {
            if (isSolidAt(hb.x + 4, hb.y) ||
                isSolidAt(hb.x + hb.width / 2, hb.y) ||
                isSolidAt(hb.x + hb.width - 4, hb.y)) {
                // Align hitbox top with solid ceiling bottom (accounts for partial hitboxes)
                var ceilingY = getSolidCeilingY(hb.x + hb.width / 2, hb.y);
                player.y = ceilingY - hitboxOffsetY;
                player.speedY = 0;

                // Check for mystery block hit from below
                var hitTileX = Math.floor((hb.x + hb.width / 2) / RENDER_SIZE);
                var hitTileY = Math.floor(hb.y / RENDER_SIZE);
                checkMysteryBlockHit(hitTileX, hitTileY);
            }
        }

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // LEVEL BOUNDARY CONSTRAINTS (Top-Down RPG)
        // Keep player within the level bounds - no walking off the edge
        // ───────────────────────────────────────────────────────────────────────
` : ''}        if (IS_TOPDOWN) {
            var levelPixelWidth = level[0].length * RENDER_SIZE;
            var levelPixelHeight = level.length * RENDER_SIZE;
            // Constrain to level boundaries
            if (player.x < 0) { player.x = 0; player.speedX = 0; }
            if (player.x + player.width > levelPixelWidth) { player.x = levelPixelWidth - player.width; player.speedX = 0; }
            if (player.y < 0) { player.y = 0; player.speedY = 0; }
            if (player.y + player.height > levelPixelHeight) { player.y = levelPixelHeight - player.height; player.speedY = 0; }
        }

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // DEATH / RESPAWN
        // If player falls off the bottom of the level, restart.
        // You could add lives here: if (player.lives > 0) lives--; else gameOver();
        // ───────────────────────────────────────────────────────────────────────
` : ''}        // Don't lose life from pits during level transition (platformer only - no pits in top-down)
        if (!IS_TOPDOWN) {
            if (player.y > level.length * RENDER_SIZE + 100 && !levelComplete) {
                loseLife();
            }
        }

        // Check projectile fire key
        if (PROJECTILE_ENABLED && keys[PROJECTILE_FIRE_KEY]) {
            fireProjectile();
        }

        // Update game objects
        updateGameObjects();

        // Update projectiles
        updateProjectiles();
        updateRemoteProjectiles();

        // Update emitted items from mystery blocks
        updateEmittedItems();

        // Update NPC/Door interaction system (Top-Down RPG)
        if (IS_TOPDOWN) {
            updateInteractionPrompt();
            updateDialogue();
        }

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // CAMERA SYSTEM (Normal follow or Autoscroll)
        // Autoscroll: Camera moves automatically at set speed
        // Normal: Camera smoothly follows player with lerping
        // ───────────────────────────────────────────────────────────────────────
` : ''}        var levelPixelWidth = level[0].length * RENDER_SIZE;
        var maxCameraX = levelPixelWidth - CANVAS_WIDTH;

        if (autoscrollEnabled && !gameOver && !levelComplete) {
            // Autoscroll mode: camera moves automatically
            autoscrollX += autoscrollSpeed;

            // Check if we've reached the end of the level
            if (autoscrollX >= maxCameraX) {
                if (autoscrollMode === 'loop') {
                    // Loop mode: wrap around to start
                    autoscrollX = 0;
                    // Also wrap player position to stay on screen
                    player.x = player.x % levelPixelWidth;
                    if (player.x < 0) player.x += levelPixelWidth;
                } else {
                    // End mode: stop at finish and complete level!
                    autoscrollX = maxCameraX;
                    // Player survived the autoscroll - level complete!
                    handleLevelComplete();
                    return;
                }
            }

            cameraX = autoscrollX;

            // Check if player fell behind camera (death condition)
            if (player.x + player.width < cameraX) {
                // Player is off the left edge of screen
                loseLife();
            }

            // Keep player within level bounds (can't run off right edge)
            if (player.x + player.width > levelPixelWidth) {
                player.x = levelPixelWidth - player.width;
            }

            // Push player if they hit the left edge (keep them on screen)
            if (player.x < cameraX + 10) {
                player.x = cameraX + 10;
            }
        } else {
            // Normal camera follow mode
            // Top-down: center on player; Platformer: offset to 1/3 from left
            var targetCameraX = IS_TOPDOWN
                ? (player.x + player.width / 2 - CANVAS_WIDTH / 2)
                : (player.x - CANVAS_WIDTH / 3);
            cameraX += (targetCameraX - cameraX) * 0.1;
            cameraX = Math.max(0, Math.min(cameraX, maxCameraX));
        }

        // Vertical camera follow (always active, centered on player)
        var targetCameraY = player.y + player.height / 2 - CANVAS_HEIGHT / 2;
        cameraY += (targetCameraY - cameraY) * 0.1;
        var maxCameraY = level.length * RENDER_SIZE - CANVAS_HEIGHT;
        cameraY = Math.max(0, Math.min(cameraY, maxCameraY > 0 ? maxCameraY : 0));

        // Update screen shake
        if (screenShake.duration > 0) {
            screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
            screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
            screenShake.duration--;
        } else {
            screenShake.x = 0;
            screenShake.y = 0;
        }

        // Update particle effects
        updateParticles(1/60);
        updateBackgroundParticles(1/60);

        // Multiplayer: Send position to server and update remote player interpolation
        if (MULTIPLAYER_ENABLED && multiplayerReady) {
            sendPlayerPosition();
            updateRemotePlayerPositions();
        }
    }

    function updateGameObjects() {
        if (gameOver || levelComplete) return;

        // Update run timer (speedrun feature)
        if (RUN_TIMER_ENABLED) {
            runTimer += 1/60;
        }

        // Update level timer for survive mode
        if (goalCondition === 'survive' && timeLimit > 0) {
            levelTimer += 1/60;
            if (checkGoalCondition()) {
                handleLevelComplete();
                return;
            }
        }

        // Check for enemy respawns
        var now = Date.now();
        for (var r = 0; r < activeObjects.length; r++) {
            var respawnObj = activeObjects[r];
            if (respawnObj.type === 'enemy' && !respawnObj.active && respawnObj.respawnTime > 0 && respawnObj.deathTime > 0) {
                if (now - respawnObj.deathTime >= respawnObj.respawnTime) {
                    // Respawn the enemy at its original position
                    respawnObj.active = true;
                    respawnObj.x = respawnObj.startX;
                    respawnObj.y = respawnObj.startY;
                    respawnObj.direction = 1;
                    respawnObj.velocityY = 0;
                    respawnObj.deathTime = 0;
                    // Sync respawn to other players
                    if (MULTIPLAYER_ENABLED && multiplayerReady && socket) {
                        socket.emit('gm_enemy_respawn', {
                            enemyId: respawnObj.enemyId,
                            x: respawnObj.startX,
                            y: respawnObj.startY
                        });
                    }
                }
            }
        }

        // Use hitbox for collision detection (may be smaller than visual sprite)
        var hbCollision = getPlayerHitbox();
        var playerCenterX = hbCollision.x + hbCollision.width / 2;
        var playerCenterY = hbCollision.y + hbCollision.height / 2;
        var playerRadius = Math.min(hbCollision.width, hbCollision.height) / 2;

        // Update powerup effect timers
        if (activeEffects.speedBoost > 0) activeEffects.speedBoost -= 1/60;
        if (activeEffects.jumpBoost > 0) activeEffects.jumpBoost -= 1/60;

        for (var i = 0; i < activeObjects.length; i++) {
            var obj = activeObjects[i];
            if (!obj.active) continue;

            // Check collision with player (circle collision)
            var dx = obj.x - playerCenterX;
            var dy = obj.y - playerCenterY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var objRadius = RENDER_SIZE / 2 * 0.8;

            if (dist < playerRadius + objRadius) {
                // Collision detected!
                switch (obj.type) {
                    case 'collectible':
                        // In RPG mode, add to inventory instead of just score
                        if (IS_TOPDOWN) {
                            var templateId = obj.templateId || 'coin';
                            if (!inventory[templateId]) {
                                // Look up the full template from collectibleTemplates
                                var fullTemplate = collectibleTemplates.find(function(t) { return t.id === templateId; });
                                inventory[templateId] = {
                                    count: 0,
                                    template: fullTemplate || {
                                        name: obj.name || 'Item',
                                        symbol: obj.symbol || '🪙',
                                        color: obj.color || '#f1c40f',
                                        value: obj.value || 10,
                                        sprite: obj.sprite || ''
                                    }
                                };
                            }
                            inventory[templateId].count++;
                            saveRPGProgress(); // Save inventory to localStorage
                        }
                        score += obj.value || 10;
                        obj.active = false;
                        collectiblesCollected++;
                        // Multiplayer: Notify server of item collection
                        if (MULTIPLAYER_ENABLED && multiplayerReady) {
                            sendItemCollected(obj);
                        }
                        playObjectSound(obj, 'collect');
                        vibrate(30); // Quick collect feedback
                        // Particle effect on collect (per-template)
                        var collectTemplate = collectibleTemplates.find(function(t) { return t.id === obj.templateId; });
                        if (collectTemplate && collectTemplate.particleEffect) {
                            spawnParticleEffectFromURL(collectTemplate.particleEffect, obj.x + obj.width/2, obj.y + obj.height/2, 200);
                        }
                        // Infinite collectibles: Respawn at random position if this collectible has respawns enabled
                        if (obj.respawns) {
                            var newPos = findRandomAccessiblePosition();
                            respawnCollectible(obj, newPos.x, newPos.y);
                            // Sync respawn to other players in multiplayer
                            if (MULTIPLAYER_ENABLED && multiplayerReady) {
                                sendCollectibleRespawn(obj, newPos.x, newPos.y);
                            }
                        }
                        // Check if collect_all condition is met
                        if (goalCondition === 'collect_all' && checkGoalCondition()) {
                            handleLevelComplete();
                        }
                        // Check if score condition is met
                        if (goalCondition === 'score' && checkGoalCondition()) {
                            handleLevelComplete();
                        }
                        break;
                    case 'powerup':
                        handlePowerup(obj);
                        obj.active = false;
                        playObjectSound(obj, 'pickup');
                        vibrate(40); // Powerup feedback
                        // Particle effect on powerup collect (per-template)
                        var powerupTemplate = powerupTemplates.find(function(t) { return t.id === obj.templateId; });
                        if (powerupTemplate && powerupTemplate.particleEffect) {
                            spawnParticleEffectFromURL(powerupTemplate.particleEffect, obj.x + obj.width/2, obj.y + obj.height/2, 250);
                        }
                        break;
                    case 'goal':
                        // Goal object triggers level complete for 'goal' condition
                        if (goalCondition === 'goal' || !goalCondition) {
                            handleLevelComplete();
                        }
                        break;
                    case 'enemy':
                        handleEnemyCollision(obj);
                        return;
                    case 'hazard':
                        handleHazardCollision(obj);
                        return;
                    case 'spring':
                        if (IS_TOPDOWN) {
                            // Top-down mode: Speed boost in direction of movement
                            var boostPower = (obj.bouncePower || 1.5) * 2;
                            if (Math.abs(player.speedX) > Math.abs(player.speedY)) {
                                // Moving mostly horizontally - boost X
                                player.speedX *= boostPower;
                                // Cap speed
                                if (player.speedX > MOVE_SPEED * 3) player.speedX = MOVE_SPEED * 3;
                                if (player.speedX < -MOVE_SPEED * 3) player.speedX = -MOVE_SPEED * 3;
                            } else if (Math.abs(player.speedY) > 0) {
                                // Moving mostly vertically - boost Y
                                player.speedY *= boostPower;
                                // Cap speed
                                if (player.speedY > MOVE_SPEED * 3) player.speedY = MOVE_SPEED * 3;
                                if (player.speedY < -MOVE_SPEED * 3) player.speedY = -MOVE_SPEED * 3;
                            } else {
                                // Not moving - give small boost forward (based on facing)
                                player.speedX = player.facing * MOVE_SPEED * boostPower;
                            }
                            // Play boost sound
                            if (obj.bounceSound) {
                                playSound(obj.bounceSound);
                            }
                            triggerScreenShake(3, 5);
                            vibrate([50, 30, 50]);
                            // Particle effect on spring bounce (per-template)
                            var springTemplateTopDown = springTemplates.find(function(t) { return t.id === obj.templateId; });
                            if (springTemplateTopDown && springTemplateTopDown.particleEffect) {
                                spawnParticleEffectFromURL(springTemplateTopDown.particleEffect, obj.x, obj.y, 200);
                            }
                        } else {
                            // Platformer mode: Only bounce if player is falling onto spring
                            if (player.speedY > 0) {
                                var bouncePower = obj.bouncePower || 1.5;
                                player.speedY = -JUMP_POWER * bouncePower;
                                player.canDoubleJump = (JUMP_MODE === 'double'); // Reset double jump
                                // Play bounce sound
                                if (obj.bounceSound) {
                                    playSound(obj.bounceSound);
                                }
                                triggerScreenShake(3, 5); // Light shake
                                vibrate([50, 30, 50]); // Bouncy vibration pattern
                                // Particle effect on spring bounce (per-template)
                                var springTemplatePlatformer = springTemplates.find(function(t) { return t.id === obj.templateId; });
                                if (springTemplatePlatformer && springTemplatePlatformer.particleEffect) {
                                    spawnParticleEffectFromURL(springTemplatePlatformer.particleEffect, obj.x, obj.y, 200);
                                }
                                // Extra stretchy bounce from springs
                                if (SQUASH_STRETCH_ENABLED) {
                                    player.scaleX = applySquashStretch(0.4, false);
                                    player.scaleY = applySquashStretch(0.4, true);
                                }
                            }
                        }
                        break;
                    case 'checkpoint':
                        if (!obj.activated) {
                            // Activate checkpoint
                            obj.activated = true;
                            // Store respawn position: center player on checkpoint, feet at checkpoint base
                            // obj.x/y are center coordinates, player.x/y are top-left corner
                            var checkpointHalfHeight = (obj.height || 48) / 2;
                            activeCheckpoint = {
                                x: obj.x - player.width / 2,  // Center player horizontally
                                y: obj.y + checkpointHalfHeight - player.height  // Player feet at checkpoint base
                            };
                            // Play activation sound
                            if (obj.activateSound) {
                                playSound(obj.activateSound);
                            }
                            vibrate([30, 30, 30]); // Checkpoint vibration pattern
                            spawnParticleEffect('checkpoint', obj.x, obj.y, 500);
                            showCheckpointMessage();
                            saveRPGProgress(); // Save checkpoint to localStorage
                        }
                        break;
                    case 'npc':
                    case 'door':
                        // NPC and Door don't damage - they're interactable with E key
                        // Proximity handled separately in updateInteractionPrompt()
                        break;
                    case 'movingPlatform':
                        // Touch activation now handled in AABB collision section below
                        break;
                }
            }

            // Update enemy behavior (pace, stationary, follow, jump)
            if (obj.type === 'enemy') {
                updateEnemy(obj);
            }

            // Update NPC behavior (stationary, wander) - Top-Down RPG
            if (obj.type === 'npc' && IS_TOPDOWN) {
                updateNPC(obj);
            }

            // Update moving platform position and handle collision
            if (obj.type === 'movingPlatform' && !IS_TOPDOWN) {
                // Fixed frame time for 60fps (in milliseconds)
                var frameTimeMs = 1000 / 60;

                // Handle collapsing platform respawn timer
                if (obj.collapsing && obj.collapseState === 'collapsed') {
                    if (obj.collapseRespawnTime > 0) {
                        obj.collapseTimer += frameTimeMs;
                        if (obj.collapseTimer >= obj.collapseRespawnTime) {
                            // Respawn the platform
                            obj.collapseState = 'solid';
                            obj.collapseTimer = 0;
                            obj.playerStandingTime = 0;
                            obj.shakeOffset = 0;
                        }
                    }
                    // Skip collision and movement for collapsed platforms
                    obj.deltaX = 0;
                    obj.deltaY = 0;
                    continue;
                }

                // Only update if not already updated via riding logic
                if (!obj.updatedThisFrame) {
                    updateMovingPlatform(obj);
                }
                obj.updatedThisFrame = false; // Reset for next frame

                // Platform collision detection (AABB)
                var platWidth = obj.width || 64;
                var platHeight = obj.height || 16;
                var platLeft = obj.x - platWidth / 2;
                var platRight = obj.x + platWidth / 2;
                var platTop = obj.y - platHeight / 2;
                var platBottom = obj.y + platHeight / 2;

                // Get player hitbox
                var hb = getPlayerHitbox();
                var playerBottom = hb.y + hb.height;
                var playerTop = hb.y;
                var playerLeft = hb.x;
                var playerRight = hb.x + hb.width;

                // Check if player overlaps platform horizontally
                // Add extra tolerance if player was riding this platform last frame to prevent sliding off
                var wasRidingThisPlatform = (player.previousRidingPlatformIndex === i);
                var platformTolerance = wasRidingThisPlatform ? 6 : 0; // 6px tolerance when riding
                var horizontalOverlapStrict = playerRight > platLeft && playerLeft < platRight;
                var horizontalOverlapWithTolerance = playerRight > platLeft - platformTolerance && playerLeft < platRight + platformTolerance;
                // Use tolerance for one-way platforms and landing detection, strict for solid side collisions
                var horizontalOverlap = horizontalOverlapWithTolerance;
                var verticalProximity = playerBottom >= platTop - 8 && playerTop <= platBottom + 8;

                // Touch-activated platforms: activate when player touches or is very close
                if (obj.activation === 'touch' && !obj.activated && horizontalOverlap && verticalProximity) {
                    obj.activated = true;
                    if (obj.moveSound) {
                        playSound(obj.moveSound);
                    }
                }

                // Track if player is standing on this platform this frame
                var playerStandingOnPlatform = false;

                if (obj.collisionMode === 'oneway') {
                    // One-way platform: only collide when falling onto top
                    if (horizontalOverlap && player.speedY >= 0) {
                        // Check if player feet are near platform top
                        var feetNearTop = playerBottom >= platTop && playerBottom <= platTop + platHeight + player.speedY + 2;
                        var wasAbove = (playerBottom - player.speedY) <= platTop + 4;

                        if (feetNearTop && wasAbove) {
                            // Land on platform
                            player.y = platTop - hb.height - ((player.height - player.collisionHeight) + player.collisionOffsetY);
                            player.speedY = 0;
                            player.onGround = true;
                            player.canDoubleJump = (JUMP_MODE === 'double');
                            // Apply platform movement to player (riding)
                            // Only apply if NOT already applied in update() (prevents double movement)
                            if (!wasRidingThisPlatform) {
                                player.x += obj.deltaX;
                                if (obj.deltaY <= 0) {
                                    player.y += obj.deltaY; // Platform going up - carry player
                                }
                            }
                            playerStandingOnPlatform = true;
                            // Track riding platform for next frame
                            player.ridingPlatformIndex = i;
                        }
                    }
                } else {
                    // Solid platform: collide from all sides
                    var verticalOverlap = playerBottom > platTop && playerTop < platBottom;

                    // For landing on top, use tolerance to keep player attached while walking
                    // For side collisions, use strict overlap to avoid pushing player off edges
                    if (horizontalOverlapWithTolerance && verticalOverlap && player.speedY >= 0) {
                        // Check if player should land on top (with tolerance for edge walking)
                        var overlapTop = playerBottom - platTop;
                        var overlapBottom = platBottom - playerTop;

                        if (overlapTop < overlapBottom && overlapTop > 0 && overlapTop < platHeight / 2 + player.speedY + 4) {
                            // Landing on top
                            player.y = platTop - hb.height - ((player.height - player.collisionHeight) + player.collisionOffsetY);
                            player.speedY = 0;
                            player.onGround = true;
                            player.canDoubleJump = (JUMP_MODE === 'double');
                            // Apply platform movement to player (riding)
                            // Only apply if NOT already applied in update() (prevents double movement)
                            if (!wasRidingThisPlatform) {
                                player.x += obj.deltaX;
                                if (obj.deltaY <= 0) {
                                    player.y += obj.deltaY; // Platform going up - carry player
                                }
                            }
                            playerStandingOnPlatform = true;
                            // Track riding platform for next frame
                            player.ridingPlatformIndex = i;

                            // Check if player is being crushed into a ceiling
                            hb = getPlayerHitbox();
                            if (isSolidAt(hb.x + 4, hb.y) || isSolidAt(hb.x + hb.width - 4, hb.y)) {
                                // Push player off the platform edge
                                var platCenterX = obj.x;
                                if (player.x + player.width / 2 < platCenterX) {
                                    player.x = platLeft - player.width - 2;
                                } else {
                                    player.x = platRight + 2;
                                }
                                player.speedX = (player.x < platCenterX) ? -3 : 3;
                            }
                        }
                    }

                    // Handle side and bottom collisions with strict overlap (no tolerance)
                    if (horizontalOverlapStrict && verticalOverlap) {
                        // Calculate overlap amounts
                        var overlapLeft = playerRight - platLeft;
                        var overlapRight = platRight - playerLeft;
                        var overlapTop = playerBottom - platTop;
                        var overlapBottom = platBottom - playerTop;

                        // Find smallest overlap to determine push direction
                        var minOverlapX = Math.min(overlapLeft, overlapRight);
                        var minOverlapY = Math.min(overlapTop, overlapBottom);

                        if (minOverlapY < minOverlapX) {
                            // Vertical collision - only handle bottom hit here (top handled above)
                            if (overlapBottom < overlapTop && player.speedY < 0) {
                                // Hitting bottom
                                player.y = platBottom - ((player.height - player.collisionHeight) + player.collisionOffsetY);
                                player.speedY = 0;
                            }
                        } else {
                            // Horizontal collision
                            if (overlapLeft < overlapRight) {
                                // Hitting left side of platform
                                player.x = platLeft - player.collisionWidth - ((player.width - player.collisionWidth) / 2 + player.collisionOffsetX);
                                player.speedX = 0;
                            } else {
                                // Hitting right side of platform
                                player.x = platRight - ((player.width - player.collisionWidth) / 2 + player.collisionOffsetX) + 1;
                                player.speedX = 0;
                            }
                        }
                    }
                }

                // Handle collapsing platform logic
                if (obj.collapsing && obj.collapseState !== 'collapsed') {
                    if (playerStandingOnPlatform) {
                        obj.playerStandingTime += frameTimeMs;

                        if (obj.collapseState === 'solid' && obj.playerStandingTime >= obj.collapseDelay) {
                            // Start shaking
                            obj.collapseState = 'shaking';
                            obj.collapseTimer = 0;
                            if (obj.collapseSound) {
                                playSound(obj.collapseSound);
                            }
                        } else if (obj.collapseState === 'shaking') {
                            obj.collapseTimer += frameTimeMs;
                            // Generate shake offset (oscillates faster as collapse approaches)
                            var shakeIntensity = 2 + (obj.collapseTimer / obj.collapseShakeDuration) * 3;
                            obj.shakeOffset = Math.sin(Date.now() * 0.05) * shakeIntensity;

                            if (obj.collapseTimer >= obj.collapseShakeDuration) {
                                // Collapse!
                                obj.collapseState = 'collapsed';
                                obj.collapseTimer = 0;
                                obj.shakeOffset = 0;
                            }
                        }
                    } else {
                        // Player not standing - reset timer but keep shaking state if already shaking
                        if (obj.collapseState === 'solid') {
                            obj.playerStandingTime = 0;
                        }
                        // If shaking, continue the collapse sequence even if player jumps off
                        if (obj.collapseState === 'shaking') {
                            obj.collapseTimer += frameTimeMs;
                            var shakeIntensity = 2 + (obj.collapseTimer / obj.collapseShakeDuration) * 3;
                            obj.shakeOffset = Math.sin(Date.now() * 0.05) * shakeIntensity;

                            if (obj.collapseTimer >= obj.collapseShakeDuration) {
                                obj.collapseState = 'collapsed';
                                obj.collapseTimer = 0;
                                obj.shakeOffset = 0;
                            }
                        }
                    }
                }
            }

            // Mystery Block collision is handled separately after this loop
            // to properly handle adjacent blocks
        }

        // Mystery Block collision detection - find closest overlapping block
        var hb = getPlayerHitbox();
        var playerBottom = hb.y + hb.height;
        var playerTop = hb.y;
        var playerLeft = hb.x;
        var playerRight = hb.x + hb.width;
        var playerCenterX = hb.x + hb.width / 2;
        var playerCenterY = hb.y + hb.height / 2;

        var closestBlock = null;
        var closestBlockIndex = -1;
        var closestDist = Infinity;

        for (var mi = 0; mi < activeObjects.length; mi++) {
            var mobj = activeObjects[mi];
            if (mobj.type !== 'mysteryBlock' || !mobj.active || IS_TOPDOWN) continue;

            var blockWidth = mobj.width || RENDER_SIZE;
            var blockHeight = mobj.height || RENDER_SIZE;
            var blockLeft = mobj.x - blockWidth / 2;
            var blockRight = mobj.x + blockWidth / 2;
            var blockTop = mobj.y - blockHeight / 2;
            var blockBottom = mobj.y + blockHeight / 2;

            // Check for overlap
            var horizontalOverlap = playerRight > blockLeft && playerLeft < blockRight;
            var verticalOverlap = playerBottom > blockTop && playerTop < blockBottom;

            if (horizontalOverlap && verticalOverlap) {
                // Calculate distance from player center to block center
                var dist = Math.abs(playerCenterX - mobj.x);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestBlock = mobj;
                    closestBlockIndex = mi;
                }
            }
        }

        // Handle collision with closest block
        if (closestBlock) {
            var blockWidth = closestBlock.width || RENDER_SIZE;
            var blockHeight = closestBlock.height || RENDER_SIZE;
            var blockLeft = closestBlock.x - blockWidth / 2;
            var blockRight = closestBlock.x + blockWidth / 2;
            var blockTop = closestBlock.y - blockHeight / 2;
            var blockBottom = closestBlock.y + blockHeight / 2;

            // Bottom hit: player moving up and head entering block from below
            if (player.speedY < 0 && playerTop <= blockBottom && playerTop >= blockTop - 8) {
                player.y = blockBottom - ((player.height - player.collisionHeight) + player.collisionOffsetY) + 1;
                player.speedY = 0;
                checkMysteryBlockHit(closestBlock.x, closestBlock.y, closestBlockIndex);
            }
            // Landing on top: player falling, feet near block top
            else if (player.speedY > 0 && playerBottom >= blockTop && playerBottom <= blockTop + player.speedY + 8) {
                player.y = blockTop - hb.height - ((player.height - player.collisionHeight) + player.collisionOffsetY);
                player.speedY = 0;
                player.onGround = true;
                player.canDoubleJump = (JUMP_MODE === 'double');
            }
            // Horizontal collision
            else {
                if (playerCenterX < closestBlock.x) {
                    player.x = blockLeft - player.collisionWidth - ((player.width - player.collisionWidth) / 2 + player.collisionOffsetX) - 1;
                } else {
                    player.x = blockRight - ((player.width - player.collisionWidth) / 2 + player.collisionOffsetX) + 1;
                }
                player.speedX = 0;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NPC BEHAVIOR SYSTEM (Top-Down RPG)
    // ═══════════════════════════════════════════════════════════════════════

    function updateNPC(obj) {
        if (obj.behavior === 'stationary') return;

        // Stop wandering if player is interacting with this NPC
        if (dialogueState.active && dialogueState.npc === obj) {
            obj.speedX = 0;
            obj.speedY = 0;
            return;
        }

        // Stop wandering if player is touching/very close to this NPC (about to interact)
        if (interactionPrompt.visible && interactionPrompt.npc === obj) {
            obj.speedX = 0;
            obj.speedY = 0;
            return;
        }

        if (obj.behavior === 'wander') {
            var speed = obj.wanderSpeed || 1;

            // Pause timer - NPC stops occasionally
            if (obj.wanderPauseTimer > 0) {
                obj.wanderPauseTimer--;
                obj.speedX = 0;
                obj.speedY = 0;
                return;
            }

            // Wander timer - pick new direction periodically
            obj.wanderTimer--;
            if (obj.wanderTimer <= 0) {
                // Pick a new random direction or pause
                var choice = Math.floor(Math.random() * 5); // 0-3 = directions, 4 = pause
                if (choice === 4) {
                    // Pause for a bit
                    obj.wanderPauseTimer = 60 + Math.floor(Math.random() * 120); // 1-3 seconds
                    obj.speedX = 0;
                    obj.speedY = 0;
                } else {
                    // Pick a direction
                    var directions = ['up', 'down', 'left', 'right'];
                    obj.wanderDirection = directions[choice];
                    switch (obj.wanderDirection) {
                        case 'up':    obj.speedX = 0; obj.speedY = -speed; break;
                        case 'down':  obj.speedX = 0; obj.speedY = speed; break;
                        case 'left':  obj.speedX = -speed; obj.speedY = 0; break;
                        case 'right': obj.speedX = speed; obj.speedY = 0; break;
                    }
                }
                obj.wanderTimer = 60 + Math.floor(Math.random() * 120); // 1-3 seconds
            }

            // Move the NPC
            var newX = obj.x + obj.speedX;
            var newY = obj.y + obj.speedY;

            // Check if still within wander radius of start position
            var distFromStart = Math.sqrt(
                Math.pow(newX - obj.startX, 2) +
                Math.pow(newY - obj.startY, 2)
            );

            if (distFromStart > obj.wanderRadius) {
                // Turn around - head back toward start
                var dx = obj.startX - obj.x;
                var dy = obj.startY - obj.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    obj.wanderDirection = dx > 0 ? 'right' : 'left';
                    obj.speedX = dx > 0 ? speed : -speed;
                    obj.speedY = 0;
                } else {
                    obj.wanderDirection = dy > 0 ? 'down' : 'up';
                    obj.speedX = 0;
                    obj.speedY = dy > 0 ? speed : -speed;
                }
            }

            // Check collision with solid tiles (if enabled)
            if (obj.solidCollision !== false) {
                var halfW = (obj.width || RENDER_SIZE) / 2;
                var halfH = (obj.height || RENDER_SIZE) / 2;

                // Horizontal collision
                if (obj.speedX !== 0) {
                    var checkX = obj.speedX > 0 ? newX + halfW : newX - halfW;
                    if (isSolidAt(checkX, obj.y)) {
                        obj.speedX = -obj.speedX; // Reverse direction
                        obj.wanderDirection = obj.speedX > 0 ? 'right' : 'left';
                        newX = obj.x;
                    }
                }

                // Vertical collision
                if (obj.speedY !== 0) {
                    var checkY = obj.speedY > 0 ? newY + halfH : newY - halfH;
                    if (isSolidAt(obj.x, checkY)) {
                        obj.speedY = -obj.speedY; // Reverse direction
                        obj.wanderDirection = obj.speedY > 0 ? 'down' : 'up';
                        newY = obj.y;
                    }
                }
            }

            // Apply movement
            obj.x = newX;
            obj.y = newY;

            // Constrain NPC to level boundaries
            var levelPixelWidth = level[0].length * RENDER_SIZE;
            var levelPixelHeight = level.length * RENDER_SIZE;
            var objW = obj.width || RENDER_SIZE;
            var objH = obj.height || RENDER_SIZE;
            if (obj.x < objW / 2) { obj.x = objW / 2; obj.speedX = Math.abs(obj.speedX); obj.wanderDirection = 'right'; }
            if (obj.x > levelPixelWidth - objW / 2) { obj.x = levelPixelWidth - objW / 2; obj.speedX = -Math.abs(obj.speedX); obj.wanderDirection = 'left'; }
            if (obj.y < objH / 2) { obj.y = objH / 2; obj.speedY = Math.abs(obj.speedY); obj.wanderDirection = 'down'; }
            if (obj.y > levelPixelHeight - objH / 2) { obj.y = levelPixelHeight - objH / 2; obj.speedY = -Math.abs(obj.speedY); obj.wanderDirection = 'up'; }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NPC/DOOR INTERACTION SYSTEM (Top-Down RPG)
    // ═══════════════════════════════════════════════════════════════════════

    // Check for nearby interactable NPCs, doors, and remote players
    function updateInteractionPrompt() {
        if (!IS_TOPDOWN || dialogueState.active) {
            interactionPrompt.visible = false;
            return;
        }

        nearestInteractable = null;
        var nearestDist = Infinity;

        // Get player hitbox center once
        var hbPlayer = getPlayerHitbox();
        var playerCenterX = hbPlayer.x + hbPlayer.width / 2;
        var playerCenterY = hbPlayer.y + hbPlayer.height / 2;

        // Check NPCs and doors
        for (var i = 0; i < activeObjects.length; i++) {
            var obj = activeObjects[i];
            if (!obj.active) continue;
            if (obj.type !== 'npc' && obj.type !== 'door') continue;

            // Calculate distance from player hitbox center to object center
            var dx = obj.x - playerCenterX;
            var dy = obj.y - playerCenterY;
            var dist = Math.sqrt(dx * dx + dy * dy);

            var interactionRadius = obj.interactionRadius || 48;
            if (dist < interactionRadius && dist < nearestDist) {
                nearestDist = dist;
                nearestInteractable = obj;
            }
        }

        // Check remote players with greeting messages (multiplayer only)
        if (MULTIPLAYER_ENABLED && socket && socket.connected) {
            var PLAYER_INTERACTION_RADIUS = 64; // Distance to interact with other players
            for (var playerId in remotePlayers) {
                if (!remotePlayers.hasOwnProperty(playerId)) continue;
                var rp = remotePlayers[playerId];
                // Only show interaction for players who have a greeting message and aren't dead
                if (!rp.greetingMessage || rp.isDead) continue;

                var dx = rp.x - playerCenterX;
                var dy = rp.y - playerCenterY;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < PLAYER_INTERACTION_RADIUS && dist < nearestDist) {
                    nearestDist = dist;
                    // Create an interactable-like object for the remote player
                    nearestInteractable = {
                        type: 'remotePlayer',
                        playerId: playerId,
                        x: rp.x,
                        y: rp.y,
                        name: rp.name || 'Player',
                        greetingMessage: rp.greetingMessage,
                        height: player.height || 32
                    };
                }
            }
        }

        if (nearestInteractable) {
            interactionPrompt.visible = true;
            interactionPrompt.x = nearestInteractable.x;
            // Position above the interactable - higher for remote players to fit name
            var promptOffset = nearestInteractable.type === 'remotePlayer' ? 45 : 25;
            interactionPrompt.y = nearestInteractable.y - (nearestInteractable.height || 32) / 2 - promptOffset;
            // Show mobile-friendly text on touch devices
            interactionPrompt.text = (ENABLE_MOBILE_CONTROLS && IS_TOUCH_DEVICE) ? 'Tap E' : 'Press E';
            interactionPrompt.npc = nearestInteractable.type === 'npc' ? nearestInteractable : null;
            interactionPrompt.door = nearestInteractable.type === 'door' ? nearestInteractable : null;
            interactionPrompt.remotePlayer = nearestInteractable.type === 'remotePlayer' ? nearestInteractable : null;
        } else {
            interactionPrompt.visible = false;
            interactionPrompt.remotePlayer = null;
        }
    }

    // Handle E key press for interaction
    function handleInteraction() {
        if (!IS_TOPDOWN) return;

        // If dialogue is active, advance it
        if (dialogueState.active) {
            advanceDialogue();
            return;
        }

        // If near an NPC, start dialogue
        if (interactionPrompt.npc) {
            startDialogue(interactionPrompt.npc);
            return;
        }

        // If near a door, use it
        if (interactionPrompt.door) {
            useDoor(interactionPrompt.door);
            return;
        }

        // If near a remote player with greeting, show their message
        if (interactionPrompt.remotePlayer) {
            startPlayerGreeting(interactionPrompt.remotePlayer);
            return;
        }
    }

    // Helper to show/hide mobile controls (hide during dialogue so they don't cover text)
    function setMobileControlsVisible(visible) {
        var controls = document.getElementById('mobile-controls');
        if (controls) {
            // During dialogue, hide all controls except the E button
            if (!visible) {
                controls.querySelectorAll('.mobile-control-btn').forEach(function(btn) {
                    if (btn.id !== 'mobile-interact') {
                        btn.style.opacity = '0';
                        btn.style.pointerEvents = 'none';
                    }
                });
            } else {
                controls.querySelectorAll('.mobile-control-btn').forEach(function(btn) {
                    btn.style.opacity = '';
                    btn.style.pointerEvents = '';
                });
            }
        }
    }

    // Track keyboard controls visibility state
    var keyboardControlsVisible = true;
    var keyboardControlsUserHidden = false; // Track if user manually hid with ?

    // Toggle keyboard controls overlay visibility (user action with ? key)
    function toggleKeyboardControls() {
        var controls = document.getElementById('keyboard-controls');
        if (controls && !IS_TOUCH_DEVICE) {
            keyboardControlsUserHidden = !keyboardControlsUserHidden;
            keyboardControlsVisible = !keyboardControlsUserHidden;
            if (keyboardControlsVisible) {
                controls.classList.remove('hidden');
                controlsHintHidden = false; // Reset auto-hide so it can trigger again
            } else {
                controls.classList.add('hidden');
            }
        }
    }

    // Show/hide keyboard controls (for dialogue, etc.)
    function setKeyboardControlsVisible(visible) {
        var controls = document.getElementById('keyboard-controls');
        if (controls && !IS_TOUCH_DEVICE && !keyboardControlsUserHidden) {
            keyboardControlsVisible = visible;
            if (visible) {
                controls.classList.remove('hidden');
            } else {
                controls.classList.add('hidden');
            }
        }
    }

    // Initialize keyboard controls - hide on touch devices
    function initKeyboardControls() {
        var controls = document.getElementById('keyboard-controls');
        if (controls) {
            // Hide on touch devices
            if (IS_TOUCH_DEVICE) {
                controls.classList.add('hidden');
                keyboardControlsVisible = false;
            }
        }
    }

    // Start NPC dialogue
    function startDialogue(npc) {
        if (!npc.dialogueLines || npc.dialogueLines.length === 0) return;

        dialogueState.active = true;
        dialogueState.npc = npc;
        dialogueState.lineIndex = 0;
        dialogueState.text = npc.dialogueLines[0];
        dialogueState.displayedChars = 0;
        dialogueState.charTimer = 0;
        interactionPrompt.visible = false;

        // Hide controls during dialogue
        setMobileControlsVisible(false);
        setKeyboardControlsVisible(false);
    }

    // Start player greeting dialogue (for remote players in multiplayer)
    function startPlayerGreeting(remotePlayer) {
        if (!remotePlayer.greetingMessage) return;

        dialogueState.active = true;
        dialogueState.npc = null;  // Not an NPC
        dialogueState.remotePlayer = remotePlayer;  // Store the remote player
        dialogueState.lineIndex = 0;
        dialogueState.text = remotePlayer.greetingMessage;
        dialogueState.displayedChars = 0;
        dialogueState.charTimer = 0;
        interactionPrompt.visible = false;

        // Hide controls during dialogue
        setMobileControlsVisible(false);
        setKeyboardControlsVisible(false);
    }

    // Advance dialogue to next line or close
    function advanceDialogue() {
        if (!dialogueState.active) return;

        // If typewriter effect not complete, show full text
        if (dialogueState.displayedChars < dialogueState.text.length) {
            dialogueState.displayedChars = dialogueState.text.length;
            return;
        }

        // Handle remote player greeting (single message, just close)
        if (dialogueState.remotePlayer) {
            dialogueState.active = false;
            dialogueState.remotePlayer = null;
            setMobileControlsVisible(true);
            setKeyboardControlsVisible(true);
            return;
        }

        // Handle NPC dialogue (multiple lines)
        if (!dialogueState.npc) return;

        // Move to next line
        dialogueState.lineIndex++;
        if (dialogueState.lineIndex >= dialogueState.npc.dialogueLines.length) {
            // End dialogue
            dialogueState.active = false;
            dialogueState.npc = null;

            // Show controls again
            setMobileControlsVisible(true);
            setKeyboardControlsVisible(true);
        } else {
            dialogueState.text = dialogueState.npc.dialogueLines[dialogueState.lineIndex];
            dialogueState.displayedChars = 0;
            dialogueState.charTimer = 0;
        }
    }

    // Update dialogue typewriter effect
    function updateDialogue() {
        if (!dialogueState.active) return;

        dialogueState.charTimer++;
        if (dialogueState.charTimer >= 2) { // Reveal a character every 2 frames
            dialogueState.charTimer = 0;
            if (dialogueState.displayedChars < dialogueState.text.length) {
                dialogueState.displayedChars++;
            }
        }
    }

    // Use a door (teleport or level transition)
    function useDoor(door) {
        if (door.interactSound) {
            playSound(door.interactSound);
        }
        triggerScreenShake(5, 10);
        vibrate([50, 50, 100, 50, 150]);

        // Spawn particle effect if defined
        if (door.particleEffect) {
            spawnParticleEffectFromURL(door.particleEffect, door.x, door.y, 400);
        }

        if (door.destinationType === 'level' && door.destinationLevelId) {
            // Level transition via door
            var nextIndex = findLevelIndexById(door.destinationLevelId);
            if (nextIndex >= 0) {
                // Brief delay before transition for effect
                setTimeout(function() {
                    loadLevel(nextIndex);
                    startLevelBGM();
                }, 300);
            } else {
                // Level not found - show error
                checkpointMessage.text = 'Door leads nowhere!';
                checkpointMessage.timer = 120;
            }
        } else if (door.destinationType === 'position' && door.destinationX !== null) {
            // Teleport within level
            player.x = door.destinationX * RENDER_SIZE;
            player.y = door.destinationY * RENDER_SIZE;
            player.speedX = 0;
            player.speedY = 0;
        }
    }

    // Draw interaction prompt (Press E)
    function drawInteractionPrompt() {
        if (!interactionPrompt.visible) return;

        var screenX = interactionPrompt.x - cameraX;
        var screenY = interactionPrompt.y - cameraY;

        // Special styling for remote players
        if (interactionPrompt.remotePlayer) {
            var playerName = truncateName(interactionPrompt.remotePlayer.name, 15) || 'Player';
            var promptText = interactionPrompt.text + ' to interact';

            // Measure text widths
            ctx.font = 'bold 11px Arial';
            var nameWidth = ctx.measureText(playerName).width;
            ctx.font = '10px Arial';
            var promptWidth = ctx.measureText(promptText).width;
            var boxWidth = Math.max(nameWidth, promptWidth) + 20;
            var boxHeight = 36;

            // Draw speech bubble background
            ctx.fillStyle = 'rgba(46, 204, 113, 0.9)';
            ctx.beginPath();
            ctx.roundRect(screenX - boxWidth/2, screenY - 5, boxWidth, boxHeight, 6);
            ctx.fill();

            // Draw small triangle pointer
            ctx.beginPath();
            ctx.moveTo(screenX - 6, screenY + boxHeight - 5);
            ctx.lineTo(screenX + 6, screenY + boxHeight - 5);
            ctx.lineTo(screenX, screenY + boxHeight + 5);
            ctx.closePath();
            ctx.fill();

            // Draw border
            ctx.strokeStyle = 'rgba(39, 174, 96, 1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(screenX - boxWidth/2, screenY - 5, boxWidth, boxHeight, 6);
            ctx.stroke();

            // Player name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(playerName, screenX, screenY + 10);

            // Prompt text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = '10px Arial';
            ctx.fillText(promptText, screenX, screenY + 24);
        } else {
            // Default prompt for NPCs and doors
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(screenX - 30, screenY - 10, 60, 20);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(interactionPrompt.text, screenX, screenY + 4);
        }

        ctx.textAlign = 'left'; // Reset
    }

    // Draw dialogue box
    function drawDialogue() {
        if (!dialogueState.active) return;

        // Dialogue box at bottom of screen
        var boxHeight = 80;
        var boxY = CANVAS_HEIGHT - boxHeight - 10;
        var boxX = 10;
        var boxWidth = CANVAS_WIDTH - 20;

        // Background
        ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // Border
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        // Speaker name (NPC or remote player)
        if (dialogueState.npc) {
            ctx.fillStyle = '#e94560';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(dialogueState.npc.name || 'NPC', boxX + 10, boxY + 20);
        } else if (dialogueState.remotePlayer) {
            // Show remote player name with player icon
            ctx.fillStyle = '#2ecc71';  // Green for players
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('👤 ' + truncateName(dialogueState.remotePlayer.name, 15), boxX + 10, boxY + 20);
        }

        // Dialogue text (typewriter effect)
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        var displayText = dialogueState.text.substring(0, dialogueState.displayedChars);
        ctx.fillText(displayText, boxX + 10, boxY + 45);

        // Continue prompt (mobile-friendly)
        if (dialogueState.displayedChars >= dialogueState.text.length) {
            ctx.fillStyle = '#888';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            var continueText = (ENABLE_MOBILE_CONTROLS && IS_TOUCH_DEVICE) ? 'Tap E to continue' : 'Press E to continue';
            ctx.fillText(continueText, boxX + boxWidth - 10, boxY + boxHeight - 10);
        }

        ctx.textAlign = 'left'; // Reset
    }

    // Handle powerup collection
    function handlePowerup(obj) {
        switch (obj.effect) {
            case 'heal':
                lives = Math.min(maxLives + 2, lives + (obj.amount || 1));
                break;
            case 'shield':
                activeEffects.shield = obj.amount || 1;
                break;
            case 'speed':
                activeEffects.speedBoost = obj.duration || 5;
                break;
            case 'jump':
                activeEffects.jumpBoost = obj.duration || 5;
                break;
            case 'ammo':
                if (PROJECTILE_ENABLED && PROJECTILE_MODE === 'ammo') {
                    currentAmmo = Math.min(PROJECTILE_MAX_AMMO, currentAmmo + (obj.amount || 5));
                }
                break;
        }
    }

    // Handle enemy collision
    function handleEnemyCollision(obj) {
        // Don't take damage during level transition
        if (levelComplete) return;

        // One-hit kill cheat: instantly defeat any enemy on contact
        if (activeCheatEffects.oneHitKill) {
            obj.active = false;
            obj.deathTime = Date.now(); // Record death time for respawn
            sendEnemyKilled(obj);
            score += obj.stompScore || 50;
            playObjectSound(obj, 'contact');
            triggerScreenShake(4, 8);
            vibrate(50);
            // Check if score goal is met
            if (goalCondition === 'score' && checkGoalCondition()) {
                handleLevelComplete();
            }
            return;
        }

        // Check for stomp (player jumping on top of enemy) - platformer only
        if (!IS_TOPDOWN && obj.stompable) {
            var hbStomp = getPlayerHitbox();
            var playerBottom = hbStomp.y + hbStomp.height;
            var enemyHeight = obj.height || RENDER_SIZE;
            var enemyTop = obj.y - enemyHeight / 2;

            // Super generous stomp zone: top 80% of enemy
            // Only the bottom 20% of enemy will hurt player
            var stompZone = enemyTop + enemyHeight * 0.80;

            // Stomp succeeds if player's feet are in the top portion of enemy
            // No velocity check - if you're on top, you stomp
            if (playerBottom <= stompZone) {
                // Successful stomp!
                obj.active = false;
                obj.deathTime = Date.now(); // Record death time for respawn
                sendEnemyKilled(obj); // Sync enemy death to other players
                score += obj.stompScore || 50; // Points for stomping (configurable per enemy)
                player.speedY = -JUMP_POWER * 0.6; // Bounce off enemy
                player.canDoubleJump = (JUMP_MODE === 'double'); // Reset double jump on stomp
                playObjectSound(obj, 'contact');
                // Stomp feedback
                triggerScreenShake(4, 8); // Light shake
                triggerHitPause(); // Freeze frame for impact
                vibrate(50); // Quick vibration
                // Particle effect on enemy death (per-template)
                var enemyTemplate = enemyTemplates.find(function(t) { return t.id === obj.templateId; });
                if (enemyTemplate && enemyTemplate.particleEffect) {
                    spawnParticleEffectFromURL(enemyTemplate.particleEffect, obj.x + obj.width/2, obj.y + obj.height/2, 300);
                }
                // Stretch on stomp bounce
                if (SQUASH_STRETCH_ENABLED) {
                    player.scaleX = applySquashStretch(0.25, false);
                    player.scaleY = applySquashStretch(0.25, true);
                }
                // Check if score goal is met
                if (goalCondition === 'score' && checkGoalCondition()) {
                    handleLevelComplete();
                }
                return;
            }
        }

        // Check invincibility - skip damage if still invincible (includes cheat)
        if (Date.now() < player.invincibleUntil || isCheatInvincible()) return;

        // Normal collision - player takes damage
        var damage = obj.damage || 1;
        playObjectSound(obj, 'contact'); // Play enemy contact sound
        if (activeEffects.shield > 0) {
            activeEffects.shield--;
            return; // Shield absorbed hit
        }
        for (var d = 0; d < damage; d++) {
            loseLife();
            if (gameOver) return;
        }

        // PvP mode: Also reduce PvP lives for leaderboard
        if (PVP_ENABLED && MULTIPLAYER_ENABLED && !pvpEliminated) {
            myPvPLives -= damage;
            if (myPvPLives <= 0) {
                myPvPLives = 0;
                pvpEliminated = true;
                showChatMessage('System', '💀 Eliminated by enemy!');
                // Respawn after delay
                setTimeout(function() {
                    pvpEliminated = false;
                    myPvPLives = PVP_STARTING_LIVES;
                    findStartPosition();
                    // Random offset to prevent spawn camping
                    var offsetTiles = 1 + Math.floor(Math.random() * 3);
                    var direction = Math.random() < 0.5 ? -1 : 1;
                    player.x = player.x + (offsetTiles * RENDER_SIZE * direction);
                    player.x = Math.max(RENDER_SIZE, Math.min(player.x, levelWidth * RENDER_SIZE - RENDER_SIZE * 2));
                    player.speedX = 0;
                    player.speedY = 0;
                    lives = 3; // Reset regular lives too
                    gameOver = false;
                    showChatMessage('System', '🔄 Respawned!');
                    updateMpLeaderboard();
                }, 2000);
            }
            updateMpLeaderboard();
        }
    }

    // Handle hazard collision
    function handleHazardCollision(obj) {
        // Don't take damage during level transition
        if (levelComplete) return;

        // Check invincibility - skip damage if still invincible (except instant kill)
        // Cheat invincibility also skips non-instant damage
        var damage = obj.damage || 1;
        if (damage < 999 && (Date.now() < player.invincibleUntil || isCheatInvincible())) return;

        playObjectSound(obj, 'damage'); // Play hazard damage sound
        // Particle effect on hazard hit (per-template)
        var hazardTemplate = hazardTemplates.find(function(t) { return t.id === obj.templateId; });
        if (hazardTemplate && hazardTemplate.particleEffect) {
            spawnParticleEffectFromURL(hazardTemplate.particleEffect, player.x + player.width/2, player.y + player.height/2, 300);
        }
        if (damage >= 999) {
            // Instant kill bypasses invincibility
            lives = 0;
            loseLife();
            // PvP: Instant kill also eliminates in PvP
            if (PVP_ENABLED && MULTIPLAYER_ENABLED && !pvpEliminated) {
                myPvPLives = 0;
                pvpEliminated = true;
                showChatMessage('System', '💀 Eliminated by hazard!');
                setTimeout(function() {
                    pvpEliminated = false;
                    myPvPLives = PVP_STARTING_LIVES;
                    findStartPosition();
                    // Random offset to prevent spawn camping
                    var offsetTiles = 1 + Math.floor(Math.random() * 3);
                    var direction = Math.random() < 0.5 ? -1 : 1;
                    player.x = player.x + (offsetTiles * RENDER_SIZE * direction);
                    player.x = Math.max(RENDER_SIZE, Math.min(player.x, levelWidth * RENDER_SIZE - RENDER_SIZE * 2));
                    player.speedX = 0;
                    player.speedY = 0;
                    lives = 3;
                    gameOver = false;
                    showChatMessage('System', '🔄 Respawned!');
                    updateMpLeaderboard();
                }, 2000);
                updateMpLeaderboard();
            }
            return;
        }
        if (activeEffects.shield > 0) {
            activeEffects.shield--;
            return;
        }
        loseLife();

        // PvP mode: Also reduce PvP lives for leaderboard
        if (PVP_ENABLED && MULTIPLAYER_ENABLED && !pvpEliminated) {
            myPvPLives -= 1;
            if (myPvPLives <= 0) {
                myPvPLives = 0;
                pvpEliminated = true;
                showChatMessage('System', '💀 Eliminated by hazard!');
                setTimeout(function() {
                    pvpEliminated = false;
                    myPvPLives = PVP_STARTING_LIVES;
                    findStartPosition();
                    // Random offset to prevent spawn camping
                    var offsetTiles = 1 + Math.floor(Math.random() * 3);
                    var direction = Math.random() < 0.5 ? -1 : 1;
                    player.x = player.x + (offsetTiles * RENDER_SIZE * direction);
                    player.x = Math.max(RENDER_SIZE, Math.min(player.x, levelWidth * RENDER_SIZE - RENDER_SIZE * 2));
                    player.speedX = 0;
                    player.speedY = 0;
                    lives = 3;
                    gameOver = false;
                    showChatMessage('System', '🔄 Respawned!');
                    updateMpLeaderboard();
                }, 2000);
            }
            updateMpLeaderboard();
        }
    }

    // Update enemy based on behavior type
    function updateEnemy(obj) {
        var behavior = obj.behavior || 'pace';
        var baseSpeed = obj.speed || 2;

        // Apply terrain zone speed modifier to enemies if affectsEnemies is true
        var enemyZone = getTerrainZoneAt(obj.x, obj.y);
        var speedMult = 1;
        if (enemyZone && enemyZone.affectsEnemies) {
            speedMult = enemyZone.speedMultiplier;
        }
        var speed = baseSpeed * speedMult;

        switch (behavior) {
            case 'stationary':
                // Don't move
                break;

            case 'pace':
                // Move back and forth within paceDistance of start position
                // Top-down mode supports both horizontal and vertical pacing
                var isVerticalPace = IS_TOPDOWN && obj.paceAxis === 'vertical';

                if (isVerticalPace) {
                    // Vertical pacing (top-down mode)
                    obj.y += obj.direction * speed;

                    // Check if moved too far from start - clamp position then flip
                    if (obj.y > obj.startY + obj.paceDistance) {
                        obj.y = obj.startY + obj.paceDistance;
                        obj.direction = -1;
                    } else if (obj.y < obj.startY - obj.paceDistance) {
                        obj.y = obj.startY - obj.paceDistance;
                        obj.direction = 1;
                    }

                    // Check wall collision (vertical)
                    var checkY = obj.y + (obj.direction > 0 ? RENDER_SIZE/2 : -RENDER_SIZE/2);
                    if (isSolidAt(obj.x, checkY)) {
                        obj.direction *= -1;
                    }
                } else {
                    // Horizontal pacing (default / platformer)
                    obj.x += obj.direction * speed;

                    // Check if moved too far from start - clamp position then flip
                    if (obj.x > obj.startX + obj.paceDistance) {
                        obj.x = obj.startX + obj.paceDistance;
                        obj.direction = -1;
                    } else if (obj.x < obj.startX - obj.paceDistance) {
                        obj.x = obj.startX - obj.paceDistance;
                        obj.direction = 1;
                    }

                    // Check wall collision (horizontal)
                    var checkX = obj.x + (obj.direction > 0 ? RENDER_SIZE/2 : -RENDER_SIZE/2);
                    if (isSolidAt(checkX, obj.y)) {
                        obj.direction *= -1;
                    }
                }
                break;

            case 'follow':
                // Chase player if within range
                var dxToPlayer = player.x + player.width/2 - obj.x;
                var dyToPlayer = player.y + player.height/2 - obj.y;
                var distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);

                // Determine desired direction
                var desiredDir = dxToPlayer > 0 ? 1 : -1;
                var moveSpeed = 0;
                var isChasing = distToPlayer < obj.followRange;

                if (IS_TOPDOWN) {
                    // Top-down mode: True 2D following - move in both X and Y toward player
                    if (isChasing && distToPlayer > 10) {
                        // Normalize direction to player
                        var normX = dxToPlayer / distToPlayer;
                        var normY = dyToPlayer / distToPlayer;

                        // Move toward player
                        var nextX = obj.x + normX * speed;
                        var nextY = obj.y + normY * speed;

                        // Wall collision for X movement
                        var wallCheckX = nextX + (normX > 0 ? RENDER_SIZE/2 : -RENDER_SIZE/2);
                        if (!isSolidAt(wallCheckX, obj.y)) {
                            obj.x = nextX;
                        }

                        // Wall collision for Y movement
                        var wallCheckY = nextY + (normY > 0 ? RENDER_SIZE/2 : -RENDER_SIZE/2);
                        if (!isSolidAt(obj.x, wallCheckY)) {
                            obj.y = nextY;
                        }

                        // Update direction for animation
                        obj.direction = normX > 0 ? 1 : -1;
                    } else if (!isChasing) {
                        // Idle wandering when player out of range
                        if (!obj.wanderAngle) obj.wanderAngle = Math.random() * Math.PI * 2;
                        if (!obj.wanderTimer) obj.wanderTimer = 0;
                        obj.wanderTimer++;
                        if (obj.wanderTimer > 60) {
                            obj.wanderAngle += (Math.random() - 0.5) * Math.PI;
                            obj.wanderTimer = 0;
                        }
                        var wanderSpeed = speed * 0.3;
                        var nextWanderX = obj.x + Math.cos(obj.wanderAngle) * wanderSpeed;
                        var nextWanderY = obj.y + Math.sin(obj.wanderAngle) * wanderSpeed;

                        // Keep within pace distance from start position
                        var distFromStart = Math.sqrt(
                            Math.pow(nextWanderX - obj.startX, 2) +
                            Math.pow(nextWanderY - obj.startY, 2)
                        );
                        if (distFromStart < obj.paceDistance) {
                            if (!isSolidAt(nextWanderX, obj.y)) obj.x = nextWanderX;
                            if (!isSolidAt(obj.x, nextWanderY)) obj.y = nextWanderY;
                        } else {
                            // Return toward start position
                            obj.wanderAngle = Math.atan2(obj.startY - obj.y, obj.startX - obj.x);
                        }
                        obj.direction = Math.cos(obj.wanderAngle) > 0 ? 1 : -1;
                    }
                } else {
                    // Platformer mode: Horizontal only chase
                    if (isChasing && Math.abs(dxToPlayer) > 10) {
                        // Chasing player - move at full speed toward them
                        obj.direction = desiredDir;
                        moveSpeed = speed;
                    } else if (!isChasing) {
                        // Idle pacing when player out of range
                        moveSpeed = speed * 0.5;
                        // Check pace boundaries
                        if (obj.x > obj.startX + obj.paceDistance) {
                            obj.direction = -1;
                        } else if (obj.x < obj.startX - obj.paceDistance) {
                            obj.direction = 1;
                        }
                    }

                    // Check for walls BEFORE moving
                    var nextX = obj.x + obj.direction * moveSpeed;
                    var wallCheckX = nextX + (obj.direction > 0 ? RENDER_SIZE/2 : -RENDER_SIZE/2);
                    var hitWall = isSolidAt(wallCheckX, obj.y);

                    // Check for edge (no ground ahead) - only when on solid ground
                    var groundCheckX = nextX + (obj.direction > 0 ? RENDER_SIZE/2 : -RENDER_SIZE/2);
                    var groundCheckY = obj.y + (obj.height || RENDER_SIZE)/2 + 4;
                    var hasGroundAhead = isSolidAt(groundCheckX, groundCheckY);
                    var hasGroundBelow = isSolidAt(obj.x, groundCheckY);

                    if (hitWall) {
                        // Stop at wall - don't move through it
                        if (!isChasing) {
                            obj.direction *= -1; // Turn around when pacing
                        }
                        // When chasing, just stop at the wall (don't turn around)
                    } else if (hasGroundBelow && !hasGroundAhead) {
                        // Edge detected - don't walk off platforms
                        if (!isChasing) {
                            obj.direction *= -1; // Turn around when pacing
                        }
                        // When chasing, stop at edge
                    } else if (moveSpeed > 0) {
                        // Safe to move
                        obj.x = nextX;
                    }
                }
                break;

            case 'jump':
                if (IS_TOPDOWN) {
                    // Top-down mode: Jump enemies just pace (no jumping without gravity)
                    obj.x += obj.direction * speed * 0.7;
                    // Wall check
                    var wallCheckJumpX = obj.x + (obj.direction > 0 ? RENDER_SIZE/2 : -RENDER_SIZE/2);
                    if (isSolidAt(wallCheckJumpX, obj.y)) {
                        obj.direction *= -1;
                        obj.x -= obj.direction * speed; // Back off from wall
                    }
                    // Pace boundaries
                    if (obj.x > obj.startX + obj.paceDistance) {
                        obj.x = obj.startX + obj.paceDistance;
                        obj.direction = -1;
                    } else if (obj.x < obj.startX - obj.paceDistance) {
                        obj.x = obj.startX - obj.paceDistance;
                        obj.direction = 1;
                    }
                } else {
                    // Platformer mode: Jumping behavior
                    // Apply gravity
                    obj.velocityY = (obj.velocityY || 0) + GRAVITY;
                    obj.y += obj.velocityY;

                    // Check ground (using enemy's bottom edge)
                    var enemyHalfHeight = (obj.height || RENDER_SIZE) / 2;
                    var enemyBottom = obj.y + enemyHalfHeight;
                    if (obj.velocityY > 0 && isSolidAt(obj.x, enemyBottom)) {
                        // Snap to stand on top of the tile
                        var tileY = Math.floor(enemyBottom / RENDER_SIZE) * RENDER_SIZE;
                        obj.y = tileY - enemyHalfHeight;
                        obj.velocityY = 0;
                        obj.onGround = true;

                        // Jump periodically
                        obj.moveTimer = (obj.moveTimer || 0) + 1;
                        if (obj.moveTimer > 90) {
                            obj.velocityY = -(obj.jumpPower || 8);
                            obj.onGround = false;
                            obj.moveTimer = 0;
                        }
                    } else {
                        obj.onGround = false;
                    }

                    // Also move horizontally
                    obj.x += obj.direction * speed * 0.5;
                    // Check if moved too far from start - clamp position then flip
                    if (obj.x > obj.startX + obj.paceDistance) {
                        obj.x = obj.startX + obj.paceDistance;
                        obj.direction = -1;
                    } else if (obj.x < obj.startX - obj.paceDistance) {
                        obj.x = obj.startX - obj.paceDistance;
                        obj.direction = 1;
                    }
                }
                break;
        }

        // Constrain enemy to level boundaries (Top-Down RPG)
        if (IS_TOPDOWN) {
            var levelPixelWidth = level[0].length * RENDER_SIZE;
            var levelPixelHeight = level.length * RENDER_SIZE;
            var objW = obj.width || RENDER_SIZE;
            var objH = obj.height || RENDER_SIZE;
            if (obj.x < objW / 2) { obj.x = objW / 2; obj.direction = 1; }
            if (obj.x > levelPixelWidth - objW / 2) { obj.x = levelPixelWidth - objW / 2; obj.direction = -1; }
            if (obj.y < objH / 2) { obj.y = objH / 2; }
            if (obj.y > levelPixelHeight - objH / 2) { obj.y = levelPixelHeight - objH / 2; }
        }
    }

    // Update moving platform position
    function updateMovingPlatform(obj) {
        // Skip if touch-activated and not yet activated
        if (obj.activation === 'touch' && !obj.activated) {
            obj.deltaX = 0;
            obj.deltaY = 0;
            return;
        }

        // Store last position for delta calculation
        obj.lastX = obj.x;
        obj.lastY = obj.y;

        // Move based on axis
        if (obj.axis === 'y') {
            // Vertical movement
            obj.y += obj.direction * obj.speed;

            // Reverse direction at distance boundaries
            if (obj.y > obj.startY + obj.distance) {
                obj.y = obj.startY + obj.distance;
                obj.direction = -1;
            } else if (obj.y < obj.startY) {
                obj.y = obj.startY;
                obj.direction = 1;
            }
        } else {
            // Horizontal movement (default)
            obj.x += obj.direction * obj.speed;

            // Reverse direction at distance boundaries
            if (obj.x > obj.startX + obj.distance) {
                obj.x = obj.startX + obj.distance;
                obj.direction = -1;
            } else if (obj.x < obj.startX) {
                obj.x = obj.startX;
                obj.direction = 1;
            }
        }

        // Calculate delta for player riding
        obj.deltaX = obj.x - obj.lastX;
        obj.deltaY = obj.y - obj.lastY;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROJECTILE SYSTEM FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Fire a projectile from the player
    function fireProjectile() {
        if (!PROJECTILE_ENABLED) return;

        var now = Date.now();

        // Check cooldown (with cheat modifier)
        if (now - lastFireTime < getEffectiveProjectileCooldown()) return;

        // Check ammo (if in ammo mode)
        if (PROJECTILE_MODE === 'ammo' && currentAmmo <= 0) return;

        // Fire!
        lastFireTime = now;
        if (PROJECTILE_MODE === 'ammo') currentAmmo--;

        // Determine projectile direction based on game mode
        var projSpeedX = 0;
        var projSpeedY = 0;
        var projDirection = player.facingRight ? 1 : -1;

        if (IS_TOPDOWN) {
            // Top-down mode: shoot in facing direction
            switch (player.facingDirection) {
                case 'up':
                    projSpeedY = -PROJECTILE_SPEED;
                    projDirection = -1;
                    break;
                case 'down':
                    projSpeedY = PROJECTILE_SPEED;
                    projDirection = 1;
                    break;
                case 'left':
                    projSpeedX = -PROJECTILE_SPEED;
                    projDirection = -1;
                    break;
                case 'right':
                default:
                    projSpeedX = PROJECTILE_SPEED;
                    projDirection = 1;
                    break;
            }
        } else {
            // Platformer mode: shoot left or right
            projSpeedX = PROJECTILE_SPEED * projDirection;
        }

        var projectile = {
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            speedX: projSpeedX,
            speedY: projSpeedY,
            width: PROJECTILE_WIDTH,
            height: PROJECTILE_HEIGHT,
            color: PROJECTILE_COLOR,
            direction: projDirection,
            facingDirection: player.facingDirection, // Store for rendering
            spawnTime: now,
            animFrame: 0,
            animTimer: 0
        };

        projectiles.push(projectile);
        if (SOUND_SHOOT) playSound(SOUND_SHOOT);

        // Broadcast projectile to other players in multiplayer
        if (MULTIPLAYER_ENABLED && socket && socket.connected) {
            socket.emit('gm_shoot', {
                x: projectile.x,
                y: projectile.y,
                direction: projectile.direction,
                facingDirection: projectile.facingDirection
            });
        }
    }

    // Update all projectiles
    function updateProjectiles() {
        if (!PROJECTILE_ENABLED) return;

        var now = Date.now();

        for (var i = projectiles.length - 1; i >= 0; i--) {
            var p = projectiles[i];

            // Move projectile
            p.x += p.speedX;
            p.y += p.speedY;

            // Check lifetime expiration
            if (now - p.spawnTime > PROJECTILE_LIFETIME) {
                projectiles.splice(i, 1);
                continue;
            }

            // Check wall collision (center point)
            if (isSolidAt(p.x, p.y)) {
                projectiles.splice(i, 1);
                continue;
            }

            // Check out of bounds
            if (p.x < 0 || p.x > level[0].length * RENDER_SIZE || p.y < 0 || p.y > level.length * RENDER_SIZE) {
                projectiles.splice(i, 1);
                continue;
            }

            // Check enemy collision
            var hitEnemy = false;
            for (var j = 0; j < activeObjects.length; j++) {
                var obj = activeObjects[j];
                if (!obj.active || obj.type !== 'enemy') continue;

                // Circle collision for enemies
                var dx = p.x - obj.x;
                var dy = p.y - obj.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var enemyRadius = (obj.width || RENDER_SIZE) / 2;

                if (dist < enemyRadius + Math.max(p.width, p.height) / 2) {
                    // Hit enemy!
                    obj.active = false;
                    sendEnemyKilled(obj); // Sync enemy death to other players
                    score += 25;
                    if (SOUND_PROJECTILE_HIT) playSound(SOUND_PROJECTILE_HIT);
                    // Particle effect on enemy death (per-template)
                    var hitEnemyTemplate = enemyTemplates.find(function(t) { return t.id === obj.templateId; });
                    if (hitEnemyTemplate && hitEnemyTemplate.particleEffect) {
                        spawnParticleEffectFromURL(hitEnemyTemplate.particleEffect, obj.x + obj.width/2, obj.y + obj.height/2, 300);
                    }
                    // Check if score goal is met
                    if (goalCondition === 'score' && checkGoalCondition()) {
                        handleLevelComplete();
                    }
                    projectiles.splice(i, 1);
                    hitEnemy = true;
                    break;
                }
            }

            // Check PvP collision with remote players
            if (!hitEnemy && PVP_ENABLED && MULTIPLAYER_ENABLED && socket && socket.connected) {
                var hitPlayer = false;
                for (var playerId in remotePlayers) {
                    if (!remotePlayers.hasOwnProperty(playerId)) continue;
                    var rp = remotePlayers[playerId];

                    // Circle collision for players
                    var pdx = p.x - rp.x;
                    var pdy = p.y - rp.y;
                    var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
                    var playerRadius = RENDER_SIZE * 0.6; // Approximate player hitbox

                    if (pdist < playerRadius + Math.max(p.width, p.height) / 2) {
                        // Hit a remote player! Send PvP hit event
                        socket.emit('gm_pvp_hit', {
                            targetId: playerId,
                            damage: PVP_DAMAGE,
                            projectileId: i
                        });

                        // Visual/audio feedback for shooter
                        if (SOUND_PROJECTILE_HIT) playSound(SOUND_PROJECTILE_HIT);

                        projectiles.splice(i, 1);
                        hitPlayer = true;
                        break;
                    }
                }
                if (hitPlayer) continue;
            }

            // Check collectible collision (projectiles pass through but collect items)
            if (!hitEnemy && PROJECTILE_COLLECTS_ITEMS) {
                for (var k = 0; k < activeObjects.length; k++) {
                    var cobj = activeObjects[k];
                    if (!cobj.active || cobj.type !== 'collectible') continue;

                    // Circle collision for collectibles
                    var cdx = p.x - cobj.x;
                    var cdy = p.y - cobj.y;
                    var cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                    var collectRadius = (cobj.width || RENDER_SIZE) / 2 * 0.8;

                    if (cdist < collectRadius + Math.max(p.width, p.height) / 2) {
                        // Collect the item!
                        // In RPG mode, add to inventory
                        if (IS_TOPDOWN) {
                            var templateId = cobj.templateId || 'coin';
                            if (!inventory[templateId]) {
                                // Look up the full template from collectibleTemplates
                                var fullTemplate = collectibleTemplates.find(function(t) { return t.id === templateId; });
                                inventory[templateId] = {
                                    count: 0,
                                    template: fullTemplate || {
                                        name: cobj.name || 'Item',
                                        symbol: cobj.symbol || '🪙',
                                        color: cobj.color || '#f1c40f',
                                        value: cobj.value || 10,
                                        sprite: cobj.sprite || ''
                                    }
                                };
                            }
                            inventory[templateId].count++;
                            saveRPGProgress(); // Save inventory to localStorage
                        }
                        score += cobj.value || 10;
                        cobj.active = false;
                        collectiblesCollected++;
                        playObjectSound(cobj, 'collect');
                        vibrate(30); // Quick collect feedback

                        // Check if collect_all condition is met
                        if (goalCondition === 'collect_all' && checkGoalCondition()) {
                            handleLevelComplete();
                        }
                        // Check if score condition is met
                        if (goalCondition === 'score' && checkGoalCondition()) {
                            handleLevelComplete();
                        }
                        // Projectile continues through - don't destroy it
                    }
                }
            }

            // Update animation
            if (!hitEnemy && PROJECTILE_SPRITESHEET_COLS > 1) {
                p.animTimer++;
                if (p.animTimer >= 5) {
                    p.animTimer = 0;
                    p.animFrame = (p.animFrame + 1) % PROJECTILE_SPRITESHEET_COLS;
                }
            }
        }
    }

    // Update remote projectiles (from other players)
    function updateRemoteProjectiles() {
        if (!MULTIPLAYER_ENABLED) return;
        var now = Date.now();
        for (var i = remoteProjectiles.length - 1; i >= 0; i--) {
            var p = remoteProjectiles[i];
            p.x += p.speedX;
            p.y += p.speedY;
            // Remove after lifetime
            if (now - p.spawnTime > PROJECTILE_LIFETIME) {
                remoteProjectiles.splice(i, 1);
            }
        }
    }

    // Draw all projectiles
    function drawProjectiles(camX, camY) {
        if (!PROJECTILE_ENABLED) return;

        for (var i = 0; i < projectiles.length; i++) {
            var p = projectiles[i];
            var drawX = p.x - p.width / 2 - camX;
            var drawY = p.y - p.height / 2 - camY;
            var centerX = drawX + p.width / 2;
            var centerY = drawY + p.height / 2;

            if (projectileSprite && projectileSprite.complete) {
                // Draw sprite - supports grid-based spritesheets
                var frameWidth = projectileSprite.width / PROJECTILE_SPRITESHEET_COLS;
                var frameHeight = projectileSprite.height / PROJECTILE_SPRITESHEET_ROWS;
                var srcX = p.animFrame * frameWidth;
                var srcY = 0;

                // For multi-row spritesheets, select row based on direction
                if (PROJECTILE_SPRITESHEET_ROWS > 1 && IS_TOPDOWN && p.facingDirection) {
                    switch (p.facingDirection) {
                        case 'down':  srcY = 0; break;
                        case 'left':  srcY = frameHeight; break;
                        case 'right': srcY = frameHeight * 2; break;
                        case 'up':    srcY = frameHeight * 3; break;
                        default: srcY = 0; break;
                    }
                }

                ctx.save();
                ctx.translate(centerX, centerY);

                if (IS_TOPDOWN && p.facingDirection && PROJECTILE_SPRITESHEET_ROWS <= 1) {
                    // Top-down mode with single-row sprite: rotate based on direction
                    switch (p.facingDirection) {
                        case 'up':    ctx.rotate(-Math.PI / 2); break;
                        case 'down':  ctx.rotate(Math.PI / 2); break;
                        case 'left':  ctx.rotate(Math.PI); break;
                        case 'right': // No rotation
                        default: break;
                    }
                } else if (!IS_TOPDOWN && p.direction < 0) {
                    // Platformer mode: Flip sprite when going left
                    ctx.scale(-1, 1);
                }

                ctx.drawImage(
                    projectileSprite,
                    srcX, srcY, frameWidth, frameHeight,
                    -p.width / 2, -p.height / 2, p.width, p.height
                );
                ctx.restore();
            } else {
                // Draw colored rectangle with glow
                ctx.save();
                ctx.translate(centerX, centerY);

                if (IS_TOPDOWN && p.facingDirection) {
                    // Top-down mode: rotate based on direction
                    switch (p.facingDirection) {
                        case 'up':    ctx.rotate(-Math.PI / 2); break;
                        case 'down':  ctx.rotate(Math.PI / 2); break;
                        case 'left':  ctx.rotate(Math.PI); break;
                        case 'right': // No rotation
                        default: break;
                    }
                }

                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
                ctx.restore();
            }
        }
    }

    // Draw remote projectiles (from other players)
    function drawRemoteProjectiles(camX, camY) {
        if (!MULTIPLAYER_ENABLED) return;
        for (var i = 0; i < remoteProjectiles.length; i++) {
            var p = remoteProjectiles[i];
            var drawX = p.x - p.width / 2 - camX;
            var drawY = p.y - p.height / 2 - camY;
            // Draw as colored rectangle with glow (player's color)
            ctx.save();
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = p.color;
            ctx.fillRect(drawX, drawY, p.width, p.height);
            ctx.restore();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MYSTERY BLOCK FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Check if player hit a mystery block from below
    // Can be called with (tileX, tileY) for tile-based collision, or (x, y, blockIndex) for direct collision
    function checkMysteryBlockHit(hitX, hitY, blockIndex) {
        // If blockIndex is provided, use it directly
        if (typeof blockIndex === 'number') {
            var obj = activeObjects[blockIndex];
            if (!obj || obj.type !== 'mysteryBlock' || !obj.active) return;

            var state = mysteryBlockStates[blockIndex];
            if (!state) return;

            if (state.depleted) {
                // Block is empty - play empty hit sound
                if (obj.emptyHitSound) {
                    playSound(obj.emptyHitSound);
                }
                return;
            }

            // Emit an item!
            emitItemFromBlock(obj, state, blockIndex);

            // Update remaining count
            state.remaining--;
            if (state.remaining <= 0) {
                state.depleted = true;
                obj.depleted = true;

                // Handle depletion behavior
                if (obj.depletedBehavior === 'disappear') {
                    obj.active = false;
                }
            }
            return;
        }

        // Fallback: search by tile coordinates (for ceiling collision)
        for (var i = 0; i < activeObjects.length; i++) {
            var obj = activeObjects[i];
            if (obj.type !== 'mysteryBlock' || !obj.active) continue;

            // Get block position in tile coordinates
            var blockTileX = Math.floor((obj.x - obj.width / 2) / RENDER_SIZE);
            var blockTileY = Math.floor((obj.y - obj.height / 2) / RENDER_SIZE);

            // Check if hit tile matches block position
            if (hitX === blockTileX && hitY === blockTileY) {
                var state = mysteryBlockStates[i];
                if (!state) continue;

                if (state.depleted) {
                    // Block is empty - play empty hit sound
                    if (obj.emptyHitSound) {
                        playSound(obj.emptyHitSound);
                    }
                    return;
                }

                // Emit an item!
                emitItemFromBlock(obj, state, i);

                // Update remaining count
                state.remaining--;
                if (state.remaining <= 0) {
                    state.depleted = true;
                    obj.depleted = true;

                    // Handle depletion behavior
                    if (obj.depletedBehavior === 'disappear') {
                        obj.active = false;
                    }
                }

                return; // Only hit one block per frame
            }
        }
    }

    // Emit an item from a mystery block
    function emitItemFromBlock(block, state, blockIndex) {
        // Play hit sound
        if (block.hitSound) {
            playSound(block.hitSound);
        }
        vibrate(50);

        // Spawn particle effect if defined
        if (block.particleEffect) {
            spawnParticleEffectFromURL(block.particleEffect, block.x, block.y - block.height/2, 300);
        }

        // Get the template for the emitted item
        var emitTemplates = block.emitType === 'powerup' ? powerupTemplates : collectibleTemplates;
        var emitTemplate = getTemplateById(emitTemplates, block.emitTemplateId);
        if (!emitTemplate) {
            // Fallback to first template
            emitTemplate = emitTemplates[0];
        }

        // Calculate initial position (center of block, above it)
        var emitX = block.x;
        var emitY = block.y - block.height / 2 - (emitTemplate.height || RENDER_SIZE) / 2;

        // Calculate initial velocity based on emit mode and direction
        var speedX = 0;
        var speedY = 0;

        if (block.emitMode === 'popup' || block.emitMode === 'moving') {
            // Calculate initial upward velocity for desired pop height
            // Using v = sqrt(2 * g * h) where g is gravity (0.5) and h is pop height
            var gravity = 0.5;
            speedY = -Math.sqrt(2 * gravity * block.emitPopHeight);

            if (block.emitMode === 'moving') {
                // Add horizontal movement
                if (block.emitDirection === 'left') {
                    speedX = -block.emitSpeed;
                } else if (block.emitDirection === 'right') {
                    speedX = block.emitSpeed;
                } else if (block.emitDirection === 'random') {
                    speedX = (Math.random() < 0.5 ? -1 : 1) * block.emitSpeed;
                }
            }
        }

        // Create emitted item
        var emittedItem = {
            x: emitX,
            y: emitY,
            speedX: speedX,
            speedY: speedY,
            width: emitTemplate.width || RENDER_SIZE,
            height: emitTemplate.height || RENDER_SIZE,
            type: block.emitType,
            templateId: block.emitTemplateId,
            template: emitTemplate,
            color: emitTemplate.color || (block.emitType === 'powerup' ? '#e91e63' : '#f1c40f'),
            symbol: emitTemplate.symbol || (block.emitType === 'powerup' ? '♥' : '●'),
            sprite: emitTemplate.sprite || '',
            value: emitTemplate.value || 10,
            effect: emitTemplate.effect || 'heal',
            amount: emitTemplate.amount || 1,
            duration: emitTemplate.duration || 0,
            collected: false,
            active: true,
            applyGravity: block.emitGravity,
            collectMode: block.collectMode,
            autoCollectDelay: block.autoCollectDelay,
            spawnTime: Date.now(),
            animFrame: 0,
            animTimer: 0,
            frameCount: emitTemplate.frameCount || 1,
            animSpeed: emitTemplate.animSpeed || 8,
            blockIndex: blockIndex,
            // For pop animation
            popPhase: block.emitMode === 'popup' || block.emitMode === 'moving' ? 'rising' : 'done',
            initialY: emitY,
            popHeight: block.emitPopHeight || 32
        };

        emittedItems.push(emittedItem);

        // Instant collect mode - collect immediately
        if (block.collectMode === 'instant') {
            collectEmittedItem(emittedItem, emittedItems.length - 1);
        }
    }

    // Update all emitted items (physics, collection)
    function updateEmittedItems() {
        var now = Date.now();

        for (var i = emittedItems.length - 1; i >= 0; i--) {
            var item = emittedItems[i];
            if (!item.active || item.collected) continue;

            // Apply gravity if enabled (always apply, even during rising phase)
            if (item.applyGravity) {
                item.speedY += 0.5; // gravity
            }

            // Update position
            item.x += item.speedX;
            item.y += item.speedY;

            // Track pop phase
            if (item.popPhase === 'rising') {
                if (item.applyGravity && item.speedY >= 0) {
                    // With gravity: transition to falling when velocity becomes positive
                    item.popPhase = 'falling';
                } else if (!item.applyGravity && item.y <= item.initialY - item.popHeight) {
                    // No gravity: stop at target pop height
                    item.y = item.initialY - item.popHeight;
                    item.speedY = 0;
                    item.popPhase = 'done';
                    item.animDoneTime = now;
                }
            }

            // Fallback: if falling for too long without hitting floor, consider animation done
            if (item.popPhase === 'falling' && !item.animDoneTime) {
                // After 1.5 seconds of falling, mark as done for auto-collect purposes
                if (now - item.spawnTime > 1500) {
                    item.popPhase = 'done';
                    item.animDoneTime = now;
                }
            }

            // Floor collision (stop falling)
            if (item.applyGravity && item.speedY > 0) {
                var itemBottom = item.y + item.height / 2;
                var itemLeft = item.x - item.width / 2;
                var itemRight = item.x + item.width / 2;
                var landed = false;

                // Check tile collision
                var tileY = Math.floor(itemBottom / RENDER_SIZE);
                var tileX = Math.floor(item.x / RENDER_SIZE);

                if (tileY >= 0 && tileY < level.length && tileX >= 0 && tileX < level[0].length) {
                    var tileKey = level[tileY][tileX];
                    if (tileTypes[tileKey] && tileTypes[tileKey].solid) {
                        item.y = tileY * RENDER_SIZE - item.height / 2;
                        landed = true;
                    }
                }

                // Check mystery block collision (land on top of blocks)
                if (!landed) {
                    for (var b = 0; b < activeObjects.length; b++) {
                        var block = activeObjects[b];
                        if (block.type !== 'mysteryBlock' || !block.active) continue;

                        var blockWidth = block.width || RENDER_SIZE;
                        var blockHeight = block.height || RENDER_SIZE;
                        var blockLeft = block.x - blockWidth / 2;
                        var blockRight = block.x + blockWidth / 2;
                        var blockTop = block.y - blockHeight / 2;

                        // Check if item is horizontally overlapping and falling onto top
                        if (itemRight > blockLeft && itemLeft < blockRight) {
                            if (itemBottom >= blockTop && itemBottom <= blockTop + item.speedY + 4) {
                                item.y = blockTop - item.height / 2;
                                landed = true;
                                break;
                            }
                        }
                    }
                }

                if (landed) {
                    item.speedY = 0;
                    item.speedX = 0;
                    if (item.popPhase !== 'done') {
                        item.popPhase = 'done';
                        item.animDoneTime = now;
                    }
                }
            }

            // Wall collision (reverse horizontal direction for moving items)
            if (item.speedX !== 0) {
                var checkX = item.x + (item.speedX > 0 ? item.width / 2 : -item.width / 2);
                var checkTileX = Math.floor(checkX / RENDER_SIZE);
                var checkTileY = Math.floor(item.y / RENDER_SIZE);

                if (checkTileX >= 0 && checkTileX < level[0].length && checkTileY >= 0 && checkTileY < level.length) {
                    var wallTileKey = level[checkTileY][checkTileX];
                    if (tileTypes[wallTileKey] && tileTypes[wallTileKey].solid) {
                        item.speedX = -item.speedX; // Bounce off wall
                    }
                }
            }

            // Auto-collect after animation delay
            if (item.collectMode === 'auto_after_anim' && item.popPhase === 'done') {
                // Use animDoneTime if set, otherwise spawnTime (for static items)
                var animFinishTime = item.animDoneTime || item.spawnTime;
                if (now - animFinishTime > item.autoCollectDelay) {
                    collectEmittedItem(item, i);
                    continue;
                }
            }

            // Manual collection - check player collision
            if (item.collectMode === 'manual') {
                var playerHb = {
                    x: player.x + player.collisionOffsetX,
                    y: player.y + player.collisionOffsetY,
                    width: player.collisionWidth,
                    height: player.collisionHeight
                };

                var itemLeft = item.x - item.width / 2;
                var itemTop = item.y - item.height / 2;

                if (playerHb.x < itemLeft + item.width &&
                    playerHb.x + playerHb.width > itemLeft &&
                    playerHb.y < itemTop + item.height &&
                    playerHb.y + playerHb.height > itemTop) {
                    collectEmittedItem(item, i);
                    continue;
                }
            }

            // Update animation
            if (item.frameCount > 1) {
                item.animTimer++;
                if (item.animTimer >= item.animSpeed) {
                    item.animTimer = 0;
                    item.animFrame = (item.animFrame + 1) % item.frameCount;
                }
            }

            // Handle off-screen items (fell into pit or flew off sides)
            var levelPixelWidth = level[0].length * RENDER_SIZE;
            var levelPixelHeight = level.length * RENDER_SIZE;
            var isOffScreen = item.y > levelPixelHeight + 100 ||
                              item.y < -100 ||
                              item.x < -100 ||
                              item.x > levelPixelWidth + 100;

            if (isOffScreen) {
                // For auto-collect items, collect them instead of removing
                if (item.collectMode === 'auto_after_anim') {
                    collectEmittedItem(item, i);
                } else {
                    // Manual collect items are lost if they fly off
                    emittedItems.splice(i, 1);
                }
            }
        }
    }

    // Collect an emitted item
    function collectEmittedItem(item, index) {
        if (item.collected) return;
        item.collected = true;

        if (item.type === 'collectible') {
            // Add to score
            score += item.value || 10;
            vibrate(30);
            playObjectSound(item, 'collect');

            // In RPG mode, add to inventory
            if (IS_TOPDOWN) {
                var templateId = item.templateId || 'coin';
                if (!inventory[templateId]) {
                    // Look up the full template from collectibleTemplates
                    var fullTemplate = collectibleTemplates.find(function(t) { return t.id === templateId; });
                    inventory[templateId] = {
                        count: 0,
                        template: fullTemplate || {
                            name: (item.template && item.template.name) || 'Item',
                            symbol: item.symbol || '🪙',
                            color: item.color || '#f1c40f',
                            value: item.value || 10,
                            sprite: item.sprite || ''
                        }
                    };
                }
                inventory[templateId].count++;
                saveRPGProgress();
            }

            // Check goal conditions
            if (goalCondition === 'score' && checkGoalCondition()) {
                handleLevelComplete();
            }
        } else if (item.type === 'powerup') {
            // Apply powerup effect
            vibrate([50, 50, 100]);
            playObjectSound(item, 'collect');

            switch (item.effect) {
                case 'heal':
                    player.health = Math.min(player.maxHealth, player.health + item.amount);
                    break;
                case 'shield':
                    activeEffects.shield = item.duration * 60; // Convert seconds to frames
                    break;
                case 'speed':
                    activeEffects.speedBoost = item.duration * 60;
                    break;
                case 'jump':
                    activeEffects.jumpBoost = item.duration * 60;
                    break;
            }
        }

        // Remove from array
        if (index !== undefined && index >= 0 && index < emittedItems.length) {
            emittedItems.splice(index, 1);
        }
    }

    // Draw emitted items from mystery blocks
    function drawEmittedItems(camX, camY) {
        for (var i = 0; i < emittedItems.length; i++) {
            var item = emittedItems[i];
            if (!item.active || item.collected) continue;

            var drawX = item.x - item.width / 2 - camX;
            var drawY = item.y - item.height / 2 - camY;

            // Skip if off-screen
            if (drawX + item.width < 0 || drawX > CANVAS_WIDTH ||
                drawY + item.height < 0 || drawY > CANVAS_HEIGHT) {
                continue;
            }

            // Try to use sprite if available
            var spriteKey = item.sprite;
            var sprite = spriteKey ? loadedSprites[spriteKey] : null;

            if (sprite && sprite.complete) {
                // Draw sprite with animation
                var frameWidth = sprite.width / item.frameCount;
                ctx.drawImage(
                    sprite,
                    item.animFrame * frameWidth, 0, frameWidth, sprite.height,
                    drawX, drawY, item.width, item.height
                );
            } else {
                // Draw fallback (colored circle with symbol)
                ctx.beginPath();
                ctx.arc(drawX + item.width / 2, drawY + item.height / 2, Math.min(item.width, item.height) / 2 * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = item.color;
                ctx.fill();

                // Draw symbol
                ctx.fillStyle = '#fff';
                ctx.font = 'bold ' + Math.floor(item.height * 0.5) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.symbol, drawX + item.width / 2, drawY + item.height / 2);
            }
        }
    }

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // DRAW FUNCTION - Rendering the game visuals
    // ═══════════════════════════════════════════════════════════════════════════
    // This function draws everything on screen, called every frame after update().
    //
    // DRAW ORDER MATTERS! (Back to front)
    // 1. Background gradient (farthest back)
    // 2. Parallax background layers
    // 3. Level tiles
    // 4. Player (in front of everything)
    // 5. (Future: UI elements like score, health)
    //
    // KEY CONCEPTS:
    // - ctx.fillRect(x, y, w, h): Draw a filled rectangle
    // - ctx.drawImage(): Draw an image (many overloads)
    // - ctx.save() / ctx.restore(): Save/restore drawing state (for transforms)
    // - ctx.translate() / ctx.scale(): Transform coordinates (for flipping)
    //
    // PERFORMANCE OPTIMIZATION:
    // We only draw tiles that are visible on screen (culling).
    // startCol/endCol and startRow/endRow calculate the visible range.
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    function draw() {
        // If this is a menu level, draw menu instead of gameplay
        if (isMenuLevel) {
            drawMenu();
            return;
        }

        // Apply screen shake offset to camera
        var camX = Math.round(cameraX + screenShake.x);
        var camY = Math.round(cameraY + screenShake.y);

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // BACKGROUND - Fallback gradient if no background images loaded
        // ───────────────────────────────────────────────────────────────────────
` : ''}        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        var gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#2d1b4e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // PARALLAX BACKGROUNDS
        // Each layer moves at a different speed based on camera position.
        // parallaxX = cameraX * layer.speed creates the depth illusion.
        // We tile the image horizontally to fill the screen width.
        // ───────────────────────────────────────────────────────────────────────
` : ''}        var levelWorldHeight = level.length * RENDER_SIZE;
        var levelBottomOnScreen = levelWorldHeight - camY;

        for (var i = 0; i < backgroundLayers.length; i++) {
            var layer = backgroundLayers[i];
            var img = loadedBgImages[i];
            if (img && img.complete && img.naturalWidth > 0) {
                var parallaxX = camX * layer.speed;

                var visibleHeight = Math.min(levelBottomOnScreen, CANVAS_HEIGHT);
                var scale = visibleHeight / img.naturalHeight;
                var scaledWidth = Math.ceil(img.naturalWidth * scale);
                var scaledHeight = Math.ceil(visibleHeight);

                var bgY = levelBottomOnScreen - scaledHeight;

                var startX = Math.round(-(parallaxX % scaledWidth));
                for (var x = startX; x < CANVAS_WIDTH; x += scaledWidth) {
                    ctx.drawImage(img, Math.round(x), bgY, scaledWidth + 1, scaledHeight);
                }
                if (startX > 0) {
                    ctx.drawImage(img, Math.round(startX - scaledWidth), bgY, scaledWidth + 1, scaledHeight);
                }
            }
        }

        // Draw background particle effect (snow, rain, fog, etc.) - behind tiles
        drawBackgroundParticles();

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // TILE RENDERING
        // We only draw tiles visible on screen (optimization called "culling").
        // For each tile: look up its position in the tileset, draw that portion.
        //
        // ctx.drawImage() with 9 parameters:
        //   (image, srcX, srcY, srcW, srcH, destX, destY, destW, destH)
        // This copies a rectangular region from the tileset to the canvas.
        //
        // ctx.imageSmoothingEnabled = false preserves pixel art crispness.
        // ───────────────────────────────────────────────────────────────────────
` : ''}        var startCol = Math.floor(camX / RENDER_SIZE);
        var endCol = startCol + Math.ceil(CANVAS_WIDTH / RENDER_SIZE) + 2;
        var startRow = Math.floor(camY / RENDER_SIZE);
        var endRow = startRow + Math.ceil(CANVAS_HEIGHT / RENDER_SIZE) + 2;

        for (var y = Math.max(0, startRow); y < Math.min(level.length, endRow); y++) {
            for (var x = startCol; x < endCol && x < level[y].length; x++) {
                var char = level[y][x];
                var tile = tileTypes[char];

                if (tile) {
                    var screenX = x * RENDER_SIZE - camX;
                    var screenY = y * RENDER_SIZE - camY;

                    // Check if this is a custom tile (from pixel editor)
                    if (tile.custom && customTileImages[char]) {
                        var ctImg;
                        // Check if this is an animated tile
                        if (tile.animated && typeof animatedTileImages !== 'undefined' && animatedTileImages[char]) {
                            var frameIdx = animatedTileCurrentFrames[char] || 0;
                            ctImg = animatedTileImages[char][frameIdx];
                        } else {
                            ctImg = customTileImages[char];
                        }
                        if (ctImg && ctImg.complete && ctImg.naturalWidth > 0) {
                            ctx.imageSmoothingEnabled = false;

                            // Check for tile effects
                            var tileEffect = (typeof tileEffects !== 'undefined') ? tileEffects[char] : null;
                            if (tileEffect && typeof tileEffectTime !== 'undefined') {
                                ctx.save();

                                // Calculate effect values based on type
                                var intensity = tileEffect.intensity / 10; // 0-1 range
                                var speed = tileEffect.speed / 5; // Speed multiplier
                                var t = tileEffectTime * speed / 1000; // Time in seconds
                                var centerX = screenX + RENDER_SIZE / 2;
                                var centerY = screenY + RENDER_SIZE / 2;

                                // Add position-based phase offset for natural variation
                                var phase = (x * 0.5 + y * 0.3) * Math.PI;

                                switch (tileEffect.effect) {
                                    case 'sway':
                                        // Gentle rotation like wind blowing trees
                                        var swayAngle = Math.sin(t * 2 + phase) * intensity * 0.15;
                                        ctx.translate(centerX, screenY + RENDER_SIZE);
                                        ctx.rotate(swayAngle);
                                        ctx.translate(-centerX, -(screenY + RENDER_SIZE));
                                        break;
                                    case 'pulse':
                                        // Scale up and down like breathing/glowing
                                        var pulseScale = 1 + Math.sin(t * 3 + phase) * intensity * 0.1;
                                        ctx.translate(centerX, centerY);
                                        ctx.scale(pulseScale, pulseScale);
                                        ctx.translate(-centerX, -centerY);
                                        break;
                                    case 'bounce':
                                        // Subtle up/down bounce
                                        var bounceY = Math.abs(Math.sin(t * 4 + phase)) * intensity * RENDER_SIZE * 0.1;
                                        ctx.translate(0, -bounceY);
                                        break;
                                    case 'float':
                                        // Slow floating up and down
                                        var floatY = Math.sin(t * 1.5 + phase) * intensity * RENDER_SIZE * 0.08;
                                        ctx.translate(0, floatY);
                                        break;
                                    case 'shimmer':
                                        // Random-looking scale variation
                                        var shimmerX = 1 + Math.sin(t * 5 + phase) * intensity * 0.05;
                                        var shimmerY = 1 + Math.cos(t * 4 + phase * 1.3) * intensity * 0.05;
                                        ctx.translate(centerX, centerY);
                                        ctx.scale(shimmerX, shimmerY);
                                        ctx.translate(-centerX, -centerY);
                                        break;
                                    case 'wave':
                                        // Horizontal wave distortion
                                        var waveX = Math.sin(t * 3 + y * 0.5) * intensity * RENDER_SIZE * 0.08;
                                        ctx.translate(waveX, 0);
                                        break;
                                    case 'shake':
                                        // Quick random-ish shake
                                        var shakeX = Math.sin(t * 15 + phase) * intensity * RENDER_SIZE * 0.05;
                                        var shakeY = Math.cos(t * 12 + phase * 1.2) * intensity * RENDER_SIZE * 0.05;
                                        ctx.translate(shakeX, shakeY);
                                        break;
                                }

                                ctx.drawImage(ctImg, 0, 0, TILE_SIZE, TILE_SIZE,
                                    screenX, screenY, RENDER_SIZE, RENDER_SIZE);
                                ctx.restore();
                            } else {
                                ctx.drawImage(ctImg, 0, 0, TILE_SIZE, TILE_SIZE,
                                    screenX, screenY, RENDER_SIZE, RENDER_SIZE);
                            }
                        } else {
                            // Fallback while loading
                            ctx.fillStyle = '#6b5b95';
                            ctx.fillRect(screenX, screenY, RENDER_SIZE, RENDER_SIZE);
                        }
                    } else if (tileset.complete && tileset.naturalWidth > 0) {
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(
                            tileset,
                            tile.col * TILE_SIZE, tile.row * TILE_SIZE,
                            TILE_SIZE, TILE_SIZE,
                            screenX, screenY,
                            RENDER_SIZE, RENDER_SIZE
                        );
                    } else {
                        ctx.fillStyle = tile.solid ? '#4a5568' : '#2d3748';
                        ctx.fillRect(screenX, screenY, RENDER_SIZE, RENDER_SIZE);
                    }
                }
            }
        }

${includeComments ? `        // ───────────────────────────────────────────────────────────────────────
        // PLAYER RENDERING
        // Convert world position to screen position by subtracting camera.
        // If we have a sprite, draw it with animation and horizontal flip.
        // Otherwise, draw a simple colored rectangle with eyes.
        //
        // SPRITE FLIPPING:
        // To flip horizontally, we use ctx.scale(-1, 1) which mirrors the X axis.
        // We must also translate to adjust for the flip point.
        // ctx.save()/restore() ensures the flip doesn't affect other drawings.
        // ───────────────────────────────────────────────────────────────────────
` : ''}        // Draw game objects
        drawGameObjects(camX, camY);

        // Draw projectiles
        drawProjectiles(camX, camY);
        drawRemoteProjectiles(camX, camY);

        // Draw emitted items from mystery blocks
        drawEmittedItems(camX, camY);

        // Draw particle effects
        drawParticles();

        var playerScreenX = player.x - camX;
        var playerScreenY = player.y - camY;

        // Invincibility flashing effect - flash every 100ms (includes cheat invincibility)
        var isInvincible = Date.now() < player.invincibleUntil || (CHEATS_ENABLED && isCheatInvincible());
        if (isInvincible && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }

        // Get cheat size multiplier
        var cheatSizeMult = CHEATS_ENABLED ? getCheatSizeMultiplier() : 1;

        // Apply squash & stretch scale and cheat size (scale from bottom-center of player)
        var needsScale = (SQUASH_STRETCH_ENABLED && (player.scaleX !== 1.0 || player.scaleY !== 1.0)) || cheatSizeMult !== 1;
        if (needsScale) {
            var centerX = playerScreenX + player.width / 2;
            var bottomY = playerScreenY + player.height;
            ctx.save();
            ctx.translate(centerX, bottomY);
            ctx.scale(player.scaleX * cheatSizeMult, player.scaleY * cheatSizeMult);
            ctx.translate(-centerX, -bottomY);
        }

        // Apply player idle effect (motion effect when standing still or always for float effect)
        var applyIdleEffect = PLAYER_IDLE_EFFECT !== 'none';
        if (applyIdleEffect && !window._idleEffectLogged) {
            console.log('Applying idle effect:', PLAYER_IDLE_EFFECT);
            window._idleEffectLogged = true;
        }
        if (applyIdleEffect) {
            var idleTime = Date.now() / 1000;
            var idleSpeed = PLAYER_IDLE_EFFECT_SPEED / 5; // Normalize around 1
            var idleIntensity = PLAYER_IDLE_EFFECT_INTENSITY / 5; // Normalize around 1
            var idleCenterX = playerScreenX + player.width / 2;
            var idleCenterY = playerScreenY + player.height / 2;

            ctx.save();
            ctx.translate(idleCenterX, idleCenterY);

            switch (PLAYER_IDLE_EFFECT) {
                case 'sway':
                    // Gentle rotation (pivot from bottom)
                    var swayAngle = Math.sin(idleTime * idleSpeed * 3) * 0.15 * idleIntensity;
                    ctx.translate(0, player.height / 2 - 4);
                    ctx.rotate(swayAngle);
                    ctx.translate(0, -(player.height / 2 - 4));
                    break;
                case 'pulse':
                    // Scale up and down
                    var pulseScale = 1 + Math.sin(idleTime * idleSpeed * 4) * 0.1 * idleIntensity;
                    ctx.scale(pulseScale, pulseScale);
                    break;
                case 'bounce':
                    // Move up and down (bouncy)
                    var bounceY = -Math.abs(Math.sin(idleTime * idleSpeed * 5)) * 4 * idleIntensity;
                    ctx.translate(0, bounceY);
                    break;
                case 'float':
                    // Gentle up and down floating
                    var floatY = Math.sin(idleTime * idleSpeed * 2) * 3 * idleIntensity;
                    ctx.translate(0, floatY);
                    break;
                case 'shimmer':
                    // Alpha pulsing
                    var shimmerAlpha = 0.7 + Math.sin(idleTime * idleSpeed * 6) * 0.3 * idleIntensity;
                    ctx.globalAlpha = ctx.globalAlpha * shimmerAlpha;
                    break;
                case 'wave':
                    // Horizontal wave distortion (skew)
                    var waveSkew = Math.sin(idleTime * idleSpeed * 4) * 0.1 * idleIntensity;
                    ctx.transform(1, 0, waveSkew, 1, 0, 0);
                    break;
                case 'shake':
                    // Random shake
                    var shakeX = (Math.random() - 0.5) * 4 * idleIntensity;
                    var shakeY = (Math.random() - 0.5) * 4 * idleIntensity;
                    ctx.translate(shakeX, shakeY);
                    break;
            }

            ctx.translate(-idleCenterX, -idleCenterY);
        }

        // Determine which sprite to use: custom sprite (if multiplayer with custom enabled) or default
        var spriteToUse = playerSprite;
        var spriteCols = PLAYER_SPRITESHEET_COLS;
        var spriteRows = PLAYER_SPRITESHEET_ROWS;

        // Use custom sprite if in multiplayer mode and custom sprite is loaded
        if (MULTIPLAYER_ALLOW_CUSTOM_SPRITES && myCustomSpriteLoaded && myCustomSpriteImage && myCustomSpriteImage.complete && myCustomSpriteImage.naturalWidth > 0) {
            spriteToUse = myCustomSpriteImage;
            spriteCols = myCustomSprite ? (myCustomSprite.cols || 1) : 1;
            spriteRows = myCustomSprite ? (myCustomSprite.rows || 1) : 1;
        }

        if (spriteToUse && spriteToUse.complete && spriteToUse.naturalWidth > 0) {
            // Draw sprite with animation - supports grid-based spritesheets
            var frameWidth = spriteToUse.naturalWidth / spriteCols;
            var frameHeight = spriteToUse.naturalHeight / spriteRows;
            var srcX = player.animFrame * frameWidth;
            var srcY = 0;

            // For multi-row spritesheets, select row based on direction
            // Convention: row 0=down, 1=left, 2=right, 3=up
            if (spriteRows > 1) {
                if (IS_TOPDOWN) {
                    switch (player.facingDirection) {
                        case 'down':  srcY = 0; break;
                        case 'left':  srcY = frameHeight; break;
                        case 'right': srcY = frameHeight * 2; break;
                        case 'up':    srcY = frameHeight * 3; break;
                        default: srcY = 0; break;
                    }
                } else {
                    // Platformer: use first row, flip for left direction
                    srcY = 0;
                }
            }

            ctx.save();
            ctx.imageSmoothingEnabled = false;

            if (IS_TOPDOWN && spriteRows <= 1) {
                // Top-down mode with single-row sprite: rotate based on facing direction
                var centerX = playerScreenX + player.width / 2;
                var centerY = playerScreenY + player.height / 2;
                ctx.translate(centerX, centerY);

                switch (player.facingDirection) {
                    case 'up':    ctx.rotate(-Math.PI / 2); break;
                    case 'down':  ctx.rotate(Math.PI / 2); break;
                    case 'left':  ctx.rotate(Math.PI); break;
                    case 'right': // No rotation needed
                    default: break;
                }

                ctx.drawImage(
                    spriteToUse,
                    srcX, srcY, frameWidth, frameHeight,
                    -player.width / 2, -player.height / 2, player.width, player.height
                );
            } else if (IS_TOPDOWN) {
                // Top-down mode with multi-row sprite: direction already set via srcY
                ctx.drawImage(
                    spriteToUse,
                    srcX, srcY, frameWidth, frameHeight,
                    playerScreenX, playerScreenY, player.width, player.height
                );
            } else if (!player.facingRight) {
                // Platformer mode: Flip horizontally for left-facing
                ctx.translate(playerScreenX + player.width, playerScreenY);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    spriteToUse,
                    srcX, srcY, frameWidth, frameHeight,
                    0, 0, player.width, player.height
                );
            } else {
                // Platformer mode: facing right (default)
                ctx.drawImage(
                    spriteToUse,
                    srcX, srcY, frameWidth, frameHeight,
                    playerScreenX, playerScreenY, player.width, player.height
                );
            }
            ctx.restore();
        } else {
            // Fallback: colored rectangle with face
            ctx.save();

            if (IS_TOPDOWN) {
                // Top-down mode: rotate based on facing direction
                var centerX = playerScreenX + player.width / 2;
                var centerY = playerScreenY + player.height / 2;
                ctx.translate(centerX, centerY);

                switch (player.facingDirection) {
                    case 'up':    ctx.rotate(-Math.PI / 2); break;
                    case 'down':  ctx.rotate(Math.PI / 2); break;
                    case 'left':  ctx.rotate(Math.PI); break;
                    case 'right': // No rotation needed
                    default: break;
                }

                // Draw centered rectangle
                ctx.fillStyle = player.color;
                ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

                // Player face (eyes looking right/forward)
                // Scale eye positions proportionally to player size (designed for 32x32 base)
                var eyeW = Math.max(2, Math.round(player.width * 0.125));
                var eyeH = Math.max(2, Math.round(player.height * 0.125));
                var pupilW = Math.max(1, Math.round(eyeW * 0.5));
                var pupilH = Math.max(1, Math.round(eyeH * 0.5));
                var eyeOffsetFromRight = Math.round(player.width * 0.3125);
                var topEyeY = Math.round(player.height * 0.1875);
                var bottomEyeY = Math.round(player.height * 0.4375);
                var pupilOffsetX = Math.round(eyeW * 0.5);
                var pupilOffsetY = Math.round(eyeH * 0.5);

                ctx.fillStyle = '#fff';
                ctx.fillRect(-player.width / 2 + player.width - eyeOffsetFromRight, -player.height / 2 + topEyeY, eyeW, eyeH);
                ctx.fillRect(-player.width / 2 + player.width - eyeOffsetFromRight, -player.height / 2 + bottomEyeY, eyeW, eyeH);
                ctx.fillStyle = '#333';
                ctx.fillRect(-player.width / 2 + player.width - eyeOffsetFromRight + pupilOffsetX, -player.height / 2 + topEyeY + pupilOffsetY, pupilW, pupilH);
                ctx.fillRect(-player.width / 2 + player.width - eyeOffsetFromRight + pupilOffsetX, -player.height / 2 + bottomEyeY + pupilOffsetY, pupilW, pupilH);
            } else {
                // Platformer mode
                if (player.facingRight) {
                    // Flip horizontally for right-facing (default sprite looks left)
                    ctx.translate(playerScreenX + player.width, playerScreenY);
                    ctx.scale(-1, 1);
                    playerScreenX = 0;
                    playerScreenY = 0;
                }

                ctx.fillStyle = player.color;
                ctx.fillRect(playerScreenX, playerScreenY, player.width, player.height);

                // Player face (eyes looking left by default, flipped when facing right)
                // Scale eye positions proportionally to player size (designed for 32x32 base)
                var eyeW = Math.max(2, Math.round(player.width * 0.125));
                var eyeH = Math.max(2, Math.round(player.height * 0.125));
                var pupilW = Math.max(1, Math.round(eyeW * 0.5));
                var pupilH = Math.max(1, Math.round(eyeH * 0.5));
                var leftEyeX = Math.round(player.width * 0.125);
                var rightEyeX = Math.round(player.width * 0.375);
                var eyeY = Math.round(player.height * 0.1875);
                var pupilOffsetX = Math.round(eyeW * 0.25);
                var pupilOffsetY = Math.round(eyeH * 0.5);

                ctx.fillStyle = '#fff';
                ctx.fillRect(playerScreenX + leftEyeX, playerScreenY + eyeY, eyeW, eyeH);
                ctx.fillRect(playerScreenX + rightEyeX, playerScreenY + eyeY, eyeW, eyeH);
                ctx.fillStyle = '#333';
                // Pupils on left side of each eye (will flip to right when facing right)
                ctx.fillRect(playerScreenX + leftEyeX + pupilOffsetX, playerScreenY + eyeY + pupilOffsetY, pupilW, pupilH);
                ctx.fillRect(playerScreenX + rightEyeX + pupilOffsetX, playerScreenY + eyeY + pupilOffsetY, pupilW, pupilH);
            }

            ctx.restore();
        }

        // Restore idle effect transformation
        if (applyIdleEffect) {
            ctx.restore();
        }

        // Restore squash & stretch and cheat size transformation
        if (needsScale) {
            ctx.restore();
        }

        // Reset alpha after player drawing (in case invincibility was active)
        ctx.globalAlpha = 1;

        // DEBUG: Draw hitbox visualization (toggle with H key)
        if (showHitboxDebug) {
            var hbDebug = getPlayerHitbox();
            var hbScreenX = hbDebug.x - camX;
            var hbScreenY = hbDebug.y - camY;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(hbScreenX, hbScreenY, hbDebug.width, hbDebug.height);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fillRect(hbScreenX, hbScreenY, hbDebug.width, hbDebug.height);
            // Show hitbox dimensions
            ctx.fillStyle = '#00ff00';
            ctx.font = '10px monospace';
            ctx.fillText(hbDebug.width + 'x' + hbDebug.height, hbScreenX, hbScreenY - 4);
        }

        // Multiplayer: Draw remote players
        if (MULTIPLAYER_ENABLED && multiplayerReady) {
            drawRemotePlayers(camX, camY);
        }

        // Draw terrain zones (rendered OVER player for underwater/swimming effect)
        drawTerrainZones(camX, camY);

        // Draw UI (score, lives)
        drawUI();
    }

    // Cache for terrain zone images
    var terrainZoneImageCache = {};

    function drawTerrainZones(camX, camY) {
        for (var i = 0; i < activeTerrainZones.length; i++) {
            var zone = activeTerrainZones[i];

            var screenX = zone.x - camX;
            var screenY = zone.y - camY;
            var zoneWidth = zone.width;
            var zoneHeight = zone.height;

            // Skip if off-screen
            if (screenX + zoneWidth < 0 || screenX > CANVAS_WIDTH ||
                screenY + zoneHeight < 0 || screenY > CANVAS_HEIGHT) {
                continue;
            }

            ctx.save();

            // Set opacity
            ctx.globalAlpha = zone.opacity || 0.6;

            // Try to draw tiled image if available
            var imageDrawn = false;
            if (zone.imageURL) {
                var img = getTerrainZoneImage(zone.imageURL);
                if (img && img.complete && img.naturalWidth > 0) {
                    // Create clipping region for the zone
                    ctx.beginPath();
                    ctx.rect(screenX, screenY, zoneWidth, zoneHeight);
                    ctx.clip();

                    // Tile the image across the zone
                    for (var ty = screenY; ty < screenY + zoneHeight; ty += img.naturalHeight) {
                        for (var tx = screenX; tx < screenX + zoneWidth; tx += img.naturalWidth) {
                            ctx.drawImage(img, tx, ty);
                        }
                    }
                    imageDrawn = true;
                }
            }

            // Draw color fill (as overlay if image exists, or as primary fill)
            if (zone.tintColor) {
                if (imageDrawn) {
                    ctx.globalAlpha = (zone.opacity || 0.6) * 0.5;
                }
                ctx.fillStyle = zone.tintColor;
                ctx.fillRect(screenX, screenY, zoneWidth, zoneHeight);
            } else if (!imageDrawn) {
                ctx.fillStyle = '#4a90d9';
                ctx.fillRect(screenX, screenY, zoneWidth, zoneHeight);
            }

            ctx.restore();
        }
    }

    function getTerrainZoneImage(url) {
        if (!url) return null;

        if (!terrainZoneImageCache[url]) {
            terrainZoneImageCache[url] = { loading: true };
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                terrainZoneImageCache[url] = img;
            };
            img.onerror = function() {
                terrainZoneImageCache[url] = { error: true };
            };
            img.src = url;
            return null;
        }

        var cached = terrainZoneImageCache[url];
        if (cached.loading || cached.error) return null;
        return cached;
    }

    function drawGameObjects(camX, camY) {
        for (var i = 0; i < activeObjects.length; i++) {
            var obj = activeObjects[i];
            if (!obj.active) continue;

            // Use object's custom size or default to RENDER_SIZE
            var objW = obj.width || RENDER_SIZE;
            var objH = obj.height || RENDER_SIZE;

            var screenX = obj.x - objW/2 - camX;
            var screenY = obj.y - objH/2 - camY;

            // Skip if off-screen
            if (screenX + objW < 0 || screenX > CANVAS_WIDTH ||
                screenY + objH < 0 || screenY > CANVAS_HEIGHT) {
                continue;
            }

            // Update animation - supports grid-based spritesheets
            var spriteCols = obj.spritesheetCols || obj.frameCount || 1;
            var spriteRows = obj.spritesheetRows || 1;
            var animSpeed = obj.animSpeed || 8;
            if (spriteCols > 1) {
                obj.animTimer++;
                if (obj.animTimer >= animSpeed) {
                    obj.animTimer = 0;
                    obj.animFrame = (obj.animFrame + 1) % spriteCols;
                }
            }

            // Check for custom sprite (from template)
            var spriteUrl = obj.sprite;
            var sprite = spriteUrl ? loadedSprites[spriteUrl] : null;
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                // Draw animated custom sprite - supports grid-based spritesheets
                ctx.imageSmoothingEnabled = false;
                var frameWidth = sprite.naturalWidth / spriteCols;
                var frameHeight = sprite.naturalHeight / spriteRows;
                var srcX = obj.animFrame * frameWidth;
                var srcY = 0;

                // For multi-row spritesheets, select row based on direction
                // Convention: row 0=down, 1=left, 2=right, 3=up
                if (spriteRows > 1 && IS_TOPDOWN) {
                    var dir = obj.wanderDirection || obj.direction || 'down';
                    if (typeof dir === 'number') {
                        dir = dir < 0 ? 'left' : 'right';
                    }
                    switch (dir) {
                        case 'down':  srcY = 0; break;
                        case 'left':  srcY = frameHeight; break;
                        case 'right': srcY = frameHeight * 2; break;
                        case 'up':    srcY = frameHeight * 3; break;
                        default: srcY = 0; break;
                    }
                }

                ctx.save();
                // Handle sprite rotation/flip based on object type and direction
                if (obj.type === 'npc' && IS_TOPDOWN && obj.wanderDirection && spriteRows <= 1) {
                    // NPC in top-down mode with single-row sprite: rotate based on wander direction
                    var centerX = screenX + objW / 2;
                    var centerY = screenY + objH / 2;
                    ctx.translate(centerX, centerY);
                    switch (obj.wanderDirection) {
                        case 'up':    ctx.rotate(-Math.PI / 2); break;
                        case 'down':  ctx.rotate(Math.PI / 2); break;
                        case 'left':  ctx.rotate(Math.PI); break;
                        case 'right': // No rotation
                        default: break;
                    }
                    ctx.drawImage(
                        sprite,
                        srcX, srcY, frameWidth, frameHeight,
                        -objW / 2, -objH / 2, objW, objH
                    );
                } else if (obj.type === 'enemy' && obj.direction < 0 && spriteRows <= 1) {
                    // Enemy moving left with single-row sprite: flip horizontally
                    ctx.translate(screenX + objW, screenY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(
                        sprite,
                        srcX, srcY, frameWidth, frameHeight,
                        0, 0, objW, objH
                    );
                } else {
                    // Default draw (includes multi-row sprites where direction is handled via srcY)
                    ctx.drawImage(
                        sprite,
                        srcX, srcY, frameWidth, frameHeight,
                        screenX, screenY, objW, objH
                    );
                }
                ctx.restore();
            } else if (obj.tileKey && tileTypes[obj.tileKey]) {
                // Try to draw with tile if tileKey is set (no sprite available)
                var tile = tileTypes[obj.tileKey];
                var tileDrawn = false;
                ctx.imageSmoothingEnabled = false;

                if (tile.custom && customTileImages[obj.tileKey]) {
                    // Custom tile
                    var ctImg;
                    if (tile.animated && typeof animatedTileImages !== 'undefined' && animatedTileImages[obj.tileKey]) {
                        var frameIdx = animatedTileCurrentFrames[obj.tileKey] || 0;
                        ctImg = animatedTileImages[obj.tileKey][frameIdx];
                    } else {
                        ctImg = customTileImages[obj.tileKey];
                    }
                    if (ctImg && ctImg.complete && ctImg.naturalWidth > 0) {
                        ctx.drawImage(ctImg, 0, 0, ctImg.naturalWidth, ctImg.naturalHeight, screenX, screenY, objW, objH);
                        tileDrawn = true;
                    }
                } else if (tileset.complete && tileset.naturalWidth > 0) {
                    // Tileset tile
                    ctx.drawImage(tileset,
                        tile.col * TILE_SIZE, tile.row * TILE_SIZE, TILE_SIZE, TILE_SIZE,
                        screenX, screenY, objW, objH);
                    tileDrawn = true;
                }

                if (!tileDrawn) {
                    // If tile couldn't be drawn, fall through to symbol rendering
                    var color = obj.color || '#888';
                    var emoji = obj.symbol || '?';
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(screenX + objW/2, screenY + objH/2, Math.min(objW, objH)/2 * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = Math.max(12, Math.min(objW, objH) * 0.5) + 'px Arial, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(emoji, screenX + objW/2, screenY + objH/2);
                }
            } else {
                // Fallback to symbol/emoji rendering at object's size
                // Use object's template color and symbol if available
                var color = obj.color;
                var emoji = obj.symbol;

                // Default fallbacks if template properties not set
                if (!color || !emoji) {
                    switch (obj.type) {
                        case 'enemy': color = color || '#e74c3c'; emoji = emoji || '👾'; break;
                        case 'collectible': color = color || '#f1c40f'; emoji = emoji || '🪙'; break;
                        case 'hazard': color = color || '#7f8c8d'; emoji = emoji || '▲'; break;
                        case 'powerup': color = color || '#e91e63'; emoji = emoji || '❤️'; break;
                        case 'spring': color = color || '#9b59b6'; emoji = emoji || '🔼'; break;
                        case 'movingPlatform': color = color || '#8B4513'; emoji = emoji || '═'; break;
                        case 'checkpoint':
                            // Use activated color if checkpoint is active
                            color = obj.activated ? (obj.activatedColor || '#2ecc71') : (color || '#3498db');
                            emoji = emoji || '⛳';
                            break;
                        case 'goal': color = color || '#2ecc71'; emoji = emoji || '🚩'; break;
                        case 'npc': color = color || '#3498db'; emoji = emoji || '👤'; break;
                        case 'door': color = color || '#8b4513'; emoji = emoji || '🚪'; break;
                        case 'mysteryBlock': color = color || '#f1c40f'; emoji = emoji || '?'; break;
                        default: color = color || '#fff'; emoji = emoji || '?';
                    }
                }

                // Draw background shapes for certain object types (not in top-down RPG mode)
                if (!IS_TOPDOWN && (obj.type === 'enemy' || obj.type === 'collectible')) {
                    // Circle background for enemies and collectibles (platformer only)
                    ctx.beginPath();
                    ctx.arc(screenX + objW/2, screenY + objH/2, Math.min(objW, objH)/2 * 0.8, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.8;
                    ctx.fill();
                    ctx.globalAlpha = 1;
                } else if (!IS_TOPDOWN && obj.type === 'spring') {
                    // Rounded rectangle background for springs (more visible on mobile)
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.9;
                    ctx.beginPath();
                    var springPadding = 2;
                    ctx.roundRect(screenX + springPadding, screenY + springPadding,
                                  objW - springPadding * 2, objH - springPadding * 2, 4);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                } else if (!IS_TOPDOWN && obj.type === 'movingPlatform') {
                    // Skip drawing collapsed platforms
                    if (obj.collapseState === 'collapsed') {
                        continue;
                    }

                    // Draw moving platform
                    var platX = screenX;
                    var platY = screenY;

                    // Apply shake offset for shaking platforms
                    if (obj.collapseState === 'shaking' && obj.shakeOffset) {
                        platX += obj.shakeOffset;
                    }

                    var tileDrawn = false;

                    // Try to draw with tile if tileKey is set
                    if (obj.tileKey) {
                        var tile = tileTypes[obj.tileKey];
                        if (tile) {
                            ctx.imageSmoothingEnabled = false;
                            // Tile platform across its width/height
                            var tilesX = Math.ceil(objW / RENDER_SIZE);
                            var tilesY = Math.ceil(objH / RENDER_SIZE);

                            for (var ty = 0; ty < tilesY; ty++) {
                                for (var tx = 0; tx < tilesX; tx++) {
                                    var drawX = platX + tx * RENDER_SIZE;
                                    var drawY = platY + ty * RENDER_SIZE;
                                    // Destination size (in rendered/world coordinates)
                                    var destW = Math.min(RENDER_SIZE, objW - tx * RENDER_SIZE);
                                    var destH = Math.min(RENDER_SIZE, objH - ty * RENDER_SIZE);
                                    // Source size (portion of the source tile to read)
                                    var srcW = destW / TILE_SCALE;
                                    var srcH = destH / TILE_SCALE;

                                    if (tile.custom && customTileImages[obj.tileKey]) {
                                        // Custom tile (check for animated)
                                        var ctImg;
                                        if (tile.animated && typeof animatedTileImages !== 'undefined' && animatedTileImages[obj.tileKey]) {
                                            var frameIdx = animatedTileCurrentFrames[obj.tileKey] || 0;
                                            ctImg = animatedTileImages[obj.tileKey][frameIdx];
                                        } else {
                                            ctImg = customTileImages[obj.tileKey];
                                        }
                                        if (ctImg && ctImg.complete && ctImg.naturalWidth > 0) {
                                            ctx.drawImage(ctImg, 0, 0, srcW, srcH, drawX, drawY, destW, destH);
                                            tileDrawn = true;
                                        }
                                    } else if (tileset.complete && tileset.naturalWidth > 0) {
                                        // Tileset tile
                                        ctx.drawImage(tileset,
                                            tile.col * TILE_SIZE, tile.row * TILE_SIZE, srcW, srcH,
                                            drawX, drawY, destW, destH);
                                        tileDrawn = true;
                                    }
                                }
                            }
                        }
                    }

                    // Fallback to solid color if no tile drawn
                    if (!tileDrawn) {
                        ctx.fillStyle = color;
                        ctx.fillRect(platX, platY, objW, objH);

                        // Light edge on top (3D effect)
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.fillRect(platX, platY, objW, 2);

                        // Dark edge on bottom (3D effect)
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                        ctx.fillRect(platX, platY + objH - 2, objW, 2);
                    }

                    // Pulsing outline for inactive touch-activated platforms (configurable)
                    if (obj.activation === 'touch' && !obj.activated && obj.showInactiveOutline) {
                        var pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
                        // Convert hex color to rgba with pulse alpha
                        var outlineColor = obj.inactiveOutlineColor || '#ffff00';
                        var r = parseInt(outlineColor.slice(1, 3), 16);
                        var g = parseInt(outlineColor.slice(3, 5), 16);
                        var b = parseInt(outlineColor.slice(5, 7), 16);
                        ctx.strokeStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + pulse + ')';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(platX, platY, objW, objH);
                    }
                } else if (obj.type === 'npc') {
                    // Circle background for NPCs (platformer only)
                    if (!IS_TOPDOWN) {
                        ctx.beginPath();
                        ctx.arc(screenX + objW/2, screenY + objH/2, Math.min(objW, objH)/2 * 0.8, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.globalAlpha = 0.8;
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }

                    // Draw direction indicator for wandering NPCs (top-down only)
                    if (IS_TOPDOWN && obj.behavior === 'wander' && obj.wanderDirection) {
                        ctx.fillStyle = '#fff';
                        ctx.globalAlpha = 0.7;
                        var indicatorSize = 4;
                        var cx = screenX + objW / 2;
                        var cy = screenY + objH / 2;
                        var offset = Math.min(objW, objH) / 2 - indicatorSize;
                        switch (obj.wanderDirection) {
                            case 'up':
                                ctx.beginPath();
                                ctx.moveTo(cx, cy - offset);
                                ctx.lineTo(cx - indicatorSize, cy - offset + indicatorSize * 2);
                                ctx.lineTo(cx + indicatorSize, cy - offset + indicatorSize * 2);
                                ctx.fill();
                                break;
                            case 'down':
                                ctx.beginPath();
                                ctx.moveTo(cx, cy + offset);
                                ctx.lineTo(cx - indicatorSize, cy + offset - indicatorSize * 2);
                                ctx.lineTo(cx + indicatorSize, cy + offset - indicatorSize * 2);
                                ctx.fill();
                                break;
                            case 'left':
                                ctx.beginPath();
                                ctx.moveTo(cx - offset, cy);
                                ctx.lineTo(cx - offset + indicatorSize * 2, cy - indicatorSize);
                                ctx.lineTo(cx - offset + indicatorSize * 2, cy + indicatorSize);
                                ctx.fill();
                                break;
                            case 'right':
                                ctx.beginPath();
                                ctx.moveTo(cx + offset, cy);
                                ctx.lineTo(cx + offset - indicatorSize * 2, cy - indicatorSize);
                                ctx.lineTo(cx + offset - indicatorSize * 2, cy + indicatorSize);
                                ctx.fill();
                                break;
                        }
                        ctx.globalAlpha = 1;
                    }
                } else if (obj.type === 'door') {
                    // Rounded rectangle background for doors
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.9;
                    ctx.beginPath();
                    var doorPadding = 2;
                    ctx.roundRect(screenX + doorPadding, screenY + doorPadding,
                                  objW - doorPadding * 2, objH - doorPadding * 2, 4);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                } else if (obj.type === 'mysteryBlock') {
                    // Mystery Block - shows depleted state differently
                    var blockState = mysteryBlockStates[i];
                    var isDepleted = blockState && blockState.depleted;
                    var emptyDrawn = false;

                    if (isDepleted) {
                        // Check for empty sprite URL
                        if (obj.emptySprite && loadedSprites[obj.emptySprite]) {
                            var emptyImg = loadedSprites[obj.emptySprite];
                            if (emptyImg.complete && emptyImg.naturalWidth > 0) {
                                ctx.imageSmoothingEnabled = false;
                                ctx.drawImage(emptyImg, screenX, screenY, objW, objH);
                                emptyDrawn = true;
                            }
                        }
                        // Check for empty tile key
                        if (!emptyDrawn && obj.emptyTileKey && tileTypes[obj.emptyTileKey]) {
                            var emptyTile = tileTypes[obj.emptyTileKey];
                            // Calculate source size (scale down from rendered size)
                            var srcW = objW / TILE_SCALE;
                            var srcH = objH / TILE_SCALE;
                            if (emptyTile.custom && customTileImages[obj.emptyTileKey]) {
                                // Custom tile (check for animated)
                                var ctImg;
                                if (emptyTile.animated && typeof animatedTileImages !== 'undefined' && animatedTileImages[obj.emptyTileKey]) {
                                    var frameIdx = animatedTileCurrentFrames[obj.emptyTileKey] || 0;
                                    ctImg = animatedTileImages[obj.emptyTileKey][frameIdx];
                                } else {
                                    ctImg = customTileImages[obj.emptyTileKey];
                                }
                                if (ctImg && ctImg.complete && ctImg.naturalWidth > 0) {
                                    ctx.imageSmoothingEnabled = false;
                                    ctx.drawImage(ctImg, 0, 0, srcW, srcH, screenX, screenY, objW, objH);
                                    emptyDrawn = true;
                                }
                            } else if (tileset.complete && tileset.naturalWidth > 0) {
                                ctx.imageSmoothingEnabled = false;
                                ctx.drawImage(tileset,
                                    emptyTile.col * TILE_SIZE, emptyTile.row * TILE_SIZE, srcW, srcH,
                                    screenX, screenY, objW, objH);
                                emptyDrawn = true;
                            }
                        }
                        // Fall back to empty color
                        if (!emptyDrawn) {
                            ctx.fillStyle = obj.emptyColor || '#8B4513';
                            ctx.fillRect(screenX, screenY, objW, objH);
                            // 3D beveled edges for empty state
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                            ctx.fillRect(screenX, screenY, objW, 3);
                            ctx.fillRect(screenX, screenY, 3, objH);
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                            ctx.fillRect(screenX, screenY + objH - 3, objW, 3);
                            ctx.fillRect(screenX + objW - 3, screenY, 3, objH);
                        }
                    } else {
                        // Active block - draw with color and "?" symbol
                        ctx.fillStyle = color || '#f1c40f';
                        ctx.fillRect(screenX, screenY, objW, objH);

                        // 3D beveled edges
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                        ctx.fillRect(screenX, screenY, objW, 3); // Top highlight
                        ctx.fillRect(screenX, screenY, 3, objH); // Left highlight

                        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                        ctx.fillRect(screenX, screenY + objH - 3, objW, 3); // Bottom shadow
                        ctx.fillRect(screenX + objW - 3, screenY, 3, objH); // Right shadow

                        // Draw "?" symbol
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold ' + Math.floor(objH * 0.6) + 'px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('?', screenX + objW / 2, screenY + objH / 2);
                    }
                }

                // Draw symbol/emoji - white for types with colored backgrounds, template color for others
                // Springs now have a background, so use white emoji on colored bg
                // Skip emoji for movingPlatform (has custom directional arrows) and mysteryBlock (has custom rendering)
                if (obj.type !== 'movingPlatform' && obj.type !== 'mysteryBlock') {
                    ctx.fillStyle = (obj.type === 'hazard' || obj.type === 'goal' || obj.type === 'powerup' || obj.type === 'checkpoint') ? color : '#fff';
                    ctx.font = (Math.min(objW, objH) * 0.7) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(emoji, screenX + objW/2, screenY + objH/2);
                }
            }
        }
    }

    function drawUI() {
        // Score display (or inventory hint in RPG mode)
        ctx.save();
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;

        if (IS_TOPDOWN) {
            // RPG mode: Show item count summary and inventory hint
            var itemCount = 0;
            var itemTypes = Object.keys(inventory).length;
            for (var key in inventory) {
                itemCount += inventory[key].count;
            }
            ctx.fillText('Items: ' + itemCount + ' (Press I)', 10, 30);
        } else {
            // Platformer mode: Show score
            ctx.fillText('Score: ' + score, 10, 30);
        }

        // Health bar display
        var healthBarX = 10;
        var healthBarY = 45;
        var healthBarWidth = 100;
        var healthBarHeight = 16;
        var healthPercent = Math.max(0, Math.min(1, lives / maxLives));

        // Draw heart icon
        ctx.font = '16px sans-serif';
        ctx.fillText('❤️', healthBarX, healthBarY + 13);

        // Health bar background (dark)
        var barX = healthBarX + 24;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, healthBarY, healthBarWidth, healthBarHeight);

        // Health bar fill (green to yellow to red based on health)
        var barColor;
        if (healthPercent > 0.6) {
            barColor = '#2ecc71'; // Green
        } else if (healthPercent > 0.3) {
            barColor = '#f1c40f'; // Yellow
        } else {
            barColor = '#e74c3c'; // Red
        }
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);

        // Health bar border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, healthBarY, healthBarWidth, healthBarHeight);

        // Ammo display (if projectiles enabled and in ammo mode)
        if (PROJECTILE_ENABLED && PROJECTILE_MODE === 'ammo') {
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = currentAmmo > 0 ? '#ffff00' : '#ff6666';
            ctx.fillText('Ammo: ' + currentAmmo, 10, 85);
        }

        // Level name (top right)
        ctx.textAlign = 'right';
        ctx.font = 'bold 16px sans-serif';
        var currentLevel = allLevels[currentLevelIndex];
        ctx.fillText(currentLevel.name, CANVAS_WIDTH - 10, 25);

        // Goal condition info
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#ffcc00';
        var goalText = '';
        switch (goalCondition) {
            case 'goal':
                goalText = '🚩 Reach the Goal';
                break;
            case 'collect_all':
                goalText = '⭐ Collect: ' + collectiblesCollected + '/' + collectiblesTotal;
                break;
            case 'score':
                goalText = '🎯 Score: ' + score + '/' + requiredScore;
                break;
            case 'survive':
                var remaining = Math.max(0, Math.ceil(timeLimit - levelTimer));
                goalText = '⏱️ Survive: ' + remaining + 's';
                break;
        }
        ctx.fillText(goalText, CANVAS_WIDTH - 10, 45);

        // Run timer display (speedrun feature)
        if (RUN_TIMER_ENABLED) {
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#4ecdc4';  // Teal color for visibility
            var displayTime = RUN_TIMER_MODE === 'cumulative' ? (totalRunTime + runTimer) : runTimer;
            ctx.fillText('⏱️ ' + formatRunTime(displayTime), CANVAS_WIDTH - 10, 65);
        }

        ctx.restore();

        // Game over screen
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.font = 'bold 48px sans-serif';
            ctx.fillStyle = '#e74c3c';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 40);
            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#fff';
            if (IS_TOPDOWN) {
                var totalItems = 0;
                for (var k in inventory) totalItems += inventory[k].count;
                ctx.fillText('Items Collected: ' + totalItems, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
            } else {
                ctx.fillText('Final Score: ' + score, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
            }

            // Show final time (speedrun feature)
            if (RUN_TIMER_ENABLED) {
                ctx.font = '20px sans-serif';
                ctx.fillStyle = '#4ecdc4';
                var finalTime = RUN_TIMER_MODE === 'cumulative' ? (totalRunTime + runTimer) : runTimer;
                ctx.fillText('Time: ' + formatRunTime(finalTime), CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30);
            }

            // Draw restart button
            restartButton.width = 180;
            restartButton.height = 50;
            restartButton.x = CANVAS_WIDTH/2 - restartButton.width/2;
            restartButton.y = CANVAS_HEIGHT/2 + (RUN_TIMER_ENABLED ? 60 : 30);
            restartButton.visible = true;

            // Button background with gradient effect
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.roundRect(restartButton.x, restartButton.y, restartButton.width, restartButton.height, 10);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Button text
            ctx.font = 'bold 20px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText('🔄 RESTART', CANVAS_WIDTH/2, restartButton.y + restartButton.height/2 + 7);
        } else {
            restartButton.visible = false;
        }

        // Level complete screen
        if (levelComplete) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.textAlign = 'center';

            var currentLevel = allLevels[currentLevelIndex];
            var hasNextLevel = nextLevelId && findLevelIndexById(nextLevelId) >= 0;

            if (hasNextLevel) {
                // Show level complete, next level coming
                ctx.font = 'bold 36px sans-serif';
                ctx.fillStyle = '#2ecc71';
                ctx.fillText(currentLevel.name + ' Complete!', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 40);
                ctx.font = '24px sans-serif';
                ctx.fillStyle = '#fff';
                if (IS_TOPDOWN) {
                    var totalItems = 0;
                    for (var k in inventory) totalItems += inventory[k].count;
                    ctx.fillText('Items: ' + totalItems, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                } else {
                    ctx.fillText('Score: ' + score, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                // Show level time (speedrun feature)
                if (RUN_TIMER_ENABLED) {
                    ctx.font = '18px sans-serif';
                    ctx.fillStyle = '#4ecdc4';
                    var levelTime = RUN_TIMER_MODE === 'cumulative' ? (totalRunTime + runTimer) : runTimer;
                    ctx.fillText('Time: ' + formatRunTime(levelTime), CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 25);
                }
                ctx.font = '18px sans-serif';
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('Loading next level...', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + (RUN_TIMER_ENABLED ? 50 : 35));
            } else {
                // Game complete - all levels done!
                ctx.font = 'bold 48px sans-serif';
                ctx.fillStyle = '#ffd700';
                ctx.fillText('YOU WIN!', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 60);
                ctx.font = '24px sans-serif';
                ctx.fillStyle = '#fff';
                if (IS_TOPDOWN) {
                    var totalItems = 0;
                    for (var k in inventory) totalItems += inventory[k].count;
                    ctx.fillText('Items Collected: ' + totalItems, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 20);
                } else {
                    ctx.fillText('Final Score: ' + score, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 20);
                }
                ctx.font = '14px sans-serif';
                ctx.fillText('Levels Completed: ' + allLevels.length, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 10);

                // Show final time (speedrun feature)
                if (RUN_TIMER_ENABLED) {
                    ctx.font = '20px sans-serif';
                    ctx.fillStyle = '#4ecdc4';
                    var finalTime = RUN_TIMER_MODE === 'cumulative' ? (totalRunTime + runTimer) : runTimer;
                    ctx.fillText('Final Time: ' + formatRunTime(finalTime), CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 35);
                }

                // Draw play again button
                restartButton.width = 200;
                restartButton.height = 50;
                restartButton.x = CANVAS_WIDTH/2 - restartButton.width/2;
                restartButton.y = CANVAS_HEIGHT/2 + (RUN_TIMER_ENABLED ? 70 : 40);
                restartButton.visible = true;

                // Button background
                ctx.fillStyle = '#2ecc71';
                ctx.beginPath();
                ctx.roundRect(restartButton.x, restartButton.y, restartButton.width, restartButton.height, 10);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Button text
                ctx.font = 'bold 20px sans-serif';
                ctx.fillStyle = '#fff';
                ctx.fillText('🎮 PLAY AGAIN', CANVAS_WIDTH/2, restartButton.y + restartButton.height/2 + 7);
            }
        }

        // Checkpoint message display
        if (checkpointMessage.timer > 0) {
            checkpointMessage.timer--;
            ctx.save();
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Fade out effect - start fading at 30 frames remaining
            var alpha = checkpointMessage.timer > 30 ? 1 : checkpointMessage.timer / 30;
            ctx.fillStyle = 'rgba(46, 204, 113, ' + alpha + ')'; // Green color
            ctx.shadowColor = 'rgba(0, 0, 0, ' + alpha + ')';
            ctx.shadowBlur = 4;
            ctx.fillText(checkpointMessage.text, CANVAS_WIDTH/2, CANVAS_HEIGHT/3);
            ctx.restore();
        }

        // Progress message display (RPG mode - saved/loaded/cleared)
        if (progressMessage.timer > 0) {
            progressMessage.timer--;
            ctx.save();
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Fade out effect - start fading at 30 frames remaining
            var palpha = progressMessage.timer > 30 ? 1 : progressMessage.timer / 30;
            ctx.fillStyle = 'rgba(155, 89, 182, ' + palpha + ')'; // Purple color
            ctx.shadowColor = 'rgba(0, 0, 0, ' + palpha + ')';
            ctx.shadowBlur = 4;
            ctx.fillText(progressMessage.text, CANVAS_WIDTH/2, 50);
            ctx.restore();
        }

        // Cheat message display
        if (CHEATS_ENABLED && cheatMessage.timer > 0) {
            cheatMessage.timer--;
            ctx.save();
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Fade out effect - start fading at 30 frames remaining
            var calpha = cheatMessage.timer > 30 ? 1 : cheatMessage.timer / 30;
            ctx.fillStyle = 'rgba(255, 255, 0, ' + calpha + ')'; // Yellow color
            ctx.strokeStyle = 'rgba(0, 0, 0, ' + calpha + ')';
            ctx.lineWidth = 3;
            ctx.strokeText(cheatMessage.text, CANVAS_WIDTH/2, 80);
            ctx.fillText(cheatMessage.text, CANVAS_WIDTH/2, 80);
            ctx.restore();
        }

        // Active cheat effects indicator (bottom of screen)
        if (CHEATS_ENABLED) {
            var cheatIndicators = [];
            if (activeCheatEffects.invincibility > 0) cheatIndicators.push('GOD');
            if (activeCheatEffects.speedBoost > 0) cheatIndicators.push('SPEED');
            if (activeCheatEffects.jumpBoost > 0) cheatIndicators.push('JUMP');
            if (activeCheatEffects.lowGravity > 0) cheatIndicators.push('MOON');
            if (activeCheatEffects.oneHitKill) cheatIndicators.push('1HIT');
            if (activeCheatEffects.turboFire > 0) cheatIndicators.push('TURBO');
            if (activeCheatEffects.tinyMode > 0) cheatIndicators.push('TINY');
            if (activeCheatEffects.giantMode > 0) cheatIndicators.push('GIANT');

            if (cheatIndicators.length > 0) {
                ctx.save();
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = '#ff0';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 2;
                ctx.fillText('CHEATS: ' + cheatIndicators.join(' | '), 10, CANVAS_HEIGHT - 10);
                ctx.restore();
            }
        }

        // NPC/Door interaction UI (Top-Down RPG)
        if (IS_TOPDOWN) {
            drawInteractionPrompt();
            drawDialogue();
            drawInventory();
        }
    }

    // Draw inventory panel (Top-Down RPG)
    function drawInventory() {
        if (!inventoryOpen) return;

        // Semi-transparent dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Inventory panel dimensions
        var panelWidth = Math.min(400, CANVAS_WIDTH - 40);
        var panelHeight = Math.min(350, CANVAS_HEIGHT - 40);
        var panelX = (CANVAS_WIDTH - panelWidth) / 2;
        var panelY = (CANVAS_HEIGHT - panelHeight) / 2;

        // Panel background with border
        ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
        ctx.fill();

        ctx.strokeStyle = '#c8956c';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Panel title
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#c8956c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('📦 Inventory', CANVAS_WIDTH / 2, panelY + 15);

        // Close hint
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#888';
        var closeHint = (ENABLE_MOBILE_CONTROLS && IS_TOUCH_DEVICE) ? 'Tap 📦 to close' : 'Press I or ESC to close';
        ctx.fillText(closeHint, CANVAS_WIDTH / 2, panelY + 45);

        // Clear progress hint (only if saving is enabled)
        if (SAVE_RPG_PROGRESS) {
            ctx.fillStyle = '#9b59b6';
            ctx.fillText('Press Delete to clear saved progress', CANVAS_WIDTH / 2, panelY + 60);
        }

        // Item grid
        var gridStartY = panelY + (SAVE_RPG_PROGRESS ? 85 : 75);
        var gridStartX = panelX + 20;
        var itemSize = 64;
        var itemPadding = 10;
        var itemsPerRow = Math.floor((panelWidth - 40) / (itemSize + itemPadding));

        var inventoryKeys = Object.keys(inventory);

        if (inventoryKeys.length === 0) {
            // Empty inventory message
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No items collected yet', CANVAS_WIDTH / 2, panelY + panelHeight / 2 + 20);
        } else {
            // Draw each item
            for (var i = 0; i < inventoryKeys.length; i++) {
                var key = inventoryKeys[i];
                var item = inventory[key];
                var row = Math.floor(i / itemsPerRow);
                var col = i % itemsPerRow;

                var itemX = gridStartX + col * (itemSize + itemPadding);
                var itemY = gridStartY + row * (itemSize + itemPadding + 20);

                // Check if item fits in panel
                if (itemY + itemSize + 20 > panelY + panelHeight - 10) break;

                // Always look up fresh template data from collectibleTemplates
                // This ensures old localStorage data still gets proper template info
                var freshTemplate = collectibleTemplates.find(function(t) { return t.id === key; });
                var template = freshTemplate || item.template || {};

                // Item slot background
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.roundRect(itemX, itemY, itemSize, itemSize, 8);
                ctx.fill();

                // Draw item sprite or fall back to symbol
                var spriteUrl = template.sprite;
                var sprite = spriteUrl ? loadedSprites[spriteUrl] : null;
                if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                    // Draw sprite image (use first frame only for inventory)
                    ctx.imageSmoothingEnabled = false;
                    var spriteCols = template.spritesheetCols || template.frameCount || 1;
                    var spriteRows = template.spritesheetRows || 1;
                    var frameWidth = sprite.naturalWidth / spriteCols;
                    var frameHeight = sprite.naturalHeight / spriteRows;
                    // Draw centered in slot with padding
                    var drawSize = itemSize - 12;
                    var drawX = itemX + 6;
                    var drawY = itemY + 6;
                    ctx.drawImage(sprite, 0, 0, frameWidth, frameHeight, drawX, drawY, drawSize, drawSize);
                } else {
                    // Fall back to symbol/emoji
                    ctx.font = '32px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = template.color || '#fff';
                    ctx.fillText(template.symbol || '?', itemX + itemSize / 2, itemY + itemSize / 2);
                }

                // Item count badge
                ctx.font = 'bold 14px sans-serif';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 2;
                ctx.fillText('x' + item.count, itemX + itemSize - 4, itemY + itemSize - 4);
                ctx.shadowBlur = 0;

                // Item name below
                ctx.font = '11px sans-serif';
                ctx.fillStyle = '#aaa';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                var name = template.name || key;
                if (name.length > 10) name = name.substring(0, 9) + '…';
                ctx.fillText(name, itemX + itemSize / 2, itemY + itemSize + 4);
            }
        }

        // Total value at bottom
        var totalValue = 0;
        for (var k in inventory) {
            var freshTmpl = collectibleTemplates.find(function(t) { return t.id === k; });
            var tmpl = freshTmpl || inventory[k].template || {};
            totalValue += inventory[k].count * (tmpl.value || 0);
        }
        if (totalValue > 0) {
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#f1c40f';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('Total Value: ' + totalValue, CANVAS_WIDTH / 2, panelY + panelHeight - 15);
        }
    }

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // THE GAME LOOP - The heartbeat of the game
    // ═══════════════════════════════════════════════════════════════════════════
    // This is the core of every game! The game loop runs continuously:
    //
    // 1. update() - Process input, physics, collisions (game logic)
    // 2. draw()   - Render everything to the screen
    // 3. requestAnimationFrame(gameLoop) - Schedule the next frame
    //
    // requestAnimationFrame is special:
    // - It aims for 60 frames per second (smooth animation)
    // - It pauses when the tab is hidden (saves battery/CPU)
    // - It syncs with your monitor's refresh rate
    //
    // This creates the illusion of continuous motion, just like a movie!
    //
    // UNDERSTANDING FRAME RATE:
    // At 60 FPS, each frame lasts ~16.7 milliseconds.
    // All your update() and draw() code must complete in that time!
    //
    // PRO TIP: If your game stutters, you might be doing too much work.
    // Try to optimize by: drawing fewer objects, simplifying physics, etc.
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    // Prevent double initialization
    if (window.gameInitialized) {
        console.error('GAME ALREADY INITIALIZED - preventing double init');
        return;
    }
    window.gameInitialized = true;

    // Load the starting level BEFORE starting game loop
    loadLevel(startingLevelIndex);

    // Load saved RPG progress (inventory, checkpoint) from localStorage
    if (loadRPGProgress()) {
        // If checkpoint was restored, reposition player there
        if (activeCheckpoint) {
            player.x = activeCheckpoint.x;
            player.y = activeCheckpoint.y;
            player.speedX = 0;
            player.speedY = 0;
        }
    }

    // Frame rate limiting for consistent gameplay on high refresh rate monitors
    var targetFPS = 60;
    var frameInterval = 1000 / targetFPS;
    var lastFrameTime = 0;

    function gameLoop(currentTime) {
        requestAnimationFrame(gameLoop);

        // Calculate time since last frame
        var deltaTime = currentTime - lastFrameTime;

        // Only update if enough time has passed (cap at 60fps)
        if (deltaTime >= frameInterval) {
            // Adjust lastFrameTime to account for any extra time beyond frameInterval
            // This prevents drift and keeps timing accurate
            lastFrameTime = currentTime - (deltaTime % frameInterval);

            update();
            draw();
        }
    }

${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // GAME INITIALIZATION - Start everything up!
    // ═══════════════════════════════════════════════════════════════════════════
    // findStartPosition() places the player at the spawn point or finds a valid spot.
    // gameLoop() kicks off the continuous update-draw cycle.
    //
    // CONGRATULATIONS! You've read through an entire game engine!
    //
    // NEXT STEPS TO EXTEND YOUR GAME:
    // ┌───────────────────────────────────────────────────────────────────────┐
    // │ 1. ADD COINS                                                          │
    // │    - Create: var coins = [{x: 100, y: 200}, {x: 150, y: 200}];        │
    // │    - In update(): check collision with player, remove coin, add score │
    // │    - In draw(): draw each coin as a circle or image                   │
    // ├───────────────────────────────────────────────────────────────────────┤
    // │ 2. ADD ENEMIES                                                        │
    // │    - Create: var enemies = [{x: 300, y: 200, speedX: 1}];             │
    // │    - In update(): move enemies, check walls, check player collision   │
    // │    - In draw(): draw each enemy                                       │
    // ├───────────────────────────────────────────────────────────────────────┤
    // │ 3. ADD A GOAL/EXIT                                                    │
    // │    - Create: var goal = {x: 1500, y: 200, width: 32, height: 32};     │
    // │    - In update(): if player touches goal, show "You Win!" or go to    │
    // │      next level                                                       │
    // ├───────────────────────────────────────────────────────────────────────┤
    // │ 4. ADD SOUND                                                          │
    // │    - var jumpSound = new Audio('jump.mp3');                           │
    // │    - When player jumps: jumpSound.play();                             │
    // ├───────────────────────────────────────────────────────────────────────┤
    // │ 5. ADD A SCORE DISPLAY                                                │
    // │    - var score = 0;                                                   │
    // │    - At end of draw(): ctx.fillText('Score: ' + score, 10, 30);       │
    // └───────────────────────────────────────────────────────────────────────┘
    //
    // Happy coding! Remember: every game developer started exactly where you are.
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}
${includeComments ? `    // ═══════════════════════════════════════════════════════════════════════════
    // MOBILE TOUCH CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    // On touch devices, virtual buttons are shown for controlling the player.
    // Touch events are mapped to the same keys object used by keyboard controls.
    // ═══════════════════════════════════════════════════════════════════════════
` : ''}    // Initialize mobile controls if enabled and on touch device
    if (ENABLE_MOBILE_CONTROLS && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        console.log('Mobile controls enabled - touch device detected');
        var mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.style.display = 'block';
            console.log('Mobile controls div shown');
        } else {
            console.error('Mobile controls div not found!');
        }

        // Track which touches are on which buttons for multi-touch support
        var activeTouches = {};

        // Helper function to add touch handlers to a button with multi-touch support
        function addTouchControl(elementId, keyName) {
            var btn = document.getElementById(elementId);
            if (!btn) {
                console.error('Mobile button not found:', elementId);
                return;
            }

            console.log('Touch control added:', elementId, '-> key:', keyName);

            btn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                // Store all touch identifiers for this button
                for (var i = 0; i < e.targetTouches.length; i++) {
                    var touch = e.targetTouches[i];
                    activeTouches[touch.identifier] = keyName;
                }
                console.log('Touch start:', elementId, 'setting keys[' + keyName + '] = true');
                keys[keyName] = true;
            }, {passive: false});

            btn.addEventListener('touchend', function(e) {
                e.preventDefault();
                // Remove ended touches
                for (var i = 0; i < e.changedTouches.length; i++) {
                    var touch = e.changedTouches[i];
                    delete activeTouches[touch.identifier];
                }
                // Only release key if no touches remain on this button
                var stillTouched = false;
                for (var touchId in activeTouches) {
                    if (activeTouches[touchId] === keyName) {
                        stillTouched = true;
                        break;
                    }
                }
                if (!stillTouched) {
                    console.log('Touch end:', elementId, 'setting keys[' + keyName + '] = false');
                    keys[keyName] = false;
                }
            }, {passive: false});

            btn.addEventListener('touchcancel', function(e) {
                e.preventDefault();
                // Remove cancelled touches
                for (var i = 0; i < e.changedTouches.length; i++) {
                    var touch = e.changedTouches[i];
                    delete activeTouches[touch.identifier];
                }
                // Only release key if no touches remain on this button
                var stillTouched = false;
                for (var touchId in activeTouches) {
                    if (activeTouches[touchId] === keyName) {
                        stillTouched = true;
                        break;
                    }
                }
                if (!stillTouched) {
                    console.log('Touch cancel:', elementId);
                    keys[keyName] = false;
                }
            }, {passive: false});
        }

        // Map touch buttons to keyboard keys
        addTouchControl('mobile-left', 'ArrowLeft');
        addTouchControl('mobile-right', 'ArrowRight');
        if (IS_TOPDOWN) {
            // Top-down mode controls
            addTouchControl('mobile-up', 'ArrowUp');
            addTouchControl('mobile-down', 'ArrowDown');
            // Interact button - trigger E key and call handleInteraction
            var interactBtn = document.getElementById('mobile-interact');
            if (interactBtn) {
                interactBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    handleInteraction();
                }, {passive: false});
            }
            // Inventory button - toggle inventory panel
            var inventoryBtn = document.getElementById('mobile-inventory');
            if (inventoryBtn) {
                inventoryBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    inventoryOpen = !inventoryOpen;
                }, {passive: false});
            }
        } else {
            // Platformer mode controls
            addTouchControl('mobile-jump', 'Space'); // Space key for jump
        }
        if (PROJECTILE_ENABLED && document.getElementById('mobile-shoot')) {
            addTouchControl('mobile-shoot', PROJECTILE_FIRE_KEY);
        }
    } else {
        console.log('Mobile controls not shown. Enabled:', ENABLE_MOBILE_CONTROLS, 'Touch support:', ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    }

    // Initialize keyboard controls (hide on touch devices)
    initKeyboardControls();

    // Restart button click/touch handler
    function handleRestartClick(clientX, clientY) {
        if (!restartButton.visible) return;

        // Get canvas position and scale
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;

        // Convert click position to canvas coordinates
        var canvasX = (clientX - rect.left) * scaleX;
        var canvasY = (clientY - rect.top) * scaleY;

        // Check if click is within restart button bounds
        if (canvasX >= restartButton.x && canvasX <= restartButton.x + restartButton.width &&
            canvasY >= restartButton.y && canvasY <= restartButton.y + restartButton.height) {
            restartGame();
        }
    }

    // Mouse click handler for restart button and menu
    canvas.addEventListener('click', function(e) {
        // Convert client coordinates to canvas coordinates
        var rect = canvas.getBoundingClientRect();
        var canvasX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        var canvasY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

        if (isMenuLevel) {
            handleMenuClick(canvasX, canvasY);
        } else {
            handleRestartClick(e.clientX, e.clientY);
        }
    });

    // Touch handler for restart button and menu
    canvas.addEventListener('touchend', function(e) {
        if (e.changedTouches.length > 0) {
            var touch = e.changedTouches[0];
            var rect = canvas.getBoundingClientRect();
            var canvasX = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
            var canvasY = (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

            if (isMenuLevel) {
                handleMenuClick(canvasX, canvasY);
            } else {
                handleRestartClick(touch.clientX, touch.clientY);
            }
        }
    });

    // Keyboard handler for "press any key" on menu
    document.addEventListener('keydown', function(e) {
        if (isMenuLevel && menuWaitingForKey) {
            handlePressAnyKey();
        }
    });

    // Start the game loop (use requestAnimationFrame to get initial timestamp)
    // If multiplayer is enabled, show join UI first; otherwise start immediately
    if (MULTIPLAYER_ENABLED) {
        initMultiplayer();
    } else {
        requestAnimationFrame(gameLoop);
    }

    // Start level-specific BGM on first user interaction (browsers require this)
    // Also unlock vibration API on Android (requires user gesture)
    var bgmStarted = false;
    function tryStartBGM() {
        if (!bgmStarted) {
            // IMPORTANT: On mobile, AudioContext must be resumed during user gesture
            // This unlocks Web Audio API for all subsequent playback
            var ctx = getAudioContext();
            if (ctx.state === 'suspended') {
                ctx.resume().then(function() {
                    startLevelBGM();
                });
            } else {
                startLevelBGM();
            }
            // Try to unlock vibration API with a tiny vibration
            if (VIBRATION_ENABLED && navigator.vibrate) {
                navigator.vibrate(1); // 1ms pulse to unlock the API
            }
            bgmStarted = true;
        }
    }
    document.addEventListener('keydown', tryStartBGM);
    document.addEventListener('click', tryStartBGM);
    document.addEventListener('touchstart', tryStartBGM, { passive: true });

    // Level loaded and game loop started above
})();
<\/script>
</body>
</html>`;
}
