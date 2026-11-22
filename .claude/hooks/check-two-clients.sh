#!/usr/bin/env bash
# PreToolUse(Bash) guard: a commit that changes client logic in only one of the two clients (PWA frontend/src,
# app mobile/src|mobile/app) is blocked unless the command says why: "Only-PWA: <reason>" or "Only-app: <reason>".
# Rule source: root CLAUDE.md ("Features: always build both clients", "Bug reports: always check both clients").
cmd=$(jq -r '.tool_input.command // ""')
case "$cmd" in *"git commit"*) ;; *) exit 0 ;; esac
case "$cmd" in *"Only-PWA:"*|*"Only-app:"*) exit 0 ;; esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
# What this commit will most likely contain: staged + modified + untracked (the command may `git add` first).
files=$( { git diff --cached --name-only; git diff --name-only; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u)

pwa=$(printf '%s\n' "$files" | grep -E '^frontend/src/' | grep -vE '\.(css|svg|png|jpg|ico)$' || true)
# Live Activity is iOS-only by nature; generated themes come from a shared token file.
app=$(printf '%s\n' "$files" | grep -E '^mobile/(src|app)/' | grep -vE '^mobile/src/features/liveActivity/|^mobile/src/theme/themes\.generated\.ts$' || true)

if [ -n "$pwa" ] && [ -z "$app" ]; then side="PWA (frontend/src)"; other="app (mobile/)"; marker="Only-PWA"
elif [ -n "$app" ] && [ -z "$pwa" ]; then side="app (mobile/)"; other="PWA (frontend/src)"; marker="Only-app"
else exit 0; fi

cat >&2 <<MSG
Two-clients rule (CLAUDE.md): this commit changes the $side but not the $other.
Either implement/check the same change in the $other first, or, if it truly applies to one client only
(platform-specific bug, owner said so), put "$marker: <reason>" in the commit message and say so to the owner.
MSG
exit 2
