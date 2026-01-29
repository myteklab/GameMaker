/**
 * Code Snippets Library - Educational code examples for GameMaker
 *
 * Each snippet contains:
 * - title: Short name for the context header
 * - description: Brief explanation of what this code does
 * - getCode(data): Function that returns the annotated code with values substituted
 *
 * Use [YOUR:value] syntax to highlight user-configured values
 */

const CodeSnippets = {

    // =========================================================================
    // IDLE STATE - Welcome message
    // =========================================================================
    idle: {
        title: "Welcome",
        description: "Click on settings or objects to see their code",
        getCode: function(data) {
            return `// Welcome to Code Preview!
//
// As you build your game, this panel shows you the actual
// JavaScript code that makes your game work.
//
// Try these to see code:
//   - Open Game Settings (gravity, jump power)
//   - Open Player Properties (physics, appearance)
//   - Click on an object type (enemies, collectibles)
//
// This is how real game developers code!
// When you're ready to edit code yourself,
// use File -> Export to get your game's source.`;
        }
    },

    // =========================================================================
    // PHYSICS - Gravity, movement, jumping
    // =========================================================================
    physics: {
        title: "Physics & Movement",
        description: "How gravity and player movement work",
        getCode: function(data) {
            const gravity = data.gravity || 0.5;
            const jumpPower = data.jumpPower || 10;
            const moveSpeed = data.moveSpeed || 4;
            const friction = data.friction || 0.85;

            return `// PHYSICS: This code runs 60 times per second (every frame)

// ---- GRAVITY ----
// Gravity constantly pulls the player downward
// Higher values = faster falling
player.velocityY += [YOUR:${gravity}];  // gravity

// ---- MOVEMENT ----
// When arrow keys are pressed, we set horizontal velocity
if (leftKeyPressed) {
    player.velocityX = -[YOUR:${moveSpeed}];  // move speed
}
if (rightKeyPressed) {
    player.velocityX = [YOUR:${moveSpeed}];   // move speed
}

// ---- FRICTION ----
// Friction slows the player down when not pressing keys
// Values closer to 1 = more slippery, closer to 0 = more grippy
player.velocityX *= [YOUR:${friction}];  // friction

// ---- APPLY VELOCITY ----
// Move the player based on their velocity
player.x += player.velocityX;  // horizontal movement
player.y += player.velocityY;  // vertical movement (falling/jumping)

// ---- JUMPING ----
// Player can only jump when standing on the ground
if (jumpKeyPressed && player.onGround) {
    // Negative velocity = upward movement
    player.velocityY = -[YOUR:${jumpPower}];  // jump power
    player.onGround = false;
}`;
        }
    },

    // =========================================================================
    // PLAYER - Appearance, size, sprites
    // =========================================================================
    player: {
        title: "Player Setup",
        description: "How the player is created and drawn",
        getCode: function(data) {
            const width = data.playerWidth || 32;
            const height = data.playerHeight || 32;
            const color = data.playerColor || '#ff6b6b';
            const hasSprite = data.playerSpriteURL && data.playerSpriteURL.length > 0;

            return `// PLAYER: Initial setup and rendering

// ---- PLAYER OBJECT ----
// This holds all the player's information
var player = {
    x: spawnPoint.x,           // starting X position
    y: spawnPoint.y,           // starting Y position
    width: [YOUR:${width}],              // player width in pixels
    height: [YOUR:${height}],             // player height in pixels
    velocityX: 0,              // horizontal speed
    velocityY: 0,              // vertical speed (affected by gravity)
    onGround: false,           // is player standing on something?
    facingRight: true,         // which direction is player facing?
    lives: 3,                  // how many lives remaining
    score: 0                   // current score
};

// ---- DRAWING THE PLAYER ----
function drawPlayer() {
    ${hasSprite ? `// You're using a sprite image!
    // The image is loaded and drawn with animation
    ctx.drawImage(
        playerSprite,           // your sprite image
        frameX, 0,              // which frame to show
        frameWidth, frameHeight,// frame size
        player.x, player.y,     // where to draw
        player.width, player.height  // draw size
    );` : `// Drawing a colored rectangle (no sprite)
    ctx.fillStyle = '[YOUR:${color}]';  // player color
    ctx.fillRect(
        player.x,              // X position
        player.y,              // Y position
        player.width,          // width
        player.height          // height
    );`}
}`;
        }
    },

    // =========================================================================
    // ENEMY - AI behavior and collision
    // =========================================================================
    enemy: {
        title: "Enemy Behavior",
        description: "How enemies move and interact with the player",
        getCode: function(data) {
            const template = data.template || {};
            const behavior = template.behavior || 'pace';
            const speed = template.speed || 2;
            const damage = template.damage || 1;
            const stompable = template.stompable !== false;

            return `// ENEMY: Movement AI and collision detection

// ---- ENEMY MOVEMENT (${behavior.toUpperCase()}) ----
${behavior === 'pace' ? `// Pacing: Enemy walks back and forth
if (enemy.movingRight) {
    enemy.x += [YOUR:${speed}];  // move right
    if (enemy.x >= enemy.startX + enemy.paceDistance * tileSize) {
        enemy.movingRight = false;  // turn around
    }
} else {
    enemy.x -= [YOUR:${speed}];  // move left
    if (enemy.x <= enemy.startX) {
        enemy.movingRight = true;   // turn around
    }
}` : behavior === 'follow' ? `// Following: Enemy chases the player
var dx = player.x - enemy.x;  // distance to player
var dy = player.y - enemy.y;
var distance = Math.sqrt(dx*dx + dy*dy);

if (distance < enemy.followRange * tileSize) {
    // Move toward player
    enemy.x += (dx / distance) * [YOUR:${speed}];
    enemy.y += (dy / distance) * [YOUR:${speed}];
}` : `// Stationary: Enemy doesn't move
// (but still damages player on contact)`}

// ---- COLLISION WITH PLAYER ----
function handleEnemyCollision(enemy) {
    // Check if player is touching this enemy
    if (isColliding(player, enemy)) {
        ${stompable ? `
        // Check if player is stomping (falling onto enemy)
        if (player.velocityY > 0 && player.y + player.height < enemy.y + 10) {
            // STOMP! Enemy is defeated
            enemy.defeated = true;
            player.velocityY = -8;  // bounce up
            player.score += 100;    // bonus points!
        } else {
            // Player takes damage
            player.lives -= [YOUR:${damage}];  // damage amount
            player.invincibleUntil = Date.now() + 1500;  // brief invincibility
        }` : `
        // This enemy cannot be stomped
        // Player takes damage on any contact
        player.lives -= [YOUR:${damage}];  // damage amount
        player.invincibleUntil = Date.now() + 1500;`}
    }
}`;
        }
    },

    // =========================================================================
    // COLLECTIBLE - Pickup detection
    // =========================================================================
    collectible: {
        title: "Collectibles",
        description: "How coins and items are picked up",
        getCode: function(data) {
            const template = data.template || {};
            const value = template.value || 10;
            const name = template.name || 'Coin';

            return `// COLLECTIBLES: Picking up items for points

// ---- CHECK FOR PICKUP ----
// This runs every frame for each collectible
function checkCollectiblePickup(item) {
    // Is the player touching this item?
    if (isColliding(player, item)) {
        // Player collected it!
        item.collected = true;  // mark as collected

        // Add points to the score
        player.score += [YOUR:${value}];  // point value

        // Play the pickup sound (if one is set)
        if (item.sound) {
            playSound(item.sound);
        }

        // Optional: trigger vibration on mobile
        if (navigator.vibrate) {
            navigator.vibrate(50);  // short buzz
        }
    }
}

// ---- COLLISION DETECTION ----
// Simple box collision (AABB - Axis-Aligned Bounding Box)
function isColliding(a, b) {
    return a.x < b.x + b.width &&    // a's left edge is left of b's right
           a.x + a.width > b.x &&    // a's right edge is right of b's left
           a.y < b.y + b.height &&   // a's top is above b's bottom
           a.y + a.height > b.y;     // a's bottom is below b's top
}

// ---- DRAWING COLLECTIBLES ----
// Only draw items that haven't been collected yet
function drawCollectibles() {
    for (var item of collectibles) {
        if (!item.collected) {
            // Draw the item (sprite or colored shape)
            drawGameObject(item);
        }
    }
}`;
        }
    },

    // =========================================================================
    // HAZARD - Damage handling
    // =========================================================================
    hazard: {
        title: "Hazards",
        description: "How spikes and dangers hurt the player",
        getCode: function(data) {
            const template = data.template || {};
            const damage = template.damage || 1;
            const continuous = template.continuous || false;
            const name = template.name || 'Spike';

            return `// HAZARDS: Dangerous objects that hurt the player

// ---- HAZARD COLLISION ----
function handleHazardCollision(hazard) {
    // Is the player touching this hazard?
    if (isColliding(player, hazard)) {

        // Check if player is currently invincible
        if (Date.now() < player.invincibleUntil) {
            return;  // Skip damage - player is protected!
        }

        ${damage >= 999 ? `// INSTANT DEATH hazard
        player.lives = 0;  // game over!` : `// Apply damage
        player.lives -= [YOUR:${damage}];  // damage amount`}

        // Make player invincible briefly (prevents rapid damage)
        player.invincibleUntil = Date.now() + 1500;  // 1.5 seconds

        // Visual feedback
        triggerScreenShake(5, 10);  // shake the screen

        // Haptic feedback on mobile
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);  // vibration pattern
        }

        ${continuous ? `// This hazard damages continuously
        // Player will be hurt again after invincibility ends` : `// This hazard only hurts once per contact
        // Player must leave and re-enter to be hurt again`}
    }
}

// ---- INVINCIBILITY VISUAL ----
// Player flashes when invincible
function drawPlayer() {
    var isInvincible = Date.now() < player.invincibleUntil;

    if (isInvincible) {
        // Flash effect: alternate visible/invisible
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.3;  // semi-transparent
        }
    }

    // Draw player...
    ctx.globalAlpha = 1.0;  // reset transparency
}`;
        }
    },

    // =========================================================================
    // SPRING - Bounce mechanics
    // =========================================================================
    spring: {
        title: "Springs & Trampolines",
        description: "How bouncy platforms work",
        getCode: function(data) {
            const template = data.template || {};
            const bouncePower = template.bouncePower || 1.5;

            return `// SPRINGS: Bouncy platforms that launch the player

