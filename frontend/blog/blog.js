// ============================================================================
// Blog-Übersicht (Issue #10)
// ============================================================================
//
// Hintergrund: frontend/blog/ enthielt nur posts.json, aber keine index.html.
// Navigation, Footer und der CTA auf der Startseite verlinkten trotzdem auf
// blog/. Weil der Frontend-Server für unbekannte Pfade index.html mit Status
// 200 auslieferte, landete man einfach wieder auf der Startseite – der tote
// Link fiel deshalb nie auf.
//
// Diese Seite rendert posts.json. Die Überschriften sind absichtlich NICHT
// verlinkt, weil es noch keine Einzelansichten gibt. Lieber ein ehrlich
// unvollständiger Blog als vier weitere tote Links.
// ============================================================================

(function () {
  'use strict';

  var liste = document.getElementById('postList');

  function escapeHtml(wert) {
    return String(wert == null ? '' : wert).replace(/[&<>"']/g, function (z) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z];
    });
  }

  function datumFormatieren(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return escapeHtml(iso);
    return d.toLocaleDateString('de-AT', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fehler(text) {
    liste.innerHTML =
      '<li class="post-card"><p class="post-excerpt">' + escapeHtml(text) + '</p></li>';
  }

  fetch('./posts.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (posts) {
      if (!Array.isArray(posts) || posts.length === 0) {
        fehler('Noch keine Beiträge vorhanden.');
        return;
      }

      // Neueste zuerst
      posts.sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });

      liste.innerHTML = posts
        .map(function (p) {
          return (
            '<li class="post-card">' +
            '<h2>' + escapeHtml(p.title) + '</h2>' +
            '<div class="post-meta">' +
            '<span>' + datumFormatieren(p.date) + '</span>' +
            (p.category ? '<span>' + escapeHtml(p.category) + '</span>' : '') +
            (p.author ? '<span>' + escapeHtml(p.author) + '</span>' : '') +
            '</div>' +
            '<p class="post-excerpt">' + escapeHtml(p.excerpt) + '</p>' +
            '</li>'
          );
        })
        .join('');
    })
    .catch(function (err) {
      console.error('Blog konnte nicht geladen werden:', err);
      fehler('Die Beiträge konnten nicht geladen werden. Bitte später erneut versuchen.');
    });
})();
