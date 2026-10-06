# Swagger / OpenAPI

This API auto-generates interactive documentation with [Swashbuckle.AspNetCore](https://github.com/domaindrivendev/Swashbuckle.AspNetCore)
— no hand-written API docs to keep in sync. This file explains what's configured, where, and how to
use it.

## Where it's set up

Everything lives in `Program.cs`:

```csharp
// ---- Swagger ----
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Assignment System API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Enter 'Bearer {your JWT token}'",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", document), new List<string>() }
    });
});
```

and later, only inside the `Development` environment check:

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
```

## What it actually does

At startup, Swashbuckle reflects over every `[ApiController]` (`AuthController`, `UsersController`,
`ClassesController`, `SubjectsController`, `TeacherAssignmentsController`, `AssignmentsController`,
`SubmissionsController`) and builds an OpenAPI spec describing:

- every route and HTTP verb (`[HttpGet]`, `[HttpPost("{id:guid}")]`, etc.)
- the shape of every request/response DTO (`CreateAssignmentRequest`, `SubmissionDto`, ...)
- which roles each endpoint requires, from `[Authorize(Roles = "...")]`

`Swagger UI` then renders that spec as a browsable, testable web page — no Postman/curl needed to
exercise the API.

## How to use it

1. Run the backend (`dotnet run --project AssignmentSystem.Api`) and open
   `http://localhost:5096/swagger`.
2. Expand `POST /api/auth/login`, click **Try it out**, and submit one of the demo credentials (see the
   root `README.md`). Copy the `token` value from the response.
3. Click the **Authorize** button (top right, padlock icon), paste `Bearer <token>` into the value
   field, and confirm. Every subsequent "Try it out" call now automatically sends
   `Authorization: Bearer <token>` — you don't need to paste it per-request.
4. Expand any protected endpoint (e.g. `POST /api/assignments`) and try it directly. Swagger enforces
   nothing itself — the backend's `[Authorize(Roles=...)]` and service-layer ownership checks are the
   real authorization boundary, so you'll still get a real `401`/`403` if the logged-in role/token
   doesn't have permission, exactly as it would from the frontend.

## Why it's Development-only

`app.UseSwagger()` / `app.UseSwaggerUI()` are gated behind `app.Environment.IsDevelopment()`, so the
spec and the UI are **not** exposed in production. Publishing a full machine-readable map of every
endpoint, DTO shape, and role requirement is unnecessary attack-surface information for a public
deployment — this is standard ASP.NET Core practice, not specific to this project.
