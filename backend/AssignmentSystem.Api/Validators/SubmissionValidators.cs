using AssignmentSystem.Api.Dtos;
using AssignmentSystem.Api.Entities;
using FluentValidation;

namespace AssignmentSystem.Api.Validators;

public class GradeSubmissionRequestValidator : AbstractValidator<GradeSubmissionRequest>
{
    public GradeSubmissionRequestValidator()
    {
        RuleFor(x => x.Marks).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Feedback).MaximumLength(2000);
    }
}

public class UpdateSubmissionStatusRequestValidator : AbstractValidator<UpdateSubmissionStatusRequest>
{
    public UpdateSubmissionStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(s => Enum.TryParse<SubmissionStatus>(s, out _))
            .WithMessage("Status must be one of: Submitted, Late, UnderReview, Graded, ReturnedForRevision.");
    }
}
