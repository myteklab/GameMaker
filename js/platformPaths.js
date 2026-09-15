// ============================================
// PLATFORM PATHS
// ============================================
// A placed moving platform can carry its own sketched path, which replaces its
// type's back-and-forth or loop: obj.path = { points: [[dx, dy], ...], loop },
// in game pixels from where the platform starts, first point [0, 0]. It lives on
// the placed object, not the type, because two platforms of one type can follow
// different drawings.

let platformPathTarget = null;   // the placed platform the bar belongs to
let platformPathArmed = false;   // Draw path pressed, waiting for the drag
let platformPathStroke = null;   // editor-world points while the mouse is down
let platformPathSavedHint = null;

function editorToGamePx(v) {
    return v * ((typeof gameSettings !== 'undefined' && gameSettings.tileRenderScale) || 2);
}

function validPlatformPath(path) {
    return path && Array.isArray(path.points) && path.points.length >= 2 ? path : null;
}

// Where the game starts the platform, in editor world pixels: centered on its
// cell and standing on the cell's bottom (initGameObjects does the same).
function platformStartCenter(obj) {
    const t = getTemplate('movingPlatform', obj.templateId);
    const h = t && t.height ? gameToEditorPx(t.height) : tileSize;
    return { x: obj.x * tileSize + tileSize / 2, y: obj.y * tileSize + tileSize - h / 2 };
}

// ---- floating bar ----

function showPlatformPathBar(obj) {
    platformPathTarget = obj;
    platformPathArmed = false;
    renderPlatformPathBar();
}

function hidePlatformPathBar() {
    stopPlatformPathListeners();
    platformPathTarget = null;
    platformPathArmed = false;
    platformPathStroke = null;
    setPlatformPathHint(false);
    const bar = document.getElementById('platform-path-bar');
    if (bar) bar.hidden = true;
}

function renderPlatformPathBar() {
    const bar = document.getElementById('platform-path-bar');
    if (!bar) return;
    const obj = platformPathTarget;
    if (!obj || gameObjects.indexOf(obj) < 0) {
        hidePlatformPathBar();
        return;
    }
    const path = validPlatformPath(obj.path);
    const drawLabel = platformPathArmed ? 'Now drag from the platform' : (path ? 'Redraw path' : 'Draw path');
    bar.innerHTML = `
        <button type="button" class="ppb-btn${platformPathArmed ? ' active' : ''}" onclick="armPlatformPath()">${drawLabel}</button>
        ${path ? `
        <div class="ppb-seg">
            <button type="button" class="${path.loop ? '' : 'active'}" onclick="setPlatformPathLoop(false)">Back and forth</button>
            <button type="button" class="${path.loop ? 'active' : ''}" onclick="setPlatformPathLoop(true)">Loop</button>
        </div>
        <button type="button" class="ppb-btn" onclick="clearPlatformPath()">Clear path</button>` : ''}
        <button type="button" class="ppb-close" title="Close" onclick="hidePlatformPathBar()">&times;</button>`;
    bar.hidden = false;
    positionPlatformPathBar();
}

function positionPlatformPathBar() {
    const bar = document.getElementById('platform-path-bar');
    if (!bar || bar.hidden || !platformPathTarget) return;
    const c = platformStartCenter(platformPathTarget);
    const sx = (c.x - cameraX) * zoom;
    const sy = (c.y - cameraY) * zoom;
    const room = (bar.parentElement ? bar.parentElement.clientWidth : canvas.width) - bar.offsetWidth - 8;
    bar.style.left = Math.max(8, Math.min(room, sx - bar.offsetWidth / 2)) + 'px';
    bar.style.top = Math.max(8, sy - tileSize * zoom - bar.offsetHeight) + 'px';
}

function setPlatformPathHint(on) {
    const hint = document.getElementById('tool-hint');
    if (!hint) return;
    if (on) {
        if (platformPathSavedHint === null) platformPathSavedHint = hint.textContent;
        hint.textContent = 'Drag from the platform to sketch where it goes. End near the start for a loop. Esc cancels.';
    } else if (platformPathSavedHint !== null) {
        hint.textContent = platformPathSavedHint;
        platformPathSavedHint = null;
    }
}

