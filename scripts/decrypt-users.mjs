#!/usr/bin/env node
/**
 * Decrypts .md.locked files in src/content/users/ back to .md files.
 * Runs at build time on Cloudflare Pages (and locally when CONTENT_KEY is set).
 *
 * Requires CONTENT_KEY env var (32 hex bytes = 64 hex chars).
 *
 * If CONTENT_KEY is not set and REQUIRE_CONTENT_KEY is "true":
 *   - Exits with error (used during production builds to prevent stub generation)
 *
 * If CONTENT_KEY is not set and REQUIRE_CONTENT_KEY is not set:
 *   - Generates minimal stub .md files for local dev server
 *
 * Usage:
 *   export CONTENT_KEY="<64-hex-char-key>"
 *   npm run build    # requires CONTENT_KEY, fails without it
 *   npm run decrypt  # generates stubs if CONTENT_KEY not set (local dev)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDecipheriv } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const usersDir = resolve(__dirname, "..", "src", "content", "users");

// Ensure the users directory exists
if (!existsSync(usersDir)) {
  mkdirSync(usersDir, { recursive: true });
}

const lockedFiles = readdirSync(usersDir).filter((f) => f.endsWith(".md.locked"));

if (lockedFiles.length === 0) {
  console.log("[decrypt-users] No .md.locked files found — skipping.");
  process.exit(0);
}

const keyHex = process.env.CONTENT_KEY;
const requireKey = process.env.REQUIRE_CONTENT_KEY === "true";

if (keyHex) {
  // Production mode: decrypt using the secret key
  if (keyHex.length !== 64) {
    console.error("[decrypt-users] CONTENT_KEY must be exactly 64 hex characters (32 bytes).");
    process.exit(1);
  }

  const key = Buffer.from(keyHex, "hex");

  for (const lockedFile of lockedFiles) {
    const lockedPath = resolve(usersDir, lockedFile);
    const mdFile = lockedFile.replace(".locked", "");
    const mdPath = resolve(usersDir, mdFile);

    const data = readFileSync(lockedPath, "utf-8").trim();
    const colonIndex = data.indexOf(":");

    if (colonIndex === -1) {
      console.error(`[decrypt-users] Invalid format in ${lockedFile}, skipping.`);
      continue;
    }

    const ivHex = data.slice(0, colonIndex);
    const encryptedHex = data.slice(colonIndex + 1);

    if (ivHex.length !== 32) {
      console.error(`[decrypt-users] Invalid IV in ${lockedFile} (expected 32 hex chars), skipping.`);
      continue;
    }

    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    try {
      const decipher = createDecipheriv("aes-256-cbc", key, iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      writeFileSync(mdPath, decrypted.toString("utf-8"), "utf-8");
      console.log(`[decrypt-users] Decrypted: ${lockedFile} → ${mdFile}`);
    } catch (err) {
      console.error(`[decrypt-users] Failed to decrypt ${lockedFile}: ${err.message}`);
      process.exit(1);
    }
  }
} else {
  // Check if key is required (e.g., during production build)
  if (requireKey) {
    console.error("[decrypt-users] CONTENT_KEY not set — cannot build without decryption key.");
    process.exit(1);
  }
  // Local dev mode: generate minimal stubs from filenames
  console.log("[decrypt-users] CONTENT_KEY not set — generating stub .md files for local dev.");
  for (const lockedFile of lockedFiles) {
    const mdFile = lockedFile.replace(".locked", "");
    const mdPath = resolve(usersDir, mdFile);

    // Skip if a decrypted version already exists (from a previous decrypt run)
    if (existsSync(mdPath)) continue;

    // Derive userId from the filename (remove .md extension)
    const userId = mdFile.replace(/\.md$/, "");

    // If the .md.locked file looks like valid encrypted content, try to
    // parse a minimal userId/displayName. Otherwise use the filename.
    let displayName = userId.charAt(0).toUpperCase() + userId.slice(1);

    const content = `---
userId: ${userId}
displayName: ${displayName}
exercises:
  - id: example
    name: Example Exercise
    target: "3x10"
    days: [mon, wed, fri]
---

## History

### 1970-01-01
- example: stub data — run with CONTENT_KEY for real data
`;
    writeFileSync(mdPath, content, "utf-8");
    console.log(`[decrypt-users] Generated stub: ${mdFile}`);
  }
}

console.log("[decrypt-users] Done.");