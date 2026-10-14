// What GameBuilder's menu search covers. The engine (menu-search.js) is shared
// with other apps and is not edited here.
//
// A new <label> inside one of these dialogs is found on its own. A new dialog
// has to go in `dialogs` or in `skip`, and scripts/menu-search-check.cjs in
// the platform repo fails until it does.
MenuSearch.init({
    mount: '.menubar-right',
    placeholder: 'Search menus and settings',
    emptyHint: 'Try one word, like "music" or "jump".',

    menus: { items: '#top-menu-bar .dropdown-item', menu: '.dropdown-menu', toggle: '.dropdown-toggle' },

    buttons: [
        { items: '.menubar-tools .tool-btn', path: 'Tools' },
        { items: '#game-objects-section .object-category', label: '.obj-label', path: 'Objects' }
    ],

    dialogs: [
        {
            id: 'game-properties-modal', fields: true,
            open: function () { showGamePropertiesModal(); },
            close: function () { closeGamePropertiesModal(); },
            showTab: function (k) { showGameSettingsSection(k); },
            tabs: { nav: '.game-settings-nav-item', section: '.game-settings-section', sectionPrefix: 'game-settings-section-' }
        },
        {
            id: 'player-properties-modal', fields: true,
            open: function () { showPlayerPropertiesModal(); },
            close: function () { closePlayerPropertiesModal(); },
            showTab: function (k) { showPlayerSection(k); },
            tabs: { nav: '.player-props-nav-item', section: '.player-section', sectionPrefix: 'player-section-' }
        },
        {
            // Opens on the level being edited. Its fields only stick on Save, and
            // closing it is Cancel, so a result in another dialog waits.
            id: 'level-settings-modal', fields: true, title: 'Level Settings',
            holdOpen: 'Save or cancel Level Settings first.',
            open: function () { showLevelSettingsModal(currentLevelIndex); },
            close: function () { closeLevelSettingsModal(); },
            showTab: function (k) { showLevelSettingsSection(k); },
            tabs: { nav: '.level-settings-nav-item', section: '.level-settings-section', sectionPrefix: 'level-settings-section-' }
        }
    ],

    // Dialogs on purpose left out of the index, each with the reason.
    skip: {
        'export-modal': 'File > Export opens it',
        'publish-success-modal': 'only after publishing',
        'help-modal': 'help topics are indexed one by one below',
        'learn-modal': 'opened from the level data panel',
        'cheat-editor-modal': 'opened from Game Settings > Cheats',
        'playtest-modal': 'Game > Play Test opens it',
        'data-expand-modal': 'opened from the level data panel',
        'object-placement-modal': 'the Objects buttons open it',
        'level-manager-modal': 'Game > Manage Levels opens it',
        'sfx-studio-modal': 'opened from a sound field',
        'pfx-studio-modal': 'opened from a particle field',
        'enemy-templates-modal': 'reached from the Objects buttons',
        'collectible-templates-modal': 'reached from the Objects buttons',
        'hazard-templates-modal': 'reached from the Objects buttons',
        'powerup-templates-modal': 'reached from the Objects buttons',
        'spring-templates-modal': 'reached from the Objects buttons',
        'crate-templates-modal': 'reached from the Objects buttons',
        'ladder-templates-modal': 'reached from the Objects buttons',
        'conveyor-templates-modal': 'reached from the Objects buttons',
        'terrain-zone-templates-modal': 'reached from the Objects buttons',
        'moving-platform-templates-modal': 'reached from the Objects buttons',
        'npc-templates-modal': 'reached from the Objects buttons',
        'door-templates-modal': 'reached from the Objects buttons',
        'mystery-block-templates-modal': 'reached from the Objects buttons'
    },

    extras: function () {
        if (typeof helpContent === 'undefined') return [];
        return Object.keys(helpContent).map(function (key) {
            return {
                kind: 'help',
                label: helpContent[key].title.replace(/[!.]+$/, ''),
                body: helpContent[key].content,
                run: function () { showHelp(key); }
            };
        });
    },

    // The words students type, pointed at the field or tab they mean. `find` is
    // an element id: a control, or a tab's section.
    words: [
        { say: 'music song songs bgm soundtrack', find: ['level-settings-bgm', 'setting-music-volume'] },
        { say: 'sound sounds sfx noise', find: ['level-settings-section-audio', 'player-section-audio', 'setting-sfx-volume'] },
        { say: 'loud quiet volume mute', find: ['setting-master-volume'] },
        { say: 'jump higher jumping height', find: ['setting-jump'] },
        { say: 'fast faster slow slower speed run walk', find: ['setting-speed'] },
        { say: 'gravity float floaty heavy fall falling', find: ['setting-gravity'] },
        { say: 'slippery slide ice', find: ['setting-friction'] },
        { say: 'lives life health hearts die dying', find: ['setting-lives'] },
        { say: 'win winning goal finish end beat', find: ['level-settings-goal'] },
        { say: 'timer time clock countdown', find: ['setting-run-timer-mode'] },
        { say: 'background sky backdrop parallax', find: ['level-settings-section-backgrounds', 'level-settings-bg-color'] },
        { say: 'big bigger size wider longer taller', find: ['level-settings-width'] },
        { say: 'name rename title', find: ['level-settings-name'] },
        { say: 'scroll scrolling moving screen camera', find: ['level-settings-section-autoscroll'] },
        { say: 'shoot shooting gun fireball bullets projectile attack', find: ['player-section-combat'] },
        { say: 'character sprite skin costume looks look picture', find: ['player-section-appearance', 'setting-sprite-url'] },
        { say: 'online friends multiplayer players pvp', find: ['game-settings-section-multiplayer'] },
        { say: 'cheat cheats codes', find: ['game-settings-section-cheats'] },
        { say: 'particles sparkles effects dust trail', find: ['player-section-effects', 'level-settings-section-particles'] },
        { say: 'feel coyote forgiving', find: ['setting-coyote-time'] },
        { say: 'topdown rpg platformer mode type', find: ['game-settings-section-gametype'] }
    ],

    enabled: function () {
        return !(typeof isPlayTestModalOpen === 'function' && isPlayTestModalOpen());
    }
});
