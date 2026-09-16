// ============================================
// OBJECT TOOLS
// ============================================
// Click or drop a placed object and a small bar appears over it. Any object can
// be resized on its own; moving platforms and enemies can also follow a path the
// student sketches. Both live on the placed object, not its type, so two objects
// of one type can differ:
//   obj.size = { w, h }                       game pixels, absent = the type's size
//   obj.path = { points: [[dx, dy], ...], loop }  game pixels from where it starts,
//                                             first point [0, 0]

let objectToolsTarget = null;   // the placed object the bar belongs to
let objectPathArmed = false;    // Draw path pressed, waiting for the drag
let objectPathStroke = null;    // editor-world points while the mouse is down
let objectResizing = false;     // the size handle is being dragged
let objectToolsSavedHint = null;
let zoneDragTipShown = false;

const OBJECT_PATH_NOUN = { movingPlatform: 'platform', enemy: 'enemy' };

function canUseObjectTools(obj) {
    return !!obj && obj.type !== 'terrainZone';
}

function canHaveObjectPath(obj) {
    return !!obj && Object.prototype.hasOwnProperty.call(OBJECT_PATH_NOUN, obj.type);
}

function editorToGamePx(v) {
    return v * ((typeof gameSettings !== 'undefined' && gameSettings.tileRenderScale) || 2);
}

function validObjectPath(path) {
    return path && Array.isArray(path.points) && path.points.length >= 2 ? path : null;
}

