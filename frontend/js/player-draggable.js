"use strict";

// ============================================================================
// 🎮 DRAGGABLE & RESIZABLE PLAYER
// ✅ UPDATED: Enhanced with keyboard support + A11y
// ============================================================================

const PlayerDraggable = {
    isDragging: false,
    isResizing: false,
    dragStart: { x: 0, y: 0 },
    playerStart: { x: 0, y: 0, width: 0, height: 0 },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    init() {
        const player = document.getElementById('stickyPlayer');
        const header = document.getElementById('playerHeader');
        const resizeHandle = document.getElementById('playerResizeHandle');

        if (!player || !header || !resizeHandle) {
            console.warn('⚠️ Player elements not found');
            return;
        }

        console.log('🎮 Initializing draggable & resizable player...');

        // Load saved position & size
        this.loadPlayerState(player);

        // ===== MOUSE DRAG LISTENERS =====
        header.addEventListener('mousedown', (e) => this.startDrag(e, player));
        document.addEventListener('mousemove', (e) => this.onDrag(e, player));
        document.addEventListener('mouseup', () => this.stopDrag());

        // ===== TOUCH SUPPORT FOR MOBILE =====
        header.addEventListener('touchstart', (e) => this.startDrag(e.touches[0], player));
        document.addEventListener('touchmove', (e) => this.onDrag(e.touches[0], player));
        document.addEventListener('touchend', () => this.stopDrag());

        // ===== RESIZE LISTENERS =====
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e, player));
        document.addEventListener('mousemove', (e) => this.onResize(e, player));
        document.addEventListener('mouseup', () => this.stopResize());

        // ===== TOUCH RESIZE =====
        resizeHandle.addEventListener('touchstart', (e) => this.startResize(e.touches[0], player));
        document.addEventListener('touchmove', (e) => this.onResize(e.touches[0], player));
        document.addEventListener('touchend', () => this.stopResize());

        // ===== KEYBOARD NAVIGATION FOR A11y =====
        this.setupKeyboardNavigation(player);

        // ===== CLOSE BUTTON =====
        const closeBtn = document.getElementById('playerClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.minimizePlayer(player));
            closeBtn.setAttribute('aria-label', 'Minimize player');
            closeBtn.setAttribute('title', 'Minimize player (Escape)');
        }

        // ===== HEADER CONTEXT MENU (right-click) =====
        header.addEventListener('contextmenu', (e) => this.showContextMenu(e, player));

        // ===== DOUBLE-CLICK TO RESET POSITION =====
        header.addEventListener('dblclick', () => this.resetPosition(player));

        console.log('✅ Player draggable & resizable initialized');
    },

    // ========================================================================
    // DRAG FUNCTIONALITY
    // ========================================================================
    startDrag(e, player) {
        // Nicht wenn auf Buttons geklickt
        if (e.target.closest('.player-btn') ||
            e.target.closest('.player-controls') ||
            e.target.closest('button')) {
            return;
        }

        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.playerStart = {
            x: player.offsetLeft,
            y: player.offsetTop
        };

        player.classList.add('dragging');
        document.body.style.userSelect = 'none';
    },

    onDrag(e, player) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;

        // Ensure player stays within viewport
        const newX = Math.max(0, Math.min(this.playerStart.x + deltaX, window.innerWidth - 100));
        const newY = Math.max(0, Math.min(this.playerStart.y + deltaY, window.innerHeight - 50));

        player.style.left = newX + 'px';
        player.style.top = newY + 'px';
        player.style.right = 'auto';
        player.style.bottom = 'auto';
    },

    stopDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        document.body.style.userSelect = '';
        const player = document.getElementById('stickyPlayer');
        if (player) {
            player.classList.remove('dragging');
            this.savePlayerState(player);
            console.log('💾 Player position saved');
        }
    },

    // ========================================================================
    // RESIZE FUNCTIONALITY
    // ========================================================================
    startResize(e, player) {
        e.preventDefault();
        this.isResizing = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.playerStart = {
            width: player.offsetWidth,
            height: player.offsetHeight
        };

        player.classList.add('resizing');
        document.body.style.userSelect = 'none';
    },

    onResize(e, player) {
        if (!this.isResizing) return;

        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;

        const newWidth = Math.max(280, this.playerStart.width + deltaX);
        const newHeight = Math.max(200, this.playerStart.height + deltaY);

        player.style.width = newWidth + 'px';
        player.style.height = newHeight + 'px';
    },

    stopResize() {
        if (!this.isResizing) return;
        this.isResizing = false;
        document.body.style.userSelect = '';
        const player = document.getElementById('stickyPlayer');
        if (player) {
            player.classList.remove('resizing');
            this.savePlayerState(player);
            console.log('💾 Player size saved');
        }
    },

    // ========================================================================
    // KEYBOARD NAVIGATION FOR ACCESSIBILITY
    // ========================================================================
    setupKeyboardNavigation(player) {
        document.addEventListener('keydown', (e) => {
            // Only if player is visible
            if (player.style.display === 'none') return;

            const step = 10; // pixels per key press

            switch (e.key) {
                // Move player with Arrow Keys + Alt
                case 'ArrowUp':
                    if (e.altKey) {
                        e.preventDefault();
                        player.style.top = (player.offsetTop - step) + 'px';
                        this.savePlayerState(player);
                    }
                    break;
                case 'ArrowDown':
                    if (e.altKey) {
                        e.preventDefault();
                        player.style.top = (player.offsetTop + step) + 'px';
                        this.savePlayerState(player);
                    }
                    break;
                case 'ArrowLeft':
                    if (e.altKey) {
                        e.preventDefault();
                        player.style.left = (player.offsetLeft - step) + 'px';
                        this.savePlayerState(player);
                    }
                    break;
                case 'ArrowRight':
                    if (e.altKey) {
                        e.preventDefault();
                        player.style.left = (player.offsetLeft + step) + 'px';
                        this.savePlayerState(player);
                    }
                    break;

                // Minimize with Escape
                case 'Escape':
                    if (document.activeElement === player || player.contains(document.activeElement)) {
                        e.preventDefault();
                        this.minimizePlayer(player);
                    }
                    break;

                // Reset position with 'R'
                case 'r':
                case 'R':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.resetPosition(player);
                    }
                    break;
            }
        });

        console.log('✅ Keyboard navigation enabled (Alt+Arrow to move, Escape to minimize)');
    },

    // ========================================================================
    // CONTEXT MENU (RIGHT-CLICK)
    // ========================================================================
    showContextMenu(e, player) {
        e.preventDefault();

        // Create context menu
        let menu = document.getElementById('playerContextMenu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'playerContextMenu';
            menu.style.cssText = `
                position: fixed;
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: 8px;
                padding: 8px 0;
                z-index: 10001;
                min-width: 200px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            `;
            document.body.appendChild(menu);
        }

        menu.innerHTML = `
            <button style="display: block; width: 100%; text-align: left; padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: var(--color-text);" data-action="reset">⟲ Reset Position</button>
            <button style="display: block; width: 100%; text-align: left; padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: var(--color-text);" data-action="minimize">⊞ Minimize</button>
            <hr style="margin: 4px 0; border: none; border-top: 1px solid var(--color-border);">
            <button style="display: block; width: 100%; text-align: left; padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: var(--color-text);" data-action="close">✕ Close Menu</button>
        `;

        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.style.display = 'block';

        // Add button listeners
        menu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                switch (action) {
                    case 'reset':
                        this.resetPosition(player);
                        break;
                    case 'minimize':
                        this.minimizePlayer(player);
                        break;
                    case 'close':
                        menu.style.display = 'none';
                        break;
                }
            });
        });

        // Close menu on outside click
        document.addEventListener('click', () => {
            if (menu) menu.style.display = 'none';
        }, { once: true });
    },

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    minimizePlayer(player) {
        player.style.display = 'none';
        localStorage.setItem('playerMinimized', 'true');
        console.log('📦 Player minimized');

        // Show restore button (in your UI)
        const restoreBtn = document.getElementById('playerRestore');
        if (restoreBtn) {
            restoreBtn.style.display = 'block';
        }
    },

    restorePlayer(player) {
        player.style.display = 'flex';
        localStorage.removeItem('playerMinimized');
        console.log('📦 Player restored');

        const restoreBtn = document.getElementById('playerRestore');
        if (restoreBtn) {
            restoreBtn.style.display = 'none';
        }
    },

    resetPosition(player) {
        // Reset to bottom-right
        player.style.left = 'auto';
        player.style.right = '20px';
        player.style.top = 'auto';
        player.style.bottom = '20px';
        player.style.width = '380px';
        player.style.height = 'auto';

        this.savePlayerState(player);
        console.log('🔄 Player position reset to default');
    },

    // ========================================================================
    // LOCAL STORAGE
    // ========================================================================
    savePlayerState(player) {
        const state = {
            left: player.style.left,
            top: player.style.top,
            right: player.style.right,
            bottom: player.style.bottom,
            width: player.style.width,
            height: player.style.height,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('playerState', JSON.stringify(state));
    },

    loadPlayerState(player) {
        try {
            const saved = localStorage.getItem('playerState');
            if (saved) {
                const state = JSON.parse(saved);

                // Validate state (not too old, reasonable values)
                const age = new Date().getTime() - (state.timestamp || 0);
                const isValid = age < 30 * 24 * 60 * 60 * 1000; // 30 days

                if (isValid) {
                    if (state.left) player.style.left = state.left;
                    if (state.top) player.style.top = state.top;
                    if (state.right) player.style.right = state.right;
                    if (state.bottom) player.style.bottom = state.bottom;
                    if (state.width) player.style.width = state.width;
                    if (state.height) player.style.height = state.height;
                    console.log('📍 Player state restored from localStorage');
                } else {
                    console.log('ℹ️ Player state too old, using defaults');
                    localStorage.removeItem('playerState');
                }
            }

            // Check if was minimized
            if (localStorage.getItem('playerMinimized') === 'true') {
                player.style.display = 'none';
                console.log('📦 Player was minimized, keeping minimized');
            }
        } catch (err) {
            console.warn('⚠️ Failed to load player state:', err);
        }
    }
};

// ========================================================================
// INITIALIZE ON DOM READY
// ========================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM ready, initializing PlayerDraggable...');
        PlayerDraggable.init();
    });
} else {
    PlayerDraggable.init();
}

// Make global
window.PlayerDraggable = PlayerDraggable;