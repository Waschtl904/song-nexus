// ============================================================================
// 🎮 PLAYER-DRAGGABLE.JS v8.0 - ES6 MODULE
// Draggable & Resizable Player mit Tastaturunterstützung + A11y
// ============================================================================

export const PlayerDraggable = {
    isDragging: false,
    isResizing: false,
    dragStart: { x: 0, y: 0 },
    playerStart: { x: 0, y: 0, width: 0, height: 0 },

    // ======================================================================
    // INITIALIZATION
    // ======================================================================

    init() {
        // Mehrfachinitialisierung verhindern: PlayerDraggable.init() wurde aus main.js,
        // app.js und js/init.js aufgerufen. Jeder Durchlauf hat die
        // Ereignisbindungen erneut angelegt — ein Klick loeste sie danach
        // zwei- bis viermal aus (Anmeldung, Umschalter, WebAuthn-Anfragen).
        if (this._initialisiert) {
            console.warn('⚠️ PlayerDraggable.init() erneut aufgerufen — uebersprungen');
            return;
        }
        this._initialisiert = true;

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

        // Mouse drag listeners
        header.addEventListener('mousedown', (e) => this.startDrag(e, player));
        document.addEventListener('mousemove', (e) => this.onDrag(e, player));
        document.addEventListener('mouseup', () => this.stopDrag());

        // Touch support for mobile
        header.addEventListener('touchstart', (e) => this.startDrag(e.touches[0], player));
        document.addEventListener('touchmove', (e) => this.onDrag(e.touches[0], player));
        document.addEventListener('touchend', () => this.stopDrag());

        // Resize listeners
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e, player));
        document.addEventListener('mousemove', (e) => this.onResize(e, player));
        document.addEventListener('mouseup', () => this.stopResize());

        // Touch resize
        resizeHandle.addEventListener('touchstart', (e) => this.startResize(e.touches[0], player));
        document.addEventListener('touchmove', (e) => this.onResize(e.touches[0], player));
        document.addEventListener('touchend', () => this.stopResize());

        // Keyboard navigation
        this.setupKeyboardNavigation(player);

        // Minimieren-Knopf — hatte bisher gar keine Bindung, deshalb tat ein
        // einfacher Klick darauf nichts.
        const minimizeBtn = document.getElementById('playerMinimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.minimizePlayer(player);
            });
            minimizeBtn.setAttribute('title', 'Player einklappen');
        }

        // Schliessen-Knopf — klappte den Player vorher nur ein, obwohl ein
        // Kreuz Schliessen verspricht. Jetzt verschwindet der Player und
        // laesst sich ueber eine kleine Schaltflaeche zurueckholen.
        const closeBtn = document.getElementById('playerClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closePlayer(player);
            });
            closeBtn.setAttribute('aria-label', 'Player schliessen');
            closeBtn.setAttribute('title', 'Player schliessen (Escape klappt ein)');
        }

        // Context menu
        header.addEventListener('contextmenu', (e) => this.showContextMenu(e, player));

        // Double-click to reset
        header.addEventListener('dblclick', () => this.resetPosition(player));

        console.log('✅ Player draggable & resizable initialized');
    },

    // ======================================================================
    // DRAG FUNCTIONALITY
    // ======================================================================

    startDrag(e, player) {
        // Don't drag if clicking on buttons
        if (e.target.closest('.player-btn') || e.target.closest('.player-controls') || e.target.closest('button')) {
            return;
        }

        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.playerStart = { x: player.offsetLeft, y: player.offsetTop };
        player.classList.add('dragging');
        document.body.style.userSelect = 'none';
    },

    onDrag(e, player) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;

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

    // ======================================================================
    // RESIZE FUNCTIONALITY
    // ======================================================================

    startResize(e, player) {
        e.preventDefault();
        this.isResizing = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.playerStart = { width: player.offsetWidth, height: player.offsetHeight };
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

    // ======================================================================
    // KEYBOARD NAVIGATION FOR ACCESSIBILITY
    // ======================================================================

    setupKeyboardNavigation(player) {
        document.addEventListener('keydown', (e) => {
            if (player.style.display === 'none') return;

            const step = 10;

            switch (e.key) {
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
                case 'Escape':
                    if (document.activeElement === player || player.contains(document.activeElement)) {
                        e.preventDefault();
                        this.minimizePlayer(player);
                    }
                    break;
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

    // ======================================================================
    // CONTEXT MENU (RIGHT-CLICK)
    // ======================================================================

    showContextMenu(e, player) {
        e.preventDefault();

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

        // Inline-onclick war hier wirkungslos: die Sicherheitsrichtlinie des
        // Servers erlaubt nur Skripte aus eigenen Dateien. Deshalb echte
        // Ereignisbindungen statt Attribute.
        menu.textContent = '';
        const eintraege = [
            ['↺ Position zuruecksetzen', () => this.resetPosition(player)],
            ['− Player einklappen',      () => this.minimizePlayer(player)]
        ];
        eintraege.forEach(([text, aktion]) => {
            const zeile = document.createElement('div');
            zeile.style.cssText = 'padding: 8px 16px; cursor: pointer;';
            zeile.textContent = text;
            zeile.addEventListener('click', () => {
                aktion();
                menu.style.display = 'none';
            });
            menu.appendChild(zeile);
        });

        menu.style.display = 'block';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';

        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.style.display = 'none';
            }, { once: true });
        }, 0);
    },

    // ======================================================================
    // POSITION MANAGEMENT
    // ======================================================================

    resetPosition(player) {
        player.style.left = 'auto';
        player.style.top = 'auto';
        player.style.right = '20px';
        player.style.bottom = '20px';
        player.style.width = '350px';
        player.style.height = 'auto';

        sessionStorage.removeItem('playerPosition');
        sessionStorage.removeItem('playerSize');

        console.log('↺ Player position reset');
    },

    closePlayer(player) {
        player.style.display = 'none';

        let zurueck = document.getElementById('playerRestore');
        if (!zurueck) {
            zurueck = document.createElement('button');
            zurueck.id = 'playerRestore';
            zurueck.type = 'button';
            zurueck.className = 'player-restore';
            zurueck.textContent = '♪ Player';
            zurueck.setAttribute('aria-label', 'Player wieder anzeigen');
            zurueck.addEventListener('click', () => {
                player.style.display = '';
                zurueck.remove();
            });
            document.body.appendChild(zurueck);
        }

        console.log('✕ Player geschlossen');
    },

    minimizePlayer(player) {
        const playerContent = document.getElementById('playerContent');
        if (!playerContent) return;

        const isHidden = playerContent.style.display === 'none';
        playerContent.style.display = isHidden ? 'block' : 'none';

        const minimizeBtn = document.getElementById('playerMinimize');
        if (minimizeBtn) {
            minimizeBtn.textContent = isHidden ? '−' : '+';
        }

        console.log(`${isHidden ? '📖' : '🔧'} Player ${isHidden ? 'expanded' : 'minimized'}`);
    },

    // ======================================================================
    // STATE PERSISTENCE
    // ======================================================================

    savePlayerState(player) {
        const state = {
            left: player.style.left,
            top: player.style.top,
            width: player.style.width,
            height: player.style.height,
        };

        try {
            sessionStorage.setItem('playerPosition', JSON.stringify(state));
        } catch (err) {
            console.warn('⚠️ Could not save player state:', err);
        }
    },

    loadPlayerState(player) {
        try {
            const state = JSON.parse(sessionStorage.getItem('playerPosition'));
            if (state) {
                if (state.left) player.style.left = state.left;
                if (state.top) player.style.top = state.top;
                if (state.width) player.style.width = state.width;
                if (state.height) player.style.height = state.height;
                console.log('✅ Player state restored');
            }
        } catch (err) {
            console.warn('⚠️ Could not load player state:', err);
        }
    },
};

console.log('✅ PlayerDraggable v8.0 loaded - ES6 Module');