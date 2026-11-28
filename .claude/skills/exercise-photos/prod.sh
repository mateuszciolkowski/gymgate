#!/usr/bin/env bash
# Run one command in backend/ against the PRODUCTION database.
# The prod URL is read from the commented "# PROD-DISABLED DATABASE_URL=" line in backend/.env
# and exported for this process only; .env is never edited and the URL is never printed.
#   bash .claude/skills/exercise-photos/prod.sh npm run backup:sql
#   bash .claude/skills/exercise-photos/prod.sh npx tsx scripts/exercise-photos.ts list <out.json>
set -euo pipefail
cd "$(git rev-parse --show-toplevel)/backend"
url=$(sed -n 's/^# PROD-DISABLED DATABASE_URL="\(.*\)"$/\1/p' .env)
[ -n "$url" ] || { echo "prod.sh: no '# PROD-DISABLED DATABASE_URL=\"...\"' line in backend/.env" >&2; exit 1; }
host=$(node -e 'console.log(new URL(process.argv[1]).host)' "$url")
case "$host" in *supabase.com*) ;; *) echo "prod.sh: host $host is not Supabase — refusing" >&2; exit 1 ;; esac
echo "prod.sh: PRODUCTION DB $host" >&2
DATABASE_URL="$url" DIRECT_URL="$url" DB_ENV=remote exec "$@"
