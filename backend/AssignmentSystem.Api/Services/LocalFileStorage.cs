using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace AssignmentSystem.Api.Services;

/// <summary>Fallback storage under wwwroot/uploads, used when Cloudinary is not configured.</summary>
public class LocalFileStorage : IFileStorage
{
    private readonly string _uploadsRoot;

    public LocalFileStorage(IWebHostEnvironment environment)
    {
        _uploadsRoot = Path.Combine(environment.ContentRootPath, "wwwroot", "uploads");
    }

    public async Task<string> SaveAsync(IFormFile file, string originalFileName)
    {
        Directory.CreateDirectory(_uploadsRoot);
        var storedFileName = $"{Guid.NewGuid()}-{originalFileName}";

        await using var stream = new FileStream(Path.Combine(_uploadsRoot, storedFileName), FileMode.Create);
        await file.CopyToAsync(stream);
        return storedFileName;
    }

    public Task DeleteAsync(string storedPath)
    {
        var path = Path.Combine(_uploadsRoot, Path.GetFileName(storedPath));
        if (File.Exists(path))
        {
            try { File.Delete(path); } catch (IOException) { /* best-effort cleanup */ }
        }
        return Task.CompletedTask;
    }
}
