using System.Net;
using System.Text.Json;
using AssignmentSystem.Api.Exceptions;

namespace AssignmentSystem.Api.Middleware;

/// <summary>
/// Catches unhandled exceptions and converts them into a consistent JSON envelope:
/// { "message": string, "errors": object|null, "traceId": string }
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = context.TraceIdentifier;
        object? errors = null;
        HttpStatusCode statusCode;
        string message;

        switch (exception)
        {
            case NotFoundException notFoundEx:
                statusCode = HttpStatusCode.NotFound;
                message = notFoundEx.Message;
                break;
            case ForbiddenException forbiddenEx:
                statusCode = HttpStatusCode.Forbidden;
                message = forbiddenEx.Message;
                break;
            case UnauthorizedAppException unauthorizedEx:
                statusCode = HttpStatusCode.Unauthorized;
                message = unauthorizedEx.Message;
                break;
            case AppValidationException appValidationEx:
                statusCode = HttpStatusCode.BadRequest;
                message = appValidationEx.Message;
                errors = appValidationEx.Errors;
                break;
            case FluentValidation.ValidationException fluentValidationEx:
                statusCode = HttpStatusCode.BadRequest;
                message = "Validation failed.";
                errors = fluentValidationEx.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                break;
            default:
                statusCode = HttpStatusCode.InternalServerError;
                message = "An unexpected error occurred. Please try again later.";
                _logger.LogError(exception, "Unhandled exception occurred. TraceId: {TraceId}", traceId);
                break;
        }

        if (statusCode != HttpStatusCode.InternalServerError)
        {
            _logger.LogWarning(exception, "Handled exception ({StatusCode}): {Message}. TraceId: {TraceId}", (int)statusCode, message, traceId);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var payload = new
        {
            message,
            errors,
            traceId
        };

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
