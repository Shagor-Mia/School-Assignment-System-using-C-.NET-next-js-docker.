namespace AssignmentSystem.Api.Dtos;

public class TeacherAssignmentDto
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public string TeacherName { get; set; } = string.Empty;
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
}

public class CreateTeacherAssignmentRequest
{
    public Guid TeacherId { get; set; }
    public Guid SubjectId { get; set; }
}
