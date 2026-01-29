// ============================================
// STATE - GameMaker State Variables
// ============================================
// Extracted from index.php lines 2616-2858
// Note: PHP variables (projectId, projectName, loginId, INITIAL_DATA, URL_*)
// are defined inline in index2.php before this file loads

// Canvas references
const canvas = document.getElementById('level-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

// Tileset state
let tilesetImage = null;
let tilesetDataURLCache = ''; // Cached base64 data URL for export
let tilesetSourceURL = '';    // Original URL if loaded from URL (for refresh)
let tileSize = 16; // Default to 16 for better fit on most screens
let tiles = {}; // Map of key -> { x, y, solid, name }
let nextTileKey = 'A';

// Custom tiles (built-in pixel editor)
let customTiles = {}; // Map of key -> { dataURL, solid, name }
let nextCustomTileId = 1; // Counter for generating unique custom tile keys
let customTileImageCache = {}; // Cache of loaded Image objects for custom tiles

// ============================================
// MULTI-LEVEL SYSTEM
// ============================================
// Each project can have multiple levels
// Shared across levels: tileset, tiles, templates, gameSettings
// Per-level: tile map, objects, spawn point, backgrounds, dimensions

let levels = []; // Array of level objects
let currentLevelIndex = 0; // Currently edited level

// Level structure template
// levelType: 'gameplay' (normal level) or 'menu' (title/menu screen)
function createNewLevel(id, name, levelType = 'gameplay') {
    const baseLevel = {
        id: id || generateLevelId(),
        name: name || 'New Level',
        levelType: levelType,  // 'gameplay' or 'menu'
        width: 150,
        height: 30,
        tiles: [], // Array of tile row strings
        gameObjects: [],
        spawnPoint: null,
        backgroundLayers: [],
        // Level progression settings
        goalCondition: 'goal', // 'goal', 'collect_all', 'score', 'survive'
        nextLevelId: null, // ID of next level (null = game complete)
        requiredScore: 0, // For 'score' condition
        timeLimit: 0, // For 'survive' condition (0 = no limit)
        // Level-specific sounds
        sounds: {
            bgm: '',              // Background music for this level
            bgmVolume: 0.5,       // Background music volume (0.0 to 1.0)
            levelComplete: '',    // Sound when level is completed
            gameOver: ''          // Sound when game over occurs in this level
        },
        // Autoscroll settings (Flappy Bird style)
        autoscrollEnabled: false,
        autoscrollSpeed: 3,       // Pixels per frame (1-10)
        autoscrollMode: 'end',    // 'end' = stop at finish, 'loop' = endless
        // Background particle effect (ambient particles like snow, rain, fog)
        backgroundParticleEffect: '',
        backgroundParticleSpawnMode: 'auto' // 'auto', 'top', 'bottom', 'full'
    };

    // Add menu-specific properties for menu levels
    if (levelType === 'menu') {
        baseLevel.name = name || 'Title Screen';
        baseLevel.menuButtons = [createDefaultMenuButton()];
        baseLevel.pressAnyKey = false;
        baseLevel.pressAnyKeyText = 'Press any key to start';
    }

    return baseLevel;
}

// Default menu button template
function createDefaultMenuButton(id) {
    return {
        id: id || 'btn_' + Date.now(),
        text: 'START GAME',
        x: 50,              // Percentage from left (centered)
        y: 60,              // Percentage from top
        width: 30,          // Percentage of screen width
        height: 50,         // Pixels
        action: 'start_game',  // 'start_game', 'toggle_sound', 'open_url'
        actionTarget: null,    // URL for open_url action
        style: {
            bgColor: '#e94560',
            textColor: '#ffffff',
            borderColor: '#ffffff',
            borderRadius: 10,
            fontSize: 20
        }
    };
}

// Create a new menu button with specified action
function createMenuButton(text, action, actionTarget = null) {
    return {
        id: 'btn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        text: text,
        x: 50,
        y: 50,
        width: 30,
        height: 50,
        action: action,
        actionTarget: actionTarget,
        style: {
            bgColor: action === 'start_game' ? '#e94560' :
                     action === 'toggle_sound' ? '#3498db' : '#27ae60',
            textColor: '#ffffff',
            borderColor: '#ffffff',
            borderRadius: 10,
            fontSize: 20
        }
    };
}

// Generate unique level ID
function generateLevelId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    return `level_${timestamp}_${random}`;
}