// ---- SPRING COLLISION ----
function handleSpringCollision(spring) {
    // Is the player touching this spring?
    if (isColliding(player, spring)) {

        // Only bounce if player is falling onto it
        if (player.velocityY > 0) {

            // Calculate bounce velocity
            // bouncePower multiplies the normal jump power
            var bounceVelocity = -jumpPower * [YOUR:${bouncePower}];

            // Apply the bounce!
            player.velocityY = bounceVelocity;

            // Reset double jump (if enabled)
            player.canDoubleJump = true;

            // Visual feedback
            triggerScreenShake(3, 5);  // small shake

            // Audio feedback
            if (spring.bounceSound) {
                playSound(spring.bounceSound);
            }

            // Haptic feedback on mobile
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
        }
    }
}

// ---- SPRING ANIMATION ----
// Springs compress when the player lands on them
function drawSpring(spring) {
    var isCompressed = isColliding(player, spring) && player.velocityY >= 0;

    if (isCompressed) {
        // Draw compressed spring (squished)
        ctx.save();
        ctx.scale(1.2, 0.6);  // wider and shorter
        drawGameObject(spring);
        ctx.restore();
    } else {
        // Draw normal spring
        drawGameObject(spring);
    }
}`;
        }
    },

    // =========================================================================
    // CHECKPOINT - Respawn system
    // =========================================================================
    checkpoint: {
        title: "Checkpoints",
        description: "How save points and respawning work",
        getCode: function(data) {
            return `// CHECKPOINTS: Save progress and respawn points

