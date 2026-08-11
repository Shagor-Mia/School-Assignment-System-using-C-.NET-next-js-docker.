using AssignmentSystem.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Serilog;

namespace AssignmentSystem.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync())
        {
            return;
        }

        var now = DateTime.UtcNow;

        var gradeTenA = new Class
        {
            Id = Guid.NewGuid(),
            Name = "Grade 10 - A",
            CreatedAt = now
        };
        context.Classes.Add(gradeTenA);

        var mathematics = new Subject
        {
            Id = Guid.NewGuid(),
            Name = "Mathematics",
            Code = "MATH101",
            ClassId = gradeTenA.Id,
            CreatedAt = now
        };
        context.Subjects.Add(mathematics);

        var admin = new User
        {
            Id = Guid.NewGuid(),
            FullName = "System Admin",
            Email = "admin@synoslms.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@12345"),
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = now
        };

        var teacher = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Jane Teacher",
            Email = "teacher@synoslms.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Teacher@12345"),
            Role = UserRole.Teacher,
            IsActive = true,
            CreatedAt = now
        };

        var student = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Sam Student",
            Email = "student@synoslms.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Student@12345"),
            Role = UserRole.Student,
            IsActive = true,
            ClassId = gradeTenA.Id,
            CreatedAt = now
        };

        context.Users.AddRange(admin, teacher, student);

        var teacherAssignment = new TeacherSubjectAssignment
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            SubjectId = mathematics.Id,
            CreatedAt = now
        };
        context.TeacherSubjectAssignments.Add(teacherAssignment);

        var publishedAssignment = new Assignment
        {
            Id = Guid.NewGuid(),
            Title = "Algebra Basics Homework",
            Description = "Complete exercises 1 through 10 on linear equations.",
            Deadline = now.AddDays(7),
            MaxMarks = 100m,
            Status = AssignmentStatus.Published,
            AllowLateSubmission = false,
            SubjectId = mathematics.Id,
            CreatedByTeacherId = teacher.Id,
            CreatedAt = now
        };

        var draftAssignment = new Assignment
        {
            Id = Guid.NewGuid(),
            Title = "Geometry Quiz (Draft)",
            Description = "Draft quiz covering triangles and angles, not yet published.",
            Deadline = now.AddDays(14),
            MaxMarks = 50m,
            Status = AssignmentStatus.Draft,
            AllowLateSubmission = false,
            SubjectId = mathematics.Id,
            CreatedByTeacherId = teacher.Id,
            CreatedAt = now
        };

        context.Assignments.AddRange(publishedAssignment, draftAssignment);

        var submission = new Submission
        {
            Id = Guid.NewGuid(),
            AssignmentId = publishedAssignment.Id,
            StudentId = student.Id,
            AnswerText = "Sample answer text.",
            Status = SubmissionStatus.Submitted,
            SubmittedAt = now
        };
        context.Submissions.Add(submission);

        await context.SaveChangesAsync();

        Log.Information("Database seeded.");
    }

    public static async Task SeedBulkDemoDataAsync(AppDbContext context, string contentRootPath)
    {
        var sqlPath = Path.GetFullPath(Path.Combine(contentRootPath, "..", "Database", "seed-large.sql"));
        if (!File.Exists(sqlPath))
        {
            Log.Warning("Bulk demo seed file not found at {Path}, skipping.", sqlPath);
            return;
        }

        var sql = await File.ReadAllTextAsync(sqlPath);
        await context.Database.ExecuteSqlRawAsync(sql);
        Log.Information("Bulk demo dataset seed script executed (or already present).");
    }
}
