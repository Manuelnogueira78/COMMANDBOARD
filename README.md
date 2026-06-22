# MATTER COMMAND BOARD

A live operating console for the CEO. It reads the workspace, tells you what's
hot, takes your inputs and routes them to the right person with an owner and a
date, and flags the structural problems that keep creating confusion.

It is not a chatbot and not a project tracker. It enforces shape on your energy
so you don't have to remember to.

> *My energy is the fuel. Shape is the job. Nothing leaves me without a place to land.*

---

## What it does — three jobs, in priority order

1. **READ** — a heat radar. Scans the Slack channels you can access and scores
   each active topic on velocity, altitude, client urgency, slippage, and stall.
2. **INTAKE + ROUTE** — takes anything you type, decides task-or-thought, and if
   a task, assigns owner + ask + date and drafts the routing message. It enforces
   **the gate**.
3. **FLAG** — detects the seven structural frictions that create confusion
   (orphan, bypass, idea-without-landing, AI-shipped-unchecked, decision-aging,
   sequence-break, owner-overload) and surfaces them as their own class.

## How to open it

Double-click **`index.html`** — it runs in the browser with no server and no
build step. State persists in two places:

- **Notion** (`Manuel's Super Brain › MATTER Command Board`) — the canonical
  store, three databases: Items, Flags, Heat. This is the board's memory across
  sessions.
- **`data/store.js`** — a committed mirror of the last scan, so the page renders
  instantly offline.
- **Your browser's localStorage** — anything *you* type into the board lands here
  first (staged), until you ask the agent to commit it to Notion.

## Architecture — why "live" works the way it does

A static page in your browser cannot call the Slack or Notion MCP servers
directly; those run through Claude (the agent). So:

```
   Slack (private channels, as Manuel)
        │  agent scans + scores
        ▼
   Notion  ◀── canonical store (Items / Flags / Heat)
        │  agent regenerates
        ▼
   data/store.js  ──▶  index.html  (renders the board, runs the gate, stages intake)
                            │
                            ▼  drafts only — never sends
                       you send, in your voice
```

**Refresh** = ask the agent in chat: *"refresh the board"* / *"what's hot."*
The agent re-scans Slack live, re-scores, rewrites the Notion store and
`data/store.js`, and the page reflects it. See `scan/REFRESH-PROTOCOL.md`.

## The gate — the one enforced invariant

- A **task** cannot be saved without **owner + ask + date**.
- A **thought** cannot carry any of owner, ask, or date.
- There is no third state. Escape valves: `pre-decision` (needs reads, no date)
  and `hold` (real but not the hour, has a `blocked_by`, no date).

## Owner map

| Domain | Owner |
|---|---|
| creative / pitch / client | **João Calazans** — CCO |
| ops / budget / hiring / institutional | **Ju Fernandes** — COO |
| AI / systems / infra / knowledge base | **Matheus** — CTO |
| crosses two | primary named, secondary cc'd |
| no owner yet | unassigned → pre-decision |

Routing is name-aware: if you explicitly name a person, they become primary and
any matched domain owner is the secondary cc. Override anytime in the intake.

## Commands (the box at the top, or just type)

| Type | Does |
|---|---|
| `route this: …` or any raw text | runs the intake pipeline (task-or-thought first) |
| `what's hot` / `refresh` | re-render the heat radar (live re-scan via agent) |
| `what's stuck` | hold + aging pre-decision |
| `what am I bypassing` | bypass flags |
| `update on [client/BU]` | items + heat + flags for that scope |
| `draft for [item]` | draft the message, held for your send |
| `close [item]` | move to done, log it |
| `what are my bets` | the 2–3 for the quarter; warns if over the ceiling |
| `show flags` | the structural flag board |

## Guardrails (non-negotiable)

- Runs as Manuel's account; reads only what Manuel can already see. Not surveillance.
- **Drafts** messages; never sends without explicit per-message confirmation.
- Nothing goes wide (leadership/BU) without a named human reviewer — including
  the board's own outputs.
- Reports observable signals (volume, overdue, unowned threads, phrases) — never
  inferred states of mind.
- Thin evidence → shows less. Never inflates a weak signal into a flag.

## Privacy

The scan reads **private** Slack channels. The committed mirror (`data/store.js`)
and the Notion store hold operational substance — initiatives, owners, routing
facts, channel permalinks — but **comp/salary figures are deliberately
abstracted out** of anything committed to git. Keep this repository **private**.
Treat `data/store.js` as confidential.

## Files

```
index.html            the board
assets/styles.css     MATTER editorial design system (Times serif / Courier mono / spot vermilion)
assets/engine.js      pure logic — gate, owner map, flag detectors, heat scoring
assets/app.js         render + interaction + intake pipeline + drafts
data/store.js         committed mirror of the last scan (the Notion databases)
scan/REFRESH-PROTOCOL.md   how the agent re-scans and re-syncs
```