// ---- CHECKPOINT STATE ----
var activeCheckpoint = null;  // the last checkpoint touched

// ---- CHECKPOINT COLLISION ----
function handleCheckpointCollision(checkpoint) {
    // Is the player touching this checkpoint?
    if (isColliding(player, checkpoint)) {

        // Only activate if not already active
        if (!checkpoint.activated) {
            checkpoint.activated = true;

            // Save this as the respawn point
            activeCheckpoint = {
                x: checkpoint.x,
                y: checkpoint.y
            };

            // Visual feedback
            checkpoint.color = '#27ae60';  // change to green
            showMessage('CHECKPOINT!', 90);  // display for 1.5 seconds

            // Audio feedback
            if (checkpoint.activateSound) {
                playSound(checkpoint.activateSound);
            }

            // Haptic feedback on mobile
            if (navigator.vibrate) {
                navigator.vibrate([30, 30, 30]);  // triple pulse
            }

            // Save progress (optional)
            saveGameProgress();
        }
    }
}

// ---- RESPAWNING ----
// When the player dies, respawn at checkpoint
function respawnPlayer() {
    if (activeCheckpoint) {
        // Respawn at checkpoint
        player.x = activeCheckpoint.x;
        player.y = activeCheckpoint.y;
    } else {
        // No checkpoint - respawn at level start
        player.x = spawnPoint.x;
        player.y = spawnPoint.y;
    }

    // Reset player state
    player.velocityX = 0;
    player.velocityY = 0;
    player.invincibleUntil = Date.now() + 2000;  // brief protection
}

