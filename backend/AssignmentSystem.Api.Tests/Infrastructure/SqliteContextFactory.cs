using AssignmentSystem.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AssignmentSystem.Api.Tests.Infrastructure;

/// <summary>
/// Backs each test with a fresh Sqlite in-memory database (not the pure EF InMemory provider) so
/// unique indexes and foreign keys are actually enforced, matching Postgres semantics closely enough
/// for the business-rule tests to be meaningful. The connection must stay open for the DbContext's
/// lifetime or the in-memory database is dropped.
/// </summary>
public sealed class SqliteContextFactory : IDisposable
{
    private readonly SqliteConnection _connection;

    public SqliteContextFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var context = CreateContext();
        context.Database.EnsureCreated();
    }

    public AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        return new AppDbContext(options);
    }

    public void Dispose() => _connection.Dispose();
}