// Get current level object
function getCurrentLevel() {
    if (levels.length === 0) {
        levels.push(createNewLevel('level_1', 'Level 1'));
    }
    return levels[currentLevelIndex] || levels[0];
}

// These variables point to current level data for backward compatibility
let levelWidth = 150;
let levelHeight = 30;
let level = [];

// Editor state
let selectedTileKey = '.';
let cameraX = 0;
let cameraY = 0;
let zoom = 1.25;
let isDragging = false;
let isDraggingObject = false; // For dragging game objects in move tool
let dragStartX = 0;
let dragStartY = 0;
let dragStartCamX = 0;
let dragStartCamY = 0;
let hoverX = -1;
let hoverY = -1;

// Background layers
let backgroundLayers = [];

// Game physics settings
let gameSettings = {
    gameType: 'platformer',  // 'platformer' or 'topdown'
    tileRenderScale: 1,      // Scale multiplier for tiles in-game (1, 2, or 4)
    gravity: 0.5,
    jumpPower: 10,
    moveSpeed: 4,
    bounciness: 0,       // Restitution coefficient (0 = no bounce, 1 = full bounce)
    friction: 0.85,      // Ground friction multiplier (1 = no friction/ice, 0.85 = normal, 0 = instant stop)
    enableMobileControls: true,  // Show touch controls on mobile devices
    playerColor: '#ff6b6b',
    playerSpriteURL: '',
    playerCustomTileKey: '',       // Key of custom tile used for player sprite
    playerIdleEffect: 'none',      // Idle motion effect: none, sway, pulse, bounce, float, shimmer, wave, shake
    playerIdleEffectIntensity: 5,  // Effect intensity (1-10)
    playerIdleEffectSpeed: 5,      // Effect speed (1-10)
    playerFrameCount: 1,           // DEPRECATED - use playerSpritesheetCols instead
    playerSpritesheetCols: 1,      // frames per row
    playerSpritesheetRows: 1,      // number of rows (4 for directional: down/left/right/up)
    playerWidth: 32,
    playerHeight: 32,
    playerCollisionWidth: 0,   // 0 = use playerWidth (hitbox width, centered in sprite)
    playerCollisionHeight: 0,  // 0 = use playerHeight (hitbox height, bottom-aligned)
    playerCollisionOffsetX: 0, // Horizontal offset from centered position (negative = left, positive = right)
    playerCollisionOffsetY: 0, // Vertical offset from bottom-aligned position (negative = up, positive = down)
    startLives: 3,
    // Volume settings (0.0 to 1.0)
    masterVolume: 1.0,   // Overall game volume
    musicVolume: 0.5,    // Background music volume (relative to master)
    sfxVolume: 0.7,      // Sound effects volume (relative to master)
    // Player-specific sound effects (empty = no sound)
    sounds: {
        jump: '',        // Sound when player jumps
        hurt: '',        // Sound when player takes damage
        shoot: '',       // Sound when firing projectile
        projectileHit: '' // Sound when projectile hits enemy
    },
    // Projectile system settings
    projectileEnabled: false,          // Master toggle for projectile system
    projectileFireKey: 'KeyX',         // KeyX, KeyZ, KeyC, ShiftLeft, ControlLeft, Enter
    projectileMode: 'cooldown',        // 'cooldown' (unlimited with cooldown) or 'ammo' (limited ammo)
    projectileCooldown: 500,           // Milliseconds between shots
    projectileStartAmmo: 10,           // Starting ammo (for 'ammo' mode)
    projectileMaxAmmo: 30,             // Maximum ammo capacity
    projectileSpeed: 8,                // Pixels per frame
    projectileLifetime: 2000,          // Milliseconds before projectile expires
    projectileDamage: 1,               // Damage dealt to enemies
    projectileWidth: 8,                // Projectile width in pixels
    projectileHeight: 8,               // Projectile height in pixels
    projectileColor: '#ffff00',        // Fallback color (yellow)
    projectileSpriteURL: '',           // Optional sprite URL
    projectileFrameCount: 1,           // DEPRECATED - use projectileSpritesheetCols instead
    projectileSpritesheetCols: 1,      // frames per row
    projectileSpritesheetRows: 1,      // number of rows
    projectileCollectsItems: false,    // Projectiles can collect collectibles
    // Enhanced gameplay features
    jumpMode: 'normal',                // 'normal', 'double', or 'fly' (flappy bird style)
    flyFlapPower: 6,                   // Upward boost per flap in fly mode
    invincibilityTime: 1500,           // Milliseconds of immunity after taking damage
    screenShakeEnabled: true,          // Screen shake on damage/stomp
    vibrationEnabled: true,            // Vibration feedback on mobile (Android only)
    // Hit pause (freeze frame on impact)
    hitPauseEnabled: true,             // Brief pause on damage/stomp for impact
    hitPauseDuration: 80,              // Milliseconds to freeze (50-150 recommended)
    // Squash & stretch animation
    squashStretchEnabled: true,        // Player squishes on land, stretches on jump
    squashStretchIntensity: 1.0,       // Intensity multiplier (0.5 = subtle, 1.0 = normal, 1.5 = exaggerated)
    // Run Timer (speedrun feature)
    runTimerEnabled: false,            // Display elapsed time during gameplay
    runTimerMode: 'level',             // 'level' = reset each level, 'cumulative' = total game time
    // Coyote time (forgiveness frames after leaving ledge)
    coyoteTimeFrames: 6,               // Frames where jump still works after walking off edge (0-15)
    // RPG Progress Saving (Top-Down mode only)
    saveRPGProgress: true,             // Save inventory and checkpoint progress to localStorage
    // Multiplayer Settings (Experimental - Top-Down RPG Mode Only)
    multiplayerEnabled: false,         // Master toggle for multiplayer
    multiplayerMaxPlayers: 4,          // 2-12 players per room
    multiplayerPlayerName: '',         // Display name for this player
    multiplayerShowChat: true,         // Show chat overlay in game
    multiplayerSyncItems: true,        // Sync item collection (first-to-collect wins)
    multiplayerSyncEnemies: true,      // Sync enemy deaths (killed for everyone, killer gets points)
    // PvP Battle Mode
    multiplayerPvPEnabled: false,      // Allow players to damage each other
    multiplayerPvPDamage: 1,           // Damage per hit (hearts)
    multiplayerPvPKillScore: 100,      // Score awarded for eliminating another player
    multiplayerPvPLives: 3,            // Starting lives in PvP mode (1-10)
    // Custom Player Sprites (allows players to use their own sprite URLs when joining)
    multiplayerAllowCustomSprites: false,  // Allow players to provide custom sprite URL when joining
    // Cheat Codes (Designer enables these for players to discover)
    cheatsEnabled: false,              // Master toggle for cheat code system
    cheatFeedbackEnabled: true,        // Show "CHEAT ACTIVATED!" message when code entered
    // Particle Effects (from ParticleFX exports)
    // NOTE: Object-related effects (enemyDeath, collectItem, etc.) are now per-template.
    // Only player-related effects remain global here.
    particleEffectsEnabled: false,     // Master toggle for particle effects
    particleEffects: {
        playerDamage: '',              // Effect URL when player takes damage
        playerJump: '',                // Dust effect when player jumps
        checkpoint: '',                // Effect when checkpoint activated
        levelComplete: ''              // Celebration effect on level complete
    }
};

