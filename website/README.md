# MATTER+ENERGY — Official Website

The matter-energy.com website plus its admin backend, built from the
[Ext] M&E_Website_Wireframe Figma file and the M+E Oficial Website content
depository (Drive). Zero-dependency Node.js — no build step, no npm install.

## Run

```bash
cd website
node server.js          # http://localhost:3000
PORT=8080 node server.js
```

## Structure

```
website/
├── server.js          HTTP server, routing, JSON API, session auth
├── lib/templates.js   Server-rendered pages (design system from the Figma wireframe)
├── data/
│   ├── site.json      Global copy: manifestos, values, about, framework, merch
│   ├── projects.json  All 63 projects from the Selected Projects sheet
│   ├── news.json      News/editorial items with article bodies
│   ├── bus.json       Business-unit verticals (ghost pages)
│   └── users.json     Admin users (created on first boot)
├── public/            Static assets: CSS, JS, fonts (ABC Diatype), logos, imagery
└── admin/             Admin SPA: login + dashboard
```

## Pages

| Route | Page |
|---|---|
| `/` | Landing — manifesto, hero film, Global System values, featured cases, archive strip, editorial, merch |
| `/work` | Work index (filter by business unit via `?bu=Tech` or the masthead line) |
| `/work/:slug` | Case page — hero, about, gallery, project information, next |
| `/archive` | Full archive grid (minimal captions, no case treatment) |
| `/news` | News index — Project Stories, Reports, Interviews, Signals, Merch, Press |
| `/news/:slug` | Article page |
| `/about` | About — argument, how we are built, fundamentals, people, framework, work index, careers |
| `/entertainment`, `/branding` | **Hidden vertical ghost pages** — not linked from nav, `noindex`, disallowed in robots.txt. Share the URL directly. |
| `/admin` | Admin login → dashboard |

## Admin

- **URL:** `/admin`
- **Seed user:** `manuel@matter-energy.com`
- **Initial password:** `PresenceOverPerformance!26` (or set `ADMIN_PASSWORD` env var
  before first boot). The dashboard prompts you to change it on first login.
- Sessions are HttpOnly cookies (8h), passwords hashed with scrypt.

What you can do:
- **Projects** — add new projects with every field from the sheet (title, client,
  industry, sector, one-phraser, long description, type, year, business units,
  deliverables, credits, imagery, Drive folder, notes), publish/hide, feature/unfeature,
  reorder, edit, delete. Changes go live immediately (server renders from JSON).
- **News** — publish/hide editorial items.
- **Verticals** — see the ghost-page URLs for each business unit.

## Content status

- Copy comes from the **M+E_Website_Content** doc (V2 preferred) and the
  **[FOR REVIEW] projects sheet**. 63 projects imported; 15 curated as featured
  following the "Cases prioritários" criteria (relevance, variety, visual strength).
- 6 projects seeded as **hidden** (unannounced / in-development / confidential):
  NewCo, Donos do Jogo S02, S&X, Spotify Podfluence, Nando Entre Dois Mundos,
  Dom de Iludir. Publish them from the admin whenever they're cleared.
- Projects without approved imagery render a branded placeholder (black block,
  tt mark) — never a stretched or stock image. Swap in real assets via the admin's
  image path fields as case materials get approved.

## Deployment note

`matter-energy.com/entertainment` is served by this app directly. If you also want
`entertainment.matter-energy.com`, point the subdomain at the same app and add a
host-based rewrite to `/entertainment` at your proxy/CDN.
