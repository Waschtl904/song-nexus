#!/usr/bin/env node
// ============================================================================
// ⏱️  Hinterlegte Spieldauer gegen die tatsaechlichen Dateien pruefen
// ============================================================================
//
// Warum
// -----
// duration_seconds wurde bisher vom Browser gemessen und ungeprueft
// uebernommen. In der Entwicklungsdatenbank steht dadurch bei einem vier
// Minuten langen Song 3000 (also 50 Minuten) und bei einem anderen 290 statt
// 261.
//
// Das war nicht nur eine falsche Anzeige. Aus dem Wert wurde die Datenrate
// fuer den Vorschauausschnitt gerechnet — die 3000 fuehrten zu drei Sekunden
// Ton statt vierzig.
//
// Seit dem Umbau liest die Auslieferung die Rate aus der Datei, die Vorschau
// stimmt also unabhaengig von diesem Wert. Die Anzeige im Katalog haengt aber
// weiter daran. Dieses Skript bringt die Spalte in Ordnung.
//
// Aufruf
// ------
//   node scripts/dauer-pruefen.js                → nur berichten
//   node scripts/dauer-pruefen.js --korrigieren  → abweichende Werte setzen
//
// Ohne --korrigieren wird nichts veraendert.

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('../db');
const { bytesProSekunde } = require('../utils/audio-rate');

const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');
const KORRIGIEREN = process.argv.includes('--korrigieren');

// Ab welcher Abweichung gilt ein Wert als falsch: mehr als 5 Sekunden und
// mehr als 5 Prozent. Kleine Unterschiede entstehen durch Kopfdaten und sind
// bedeutungslos.
function istAbweichend(hinterlegt, gemessen) {
  if (!Number.isFinite(hinterlegt) || hinterlegt <= 0) return true;
  const diff = Math.abs(hinterlegt - gemessen);
  return diff > 5 && diff > gemessen * 0.05;
}

function alsZeit(sekunden) {
  if (!Number.isFinite(sekunden) || sekunden < 0) return '  --  ';
  const m = Math.floor(sekunden / 60);
  const s = Math.round(sekunden % 60);
  return `${String(m).padStart(3)}:${String(s).padStart(2, '0')}`;
}

async function main() {
  console.log('');
  console.log('⏱️  Spieldauer gegen die Dateien pruefen');
  console.log(`   Verzeichnis: ${AUDIO_DIR}`);
  console.log(`   Modus:       ${KORRIGIEREN ? 'KORRIGIEREN' : 'nur berichten'}`);
  console.log('');

  const { rows } = await pool.query(
    `SELECT id, name, audio_filename, duration_seconds, is_published, is_deleted
     FROM tracks
     ORDER BY id`
  );

  const kopf =
    ' id | Titel                     | Datei fehlt | hinterlegt | gemessen  | Quelle';
  console.log(kopf);
  console.log('-'.repeat(kopf.length));

  const zuKorrigieren = [];
  let fehlend = 0;
  let unlesbar = 0;

  for (const t of rows) {
    const name = String(t.name || '').slice(0, 25).padEnd(25);

    if (!t.audio_filename) {
      console.log(` ${String(t.id).padStart(2)} | ${name} | KEIN DATEINAME`);
      fehlend++;
      continue;
    }

    const pfad = path.join(AUDIO_DIR, t.audio_filename);
    if (!fs.existsSync(pfad)) {
      console.log(` ${String(t.id).padStart(2)} | ${name} | JA`);
      fehlend++;
      continue;
    }

    const groesse = fs.statSync(pfad).size;
    const { bytesProSekunde: rate, quelle } = bytesProSekunde(pfad, groesse, null);

    if (quelle !== 'Dateikopf') {
      console.log(
        ` ${String(t.id).padStart(2)} | ${name} |     -       | ` +
        `${alsZeit(t.duration_seconds)}    |   nicht messbar (${path.extname(t.audio_filename)})`
      );
      unlesbar++;
      continue;
    }

    const gemessen = Math.round(groesse / rate);
    const hinterlegt = Number(t.duration_seconds);
    const schlecht = istAbweichend(hinterlegt, gemessen);

    console.log(
      ` ${String(t.id).padStart(2)} | ${name} |     -       | ` +
      `${alsZeit(hinterlegt)}    | ${alsZeit(gemessen)}  | ` +
      `${rate} B/s${schlecht ? '   <-- ABWEICHUNG' : ''}`
    );

    if (schlecht) zuKorrigieren.push({ id: t.id, name: t.name, alt: hinterlegt, neu: gemessen });
  }

  console.log('');
  console.log(`   ${rows.length} Eintraege, ${fehlend} ohne Datei, ${unlesbar} nicht messbar`);
  console.log(`   ${zuKorrigieren.length} mit abweichender Dauer`);

  if (zuKorrigieren.length === 0) {
    console.log('');
    console.log('✅ Nichts zu tun.');
    return;
  }

  if (!KORRIGIEREN) {
    console.log('');
    console.log('   Zum Setzen dieser Werte:');
    console.log('     node scripts/dauer-pruefen.js --korrigieren');
    return;
  }

  console.log('');
  for (const e of zuKorrigieren) {
    await pool.query('UPDATE tracks SET duration_seconds = $1 WHERE id = $2', [e.neu, e.id]);
    console.log(`   ✅ ${e.id} ${e.name}: ${e.alt} -> ${e.neu}`);
  }
  console.log('');
  console.log(`✅ ${zuKorrigieren.length} Werte gesetzt.`);
}

main()
  .catch((err) => {
    console.error('');
    console.error('❌ Abbruch:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
