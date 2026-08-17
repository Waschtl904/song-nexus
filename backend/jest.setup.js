/**
 * Jest Global Setup / Teardown
 *
 * 1. Schliesst den DB-Pool nach allen Tests.
 *    Verhindert dass Jest haengt (--detectOpenHandles).
 *
 * 2. Stattet jeden supertest-Request mit einem Herkunftsnachweis aus.
 *    Seit Issue #86 prueft requireTrustedSource jede unsichere Methode
 *    (POST/PUT/PATCH/DELETE) unter /api/ auf Sec-Fetch-Site, Origin oder
 *    Referer. supertest sendet von sich aus keinen dieser Header und wuerde
 *    daher pauschal 403 CSRF_NO_SOURCE bekommen, noch bevor die eigentliche
 *    Routenlogik erreicht wird.
 *
 *    Der Standardwert entspricht dem in app.js erlaubten Origin. Setzt ein
 *    Test selbst einen Origin-, Referer- oder Sec-Fetch-Site-Header, bleibt
 *    dieser unangetastet - Tests, die eine fremde Herkunft pruefen wollen,
 *    funktionieren also weiterhin.
 *
 *    Die Middleware selbst wird davon nicht entwertet: sie hat ihre eigene
 *    Unit-Suite in middleware/request-source-middleware.test.js, die mit
 *    kuenstlichen req-Objekten arbeitet und supertest nicht benutzt.
 *
 * Bis Issue #86: hier stand zusaetzlich clearInterval(cleanupInterval) fuer
 * das Cleanup-Interval aus middleware/csrf-middleware.js. Die Datei ist mit
 * #86 entfernt worden, requireTrustedSource hat kein eigenes Interval.
 */

const { pool } = require('./db');

// Muss mit dem Origin in app.js (requireTrustedSource([...])) uebereinstimmen.
const TEST_ORIGIN = process.env.TEST_ORIGIN || 'https://localhost:5500';

const supertest = require('supertest');
const Test = supertest.Test;
const urspruenglichesEnd = Test.prototype.end;

Test.prototype.end = function (fn) {
  // WICHTIG: this._header lesen, nicht this.request().getHeader(...).
  // request() erzeugt das ClientRequest-Objekt; ein danach gesetzter Header
  // landet nur noch in _header und wird nicht mehr mitgesendet.
  const bereitsGesetzt = ['origin', 'referer', 'sec-fetch-site'].some(
    (h) => this._header && this._header[h] !== undefined
  );

  if (!bereitsGesetzt) {
    this.set('Origin', TEST_ORIGIN);
  }

  return urspruenglichesEnd.call(this, fn);
};

afterAll(async () => {
  await pool.end();
});
