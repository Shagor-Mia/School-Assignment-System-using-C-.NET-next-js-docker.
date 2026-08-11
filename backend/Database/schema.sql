CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE TABLE "Classes" (
        "Id" uuid NOT NULL,
        "Name" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Classes" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE TABLE "Subjects" (
        "Id" uuid NOT NULL,
        "Name" text NOT NULL,
        "Code" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "ClassId" uuid NOT NULL,
        CONSTRAINT "PK_Subjects" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Subjects_Classes_ClassId" FOREIGN KEY ("ClassId") REFERENCES "Classes" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "FullName" text NOT NULL,
        "Email" text NOT NULL,
        "PasswordHash" text NOT NULL,
        "Role" character varying(20) NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "ClassId" uuid,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Users_Classes_ClassId" FOREIGN KEY ("ClassId") REFERENCES "Classes" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE TABLE "Assignments" (
        "Id" uuid NOT NULL,
        "Title" text NOT NULL,
        "Description" text NOT NULL,
        "Deadline" timestamp with time zone NOT NULL,
        "MaxMarks" numeric(6,2) NOT NULL,
        "Status" character varying(20) NOT NULL,
        "AllowLateSubmission" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "SubjectId" uuid NOT NULL,
        "CreatedByTeacherId" uuid NOT NULL,
        CONSTRAINT "PK_Assignments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Assignments_Subjects_SubjectId" FOREIGN KEY ("SubjectId") REFERENCES "Subjects" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Assignments_Users_CreatedByTeacherId" FOREIGN KEY ("CreatedByTeacherId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE TABLE "TeacherSubjectAssignments" (
        "Id" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "TeacherId" uuid NOT NULL,
        "SubjectId" uuid NOT NULL,
        CONSTRAINT "PK_TeacherSubjectAssignments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TeacherSubjectAssignments_Subjects_SubjectId" FOREIGN KEY ("SubjectId") REFERENCES "Subjects" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_TeacherSubjectAssignments_Users_TeacherId" FOREIGN KEY ("TeacherId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE TABLE "Submissions" (
        "Id" uuid NOT NULL,
        "AnswerText" text NOT NULL,
        "FilePath" text,
        "FileName" text,
        "SubmittedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "Status" character varying(30) NOT NULL,
        "Marks" numeric(6,2),
        "Feedback" text,
        "GradedAt" timestamp with time zone,
        "AssignmentId" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "GradedByTeacherId" uuid,
        CONSTRAINT "PK_Submissions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Submissions_Assignments_AssignmentId" FOREIGN KEY ("AssignmentId") REFERENCES "Assignments" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Submissions_Users_GradedByTeacherId" FOREIGN KEY ("GradedByTeacherId") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Submissions_Users_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE INDEX "IX_Assignments_CreatedByTeacherId" ON "Assignments" ("CreatedByTeacherId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE INDEX "IX_Assignments_SubjectId" ON "Assignments" ("SubjectId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Classes_Name" ON "Classes" ("Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Subjects_ClassId_Code" ON "Subjects" ("ClassId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Submissions_AssignmentId_StudentId" ON "Submissions" ("AssignmentId", "StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE INDEX "IX_Submissions_GradedByTeacherId" ON "Submissions" ("GradedByTeacherId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE INDEX "IX_Submissions_StudentId" ON "Submissions" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE INDEX "IX_TeacherSubjectAssignments_SubjectId" ON "TeacherSubjectAssignments" ("SubjectId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_TeacherSubjectAssignments_TeacherId_SubjectId" ON "TeacherSubjectAssignments" ("TeacherId", "SubjectId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE INDEX "IX_Users_ClassId" ON "Users" ("ClassId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260804045719_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260804045719_InitialCreate', '8.0.11');
    END IF;
END $EF$;
COMMIT;

