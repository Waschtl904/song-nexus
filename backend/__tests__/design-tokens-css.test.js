/**
 * ===========================================================================
 * design-tokens-css - Regression zu Issue #67
 * ===========================================================================
 *
 * Der Aufbau verwendete '\\n' statt '\n'. Ergebnis: eine einzige Zeile mit
 * literalen Backslash-n-Folgen. Weil \n in CSS die Escape-Sequenz fuer den
 * Buchstaben n ist, wurde der erste Eigenschaftsname zu "n  --color-primary"
 * und damit ungueltig - ein Parser fand null Deklarationen.
 *
 * Ein Test auf "Datei wurde geschrieben" haette das nicht gefunden. Diese
 * Suite prueft deshalb den INHALT: echte Zeilenumbrueche, keine literalen
 * Escape-Folgen, und jede Zeile eine gueltige Deklaration.
 *
 * Kein CSS-Parser als Abhaengigkeit - die Pruefung kommt mit regulaeren
 * Ausdruecken aus und haelt package.json unveraendert.
 * ===========================================================================
 */

const { cssAusDatenbanksatz, ZUORDNUNG } = require('../utils/design-tokens-css');

const SATZ = {
  id: 1,
  is_active: true,
  color_primary: '#00ffcc',
  color_secondary: '#5E5240',
  color_text_primary: '#e0fff8',
  color_background: '#05080d',
  font_family_base: '"JetBrains Mono", monospace',
  font_size_base: 16,
  spacing_unit: 8,
  border_radius: 6,
  button_padding: '8px 16px',
};

describe('REGRESSION #67: echte Zeilenumbrueche statt literalem \\n', () => {
  const css = cssAusDatenbanksatz(SATZ);

  test('enthaelt keine literale Backslash-n-Folge', () => {
    // Genau das stand vorher in der Datei.
    expect(css).not.toMatch(/\\n/);
  });

  test('enthaelt echte Zeilenumbrueche', () => {
    const umbrueche = (css.match(/\n/g) || []).length;

    // :root { + eine Zeile je gesetztem Wert + } + Abschluss
    expect(umbrueche).toBeGreaterThan(5);
  });

  test('beginnt mit :root { auf einer eigenen Zeile', () => {
    expect(css.split('\n')[0]).toBe(':root {');
  });

  test('endet mit } und einem abschliessenden Umbruch', () => {
    expect(css.endsWith('}\n')).toBe(true);
  });
});

describe('Jede Zeile ist eine gueltige CSS-Deklaration', () => {
  const css = cssAusDatenbanksatz(SATZ);
  const inhalt = css.split('\n').slice(1, -2); // ohne :root {, } und Leerzeile

  test('es gibt ueberhaupt Deklarationszeilen', () => {
    // Schutz gegen den Fall, dass alles leer ist und die Pruefungen
    // darunter trivial gruen werden.
    expect(inhalt.length).toBeGreaterThan(5);
  });

  test.each([['Eigenschaftsname beginnt mit --', /^ {2}--[a-z0-9-]+: /]])(
    '%s',
    (_name, muster) => {
      for (const zeile of inhalt) {
        expect(zeile).toMatch(muster);
      }
    }
  );

  test('jede Zeile endet mit Semikolon', () => {
    for (const zeile of inhalt) {
      expect(zeile.endsWith(';')).toBe(true);
    }
  });

  test('kein Eigenschaftsname beginnt mit n - der alte Fehler', () => {
    // Bei literalem \n wurde aus "  --color-primary" der Name
    // "n  --color-primary". Diese Pruefung faengt genau das.
    for (const zeile of inhalt) {
      expect(zeile).not.toMatch(/^n/);
    }
  });
});

describe('Werte und Einheiten', () => {
  const css = cssAusDatenbanksatz(SATZ);

  test('Farben werden unveraendert uebernommen', () => {
    expect(css).toContain('  --color-primary: #00ffcc;');
  });

  test('px wird angehaengt, wo es hingehoert', () => {
    expect(css).toContain('  --font-size-base: 16px;');
    expect(css).toContain('  --space-8: 8px;');
    expect(css).toContain('  --radius-base: 6px;');
  });

  test('px wird NICHT an Werte angehaengt, die schon eine Einheit haben', () => {
    expect(css).toContain('  --button-primary-padding: 8px 16px;');
    expect(css).not.toMatch(/--button-primary-padding: 8px 16pxpx/);
  });

  test('Schriftfamilie mit Anfuehrungszeichen bleibt erhalten', () => {
    expect(css).toContain('  --font-family-base: "JetBrains Mono", monospace;');
  });
});

describe('Fehlende und unbrauchbare Eingaben', () => {
  test('ein leerer Satz ergibt gueltiges, leeres CSS', () => {
    expect(cssAusDatenbanksatz({})).toBe(':root {\n}\n');
  });

  test('undefined stuerzt nicht ab', () => {
    expect(() => cssAusDatenbanksatz(undefined)).not.toThrow();
    expect(cssAusDatenbanksatz(undefined)).toBe(':root {\n}\n');
  });

  test('null stuerzt nicht ab', () => {
    expect(() => cssAusDatenbanksatz(null)).not.toThrow();
  });

  test('nicht gesetzte Spalten erzeugen keine Zeile', () => {
    const css = cssAusDatenbanksatz({ color_primary: '#fff' });

    expect(css).toContain('--color-primary');
    expect(css).not.toContain('--color-secondary');
  });

  test('DOKUMENTIERT: 0 wird uebersprungen, auch wo es gueltig waere', () => {
    // Bestehende Eigenheit, aus der urspruenglichen Fassung uebernommen
    // und in #67 bewusst NICHT stillschweigend geaendert: die Pruefung ist
    // falsy, nicht "ist gesetzt". border_radius: 0 faellt damit heraus,
    // obwohl 0 ein gueltiger Radius ist.
    const css = cssAusDatenbanksatz({ border_radius: 0 });

    expect(css).not.toContain('--radius-base');
  });
});

describe('Zuordnungstabelle', () => {
  test('jede Spalte kommt nur einmal vor', () => {
    const spalten = ZUORDNUNG.map(([s]) => s);

    expect(new Set(spalten).size).toBe(spalten.length);
  });

  test('jede CSS-Variable kommt nur einmal vor', () => {
    const variablen = ZUORDNUNG.map(([, v]) => v);

    expect(new Set(variablen).size).toBe(variablen.length);
  });

  test('alle Variablennamen beginnen mit --', () => {
    for (const [, variable] of ZUORDNUNG) {
      expect(variable).toMatch(/^--/);
    }
  });
});
