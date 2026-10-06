import { z } from "zod";

// Zod schemas mirroring backend validation rules where known, used by
// react-hook-form via @hookform/resolvers/zod across the app's forms.

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

const roleEnum = z.enum(["Admin", "Teacher", "Student"]);

export const createUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: roleEnum,
  classId: z.string().nullable(),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  role: roleEnum,
  classId: z.string().nullable(),
  isActive: z.boolean(),
});
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

export const classSchema = z.object({
  name: z.string().min(1, "Class name is required."),
});
export type ClassFormValues = z.infer<typeof classSchema>;

export const subjectCreateSchema = z.object({
  name: z.string().min(1, "Subject name is required."),
  code: z.string().min(1, "Subject code is required."),
  classId: z.string().min(1, "Class is required."),
});
export type SubjectCreateFormValues = z.infer<typeof subjectCreateSchema>;

export const subjectUpdateSchema = z.object({
  name: z.string().min(1, "Subject name is required."),
  code: z.string().min(1, "Subject code is required."),
});
export type SubjectUpdateFormValues = z.infer<typeof subjectUpdateSchema>;

export const teacherAssignmentSchema = z.object({
  teacherId: z.string().min(1, "Teacher is required."),
  subjectId: z.string().min(1, "Subject is required."),
});
export type TeacherAssignmentFormValues = z.infer<typeof teacherAssignmentSchema>;

const assignmentStatusEnum = z.enum(["Draft", "Published"]);

export const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  subjectId: z.string().min(1, "Subject is required."),
  deadline: z
    .string()
    .min(1, "Deadline is required.")
    .refine((val) => new Date(val).getTime() > Date.now(), {
      message: "Deadline must be in the future.",
    }),
  // `valueAsNumber: true` on the <input type="number"> registration handles
  // the string->number conversion, so the schema itself can stay a plain
  // number (keeps the resolver's input/output types identical for RHF).
  maxMarks: z.number().positive("Max marks must be a positive number."),
  allowLateSubmission: z.boolean(),
  status: assignmentStatusEnum,
});
export type CreateAssignmentFormValues = z.infer<typeof createAssignmentSchema>;

// On edit, the deadline no longer needs to be strictly in the future (an
// already-published assignment past its deadline should still be editable),
// so this mirrors the update endpoint's presumably-looser rule.
export const updateAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  deadline: z.string().min(1, "Deadline is required."),
  maxMarks: z.number().positive("Max marks must be a positive number."),
  allowLateSubmission: z.boolean(),
  status: assignmentStatusEnum,
});
export type UpdateAssignmentFormValues = z.infer<typeof updateAssignmentSchema>;

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, mirrors backend limit.

export const submissionSchema = z
  .object({
    answerText: z.string(),
    file: z
      .instanceof(File)
      .refine((f) => f.size <= MAX_FILE_SIZE_BYTES, "File must be 5MB or smaller.")
      .nullable()
      .optional(),
  })
  .refine((data) => data.answerText.trim().length > 0 || !!data.file, {
    message: "Provide an answer or attach a file.",
    path: ["answerText"],
  });
export type SubmissionFormValues = z.infer<typeof submissionSchema>;

// Marks must be between 0 and the assignment's maxMarks — built as a
// function since maxMarks is only known once the assignment has loaded,
// mirroring the server-side check.
export function makeGradeSubmissionSchema(maxMarks: number) {
  return z.object({
    marks: z
      .number()
      .min(0, "Marks cannot be negative.")
      .max(maxMarks, `Marks cannot exceed ${maxMarks}.`),
    feedback: z.string().nullable(),
  });
}
export type GradeSubmissionFormValues = z.infer<ReturnType<typeof makeGradeSubmissionSchema>>;

export const MAX_UPLOAD_SIZE_BYTES = MAX_FILE_SIZE_BYTES;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(6, "New password must be at least 6 characters."),
    confirmPassword: z.string().min(1, "Please confirm the new password."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "New password must be different from the current one.",
    path: ["newPassword"],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
