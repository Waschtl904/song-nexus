const Auth = {
    apiBase: 'https://localhost:3000/api',

    setToken(token) {
        localStorage.setItem('auth_token', token);
        console.log('✅ Token saved');
    },

    getToken() {
        return localStorage.getItem('auth_token');
    },

    clearToken() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    },

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    async register(event) {
        event.preventDefault();
        const email = document.getElementById('regEmail')?.value;
        const username = document.getElementById('regUsername')?.value;
        const password = document.getElementById('regPassword')?.value;
        if (!email || !username || !password) return;
        try {
            const res = await fetch(`${this.apiBase}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password }),
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();
            this.setToken(result.token);
            this.setUser(result.user);
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('❌ Error:', error);
        }
    },

    async login(event) {
        event.preventDefault();
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;
        if (!email || !password) return;
        try {
            const res = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();
            this.setToken(result.token);
            this.setUser(result.user);
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('❌ Error:', error);
        }
    },

    logout() {
        this.clearToken();
        location.href = '/';
    }
};

console.log('✅ Auth loaded');