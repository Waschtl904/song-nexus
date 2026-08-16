/**
 * Tests der Herkunftsnachweis-Route (Issue #80).
 *
 * Die Sicherheitsfälle stehen vorn: die Route beschreibt ein Beweismittel.
 * Wer sie ohne Adminrechte erreicht oder den Hashwert selbst setzen kann,
 * macht den Nachweis wertlos.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../db', () => {
  const client = { query: jest.fn(), release: jest.fn() };
  return {
    pool: { query: jest.fn(), connect: jest.fn().mockResolvedValue(client) },
    _client: client,
  };
});

const { pool, _client } = require('../db');
const { textHash } = require('../utils/herkunftsnachweis');

function baueApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/herkunft', require('../routes/admin-herkunft'));
  return app;
}

function token({ id = 1, role = 'admin' } = {}) {
  return jwt.sign({ id, role, username: 'chef' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const TEXT =
  'Wahrheit ist sein stetes Regen, Güte strahlt aus seinem Herz,\n' +
  'sterben würd er meinetwegen, in Freud und Streit, April bis März.';

function gueltigerKoerper(aenderungen = {}) {
  return {
    text_original: TEXT,
    text_sprache: 'de',
    text_erstellt_frueheste: '2010-01-01',
    text_erstellt_spaeteste: '2011-12-31',
    text_ist_eigenes_werk: true,
    musik_dienst: 'suno',
    musik_erzeugt_am: '2026-08-16',
    musik_agb_fassung: '2026-08',
    ...aenderungen,
  };
}

/**
 * Antwortet je nach Abfragetext. Robuster als eine Reihenfolge von Rückgaben —
 * sonst bricht jeder Test, sobald eine Abfrage dazukommt.
 */
function dbAntwortet({ adminRolle = 'admin', adminAktiv = true, titelDa = true, nachweisDa = false } = {}) {
  const beantworte = (sql) => {
    if (/FROM users WHERE id/.test(sql)) {
      return { rowCount: 1, rows: [{ role: adminRolle, is_active: adminAktiv }] };
    }
    if (/FROM tracks WHERE id/.test(sql)) {
      return titelDa
        ? { rowCount: 1, rows: [{ id: 7, name: 'Der Freund', artist: 'W' }] }
        : { rowCount: 0, rows: [] };
    }
    if (/FROM track_provenance_verlauf/.test(sql)) {
      return { rowCount: 1, rows: [{ id: 3, vorgang: 'aendern', geschehen_am: 'x', geaendert_von: 1 }] };
    }
    if (/FROM track_provenance/.test(sql)) {
      return nachweisDa
        ? { rowCount: 1, rows: [{ track_id: 7, text_sha256: 'a'.repeat(64) }] }
        : { rowCount: 0, rows: [] };
    }
    if (/INSERT INTO public\.track_provenance/.test(sql)) {
      return { rowCount: 1, rows: [{ track_id: 7, text_sha256: textHash(TEXT) }] };
    }
    return { rowCount: 0, rows: [] };
  };

  pool.query.mockImplementation((sql) => Promise.resolve(beantworte(sql)));
  _client.query.mockImplementation((sql) => Promise.resolve(beantworte(sql)));
}

const hole = (pfad, t) => request(baueApp()).get(pfad).set('Authorization', `Bearer ${t}`);
const setze = (pfad, t, koerper) =>
  request(baueApp()).put(pfad).set('Authorization', `Bearer ${t}`).send(koerper);

beforeEach(() => {
  pool.query.mockReset();
  _client.query.mockReset();
  _client.release.mockReset();
  pool.connect.mockClear();
});

