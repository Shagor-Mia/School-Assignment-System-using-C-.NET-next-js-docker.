using Microsoft.AspNetCore.Http;

namespace AssignmentSystem.Api.Services;

public interface IFileStorage
{
    /// <summary>Stores the file and returns the value to persist in Submission.FilePath
    /// (an absolute https URL for Cloudinary, a bare file name for local storage).</summary>
    Task<string> SaveAsync(IFormFile file, string originalFileName);

    /// <summary>Best-effort delete of a previously stored file.</summary>
    Task DeleteAsync(string storedPath);
}
