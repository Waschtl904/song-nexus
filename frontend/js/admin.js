// ============================================================================
// 🛠️ ADMIN.JS v2.0 - Backend-Compatible Upload
// ============================================================================

import { Auth } from './auth.js';
import { APIClient } from './api-client.js';

const Admin = {
    async init() {
        console.log('🛠️ Admin Dashboard Initializing...');

        Auth.init();
        if (!Auth.isAuthenticated()) {
            alert('Bitte erst auf der Hauptseite anmelden!');
            window.location.href = 'index.html';
            return;
        }

        this.setupEventListeners();
        await this.loadTracks();
    },

    setupEventListeners() {
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }

        // File Input Change: Dauer ermitteln
        const fileInput = document.querySelector('input[name="audio"]');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        const logoutBtn = document.getElementById('adminLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
                window.location.href = 'index.html';
            });
        }
    },

    // 🕒 Dauer der Audiodatei im Browser ermitteln
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio(objectUrl);

        audio.addEventListener('loadedmetadata', () => {
            const duration = Math.floor(audio.duration);
            console.log(`⏱️ Audio duration detected: ${duration} seconds`);

            // In Hidden Input schreiben
            let durationInput = document.querySelector('input[name="duration_seconds"]');
            if (!durationInput) {
                // Falls noch nicht da, erzeugen
                durationInput = document.createElement('input');
                durationInput.type = 'hidden';
                durationInput.name = 'duration_seconds';
                document.getElementById('uploadForm').appendChild(durationInput);
            }
            durationInput.value = duration;

            // Info anzeigen
            document.getElementById('fileInfo').textContent = `Dauer: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} min`;
        });
    },

    async handleUpload(e) {
        e.preventDefault();

        const form = e.target;
        const statusDiv = document.getElementById('uploadStatus');
        const submitBtn = form.querySelector('button[type="submit"]');

        // Check Duration
        const durationInput = form.querySelector('input[name="duration_seconds"]');
        if (!durationInput || !durationInput.value) {
            alert('Bitte warten, bis die Audio-Dauer ermittelt wurde (oder Datei neu auswählen).');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Upload läuft...';
        statusDiv.className = 'status-message loading';
        statusDiv.textContent = 'Datei wird hochgeladen...';
        statusDiv.style.display = 'block';

        try {
            const formData = new FormData(form);

            // Backend erwartet 'price_eur', Form hat 'price' -> Umbenennen/Hinzufügen
            const price = formData.get('price');
            formData.append('price_eur', price);

            // Backend erwartet 'is_published'
            formData.append('is_published', 'true');

            const token = Auth.getToken();

            // POST /api/admin/tracks/upload
            const response = await fetch(`${APIClient.getApiBase()}/admin/tracks/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload fehlgeschlagen');
            }

            statusDiv.className = 'status-message success';
            statusDiv.textContent = '✅ Track erfolgreich hochgeladen!';
            form.reset();
            document.getElementById('fileInfo').textContent = '';

            await this.loadTracks();

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
        if (!listContainer) return;

        listContainer.innerHTML = '<p>Lade Tracks...</p>';

        try {
            // Versuche Admin-List Route, sonst Fallback auf Public
            const token = Auth.getToken();
            let tracks = [];

            try {
                // Admin List (zeigt auch unveröffentlichte, etc.)
                // Pfadannahme: /api/admin/tracks/list
                const res = await fetch(`${APIClient.getApiBase()}/admin/tracks/list`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) tracks = await res.json();
                else tracks = await APIClient.getTracks(); // Fallback
            } catch (e) {
                tracks = await APIClient.getTracks();
            }

            if (!tracks || tracks.length === 0) {
                listContainer.innerHTML = '<p>Keine Tracks gefunden.</p>';
                return;
            }

            listContainer.innerHTML = tracks.map(track => `
                <div class="track-item-admin">
                    <div class="track-info">
                        <strong>${this.escapeHtml(track.name)}</strong>
                        <span class="badge ${track.is_free ? 'badge-free' : 'badge-paid'}">
                            ${track.is_free ? 'FREE' : '€' + track.price_eur}
                        </span>
                        <br>
                        <span style="color: #888;">${this.escapeHtml(track.artist)} • ${Math.floor(track.duration_seconds / 60)}:${(track.duration_seconds % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div class="track-actions">
                        <button class="btn-delete" onclick="window.Admin.deleteTrack(${track.id}, '${this.escapeHtml(track.name)}')">
                            🗑️ Löschen
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error('List Error:', err);
            listContainer.innerHTML = '<p style="color:red">Fehler beim Laden der Liste.</p>';
        }
    },

    async deleteTrack(id, name) {
        if (!confirm(`Soll der Track "${name}" wirklich gelöscht werden?`)) return;

        try {
            const token = Auth.getToken();
            const response = await fetch(`${APIClient.getApiBase()}/admin/tracks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (result.success) {
                alert('Track gelöscht.');
                this.loadTracks();
            } else {
                alert('Fehler: ' + (result.error || 'Unbekannt'));
            }
        } catch (err) {
            alert('Netzwerkfehler: ' + err.message);
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
};

window.Admin = Admin;
document.addEventListener('DOMContentLoaded', () => Admin.init());
