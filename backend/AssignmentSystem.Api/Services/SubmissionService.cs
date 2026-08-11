using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;
using AssignmentSystem.Api.Mapping;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace AssignmentSystem.Api.Services;

public class SubmissionService : ISubmissionService
{
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5MB

    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public SubmissionService(AppDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    public async Task<List<SubmissionDto>> GetSubmissionsForAssignmentAsync(Guid assignmentId, Guid userId, UserRole role)
    {
        var assignment = await _context.Assignments.FirstOrDefaultAsync(a => a.Id == assignmentId);
        if (assignment is null)
        {
            throw new NotFoundException($"Assignment with id '{assignmentId}' was not found.");
        }

        if (role != UserRole.Admin && assignment.CreatedByTeacherId != userId)
        {
            throw new ForbiddenException("You do not have permission to view submissions for this assignment.");
        }

        var submissions = await _context.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Include(s => s.GradedByTeacher)
            .Where(s => s.AssignmentId == assignmentId)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();

        return submissions.Select(s => s.ToDto()).ToList();
    }

    public async Task<SubmissionDto> GetMySubmissionAsync(Guid assignmentId, Guid studentId)
    {
        var submission = await _context.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Include(s => s.GradedByTeacher)
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);

        if (submission is null)
        {
            throw new NotFoundException("You have not submitted this assignment yet.");
        }

        return submission.ToDto();
    }

    public async Task<SubmissionDto> SubmitAsync(Guid assignmentId, Guid studentId, string answerText, IFormFile? file)
    {
        var assignment = await _context.Assignments
            .Include(a => a.Subject)
            .FirstOrDefaultAsync(a => a.Id == assignmentId);

        if (assignment is null)
        {
            throw new NotFoundException($"Assignment with id '{assignmentId}' was not found.");
        }

        var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == studentId);
        if (student is null || student.ClassId != assignment.Subject.ClassId)
        {
            throw new ForbiddenException("You do not belong to the class this assignment was assigned to.");
        }

        if (assignment.Status != AssignmentStatus.Published)
        {
            throw new AppValidationException("This assignment is not open for submissions.");
        }