// ============================================
// OBJECT TEMPLATES
// ============================================
// Templates define types of objects that can be placed in the level
// Each placed object references a template by ID

// Enemy templates - defines enemy behaviors
let enemyTemplates = [
    {
        id: 'default',
        name: 'Basic Enemy',
        sprite: '',
        frameCount: 1,         // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,    // frames per row (columns in spritesheet)
        spritesheetRows: 1,    // number of rows (1 = horizontal strip, 4 = directional grid)
        width: 32,             // display width in pixels
        height: 32,            // display height in pixels
        behavior: 'pace',      // 'pace', 'stationary', 'follow', 'jump'
        paceDistance: 3,       // tiles to walk before turning (for 'pace' behavior)
        paceAxis: 'horizontal', // 'horizontal' or 'vertical' (for top-down pacing)
        speed: 2,              // movement speed
        damage: 1,             // damage dealt to player
        jumpPower: 0,          // for 'jump' behavior
        followRange: 5,        // tiles range for 'follow' behavior
        color: '#ff4444',      // fallback color if no sprite
        contactSound: '',      // sound when player contacts enemy
        stompable: false,      // can player defeat by jumping on top?
        respawnTime: 0,        // seconds until respawn after defeat (0 = no respawn)
        particleEffect: ''     // ParticleFX URL for death effect
    }
];

