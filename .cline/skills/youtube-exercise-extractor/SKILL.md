---
name: youtube-exercise-extractor
description: Use this skill when given a YouTube URL (video or Shorts) and asked to identify exercises from the video content. It extracts transcripts/captions, analyzes the content, and can add identified exercises to a user's profile. Works best with exercise demonstration videos.
---

# YouTube Exercise Extractor Skill

## Overview

This skill converts exercise videos from YouTube into structured exercise data that can be added to user profiles in the daily fitness exercises project. It leverages video transcripts/captions and metadata to identify exercises shown in the video.

## Project Structure

```
.cline/skills/youtube-exercise-extractor/
├── SKILL.md              # This file
└── scripts/
    └── fetch-youtube-transcript.mjs  # Helper to extract YouTube transcripts
```

## Prerequisites

Install the transcript extraction library:

```bash
npm install youtube-transcript@^1.0.0
```

No API keys required — this uses YouTube's public caption endpoints.

## Workflow: Extracting Exercises from a YouTube Video

### Step 1: Validate the YouTube URL

Accept standard YouTube URLs and Shorts links, such as:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`

Extract the video ID. You can verify the video exists using the YouTube oEmbed API or Invidious instance (see existing fitness-workout-manager SKILL.md for details on finding replacement videos).

### Step 1.5: Backup the target profile after decryption (before editing)

Because raw `*.md` files are gitignored, create a timestamped backup before modifying a user profile:

```bash
cp src/content/users/<userId>.md src/content/users/<userId>.backup.$(date +%s).md
```

This keeps a local diffable snapshot and avoids exposing names in the repo.

### Step 2: Fetch the Transcript

Use the helper script:

```bash
node .cline/skills/youtube-exercise-extractor/scripts/fetch-youtube-transcript.mjs "https://www.youtube.com/watch?v=VIDEO_ID"
```

The script outputs:
- `title`: Video title
- `author`: Channel name
- `transcript`: Full transcript with timestamps (if available)

If no auto-generated captions exist, the output will note that the transcript is unavailable.

### Step 3: Analyze the Transcript (and Content)

Using the transcript text, apply your reasoning to identify:
1. **Exercise names** — look for phrases like "squats", "push-ups", "plank", "lunges", etc.
2. **Movement patterns** — squat, push, pull, hinge, lunge, carry, rotation, none
3. **Primary muscle groups** — arms, chest, back, shoulders, core, legs, full_body
4. **Target muscles** — specific muscles mentioned (e.g., quadriceps, glutes, biceps)
5. **Difficulty** — beginner, intermediate, advanced
6. **Equipment used** — dumbbells, resistance bands, kettlebells, barbell, bodyweight, etc.
7. **Suggested metrics** — reps, time, or distance
8. **Demo start timestamp** — from the transcript timestamps, estimate when the actual exercise demonstration begins (usually after intro/talking).

If the transcript is sparse or unclear, use the video title, description, and channel context to fill in reasonable defaults. Prefer exercises already present in user profiles when possible.

### Step 4: Map to Exercise Schema

Convert identified exercises into the project's exercise schema (from `src/content/config.ts`):

```yaml
id: unique-kebab-case-name
name: Human Readable Name
phases: [warmup, main, accessory, cooldown]
primary_muscle_group: enum
target_muscles: [list]
movement_pattern: enum
is_isometric: boolean
is_unilateral: boolean
plane_of_motion: enum
equipment_required: [list]
equipment_optional: [list]
fatigue_score: int (1-5)
difficulty: enum
primary_metric: enum
reference_urls:
  - label: string
    url: https://www.youtube.com/watch?v=VIDEO_ID[start_seconds]
    type: video
