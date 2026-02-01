// ============================================
// EXPORT - Legacy Modal Functions
// ============================================

function showExportModalLegacy() {
    const modal = document.getElementById('export-modal');
    const codeArea = document.getElementById('export-code');

    let code = '// Tile definitions\n';
    code += 'const tileTypes = {\n';
    code += "    '.': null,  // Empty space\n";

    for (const key in tiles) {
        const tile = tiles[key];
        code += `    '${key}': { row: ${Math.floor(tile.y / tileSize)}, col: ${Math.floor(tile.x / tileSize)}, solid: ${tile.solid} },  // ${tile.name || 'Tile ' + key}\n`;
    }

    code += '};\n\n';
    code += '// Level data\n';
    code += 'const level = [\n';
    code += level.map(row => `    "${row}",`).join('\n');
    code += '\n];\n';

    if (backgroundLayers.length > 0) {
        code += '\n// Background layers\n';
        code += 'const backgroundLayers = [\n';
        backgroundLayers.forEach(layer => {
            code += `    { src: '${layer.src}', speed: ${layer.speed} },\n`;
        });
        code += '];\n';
    }

    code += '\n// Game physics settings\n';
    code += 'const gameSettings = {\n';
    code += `    gravity: ${gameSettings.gravity},\n`;
    code += `    jumpPower: ${gameSettings.jumpPower},\n`;
    code += `    moveSpeed: ${gameSettings.moveSpeed},\n`;
    code += `    playerColor: '${gameSettings.playerColor}'\n`;
    code += '};\n';

    codeArea.value = code;
    modal.classList.add('visible');
}

function closeExportModal() {
    document.getElementById('export-modal').classList.remove('visible');
}

function copyExportCode() {
    const codeArea = document.getElementById('export-code');
    codeArea.select();
    document.execCommand('copy');
    showToast('Code copied to clipboard!');
}

// ============================================
// EXPORT FORMATS
// ============================================

function setExportFormat(format) {
    currentExportFormat = format;

    // Update tab buttons
    document.querySelectorAll('.export-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase().includes(format) ||
            (format === 'js' && tab.textContent === 'JavaScript') ||
            (format === 'csv' && tab.textContent === 'CSV/Grid') ||
            (format === 'platformer' && tab.textContent === 'Platformer Game'));
    });

    // Show/hide platformer options (export destination, learning mode)
    const platformerOptions = document.getElementById('platformer-options');
    if (platformerOptions) {
        platformerOptions.style.display = format === 'platformer' ? 'block' : 'none';
    }

    // Update export button text based on format
    const exportBtn = document.getElementById('export-action-btn');
    if (exportBtn) {
        if (format === 'platformer') {
            updateExportButtonText();
        } else {
            exportBtn.textContent = 'Download File';
        }
    }

    // Update explanation
    updateExportExplanation(format);

    // Generate code
    generateExportCode(format);
}

// Handle export option selection
function selectExportOption(option) {
    document.getElementById('export-download').checked = (option === 'download');

    // Show/hide game icon URL input for publish
    const iconUrlDiv = document.getElementById('game-icon-url-section');
    if (iconUrlDiv) {
        iconUrlDiv.style.display = 'none';
    }

    updateExportButtonText();
}

function updateExportButtonText() {
    const exportBtn = document.getElementById('export-action-btn');
    if (exportBtn) {
        exportBtn.textContent = '📥 Download File';
        exportBtn.style.background = 'linear-gradient(135deg, #e94560, #0f3460)';
    }
}

// Execute the export based on selected options
function executeExport() {
    if (currentExportFormat === 'platformer') {
        downloadPlatformerGame();
    } else {
        downloadExportCode();
    }
}