// Where the game starts the object, in editor world pixels (initGameObjects
// centers it on its cell and stands it on the cell's bottom).
function objectStartCenter(obj) {
    const box = objectEditorBox(obj);
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

// ---- floating bar ----

function showObjectTools(obj) {
    if (!canUseObjectTools(obj)) return;
    objectToolsTarget = obj;
    objectPathArmed = false;
    renderObjectTools();
}

function hideObjectTools() {
    stopObjectToolListeners();
    objectToolsTarget = null;
    objectPathArmed = false;
    objectPathStroke = null;
    objectResizing = false;
    setObjectToolsHint(null);
    const bar = document.getElementById('object-tools-bar');
    if (bar) bar.hidden = true;
    if (typeof draw === 'function') draw();
}

function renderObjectTools() {
    const bar = document.getElementById('object-tools-bar');
    if (!bar) return;
    const obj = objectToolsTarget;
    if (!obj || gameObjects.indexOf(obj) < 0) {
        hideObjectTools();
        return;
    }
    let html = '';
    if (canHaveObjectPath(obj)) {
        const path = validObjectPath(obj.path);
        const drawLabel = objectPathArmed ? 'Now drag from it' : (path ? 'Redraw path' : 'Draw path');
        html += `<button type="button" class="otb-btn${objectPathArmed ? ' active' : ''}" onclick="armObjectPath()">${drawLabel}</button>`;
        if (path) {
            html += `
            <div class="otb-seg">
                <button type="button" class="${path.loop ? '' : 'active'}" onclick="setObjectPathLoop(false)">Back and forth</button>
                <button type="button" class="${path.loop ? 'active' : ''}" onclick="setObjectPathLoop(true)">Loop</button>
            </div>
            <button type="button" class="otb-btn" onclick="clearObjectPath()">Clear path</button>`;
        }
        html += '<span class="otb-divider"></span>';
    }
    const size = objectGameSize(obj);
    html += `<span class="otb-size" title="Drag the square on the corner to resize">${Math.round(size.w)} &times; ${Math.round(size.h)}</span>`;
    if (obj.size) html += `<button type="button" class="otb-btn" onclick="resetObjectSize()">Reset size</button>`;
    html += `<button type="button" class="otb-close" title="Close" onclick="hideObjectTools()">&times;</button>`;
    bar.innerHTML = html;
    bar.hidden = false;
    positionObjectTools();
    if (typeof draw === 'function') draw();
}

function positionObjectTools() {
    const bar = document.getElementById('object-tools-bar');
    if (!bar || bar.hidden || !objectToolsTarget) return;
    const box = objectEditorBox(objectToolsTarget);
    const sx = (box.x + box.w / 2 - cameraX) * zoom;
    const sy = (box.y - cameraY) * zoom;
    const room = (bar.parentElement ? bar.parentElement.clientWidth : canvas.width) - bar.offsetWidth - 8;
    bar.style.left = Math.max(8, Math.min(room, sx - bar.offsetWidth / 2)) + 'px';
    bar.style.top = Math.max(8, sy - 14 - bar.offsetHeight) + 'px';
}

function setObjectToolsHint(text) {
    const hint = document.getElementById('tool-hint');
    if (!hint) return;
    if (text) {
        if (objectToolsSavedHint === null) objectToolsSavedHint = hint.textContent;
        hint.textContent = text;
    } else if (objectToolsSavedHint !== null) {
        hint.textContent = objectToolsSavedHint;
        objectToolsSavedHint = null;
    }
}

function objectToolsChanged(obj) {
    markDirty();
    if (window.GameCollab && typeof window.GameCollab.objectChanged === 'function') {
        window.GameCollab.objectChanged(obj);
    }
    renderObjectTools();
}

// ---- paths ----

function armObjectPath() {
    if (!canHaveObjectPath(objectToolsTarget)) return;
    objectPathArmed = !objectPathArmed;
    setObjectToolsHint(objectPathArmed ? 'Drag from the ' + OBJECT_PATH_NOUN[objectToolsTarget.type] + ' to sketch where it goes. End near the start for a loop. Esc cancels.' : null);
    renderObjectTools();
}

function setObjectPathLoop(loop) {
    const obj = objectToolsTarget;
    if (!obj || !validObjectPath(obj.path) || !!obj.path.loop === !!loop) return;
    saveUndoState('Change Path');
    obj.path.loop = !!loop;
    objectToolsChanged(obj);
}

function clearObjectPath() {
    const obj = objectToolsTarget;
    if (!obj || !obj.path) return;
    saveUndoState('Clear Path');
    delete obj.path;
    objectToolsChanged(obj);
    showToast('Path cleared: it moves the way its type says again');
}

// ---- size ----

function resetObjectSize() {
    const obj = objectToolsTarget;
    if (!obj || !obj.size) return;
    saveUndoState('Reset Size');
    delete obj.size;
    objectToolsChanged(obj);
}

// The square on the object's top right corner, in screen pixels.
function objectResizeHandleRect(obj) {
    const box = objectEditorBox(obj);
    const x = (box.x + box.w - cameraX) * zoom, y = (box.y - cameraY) * zoom;
    return { x: x - 6, y: y - 6, w: 12, h: 12 };
}

// Objects are centered on their cell and stand on its bottom, so the size grows
// out from the middle and upward from the floor, which is where the game puts it.
function resizeObjectToPointer(clientX, clientY) {
    const obj = objectToolsTarget;
    if (!obj) return;
    const r = canvas.getBoundingClientRect();
    const wx = (clientX - r.left) / zoom + cameraX;
    const wy = (clientY - r.top) / zoom + cameraY;
    const centerX = obj.x * tileSize + tileSize / 2;
    const bottom = obj.y * tileSize + tileSize;
    const snap = v => Math.max(8, Math.min(512, Math.round(v / 4) * 4));
    obj.size = { w: snap(editorToGamePx(2 * Math.abs(wx - centerX))), h: snap(editorToGamePx(bottom - wy)) };
    renderObjectTools();
}

function finishObjectResize() {
    objectResizing = false;
    const obj = objectToolsTarget;
    if (!obj) return;
    const template = getTemplate(obj.type, obj.templateId);
    const typeSize = objectGameSize({ type: obj.type, templateId: obj.templateId }, template);
    if (obj.size && obj.size.w === typeSize.w && obj.size.h === typeSize.h) delete obj.size;
    objectToolsChanged(obj);
}

// ---- keys ----

// True while the bar is open, armed or drawing, so Esc closes it instead of
// starting a play test.
function objectToolsUseEscape() {
    return !!(objectToolsTarget || objectPathArmed || objectPathStroke || objectResizing);
}

// Esc: stop a drag, then disarm, then close the bar. True when it used the key.
function cancelObjectTools() {
    if (objectPathStroke) {
        stopObjectToolListeners();
        objectPathStroke = null;
        objectPathArmed = false;
        setObjectToolsHint(null);
        renderObjectTools();
        return true;
    }
    if (objectPathArmed) {
        armObjectPath();
        return true;
    }
    if (objectToolsTarget) {
        hideObjectTools();
        return true;
    }
    return false;
}

// ---- mouse ----

// Called first by the canvas mouse handlers with canvas-relative x, y. Returns
// true when the event belonged to the tools, so the editor's own handling is
// skipped. Once a stroke or resize starts, window listeners take over: the bar
// floats right where a path usually goes and a drag can leave the canvas, and
// canvas events stop at either.
function objectToolsMouse(kind, e, x, y) {
    if (kind === 'down') {
        const obj = objectToolsTarget;
        if (obj && e.button === 0 && !objectPathArmed) {
            const h = objectResizeHandleRect(obj);
            if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
                saveUndoState('Resize Object');
                objectResizing = true;
                window.addEventListener('mousemove', onObjectToolsWindowMove);
                window.addEventListener('mouseup', onObjectToolsWindowUp);
                return true;
            }
        }
        if (objectPathArmed && obj && e.button === 0) {
            const c = objectStartCenter(obj);
            objectPathStroke = [[c.x, c.y]];
            addObjectPathPoint(x, y);
            window.addEventListener('mousemove', onObjectToolsWindowMove);
            window.addEventListener('mouseup', onObjectToolsWindowUp);
            draw();
            return true;
        }
        // any other click closes the bar; clicking or dropping an object opens it again
        if (obj && !objectPathArmed) hideObjectTools();
        return false;
    }
    return !!(objectPathStroke || objectResizing);
}

