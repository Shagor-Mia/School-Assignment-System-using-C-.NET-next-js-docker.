using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;
using AssignmentSystem.Api.Mapping;
using Microsoft.EntityFrameworkCore;

namespace AssignmentSystem.Api.Services;

public class ClassService : IClassService
{
    private readonly AppDbContext _context;

    public ClassService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<ClassDto>> GetClassesAsync(int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 500);

        var query = _context.Classes.Include(c => c.Students).Include(c => c.Subjects).AsQueryable();

        var totalCount = await query.CountAsync();

        var classes = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<ClassDto>
        {
            Items = classes.Select(c => c.ToDto()).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ClassDto> GetClassByIdAsync(Guid id)
    {
        var @class = await _context.Classes
            .Include(c => c.Students)
            .Include(c => c.Subjects)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (@class is null)
        {
            throw new NotFoundException($"Class with id '{id}' was not found.");
        }

        return @class.ToDto();
    }

    public async Task<ClassDto> CreateClassAsync(CreateClassRequest request)
    {
        var name = request.Name.Trim();
        var exists = await _context.Classes.AnyAsync(c => c.Name.ToLower() == name.ToLower());
        if (exists)
        {
            throw new AppValidationException("A class with this name already exists.");
        }

        var @class = new Class
        {
            Id = Guid.NewGuid(),
            Name = name,
            CreatedAt = DateTime.UtcNow
        };

        _context.Classes.Add(@class);
        await _context.SaveChangesAsync();

        return @class.ToDto();
    }

    public async Task<ClassDto> UpdateClassAsync(Guid id, UpdateClassRequest request)
    {
        var @class = await _context.Classes
            .Include(c => c.Students)
            .Include(c => c.Subjects)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (@class is null)
        {
            throw new NotFoundException($"Class with id '{id}' was not found.");
        }

        var name = request.Name.Trim();
        var exists = await _context.Classes.AnyAsync(c => c.Id != id && c.Name.ToLower() == name.ToLower());
        if (exists)
        {
            throw new AppValidationException("A class with this name already exists.");
        }

        @class.Name = name;
        await _context.SaveChangesAsync();

        return @class.ToDto();
    }

    public async Task DeleteClassAsync(Guid id)
    {
        var @class = await _context.Classes
            .Include(c => c.Students)
            .Include(c => c.Subjects)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (@class is null)
        {
            throw new NotFoundException($"Class with id '{id}' was not found.");
        }

        if (@class.Students.Count > 0 || @class.Subjects.Count > 0)
        {
            throw new AppValidationException("Cannot delete a class that has enrolled students or subjects.");
        }

        _context.Classes.Remove(@class);
        await _context.SaveChangesAsync();
    }
}
