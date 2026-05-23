# Plan File Convention

Plan files are stored in the `plans/` directory at the repository root.

## Location

- Directory: `plans/`

## File Naming Format

```
YYYY-MM-DD_HH-MM_what_to_do.md
```

Examples:
- `2026-05-14_21-26_workout_plans_feature.md`
- `2026-05-15_07-41_workout_plans_pr1_implementation.md`

## File Lifecycle

Plan files are **temporary** — they exist only during active task implementation.

| Stage | Action |
|---|---|
| Planning | Create a file following the convention in `plans/` |
| Implementation | File remains as a reference point |
| Merge / completion | **File is deleted** — change history lives in git, the planning document is no longer needed in the repository |

> The `plans/` directory is correctly empty when all current tasks are completed.
