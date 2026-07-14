# Contributing

## Prerequisites

- **Node.js >= 20** (use [nvm](https://github.com/nvm-sh/nvm) to manage versions)
- A **Cloudflare account** (free tier is sufficient)
- **Git**

## Getting started

```bash
# Clone the repo
git clone git@github.com:ThomasSimoens/daily-fitness-exercises-0.git
cd daily-fitness-exercises-0

# Use the correct Node.js version
nvm use         # reads .nvmrc if present, or use: nvm install lts/iron

# Install dependencies
npm install
```

## Running locally

```bash
npm run dev
```

Opens the dev server at `http://localhost:4321`. Navigate to `/thomas` or `/lobke` to see each user's page.

Content changes (markdown files in `src/content/users/`) are hot-reloaded automatically.

## Project structure

```
daily-exercise/
├── src/
│   ├── content/
│   │   ├── config.ts          # Zod schema — validates markdown frontmatter
│   │   └── users/             # One markdown file per user
│   │       ├── thomas.md
│   │       └── lobke.md
│   ├── pages/
│   │   └── [userId].astro     # Dynamic route: /thomas, /lobke, etc.
│   ├── lib/
│   │   └── today.ts           # Returns today's 3-letter weekday code
│   └── layouts/
│       └── Base.astro         # Base HTML layout
├── functions/
│   └── _middleware.js         # Optional basic auth for Cloudflare Pages
├── astro.config.mjs
├── package.json
└── .gitignore
```

## Security: keeping user data private

Because this repo may be public (required for Cloudflare Pages on the free tier), real user data is **encrypted** before committing, not stored in plaintext in the repo.

### How it works

1. **Locally**: you edit the `.md` files in `src/content/users/` — they work with `npm run dev` as normal.
2. **Before committing**: run `npm run encrypt`, which encrypts each `.md` file into a `.md.locked` file using AES-256-CBC.
3. **In git**: commit the `.md.locked` files. The `.md` files stay as **stub/example** data (safe to commit, just show the format).
4. **On Cloudflare Pages**: the build runs `npm run decrypt` first (as part of `npm run build`), which uses the same `CONTENT_KEY` secret to decrypt `.md.locked` → `.md`, then Astro builds from the real data.

### Setting up the encryption key

Generate a 256-bit key (64 hex characters):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → e.g. e4ec6e7ffc61145311992fb62ad8409c2254a020e1066cb0d3992a1e4b903467
```

Set this key in two places:

- **Your local shell** (for encrypting):
  ```bash
  export CONTENT_KEY="e4ec6e...b903467"
  ```
- **Cloudflare Pages** (for decrypting at build time):  
  Go to **Settings** → **Environment variables** → **Add variable**:

  | Variable      | Value (your 64-hex-char key) | Encrypt |
  |---------------|------------------------------|---------|
  | `CONTENT_KEY` | `e4ec6e7...b903467`          | ✅       |

  Make sure to check **Encrypt** so the key is stored securely.

### Workflow

**Editing locally (no encryption needed):**
```bash
npm run dev
# Edit src/content/users/*.md freely
# The stub files are fine for development
```

**Committing real data safely:**
```bash
# 1. Put your real data in the .md files
# 2. Encrypt them:
export CONTENT_KEY="<your-64-hex-key>"
npm run encrypt
# 3. The .md.locked files are now updated
# 4. Commit BOTH .md (stub) and .md.locked (encrypted real data):
git add .
git commit -m "update workout data"
git push
# Cloudflare Pages rebuilds, decrypts, and serves the real data
```

## Adding a new user

1. Create a new markdown file in `src/content/users/` (filename doesn't matter).
2. Add frontmatter with `userId`, `displayName`, and `exercises` (see existing files for examples).
3. Add history entries under a `## History` heading.
4. The page will automatically be available at `/<userId>`.

## Deploying to Cloudflare Pages

### 1. Create a Cloudflare Pages project

- Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Pages** → **Create a project** → **Connect to Git**.
- Authorize Cloudflare to access your GitHub/GitLab repo.
- Select the `daily-fitness-exercises-0` repository.

### 2. Configure build settings

| Setting             | Value                    |
|---------------------|--------------------------|
| Framework preset    | Astro                    |
| Build command        | `npm run build`          |
| Build output directory | `dist`                |
| **Deploy command**   | *(leave empty)*          |

**Important**: Do NOT add a deploy command. Cloudflare Pages automatically deploys the `dist/` folder after a successful build.

### 3. Set environment variables (optional)

Add these environment variables in the **Environment variables** section:

| Variable           | Value (your key/credentials) | Encrypt |
|--------------------|------------------------------|---------|
| `CONTENT_KEY`       | Your 64-hex-char key         | ✅       |
| `BASIC_AUTH_CREDENTIALS` | `username:password`      | ✅       |

### 4. Deploy

Cloudflare Pages will automatically deploy on every push to the main branch. You can also trigger a manual deploy from the dashboard.

After the first deploy, you'll get a `*.pages.dev` URL (e.g. `https://daily-fitness-exercises-0.pages.dev`). You can also add a custom domain in the Cloudflare Pages settings.

## Logging a workout

1. Do the exercises.
2. Open your user's markdown file (`src/content/users/<user>.md`).
3. Add a new `### YYYY-MM-DD` section (or add a bullet under today's existing section) under `## History`.
4. Commit and push:
   ```bash
   git add .
   git commit -m "log workout for YYYY-MM-DD"
   git push
   ```
5. Cloudflare Pages rebuilds automatically — the site updates in under a minute.

## Building for production

```bash
npm run build
```

Output goes to `dist/`. You can preview the build locally with:

```bash
npm run preview