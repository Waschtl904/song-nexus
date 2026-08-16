// ============================================================================
// 🎚️ Datenrate einer Audiodatei aus der Datei selbst bestimmen
// ============================================================================
//
// Warum es dieses Modul gibt
// --------------------------
// Die Vorschau eines Premium-Tracks wird ausgeschnitten, indem aus der Datei
// die ersten N Sekunden als Bytebereich ausgeliefert werden. Dafuer braucht es
// die Datenrate: wie viele Bytes entsprechen einer Sekunde Ton?
//
// Vorher wurde sie so geschaetzt:
//
//     avgBytesPerSecond = filesize / track.duration_seconds
//
// Das haengt vollstaendig an einem Wert aus der Datenbank. Stimmt der nicht,
// stimmt die Vorschau nicht — und zwar in beide Richtungen:
//
//   - duration_seconds zu GROSS  -> Vorschau viel zu kurz.
//     Nachgestellt: eine 60-Sekunden-Datei mit duration_seconds = 239 ergab
//     statt 40 Sekunden nur rund 10.
//
//   - duration_seconds zu KLEIN  -> Vorschau viel zu lang.
//     Im Grenzfall wird der ganze Song ausgeliefert. Das ist kein
//     Schoenheitsfehler, sondern der Wegfall des Kaufschutzes.
//
// Die Datenrate steht aber in der Datei selbst. Sie dort abzulesen ist
// verlaesslicher als jede Angabe in einer Nebentabelle, die beim Upload
// falsch befuellt worden sein kann.
//
// Was hier geht und was nicht
// ---------------------------
// WAV: exakt. Die Kopfdaten nennen die Byterate unmittelbar.
// MP3: aus dem ersten Rahmenkopf. Bei konstanter Bitrate exakt, bei variabler
//      eine Naeherung — dann ist der erste Rahmen nicht repraesentativ.
// Alles andere: nicht unterstuetzt, dann greift die Schaetzung ueber die
//      Dauer, und wenn auch die fehlt, ein Notwert nach Dateiendung.

const fs = require('fs');
const path = require('path');

// Bitraten in kbit/s nach Rahmenkopf. Index 0 ist "frei", Index 15 ungueltig.
const BITRATEN = {
  // MPEG 1, Layer III
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  // MPEG 1, Layer II
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
  // MPEG 1, Layer I
  '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  // MPEG 2 / 2.5, Layer II und III
  '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
};

// Notwerte, falls sich nichts auslesen laesst und keine Dauer bekannt ist.
const NOTWERTE = {
  '.mp3': 16000,   // entspricht 128 kbit/s
  '.wav': 176400,  // 44,1 kHz, stereo, 16 bit
  '.ogg': 20000,
  '.oga': 20000,
  '.opus': 12000,
  '.m4a': 16000,
  '.aac': 16000,
  '.flac': 100000,
  '.webm': 16000,
};

/**
 * Liest die Byterate aus dem WAV-Kopf.
 *
 * Eine WAV-Datei ist eine Folge von Bloecken. Der Block "fmt " nennt die
 * Byterate direkt. Er liegt ueblicherweise gleich am Anfang, muss es aber
 * nicht — deshalb wird die Blockkette durchlaufen statt blind an eine feste
 * Stelle gegriffen.
 *
 * @param {Buffer} kopf - die ersten Bytes der Datei
 * @returns {number|null} Bytes pro Sekunde, oder null
 */