// Collectible templates - coins, gems, keys, etc.
let collectibleTemplates = [
    {
        id: 'coin',
        name: 'Coin',
        sprite: '',
        frameCount: 1,         // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,    // frames per row
        spritesheetRows: 1,    // number of rows
        width: 32,
        height: 32,
        value: 10,             // points awarded
        sound: '',             // sound effect on collect
        color: '#ffd700',      // fallback color (gold)
        symbol: '●',           // fallback symbol
        respawns: false,       // if true, respawns at random location when collected
        particleEffect: ''     // ParticleFX URL for collect effect
    },
    {
        id: 'gem',
        name: 'Gem',
        sprite: '',
        frameCount: 1,         // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,    // frames per row
        spritesheetRows: 1,    // number of rows
        width: 32,
        height: 32,
        value: 50,
        sound: '',
        respawns: false,
        color: '#00ffff',      // fallback color (cyan)
        symbol: '◆',
        particleEffect: ''     // ParticleFX URL for collect effect
    }
];

// Hazard templates - spikes, lava, etc.
let hazardTemplates = [
    {
        id: 'spike',
        name: 'Spike',
        sprite: '',
        frameCount: 1,         // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,    // frames per row
        spritesheetRows: 1,    // number of rows
        width: 32,
        height: 32,
        damage: 1,             // damage dealt (use 999 for instant kill)
        continuous: false,     // if true, damages every frame while touching
        color: '#888888',      // fallback color
        symbol: '▲',
        damageSound: '',       // sound when player hits this hazard
        particleEffect: ''     // ParticleFX URL for hit effect
    }
];

// Powerup templates - hearts, shields, speed boosts, etc.
let powerupTemplates = [
    {
        id: 'heart',
        name: 'Heart',
        sprite: '',
        frameCount: 1,         // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,    // frames per row
        spritesheetRows: 1,    // number of rows
        width: 32,
        height: 32,
        effect: 'heal',        // 'heal', 'shield', 'speed', 'jump', 'ammo'
        amount: 1,             // heal amount or boost multiplier
        duration: 0,           // 0 = permanent, >0 = seconds (for temporary effects)
        sound: '',
        color: '#ff6b6b',      // fallback color
        symbol: '♥',
        particleEffect: ''     // ParticleFX URL for collect effect
    },
    {
        id: 'ammo',
        name: 'Ammo Pack',
        sprite: '',
        frameCount: 1,         // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,    // frames per row
        spritesheetRows: 1,    // number of rows
        width: 32,
        height: 32,
        effect: 'ammo',        // restores projectile ammo
        amount: 5,             // ammo to restore
        duration: 0,
        sound: '',
        color: '#ffcc00',      // fallback color (yellow)
        symbol: '🔫',
        particleEffect: ''     // ParticleFX URL for collect effect
    }
];

// Spring templates - bouncy platforms
let springTemplates = [
    {
        id: 'spring',
        name: 'Spring',
        sprite: '',
        frameCount: 1,         // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,    // frames per row
        spritesheetRows: 1,    // number of rows
        width: 32,
        height: 16,
        bouncePower: 1.5,       // Multiplier of jump power
        color: '#9b59b6',       // Purple fallback
        symbol: '🔼',
        bounceSound: '',        // Sound when player bounces
        particleEffect: ''      // ParticleFX URL for bounce effect
    }
];

// Mystery Block templates - blocks that emit items when hit from below
let mysteryBlockTemplates = [
    {
        id: 'question_block',
        name: 'Question Block',
        sprite: '',
        emptySprite: '',           // Sprite URL when depleted
        emptyTileKey: '',          // Tile key from tileset when depleted (alternative to emptySprite)
        frameCount: 1,             // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,        // frames per row
        spritesheetRows: 1,        // number of rows
        animSpeed: 8,
        width: 32,
        height: 32,
        color: '#f1c40f',          // Yellow (Mario-style)
        emptyColor: '#8B4513',     // Brown when empty (fallback if no sprite/tile)
        symbol: '?',

        // What it emits
        emitType: 'collectible',   // 'collectible' or 'powerup'
        emitTemplateId: 'coin',    // Which template to emit
        emitCount: 1,              // How many items (1-99)

        // After depletion
        depletedBehavior: 'solid', // 'solid', 'disappear', 'infinite'

        // Emit physics
        emitMode: 'popup',         // 'popup', 'static', 'moving'
        emitDirection: 'up',       // 'up', 'left', 'right', 'random'
        emitSpeed: 3,              // Horizontal speed if moving
        emitPopHeight: 32,         // Pixels to pop up
        emitGravity: true,         // Apply gravity after pop

        // Collection mode
        collectMode: 'manual',     // 'instant', 'auto_after_anim', 'manual'
        autoCollectDelay: 500,     // ms before auto-collect

        // Sounds
        hitSound: '',              // Sound when block is hit
        emptyHitSound: '',         // Sound when hitting empty block

        // Particle effects
        particleEffect: ''         // ParticleFX URL for hit effect
    }
];