// ============================================================================
describe('SICHERHEIT', () => {
  test('ohne Token: 401', async () => {
    dbAntwortet();
    const r = await request(baueApp()).get('/api/admin/herkunft/7');
    expect(r.status).toBe(401);
  });

  test('Token sagt admin, Datenbank sagt user: 403 beim Lesen', async () => {
    dbAntwortet({ adminRolle: 'user' });
    const r = await hole('/api/admin/herkunft/7', token({ role: 'admin' }));
    expect(r.status).toBe(403);
  });

  test('Token sagt admin, Datenbank sagt user: 403 beim Schreiben', async () => {
    dbAntwortet({ adminRolle: 'user' });
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper());
    expect(r.status).toBe(403);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('deaktivierter Admin: 403', async () => {
    dbAntwortet({ adminAktiv: false });
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper());
    expect(r.status).toBe(403);
  });

  test('ein mitgesendeter Hashwert wird abgewiesen', async () => {
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper({ text_sha256: 'f'.repeat(64) }));
    expect(r.status).toBe(400);
    expect(r.body.fehler.join(' ')).toMatch(/text_sha256/);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('ein mitgesendetes erfasst_von wird abgewiesen', async () => {
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper({ erfasst_von: 99 }));
    expect(r.status).toBe(400);
    expect(r.body.fehler.join(' ')).toMatch(/erfasst_von/);
  });

  test('der Hashwert im Datensatz stammt vom Server', async () => {
    dbAntwortet();
    await setze('/api/admin/herkunft/7', token(), gueltigerKoerper());
    const einfuegen = _client.query.mock.calls.find(([sql]) => /INSERT INTO public\.track_provenance/.test(sql));
    expect(einfuegen).toBeDefined();
    expect(einfuegen[1]).toContain(textHash(TEXT));
  });

  test('erfasst_von kommt aus dem Token', async () => {
    dbAntwortet();
    await setze('/api/admin/herkunft/7', token({ id: 4 }), gueltigerKoerper());
    const einfuegen = _client.query.mock.calls.find(([sql]) => /INSERT INTO public\.track_provenance/.test(sql));
    expect(einfuegen[1]).toContain(4);
  });
});

// ============================================================================
describe('Der Pfad ist maßgeblich', () => {
  test('abweichende Titelkennung im Körper: 400', async () => {
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper({ track_id: 9 }));
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('TRACK_ID_MISMATCH');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('gleiche Titelkennung im Körper ist erlaubt', async () => {
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper({ track_id: 7 }));
    expect(r.status).toBe(200);
  });

  test('unbrauchbare Titelkennung im Pfad: 400', async () => {
    dbAntwortet();
    for (const schlecht of ['abc', '0', '-1', '1.5', '7x']) {
      const r = await hole(`/api/admin/herkunft/${schlecht}`, token());
      expect(r.status).toBe(400);
    }
  });
});

// ============================================================================
describe('Lesen', () => {
  test('unbekannter Titel: 404', async () => {
    dbAntwortet({ titelDa: false });
    const r = await hole('/api/admin/herkunft/7', token());
    expect(r.status).toBe(404);
    expect(r.body.code).toBe('TRACK_NOT_FOUND');
  });

  test('ohne Nachweis: herkunft ist null, nicht ein leeres Objekt', async () => {
    dbAntwortet({ nachweisDa: false });
    const r = await hole('/api/admin/herkunft/7', token());
    expect(r.status).toBe(200);
    expect(r.body.herkunft).toBeNull();
    expect(r.body.track.name).toBe('Der Freund');
  });

  test('mit Nachweis: herkunft und Verlauf werden geliefert', async () => {
    dbAntwortet({ nachweisDa: true });
    const r = await hole('/api/admin/herkunft/7', token());
    expect(r.body.herkunft.track_id).toBe(7);
    expect(Array.isArray(r.body.verlauf)).toBe(true);
  });

  test('Vorgaben für die Eingabemaske', async () => {
    dbAntwortet();
    const r = await hole('/api/admin/herkunft/vorgaben', token());
    expect(r.status).toBe(200);
    expect(r.body.dienste).toContain('suno');
    expect(typeof r.body.min_text_laenge).toBe('number');
  });
});