function addObjectPathPoint(x, y) {
    const wx = x / zoom + cameraX;
    const wy = y / zoom + cameraY;
    const last = objectPathStroke[objectPathStroke.length - 1];
    if (Math.hypot(wx - last[0], wy - last[1]) * zoom >= 3) objectPathStroke.push([wx, wy]);
}

function onObjectToolsWindowMove(e) {
    if (objectResizing) {
        resizeObjectToPointer(e.clientX, e.clientY);
        return;
    }
    if (!objectPathStroke) return;
    const r = canvas.getBoundingClientRect();
    addObjectPathPoint(e.clientX - r.left, e.clientY - r.top);
    draw();
}

function onObjectToolsWindowUp(e) {
    stopObjectToolListeners();
    if (objectResizing) {
        resizeObjectToPointer(e.clientX, e.clientY);
        finishObjectResize();
        return;
    }
    if (!objectPathStroke) return;
    const r = canvas.getBoundingClientRect();
    addObjectPathPoint(e.clientX - r.left, e.clientY - r.top);
    finishObjectPath();
}

function stopObjectToolListeners() {
    window.removeEventListener('mousemove', onObjectToolsWindowMove);
    window.removeEventListener('mouseup', onObjectToolsWindowUp);
}

function finishObjectPath() {
    const obj = objectToolsTarget;
    const stroke = objectPathStroke;
    objectPathStroke = null;
    objectPathArmed = false;
    setObjectToolsHint(null);
    if (!obj || !stroke) {
        renderObjectTools();
        return;
    }
    const noun = OBJECT_PATH_NOUN[obj.type] || 'object';
    const c = objectStartCenter(obj);
    const path = buildObjectPath(stroke.map(p => [editorToGamePx(p[0] - c.x), editorToGamePx(p[1] - c.y)]));
    if (!path) {
        showToast('That path is too short. Drag further from the ' + noun + '.', 'info');
        renderObjectTools();
        return;
    }
    saveUndoState('Draw Path');
    obj.path = path;
    objectToolsChanged(obj);
    showToast(path.loop ? 'Loop drawn: the ' + noun + ' goes round and round' : 'Path drawn: the ' + noun + ' goes there and back');
}

