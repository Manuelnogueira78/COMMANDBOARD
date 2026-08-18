/* MATTER+ENERGY — front-end behaviour (no dependencies) */
(function () {
  'use strict';

  /* Reveal on scroll — restrained, honours prefers-reduced-motion via CSS */
  var revealed = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealed.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Business-unit filtering on /work (?bu=Tech etc.) */
  var grid = document.getElementById('work-grid');
  if (grid) {
    var params = new URLSearchParams(window.location.search);
    var bu = params.get('bu') || grid.getAttribute('data-initial-bu') || '';
    if (bu) {
      var cells = document.querySelectorAll('[data-filterable]');
      var shown = 0;
      cells.forEach(function (cell) {
        var units = (cell.getAttribute('data-bu') || '').split('|');
        var match = units.indexOf(bu) !== -1;
        cell.classList.toggle('is-hidden', !match);
        if (match) shown++;
      });
      var status = document.getElementById('filter-status');
      if (status) {
        status.hidden = false;
        status.textContent = 'Filtered by ' + bu + ' — ' + shown + ' project' + (shown === 1 ? '' : 's') + '. ';
        var clear = document.createElement('a');
        clear.href = '/work';
        clear.textContent = 'Clear filter';
        clear.style.textDecoration = 'underline';
        status.appendChild(clear);
      }
      /* mark the active BU in the masthead line */
      document.querySelectorAll('.bu-line a').forEach(function (a) {
        try {
          var u = new URL(a.href, window.location.origin);
          if (u.pathname === '/work' && u.searchParams.get('bu') === bu) a.classList.add('active');
        } catch (e) { /* noop */ }
      });
    }
  }

  /* Video: pause offscreen hero videos to save battery */
  var vids = document.querySelectorAll('video[autoplay]');
  if ('IntersectionObserver' in window && vids.length) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { v.play().catch(function () {}); } else { v.pause(); }
      });
    }, { threshold: 0.1 });
    vids.forEach(function (v) { vio.observe(v); });
  }
})();
