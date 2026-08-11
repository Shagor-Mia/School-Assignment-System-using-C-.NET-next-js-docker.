using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AssignmentSystem.Api.Tests.Infrastructure;
using FluentAssertions;
using Xunit;

namespace AssignmentSystem.Api.Tests.Authorization;

/// <summary>
/// End-to-end HTTP-layer checks that [Authorize]/role gates are actually enforced by the pipeline,
/// complementing the service-layer business-rule tests (which assume the caller already got past auth).
/// Each test gets its own ApiFactory (own in-memory Sqlite connection) so seeding never collides.
/// </summary>
public class RoleAuthorizationTests : IDisposable
{
    private readonly ApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task GetAssignments_NoToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/assignments");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUsers_StudentToken_Returns403()
    {
        var (_, _, _, student, _) = await _factory.SeedAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _factory.GenerateTokenFor(student));

        var response = await client.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetUsers_AdminToken_Returns200()
    {
        var (_, _, _, _, admin) = await _factory.SeedAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _factory.GenerateTokenFor(admin));

        var response = await client.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateAssignment_StudentToken_Returns403()
    {
        var (_, subject, _, student, _) = await _factory.SeedAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _factory.GenerateTokenFor(student));

        var response = await client.PostAsJsonAsync("/api/assignments", new
        {
            title = "Should not be allowed",
            description = "n/a",
            subjectId = subject.Id,
            deadline = DateTime.UtcNow.AddDays(1),
            maxMarks = 100,
            allowLateSubmission = false,
            status = "Draft"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Login_ThenAccessProtectedEndpoint_Returns200()
    {
        var (_, _, teacher, _, _) = await _factory.SeedAsync();
        var client = _factory.CreateClient();
        var token = _factory.GenerateTokenFor(teacher);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/teacher-assignments/my");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
