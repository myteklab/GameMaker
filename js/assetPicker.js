// ============================================
// ASSET LIBRARY PICKER INTEGRATION
// ============================================
// Integrates the asset library picker into GameMaker
//
// Dependencies:
// - External: AssetLibraryPicker class (from asset-library-picker.js)
// - Global vars: pixelEditorData, pixelEditorTileSize, tileSize
// - Global funcs: openPixelEditor(), renderPixelEditor(), savePixelEditorHistory(), showToast()

(function() {
    // Initialize the asset picker
    let assetPicker = null;
    let currentTargetInput = null;

    // Initialize picker on DOM ready
    function initAssetPicker() {
        if (typeof AssetLibraryPicker === 'undefined') {
            console.warn('AssetLibraryPicker not loaded');
            return;
        }

        assetPicker = new AssetLibraryPicker({
            // Allow all asset categories GameMaker can use
            categories: ['sprites', 'tilesets', 'backgrounds', 'sounds', 'music'],
            onSelect: function(asset) {
                if (currentTargetInput) {
                    const inputId = currentTargetInput.id;

                    // Special case: tileset input - auto-load the tileset
                    if (inputId === 'tileset-url-input') {
                        currentTargetInput.value = asset.file_url;
                        currentTargetInput = null;

                        // Auto-load the tileset directly
                        if (typeof loadTilesetFromURL === 'function') {
                            loadTilesetFromURL(asset.file_url);
                        }
                        return;
                    }

                    // Set the URL
                    currentTargetInput.value = asset.file_url;

                    // Trigger change event for any listeners (e.g., sprite preview)
                    currentTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
                    currentTargetInput.dispatchEvent(new Event('input', { bubbles: true }));

                    // If the asset has spritesheet metadata, try to auto-fill cols/rows
                    if (asset.metadata) {
                        try {
                            const meta = typeof asset.metadata === 'string'
                                ? JSON.parse(asset.metadata)
                                : asset.metadata;

                            // Find related cols/rows inputs
                            const baseId = inputId.replace('-sprite', '');

                            if (meta.columns) {
                                const colsInput = document.getElementById(baseId + '-cols');
                                if (colsInput) colsInput.value = meta.columns;
                            }
                            if (meta.rows) {
                                const rowsInput = document.getElementById(baseId + '-rows');
                                if (rowsInput) rowsInput.value = meta.rows;
                            }
                        } catch (e) {
                            console.log('Could not parse asset metadata');
                        }
                    }

                    currentTargetInput = null;
                }
            },
            onError: function(error) {
                console.error('Asset picker error:', error);
            }
        });
    }

    // Global function to open the asset picker
    window.openAssetPicker = function(inputId, category) {
        if (!assetPicker) {
            initAssetPicker();
        }

        if (!assetPicker) {
            alert('Asset Library is not available. Please try again later.');
            return;
        }

        currentTargetInput = document.getElementById(inputId);
        if (!currentTargetInput) {
            console.error('Input not found:', inputId);
            return;
        }

        // Open picker with optional category filter
        assetPicker.open({
            category: category || 'sprites'
        });
    };

    // Global function to open asset picker with a callback (for iframe contexts)
    // Used by generated games to pick sprites for multiplayer custom player sprites
    window.openAssetPickerWithCallback = function(callback, category) {
        if (!assetPicker) {
            initAssetPicker();
        }

        if (!assetPicker) {
            alert('Asset Library is not available. Please try again later.');
            return;
        }

        // Create a temporary picker with custom callback
        const tempPicker = new AssetLibraryPicker({
            categories: [category || 'sprites'],
            onSelect: function(asset) {
                if (callback && typeof callback === 'function') {
                    callback(asset.file_url, asset.metadata);
                }
            },
            onError: function(error) {
                console.error('Asset picker error:', error);
            }
        });

        tempPicker.open({
            category: category || 'sprites'
        });
    };

    // Global function to browse assets for the pixel editor
    // Opens the asset library, and when an asset is selected, loads it into the pixel editor
    window.browseAssetForPixelEditor = function() {
        if (typeof AssetLibraryPicker === 'undefined') {
            alert('Asset Library is not available. Please try again later.');
            return;
        }

        // Create a temporary picker with custom onSelect handler
        const pixelEditorPicker = new AssetLibraryPicker({
            categories: ['sprites'],
            assetTypes: ['image', 'animation'],
            onSelect: function(asset) {
                // Load the asset image and open it in the pixel editor
                loadAssetIntoPixelEditor(asset);
            },
            onError: function(error) {
                console.error('Asset picker error:', error);
                showToast('Error loading asset library', 'error');
            }
        });

        pixelEditorPicker.open({ category: 'sprites' });
    };

    // Track the current input being edited for SFX modal
    let sfxTargetInputId = null;
    let sfxProjectId = null;

    // Global function to create and link a SoundEffectStudio project
    // Creates a new project, links it to the input field, then opens in modal for editing
    window.openSoundEffectStudio = function(inputId, soundName) {
        const inputEl = document.getElementById(inputId);
        if (!inputEl) {
            console.error('Input element not found:', inputId);
            return;
        }

        // Check if there's already a linked sfx project
        const currentValue = inputEl.value;
        if (currentValue && currentValue.indexOf('sfx:') === 0) {
            // Already linked - open for editing instead
            editSoundEffectStudio(inputId);
            return;
        }

        // Determine a nice name for the sound based on the input ID
        if (!soundName) {
            soundName = inputId
                .replace('setting-sound-', '')
                .replace('level-settings-', '')
                .replace(/-template-/g, ' ')
                .replace(/-sound/g, '')
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ') + ' Sound';
        }

        // Show loading state
        if (typeof showToast === 'function') {
            showToast('Creating sound project...', 'info', 2000);
        }

        // Create a new SoundEffectStudio project
        const formData = new FormData();
        formData.append('name', soundName);

        // Open SoundEffectStudio in modal with a new session
        sfxTargetInputId = inputId;
        sfxProjectId = 'new_' + Date.now();
        openSfxStudioModal(sfxProjectId);

        if (typeof showToast === 'function') {
            showToast('Design your sound, then click "Save & Use Sound".', 'success', 4000);
        }
    };

    // Global function to edit an existing linked SoundEffectStudio project
    window.editSoundEffectStudio = function(inputId) {
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        const value = inputEl.value;
        if (!value || value.indexOf('sfx:') !== 0) {
            // Not a linked project - create new instead
            openSoundEffectStudio(inputId);
            return;
        }

        // Store the target input and project ID for when modal closes
        sfxTargetInputId = inputId;
        sfxProjectId = value.substring(4);

        // Open in modal
        openSfxStudioModal(sfxProjectId);

        if (typeof showToast === 'function') {
            showToast('Editing sound project. Click "Save & Use Sound" when done.', 'info', 3000);
        }
    };

    // Open the SoundEffectStudio modal with the given project
    function openSfxStudioModal(projectId) {
        const modal = document.getElementById('sfx-studio-modal');
        const iframe = document.getElementById('sfx-studio-iframe');

        if (!modal || !iframe) {
            console.error('SFX Studio modal elements not found');
            return;
        }

        // Load SoundEffectStudio in the iframe
        var sfxBaseUrl = window.GM_SFX_STUDIO_URL || '/apps/soundeffectstudio/index.html';
        iframe.src = sfxBaseUrl + '?id=' + projectId + '&source=gamemaker&embedded=1';
        modal.style.display = 'flex';
    }

    // Track pending save operation
    let sfxSaveTimeout = null;
    let sfxSaveMessageHandler = null;

    // Save the SFX project and close the modal
    window.saveSfxAndClose = function() {
        const iframe = document.getElementById('sfx-studio-iframe');

        if (!iframe || !iframe.contentWindow) {
            if (typeof showToast === 'function') {
                showToast('Error: Could not save sound', 'error');
            }
            return;
        }

        // Show saving indicator
        if (typeof showToast === 'function') {
            showToast('Saving sound...', 'info', 5000);
        }

        // Function to finalize after save
        const finalizeSave = function() {
            // Clean up listener and timeout
            if (sfxSaveMessageHandler) {
                window.removeEventListener('message', sfxSaveMessageHandler);
                sfxSaveMessageHandler = null;
            }
            if (sfxSaveTimeout) {
                clearTimeout(sfxSaveTimeout);
                sfxSaveTimeout = null;
            }

            // Update the input field with the sfx reference
            if (sfxTargetInputId && sfxProjectId) {
                const inputEl = document.getElementById(sfxTargetInputId);
                if (inputEl) {
                    inputEl.value = 'sfx:' + sfxProjectId;
                    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                    updateSoundButtonStates(sfxTargetInputId);
                }
            }

            closeSfxStudioModal();

            if (typeof showToast === 'function') {
                showToast('Sound saved and linked!', 'success', 3000);
            }
        };

        // Listen for saveComplete message from SoundEffectStudio
        sfxSaveMessageHandler = function(event) {
            if (event.data && event.data.action === 'saveComplete') {
                console.log('SFX save confirmed, projectId:', event.data.projectId);
                // Update projectId if provided (in case it was created during save)
                if (event.data.projectId) {
                    sfxProjectId = event.data.projectId;
                }
                finalizeSave();
            }
        };
        window.addEventListener('message', sfxSaveMessageHandler);

        // Tell SoundEffectStudio to save
        iframe.contentWindow.postMessage({ action: 'save' }, window.location.origin);

        // Fallback timeout in case saveComplete message isn't received
        sfxSaveTimeout = setTimeout(function() {
            console.warn('SFX save timeout - closing modal without confirmation');
            finalizeSave();
        }, 3000); // 3 second timeout as fallback
    };

    // Close the SFX modal without saving
    window.closeSfxStudioModal = function() {
        const modal = document.getElementById('sfx-studio-modal');
        const iframe = document.getElementById('sfx-studio-iframe');

        if (modal) {
            modal.style.display = 'none';
        }
        if (iframe) {
            iframe.src = 'about:blank';
        }

        // Clear tracking variables
        sfxTargetInputId = null;
        sfxProjectId = null;
    };

    // Global function to unlink a SoundEffectStudio project
    window.unlinkSoundEffectStudio = function(inputId) {
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        if (confirm('Unlink this sound? The sound project will still exist but won\'t be used here.')) {
            inputEl.value = '';
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            updateSoundButtonStates(inputId);

            if (typeof showToast === 'function') {
                showToast('Sound unlinked.', 'info');
            }
        }
    };

    // Update button visibility based on whether a sound is linked
    window.updateSoundButtonStates = function(inputId) {
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        const value = inputEl.value.trim();
        const isLinked = value && value.indexOf('sfx:') === 0;
        const hasAnySound = value.length > 0; // Either sfx: or URL
        const container = inputEl.closest('.input-with-browse') || inputEl.parentElement;

        // Find buttons in this container
        const createBtn = container.querySelector('.sfx-create-btn');
        const editBtn = container.querySelector('.sfx-edit-btn');
        const unlinkBtn = container.querySelector('.sfx-unlink-btn');
        const previewBtn = container.querySelector('.sfx-preview-btn');

        if (createBtn) createBtn.style.display = isLinked ? 'none' : '';
        if (editBtn) editBtn.style.display = isLinked ? '' : 'none';
        if (unlinkBtn) unlinkBtn.style.display = isLinked ? '' : 'none';
        // Show preview button if there's any sound configured (sfx: or URL)
        if (previewBtn) previewBtn.style.display = hasAnySound ? '' : 'none';
    };

    // ============================================
    // PARTICLE FX INTEGRATION
    // ============================================
    // Track the current input being edited for PFX modal
    let pfxTargetInputId = null;
    let pfxProjectId = null;

    // Global function to create and link a ParticleFX project
    // Creates a new project, links it to the input field, then opens in modal for editing
    window.openParticleFXStudio = function(inputId, effectName, preset) {
        const inputEl = document.getElementById(inputId);
        if (!inputEl) {
            console.error('Input element not found:', inputId);
            return;
        }

        // Check if there's already a linked pfx project
        const currentValue = inputEl.value;
        if (currentValue && currentValue.indexOf('pfx:') === 0) {
            // Already linked - open for editing instead
            editParticleFXStudio(inputId);
            return;
        }

        // Determine a nice name for the effect based on the input ID
        if (!effectName) {
            effectName = inputId
                .replace('setting-particle-', '')
                .replace('level-settings-', '')
                .replace(/-template-/g, ' ')
                .replace(/-effect/g, '')
                .replace(/-particle/g, '')
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ') + ' Effect';
        }

        // Show loading state
        if (typeof showToast === 'function') {
            showToast('Creating particle effect...', 'info', 2000);
        }

        // Create a new ParticleFX project
        const formData = new FormData();
        formData.append('name', effectName);
        if (preset) {
            formData.append('preset', preset);
        }

        // Open ParticleFX in modal with a new session
        pfxTargetInputId = inputId;
        pfxProjectId = 'new_' + Date.now();
        openPfxStudioModal(pfxProjectId);

        if (typeof showToast === 'function') {
            showToast('Design your particles, then click "Save & Use Effect".', 'success', 4000);
        }
    };

    // Global function to edit an existing linked ParticleFX project
    window.editParticleFXStudio = function(inputId) {
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        const value = inputEl.value;
        if (!value || value.indexOf('pfx:') !== 0) {
            // Not a linked project - create new instead
            openParticleFXStudio(inputId);
            return;
        }

        // Store the target input and project ID for when modal closes
        pfxTargetInputId = inputId;
        pfxProjectId = value.substring(4);

        // Open in modal
        openPfxStudioModal(pfxProjectId);

        if (typeof showToast === 'function') {
            showToast('Editing particle effect. Click "Save & Use Effect" when done.', 'info', 3000);
        }
    };

    // Open the ParticleFX modal with the given project
    function openPfxStudioModal(projectId) {
        const modal = document.getElementById('pfx-studio-modal');
        const iframe = document.getElementById('pfx-studio-iframe');

        if (!modal || !iframe) {
            console.error('PFX Studio modal elements not found');
            return;
        }

        // Load ParticleFX in the iframe
        var pfxBaseUrl = window.GM_PFX_STUDIO_URL || '/apps/particlefx/index.html';
        iframe.src = pfxBaseUrl + '?id=' + projectId + '&source=gamemaker&embedded=1';
        modal.style.display = 'flex';
    }

    // Save the PFX project and close the modal
    window.savePfxAndClose = function() {
        const iframe = document.getElementById('pfx-studio-iframe');

        if (iframe && iframe.contentWindow) {
            // Tell ParticleFX to save
            iframe.contentWindow.postMessage({ action: 'save' }, window.location.origin);
        }

        // Give it a moment to save, then close and update
        setTimeout(function() {
            // Update the input field with the pfx reference
            if (pfxTargetInputId && pfxProjectId) {
                const inputEl = document.getElementById(pfxTargetInputId);
                if (inputEl) {
                    inputEl.value = 'pfx:' + pfxProjectId;
                    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                    updateParticleButtonStates(pfxTargetInputId);
                }
            }

            closePfxStudioModal();

            if (typeof showToast === 'function') {
                showToast('Particle effect saved and linked!', 'success', 3000);
            }
        }, 500);
    };

    // Close the PFX modal without saving
    window.closePfxStudioModal = function() {
        const modal = document.getElementById('pfx-studio-modal');
        const iframe = document.getElementById('pfx-studio-iframe');

        if (modal) {
            modal.style.display = 'none';
        }
        if (iframe) {
            iframe.src = 'about:blank';
        }

        // Clear tracking variables
        pfxTargetInputId = null;
        pfxProjectId = null;
    };

    // Global function to unlink a ParticleFX project
    window.unlinkParticleFXStudio = function(inputId) {
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        if (confirm('Unlink this particle effect? The effect will still exist but won\'t be used here.')) {
            inputEl.value = '';
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            updateParticleButtonStates(inputId);

            if (typeof showToast === 'function') {
                showToast('Particle effect unlinked.', 'info');
            }
        }
    };

    // Update button visibility based on whether a particle effect is linked
    window.updateParticleButtonStates = function(inputId) {
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        const isLinked = inputEl.value && inputEl.value.indexOf('pfx:') === 0;
        const container = inputEl.closest('.input-with-browse') || inputEl.parentElement;

        // Find buttons in this container
        const createBtn = container.querySelector('.pfx-create-btn');
        const editBtn = container.querySelector('.pfx-edit-btn');
        const unlinkBtn = container.querySelector('.pfx-unlink-btn');

        if (createBtn) createBtn.style.display = isLinked ? 'none' : '';
        if (editBtn) editBtn.style.display = isLinked ? '' : 'none';
        if (unlinkBtn) unlinkBtn.style.display = isLinked ? '' : 'none';
    };

    // Helper function to load an asset URL into the pixel editor
    function loadAssetIntoPixelEditor(asset) {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function() {
            // Open the pixel editor in "new" mode
            openPixelEditor(null);

            // Wait for the pixel editor to be ready, then load the image
            setTimeout(function() {
                // Get the pixel editor canvas size
                const editorTileSize = pixelEditorTileSize || tileSize || 32;

                // Create a temporary canvas to resize and get pixel data
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = editorTileSize;
                tempCanvas.height = editorTileSize;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.imageSmoothingEnabled = false;

                // Draw the image scaled to fit the tile size
                tempCtx.drawImage(img, 0, 0, editorTileSize, editorTileSize);

                // Get the pixel data and load it into the editor
                pixelEditorData = tempCtx.getImageData(0, 0, editorTileSize, editorTileSize);

                // Save initial state to history
                if (typeof savePixelEditorHistory === 'function') {
                    savePixelEditorHistory();
                }

                // Render the editor with the new data
                if (typeof renderPixelEditor === 'function') {
                    renderPixelEditor();
                }

                // Set the name from the asset
                const nameInput = document.getElementById('pixel-editor-name');
                if (nameInput && asset.name) {
                    nameInput.value = asset.name;
                }

                showToast('Asset loaded into editor - edit and save as custom tile!', 'success');
            }, 100);
        };

        img.onerror = function() {
            console.error('Failed to load asset image:', asset.file_url);
            showToast('Failed to load asset image', 'error');
        };

        // Start loading the image
        img.src = asset.file_url;
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAssetPicker);
    } else {
        initAssetPicker();
    }
})();
