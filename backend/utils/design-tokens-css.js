/**
 * ===========================================================================
 * design-tokens-css.js - CSS aus einem Datenbanksatz der Tabelle design_system
 * ===========================================================================
 *
 * Herausgeloest aus regenerateDesignTokens() in server.js (Issue #67).
 *
 * WARUM ALS EIGENES MODUL
 *
 * Der Fehler, der hier behoben wird, hat monatelang ueberlebt, weil er nicht
 * pruefbar war: die Funktion stand mitten in server.js, und server.js laesst
 * sich in einem Test nicht laden - es baut beim Import eine Datenbank-
 * verbindung auf und startet einen Listener (siehe #47).
 *
 * Der CSS-Aufbau ist aber eine reine Funktion: Datensatz rein, Zeichenkette
 * raus, kein Dateisystem, keine Datenbank. Als eigenes Modul ist er in einem
 * Test in Millisekunden geprueft. Das Schreiben der Datei bleibt in
 * server.js.
 *
 * WAS FALSCH WAR
 *
 * Der Aufbau verwendete '\\n' statt '\n'. In JavaScript ist '\\n' ein
 * Backslash gefolgt von n, kein Zeilenumbruch. Die erzeugte Datei bestand
 * damit aus einer einzigen Zeile mit literalen \n-Folgen.
 *
 * In CSS ist \n eine Escape-Sequenz fuer den Buchstaben n. Der erste
 * Eigenschaftsname wurde dadurch zu "n  --color-primary" und war ungueltig.
 * Ein Parser fand null Deklarationen. Jede Designaenderung ueber die
 * Admin-Oberflaeche sah nach Erfolg aus und hatte keine Wirkung.
 * ===========================================================================
 */

/**
 * Zuordnung Datenbankspalte -> CSS-Variable.
 *
 * Als Tabelle statt als Folge von if-Zeilen, damit ein Test die Abdeckung
 * pruefen kann, ohne den Aufbau nachzubilden.
 *
 * einheit: wird an den Wert angehaengt, wenn gesetzt.
 */
const ZUORDNUNG = [
  ['color_primary', '--color-primary'],
  ['color_secondary', '--color-secondary'],
  ['color_accent_teal', '--color-accent-teal'],
  ['color_accent_green', '--color-accent-green'],
  ['color_accent_red', '--color-accent-red'],
  ['color_text_primary', '--color-text-primary'],
  ['color_background', '--color-background'],

  ['font_family_base', '--font-family-base'],
  ['font_size_base', '--font-size-base', 'px'],
  ['font_weight_normal', '--font-weight-normal'],
  ['font_weight_bold', '--font-weight-bold'],

  ['spacing_unit', '--space-8', 'px'],
  ['border_radius', '--radius-base', 'px'],

  ['button_background_color', '--button-primary-background'],
  ['button_text_color', '--button-primary-text-color'],
  ['button_border_radius', '--button-primary-border-radius', 'px'],
  ['button_padding', '--button-primary-padding'],
];

/**
 * Baut den Inhalt von _design-tokens.css aus einem Datenbanksatz.
 *
 * @param {object} dbRow Zeile aus der Tabelle design_system
 * @returns {string} vollstaendiges CSS mit echten Zeilenumbruechen
 */
function cssAusDatenbanksatz(dbRow) {
  const zeilen = [':root {'];

  for (const [spalte, variable, einheit] of ZUORDNUNG) {
    const wert = dbRow ? dbRow[spalte] : undefined;

    // Bewusst wie zuvor: falsy wird uebersprungen. Damit fallen auch 0 und
    // der leere String heraus. Bei Spalten wie border_radius waere 0 ein
    // gueltiger Wert - das ist eine bestehende Eigenheit, die hier nicht
    // stillschweigend geaendert wird. Siehe Hinweis in #67.
    if (!wert) continue;

    zeilen.push(`  ${variable}: ${wert}${einheit || ''};`);
  }

  zeilen.push('}');

  // Echte Zeilenumbrueche. Genau hier lag der Fehler.
  return zeilen.join('\n') + '\n';
}

module.exports = { cssAusDatenbanksatz, ZUORDNUNG };
