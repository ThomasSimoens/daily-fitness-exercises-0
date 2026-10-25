---
name: daily-workout-scheduler
description: Use this skill to schedule (or re-run, preview, or adjust) the daily workout journal entries for all users. It explains the scheduled GitHub Actions runner and the planner script that picks exercises from each user's library.
---

# Daily Workout Scheduler

A GitHub Actions workflow (`.github/workflows/daily-workouts.yml`) runs every day at 00:30 UTC. It decrypts the user files, runs `scripts/schedule-daily-workout.mjs`, builds the site to validate it, re-encrypts, and pushes the updated `.md.locked` files to `main`. The push triggers the Cloudflare Pages deployment.

## Planner rules (`scripts/schedule-daily-workout.mjs`)

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

## Manual run in CI

GitHub → Actions → "Schedule daily workouts" → Run workflow (optional `date` input).

## Setup

Repo secret `CONTENT_KEY` (same value as in `.env` / Cloudflare Pages) is required.
