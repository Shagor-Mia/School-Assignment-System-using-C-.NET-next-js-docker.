namespace AssignmentSystem.Api.Exceptions;

/// <summary>
/// Represents an authentication failure (maps to HTTP 401), e.g. bad login credentials.
/// </summary>
public class UnauthorizedAppException : Exception
{
    public UnauthorizedAppException(string message) : base(message) { }
}
