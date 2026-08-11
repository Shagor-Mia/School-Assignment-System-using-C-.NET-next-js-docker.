# Assignment & Submission Management System

A role-based (Admin / Teacher / Student) assignment and submission management system for a school or
college. Teachers create assignments for a class/subject, students submit answers, and teachers grade
submissions and leave feedback.

> New to this codebase? [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) walks through how the
> backend and frontend are actually built — request flow, auth pattern, where each business rule
> lives — this README covers setup and *what*, that guide covers *how*.

## Features

- **Admin**: manage users (create/edit/deactivate, role + class assignment), classes, subjects, and
  teacher↔subject assignments; read-only view of all assignments across the system.
- **Teacher**: create/edit/delete assignments for subjects they're assigned to, save as Draft or
  Published, view submissions, grade with marks + feedback, change a submission's status (e.g. reopen
  it with `ReturnedForRevision`).
- **Student**: see Published assignments for their own class, submit a text answer with an optional
  file attachment, update a submission before the deadline (or after, if the teacher allowed late
  submissions or reopened it), see marks and feedback once graded.
- JWT-based authentication with role-based authorization enforced on every backend endpoint.
- Swagger/OpenAPI docs with a working "Authorize" button for trying protected endpoints.
- 29 backend tests covering the business rules, ownership checks, and role-based authorization.

