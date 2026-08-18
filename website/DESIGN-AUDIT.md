# Design audit — MATTER+ENERGY site

Full-site audit of `public/assets/css/site.css`, `lib/templates.js`, `public/assets/js/site.js`
and all 10 rendered routes. Items marked **DONE** are fixed in this branch; the rest are the
open backlog, in priority order.

---

## Fixed in this branch

### 1. Hero crops were inert — the root cause **DONE**
`.media-hero` set only `max-height`, so the child's `height: 100%` resolved against an
indefinite box and computed to `auto`. Consequences:

- `object-fit: cover` never executed
- the parent's `overflow: hidden` did the cropping, so every hero was **top-clipped**, never
  cropped from a focal point
- `object-position` could not have worked at all
- `min-height: 52vh` was also dead

Measured loss at 1440×900 before the fix:

| Slot | Source | Ratio | Visible |
|---|---|---|---|
| `/` hero, FIFA case | `fifa-type.mp4` 1080×1920 | 0.56 | top 30% |
| `/branding` full-bleed | `fifa-hero.jpg` 1200×1700 | 0.71 | top 38% |
| `/` solo, `/entertainment` | `ent-sintonia-03`, `ent-avatar-02` | 0.80 | top 43% |

Fix: `height: clamp(52vh, 46vw, 86vh)` gives the box a definite height, `cover` engages, and
the slot ratio drops from ~3.08:1 to ~2.18:1 — portrait sources keep far more of the frame.

### 2. No `object-position` anywhere, against a ~80% portrait library **DONE**
Nine cover/aspect-ratio slots all cropped dead-centre. Each now reads
`object-position: var(--focus, <slot default>)`:

| Selector | Slot | Default |
|---|---|---|
| `.media-hero > img, > video` | ~2.18:1 | `50% 35%` |
| `.work-cell .w-img > img` | 16:10 | `50% 30%` |
| `.news-row .n-media img` | 5:4 | `50% 25%` |
| `.article-hero img` | ~2:1 | `50% 25%` |
| `.archive-card .a-img img` | 1:1 | `50% 35%` |
| `.case-gallery img` | grid-driven | `50% 35%` |
| `.mosaic img` | 1:1 | `50% 35%` |
| `.merch-item .m-img img` | 4:5 | `50% 50%` |
| `.reel video, .reel img` | 9:16 | `50% 50%` |

`heroFocus` is now a real field: added to `PROJECT_FIELDS` (server.js) and emitted as an inline
`--focus` custom property by `focus()` in templates.js (7 call sites). Set per asset from
looking at the actual frames:

- `fifa-hero` → `50% 22%` — the "football is calling" board sits high; centre held empty seats
- `ent-avatar-02` → `50% 38%` — the earth-relief faces sit above the Netflix type
- `portrait-manuel` → `50% 26%` — both faces are in the top third of a 9:16 frame
- Sintonia / Caramelo / Take a Hike → `50% 40–45%`; Razr / VidCon → `50% 50%`

### 3. Other fixes **DONE**
- **Filter reported a count for an empty grid.** `querySelectorAll('[data-filterable]')` matched
  both work cells and index-table rows, so `/work?bu=Beauty` read "6 projects" above a blank
  grid. Now scoped to `#work-grid`, with the table filtered separately and a real empty state.
- **Two nav items current at once.** Server marked `ALL.`, JS then marked the `?bu=` link. JS
  now clears the server's mark first.
- **Nav overflowed below ~500px.** `1fr 1fr` gave the links a ~167px column for ~230px of text.
  Now `auto minmax(0,1fr)` with `flex-wrap` and right justification.
- **`.case-info` never collapsed on mobile** — redefined at 1100px, omitted at 720px, so it
  stayed two-column on a 375px phone. Added to the 720px block.
- **Content invisible without JS.** `.reveal { opacity: 0 }` covers the opening statement, all
  four values and every news row. Added a `<noscript>` override in `head()`.
- **No focus styles at all** in 603 lines, against 14 `:hover` rules — and `.archive-card` is a
  large block link. Added `:focus-visible` with an inverse on dark surfaces.
