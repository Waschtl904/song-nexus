const pool = require('./db');

async function seedTracks() {
    try {
        console.log('🌱 Seeding tracks...');

        const tracks = [
            {
                name: 'THE SPELL',
                artist: 'Unproven',
                genre: 'Metal',
                price_eur: 4.99,
                audio_filename: 'THE_SPELL.mp3',
                duration_seconds: 240,
                file_size_bytes: 5242880,
                description: 'A powerful metal track with mystical vibes',
                is_published: true
            },
            {
                name: 'HYPERUNIFORMITY',
                artist: 'Math Metal',
                genre: 'Progressive',
                price_eur: 5.99,
                audio_filename: 'HYPERUNIFORMITY.mp3',
                duration_seconds: 320,
                file_size_bytes: 6291456,
                description: 'Progressive metal exploring mathematical patterns',
                is_published: true
            },
            {
                name: 'P VS NP',
                artist: 'Computational',
                genre: 'Symphonic',
                price_eur: 3.99,
                audio_filename: 'P_VS_NP.mp3',
                duration_seconds: 180,
                file_size_bytes: 3932160,
                description: 'Symphonic exploration of the P vs NP problem',
                is_published: true
            }
        ];

        for (const track of tracks) {
            await pool.query(
                `INSERT INTO tracks 
         (name, artist, genre, price_eur, audio_filename, duration_seconds, file_size_bytes, description, is_published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         ON CONFLICT (audio_filename) DO NOTHING`,
                [
                    track.name,
                    track.artist,
                    track.genre,
                    track.price_eur,
                    track.audio_filename,
                    track.duration_seconds,
                    track.file_size_bytes,
                    track.description,
                    track.is_published
                ]
            );
            console.log(`✅ Track added: ${track.name}`);
        }

        // Prüfe, wie viele Tracks jetzt in der DB sind
        const result = await pool.query('SELECT COUNT(*) as count FROM tracks');
        console.log(`📊 Total tracks in DB: ${result.rows[0].count}`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

seedTracks();