// Moving platform templates - platforms that move back and forth
let movingPlatformTemplates = [
    {
        id: 'platform',
        name: 'Moving Platform',
        sprite: '',
        frameCount: 1,             // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,        // frames per row
        spritesheetRows: 1,        // number of rows
        animSpeed: 8,
        width: 64,
        height: 16,
        axis: 'x',              // 'x' (horizontal) or 'y' (vertical)
        distance: 100,          // pixels to travel from start position
        speed: 2,               // pixels per frame
        collisionMode: 'solid', // 'solid' (all sides) or 'oneway' (top only)
        activation: 'always',   // 'always' or 'touch' (activate on player contact)
        tileKey: '',            // Tile character key (e.g., 'G', 'B') - uses tile from tileset
        color: '#8B4513',       // Brown fallback when no tile/sprite
        symbol: '═',
        moveSound: '',          // Optional sound while moving
        showInactiveOutline: true,      // Show pulsing outline when touch-activated but not yet active
        inactiveOutlineColor: '#ffff00', // Color of the inactive outline (yellow default)
        // Collapsing platform options
        collapsing: false,          // Enable collapse behavior
        collapseDelay: 1.0,         // Seconds standing before shake starts
        collapseShakeDuration: 0.5, // Seconds of shaking before collapse
        collapseRespawnTime: 3.0,   // Seconds until respawn (0 = never respawn)
        collapseSound: '',          // Optional sound when collapse starts
        // Randomize start position
        randomizeStart: false       // Randomize start position along movement path (prevents sync)
    }
];

// NPC templates - for top-down RPG mode
let npcTemplates = [
    {
        id: 'villager',
        name: 'Villager',
        sprite: '',
        frameCount: 1,             // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,        // frames per row (e.g., 3 for walk cycle)
        spritesheetRows: 1,        // rows (e.g., 4 for down/left/right/up directions)
        width: 32,
        height: 32,
        color: '#3498db',           // Blue fallback
        symbol: '👤',
        dialogueLines: ['Hello, traveler!', 'Have a nice day.'],  // Array of dialogue
        interactionRadius: 48,      // Pixels - how close player needs to be
        behavior: 'stationary',     // 'stationary' or 'wander'
        // Wander options (only used when behavior = 'wander')
        wanderSpeed: 1,             // Movement speed while wandering (1-5)
        wanderRadius: 3,            // Max tiles from start position (1-10)
        solidCollision: true        // Collide with solid tiles while wandering
    }
];

// Door templates - for top-down RPG mode (teleporters)
let doorTemplates = [
    {
        id: 'door',
        name: 'Door',
        sprite: '',
        frameCount: 1,             // DEPRECATED - use spritesheetCols instead
        spritesheetCols: 1,        // frames per row
        spritesheetRows: 1,        // number of rows
        width: 32,
        height: 48,
        color: '#8b4513',           // Brown fallback
        symbol: '🚪',
        destinationType: 'level',   // 'level' (go to another level) or 'position' (teleport within level)
        destinationLevelId: null,   // Level ID to teleport to (for 'level' type)
        destinationX: null,         // X position to teleport to (for 'position' type)
        destinationY: null,         // Y position to teleport to (for 'position' type)
        interactSound: '',          // Sound when using door
        particleEffect: ''          // ParticleFX URL for teleport effect
    }
];

// Terrain Zone templates - areas that affect player/enemy movement and physics
let terrainZoneTemplates = [
    {
        id: 'water',
        name: 'Water',
        imageURL: '',                  // Tiled texture URL (optional)
        tintColor: '#4a90d9',          // Color overlay/fallback
        opacity: 0.6,                  // Visual transparency (0.0-1.0)
        speedMultiplier: 0.5,          // Movement speed multiplier (0.1=very slow, 2.0=fast)
        jumpMultiplier: 0.7,           // Jump height reduction (platformer only)
        gravityMultiplier: 0.8,        // Gravity modifier (platformer only)
        damagePerSecond: 0,            // 0=no damage, >0=continuous damage
        entrySound: '',                // Sound when entering zone
        loopSound: '',                 // Ambient sound while in zone
        affectsEnemies: true,          // Whether enemies are also affected
        symbol: '~'                    // Editor fallback symbol
    }
];

