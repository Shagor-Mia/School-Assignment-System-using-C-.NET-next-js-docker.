-- Bulk demo dataset: a Bangladeshi high school, Class 1 to Class 10 (sections A/B/C),
-- ~1000 students, ~60 teachers, 7 subjects per class-section, assignments + submissions.
--
-- Idempotent: if "Class 1 - A" already exists, the whole block is a no-op, so re-running
-- this file (e.g. on every app startup) after the first successful run does nothing.
--
-- IMPORTANT: every random value below is generated as a plain top-level SELECT-list
-- expression (or inside a MATERIALIZED CTE), never inside a bare `CROSS JOIN LATERAL
-- (SELECT ... random() ...)`. Postgres is free to evaluate an uncorrelated LATERAL
-- subquery once and reuse the single result for every outer row -- which silently
-- produced identical names/teacher assignments for all 1000 students the first time
-- this script was written. Keep new random columns in this same style.
--
-- Login pattern for the generated accounts (all share one password per role):
--   Students: student0001@bulk.local .. student1000@bulk.local / Student@12345
--   Teachers: teacher001@bulk.local .. teacher060@bulk.local   / Teacher@12345

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    already_seeded boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM "Classes" WHERE "Name" = 'Class 1 - A') INTO already_seeded;
    IF already_seeded THEN
        RAISE NOTICE 'Bulk demo dataset already present, skipping.';
        RETURN;
    END IF;

    -- 1. Classes: Class 1..10, sections A/B/C = 30 class-sections.
    INSERT INTO "Classes" ("Id", "Name", "CreatedAt")
    SELECT gen_random_uuid(), 'Class ' || g || ' - ' || sec, now()
    FROM generate_series(1, 10) AS g, unnest(ARRAY['A', 'B', 'C']) AS sec;

    -- 2. Subjects: Bangladeshi National Curriculum subjects, 7 per class-section (210 rows).
    INSERT INTO "Subjects" ("Id", "Name", "Code", "ClassId", "CreatedAt")
    SELECT gen_random_uuid(), sd.name, sd.code, c."Id", now()
    FROM "Classes" c
    CROSS JOIN (VALUES
        ('Bangla', 'BAN'),
        ('English', 'ENG'),
        ('Mathematics', 'MAT'),
        ('General Science', 'SCI'),
        ('Bangladesh and Global Studies', 'BGS'),
        ('Religion and Moral Education', 'REL'),
        ('ICT', 'ICT')
    ) AS sd(name, code)
    WHERE c."Name" LIKE 'Class % - _';

    -- 3. Teachers: 60 rows with randomized Bangladeshi names (inline, no LATERAL).
    INSERT INTO "Users" ("Id", "FullName", "Email", "PasswordHash", "Role", "IsActive", "CreatedAt")
    SELECT gen_random_uuid(),
           (ARRAY[
               'Rahim','Karim','Jahid','Mahin','Tanvir','Rakib','Nayeem','Shakil','Emon','Fahim',
               'Rasel','Arif','Sabbir','Imran','Habib','Zubayer','Rifat','Anik','Sohel','Mizan',
               'Faisal','Rayhan','Shafin','Tamim','Naeem','Asif','Shanto','Rubel','Milon','Hridoy',
               'Robin','Sagor','Sourav','Tuhin','Zahid','Mahmud','Riyad','Shovon','Kamal','Jamal',
               'Jewel','Nasir','Faruk','Yeasin','Nabil','Adnan','Fahad','Rakin','Foysal','Nayan',
               'Rony','Emran','Tarek','Riaz','Munna','Rana','Selim','Iqbal','Masud','Zubair',
               'Fatema','Ayesha','Nusrat','Sumaiya','Tania','Jannat','Mim','Nishat','Rima','Sadia',
               'Rupa','Moushumi','Shanta','Priya','Sathi','Lamia','Israt','Farzana','Tasnim','Munni',
               'Nasrin','Rehana','Shirin','Runa','Liza','Mitu','Toma','Popy','Keya','Dola',
               'Sumi','Jui','Mukta','Riya','Ishika','Nazia','Nabila','Anika','Tanha','Bristy'
           ])[(1 + floor(random() * 100))::int]
           || ' ' ||
           (ARRAY[
               'Islam','Ahmed','Hossain','Rahman','Khan','Chowdhury','Akter','Uddin','Sarker',
               'Talukder','Molla','Sheikh','Mia','Begum','Bhuiyan','Sikder','Pramanik','Mondol',
               'Biswas','Ali','Alam','Haque','Kabir','Khandaker','Mridha','Munshi','Pathan','Kazi',
               'Sardar','Gazi','Matubbar','Howlader','Majumder','Akhtar','Parvez','Faruqui','Rashid',
               'Bepari','Dewan','Miah','Das','Roy','Nath','Dutta','Ghosh','Pal','Saha','Barua',
               'Sarkar','Chakma'
           ])[(1 + floor(random() * 50))::int],
           'teacher' || lpad(n::text, 3, '0') || '@bulk.local',
           crypt('Teacher@12345', gen_salt('bf')),
           'Teacher', true, now()
    FROM generate_series(1, 60) AS n;

    -- 4. Students: exactly 1000, spread evenly across the 30 class-sections (~33-34 each).
    WITH bulk_classes AS (
        SELECT "Id", row_number() OVER (ORDER BY "Name") - 1 AS idx
        FROM "Classes" WHERE "Name" LIKE 'Class % - _'
    )
    INSERT INTO "Users" ("Id", "FullName", "Email", "PasswordHash", "Role", "IsActive", "CreatedAt", "ClassId")
    SELECT gen_random_uuid(),
           (ARRAY[
               'Rahim','Karim','Jahid','Mahin','Tanvir','Rakib','Nayeem','Shakil','Emon','Fahim',
               'Rasel','Arif','Sabbir','Imran','Habib','Zubayer','Rifat','Anik','Sohel','Mizan',
               'Faisal','Rayhan','Shafin','Tamim','Naeem','Asif','Shanto','Rubel','Milon','Hridoy',
               'Robin','Sagor','Sourav','Tuhin','Zahid','Mahmud','Riyad','Shovon','Kamal','Jamal',
               'Jewel','Nasir','Faruk','Yeasin','Nabil','Adnan','Fahad','Rakin','Foysal','Nayan',
               'Rony','Emran','Tarek','Riaz','Munna','Rana','Selim','Iqbal','Masud','Zubair',
               'Fatema','Ayesha','Nusrat','Sumaiya','Tania','Jannat','Mim','Nishat','Rima','Sadia',
               'Rupa','Moushumi','Shanta','Priya','Sathi','Lamia','Israt','Farzana','Tasnim','Munni',
               'Nasrin','Rehana','Shirin','Runa','Liza','Mitu','Toma','Popy','Keya','Dola',
               'Sumi','Jui','Mukta','Riya','Ishika','Nazia','Nabila','Anika','Tanha','Bristy'
           ])[(1 + floor(random() * 100))::int]
           || ' ' ||
           (ARRAY[
               'Islam','Ahmed','Hossain','Rahman','Khan','Chowdhury','Akter','Uddin','Sarker',
               'Talukder','Molla','Sheikh','Mia','Begum','Bhuiyan','Sikder','Pramanik','Mondol',
               'Biswas','Ali','Alam','Haque','Kabir','Khandaker','Mridha','Munshi','Pathan','Kazi',
               'Sardar','Gazi','Matubbar','Howlader','Majumder','Akhtar','Parvez','Faruqui','Rashid',
               'Bepari','Dewan','Miah','Das','Roy','Nath','Dutta','Ghosh','Pal','Saha','Barua',
               'Sarkar','Chakma'
           ])[(1 + floor(random() * 50))::int],
           'student' || lpad(n::text, 4, '0') || '@bulk.local',
           crypt('Student@12345', gen_salt('bf')),
           'Student', true, now(),
           bc."Id"
    FROM generate_series(1, 1000) AS n
    JOIN bulk_classes bc ON bc.idx = (n - 1) % 30;

    -- 5. Teacher-subject assignments: one random bulk teacher per subject (210 rows).
    -- The teacher-id array is built once (deterministic, no randomness in it), then indexed
    -- with a random position computed directly in the outer SELECT list -- so the index (and
    -- therefore the teacher picked) genuinely varies per subject row.
    INSERT INTO "TeacherSubjectAssignments" ("Id", "TeacherId", "SubjectId", "CreatedAt")
    SELECT gen_random_uuid(),
           teachers.ids[(1 + floor(random() * array_length(teachers.ids, 1)))::int],
           s."Id", now()
    FROM "Subjects" s
    JOIN "Classes" c ON c."Id" = s."ClassId" AND c."Name" LIKE 'Class % - _'
    CROSS JOIN (
        SELECT array_agg("Id") AS ids FROM "Users"
        WHERE "Role" = 'Teacher' AND "Email" LIKE 'teacher%@bulk.local'
    ) teachers;

    -- 6. Assignments: 2 per subject (~420 rows) -- one always Published, one random status.
    INSERT INTO "Assignments"
        ("Id", "Title", "Description", "Deadline", "MaxMarks", "Status", "AllowLateSubmission",
         "CreatedAt", "SubjectId", "CreatedByTeacherId")
    SELECT gen_random_uuid(),
           s."Name" || ' - Assignment ' || gs.n,
           'Auto-generated bulk assignment for ' || s."Name" || ' (' || c."Name" || ').',
           now() + ((floor(random() * 20) - 5) || ' days')::interval,
           (ARRAY[50, 60, 75, 100])[(1 + floor(random() * 4))::int],
           CASE WHEN gs.n = 1 THEN 'Published'
                ELSE (ARRAY['Published', 'Draft'])[(1 + floor(random() * 2))::int] END,
           (random() < 0.3),
           now(),
           s."Id",
           tsa."TeacherId"
    FROM "Subjects" s
    JOIN "Classes" c ON c."Id" = s."ClassId" AND c."Name" LIKE 'Class % - _'
    JOIN "TeacherSubjectAssignments" tsa ON tsa."SubjectId" = s."Id"
    CROSS JOIN generate_series(1, 2) AS gs(n);

    -- 7. Submissions: ~50% of each Published assignment's classmates submit; ~50% of those
    -- are graded with random marks/feedback. `candidates` is MATERIALIZED so `is_graded` is
    -- computed exactly once per row and reused consistently across Status/Marks/Feedback/
    -- GradedAt/GradedByTeacherId below (otherwise Postgres could inline the subquery and
    -- re-evaluate random() separately per column, making Status and Marks disagree).
    WITH candidates AS MATERIALIZED (
        SELECT a."Id" AS assignment_id, u."Id" AS student_id,
               a."MaxMarks" AS max_marks, a."CreatedByTeacherId" AS teacher_id,
               (random() < 0.5) AS is_graded
        FROM "Assignments" a
        JOIN "Subjects" s ON s."Id" = a."SubjectId"
        JOIN "Classes" c ON c."Id" = s."ClassId" AND c."Name" LIKE 'Class % - _'
        JOIN "Users" u ON u."ClassId" = s."ClassId" AND u."Role" = 'Student'
        WHERE a."Status" = 'Published' AND random() < 0.5
    )
    INSERT INTO "Submissions"
        ("Id", "AnswerText", "SubmittedAt", "Status", "Marks", "Feedback", "GradedAt",
         "AssignmentId", "StudentId", "GradedByTeacherId")
    SELECT gen_random_uuid(),
           'Auto-generated bulk submission answer.',
           now() - (floor(random() * 5) || ' days')::interval,
           CASE WHEN is_graded THEN 'Graded' ELSE 'Submitted' END,
           CASE WHEN is_graded THEN round((random() * max_marks)::numeric, 2) ELSE NULL END,
           CASE WHEN is_graded THEN 'Good effort, keep it up.' ELSE NULL END,
           CASE WHEN is_graded THEN now() ELSE NULL END,
           assignment_id,
           student_id,
           CASE WHEN is_graded THEN teacher_id ELSE NULL END
    FROM candidates;

    RAISE NOTICE 'Bulk demo dataset seeded: 30 classes, 210 subjects, 60 teachers, 1000 students.';
END $$;
