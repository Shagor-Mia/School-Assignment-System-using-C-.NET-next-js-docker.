using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;
using AssignmentSystem.Api.Mapping;
using Microsoft.EntityFrameworkCore;

namespace AssignmentSystem.Api.Services;

public class TeacherAssignmentService : ITeacherAssignmentService
{
    private readonly AppDbContext _context;

    public TeacherAssignmentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<TeacherAssignmentDto>> GetAssignmentsAsync(Guid? teacherId, Guid? subjectId, int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 500);

        var query = _context.TeacherSubjectAssignments
            .Include(t => t.Teacher)
            .Include(t => t.Subject).ThenInclude(s => s.Class)
            .AsQueryable();

        if (teacherId.HasValue)
        {
            query = query.Where(t => t.TeacherId == teacherId.Value);
        }

        if (subjectId.HasValue)
        {
            query = query.Where(t => t.SubjectId == subjectId.Value);
        }

        var totalCount = await query.CountAsync();

        var assignments = await query
            .OrderBy(t => t.Teacher.FullName).ThenBy(t => t.Subject.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<TeacherAssignmentDto>
        {
            Items = assignments.Select(a => a.ToDto()).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<List<TeacherAssignmentDto>> GetMyAssignmentsAsync(Guid teacherId)
    {
        var assignments = await _context.TeacherSubjectAssignments
            .Include(t => t.Teacher)
            .Include(t => t.Subject).ThenInclude(s => s.Class)
            .Where(t => t.TeacherId == teacherId)
            .ToListAsync();

        return assignments.Select(a => a.ToDto()).ToList();
    }

    public async Task<TeacherAssignmentDto> CreateAssignmentAsync(CreateTeacherAssignmentRequest request)
    {
        var teacher = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.TeacherId);
        if (teacher is null)
        {
            throw new AppValidationException("The specified teacher does not exist.");
        }

        if (teacher.Role != UserRole.Teacher)
        {
            throw new AppValidationException("The specified user is not a teacher.");
        }

        var subjectExists = await _context.Subjects.AnyAsync(s => s.Id == request.SubjectId);
        if (!subjectExists)
        {
            throw new AppValidationException("The specified subject does not exist.");
        }

        var duplicate = await _context.TeacherSubjectAssignments
            .AnyAsync(t => t.TeacherId == request.TeacherId && t.SubjectId == request.SubjectId);
        if (duplicate)
        {
            throw new AppValidationException("This teacher is already assigned to this subject.");
        }

        var assignment = new TeacherSubjectAssignment
        {
            Id = Guid.NewGuid(),
            TeacherId = request.TeacherId,
            SubjectId = request.SubjectId,
            CreatedAt = DateTime.UtcNow
        };

        _context.TeacherSubjectAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        await _context.Entry(assignment).Reference(a => a.Teacher).LoadAsync();
        await _context.Entry(assignment).Reference(a => a.Subject).LoadAsync();
        await _context.Entry(assignment.Subject).Reference(s => s.Class).LoadAsync();

        return assignment.ToDto();
    }

    public async Task DeleteAssignmentAsync(Guid id)
    {
        var assignment = await _context.TeacherSubjectAssignments.FirstOrDefaultAsync(t => t.Id == id);
        if (assignment is null)
        {
            throw new NotFoundException($"Teacher assignment with id '{id}' was not found.");
        }

        _context.TeacherSubjectAssignments.Remove(assignment);
        await _context.SaveChangesAsync();
    }
}