// Checkpoint template
let checkpointTemplate = {
    sprite: '',
    frameCount: 1,             // DEPRECATED - use spritesheetCols instead
    spritesheetCols: 1,        // frames per row
    spritesheetRows: 1,        // number of rows
    width: 32,
    height: 48,
    color: '#3498db',           // Blue when inactive
    activatedColor: '#2ecc71',  // Green when active
    symbol: '⛳',
    activateSound: ''           // sound when checkpoint is activated
};

// Goal template (typically just one)
let goalTemplate = {
    sprite: '',
    frameCount: 1,             // DEPRECATED - use spritesheetCols instead
    spritesheetCols: 1,        // frames per row
    spritesheetRows: 1,        // number of rows
    width: 32,
    height: 32,
    color: '#00ff00',
    symbol: '⚑',
    reachSound: '',            // sound when player reaches goal
    particleEffect: ''         // ParticleFX URL for goal reached effect
};

// Cheat Code Templates - Secret codes players can type during gameplay
// All cheats disabled by default - designer enables which ones to include
let cheatCodeTemplates = [
    { id: 'god', name: 'Invincible', code: 'IDDQD', effect: 'invincibility', duration: 30, enabled: false, description: 'Become invincible for 30 seconds' },
    { id: 'konami', name: 'Konami Code', code: 'UP,UP,DOWN,DOWN,LEFT,RIGHT,LEFT,RIGHT,B,A', effect: 'infiniteLives', duration: 0, enabled: false, description: 'Get 99 lives' },
    { id: 'speed', name: 'Super Speed', code: 'ZOOM', effect: 'speedBoost', duration: 30, enabled: false, description: 'Move twice as fast for 30 seconds' },
    { id: 'moon', name: 'Moon Jump', code: 'MOON', effect: 'lowGravity', duration: 30, enabled: false, description: 'Low gravity for 30 seconds' },
    { id: 'jump', name: 'Super Jump', code: 'JUMP', effect: 'jumpBoost', duration: 30, enabled: false, description: 'Jump 50% higher for 30 seconds' },
    { id: 'power', name: 'Power Punch', code: 'POWER', effect: 'oneHitKill', duration: 0, enabled: false, description: 'Defeat enemies in one hit' },
    { id: 'ammo', name: 'Ammo Up', code: 'AMMO', effect: 'maxAmmo', duration: 0, enabled: false, description: 'Fill ammo to maximum' },
    { id: 'skip', name: 'Level Skip', code: 'SKIP', effect: 'levelSkip', duration: 0, enabled: false, description: 'Skip to next level' },
    { id: 'cash', name: 'Score Boost', code: 'CASH', effect: 'scoreBoost', duration: 0, enabled: false, description: 'Add 1000 points to score' },
    { id: 'tiny', name: 'Tiny Mode', code: 'TINY', effect: 'tinyMode', duration: 30, enabled: false, description: 'Shrink to half size for 30 seconds' },
    { id: 'giant', name: 'Giant Mode', code: 'GIANT', effect: 'giantMode', duration: 30, enabled: false, description: 'Grow to 1.5x size for 30 seconds' },
    { id: 'turbo', name: 'Turbo Fire', code: 'TURBO', effect: 'turboFire', duration: 30, enabled: false, description: 'Shoot 3x faster for 30 seconds' }
];

// Player spawn point (tile coordinates, null = auto-detect)
let spawnPoint = null; // { x: tileX, y: tileY }

// Game Objects - each references a template
// Format: { type: 'enemy'|'collectible'|'hazard'|'powerup'|'goal', templateId: string, x: number, y: number }
let gameObjects = [];
let selectedObjectType = null;     // Current object category to place
let selectedTemplateId = null;     // Current template within category
let selectedMoveObject = null;     // Object currently selected for moving (stores index in gameObjects array)
let draggedTileKey = null;         // Tile key being dragged in move tool
let draggedTileOrigin = null;      // Original position of dragged tile {x, y}
let isDraggingPlayer = false;      // True when dragging the player spawn point

