// ============================================================================
// Datenrate aus dem Dateikopf
// ============================================================================
//
// Diese Suite mockt bewusst KEIN fs. Sie legt echte kleine Dateien an und
// liest sie zurueck. Ein Mock koennte hier nur bestaetigen, was der Test
// ohnehin annimmt.
//
// Hintergrund: die Vorschau eines Premium-Tracks wird als Bytebereich
// ausgeschnitten. Frueher kam die dafuer noetige Datenrate aus
//
//     filesize / duration_seconds
//
// und haftete damit vollstaendig an einem Wert aus der Datenbank. War der
// falsch, war die Vorschau falsch — zu kurz bei zu grosser Dauer, im
// Grenzfall der ganze Song bei zu kleiner.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { bytesProSekunde, wavByterate, mp3Byterate, NOTWERTE } =
  require('../utils/audio-rate');

let ordner;

beforeAll(() => {
  ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'audiorate-'));
});

afterAll(() => {
  fs.rmSync(ordner, { recursive: true, force: true });
});

/**
 * Baut einen gueltigen WAV-Kopf samt etwas Fuellung.
 */
function wavDatei(name, { kanaele = 2, abtastrate = 44100, bits = 16, nutzBytes = 4096 } = {}) {
  const blockAlign = (kanaele * bits) / 8;
  const byterate = abtastrate * blockAlign;

  const kopf = Buffer.alloc(44);
  kopf.write('RIFF', 0, 'ascii');
  kopf.writeUInt32LE(36 + nutzBytes, 4);
  kopf.write('WAVE', 8, 'ascii');
  kopf.write('fmt ', 12, 'ascii');
  kopf.writeUInt32LE(16, 16);          // Laenge des fmt-Blocks
  kopf.writeUInt16LE(1, 20);           // PCM
  kopf.writeUInt16LE(kanaele, 22);
  kopf.writeUInt32LE(abtastrate, 24);
  kopf.writeUInt32LE(byterate, 28);
  kopf.writeUInt16LE(blockAlign, 32);
  kopf.writeUInt16LE(bits, 34);
  kopf.write('data', 36, 'ascii');
  kopf.writeUInt32LE(nutzBytes, 40);

  const pfad = path.join(ordner, name);
  fs.writeFileSync(pfad, Buffer.concat([kopf, Buffer.alloc(nutzBytes)]));
  return { pfad, byterate, groesse: 44 + nutzBytes };
}

/**
 * Baut eine MP3-Datei mit einem gueltigen ersten Rahmenkopf.
 *
 * @param {number} bitrateIndex - Index in der Bitratentabelle (MPEG1 Layer III)
 * @param {number} id3Laenge - Laenge eines vorangestellten ID3v2-Blocks
 */
function mp3Datei(name, bitrateIndex, id3Laenge = 0) {
  const teile = [];

  if (id3Laenge > 0) {
    const id3 = Buffer.alloc(10 + id3Laenge);
    id3.write('ID3', 0, 'ascii');
    id3[3] = 3; // Version
    // Laenge in vier Bytes zu je sieben nutzbaren Bits
    id3[6] = (id3Laenge >> 21) & 0x7f;
    id3[7] = (id3Laenge >> 14) & 0x7f;
    id3[8] = (id3Laenge >> 7) & 0x7f;
    id3[9] = id3Laenge & 0x7f;
    teile.push(id3);
  }

  const rahmen = Buffer.alloc(4);
  rahmen[0] = 0xff;
  rahmen[1] = 0xfb;                       // MPEG1, Layer III, ohne CRC
  rahmen[2] = (bitrateIndex << 4) | 0x00; // Bitrate, 44,1 kHz
  rahmen[3] = 0x00;
  teile.push(rahmen);
  teile.push(Buffer.alloc(8192));

  const pfad = path.join(ordner, name);
  const inhalt = Buffer.concat(teile);
  fs.writeFileSync(pfad, inhalt);
  return { pfad, groesse: inhalt.length };
}