// Turns a freehand stroke (game pixels from the object) into something it can
// glide along: drop points that barely change direction (Douglas-Peucker),
// close it into a loop when it ends near the start, round the corners (two
// Chaikin passes), and pin the first point on the object.
function buildObjectPath(raw) {
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
    let simple = simplifyPath(pts, eps);
    while (simple.length > 40) {
        eps *= 1.5;
        simple = simplifyPath(pts, eps);
    }
    if (loop && simple.length < 3) return null;

    let smooth = simple;
    for (let k = 0; k < 2; k++) smooth = chaikinPath(smooth, loop);
    if (loop) {
        // closed smoothing pulls the start inward, so begin at the point nearest the object
        let best = 0;
        smooth.forEach((p, i) => { if (Math.hypot(p[0], p[1]) < Math.hypot(smooth[best][0], smooth[best][1])) best = i; });
        smooth = smooth.slice(best).concat(smooth.slice(0, best));
    }
    smooth[0] = [0, 0];
    return { points: smooth.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]), loop };
}

function simplifyPath(pts, eps) {
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

function chaikinPath(pts, closed) {
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

// A sketched path from the object's center (screen pixels).
function traceObjectPath(c, path, centerX, centerY) {
    path.points.forEach((p, i) => {
        const px = centerX + gameToEditorPx(p[0]) * zoom;
        const py = centerY + gameToEditorPx(p[1]) * zoom;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    });
    if (path.loop) c.closePath();
}

// Last thing draw() does: enemy paths (platform paths draw with the platform),
// the stroke being dragged, the size handle, and keeping the bar beside its
// object through pans, zooms and undo.
function drawObjectToolsOverlay() {
    if (objectToolsTarget && gameObjects.indexOf(objectToolsTarget) < 0) {
        objectToolsTarget = null;
        const bar = document.getElementById('object-tools-bar');
        if (bar) bar.hidden = true;
    }
    if (document.getElementById('show-objects')?.checked !== false) {
        gameObjects.forEach(obj => {
            if (obj.type !== 'enemy' || !validObjectPath(obj.path)) return;
            const c = objectStartCenter(obj);
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 120, 120, 0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            traceObjectPath(ctx, obj.path, (c.x - cameraX) * zoom, (c.y - cameraY) * zoom);
            ctx.stroke();
            ctx.restore();
        });
    }
    if (objectPathStroke) {
        ctx.save();
        ctx.strokeStyle = '#4f8cff';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        objectPathStroke.forEach((p, i) => {
            const sx = (p[0] - cameraX) * zoom, sy = (p[1] - cameraY) * zoom;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.restore();
    }
    if (objectToolsTarget && !objectPathArmed && !objectPathStroke) {
        const box = objectEditorBox(objectToolsTarget);
        const h = objectResizeHandleRect(objectToolsTarget);
        ctx.save();
        ctx.strokeStyle = 'rgba(79, 140, 255, 0.9)';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect((box.x - cameraX) * zoom + 0.5, (box.y - cameraY) * zoom + 0.5, box.w * zoom, box.h * zoom);
        ctx.setLineDash([]);
        ctx.fillStyle = '#4f8cff';
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(h.x + 0.5, h.y + 0.5, h.w - 1, h.h - 1);
        ctx.restore();
    }
    positionObjectTools();
}
