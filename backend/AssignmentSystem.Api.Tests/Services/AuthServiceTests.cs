using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace AssignmentSystem.Api.Tests.Services;

public class AuthServiceTests
{
    private static IConfiguration BuildConfiguration()
    {
        var settings = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-signing-key-that-is-at-least-32-characters-long",
            ["Jwt:Issuer"] = "AssignmentSystem.Tests",
            ["Jwt:Audience"] = "AssignmentSystem.Tests.Client",
            ["Jwt:ExpiryHours"] = "4"
        };

        return new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
    }

    private static AuthService CreateService(Data.AppDbContext context) =>
        new(context, new TokenService(BuildConfiguration()));

    [Fact]
    public async Task Login_ValidCredentials_ReturnsTokenAndUser()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var user = TestData.CreateUser("Jane Teacher", "teacher@test.local", UserRole.Teacher);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword1");
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.LoginAsync("teacher@test.local", "CorrectPassword1");

        result.Token.Should().NotBeNullOrWhiteSpace();
        result.User.Role.Should().Be("Teacher");
        result.User.Email.Should().Be("teacher@test.local");
    }

    [Fact]
    public async Task Login_WrongPassword_ThrowsUnauthorized()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var user = TestData.CreateUser("Jane Teacher", "teacher@test.local", UserRole.Teacher);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword1");
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var act = () => service.LoginAsync("teacher@test.local", "WrongPassword");

        await act.Should().ThrowAsync<UnauthorizedAppException>();
    }

    [Fact]
    public async Task Login_UnknownEmail_ThrowsUnauthorized()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();

        var service = CreateService(context);
        var act = () => service.LoginAsync("nobody@test.local", "AnyPassword1");

        await act.Should().ThrowAsync<UnauthorizedAppException>();
    }

    [Fact]
    public async Task Login_InactiveUser_ThrowsUnauthorized()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var user = TestData.CreateUser("Deactivated Teacher", "deactivated@test.local", UserRole.Teacher, isActive: false);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword1");
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var act = () => service.LoginAsync("deactivated@test.local", "CorrectPassword1");

        await act.Should().ThrowAsync<UnauthorizedAppException>();
    }

    [Fact]
    public async Task GetCurrentUser_ReturnsProfile()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var user = TestData.CreateUser("Jane Teacher", "teacher@test.local", UserRole.Teacher);
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var result = await CreateService(context).GetCurrentUserAsync(user.Id);

        result.Email.Should().Be("teacher@test.local");
        result.FullName.Should().Be("Jane Teacher");
    }

    [Fact]
    public async Task ChangePassword_CorrectCurrentPassword_UpdatesHash()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var user = TestData.CreateUser("Jane Teacher", "teacher@test.local", UserRole.Teacher);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldPassword1");
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        await service.ChangePasswordAsync(user.Id, "OldPassword1", "NewPassword1");

        var login = await service.LoginAsync("teacher@test.local", "NewPassword1");
        login.Token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_Throws()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var user = TestData.CreateUser("Jane Teacher", "teacher@test.local", UserRole.Teacher);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldPassword1");
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var act = () => CreateService(context).ChangePasswordAsync(user.Id, "WrongPassword", "NewPassword1");

        await act.Should().ThrowAsync<AppValidationException>();
    }
}