- **`prefers-reduced-motion` half-honoured.** `scroll-behavior: smooth` was unguarded and
  `site.js` autoplayed every hero video regardless. Both now respect it; videos get `controls`
  when motion is reduced.
- **No `<h1>` on `/`, `/work`, `/news`, `/archive`**; `/archive` had no headings at all across
  55 cards. Added `.sr-only` h1s — these layouts open on display copy, not a headline.
- **Palette leaks.** `#E9E9E7` (a *warm* grey) and `#111` (a third black) are now
  `var(--shade)` and `var(--black)`; the dead `--hairline` token now backs `.index-table td`,
  which disagreed with its own `th` rule by 2.25×.

---

## Open backlog

### P1 — visible defects
1. **`.case-gallery img`** has no `aspect-ratio`, so grid row-stretch drives the crop: on the
   FIFA case, `fifa-03` is stretched to `fifa-street`'s row and loses ~19% of its width off both
   sides. Fix with `align-items: start` and drop `height: 100%`.
2. **`.two-up` figures on `/about`** (templates.js ~557) have no image rule — no `.media-full`
   wrapper, nothing in the stylesheet matches. `life-07`/`life-10` are both 1080×1920 and render
   ~1280px tall each. The only unconstrained image slot on the site.
3. **Mosaic leaves a black hole.** `/entertainment` renders 11 images in a 4-column grid, so the
   last row is 3/4 filled and the empty cell shows the container's black. Round the slice down
   to a multiple of the column count (4, and 3 at ≤720px).
4. **Duplicate images on one page.** `/` shows `merch-02.jpg` twice ~200px apart (uncropped in
   the feature, 4:5-cropped in the strip); `/archive` shows `razr-red.png` twice
   (`motorola-2025-edge` and `motorola-razr-batch-1-2` share a `heroImage`).
5. **`og:image` is portrait under `summary_large_image`** — platforms crop to 1.91:1, so the same
   head-crop happens off-site. `/work`, `/archive`, `/news`, `/about` and the BU pages pass no
   image at all.
6. **`heroKind` honoured by one renderer of three.** `buPage` respects it; `home` and `work`
   ignore it, so `sound-vol1.jpg` (a square typographic album cover) gets a half-page homepage
   slot and a 16:10 crop on `/work`. Same for `heroFit: "contain"` in news.json — honoured on the
   article, ignored on `/news` and in home features. The data already says "don't crop this".
7. **The full-bleed filter checks type but not orientation** (templates.js ~642). The comment
   says photography only; `ent-avatar-02` is a 4:5 portrait photo and still lands full-bleed.
   Add a ratio/orientation gate.

### P2 — coherence
8. **`.feature` and `.news-row` are the same component twice**, and render the *same* news items.
   They differ in h2 size, copy gap, section padding, whether the image is cropped (`auto` vs
   `5/4 cover`) and whether it links. `portrait-manuel` is therefore full-height on `/` and a 45%
   mid-torso band on `/news`. Merge them.
9. **Three unrelated ratios across the three index components** — news 5:4, archive 1:1, work
   16:10/21:9 — with three different vertical-rhythm mechanisms. Archive quotes the `onePhraser`;
   the work caption prints the same string unquoted.
10. **`/branding` is not a sibling of `/entertainment`.** Same renderer, but no BU hero, no
    mosaic, 1 full-bleed vs 3, and 4 archive cards with zero images. Its only visual is
    `fifa-hero.jpg` — a Tech/Entertainment campaign. Give `bus.json` its own `heroImage`/mosaic
    (both `null` today) or gate the page on a minimum asset count.
11. **Two routes per business unit.** The masthead sends Beauty/Connections/Tech to `/work?bu=…`
    and Branding/Entertainment to their own pages. Both `/work?bu=Branding` and `/branding` return
    200 with **different** result sets — and the dedicated pages are `noindex` and absent from the
    sitemap while being linked from every masthead on the site.
12. **Two index-table schemas.** `/work` uses `… | Project | Client | …`; `/about` and the BU
    pages use `… | Client | Industry | Project Description | …`. Column 2 is the title in one and
    the client in the other.
13. **Header architecture differs per page** — `/about` and the BU pages push the sticky nav
    below a display-scale h1; case pages silently drop the tt mark every other page carries.
