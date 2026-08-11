using AssignmentSystem.Api.Dtos;

namespace AssignmentSystem.Api.Services;

public interface ISubjectService
{
    Task<PagedResult<SubjectDto>> GetSubjectsAsync(Guid? classId, int page, int pageSize);
    Task<SubjectDto> GetSubjectByIdAsync(Guid id);
    Task<SubjectDto> CreateSubjectAsync(CreateSubjectRequest request);
    Task<SubjectDto> UpdateSubjectAsync(Guid id, UpdateSubjectRequest request);
    Task DeleteSubjectAsync(Guid id);
}
