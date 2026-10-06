// Thin, strongly-typed wrappers around the raw apiGet/apiPost/etc helpers,
// one per backend resource. Keeping these in one place means every page
// calls the API the same way and gets the same DTO types back.

import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm, apiPut, ApiClientError } from "./api-client";
import type {
  AssignmentDto,
  ClassDto,
  CreateAssignmentRequest,
  CreateClassRequest,
  CreateSubjectRequest,
  CreateTeacherAssignmentRequest,
  CreateUserRequest,
  GradeSubmissionRequest,
  PagedResult,
  Role,
  SubjectDto,
  SubmissionDto,
  TeacherAssignmentDto,
  UpdateAssignmentRequest,
  UpdateClassRequest,
  UpdateSubjectRequest,
  UpdateSubmissionStatusRequest,
  UpdateUserRequest,
  UserDto,
} from "./types";

// --- Users ---

export function getUsers(params: {
  role?: Role;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return apiGet<PagedResult<UserDto>>("users", params);
}
export function getUser(id: string) {
  return apiGet<UserDto>(`users/${id}`);
}
export function createUser(data: CreateUserRequest) {
  return apiPost<UserDto>("users", data);
}
export function updateUser(id: string, data: UpdateUserRequest) {
  return apiPut<UserDto>(`users/${id}`, data);
}
export function deleteUser(id: string) {
  return apiDelete<void>(`users/${id}`);
}

// --- Classes ---

export function getClasses(params?: { page?: number; pageSize?: number }) {
  return apiGet<PagedResult<ClassDto>>("classes", params);
}
export function createClass(data: CreateClassRequest) {
  return apiPost<ClassDto>("classes", data);
}
export function updateClass(id: string, data: UpdateClassRequest) {
  return apiPut<ClassDto>(`classes/${id}`, data);
}
export function deleteClass(id: string) {
  return apiDelete<void>(`classes/${id}`);
}

// --- Subjects ---

export function getSubjects(params?: { classId?: string; page?: number; pageSize?: number }) {
  return apiGet<PagedResult<SubjectDto>>("subjects", params);
}
export function createSubject(data: CreateSubjectRequest) {
  return apiPost<SubjectDto>("subjects", data);
}
export function updateSubject(id: string, data: UpdateSubjectRequest) {
  return apiPut<SubjectDto>(`subjects/${id}`, data);
}
export function deleteSubject(id: string) {
  return apiDelete<void>(`subjects/${id}`);
}

// --- Teacher assignments (teacher <-> subject mapping) ---

export function getTeacherAssignments(params?: {
  teacherId?: string;
  subjectId?: string;
  page?: number;
  pageSize?: number;
}) {
  return apiGet<PagedResult<TeacherAssignmentDto>>("teacher-assignments", params);
}
export function getMyTeacherAssignments() {
  return apiGet<TeacherAssignmentDto[]>("teacher-assignments/my");
}
export function createTeacherAssignment(data: CreateTeacherAssignmentRequest) {
  return apiPost<TeacherAssignmentDto>("teacher-assignments", data);
}
export function deleteTeacherAssignment(id: string) {
  return apiDelete<void>(`teacher-assignments/${id}`);
}

// --- Assignments ---

export function getAssignments(params?: { page?: number; pageSize?: number }) {
  return apiGet<PagedResult<AssignmentDto>>("assignments", params);
}
export function getAssignment(id: string) {
  return apiGet<AssignmentDto>(`assignments/${id}`);
}
export function createAssignment(data: CreateAssignmentRequest) {
  return apiPost<AssignmentDto>("assignments", data);
}
export function updateAssignment(id: string, data: UpdateAssignmentRequest) {
  return apiPut<AssignmentDto>(`assignments/${id}`, data);
}
export function deleteAssignment(id: string) {
  return apiDelete<void>(`assignments/${id}`);
}
export function publishAssignment(id: string) {
  return apiPatch<AssignmentDto>(`assignments/${id}/publish`, undefined);
}

// --- Submissions ---

export function getAssignmentSubmissions(assignmentId: string) {
  return apiGet<SubmissionDto[]>(`assignments/${assignmentId}/submissions`);
}

/** A 404 here just means "the student hasn't submitted yet" — resolves to null instead of throwing. */
export async function getMySubmission(assignmentId: string): Promise<SubmissionDto | null> {
  try {
    return await apiGet<SubmissionDto>(`assignments/${assignmentId}/submissions/me`);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return null;
    throw err;
  }
}

export function submitAssignment(assignmentId: string, formData: FormData) {
  return apiPostForm<SubmissionDto>(`assignments/${assignmentId}/submissions`, formData);
}
export function updateSubmission(id: string, formData: FormData) {
  // The backend route is `PUT submissions/{id}`; sent as multipart so an
  // updated file can optionally be attached alongside updated answer text.
  return apiPostFormAsPut<SubmissionDto>(`submissions/${id}`, formData);
}
export function getSubmission(id: string) {
  return apiGet<SubmissionDto>(`submissions/${id}`);
}
export function gradeSubmission(id: string, data: GradeSubmissionRequest) {
  return apiPatch<SubmissionDto>(`submissions/${id}/grade`, data);
}
export function updateSubmissionStatus(id: string, data: UpdateSubmissionStatusRequest) {
  return apiPatch<SubmissionDto>(`submissions/${id}/status`, data);
}

// PUT with a multipart body — not covered by the generic apiPut (JSON-only),
// so implemented locally using the same fetch-through-proxy pattern.
async function apiPostFormAsPut<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`/api/backend/${path}`, {
    method: "PUT",
    headers: { Accept: "application/json" },
    body: formData,
  });
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw new ApiClientError(res.status, body);
  }
  return body as T;
}

// --- Auth / profile ---

export function getMe() {
  return apiGet<UserDto>("auth/me");
}
export function changePassword(data: { currentPassword: string; newPassword: string }) {
  return apiPost<void>("auth/change-password", data);
}
