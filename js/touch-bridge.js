// ============================================
// TOUCH - fingers drive the mouse handlers
// ============================================
// iPad Safari sends no mouse events for a finger drag, and every editing
// surface here listens for mousedown/mousemove/mouseup, some of them on the
// document or window so a drag can leave the canvas. Rather than give each
// one a second touch path, a finger is replayed as the mouse events a real
// mouse would make, dispatched where a mouse would put them. Every tool then
// behaves the same and the mouse code is untouched.
//
// preventDefault on touchstart stops Safari's own pretend mouse events and
// the click after a tap, so a tap is not counted twice.

const TOUCH_HOLD_MS = 80;

function synthMouse(type, x, y, to, buttons) {
    to.dispatchEvent(new MouseEvent(type, {
        bubbles: type !== 'mouseleave',
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: buttons
    }));
}

// opts.onPinch(midX, midY, scale, dx, dy): two fingers; midX/midY are
// relative to el, scale is since the last call. Without it a second finger
// is ignored.
function attachTouchBridge(el, opts) {
    if (!el || el.dataset.touchBridge) return;
    el.dataset.touchBridge = '1';
    opts = opts || {};

    let pending = null;   // a first finger waiting to see if a second one lands
    let down = false;
    let inside = true;
    let pinch = null;
    let last = null;

    const under = (x, y) => document.elementFromPoint(x, y) || document.body;
    const centroid = (ts) => ({
        x: (ts[0].clientX + ts[1].clientX) / 2,
        y: (ts[0].clientY + ts[1].clientY) / 2,
        d: Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY) || 1
    });

    function press() {
        if (!pending) return;
        clearTimeout(pending.timer);
        const p = pending;
        pending = null;
        down = true;
        inside = true;
        synthMouse('mousemove', p.x, p.y, el, 0);
        synthMouse('mousedown', p.x, p.y, el, 1);
    }

    // A move goes to whatever is under the finger, as with a mouse, and
    // crossing out of el sends the mouseleave a mouse would.
    function move(x, y) {
        const target = under(x, y);
        const nowInside = el.contains(target);
        if (inside && !nowInside) synthMouse('mouseleave', x, y, el, 1);
        inside = nowInside;
        synthMouse('mousemove', x, y, target, 1);
    }

    function release(x, y) {
        if (!down) return;
        down = false;
        synthMouse('mouseup', x, y, under(x, y), 0);
    }

    // The scrollbar thumb sits inside its track and both are bridged; a touch
    // belongs to the innermost one only.
    const mine = (e) => e.target.closest('[data-touch-bridge]') === el;

    el.addEventListener('touchstart', (e) => {
        if (!mine(e)) return;
        e.preventDefault();
        if (e.touches.length >= 2) {
            if (!opts.onPinch) return;
            if (pending) { clearTimeout(pending.timer); pending = null; }
            else if (down && last) release(last.x, last.y);   // a stroke under way ends where it was
            pinch = centroid(e.touches);
            return;
        }
        if (pinch) return;
        const t = e.touches[0];
        last = { x: t.clientX, y: t.clientY };
        pending = { x: t.clientX, y: t.clientY, timer: setTimeout(press, TOUCH_HOLD_MS) };
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
        if (!mine(e)) return;
        e.preventDefault();
        if (pinch) {
            if (e.touches.length < 2) return;
            const c = centroid(e.touches);
            const r = el.getBoundingClientRect();
            opts.onPinch(c.x - r.left, c.y - r.top, c.d / pinch.d, c.x - pinch.x, c.y - pinch.y);
            pinch = c;
            return;
        }
        if (pending) press();
        const t = e.touches[0];
        last = { x: t.clientX, y: t.clientY };
        if (down) move(t.clientX, t.clientY);
    }, { passive: false });

    const end = (e) => {
        if (!mine(e)) return;
        e.preventDefault();
        if (pinch) {
            // the pinch is over once every finger is up; a leftover finger does nothing
            if (e.touches.length === 0) pinch = null;
            return;
        }
        if (pending) press();   // a quick tap still counts
        const t = e.changedTouches[0];
        if (t) release(t.clientX, t.clientY);
        else if (last) release(last.x, last.y);
    };
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
}

// Pinch snaps to the 0.25 steps the zoom buttons use, so a finger never
// leaves the level at a zoom the buttons could not reach.
let levelPinchScale = 1;

function onLevelPinch(midX, midY, scale, dx, dy) {
    cameraX -= dx / zoom;
    cameraY -= dy / zoom;

    levelPinchScale *= scale;
    const target = Math.max(0.25, Math.min(5, Math.round(zoom * levelPinchScale * 4) / 4));
    if (target !== zoom) {
        const worldX = midX / zoom + cameraX;
        const worldY = midY / zoom + cameraY;
        levelPinchScale = levelPinchScale * zoom / target;
        zoom = target;
        cameraX = worldX - midX / zoom;
        cameraY = worldY - midY / zoom;
        document.getElementById('zoom-display').textContent = Math.round(zoom * 100) + '%';
    }

    clampCamera();
    draw();
}

function setupTouchBridge() {
    const level = document.getElementById('level-canvas');
    if (level) {
        level.addEventListener('touchstart', (e) => { if (e.touches.length === 2) levelPinchScale = 1; }, { passive: true });
        attachTouchBridge(level, { onPinch: onLevelPinch });
    }
    // The tileset canvas is left alone: a tap already picks a tile, and a
    // finger there has to keep scrolling the tileset.
    ['pixel-editor-canvas', 'scrollbar-h-thumb', 'scrollbar-v-thumb', 'scrollbar-horizontal', 'scrollbar-vertical',
     'left-panel-handle', 'right-panel-handle', 'tiles-resize-handle', 'code-panel-handle']
        .forEach(id => attachTouchBridge(document.getElementById(id)));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTouchBridge);
} else {
    setupTouchBridge();
}
