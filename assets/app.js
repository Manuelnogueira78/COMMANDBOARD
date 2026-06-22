/* ============================================================
   MATTER COMMAND BOARD — App  (render + interaction)
   Reads window.MATTER_STORE (the Notion mirror), overlays the
   user's local intake (localStorage), derives flags via Engine,
   and renders the editorial board. Drafts only — never sends.
   ============================================================ */
(function () {
  "use strict";
  const E = window.Engine;
  const SEED = window.MATTER_STORE;
  const LS_KEY = "matter_command_board_v1";
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const slackUrl = cid => SEED.meta.slackBase + cid;

  // ---------- STATE ----------
  function loadLocal() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
  function saveLocal(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)); }
  let local = loadLocal();
  local.items = local.items || [];          // user-added items (staged for Notion)
  local.cleared = local.cleared || {};       // flag code+ref -> true

  function workingItems() {
    const map = {};
    SEED.items.forEach(i => map[i.id] = i);
    local.items.forEach(i => map[i.id] = i);  // local overrides/extends
    return Object.values(map);
  }
  function stagedCount() { return local.items.length; }

  function computeHeat() {
    return SEED.heat.map(h => Object.assign({}, h, { score: E.scoreHeat(h), tier: E.heatTier(E.scoreHeat(h)) }))
      .sort((a, b) => b.score - a.score);
  }
  function computeFlags(items, heat) {
    return E.detectStructuralFlags(items, heat)
      .filter(f => !local.cleared[f.code + ":" + (f.refItem || f.refHeat || f.refOwner || f.title)]);
  }

  // ---------- RENDER ----------
  function render() {
    const items = workingItems();
    const heat = computeHeat();
    const flags = computeFlags(items, heat);

    const tasks = items.filter(i => i.type === "task");
    const live = tasks.filter(i => i.stage === "live");
    const pre  = tasks.filter(i => i.stage === "pre-decision");
    const hold = tasks.filter(i => i.stage === "hold");
    const thoughts = items.filter(i => i.type === "thought");
    const gate = items.filter(i => i._unresolved);

    $("#board").innerHTML =
      sec_gate(gate) +
      sec_flags(flags) +
      sec_heat(heat) +
      sec_live(live) +
      sec_pre(pre) +
      sec_hold(hold, items) +
      sec_bets(live);

    renderStatus(flags, heat);
    bindBoard();
  }

  function renderStatus(flags, heat) {
    const d = new Date(SEED.meta.lastScan);
    const ageMin = Math.round((Date.now() - d) / 60000);
    const stale = ageMin > 720; // >12h
    $("#status").innerHTML =
      `<span class="mono"><span class="dot ${stale ? "idle" : "live"}"></span>${stale ? "STALE" : "LIVE"}</span>` +
      `<span class="mono">SCAN ${esc(d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }))}</span>` +
      `<span class="mono">${SEED.meta.scannedChannels.length} CHANNELS</span>` +
      `<span class="mono">${flags.length} FLAGS</span>` +
      `<span class="mono">${heat.length} HEAT</span>` +
      (stale ? `<span class="mono stale">↺ ask me to refresh</span>` : "");
    const sc = stagedCount();
    const banner = $("#commit");
    if (sc > 0) { banner.classList.add("show"); $("#commit-n").textContent = sc; }
    else banner.classList.remove("show");
  }

  function head(num, title, sub, count, cls) {
    return `<div class="section-head"><span class="num">${num}</span><h2>${title}</h2>` +
      (count != null ? `<span class="count ${cls || ""}">${count}</span>` : "") +
      (sub ? `<span class="sub">${sub}</span>` : "") + `</div>`;
  }

  // 1 — GATE
  function sec_gate(gate) {
    if (!gate.length) return `<section class="section">${head("01", "The Gate", "Should be empty. If it isn't, it's the first thing you see.")}` +
      `<p class="empty good">Nothing half-formed. Everything resolved to a dated task or a labeled thought.</p></section>`;
    return `<section class="section"><div class="gate"><div class="ghead"><span class="mono">⚑ Unresolved input — resolve before it creates a hunt</span></div>` +
      gate.map(g => `<div class="gate-item"><div class="txt">${esc(g.raw || g.item)}</div>` +
        `<button class="resume" data-resume="${g.id}">Resume intake →</button></div>`).join("") +
      `</div></section>`;
  }

  // 2 — FLAGS
  function sec_flags(flags) {
    const body = flags.length
      ? flags.map(f => `<div class="flag sev-${f.severity}">
          <div class="frow"><span class="ftag">${esc(f.code)}</span><h3>${esc(f.title)}</h3><span class="pattern">${esc(f.pattern)}</span></div>
          <ul class="evidence">${(f.evidence || []).map(e => `<li>${e}</li>`).join("")}</ul>
          <div class="move"><span class="lbl">One move</span><span>${esc(f.move)}</span>
            <span class="act"><button data-flag-route="${esc(f.refItem || "")}" data-flag-title="${esc(f.title)}">Convert to item</button>
            <button data-flag-clear="${esc(f.code + ":" + (f.refItem || f.refHeat || f.refOwner || f.title))}">Clear</button></span></div>
        </div>`).join("")
      : `<p class="empty good">No structural friction detected from the current scan. Evidence is thin elsewhere — the board is staying quiet rather than inflating.</p>`;
    return `<section class="section">${head("02", "Structural Flags", "Not tasks. Systemic frictions that create confusion.", flags.length, flags.length ? "hot" : "zero")}${body}</section>`;
  }

  // 3 — HEAT
  function sec_heat(heat) {
    const rows = heat.map((h, i) => {
      const bars = Object.values(h.signals).map(v => `<i style="height:${3 + v * 3}px"></i>`).join("");
      const link = h.itemId
        ? `<a class="heat-link has" href="#" data-scroll="${esc(h.itemId)}">${esc(h.itemId.replace(/^itm-/, ""))}</a>`
        : `<span class="heat-link orphan">ORPHAN — no item</span>`;
      return `<div class="heat-row t${h.tier}">
        <div class="heat-rank">${i + 1}</div>
        <div class="heat-main"><div class="what">${esc(h.what)}</div>
          <div class="scope">${esc(h.scope)}</div>
          <div class="why">${h.why}</div>
          <a class="scope" href="${slackUrl(h.cid)}" target="_blank" style="text-decoration:underline">open in slack ↗</a></div>
        <div class="heat-side"><div class="heat-score">${h.score}<span class="of">/100</span></div>
          <div class="spark">${bars}</div><br>${link}</div>
      </div>`;
    }).join("");
    return `<section class="section">${head("03", "Heat", "What's hot now — a read, not a to-do. The board never auto-creates tasks from this.", heat.length)}${rows}</section>`;
  }

  function itemRow(i) {
    const dc = E.dueClass(i.date);
    const chips = (i.constraint_flags || []).map(c => `<span class="chip c">${esc(c)}</span>`).join("") +
      (i.blocked_by ? `<span class="chip blocked">blocked</span>` : "");
    const date = i.date ? `<span class="idate ${dc}">${E.fmtDate(i.date)}${dc === "over" ? " · OVERDUE" : ""}</span>` : `<span class="idate">—</span>`;
    return `<div class="item" id="row-${esc(i.id)}">
      <div><div class="iname">${esc(i.item)}</div><div class="iflags">${chips}</div></div>
      <div class="iask">${esc(i.ask || "")}${i.assignee ? ` <span class="mono-sm">(${esc(i.assignee)})</span>` : ""}</div>
      ${date}
      <div class="iactions">
        <button data-draft="${esc(i.id)}">Draft message</button>
        <button data-close="${esc(i.id)}">Close</button>
        ${i.source ? `<button onclick="window.open('${slackUrl(i.source.cid)}')">Source: ${esc(i.source.channel)}</button>` : ""}
      </div></div>`;
  }

  // 4 — LIVE ITEMS by owner
  function sec_live(live) {
    const keys = ["joao", "ju", "matheus", "me"];
    const groups = keys.map(k => {
      const its = live.filter(i => i.owner === k);
      const over = its.length >= E.TH.owner_overload_k;
      return `<div class="owner-group"><div class="owner-bar ${over ? "overloaded" : ""}">
          <span class="oname">${esc(E.ownerName(k))}</span><span class="orole">${esc(E.ownerRole(k))}</span>
          <span class="oload">${its.length} live${over ? " · OVERLOAD" : ""}</span></div>
        ${its.length ? its.map(itemRow).join("") : `<p class="empty">No live items.</p>`}</div>`;
    }).join("");
    const unassigned = live.filter(i => !i.owner);
    return `<section class="section">${head("04", "Live Items", "The work that has shape — owner · ask · date.", live.length)}${groups}` +
      (unassigned.length ? `<div class="owner-group"><div class="owner-bar"><span class="oname">Unassigned</span></div>${unassigned.map(itemRow).join("")}</div>` : "") +
      `</section>`;
  }

  // 5 — PRE-DECISION (with age)
  function sec_pre(pre) {
    pre.sort((a, b) => E.ageDays(b.createdAt) - E.ageDays(a.createdAt));
    const body = pre.length ? `<div class="predecision">` + pre.map(i => {
      const age = E.ageDays(i.createdAt), aging = age > E.TH.decision_aging_days;
      return itemRow(i).replace("</div></div>", "") +
        `<div class="iactions"><span class="age ${aging ? "aging" : ""}">${age}d old${aging ? " · AGING" : ""}</span></div></div>`;
    }).join("") + `</div>` : `<p class="empty">Nothing waiting on reads.</p>`;
    return `<section class="section">${head("05", "Pre-Decision", "Needs reads before it can have an owner. Aging ones rise.", pre.length)}${body}</section>`;
  }

  // 6 — HOLD
  function sec_hold(hold, items) {
    const byId = {}; items.forEach(i => byId[i.id] = i);
    const body = hold.length ? `<div class="hold">` + hold.map(i => {
      const blk = byId[i.blocked_by] ? byId[i.blocked_by].item : i.blocked_by;
      return `<div class="item">
        <div><div class="iname">${esc(i.item)}</div><div class="iflags"><span class="chip blocked">blocked_by</span></div></div>
        <div class="iask">${esc(i.ask || "")}</div>
        <div class="idate">⏸ ${esc(blk)}</div>
        <div class="iactions"><button data-unblock="${esc(i.id)}">Unblock → live</button>${i.source ? `<button onclick="window.open('${slackUrl(i.source.cid)}')">${esc(i.source.channel)}</button>` : ""}</div>
      </div>`;
    }).join("") + `</div>` : `<p class="empty">Nothing on hold.</p>`;
    return `<section class="section">${head("06", "Hold", "Real, but not the hour yet. No date until unblocked.", hold.length)}${body}</section>`;
  }

  // 7 — BETS
  function sec_bets(live) {
    const bets = SEED.config.bets || [];
    const liveBets = bets.filter(b => b.status === "live").length;
    const over = liveBets > E.TH.bets_ceiling;
    const cards = bets.slice(0, Math.max(3, bets.length)).map((b, i) =>
      `<div class="bet"><div class="bn">0${i + 1}</div><h3>${esc(b.title)}</h3>
        <div class="bmeta">${esc(b.status)}${b.note ? " · " + esc(b.note) : ""}</div></div>`).join("");
    return `<section class="section">${head("07", "Bets", "The 2–3 for the quarter. Three asks is a ceiling, not a target.", liveBets)}` +
      `<div class="bets ${over ? "bets-over" : ""}">${cards}</div>` +
      (over ? `<div class="bet-warning">⚑ ${liveBets} live bets — over the ceiling of ${E.TH.bets_ceiling}. Which one comes off the table?</div>` : "") +
      `</section>`;
  }

  // ---------- BOARD ACTIONS ----------
  function bindBoard() {
    document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => closeItem(b.dataset.close));
    document.querySelectorAll("[data-unblock]").forEach(b => b.onclick = () => unblock(b.dataset.unblock));
    document.querySelectorAll("[data-draft]").forEach(b => b.onclick = () => openDraft(b.dataset.draft));
    document.querySelectorAll("[data-flag-clear]").forEach(b => b.onclick = () => { local.cleared[b.dataset.flagClear] = true; saveLocal(local); render(); });
    document.querySelectorAll("[data-flag-route]").forEach(b => b.onclick = () => startIntake("route this: " + b.dataset.flagTitle));
    document.querySelectorAll("[data-scroll]").forEach(b => b.onclick = e => { e.preventDefault(); const el = $("#row-" + b.dataset.scroll); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.background = "var(--spot-soft)"; setTimeout(() => el.style.background = "", 1200); } });
    document.querySelectorAll("[data-resume]").forEach(b => b.onclick = () => { const it = local.items.find(x => x.id === b.dataset.resume); if (it) startIntake(it.raw, it.id); });
  }
  function persist(i) { const ix = local.items.findIndex(x => x.id === i.id); if (ix >= 0) local.items[ix] = i; else local.items.push(i); saveLocal(local); }
  function closeItem(id) {
    let i = local.items.find(x => x.id === id);
    if (!i) { i = Object.assign({}, SEED.items.find(x => x.id === id)); if (!i) return; }
    i.stage = "done"; i.closedAt = new Date().toISOString(); persist(i); flash(`Closed “${i.item}”. Logged.`); render();
  }
  function unblock(id) {
    let i = local.items.find(x => x.id === id) || Object.assign({}, SEED.items.find(x => x.id === id));
    if (!i) return; i.stage = "live"; i.blocked_by = null;
    if (!i.date) { i._unresolved = true; persist(i); flash("Unblocked — now a live task. It needs a date."); startIntake(i.raw || i.item, i.id); return; }
    persist(i); render();
  }

  // ---------- INTAKE PIPELINE ----------
  const pipe = { open: false, raw: "", id: null, step: 0, data: {} };

  function startIntake(raw, existingId) {
    pipe.open = true; pipe.raw = (raw || "").replace(/^route this:\s*/i, "").trim();
    pipe.id = existingId || ("u-" + Date.now());
    pipe.step = 0; pipe.data = { constraint_done: [] };
    $("#scrim").classList.add("open"); renderStep();
  }
  function closeIntake() { pipe.open = false; $("#scrim").classList.remove("open"); }

  function autoOwner() {
    const c = E.classifyDomain(pipe.raw);
    pipe.data.domain = c.domain; pipe.data.ownerKey = c.ownerKey;
    pipe.data.secondaryKey = c.secondaryKey; pipe.data.crosses = c.crosses;
    return c;
  }

  function renderStep() {
    const b = $("#pipe-body");
    const raw = `<div class="raw">${esc(pipe.raw)}</div>`;
    const S = pipe.step;

    if (S === 0) {
      b.innerHTML = `<div class="step-label">Step 1 / The fork</div>
        <div class="step-q">Is there something someone should do — or is this a thought?</div>
        <div class="step-hint">The single fork. A thought stores clean and stops. A task continues through the gate.</div>${raw}
        <div class="choices">
          <button class="choice" data-pick="task"><div class="ct">It's a task</div><div class="cd">someone does something →</div></button>
          <button class="choice" data-pick="thought"><div class="ct">It's a thought</div><div class="cd">label · store · stop</div></button>
        </div>`;
      b.querySelectorAll("[data-pick]").forEach(x => x.onclick = () => {
        pipe.data.type = x.dataset.pick;
        if (pipe.data.type === "thought") return saveThought();
        autoOwner(); pipe.step = 1; renderStep();
      });
      nav(false);
      return;
    }

    if (S === 1) { // domain/owner
      const c = pipe.data;
      const ownerLine = c.ownerKey
        ? `Routed to <b>${esc(E.ownerName(c.ownerKey))}</b> — ${esc(E.ownerRole(c.ownerKey))}.` +
          (c.secondaryKey ? ` Secondary cc: <b>${esc(E.ownerName(c.secondaryKey))}</b> (one ask each).` : "")
        : `No clear owner from the content. This becomes <b>pre-decision</b> — unassigned until it has reads.`;
      b.innerHTML = `<div class="step-label">Step 2 / Domain → Owner</div>
        <div class="step-q">Who owns this?</div>
        <div class="step-hint">Auto-classified by content. Override if the map is wrong.</div>${raw}
        <div class="owner-pin">${ownerLine}</div>
        <label class="field"><span class="fl">Owner</span>
          <select class="fi" id="f-owner">
            <option value="">— unassigned (pre-decision)</option>
            ${["joao", "ju", "matheus", "me"].map(k => `<option value="${k}" ${c.ownerKey === k ? "selected" : ""}>${esc(E.ownerName(k))} — ${esc(E.ownerRole(k))}</option>`).join("")}
          </select></label>`;
      $("#f-owner").onchange = e => pipe.data.ownerKey = e.target.value || null;
      nav(true, () => { pipe.step = pipe.data.ownerKey ? 2 : 3; renderStep(); }); // skip bypass interrupt if unassigned
      return;
    }

    if (S === 2) { // ANTI-BYPASS interrupt
      const k = pipe.data.ownerKey;
      b.innerHTML = `<div class="step-label">Step 3 / Anti-bypass interrupt</div>
        <div class="step-q">This has an owner: ${esc(E.ownerName(k))}.</div>
        <div class="step-hint">Route to them — don't become the second channel.</div>${raw}
        <div class="interrupt"><span class="mono">⚑ The bypass interrupt — fired at input</span>
          <p>If you land this somewhere other than through ${esc(E.ownerName(k))}, you create the second channel that makes you the source of confusion.</p></div>
        <div class="choices col">
          <button class="choice" data-by="route"><div class="ct">Route through ${esc(E.ownerName(k))}</div><div class="cd">the right way</div></button>
          <button class="choice" data-by="own"><div class="ct">I'll carry it myself</div><div class="cd">owner = me · on the record</div></button>
        </div>`;
      b.querySelectorAll("[data-by]").forEach(x => x.onclick = () => {
        if (x.dataset.by === "own") pipe.data.ownerKey = "me";
        pipe.data.bypassChecked = true; pipe.step = 3; renderStep();
      });
      nav(true, null, true);
      return;
    }

    if (S === 3) { // THE ASK
      b.innerHTML = `<div class="step-label">Step 4 / The ask</div>
        <div class="step-q">What is the one thing they do?</div>
        <div class="step-hint">Required. Specific enough to act on tomorrow.</div>${raw}
        <label class="field"><span class="fl">The ask</span>
          <textarea class="fi" id="f-ask" placeholder="e.g. Fechar a proposta de preço para a Belle e me mandar até quarta">${esc(pipe.data.ask || "")}</textarea></label>
        <div class="gate-fail" id="ask-fail" style="display:none">The ask can't be empty — that's the hunt for an instruction that was never there.</div>`;
      nav(true, () => {
        const v = $("#f-ask").value.trim();
        if (!v) { $("#ask-fail").style.display = "block"; return; }
        pipe.data.ask = v;
        pipe.step = pipe.data.ownerKey ? 4 : 31; renderStep(); // unassigned → pre-decision confirm
      });
      return;
    }

    if (S === 31) { // pre-decision confirm (no owner)
      b.innerHTML = `<div class="step-label">Escape valve / Pre-decision</div>
        <div class="step-q">No owner yet — so this is pre-decision.</div>
        <div class="step-hint">It needs reads before it can carry an owner or a date. The ask becomes “gather reads on X.” No date.</div>${raw}
        <div class="owner-pin">Saving as <b>pre-decision</b>: “${esc(pipe.data.ask)}”. It will age on the board until reads land.</div>`;
      nav(true, () => { pipe.data.stage = "pre-decision"; finalize(); });
      return;
    }

    if (S === 4) { // THE DATE
      b.innerHTML = `<div class="step-label">Step 5 / The date</div>
        <div class="step-q">By when?</div>
        <div class="step-hint">Required for a live task. Can't be skipped — if you can't name one, it's pre-decision or hold.</div>${raw}
        <label class="field"><span class="fl">Date</span><input class="fi" type="date" id="f-date" value="${esc(pipe.data.date || "")}"></label>
        <div class="choices col" style="margin-top:6px">
          <button class="choice" data-reclass="pre"><div class="ct">No date — needs reads first</div><div class="cd">reclassify → pre-decision</div></button>
          <button class="choice" data-reclass="hold"><div class="ct">No date — real but not the hour</div><div class="cd">reclassify → hold (blocked_by)</div></button>
        </div>`;
      b.querySelectorAll("[data-reclass]").forEach(x => x.onclick = () => {
        if (x.dataset.reclass === "pre") { pipe.data.stage = "pre-decision"; pipe.data.date = null; return finalize(); }
        pipe.data.stage = "hold"; pipe.step = 41; renderStep();
      });
      nav(true, () => {
        const v = $("#f-date").value;
        if (!v) { flash("No date. Pick one — or use a reclassify option below."); return; }
        pipe.data.date = v; pipe.data.stage = "live"; pipe.step = 5; renderStep();
      });
      return;
    }

    if (S === 41) { // hold blocked_by
      b.innerHTML = `<div class="step-label">Escape valve / Hold</div>
        <div class="step-q">What is it blocked by?</div>
        <div class="step-hint">A hold must name its blocker. No date until it's unblocked.</div>${raw}
        <label class="field"><span class="fl">Blocked by</span><input class="fi" id="f-block" placeholder="o que precisa existir / acontecer primeiro"></label>`;
      nav(true, () => { const v = $("#f-block").value.trim(); if (!v) { flash("Name the blocker."); return; } pipe.data.blocked_by = v; pipe.data.date = null; finalize(); });
      return;
    }

    if (S === 5) { // constraint flags
      const cf = E.detectConstraintFlags(pipe.raw, { crosses: pipe.data.crosses, isBet: pipe.data.isBet });
      pipe.data.constraint_flags = cf.map(c => c.code);
      const body = cf.length
        ? cf.map(c => `<div class="interrupt"><span class="mono">${esc(c.code)} · ${esc(c.label)}</span><p>${esc(c.ask)}</p></div>`).join("")
        : `<p class="empty good">No constraint flags triggered on this input.</p>`;
      b.innerHTML = `<div class="step-label">Step 6 / Constraint flags</div>
        <div class="step-q">Anything that needs a guardrail?</div>
        <div class="step-hint">Surfaced automatically. Note them — they ride with the item.</div>${raw}${body}`;
      nav(true, () => { pipe.step = 6; renderStep(); });
      return;
    }

    if (S === 6) { // FINAL GATE
      b.innerHTML = `<div class="step-label">Step 7 / Final gate</div>
        <div class="step-q">Can ${esc(E.ownerName(pipe.data.ownerKey))} act on this tomorrow?</div>
        <div class="step-hint">If no, the ask isn't sharp enough yet — back to the ask.</div>${raw}
        <div class="owner-pin"><b>${esc(E.ownerName(pipe.data.ownerKey))}</b> · ${esc(pipe.data.ask)} · <b>${esc(E.fmtDate(pipe.data.date))}</b></div>
        <div class="choices">
          <button class="choice" data-gate="y"><div class="ct">Yes — it has shape</div><div class="cd">save + draft</div></button>
          <button class="choice" data-gate="n"><div class="ct">No — not yet</div><div class="cd">back to the ask</div></button>
        </div>`;
      b.querySelectorAll("[data-gate]").forEach(x => x.onclick = () => {
        if (x.dataset.gate === "n") { pipe.step = 3; renderStep(); return; }
        finalize();
      });
      nav(true, null, true);
      return;
    }
  }

  function nav(showBack, onNext, hideNext) {
    const b = $("#pipe-body");
    const el = document.createElement("div"); el.className = "pnav";
    el.innerHTML = `${showBack ? `<button class="back">← Back</button>` : `<span></span>`}` +
      (hideNext ? "" : `<button class="next">Continue →</button>`);
    b.appendChild(el);
    const back = el.querySelector(".back"); if (back) back.onclick = () => { pipe.step = Math.max(0, prevStep()); renderStep(); };
    const next = el.querySelector(".next"); if (next && onNext) next.onclick = onNext;
  }
  function prevStep() { const order = [0, 1, 2, 3, 31, 4, 41, 5, 6]; const i = order.indexOf(pipe.step); return order[Math.max(0, i - 1)]; }

  function saveThought() {
    const item = { id: pipe.id, item: pipe.raw, raw: pipe.raw, type: "thought", stage: "thought",
      origin: "manuel", createdAt: new Date().toISOString() };
    const g = E.gateCheck(item);
    if (!g.ok) { flash(g.errs[0]); return; }
    persist(item); closeIntake(); flash("Labeled as a thought. Stored. No owner, no ask, no date."); render();
  }

  function finalize() {
    const d = pipe.data;
    const item = {
      id: pipe.id, item: d.ask ? capFirst(pipe.raw) : pipe.raw, raw: pipe.raw,
      type: "task", stage: d.stage || "live", domain: d.domain || null,
      owner: d.ownerKey || null, secondary_owner: d.secondaryKey || null, assignee: null,
      ask: d.ask || null, date: d.date || null, blocked_by: d.blocked_by || null,
      constraint_flags: d.constraint_flags || [], origin: "manuel", createdAt: new Date().toISOString(), reads: []
    };
    const g = E.gateCheck(item);
    if (!g.ok) { flash("Gate refused: " + g.errs[0]); return; }
    delete item._unresolved;
    persist(item); closeIntake(); render();
    if (item.stage === "live" && item.owner) openDraft(item.id);
    else flash(item.stage === "pre-decision" ? "Saved as pre-decision. It will age until reads land." : "Saved on hold.");
  }
  function capFirst(s) { s = (s || "").trim(); return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- DRAFT (never sends) ----------
  function openDraft(id) {
    const i = workingItems().find(x => x.id === id); if (!i) return;
    const name = i.owner ? E.ownerName(i.owner).split(" ")[0] : (i.assignee || "");
    const body = draftText(name, i);
    $("#pipe-body").innerHTML = `<div class="step-label">Draft · held for your send</div>
      <div class="step-q">Message for ${esc(E.ownerName(i.owner) || i.assignee || "owner")}</div>
      <div class="step-hint">In your voice, Portuguese. The board never sends — you do.</div>
      <div class="draft-box"><div class="dh">DRAFT → ${esc(i.source ? i.source.channel : "DM")}</div>
        <div class="db" id="draft-text" contenteditable="true">${esc(body)}</div>
        <div class="dnote">Nothing leaves the board without your explicit confirmation. Copy, edit, then send it yourself.</div></div>
      <div class="pnav"><button class="back">← Close</button><button class="next" id="copy-draft">Copy draft</button></div>`;
    $("#scrim").classList.add("open"); pipe.open = true;
    $("#pipe-body .back").onclick = closeIntake;
    $("#copy-draft").onclick = () => { navigator.clipboard && navigator.clipboard.writeText($("#draft-text").innerText); flash("Draft copied. Send it yourself when ready."); };
  }
  function draftText(name, i) {
    const when = i.date ? `\nPrazo: ${E.fmtDate(i.date)}.` : "";
    return `Oi ${name || ""},\n\n${i.ask}.${when}\n\nQualquer coisa me chama. Valeu! 🙏`;
  }

  // ---------- COMMAND BAR ----------
  function runCommand(raw) {
    const c = raw.trim(); if (!c) return;
    const low = c.toLowerCase();
    if (/^(refresh|what'?s hot|o que (t[áa]|esta) (pegando|quente|hot))/.test(low)) return doRefresh();
    if (/^show flags|^flags/.test(low)) return scrollTo(1);
    if (/^what'?s stuck|^o que (est[áa]|ta) (parado|travado)/.test(low)) { scrollTo(5); flash("Showing Hold + aging Pre-Decision."); return; }
    if (/^what am i bypassing|bypass/.test(low)) { scrollTo(1); flash("Bypass flags are in Structural Flags — code BYPASS."); return; }
    if (/^what are my bets|^bets|apostas/.test(low)) return scrollTo(7);
    if (low.startsWith("update on")) return updateOn(c.slice(9).trim());
    if (low.startsWith("draft")) { const m = c.match(/for\s+(.+)$/i); return draftByName(m ? m[1] : ""); }
    if (low.startsWith("close")) { const t = c.replace(/^close\s*/i, "").trim(); return closeByName(t); }
    // default → intake
    startIntake(c);
  }
  function scrollTo(n) { const s = document.querySelectorAll("#board .section")[n - 1]; if (s) s.scrollIntoView({ behavior: "smooth" }); }
  function doRefresh() {
    flash("Re-scan runs through me (the agent) — ask in chat: “refresh the board.” Re-deriving flags & ages from the last scan now.");
    render();
  }
  function updateOn(scope) {
    const items = workingItems().filter(i => (i.scope || "").toLowerCase().includes(scope.toLowerCase()) || (i.item || "").toLowerCase().includes(scope.toLowerCase()));
    const heat = computeHeat().filter(h => (h.scope || "").toLowerCase().includes(scope.toLowerCase()) || (h.what || "").toLowerCase().includes(scope.toLowerCase()));
    if (!items.length && !heat.length) return flash(`Nothing on “${scope}” in the current scan.`);
    flash(`${scope}: ${items.length} item(s), ${heat.length} heat entr(ies). Highlighted below.`);
    if (items[0]) { const el = $("#row-" + items[0].id); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }
  function draftByName(t) { const i = workingItems().find(x => (x.item || "").toLowerCase().includes(t.toLowerCase())); if (i) openDraft(i.id); else flash(`No item matching “${t}”.`); }
  function closeByName(t) { const i = workingItems().find(x => (x.item || "").toLowerCase().includes(t.toLowerCase()) && x.stage !== "done"); if (i) closeItem(i.id); else flash(`No open item matching “${t}”.`); }

  // ---------- toast ----------
  let toastT;
  function flash(msg) {
    let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t);
      Object.assign(t.style, { position: "fixed", left: "50%", top: "20px", transform: "translateX(-50%)", background: "#0a0a0a", color: "#fff", fontFamily: "var(--mono)", fontSize: "12px", padding: "10px 16px", zIndex: 99, maxWidth: "560px", letterSpacing: ".03em", boxShadow: "0 10px 30px rgba(0,0,0,.3)" }); }
    t.textContent = msg; t.style.opacity = "1"; clearTimeout(toastT); toastT = setTimeout(() => t.style.opacity = "0", 4200);
  }

  // ---------- boot ----------
  function boot() {
    $("#cmd").addEventListener("keydown", e => { if (e.key === "Enter") { runCommand($("#cmd").value); $("#cmd").value = ""; } });
    $("#run-btn").onclick = () => { runCommand($("#cmd").value); $("#cmd").value = ""; };
    $("#refresh-btn").onclick = doRefresh;
    $("#pipe-x").onclick = closeIntake;
    $("#scrim").addEventListener("click", e => { if (e.target.id === "scrim") closeIntake(); });
    $("#commit-x").onclick = () => { flash(`${stagedCount()} staged item(s). Tell me in chat: “commit the board” and I’ll write them to Notion and regenerate the mirror.`); };
    render();
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
