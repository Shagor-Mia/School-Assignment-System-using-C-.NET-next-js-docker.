using AssignmentSystem.Api.Dtos;
using FluentValidation;

namespace AssignmentSystem.Api.Validators;

public class CreateTeacherAssignmentRequestValidator : AbstractValidator<CreateTeacherAssignmentRequest>
{
    public CreateTeacherAssignmentRequestValidator()
    {
        RuleFor(x => x.TeacherId).NotEmpty();
        RuleFor(x => x.SubjectId).NotEmpty();
    }
}
