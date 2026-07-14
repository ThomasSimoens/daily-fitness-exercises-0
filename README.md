# Daily Exercise Tracker

A static, no-backend, multi-user daily exercise tracker. Each user has their own markdown file that defines their exercises and logs their history. The site is deployed on Cloudflare Pages.

## Core rules

- **No backend, no database.** Everything is static. The only "database" is markdown files in the repo.
- **One markdown file per user**, in `src/content/users/`. The filename doesn't matter — `userId` in frontmatter is what matters.
- **`userId` in frontmatter = the URL route.** A file with `userId: thomas` is served at `/thomas`.
- **History is edited by hand**, directly in the markdown file, then committed to git. There is no in-browser "save" button. Pushing to git triggers a Cloudflare Pages rebuild that updates the site.

## Stack

- **Astro** — static site generator, used for content collections (typed markdown) and file-based routing.
- **Tailwind CSS** — utility-first CSS framework for styling.
- **Cloudflare Pages** — hosting, free tier. Auto-deploys on git push.
- **Cloudflare Pages Functions** — used only for optional basic auth middleware.

## Folder structure

```
daily-fitness-exercises-0/
├── src/
│   ├── content/
│   │   ├── config.ts          # zod schema for user markdown frontmatter
│   │   └── users/
│   │       ├── user-1.md
│   │       └── user-2.md
│   ├── pages/
│   │   └── [userId].astro     # dynamic route, one page per user
│   ├── layouts/
│   │   └── Base.astro
│   └── styles/
│       └── global.css         # Tailwind CSS imports
├── functions/
│   └── _middleware.js         # optional basic auth
├── astro.config.mjs           # Astro configuration with Tailwind integration
├── tailwind.config.js         # Tailwind CSS configuration
└── package.json
```

## User markdown file format

Frontmatter defines the user and their exercise plan. Body contains free-form history under a `## Journal Log` heading.

```markdown
---
userId: user-1
displayName: User One
profile_description: Optional brief description about the user and their goals
exercises:
  - id: pushups
    name: Push-ups
    phases: [main, accessory]
    primary_muscle_group: chest
    target_muscles: [pectorals, triceps, shoulders]
    movement_pattern: push
    is_isometric: false
    is_unilateral: false
    plane_of_motion: sagittal
    equipment_required: []
    equipment_optional: [dumbbells, resistance_bands]
    fatigue_score: 3
    difficulty: beginner
    primary_metric: reps
    regression_id: pushups_knee
    progression_id: pushups_archer
    reference_urls:
      - label: "Proper Push-up Form"
        url: "https://www.youtube.com/watch?v=IODxDxX7oi4"
        type: video
---

## Journal Log

### 2026-07-10
- pushups: 3x15 done
- plank: 3x40s

### 2026-07-12
- squats: 3x20 done
- plank: 3x45s done
```

## Page logic (`src/pages/[userId].astro`)

1. Load the content collection entry matching the `userId` route param.
2. Parse the journal log from the markdown body.
3. Find today's entry (by date) in the journal log.
4. Render today's logged exercises, then render the most recent entries below it.
5. If no user matches the route param, render a simple 404/"user not found" message.

## Workflow for logging a workout

1. Do the exercises.
2. Open your user's markdown file, add a new `### YYYY-MM-DD` section (or add bullets under today's existing section) under `## Journal Log`.
3. `git commit && git push`.
4. Cloudflare Pages rebuilds automatically; the site reflects the update in under a minute.

## What NOT to do

- Don't add a database, API routes, or server-side storage of any kind.
- Don't build a UI form that tries to write back to the markdown files from the browser — there is no backend to receive that write.
- Don't hardcode user data into components — it must come from the markdown content collection so adding a user is just "add a markdown file."