```

Use conservative defaults when uncertain:
- `fatigue_score`: 3 for moderate, 2 for light/corrective, 4 for compound/heavy
- `difficulty`: beginner unless clearly advanced
- `is_unilateral`: false unless single-leg or single-arm
- `plane_of_motion`: sagittal for most movements; frontal for lateral raises, side planks; transverse for rotations

**Timestamped URLs:** If the transcript clearly indicates when the exercise demo starts, append `&t=START_S` (seconds) to the YouTube URL. Use `&` (not `?`) because the URL already contains a query string (`?v=...`). If unsure, omit the timestamp and start at 0.

### Step 5: Add Exercises to a User Profile

If the user requests adding the extracted exercises to a specific profile:

1. First, create a timestamped backup:
   ```bash
   cp src/content/users/<userId>.md src/content/users/<userId>.backup.$(date +%s).md
   ```

2. Open `src/content/users/<userId>.md`.

3. Add any new unique exercises to the top-level `exercises:` array. Avoid exact duplicates.

4. Optionally schedule today's workout by adding a journal entry:
   ```markdown
   ### YYYY-MM-DD
   - exercise-id: 3xREPS
   ```

5. Encrypt the updated markdown:
   ```bash
   npm run encrypt
   ```

## Helper Script Reference

### fetch-youtube-transcript.mjs

Arguments:
- `url`: YouTube video URL

Output:
- JSON to stdout with `title`, `author`, and `transcript` fields.
- `transcript` is an array of `{ text, start, duration }` objects.

Example:
```json
{
  "title": "15 Min Full Body Workout",
  "author": "Fitness Channel",
  "transcript": [
    { "text": "Let's start with bodyweight squats.", "start": 0, "duration": 4 },
    { "text": "Next, we'll do push-ups.", "start": 5, "duration": 4 }
  ]
}
```

## Guidelines for Accurate Extraction

- **Prefer certainty**: If the video is not clearly an exercise video, ask the user before generating exercises.
- **Use existing terms**: Match exercise names to those already in the codebase when possible for consistency.
- **Equipment constraints**: If the target user has limited equipment, filter or adapt suggestions accordingly. See existing `equipment_available` on the user profile.
- **Short-form content**: YouTube Shorts often show 1-3 exercises. Keep additions minimal and targeted.
- **Long-form content**: A full workout video can contain 5-10+ distinct exercises. Extract all clearly demonstrated movements and assign them to `phases` based on where they appear (warmup, main, accessory, cooldown).
- **Household items**: When a demo uses towels, couch edges, or other everyday objects, treat them as optional equipment. Map generic items to existing equipment tokens when possible (e.g., towel → optional alongside `resistance_band`), but don't invent new required equipment types.
- **Difficulty filtering**: Don't add advanced power/skill moves (e.g., single-leg squat jumps, plyometrics) to users who prefer light-to-moderate exercise. Favor controlled, lower-fatigue variations.
- **Credibility**: Use the actual video link as the `reference_url` so users can see the source.

### Extracting Multiple Exercises From One Video

1. Segment the transcript by exercise transitions ("next", "now we're going to", "for this next").
2. For each segment, derive: id, name, phases, primary_muscle_group, target_muscles, movement_pattern, equipment, fatigue_score, difficulty, primary_metric.
3. Prefer controlled, scalable variations over high-skill or high-impact moves unless the user explicitly wants athletic/advanced training.
4. Timestamp each `reference_url` to the clearest demo start within the segment.

## Example Usage

User request: *"Extract exercises from https://www.youtube.com/shorts/oDwpskbQn2E?is=zetLuIe2M8EX8Y7G and add them to Lobke's profile."*

1. Fetch transcript for `oDwpskbQn2E`.
2. Analyze transcript to identify e.g., "Glute Bridges", "Reverse Crunches".
3. Create schema entries with proper fields, including a `reference_url` with a timestamp if the demo start is clear (e.g., `&t=70`).
4. Backup `src/content/users/lobke.md`.
5. Append new exercises to her `exercises:` array.
6. Optionally add a journal entry for today.
7. Run `npm run encrypt` and leave changes unstaged for the user to review/test.

### Multi-exercise long-form video example

User request: *"Extract exercises from https://www.youtube.com/watch?v=lDrebo7qweY and add them to Lobke's profile."*

1. Fetch transcript for `lDrebo7qweY` (~13 minutes, full leg workout, no equipment).
2. Segment transcript into warmup, main, accessory, cooldown sections.
3. Identify and filter exercises suitable for Lobke's light-to-moderate preference:
   - `ankle_pulses` (warmup, legs)
   - `scapular_pullbacks` (warmup, back)
   - `hip_flexor_raises` (accessory, core)
   - `towel_hamstring_curls` (accessory, legs)
   - `pigeon_glute_stretch` (cooldown, core)
4. Skip advanced plyometric/skill moves.
5. Use timestamps from transcript for `reference_url` (e.g., `&t=520`).
6. Backup, append, and optionally schedule today's journal entry.