// ============================================================================
describe('Schreiben', () => {
  test('gültige Angaben: 200', async () => {
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper());
    expect(r.status).toBe(200);
    expect(r.body.erfolg).toBe(true);
  });

  test('der Gedichtfall von 2010 bis 2011 geht durch', async () => {
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper({
      text_erstellt_frueheste: '2010-01-01',
      text_erstellt_spaeteste: '2011-12-31',
      musik_erzeugt_am: '2026-08-16',
    }));
    expect(r.status).toBe(200);
  });

  test('Text nach der Musik: 400', async () => {
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper({
      text_erstellt_frueheste: '2026-08-17',
      text_erstellt_spaeteste: '2026-08-17',
      musik_erzeugt_am: '2026-08-16',
    }));
    expect(r.status).toBe(400);
  });

  test('unbekannter Titel: 404, ohne Schreibversuch', async () => {
    dbAntwortet({ titelDa: false });
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper());
    expect(r.status).toBe(404);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('leerer Anfragekörper: 400 und keine Verbindung', async () => {
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), {});
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('EMPTY_BODY');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('nur die Titelkennung im Körper genügt nicht', async () => {
    // Die Prueffunktion laesst das durch, weil ein Nachweis ohne Angaben formal
    // nicht falsch ist. Die Route muss es abweisen, sonst leert ein
    // versehentliches PUT einen bestehenden Nachweis.
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), { track_id: 7 });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('EMPTY_BODY');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('eine einzige inhaltliche Angabe genügt', async () => {
    dbAntwortet();
    const r = await setze('/api/admin/herkunft/7', token(), { notiz: 'nur eine Notiz' });
    expect(r.status).toBe(200);
  });
});

// ============================================================================
describe('Verlauf und Transaktion', () => {
  test('app.benutzer_id wird für den Trigger gesetzt', async () => {
    dbAntwortet();
    await setze('/api/admin/herkunft/7', token({ id: 4 }), gueltigerKoerper());
    const setzen = _client.query.mock.calls.find(([sql]) => /set_config/.test(sql));
    expect(setzen).toBeDefined();
    expect(setzen[1]).toEqual(['app.benutzer_id', '4']);
  });

  test('BEGIN und COMMIT umschließen den Schreibvorgang', async () => {
    dbAntwortet();
    await setze('/api/admin/herkunft/7', token(), gueltigerKoerper());
    const befehle = _client.query.mock.calls.map(([sql]) => sql);
    expect(befehle[0]).toBe('BEGIN');
    expect(befehle[befehle.length - 1]).toBe('COMMIT');
  });

  test('bei einem Fehler wird zurückgerollt und die Verbindung freigegeben', async () => {
    dbAntwortet();
    _client.query.mockImplementation((sql) => {
      if (/INSERT INTO public\.track_provenance/.test(sql)) {
        return Promise.reject(new Error('Platte voll'));
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper());
    expect(r.status).toBe(500);
    expect(_client.query.mock.calls.map(([s]) => s)).toContain('ROLLBACK');
    expect(_client.release).toHaveBeenCalled();
  });

  test('die Verbindung wird auch im Erfolgsfall freigegeben', async () => {
    dbAntwortet();
    await setze('/api/admin/herkunft/7', token(), gueltigerKoerper());
    expect(_client.release).toHaveBeenCalledTimes(1);
  });

  test('eine verletzte Pruefbedingung der Datenbank ergibt 400, nicht 500', async () => {
    dbAntwortet();
    _client.query.mockImplementation((sql) => {
      if (/INSERT INTO public\.track_provenance/.test(sql)) {
        const err = new Error('verletzt');
        err.code = '23514';
        err.constraint = 'track_provenance_reihenfolge';
        return Promise.reject(err);
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });
    const r = await setze('/api/admin/herkunft/7', token(), gueltigerKoerper());
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('DB_CONSTRAINT');
    expect(r.body.bedingung).toBe('track_provenance_reihenfolge');
  });
});
