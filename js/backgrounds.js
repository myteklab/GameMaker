// ============================================
// BACKGROUND LAYERS
// ============================================

// Helper to get the background layers array for the level being edited
function getEditingBgLayers() {
    // If Level Settings modal is open and editing a specific level
    if (typeof editingLevelIndex !== 'undefined' && editingLevelIndex >= 0 && levels[editingLevelIndex]) {
        return levels[editingLevelIndex].backgroundLayers;
    }
    // Otherwise use the current level's global backgroundLayers
    return backgroundLayers;
}

// Helper to set background layers for the level being edited
function setEditingBgLayers(newLayers) {
    if (typeof editingLevelIndex !== 'undefined' && editingLevelIndex >= 0 && levels[editingLevelIndex]) {
        levels[editingLevelIndex].backgroundLayers = newLayers;
        // If editing current level, also update global
        if (editingLevelIndex === currentLevelIndex) {
            backgroundLayers = newLayers;
        }
    } else {
        backgroundLayers = newLayers;
        // Also update current level
        const lvl = getCurrentLevel();
        if (lvl) lvl.backgroundLayers = newLayers;
    }
}

// Which layer the Backgrounds panel is editing. The list on the left picks it,
// the editor on the right changes it.
let selectedBgLayerIndex = 0;

function bgEditingCurrentLevel() {
    return typeof editingLevelIndex === 'undefined' || editingLevelIndex < 0 || editingLevelIndex === currentLevelIndex;
}

