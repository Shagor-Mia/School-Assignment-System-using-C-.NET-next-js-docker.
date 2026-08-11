namespace AssignmentSystem.Api.Dtos;

public class SubmissionDto
{
    public Guid Id { get; set; }
    public Guid AssignmentId { get; set; }
    public string AssignmentTitle { get; set; } = string.Empty;
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string AnswerText { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? Marks { get; set; }
    public decimal MaxMarks { get; set; }
    public string? Feedback { get; set; }
    public DateTime? GradedAt { get; set; }
    public string? GradedByTeacherName { get; set; }
}

public class GradeSubmissionRequest
{
    public decimal Marks { get; set; }
    public string? Feedback { get; set; }
}

public class UpdateSubmissionStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
