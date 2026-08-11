using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Extensions;
using AssignmentSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssignmentSystem.Api.Controllers;

[ApiController]
[Route("api/assignments")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly IAssignmentService _assignmentService;

    public AssignmentsController(IAssignmentService assignmentService)
    {
        _assignmentService = assignmentService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AssignmentDto>>> GetAssignments([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _assignmentService.GetAssignmentsAsync(User.GetUserId(), User.GetUserRole(), page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AssignmentDto>> GetAssignment(Guid id)
    {
        var result = await _assignmentService.GetAssignmentByIdAsync(id, User.GetUserId(), User.GetUserRole());
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<AssignmentDto>> CreateAssignment([FromBody] CreateAssignmentRequest request)
    {
        var result = await _assignmentService.CreateAssignmentAsync(request, User.GetUserId(), User.GetUserRole());
        return CreatedAtAction(nameof(GetAssignment), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<AssignmentDto>> UpdateAssignment(Guid id, [FromBody] UpdateAssignmentRequest request)
    {
        var result = await _assignmentService.UpdateAssignmentAsync(id, request, User.GetUserId(), User.GetUserRole());
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> DeleteAssignment(Guid id)
    {
        await _assignmentService.DeleteAssignmentAsync(id, User.GetUserId(), User.GetUserRole());
        return NoContent();
    }

    [HttpPatch("{id:guid}/publish")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<AssignmentDto>> PublishAssignment(Guid id)
    {
        var result = await _assignmentService.PublishAssignmentAsync(id, User.GetUserId(), User.GetUserRole());
        return Ok(result);
    }
}
