/**
 * Tests der Adminprüfung (Issue #24).
 *
 * Der erste Test ist genau der Fall, der am laufenden Code nachgestellt wurde:
 * ein gültig signiertes Token mit role='admin' für einen Benutzer, der in der
 * Datenbank role='user' und is_active=false hat. Vor der Behebung ergab das
 * HTTP 200 und die Protokollzeile "Admin 5 verified".
 *
 * Er steht deshalb an erster Stelle: fällt er je wieder um, ist die Lücke
 * zurück.
 */

// --- ENV ZUERST (vor jedem require) ---
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../db', () => ({
  pool: { query: jest.fn() },
}));

const { pool } = require('../db');
const {
  verifyToken,
  requireAdmin,
  istAdmin,
} = require('../middleware/auth-middleware');

/** Eine kleine Anwendung mit genau einer Adminroute. */
function baueApp() {
  const app = express();
  app.get('/admin/geheim', verifyToken, requireAdmin, (req, res) =>
    res.json({ zugriff: 'gewaehrt', rolle: req.user.role })
  );
  return app;
}

/** Ein echtes, gültig signiertes Token. Die Signatur ist nie das Problem. */
function token({ id = 5, role = 'admin' } = {}) {
  return jwt.sign({ id, role, username: 'test' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

/** Was die Datenbank antworten soll. */
function dbSagt(zeile) {
  pool.query.mockResolvedValue(
    zeile === null ? { rowCount: 0, rows: [] } : { rowCount: 1, rows: [zeile] }
  );
}

const hole = (t) =>
  request(baueApp()).get('/admin/geheim').set('Authorization', `Bearer ${t}`);

beforeEach(() => {
  pool.query.mockReset();
});

describe('Adminprüfung gegen die Datenbank', () => {
  // ==========================================================================
  describe('REGRESSION: der nachgestellte Fall', () => {
    test('Token sagt admin, Datenbank sagt user und deaktiviert → 403', async () => {
      dbSagt({ role: 'user', is_active: false });
      const r = await hole(token({ id: 5, role: 'admin' }));
      expect(r.status).toBe(403);
      expect(r.body.zugriff).toBeUndefined();
    });

    test('die Datenbank wird dabei wirklich befragt', async () => {
      dbSagt({ role: 'user', is_active: false });
      await hole(token({ id: 5 }));
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query.mock.calls[0][0]).toMatch(/SELECT role, is_active FROM users WHERE id = \$1/);
      expect(pool.query.mock.calls[0][1]).toEqual([5]);
    });
  });

  // ==========================================================================
  describe('Rollen-Degradierung wirkt ohne erneuten Login', () => {
    test('Token sagt admin, Datenbank sagt user → 403 mit ADMIN_REQUIRED', async () => {
      dbSagt({ role: 'user', is_active: true });
      const r = await hole(token({ role: 'admin' }));
      expect(r.status).toBe(403);
      expect(r.body.code).toBe('ADMIN_REQUIRED');
    });

    test('umgekehrt genauso: Token sagt user, Datenbank sagt admin → 200', async () => {
      // Die Gegenprobe. Wer befördert wird, muss sich nicht neu anmelden —
      // und die Route sieht die AKTUELLE Rolle, nicht die aus dem Token.
      dbSagt({ role: 'admin', is_active: true });
      const r = await hole(token({ role: 'user' }));
      expect(r.status).toBe(200);
      expect(r.body.rolle).toBe('admin');
    });
  });

  // ==========================================================================
  describe('Deaktivierte und gelöschte Konten', () => {
    test('Admin, aber deaktiviert → 403 mit ACCOUNT_DISABLED', async () => {
      dbSagt({ role: 'admin', is_active: false });
      const r = await hole(token());
      expect(r.status).toBe(403);
      expect(r.body.code).toBe('ACCOUNT_DISABLED');
    });

    test('is_active ist NULL → gilt als nicht aktiv', async () => {
      dbSagt({ role: 'admin', is_active: null });
      const r = await hole(token());
      expect(r.status).toBe(403);
      expect(r.body.code).toBe('ACCOUNT_DISABLED');
    });

    test('Benutzerzeile existiert nicht mehr → 403 mit ACCOUNT_UNKNOWN', async () => {
      dbSagt(null);
      const r = await hole(token());
      expect(r.status).toBe(403);
      expect(r.body.code).toBe('ACCOUNT_UNKNOWN');
    });
  });

  // ==========================================================================
  describe('Der zulässige Fall', () => {
    test('Admin und aktiv → 200', async () => {
      dbSagt({ role: 'admin', is_active: true });
      const r = await hole(token());
      expect(r.status).toBe(200);
      expect(r.body.zugriff).toBe('gewaehrt');
    });
  });

  // ==========================================================================
  describe('FAIL CLOSED: Störung der Datenbank', () => {
    test('Datenbankfehler → 503, nicht 200', async () => {
      pool.query.mockRejectedValue(new Error('Verbindung verloren'));
      const r = await hole(token());
      expect(r.status).toBe(503);
      expect(r.body.code).toBe('AUTHORIZATION_UNAVAILABLE');
    });

    test('bei Störung wird die Route nicht erreicht', async () => {
      pool.query.mockRejectedValue(new Error('Verbindung verloren'));
      const r = await hole(token());
      expect(r.body.zugriff).toBeUndefined();
    });
  });

  // ==========================================================================
  describe('Unbrauchbare Token', () => {
    test('kein Token → 401', async () => {
      const r = await request(baueApp()).get('/admin/geheim');
      expect(r.status).toBe(401);
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('falsch signiert → 403, ohne Datenbankabfrage', async () => {
      const fremd = jwt.sign({ id: 5, role: 'admin' }, 'ein-ganz-anderes-geheimnis');
      const r = await hole(fremd);
      expect(r.status).toBe(403);
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('Token ohne Benutzerkennung → 401, ohne Datenbankabfrage', async () => {
      const ohneId = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
      const r = await hole(ohneId);
      expect(r.status).toBe(401);
      expect(r.body.code).toBe('NO_USER_ID');
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('Benutzerkennung als Zeichenkette → 401, ohne Datenbankabfrage', async () => {
      // Sonst landet '5' als Parameter in der Abfrage und PostgreSQL muss es
      // richten. Eine Rechtepruefung soll nicht auf Typumwandlung hoffen.
      const r = await hole(token({ id: '5' }));
      expect(r.status).toBe(401);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
describe('istAdmin als Wahrheitswert', () => {
  beforeEach(() => pool.query.mockReset());

  test('aktiver Admin → true', async () => {
    dbSagt({ role: 'admin', is_active: true });
    await expect(istAdmin(5)).resolves.toBe(true);
  });

  test('aktiver Nicht-Admin → false', async () => {
    dbSagt({ role: 'user', is_active: true });
    await expect(istAdmin(5)).resolves.toBe(false);
  });

  test('deaktivierter Admin → false', async () => {
    dbSagt({ role: 'admin', is_active: false });
    await expect(istAdmin(5)).resolves.toBe(false);
  });

  test('unbekannter Benutzer → false', async () => {
    dbSagt(null);
    await expect(istAdmin(5)).resolves.toBe(false);
  });

  test('Datenbankfehler → false und kein Wurf', async () => {
    pool.query.mockRejectedValue(new Error('Verbindung verloren'));
    await expect(istAdmin(5)).resolves.toBe(false);
  });

  test('unbrauchbare Kennungen → false, ohne Datenbankabfrage', async () => {
    for (const wert of [0, -1, 1.5, '5', null, undefined, NaN]) {
      await expect(istAdmin(wert)).resolves.toBe(false);
    }
    expect(pool.query).not.toHaveBeenCalled();
  });
});
