using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Extensions;
using AssignmentSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssignmentSystem.Api.Controllers;

[ApiController]
[Route("api/teacher-assignments")]
[Authorize]
public class TeacherAssignmentsController : ControllerBase
{
    private readonly ITeacherAssignmentService _teacherAssignmentService;

    public TeacherAssignmentsController(ITeacherAssignmentService teacherAssignmentService)
    {
        _teacherAssignmentService = teacherAssignmentService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PagedResult<TeacherAssignmentDto>>> GetAssignments(
        [FromQuery] Guid? teacherId, [FromQuery] Guid? subjectId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _teacherAssignmentService.GetAssignmentsAsync(teacherId, subjectId, page, pageSize);
        return Ok(result);
    }

    [HttpGet("my")]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<List<TeacherAssignmentDto>>> GetMyAssignments()
    {
        var teacherId = User.GetUserId();
        var result = await _teacherAssignmentService.GetMyAssignmentsAsync(teacherId);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<TeacherAssignmentDto>> CreateAssignment([FromBody] CreateTeacherAssignmentRequest request)
    {
        var result = await _teacherAssignmentService.CreateAssignmentAsync(request);
        return CreatedAtAction(nameof(GetAssignments), new { teacherId = result.TeacherId }, result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteAssignment(Guid id)
    {
        await _teacherAssignmentService.DeleteAssignmentAsync(id);
        return NoContent();
    }
}