function armPlatformPath() {
    if (!platformPathTarget) return;
    platformPathArmed = !platformPathArmed;
    setPlatformPathHint(platformPathArmed);
    renderPlatformPathBar();
}

function setPlatformPathLoop(loop) {
    const obj = platformPathTarget;
    if (!obj || !validPlatformPath(obj.path) || !!obj.path.loop === !!loop) return;
    saveUndoState('Change Platform Path');
    obj.path.loop = !!loop;
    platformPathChanged(obj);
}

function clearPlatformPath() {
    const obj = platformPathTarget;
    if (!obj || !obj.path) return;
    saveUndoState('Clear Platform Path');
    delete obj.path;
    platformPathChanged(obj);
    showToast('Path cleared: the platform moves the way its type says again');
}

function platformPathChanged(obj) {
    markDirty();
    if (window.GameCollab && typeof window.GameCollab.objectChanged === 'function') {
        window.GameCollab.objectChanged(obj);
    }
    renderPlatformPathBar();
    draw();
}

// True while the bar is open, armed or drawing, so Esc closes it instead of
// starting a play test.
function platformPathUsesEscape() {
    return !!(platformPathTarget || platformPathArmed || platformPathStroke);
}

// Esc: stop a drag, then disarm, then close the bar. True when it used the key.
function cancelPlatformPath() {
    if (platformPathStroke) {
        stopPlatformPathListeners();
        platformPathStroke = null;
        platformPathArmed = false;
        setPlatformPathHint(false);
        renderPlatformPathBar();
        draw();
        return true;
    }
    if (platformPathArmed) {
        armPlatformPath();
        return true;
    }
    if (platformPathTarget) {
        hidePlatformPathBar();
        return true;
    }
    return false;
}

// ---- drawing ----

// Called first by the canvas mouse handlers with canvas-relative x, y. Returns
// true when the event was path drawing, so the editor's own handling is skipped.
function platformPathMouse(kind, e, x, y) {
    if (kind === 'down') {
        if (platformPathArmed && platformPathTarget && e.button === 0) {
            const c = platformStartCenter(platformPathTarget);
            platformPathStroke = [[c.x, c.y]];
            addPlatformPathPoint(x, y);
            // The bar floats right where a path usually goes, and a stroke can run
            // off the canvas; canvas events stop at either, so follow the window.
            window.addEventListener('mousemove', onPlatformPathWindowMove);
            window.addEventListener('mouseup', onPlatformPathWindowUp);
            draw();
            return true;
        }
        // any other click closes the bar; dropping a platform opens it again
        if (platformPathTarget && !platformPathArmed) hidePlatformPathBar();
        return false;
    }
    // while a stroke is live the window listeners own the moves and the release
    return !!platformPathStroke;
}

function addPlatformPathPoint(x, y) {
    const wx = x / zoom + cameraX;
    const wy = y / zoom + cameraY;
    const last = platformPathStroke[platformPathStroke.length - 1];
    if (Math.hypot(wx - last[0], wy - last[1]) * zoom >= 3) platformPathStroke.push([wx, wy]);
}

function onPlatformPathWindowMove(e) {
    if (!platformPathStroke) return;
    const r = canvas.getBoundingClientRect();
    addPlatformPathPoint(e.clientX - r.left, e.clientY - r.top);
    draw();
}

function onPlatformPathWindowUp(e) {
    stopPlatformPathListeners();
    if (!platformPathStroke) return;
    const r = canvas.getBoundingClientRect();
    addPlatformPathPoint(e.clientX - r.left, e.clientY - r.top);
    finishPlatformPath();
}

function stopPlatformPathListeners() {
    window.removeEventListener('mousemove', onPlatformPathWindowMove);
    window.removeEventListener('mouseup', onPlatformPathWindowUp);
}

