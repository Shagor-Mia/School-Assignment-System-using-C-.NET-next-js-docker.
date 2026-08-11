using AssignmentSystem.Api.Dtos;

namespace AssignmentSystem.Api.Services;

public interface ITeacherAssignmentService
{
    Task<PagedResult<TeacherAssignmentDto>> GetAssignmentsAsync(Guid? teacherId, Guid? subjectId, int page, int pageSize);
    Task<List<TeacherAssignmentDto>> GetMyAssignmentsAsync(Guid teacherId);
    Task<TeacherAssignmentDto> CreateAssignmentAsync(CreateTeacherAssignmentRequest request);
    Task DeleteAssignmentAsync(Guid id);
}
