---
name: daily-workout-scheduler
description: Use this skill to schedule (or re-run, preview, or adjust) the daily workout journal entries for all users. It explains the scheduled GitHub Actions runner and the planner script that picks exercises from each user's library.
---

# Daily Workout Scheduler

A Claude Code cloud routine ("Daily workout planner", managed at https://claude.ai/code/routines) runs every day at 00:30 UTC. It decrypts the user files, plans each user's workout (using this skill and the fitness-workout-manager skill, with `scripts/schedule-daily-workout.mjs` as the rule-based fallback), re-encrypts, builds the site to validate it, and pushes the updated `.md.locked` files to `main`. The push triggers the Cloudflare Pages deployment.

## Fallback planner rules (`scripts/schedule-daily-workout.mjs`)

- Adds a `### YYYY-MM-DD` entry per user; skips users that already have one for the date.
- Main block: up to 4 `main`/`accessory` exercises from different muscle groups, preferring exercises not done recently and avoiding yesterday's muscle groups, capped by a total fatigue budget of 12.
- One `warmup` and one `cooldown` exercise when available.
- Targets are copied from the last logged value, with defaults `3x10` (reps) or `3x30s` (time).
- Deterministic for a given date and history.

Tunables are constants at the top of the script.

## Local use

```bash
npm run decrypt
node scripts/schedule-daily-workout.mjs --dry-run --date 2026-11-01   # preview
node scripts/schedule-daily-workout.mjs                               # write today's entry
npm run encrypt
```

Back up the `.md` first (see the fitness-workout-manager skill) when editing real data.

## Setup

The routine's cloud environment ("Daily Exercises 0") needs a `CONTENT_KEY` environment variable (same value as in `.env` / Cloudflare Pages), GitHub connected to the Claude account, and permission to push to `main`.
