using AssignmentSystem.Api.Data;
using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using AssignmentSystem.Api.Exceptions;
using AssignmentSystem.Api.Mapping;
using Microsoft.EntityFrameworkCore;

namespace AssignmentSystem.Api.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _context;

    public UserService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<UserDto>> GetUsersAsync(UserRole? role, string? search, int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 500);

        var query = _context.Users.Include(u => u.Class).AsQueryable();

        if (role.HasValue)
        {
            query = query.Where(u => u.Role == role.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(term) || u.Email.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(u => u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<UserDto>
        {
            Items = items.Select(u => u.ToDto()).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<UserDto> GetUserByIdAsync(Guid id)
    {
        var user = await _context.Users.Include(u => u.Class).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null)
        {
            throw new NotFoundException($"User with id '{id}' was not found.");
        }

        return user.ToDto();
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest request)
    {
        var role = ParseRole(request.Role);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailExists)
        {
            throw new AppValidationException("A user with this email already exists.");
        }

        Guid? classId = request.ClassId;
        if (role == UserRole.Student)
        {
            if (classId is null)
            {
                throw new AppValidationException("ClassId is required for students.");
            }

            var classExists = await _context.Classes.AnyAsync(c => c.Id == classId.Value);
            if (!classExists)
            {
                throw new AppValidationException("The specified class does not exist.");
            }
        }
        else
        {
            classId = null;
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            IsActive = true,
            ClassId = classId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        if (classId.HasValue)
        {
            await _context.Entry(user).Reference(u => u.Class).LoadAsync();
        }

        return user.ToDto();
    }

    public async Task<UserDto> UpdateUserAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _context.Users.Include(u => u.Class).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null)
        {
            throw new NotFoundException($"User with id '{id}' was not found.");
        }

        var role = ParseRole(request.Role);

        if (user.Role == UserRole.Student && role != UserRole.Student)
        {
            throw new AppValidationException("A student's role cannot be changed.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var emailTaken = await _context.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == normalizedEmail);
        if (emailTaken)
        {
            throw new AppValidationException("A user with this email already exists.");
        }

        Guid? classId = request.ClassId;
        if (role == UserRole.Student)
        {
            if (classId is null)
            {
                throw new AppValidationException("ClassId is required for students.");
            }

            var classExists = await _context.Classes.AnyAsync(c => c.Id == classId.Value);
            if (!classExists)
            {
                throw new AppValidationException("The specified class does not exist.");
            }
        }
        else
        {
            classId = null;
        }

        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim();
        user.Role = role;
        user.ClassId = classId;
        user.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        await _context.Entry(user).Reference(u => u.Class).LoadAsync();

        return user.ToDto();
    }

    public async Task DeleteUserAsync(Guid id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null)
        {
            throw new NotFoundException($"User with id '{id}' was not found.");
        }

        user.IsActive = false;
        await _context.SaveChangesAsync();
    }

    private static UserRole ParseRole(string role)
    {
        if (!Enum.TryParse<UserRole>(role, true, out var parsed))
        {
            throw new AppValidationException("Role must be one of: Admin, Teacher, Student.");
        }

        return parsed;
    }
}
