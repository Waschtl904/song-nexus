"use strict";

// ========================================================================
// 🎨 UI UTILITIES
// ========================================================================

const UI = {
    // Theme Toggle
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('nexus-theme', newTheme);
        document.querySelector('.theme-toggle').textContent = newTheme === 'light' ? '☀️' : '🌙';
    },

    // Init Theme
    initTheme() {
        const savedTheme = localStorage.getItem('nexus-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.querySelector('.theme-toggle').textContent = savedTheme === 'light' ? '☀️' : '🌙';
    },

    // Show Status Message
    showStatus(elementId, message, type) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.className = `status-message ${type}`;
        }
    },

    // Escape HTML
    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    // Switch Tabs
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const tabEl = document.getElementById(tabName);
        if (tabEl) {
            tabEl.classList.add('active');
        }

        event.target.classList.add('active');
    },

    // Show/Hide Auth Section
    showAuthSection(show = true) {
        const el = document.getElementById('authSection');
        if (el) {
            if (show) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    },

    // Show/Hide User Section
    showUserSection(show = true) {
        const el = document.getElementById('userSection');
        if (el) {
            el.classList.toggle('active', show);
        }
    },

    // Show/Hide Track Browser
    showTrackBrowser(show = true) {
        const el = document.getElementById('trackBrowserSection');
        if (el) {
            el.style.display = show ? 'block' : 'none';
        }
    },

    // Open Modal
    openModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
            el.classList.add('active');
        }
    },

    // Close Modal
    closeModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
            el.classList.remove('active');
        }
    },

    // Update User Card
    updateUserCard(username, email, totalPlays, totalSpent) {
        const usernameEl = document.getElementById('displayUsername');
        const emailEl = document.getElementById('displayEmail');
        const playsEl = document.getElementById('totalPlays');
        const spentEl = document.getElementById('totalSpent');

        if (usernameEl) usernameEl.textContent = username || '-';
        if (emailEl) emailEl.textContent = email || '-';
        if (playsEl) playsEl.textContent = totalPlays || '0';
        if (spentEl) spentEl.textContent = '€' + (totalSpent || '0');
    },

    // ========================================================================
    // 🗑️ RESET PLAY HISTORY MODAL
    // ========================================================================

    /**
     * Erstellt und zeigt das Reset-History-Modal
     */
    showResetHistoryModal() {
        // Modal erstellen
        const modal = document.createElement('div');
        modal.id = 'resetHistoryModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Play History löschen?</h2>
                <p>Dies löscht <strong>ALLE</strong> Play-History-Einträge permanent.</p>
                <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
                
                <div class="modal-buttons">
                    <button id="confirmResetBtn" class="btn btn-danger">Ja, löschen</button>
                    <button id="cancelResetBtn" class="btn btn-secondary">Abbrechen</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event Listener
        const confirmBtn = document.getElementById('confirmResetBtn');
        const cancelBtn = document.getElementById('cancelResetBtn');

        confirmBtn.addEventListener('click', async () => {
            await this.resetPlayHistory();
            this.closeResetHistoryModal();
        });

        cancelBtn.addEventListener('click', () => {
            this.closeResetHistoryModal();
        });

        // Modal schließen bei Klick auf Overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeResetHistoryModal();
            }
        });
    },

    /**
     * Schließt das Reset-Modal
     */
    closeResetHistoryModal() {
        const modal = document.getElementById('resetHistoryModal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Löscht die Play History über API
     */
    async resetPlayHistory() {
        try {
            // User-ID aus JWT holen
            const userId = this.getUserIdFromToken();
            const token = localStorage.getItem('token');

            if (!userId || !token) {
                console.error('❌ No userId or token found');
                alert('❌ Fehler: User nicht authentifiziert');
                return;
            }

            console.log(`🗑️ Deleting play history for user: ${userId}`);

            // API Call
            const response = await fetch(`https://localhost:3000/api/play-history/user/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response Status:', response.status);
            console.log('Response OK:', response.ok);

            // Prüfe ob Response OK ist
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                alert(`❌ Fehler: ${response.status} ${response.statusText}\n${errorText}`);
                return;
            }

            // Parse JSON
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('❌ JSON Parse Error:', parseError);
                const text = await response.text();
                console.error('Response text was:', text);
                alert('❌ Fehler beim Parsen der Server-Antwort');
                return;
            }

            console.log('✅ API Response:', data);
            alert(`✅ Play History gelöscht! (${data.deleted_count} Einträge entfernt)`);

            // Play History UI neu laden
            if (typeof loadPlayHistory === 'function') {
                loadPlayHistory();
            }
        } catch (error) {
            console.error('❌ Error resetting play history:', error);
            alert(`❌ Fehler beim Löschen der Play History: ${error.message}`);
        }
    },

    /**
     * Hilfsfunktion: User-ID aus JWT Token extrahieren
     */
    getUserIdFromToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ No token found in localStorage');
            return null;
        }

        try {
            // JWT dekodieren (Header.Payload.Signature)
            const payload = token.split('.')[1];
            if (!payload) {
                console.error('❌ Invalid token format');
                return null;
            }
            const decoded = JSON.parse(atob(payload));
            console.log('✅ Decoded token:', decoded);
            return decoded.id;
        } catch (error) {
            console.error('❌ Error decoding token:', error);
            return null;
        }
    }
};
