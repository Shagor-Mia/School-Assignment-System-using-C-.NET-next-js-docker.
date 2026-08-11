using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using Microsoft.AspNetCore.Http;

namespace AssignmentSystem.Api.Services;

public interface ISubmissionService
{
    Task<List<SubmissionDto>> GetSubmissionsForAssignmentAsync(Guid assignmentId, Guid userId, UserRole role);
    Task<SubmissionDto> GetMySubmissionAsync(Guid assignmentId, Guid studentId);
    Task<SubmissionDto> SubmitAsync(Guid assignmentId, Guid studentId, string answerText, IFormFile? file);
    Task<SubmissionDto> UpdateSubmissionAsync(Guid id, Guid studentId, string answerText, IFormFile? file);
    Task<SubmissionDto> GetSubmissionByIdAsync(Guid id, Guid userId, UserRole role);
    Task<SubmissionDto> GradeSubmissionAsync(Guid id, GradeSubmissionRequest request, Guid userId, UserRole role);
    Task<SubmissionDto> SetStatusAsync(Guid id, UpdateSubmissionStatusRequest request, Guid userId, UserRole role);
}
