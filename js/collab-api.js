/**
 * collab-api.js  ->  window.GameCollab
 *
 * The collaboration surface for GameBuilder. Loaded LAST (after all app
 * modules), so it can reference the top-level state + functions declared in
 * state.js / levelEditor.js / renderer.js / saveLoad.js via the shared global
 * lexical scope. The real-time co-editing adapter binds to THIS clean contract
 * instead of reaching into ~100 internal variables.
 *
 * P0 reachability spike: this also lets us prove from the console that we can
 * read state, apply edits with a redraw, read the active view, and catch the
 * local-edit signal — before building the adapter.
 *
 * See makerspace-v2/40-gamebuilder-collab-plan.md.
 */
(function () {
    'use strict';

    function safe(fn, d) { try { return fn(); } catch (e) { return d; } }

    var API = {
        // ---- readiness ----
        ready: function () {
            return safe(function () {
                return typeof serializeProject === 'function' && typeof levels !== 'undefined' && Array.isArray(levels) && typeof draw === 'function';
            }, false);
        },

        // ---- read state ----
        serialize: function () { return safe(function () { return serializeProject(); }, null); },
        levels: function () { return safe(function () { return levels; }, []); },
        currentLevel: function () {
            return safe(function () { return (typeof getCurrentLevel === 'function') ? getCurrentLevel() : levels[currentLevelIndex]; }, null);
        },

        // What this user is currently focused on (drives presence + cursor gating).
        // Each field is read behind a typeof guard so a missing/renamed symbol
        // never throws (no eval -> CSP-safe).
        activeView: function () {
            var v = {};
            v.levelId = safe(function () { var lv = (typeof getCurrentLevel === 'function') ? getCurrentLevel() : levels[currentLevelIndex]; return lv ? lv.id : null; }, null);
            v.levelIndex = (typeof currentLevelIndex !== 'undefined') ? currentLevelIndex : 0;
            v.tool = (typeof currentTool !== 'undefined') ? currentTool : null;
            v.layer = (typeof currentTileLayer !== 'undefined') ? currentTileLayer : null;
            v.objectType = (typeof selectedObjectType !== 'undefined') ? selectedObjectType : null;
            v.templateId = (typeof selectedTemplateId !== 'undefined') ? selectedTemplateId : null;
            v.spriteKey = (typeof pixelEditorEditingKey !== 'undefined') ? pixelEditorEditingKey : null;
            v.editingTemplateType = (typeof editingTemplateType !== 'undefined') ? editingTemplateType : null;
            v.editingTemplateId = (typeof editingTemplateId !== 'undefined') ? editingTemplateId : null;
            return v;
        },

        // ---- apply (the adapter uses these to apply REMOTE ops; mutate + redraw) ----
        setTile: function (x, y, key, layer) {
            return safe(function () { setTileAt(x, y, key, layer || 'terrain'); if (typeof draw === 'function') draw(); return true; }, false);
        },
        addObject: function (x, y, type, templateId) {
            return safe(function () { addGameObject(x, y, type, templateId); return true; }, false);
        },
        removeObject: function (x, y) {
            return safe(function () { removeGameObjectAt(x, y); return true; }, false);
        },
        redraw: function () { return safe(function () { if (typeof draw === 'function') draw(); return true; }, false); },

        // ---- local-edit signal: invoke cb() after any edit (wrap markDirty) ----
        // Returns true if the wrap took. If it can't, the adapter falls back to
        // polling serialize()/diff (proven in the grid collab apps).
        onEdit: function (cb) {
            return safe(function () {
                if (typeof markDirty !== 'function') return false;
                if (API._wrapped) return true;
                API._origMarkDirty = markDirty;
                markDirty = function () { API._origMarkDirty.apply(this, arguments); try { cb(); } catch (e) {} };
                API._wrapped = (typeof markDirty === 'function');
                return API._wrapped;
            }, false);
        },

        // ── Phase 1: per-cell level co-editing ──────────────────────────────
        currentLevelId: function () { return safe(function () { var lv = (typeof getCurrentLevel === 'function') ? getCurrentLevel() : levels[currentLevelIndex]; return lv ? lv.id : null; }, null); },
        isCurrentLevel: function (id) { return API.currentLevelId() === id; },

        // Capture PRECISE local cell edits by wrapping the atomic mutators
        // (brush + flood-fill both funnel through setTileAt). cb receives:
        //   {layer:'terrain'|'decor', x, y, key}           for a tile
        //   {obj:true, x, y, type, templateId}             for an object placed
        //   {obj:true, x, y, remove:true}                  for an object removed
        // The adapter stamps the current levelId and guards against echo.
        onCellChange: function (cb) {
            return safe(function () {
                if (API._cellWrapped) return true;
                if (typeof setTileAt === 'function') {
                    API._origSetTileAt = setTileAt;
                    setTileAt = function (x, y, key, layer) {
                        var r = API._origSetTileAt.apply(this, arguments);
                        try { cb({ layer: (layer || (typeof currentTileLayer !== 'undefined' ? currentTileLayer : 'terrain')), x: x, y: y, key: key }); } catch (e) {}
                        return r;
                    };
                }
                if (typeof addGameObject === 'function') {
                    API._origAddObj = addGameObject;
                    addGameObject = function (x, y, type, templateId) {
                        var r = API._origAddObj.apply(this, arguments);
                        try { cb({ obj: true, x: x, y: y, type: type, templateId: (templateId !== undefined ? templateId : null) }); } catch (e) {}
                        return r;
                    };
                }
                if (typeof removeGameObjectAt === 'function') {
                    API._origRemObj = removeGameObjectAt;
                    removeGameObjectAt = function (x, y) {
                        var r = API._origRemObj.apply(this, arguments);
                        try { cb({ obj: true, x: x, y: y, remove: true }); } catch (e) {}
                        return r;
                    };
                }
                API._cellWrapped = true;
                return true;
            }, false);
        },

        // Apply a remote TILE op to a specific level. If it's the level the user
        // is currently viewing -> use the live editor path (mutate + redraw); if
        // it's a different level -> patch that level's stored row strings (tile
        // keys are single chars), so it's correct when they switch to it.
        applyCell: function (levelId, layer, x, y, key) {
            return safe(function () {
                if (typeof key !== 'string' || key.length !== 1) return false;
                if (API.isCurrentLevel(levelId)) { setTileAt(x, y, key, layer || 'terrain'); if (typeof draw === 'function') draw(); return true; }
                var lv = null; for (var i = 0; i < levels.length; i++) { if (levels[i] && levels[i].id === levelId) { lv = levels[i]; break; } }
                if (!lv) return false;
                var rows = (layer === 'decor') ? lv.decorTiles : lv.tiles;
                if (!rows || y < 0 || y >= rows.length) return false;
                var row = rows[y]; if (x < 0 || x >= row.length) return false;
                rows[y] = row.substring(0, x) + key + row.substring(x + 1);
                return true;
            }, false);
        },
        applyObject: function (levelId, x, y, type, templateId) {
            return safe(function () {
                if (API.isCurrentLevel(levelId)) { addGameObject(x, y, type, templateId); return true; }
                var lv = null; for (var i = 0; i < levels.length; i++) { if (levels[i] && levels[i].id === levelId) { lv = levels[i]; break; } }
                if (!lv) return false; if (!Array.isArray(lv.gameObjects)) lv.gameObjects = [];
                for (var j = lv.gameObjects.length - 1; j >= 0; j--) { if (lv.gameObjects[j].x === x && lv.gameObjects[j].y === y) lv.gameObjects.splice(j, 1); }
                lv.gameObjects.push({ x: x, y: y, type: type, templateId: (templateId !== undefined ? templateId : null) });
                return true;
            }, false);
        },
        applyRemoveObject: function (levelId, x, y) {
            return safe(function () {
                if (API.isCurrentLevel(levelId)) { removeGameObjectAt(x, y); return true; }
                var lv = null; for (var i = 0; i < levels.length; i++) { if (levels[i] && levels[i].id === levelId) { lv = levels[i]; break; } }
                if (!lv || !Array.isArray(lv.gameObjects)) return false;
                for (var j = lv.gameObjects.length - 1; j >= 0; j--) { if (lv.gameObjects[j].x === x && lv.gameObjects[j].y === y) lv.gameObjects.splice(j, 1); }
                return true;
            }, false);
        },

        // Host catch-up: flush the project to the DB so a late joiner's
        // platform:load base is current, then they only need live deltas.
        requestSave: function () { return safe(function () { window.dispatchEvent(new Event('platform:requestSave')); return true; }, false); },

        // The level-editor canvas element (cursor anchor for presence).
        canvas: function () { return document.getElementById('level-canvas'); },

        // ── Coordinate mapping for camera-correct cursors ───────────────────
        // The level canvas is a scrolling/zooming viewport over a big grid, so
        // cursors must travel as GRID CELLS (camera-independent), not canvas
        // fractions. Sender: mouseToTile(); receiver: tileToFraction() using
        // its own cameraX/Y + zoom. Tile->screen is (tile*tileSize - camera)*zoom.
        mouseToTile: function (clientX, clientY) {
            return safe(function () {
                var cv = API.canvas(); if (!cv) return null;
                var r = cv.getBoundingClientRect();
                var z = (typeof zoom !== 'undefined') ? zoom : 1;
                var ts = (typeof tileSize !== 'undefined') ? tileSize : 16;
                var cx = (clientX - r.left) * (cv.width / Math.max(1, r.width));
                var cy = (clientY - r.top) * (cv.height / Math.max(1, r.height));
                return { tx: Math.floor((cx / z + cameraX) / ts), ty: Math.floor((cy / z + cameraY) / ts) };
            }, null);
        },
        // Where tile (tx,ty)'s center currently sits, as a fraction of the
        // canvas (so PlatformPresence can place the cursor for THIS viewer).
        tileToFraction: function (tx, ty) {
            return safe(function () {
                var cv = API.canvas(); if (!cv) return null;
                var z = (typeof zoom !== 'undefined') ? zoom : 1;
                var ts = (typeof tileSize !== 'undefined') ? tileSize : 16;
                var half = ts * z / 2;
                var sx = (tx * ts - cameraX) * z + half;
                var sy = (ty * ts - cameraY) * z + half;
                return { x: sx / Math.max(1, cv.width), y: sy / Math.max(1, cv.height) };
            }, null);
        },

        // ── Phase 2: templates + settings + sfx/pfx ─────────────────────────
        // Map of placed-object template type -> its array. Each reference is
        // guarded so a missing/renamed array is skipped (no eval -> CSP-safe).
        templateArrays: function () {
            var m = {};
            safe(function () { m.enemy = enemyTemplates; });
            safe(function () { m.collectible = collectibleTemplates; });
            safe(function () { m.hazard = hazardTemplates; });
            safe(function () { m.powerup = powerupTemplates; });
            safe(function () { m.spring = springTemplates; });
            safe(function () { m.movingPlatform = movingPlatformTemplates; });
            safe(function () { m.npc = npcTemplates; });
            safe(function () { m.door = doorTemplates; });
            safe(function () { m.mysteryBlock = mysteryBlockTemplates; });
            safe(function () { m.terrainZone = terrainZoneTemplates; });
            safe(function () { m.cheatCode = cheatCodeTemplates; });
            var out = {}; Object.keys(m).forEach(function (k) { if (Array.isArray(m[k])) out[k] = m[k]; });
            return out;
        },
        // Re-render all template list UIs + redraw (placed objects read live template data).
        refreshTemplates: function () {
            ['renderEnemyTemplatesList', 'renderCollectibleTemplatesList', 'renderHazardTemplatesList',
             'renderPowerupTemplatesList', 'renderSpringTemplatesList', 'renderMovingPlatformTemplatesList',
             'renderNPCTemplatesList', 'renderDoorTemplatesList', 'renderMysteryBlockTemplatesList',
             'renderTerrainZoneTemplatesList', 'renderCheatCodeTemplatesList'].forEach(function (fn) {
                safe(function () { if (typeof window[fn] === 'function') window[fn](); });
            });
            safe(function () { if (typeof draw === 'function') draw(); });
        },
        // Apply a remote template upsert/delete by id (data===null => delete).
        applyTemplate: function (type, id, data) {
            return safe(function () {
                var arr = API.templateArrays()[type]; if (!arr) return false;
                var idx = -1; for (var i = 0; i < arr.length; i++) { if (arr[i] && arr[i].id === id) { idx = i; break; } }
                if (data == null) { if (idx >= 0) arr.splice(idx, 1); }
                else { if (idx >= 0) arr[idx] = data; else arr.push(data); }
                API.refreshTemplates();
                return true;
            }, false);
        },

        // Game settings (the big object). settings() for diffing; applySettings()
        // merges incoming scalar fields (preserving sfx/pfx stores) + pushes to UI.
        settings: function () { return safe(function () { return gameSettings; }, null); },
        applySettings: function (data) {
            return safe(function () {
                if (!data || typeof gameSettings !== 'object') return false;
                var sfx = gameSettings.sfxData, pfx = gameSettings.pfxData;
                Object.keys(data).forEach(function (k) { if (k !== 'sfxData' && k !== 'pfxData') gameSettings[k] = data[k]; });
                gameSettings.sfxData = sfx; gameSettings.pfxData = pfx;
                if (typeof updateGameSettingsUI === 'function') updateGameSettingsUI();
                if (typeof draw === 'function') draw();
                return true;
            }, false);
        },
        applySfx: function (id, data) { return safe(function () { if (!gameSettings.sfxData) gameSettings.sfxData = {}; if (data == null) delete gameSettings.sfxData[id]; else gameSettings.sfxData[id] = data; return true; }, false); },
        applyPfx: function (id, data) { return safe(function () { if (!gameSettings.pfxData) gameSettings.pfxData = {}; if (data == null) delete gameSettings.pfxData[id]; else gameSettings.pfxData[id] = data; return true; }, false); }
    };

    window.GameCollab = API;
})();
