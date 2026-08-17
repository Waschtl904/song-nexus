/* ============================================================================
   SONG-NEXUS — NEXUS FX
   Code-Regen, Mathe-Ornamente, Hero-Terminal, Eastereggs.

   Regeln:
   - Reines Add-on. Faellt etwas aus, bleibt die Seite voll benutzbar.
   - Keine Inline-Scripts, CSP-konform als externe Datei geladen.
   - Respektiert prefers-reduced-motion und pausiert im Hintergrund-Tab.
   ============================================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --------------------------------------------------------------------------
     1. MATRIX-CODE-REGEN
     -------------------------------------------------------------------------- */
  const CodeRain = (function () {
    const GLYPHS_BASE =
      'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロン' +
      '01{}[]()<>=+-*/%;:&|!?#$_ζπφΣΠ∇∂∮∞≠≡⊕⊗√∫λμσω';
    const GLYPHS_PRIME = '2357111317192329313741434753596167717379838997ζ∎⊕';

    let canvas, ctx, columns, drops, glyphs = GLYPHS_BASE;
    let raf = null, last = 0, fontSize = 15, running = false;

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = window.innerWidth < 700 ? 13 : 15;
      columns = Math.ceil(window.innerWidth / fontSize);
      drops = new Array(columns);
      const rows = window.innerHeight / fontSize;
      for (let i = 0; i < columns; i++) {
        // Start ueber die ganze Hoehe verteilt, damit der Regen sofort steht
        drops[i] = Math.random() * rows * 1.4 - rows * 0.4;
      }
    }

    function frame(now) {
      raf = window.requestAnimationFrame(frame);
      if (now - last < 55) return;          // ca. 18 fps, sehr sparsam
      last = now;

      ctx.fillStyle = 'rgba(2, 5, 12, 0.16)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.font = fontSize + 'px "JetBrains Mono", monospace';
      ctx.textBaseline = 'top';

      for (let i = 0; i < columns; i++) {
        const ch = glyphs.charAt(Math.floor(Math.random() * glyphs.length));
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Kopf der Spur hell, Rest gedaempft — Cyan mit Violet-Einstreuung
        if (Math.random() > 0.972) {
          ctx.fillStyle = 'rgba(215, 255, 246, 0.95)';
        } else if (i % 7 === 0) {
          ctx.fillStyle = 'rgba(139, 92, 246, 0.55)';
        } else {
          ctx.fillStyle = 'rgba(0, 255, 204, 0.45)';
        }
        ctx.fillText(ch, x, y);

        if (y > window.innerHeight && Math.random() > 0.975) {
          drops[i] = Math.random() * -20;
        }
        drops[i] += 1;
      }
    }

    function start() {
      if (running || reduceMotion.matches) return;
      running = true;
      last = 0;
      raf = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
    }

    function init() {
      canvas = document.createElement('canvas');
      canvas.id = 'codeRain';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      if (!ctx) return;

      build();
      start();

      let resizeTimer = null;
      window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(build, 180);
      });

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop(); else start();
      });

      reduceMotion.addEventListener('change', function () {
        if (reduceMotion.matches) stop(); else start();
      });
    }

    return {
      init: init,
      setPrimeMode: function (on) {
        glyphs = on ? GLYPHS_PRIME : GLYPHS_BASE;
      },
      toggle: function () {
        if (running) { stop(); canvas.style.opacity = '0'; }
        else { canvas.style.opacity = ''; start(); }
        return running;
      }
    };
  }());

  /* --------------------------------------------------------------------------
     2. MATHE-ORNAMENTE + PRIMZAHL-INDEX AUF DEN KARTEN
     -------------------------------------------------------------------------- */
  const Ornaments = (function () {
    const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47,
                    53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107];

    function heroOrnament() {
      const hero = document.querySelector('.hero');
      if (!hero || hero.querySelector('.nexus-ornament')) return;
      const span = document.createElement('span');
      span.className = 'nexus-ornament';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = 'ζ(s) = Σ n⁻ˢ';
      hero.appendChild(span);
    }

    function numberCards() {
      const cards = document.querySelectorAll('#tracksList .track-card');
      cards.forEach(function (card, i) {
        const p = PRIMES[i % PRIMES.length];
        if (card.getAttribute('data-prime') !== String(p)) {
          card.setAttribute('data-prime', String(p));
        }
      });
    }

    function init() {
      heroOrnament();
      numberCards();
      const list = document.getElementById('tracksList');
      if (!list) return;
      // Karten kommen asynchron aus der API — deshalb beobachten statt einmalig zaehlen.
      new MutationObserver(numberCards).observe(list, { childList: true });
    }

    return { init: init, numberCards: numberCards };
  }());

  /* --------------------------------------------------------------------------
     3. HERO-TERMINAL
     -------------------------------------------------------------------------- */
  const Terminal = (function () {
    let out = null, input = null;
    const history = [];
    let histPos = -1;

    function print(text, cls) {
      if (!out) return;
      const line = document.createElement('div');
      if (cls) line.className = cls;
      line.textContent = text;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    }

    function trackCards() {
      return Array.prototype.slice.call(document.querySelectorAll('#tracksList .track-card'));
    }

    function trackTitle(card) {
      const el = card.querySelector('.track-title');
      return el ? el.textContent.trim() : '???';
    }

    const COMMANDS = {
      help: function () {
        print('Verfuegbare Befehle:', 't-accent');
        print('  ls            Tracks auflisten');
        print('  play <n|name> Track abspielen');
        print('  stop          Wiedergabe stoppen');
        print('  primes        Primzahl-Index der Tracks');
        print('  zeta          ueber die Nummerierung');
        print('  matrix        Code-Regen ein/aus');
        print('  whoami        wer fragt');
        print('  uname         Systeminfo');
        print('  clear         Ausgabe leeren');
        print('  Tipp: es gibt mehr Befehle, als hier stehen.', 't-dim');
      },
      ls: function () {
        const cards = trackCards();
        if (!cards.length) { print('Noch keine Tracks geladen.', 't-dim'); return; }
        cards.forEach(function (card, i) {
          const price = card.querySelector('.track-price');
          const tag = price ? price.textContent.trim() : '';
          print(String(i + 1).padStart(2, '0') + '  ' + trackTitle(card) + '   [' + tag + ']');
        });
      },
      play: function (arg) {
        const cards = trackCards();
        if (!cards.length) { print('Keine Tracks geladen.', 't-err'); return; }
        if (!arg) { print('Benutzung: play <Nummer|Titel>', 't-err'); return; }
        let card = null;
        const n = parseInt(arg, 10);
        if (!isNaN(n) && cards[n - 1]) {
          card = cards[n - 1];
        } else {
          const needle = arg.toLowerCase();
          card = cards.find(function (c) { return trackTitle(c).toLowerCase().indexOf(needle) !== -1; });
        }
        if (!card) { print('Track nicht gefunden: ' + arg, 't-err'); return; }
        const btn = card.querySelector('.button-metal-play, .btn-play');
        if (!btn) { print('Kein Play-Button an dieser Karte.', 't-err'); return; }
        btn.click();
        print('▶ ' + trackTitle(card), 't-cmd');
      },
      stop: function () {
        const btn = document.getElementById('playerStopBtn');
        if (btn) { btn.click(); print('■ gestoppt'); }
        else print('Player nicht bereit.', 't-err');
      },
      pause: function () {
        const btn = document.getElementById('playerPauseBtn');
        if (btn) { btn.click(); print('⏸ pausiert'); }
        else print('Player nicht bereit.', 't-err');
      },
      primes: function () {
        Ornaments.numberCards();
        const cards = trackCards();
        if (!cards.length) { print('Noch keine Tracks geladen.', 't-dim'); return; }
        print(cards.map(function (c) { return c.getAttribute('data-prime'); }).join(', '), 't-accent');
        print('Tracks werden nicht 1,2,3 nummeriert, sondern mit Primzahlen.', 't-dim');
      },
      zeta: function () {
        print('ζ(s) = Σ 1/nˢ,  Re(s) > 1', 't-accent');
        print('Alle nichttrivialen Nullstellen liegen auf Re(s) = 1/2.');
        print('Unbewiesen. Deshalb zaehlen wir hier in Primzahlen.', 't-dim');
      },
      matrix: function () {
        const running = CodeRain.toggle();
        print(running ? 'Code-Regen: an' : 'Code-Regen: aus', 't-accent');
      },
      whoami: function () {
        print('gast@song-nexus — kein Konto notwendig, kein Tracking aktiv.', 't-accent');
      },
      uname: function () {
        print('SONG-NEXUS v8.0  ·  node/express  ·  postgres  ·  0 Tracker  ·  0 Cookies');
      },
      date: function () { print(new Date().toString()); },
      clear: function () { if (out) out.innerHTML = ''; },
      echo: function (arg) { print(arg || ''); },
      sudo: function () {
        print('Nutzer gast ist nicht in der sudoers-Datei. Dieser Vorfall wird gemeldet.', 't-err');
        print('(Wird er natuerlich nicht. Wir tracken nichts.)', 't-dim');
      },
      exit: function () { print('Es gibt kein Entkommen aus dem Nexus. Aber du kannst scrollen.', 't-dim'); },
      credits: function () {
        print('Musik, Code und Design: Sebastian Schmalnauer', 't-accent');
        print('Gebaut in Gmunden, zwischen Primzahlen und Gitarrenspuren.');
      },
      about: function () { COMMANDS.credits(); },
      konami: function () {
        print('↑ ↑ ↓ ↓ ← → ← → B A', 't-accent');
        print('Probier es aus. Aber nicht hier im Feld — sondern auf der Seite.', 't-dim');
      },
      overdrive: function () {
        Eggs.overdrive();
        print('OVERDRIVE aktiv.', 't-accent');
      },
      'rm': function (arg) {
        if (arg && arg.indexOf('-rf') === 0) {
          print('Netter Versuch. Das Backend laeuft mit requireTrustedSource.', 't-err');
        } else {
          print('rm: Operand fehlt', 't-err');
        }
      },
      cat: function (arg) {
        if (!arg) { print('cat: Datei fehlt', 't-err'); return; }
        if (/passwd|shadow|\.env/.test(arg)) {
          print('Zugriff verweigert. Geheimnisse liegen nicht im Repo — meistens.', 't-err');
          return;
        }
        print('cat: ' + arg + ': Datei nicht gefunden', 't-err');
      },
      cd: function () { print('Es gibt nur ein Verzeichnis: /nexus', 't-dim'); },
      hello: function () { print('Hallo. Schoen, dass hier jemand tippt.', 't-accent'); }
    };

    function run(raw) {
      const line = raw.trim();
      if (!line) return;
      print('$ ' + line, 't-cmd');
      history.push(line);
      histPos = history.length;

      const parts = line.split(/\s+/);
      const cmd = parts.shift().toLowerCase();
      const arg = parts.join(' ');

      if (COMMANDS[cmd]) {
        try { COMMANDS[cmd](arg); }
        catch (e) { print('Interner Fehler: ' + e.message, 't-err'); }
      } else {
        print('Unbekannter Befehl: ' + cmd + '  —  "help" hilft.', 't-err');
      }
    }

    function init() {
      const hero = document.querySelector('.hero');
      if (!hero) return;

      const box = document.createElement('div');
      box.className = 'nexus-terminal';

      out = document.createElement('div');
      out.className = 'nexus-terminal-out';
      out.setAttribute('role', 'log');
      out.setAttribute('aria-live', 'polite');
      out.setAttribute('aria-label', 'Terminal-Ausgabe');

      const lineWrap = document.createElement('div');
      lineWrap.className = 'nexus-terminal-line';

      const prompt = document.createElement('span');
      prompt.className = 'nexus-terminal-prompt';
      prompt.textContent = 'gast@nexus:~$';
      prompt.setAttribute('aria-hidden', 'true');

      input = document.createElement('input');
      input.className = 'nexus-terminal-input';
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.placeholder = 'help';
      input.setAttribute('aria-label', 'Terminal-Eingabe, tippe help fuer eine Befehlsliste');

      lineWrap.appendChild(prompt);
      lineWrap.appendChild(input);
      box.appendChild(out);
      box.appendChild(lineWrap);
      hero.appendChild(box);

      print('SONG-NEXUS Konsole bereit. "help" zeigt die Befehle.', 't-dim');

      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          run(input.value);
          input.value = '';
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          if (histPos > 0) { histPos--; input.value = history[histPos]; }
        } else if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          if (histPos < history.length - 1) { histPos++; input.value = history[histPos]; }
          else { histPos = history.length; input.value = ''; }
        }
      });
    }

    return { init: init, run: run, print: print };
  }());

  /* --------------------------------------------------------------------------
     4. EASTEREGGS
     -------------------------------------------------------------------------- */
  const Eggs = (function () {
    let bannerTimer = null;

    function banner(text) {
      const old = document.querySelector('.nexus-egg-banner');
      if (old) old.remove();
      const el = document.createElement('div');
      el.className = 'nexus-egg-banner';
      el.setAttribute('role', 'status');
      el.textContent = text;
      document.body.appendChild(el);
      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(function () { el.remove(); }, 4200);
    }

    function overdrive() {
      const on = document.documentElement.getAttribute('data-overdrive') === 'on';
      document.documentElement.setAttribute('data-overdrive', on ? 'off' : 'on');
      banner(on ? 'OVERDRIVE aus' : 'OVERDRIVE — ↑↑↓↓←→←→BA');
      return !on;
    }

    /* Konami-Code */
    function konami() {
      const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                   'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
      let pos = 0;
      document.addEventListener('keydown', function (ev) {
        if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
        const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
        pos = (key === seq[pos]) ? pos + 1 : (key === seq[0] ? 1 : 0);
        if (pos === seq.length) { pos = 0; overdrive(); }
      });
    }

    /* Freies Tippen von Wortern ausserhalb von Eingabefeldern */
    function typedWords() {
      let buf = '';
      const words = {
        matrix: function () {
          const running = CodeRain.toggle();
          banner(running ? 'Code-Regen an' : 'Code-Regen aus');
        },
        eisenstein: function () {
          CodeRain.setPrimeMode(true);
          banner('Eisenstein-Modus — der Regen zaehlt jetzt in Primzahlen');
        },
        riemann: function () {
          banner('ζ(1/2 + it) — Re(s) = 1/2, immer noch unbewiesen');
        },
        nexus: function () {
          const t = document.querySelector('.nexus-terminal-input');
          if (t) { t.focus(); banner('Konsole fokussiert'); }
        }
      };
      document.addEventListener('keydown', function (ev) {
        if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
        if (ev.key.length !== 1) return;
        buf = (buf + ev.key.toLowerCase()).slice(-12);
        Object.keys(words).forEach(function (w) {
          if (buf.endsWith(w)) { words[w](); buf = ''; }
        });
      });
    }

    /* Sieben Klicks auf das Neon-Schild */
    function logoClicks() {
      const sign = document.getElementById('neonSign');
      if (!sign) return;
      let n = 0, timer = null;
      sign.addEventListener('click', function () {
        n++;
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { n = 0; }, 2500);
        if (n === 7) {
          n = 0;
          CodeRain.setPrimeMode(true);
          banner('7 Klicks. Primzahl. Der Regen hat es gemerkt.');
        }
      });
    }

    function consoleBanner() {
      const style = 'color:#00ffcc;font-family:monospace';
      /* eslint-disable no-console */
      console.log('%c ⬡ SONG-NEXUS ', 'background:#05080d;color:#00ffcc;font-weight:bold;padding:4px 8px');
      console.log('%c Kein Tracking, keine Cookies, keine Werbung. Nur Code und Metal.', style);
      console.log('%c Tipp: nexus.help() — oder tippe "matrix" irgendwo auf der Seite.', 'color:#c4b5fd;font-family:monospace');
      /* eslint-enable no-console */
    }

    function init() {
      konami();
      typedWords();
      logoClicks();
      consoleBanner();
    }

    return { init: init, overdrive: overdrive, banner: banner };
  }());

  /* --------------------------------------------------------------------------
     5. START + oeffentliche Konsolen-API
     -------------------------------------------------------------------------- */
  function boot() {
    try { CodeRain.init(); } catch (e) { /* Regen ist optional */ }
    try { Ornaments.init(); } catch (e) { /* Ornamente sind optional */ }
    try { Terminal.init(); } catch (e) { /* Terminal ist optional */ }
    try { Eggs.init(); } catch (e) { /* Eier sind optional */ }

    window.nexus = {
      help: function () {
        /* eslint-disable no-console */
        console.log('nexus.matrix()     Code-Regen umschalten');
        console.log('nexus.overdrive()  Overdrive-Optik umschalten');
        console.log('nexus.primes()     Primzahl-Regen');
        console.log('nexus.run("ls")    Terminal-Befehl ausfuehren');
        /* eslint-enable no-console */
      },
      matrix: function () { return CodeRain.toggle(); },
      overdrive: function () { return Eggs.overdrive(); },
      primes: function () { CodeRain.setPrimeMode(true); return 'Primzahl-Modus an'; },
      run: function (cmd) { Terminal.run(String(cmd)); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
