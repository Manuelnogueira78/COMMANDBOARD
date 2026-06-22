/* ============================================================
   MATTER COMMAND BOARD — Engine
   Pure logic. No DOM. Enforces the framework on the data.

   Exposes window.Engine with:
     - OWNER_MAP routing
     - classifyDomain / suggestOwner
     - gate validation (the single enforced invariant)
     - detectConstraintFlags (C1/C2/C3/C6)
     - detectStructuralFlags (the 7)
     - scoreHeat
     - date / age helpers
   ============================================================ */
(function () {
  "use strict";

  // ---- config is injected from the store; this is the fallback shape ----
  const CFG = (window.MATTER_STORE && window.MATTER_STORE.config) || {};

  const OWNERS = CFG.owners || {};
  const LEX = CFG.lexicon || {};
  const TH = Object.assign({
    decision_aging_days: 7,
    owner_overload_k: 3,
    idea_window_days: 5,
    idea_new_n: 3,
    idea_stalled_m: 3,
    bets_ceiling: 3,
    due_soon_days: 2
  }, CFG.thresholds || {});

  // ---- DOMAIN → OWNER routing (the OWNER MAP from the spec) ----
  // returns { ownerKey, reason } or { ownerKey:null } => pre-decision
  const DOMAIN_RULES = [
    { key: "joao",    domain: "creative",   re: /\b(criativ|creative|pitch|deck|posicion|positioning|campanh|campaign|brand|client|cliente|cmo|apresenta|narrativ|copy|art)\b/i },
    { key: "ju",      domain: "operations", re: /\b(oper|budget|or[çc]ament|hiring|contrat|vaga|timeline|prazo|cronograma|institu|process|financ|contrat|legal|RH|people)\b/i },
    { key: "matheus", domain: "ai/systems", re: /\b(\bAI\b|\bIA\b|tool|ferramenta|system|sistema|t[ée]cnic|technical|infra|knowledge\s?base|base de conhecimento|automat|pipeline|integra|API|dado|data|dashboard|c[óo]digo|code)\b/i },
  ];

  // explicit name mentions win over keyword inference (you named a person)
  function namedOwner(text) {
    const t = " " + text.toLowerCase() + " ";
    for (const k of Object.keys(OWNERS)) {
      const first = (OWNERS[k].name || "").split(" ")[0].toLowerCase();
      const variants = [k, first, first.normalize("NFD").replace(/[̀-ͯ]/g, "")];
      if (variants.some(v => v && new RegExp("[^a-z]" + v + "[^a-z]", "i").test(t))) return k;
    }
    return null;
  }

  function classifyDomain(text) {
    const hits = [];
    for (const r of DOMAIN_RULES) if (r.re.test(text)) hits.push(r);
    const named = namedOwner(text);
    const keys = hits.map(h => h.key);
    const dom = hits.length ? hits.map(h => h.domain).join(" + ") : null;

    // No keyword domain matched
    if (hits.length === 0) {
      if (named && named !== "me") return { domain: (OWNERS[named] || {}).role || null, ownerKey: named, secondaryKey: null, crosses: false };
      return { domain: null, ownerKey: null, secondaryKey: null, crosses: false };
    }
    // A person was explicitly named → they are primary; any other matched domain owner is secondary cc
    if (named && named !== "me") {
      const other = keys.find(k => k !== named) || null;
      return { domain: dom, ownerKey: named, secondaryKey: other, crosses: !!other };
    }
    if (hits.length === 1) return { domain: dom, ownerKey: hits[0].key, secondaryKey: null, crosses: false };
    return { domain: dom, ownerKey: hits[0].key, secondaryKey: hits[1].key, crosses: true };
  }

  function ownerName(key) { return (OWNERS[key] && OWNERS[key].name) || (key === "me" ? "Manuel" : "unassigned"); }
  function ownerRole(key) { return (OWNERS[key] && OWNERS[key].role) || ""; }

  // ---- THE GATE — the single enforced invariant ----
  // A task needs owner + ask + date. A thought carries none of them.
  // pre-decision / hold are the escape valves.
  function gateCheck(item) {
    const errs = [];
    if (item.type === "thought") {
      if (item.owner || item.ask || item.date) errs.push("A thought cannot carry an owner, ask, or date. Label it, store it, stop.");
      return { ok: errs.length === 0, errs };
    }
    if (item.type === "task") {
      if (item.stage === "pre-decision") {
        if (!item.ask) errs.push("Pre-decision still needs an ask: “gather reads on X.”");
        if (item.date) errs.push("Pre-decision carries no date until it has an owner.");
        return { ok: errs.length === 0, errs, stage: "pre-decision" };
      }
      if (item.stage === "hold") {
        if (!item.blocked_by) errs.push("Hold must name what it is blocked_by.");
        if (item.date) errs.push("Hold carries no date until it is unblocked.");
        return { ok: errs.length === 0, errs, stage: "hold" };
      }
      // live task — full gate
      if (!item.owner) errs.push("A task cannot be saved without an OWNER.");
      if (!item.ask)   errs.push("A task cannot be saved without an ASK (specific enough to act on tomorrow).");
      if (!item.date)  errs.push("A task cannot be saved without a DATE. If you can't name one, this is pre-decision or hold — not a task.");
      return { ok: errs.length === 0, errs };
    }
    errs.push("Every input resolves to a dated task or a labeled thought. There is no third state.");
    return { ok: false, errs };
  }

  // ---- CONSTRAINT FLAGS surfaced at intake (C1/C2/C3/C6) ----
  function detectConstraintFlags(text, opts) {
    opts = opts || {};
    const f = [];
    const t = text.toLowerCase();
    if (/\b(leadership|lideran|board|todos|all-hands|wide|geral|an[úu]ncio|announce|post|publica)\b/.test(t) || opts.goesWide)
      f.push({ code: "C1", label: "GOES WIDE / AI-AUTHORED", ask: "Who reads it before it ships?" });
    if (opts.isBet || /\b(aposta|bet|grande aposta|big swing|moonshot)\b/.test(t))
      f.push({ code: "C2", label: "A BET", ask: "This is one of your 2–3 this quarter. Does it earn the slot?" });
    if (opts.crosses || /\b(entrar no|assumir|take over|j[áa] [ée] do|owner)\b/.test(t))
      f.push({ code: "C3", label: "ENTERING OWNED WORK", ask: "Bring the lead into the room. Who?" });
    if (/\b(depende|depends|precisa que|requer|primeiro|first|antes|blocked)\b/.test(t))
      f.push({ code: "C6", label: "DEPENDS ON SOMETHING UNBUILT", ask: "What has to exist first?" });
    return f;
  }

  // ---- HEAT scoring ----
  // weighted: velocity, altitude, client urgency, slippage, stall
  function scoreHeat(entry) {
    const w = { velocity: 1.2, altitude: 1.4, client: 1.3, slippage: 1.5, stall: 1.0 };
    const s = entry.signals || {};
    let raw = 0, max = 0;
    for (const k in w) { raw += (s[k] || 0) * w[k]; max += 5 * w[k]; }
    return Math.round((raw / max) * 100);
  }
  function heatTier(score) { return score >= 70 ? 1 : score >= 45 ? 2 : 3; }

  // ---- DATE / AGE helpers ----
  const DAY = 86400000;
  function today() { const d = new Date(); d.setHours(0,0,0,0); return d; }
  function parseD(s) { if (!s) return null; const d = new Date(s + "T00:00:00"); return isNaN(d) ? null : d; }
  function daysUntil(s) { const d = parseD(s); return d ? Math.round((d - today()) / DAY) : null; }
  function ageDays(iso) { if (!iso) return 0; return Math.max(0, Math.round((Date.now() - new Date(iso)) / DAY)); }
  function fmtDate(s) {
    const d = parseD(s); if (!d) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  function dueClass(s) {
    const n = daysUntil(s); if (n === null) return "";
    if (n < 0) return "over"; if (n <= TH.due_soon_days) return "soon"; return "";
  }

  // ============================================================
  //  STRUCTURAL FLAGS — the seven. Derived from items + heat.
  //  Each: { code, title, severity, evidence[], pattern, move, kind }
  // ============================================================
  function detectStructuralFlags(items, heat) {
    const out = [];
    const live = items.filter(i => i.type === "task" && i.stage === "live");
    const byMe = items.filter(i => i.origin === "manuel");

    // FLAG 1 — ORPHAN: heat with no matching Item
    (heat || []).forEach(h => {
      if (!h.itemId) out.push({
        code: "ORPHAN", title: h.what, severity: h.score >= 70 ? "high" : "med",
        pattern: "Vision/energy with no place to land.",
        evidence: [`Hot in ${h.scope} — score ${h.score}. No Item owns it.`].concat(h.evidence || []),
        move: "Route it (owner + ask + date) or label the decision and park it.",
        kind: "orphan", refHeat: h.id
      });
    });

    // FLAG 2 — BYPASS: a landed decision aimed past the work's owner
    items.filter(i => i.bypass).forEach(i => out.push({
      code: "BYPASS", title: i.item, severity: "high",
      pattern: "Route, never become the second channel.",
      evidence: [i.bypass.detail || "Decision landed outside the owner's channel.",
                 `Owner of record: ${i.bypass.realOwner}. Recipient: ${i.bypass.recipient}.`],
      move: `Re-route through ${i.bypass.realOwner}; don't be the second channel.`,
      kind: "bypass", refItem: i.id
    }));

    // FLAG 3 — IDEA WITHOUT LANDING: generation outrunning absorption
    const recentNew = byMe.filter(i => ageDays(i.createdAt) <= TH.idea_window_days);
    const unmoved = byMe.filter(i => (i.stage === "pre-decision" || (!i.owner && i.type === "task")) && ageDays(i.createdAt) > TH.idea_window_days);
    if (recentNew.length >= TH.idea_new_n && unmoved.length >= TH.idea_stalled_m) out.push({
      code: "IDEA-NO-LANDING", title: `${recentNew.length} new in ${TH.idea_window_days}d, ${unmoved.length} prior still unmoved`,
      severity: "med", pattern: "One lands before the next leaves.",
      evidence: unmoved.slice(0, 4).map(i => `Unmoved ${ageDays(i.createdAt)}d: ${i.item}`),
      move: "Clear the backlog before accepting the new one. Land one first.",
      kind: "idea"
    });

    // FLAG 4 — AI SHIPPED UNCHECKED
    items.filter(i => i.aiAuthored && i.wentWide && !i.reviewer).forEach(i => out.push({
      code: "AI-UNCHECKED", title: i.item, severity: "high",
      pattern: "Nothing wide unchecked, AI most of all.",
      evidence: [`AI-authored, distributed to ${i.wideChannel || "a wide channel"}. No human reviewer recorded.`],
      move: "Name a reviewer now, or pull it back until one signs off.",
      kind: "ai", refItem: i.id
    }));

    // FLAG 5 — DECISION AGING: pre-decision past threshold, no reads
    items.filter(i => i.stage === "pre-decision" && ageDays(i.createdAt) > TH.decision_aging_days && !(i.reads && i.reads.length)).forEach(i => out.push({
      code: "DECISION-AGING", title: i.item, severity: ageDays(i.createdAt) > TH.decision_aging_days * 2 ? "high" : "med",
      pattern: "The “we should talk about it” class that never resolves.",
      evidence: [`Pre-decision ${ageDays(i.createdAt)} days. No reads attached (threshold ${TH.decision_aging_days}d).`],
      move: "Gather reads on it this week, or let it go on the record as dropped.",
      kind: "aging", refItem: i.id
    }));

    // FLAG 6 — SEQUENCE BREAK: live item whose blocker isn't closed
    live.filter(i => i.blocked_by).forEach(i => {
      const blk = items.find(b => b.id === i.blocked_by);
      if (blk && blk.stage !== "done") out.push({
        code: "SEQUENCE-BREAK", title: i.item, severity: "med",
        pattern: "Something left before the prior thing landed.",
        evidence: [`Live, but blocked_by “${blk.item}” which is ${blk.stage}.`],
        move: `Land “${blk.item}” first, or move this back to hold.`,
        kind: "sequence", refItem: i.id
      });
    });

    // FLAG 7 — OWNER OVERLOAD: one owner across K+ live/hot items
    const load = {};
    live.forEach(i => { if (i.owner) load[i.owner] = (load[i.owner] || 0) + 1; });
    Object.keys(load).forEach(k => {
      if (load[k] >= TH.owner_overload_k) out.push({
        code: "OWNER-OVERLOAD", title: `${ownerName(k)} — ${load[k]} live items`, severity: load[k] >= TH.owner_overload_k + 2 ? "high" : "med",
        pattern: "When one person becomes the structure instead of building it.",
        evidence: live.filter(i => i.owner === k).slice(0, 5).map(i => i.item),
        move: "Distribute the load — second owner, or sequence so they aren't the single path.",
        kind: "overload", refOwner: k
      });
    });

    const rank = { high: 0, med: 1, low: 2 };
    return out.sort((a, b) => (rank[a.severity] - rank[b.severity]));
  }

  window.Engine = {
    CFG, OWNERS, LEX, TH,
    classifyDomain, ownerName, ownerRole,
    gateCheck, detectConstraintFlags, detectStructuralFlags,
    scoreHeat, heatTier,
    daysUntil, ageDays, fmtDate, dueClass, parseD
  };
})();