14. **`.two-up { align-items: end }`** bottom-aligns the caption blocks, so two captions of
    unequal length don't align at the top. Should be `start` for the caption row.
15. **Caption component has three wrapping conventions** across its call sites.

### P3 — system hygiene
16. **The type scale is not a scale.** Ten fixed sizes in a 5px range in half-pixel steps; the
    mono label appears at 12px, 11.5px and 11px with no rule; seven body-copy sizes for prose;
    `.bu-povs .pov h3` at 14.5px vs `.cols-4 .col h3` at 15px for two identical components; nine
    display steps sharing no ratio; six tracking values.
17. **26 distinct spacing steps, 16 used once.** Only `--gutter` and `--col-gap` are tokenised.
    Three near-identical variants of one step sit on adjacent sections
    (`clamp(48px,6vw,110px|100px|90px)`). Add `--space-1…6` and map all 26 on.
18. **`.mono` is re-declared verbatim 15 times** while the class itself is used 3 times, and its
    `line-height` drifts across the copies (1.5 / 1.55 / 1.6 / 1.7 / inherited).
19. **Fully duplicated selector pairs**: `.feature .f-cat` ≡ `.news-row .n-cat`;
    `.feature .f-link` ≡ `.news-row .n-link`; `.feature--flip` ≡ `.news-row--flip`.
20. **Grids share no column lines** — masthead 5/5/2, nav auto/1fr, caption-row 3/4/5, case-head
    1/1, case-about 3/9, case-info 3/3/3/3, article-body 3/6/3, footer 5. `.caption-row` is a
    nested grid, not a subgrid, so `.cap-desc` lands on a different line in every context.
21. **Sibling prose components diverge**: `.article-body .content` is 6/12 at 15px,
    `.case-about .body` is 9/12 at 14px — both capped at `46em`, so the wider one leaves ~400px
    empty.
22. **Dead code**: `.ph` placeholder system never renders (every elected project has a hero) —
    22 lines plus five `!important`s and a `media()` branch; `.ph--tall/--square/--gray` are
    unreachable even from there (`media()`'s `ratio` param is never passed by any of its 7 call
    sites). Also `.serif-statement`, `.mono-muted`, the whole `.reel*`/`.article-video` block
    with its orphan 900px breakpoint (no `reels` or `video` block exists in news.json), the
    always-`''` three-branch ternary at templates.js:49, and `merch.items[].price` / `merch.link`
    which are never rendered.
23. **Dead links and inconsistent affordances**: all four merch "Shop" links point at the same
    news article; About and BU contact columns render Instagram/LinkedIn as plain text while the
    footer links them; `[Careers Link]` is a literal placeholder; `.index-table tr:hover` gives
    hover feedback on all 55 rows while only 7 are linked; home feature images aren't linked
    while the identical `/news` image is.
24. **Semantics**: `alt="… — image 2"` is positional; 11 mosaic images carry `alt=""` as
    portfolio content; no `<caption>` or `scope="col"` on the three index tables;
    `.table-scroll` has no `tabindex="0"`/`role="region"`; `lang="en"` with Portuguese and
    Japanese content; a `role="img"` div containing an `<img>`.
25. **Empty grid cells shipped as markup** — `<div></div>` in every caption row, `<span></span>`
    in every article body.
26. **The home rhythm can't be filled by the data.** `feat` = 7 elected × featured = 5;
    `pool = feat.slice(1,9)` = 4; after two solos, `rest` = 2, so `pairB` is always empty and its
    branch is dead until there are ≥7 featured case pages.
27. **34 unreferenced assets** in `public/assets/img/`, including all 14 `social-*.jpg`, the three
    `clip-*.mp4` + posters, and four team portraits — while `/about` has no team imagery.
28. **35 unused merch/life images** vs 4 merch slots; consider curating rather than carrying.

---

## Editorial note on the elected set

Seven projects carry case pages; 48 are on the record, unlinked. All seven have a hero plus a
gallery and every referenced file exists. The set is Entertainment-heavy (5 of 7) with 2 Tech and
**0 Beauty/CPG** — because all six Beauty projects have zero assets, not because the capability
is missing. Electing any of them today would ship a text-only case page, which is the opposite of
what the positioning claims. The fix is assets, not election.