// Download platformer game as HTML file
async function downloadPlatformerGame() {
    const learningMode = document.getElementById('learning-mode-checkbox')?.checked || false;
    const pixelScaleRadio = document.querySelector('input[name="pixel-scale"]:checked');
    const pixelScale = pixelScaleRadio ? parseInt(pixelScaleRadio.value) : 1;

    // Show bundling message if there are SFX sounds
    const sfxIds = collectSfxIds();
    if (sfxIds.length > 0) {
        showToast('Bundling sound effects...', 'info', 2000);
    }

    const gameHTML = await generateGameHTMLAsync(learningMode, pixelScale);
    const blob = new Blob([gameHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_platformer_game.html';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Game downloaded with bundled sounds! Open the HTML file to play.');
}

function updateExportExplanation(format) {
    const expEl = document.getElementById('export-explanation');

    const explanations = {
        js: `<h4>JavaScript Array Format</h4>
            <p>Each row of your level becomes a string in an array. Each character represents one tile:</p>
            <ul style="margin: 5px 0 0 20px; color: #aaa; font-size: 11px;">
                <li><code>.</code> = Empty space (no tile)</li>
                <li><code>A-Z</code> = Your defined tiles</li>
            </ul>
            <p style="margin-top: 8px;">Access tiles with: <code>level[y][x]</code></p>`,

        json: `<h4>JSON Format</h4>
            <p>A portable data format that can be loaded in any language. Includes:</p>
            <ul style="margin: 5px 0 0 20px; color: #aaa; font-size: 11px;">
                <li>Level dimensions (width, height)</li>
                <li>Tile definitions with positions</li>
                <li>Level data as an array</li>
            </ul>
            <p style="margin-top: 8px;">Load with: <code>JSON.parse(data)</code></p>`,

        csv: `<h4>CSV/Grid Format</h4>
            <p>A simple comma-separated format, ideal for:</p>
            <ul style="margin: 5px 0 0 20px; color: #aaa; font-size: 11px;">
                <li>Importing into spreadsheets</li>
                <li>Quick visual inspection</li>
                <li>Simple parsers</li>
            </ul>
            <p style="margin-top: 8px;">Each cell contains the tile character.</p>`,

        pencilcode: `<h4>Pencil.code Format</h4>
            <p>Optimized for use with Pencil.code:</p>
            <ul style="margin: 5px 0 0 20px; color: #aaa; font-size: 11px;">
                <li>CoffeeScript-friendly syntax</li>
                <li>Easy to integrate with turtle graphics</li>
                <li>Uses string arrays</li>
            </ul>`,

        platformer: `<h4>🎮 Complete Platformer Game</h4>
            <p>Export as a fully playable HTML5 game! Includes:</p>
            <ul style="margin: 5px 0 0 20px; color: #aaa; font-size: 11px;">
                <li>Your level and tile graphics</li>
                <li>Player movement and physics</li>
                <li>Parallax backgrounds</li>
                <li>Smooth camera following</li>
            </ul>
            <p style="margin-top: 8px; color: #9f9;">Open in a code editor to customize and extend!</p>`
    };

    expEl.innerHTML = explanations[format] || explanations.js;
}

function generateExportCode(format) {
    const codeArea = document.getElementById('export-code');
    let code = '';

    switch (format) {
        case 'js':
            code = generateJavaScriptExport();
            break;
        case 'json':
            code = generateJSONExport();
            break;
        case 'csv':
            code = generateCSVExport();
            break;
        case 'pencilcode':
            code = generatePencilcodeExport();
            break;
        case 'platformer':
            const learningMode = document.getElementById('learning-mode-checkbox')?.checked || false;
            const pixelScaleRadio = document.querySelector('input[name="pixel-scale"]:checked');
            const pixelScale = pixelScaleRadio ? parseInt(pixelScaleRadio.value) : 1;
            // Use async to bundle SFX data
            generateGameHTMLAsync(learningMode, pixelScale).then(gameHTML => {
                codeArea.value = gameHTML;
            });
            return; // Exit early, code will be set by promise
    }

    codeArea.value = code;
}

function generateJavaScriptExport() {
    let code = '// Tile definitions\n';
    code += 'const tileTypes = {\n';
    code += "    '.': null,  // Empty space\n";

    for (const key in tiles) {
        const tile = tiles[key];
        code += `    '${key}': { row: ${Math.floor(tile.y / tileSize)}, col: ${Math.floor(tile.x / tileSize)}, solid: ${tile.solid} },  // ${tile.name || 'Tile ' + key}\n`;
    }

    code += '};\n\n';
    code += '// Level data\n';
    code += 'const level = [\n';
    code += level.map(row => `    "${row}",`).join('\n');
    code += '\n];\n';

    code += `\n// Level info: ${levelWidth}x${levelHeight} tiles, tile size: ${tileSize}px\n`;

    if (backgroundLayers.length > 0) {
        code += '\n// Background layers\n';
        code += 'const backgroundLayers = [\n';
        backgroundLayers.forEach(layer => {
            code += `    { src: '${layer.src}', speed: ${layer.speed} },\n`;
        });
        code += '];\n';
    }

    return code;
}

function generateJSONExport() {
    const data = {
        version: '1.0',
        width: levelWidth,
        height: levelHeight,
        tileSize: tileSize,
        tiles: {},
        level: level,
        backgroundLayers: backgroundLayers,
        gameSettings: gameSettings
    };

    for (const key in tiles) {
        data.tiles[key] = {
            row: Math.floor(tiles[key].y / tileSize),
            col: Math.floor(tiles[key].x / tileSize),
            solid: tiles[key].solid
        };
    }

    return JSON.stringify(data, null, 2);
}

function generateCSVExport() {
    let csv = '// CSV Format - each cell is a tile character\n';
    csv += '// Row,';
    for (let x = 0; x < levelWidth; x++) {
        csv += `Col${x},`;
    }
    csv += '\n';

    level.forEach((row, y) => {
        csv += `${y},`;
        for (let x = 0; x < row.length; x++) {
            csv += row[x] + ',';
        }
        csv += '\n';
    });

    return csv;
}

function generatePencilcodeExport() {
    let code = '# Level data for Pencil.code\n';
    code += '# Use with CoffeeScript or JavaScript\n\n';

    code += 'level = [\n';
    level.forEach((row, i) => {
        code += `  "${row}"`;
        if (i < level.length - 1) code += ',';
        code += '\n';
    });
    code += ']\n\n';

    code += '# Tile size in pixels\n';
    code += `tileSize = ${tileSize}\n\n`;

    code += '# Draw the level\n';
    code += 'drawLevel = ->\n';
    code += '  for row, y in level\n';
    code += '    for char, x in row\n';
    code += '      if char isnt "."\n';
    code += '        # Draw tile at x * tileSize, y * tileSize\n';
    code += '        moveto x * tileSize, y * tileSize\n';
    code += '        dot tileSize, getColor(char)\n\n';

    code += '# Map characters to colors\n';
    code += 'getColor = (char) ->\n';
    code += '  colors =\n';

    const colors = ['green', 'brown', 'blue', 'red', 'yellow', 'purple', 'orange', 'pink'];
    let colorIndex = 0;
    for (const key in tiles) {
        code += `    "${key}": "${colors[colorIndex % colors.length]}"\n`;
        colorIndex++;
    }
    code += '  colors[char] or "gray"\n';

    return code;
}

function downloadExportCode() {
    const code = document.getElementById('export-code').value;
    const extensions = { js: 'js', json: 'json', csv: 'csv', pencilcode: 'coffee' };
    const ext = extensions[currentExportFormat] || 'txt';

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `level.${ext}`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Downloaded level.${ext}`);
}

// Update showExportModal to use the new format system
function showExportModal() {
    const modal = document.getElementById('export-modal');
    setExportFormat('platformer'); // Default to Platformer Game (most common use case)
    modal.classList.add('visible');

    // Check if already published and show info
    checkAndDisplayPublishedInfo();
}

// Check if game is already published and display info in export modal
async function checkAndDisplayPublishedInfo() {
    const publishedInfoDiv = document.getElementById('published-app-info');

    // Only check if project is saved
    if (!projectId) {
        publishedInfoDiv.style.display = 'none';
        return;
    }

    // Published status check is handled by platform adapter
    publishedInfoDiv.style.display = 'none';
}

// Copy published URL from export modal
function copyPublishedURL() {
    const urlInput = document.getElementById('published-url');
    urlInput.select();
    document.execCommand('copy');
    showToast('URL copied to clipboard!', 'success');
}

// Generate manifest.json for PWA
function generateManifestJSON(appName, iconUrl = '') {
    const gameIcon = iconUrl || 'icon.svg';

    return JSON.stringify({
        name: appName,
        short_name: appName,
        description: `${appName} - Built with GameMaker`,
        start_url: "./",
        display: "fullscreen",
        orientation: "landscape",
        theme_color: "#e94560",
        background_color: "#1a1a2e",
        icons: [
            { src: gameIcon, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: gameIcon, sizes: "512x512", type: "image/png", purpose: "any" },
            { src: gameIcon, sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: gameIcon, sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
    }, null, 2);
}

// Generate service worker for offline support
function generateServiceWorker() {
    return `
const CACHE_NAME = 'game-cache-v' + Date.now();
const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

console.log('Service Worker: Installing with cache:', CACHE_NAME);

self.addEventListener('install', event => {
    console.log('Service Worker: Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
    );
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    // Network-first strategy for HTML to get updates quickly
    if (event.request.url.includes('index.html') || event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache the new version
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache-first for other resources
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activate event');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('Service Worker: Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control of all pages immediately
    return self.clients.claim();
});
`.trim();
}

// Inject PWA scripts into HTML
function injectPWAScripts(html, appName) {
    // First, update the viewport meta tag for fullscreen support
    html = html.replace(
        /<meta name="viewport"[^>]*>/,
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'
    );

    // Inject manifest link and service worker registration
    const pwaScripts = `
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#e94560">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="${appName}">
    <meta name="mobile-web-app-capable" content="yes">
    <style>
        /* Fullscreen PWA adjustments */
        body {
            overflow: hidden;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 0;
            position: relative;
        }
        #game {
            display: block;
            margin: 0 auto;
        }
    </style>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('Service worker registered'))
                .catch(err => console.log('Service worker registration failed:', err));
        }
    <\/script>
    `;

    // Let browser handle install prompt natively (don't interfere)
    const installPromptHTML = `
    <script>
        // Just log when install is available - don't prevent default!
        window.addEventListener('beforeinstallprompt', function(e) {
            console.log('PWA install prompt available - browser will show native UI');
            // DON'T call e.preventDefault() - let browser show native prompt!
        });

        window.addEventListener('appinstalled', function() {
            console.log('PWA installed successfully!');
        });
    <\/script>
    `;

    // Insert PWA scripts before </head>
    html = html.replace('</head>', pwaScripts + '</head>');

    // Insert install prompt before </body>
    html = html.replace('</body>', installPromptHTML + '</body>');

    return html;
}

// Show publish confirmation dialog (will be created as modal in HTML)
function showPublishConfirmDialog(defaultAppName, existingSlug, isUpdate) {
    return new Promise((resolve) => {
        // For now, use a simple prompt - we'll create proper modal in HTML
        const appName = prompt(
            isUpdate ? 'Update app name:' : 'Enter app name for home screen:',
            defaultAppName
        );

        if (!appName) {
            resolve(false);
            return;
        }

        const customSlug = prompt(
            'Custom URL slug (optional, leave empty for auto-generated):',
            existingSlug || ''
        );

        resolve({
            appName: appName,
            customSlug: customSlug || null
        });
    });
}

// Show success modal with QR code
function showPublishSuccessModal(url, appName, wasUpdated) {
    // Set app name
    document.getElementById('publish-app-name').textContent = appName;

    // Set URL
    document.getElementById('publish-url').value = url;

    // Clear previous QR code if any
    const qrContainer = document.getElementById('publish-qr-code');
    qrContainer.innerHTML = '';

    // Generate QR code
    new QRCode(qrContainer, {
        text: url,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });

    // Show modal
    document.getElementById('publish-success-modal').classList.add('visible');

    // Show toast
    const message = wasUpdated ? 'Game updated!' : 'Game published!';
    showToast(message, 'success');
}

// Close publish success modal
function closePublishSuccessModal() {
    document.getElementById('publish-success-modal').classList.remove('visible');
}

// Copy publish URL to clipboard
function copyPublishURL() {
    const urlInput = document.getElementById('publish-url');
    urlInput.select();
    document.execCommand('copy');
    showToast('URL copied to clipboard!', 'success');
}
