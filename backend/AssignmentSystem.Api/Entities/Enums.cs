namespace AssignmentSystem.Api.Entities;

public enum UserRole
{
    Admin = 0,
    Teacher = 1,
    Student = 2
}

public enum AssignmentStatus
{
    Draft = 0,
    Published = 1
}

public enum SubmissionStatus
{
    Submitted = 0,
    Late = 1,
    UnderReview = 2,
    Graded = 3,
    ReturnedForRevision = 4
}
