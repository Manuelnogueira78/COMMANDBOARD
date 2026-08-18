'use strict';

/* Server-side page renderers for matter-energy.com
   Layout source of truth: Figma wireframe [Ext] M&E_Website_Wireframe. */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const nl2p = (s = '') =>
  s.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

/* ---------- shared partials ---------- */

function head({ title, description = '', noindex = false, path = '/' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
<link rel="canonical" href="https://matter-energy.com${esc(path)}">
<link rel="icon" type="image/png" href="/assets/logo/icon-matter-black.png">
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>`;
}

function buLine(bus, activePath) {
  const items = [
    { label: 'ALL.', href: '/work' },
    { label: 'Beauty', href: '/work?bu=Beauty' },
    { label: 'Branding', href: '/branding' },
    { label: 'Connections', href: '/work?bu=Connections' },
    { label: 'Entertainment', href: '/entertainment' },
    { label: 'Tech', href: '/work?bu=Tech' },
  ];
  return items
    .map((i, n) => {
      const active = activePath === i.href;
      const sep = n === 0 ? '' : n === items.length - 1 ? '' : '';
      return `<a href="${i.href}" class="${active ? 'active' : ''}">${esc(i.label)}${n > 0 && n < items.length - 1 ? ',' : n === items.length - 1 ? '.' : ''}</a>${sep}`;
    })
    .join(' ');
}

function masthead(site, { intro, activePath = '' } = {}) {
  return `
<header class="masthead wrap">
  <div class="lede">
    ${esc(site.brand.manifestoLeft)}
    <span class="bu-line mono">${buLine(null, activePath)}</span>
  </div>
  <div class="intro">${esc(intro || site.intros.home)}</div>
  <div class="mark"><img src="/assets/logo/icon-matter-black.png" alt="MATTER+ENERGY icon" width="36" height="37"></div>
</header>`;
}

function nav(current = '') {
  const links = [
    ['WORK', '/work'],
    ['ARCHIVE', '/archive'],
    ['NEWS', '/news'],
    ['ABOUT', '/about'],
  ];
  return `
<nav class="nav wrap" aria-label="Primary">
  <a class="wordmark" href="/">MATTER+ENERGY</a>
  <div class="links">
    ${links
      .map(([l, h]) => `<a href="${h}" ${current === h ? 'aria-current="page"' : ''}>${l}</a>`)
      .join('\n    ')}
  </div>
</nav>`;
}

function footer(site) {
  return `
<footer class="footer">
  <div class="foot-cols wrap">
    <div>${esc(site.brand.network)}</div>
    <div>Get in touch<br><a href="mailto:hello@matter-energy.com">hello@matter-energy.com</a></div>
    <div>Follow us at<br><a href="https://www.instagram.com/matterandenergy" rel="noopener" target="_blank">@matterandenergy</a></div>
    <div>Connect with us on<br><a href="https://www.linkedin.com/company/matterandenergy" rel="noopener" target="_blank">LinkedIn</a></div>
    <div>&copy; MATTER+ENERGY 2026<br>All rights reserved</div>
  </div>
  <div class="foot-logo"><img src="/assets/logo/icon-matter-white.png" alt="MATTER+ENERGY" loading="lazy"></div>
  <p class="foot-statement wrap">${esc(site.brand.footerStatement)}</p>
</footer>
<script src="/assets/js/site.js" defer></script>
</body>
</html>`;
}

/* media block: real image or branded placeholder (never stretched) */
function media(project, { cls = '', ratio = '' } = {}) {
  if (project.heroImage) {
    return `<div class="media-full ${cls}"><img src="${esc(project.heroImage)}" alt="${esc(project.title)} — ${esc(project.client)}" loading="lazy"></div>`;
  }
  return `<div class="ph ${ratio} ${cls}" role="img" aria-label="${esc(project.title)} — visual coming soon"><img class="ph-mark" src="/assets/logo/icon-matter-white.png" alt=""></div>`;
}

function captionRow(project) {
  return `
<div class="caption-row">
  <div class="cap-meta"><a href="/work/${esc(project.slug)}">${esc(project.title)}<br>${esc(project.client)}<br>${esc(project.year)}</a></div>
  <div></div>
  <p class="cap-desc">${esc(project.onePhraser)}</p>
</div>`;
}

function archiveCard(p) {
  return `
<a class="archive-card" href="/work/${esc(p.slug)}" data-filterable data-bu="${esc(p.businessUnits.join('|'))}" data-sector="${esc(p.sector)}" data-caps="${esc(p.capabilities.join('|'))}">
  <div class="a-meta">${esc(p.title)}<br>${esc(p.client)}<br>${esc(p.year)}</div>
  <p class="a-quote">&ldquo;${esc(p.onePhraser)}&rdquo;</p>
  ${p.heroImage ? `<div class="a-img"><img src="${esc(p.heroImage)}" alt="${esc(p.title)}" loading="lazy"></div>` : ''}
</a>`;
}

/* ---------- HOME ---------- */

function home({ site, projects, news }) {
  const feat = projects.filter((p) => p.published && p.featured);
  const hero = feat[0];
  const interview = news.find((n) => n.slug === 'manuel-nogueira-on-shots');
  const signals = news.find((n) => n.slug === 'matter-into-energy-what-we-care-about');
  const merchNews = news.find((n) => n.category === 'Merch');

  /* full-bleed solo slots take featured cases that have real imagery;
     paired slots may carry branded placeholders */
  const pool = feat.slice(1, 9);
  const imaged = pool.filter((p) => p.heroImage);
  const plain = pool.filter((p) => !p.heroImage);
  const solo1 = imaged[0] || plain[0];
  const solo2 = imaged[1] || plain[1];
  const rest = pool.filter((p) => p !== solo1 && p !== solo2);
  const pairA = rest.slice(0, 2);
  const pairB = rest.slice(2, 4);

  /* archive strip mirrors the wireframe rhythm: text cards with imagery mixed in */
  const nonFeatured = projects.filter((p) => p.published && !p.featured);
  const stripImaged = nonFeatured.filter((p) => p.heroImage).slice(0, 2);
  const stripPlain = nonFeatured.filter((p) => !p.heroImage).slice(0, 4);
  const archiveStrip = [
    stripPlain[0], stripImaged[0], stripPlain[1], stripPlain[2], stripImaged[1], stripPlain[3],
  ].filter(Boolean);

  let h = head({ title: 'MATTER+ENERGY — A Storehouse of Creative Energy', description: site.brand.manifestoLeft, path: '/' });
  h += masthead(site, { intro: site.intros.home, activePath: '' });
  h += nav('/');
  h += `
<section class="opening wrap reveal">
  <p>${esc(site.opening.line1)}</p>
  <p>${esc(site.opening.line2)}</p>
  <p>${esc(site.opening.line3)}</p>
  <p>${esc(site.opening.line4)}</p>
</section>`;

  if (hero) {
    h += `
<section class="media-hero">
  ${hero.video
    ? `<video src="${esc(hero.video)}" autoplay muted loop playsinline poster="${esc(hero.heroImage)}" aria-label="${esc(hero.title)}"></video>`
    : media(hero)}
</section>
<div class="wrap">${captionRow(hero)}</div>`;
  }

  h += `
<section class="values wrap">
  <p class="sys-label">Global System</p>
  ${site.values
    .map(
      (v) => `
  <div class="value-row reveal">
    <h2>${esc(v.title)}</h2>
    <p>${esc(v.copy)}</p>
  </div>`
    )
    .join('')}
</section>`;

  if (pairA.length) {
    h += `<section class="wrap"><div class="two-up">${pairA
      .map((p) => `<figure><a href="/work/${esc(p.slug)}">${media(p)}</a></figure>`)
      .join('')}</div>
      <div class="two-up">${pairA.map((p) => captionRow(p)).join('')}</div></section>`;
  }
  if (solo1) {
    h += `<section><a href="/work/${esc(solo1.slug)}">${media(solo1, { cls: 'media-hero' })}</a><div class="wrap">${captionRow(solo1)}</div></section>`;
  }

  if (interview) {
    h += `
<section class="feature wrap reveal">
  <div class="f-copy">
    <span class="f-cat">${esc(interview.category)}</span>
    <h2>${esc(interview.title)}</h2>
    <a class="f-link" href="/news/${esc(interview.slug)}">${esc(interview.cta)}</a>
  </div>
  <div class="f-media"><img src="${esc(interview.image)}" alt="${esc(interview.title)}" loading="lazy"></div>
</section>`;
  }

  h += `
<section class="wrap">
  <div class="archive-grid">
    ${archiveStrip.map(archiveCard).join('')}
  </div>
</section>`;

  if (signals) {
    h += `
<section class="feature feature--flip wrap reveal">
  <div class="f-copy">
    <span class="f-cat">${esc(signals.category)}</span>
    <h2>${esc(signals.title)}</h2>
    <a class="f-link" href="/news/${esc(signals.slug)}">${esc(signals.cta)}</a>
  </div>
  <div class="f-media"><img src="${esc(signals.image)}" alt="${esc(signals.title)}" loading="lazy"></div>
</section>`;
  }

  if (pairB.length) {
    h += `<section class="wrap"><div class="two-up">${pairB
      .map((p) => `<figure><a href="/work/${esc(p.slug)}">${media(p)}</a></figure>`)
      .join('')}</div>
      <div class="two-up">${pairB.map((p) => captionRow(p)).join('')}</div></section>`;
  }
  if (solo2) {
    h += `<section><a href="/work/${esc(solo2.slug)}">${media(solo2, { cls: 'media-hero' })}</a><div class="wrap">${captionRow(solo2)}</div></section>`;
  }

  if (merchNews) {
    h += `
<section class="feature wrap reveal">
  <div class="f-copy">
    <span class="f-cat">${esc(merchNews.category)}</span>
    <h2>${esc(merchNews.title)}</h2>
    <a class="f-link" href="/news/${esc(merchNews.slug)}">${esc(merchNews.cta)}</a>
  </div>
  <div class="f-media"><img src="${esc(merchNews.image)}" alt="${esc(merchNews.title)}" loading="lazy"></div>
</section>
<section class="merch-strip wrap">
  ${site.merch.items
    .map(
      (m) => `
  <div class="merch-item">
    <div class="m-img"><img src="${esc(m.image)}" alt="${esc(m.title)}" loading="lazy"></div>
    <div class="m-meta">${esc(m.title)}</div>
    <p class="m-note">${esc(m.note)}</p>
    <a class="m-shop" href="/news/${esc(merchNews.slug)}">Shop</a>
  </div>`
    )
    .join('')}
</section>`;
  }

  h += footer(site);
  return h;
}

/* ---------- WORK INDEX ---------- */

function work({ site, projects, query = {} }) {
  /* Work = the curated selection (featured cases). The full body of work lives
     in the Archive and in the index table below. */
  const selected = projects.filter((p) => p.published && p.featured);
  const others = projects.filter((p) => p.published && !p.featured);
  let h = head({ title: 'Work — MATTER+ENERGY', description: site.intros.work, path: '/work' });
  h += masthead(site, { intro: site.intros.work, activePath: '/work' });
  h += nav('/work');
  h += `<div class="wrap"><p class="filter-status" id="filter-status" hidden></p></div>`;
  h += `<section class="work-grid wrap" id="work-grid" data-initial-bu="${esc(query.bu || '')}">`;

  selected.forEach((p, i) => {
    const full = i % 3 === 2; /* rhythm: two half-cells, one full-bleed */
    h += `
<div class="work-cell ${full ? 'work-cell--full' : ''}" data-filterable data-bu="${esc(p.businessUnits.join('|'))}" data-sector="${esc(p.sector)}" data-caps="${esc(p.capabilities.join('|'))}">
  <figure>
    <a href="/work/${esc(p.slug)}"><div class="w-img">${
      p.heroImage
        ? `<img src="${esc(p.heroImage)}" alt="${esc(p.title)} — ${esc(p.client)}" loading="lazy">`
        : `<div class="ph" role="img" aria-label="${esc(p.title)}"><img class="ph-mark" src="/assets/logo/icon-matter-white.png" alt=""></div>`
    }</div></a>
  </figure>
  ${captionRow(p)}
</div>`;
  });

  h += `</section>`;

  if (others.length) {
    h += `
<h2 class="giant-heading">The Full Body of Work</h2>
<section class="wrap table-scroll">
  <table class="index-table">
    <thead><tr><th>Identification</th><th>Project</th><th>Client</th><th>Industry</th><th>Type</th><th>Year</th></tr></thead>
    <tbody>
      ${others
        .map(
          (p) => `<tr data-filterable data-bu="${esc(p.businessUnits.join('|'))}">
        <td class="mono-cell">${esc(p.id)}</td>
        <td><a href="/work/${esc(p.slug)}">${esc(p.title)}</a></td>
        <td>${esc(p.client.split(';')[0].split(',')[0])}</td>
        <td>${esc(p.sector)}</td>
        <td>${esc(p.type)}</td>
        <td class="mono-cell">${esc(p.year)}</td>
      </tr>`
        )
        .join('\n      ')}
    </tbody>
  </table>
</section>`;
  }

  h += footer(site);
  return h;
}

/* ---------- CASE PAGE ---------- */

function workCase({ site, project: p, next }) {
  let h = head({
    title: `${p.title} — MATTER+ENERGY`,
    description: p.onePhraser,
    path: `/work/${p.slug}`,
  });
  h += `
<header class="case-head wrap">
  <div class="lede">
    ${esc(site.brand.manifestoLeft)}
    <span class="bu-line mono">${buLine(null, '/work')}</span>
  </div>
  <div class="case-title">
    <h1>${esc(p.title)}</h1>
    <p class="case-byline">Created by MATTER for <a href="/work">${esc(p.client)}</a> — ${esc(p.year)}</p>
    <p class="case-sub">${esc(p.onePhraser)}</p>
  </div>
</header>`;
  h += nav('/work');
  h += `<section class="media-hero">${
    p.video
      ? `<video src="${esc(p.video)}" autoplay muted loop playsinline poster="${esc(p.heroImage)}" aria-label="${esc(p.title)}"></video>`
      : p.heroImage
      ? `<img src="${esc(p.heroImage)}" alt="${esc(p.title)} — ${esc(p.client)}">`
      : `<div class="ph" role="img" aria-label="${esc(p.title)} — visual coming soon"><img class="ph-mark" src="/assets/logo/icon-matter-white.png" alt=""></div>`
  }</section>`;

  h += `
<section class="case-about wrap">
  <span class="label">About</span>
  <div class="body">${esc(p.longDescription)}</div>
</section>`;

  if (p.gallery && p.gallery.length) {
    h += `<section class="case-gallery wrap">`;
    p.gallery.forEach((g, i) => {
      h += `<div class="${p.gallery.length === 1 || i === p.gallery.length - 1 && p.gallery.length % 2 === 1 ? 'g-full' : ''}"><img src="${esc(g)}" alt="${esc(p.title)} — image ${i + 2}" loading="lazy"></div>`;
    });
    h += `</section>`;
  }

  h += `
<section class="case-info wrap">
  <div>
    <span class="label">Project Information</span>
    <ul>
      <li>${esc(p.type)}</li>
      <li>${esc(p.sector)}</li>
      <li>${esc(p.year)}</li>
    </ul>
  </div>
  <div>
    <span class="label">Deliverables</span>
    <ul>${p.deliverables.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
  </div>
  <div>
    <span class="label">MATTER+ENERGY</span>
    <div class="who">${p.credits ? esc(p.credits) : 'Creative Direction<br>Strategy<br>Design<br>Motion Design<br>Account Direction<br>Project Management<br>Production'}</div>
  </div>
  <div>
    <span class="label">${esc(p.client.split(';')[0])}</span>
    <div class="who">Client Partner</div>
  </div>
</section>
<div class="case-next wrap">${next ? `<a href="/work/${esc(next.slug)}">Next</a>` : `<a href="/work">Back to Work</a>`}</div>`;
  h += footer(site);
  return h;
}

/* ---------- ARCHIVE ---------- */

function archive({ site, projects }) {
  const list = projects.filter((p) => p.published);
  let h = head({ title: 'Archive — MATTER+ENERGY', description: site.intros.archive, path: '/archive' });
  h += masthead(site, { intro: site.intros.archive, activePath: '' });
  h += nav('/archive');
  h += `<section class="wrap"><div class="archive-grid">${list.map(archiveCard).join('')}</div></section>`;
  h += footer(site);
  return h;
}

/* ---------- NEWS ---------- */

function news({ site, news }) {
  const list = news.filter((n) => n.published).sort((a, b) => a.order - b.order);
  let h = head({ title: 'News — MATTER+ENERGY', description: site.intros.news, path: '/news' });
  h += masthead(site, { intro: site.intros.news, activePath: '' });
  h += nav('/news');
  list.forEach((n, i) => {
    const flip = n.imageSide === 'left';
    h += `
<section class="news-row ${flip ? 'news-row--flip' : ''} wrap reveal">
  <div class="n-copy">
    <span class="n-cat">${esc(n.category)}</span>
    <h2>${esc(n.title)}</h2>
    <a class="n-link" href="/news/${esc(n.slug)}">${esc(n.cta)}</a>
  </div>
  <div class="n-media"><a href="/news/${esc(n.slug)}"><img src="${esc(n.image)}" alt="${esc(n.title)}" loading="${i > 0 ? 'lazy' : 'eager'}"></a></div>
</section>`;
  });
  h += footer(site);
  return h;
}

function newsArticle({ site, item: n, next }) {
  let h = head({ title: `${n.title} — MATTER+ENERGY`, description: n.excerpt, path: `/news/${n.slug}` });
  h += masthead(site, { intro: n.intro || n.excerpt, activePath: '' });
  h += nav('/news');
  h += `<section class="article-hero ${n.heroFit === 'contain' ? 'article-hero--contain' : ''} wrap"><div class="hero-frame"><img src="${esc(n.image)}" alt="${esc(n.title)}"></div></section>`;
  h += `
<div class="article-title wrap">
  <p class="kicker">${esc(n.category)}</p>
  <h1>${esc(n.heroTitle || n.title)}${n.heroSubtitle ? `<br>${esc(n.heroSubtitle)}` : ''}</h1>
</div>
<section class="article-body wrap">
  <span class="label">About</span>
  <div class="content">
    ${n.body
      .map((b) => {
        if (b.type === 'h2') return `<h2>${esc(b.text)}</h2>`;
        if (b.type === 'quote') return `<blockquote>${esc(b.text)}</blockquote>`;
        if (b.type === 'caption') return `<p class="caption">${esc(b.text)}</p>`;
        return `<p>${esc(b.text)}</p>`;
      })
      .join('\n    ')}
  </div>
  <span></span>
</section>
<div class="article-foot wrap">
  <a href="/news">Back to News</a>
  ${next ? `<a href="/news/${esc(next.slug)}">Next</a>` : ''}
</div>`;
  h += footer(site);
  return h;
}

/* ---------- ABOUT ---------- */

function about({ site, projects }) {
  const a = site.about;
  const published = projects.filter((p) => p.published);
  let h = head({ title: 'About — MATTER+ENERGY', description: a.columns[0].copy.slice(0, 150), path: '/about' });
  h += masthead(site, { intro: site.intros.archive, activePath: '' });
  h += `<div class="about-hero wrap"><h1>${esc(a.headline)}</h1></div>`;
  h += nav('/about');
  h += `
<section class="cols-4 wrap" style="padding-top: clamp(30px, 3.5vw, 64px);">
  ${a.columns
    .map(
      (c) => `
  <div class="col">
    <h3>${esc(c.label)}</h3>
    <div class="body">${esc(c.copy)}</div>
  </div>`
    )
    .join('')}
</section>
<p class="centered-statement">${esc(a.statement)}</p>
<section class="cols-4 wrap">
  <div class="col">
    <h3>(V) Clients</h3>
    <div class="body">${a.clients.map(esc).join(' · ')}</div>
  </div>
  <div class="col">
    <h3>(VI) Service List</h3>
    <ul>${a.services.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
  </div>
  <div class="col">
    <h3>(VII) Team</h3>
    <ul>${a.team.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  </div>
  <div class="col">
    <h3>(VIII) Contact</h3>
    <div class="body">${esc(a.contact.line)}

${a.contact.offices.map(esc).join('\n')}

Get in touch
<a href="mailto:${esc(a.contact.email)}">${esc(a.contact.email)}</a>

Follow us at
${esc(a.contact.instagram)}

Connect with us on
LinkedIn</div>
  </div>
</section>
<h2 class="giant-heading">The Framework</h2>
<section class="wrap">
  ${a.framework
    .map(
      (f) => `
  <div class="framework-row">
    <h3>${esc(f.title)}</h3>
    <p>${esc(f.copy)}</p>
  </div>`
    )
    .join('')}
</section>
<h2 class="giant-heading">The Work</h2>
<section class="wrap table-scroll">
  <table class="index-table">
    <thead><tr><th>Identification</th><th>Client</th><th>Industry</th><th>Project Description</th><th>Type</th><th>Year</th></tr></thead>
    <tbody>
      ${published
        .map(
          (p) => `<tr>
        <td class="mono-cell">${esc(p.id)}</td>
        <td><a href="/work/${esc(p.slug)}">${esc(p.client.split(';')[0].split(',')[0])}</a></td>
        <td>${esc(p.sector)}</td>
        <td>&ldquo;${esc(p.onePhraser)}&rdquo;</td>
        <td>${esc(p.type)}</td>
        <td class="mono-cell">${esc(p.year)}</td>
      </tr>`
        )
        .join('\n      ')}
    </tbody>
  </table>
</section>
<div class="careers">Open Positions<br><a href="mailto:hello@matter-energy.com?subject=Open%20Positions">[Careers Link]</a></div>`;
  h += footer(site);
  return h;
}

/* ---------- BU VERTICAL (ghost page) ---------- */

function buPage({ site, bu, projects }) {
  const buProjects = projects.filter(
    (p) => p.published && (p.businessUnits.includes(bu.name) || p.sector === bu.name)
  );
  const featured = buProjects.filter((p) => p.featured);
  const rest = buProjects.filter((p) => !p.featured);
  const povStatement = bu.povHeadline
    .split(/,\s*(?=and\s)/i)
    .map((s) => s.trim())
    .join(',<br>');

  let h = head({
    title: `${bu.name} — MATTER+ENERGY`,
    description: bu.positioning,
    noindex: true,
    path: `/${bu.slug}`,
  });
  h += `
<header class="masthead wrap">
  <div class="lede">
    ${esc(site.brand.manifestoLeft)}
    <span class="bu-line mono">${buLine(null, `/${bu.slug}`)}</span>
  </div>
  <div class="intro">${esc(bu.positioning)}</div>
  <div class="mark"><img src="/assets/logo/icon-matter-black.png" alt="MATTER+ENERGY icon" width="36" height="37"></div>
</header>
<h1 class="bu-positioning wrap">${esc(bu.positioningHeadline)}</h1>`;
  h += nav('');
  h += `
<h2 class="giant-heading">${esc(bu.name)}</h2>
<section class="bu-povs wrap">
  ${bu.povs
    .map(
      (p) => `
  <div class="pov">
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.copy)}</p>
  </div>`
    )
    .join('')}
</section>
<p class="bu-serif">${povStatement.charAt(0).toUpperCase() + povStatement.slice(1)}</p>`;

  featured.slice(0, 3).forEach((p) => {
    h += `<section><a href="/work/${esc(p.slug)}">${media(p, { cls: 'media-hero' })}</a><div class="wrap">${captionRow(p)}</div></section>`;
  });

  if (rest.length) {
    h += `<section class="wrap"><div class="archive-grid">${rest.slice(0, 12).map(archiveCard).join('')}</div></section>`;
  }

  h += `
<section class="wrap table-scroll">
  <table class="index-table">
    <thead><tr><th>Identification</th><th>Client</th><th>Industry</th><th>Project Description</th><th>Type</th><th>Year</th></tr></thead>
    <tbody>
      ${buProjects
        .map(
          (p) => `<tr>
        <td class="mono-cell">${esc(p.id)}</td>
        <td><a href="/work/${esc(p.slug)}">${esc(p.client.split(';')[0].split(',')[0])}</a></td>
        <td>${esc(p.sector)}</td>
        <td>&ldquo;${esc(p.onePhraser)}&rdquo;</td>
        <td>${esc(p.type)}</td>
        <td class="mono-cell">${esc(p.year)}</td>
      </tr>`
        )
        .join('\n      ')}
    </tbody>
  </table>
</section>
<section class="cols-4 wrap">
  <div class="col">
    <h3>(V) Clients</h3>
    <div class="body">${bu.clients.map(esc).join('\n')}</div>
  </div>
  <div class="col">
    <h3>(VI) Service List</h3>
    <ul>${bu.services.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
  </div>
  <div class="col">
    <h3>(VII) Team</h3>
    <ul>${bu.team.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  </div>
  <div class="col">
    <h3>(VIII) Contact</h3>
    <div class="body">Get in touch
<a href="mailto:hello@matter-energy.com">hello@matter-energy.com</a>

Follow us at
@matterandenergy

Connect with us on
LinkedIn</div>
  </div>
</section>`;
  h += footer(site);
  return h;
}

/* ---------- 404 ---------- */

function notFound(site) {
  let h = head({ title: 'Not Found — MATTER+ENERGY', noindex: true, path: '/404' });
  h += nav('');
  h += `<div class="careers" style="padding-top: 18vh; padding-bottom: 22vh;">This page lacks presence.<br><a href="/">Return to matter</a></div>`;
  h += footer(site);
  return h;
}

module.exports = { home, work, workCase, archive, news, newsArticle, about, buPage, notFound, esc };