describe('WAV: Byterate steht im Kopf', () => {
  test('44,1 kHz, stereo, 16 bit ergibt 176400 Byte/s', () => {
    const { pfad, groesse } = wavDatei('a.wav');
    const r = bytesProSekunde(pfad, groesse, null);
    expect(r.bytesProSekunde).toBe(176400);
    expect(r.quelle).toBe('Dateikopf');
  });

  test('22,05 kHz, mono, 16 bit ergibt 44100 Byte/s', () => {
    const { pfad, groesse } = wavDatei('b.wav', { kanaele: 1, abtastrate: 22050 });
    expect(bytesProSekunde(pfad, groesse, null).bytesProSekunde).toBe(44100);
  });

  test('48 kHz, stereo, 24 bit ergibt 288000 Byte/s', () => {
    const { pfad, groesse } = wavDatei('c.wav', { abtastrate: 48000, bits: 24 });
    expect(bytesProSekunde(pfad, groesse, null).bytesProSekunde).toBe(288000);
  });

  test('eine hinterlegte Dauer wird ignoriert, wenn der Kopf lesbar ist', () => {
    const { pfad, groesse } = wavDatei('d.wav');
    // Eine voellig falsche Dauer darf das Ergebnis nicht verschieben.
    expect(bytesProSekunde(pfad, groesse, 9999).bytesProSekunde).toBe(176400);
  });

  test('kein RIFF-Kopf ergibt null', () => {
    expect(wavByterate(Buffer.from('Kein WAV, nur Text hier drin'))).toBeNull();
  });
});

describe('MP3: Bitrate steht im ersten Rahmenkopf', () => {
  // MPEG1 Layer III: Index 9 = 128 kbit/s, 11 = 192, 14 = 320
  test.each([
    [9, 128, 16000],
    [11, 192, 24000],
    [14, 320, 40000],
    [5, 64, 8000],
  ])('Index %i = %i kbit/s ergibt %i Byte/s', (index, _kbit, erwartet) => {
    const { pfad, groesse } = mp3Datei(`r${index}.mp3`, index);
    const r = bytesProSekunde(pfad, groesse, null);
    expect(r.bytesProSekunde).toBe(erwartet);
    expect(r.quelle).toBe('Dateikopf');
  });

  test('ein vorangestellter ID3v2-Block wird uebersprungen', () => {
    const { pfad, groesse } = mp3Datei('mitid3.mp3', 9, 2048);
    const r = bytesProSekunde(pfad, groesse, null);
    expect(r.bytesProSekunde).toBe(16000);
    expect(r.quelle).toBe('Dateikopf');
  });

  test('ein freier Bitrate-Index (0) zaehlt nicht als Treffer', () => {
    // Nur der Rahmenkopf mit Index 0, sonst Nullen: kein gueltiger Rahmen.
    const kopf = Buffer.from([0xff, 0xfb, 0x00, 0x00]);
    expect(mp3Byterate(Buffer.concat([kopf, Buffer.alloc(64)]))).toBeNull();
  });

  test('ein ungueltiger Index (15) zaehlt nicht als Treffer', () => {
    const kopf = Buffer.from([0xff, 0xfb, 0xf0, 0x00]);
    expect(mp3Byterate(Buffer.concat([kopf, Buffer.alloc(64)]))).toBeNull();
  });
});

