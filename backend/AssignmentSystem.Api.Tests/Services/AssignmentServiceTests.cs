using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;
using AssignmentSystem.Api.Services;
using AssignmentSystem.Api.Tests.Infrastructure;
using FluentAssertions;
using Xunit;

namespace AssignmentSystem.Api.Tests.Services;

public class AssignmentServiceTests
{
    private static CreateAssignmentRequest ValidCreateRequest(Guid subjectId) => new()
    {
        Title = "Essay on Algebra",
        Description = "Write a short essay.",
        SubjectId = subjectId,
        Deadline = DateTime.UtcNow.AddDays(3),
        MaxMarks = 100,
        AllowLateSubmission = false,
        Status = "Published"
    };

    [Fact]
    public async Task CreateAssignment_TeacherNotAssignedToSubject_ThrowsForbidden()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, _, _, _) = TestData.SeedStandardScenario(context);

        var outsiderTeacher = TestData.CreateUser("Outsider Teacher", "outsider@test.local", UserRole.Teacher);
        context.Users.Add(outsiderTeacher);
        await context.SaveChangesAsync();

        var service = new AssignmentService(context);
        var request = ValidCreateRequest(subject.Id);

        var act = () => service.CreateAssignmentAsync(request, outsiderTeacher.Id, UserRole.Teacher);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task CreateAssignment_TeacherAssignedToSubject_Succeeds()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, _, _) = TestData.SeedStandardScenario(context);

        var service = new AssignmentService(context);
        var request = ValidCreateRequest(subject.Id);

        var result = await service.CreateAssignmentAsync(request, teacher.Id, UserRole.Teacher);

        result.Title.Should().Be(request.Title);
        result.Status.Should().Be("Published");
    }

    [Fact]
    public async Task CreateAssignment_Admin_BypassesTeacherOwnershipCheck()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, _, _, admin) = TestData.SeedStandardScenario(context);

        var service = new AssignmentService(context);
        var request = ValidCreateRequest(subject.Id);

        var result = await service.CreateAssignmentAsync(request, admin.Id, UserRole.Admin);

        result.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAssignments_Student_DoesNotSeeDraftAssignments()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);

        context.Assignments.Add(TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Draft));
        context.Assignments.Add(TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published));
        await context.SaveChangesAsync();

        var service = new AssignmentService(context);
        var result = await service.GetAssignmentsAsync(student.Id, UserRole.Student, 1, 20);

        result.Items.Should().HaveCount(1);
        result.Items[0].Status.Should().Be("Published");
    }

    [Fact]
    public async Task GetAssignments_Student_DoesNotSeeAssignmentsFromOtherClasses()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);

        // A second class/subject with its own published assignment.
        var otherClass = TestData.CreateClass("Grade 11 - B");
        var otherSubject = TestData.CreateSubject(otherClass.Id, "Physics", "PHY101");
        context.Classes.Add(otherClass);
        context.Subjects.Add(otherSubject);
        context.TeacherSubjectAssignments.Add(TestData.CreateTeacherAssignment(teacher.Id, otherSubject.Id));
        context.Assignments.Add(TestData.CreateAssignment(otherSubject.Id, teacher.Id, AssignmentStatus.Published));
        context.Assignments.Add(TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published));
        await context.SaveChangesAsync();

        var service = new AssignmentService(context);
        var result = await service.GetAssignmentsAsync(student.Id, UserRole.Student, 1, 20);

        result.Items.Should().ContainSingle(a => a.SubjectId == subject.Id);
    }

    [Fact]
    public async Task GetAssignmentById_DraftAssignment_NotVisibleToStudent_ThrowsNotFound()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, student, _) = TestData.SeedStandardScenario(context);

        var draft = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Draft);
        context.Assignments.Add(draft);
        await context.SaveChangesAsync();

        var service = new AssignmentService(context);
        var act = () => service.GetAssignmentByIdAsync(draft.Id, student.Id, UserRole.Student);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateAssignment_NonOwningTeacher_ThrowsForbidden()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, _, _) = TestData.SeedStandardScenario(context);

        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id);
        context.Assignments.Add(assignment);

        var otherTeacher = TestData.CreateUser("Other Teacher", "other@test.local", UserRole.Teacher);
        context.Users.Add(otherTeacher);
        await context.SaveChangesAsync();

        var service = new AssignmentService(context);
        var request = new UpdateAssignmentRequest
        {
            Title = "Hacked title",
            Description = assignment.Description,
            Deadline = assignment.Deadline,
            MaxMarks = assignment.MaxMarks,
            AllowLateSubmission = assignment.AllowLateSubmission,
            Status = "Published"
        };

        var act = () => service.UpdateAssignmentAsync(assignment.Id, request, otherTeacher.Id, UserRole.Teacher);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task PublishAssignment_AlreadyPublished_ThrowsValidationException()
    {
        using var factory = new SqliteContextFactory();
        using var context = factory.CreateContext();
        var (_, subject, teacher, _, _) = TestData.SeedStandardScenario(context);

        var assignment = TestData.CreateAssignment(subject.Id, teacher.Id, AssignmentStatus.Published);
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var service = new AssignmentService(context);
        var act = () => service.PublishAssignmentAsync(assignment.Id, teacher.Id, UserRole.Teacher);

        await act.Should().ThrowAsync<AppValidationException>();
    }
}
