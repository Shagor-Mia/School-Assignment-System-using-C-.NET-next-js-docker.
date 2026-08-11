using System.Security.Claims;
using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;

namespace AssignmentSystem.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        if (value is null || !Guid.TryParse(value, out var id))
        {
            throw new UnauthorizedAppException("Invalid or missing user identifier in token.");
        }

        return id;
    }

    public static UserRole GetUserRole(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.Role);
        if (value is null || !Enum.TryParse<UserRole>(value, out var role))
        {
            throw new UnauthorizedAppException("Invalid or missing role in token.");
        }

        return role;
    }
}
