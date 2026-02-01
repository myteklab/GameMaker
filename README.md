# GameMaker

A visual platformer game creation tool for building 2D side-scrolling and top-down games without coding. Design levels with tilesets, place enemies and collectibles, tune physics, and export playable games as standalone HTML files.

![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)

## Features

### Level Design

- Drag-and-drop tileset loading (image URL or file upload)
- Configurable tile sizes (8x8, 16x16, 32x32, 64x64, or custom)
- Tile palette with keyboard shortcuts (A-Z, 1-9)
- Solid/non-solid tile classification for platformer physics
- Custom tile creation via built-in pixel editor
- Multi-level support with create, duplicate, rename, and reorder
- Background layers with parallax scrolling (adjustable speed)

### Editor Tools

| Tool | Description |
|---|---|
| Draw | Place tiles one by one |
| Fill | Flood-fill areas with selected tile |
| Erase | Remove tiles and objects |
| Move | Reposition objects, tiles, or player spawn |

- Zoom controls (100%+)
- Toggleable grid overlay
- Show/hide objects layer
- Toggle background rendering
- Custom scrollbars for large levels

### Game Objects

- **Enemies** — Patrol (walks), Jumper (hops), Chaser (follows player), Stationary
- **Collectibles** — Coins, Gems, Stars with custom scoring
- **Hazards** — Instant damage zones with configurable damage
- **Powerups** — Extra Life, Heal, Speed Boost, Jump Boost, Invincibility, Ammo Pack
- **Level Objects** — Goal flag, Checkpoints, Springs, Mystery Blocks
- **Terrain Zones** — Water, lava, ice with special physics
- **Moving Platforms** — Configurable path and speed
- **NPCs** — Dialog support for top-down RPG mode
- **Doors** — Level transitions
- **Cheat Codes** — Hidden input sequences

### Player & Physics

- Configurable gravity, jump power, and movement speed
- Jump modes: Normal, Double Jump, Fly (Flappy Bird style)
- Squash and stretch animation with adjustable intensity
- Player sprite animation (horizontal spritesheet)
- Projectile system (cooldown or ammo-based firing)
- Mobile touch controls with configurable buttons

### Game Mechanics

- Multi-level progression with sequential advancement
- Goal conditions: reach goal, collect all items, achieve target score, survive for duration
- Autoscroll mode (Flappy Bird-style camera, stop at end or loop)
- Checkpoint respawn system
- Configurable starting lives and health
- Sound integration (background music, SFX for jump, hurt, level complete, game over)
- Visual effects (screen shake, particles, color customization)

### Export

- Download as standalone HTML file (single file, no dependencies)
- Configurable pixel scale (1x-4x)
- Sound effects bundled in export
- PWA support with QR code generation

### Learning

- Code Preview panel showing generated JavaScript
- Help system with game design principles and tutorials
- Learn Mode toggle for educational use

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `D` | Draw tool |
| `F` | Fill tool |
| `E` | Erase tool |
| `M` | Move tool |
| `G` | Toggle grid |
| `1-9`, `A-Z` | Select tile from palette |
| `Ctrl+S` | Save project |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `+` / `-` | Zoom in/out |
| `Esc` or `Space` | Play test |
| `Right-click` | Erase / fill empty |

## Getting Started

1. Open `index.html` in a modern browser.
2. Load a tileset image or use the default tileset.
3. Select a tile from the palette and draw your level layout.
4. Place a player spawn point, enemies, collectibles, and a goal.
5. Press **Space** to play-test your level.
6. Use the **Export** button to download a standalone HTML game.

## Dependencies

- [QRCode.js](https://github.com/davidshimjs/qrcodejs) (v1.0.0) — QR code generation for sharing (loaded from CDN)

No frameworks — built entirely with vanilla JavaScript and HTML5 Canvas.

## Project Structure

```
├── index.html              # Main editor interface
├── preview.html            # Game preview and playback
├── css/
│   └── gamemaker.css       # Application styles
├── js/
│   ├── state.js            # Global state and level structure
│   ├── init.js             # Application initialization
│   ├── ui.js               # UI helpers
│   ├── events.js           # Keyboard, mouse, and touch handlers
│   ├── renderer.js         # Canvas rendering engine
│   ├── levelEditor.js      # Level editing operations
│   ├── levelManager.js     # Multi-level management
│   ├── objectTemplates.js  # Game object definitions
│   ├── tileset.js          # Tileset loading and management
│   ├── pixelEditor.js      # Custom tile pixel editor
│   ├── gameSettings.js     # Game configuration UI
│   ├── gameGenerator.js    # Standalone HTML game export
│   ├── export.js           # Export dialog and file download
│   ├── saveLoad.js         # Project persistence
│   ├── playTest.js         # Play test mode
│   ├── backgrounds.js      # Parallax background layers
│   ├── zoom.js             # Zoom controls
│   ├── scrollbars.js       # Custom scrollbar UI
│   ├── codePreview.js      # Code visualization panel
│   ├── codeSnippets.js     # Code generation snippets
│   ├── help.js             # Help system and tutorials
│   ├── assetPicker.js      # Asset library browser
│   ├── liveDataPreview.js  # Real-time data display
│   ├── learnMode.js        # Educational mode
│   ├── panelResize.js      # Resizable UI panels
│   ├── tilesPanelResize.js # Tiles panel resizing
│   ├── screenshot.js       # Screenshot capture
│   ├── cursorInspector.js  # Cursor position display
│   ├── dropdown.js         # Menu dropdown logic
│   └── viewSync.js         # View synchronization
├── res/
│   ├── default_tileset.png # Default 16x16 tileset
│   └── icon.svg            # App icon
└── LICENSE                 # GPL-3.0
```

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
