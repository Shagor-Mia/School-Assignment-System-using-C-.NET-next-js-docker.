using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;

namespace AssignmentSystem.Api.Services;

public interface IAssignmentService
{
    Task<PagedResult<AssignmentDto>> GetAssignmentsAsync(Guid userId, UserRole role, int page, int pageSize);
    Task<AssignmentDto> GetAssignmentByIdAsync(Guid id, Guid userId, UserRole role);
    Task<AssignmentDto> CreateAssignmentAsync(CreateAssignmentRequest request, Guid userId, UserRole role);
    Task<AssignmentDto> UpdateAssignmentAsync(Guid id, UpdateAssignmentRequest request, Guid userId, UserRole role);
    Task DeleteAssignmentAsync(Guid id, Guid userId, UserRole role);
    Task<AssignmentDto> PublishAssignmentAsync(Guid id, Guid userId, UserRole role);
}
