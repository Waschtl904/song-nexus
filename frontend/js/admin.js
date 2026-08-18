// ============================================================================
// 🛠️ ADMIN.JS v2.1 - FIXED Backend-Compatible Upload
// ============================================================================

import { Auth } from './auth.js';
import { APIClient } from './api-client.js';

const Admin = {
    async init() {
        console.log('🛠️ Admin Dashboard Initializing...');

        Auth.init();

        // ✅ WICHTIG: Warte kurz, damit Auth.init() durchläuft
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!Auth.isAuthenticated()) {
            console.warn('❌ User not authenticated! Redirecting...');
            alert('❌ Bitte erst auf der Hauptseite anmelden!');
            window.location.href = 'index.html';
            return;
        }

        console.log('✅ User authenticated, loading admin panel...');
        this.setupEventListeners();
        await this.loadTracks();
    },

    setupEventListeners() {
        console.log('📌 Setting up event listeners...');

        // ✅ Upload Form
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
            console.log('✅ Upload form listener attached');
        } else {
            console.error('❌ uploadForm not found!');
        }

        // ✅ File Input: Dauer ermitteln
        const fileInput = document.querySelector('input[name="audio"]');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
            console.log('✅ File input listener attached');
        }

        // ✅ Logout Button
        const logoutBtn = document.getElementById('adminLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🔓 Logout clicked');
                await Auth.logout();
                window.location.href = 'index.html';
            });
            console.log('✅ Logout button listener attached');
        }
    },

    // 🕒 Dauer der Audiodatei im Browser ermitteln
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        console.log('📁 File selected:', file.name, file.size, 'bytes');

        // ✅ Bessere Fehlerbehandlung für Audio-Dauer
        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio();

        let metadataLoaded = false;
        let timeoutId = null;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            URL.revokeObjectURL(objectUrl);
        };

        audio.addEventListener('loadedmetadata', () => {
            if (metadataLoaded) return; // Verhindere doppelte Ausführung
            metadataLoaded = true;

            const duration = Math.round(audio.duration);
            console.log(`⏱️ Audio duration detected: ${duration} seconds`);

            // ✅ Hidden Input für Duration
            let durationInput = document.querySelector('input[name="duration_seconds"]');
            if (!durationInput) {
                durationInput = document.createElement('input');
                durationInput.type = 'hidden';
                durationInput.name = 'duration_seconds';
                document.getElementById('uploadForm').appendChild(durationInput);
            }
            durationInput.value = duration;

            // ✅ Info anzeigen (formatiert)
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const fileSize = (file.size / 1024 / 1024).toFixed(2);
            document.getElementById('fileInfo').textContent =
                `✅ ${file.name} | Dauer: ${minutes}:${seconds.toString().padStart(2, '0')} | Größe: ${fileSize}MB`;

            cleanup();
        });

        // ✅ Timeout: Falls Audio nicht lädt
        timeoutId = setTimeout(() => {
            if (!metadataLoaded) {
                console.warn('⚠️ Audio metadata timeout - using fallback');
                document.getElementById('fileInfo').textContent =
                    `⚠️ Dauer konnte nicht automatisch ermittelt werden. Bitte manuell eingeben.`;
                cleanup();
            }
        }, 5000);

        audio.src = objectUrl;
    },

    async handleUpload(e) {
        e.preventDefault();

        const form = e.target;
        const statusDiv = document.getElementById('uploadStatus');
        const submitBtn = form.querySelector('button[type="submit"]');
        const fileInput = form.querySelector('input[name="audio"]');

        // ✅ WICHTIGE VALIDIERUNGEN
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = '❌ Bitte eine Audiodatei auswählen!';
            statusDiv.style.display = 'block';
            return;
        }

        const file = fileInput.files[0];
        console.log('📤 Uploading file:', file.name);

        // ✅ Dateigrößen-Check (z.B. max 100MB)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = `❌ Datei zu groß! Maximum: 100MB, du hast: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
            statusDiv.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Upload läuft...';
        statusDiv.className = 'status-message loading';
        statusDiv.textContent = '📤 Datei wird hochgeladen...';
        statusDiv.style.display = 'block';

        try {
            const formData = new FormData(form);

            // ✅ Sicherstelle, dass alle notwendigen Felder da sind
            const name = formData.get('name');
            const artist = formData.get('artist');
            const genre = formData.get('genre');
            const price = formData.get('price') || '0.00';
            const isFree = formData.get('is_free') === 'true' ? true : false;

            if (!name || !artist) {
                throw new Error('Titel und Künstler sind erforderlich!');
            }

            console.log('📋 Form data:', { name, artist, genre, price, isFree });

            // Felder fuer das Backend setzen — mit set statt append.
            //
            // append hat die Werte doppelt eingetragen: das Formular schickt
            // is_free bereits selbst mit, sobald das Kaestchen angehakt ist.
            // Auf der Serverseite kam dadurch ein Array ['true','true'] an,
            // und die Pruefung is_free === 'true' schlug fehl. Ergebnis: ein
            // Gratis-Track wurde als Bezahltrack ohne Preis behandelt und der
            // Upload mit der Meldung abgewiesen, es fehle ein Preis.
            formData.delete('price');
            formData.set('price_eur', isFree ? '0.00' : price);
            formData.set('is_published', 'true');
            formData.set('is_free', isFree ? 'true' : 'false');

            const token = Auth.getToken();
            if (!token) {
                throw new Error('Kein Auth-Token! Bitte erneut anmelden.');
            }

            console.log('🔑 Token present:', token.substring(0, 20) + '...');

            // ✅ POST /api/admin/tracks/upload
            const apiUrl = `${APIClient.getApiBase()}/admin/tracks/upload`;
            console.log('🌐 Uploading to:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // ❌ WICHTIG: Nicht 'Content-Type' setzen bei FormData!
                    // Browser setzt das automatisch mit Boundary
                },
                // Damit die Anmeldung auch ueber das HttpOnly-Cookie greift,
                // wenn im Speicher kein Token mehr liegt.
                credentials: 'include',
                body: formData
            });

            console.log('📊 Response status:', response.status);

            // Antwort robust auswerten: bei 413 oder einem Fehler aus einer
            // vorgelagerten Ebene kommt HTML zurueck, nicht JSON. response.json()
            // ist dann selbst gescheitert und hat die eigentliche Ursache
            // verschluckt — man sah nur einen Parser-Fehler.
            const rohtext = await response.text();
            let result = {};
            try {
                result = rohtext ? JSON.parse(rohtext) : {};
            } catch (parseErr) {
                console.warn('⚠️ Antwort war kein JSON:', rohtext.slice(0, 300));
                result = { error: `HTTP ${response.status} — Antwort des Servers: ${rohtext.slice(0, 200) || '(leer)'}` };
            }
            console.log('📦 Response:', result);

            if (!response.ok) {
                const code = result.code ? ` [${result.code}]` : '';
                throw new Error((result.error || result.message || `HTTP ${response.status}`) + code);
            }

            statusDiv.className = 'status-message success';
            statusDiv.textContent = `✅ Track "${name}" erfolgreich hochgeladen!`;
            form.reset();
            document.getElementById('fileInfo').textContent = '';

            // ✅ Liste aktualisieren
            setTimeout(() => this.loadTracks(), 500);

        } catch (err) {
            console.error('❌ Upload Error:', err);
            statusDiv.className = 'status-message error';
            statusDiv.textContent = `❌ Fehler: ${err.message}`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 Track Hochladen';
        }
    },

    async loadTracks() {
        const listContainer = document.getElementById('adminTrackList');
        if (!listContainer) {
            console.error('❌ adminTrackList container not found!');
            return;
        }

        listContainer.innerHTML = '<p>📋 Lade Tracks...</p>';

        try {
            const token = Auth.getToken();
            if (!token) {
                throw new Error('Nicht authentifiziert');
            }

            let tracks = [];
            let useAdminList = true;

            // ✅ Versuche Admin-List Route
            try {
                console.log('🔐 Versuche /api/admin/tracks/list...');
                const res = await fetch(`${APIClient.getApiBase()}/admin/tracks/list`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                console.log('📊 Admin list response status:', res.status);

                if (res.ok) {
                    const data = await res.json();
                    tracks = Array.isArray(data) ? data : data.tracks || [];
                    console.log('✅ Admin list loaded:', tracks.length, 'tracks');
                } else {
                    console.warn('⚠️ Admin list failed, trying public list...');
                    useAdminList = false;
                }
            } catch (e) {
                console.warn('⚠️ Admin list error:', e.message);
                useAdminList = false;
            }

            // ✅ Fallback auf Public List
            if (!useAdminList) {
                console.log('📡 Versuche /api/tracks/...');
                const res = await fetch(`${APIClient.getApiBase()}/tracks/`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    tracks = Array.isArray(data) ? data : data.tracks || [];
                    console.log('✅ Public list loaded:', tracks.length, 'tracks');
                }
            }

            if (!tracks || tracks.length === 0) {
                listContainer.innerHTML = '<p style="color: #888;">📭 Keine Tracks vorhanden.</p>';
                return;
            }

            // ✅ Rendere Track-Liste
            listContainer.innerHTML = tracks.map(track => {
                const minutes = Math.floor((track.duration_seconds || 0) / 60);
                const seconds = (track.duration_seconds || 0) % 60;
                const priceDisplay = track.is_free ? 'FREE' : `€${(track.price_eur || 0).toFixed(2)}`;

                return `
                    <div class="track-item-admin">
                        <div class="track-info">
                            <strong>${this.escapeHtml(track.name || 'Untitled')}</strong>
                            <span class="badge ${track.is_free ? 'badge-free' : 'badge-paid'}">
                                ${priceDisplay}
                            </span>
                            <br>
                            <span style="color: #888;">
                                ${this.escapeHtml(track.artist || 'Unknown')} • 
                                ${minutes}:${seconds.toString().padStart(2, '0')} • 
                                ${track.genre || 'N/A'}
                            </span>
                        </div>
                        <div class="track-actions">
                            <button class="btn-delete" onclick="window.Admin.deleteTrack(${track.id}, '${this.escapeHtml(track.name || 'Untitled')}')">
                                🗑️ Löschen
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error('❌ List Error:', err);
            listContainer.innerHTML = `<p style="color:#ff5459">❌ Fehler beim Laden: ${err.message}</p>`;
        }
    },

    async deleteTrack(id, name) {
        if (!confirm(`🗑️ Soll der Track "${name}" wirklich gelöscht werden?`)) {
            console.log('❌ Delete cancelled');
            return;
        }

        try {
            const token = Auth.getToken();

            console.log(`🗑️ Deleting track ${id}...`);

            const response = await fetch(`${APIClient.getApiBase()}/admin/tracks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📊 Delete response status:', response.status);

            const result = await response.json();
            console.log('📦 Delete result:', result);

            if (response.ok || result.success) {
                alert(`✅ Track "${name}" gelöscht.`);
                this.loadTracks();
            } else {
                alert('❌ Fehler: ' + (result.error || result.message || 'Unbekannt'));
            }
        } catch (err) {
            console.error('❌ Delete error:', err);
            alert('❌ Netzwerkfehler: ' + err.message);
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ✅ Expose Admin global
window.Admin = Admin;

// ✅ Initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Admin.init());
} else {
    Admin.init();
}