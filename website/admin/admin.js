/* MATTER+ENERGY Admin app — vanilla JS, talks to /api */
(function () {
  'use strict';

  var state = { projects: [], news: [], bus: [], user: null };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function api(path, opts) {
    opts = opts || {};
    if (opts.body) {
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers);
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(path, opts).then(function (res) {
      if (res.status === 401 && path !== '/api/session') { window.location.href = '/admin'; throw new Error('unauthorized'); }
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  /* ---------- boot ---------- */
  api('/api/session').then(function (s) {
    if (!s.authenticated) { window.location.href = '/admin'; return; }
    state.user = s.user;
    $('#who-email').textContent = s.user.email;
    if (s.user.mustChangePassword) {
      toast('Default password in use — please change it.');
      openPasswordDrawer(true);
    }
    refreshAll();
  }).catch(function () { window.location.href = '/admin'; });

  function refreshAll() {
    Promise.all([api('/api/projects'), api('/api/news'), api('/api/bus')]).then(function (r) {
      state.projects = r[0]; state.news = r[1]; state.bus = r[2];
      renderProjects(); renderNews(); renderBus();
    });
  }

  /* ---------- tabs ---------- */
  $$('.admin-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.admin-tabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
      ['projects', 'news', 'bus'].forEach(function (t) {
        $('#tab-' + t).hidden = b.getAttribute('data-tab') !== t;
      });
    });
  });

  /* ---------- projects ---------- */
  function projectFilterState() {
    return { q: $('#project-search').value.trim().toLowerCase(), f: $('#project-filter').value };
  }

  function renderProjects() {
    var fs = projectFilterState();
    var rows = state.projects.filter(function (p) {
      if (fs.f === 'published' && !p.published) return false;
      if (fs.f === 'hidden' && p.published) return false;
      if (fs.f === 'featured' && !p.featured) return false;
      if (fs.q) {
        var hay = [p.title, p.client, p.sector, p.year, p.type].join(' ').toLowerCase();
        if (hay.indexOf(fs.q) === -1) return false;
      }
      return true;
    });
    $('#project-count').textContent = rows.length + ' of ' + state.projects.length + ' projects';
    $('#project-table tbody').innerHTML = rows.map(function (p) {
      return '<tr>' +
        '<td class="mono" style="font-size:11px">' + esc(p.id) + '</td>' +
        '<td><a href="/work/' + esc(p.slug) + '" target="_blank" rel="noopener" style="text-decoration:underline">' + esc(p.title) + '</a></td>' +
        '<td class="hide-sm">' + esc(p.client.split(';')[0]) + '</td>' +
        '<td class="hide-sm">' + esc(p.sector) + '</td>' +
        '<td class="hide-sm">' + esc(p.year) + '</td>' +
        '<td><span class="pill ' + (p.published ? 'on' : 'off') + '">' + (p.published ? 'Published' : 'Hidden') + '</span> ' +
        (p.featured ? '<span class="pill on">Featured</span>' : '') + '</td>' +
        '<td class="actions">' +
        '<button class="btn-ghost" data-act="edit" data-slug="' + esc(p.slug) + '">Edit</button>' +
        '<button class="btn-ghost" data-act="toggle" data-slug="' + esc(p.slug) + '">' + (p.published ? 'Hide' : 'Publish') + '</button>' +
        '<button class="btn-ghost" data-act="feature" data-slug="' + esc(p.slug) + '">' + (p.featured ? 'Unfeature' : 'Feature') + '</button>' +
        '<button class="btn-ghost danger" data-act="delete" data-slug="' + esc(p.slug) + '">Delete</button>' +
        '</td></tr>';
    }).join('');
  }

  $('#project-search').addEventListener('input', renderProjects);
  $('#project-filter').addEventListener('change', renderProjects);
  $('#btn-new-project').addEventListener('click', function () { openProjectDrawer(null); });

  $('#project-table').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var slug = b.getAttribute('data-slug');
    var p = state.projects.find(function (x) { return x.slug === slug; });
    if (!p) return;
    var act = b.getAttribute('data-act');
    if (act === 'edit') return openProjectDrawer(p);
    if (act === 'toggle') {
      return api('/api/projects/' + slug, { method: 'PUT', body: { published: !p.published } }).then(function () {
        toast(p.published ? 'Hidden: ' + p.title : 'Published: ' + p.title);
        refreshAll();
      }).catch(function (err) { toast(err.message); });
    }
    if (act === 'feature') {
      return api('/api/projects/' + slug, { method: 'PUT', body: { featured: !p.featured } }).then(function () {
        toast((p.featured ? 'Unfeatured: ' : 'Featured: ') + p.title);
        refreshAll();
      }).catch(function (err) { toast(err.message); });
    }
    if (act === 'delete') {
      if (!window.confirm('Delete “' + p.title + '” permanently? Hiding is usually enough.')) return;
      return api('/api/projects/' + slug, { method: 'DELETE' }).then(function () {
        toast('Deleted: ' + p.title);
        refreshAll();
      }).catch(function (err) { toast(err.message); });
    }
  });

  /* ---------- drawer helpers ---------- */
  function drawer(html, onmount) {
    var root = $('#drawer-root');
    root.innerHTML = '<div class="drawer-back"></div><aside class="drawer" role="dialog" aria-modal="true">' + html + '</aside>';
    root.querySelector('.drawer-back').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', escClose);
    if (onmount) onmount(root.querySelector('.drawer'));
  }
  function escClose(e) { if (e.key === 'Escape') closeDrawer(); }
  function closeDrawer() {
    $('#drawer-root').innerHTML = '';
    document.removeEventListener('keydown', escClose);
  }

  function field(label, name, value, opts) {
    opts = opts || {};
    var input = opts.textarea
      ? '<textarea name="' + name + '" ' + (opts.max ? 'maxlength="' + opts.max + '"' : '') + '>' + esc(value) + '</textarea>'
      : '<input type="text" name="' + name + '" value="' + esc(value) + '" ' + (opts.max ? 'maxlength="' + opts.max + '"' : '') + '>';
    return '<label class="' + (opts.full ? 'full' : '') + '">' + esc(label) +
      (opts.hint ? '<span class="hint">' + esc(opts.hint) + '</span>' : '') + input +
      (opts.max ? '<span class="char-count" data-for="' + name + '">' + String(value || '').length + ' / ' + opts.max + '</span>' : '') +
      '</label>';
  }

  /* ---------- project editor ---------- */
  function openProjectDrawer(p) {
    var isNew = !p;
    p = p || { title: '', client: '', industry: '', sector: '', onePhraser: '', longDescription: '', type: '', year: '',
      businessUnits: [], capabilities: [], deliverables: [], credits: '', driveFolder: '', notes: '',
      published: false, featured: false, heroImage: '', gallery: [], video: '', order: 1000 };

    drawer(
      '<h2>' + (isNew ? 'Add project' : 'Edit project') + '</h2>' +
      '<p class="drawer-sub">' + (isNew ? 'New entry' : esc(p.id) + ' · /work/' + esc(p.slug)) + '</p>' +
      '<form id="project-form">' +
      field('Project title *', 'title', p.title, { full: true }) +
      field('Client(s) *', 'client', p.client) +
      field('Year', 'year', p.year, { hint: 'e.g. 2026 or 2025–2026' }) +
      field('Industry', 'industry', p.industry, { hint: 'Tech, Beauty, Entertainment…' }) +
      field('Sector (site filter)', 'sector', p.sector, { hint: 'Entertainment, Technology, Beauty & Personal Care, Finance…' }) +
      field('Type', 'type', p.type, { hint: 'Launch Campaign, Branding, Strategy…' }) +
      field('Business units', 'businessUnits', p.businessUnits.join('; '), { hint: 'Semicolon-separated: Tech; Branding; Experience' }) +
      field('One-phraser', 'onePhraser', p.onePhraser, { full: true, max: 120, hint: 'Up to 60–120 characters. Shown on cards and captions.' }) +
      field('Long description', 'longDescription', p.longDescription, { full: true, textarea: true, max: 1400, hint: 'Up to 1200 characters. Shown on the case page.' }) +
      field('Deliverables', 'deliverables', p.deliverables.join('; '), { full: true, hint: 'Semicolon-separated list' }) +
      field('Credits / team', 'credits', p.credits, { full: true, textarea: true }) +
      field('Hero image path', 'heroImage', p.heroImage, { hint: '/assets/img/… (leave empty for branded placeholder)' }) +
      field('Video path', 'video', p.video, { hint: 'Optional /assets/img/….mp4' }) +
      field('Gallery paths', 'gallery', p.gallery.join('; '), { full: true, hint: 'Semicolon-separated image paths' }) +
      field('Google Drive folder', 'driveFolder', p.driveFolder, { full: true }) +
      field('Internal notes', 'notes', p.notes, { full: true, textarea: true, hint: 'Never shown on the site.' }) +
      '<div class="checks">' +
      '<label><input type="checkbox" name="published" ' + (p.published ? 'checked' : '') + '> Published</label>' +
      '<label><input type="checkbox" name="featured" ' + (p.featured ? 'checked' : '') + '> Featured (landing + top of Work)</label>' +
      '<label style="max-width:130px"><input type="number" name="order" value="' + esc(p.order) + '" style="width:80px"> Order</label>' +
      '</div>' +
      '<div class="drawer-actions">' +
      '<button type="submit" class="btn-primary">' + (isNew ? 'Create project' : 'Save changes') + '</button>' +
      '<button type="button" class="btn-ghost" id="drawer-cancel">Cancel</button>' +
      '</div>' +
      '</form>',
      function (d) {
        $('#drawer-cancel', d).addEventListener('click', closeDrawer);
        $$('input[maxlength], textarea[maxlength]', d).forEach(function (el) {
          el.addEventListener('input', function () {
            var c = d.querySelector('.char-count[data-for="' + el.name + '"]');
            if (c) {
              c.textContent = el.value.length + ' / ' + el.getAttribute('maxlength');
              c.classList.toggle('over', el.value.length >= Number(el.getAttribute('maxlength')));
            }
          });
        });
        $('#project-form', d).addEventListener('submit', function (e) {
          e.preventDefault();
          var f = e.target;
          var body = {
            title: f.title.value.trim(), client: f.client.value.trim(), year: f.year.value.trim(),
            industry: f.industry.value.trim(), sector: f.sector.value.trim(), type: f.type.value.trim(),
            businessUnits: f.businessUnits.value, onePhraser: f.onePhraser.value.trim(),
            longDescription: f.longDescription.value.trim(), deliverables: f.deliverables.value,
            credits: f.credits.value.trim(), heroImage: f.heroImage.value.trim(), video: f.video.value.trim(),
            gallery: f.gallery.value, driveFolder: f.driveFolder.value.trim(), notes: f.notes.value.trim(),
            published: f.published.checked, featured: f.featured.checked, order: Number(f.order.value) || 1000,
          };
          if (!body.title || !body.client) { toast('Title and client are required.'); return; }
          var req = isNew
            ? api('/api/projects', { method: 'POST', body: body })
            : api('/api/projects/' + p.slug, { method: 'PUT', body: body });
          req.then(function () {
            toast(isNew ? 'Project created.' : 'Saved.');
            closeDrawer();
            refreshAll();
          }).catch(function (err) { toast(err.message); });
        });
      }
    );
  }

  /* ---------- news ---------- */
  function renderNews() {
    var items = state.news.slice().sort(function (a, b) { return a.order - b.order; });
    $('#news-count').textContent = items.length + ' items';
    $('#news-table tbody').innerHTML = items.map(function (n) {
      return '<tr>' +
        '<td class="mono" style="font-size:11px">' + esc(n.id) + '</td>' +
        '<td>' + esc(n.category) + '</td>' +
        '<td><a href="/news/' + esc(n.slug) + '" target="_blank" rel="noopener" style="text-decoration:underline">' + esc(n.title) + '</a></td>' +
        '<td><span class="pill ' + (n.published ? 'on' : 'off') + '">' + (n.published ? 'Published' : 'Hidden') + '</span></td>' +
        '<td class="actions"><button class="btn-ghost" data-slug="' + esc(n.slug) + '">' + (n.published ? 'Hide' : 'Publish') + '</button></td>' +
        '</tr>';
    }).join('');
  }
  $('#news-table').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-slug]');
    if (!b) return;
    var n = state.news.find(function (x) { return x.slug === b.getAttribute('data-slug'); });
    if (!n) return;
    api('/api/news/' + n.slug, { method: 'PUT', body: { published: !n.published } }).then(function () {
      toast((n.published ? 'Hidden: ' : 'Published: ') + n.title);
      refreshAll();
    }).catch(function (err) { toast(err.message); });
  });

  /* ---------- verticals ---------- */
  function renderBus() {
    $('#bus-count').textContent = state.bus.length + ' verticals';
    $('#bus-table tbody').innerHTML = state.bus.map(function (b) {
      return '<tr>' +
        '<td class="mono" style="font-size:11px">' + esc(b.id) + '</td>' +
        '<td>' + esc(b.name) + '</td>' +
        '<td>' + esc(b.positioningHeadline) + '</td>' +
        '<td><a href="/' + esc(b.slug) + '" target="_blank" rel="noopener" style="text-decoration:underline">/' + esc(b.slug) + '</a></td>' +
        '<td><span class="pill off">Ghost — link only, noindex</span></td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- password ---------- */
  function openPasswordDrawer(forced) {
    drawer(
      '<h2>Change password</h2>' +
      '<p class="drawer-sub">' + (forced ? 'You are using the default password — set your own.' : esc(state.user.email)) + '</p>' +
      '<form id="pw-form">' +
      '<label class="full">Current password<input type="password" name="current" required autocomplete="current-password"></label>' +
      '<label class="full">New password<span class="hint">Minimum 10 characters.</span><input type="password" name="next" required minlength="10" autocomplete="new-password"></label>' +
      '<div class="drawer-actions">' +
      '<button type="submit" class="btn-primary">Update password</button>' +
      '<button type="button" class="btn-ghost" id="drawer-cancel">Cancel</button>' +
      '</div></form>',
      function (d) {
        $('#drawer-cancel', d).addEventListener('click', closeDrawer);
        $('#pw-form', d).addEventListener('submit', function (e) {
          e.preventDefault();
          api('/api/password', { method: 'POST', body: { current: e.target.current.value, next: e.target.next.value } })
            .then(function () { toast('Password updated.'); closeDrawer(); })
            .catch(function (err) { toast(err.message); });
        });
      }
    );
  }
  $('#btn-password').addEventListener('click', function () { openPasswordDrawer(false); });

  $('#btn-logout').addEventListener('click', function () {
    api('/api/logout', { method: 'POST' }).then(function () { window.location.href = '/admin'; });
  });
})();
