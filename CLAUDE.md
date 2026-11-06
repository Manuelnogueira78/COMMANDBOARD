# COMMANDBOARD

This repository holds Manuel's CEO advisor. When Manuel asks for anything about his CEO work (a brief,
a draft, "board room: …", the routine, the map), hand it to the `matter-ceo-advisor` agent, or follow
`.claude/agents/matter-ceo-advisor.md` directly. Its rules apply: never send or post, ask before acting,
stay inside the cost budget.

Short commands Manuel uses:
- **"brief"**: write this week's brief to `advisor/briefs/YYYY-MM-DD.md` (3 moves, maintenance, drafts).
- **"board room: <idea>"**: the simulated board perspectives from `advisor/BOARD-ROOM.md`.
- **"draft <who/what>"**: an email (as a Gmail draft) or a Slack/LinkedIn text in `advisor/drafts/`.
- **"close the week"**: check the 3 moves, then draft the Friday board note.
- **"map"**: the quarterly review of `advisor/MAP.md`.
