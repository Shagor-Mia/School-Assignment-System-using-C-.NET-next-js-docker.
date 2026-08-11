namespace AssignmentSystem.Api.Exceptions;

/// <summary>
/// Represents a business-rule validation failure (maps to HTTP 400).
/// Named "AppValidationException" to avoid clashing with FluentValidation.ValidationException.
/// </summary>
public class AppValidationException : Exception
{
    public IDictionary<string, string[]>? Errors { get; }

    public AppValidationException(string message) : base(message) { }

    public AppValidationException(string message, IDictionary<string, string[]> errors) : base(message)
    {
        Errors = errors;
    }
}
