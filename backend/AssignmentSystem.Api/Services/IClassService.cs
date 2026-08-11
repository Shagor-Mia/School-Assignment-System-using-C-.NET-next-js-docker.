using AssignmentSystem.Api.Dtos;

namespace AssignmentSystem.Api.Services;

public interface IClassService
{
    Task<PagedResult<ClassDto>> GetClassesAsync(int page, int pageSize);
    Task<ClassDto> GetClassByIdAsync(Guid id);
    Task<ClassDto> CreateClassAsync(CreateClassRequest request);
    Task<ClassDto> UpdateClassAsync(Guid id, UpdateClassRequest request);
    Task DeleteClassAsync(Guid id);
}
