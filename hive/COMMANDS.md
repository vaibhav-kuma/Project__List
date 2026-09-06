# Claude Code commands

Reference of the Claude Code commands available to you. Two kinds:
- **slash** commands act ONLY on your own session — you CANNOT run them on another agent's terminal.
- **cli** commands run in your shell (Bash) and can target the fleet, spawn, or query.

To MONITOR the other agents in this hive, read `fleet.json` in the hive root (live per-agent tokens, cost, status, last tool, breaker level, inbox backlog) plus `registry.json` — `claude agents` does NOT list your hive siblings. Use `claude -p "..." --output-format json` for a one-off headless query.

## SESSION

- `/clear` _(slash)_ — Start a fresh conversation and reclaim the full context window. The old one stays in /resume.
- `/resume` _(slash)_ — Pick or search a past session to continue. e.g. `/resume auth refactor`
- `/rewind` _(slash)_ — Roll code AND conversation back to an earlier checkpoint.
- `/compact` _(slash)_ — Summarize the conversation so far to free context without losing the thread. e.g. `/compact keep the auth decisions`
- `claude -c` _(cli)_ — Continue the most recent session in this directory.
- `claude -r` _(cli)_ — Resume — pick or search a past session. e.g. `claude -r auth`
- `claude --fork-session` _(cli)_ — When resuming, branch into a new session id instead of reusing the original.

## CONTEXT & MEMORY

- `/context` _(slash)_ — Visualize what is filling the context window, with optimization hints.
- `/memory` _(slash)_ — Open the project & user CLAUDE.md memory files for editing.
- `/init` _(slash)_ — Scan the repo and generate a CLAUDE.md capturing its conventions.
- `#` _(slash)_ — Quick memory: start a line with # to append a durable note to memory. e.g. `# always run prettier before committing`
- `claude --add-dir ../other-repo` _(cli)_ — Grant the session read/write access to an extra directory.

## MODELS & EFFORT

- `/model` _(slash)_ — Switch the model for this session (saved as default); arrows tune effort. e.g. `/model opus`
- `/effort` _(slash)_ — Set reasoning effort: low / medium / high / xhigh / max. e.g. `/effort high`
- `/fast` _(slash)_ — Toggle fast mode — Opus with faster output, no model downgrade.
- `claude --model claude-sonnet-4-6[1m]` _(cli)_ — Launch on a specific model. The [1m] suffix selects the 1M-token window (Dwight).
- `claude --fallback-model sonnet` _(cli)_ — Auto-fall back to another model when the primary is unavailable.

## PLAN & EXECUTE

- `/plan` _(slash)_ — Enter plan mode — design the change before any edits. e.g. `/plan refactor the auth module`
- `/goal` _(slash)_ — Set a goal condition; Claude keeps working across turns until it is met. e.g. `/goal all tests pass`
- `/batch` _(slash)_ — Decompose a large change into parallel units in git worktrees. e.g. `/batch migrate components to v2`
- `/diff` _(slash)_ — Open the interactive diff viewer for the current changes.
- `/run` _(slash)_ — Launch and drive the project app to see a change actually working.
- `/verify` _(slash)_ — Build, run, and observe to confirm a change does what it should.
- `claude --worktree feat/x` _(cli)_ — Start the session in an isolated git worktree.

## REVIEW & GIT

- `/code-review` _(slash)_ — Hunt correctness bugs in the diff. --fix applies them, --comment posts inline; "ultra" runs a cloud deep review. e.g. `/code-review high --fix`
- `/simplify` _(slash)_ — Cleanup-only pass over changed code (reuse/simplify) — no bug hunt.
- `/review` _(slash)_ — Review a pull request in this session. e.g. `/review 123`
- `/security-review` _(slash)_ — Scan pending changes for security vulnerabilities.
- `/ultrareview` _(slash)_ — Multi-agent cloud review of the current branch / a PR.

## SUBAGENTS & BACKGROUND

- `claude agents` _(cli)_ — Open the agent view across your live + background Claude sessions.
- `claude agents --json` _(cli)_ — Print live sessions as JSON — scriptable fleet status.
- `/agents` _(slash)_ — Create and manage custom subagents for delegated work.
- `/fork` _(slash)_ — Spawn a background subagent that inherits the full conversation. e.g. `/fork implement the perf fix`
- `/background` _(slash)_ — Detach the current session so it keeps running in the background.
- `/tasks` _(slash)_ — View and manage everything running in the background.
- `/stop` _(slash)_ — Stop the current background session (when attached).
- `claude --agent reviewer` _(cli)_ — Start the session using a specific agent configuration.

## TOOLS & PERMISSIONS

- `/permissions` _(slash)_ — View and edit which tools are allowed / asked / denied.
- `/hooks` _(slash)_ — View the configured lifecycle hooks (PreToolUse, Stop, etc.).
- `claude --permission-mode bypassPermissions` _(cli)_ — Run without per-tool approval prompts (this is what "auto mode" uses).
- `claude --allowedTools "Bash(git *) Edit Read"` _(cli)_ — Pre-allow specific tools so they never prompt.

## MCP & PLUGINS

- `/mcp` _(slash)_ — List/manage connected MCP servers and authenticate (OAuth).
- `/plugin` _(slash)_ — Manage plugins (list, install, enable, disable).
- `claude mcp list` _(cli)_ — List configured MCP servers and their health.
- `claude mcp add <name> <command>` _(cli)_ — Register a new MCP server (stdio or HTTP).

## USAGE & COST

- `/usage` _(slash)_ — Session cost, plan limits, and a breakdown by skill / subagent / MCP.
- `/status` _(slash)_ — Account, active model, version, and connection status.
- `claude -p "..." --max-budget-usd 5` _(cli)_ — Cap the dollar spend for a headless run.
- `claude --max-turns 20` _(cli)_ — Limit agentic turns (a coarse runaway guard).

## AUTOMATION (HEADLESS)

- `claude -p "your prompt"` _(cli)_ — Print mode: run one prompt non-interactively and exit. e.g. `cat log | claude -p "summarize"`
- `claude -p "..." --output-format json` _(cli)_ — Headless with structured JSON (result, usage, cost).
- `claude -p "..." --output-format stream-json` _(cli)_ — Streaming JSON events for live consumption.
- `claude -p "..." --json-schema <schema>` _(cli)_ — Force the headless result to match a JSON Schema.
- `claude --append-system-prompt "..."` _(cli)_ — Append extra instructions to the default system prompt.

## CONFIG

- `/config` _(slash)_ — Open Settings: theme, model, output style, preferences.
- `/theme` _(slash)_ — Change the color theme (auto / light / dark / colorblind / custom).
- `/statusline` _(slash)_ — Configure the Claude Code status line.

## HELP & DIAGNOSTICS

- `/help` _(slash)_ — List every available slash command.
- `/doctor` _(slash)_ — Diagnose installation / health issues (press f to auto-fix).
- `/debug` _(slash)_ — Enable debug logging and troubleshoot the current session.
- `/release-notes` _(slash)_ — Browse the Claude Code changelog by version.
- `/remote-control` _(slash)_ — Expose this session for control from claude.ai / your phone.
