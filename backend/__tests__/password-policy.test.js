/**
 * Tests der Passwortregel (Issue #41).
 *
 * Die ersten beiden Fälle sind die Passwörter, die am laufenden Server
 * tatsächlich angenommen wurden und Konten angelegt haben. Sie stehen hier
 * an erster Stelle, damit ein Rückfall sofort auffällt.
 */

const {
  MIN_LAENGE,
  pruefePasswort,
  passwortValidator,
} = require('../utils/password-policy');

describe('Passwortregel', () => {
  describe('REGRESSION: was vorher durchkam, muss jetzt scheitern', () => {
    test('12345678 wird abgewiesen', () => {
      expect(pruefePasswort('12345678').length).toBeGreaterThan(0);
    });

    test('password123 wird abgewiesen', () => {
      expect(pruefePasswort('password123').length).toBeGreaterThan(0);
    });

    test('passwort123 wird abgewiesen', () => {
      expect(pruefePasswort('passwort123').length).toBeGreaterThan(0);
    });

    test('geheim123 wird abgewiesen', () => {
      expect(pruefePasswort('geheim123').length).toBeGreaterThan(0);
    });
  });

  describe('Mindestlänge', () => {
    test(`weniger als ${MIN_LAENGE} Zeichen wird abgewiesen`, () => {
      const probleme = pruefePasswort('Kurz1234567');
      expect(probleme.some((p) => p.includes('Mindestens'))).toBe(true);
    });

    test('genau die Mindestlänge genügt, wenn sonst nichts dagegen spricht', () => {
      expect(pruefePasswort('Xk7mQ2vRt9Lp')).toEqual([]);
    });

    test('die Meldung nennt die aktuelle Länge', () => {
      const probleme = pruefePasswort('abc');
      expect(probleme[0]).toContain('aktuell 3');
    });

    test('sehr lange Eingaben werden abgewiesen', () => {
      expect(pruefePasswort('a'.repeat(500)).length).toBeGreaterThan(0);
    });
  });

  describe('häufige Passwörter und Wortstämme', () => {
    test.each([
      'passwortpasswort',
      'PasswortPasswort',
      'passwort1234',
      'password2026',
      'sonnenschein1',
      'ichliebedich99',
      'qwertzuiopas',
      'songnexus2026',
    ])('%s wird abgewiesen', (pw) => {
      expect(pruefePasswort(pw).length).toBeGreaterThan(0);
    });

    test('Umlaute helfen nicht beim Umgehen', () => {
      // passwoert -> normalisiert passwoert, Stamm passwoert. Die
      // Normalisierung soll verhindern, dass ae/oe/ue als Umgehung wirken.
      expect(pruefePasswort('Paßwort12345').length).toBeGreaterThan(0);
    });
  });

  describe('einfache Muster', () => {
    test('nur Zahlen wird abgewiesen', () => {
      const probleme = pruefePasswort('849205718364');
      expect(probleme.some((p) => p.includes('Zahlen'))).toBe(true);
    });

    test('ein wiederholtes Zeichen wird abgewiesen', () => {
      const probleme = pruefePasswort('aaaaaaaaaaaaaa');
      expect(probleme.some((p) => p.includes('verschiedene'))).toBe(true);
    });

    test('fortlaufende Buchstabenfolge wird abgewiesen', () => {
      const probleme = pruefePasswort('abcdefghijkl');
      expect(probleme.some((p) => p.includes('fortlaufende'))).toBe(true);
    });

    test('fortlaufende Zahlenfolge wird abgewiesen', () => {
      expect(pruefePasswort('123456789012').length).toBeGreaterThan(0);
    });
  });

  describe('Benutzername und E-Mail im Passwort', () => {
    test('Benutzername im Passwort wird abgewiesen', () => {
      const probleme = pruefePasswort('sebastian-x7Qm', { username: 'sebastian' });
      expect(probleme.some((p) => p.includes('Benutzernamen'))).toBe(true);
    });

    test('E-Mail-Bestandteil im Passwort wird abgewiesen', () => {
      const probleme = pruefePasswort('waschtl-9KpZm', { email: 'waschtl@example.org' });
      expect(probleme.some((p) => p.includes('Benutzernamen'))).toBe(true);
    });

    test('Groß- und Kleinschreibung schützt nicht davor', () => {
      const probleme = pruefePasswort('SEBASTIAN-x7Qm', { username: 'sebastian' });
      expect(probleme.length).toBeGreaterThan(0);
    });

    test('sehr kurze Benutzernamen lösen nichts aus', () => {
      // 'ab' ist zu kurz, um als sinnvoller Bestandteil zu gelten -
      // sonst scheitert jedes Passwort, das zufaellig 'ab' enthaelt.
      expect(pruefePasswort('abXk7mQ2vRt9Lp', { username: 'ab' })).toEqual([]);
    });
  });

  describe('gute Passwörter werden angenommen', () => {
    test.each([
      'Xk7mQ2vRt9Lp',
      'korrekt-pferd-batterie-heftklammer',
      'M3tal-Riff-In-Dm-2026',
      'ZwoelfZeichen!',
    ])('%s ist in Ordnung', (pw) => {
      expect(pruefePasswort(pw)).toEqual([]);
    });
  });

  describe('leere und ungültige Eingaben', () => {
    test.each([['', 'leer'], [null, 'null'], [undefined, 'undefined'], [12345678901234, 'Zahl']])(
      '%s wird abgewiesen (%s)',
      (wert) => {
        expect(pruefePasswort(wert).length).toBeGreaterThan(0);
      }
    );
  });

  describe('Anbindung an express-validator', () => {
    test('wirft bei schwachem Passwort', () => {
      const pruefer = passwortValidator();
      expect(() =>
        pruefer('password123', { req: { body: {} } })
      ).toThrow();
    });

    test('gibt true bei gutem Passwort', () => {
      const pruefer = passwortValidator();
      expect(pruefer('Xk7mQ2vRt9Lp', { req: { body: {} } })).toBe(true);
    });

    test('berücksichtigt den Benutzernamen aus dem Anfragekörper', () => {
      const pruefer = passwortValidator();
      expect(() =>
        pruefer('sebastian-x7Qm', { req: { body: { username: 'sebastian' } } })
      ).toThrow(/Benutzernamen/);
    });

    test('verträgt einen fehlenden Anfragekörper', () => {
      const pruefer = passwortValidator();
      expect(pruefer('Xk7mQ2vRt9Lp', { req: {} })).toBe(true);
    });
  });
});
