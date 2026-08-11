using AssignmentSystem.Api.Entities;

namespace AssignmentSystem.Api.Services;

public interface ITokenService
{
    string GenerateToken(User user);
}
