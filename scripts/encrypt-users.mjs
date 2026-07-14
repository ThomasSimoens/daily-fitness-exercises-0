#!/usr/bin/env node
/**
 * Encrypts all .md files in src/content/users/ to .md.locked files.
 *
 * Requires CONTENT_KEY env var (32 hex bytes = 64 hex chars, i.e. 256-bit key).
 *
 * Usage:
 *   export CONTENT_KEY="<64-hex-char-key>"
 *   npm run encrypt
 *
 * The .md.locked files are safe to commit to a public repo.
 * They are decrypted at build time by scripts/decrypt-users.mjs.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { createCipheriv, randomBytes } from "crypto";

// Load CONTENT_KEY from .env if not already set
if (!process.env.CONTENT_KEY) {
  try {
    const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env");
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/^CONTENT_KEY=(.+)$/m);
    if (match) {
      process.env.CONTENT_KEY = match[1].trim();
      console.log("[encrypt-users] Loaded CONTENT_KEY from .env");
    }
  } catch {
    // .env not found, continue without it
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const usersDir = resolve(__dirname, "..", "src", "content", "users");

const keyHex = process.env.CONTENT_KEY;

if (!keyHex) {
  console.error("[encrypt-users] CONTENT_KEY environment variable is required.");
  console.error("Generate one with:  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  process.exit(1);
}

if (keyHex.length !== 64) {
  console.error("[encrypt-users] CONTENT_KEY must be exactly 64 hex characters (32 bytes).");
  process.exit(1);
}

const key = Buffer.from(keyHex, "hex");

if (!existsSync(usersDir)) {
  console.error("[encrypt-users] users directory not found:", usersDir);
  process.exit(1);
}

const files = readdirSync(usersDir).filter(
  (f) => f.endsWith(".md") && !f.endsWith(".md.locked")
);

if (files.length === 0) {
  console.log("[encrypt-users] No .md files found to encrypt.");
  process.exit(0);
}

for (const file of files) {
  const filePath = resolve(usersDir, file);
  const content = readFileSync(filePath, "utf-8");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(content, "utf-8"), cipher.final()]);
  // Format: iv:encryptedData (both hex-encoded)
  const output = iv.toString("hex") + ":" + encrypted.toString("hex");
  const outputPath = filePath + ".locked";
  writeFileSync(outputPath, output, "utf-8");
  console.log(`[encrypt-users] Encrypted: ${file} → ${file}.locked`);
}

console.log("[encrypt-users] Done.");