// Terrain Zone placement state
let isDrawingTerrainZone = false;  // True when dragging to create a zone
let terrainZoneStart = null;       // {x, y} tile position where drag started
let terrainZonePreview = null;     // {x, y, width, height} current preview rectangle
let selectedTerrainZone = null;    // Index of currently selected terrain zone for resize
let resizingHandle = null;         // Which handle is being dragged ('nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w')

// Helper function to get template by type and ID
function getTemplate(type, templateId) {
    switch(type) {
        case 'enemy':
            return enemyTemplates.find(t => t.id === templateId) || enemyTemplates[0];
        case 'collectible':
            return collectibleTemplates.find(t => t.id === templateId) || collectibleTemplates[0];
        case 'hazard':
            return hazardTemplates.find(t => t.id === templateId) || hazardTemplates[0];
        case 'powerup':
            return powerupTemplates.find(t => t.id === templateId) || powerupTemplates[0];
        case 'spring':
            return springTemplates.find(t => t.id === templateId) || springTemplates[0];
        case 'movingPlatform':
            return movingPlatformTemplates.find(t => t.id === templateId) || movingPlatformTemplates[0];
        case 'npc':
            return npcTemplates.find(t => t.id === templateId) || npcTemplates[0];
        case 'door':
            return doorTemplates.find(t => t.id === templateId) || doorTemplates[0];
        case 'mysteryBlock':
            return mysteryBlockTemplates.find(t => t.id === templateId) || mysteryBlockTemplates[0];
        case 'terrainZone':
            return terrainZoneTemplates.find(t => t.id === templateId) || terrainZoneTemplates[0];
        case 'checkpoint':
            return checkpointTemplate;
        case 'goal':
            return goalTemplate;
        default:
            return null;
    }
}

// Helper to get all templates of a type
function getTemplates(type) {
    switch(type) {
        case 'enemy': return enemyTemplates;
        case 'collectible': return collectibleTemplates;
        case 'hazard': return hazardTemplates;
        case 'powerup': return powerupTemplates;
        case 'spring': return springTemplates;
        case 'movingPlatform': return movingPlatformTemplates;
        case 'npc': return npcTemplates;
        case 'door': return doorTemplates;
        case 'mysteryBlock': return mysteryBlockTemplates;
        case 'terrainZone': return terrainZoneTemplates;
        default: return [];
    }
}

// Generate unique template ID
function generateTemplateId(type, name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const templates = getTemplates(type);
    let id = base;
    let counter = 1;
    while (templates.find(t => t.id === id)) {
        id = `${base}_${counter++}`;
    }
    return id;
}

// ============================================
// CUSTOM TILE HELPERS
// ============================================

// Custom tiles use Unicode Private Use Area (U+E000 to U+F8FF)
// This allows single-character keys that won't conflict with regular ASCII tiles

// Check if a tile key is a custom tile (in Unicode Private Use Area)
function isCustomTile(key) {
    if (!key) return false;
    // New format: alphanumeric keys starting with "custom_"
    if (key.startsWith('custom_')) return true;
    // Legacy format: single Unicode character in Private Use Area (U+E000 to U+F8FF)
    if (key.length === 1) {
        const code = key.charCodeAt(0);
        return code >= 0xE000 && code <= 0xF8FF;
    }
    return false;
}

// Get custom tile image from cache, or create and cache it
function getCustomTileImage(key) {
    if (!customTiles[key]) return null;

    // Return cached image if available
    if (customTileImageCache[key] && customTileImageCache[key].complete) {
        return customTileImageCache[key];
    }

    // Create and cache new image
    const img = new Image();
    img.src = customTiles[key].dataURL;
    customTileImageCache[key] = img;
    return img;
}

// Generate next custom tile key using safe alphanumeric format
function generateCustomTileKey() {
    // Use alphanumeric keys for better JSON compatibility
    // Format: custom_1, custom_2, etc.
    const key = 'custom_' + nextCustomTileId;
    nextCustomTileId++;
    return key;
}

// Clear custom tile image cache (call when loading new project)
function clearCustomTileCache() {
    customTileImageCache = {};
    // Also clear animation cache if it exists
    if (typeof customTileAnimationCache !== 'undefined') {
        window.customTileAnimationCache = {};
    }
}

// Current tool: 'draw', 'fill', or 'erase'
let currentTool = 'draw';

// Dirty flag for unsaved changes
let hasUnsavedChanges = false;