// ---- CHECKPOINT VISUAL ----
// Inactive = blue, Active = green
function drawCheckpoint(checkpoint) {
    if (checkpoint.activated) {
        ctx.fillStyle = '#27ae60';  // green - active
    } else {
        ctx.fillStyle = '#3498db';  // blue - inactive
    }
    drawGameObject(checkpoint);
}`;
        }
    },

    // =========================================================================
    // PROJECTILE - Shooting mechanics
    // =========================================================================
    projectile: {
        title: "Projectiles",
        description: "How shooting and bullets work",
        getCode: function(data) {
            const speed = data.projectileSpeed || 8;
            const damage = data.projectileDamage || 1;
            const cooldown = data.projectileCooldown || 500;
            const mode = data.projectileMode || 'cooldown';

            return `// PROJECTILES: Shooting mechanics

// ---- PROJECTILE STATE ----
var projectiles = [];         // list of active projectiles
var lastFireTime = 0;         // when we last fired
${mode === 'ammo' ? `var ammo = ${data.projectileStartAmmo || 10};  // current ammo count` : ''}

// ---- FIRING ----
function fireProjectile() {
    var now = Date.now();

    // Check cooldown
    if (now - lastFireTime < [YOUR:${cooldown}]) {
        return;  // still cooling down
    }
    ${mode === 'ammo' ? `
    // Check ammo
    if (ammo <= 0) {
        return;  // out of ammo!
    }
    ammo--;  // use one bullet` : ''}

    // Create the projectile
    var projectile = {
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        width: 8,
        height: 8,
        speed: [YOUR:${speed}],
        direction: player.facingRight ? 1 : -1,
        damage: [YOUR:${damage}],
        createdAt: now
    };

    projectiles.push(projectile);
    lastFireTime = now;

    // Play fire sound
    playSound('shoot');
}

// ---- UPDATE PROJECTILES ----
function updateProjectiles() {
    for (var i = projectiles.length - 1; i >= 0; i--) {
        var p = projectiles[i];

        // Move the projectile
        p.x += p.speed * p.direction;

        // Check for enemy hits
        for (var enemy of enemies) {
            if (!enemy.defeated && isColliding(p, enemy)) {
                enemy.health -= p.damage;
                if (enemy.health <= 0) {
                    enemy.defeated = true;
                    player.score += 100;
                }
                projectiles.splice(i, 1);  // remove projectile
                break;
            }
        }

        // Remove if off screen or too old
        if (p.x < 0 || p.x > levelWidth * tileSize ||
            Date.now() - p.createdAt > 2000) {
            projectiles.splice(i, 1);
        }
    }
}`;
        }
    },

    // =========================================================================
    // MOVING PLATFORM - Platform movement and riding
    // =========================================================================
    movingPlatform: {
        title: "Moving Platforms",
        description: "How platforms move and carry the player",
        getCode: function(data) {
            const template = data.template || {};
            const speed = template.speed || 2;
            const axis = template.axis || 'x';
            const distance = template.distance || 100;

            return `// MOVING PLATFORMS: Platforms that carry the player

