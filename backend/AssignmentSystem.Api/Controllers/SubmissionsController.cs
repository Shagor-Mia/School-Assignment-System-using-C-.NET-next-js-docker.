using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Extensions;
using AssignmentSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssignmentSystem.Api.Controllers;

[ApiController]
[Authorize]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionService _submissionService;

    public SubmissionsController(ISubmissionService submissionService)
    {
        _submissionService = submissionService;
    }

    [HttpGet("api/assignments/{assignmentId:guid}/submissions")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<List<SubmissionDto>>> GetSubmissionsForAssignment(Guid assignmentId)
    {
        var result = await _submissionService.GetSubmissionsForAssignmentAsync(assignmentId, User.GetUserId(), User.GetUserRole());
        return Ok(result);
    }

    [HttpGet("api/assignments/{assignmentId:guid}/submissions/me")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<SubmissionDto>> GetMySubmission(Guid assignmentId)
    {
        var result = await _submissionService.GetMySubmissionAsync(assignmentId, User.GetUserId());
        return Ok(result);
    }

    [HttpPost("api/assignments/{assignmentId:guid}/submissions")]
    [Authorize(Roles = "Student")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<SubmissionDto>> Submit(Guid assignmentId, [FromForm] string answerText = "", IFormFile? file = null)
    {
        var result = await _submissionService.SubmitAsync(assignmentId, User.GetUserId(), answerText, file);
        return Ok(result);
    }

    [HttpPut("api/submissions/{id:guid}")]
    [Authorize(Roles = "Student")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<SubmissionDto>> UpdateSubmission(Guid id, [FromForm] string answerText = "", IFormFile? file = null)
    {
        var result = await _submissionService.UpdateSubmissionAsync(id, User.GetUserId(), answerText, file);
        return Ok(result);
    }

    [HttpGet("api/submissions/{id:guid}")]
    public async Task<ActionResult<SubmissionDto>> GetSubmission(Guid id)
    {
        var result = await _submissionService.GetSubmissionByIdAsync(id, User.GetUserId(), User.GetUserRole());
        return Ok(result);
    }

    [HttpPatch("api/submissions/{id:guid}/grade")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<SubmissionDto>> Grade(Guid id, [FromBody] GradeSubmissionRequest request)
    {
        var result = await _submissionService.GradeSubmissionAsync(id, request, User.GetUserId(), User.GetUserRole());
        return Ok(result);
    }

    [HttpPatch("api/submissions/{id:guid}/status")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<SubmissionDto>> SetStatus(Guid id, [FromBody] UpdateSubmissionStatusRequest request)
    {
        var result = await _submissionService.SetStatusAsync(id, request, User.GetUserId(), User.GetUserRole());
        return Ok(result);
    }
}
