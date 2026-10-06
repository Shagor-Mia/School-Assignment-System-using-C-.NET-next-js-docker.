using System.Text;
using System.Text.Json.Serialization;
using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Middleware;
using AssignmentSystem.Api.Services;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;

const string CorsPolicyName = "NextJsFrontend";

// Local dev: load secrets from backend/AssignmentSystem.Api/.env when it exists. Deployed (Render)
// has no .env file; config comes from real environment variables there.
if (File.Exists(".env")) DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// ---- Listen on $PORT when present (Render/Fly/Heroku-style platforms inject this; falls back to
// launchSettings.json / default Kestrel config for local `dotnet run`) ----
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://+:{port}");
}

// ---- Serilog ----
builder.Host.UseSerilog((context, services, loggerConfiguration) => loggerConfiguration
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        Path.Combine(context.HostingEnvironment.ContentRootPath, "logs", "log-.txt"),
        rollingInterval: RollingInterval.Day));

// ---- EF Core / Npgsql ----
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration["DB_URL"] ?? builder.Configuration.GetConnectionString("DefaultConnection")));

// ---- Controllers + JSON (string enums) ----
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// ---- FluentValidation ----
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// ---- JWT Authentication ----
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtSection["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSection["Audience"],
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

builder.Services.AddAuthorization();

// ---- CORS ----
// Reads Cors:AllowedOrigins from config (appsettings.json / appsettings.Development.json), overridable
// in production via the Cors__AllowedOrigins__0, Cors__AllowedOrigins__1, ... environment variables
// (ASP.NET Core's standard array-index convention for env var config). Defaults to the local Next.js
// dev server if nothing is configured.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

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

// ---- Application services ----
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<ITeacherAssignmentService, TeacherAssignmentService>();
builder.Services.AddScoped<IAssignmentService, AssignmentService>();
builder.Services.AddScoped<ISubmissionService, SubmissionService>();

// ---- File storage: Cloudinary when configured, otherwise local wwwroot/uploads ----
var cloudinarySection = builder.Configuration.GetSection("Cloudinary");
if (!string.IsNullOrWhiteSpace(cloudinarySection["CloudName"])
    && !string.IsNullOrWhiteSpace(cloudinarySection["ApiKey"])
    && !string.IsNullOrWhiteSpace(cloudinarySection["ApiSecret"]))
{
    var cloudinary = new CloudinaryDotNet.Cloudinary(new CloudinaryDotNet.Account(
        cloudinarySection["CloudName"], cloudinarySection["ApiKey"], cloudinarySection["ApiSecret"])) { Api = { Secure = true } };
    builder.Services.AddSingleton(cloudinary);
    builder.Services.AddScoped<IFileStorage, CloudinaryFileStorage>();
}
else
{
    builder.Services.AddScoped<IFileStorage, LocalFileStorage>();
}

var app = builder.Build();

// ---- Migrate on startup (idempotent). All data lives in PostgreSQL; the app seeds nothing. ----
// Skipped in the "Testing" environment: WebApplicationFactory-based integration tests swap in a
// Sqlite in-memory AppDbContext and call Database.EnsureCreated() themselves instead, since applying
// Npgsql-generated migrations against a different provider isn't a supported scenario.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Trust the reverse proxy's X-Forwarded-Proto/X-Forwarded-For headers (Render, Fly, most container
// PaaS platforms terminate TLS at their edge and forward plain HTTP to the container) so
// UseHttpsRedirection below sees the original scheme instead of redirect-looping.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

app.UseSerilogRequestLogging();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(CorsPolicyName);

var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