describe('Rueckfaelle, wenn der Kopf nichts hergibt', () => {
  test('dann zaehlt duration_seconds', () => {
    const pfad = path.join(ordner, 'muell.mp3');
    fs.writeFileSync(pfad, Buffer.alloc(500000));
    const r = bytesProSekunde(pfad, 500000, 50);
    expect(r.bytesProSekunde).toBe(10000);
    expect(r.quelle).toBe('duration_seconds');
  });

  test('ohne brauchbare Dauer greift der Notwert nach Endung', () => {
    const pfad = path.join(ordner, 'muell2.mp3');
    fs.writeFileSync(pfad, Buffer.alloc(1000));
    const r = bytesProSekunde(pfad, 1000, null);
    expect(r.bytesProSekunde).toBe(NOTWERTE['.mp3']);
    expect(r.quelle).toBe('Notwert');
  });

  test.each([[0], [-5], [NaN], ['viel']])(
    'eine unbrauchbare Dauer (%p) fuehrt nicht zu Division durch null',
    (dauer) => {
      const pfad = path.join(ordner, 'muell3.mp3');
      fs.writeFileSync(pfad, Buffer.alloc(1000));
      const r = bytesProSekunde(pfad, 1000, dauer);
      expect(Number.isFinite(r.bytesProSekunde)).toBe(true);
      expect(r.bytesProSekunde).toBeGreaterThan(0);
    }
  );

  test('eine fehlende Datei stuerzt nicht ab', () => {
    const r = bytesProSekunde(path.join(ordner, 'gibtsnicht.mp3'), 1000, 10);
    expect(r.bytesProSekunde).toBe(100);
    expect(r.quelle).toBe('duration_seconds');
  });
});

describe('warum das ueberhaupt gebaut wurde', () => {
  // Die beiden Faelle, die den Fehler auf der echten Seite ausgeloest haben.
  test('zu GROSSE Dauer verkuerzte die Vorschau — jetzt nicht mehr', () => {
    // 128 kbit/s, also 16000 Byte/s. Eine Datei von 960000 Bytes ist 60 s lang.
    const { pfad } = mp3Datei('zulang.mp3', 9);
    const alteRechnung = Math.floor(960000 / 239); // duration_seconds = 239
    expect(alteRechnung).toBeLessThan(5000);       // rund 4016 Byte/s
    // 40 Sekunden ergaeben damit nur gut 10 Sekunden echten Ton.
    const neu = bytesProSekunde(pfad, 960000, 239);
    expect(neu.bytesProSekunde).toBe(16000);
    expect(neu.quelle).toBe('Dateikopf');
  });

  test('zu KLEINE Dauer haette den ganzen Song freigegeben — jetzt nicht mehr', () => {
    const { pfad } = mp3Datei('zukurz.mp3', 9);
    const alteRechnung = Math.floor(960000 / 5); // duration_seconds = 5
    expect(alteRechnung * 40).toBeGreaterThan(960000); // mehr als die ganze Datei
    const neu = bytesProSekunde(pfad, 960000, 5);
    expect(neu.bytesProSekunde * 40).toBeLessThan(960000);
  });
});

// ============================================================================
// Daraus laesst sich die Spieldauer ableiten
// ============================================================================
//
// Genau das macht der Upload jetzt, statt dem Browser zu glauben. In der
// Entwicklungsdatenbank stand bei einem vier Minuten langen Song
// duration_seconds = 3000, also 50 Minuten.
describe('Spieldauer aus Groesse und Rate', () => {
  test('MP3 mit 192 kbit/s: 5.760.000 Bytes sind 4 Minuten, nicht 50', () => {
    const { pfad } = mp3Datei('dauer192.mp3', 11); // Index 11 = 192 kbit/s
    const groesse = 5_760_000;
    const { bytesProSekunde: rate } = bytesProSekunde(pfad, groesse, 3000);
    expect(rate).toBe(24000);
    expect(Math.round(groesse / rate)).toBe(240);

    // Was der alte Weg daraus gemacht haette:
    const alteRate = Math.floor(groesse / 3000);
    expect(alteRate).toBe(1920);
    // 1920 Byte/s waeren 15,4 kbit/s - eine Bitrate, die es nicht gibt.
    expect((alteRate * 8) / 1000).toBeLessThan(16);
  });

  test('WAV: 46.079.840 Bytes sind 261 Sekunden, nicht 290', () => {
    const { pfad } = wavDatei('dauerwav.wav');
    const groesse = 46_079_840;
    const { bytesProSekunde: rate } = bytesProSekunde(pfad, groesse, 290);
    expect(rate).toBe(176400);
    expect(Math.round(groesse / rate)).toBe(261);
  });
});
