#!/usr/bin/env node
/**
 * Adds a journal entry (today's planned workout) to every user's decrypted
 * markdown file in src/content/users/.
 *
 * Selection is deterministic for a given date and history:
 *   - main block: up to 4 main/accessory exercises, each from a different
 *     muscle group, preferring exercises not done recently and muscle groups
 *     not trained yesterday, capped by a total fatigue budget
 *   - one warmup and one cooldown exercise (if the user has any)
 *   - target (sets x reps/time) is copied from the last time the exercise was logged
 *
 * Idempotent: users that already have an entry for the date are skipped.
 *
 * Usage:
 *   npm run decrypt                      # needs CONTENT_KEY
 *   node scripts/schedule-daily-workout.mjs [--date YYYY-MM-DD] [--dry-run]
 *   npm run encrypt
 *
 * When GITHUB_OUTPUT is set, writes `changed=true|false` to it.
 */

import { readFileSync, writeFileSync, readdirSync, appendFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse } from "yaml";

const MAIN_BLOCK_SIZE = 4;
const FATIGUE_BUDGET = 12;
const NEVER_DONE_DAYS = 30;
const YESTERDAY_GROUP_PENALTY = 5;

const usersDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src", "content", "users");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dateArg = args.includes("--date") ? args[args.indexOf("--date") + 1] : undefined;
const date = dateArg ?? new Date().toISOString().slice(0, 10);

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`[schedule] Invalid date "${date}", expected YYYY-MM-DD.`);
  process.exit(1);
}

const dayNumber = (d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86_400_000);

// Stable pseudo-random value in [0, 3) used to break ties between equally stale exercises.
function jitter(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 3000) / 1000;
}

function parseUserFile(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("missing frontmatter");
  const data = parse(match[1]);
  const history = [];
  for (const m of match[2].matchAll(/### (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=\n### |$)/g)) {
    const items = m[2]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => {
        const text = l.slice(2);
        const idx = text.indexOf(":");
        if (idx < 0) return { id: text.trim(), target: "" };
        const target = text.slice(idx + 1).trim().replace(/\s+done$/i, "");
        return { id: text.slice(0, idx).trim(), target };
      });
    history.push({ date: m[1], items });
  }
  return { data, history };
}

function planWorkout({ data, history }) {
  const exercises = data.exercises;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const today = dayNumber(date);

  const lastDone = new Map();
  const lastTarget = new Map();
  for (const entry of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    if (entry.date >= date) continue;
    for (const item of entry.items) {
      lastDone.set(item.id, entry.date);
      if (item.target) lastTarget.set(item.id, item.target);
    }
  }

  const yesterday = history.find((h) => dayNumber(h.date) === today - 1);
  const yesterdayGroups = new Set(
    (yesterday?.items ?? []).map((i) => byId.get(i.id)?.primary_muscle_group).filter(Boolean)
  );

  const staleness = (ex) =>
    (lastDone.has(ex.id) ? today - dayNumber(lastDone.get(ex.id)) : NEVER_DONE_DAYS) +
    jitter(`${date}:${ex.id}`);

  const pickBest = (candidates, score) =>
    candidates.reduce((best, ex) => (best && score(best) >= score(ex) ? best : ex), null);

  const picked = [];
  const isFree = (ex) => !picked.includes(ex);

  // Main block
  const mainPool = exercises.filter((e) => e.phases.some((p) => p === "main" || p === "accessory"));
  const mainBlock = [];
  let fatigue = 0;
  while (mainBlock.length < MAIN_BLOCK_SIZE) {
    const usedGroups = new Set(mainBlock.map((e) => e.primary_muscle_group));
    const candidates = mainPool.filter(
      (e) => isFree(e) && !mainBlock.includes(e) && fatigue + e.fatigue_score <= FATIGUE_BUDGET
    );
    if (candidates.length === 0) break;
    const fresh = candidates.filter((e) => !usedGroups.has(e.primary_muscle_group));
    const best = pickBest(fresh.length ? fresh : candidates, (e) =>
      staleness(e) - (yesterdayGroups.has(e.primary_muscle_group) ? YESTERDAY_GROUP_PENALTY : 0)
    );
    mainBlock.push(best);
    fatigue += best.fatigue_score;
  }
  picked.push(...mainBlock);

  const warmup = pickBest(
    exercises.filter((e) => isFree(e) && e.phases.includes("warmup")),
    staleness
  );
  if (warmup) picked.push(warmup);

  const cooldown = pickBest(
    exercises.filter((e) => isFree(e) && e.phases.includes("cooldown")),
    staleness
  );
  if (cooldown) picked.push(cooldown);

  const ordered = [warmup, ...mainBlock, cooldown].filter(Boolean);
  return ordered.map((ex) => {
    const fallback = ex.primary_metric === "time" ? "3x30s" : "3x10";
    return `- ${ex.id}: ${lastTarget.get(ex.id) ?? fallback}`;
  });
}

let changed = false;
const files = readdirSync(usersDir).filter((f) => f.endsWith(".md") && !/\.backup\.\d+\.md$/.test(f));

if (files.length === 0) {
  console.error("[schedule] No decrypted user files found — run `npm run decrypt` first.");
  process.exit(1);
}

for (const file of files) {
  const path = resolve(usersDir, file);
  const text = readFileSync(path, "utf-8");
  let user;
  try {
    user = parseUserFile(text);
  } catch (err) {
    console.error(`[schedule] ${file}: ${err.message}`);
    process.exit(1);
  }

  const name = user.data.userId ?? file;
  if (user.history.some((h) => h.date === date)) {
    console.log(`[schedule] ${name}: entry for ${date} already exists, skipping.`);
    continue;
  }

  const lines = planWorkout(user);
  if (lines.length === 0) {
    console.log(`[schedule] ${name}: no exercises available, skipping.`);
    continue;
  }

  console.log(`[schedule] ${name}: ${date}\n${lines.join("\n")}`);
  if (!dryRun) {
    writeFileSync(path, `${text.trimEnd()}\n\n### ${date}\n${lines.join("\n")}\n`, "utf-8");
    changed = true;
  }
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}
