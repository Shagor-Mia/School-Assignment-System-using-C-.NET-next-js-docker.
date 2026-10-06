using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;

namespace AssignmentSystem.Api.Services;

public class CloudinaryFileStorage : IFileStorage
{
    private const string Folder = "assignment-system/submissions";

    private readonly Cloudinary _cloudinary;
    private readonly ILogger<CloudinaryFileStorage> _logger;

    public CloudinaryFileStorage(Cloudinary cloudinary, ILogger<CloudinaryFileStorage> logger)
    {
        _cloudinary = cloudinary;
        _logger = logger;
    }

    public async Task<string> SaveAsync(IFormFile file, string originalFileName)
    {
        await using var stream = file.OpenReadStream();
        var result = await _cloudinary.UploadAsync(new RawUploadParams
        {
            File = new FileDescription(originalFileName, stream),
            Folder = Folder,
            // Raw keeps the original bytes and extension for any file type (pdf, docx, zip...).
            UseFilename = true,
            UniqueFilename = true,
        });

        if (result.Error is not null)
        {
            throw new InvalidOperationException($"Cloudinary upload failed: {result.Error.Message}");
        }

        return result.SecureUrl.ToString();
    }

    public async Task DeleteAsync(string storedPath)
    {
        // https://res.cloudinary.com/<cloud>/<resourceType>/upload/v123/<publicId>
        if (!Uri.TryCreate(storedPath, UriKind.Absolute, out var uri)) return;
        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var uploadIdx = Array.IndexOf(segments, "upload");
        if (uploadIdx < 1) return;

        var resourceType = segments[uploadIdx - 1] switch
        {
            "image" => ResourceType.Image,
            "video" => ResourceType.Video,
            _ => ResourceType.Raw,
        };
        var rest = segments.Skip(uploadIdx + 1).ToList();
        if (rest.Count > 0 && rest[0].Length > 1 && rest[0][0] == 'v' && rest[0][1..].All(char.IsDigit)) rest.RemoveAt(0);
        var publicId = Uri.UnescapeDataString(string.Join('/', rest));

        try
        {
            await _cloudinary.DestroyAsync(new DeletionParams(publicId) { ResourceType = resourceType });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete Cloudinary asset {PublicId}", publicId);
        }
    }
}
