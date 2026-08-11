using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Entities;

namespace AssignmentSystem.Api.Tests.Infrastructure;

/// <summary>
/// Shared helpers for seeding a minimal, consistent set of entities into a test DbContext.
/// </summary>
public static class TestData
{
    public static User CreateUser(string fullName, string email, UserRole role, Guid? classId = null, bool isActive = true)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password@123"),
            Role = role,
            ClassId = classId,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static Class CreateClass(string name = "Grade 10 - A")
    {
        return new Class { Id = Guid.NewGuid(), Name = name, CreatedAt = DateTime.UtcNow };
    }

    public static Subject CreateSubject(Guid classId, string name = "Mathematics", string code = "MATH101")
    {
        return new Subject { Id = Guid.NewGuid(), Name = name, Code = code, ClassId = classId, CreatedAt = DateTime.UtcNow };
    }

    public static TeacherSubjectAssignment CreateTeacherAssignment(Guid teacherId, Guid subjectId)
    {
        return new TeacherSubjectAssignment { Id = Guid.NewGuid(), TeacherId = teacherId, SubjectId = subjectId, CreatedAt = DateTime.UtcNow };
    }

    public static Assignment CreateAssignment(
        Guid subjectId,
        Guid createdByTeacherId,
        AssignmentStatus status = AssignmentStatus.Published,
        DateTime? deadline = null,
        decimal maxMarks = 100,
        bool allowLateSubmission = false)
    {
        return new Assignment
        {
            Id = Guid.NewGuid(),
            Title = "Sample Assignment",
            Description = "Sample description",
            SubjectId = subjectId,
            CreatedByTeacherId = createdByTeacherId,
            Status = status,
            Deadline = deadline ?? DateTime.UtcNow.AddDays(7),
            MaxMarks = maxMarks,
            AllowLateSubmission = allowLateSubmission,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>Seeds a full Class → Subject → Teacher(+assignment) → Student chain and returns the pieces.</summary>
    public static (Class Class, Subject Subject, User Teacher, User Student, User Admin) SeedStandardScenario(AppDbContext context)
    {
        var @class = CreateClass();
        var subject = CreateSubject(@class.Id);
        var teacher = CreateUser("Jane Teacher", "teacher@test.local", UserRole.Teacher);
        var student = CreateUser("Sam Student", "student@test.local", UserRole.Student, @class.Id);
        var admin = CreateUser("System Admin", "admin@test.local", UserRole.Admin);
        var teacherAssignment = CreateTeacherAssignment(teacher.Id, subject.Id);

        context.Classes.Add(@class);
        context.Subjects.Add(subject);
        context.Users.AddRange(teacher, student, admin);
        context.TeacherSubjectAssignments.Add(teacherAssignment);
        context.SaveChanges();

        return (@class, subject, teacher, student, admin);
    }
}