function finishPlatformPath() {
    const obj = platformPathTarget;
    const stroke = platformPathStroke;
    platformPathStroke = null;
    platformPathArmed = false;
    setPlatformPathHint(false);
    if (!obj || !stroke) {
        renderPlatformPathBar();
        draw();
        return;
    }
    const c = platformStartCenter(obj);
    const path = buildPlatformPath(stroke.map(p => [editorToGamePx(p[0] - c.x), editorToGamePx(p[1] - c.y)]));
    if (!path) {
        showToast('That path is too short. Drag further from the platform.', 'info');
        renderPlatformPathBar();
        draw();
        return;
    }
    saveUndoState('Draw Platform Path');
    obj.path = path;
    platformPathChanged(obj);
    showToast(path.loop ? 'Loop drawn: the platform goes round and round' : 'Path drawn: the platform goes there and back');
}

// Turns a freehand stroke (game pixels from the platform) into something a
// platform can glide along: drop points that barely change direction
// (Douglas-Peucker), close it into a loop when it ends near the start, round
// the corners (two Chaikin passes), and pin the first point on the platform.
function buildPlatformPath(raw) {
    let length = 0;
    for (let i = 1; i < raw.length; i++) length += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
    if (raw.length < 2 || length < 24) return null;

    const start = raw[0];
    const nearStart = p => Math.hypot(p[0] - start[0], p[1] - start[1]) < 28;
    const loop = raw.length > 3 && length > 96 && nearStart(raw[raw.length - 1]);
    let pts = raw.slice();
    if (loop) {
        while (pts.length > 3 && nearStart(pts[pts.length - 1])) pts.pop();
    }

    let eps = 2;
    let simple = simplifyPlatformPath(pts, eps);
    while (simple.length > 40) {
        eps *= 1.5;
        simple = simplifyPlatformPath(pts, eps);
    }
    if (loop && simple.length < 3) return null;

    let smooth = simple;
    for (let k = 0; k < 2; k++) smooth = chaikinPlatformPath(smooth, loop);
    if (loop) {
        // closed smoothing pulls the start inward, so begin at the point nearest the platform
        let best = 0;
        smooth.forEach((p, i) => { if (Math.hypot(p[0], p[1]) < Math.hypot(smooth[best][0], smooth[best][1])) best = i; });
        smooth = smooth.slice(best).concat(smooth.slice(0, best));
    }
    smooth[0] = [0, 0];
    return { points: smooth.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]), loop };
}

function simplifyPlatformPath(pts, eps) {
    if (pts.length < 3) return pts.slice();
    const keep = new Array(pts.length).fill(false);
    keep[0] = keep[pts.length - 1] = true;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop();
        const ax = pts[a][0], ay = pts[a][1], dx = pts[b][0] - ax, dy = pts[b][1] - ay;
        const len = Math.hypot(dx, dy);
        let far = -1, farD = eps;
        for (let i = a + 1; i < b; i++) {
            const d = len > 0
                ? Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len
                : Math.hypot(pts[i][0] - ax, pts[i][1] - ay);
            if (d > farD) { far = i; farD = d; }
        }
        if (far >= 0) {
            keep[far] = true;
            stack.push([a, far], [far, b]);
        }
    }
    return pts.filter((p, i) => keep[i]);
}

function chaikinPlatformPath(pts, closed) {
    const n = pts.length;
    const out = closed ? [] : [pts[0]];
    const segments = closed ? n : n - 1;
    for (let i = 0; i < segments; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
}

// ---- canvas drawing ----

// The dashed path under a placed platform, from its center (screen pixels).
function tracePlatformOwnPath(c, path, centerX, centerY) {
    path.points.forEach((p, i) => {
        const px = centerX + gameToEditorPx(p[0]) * zoom;
        const py = centerY + gameToEditorPx(p[1]) * zoom;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    });
    if (path.loop) c.closePath();
}

// Last thing draw() does: the stroke being dragged, and keeping the bar beside
// its platform through pans, zooms and undo.
function drawPlatformPathOverlay() {
    if (platformPathTarget && gameObjects.indexOf(platformPathTarget) < 0) hidePlatformPathBar();
    if (platformPathStroke) {
        ctx.save();
        ctx.strokeStyle = '#4f8cff';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        platformPathStroke.forEach((p, i) => {
            const sx = (p[0] - cameraX) * zoom, sy = (p[1] - cameraY) * zoom;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.restore();
    }
    positionPlatformPathBar();
}