// ---- PLATFORM MOVEMENT ----
function updatePlatform(platform) {
    // Calculate movement based on axis
    ${axis === 'x' ? `
    // Horizontal movement
    platform.x += platform.direction * [YOUR:${speed}];

    // Reverse direction at edges
    if (platform.x >= platform.startX + [YOUR:${distance}]) {
        platform.direction = -1;  // go left
    }
    if (platform.x <= platform.startX) {
        platform.direction = 1;   // go right
    }` : `
    // Vertical movement
    platform.y += platform.direction * [YOUR:${speed}];

    // Reverse direction at edges
    if (platform.y >= platform.startY + [YOUR:${distance}]) {
        platform.direction = -1;  // go up
    }
    if (platform.y <= platform.startY) {
        platform.direction = 1;   // go down
    }`}
}

// ---- PLAYER RIDING PLATFORM ----
function checkPlatformRiding(platform) {
    // Is player standing on top of platform?
    var playerBottom = player.y + player.height;
    var platformTop = platform.y;

    var isOnTop = playerBottom >= platformTop - 2 &&
                  playerBottom <= platformTop + 5 &&
                  player.x + player.width > platform.x &&
                  player.x < platform.x + platform.width;

    if (isOnTop && player.velocityY >= 0) {
        // Player is riding the platform!
        player.onGround = true;
        player.y = platform.y - player.height;

        ${axis === 'x' ? `// Move player with horizontal platform
        player.x += platform.direction * [YOUR:${speed}];` : `// Move player with vertical platform
        player.y += platform.direction * [YOUR:${speed}];`}
    }
}`;
        }
    },

    // =========================================================================
    // MYSTERY BLOCK - Hit detection and item emission
    // =========================================================================
    mysteryBlock: {
        title: "Mystery Blocks",
        description: "How question blocks emit items when hit",
        getCode: function(data) {
            const template = data.template || {};
            const emitCount = template.emitCount || 1;
            const emitType = template.emitType || 'collectible';

            return `// MYSTERY BLOCKS: Blocks that give items when hit

// ---- HIT DETECTION ----
function handleMysteryBlockHit(block) {
    // Check if player is hitting from below
    var playerTop = player.y;
    var blockBottom = block.y + block.height;

    var isHittingFromBelow =
        player.velocityY < 0 &&  // player is moving upward
        playerTop <= blockBottom + 5 &&
        playerTop >= blockBottom - 10 &&
        player.x + player.width > block.x &&
        player.x < block.x + block.width;

    if (isHittingFromBelow && !block.isEmpty) {
        // Block was hit!
        emitItem(block);

        // Update block state
        block.emitCount--;
        if (block.emitCount <= 0) {
            block.isEmpty = true;
            block.color = '#8B4513';  // change to brown (empty)
        }

        // Play hit sound
        playSound(block.hitSound);

        // Stop player's upward movement
        player.velocityY = 0;
    }
}

// ---- EMIT ITEM ----
function emitItem(block) {
    // Create the item above the block
    var item = {
        x: block.x,
        y: block.y - 32,  // above the block
        type: '[YOUR:${emitType}]',
        // Animation: item pops up then settles
        popupOffset: 32,
        isAnimating: true
    };

    // Add to game objects
    gameObjects.push(item);

    // Emit [YOUR:${emitCount}] item(s) total
}

// ---- EMPTY BLOCK ----
// Empty blocks can still be bumped but give nothing
function drawMysteryBlock(block) {
    if (block.isEmpty) {
        ctx.fillStyle = '#8B4513';  // brown - empty
    } else {
        ctx.fillStyle = '#f1c40f';  // gold - has items
        // Optional: animate a "?" symbol
    }
    drawGameObject(block);
}`;
        }
    }
};