        var existing = await _context.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Include(s => s.GradedByTeacher)
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);

        var status = DetermineSubmissionStatus(assignment, existing);

        if (existing is null)
        {
            existing = new Submission
            {
                Id = Guid.NewGuid(),
                AssignmentId = assignmentId,
                StudentId = studentId,
                SubmittedAt = DateTime.UtcNow
            };
            _context.Submissions.Add(existing);
        }
        else
        {
            existing.UpdatedAt = DateTime.UtcNow;
        }

        existing.AnswerText = answerText;
        existing.Status = status;

        if (file is not null)
        {
            await ReplaceFileAsync(existing, file);
        }

        await _context.SaveChangesAsync();

        await _context.Entry(existing).Reference(s => s.Assignment).LoadAsync();
        await _context.Entry(existing).Reference(s => s.Student).LoadAsync();

        return existing.ToDto();
    }

    public async Task<SubmissionDto> UpdateSubmissionAsync(Guid id, Guid studentId, string answerText, IFormFile? file)
    {
        var submission = await _context.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Include(s => s.GradedByTeacher)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (submission is null)
        {
            throw new NotFoundException($"Submission with id '{id}' was not found.");
        }

        if (submission.StudentId != studentId)
        {
            throw new ForbiddenException("You do not have permission to modify this submission.");
        }

        var status = DetermineSubmissionStatus(submission.Assignment, submission);

        submission.AnswerText = answerText;
        submission.Status = status;
        submission.UpdatedAt = DateTime.UtcNow;

        if (file is not null)
        {
            await ReplaceFileAsync(submission, file);
        }

        await _context.SaveChangesAsync();

        return submission.ToDto();
    }

    public async Task<SubmissionDto> GetSubmissionByIdAsync(Guid id, Guid userId, UserRole role)
    {
        var submission = await _context.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Include(s => s.GradedByTeacher)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (submission is null)
        {
            throw new NotFoundException($"Submission with id '{id}' was not found.");
        }

        var allowed = role switch
        {
            UserRole.Admin => true,
            UserRole.Teacher => submission.Assignment.CreatedByTeacherId == userId,
            UserRole.Student => submission.StudentId == userId,
            _ => false
        };

        if (!allowed)
        {
            throw new ForbiddenException("You do not have permission to view this submission.");
        }

        return submission.ToDto();
    }

    public async Task<SubmissionDto> GradeSubmissionAsync(Guid id, GradeSubmissionRequest request, Guid userId, UserRole role)
    {
        var submission = await _context.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Include(s => s.GradedByTeacher)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (submission is null)
        {
            throw new NotFoundException($"Submission with id '{id}' was not found.");
        }

        if (role != UserRole.Admin && submission.Assignment.CreatedByTeacherId != userId)
        {
            throw new ForbiddenException("You do not have permission to grade this submission.");
        }

        if (request.Marks < 0 || request.Marks > submission.Assignment.MaxMarks)
        {
            throw new AppValidationException($"Marks must be between 0 and {submission.Assignment.MaxMarks}.");
        }

        submission.Marks = request.Marks;
        submission.Feedback = request.Feedback;
        submission.Status = SubmissionStatus.Graded;
        submission.GradedAt = DateTime.UtcNow;
        submission.GradedByTeacherId = userId;

        await _context.SaveChangesAsync();

        await _context.Entry(submission).Reference(s => s.GradedByTeacher).LoadAsync();

        return submission.ToDto();
    }

    public async Task<SubmissionDto> SetStatusAsync(Guid id, UpdateSubmissionStatusRequest request, Guid userId, UserRole role)
    {
        var submission = await _context.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Include(s => s.GradedByTeacher)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (submission is null)
        {
            throw new NotFoundException($"Submission with id '{id}' was not found.");
        }

        if (role != UserRole.Admin && submission.Assignment.CreatedByTeacherId != userId)
        {
            throw new ForbiddenException("You do not have permission to modify this submission.");
        }

        if (!Enum.TryParse<SubmissionStatus>(request.Status, true, out var status))
        {
            throw new AppValidationException("Status must be one of: Submitted, Late, UnderReview, Graded, ReturnedForRevision.");
        }

        submission.Status = status;
        submission.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return submission.ToDto();
    }

    /// <summary>
    /// Applies the deadline/late/reopen business rule shared by initial submission and update.
    /// </summary>
    private static SubmissionStatus DetermineSubmissionStatus(Assignment assignment, Submission? existing)
    {
        var now = DateTime.UtcNow;
        var deadlinePassed = now > assignment.Deadline;

        if (!deadlinePassed)
        {
            return SubmissionStatus.Submitted;
        }

        if (assignment.AllowLateSubmission)
        {
            return SubmissionStatus.Late;
        }

        if (existing is not null && existing.Status == SubmissionStatus.ReturnedForRevision)
        {
            return SubmissionStatus.Submitted;
        }

        throw new AppValidationException("The deadline for this assignment has passed and late submissions are not allowed.");
    }

    private async Task ReplaceFileAsync(Submission submission, IFormFile file)
    {
        if (file.Length > MaxFileSizeBytes)
        {
            throw new AppValidationException("The uploaded file must not exceed 5MB.");
        }

        var uploadsRoot = Path.Combine(_environment.ContentRootPath, "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsRoot);

        var originalFileName = Path.GetFileName(file.FileName);
        var storedFileName = $"{Guid.NewGuid()}-{originalFileName}";
        var fullPath = Path.Combine(uploadsRoot, storedFileName);

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Clean up the previous file, if any, now that the new one has been saved successfully.
        if (!string.IsNullOrEmpty(submission.FilePath))
        {
            var oldPath = Path.Combine(uploadsRoot, submission.FilePath);
            if (File.Exists(oldPath))
            {
                try { File.Delete(oldPath); } catch (IOException) { /* best-effort cleanup */ }
            }
        }

        submission.FilePath = storedFileName;
        submission.FileName = originalFileName;
    }
}