function bgEscAttr(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A readable name for a layer card: the file name from the URL, without the
// folder or extension.
function bgLayerLabel(layer, index) {
    const src = (layer && layer.src || '').trim();
    if (!src) return 'Empty layer';
    if (src.startsWith('data:')) return 'Image ' + (index + 1);
    let name = src.split('?')[0].split('/').filter(Boolean).pop() || ('Layer ' + (index + 1));
    try { name = decodeURIComponent(name); } catch (e) {}
    name = name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');
    return name.length > 24 ? name.slice(0, 23) + '...' : name;
}

const BG_ICON_UP = '<svg class="gm-icon" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>';
const BG_ICON_DOWN = '<svg class="gm-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';

function bgLayerCardHTML(layer, i, count) {
    const hasImage = layer.src && layer.src.trim() !== '';
    const badges = [];
    if (bgLayerMotionX(layer) === 'scroll') badges.push('Scrolls');
    if (bgLayerMotionX(layer) === 'sway') badges.push('Sways');
    if (bgLayerMotionY(layer) === 'sway') badges.push('Bobs');
    if (bgLayerSeam(layer) !== 'repeat') badges.push(bgLayerSeam(layer) === 'blend' ? 'Blend' : 'Mirror');
    return `
        <div class="bgp-card${i === selectedBgLayerIndex ? ' active' : ''}${layer.visible === false ? ' hidden-layer' : ''}" onclick="selectBgLayer(${i})">
            <div class="bgp-thumb">${hasImage ? `<img src="${bgEscAttr(layer.src)}" alt="" onerror="bgPreviewFailed(this)">` : 'No image'}</div>
            <div style="min-width: 0;">
                <div class="bgp-card-name" title="${bgEscAttr(layer.src || '')}">${bgEscAttr(bgLayerLabel(layer, i))}</div>
                <div class="bgp-badges">${badges.map(b => `<span class="bgp-badge">${b}</span>`).join('')}</div>
            </div>
            <div class="bgp-card-actions">
                <button type="button" class="bgp-icon-btn" title="Move back" ${i === 0 ? 'disabled' : ''} onclick="event.stopPropagation(); moveBgLayer(${i}, -1)">${BG_ICON_UP}</button>
                <button type="button" class="bgp-icon-btn" title="Move forward" ${i === count - 1 ? 'disabled' : ''} onclick="event.stopPropagation(); moveBgLayer(${i}, 1)">${BG_ICON_DOWN}</button>
                <button type="button" class="bgp-icon-btn" title="${layer.visible === false ? 'Show layer' : 'Hide layer'}" onclick="event.stopPropagation(); toggleBgLayerVisibility(${i})"><svg class="gm-icon"><use href="#icon-${layer.visible === false ? 'eye-off' : 'eye'}"/></svg></button>
                <button type="button" class="bgp-icon-btn danger" title="Delete layer" onclick="event.stopPropagation(); removeBgLayer(${i})"><svg class="gm-icon"><use href="#icon-trash"/></svg></button>
            </div>
        </div>`;
}

function bgSliderHTML(i, field, label, min, max, step, value, shown) {
    return `
        <div class="bgp-slider">
            <label>${label}</label>
            <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" oninput="setBgLayerField(${i}, '${field}', this.value, this)">
            <output>${shown}</output>
        </div>`;
}

function bgSegHTML(i, field, current, options) {
    return `<div class="bgp-seg">${options.map(([value, text]) =>
        `<button type="button" class="${value === current ? 'active' : ''}" onclick="setBgLayerChoice(${i}, '${field}', '${value}')">${text}</button>`).join('')}</div>`;
}

function bgLayerEditorHTML(layer, i) {
    const mx = bgLayerMotionX(layer), my = bgLayerMotionY(layer), seam = bgLayerSeam(layer);
    const speed = Math.max(0, Math.min(1, parseFloat(layer.speed) || 0));
    const opacity = Math.round(bgLayerAlpha(layer) * 100);
    let motionX = '';
    if (mx === 'scroll') {
        motionX = bgSliderHTML(i, 'drift', 'Speed', -200, 200, 5, bgLayerDrift(layer), bgLayerDrift(layer) + ' px/s')
            + '<small class="bgp-hint">Keeps moving the whole time. Negative moves left.</small>';
    } else if (mx === 'sway') {
        motionX = bgSliderHTML(i, 'swayX', 'Distance', 0, 400, 5, bgLayerSwayX(layer), bgLayerSwayX(layer) + ' px')
            + bgSliderHTML(i, 'swayXTime', 'Round trip', 1, 60, 1, bgLayerSwayXTime(layer), bgLayerSwayXTime(layer) + ' s')
            + '<small class="bgp-hint">Glides out and back. A slower round trip looks calmer.</small>';
    }
    let motionY = '';
    if (my === 'sway') {
        motionY = bgSliderHTML(i, 'swayY', 'Distance', 0, 200, 2, bgLayerSwayY(layer), bgLayerSwayY(layer) + ' px')
            + bgSliderHTML(i, 'swayYTime', 'Round trip', 1, 60, 1, bgLayerSwayYTime(layer), bgLayerSwayYTime(layer) + ' s');
    }
    const edgeHints = {
        repeat: 'Copies sit side by side. A texture whose sides differ shows a line.',
        mirror: 'Every other copy is flipped, so the edges always match.',
        blend: 'Each copy fades into the next. More blend hides a stronger line.'
    };
    return `
        <div class="bgp-preview-wrap">
            <canvas id="bgp-preview" class="bgp-preview${bgPreviewMode === 'all' ? ' draggable' : ''}" width="560" height="150"></canvas>
            <div class="bgp-preview-bar">
                <div class="bgp-seg">${[['layer', 'This layer'], ['all', 'All layers']].map(([m, t]) =>
                    `<button type="button" class="${bgPreviewMode === m ? 'active' : ''}" onclick="setBgPreviewMode('${m}')">${t}</button>`).join('')}</div>
                ${bgPreviewMode === 'all' ? `<label class="bgp-inline"><input type="checkbox" id="bgp-pan" ${bgPreviewPan ? 'checked' : ''} onchange="setBgPreviewPan(this.checked)"> Pan camera</label>` : ''}
                <label class="bgp-inline"><input type="checkbox" id="bgp-show-joins" onchange="drawBgPanelPreview()"> Show where copies meet</label>
            </div>
            ${bgPreviewMode === 'all' ? '<small class="bgp-hint">Every visible layer, back to front. Drag the preview to move the camera and compare parallax.</small>' : ''}
        </div>
        <div class="bgp-group">
            <div class="bgp-group-title">Image</div>
            <div class="bgp-row">
                <input type="text" id="bg-layer-url-${i}" value="${bgEscAttr(layer.src || '')}" placeholder="Image URL" onchange="setBgLayerImage(${i}, this.value)">
                <button type="button" class="browse-library-btn" onclick="browseBgLayerImage(${i})">Browse</button>
            </div>
        </div>
        <div class="bgp-group">
            <div class="bgp-group-title">Depth and look</div>
            ${bgSliderHTML(i, 'speed', 'Parallax', 0, 1, 0.05, speed, speed.toFixed(2))}
            <small class="bgp-hint">0 stays still, 1 moves with the camera. Far layers move slowly.</small>
            ${bgSliderHTML(i, 'opacity', 'Opacity', 0, 100, 5, opacity, opacity + '%')}
        </div>
        <div class="bgp-group">
            <div class="bgp-group-title">Motion</div>
            <div class="bgp-seg-row"><span>Sideways</span>${bgSegHTML(i, 'motionX', mx, [['none', 'None'], ['scroll', 'Scroll'], ['sway', 'Back and forth']])}</div>
            ${motionX}
            <div class="bgp-seg-row"><span>Up and down</span>${bgSegHTML(i, 'motionY', my, [['none', 'None'], ['sway', 'Bob']])}</div>
            ${motionY}
        </div>
        <div class="bgp-group">
            <div class="bgp-group-title">Edges</div>
            <div class="bgp-seg-row"><span>Copies meet</span>${bgSegHTML(i, 'seam', seam, [['repeat', 'Repeat'], ['mirror', 'Mirror'], ['blend', 'Blend']])}</div>
            ${seam === 'blend' ? bgSliderHTML(i, 'blend', 'Blend amount', 5, 50, 1, bgLayerBlend(layer), bgLayerBlend(layer) + '%') : ''}
            <small class="bgp-hint">${edgeHints[seam]}</small>
        </div>`;
}

function renderBackgroundLayers() {
    const host = document.getElementById('bg-layers-list');
    if (!host) return;
    const layers = getEditingBgLayers() || [];
    layers.forEach(l => { if (l.visible === undefined) l.visible = true; });
    if (selectedBgLayerIndex >= layers.length) selectedBgLayerIndex = Math.max(0, layers.length - 1);

    host.innerHTML = `
        <div class="bgp">
            <div class="bgp-list">
                <div class="bgp-list-head">Layers <span>back to front</span></div>
                <div class="bgp-cards">${layers.length ? layers.map((l, i) => bgLayerCardHTML(l, i, layers.length)).join('') : '<div class="bgp-empty">No layers yet. Add one for a sky, hills or clouds.</div>'}</div>
                <button type="button" class="btn btn-full" onclick="addBackgroundLayer()">+ Add Layer</button>
            </div>
            <div class="bgp-editor">${layers.length ? bgLayerEditorHTML(layers[selectedBgLayerIndex], selectedBgLayerIndex) : '<div class="bgp-empty">Add a layer to edit it here.</div>'}</div>
        </div>`;
    const cv = document.getElementById('bgp-preview');
    if (cv) attachBgPreviewDrag(cv);
    startBgPanelPreview();
}

// The thumbnail's failure mark used to be inlined in the onerror attribute,
// and the SVG icon's double quotes closed the attribute early, leaking '">
// as text beside every layer image. A named handler has no quoting to break.
function bgPreviewFailed(img) {
    const box = img && img.parentElement;
    if (box) box.innerHTML = '<span style="font-size: 10px; color: var(--danger);"><svg class="gm-icon"><use href="#icon-x-mark"/></svg></span>';
}

function selectBgLayer(index) {
    selectedBgLayerIndex = index;
    renderBackgroundLayers();
}

function moveBgLayer(index, dir) {
    const layers = getEditingBgLayers();
    const to = index + dir;
    if (!layers[index] || to < 0 || to >= layers.length) return;
    const moved = layers.splice(index, 1)[0];
    layers.splice(to, 0, moved);
    if (selectedBgLayerIndex === index) selectedBgLayerIndex = to;
    else if (selectedBgLayerIndex === to) selectedBgLayerIndex = index;
    markDirty();
    if (bgEditingCurrentLevel()) loadBackgroundImages();
    renderBackgroundLayers();
}

function setBgLayerImage(index, url) {
    const layers = getEditingBgLayers();
    if (!layers[index]) return;
    updateBgLayer(index, (url || '').trim());
    renderBackgroundLayers();
    if (bgEditingCurrentLevel()) loadBackgroundImages();
}

// Pick a layer image from the Asset Library or My Files. The picker hands
// back a permanent URL (a private file is made link-viewable on the way),
// so the layer is set, the panel redrawn, and the canvas reloaded here.
function browseBgLayerImage(index) {
    if (typeof openAssetPickerWithCallback !== 'function') {
        showToast('Asset Library is not available', 'error');
        return;
    }
    openAssetPickerWithCallback(function(url) {
        const layers = getEditingBgLayers();
        if (!url || !layers[index]) return;
        setBgLayerImage(index, url);
    }, 'tiles-backgrounds');
}

// Every slider in the panel goes through here: clamp, store, update its own
// readout, and let the canvas and preview show it. No re-render, so a slider
// being dragged keeps its focus.
const BG_FIELD_RULES = {
    speed:     { lo: 0,    hi: 1,   def: 0.5, show: v => v.toFixed(2) },
    opacity:   { lo: 0,    hi: 100, def: 100, show: v => v + '%', store: v => v / 100 },
    drift:     { lo: -200, hi: 200, def: 0,   show: v => v + ' px/s' },
    swayX:     { lo: 0,    hi: 400, def: 40,  show: v => v + ' px' },
    swayXTime: { lo: 1,    hi: 60,  def: 6,   show: v => v + ' s' },
    swayY:     { lo: 0,    hi: 200, def: 12,  show: v => v + ' px' },
    swayYTime: { lo: 1,    hi: 60,  def: 4,   show: v => v + ' s' },
    blend:     { lo: 5,    hi: 50,  def: 15,  show: v => v + '%' }
};
function setBgLayerField(index, field, value, input) {
    const layers = getEditingBgLayers();
    const rule = BG_FIELD_RULES[field];
    if (!layers[index] || !rule) return;
    const v = bgNum(value, rule.def, rule.lo, rule.hi);
    layers[index][field] = rule.store ? rule.store(v) : v;
    const out = input && input.parentElement && input.parentElement.querySelector('output');
    if (out) out.textContent = rule.show(v);
    markDirty();
    if (bgEditingCurrentLevel()) {
        ensureBgDriftLoop();
        draw();
    }
    drawBgPanelPreview();
}

// Segmented choices change which controls exist, so they re-render the panel.
function setBgLayerChoice(index, field, value) {
    const layers = getEditingBgLayers();
    const layer = layers[index];
    if (!layer) return;
    if (field === 'motionX') {
        layer.motionX = value === 'scroll' || value === 'sway' ? value : 'none';
        // a scroll with no speed would look like nothing happened
        if (layer.motionX === 'scroll' && !bgLayerDrift(layer)) layer.drift = 20;
    } else if (field === 'motionY') {
        layer.motionY = value === 'sway' ? 'sway' : 'none';
    } else if (field === 'seam') {
        layer.seam = bgLayerSeam({ seam: value });
    } else {
        return;
    }
    markDirty();
    renderBackgroundLayers();
    if (bgEditingCurrentLevel()) {
        ensureBgDriftLoop();
        draw();
    }
}

// 0..1. Layers saved before opacity existed have none and draw fully opaque.
function bgLayerAlpha(layer) {
    const a = parseFloat(layer && layer.opacity);
    return isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
}

function bgNum(v, def, lo, hi) {
    const n = parseFloat(v);
    return isNaN(n) ? def : Math.max(lo, Math.min(hi, n));
}

// Scroll speed in game pixels per second, used when sideways motion is 'scroll'.
function bgLayerDrift(layer) {
    return bgNum(layer && layer.drift, 0, -200, 200);
}

// Sideways motion: 'none', 'scroll' (keeps moving) or 'sway' (out and back).
// A layer saved with a drift speed but no motion field was a scroll.
function bgLayerMotionX(layer) {
    const m = layer && layer.motionX;
    if (m === 'scroll' || m === 'sway' || m === 'none') return m;
    return bgLayerDrift(layer) !== 0 ? 'scroll' : 'none';
}

function bgLayerMotionY(layer) {
    return layer && layer.motionY === 'sway' ? 'sway' : 'none';
}

function bgLayerSwayX(layer) { return bgNum(layer && layer.swayX, 40, 0, 400); }
function bgLayerSwayXTime(layer) { return bgNum(layer && layer.swayXTime, 6, 1, 60); }
function bgLayerSwayY(layer) { return bgNum(layer && layer.swayY, 12, 0, 200); }
function bgLayerSwayYTime(layer) { return bgNum(layer && layer.swayYTime, 4, 1, 60); }

// A scroll at speed 0 or a sway of 0 px is still, so the editor clock can stop.
function bgLayerMoves(layer) {
    const mx = bgLayerMotionX(layer);
    return (mx === 'scroll' && bgLayerDrift(layer) !== 0) || (mx === 'sway' && bgLayerSwayX(layer) > 0)
        || (bgLayerMotionY(layer) === 'sway' && bgLayerSwayY(layer) > 0);
}

// Where the layer's own motion has put it at time t (seconds), in game pixels.
// dx follows the camera-offset convention (positive shifts the picture left);
// dy moves it down; amp is how far it can travel vertically, which the draw
// adds above and below so no gap opens.
function bgLayerMotion(layer, t) {
    let dx = 0, dy = 0, amp = 0;
    const mx = bgLayerMotionX(layer);
    if (mx === 'scroll') dx = -t * bgLayerDrift(layer);
    else if (mx === 'sway') dx = -bgLayerSwayX(layer) * Math.sin(2 * Math.PI * t / bgLayerSwayXTime(layer));
    if (bgLayerMotionY(layer) === 'sway') {
        amp = bgLayerSwayY(layer);
        dy = amp * Math.sin(2 * Math.PI * t / bgLayerSwayYTime(layer));
    }
    return { dx, dy, amp };
}

// The same motion in editor screen pixels: scaled the way the camera offset is.
function bgMotionEditor(layer) {
    const m = bgLayerMotion(layer, performance.now() / 1000);
    const renderScale = (typeof gameSettings !== 'undefined' && gameSettings.tileRenderScale) || 1;
    const k = zoom / renderScale;
    return { dx: m.dx * k, dy: m.dy * k, amp: m.amp * k };
}

// How repeated copies of the image meet. 'mirror' flips every other copy so
// neighbouring edges are always identical; 'blend' fades the image's right
// edge into its left, so a texture that differs at its sides has no line.
function bgLayerSeam(layer) {
    const s = layer && layer.seam;
    return s === 'mirror' || s === 'blend' ? s : 'repeat';
}

// Percent of the image width faded across the seam when blending.
function bgLayerBlend(layer) {
    return Math.round(bgNum(layer && layer.blend, 15, 5, 50));
}

function bgLayerSource(layer, img) {
    return bgLayerSeam(layer) === 'blend' ? blendedSeamCanvas(img, bgLayerBlend(layer)) : img;
}

// The last pct of the image is faded over its first pct and then dropped, so
// the tile's right edge continues straight into its own left edge. Built once
// per image and blend amount. No pixel reads, so it works for images from any
// host.
function blendedSeamCanvas(img, pct) {
    const p = Math.round(pct || 15);
    img.__seamBlends = img.__seamBlends || {};
    if (img.__seamBlends[p]) return img.__seamBlends[p];
    const w = img.naturalWidth, h = img.naturalHeight;
    const o = Math.max(1, Math.round(w * p / 100));
    const c = document.createElement('canvas');
    c.width = w - o;
    c.height = h;
    const q = c.getContext('2d');
    q.drawImage(img, 0, 0, w - o, h, 0, 0, w - o, h);
    const tail = document.createElement('canvas');
    tail.width = o;
    tail.height = h;
    const tq = tail.getContext('2d');
    tq.drawImage(img, w - o, 0, o, h, 0, 0, o, h);
    tq.globalCompositeOperation = 'destination-in';
    const fade = tq.createLinearGradient(0, 0, o, 0);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    tq.fillStyle = fade;
    tq.fillRect(0, 0, o, h);
    q.drawImage(tail, 0, 0);
    img.__seamBlends[p] = c;
    return c;
}

// Repeats src across [0, viewW) with offsetX screen pixels already scrolled.
// Copy numbers stay attached to the world as it scrolls, so a mirrored copy
// never flips back and forth.
function drawTiledBgLayer(c, src, layer, offsetX, y, w, h, viewW) {
    const mirror = bgLayerSeam(layer) === 'mirror';
    let x = -(((offsetX % w) + w) % w);
    let copy = Math.floor(offsetX / w);
    for (; x < viewW; x += w, copy++) {
        const dx = Math.round(x);
        if (mirror && (copy & 1)) {
            c.save();
            c.translate(dx + w, y);
            c.scale(-1, 1);
            c.drawImage(src, 0, 0, w + 1, h);
            c.restore();
        } else {
            c.drawImage(src, dx, y, w + 1, h);
        }
    }
}

// Images for the panel preview, loaded by URL so the preview works for any
// level being edited, not only the one on the canvas.
const bgPanelImages = {};
function bgPanelImage(src) {
    src = (src || '').trim();
    if (!src) return null;
    if (!bgPanelImages[src]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => drawBgPanelPreview();
        img.onerror = () => { img.__failed = true; drawBgPanelPreview(); };
        img.src = src;
        bgPanelImages[src] = img;
    }
    return bgPanelImages[src];
}

// Preview state is only for looking, never saved with the level.
let bgPreviewMode = 'layer';
let bgPreviewPan = true;
let bgPreviewCamX = 0;
let bgPreviewPanStart = 0;

// The camera sweeps 600 game pixels each way over 12 seconds: far enough that a
// speed 1 layer visibly outruns a speed 0.2 one, slow enough to follow.
function bgPreviewCamera() {
    if (!bgPreviewPan) return bgPreviewCamX;
    return 600 * Math.sin(2 * Math.PI * (performance.now() - bgPreviewPanStart) / 12000);
}

function setBgPreviewMode(mode) {
    bgPreviewMode = mode === 'all' ? 'all' : 'layer';
    renderBackgroundLayers();
}

function setBgPreviewPan(on) {
    if (on) bgPreviewPanStart = performance.now();
    else bgPreviewCamX = bgPreviewCamera();
    bgPreviewPan = !!on;
}

// Dragging the strip moves the camera the way dragging a map does: pull right and
// the world follows the pointer, so a speed 1 layer stays under it.
function attachBgPreviewDrag(cv) {
    let lastX = null;
    cv.addEventListener('pointerdown', (e) => {
        if (bgPreviewMode !== 'all') return;
        if (bgPreviewPan) {
            setBgPreviewPan(false);
            const box = document.getElementById('bgp-pan');
            if (box) box.checked = false;
        }
        lastX = e.clientX;
        cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
        if (lastX === null) return;
        // pointer pixels to strip pixels, then strip pixels to game pixels
        const toStrip = cv.width / (cv.clientWidth || cv.width);
        bgPreviewCamX -= (e.clientX - lastX) * toStrip / (cv.height / 500);
        lastX = e.clientX;
        drawBgPanelPreview();
    });
    const end = () => { lastX = null; };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
}

// Draws one layer into the strip. k converts game pixels to strip pixels, as if
// the strip were the 500px-tall game screen. Returns where its copies start.
function drawBgPreviewLayer(c, layer, camX, k, w, h) {
    const img = bgPanelImage(layer.src);
    if (!img || img.__failed || !img.complete || !img.naturalWidth) return null;
    const m = bgLayerMotion(layer, performance.now() / 1000);
    const src = bgLayerSource(layer, img);
    const dh = Math.ceil(h + m.amp * 2 * k);
    const dw = Math.max(1, Math.ceil((src.naturalWidth || src.width) * dh / (src.naturalHeight || src.height)));
    const speed = Math.max(0, Math.min(1, parseFloat(layer.speed) || 0));
    const offsetX = (camX * speed + m.dx) * k;
    c.globalAlpha = bgLayerAlpha(layer);
    drawTiledBgLayer(c, src, layer, offsetX, -m.amp * k + m.dy * k, dw, dh, w);
    c.globalAlpha = 1;
    return { offsetX, dw };
}

// This layer: the selected layer alone over the level's background color, with
// no camera. All layers: every visible layer back to front, each shifted by the
// shared camera times its own parallax speed.
function drawBgPanelPreview() {
    const cv = document.getElementById('bgp-preview');
    if (!cv) return;
    const w = Math.max(200, Math.round(cv.clientWidth || cv.width));
    if (cv.width !== w) cv.width = w;
    const h = cv.height;
    const c = cv.getContext('2d');
    const layers = getEditingBgLayers() || [];
    const layer = layers[selectedBgLayerIndex];
    const lvl = (typeof editingLevelIndex !== 'undefined' && editingLevelIndex >= 0 && levels[editingLevelIndex]) ? levels[editingLevelIndex] : getCurrentLevel();
    c.globalAlpha = 1;
    c.fillStyle = (lvl && lvl.bgColor) || '#222a36';
    c.fillRect(0, 0, w, h);
    const note = (text) => {
        c.fillStyle = 'rgba(230, 233, 239, 0.6)';
        c.font = '12px sans-serif';
        c.textAlign = 'center';
        c.fillText(text, w / 2, h / 2 + 4);
    };
    if (!layer) return;
    const k = h / 500;
    let joins = null;
    if (bgPreviewMode === 'all') {
        const camX = bgPreviewCamera();
        let drawn = 0;
        layers.forEach((l, i) => {
            if (!l || l.visible === false) return;
            const r = drawBgPreviewLayer(c, l, camX, k, w, h);
            if (r) drawn++;
            if (i === selectedBgLayerIndex) joins = r;
        });
        if (!drawn) return note('No visible layer has an image yet');
    } else {
        const img = bgPanelImage(layer.src);
        if (!img) return note('Add an image to see this layer');
        if (img.__failed) return note('The image did not load');
        if (!img.complete || !img.naturalWidth) return note('Loading...');
        joins = drawBgPreviewLayer(c, Object.assign({}, layer, { speed: 0 }), 0, k, w, h);
    }
    const showJoins = document.getElementById('bgp-show-joins');
    if (joins && showJoins && showJoins.checked) {
        const { offsetX, dw } = joins;
        c.save();
        c.strokeStyle = 'rgba(79, 140, 255, 0.9)';
        c.setLineDash([4, 4]);
        c.lineWidth = 1;
        for (let x = -(((offsetX % dw) + dw) % dw); x <= w; x += dw) {
            if (x <= 0) continue;
            c.beginPath();
            c.moveTo(Math.round(x) + 0.5, 0);
            c.lineTo(Math.round(x) + 0.5, h);
            c.stroke();
        }
        c.restore();
    }
}

// Animates the preview while the Backgrounds section is on screen, about
// 24fps, and stops as soon as the panel is hidden or closed.
let bgPanelRAF = null;
let bgPanelLastDraw = 0;
function startBgPanelPreview() {
    drawBgPanelPreview();
    if (bgPanelRAF) return;
    const tick = (now) => {
        const cv = document.getElementById('bgp-preview');
        const modal = document.getElementById('level-settings-modal');
        if (!cv || !modal || modal.style.display === 'none' || !cv.offsetParent) {
            bgPanelRAF = null;
            return;
        }
        bgPanelRAF = requestAnimationFrame(tick);
        if (now - bgPanelLastDraw < 42 || document.hidden) return;
        bgPanelLastDraw = now;
        drawBgPanelPreview();
    };
    bgPanelRAF = requestAnimationFrame(tick);
}

// The editor only redraws on input, so a moving layer needs its own clock.
// It runs while the current level has a visible moving layer, at about
// 24fps, skips frames while the tab is hidden or backgrounds are switched
// off, and ends itself when nothing moves.
let bgDriftRAF = null;
let bgDriftLastDraw = 0;
function ensureBgDriftLoop() {
    if (bgDriftRAF) return;
    const tick = (now) => {
        const moving = (backgroundLayers || []).some(l => l && l.visible !== false && bgLayerMoves(l));
        if (!moving) {
            bgDriftRAF = null;
            return;
        }
        bgDriftRAF = requestAnimationFrame(tick);
        if (now - bgDriftLastDraw < 42) return;
        const showBg = document.getElementById('show-bg');
        if (document.hidden || (showBg && !showBg.checked)) return;
        bgDriftLastDraw = now;
        draw();
    };
    bgDriftRAF = requestAnimationFrame(tick);
}

function addBackgroundLayer() {
    const layers = getEditingBgLayers();
    layers.push({ src: '', speed: 0.5, visible: true, opacity: 1, motionX: 'none', drift: 0, motionY: 'none', seam: 'repeat', blend: 15 });
    selectedBgLayerIndex = layers.length - 1;
    markDirty();
    renderBackgroundLayers();
}

function toggleBgLayerVisibility(index) {
    const layers = getEditingBgLayers();
    if (!layers[index]) return;
    layers[index].visible = !layers[index].visible;
    markDirty();
    renderBackgroundLayers();
    ensureBgDriftLoop();
    if (bgEditingCurrentLevel()) {
        draw();
    }
}

function updateBgLayer(index, src) {
    const layers = getEditingBgLayers();
    layers[index].src = src;
    markDirty();
    // Clear cached image so it reloads (only if editing current level)
    if (bgEditingCurrentLevel()) {
        loadedBackgroundImages[index] = null;
    }
}

function removeBgLayer(index) {
    const layers = getEditingBgLayers();
    if (!layers[index]) return;
    layers.splice(index, 1);
    if (selectedBgLayerIndex > index || selectedBgLayerIndex >= layers.length) {
        selectedBgLayerIndex = Math.max(0, selectedBgLayerIndex - 1);
    }
    if (bgEditingCurrentLevel()) {
        loadedBackgroundImages.splice(index, 1);
        draw();
    }
    markDirty();
    renderBackgroundLayers();
}

// Load all background images from URLs
// Each call starts a new generation. Without it a slow image from an earlier
// call (the project's old layer, or the URL before a Browse pick) could finish
// last and replace the layer the student just set.
let bgImageLoadSeq = 0;
function loadBackgroundImages() {
    const seq = ++bgImageLoadSeq;
    loadedBackgroundImages = [];

    backgroundLayers.forEach((layer, index) => {
        if (layer.src && layer.src.trim() !== '') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                if (seq !== bgImageLoadSeq) return;
                loadedBackgroundImages[index] = img;
                draw();
            };
            img.onerror = function() {
                if (seq !== bgImageLoadSeq) return;
                console.warn(`Failed to load background layer ${index}: ${layer.src}`);
                loadedBackgroundImages[index] = null;
            };
            img.src = layer.src;
        } else {
            loadedBackgroundImages[index] = null;
        }
    });
    ensureBgDriftLoop();
}
