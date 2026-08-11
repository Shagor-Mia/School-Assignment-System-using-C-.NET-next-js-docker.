using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using FluentValidation;

namespace AssignmentSystem.Api.Validators;

public class CreateAssignmentRequestValidator : AbstractValidator<CreateAssignmentRequest>
{
    public CreateAssignmentRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.SubjectId).NotEmpty();
        RuleFor(x => x.Deadline).GreaterThan(DateTime.UtcNow).WithMessage("Deadline must be in the future.");
        RuleFor(x => x.MaxMarks).GreaterThan(0);
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(s => Enum.TryParse<AssignmentStatus>(s, out _))
            .WithMessage("Status must be either Draft or Published.");
    }
}

public class UpdateAssignmentRequestValidator : AbstractValidator<UpdateAssignmentRequest>
{
    public UpdateAssignmentRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.Deadline).GreaterThan(DateTime.UtcNow).WithMessage("Deadline must be in the future.");
        RuleFor(x => x.MaxMarks).GreaterThan(0);
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(s => Enum.TryParse<AssignmentStatus>(s, out _))
            .WithMessage("Status must be either Draft or Published.");
    }
}
