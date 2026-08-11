namespace AssignmentSystem.Api.Dtos;

public class AssignmentDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Deadline { get; set; }
    public decimal MaxMarks { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool AllowLateSubmission { get; set; }
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public Guid ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public Guid CreatedByTeacherId { get; set; }
    public string CreatedByTeacherName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int SubmissionCount { get; set; }
}

public class CreateAssignmentRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid SubjectId { get; set; }
    public DateTime Deadline { get; set; }
    public decimal MaxMarks { get; set; }
    public bool AllowLateSubmission { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class UpdateAssignmentRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Deadline { get; set; }
    public decimal MaxMarks { get; set; }
    public bool AllowLateSubmission { get; set; }
    public string Status { get; set; } = string.Empty;
}
