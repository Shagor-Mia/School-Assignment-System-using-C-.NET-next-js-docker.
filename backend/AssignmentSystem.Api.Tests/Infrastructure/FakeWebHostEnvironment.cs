using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;

namespace AssignmentSystem.Api.Tests.Infrastructure;

/// <summary>Minimal IWebHostEnvironment so SubmissionService can resolve a ContentRootPath in tests without a real host.</summary>
public sealed class FakeWebHostEnvironment : IWebHostEnvironment
{
    public FakeWebHostEnvironment()
    {
        ContentRootPath = Path.Combine(Path.GetTempPath(), "assignment-system-tests", Guid.NewGuid().ToString());
        Directory.CreateDirectory(ContentRootPath);
    }

    public string EnvironmentName { get; set; } = "Testing";
    public string ApplicationName { get; set; } = "AssignmentSystem.Api.Tests";
    public string WebRootPath { get; set; } = string.Empty;
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    public string ContentRootPath { get; set; }
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
