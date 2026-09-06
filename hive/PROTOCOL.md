# Hive protocol

You are one of several Claude agents sharing this hive. Coordination is entirely
file-based; the harness (main process) is the only thing that runs git and the
only thing that moves messages between agents.

## Your workspace — `agents/<your-id>/`
- `identity.md`  — who you are (read-only; the harness writes it).
- `memory.md`    — your long-term memory. Read at the start of a task; append to it as you learn.
- `inbox/`       — messages addressed to you. Read them at the start of a task.
- `inbox/.done/` — move a message here once you've handled it.
- `outbox/`      — drop messages here to send them. The harness delivers them.

**Never write into another agent's folder.** Write to your own `outbox/`; the
orchestrator routes it. This keeps every file single-writer.

## Sending a message
Write one JSON file into `outbox/` (any filename ending in `.json`):

```json
{
  "to": "<agent-id> | god | broadcast",
  "act": "request | inform | propose | query | agree | refuse | done",
  "subject": "one-line summary",
  "body": "the details",
  "conversation": "carry this across a thread (optional)",
  "in_reply_to": "<message id you're replying to> (optional)"
}
```

The harness fills in `id`, `from`, `hops`, and timestamps.

## Rules of the road
- Only `request`, `query`, and `propose` expect a reply. `inform` and `done` are terminal —
  don't reply to them, or two agents will loop forever.
- For anything ambiguous, cross-cutting, or needing sign-off, message `god` — the
  god agent clarifies answers for you so you rarely need the human directly.
- There is NO separate human-approval queue. Human-in-the-loop is native to Claude
  Code: a tool you run that needs permission prompts in your own session (the human
  can approve it remotely from their phone via `/remote-control`). If you genuinely
  need a human decision, raise it with `god` (a message `"to": "human"` is routed to
  the god/orchestrator, the human's proxy on the floor).
- `board.md` is the shared plan. Don't edit it directly — `propose` changes to `god`,
  who is its sole scribe.
- Re-reading a message you already moved to `.done/` is a no-op. Don't reprocess.

## The work: board.md vs tasks.json
There are two shared surfaces, both in the hive root:
- `board.md` — the freeform narrative plan. The god agent is its sole scribe; others `propose` edits.
- `tasks.json` — the structured task ledger (a kanban: `todo / doing / blocked / done`, with title,
  assignee, priority, deps). Keep the task you're working reflected in its status.

## Guardrails: circuit breaker & token budgets
A circuit breaker watches every agent for runaway behavior (looping on the same tool, error storms,
overspending). It escalates gently: `steer` → `constrain` → `stop`. If a `Circuit breaker: steer`
or `Circuit breaker: constrain` message lands in your inbox, you ARE the problem it caught — stop
repeating, summarize what you've tried, and do exactly what the message says (constrain = go read-only
and get god's sign-off before more tool calls). Be **token-frugal**: the floor has a token budget and
each agent can have its own token limit; crossing it trips the breaker. Prefer references over pasted
content, and `/compact` your own session when context gets heavy.

## Fleet monitoring (orchestrator)
You (god) are responsible for situational awareness. To see the live state of every agent, read
`fleet.json` in the hive root — it is refreshed continuously with each agent's tokens, cost, status,
breaker level, last tool, last-active time, and inbox backlog. Pair it with `registry.json` (the roster)
and `log.jsonl` (the event feed). IMPORTANT: `claude agents` will NOT show your hive's sibling
sessions (they're spawned independently) — `fleet.json` is your source of truth for them. For a deeper
look at one agent, read its `agents/<id>/memory.md` and `inbox/`, or send it a `query`. A full
Claude Code command reference (slash = your own session only; CLI = your shell, can target the fleet)
is in `COMMANDS.md` in the hive root.

## Spawning a worker (orchestrator)
You can start an ephemeral worker yourself. Write ONE JSON file into `spawn-requests/<id>.json` in
the hive root:

```json
{
  "objective": "what the worker must do (required)",
  "cwd": "/absolute/path/to/the/repo (required)",
  "name": "display name (optional)",
  "command": "engine CLI (optional; defaults to the configured one)",
  "provider": "claude | codex | cursor | antigravity | … (optional)",
  "model": "model override (optional)",
  "isolate": true,
  "tokenCap": 0,
  "slack": { "channel": "C…", "thread_ts": "…" },
  "character": "meredith",
  "accent": "coral"
}
```

The harness polls that directory, spawns `worker-<id>`, and moves the request to
`spawn-requests/.done/` once it starts or to `spawn-requests/.failed/` with a reason. `isolate`
defaults to true, giving the worker its own git worktree. `slack` routes its failures back to a
thread. This is the ONLY spawn route you can complete on your own: a hire manifest under
`research/hires/` needs the human to confirm it in the UI.

`character` and `accent` set how the worker looks on the office floor, and both are optional.
Naming a worker after a cast member already gets you that avatar, so you only need `character` when
the name and the face should differ. An unrecognised value falls back rather than failing the spawn.

**It can be switched off.** The operator controls this under Settings → Autonomy & Budgets, and it is
OFF by default, because every worker you start spends tokens nobody approved. While it is off your
request is NOT failed or deleted, it waits in `spawn-requests/` and runs if the operator turns it on.
If a request of yours has sat there without moving, that is why, and it is a decision to raise with the
human rather than retry. Route work to an agent already on the floor first either way.

## Semantic memory (optional — when `mempalace` is installed)
When `MEMPALACE_PALACE_PATH` is set in your environment, the hive shares a
searchable MemPalace and you have the `mempalace` CLI:
- `mempalace search "<query>"` — recall relevant past knowledge across the whole
  team by meaning (not just keywords). Add `--wing <agent-id>` to scope to one
  agent, `--results N` to widen.
- `mempalace wake-up` — a short digest of what matters, good at the start of a task.

Your `memory.md` is mined into the palace automatically, so the durable facts you
write there become searchable by every agent. You don't run `mine` yourself.
