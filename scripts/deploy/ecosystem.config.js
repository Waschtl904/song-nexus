/**
 * PM2-Konfiguration fuer SONG-NEXUS (Produktion)
 *
 * Start:   pm2 start ecosystem.config.js --env production
 * Ablage:  /var/www/song-nexus/ecosystem.config.js
 *
 * Nur das Backend laeuft unter PM2. frontend/server.js wird in Produktion
 * NICHT gebraucht - nginx liefert die statischen Dateien direkt aus, was
 * schneller ist und einen Prozess weniger bedeutet.
 */
module.exports = {
  apps: [
    {
      name: 'song-nexus-api',
      script: './server.js',
      cwd: '/var/www/song-nexus/backend',

      // Ein Prozess genuegt fuer den Soft-Launch. Cluster-Modus erst dann,
      // wenn die Download-Tokens in der Datenbank liegen (Issue #13) - die
      // In-Memory-Map wird sonst pro Prozess eigenstaendig gefuehrt und
      // Downloads schlagen sporadisch fehl.
      instances: 1,
      exec_mode: 'fork',

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Neustart bei Absturz, aber nicht in Endlosschleife
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 4000,

      // Bei Speicherleck neu starten statt den Server lahmzulegen
      max_memory_restart: '500M',

      error_file: '/var/www/song-nexus/backend/logs/pm2-error.log',
      out_file: '/var/www/song-nexus/backend/logs/pm2-out.log',
      time: true,

      // Kein Watch-Modus in Produktion: ein versehentliches Schreiben im
      // Verzeichnis wuerde sonst den Server neu starten.
      watch: false
    }
  ]
};
