---
name: pre-destructive-backup
description: Use before performing any destructive or high-risk action that could delete, overwrite, migrate, reset, or alter database data or sensitive state
---

# Pre-Destructive Backup

## Overview

**Iron Law:** Never execute destructive operations, risky schema migrations, database resets, table drops, or bulk modifications without first taking an automated local snapshot.

Every backup MUST follow the project's standardized format, filename convention, and local directory.

---

## When to Use

Execute a local backup immediately **BEFORE** taking any of the following actions:

1. **Database Schema & Migrations:**
   - Running `prisma migrate dev`, `prisma migrate deploy`, `prisma db push`, or direct SQL ALTER/DROP statements.
   - Modifying table structures, dropping columns, changing column data types, or deleting constraints.
2. **Data Manipulation & Seed Scripts:**
   - Running seeds (`prisma db seed`, custom seed scripts), bulk updates, or data migration scripts.
   - Performing manual database edits, row truncations, or deletions.
3. **Destructive Cleanups & Resets:**
   - Resetting databases, clearing test tables on production/staging, or running user account purge scripts.
4. **Offline Sync & Structural Upgrades:**
   - Applying breaking schema changes across client-server sync tables.

---

## Standardized Backup Specification

All backups must adhere to the standard:

| Property | Standard Requirement |
| :--- | :--- |
| **Location** | `backend/backups/` (inside project root) |
| **Format** | PostgreSQL SQL Dump (`.sql`) + Structured Snapshot (`.json`) |
| **Naming Format** | `supabase_backup_YYYY-MM-DDTHH-mm-ss-SSSZ.sql` (ISO timestamp) |
| **Mode** | Atomic transaction (`BEGIN ... COMMIT`) with conflict safety |

---

## Step-by-Step Execution Workflow

Before executing the risky command, run the standard backup command:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Run the standardized SQL dump backup command
npm run backup:sql

# 3. Verify backup creation & file size in backend/backups/
ls -lh backups/
```

Once the backup file is confirmed on disk, proceed with the planned operation.

---

## Red Flags & Common Rationalizations

| Excuse / Rationalization | Reality |
| :--- | :--- |
| *"It's just a small non-destructive column addition."* | Migrations can fail midway or lock tables unexpectedly. Run backup first. |
| *"We're only testing on development/staging."* | Staging often has real user test data or state. Always backup first. |
| *"We did a backup yesterday."* | Any recent workouts or user entries will be lost. Always take a fresh snapshot before mutating. |
| *"I'll just rollback the migration if it fails."* | Rollbacks often cannot recover dropped columns or altered data. |

---

## Verification Checklist

- [ ] Command `npm run backup:sql` executed without errors.
- [ ] New `.sql` backup file created in `backend/backups/`.
- [ ] Backup file is non-empty (> 0 KB) and contains expected tables.
- [ ] Only after confirmation, proceed with the mutation.
