// Datei: backend/seed-dev-user.js
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seedDevUser() {
    try {
        const hashedPassword = await bcrypt.hash('dev123', 10);

        const result = await db.query(
            'INSERT INTO users (email, username, password_hash, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, username',
            ['dev@nexus.local', 'devuser', hashedPassword]
        );

        console.log('✅ Dev-User erstellt:', result.rows[0]);
    } catch (err) {
        console.log('ℹ️ Dev-User existiert bereits');
    }
}

seedDevUser();
