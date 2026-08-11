// TypeScript interfaces mirroring the ASP.NET Core backend DTOs exactly (camelCase JSON).
// This file is the single source of truth for API shapes on the frontend.

export type Role = "Admin" | "Teacher" | "Student";

export type AssignmentStatusType = "Draft" | "Published";

export type SubmissionStatusType =
  | "Submitted"
  | "Late"
  | "UnderReview"
  | "Graded"
  | "ReturnedForRevision";

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  classId: string | null;
  className: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  classId: string | null;
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  role: Role;
  classId: string | null;
  isActive: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ClassDto {
  id: string;
  name: string;
  studentCount: number;
  subjectCount: number;
}

export interface CreateClassRequest {
  name: string;
}

export interface UpdateClassRequest {
  name: string;
}

export interface SubjectDto {
  id: string;
  name: string;
  code: string;
  classId: string;
  className: string;
}

export interface CreateSubjectRequest {
  name: string;
  code: string;
  classId: string;
}

export interface UpdateSubjectRequest {
  name: string;
  code: string;
}

export interface TeacherAssignmentDto {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  className: string;
}

export interface CreateTeacherAssignmentRequest {
  teacherId: string;
  subjectId: string;
}

export interface AssignmentDto {
  id: string;
  title: string;
  description: string;
  deadline: string;
  maxMarks: number;
  status: AssignmentStatusType;
  allowLateSubmission: boolean;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  createdByTeacherId: string;
  createdByTeacherName: string;
  createdAt: string;
  updatedAt: string | null;
  submissionCount: number;
}

export interface CreateAssignmentRequest {
  title: string;
  description: string;
  subjectId: string;
  deadline: string;
  maxMarks: number;
  allowLateSubmission: boolean;
  status: AssignmentStatusType;
}

export interface UpdateAssignmentRequest {
  title: string;
  description: string;
  deadline: string;
  maxMarks: number;
  allowLateSubmission: boolean;
  status: AssignmentStatusType;
}

export interface SubmissionDto {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  answerText: string;
  fileName: string | null;
  fileUrl: string | null;
  submittedAt: string;
  updatedAt: string | null;
  status: SubmissionStatusType;
  marks: number | null;
  maxMarks: number;
  feedback: string | null;
  gradedAt: string | null;
  gradedByTeacherName: string | null;
}

export interface GradeSubmissionRequest {
  marks: number;
  feedback: string | null;
}

export interface UpdateSubmissionStatusRequest {
  status: SubmissionStatusType;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiError {
  message: string;
  errors: Record<string, string[]> | null;
  traceId: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}
