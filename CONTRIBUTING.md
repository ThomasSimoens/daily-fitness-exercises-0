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

### 3. Set environment variables (optional)

If you want basic auth, add a `BASIC_AUTH_CREDENTIALS` environment variable in the **Environment variables** section with the value `username:password`.

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