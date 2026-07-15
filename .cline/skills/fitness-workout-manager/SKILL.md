---
name: fitness-workout-manager
description: Use this skill when adding new exercises to a user's workout routine, scheduling exercises for specific days (adding to the journal log), or modifying workout data for users in the daily fitness exercises project.
---

# Fitness Workout Manager Skill

## Overview

This skill helps manage workout exercises and journal entries for users in the daily-fitness-exercises-0 Astro project. User data is stored in markdown files in `src/content/users/` and encrypted before committing.

## Project Structure

```
src/content/users/
├── thomas.md        # User workout data (decrypted locally)
└── lobke.md         # User workout data (decrypted locally)

Scripts:
├── scripts/encrypt-users.mjs  # Encrypts .md → .md.locked
└── scripts/decrypt-users.mjs  # Decrypts .md.locked → .md
```

## User Markdown Format

User files contain frontmatter and a history section:

```markdown
---
userId: thomas
displayName: Thomas
exercises:
  - id: push-up
    name: Push Up
    phases: [warmup, main]
    primary_muscle_group: chest
    target_muscles: [chest, triceps, shoulders]
    movement_pattern: push
    is_isometric: false
    is_unilateral: false
    plane_of_motion: sagittal
    equipment_required: []
    equipment_optional: []
    fatigue_score: 3
    difficulty: beginner
    primary_metric: reps
    reference_urls:
      - label: "Demo"
        url: "https://example.com"
        type: video
---

## History

### 2025-01-15
- push-up: 3x10
- squat: 3x12

### 2025-01-14
- push-up: 2x10
```

## Exercise Schema (from src/content/config.ts)

All exercise fields are required:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (kebab-case recommended) |
| `name` | string | Display name of the exercise |
| `phases` | array | One or more: warmup, main, accessory, cooldown |
| `primary_muscle_group` | enum | arms, chest, back, shoulders, core, legs, full_body |
| `target_muscles` | array | Specific muscles targeted |
| `movement_pattern` | enum | push, pull, hinge, squat, lunge, carry, rotation, none |
| `is_isometric` | boolean | Static hold exercise |
| `is_unilateral` | boolean | One-sided exercise |
| `plane_of_motion` | enum | sagittal, frontal, transverse |
| `equipment_required` | array | Required equipment list |
| `equipment_optional` | array | Optional equipment list |
| `fatigue_score` | int (1-5) | Recovery difficulty |
| `difficulty` | enum | beginner, intermediate, advanced |
| `primary_metric` | enum | reps, time, distance |
| `reference_urls` | array | Optional: video/article/gif/image links |

## Workflow: Adding Exercises & Journal Entries

### Step 1: Ensure CONTENT_KEY is set for encryption

The `CONTENT_KEY` can be stored in a `.env` file in the project root for convenience:

```bash
# .env file
CONTENT_KEY=your-64-hex-character-key-here
```

Or set as an environment variable directly:

```bash
# Export in your shell
export CONTENT_KEY="your-64-hex-character-key-here"
```

Note: `.env` is already in `.gitignore` and should never be committed to the repository.

### Step 2: Edit the user's markdown file

Open `src/content/users/<userId>.md` and add/modify:

**Adding a new exercise:**
Add to the `exercises` array in frontmatter. Ensure all schema fields are included.

**Scheduling exercises (journal log):**
Add a date entry under `## History`:

```markdown
### YYYY-MM-DD
- exercise-id: sets×reps (e.g., "3x10")
```

### Step 3: Encrypt before committing (optional but recommended)

```bash
npm run encrypt
git add .
git commit -m "Add exercise and schedule workout"
git push
```

## Helper: Generate today's date format

Use YYYY-MM-DD format (e.g., 2025-01-15). The page automatically shows today's workouts.

## Common Operations

### Add exercise to user

1. Open the user's markdown file
2. Copy the exercise schema structure
3. Add to `exercises` array with unique `id`
4. Save and optionally encrypt

### Log today's workout

1. Get today's date: `date +%Y-%m-%d`
2. Open user's markdown file
3. Find or create `### YYYY-MM-DD` section
4. Add `- exercise-id: 3x10` entries

### Schedule future workout

Same as logging, but use a future date:

```markdown
### 2025-02-01
- push-up: 3x12
- squat: 3x15
```

### Encrypt user data

The scripts automatically load `CONTENT_KEY` from `.env` if present:

```bash
npm run encrypt
```

### Decrypt for local editing

```bash
npm run decrypt
```

If `.env` contains `CONTENT_KEY`, the script will use it automatically. Without it, stub files are generated.
### Fix broken YouTube video links

When `reference_urls` in a user's exercise data point to invalid/removed YouTube videos, use the following approach to find verified replacements:

**Step 1: Identify broken URLs**

Use YouTube's oEmbed API to check if each video URL is valid. A valid video returns a JSON response with the video title; an invalid/removed video returns HTTP 404:

```bash
# Check a video (valid returns JSON with title, invalid returns 404)
curl "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=VIDEO_ID&format=json"
```

A valid response looks like:
```json
{"title": "The Perfect Push Up | Do it right!", "author_name": "Calisthenicmovement", ...}
```

**Step 2: Find replacement videos**

Search for relevant exercise tutorial videos using an Invidious instance (a privacy-respecting YouTube frontend that returns static HTML):

```bash
# Search for replacement videos and extract video IDs
curl -s 'https://inv.nadeko.net/search?q=plank+exercise+tutorial' | grep -oE '/watch\?v=[a-zA-Z0-9_-]{11}' | sort -u
```

Prefer videos from reputable fitness channels such as:
- Calisthenicmovement / ScottHermanFitness (reliable form tutorials)
- Jeff Nippard / Renaissance Periodization (evidence-based fitness)
- Athlean-X / Squat University / E3 Rehab (rehabilitation & proper form)
- Men's Health / Well+Good / PureGym (accessible beginner tutorials)
- Rogue Fitness / Buff Dudes (equipment-focused demos)

**Step 3: Verify replacements**

Confirm each candidate video is valid using the oEmbed API:

```bash
curl "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=NEW_VIDEO_ID&format=json"
```

Only use videos that return a valid JSON response with a title matching the exercise.

**Step 4: Update the file**

Replace the broken URL in the user's markdown file with the verified working URL, keeping the same `label` and `type`.

**Step 5: Encrypt and commit**

```bash
npm run encrypt
git add .
git commit -m "Fix broken YouTube video links for [exercise names]"
git push
```



## Checking the CONTENT_KEY

To verify your `.env` contains the key:

```bash
cat .env
# CONTENT_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Remember: `.env` is in `.gitignore` and should never be committed.
