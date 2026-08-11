using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;

namespace AssignmentSystem.Api.Services;

public interface IUserService
{
    Task<PagedResult<UserDto>> GetUsersAsync(UserRole? role, string? search, int page, int pageSize);
    Task<UserDto> GetUserByIdAsync(Guid id);
    Task<UserDto> CreateUserAsync(CreateUserRequest request);
    Task<UserDto> UpdateUserAsync(Guid id, UpdateUserRequest request);
    Task DeleteUserAsync(Guid id);
}
