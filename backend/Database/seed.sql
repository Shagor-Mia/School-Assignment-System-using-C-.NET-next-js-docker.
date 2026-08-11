--
-- PostgreSQL database dump
--

\restrict HLF7cOMYYF6A3vxvokRiqBc6PyAS0KbEM9kGx8JKljh1NFBqyu1mB3GdveOzRrL

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Classes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Classes" ("Id", "Name", "CreatedAt") VALUES ('04e8b5a2-a3f0-44fb-bdad-c26c2efa752e', 'Grade 10 - A', '2026-08-04 11:14:43.009858+06');


--
-- Data for Name: Subjects; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Subjects" ("Id", "Name", "Code", "CreatedAt", "ClassId") VALUES ('c55a4c88-c2df-45c4-aad0-a32ddd0372d8', 'Mathematics', 'MATH101', '2026-08-04 11:14:43.009858+06', '04e8b5a2-a3f0-44fb-bdad-c26c2efa752e');


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Users" ("Id", "FullName", "Email", "PasswordHash", "Role", "IsActive", "CreatedAt", "ClassId") VALUES ('68b90b59-0d02-48ab-a0cf-360b229ebfef', 'Jane Teacher', 'teacher@synoslms.local', '$2a$11$GTk7f2yV4dUj0RX3Uw2Ote6E78JTrIRvySDN6tshWVSA9hyVEhJh2', 'Teacher', true, '2026-08-04 11:14:43.009858+06', NULL);
INSERT INTO public."Users" ("Id", "FullName", "Email", "PasswordHash", "Role", "IsActive", "CreatedAt", "ClassId") VALUES ('e3ed145b-bd5e-4eda-b745-80c9bb0d8a94', 'System Admin', 'admin@synoslms.local', '$2a$11$oxJ3VpLAxBfX7EQOdh2BduoEAsdRS.pITniY.S6NeiLm0Mi6748kO', 'Admin', true, '2026-08-04 11:14:43.009858+06', NULL);
INSERT INTO public."Users" ("Id", "FullName", "Email", "PasswordHash", "Role", "IsActive", "CreatedAt", "ClassId") VALUES ('f6c9e980-f5b2-437f-b62b-549ef55e696f', 'Sam Student', 'student@synoslms.local', '$2a$11$Ld5RT3lUvn6fXeRIbiiL3u6eCMwLcqpymWkjs.sn435O5.ybjiY1a', 'Student', true, '2026-08-04 11:14:43.009858+06', '04e8b5a2-a3f0-44fb-bdad-c26c2efa752e');


--
-- Data for Name: Assignments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Assignments" ("Id", "Title", "Description", "Deadline", "MaxMarks", "Status", "AllowLateSubmission", "CreatedAt", "UpdatedAt", "SubjectId", "CreatedByTeacherId") VALUES ('19d6df04-a100-4fdc-8251-d1d96556fef9', 'Algebra Basics Homework', 'Complete exercises 1 through 10 on linear equations.', '2026-08-11 11:14:43.009858+06', 100.00, 'Published', false, '2026-08-04 11:14:43.009858+06', NULL, 'c55a4c88-c2df-45c4-aad0-a32ddd0372d8', '68b90b59-0d02-48ab-a0cf-360b229ebfef');
INSERT INTO public."Assignments" ("Id", "Title", "Description", "Deadline", "MaxMarks", "Status", "AllowLateSubmission", "CreatedAt", "UpdatedAt", "SubjectId", "CreatedByTeacherId") VALUES ('2b063268-d762-4811-8619-8eaa937a4054', 'Geometry Quiz (Draft)', 'Draft quiz covering triangles and angles, not yet published.', '2026-08-18 11:14:43.009858+06', 50.00, 'Draft', false, '2026-08-04 11:14:43.009858+06', NULL, 'c55a4c88-c2df-45c4-aad0-a32ddd0372d8', '68b90b59-0d02-48ab-a0cf-360b229ebfef');


--
-- Data for Name: Submissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Submissions" ("Id", "AnswerText", "FilePath", "FileName", "SubmittedAt", "UpdatedAt", "Status", "Marks", "Feedback", "GradedAt", "AssignmentId", "StudentId", "GradedByTeacherId") VALUES ('1c309996-6228-42e5-9141-f1c0434a4b85', 'Sample answer text.', NULL, NULL, '2026-08-04 11:14:43.009858+06', NULL, 'Submitted', NULL, NULL, NULL, '19d6df04-a100-4fdc-8251-d1d96556fef9', 'f6c9e980-f5b2-437f-b62b-549ef55e696f', NULL);


--
-- Data for Name: TeacherSubjectAssignments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."TeacherSubjectAssignments" ("Id", "CreatedAt", "TeacherId", "SubjectId") VALUES ('4379d9c3-5798-43d8-b251-be49eb9c34cb', '2026-08-04 11:14:43.009858+06', '68b90b59-0d02-48ab-a0cf-360b229ebfef', 'c55a4c88-c2df-45c4-aad0-a32ddd0372d8');


--
-- PostgreSQL database dump complete
--

\unrestrict HLF7cOMYYF6A3vxvokRiqBc6PyAS0KbEM9kGx8JKljh1NFBqyu1mB3GdveOzRrL

