namespace AssignmentSystem.Api.Entities;

public class TeacherSubjectAssignment
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }

    public Guid TeacherId { get; set; }
    public User Teacher { get; set; } = null!;

    public Guid SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;
}