function wavByterate(kopf) {
  if (kopf.length < 12) return null;
  if (kopf.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (kopf.toString('ascii', 8, 12) !== 'WAVE') return null;

  let pos = 12;
  while (pos + 8 <= kopf.length) {
    const kennung = kopf.toString('ascii', pos, pos + 4);
    const laenge = kopf.readUInt32LE(pos + 4);

    if (kennung === 'fmt ') {
      // Aufbau der Nutzdaten: Format (2), Kanaele (2), Abtastrate (4),
      // Byterate (4), ...
      const daten = pos + 8;
      if (daten + 12 > kopf.length) return null;
      const byterate = kopf.readUInt32LE(daten + 8);
      return byterate > 0 ? byterate : null;
    }

    // Bloecke sind auf gerade Laenge aufgefuellt.
    const schritt = 8 + laenge + (laenge % 2);
    if (schritt <= 8) return null; // unplausibel, Endlosschleife vermeiden
    pos += schritt;
  }
  return null;
}

/**
 * Liest die Bitrate aus dem ersten MP3-Rahmenkopf.
 *
 * Vor den Tondaten kann ein ID3v2-Block stehen, der uebersprungen werden
 * muss. Danach wird nach der Rahmenkennung gesucht: elf gesetzte Bits.
 *
 * @param {Buffer} kopf - die ersten Bytes der Datei
 * @returns {number|null} Bytes pro Sekunde, oder null
 */
function mp3Byterate(kopf) {
  let start = 0;

  // ID3v2 ueberspringen. Die Laenge steht in vier Bytes, von denen jeweils
  // nur sieben Bits zaehlen (damit keine Rahmenkennung entsteht).
  if (kopf.length > 10 && kopf.toString('ascii', 0, 3) === 'ID3') {
    const laenge =
      ((kopf[6] & 0x7f) << 21) |
      ((kopf[7] & 0x7f) << 14) |
      ((kopf[8] & 0x7f) << 7) |
      (kopf[9] & 0x7f);
    start = 10 + laenge;
  }

  for (let i = start; i + 4 <= kopf.length; i++) {
    if (kopf[i] !== 0xff) continue;
    if ((kopf[i + 1] & 0xe0) !== 0xe0) continue;

    const versionBits = (kopf[i + 1] >> 3) & 0x03; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layerBits = (kopf[i + 1] >> 1) & 0x03;   // 3 = Layer I, 2 = II, 1 = III
    const bitrateIndex = (kopf[i + 2] >> 4) & 0x0f;

    if (versionBits === 1) continue;        // reserviert
    if (layerBits === 0) continue;          // reserviert
    if (bitrateIndex === 0 || bitrateIndex === 15) continue; // frei bzw. ungueltig

    const version = versionBits === 3 ? 1 : 2;
    const layer = { 3: 1, 2: 2, 1: 3 }[layerBits];
    const tabelle = BITRATEN[`${version}-${layer}`];
    if (!tabelle) continue;

    const kbit = tabelle[bitrateIndex];
    if (!kbit) continue;

    return Math.floor((kbit * 1000) / 8);
  }
  return null;
}

/**
 * Bestimmt die Datenrate einer Audiodatei.
 *
 * Reihenfolge:
 *   1. aus der Datei selbst (verlaesslich)
 *   2. Dateigroesse geteilt durch die Dauer aus der Datenbank
 *   3. Notwert nach Dateiendung
 *
 * @param {string} filepath - vollstaendiger Pfad
 * @param {number} filesize - Groesse in Bytes
 * @param {number|null} dauerSekunden - duration_seconds aus der Datenbank
 * @returns {{bytesProSekunde: number, quelle: string}}
 */
function bytesProSekunde(filepath, filesize, dauerSekunden) {
  const endung = path.extname(String(filepath || '')).toLowerCase();

  // 1. aus der Datei
  try {
    const fd = fs.openSync(filepath, 'r');
    try {
      // 64 KB genuegen fuer den WAV-Kopf und den ersten MP3-Rahmen, auch
      // hinter einem ueblichen ID3v2-Block.
      const laenge = Math.min(65536, filesize);
      const puffer = Buffer.alloc(laenge);
      fs.readSync(fd, puffer, 0, laenge, 0);

      const gemessen = endung === '.wav' ? wavByterate(puffer) : mp3Byterate(puffer);
      if (gemessen && gemessen > 0) {
        return { bytesProSekunde: gemessen, quelle: 'Dateikopf' };
      }
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    console.warn(`⚠️ Datenrate nicht aus der Datei lesbar (${filepath}): ${err.message}`);
  }

  // 2. ueber die hinterlegte Dauer
  const dauer = Number(dauerSekunden);
  if (Number.isFinite(dauer) && dauer > 0 && filesize > 0) {
    return {
      bytesProSekunde: Math.floor(filesize / dauer),
      quelle: 'duration_seconds',
    };
  }

  // 3. Notwert
  return {
    bytesProSekunde: NOTWERTE[endung] || 16000,
    quelle: 'Notwert',
  };
}

module.exports = { bytesProSekunde, wavByterate, mp3Byterate, NOTWERTE };
