using AssignmentSystem.Api.Dtos;

namespace AssignmentSystem.Api.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(string email, string password);
}