// Undo/redo system
let undoStack = [];
let redoStack = [];
const maxUndoSteps = 50;
let isDrawingStroke = false; // Track continuous drawing for single undo step

function markDirty() {
    hasUnsavedChanges = true;
}

function markClean() {
    hasUnsavedChanges = false;
}

// Save current level state for undo
function saveUndoState(actionName = 'Edit') {
    // Deep copy the level array and game objects
    const snapshot = {
        level: level.map(row => row), // Copy each string row
        levelWidth: levelWidth,
        levelHeight: levelHeight,
        gameObjects: JSON.parse(JSON.stringify(gameObjects)), // Deep copy objects
        spawnPoint: spawnPoint ? { ...spawnPoint } : null, // Copy spawn point
        actionName: actionName
    };

    undoStack.push(snapshot);

    // Limit stack size
    if (undoStack.length > maxUndoSteps) {
        undoStack.shift();
    }

    // Clear redo stack on new action
    redoStack = [];

    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length === 0) {
        showToast('Nothing to undo', 'info');
        return;
    }

    // Save current state to redo stack
    redoStack.push({
        level: level.map(row => row),
        levelWidth: levelWidth,
        levelHeight: levelHeight,
        gameObjects: JSON.parse(JSON.stringify(gameObjects)),
        spawnPoint: spawnPoint ? { ...spawnPoint } : null,
        actionName: 'Redo'
    });

    // Restore previous state
    const snapshot = undoStack.pop();
    level = snapshot.level.map(row => row);
    levelWidth = snapshot.levelWidth;
    levelHeight = snapshot.levelHeight;

    // Restore game objects and spawn point
    if (snapshot.gameObjects !== undefined) {
        gameObjects = JSON.parse(JSON.stringify(snapshot.gameObjects));
    }
    if (snapshot.spawnPoint !== undefined) {
        spawnPoint = snapshot.spawnPoint ? { ...snapshot.spawnPoint } : null;
    }

    // Update UI
    updateLevelSizeDisplay();
    if (typeof updateObjectCount === 'function') updateObjectCount();
    if (typeof updateSpawnUI === 'function') updateSpawnUI();
    markDirty();
    updateLiveDataPreview();
    draw();
    updateUndoRedoButtons();

    showToast(`Undo: ${snapshot.actionName}`, 'info');
}

function redo() {
    if (redoStack.length === 0) {
        showToast('Nothing to redo', 'info');
        return;
    }

    // Save current state to undo stack
    undoStack.push({
        level: level.map(row => row),
        levelWidth: levelWidth,
        levelHeight: levelHeight,
        gameObjects: JSON.parse(JSON.stringify(gameObjects)),
        spawnPoint: spawnPoint ? { ...spawnPoint } : null,
        actionName: 'Undo'
    });

    // Restore redo state
    const snapshot = redoStack.pop();
    level = snapshot.level.map(row => row);
    levelWidth = snapshot.levelWidth;
    levelHeight = snapshot.levelHeight;

    // Restore game objects and spawn point
    if (snapshot.gameObjects !== undefined) {
        gameObjects = JSON.parse(JSON.stringify(snapshot.gameObjects));
    }
    if (snapshot.spawnPoint !== undefined) {
        spawnPoint = snapshot.spawnPoint ? { ...snapshot.spawnPoint } : null;
    }

    // Update UI
    updateLevelSizeDisplay();
    if (typeof updateObjectCount === 'function') updateObjectCount();
    if (typeof updateSpawnUI === 'function') updateSpawnUI();
    markDirty();
    updateLiveDataPreview();
    draw();
    updateUndoRedoButtons();

    showToast('Redo', 'info');
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');

    if (undoBtn) {
        undoBtn.disabled = undoStack.length === 0;
        undoBtn.title = undoStack.length > 0
            ? `Undo: ${undoStack[undoStack.length - 1].actionName} (Ctrl+Z)`
            : 'Nothing to undo';
    }
    if (redoBtn) {
        redoBtn.disabled = redoStack.length === 0;
        redoBtn.title = redoStack.length > 0 ? 'Redo (Ctrl+Y)' : 'Nothing to redo';
    }
}

// Loaded background images (for caching)
let loadedBackgroundImages = [];

// Live data preview state
let currentDataFormat = 'array';
let currentExportFormat = 'js';
let highlightedRow = -1;

// Learn mode state
let currentLearnPage = 1;
const totalLearnPages = 4;
let learnDemoGrid = [
    ['.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.']
];
