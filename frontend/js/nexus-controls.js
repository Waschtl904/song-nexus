/* ============================================================================
   SONG-NEXUS — MASCHINENKONSOLE
   Ersetzt die Standard-Bedienelemente des Players durch echte Mechanik:
   Schiene mit Hebelkugel (Position), Drehrad (Lautstaerke), zweites Drehrad
   (Abspielgeschwindigkeit) und Kippschalter (Loop).

   Bindung an den bestehenden Player, ohne dessen Logik anzufassen:
   player.js hoert auf 'input' an #playerSeekBar und #playerVolumeSlider und
   liest dabei e.target.value. Die Konsole setzt genau diese Werte und feuert
   das Ereignis. Loop laeuft ueber einen Klick auf #playerLoopBtn.
   Die Geschwindigkeit braucht das Audio-Objekt, das audio-player.js als
   window.AudioPlayer bereitstellt.
   ============================================================================ */
(function () {
  'use strict';

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const ANGLE = 135;                 // Drehbereich der Raeder: -135 bis +135 Grad

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /* Wert an das bestehende Bedienelement geben und Player benachrichtigen */
  function pushValue(el, value) {
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* --------------------------------------------------------------------------
     Drehrad: Ziehen, Mausrad, Pfeiltasten
     -------------------------------------------------------------------------- */
  function makeWheel(opts) {
    const wrap = document.createElement('div');
    wrap.className = 'nexus-ctrl nexus-ctrl-wheel';

    const knob = document.createElement('div');
    knob.className = 'nexus-wheel-knob';
    knob.setAttribute('role', 'slider');
    knob.setAttribute('tabindex', '0');
    knob.setAttribute('aria-label', opts.label);
    knob.setAttribute('aria-valuemin', String(opts.min));
    knob.setAttribute('aria-valuemax', String(opts.max));

    const cap = document.createElement('span');
    cap.className = 'nexus-ctrl-cap';
    cap.textContent = opts.caption;

    const read = document.createElement('span');
    read.className = 'nexus-ctrl-read';

    wrap.appendChild(knob);
    wrap.appendChild(cap);
    wrap.appendChild(read);

    let value = opts.value;

    function render() {
      const t = (value - opts.min) / (opts.max - opts.min);
      knob.style.setProperty('--angle', (-ANGLE + t * 2 * ANGLE).toFixed(1) + 'deg');
      knob.setAttribute('aria-valuenow', String(value));
      knob.setAttribute('aria-valuetext', opts.format(value));
      read.textContent = opts.format(value);
    }

    function set(v, notify) {
      const next = opts.snap ? opts.snap(v) : clamp(v, opts.min, opts.max);
      if (next === value && notify !== 'force') { render(); return; }
      value = next;
      render();
      if (notify) opts.onChange(value);
    }

    /* Ziehen: vertikale Bewegung dreht das Rad */
    let dragging = false, startY = 0, startVal = 0;
    knob.addEventListener('pointerdown', function (ev) {
      dragging = true;
      startY = ev.clientY;
      startVal = value;
      knob.setPointerCapture(ev.pointerId);
      knob.classList.add('is-dragging');
    });
    knob.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      const span = opts.max - opts.min;
      set(startVal + ((startY - ev.clientY) / 140) * span, true);
    });
    function endDrag() { dragging = false; knob.classList.remove('is-dragging'); }
    knob.addEventListener('pointerup', endDrag);
    knob.addEventListener('pointercancel', endDrag);

    knob.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      set(value + (ev.deltaY < 0 ? opts.step : -opts.step), true);
    }, { passive: false });

    knob.addEventListener('keydown', function (ev) {
      const k = ev.key;
      if (k === 'ArrowUp' || k === 'ArrowRight') { ev.preventDefault(); set(value + opts.step, true); }
      else if (k === 'ArrowDown' || k === 'ArrowLeft') { ev.preventDefault(); set(value - opts.step, true); }
      else if (k === 'Home') { ev.preventDefault(); set(opts.min, true); }
      else if (k === 'End') { ev.preventDefault(); set(opts.max, true); }
    });

    render();
    return { el: wrap, set: function (v) { set(v, false); }, get: function () { return value; } };
  }

  /* --------------------------------------------------------------------------
     Schiene mit Hebelkugel: Position im Track
     -------------------------------------------------------------------------- */
  function makeRail(opts) {
    const wrap = document.createElement('div');
    wrap.className = 'nexus-ctrl nexus-ctrl-rail';

    const rail = document.createElement('div');
    rail.className = 'nexus-rail';
    rail.setAttribute('role', 'slider');
    rail.setAttribute('tabindex', '0');
    rail.setAttribute('aria-label', opts.label);
    rail.setAttribute('aria-valuemin', '0');
    rail.setAttribute('aria-valuemax', '100');

    const knob = document.createElement('div');
    knob.className = 'nexus-rail-knob';
    rail.appendChild(knob);
    wrap.appendChild(rail);

    let value = 0;

    function render() {
      // Anteil statt Prozent: die Kugel darf an den Enden nicht ueber die
      // Schiene hinausragen, deshalb rechnet das Stylesheet ihre halbe Breite
      // aus der Laufstrecke heraus.
      knob.style.setProperty('--p', (value / 100).toFixed(4));
      rail.setAttribute('aria-valuenow', value.toFixed(0));
      rail.setAttribute('aria-valuetext', value.toFixed(0) + ' Prozent');
    }

    function fromEvent(ev) {
      const box = rail.getBoundingClientRect();
      return clamp(((ev.clientX - box.left) / box.width) * 100, 0, 100);
    }

    let dragging = false;
    rail.addEventListener('pointerdown', function (ev) {
      dragging = true;
      rail.setPointerCapture(ev.pointerId);
      value = fromEvent(ev); render(); opts.onChange(value);
    });
    rail.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      value = fromEvent(ev); render(); opts.onChange(value);
    });
    function endDrag() { dragging = false; }
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);

    rail.addEventListener('keydown', function (ev) {
      const step = ev.shiftKey ? 10 : 5;
      if (ev.key === 'ArrowRight') { ev.preventDefault(); value = clamp(value + step, 0, 100); render(); opts.onChange(value); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); value = clamp(value - step, 0, 100); render(); opts.onChange(value); }
      else if (ev.key === 'Home') { ev.preventDefault(); value = 0; render(); opts.onChange(value); }
      else if (ev.key === 'End') { ev.preventDefault(); value = 100; render(); opts.onChange(value); }
    });

    render();
    return {
      el: wrap,
      set: function (v) { if (dragging) return; value = clamp(v, 0, 100); render(); }
    };
  }

  /* --------------------------------------------------------------------------
     Kippschalter
     -------------------------------------------------------------------------- */
  function makeToggle(opts) {
    let state = false;
    const wrap = document.createElement('div');
    wrap.className = 'nexus-ctrl nexus-ctrl-toggle';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nexus-toggle';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', opts.label);

    const cap = document.createElement('span');
    cap.className = 'nexus-ctrl-cap';
    cap.textContent = opts.caption;

    wrap.appendChild(btn);
    wrap.appendChild(cap);

    function render() {
      btn.setAttribute('aria-pressed', state ? 'true' : 'false');
      btn.classList.toggle('is-on', state);
    }

    /* Der Schalter fuehrt seinen eigenen Zustand und schaltet sofort um.
       So kippt er auch dann sichtbar, wenn der Player (noch) nicht geladen
       ist — im Test blieb er sonst stumm, weil #playerLoopBtn ohne Player
       keinen Klick verarbeitet. Sobald der Player laeuft, gilt dessen Zustand. */
    btn.addEventListener('click', function () {
      state = !state;
      render();
      opts.onToggle(state);
    });

    return {
      el: wrap,
      set: function (on) {
        if (state === !!on) return;
        state = !!on;
        render();
      }
    };
  }

  /* --------------------------------------------------------------------------
     Aufbau
     -------------------------------------------------------------------------- */
  function boot() {
    const content = document.getElementById('playerContent');
    if (!content) return;

    const seekBar = document.getElementById('playerSeekBar');
    const volSlider = document.getElementById('playerVolumeSlider');
    const loopBtn = document.getElementById('playerLoopBtn');

    const console_ = document.createElement('div');
    console_.className = 'nexus-console';

    /* Position — zusaetzlich direkt am Audio-Objekt, weil #playerSeekBar in
       der Vorlage nur ein div ohne eigene Zeigerbedienung ist. Springen im
       Track war deshalb bisher ueberhaupt nicht moeglich. */
    const rail = makeRail({
      label: 'Position im Track',
      onChange: function (percent) {
        pushValue(seekBar, percent);

        const ap = window.AudioPlayer;
        const audio = ap && ap.audio;
        if (!audio || !isFinite(audio.duration) || audio.duration <= 0) return;

        let ziel = (percent / 100) * audio.duration;

        // In der Vorschau liefert der Server nur die ersten Sekunden aus;
        // dahinter zu springen wuerde die Wiedergabe abwuergen.
        if (ap.state && ap.state.isPreview && ap.state.previewDuration) {
          ziel = Math.min(ziel, ap.state.previewDuration - 0.5);
        }

        try { audio.currentTime = ziel; }
        catch (e) { console.warn('⚠️ Springen nicht moeglich:', e.message); }
      }
    });

    /* Lautstaerke */
    const vol = makeWheel({
      label: 'Lautstaerke',
      caption: 'VOL',
      min: 0, max: 100, step: 5,
      value: volSlider ? parseInt(volSlider.value, 10) || 80 : 80,
      format: function (v) { return Math.round(v) + '%'; },
      onChange: function (v) { pushValue(volSlider, Math.round(v)); }
    });

    /* Geschwindigkeit — rastet auf die Stufen aus SPEEDS ein */
    const speed = makeWheel({
      label: 'Abspielgeschwindigkeit',
      caption: 'RATE',
      min: SPEEDS[0], max: SPEEDS[SPEEDS.length - 1], step: 0.25,
      value: 1,
      snap: function (v) {
        return SPEEDS.reduce(function (best, s) {
          return Math.abs(s - v) < Math.abs(best - v) ? s : best;
        }, SPEEDS[0]);
      },
      format: function (v) { return v.toFixed(2).replace(/0$/, '') + '×'; },
      onChange: function (v) {
        const ap = window.AudioPlayer;
        if (ap && ap.audio) ap.audio.playbackRate = v;
      }
    });

    /* Loop */
    const loop = makeToggle({
      label: 'Endlosschleife',
      caption: 'LOOP',
      onToggle: function () { if (loopBtn) loopBtn.click(); }
    });

    const row = document.createElement('div');
    row.className = 'nexus-console-row';
    row.appendChild(vol.el);
    row.appendChild(speed.el);
    row.appendChild(loop.el);

    console_.appendChild(rail.el);
    console_.appendChild(row);
    content.appendChild(console_);

    /* Die ersetzten Standardelemente verstecken — Funktion bleibt, weil die
       Konsole ihre Werte setzt. Play/Pause/Stop/Mute bleiben sichtbar. */
    if (seekBar) seekBar.classList.add('nexus-replaced');
    const volCtrl = volSlider ? volSlider.closest('.volume-control') : null;
    if (volCtrl) volCtrl.classList.add('nexus-replaced');
    if (loopBtn) loopBtn.classList.add('nexus-replaced');

    /* Zustand vom Player zuruecklesen. seekBar.value wird von
       audio-player.js bei jedem Zeitfortschritt gesetzt. */
    window.setInterval(function () {
      if (seekBar) rail.set(parseFloat(seekBar.value) || 0);
      if (volSlider) vol.set(parseInt(volSlider.value, 10) || 0);
      // Zustand nur dann vom Player uebernehmen, wenn es ihn wirklich gibt.
      const ap = window.AudioPlayer;
      if (ap && ap.state) loop.set(!!ap.state.isLooping);
    }, 200);

    window.nexusControls = { rail: rail, volume: vol, speed: speed, loop: loop };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
