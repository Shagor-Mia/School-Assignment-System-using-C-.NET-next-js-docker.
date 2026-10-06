# Deploying (free tier)

This walks through hosting the three pieces on free tiers: **Neon** (PostgreSQL), **Render**
(backend API), **Vercel** (frontend). All three need you to sign in with your own account — I can't
create accounts or push code to a GitHub repo on your behalf, so the steps below are split into what
you do manually vs. what's already prepared in the repo.

## What's already prepared in this repo

- `backend/AssignmentSystem.Api/Dockerfile` — multi-stage build for the API. **Not live-verified**
  in this environment (Docker Desktop's engine wouldn't start here) — if you have Docker running, sanity
  check it yourself first: `cd backend && docker build -f AssignmentSystem.Api/Dockerfile -t test .`
- `render.yaml` — a Render Blueprint describing the web service (Docker runtime, health check,
  env var names). It does **not** contain real secrets — those are marked `sync: false`, meaning
  Render will prompt you to fill them in rather than reading them from this file.
- `Program.cs` reads `PORT` from the environment (Render/most container PaaS platforms inject this
  and require the app to bind to it) and `Cors:AllowedOrigins` from config (overridable via
  `Cors__AllowedOrigins__0`, `__1`, ... env vars) instead of a hardcoded `localhost:3000`.
- `Program.cs` also forwards `X-Forwarded-Proto` (`UseForwardedHeaders`) so `UseHttpsRedirection`
  doesn't redirect-loop behind Render's TLS-terminating edge proxy.

## Step 0 — push to GitHub

Render and Vercel both deploy from a connected Git repository. This project isn't a git repo yet
(per an earlier choice in this project). To proceed:

```
git init
git add .
git commit -m "Initial commit"
```

Then create a new (private or public) repo on GitHub and push:

```
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

I can run the `git init`/`commit` part for you if you'd like — just ask. Creating the GitHub repo
itself and pushing needs your GitHub login, so that part is on you (via the GitHub website + `git push`,
or the `gh` CLI if you have it authenticated).

## Step 1 — Neon (PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech), create a new project (any region close to you).
2. In the project dashboard, copy the connection string. It looks like:
   ```
   postgresql://<user>:<password>@<host>/<database>?sslmode=require
   ```
3. Convert it to the Npgsql key-value format the backend expects:
   ```
   Host=<host>;Port=5432;Database=<database>;Username=<user>;Password=<password>;SSL Mode=Require;Trust Server Certificate=true
   ```
   Keep this string — you'll paste it into Render in Step 3 as `DB_URL`.

You don't need to run any SQL yourself — the backend runs `Database.Migrate()` and seeds demo data
automatically the first time it starts up against this database.

## Step 2 — generate a JWT signing key

Any random string 32+ characters long works, e.g. generate one locally:

```
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Keep this too — it's the `Jwt__Key` value in Step 3.

## Step 3 — Render (backend API)

1. Sign up at [render.com](https://render.com), connect your GitHub account, and pick "New +" →
   "Blueprint". Select the repo you pushed in Step 0 — Render will detect `render.yaml` at the repo
   root and propose the `assignment-system-api` service.
2. When prompted for the `sync: false` env vars, fill in:
   - `DB_URL` — the Neon string from Step 1
   - `Jwt__Key` — the random key from Step 2
   - `Cors__AllowedOrigins__0` — leave a placeholder for now (e.g. `https://placeholder.vercel.app`);
     you'll come back and fix this in Step 5 once the real Vercel URL exists
3. Deploy. Render will build the Docker image from `backend/AssignmentSystem.Api/Dockerfile` and start
   the container. First deploy takes a few minutes (cold Docker build).
4. Once live, note the service URL, e.g. `https://assignment-system-api.onrender.com`. Confirm it works:
   `https://assignment-system-api.onrender.com/swagger` should load, and
   `POST /api/auth/login` with the demo admin credentials should return a token.

**Free tier caveats:**
- The service spins down after ~15 minutes of inactivity and takes 30–60s to cold-start on the next
  request — expected on Render's free plan, not a bug.
- The container's filesystem is **ephemeral** — anything written to `wwwroot/uploads` (student
  submission file attachments) is lost on every redeploy/restart. Fine for a demo; for real use you'd
  swap the file-storage code to an object store (S3-compatible, Cloudflare R2, etc.) instead of local
  disk — out of scope for this project but worth knowing before relying on it for real files.

## Step 4 — Vercel (frontend)

1. Sign up at [vercel.com](https://vercel.com), "Add New" → "Project", import the same GitHub repo.
2. Set **Root Directory** to `frontend` (important — the repo root isn't the Next.js app).
3. Add an environment variable: `BACKEND_URL` = your Render URL from Step 3
   (e.g. `https://assignment-system-api.onrender.com`, no trailing slash).
4. Deploy. Vercel auto-detects Next.js — no other config needed.
5. Note the deployed URL, e.g. `https://your-app.vercel.app`.

## Step 5 — close the loop on CORS

Go back to the Render service → Environment tab → update `Cors__AllowedOrigins__0` to your real Vercel
URL from Step 4 (e.g. `https://your-app.vercel.app`, no trailing slash), save, and let it redeploy. If
you also want Vercel's preview-deployment URLs (the `https://your-app-git-branch-xxx.vercel.app` ones)
to work, add them as `Cors__AllowedOrigins__1`, `__2`, etc.

## Step 6 — test it

Visit your Vercel URL, log in with the demo credentials from the root `README.md`, and confirm the
role-based dashboards load and the assignment/submission workflow works end-to-end against the live
Render + Neon backend.
