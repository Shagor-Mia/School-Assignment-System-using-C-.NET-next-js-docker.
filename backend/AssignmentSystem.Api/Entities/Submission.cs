namespace AssignmentSystem.Api.Entities;

public class Submission
{
    public Guid Id { get; set; }
    public string AnswerText { get; set; } = string.Empty;
    public string? FilePath { get; set; }
    public string? FileName { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;
    public decimal? Marks { get; set; }
    public string? Feedback { get; set; }
    public DateTime? GradedAt { get; set; }

    public Guid AssignmentId { get; set; }
    public Assignment Assignment { get; set; } = null!;

    public Guid StudentId { get; set; }
    public User Student { get; set; } = null!;

    public Guid? GradedByTeacherId { get; set; }
    public User? GradedByTeacher { get; set; }
}
