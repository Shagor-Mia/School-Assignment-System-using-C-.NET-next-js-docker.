using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AssignmentSystem.Api.Tests.Infrastructure;

/// <summary>
/// Boots the real ASP.NET Core pipeline (auth, authorization, exception middleware, controllers) against
/// an isolated Sqlite in-memory database, so authorization/role-enforcement tests exercise actual HTTP
/// request handling rather than calling services directly.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public ApiFactory()
    {
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        });
    }

    /// <summary>Creates the schema and seeds a minimal Admin/Teacher/Student scenario. Call once per test.</summary>
    public async Task<(Class Class, Subject Subject, User Teacher, User Student, User Admin)> SeedAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        return TestData.SeedStandardScenario(context);
    }

    public string GenerateTokenFor(User user)
    {
        using var scope = Services.CreateScope();
        var tokenService = scope.ServiceProvider.GetRequiredService<AssignmentSystem.Api.Services.ITokenService>();
        return tokenService.GenerateToken(user);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
        }
    }
}
