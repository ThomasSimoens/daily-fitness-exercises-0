# daily-fitness-exercises-0: Daily Exercise Tracker

A static, no-backend, multi-user daily exercise tracker. Each user has their own markdown file that defines their exercises and logs their history. The site is deployed on Cloudflare Pages.

## Core rules

- **No backend, no database.** Everything is static. The only "database" is markdown files in the repo.
- **One markdown file per user**, in `src/content/users/`. The filename doesn't matter — `userId` in frontmatter is what matters.
- **`userId` in frontmatter = the URL route.** A file with `userId: thomas` is served at `/thomas`.
- **History is edited by hand**, directly in the markdown file, then committed to git. There is no in-browser "save" button. Pushing to git triggers a Cloudflare Pages rebuild that updates the site.

## Stack

- **Astro** — static site generator, used for content collections (typed markdown) and file-based routing.
- **Cloudflare Pages** — hosting, free tier. Auto-deploys on git push.
- **Cloudflare Pages Functions** — used only for optional basic auth middleware.

## Folder structure

```
daily-exercise/
├── src/
│   ├── content/
│   │   ├── config.ts          # zod schema for user markdown frontmatter
│   │   └── users/
│   │       ├── thomas.md
│   │       └── lobke.md
│   ├── pages/
│   │   └── [userId].astro     # dynamic route, one page per user
│   ├── lib/
│   │   └── today.ts           # picks which exercises are due today
│   └── layouts/
│       └── Base.astro
├── functions/
│   └── _middleware.js         # optional basic auth
├── astro.config.mjs
└── package.json
```

## User markdown file format

Frontmatter defines the user and their exercise plan. Body contains free-form history under a `## History` heading.

```markdown
---
userId: thomas
displayName: Thomas
exercises:
  - id: pushups
    name: Push-ups
    target: "3x15"
    days: [mon, wed, fri]
  - id: squats
    name: Squats
    target: "3x20"
    days: [tue, thu, sat]
  - id: plank
    name: Plank
    target: "3x45s"
    days: [mon, tue, wed, thu, fri]
---

## History

### 2026-07-10
- pushups: 3x15 done
- plank: 3x40s

### 2026-07-12
- squats: 3x20 done
- plank: 3x45s done
```

Field notes:
- `days` uses lowercase 3-letter weekday codes: `mon tue wed thu fri sat sun`.
- History entries are dated sections (`### YYYY-MM-DD`) with one bullet per exercise logged that day. This is parsed for display, never written to by the app itself.

## Page logic (`src/pages/[userId].astro`)

1. Load the content collection entry matching the `userId` route param.
2. Get today's weekday (lowercase 3-letter code).
3. Filter `exercises` where `days` includes today → this is "today's list."
4. Render today's list, then render the most recent N entries from `## History` below it.
5. If no user matches the route param, render a simple 404/"user not found" message — don't throw.

Note: since Astro builds statically, "today" is computed at build time by default. That's fine for a personal project rebuilt on each push. If it needs to always be accurate without a rebuild, move the "today" filtering into a small client-side script instead.

## Optional basic auth

`functions/_middleware.js` checks an `Authorization: Basic` header against credentials stored in a Cloudflare Pages environment variable, and returns `401` with a `WWW-Authenticate` header if it doesn't match. This is not meant to be strong security — the data isn't sensitive, it's just a light gate.

## Workflow for logging a workout

1. Do the exercises.
2. Open your user's markdown file, add a new `### YYYY-MM-DD` section (or a bullet under today's existing one) under `## History`.
3. `git commit && git push`.
4. Cloudflare Pages rebuilds automatically; the site reflects the update in under a minute.

## What NOT to do

- Don't add a database, API routes, or server-side storage of any kind.
- Don't build a UI form that tries to write back to the markdown files from the browser — there is no backend to receive that write.
- Don't hardcode user data into components — it must come from the markdown content collection so adding a user is just "add a markdown file."