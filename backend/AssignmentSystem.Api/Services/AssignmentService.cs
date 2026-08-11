using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;
using AssignmentSystem.Api.Mapping;
using Microsoft.EntityFrameworkCore;

namespace AssignmentSystem.Api.Services;

public class AssignmentService : IAssignmentService
{
    private readonly AppDbContext _context;

    public AssignmentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<AssignmentDto>> GetAssignmentsAsync(Guid userId, UserRole role, int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 500);

        var query = _context.Assignments
            .Include(a => a.Subject).ThenInclude(s => s.Class)
            .Include(a => a.CreatedByTeacher)
            .Include(a => a.Submissions)
            .AsQueryable();

        switch (role)
        {
            case UserRole.Admin:
                break;
            case UserRole.Teacher:
                query = query.Where(a => a.CreatedByTeacherId == userId);
                break;
            case UserRole.Student:
                var student = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                if (student?.ClassId is null)
                {
                    return new PagedResult<AssignmentDto> { Items = new List<AssignmentDto>(), TotalCount = 0, Page = page, PageSize = pageSize };
                }

                query = query.Where(a => a.Status == AssignmentStatus.Published && a.Subject.ClassId == student.ClassId.Value);
                break;
        }

        var totalCount = await query.CountAsync();

        var assignments = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<AssignmentDto>
        {
            Items = assignments.Select(a => a.ToDto()).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AssignmentDto> GetAssignmentByIdAsync(Guid id, Guid userId, UserRole role)
    {
        var assignment = await _context.Assignments
            .Include(a => a.Subject).ThenInclude(s => s.Class)
            .Include(a => a.CreatedByTeacher)
            .Include(a => a.Submissions)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assignment is null || !await IsVisibleAsync(assignment, userId, role))
        {
            throw new NotFoundException($"Assignment with id '{id}' was not found.");
        }

        return assignment.ToDto();
    }

    public async Task<AssignmentDto> CreateAssignmentAsync(CreateAssignmentRequest request, Guid userId, UserRole role)
    {
        var subject = await _context.Subjects.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == request.SubjectId);
        if (subject is null)
        {
            throw new AppValidationException("The specified subject does not exist.");
        }

        if (role == UserRole.Teacher)
        {
            var owns = await _context.TeacherSubjectAssignments
                .AnyAsync(t => t.TeacherId == userId && t.SubjectId == request.SubjectId);
            if (!owns)
            {
                throw new ForbiddenException("You are not assigned to teach this subject.");
            }
        }

        if (!Enum.TryParse<AssignmentStatus>(request.Status, true, out var status))
        {
            throw new AppValidationException("Status must be either Draft or Published.");
        }

        var assignment = new Assignment
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Deadline = request.Deadline,
            MaxMarks = request.MaxMarks,
            Status = status,
            AllowLateSubmission = request.AllowLateSubmission,
            SubjectId = request.SubjectId,
            CreatedByTeacherId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Assignments.Add(assignment);
        await _context.SaveChangesAsync();

        await _context.Entry(assignment).Reference(a => a.Subject).LoadAsync();
        await _context.Entry(assignment.Subject).Reference(s => s.Class).LoadAsync();
        await _context.Entry(assignment).Reference(a => a.CreatedByTeacher).LoadAsync();

        return assignment.ToDto();
    }

    public async Task<AssignmentDto> UpdateAssignmentAsync(Guid id, UpdateAssignmentRequest request, Guid userId, UserRole role)
    {
        var assignment = await LoadOwnedAssignmentAsync(id, userId, role);

        if (!Enum.TryParse<AssignmentStatus>(request.Status, true, out var status))
        {
            throw new AppValidationException("Status must be either Draft or Published.");
        }

        assignment.Title = request.Title.Trim();
        assignment.Description = request.Description.Trim();
        assignment.Deadline = request.Deadline;
        assignment.MaxMarks = request.MaxMarks;
        assignment.AllowLateSubmission = request.AllowLateSubmission;
        assignment.Status = status;
        assignment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return assignment.ToDto();
    }

    public async Task DeleteAssignmentAsync(Guid id, Guid userId, UserRole role)
    {
        var assignment = await LoadOwnedAssignmentAsync(id, userId, role);

        _context.Assignments.Remove(assignment);
        await _context.SaveChangesAsync();
    }

    public async Task<AssignmentDto> PublishAssignmentAsync(Guid id, Guid userId, UserRole role)
    {
        var assignment = await LoadOwnedAssignmentAsync(id, userId, role);

        if (assignment.Status == AssignmentStatus.Published)
        {
            throw new AppValidationException("This assignment is already published.");
        }

        assignment.Status = AssignmentStatus.Published;
        assignment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return assignment.ToDto();
    }

    /// <summary>
    /// Loads an assignment for a mutating operation (update/delete/publish), enforcing that only
    /// the creating teacher or an Admin may act on it. Throws NotFoundException if missing,
    /// ForbiddenException if the caller is a teacher who doesn't own it.
    /// </summary>
    private async Task<Assignment> LoadOwnedAssignmentAsync(Guid id, Guid userId, UserRole role)
    {
        var assignment = await _context.Assignments
            .Include(a => a.Subject).ThenInclude(s => s.Class)
            .Include(a => a.CreatedByTeacher)
            .Include(a => a.Submissions)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assignment is null)
        {
            throw new NotFoundException($"Assignment with id '{id}' was not found.");
        }

        if (role != UserRole.Admin && assignment.CreatedByTeacherId != userId)
        {
            throw new ForbiddenException("You do not have permission to modify this assignment.");
        }

        return assignment;
    }

    private async Task<bool> IsVisibleAsync(Assignment assignment, Guid userId, UserRole role)
    {
        switch (role)
        {
            case UserRole.Admin:
                return true;
            case UserRole.Teacher:
                return assignment.CreatedByTeacherId == userId;
            case UserRole.Student:
                if (assignment.Status != AssignmentStatus.Published)
                {
                    return false;
                }

                var student = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                return student?.ClassId is not null && student.ClassId.Value == assignment.Subject.ClassId;
            default:
                return false;
        }
    }
}
