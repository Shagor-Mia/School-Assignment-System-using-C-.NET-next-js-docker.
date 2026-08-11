using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;
using AssignmentSystem.Api.Mapping;
using Microsoft.EntityFrameworkCore;

namespace AssignmentSystem.Api.Services;

public class SubjectService : ISubjectService
{
    private readonly AppDbContext _context;

    public SubjectService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<SubjectDto>> GetSubjectsAsync(Guid? classId, int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 500);

        var query = _context.Subjects.Include(s => s.Class).AsQueryable();

        if (classId.HasValue)
        {
            query = query.Where(s => s.ClassId == classId.Value);
        }

        var totalCount = await query.CountAsync();

        var subjects = await query
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<SubjectDto>
        {
            Items = subjects.Select(s => s.ToDto()).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<SubjectDto> GetSubjectByIdAsync(Guid id)
    {
        var subject = await _context.Subjects.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == id);
        if (subject is null)
        {
            throw new NotFoundException($"Subject with id '{id}' was not found.");
        }

        return subject.ToDto();
    }

    public async Task<SubjectDto> CreateSubjectAsync(CreateSubjectRequest request)
    {
        var classExists = await _context.Classes.AnyAsync(c => c.Id == request.ClassId);
        if (!classExists)
        {
            throw new AppValidationException("The specified class does not exist.");
        }

        var code = request.Code.Trim();
        var duplicate = await _context.Subjects.AnyAsync(s => s.ClassId == request.ClassId && s.Code.ToLower() == code.ToLower());
        if (duplicate)
        {
            throw new AppValidationException("A subject with this code already exists in this class.");
        }

        var subject = new Subject
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Code = code,
            ClassId = request.ClassId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Subjects.Add(subject);
        await _context.SaveChangesAsync();

        await _context.Entry(subject).Reference(s => s.Class).LoadAsync();

        return subject.ToDto();
    }

    public async Task<SubjectDto> UpdateSubjectAsync(Guid id, UpdateSubjectRequest request)
    {
        var subject = await _context.Subjects.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == id);
        if (subject is null)
        {
            throw new NotFoundException($"Subject with id '{id}' was not found.");
        }

        var code = request.Code.Trim();
        var duplicate = await _context.Subjects.AnyAsync(s => s.Id != id && s.ClassId == subject.ClassId && s.Code.ToLower() == code.ToLower());
        if (duplicate)
        {
            throw new AppValidationException("A subject with this code already exists in this class.");
        }

        subject.Name = request.Name.Trim();
        subject.Code = code;

        await _context.SaveChangesAsync();

        return subject.ToDto();
    }

    public async Task DeleteSubjectAsync(Guid id)
    {
        var subject = await _context.Subjects
            .Include(s => s.Assignments)
            .Include(s => s.TeacherAssignments)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (subject is null)
        {
            throw new NotFoundException($"Subject with id '{id}' was not found.");
        }

        if (subject.Assignments.Count > 0 || subject.TeacherAssignments.Count > 0)
        {
            throw new AppValidationException("Cannot delete a subject that has assignments or teacher assignments.");
        }

        _context.Subjects.Remove(subject);
        await _context.SaveChangesAsync();
    }
}
