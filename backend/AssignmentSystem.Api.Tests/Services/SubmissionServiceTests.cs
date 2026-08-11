using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.Tests.Infrastructure;
using FluentAssertions;
using Xunit;

namespace AssignmentSystem.Api.Tests.Services;

public class SubmissionServiceTests
{
    private static SubmissionService CreateService(Data.AppDbContext context) =>
        new(context, new FakeWebHostEnvironment());

    // ---- Rule 7: one submission per (student, assignment) — repeat submit upserts, doesn't duplicate ----

    [Fact]
    public async Task Submit_CalledTwice_UpdatesExistingSubmission_DoesNotCreateDuplicate()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published, DateTime.UtcNow.AddDays(3));
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        await service.SubmitAsync(assignment.Id, student.Id, "First answer", null);
        var second = await service.SubmitAsync(assignment.Id, student.Id, "Updated answer", null);

        context.Submissions.Count(s => s.AssignmentId == assignment.Id && s.StudentId == student.Id).Should().Be(1);
        second.AnswerText.Should().Be("Updated answer");
    }

    [Fact]
    public async Task Submit_StudentOutsideAssignmentClass_ThrowsForbidden()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, _, _) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published, DateTime.UtcNow.AddDays(3));
        context.Assignments.Add(assignment);

        var outsiderStudent = TestData.CreateUser("Outsider Student", "outsider-student@test.local", UserRole.Student, classId: null);
        context.Users.Add(outsiderStudent);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var act = () => service.SubmitAsync(assignment.Id, outsiderStudent.Id, "Answer", null);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    // ---- Rule 4: deadline / late / reopen behavior ----

    [Fact]
    public async Task Submit_BeforeDeadline_StatusIsSubmitted()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published, DateTime.UtcNow.AddDays(3));
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.SubmitAsync(assignment.Id, student.Id, "On time answer", null);

        result.Status.Should().Be("Submitted");
    }

    [Fact]
    public async Task Submit_AfterDeadline_LateNotAllowed_Throws()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(
            subject.Id, teacher.Id, AssignmentStatus.Published,
            deadline: DateTime.UtcNow.AddMinutes(-10), allowLateSubmission: false);
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var act = () => service.SubmitAsync(assignment.Id, student.Id, "Too late", null);

        await act.Should().ThrowAsync<AppValidationException>();
    }

    [Fact]
    public async Task Submit_AfterDeadline_LateAllowed_StatusIsLate()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(
            subject.Id, teacher.Id, AssignmentStatus.Published,
            deadline: DateTime.UtcNow.AddMinutes(-10), allowLateSubmission: true);
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.SubmitAsync(assignment.Id, student.Id, "Late but allowed", null);

        result.Status.Should().Be("Late");
    }

    [Fact]
    public async Task UpdateSubmission_ReturnedForRevision_ReopensEditingPastDeadline()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);
        // Deadline still open at first submit, then we move it into the past to simulate "now overdue".
        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published, DateTime.UtcNow.AddMinutes(5));
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var submission = await service.SubmitAsync(assignment.Id, student.Id, "Initial", null);

        // Teacher returns it for revision.
        await service.SetStatusAsync(
            submission.Id,
            new UpdateSubmissionStatusRequest { Status = "ReturnedForRevision" },
            teacher.Id, UserRole.Teacher);

        // Deadline passes.
        assignment.Deadline = DateTime.UtcNow.AddMinutes(-1);
        await context.SaveChangesAsync();

        var updated = await service.UpdateSubmissionAsync(submission.Id, student.Id, "Revised answer", null);

        updated.Status.Should().Be("Submitted");
        updated.AnswerText.Should().Be("Revised answer");
    }

    [Fact]
    public async Task UpdateSubmission_NonOwningStudent_ThrowsForbidden()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published, DateTime.UtcNow.AddDays(3));
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var submission = await service.SubmitAsync(assignment.Id, student.Id, "Mine", null);

        var otherStudent = TestData.CreateUser("Other Student", "other-student@test.local", UserRole.Student, classId: null);
        context.Users.Add(otherStudent);
        await context.SaveChangesAsync();

        var act = () => service.UpdateSubmissionAsync(submission.Id, otherStudent.Id, "Hijacked", null);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    // ---- Rule 5: marks cannot exceed MaxMarks ----

    [Theory]
    [InlineData(150)]
    [InlineData(-1)]
    public async Task GradeSubmission_MarksOutOfRange_ThrowsValidationException(decimal marks)
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published, DateTime.UtcNow.AddDays(3), maxMarks: 100);
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var submission = await service.SubmitAsync(assignment.Id, student.Id, "Answer", null);

        var act = () => service.GradeSubmissionAsync(
            submission.Id,
            new GradeSubmissionRequest { Marks = marks, Feedback = "Feedback" },
            teacher.Id, UserRole.Teacher);

        await act.Should().ThrowAsync<AppValidationException>();
    }

    [Fact]
    public async Task GradeSubmission_ValidMarks_SetsStatusToGraded()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published, DateTime.UtcNow.AddDays(3), maxMarks: 100);
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var submission = await service.SubmitAsync(assignment.Id, student.Id, "Answer", null);

        var graded = await service.GradeSubmissionAsync(
            submission.Id,
            new GradeSubmissionRequest { Marks = 85, Feedback = "Good work" },
            teacher.Id, UserRole.Teacher);

        graded.Status.Should().Be("Graded");
        graded.Marks.Should().Be(85);
    }

    // ---- Rule 6: only the owning teacher (or Admin) can grade ----

    [Fact]
    public async Task GradeSubmission_NonOwningTeacher_ThrowsForbidden()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published, DateTime.UtcNow.AddDays(3), maxMarks: 100);
        context.Assignments.Add(assignment);

        var otherTeacher = TestData.CreateUser("Other Teacher", "other-teacher@test.local", UserRole.Teacher);
        context.Users.Add(otherTeacher);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var submission = await service.SubmitAsync(assignment.Id, student.Id, "Answer", null);

        var act = () => service.GradeSubmissionAsync(
            submission.Id,
            new GradeSubmissionRequest { Marks = 50, Feedback = null },
            otherTeacher.Id, UserRole.Teacher);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task GradeSubmission_Admin_CanGradeAnySubmission()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, admin) = TestData.SeedStandardScenario(context);
        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published, DateTime.UtcNow.AddDays(3), maxMarks: 100);
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var submission = await service.SubmitAsync(assignment.Id, student.Id, "Answer", null);

        var graded = await service.GradeSubmissionAsync(
            submission.Id,
            new GradeSubmissionRequest { Marks = 70, Feedback = null },
            admin.Id, UserRole.Admin);

        graded.Status.Should().Be("Graded");
    }
}
