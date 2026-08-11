using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;

namespace AssignmentSystem.Api.Mapping;

public static class MappingExtensions
{
    public static UserDto ToDto(this User user)
    {
        return new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            ClassId = user.ClassId,
            ClassName = user.Class?.Name,
            CreatedAt = user.CreatedAt
        };
    }

    public static ClassDto ToDto(this Class @class)
    {
        return new ClassDto
        {
            Id = @class.Id,
            Name = @class.Name,
            StudentCount = @class.Students?.Count ?? 0,
            SubjectCount = @class.Subjects?.Count ?? 0
        };
    }

    public static SubjectDto ToDto(this Subject subject)
    {
        return new SubjectDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Code = subject.Code,
            ClassId = subject.ClassId,
            ClassName = subject.Class?.Name ?? string.Empty
        };
    }

    public static TeacherAssignmentDto ToDto(this TeacherSubjectAssignment assignment)
    {
        return new TeacherAssignmentDto
        {
            Id = assignment.Id,
            TeacherId = assignment.TeacherId,
            TeacherName = assignment.Teacher?.FullName ?? string.Empty,
            SubjectId = assignment.SubjectId,
            SubjectName = assignment.Subject?.Name ?? string.Empty,
            ClassName = assignment.Subject?.Class?.Name ?? string.Empty
        };
    }

    public static AssignmentDto ToDto(this Assignment assignment, int submissionCount = 0)
    {
        return new AssignmentDto
        {
            Id = assignment.Id,
            Title = assignment.Title,
            Description = assignment.Description,
            Deadline = assignment.Deadline,
            MaxMarks = assignment.MaxMarks,
            Status = assignment.Status.ToString(),
            AllowLateSubmission = assignment.AllowLateSubmission,
            SubjectId = assignment.SubjectId,
            SubjectName = assignment.Subject?.Name ?? string.Empty,
            ClassId = assignment.Subject?.ClassId ?? Guid.Empty,
            ClassName = assignment.Subject?.Class?.Name ?? string.Empty,
            CreatedByTeacherId = assignment.CreatedByTeacherId,
            CreatedByTeacherName = assignment.CreatedByTeacher?.FullName ?? string.Empty,
            CreatedAt = assignment.CreatedAt,
            UpdatedAt = assignment.UpdatedAt,
            SubmissionCount = submissionCount != 0 ? submissionCount : assignment.Submissions?.Count ?? 0
        };
    }

    public static SubmissionDto ToDto(this Submission submission)
    {
        return new SubmissionDto
        {
            Id = submission.Id,
            AssignmentId = submission.AssignmentId,
            AssignmentTitle = submission.Assignment?.Title ?? string.Empty,
            StudentId = submission.StudentId,
            StudentName = submission.Student?.FullName ?? string.Empty,
            AnswerText = submission.AnswerText,
            FileName = submission.FileName,
            FileUrl = submission.FilePath is null ? null : $"/uploads/{submission.FilePath}",
            SubmittedAt = submission.SubmittedAt,
            UpdatedAt = submission.UpdatedAt,
            Status = submission.Status.ToString(),
            Marks = submission.Marks,
            MaxMarks = submission.Assignment?.MaxMarks ?? 0,
            Feedback = submission.Feedback,
            GradedAt = submission.GradedAt,
            GradedByTeacherName = submission.GradedByTeacher?.FullName
        };
    }
}
