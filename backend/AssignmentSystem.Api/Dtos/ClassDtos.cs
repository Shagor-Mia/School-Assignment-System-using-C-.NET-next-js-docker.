namespace AssignmentSystem.Api.Dtos;

public class ClassDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int StudentCount { get; set; }
    public int SubjectCount { get; set; }
}

public class CreateClassRequest
{
    public string Name { get; set; } = string.Empty;
}

public class UpdateClassRequest
{
    public string Name { get; set; } = string.Empty;
}
