# Refresh Protocol — how the agent re-scans and re-syncs

The board's data plane runs through Claude (the agent), because a static page
cannot call the Slack/Notion MCP servers. When Manuel says **"refresh the
board"**, **"what's hot"**, or **"commit the board"**, run this protocol.

## Scope & ethics (read first, every time)
- Run as Manuel's account. Read only channels/DMs Manuel can access.
- Never read a channel the agent is in but Manuel is not.
- **Draft only.** Never send a Slack message without Manuel's explicit
  per-message confirmation.
- Thin evidence → surface less. Never inflate a weak signal into a flag.
- Keep comp/salary specifics OUT of `data/store.js` and the Notion store.

## A. READ — heat scan
1. Resolve the channel set. Altitude order: leadership/board → per-BU → key DMs.
   Current high-altitude set:
   - `#moto-leadership` `C08912PRB1A`
   - `#new-business` `C08QGHMBNCT`
   - `#mtt-comms` `C0B5STYHLDD`
   - `#rfp_hinge` `C0A9GPKTQM9`
   (extend as channels appear via `slack_search_channels`)
2. For each, `slack_read_channel` (recent window) + targeted `slack_search_public`
   for lexicon phrases (see `config.lexicon` in `data/store.js`). Note: Slack
   search is keyword-AND, **no boolean OR** — run one phrase per call.
3. Score each topic 0–5 on: velocity, altitude, client, slippage, stall.
   `Engine.scoreHeat` weights them (altitude 1.4, slippage 1.5, client 1.3,
   velocity 1.2, stall 1.0) → 0–100. Tier 1 ≥70, Tier 2 ≥45, else 3.
4. For each heat entry, find a matching Item. **No match on a hot topic → ORPHAN
   flag.** Never auto-create a task from heat.

## B. FLAG — re-evaluate the seven
Run `Engine.detectStructuralFlags(items, heat)`. It derives:
ORPHAN, BYPASS, IDEA-NO-LANDING, AI-UNCHECKED, DECISION-AGING, SEQUENCE-BREAK,
OWNER-OVERLOAD — from items + heat. Only persist flags with real evidence.

## C. SYNC — write the store
Notion databases (`data/store.js › meta.notion`):
- Board page: `387aef2a-7a75-81a2-b382-d3d4b4f0e389`
- Items:  `2676fa7f-74ac-46bc-b74e-29e60ebd1e00`
- Flags:  `06042bda-11dd-4b7b-b57d-6108bd9e8b65`
- Heat:   `68bf3b1a-5024-4463-87ba-a31b03077576`

1. **Heat** is a fresh snapshot each scan — create new Heat rows with today's
   `Snapshot`. (Older snapshots stay as history.)
2. **Flags** — upsert by (Code + subject). Mark `cleared`/`converted` per
   Manuel; never auto-resolve.
3. **Items** — upsert by title/id. Items carry history (created, routed, moved,
   closed), so "pre-decision for N days" stays computable.
4. Regenerate **`data/store.js`** to mirror the current Notion state (same shape),
   then the page renders the new scan. Commit it.

## D. COMMIT staged intake
When Manuel says "commit the board", read the staged items he typed into the
board (these live in browser localStorage; he can paste them or describe them),
create matching Items pages in Notion, and fold them into `data/store.js`.

## Schedule
Default scans: **07:00 BRT** (morning) and **18:00 BRT** (end of day). Each
produces a Heat snapshot and re-evaluates Flags. Cheap to run extra — bias toward
re-scanning over showing stale state. The board's status bar marks itself STALE
after 12h.
