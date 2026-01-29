// ============================================
// HELP SYSTEM
// ============================================
// Comprehensive help content with game design education

const helpContent = {
    about: {
        title: '🎮 Welcome to Game Maker!',
        content: `
            <div style="background: linear-gradient(135deg, rgba(233,69,96,0.2), rgba(102,126,234,0.2)); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <p style="margin: 0; font-size: 14px; color: #fff; line-height: 1.5;"><strong>Game Maker</strong> is a platformer game builder that teaches you the fundamentals of game design - no coding required! Build levels, design characters, and learn what makes games <em>feel</em> fun to play.</p>
            </div>

            <h4>🎯 What You'll Learn</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #e94560;">Level Design</strong>
                    <p style="font-size: 11px; color: #aaa; margin: 4px 0 0 0;">Create challenging, fair levels using tiles, platforms, and obstacles</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #3498db;">Game Feel</strong>
                    <p style="font-size: 11px; color: #aaa; margin: 4px 0 0 0;">Tune physics to make jumping and movement satisfying</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #2ecc71;">Game Objects</strong>
                    <p style="font-size: 11px; color: #aaa; margin: 4px 0 0 0;">Add enemies, collectibles, hazards, and power-ups</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #f39c12;">Polish & Juice</strong>
                    <p style="font-size: 11px; color: #aaa; margin: 4px 0 0 0;">Add screen shake, sounds, and effects that make games feel alive</p>
                </div>
            </div>

            <h4>🚀 Quick Start Guide</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                    <span style="background: #e94560; color: white; border-radius: 50%; min-width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px;">1</span>
                    <div>
                        <strong style="color: #fff;">Load a Tileset</strong>
                        <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">Drag an image onto the tileset area or paste a URL. This provides the visual building blocks for your level.</p>
                    </div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                    <span style="background: #e94560; color: white; border-radius: 50%; min-width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px;">2</span>
                    <div>
                        <strong style="color: #fff;">Assign Tiles to Keys</strong>
                        <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">Click tiles in your tileset to add them to the palette. Toggle "Solid" for platforms the player can stand on.</p>
                    </div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                    <span style="background: #e94560; color: white; border-radius: 50%; min-width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px;">3</span>
                    <div>
                        <strong style="color: #fff;">Draw Your Level</strong>
                        <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">Select a tile from the palette and paint on the canvas. Use the eraser to remove tiles.</p>
                    </div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                    <span style="background: #e94560; color: white; border-radius: 50%; min-width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px;">4</span>
                    <div>
                        <strong style="color: #fff;">Add Game Objects</strong>
                        <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">Place enemies, collectibles, hazards, and a goal flag from the Objects panel on the right.</p>
                    </div>
                </div>
                <div style="display: flex; align-items: flex-start;">
                    <span style="background: #e94560; color: white; border-radius: 50%; min-width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px;">5</span>
                    <div>
                        <strong style="color: #fff;">Test & Iterate</strong>
                        <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">Click the <strong style="color: #4ade80;">▶ Play</strong> button to test your game. Adjust, test, repeat!</p>
                    </div>
                </div>
            </div>

            <h4>💡 Game Design Principles</h4>
            <p style="font-size: 12px; color: #ccc; margin-bottom: 10px;">As you build, you'll naturally discover these professional game design concepts:</p>
            <ul style="font-size: 12px; color: #aaa; margin-left: 20px;">
                <li><strong style="color: #fff;">Risk vs Reward</strong> - Place valuable items in dangerous spots</li>
                <li><strong style="color: #fff;">Teaching Through Play</strong> - Introduce mechanics safely before challenging players</li>
                <li><strong style="color: #fff;">Pacing</strong> - Alternate between intense and calm sections</li>
                <li><strong style="color: #fff;">Visual Clarity</strong> - Players should instantly know what's dangerous</li>
                <li><strong style="color: #fff;">The 30-Second Rule</strong> - If the core loop isn't fun in 30 seconds, it won't be fun in 30 minutes</li>
            </ul>

            <h4 style="margin-top: 15px;">🎓 Learning Path</h4>
            <div style="background: rgba(46, 204, 113, 0.15); border-left: 3px solid #2ecc71; padding: 10px 12px; border-radius: 0 6px 6px 0;">
                <p style="font-size: 11px; color: #ccc; margin: 0 0 8px 0;"><strong style="color: #2ecc71;">Recommended progression:</strong></p>
                <ol style="font-size: 11px; color: #aaa; margin: 0 0 0 16px; padding: 0;">
                    <li>Build a simple level with platforms and a goal</li>
                    <li>Add enemies and learn about player challenge</li>
                    <li>Experiment with Game Feel presets (Game Settings → Game Feel)</li>
                    <li>Add collectibles and scoring</li>
                    <li>Create multiple levels with increasing difficulty</li>
                    <li>Polish with sounds, backgrounds, and effects</li>
                </ol>
            </div>

            <h4 style="margin-top: 15px;">⌨️ Keyboard Shortcuts</h4>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 11px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                <code style="color: #99f;">1-9, A-Z</code><span style="color: #aaa;">Select tile from palette</span>
                <code style="color: #99f;">E</code><span style="color: #aaa;">Eraser tool</span>
                <code style="color: #99f;">G</code><span style="color: #aaa;">Toggle grid</span>
                <code style="color: #99f;">Ctrl+S</code><span style="color: #aaa;">Save project</span>
                <code style="color: #99f;">Ctrl+Z</code><span style="color: #aaa;">Undo</span>
                <code style="color: #99f;">Ctrl+Y</code><span style="color: #aaa;">Redo</span>
                <code style="color: #99f;">Space</code><span style="color: #aaa;">Play/Stop game</span>
            </div>

            <div class="help-tip" style="margin-top: 15px;"><p>Click the <strong>?</strong> icons throughout the app to learn about specific features. Every panel has tips to help you understand game design concepts!</p></div>
        `
    },
    tileset: {
        title: 'Tileset',
        content: `
            <h4>What is a Tileset?</h4>
            <p>A tileset is an image containing all the visual pieces (tiles) you'll use to build your level. Think of it like a sheet of stickers you can place on a grid.</p>
            <p>Tilesets are organized in a grid pattern. Each small square is one tile that you can select and place in your level.</p>

            <h4>How to Use</h4>
            <ul>
                <li><strong>Drag & drop</strong> an image file onto the dropzone</li>
                <li><strong>Load from URL</strong> if your tileset is hosted online</li>
                <li>Choose the correct <strong>tile size</strong> (usually 16x16 or 32x32 pixels)</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p>Good tilesets have <strong>visual consistency</strong> - all tiles should look like they belong in the same world. Professional games often use a limited color palette to achieve this cohesive look.</p>

            <div class="help-tip"><p>Tilesets work best when all tiles are the same size and arranged in a grid pattern. Free tilesets are available at itch.io and OpenGameArt.org!</p></div>
        `
    },
    palette: {
        title: 'Tile Palette',
        content: `
            <h4>Assigning Tiles to Keys</h4>
            <p>The tile palette shows which tiles you've assigned to keyboard keys. Each tile gets a letter (A-Z) that represents it in your level data.</p>

            <h4>How It Works</h4>
            <ul>
                <li><strong>Click a tile</strong> in the tileset preview to select it</li>
                <li>The selected tile appears in your palette with an assigned key</li>
                <li>Toggle <strong>Solid</strong> to make the tile block player movement</li>
                <li><strong>Click a palette tile</strong> to select it for drawing</li>
                <li>Press the <strong>keyboard key</strong> to quickly select that tile</li>
            </ul>

            <h4>Solid vs Non-Solid</h4>
            <ul>
                <li><strong>Solid tiles</strong> - Player and enemies can't pass through (platforms, walls, ground)</li>
                <li><strong>Non-solid tiles</strong> - Decorative only (background details, clouds, grass tufts)</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Readable levels</strong> are crucial! Players should instantly recognize what they can stand on vs. what's decoration. Use distinct visual styles for solid and non-solid tiles.</p>

            <div class="help-tip"><p>Ground and walls should be Solid. Decorations and backgrounds should be non-solid so the player can walk through them.</p></div>
        `
    },
    backgrounds: {
        title: '🖼️ Background Layers & Parallax',
        content: `
            <div style="background: linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15)); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <p style="margin: 0; font-size: 13px; color: #ddd;"><strong>✨ Parallax</strong> creates the illusion of depth! Distant layers move slowly, nearby layers move fast - just like looking out a car window.</p>
            </div>

            <h4>📝 Quick Start (4 Steps)</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 10px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="background: #e94560; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; margin-right: 8px;">1</span>
                    <span style="color: #ccc;">Click <strong style="color: #4ade80;">+ Add Background Layer</strong></span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="background: #e94560; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; margin-right: 8px;">2</span>
                    <span style="color: #ccc;">Paste an image URL (PNG recommended)</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="background: #e94560; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; margin-right: 8px;">3</span>
                    <span style="color: #ccc;">Set the <strong style="color: #99f;">Speed</strong> (0 = still, 1 = fast)</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <span style="background: #e94560; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; margin-right: 8px;">4</span>
                    <span style="color: #ccc;">Add more layers for depth!</span>
                </div>
            </div>

            <h4>🎚️ Speed Guide</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 10px; margin-bottom: 15px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: #88f;">🏔️ Far mountains/sky</span>
                    <code style="background: rgba(102,126,234,0.3); padding: 2px 8px; border-radius: 4px;">0.1 - 0.2</code>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: #8f8;">🌲 Trees/hills</span>
                    <code style="background: rgba(102,126,234,0.3); padding: 2px 8px; border-radius: 4px;">0.3 - 0.5</code>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
                    <span style="color: #f88;">🌿 Close bushes/fog</span>
                    <code style="background: rgba(102,126,234,0.3); padding: 2px 8px; border-radius: 4px;">0.6 - 0.8</code>
                </div>
            </div>

            <h4>📚 Layer Order</h4>
            <div style="background: linear-gradient(180deg, #1a1a3e 0%, #2a1a3e 50%, #3a2a3e 100%); border-radius: 6px; padding: 12px; margin-bottom: 15px; text-align: center;">
                <div style="color: #88f; font-size: 11px; margin-bottom: 4px;">━━━ Layer 1: Sky (speed 0.1) ━━━</div>
                <div style="color: #8f8; font-size: 11px; margin-bottom: 4px;">━━━ Layer 2: Mountains (speed 0.3) ━━━</div>
                <div style="color: #f88; font-size: 11px; margin-bottom: 4px;">━━━ Layer 3: Trees (speed 0.5) ━━━</div>
                <div style="color: #fff; font-size: 11px; border-top: 2px dashed #e94560; padding-top: 6px; margin-top: 6px;">🎮 YOUR GAME TILES</div>
            </div>
            <p style="font-size: 11px; color: #999; text-align: center; margin-bottom: 15px;">First layer = furthest back. Add layers front to back!</p>

            <div class="help-tip">
                <p><strong>Pro tip:</strong> Use seamlessly-tiling images! The background repeats horizontally.</p>
            </div>
        `
    },
    levelSize: {
        title: 'Level Size',
        content: `
            <h4>Grid Dimensions</h4>
            <p>Level size determines how big your game world is, measured in tiles (not pixels).</p>
            <ul>
                <li><strong>Width</strong> - How many tiles wide (horizontal scrolling)</li>
                <li><strong>Height</strong> - How many tiles tall (vertical exploration)</li>
            </ul>

            <h4>Calculating Pixel Size</h4>
            <p>Total size in pixels = tiles × tile size</p>
            <p>Example: 100 tiles wide × 16px = 1,600 pixels wide</p>

            <h4>Typical Sizes</h4>
            <ul>
                <li><strong>Small level:</strong> 50×15 tiles (quick challenge)</li>
                <li><strong>Medium level:</strong> 150×20 tiles (exploration)</li>
                <li><strong>Large level:</strong> 300×30 tiles (epic adventure)</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Pacing is everything!</strong> Shorter levels with frequent checkpoints feel more fair to players. Long levels without breaks can be frustrating. Consider: how far should a player lose progress if they die?</p>

            <div class="help-tip"><p>Start small! A well-designed 50-tile level is better than an empty 300-tile level. You can always expand later.</p></div>
        `
    },
    physics: {
        title: 'Player Properties',
        content: `
            <h4>Movement & Physics</h4>
            <p>These settings control how your character moves and how the game "feels" to play. Getting these right is crucial for fun gameplay!</p>

            <h4>Physics Settings</h4>
            <ul>
                <li><strong>Gravity (0.3-1.0)</strong> - How fast the player falls. Higher = heavier feel</li>
                <li><strong>Jump Power (8-15)</strong> - How high the player jumps. Higher = floatier</li>
                <li><strong>Move Speed (3-8)</strong> - How fast the player runs. Higher = faster</li>
                <li><strong>Bounciness (0-1)</strong> - How much the player bounces off surfaces</li>
                <li><strong>Friction (0-1)</strong> - How quickly the player stops when not moving</li>
            </ul>

            <h4>Jump Mode</h4>
            <ul>
                <li><strong>Normal Jump</strong> - Standard platformer jumping, only from ground</li>
                <li><strong>Double Jump</strong> - Can jump once more while in the air</li>
                <li><strong>Fly (Flappy Bird)</strong> - Tap to flap upward anytime! Great for endless runners or bird games</li>
            </ul>
            <p>In Fly mode, adjust <strong>Flap Power</strong> to control how much each tap lifts the player.</p>

            <h4>Player Appearance</h4>
            <ul>
                <li><strong>Color</strong> - Fallback color when no sprite is set</li>
                <li><strong>Width/Height</strong> - Player hitbox size in pixels</li>
                <li><strong>Sprite</strong> - Custom character image (optional)</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>"Game feel"</strong> (also called "juice") is what makes games satisfying. The relationship between gravity and jump power is critical:</p>
            <ul>
                <li><strong>Mario-style:</strong> Gravity ~0.5, Jump ~12 (floaty, controllable)</li>
                <li><strong>Mega Man-style:</strong> Gravity ~0.8, Jump ~10 (snappy, precise)</li>
                <li><strong>Celeste-style:</strong> Gravity ~0.6, Jump ~11, low friction (momentum-based)</li>
            </ul>

            <div class="help-tip"><p>Test your physics constantly! Jump should feel satisfying. Run speed should match platform gaps. Small tweaks make huge differences.</p></div>
        `
    },
    playerSprite: {
        title: 'Player Sprite',
        content: `
            <h4>Custom Player Character</h4>
            <p>Replace the default colored rectangle with your own character artwork!</p>

            <h4>Sprite Sheet Animation</h4>
            <p>For animated characters, use a <strong>horizontal sprite sheet</strong> - all frames arranged in a single row.</p>
            <ul>
                <li><strong>URL</strong> - Direct link to your sprite image</li>
                <li><strong>Frames</strong> - Number of animation frames (1 = static image)</li>
            </ul>

            <h4>Example Dimensions</h4>
            <p>A 4-frame walk animation at 32×32 pixels would be:</p>
            <p>Image size: <code>128×32</code> (4 frames × 32px wide)</p>

            <h4>Automatic Features</h4>
            <ul>
                <li>Sprite <strong>flips horizontally</strong> when changing direction</li>
                <li>Frames <strong>cycle automatically</strong> when walking</li>
                <li>Animation <strong>pauses</strong> when standing still</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Character silhouette</strong> is important! Players should instantly recognize their character against any background. Bright colors and distinct shapes help. Consider adding an outline if your character blends in.</p>

            <div class="help-tip"><p>Start with a simple static image (1 frame). Once that works, try adding a walk animation. Free sprites at itch.io!</p></div>
        `
    },

    playerAppearance: {
        title: '🎨 Player Appearance',
        content: `
            <div style="background: linear-gradient(135deg, rgba(233,69,96,0.2), rgba(155,89,182,0.2)); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <p style="margin: 0; font-size: 13px; color: #fff; line-height: 1.5;">Customize how your player looks and animates. Visual polish makes your game feel professional!</p>
            </div>

            <h4>📐 Size & Hitbox</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <p style="font-size: 12px; color: #ccc; margin-bottom: 10px;">The player has two sizes:</p>
                <div style="font-size: 11px; color: #aaa;">
                    <div style="margin-bottom: 6px;"><strong style="color: #ff6b6b;">Visual Size</strong> - How big the sprite appears (Width & Height)</div>
                    <div><strong style="color: #00ff88;">Hitbox Size</strong> - The collision area used for physics</div>
                </div>
                <p style="font-size: 11px; color: #888; margin-top: 10px;">Tip: Make the hitbox slightly smaller than the sprite for more forgiving gameplay!</p>
            </div>

            <h4>🎨 Squash & Stretch</h4>
            <p style="font-size: 12px; color: #ccc;">A classic animation principle from Disney that makes characters feel alive! When enabled, the player:</p>
            <ul style="font-size: 12px; color: #ccc; margin-left: 16px; margin-bottom: 10px;">
                <li><strong style="color: #fff;">Stretches vertically</strong> when jumping (elongated, reaching up)</li>
                <li><strong style="color: #fff;">Squashes horizontally</strong> when landing (compressed by impact)</li>
                <li><strong style="color: #fff;">Extra stretch</strong> when bouncing on springs or stomping enemies</li>
            </ul>
            <p style="font-size: 11px; color: #aaa; margin-bottom: 10px;">This makes characters feel bouncy and dynamic, not like rigid robots!</p>

            <h4>🎚️ Intensity Settings</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="font-size: 11px; color: #aaa; line-height: 1.6;">
                    <div style="margin-bottom: 6px;"><strong style="color: #e94560;">Subtle (0.3-0.5x)</strong> - Barely noticeable, realistic feel</div>
                    <div style="margin-bottom: 6px;"><strong style="color: #f39c12;">Light (0.6-0.8x)</strong> - Gentle animation, professional look</div>
                    <div style="margin-bottom: 6px;"><strong style="color: #3498db;">Normal (0.9-1.2x)</strong> - Standard cartoon animation</div>
                    <div style="margin-bottom: 6px;"><strong style="color: #9b59b6;">Strong (1.3-1.6x)</strong> - Very bouncy, playful feel</div>
                    <div><strong style="color: #2ecc71;">Exaggerated (1.7-2.0x)</strong> - Over-the-top, silly animation</div>
                </div>
            </div>

            <h4>🎮 When to Use Each Setting</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #3498db; font-size: 11px;">🏃 Realistic Platformer</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Subtle or Light - keeps focus on precision</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #2ecc71; font-size: 11px;">🎪 Cartoony Game</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Normal or Strong - bouncy, fun feel</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #9b59b6; font-size: 11px;">🤪 Silly/Comedy</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Exaggerated - maximum squish!</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #e74c3c; font-size: 11px;">🔲 Pixel Art</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Subtle or Off - can look odd with pixels</p>
                </div>
            </div>

            <div class="help-tip"><p>Squash & Stretch is most noticeable with the default colored rectangle player. Custom sprites also benefit from it, but very detailed artwork may look better with lower intensity.</p></div>
        `
    },

    spawnPoint: {
        title: 'Player Spawn Point',
        content: `
            <h4>Where the Player Starts</h4>
            <p>The spawn point determines where your player appears when the game begins or after losing a life.</p>
            <p>The player is always visible on the canvas - look for the <strong>🎮 PLAYER</strong> label!</p>

            <h4>Auto vs Custom Spawn</h4>
            <ul>
                <li><strong>Auto-Detect</strong> (orange outline) - Finds the first empty tile above a solid tile</li>
                <li><strong>Custom</strong> (green outline) - You choose exactly where the player starts</li>
            </ul>

            <h4>Moving the Player</h4>
            <ol>
                <li>Select the <strong>🔄 Move</strong> tool from the toolbar</li>
                <li>Click and drag the player to reposition them</li>
                <li>Release to set the new spawn position</li>
            </ol>
            <p>Use <strong>Reset to Auto</strong> to return to automatic spawn detection.</p>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>First impressions matter!</strong> The spawn point is the first thing players see. Place it somewhere that:</p>
            <ul>
                <li>Is visually safe and welcoming</li>
                <li>Gives the player a moment to orient themselves</li>
                <li>Shows the direction they should go</li>
                <li>Isn't immediately dangerous (no enemies right at spawn!)</li>
            </ul>

            <div class="help-tip"><p>Professional tip: Leave a few tiles of "safe space" at the start of each level before any challenges begin.</p></div>
        `
    },
    tools: {
        title: 'Editor Tools',
        content: `
            <h4>Drawing Tools</h4>
            <ul>
                <li><strong>✏️ Draw</strong> - Click or drag to place tiles one at a time</li>
                <li><strong>🪣 Fill</strong> - Flood-fill an area with the selected tile</li>
                <li><strong>🧹 Erase</strong> - Click or drag to remove tiles and objects</li>
                <li><strong>🔄 Move</strong> - Drag objects, tiles, or the player to new positions</li>
            </ul>

            <h4>Mouse Controls</h4>
            <ul>
                <li><strong>Left-click</strong> - Use current tool</li>
                <li><strong>Right-click</strong> - Erase (or fill with empty in Fill mode)</li>
                <li><strong>Middle-drag</strong> - Pan around the level</li>
                <li><strong>Scroll wheel</strong> - Pan vertically</li>
                <li><strong>Shift+Scroll</strong> - Pan horizontally</li>
            </ul>

            <h4>Move Tool Tips</h4>
            <p>The Move tool can drag:</p>
            <ul>
                <li><strong>Player</strong> - Sets a custom spawn point</li>
                <li><strong>Game objects</strong> - Enemies, coins, goals, etc.</li>
                <li><strong>Tiles</strong> - Individual tiles can be relocated</li>
            </ul>
            <p>Right-click while dragging to cancel the move.</p>

            <h4>Keyboard Shortcuts</h4>
            <ul>
                <li><strong>Ctrl+Z</strong> - Undo</li>
                <li><strong>Ctrl+Y</strong> - Redo</li>
                <li><strong>Ctrl+S</strong> - Save project</li>
                <li><strong>A-Z keys</strong> - Select assigned tile</li>
            </ul>

            <div class="help-tip"><p>Use Draw for details, Fill for large areas, Move to adjust placement, and Erase to fix mistakes!</p></div>
        `
    },
    gameObjects: {
        title: 'Game Objects',
        content: `
            <h4>Interactive Objects</h4>
            <p>Game objects are the interactive elements that bring your level to life! Click an object type, then click on the level to place it.</p>

            <h4>Object Categories</h4>
            <p><strong>Enemies</strong> - Characters that challenge the player</p>
            <ul>
                <li>👾 <strong>Patrol</strong> - Walks back and forth</li>
                <li>🦘 <strong>Jumper</strong> - Hops up and down</li>
                <li>🎯 <strong>Chaser</strong> - Follows the player</li>
                <li>📍 <strong>Stationary</strong> - Stays in one place</li>
            </ul>

            <p><strong>Collectibles</strong> - Items players gather</p>
            <ul>
                <li>🪙 <strong>Coins</strong> - Basic score items</li>
                <li>💎 <strong>Gems</strong> - Bonus points</li>
                <li>⭐ <strong>Stars</strong> - Special collectibles</li>
            </ul>

            <p><strong>Powerups</strong> - Beneficial effects</p>
            <ul>
                <li>❤️ <strong>Health</strong> - Extra life or heal</li>
                <li>⚡ <strong>Speed Boost</strong> - Move faster</li>
                <li>🛡️ <strong>Shield</strong> - Temporary invincibility</li>
                <li>🔫 <strong>Ammo</strong> - Projectile ammunition</li>
            </ul>

            <p><strong>Level Objects</strong></p>
            <ul>
                <li>🚩 <strong>Goal</strong> - Level completion point</li>
                <li>⚠️ <strong>Hazard</strong> - Instant damage zone</li>
                <li>🔺 <strong>Spring</strong> - Bounces player upward</li>
                <li>⛳ <strong>Checkpoint</strong> - Respawn point when player dies</li>
            </ul>

            <p><strong>✖ Deselect</strong></p>
            <p>Click Deselect to stop placing objects and return to tile editing mode. This prevents accidentally placing objects when you're done.</p>

            <h4>Object Templates</h4>
            <p>Click the <strong>⚙️ gear icon</strong> to customize any object type with custom sprites, sounds, and behaviors!</p>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Object placement is level design!</strong> Consider:</p>
            <ul>
                <li>Introduce one new element at a time</li>
                <li>Place collectibles to guide player movement</li>
                <li>Position enemies to create interesting challenges</li>
                <li>Always have enough health pickups for fair difficulty</li>
            </ul>

            <div class="help-tip"><p>Every level needs at least one Goal! Place collectibles to guide players toward it.</p></div>
        `
    },
    levels: {
        title: 'Multi-Level Games',
        content: `
            <h4>Creating Multiple Levels</h4>
            <p>Your game can have multiple levels! Players progress through each one, building toward a complete game experience.</p>

            <h4>Level Management</h4>
            <ul>
                <li><strong>+ Add</strong> - Create a new empty level</li>
                <li><strong>📋 Duplicate</strong> - Copy current level as a starting point</li>
                <li><strong>⚙️ Manage</strong> - Reorder, rename, or delete levels</li>
            </ul>

            <h4>Level Progression</h4>
            <p>When a player completes Level 1, they automatically advance to Level 2, and so on. You can customize this in each level's settings.</p>

            <h4>Shared Resources</h4>
            <p>All levels share:</p>
            <ul>
                <li>Tileset and tile definitions</li>
                <li>Object templates (enemies, collectibles)</li>
                <li>Physics settings</li>
                <li>Player score (carries between levels)</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Difficulty curve</strong> is crucial! Great games teach through play:</p>
            <ul>
                <li><strong>Level 1:</strong> Introduce basic movement, few hazards</li>
                <li><strong>Level 2:</strong> Add one new mechanic (e.g., enemies)</li>
                <li><strong>Level 3:</strong> Combine mechanics in new ways</li>
                <li><strong>Later levels:</strong> Challenge mastery of all skills</li>
            </ul>
            <p>Each level should teach something new or test skills in a fresh way!</p>

            <div class="help-tip"><p>Start with 3-5 levels. Quality over quantity! A few great levels beats many mediocre ones.</p></div>
        `
    },
    goalCondition: {
        title: 'Level Goal Conditions',
        content: `
            <h4>How Players Complete a Level</h4>
            <p>Each level can have a different victory condition, adding variety to your game!</p>

            <h4>Goal Types</h4>
            <ul>
                <li><strong>🚩 Reach the Goal</strong> - Touch the goal flag to complete (classic platformer)</li>
                <li><strong>⭐ Collect All</strong> - Gather every collectible before the goal activates</li>
                <li><strong>🎯 Reach Score</strong> - Achieve a target score to unlock completion</li>
                <li><strong>⏱️ Survive Time</strong> - Stay alive for a set duration</li>
            </ul>

            <h4>When to Use Each</h4>
            <ul>
                <li><strong>Reach Goal</strong> - Standard exploration levels, speedrun challenges</li>
                <li><strong>Collect All</strong> - Puzzle levels, scavenger hunts, 100% completion</li>
                <li><strong>Reach Score</strong> - Arcade-style levels, combo challenges</li>
                <li><strong>Survive Time</strong> - Boss fights, endurance challenges, defense levels</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Variety prevents monotony!</strong> Mixing goal types keeps players engaged:</p>
            <ul>
                <li>Start with simple "reach the goal" levels</li>
                <li>Add a "collect all" level for a change of pace</li>
                <li>Use "survive" for boss or challenge levels</li>
                <li>Save "reach score" for bonus stages</li>
            </ul>

            <div class="help-tip"><p>The goal type changes how players approach your level. "Collect All" encourages exploration; "Survive" creates tension!</p></div>
        `
    },
    autoscroll: {
        title: 'Autoscroll Mode',
        content: `
            <h4>Automatic Camera Scrolling</h4>
            <p>Make your level scroll automatically like Flappy Bird! The camera moves on its own, and players must keep up or die.</p>

            <h4>Settings</h4>
            <ul>
                <li><strong>Enable Autoscroll</strong> - Turn on automatic camera movement</li>
                <li><strong>Scroll Speed (1-10)</strong> - How fast the level scrolls (pixels per frame)</li>
                <li><strong>When Level Ends</strong>:
                    <ul>
                        <li><strong>Stop at Finish</strong> - Camera stops at the end, player can reach goal</li>
                        <li><strong>Loop Endlessly</strong> - Level loops forever for endless runner style</li>
                    </ul>
                </li>
            </ul>

            <h4>⚠️ Death Conditions</h4>
            <ul>
                <li>Player dies if they fall off the <strong>left edge</strong> of the screen</li>
                <li>Player is pushed forward if they lag behind</li>
                <li>After dying, player respawns ahead of the camera</li>
            </ul>

            <h4>🎮 Best Practices</h4>
            <ul>
                <li><strong>Combine with Fly mode</strong> - Set Jump Mode to "Fly" for Flappy Bird style!</li>
                <li><strong>Design for flow</strong> - Ensure platforms are reachable at scroll speed</li>
                <li><strong>Test at different speeds</strong> - Slower is easier, faster is more challenging</li>
                <li><strong>Use Loop mode</strong> - Great for endless runners or high score challenges</li>
            </ul>

            <div class="help-tip"><p>Pro tip: For a true Flappy Bird clone, use Fly mode + Autoscroll + vertical obstacles!</p></div>
        `
    },
    projectiles: {
        title: 'Projectile System',
        content: `
            <h4>Player Projectiles</h4>
            <p>Give your player the ability to shoot! Projectiles can defeat enemies from a distance, adding action gameplay.</p>

            <h4>Enabling Projectiles</h4>
            <p>Open <strong>Player Properties → Projectile Settings</strong> and enable the system.</p>

            <h4>Fire Modes</h4>
            <ul>
                <li><strong>Cooldown</strong> - Unlimited shots with a delay between each (arcade-style)</li>
                <li><strong>Ammo</strong> - Limited ammunition that must be collected (tactical)</li>
            </ul>

            <h4>Key Settings</h4>
            <ul>
                <li><strong>Fire Key</strong> - Which button shoots (X, Z, Shift, etc.)</li>
                <li><strong>Cooldown</strong> - Milliseconds between shots</li>
                <li><strong>Speed</strong> - How fast projectiles travel</li>
                <li><strong>Damage</strong> - How much health enemies lose per hit</li>
                <li><strong>Lifetime</strong> - How long before projectiles disappear</li>
            </ul>

            <h4>Collision Behavior</h4>
            <p>Projectiles are destroyed when they hit:</p>
            <ul>
                <li><strong>Solid tiles</strong> - Walls, platforms, ground</li>
                <li><strong>Enemies</strong> - Deals damage and destroys the projectile</li>
            </ul>

            <h4>Collect Items with Projectiles</h4>
            <p>Enable <strong>"Projectiles Collect Items"</strong> to let projectiles pick up collectibles on contact!</p>
            <ul>
                <li>Projectiles pass through collectibles (not destroyed)</li>
                <li>Great for grabbing coins in hard-to-reach places</li>
                <li>Works with "Collect All" goal conditions</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Shooting changes everything!</strong> Consider:</p>
            <ul>
                <li><strong>Cooldown mode</strong> - More action-focused, like Mega Man</li>
                <li><strong>Ammo mode</strong> - More strategic, forces careful aim</li>
                <li>Faster projectiles are easier to hit with but less satisfying</li>
                <li>Slower, bigger projectiles feel more impactful</li>
            </ul>
            <p>Balance tip: If shooting is too easy, enemies become trivial. If too hard, players will avoid using it!</p>

            <div class="help-tip"><p>Add "Ammo Pack" powerups in your levels if using ammo mode, so players can replenish!</p></div>
        `
    },
    powerups: {
        title: 'Powerups',
        content: `
            <h4>Power-Up System</h4>
            <p>Powerups give temporary or permanent benefits to the player. They add excitement and reward exploration!</p>

            <h4>Powerup Effects</h4>
            <ul>
                <li><strong>❤️ Extra Life</strong> - Adds one life to the player's count</li>
                <li><strong>💚 Heal</strong> - Restores health (if using health system)</li>
                <li><strong>⚡ Speed Boost</strong> - Temporarily increases movement speed</li>
                <li><strong>🦘 Jump Boost</strong> - Temporarily increases jump power</li>
                <li><strong>🛡️ Invincibility</strong> - Temporary immunity to damage</li>
                <li><strong>🔫 Ammo Pack</strong> - Refills projectile ammunition</li>
            </ul>

            <h4>Creating Custom Powerups</h4>
            <ol>
                <li>Select "Powerup" from object categories</li>
                <li>Click the ⚙️ gear to open template editor</li>
                <li>Choose the effect type and customize appearance</li>
                <li>Set duration for temporary effects</li>
            </ol>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Powerups should feel rewarding!</strong> Best practices:</p>
            <ul>
                <li><strong>Placement:</strong> Put powerups in slightly risky locations to reward skilled play</li>
                <li><strong>Timing:</strong> Place health before difficult sections, not after</li>
                <li><strong>Visibility:</strong> Make powerups visually distinct and enticing</li>
                <li><strong>Fairness:</strong> Don't require powerups to progress - they should be bonuses</li>
            </ul>
            <p>The "invincibility star" from Mario is iconic because it's rare, powerful, and fun to use!</p>

            <div class="help-tip"><p>Temporary powerups (speed, shield) create exciting "use it now!" moments. Permanent ones (lives, ammo) reward exploration.</p></div>
        `
    },
    enemyBehaviors: {
        title: 'Enemy Behaviors',
        content: `
            <h4>Enemy AI Patterns</h4>
            <p>Different enemy behaviors create different challenges. Choose behaviors that match your level's design!</p>

            <h4>Behavior Types</h4>
            <ul>
                <li><strong>🚶 Patrol</strong> - Walks left and right between walls or edges</li>
                <li><strong>🦘 Jumper</strong> - Hops up and down in place</li>
                <li><strong>🎯 Chaser</strong> - Moves toward the player when in range</li>
                <li><strong>📍 Stationary</strong> - Stays in one place (good for turrets or obstacles)</li>
            </ul>

            <h4>Enemy Properties</h4>
            <ul>
                <li><strong>Health</strong> - How many hits to defeat (1-10)</li>
                <li><strong>Speed</strong> - How fast the enemy moves</li>
                <li><strong>Damage</strong> - How much harm to the player on contact</li>
                <li><strong>Detection Range</strong> - How far the enemy can "see" (for chasers)</li>
            </ul>

            <h4>Defeating Enemies</h4>
            <p>Players can defeat enemies by:</p>
            <ul>
                <li><strong>Jumping on top</strong> - Classic platformer stomp</li>
                <li><strong>Projectiles</strong> - Shooting (if enabled)</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Enemy placement is puzzle design!</strong></p>
            <ul>
                <li><strong>Patrol enemies</strong> - Great for timing challenges over gaps</li>
                <li><strong>Jumpers</strong> - Block vertical paths, require timing</li>
                <li><strong>Chasers</strong> - Create tension, force quick decisions</li>
                <li><strong>Stationary</strong> - Predictable hazards, good for learning</li>
            </ul>
            <p>Introduce each enemy type in a safe environment before using it in dangerous situations!</p>

            <div class="help-tip"><p>Mix behaviors! A patrol enemy near a jumper creates complex, interesting challenges.</p></div>
        `
    },
    objectTemplates: {
        title: 'Object Templates',
        content: `
            <h4>Customizing Objects</h4>
            <p>Object templates let you customize the appearance and behavior of every object type in your game!</p>

            <h4>Opening the Template Editor</h4>
            <ol>
                <li>Find the object category in the left panel</li>
                <li>Click the <strong>⚙️ gear icon</strong> next to any object</li>
                <li>Customize in the template editor panel</li>
            </ol>

            <h4>Template Properties</h4>
            <ul>
                <li><strong>Sprite URL</strong> - Custom image for the object</li>
                <li><strong>Frame Count</strong> - Animation frames (for sprite sheets)</li>
                <li><strong>Color</strong> - Fallback color if no sprite</li>
                <li><strong>Symbol</strong> - Emoji shown in editor</li>
                <li><strong>Sound</strong> - Audio played on interaction</li>
            </ul>

            <h4>Type-Specific Settings</h4>
            <p>Different object types have unique options:</p>
            <ul>
                <li><strong>Enemies:</strong> Behavior, speed, health, damage</li>
                <li><strong>Collectibles:</strong> Point value</li>
                <li><strong>Powerups:</strong> Effect type, duration, amount</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Visual consistency matters!</strong></p>
            <ul>
                <li>All enemies should share a visual style</li>
                <li>Collectibles should "pop" against backgrounds</li>
                <li>Hazards should look dangerous (spikes, fire, etc.)</li>
                <li>Powerups should look beneficial (hearts, stars)</li>
            </ul>
            <p>Players learn what things do by how they look. Be consistent!</p>

            <div class="help-tip"><p>Changes to templates affect all objects of that type. Great for quickly reskinning your whole game!</p></div>
        `
    },
    gameRules: {
        title: 'Game Rules',
        content: `
            <h4>Core Game Settings</h4>
            <p>Game rules affect the overall gameplay experience across all levels.</p>

            <h4>Lives System</h4>
            <ul>
                <li><strong>Starting Lives</strong> - How many lives players begin with (1-10)</li>
                <li>Players lose a life when hitting hazards, enemies, or falling into pits</li>
                <li>Game over when lives reach zero</li>
                <li>Collect hearts/1-ups to gain extra lives</li>
            </ul>

            <h4>Score Values</h4>
            <ul>
                <li><strong>Coin Value</strong> - Points per coin collected</li>
                <li><strong>Gem Value</strong> - Points per gem collected</li>
                <li>Score persists across levels</li>
            </ul>

            <h4>Volume Settings</h4>
            <ul>
                <li><strong>Master Volume</strong> - Overall game volume</li>
                <li><strong>Music Volume</strong> - Background music level</li>
                <li><strong>SFX Volume</strong> - Sound effects level</li>
            </ul>

            <h4>Mobile Controls</h4>
            <p>Enable touch controls for mobile devices - adds on-screen buttons for movement, jump, and shooting.</p>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Difficulty balancing:</strong></p>
            <ul>
                <li><strong>Easy:</strong> 5+ lives, frequent health pickups</li>
                <li><strong>Medium:</strong> 3 lives, occasional pickups</li>
                <li><strong>Hard:</strong> 1-2 lives, rare pickups</li>
            </ul>
            <p>Playtest with friends! What feels fair to you might be too hard (or easy) for others.</p>

            <div class="help-tip"><p>More lives = more forgiving. Fewer lives = more tension. Find the right balance for your target audience!</p></div>
        `
    },
    sounds: {
        title: 'Sound Effects & Music',
        content: `
            <h4>Audio in Your Game</h4>
            <p>Sound brings your game to life! Add sound effects for actions and background music for atmosphere.</p>

            <h4>Sound Effect Types</h4>
            <ul>
                <li><strong>Player Sounds:</strong> Jump, hurt/damage, shoot</li>
                <li><strong>Object Sounds:</strong> Coin collect, enemy defeat, powerup</li>
                <li><strong>Game Sounds:</strong> Level complete, game over</li>
            </ul>

            <h4>Adding Sounds</h4>
            <ol>
                <li>Find the sound URL (MP3, WAV, or OGG format)</li>
                <li>Paste into the appropriate sound field</li>
                <li>Click the ▶️ button to preview</li>
            </ol>

            <h4>Volume Categories</h4>
            <ul>
                <li><strong>Master</strong> - Affects everything</li>
                <li><strong>Music</strong> - Background tracks only</li>
                <li><strong>SFX</strong> - Sound effects only</li>
            </ul>
            <p>These let players customize their experience!</p>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Audio feedback is crucial!</strong></p>
            <ul>
                <li><strong>Instant feedback:</strong> Play sounds immediately when actions happen</li>
                <li><strong>Distinct sounds:</strong> Each action should sound different</li>
                <li><strong>Satisfying sounds:</strong> Coin collection should feel rewarding!</li>
                <li><strong>Don't overdo it:</strong> Too many sounds create noise</li>
            </ul>
            <p>Free game sounds at freesound.org and OpenGameArt.org!</p>

            <div class="help-tip"><p>Test with sound off too! Your game should still be playable without audio for accessibility.</p></div>
        `
    },
    mobileControls: {
        title: 'Mobile Controls',
        content: `
            <h4>Touch Screen Support</h4>
            <p>Enable mobile controls to make your game playable on phones and tablets!</p>

            <h4>On-Screen Controls</h4>
            <p>When enabled, the game shows:</p>
            <ul>
                <li><strong>D-Pad / Arrows</strong> - Left and right movement buttons</li>
                <li><strong>Jump Button</strong> - Large button for jumping</li>
                <li><strong>Shoot Button</strong> - Appears if projectiles are enabled</li>
            </ul>

            <h4>Control Layout</h4>
            <p>Controls are positioned for comfortable thumb access:</p>
            <ul>
                <li>Movement controls on the left side</li>
                <li>Action buttons on the right side</li>
                <li>Semi-transparent to not block gameplay</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Mobile-friendly design:</strong></p>
            <ul>
                <li><strong>Larger platforms:</strong> Touch controls are less precise than keyboards</li>
                <li><strong>More forgiving gaps:</strong> Give extra room for error</li>
                <li><strong>Slower enemies:</strong> Reaction time is slower on mobile</li>
                <li><strong>Bigger targets:</strong> Make collectibles and enemies larger</li>
            </ul>
            <p>If you want mobile players, playtest on a phone! What works on desktop might be frustrating on touch.</p>

            <div class="help-tip"><p>Keep mobile controls enabled by default - players can always play on desktop too, but mobile-only players need the option!</p></div>
        `
    },
    liveData: {
        title: 'Live Data Preview',
        content: `
            <h4>Understanding Level Data</h4>
            <p>This panel shows how your level is stored as code - the same data format used in professional game development!</p>

            <h4>Data Formats</h4>
            <ul>
                <li><strong>Array</strong> - JavaScript array of strings (most common)</li>
                <li><strong>JSON</strong> - Full project data as structured object</li>
                <li><strong>Tiles</strong> - List of tile definitions and properties</li>
            </ul>

            <h4>Reading Level Data</h4>
            <p>Each string in the array is one row of your level:</p>
            <p><code>"...AAA..."</code> means:</p>
            <ul>
                <li><code>.</code> = empty space</li>
                <li><code>A</code> = tile assigned to key "A"</li>
            </ul>

            <h4>Cursor Inspector</h4>
            <p>As you hover over the level, the inspector shows:</p>
            <ul>
                <li>Tile character at cursor position</li>
                <li>Grid coordinates (X, Y)</li>
                <li>Whether the tile is solid</li>
            </ul>

            <h4>🎮 Game Design Tip</h4>
            <p><strong>Level data is portable!</strong> You can:</p>
            <ul>
                <li>Export your level and use it in other game engines</li>
                <li>Share level codes with friends to play</li>
                <li>Learn how games store level information</li>
                <li>Understand the connection between visual design and data</li>
            </ul>

            <div class="help-tip"><p>Export your level data to learn how games represent worlds as code!</p></div>
        `
    },
    gameFeel: {
        title: '✨ Game Feel - The Secret to Fun Games',
        content: `
            <div style="background: linear-gradient(135deg, rgba(233,69,96,0.2), rgba(155,89,182,0.2)); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <p style="margin: 0; font-size: 13px; color: #fff;"><strong>"Game Feel"</strong> (also called "juice") is what makes games <em>satisfying</em> to play. It's the difference between a game that feels fun and one that feels flat.</p>
            </div>

            <h4>🎮 The Core Physics Settings</h4>
            <p>These work together to create the "feel" of your character:</p>

            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="margin-bottom: 10px;">
                    <strong style="color: #e94560;">Gravity</strong> <span style="color: #888;">(0.2 - 1.0)</span>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #aaa;">How fast you fall. <strong>Low</strong> = floaty like Kirby. <strong>High</strong> = heavy like Castlevania.</p>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong style="color: #3498db;">Jump Power</strong> <span style="color: #888;">(6 - 15)</span>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #aaa;">How high you jump. Must balance with gravity - high gravity needs more jump power!</p>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong style="color: #2ecc71;">Move Speed</strong> <span style="color: #888;">(2 - 8)</span>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #aaa;">How fast you run. Faster = more exciting but harder to control.</p>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong style="color: #f39c12;">Friction</strong> <span style="color: #888;">(0.7 - 1.0)</span>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #aaa;">How quickly you stop. <strong>Low</strong> = slippery ice. <strong>High</strong> = instant stops like Mega Man.</p>
                </div>
                <div>
                    <strong style="color: #9b59b6;">Bounciness</strong> <span style="color: #888;">(0 - 0.5)</span>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #aaa;">How much you bounce on landing. Creates springy, energetic movement.</p>
                </div>
            </div>

            <h4>⏱️ Coyote Time - Forgiveness Frames</h4>
            <p>Named after Wile E. Coyote running off cliffs! This lets players jump for a few frames <em>after</em> walking off a ledge.</p>
            <ul style="font-size: 12px;">
                <li><strong>0 frames</strong> = Strict, punishing (old-school hard games)</li>
                <li><strong>4-6 frames</strong> = Normal, fair (most modern games)</li>
                <li><strong>10+ frames</strong> = Very forgiving (casual/kids games)</li>
            </ul>
            <p style="font-size: 11px; color: #aaa;">Most players never notice coyote time - it just makes the game "feel right"!</p>

            <h4>💥 Hit Pause (Freeze Frame)</h4>
            <p>A brief freeze when something impactful happens (taking damage, stomping enemies). This tiny pause makes hits feel <strong>powerful</strong>.</p>
            <ul style="font-size: 12px;">
                <li><strong>50ms</strong> = Quick, snappy (action games)</li>
                <li><strong>80-100ms</strong> = Satisfying impact (most games)</li>
                <li><strong>120ms+</strong> = Heavy, dramatic (fighting games)</li>
            </ul>

            <h4>📳 Screen Shake & Vibration</h4>
            <p>Physical feedback makes events feel real:</p>
            <ul style="font-size: 12px;">
                <li><strong>Screen Shake</strong> - Camera jolts on damage/stomps (visual impact)</li>
                <li><strong>Vibration</strong> - Controller/phone rumbles (physical feedback, Android only)</li>
            </ul>

            <h4>🛡️ Invincibility Time</h4>
            <p>How long you're immune after taking damage. The player flashes during this time.</p>
            <ul style="font-size: 12px;">
                <li><strong>Short (1s)</strong> = Challenging, punishing</li>
                <li><strong>Medium (1.5s)</strong> = Fair, standard</li>
                <li><strong>Long (2s+)</strong> = Forgiving, casual</li>
            </ul>

            <h4>🏆 Why These Settings Matter</h4>
            <p>Professional games spend <strong>months</strong> tuning these values! The difference between a game feeling "okay" and feeling "amazing" often comes down to these subtle settings.</p>

            <div style="background: rgba(46, 204, 113, 0.15); border-left: 3px solid #2ecc71; padding: 10px 12px; border-radius: 0 6px 6px 0; margin-top: 15px;">
                <strong style="color: #2ecc71;">Try This!</strong>
                <p style="margin: 5px 0 0 0; font-size: 11px; color: #ccc;">Apply different presets and play your game. Notice how the same level can feel completely different just by changing these physics values!</p>
            </div>

            <div class="help-tip"><p>The best way to learn game feel is to experiment! Try extreme values to understand what each setting does, then dial it back to find the sweet spot.</p></div>
        `
    },

    multiplayer: {
        title: '🌐 Online Multiplayer',
        content: `
            <div style="background: linear-gradient(135deg, rgba(243, 156, 18, 0.2), rgba(230, 126, 34, 0.2)); border: 1px solid #f39c12; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">🧪</span>
                    <div>
                        <strong style="color: #f39c12;">Experimental Feature</strong>
                        <p style="font-size: 11px; color: #ccc; margin: 2px 0 0 0;">Multiplayer is in beta. Some features may change.</p>
                    </div>
                </div>
            </div>

            <h4>🎮 What is Online Multiplayer?</h4>
            <p>Online multiplayer lets multiple players explore your Top-Down RPG world together in real-time! Players connect through our game server and can see each other move around, chat, and interact.</p>

            <h4>🔧 How It Works</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                    <span style="background: #667eea; color: white; border-radius: 50%; min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; margin-right: 10px;">1</span>
                    <div>
                        <strong style="color: #fff; font-size: 12px;">Enable Multiplayer</strong>
                        <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">Check the "Enable Multiplayer" box in Game Settings → Online</p>
                    </div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                    <span style="background: #667eea; color: white; border-radius: 50%; min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; margin-right: 10px;">2</span>
                    <div>
                        <strong style="color: #fff; font-size: 12px;">Share Your Game</strong>
                        <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">Use File → Share to Gallery to get a shareable link</p>
                    </div>
                </div>
                <div style="display: flex; align-items: flex-start;">
                    <span style="background: #667eea; color: white; border-radius: 50%; min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; margin-right: 10px;">3</span>
                    <div>
                        <strong style="color: #fff; font-size: 12px;">Players Join</strong>
                        <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">Anyone with the link can join and play together!</p>
                    </div>
                </div>
            </div>

            <h4>⚙️ Settings Explained</h4>
            <ul style="font-size: 12px; color: #ccc; margin-left: 16px;">
                <li><strong style="color: #fff;">Max Players</strong> - How many people can play at once (2-12)</li>
                <li><strong style="color: #fff;">Display Name</strong> - Your name shown to other players</li>
                <li><strong style="color: #fff;">Show Chat</strong> - Enable/disable the in-game chat overlay</li>
                <li><strong style="color: #fff;">Sync Item Collection</strong> - When enabled, collected items disappear for everyone (first come, first served!)</li>
            </ul>

            <h4>💡 Design Tips for Multiplayer</h4>
            <div style="background: rgba(46, 204, 113, 0.15); border-left: 3px solid #2ecc71; padding: 10px 12px; border-radius: 0 6px 6px 0;">
                <ul style="font-size: 11px; color: #ccc; margin: 0 0 0 16px; padding: 0;">
                    <li>Design larger levels so players have room to explore</li>
                    <li>Add multiple copies of collectibles if using sync mode</li>
                    <li>Create meeting points or shared objectives</li>
                    <li>Test with friends before sharing publicly!</li>
                </ul>
            </div>

            <div class="help-tip"><p>Multiplayer only works with Top-Down RPG mode. Platformer games cannot use multiplayer due to precise physics timing requirements.</p></div>
        `
    },

    pvp: {
        title: '⚔️ PvP Battle Mode',
        content: `
            <div style="background: linear-gradient(135deg, rgba(231, 76, 60, 0.2), rgba(192, 57, 43, 0.2)); border: 1px solid #e74c3c; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">⚔️</span>
                    <div>
                        <strong style="color: #e74c3c;">Player vs Player Combat</strong>
                        <p style="font-size: 11px; color: #ccc; margin: 2px 0 0 0;">Turn your co-op world into a competitive arena!</p>
                    </div>
                </div>
            </div>

            <h4>🎯 What is PvP Mode?</h4>
            <p>PvP (Player vs Player) Battle Mode allows players to shoot and damage each other using projectiles. Transform your peaceful multiplayer world into an action-packed battle arena!</p>

            <h4>🔫 Requirements</h4>
            <ul style="font-size: 12px; color: #ccc; margin-left: 16px;">
                <li><strong style="color: #fff;">Multiplayer must be enabled</strong> - PvP is an extension of online play</li>
                <li><strong style="color: #fff;">Projectiles must be enabled</strong> - Players need to be able to shoot (Player Properties → Projectiles)</li>
                <li><strong style="color: #fff;">Top-Down RPG mode only</strong> - Same as regular multiplayer</li>
            </ul>

            <h4>⚙️ PvP Settings</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="margin-bottom: 10px;">
                    <strong style="color: #e74c3c; font-size: 12px;">💔 Damage Per Hit</strong>
                    <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">How many hearts each shot removes (1-10). Higher = faster eliminations.</p>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong style="color: #e74c3c; font-size: 12px;">🏆 Points for Elimination</strong>
                    <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">Score awarded when you eliminate another player (0-500).</p>
                </div>
                <div>
                    <strong style="color: #e74c3c; font-size: 12px;">❤️ Starting Lives</strong>
                    <p style="font-size: 11px; color: #aaa; margin: 2px 0 0 0;">How many lives each player gets in PvP mode (1-10).</p>
                </div>
            </div>

            <h4>🎮 Game Mode Ideas</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px;">
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #3498db; font-size: 11px;">🏃 Free-for-All</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Everyone vs everyone. Last player standing wins!</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #2ecc71; font-size: 11px;">🎯 High Score</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Unlimited respawns. Most eliminations wins!</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #9b59b6; font-size: 11px;">🏰 Arena</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Design a map with cover and power-ups</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #f39c12; font-size: 11px;">🤝 Mixed Mode</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Explore together AND battle - best of both!</p>
                </div>
            </div>

            <h4>💡 Arena Design Tips</h4>
            <div style="background: rgba(46, 204, 113, 0.15); border-left: 3px solid #2ecc71; padding: 10px 12px; border-radius: 0 6px 6px 0;">
                <ul style="font-size: 11px; color: #ccc; margin: 0 0 0 16px; padding: 0;">
                    <li>Add walls and obstacles for cover</li>
                    <li>Place health powerups around the map</li>
                    <li>Create multiple spawn points so players don't spawn on each other</li>
                    <li>Balance open areas with tight corridors</li>
                    <li>Consider adding hazards for extra chaos!</li>
                </ul>
            </div>

            <div class="help-tip"><p>For a fair experience, make sure all players understand the rules before starting. Consider testing damage/lives settings to find the right balance for your arena.</p></div>
        `
    },

    gameType: {
        title: '🎮 Game Type',
        content: `
            <div style="background: linear-gradient(135deg, rgba(233,69,96,0.2), rgba(102,126,234,0.2)); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <p style="margin: 0; font-size: 13px; color: #fff; line-height: 1.5;">Choose between two fundamentally different game styles. This affects physics, controls, available objects, and how your game plays.</p>
            </div>

            <h4>🏃 Platformer (Side-Scrolling)</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <p style="font-size: 12px; color: #ccc; margin-bottom: 10px;">Classic side-view gameplay like Mario, Sonic, or Celeste. The camera follows the player from the side.</p>
                <div style="font-size: 11px; color: #aaa;">
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">Gravity & Jumping</strong> - Players fall down and must jump to reach platforms</div>
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">Left/Right Movement</strong> - Arrow keys or A/D to move horizontally</div>
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">Enemy Stomping</strong> - Jump on enemies to defeat them</div>
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">Springs & Moving Platforms</strong> - Dynamic level elements</div>
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">Double Jump & Fly Modes</strong> - Alternative movement options</div>
                </div>
            </div>

            <h4>🗺️ Top-Down RPG (Bird's Eye View)</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <p style="font-size: 12px; color: #ccc; margin-bottom: 10px;">Overhead perspective like Zelda, Pokémon, or Stardew Valley. The camera looks down from above.</p>
                <div style="font-size: 11px; color: #aaa;">
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">8-Direction Movement</strong> - Move freely in any direction with WASD</div>
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">No Gravity</strong> - Walk anywhere that isn't blocked</div>
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">NPCs & Dialogue</strong> - Create characters that talk to the player</div>
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">Doors & Teleporters</strong> - Connect areas and create dungeons</div>
                    <div style="margin-bottom: 6px;">✓ <strong style="color: #fff;">Online Multiplayer</strong> - Play with friends (experimental)</div>
                </div>
            </div>

            <h4>⚠️ Switching Game Types</h4>
            <div style="background: rgba(243, 156, 18, 0.15); border-left: 3px solid #f39c12; padding: 10px 12px; border-radius: 0 6px 6px 0; margin-bottom: 15px;">
                <p style="font-size: 11px; color: #ccc; margin: 0;">Switching game types may affect your levels. Some objects (like Moving Platforms) only work in Platformer mode, while others (like NPCs and Doors) only work in Top-Down mode. Objects incompatible with your new mode will be hidden but not deleted.</p>
            </div>

            <h4>🔍 Display Scale</h4>
            <p style="font-size: 12px; color: #ccc;">The <strong>Tile Render Scale</strong> option lets you make your pixel art appear larger in-game. If you're using 16×16 tiles but want a chunkier retro look, set the scale to 2× or 4×.</p>

            <div class="help-tip"><p>Can't decide? Start with <strong>Platformer</strong> if you want action-focused gameplay, or <strong>Top-Down RPG</strong> if you want exploration and story.</p></div>
        `
    },

    cheats: {
        title: '🎮 Cheat Codes',
        content: `
            <div style="background: linear-gradient(135deg, rgba(233,69,96,0.2), rgba(155,89,182,0.2)); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <p style="margin: 0; font-size: 13px; color: #fff; line-height: 1.5;">Add secret codes that players can type during gameplay to unlock special effects. A classic gaming tradition that adds replayability and fun surprises!</p>
            </div>

            <h4>🕹️ How Cheat Codes Work</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="font-size: 11px; color: #aaa; line-height: 1.6;">
                    <div style="margin-bottom: 8px;">1. <strong style="color: #fff;">Enable Cheats</strong> - Turn on the master toggle to allow cheat codes in your game</div>
                    <div style="margin-bottom: 8px;">2. <strong style="color: #fff;">Add Codes</strong> - Create custom codes or use the built-in presets</div>
                    <div style="margin-bottom: 8px;">3. <strong style="color: #fff;">Players Type Codes</strong> - During gameplay, typing the code activates the effect</div>
                    <div>4. <strong style="color: #fff;">Effects Apply</strong> - Instant feedback with optional "CHEAT ACTIVATED!" message</div>
                </div>
            </div>

            <h4>📝 Code Types</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #3498db; font-size: 11px;">🔤 Letter Codes</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Type letters like "IDDQD" or "POWER"</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
                    <strong style="color: #2ecc71; font-size: 11px;">🎮 Arrow Codes</strong>
                    <p style="font-size: 10px; color: #aaa; margin: 4px 0 0 0;">Use arrow keys like ↑↑↓↓←→←→BA</p>
                </div>
            </div>

            <h4>✨ Available Effects</h4>
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
                    <div><span style="color: #e94560;">❤️</span> <strong>Invincible</strong> - Can't take damage</div>
                    <div><span style="color: #f39c12;">⚡</span> <strong>Speed Boost</strong> - Move faster</div>
                    <div><span style="color: #9b59b6;">🦘</span> <strong>Super Jump</strong> - Jump higher</div>
                    <div><span style="color: #3498db;">👻</span> <strong>No Clip</strong> - Walk through walls</div>
                    <div><span style="color: #2ecc71;">🔫</span> <strong>Infinite Ammo</strong> - Unlimited shots</div>
                    <div><span style="color: #1abc9c;">📏</span> <strong>Resize</strong> - Grow or shrink</div>
                </div>
            </div>

            <h4>⏱️ Duration Options</h4>
            <ul style="font-size: 12px; color: #ccc; margin-left: 16px; margin-bottom: 15px;">
                <li><strong style="color: #fff;">Timed</strong> - Effect lasts for a set duration (e.g., 30 seconds)</li>
                <li><strong style="color: #fff;">Permanent</strong> - Effect lasts until the level ends or player dies</li>
                <li><strong style="color: #fff;">Toggle</strong> - Type the code again to turn it off</li>
            </ul>

            <h4>💡 Design Tips</h4>
            <div style="background: rgba(46, 204, 113, 0.15); border-left: 3px solid #2ecc71; padding: 10px 12px; border-radius: 0 6px 6px 0;">
                <ul style="font-size: 11px; color: #ccc; margin: 0 0 0 16px; padding: 0; line-height: 1.6;">
                    <li>Keep codes secret - share them as rewards for finding secrets</li>
                    <li>Use memorable codes related to your game's theme</li>
                    <li>Balance powerful cheats with shorter durations</li>
                    <li>The Konami Code (↑↑↓↓←→←→BA) is a gaming classic!</li>
                    <li>Consider adding a "fun" cheat that doesn't affect gameplay (like big head mode)</li>
                </ul>
            </div>

            <div class="help-tip"><p>Cheats are optional and meant to add fun! Players who want a challenge can simply not use them, while others can enjoy silly effects or use them to practice difficult sections.</p></div>
        `
    }
};

function showHelp(topic) {
    const help = helpContent[topic];
    if (!help) {
        console.warn('Help topic not found:', topic);
        return;
    }

    document.getElementById('help-modal-title').textContent = help.title;
    document.getElementById('help-modal-content').innerHTML = help.content;
    document.getElementById('help-modal').classList.add('visible');
}

function closeHelpModal() {
    document.getElementById('help-modal').classList.remove('visible');
}