## Technology stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, react-hook-form + zod |
| Backend | ASP.NET Core 8 Web API, C#, EF Core (Npgsql), FluentValidation, Serilog, Swashbuckle |
| Database | PostgreSQL |
| Auth | JWT (backend-issued), httpOnly cookie session (frontend), role-based `[Authorize]` |
| Testing | xUnit, FluentAssertions, EF Core Sqlite in-memory provider, `WebApplicationFactory` |
| Containers | Separate `Dockerfile` per app (backend deploys via Docker on Render; frontend's is optional, Vercel builds natively) |

## Project structure

```
asp/
├── backend/
│   ├── AssignmentSystem.sln
│   ├── AssignmentSystem.Api/          ASP.NET Core Web API (Controllers, Entities, Dtos, Services,
│   │                                  Validators, Data/AppDbContext + DbSeeder, Migrations, Program.cs)
│   ├── AssignmentSystem.Api.Tests/    xUnit tests (Services/, Authorization/, Infrastructure/)
│   └── Database/
│       ├── schema.sql                 exported migration script (fallback if you don't have the .NET SDK)
│       ├── seed.sql                   exported seed data (matches the DbSeeder's output)
│       └── seed-large.sql             bulk demo dataset (1000 students etc.) — auto-run in Development, see below
├── frontend/                          Next.js app (App Router)
│   ├── app/                           pages: login, admin/*, teacher/*, student/*, api/* (BFF routes)
│   ├── components/, lib/               shared UI + API client + types + auth helpers
│   ├── middleware.ts                  role-based route guard
│   └── Dockerfile                     multi-stage build (Next.js standalone output) — not used by Vercel
├── .env.example                       backend env var reference
└── README.md
```

## Design decisions

**Why PostgreSQL over MongoDB.** The domain is inherently relational: Users, Classes, Subjects,
Teacher↔Subject assignments, Assignments, and Submissions all have real foreign-key relationships and
constraints that matter (a submission must reference an existing assignment/student, marks can't
exceed an assignment's max marks, a student can only have one submission per assignment). Postgres
gives referential integrity and unique constraints for free and pairs naturally with EF Core
migrations, which also makes "set up the DB with no manual table creation" trivial to satisfy.

**Backend: one Web API project, not a 4-layer "clean architecture".** With ~6 entities and a handful
of business rules, a single project organized by folder (`Controllers/`, `Entities/`, `Dtos/`,
`Services/`, `Validators/`) is simpler to run, read, and test than splitting into Domain/Application/
Infrastructure/API class libraries. Business logic lives in injectable `IXxxService` classes (not in
controllers), which keeps it testable without the extra ceremony.

**Auth: backend-for-frontend (BFF) pattern, JWT never touches the browser.** The ASP.NET Core API
issues JWTs and is the actual security boundary (`[Authorize(Roles=...)]` plus ownership checks in
services). The Next.js app never lets client-side JavaScript see the token: `app/api/auth/login/route.ts`
proxies the login call and stores the JWT in an **httpOnly** cookie; a catch-all proxy route
(`app/api/backend/[...path]/route.ts`) attaches `Authorization: Bearer <token>` server-side on every
API call; `middleware.ts` decodes the role claim from the cookie only for UX routing (redirecting a
Teacher away from `/admin`, etc.) — it does not verify the signature, because the backend re-verifies
every request anyway. This avoids the XSS token-theft risk of storing a JWT in `localStorage`.

**Data model simplifications** (documented here since they shape the schema):
- A **Student belongs to exactly one Class** at a time (nullable `ClassId` on `User`) — a typical
  school/term model. Supporting multi-class enrollment (college-style) would need a join table.
- A **Subject belongs to exactly one Class**. Teaching the same subject name across multiple classes
  means creating separate `Subject` rows (e.g. "Mathematics — Grade 10A", "Mathematics — Grade 10B").
- **No self-registration** — matches the brief: Admin creates all accounts. A `DbSeeder` creates one
  demo account per role on first run.
- **Submission = text answer + optional single file attachment**, stored on local disk under
  `wwwroot/uploads` (5MB limit). No cloud storage integration — out of scope for a local/demo deployment.

**Business rules enforced (and unit-tested):**
1. Only a Teacher assigned to a Subject (via `TeacherSubjectAssignment`) may create/edit/delete/publish
   assignments for it; Admin can always act.
2. Draft assignments are invisible to students; Published ones are visible only to students in the
   assignment's class.
3. A student can only view/submit within their own class's subjects.
4. Submitting/updating is blocked once the deadline has passed, **unless** the assignment allows late
   submissions, **or** the submission's status is `ReturnedForRevision` (the teacher explicitly reopened it).
5. Marks can never exceed an assignment's max marks (validated server-side).
6. Only the assignment-owning teacher (or Admin) can grade a submission or change its status.
7. One submission per (student, assignment) — resubmitting updates the existing row instead of creating
   a duplicate.

**Test database strategy.** Service-layer tests run against EF Core's Sqlite in-memory provider rather
than the pure `UseInMemoryDatabase` provider, because Sqlite actually enforces foreign keys and unique
indexes — so a test like "one submission per (assignment, student)" is a real constraint check, not
just an optimistic in-process assumption. A few `WebApplicationFactory`-based integration tests boot
the real ASP.NET Core pipeline (auth, authorization, exception middleware) against an isolated Sqlite
database to confirm role gates return the correct 401/403 at the HTTP layer, not just inside a service
method.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/) and npm
- [PostgreSQL](https://www.postgresql.org/download/) (14+), running locally
- [Docker](https://www.docker.com/products/docker-desktop/) — only needed if you want to build/run a
  service's container image directly (see "Docker" below); not required for `dotnet run`/`npm run dev`.

## Docker

Backend and frontend are deployed to **two separate platforms** (Render and Vercel — see
[`DEPLOYMENT.md`](DEPLOYMENT.md)), so each app owns its own, self-contained Dockerfile instead of a
shared root-level compose file that would imply they run together — they don't, in production.

- **`backend/AssignmentSystem.Api/Dockerfile`** — multi-stage build producing the image Render actually
  deploys (`render.yaml` points at it directly). Build/run it standalone against any reachable Postgres:
  ```
  cd backend
  docker build -f AssignmentSystem.Api/Dockerfile -t assignment-system-api .
  docker run -p 5096:8080 ^
    -e ConnectionStrings__DefaultConnection="Host=<your-postgres-host>;Port=5432;Database=assignment_system;Username=assignment_app;Password=your-password-here" ^
    -e Jwt__Key="<32+ char random string>" ^
    assignment-system-api
  ```
- **`frontend/Dockerfile`** — multi-stage build using Next.js's `standalone` output. Vercel does **not**
  use this file — it builds the frontend natively from source. This Dockerfile exists as a self-contained
  option if you ever need to run/host the frontend as a container instead of on Vercel:
  ```
  cd frontend
  docker build -t assignment-system-frontend .
  docker run -p 3000:3000 -e BACKEND_URL="http://host.docker.internal:5096" assignment-system-frontend
  ```

## Database setup

1. Create a dedicated role and database (adjust the password):

   ```sql
   CREATE ROLE assignment_app LOGIN PASSWORD 'your-password-here';
   CREATE DATABASE assignment_system OWNER assignment_app;
   ```

2. Point the backend at it. Copy `backend/AssignmentSystem.Api/appsettings.json`'s
   `ConnectionStrings:DefaultConnection` into a local `appsettings.Development.json` (gitignored) with
   your real password, **or** set the environment variable instead (see `.env.example` at the repo root):

   ```
   ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=assignment_system;Username=assignment_app;Password=your-password-here
   Jwt__Key=<any random string, 32+ characters>
   ```

3. Apply the schema. You have two options:
   - **With the .NET SDK** (recommended — this also seeds demo data automatically): just run the
     backend (step below). `Program.cs` calls `Database.Migrate()` and seeds on startup.
   - **Without the .NET SDK**: run `backend/Database/schema.sql` against `assignment_system` with
     `psql`, then `backend/Database/seed.sql` to load the demo data:
     ```
     psql -U assignment_app -d assignment_system -f backend/Database/schema.sql
     psql -U assignment_app -d assignment_system -f backend/Database/seed.sql
     ```

Either path leaves you with a fully migrated, seeded database — no manual table creation needed.

## Running the backend

```
cd backend
dotnet restore
dotnet run --project AssignmentSystem.Api
```

The API listens on `http://localhost:5096` (HTTP) / `https://localhost:7298` (HTTPS) by default — see
`backend/AssignmentSystem.Api/Properties/launchSettings.json`. Swagger UI is at
`http://localhost:5096/swagger` — see [`backend/AssignmentSystem.Api/SWAGGER.md`](backend/AssignmentSystem.Api/SWAGGER.md)
for how it's set up and how to use the JWT "Authorize" flow to test protected endpoints.

## Running the frontend

```
cd frontend
npm install
cp .env.example .env.local   # defaults to BACKEND_URL=http://localhost:5096, adjust if needed
npm run dev
```

Visit `http://localhost:3000`.

## Deploying

Free-tier deployment (Neon + Render + Vercel), including a Dockerfile and Render Blueprint, is
documented step-by-step in [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Running the tests

```
cd backend
dotnet test
```

29 tests: service-layer business-rule tests (Assignment ownership/visibility, Submission deadline/late/
reopen logic, marks validation, grading ownership, Auth login rules) plus HTTP-layer authorization tests
via `WebApplicationFactory` (401 with no token, 403 on a wrong-role request, 200 for the correct role).

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@synoslms.local` | `Admin@12345` |
| Teacher | `teacher@synoslms.local` | `Teacher@12345` |
| Student | `student@synoslms.local` | `Student@12345` |

These are created by the `DbSeeder` on first run (or by `backend/Database/seed.sql`), along with a sample class
("Grade 10 - A"), subject ("Mathematics"), a Published assignment with one ungraded submission, and a
Draft assignment (to demonstrate that drafts are hidden from students).

### Bulk demo dataset (local development)

In the `Development` environment, `backend/Database/seed-large.sql` also runs automatically on startup
(right after `DbSeeder`, and only once — it's idempotent) to populate a realistic-scale Bangladeshi
high school: Class 1 through Class 10, each with sections A/B/C (30 classes), 7 subjects per class
(Bangla, English, Mathematics, General Science, Bangladesh and Global Studies, Religion and Moral
Education, ICT), 60 teachers, **1000 students**, ~420 assignments, and ~5,000+ submissions (a mix of
graded/ungraded). It's a plain SQL script (`generate_series` + `pgcrypto`), not part of `DbSeeder`, so
it's skipped entirely outside Development (e.g. on Render) — no bulk synthetic data ends up in a real
deployment.

Login pattern for the generated accounts (every account in a role shares one password):

| Role | Email pattern | Password |
|---|---|---|
| Teacher | `teacher001@bulk.local` .. `teacher060@bulk.local` | `Teacher@12345` |
| Student | `student0001@bulk.local` .. `student1000@bulk.local` | `Student@12345` |

## Assumptions & known limitations

- A student belongs to exactly one class at a time; a subject belongs to exactly one class (see
  "Data model simplifications" above).
- No self-registration; accounts are Admin-managed only.
- No refresh tokens — the JWT access token expires after 4 hours (`Jwt:ExpiryHours` in config), which
  is fine for a demo/local deployment but would need a refresh flow for production use.
- File uploads are stored on local disk (`wwwroot/uploads`), not a cloud object store.
- No email notifications (listed as optional in the brief; not implemented).
- Pagination is implemented on the Users list; other admin lists (Classes, Subjects, Teacher
  Assignments) are unpaginated, since the demo dataset is small — would need pagination for a large
  real deployment.
