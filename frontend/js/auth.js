"use strict";

// ========================================================================
// 🔐 AUTHENTICATION
// ========================================================================

let token = localStorage.getItem('token');
let currentUser = null;

const Auth = {
    async register() {
        const email = document.getElementById('regEmail').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;

        if (!email || !username || !password) {
            UI.showStatus('authStatus', 'Please fill all fields', 'error');
            return;
        }

        try {
            UI.showStatus('authStatus', 'Registering...', 'loading');
            const response = await APIClient.post('/auth/register', { email, username, password });
            token = response.token;
            localStorage.setItem('token', token);
            currentUser = response.user;
            UI.showStatus('authStatus', 'Registered successfully!', 'success');
            setTimeout(() => showUserDashboard(), 1000);
        } catch (err) {
            UI.showStatus('authStatus', `Error: ${err.message}`, 'error');
        }
    },

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            UI.showStatus('authStatus', 'Please fill all fields', 'error');
            return;
        }

        try {
            UI.showStatus('authStatus', 'Logging in...', 'loading');
            const response = await APIClient.post('/auth/login', { email, password });
            token = response.token;
            localStorage.setItem('token', token);
            currentUser = response.user;
            UI.showStatus('authStatus', 'Logged in successfully!', 'success');
            setTimeout(() => showUserDashboard(), 1000);
        } catch (err) {
            UI.showStatus('authStatus', `Error: ${err.message}`, 'error');
        }
    },

    logout() {
        token = null;
        currentUser = null;
        localStorage.removeItem('token');
        UI.showAuthSection(true);
        UI.showUserSection(false);
        UI.showTrackBrowser(false);
    }
};

// Make these functions available globally for onclick handlers
window.register = () => Auth.register();
window.login = () => Auth.login();
window.logout = () => Auth.logout();
