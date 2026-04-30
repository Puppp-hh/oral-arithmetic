-- ============================================================
-- 作业 + 考试演示数据
-- 前置条件：
--   1. schema.sql、seed.sql、scripts/seed.ts 已执行
--   2. homework_exam.sql 已执行
--
-- 设计目标：
--   - 教师 teacher01 登录后能看到作业/考试列表、详情、完成统计
--   - 学生 student01~student03 登录后能看到待完成/已完成作业和考试
--   - 脚本可重复执行，基于固定标题避免重复创建同一批演示数据
-- ============================================================

USE oral_arithmetic;

SET @teacher_id = (
  SELECT teacher_id FROM teacher WHERE account = 'teacher01' LIMIT 1
);

SET @student01_id = (
  SELECT student_id FROM student WHERE account = 'student01' LIMIT 1
);
SET @student02_id = (
  SELECT student_id FROM student WHERE account = 'student02' LIMIT 1
);
SET @student03_id = (
  SELECT student_id FROM student WHERE account = 'student03' LIMIT 1
);

-- ------------------------------------------------------------
-- 1. 演示作业：布置给 student01~student03
-- ------------------------------------------------------------
INSERT INTO homework
  (teacher_id, title, problem_count, difficulty_level, operation_type, deadline, status)
SELECT
  @teacher_id,
  '每日口算练习 - 演示作业',
  6,
  1,
  'addition',
  DATE_ADD(NOW(), INTERVAL 7 DAY),
  'active'
WHERE @teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM homework
    WHERE teacher_id = @teacher_id
      AND title = '每日口算练习 - 演示作业'
  );

SET @homework_id = (
  SELECT homework_id
  FROM homework
  WHERE teacher_id = @teacher_id
    AND title = '每日口算练习 - 演示作业'
  ORDER BY homework_id DESC
  LIMIT 1
);

SET @hw_order = -1;
INSERT IGNORE INTO homework_problem (homework_id, problem_id, order_index)
SELECT
  @homework_id,
  p.problem_id,
  (@hw_order := @hw_order + 1)
FROM (
  SELECT problem_id
  FROM problem
  WHERE enable_status = 'enabled'
    AND difficulty_level = 1
    AND problem_type = 'addition'
  ORDER BY problem_id
  LIMIT 6
) p
WHERE @homework_id IS NOT NULL;

INSERT IGNORE INTO homework_student (homework_id, student_id)
SELECT @homework_id, student_id
FROM student
WHERE account IN ('student01', 'student02', 'student03')
  AND @homework_id IS NOT NULL;

-- student01 已提交作业，student02/student03 保持未提交，方便教师端看完成统计。
INSERT IGNORE INTO homework_submission
  (homework_id, student_id, score, correct_count, total, correct_rate, detail)
SELECT
  @homework_id,
  @student01_id,
  100.00,
  COUNT(*),
  COUNT(*),
  100.00,
  JSON_OBJECTAGG(
    CAST(p.problem_id AS CHAR),
    JSON_OBJECT(
      'answer_content', p.standard_answer,
      'problem_content', p.problem_content,
      'standard_answer', p.standard_answer,
      'is_correct', TRUE
    )
  )
FROM homework_problem hp
JOIN problem p ON p.problem_id = hp.problem_id
WHERE hp.homework_id = @homework_id
  AND @student01_id IS NOT NULL
GROUP BY hp.homework_id;

-- ------------------------------------------------------------
-- 2. 演示试卷：6 道 Level 1 加法题，每题 2 分
-- ------------------------------------------------------------
INSERT INTO exam_paper
  (teacher_id, title, problem_count, difficulty_level, operation_type)
SELECT
  @teacher_id,
  '一年级口算小测 - 演示试卷',
  6,
  1,
  'addition'
WHERE @teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM exam_paper
    WHERE teacher_id = @teacher_id
      AND title = '一年级口算小测 - 演示试卷'
  );

SET @paper_id = (
  SELECT paper_id
  FROM exam_paper
  WHERE teacher_id = @teacher_id
    AND title = '一年级口算小测 - 演示试卷'
  ORDER BY paper_id DESC
  LIMIT 1
);

SET @paper_order = -1;
INSERT IGNORE INTO exam_paper_problem (paper_id, problem_id, score, order_index)
SELECT
  @paper_id,
  p.problem_id,
  2,
  (@paper_order := @paper_order + 1)
FROM (
  SELECT problem_id
  FROM problem
  WHERE enable_status = 'enabled'
    AND difficulty_level = 1
    AND problem_type = 'addition'
  ORDER BY problem_id
  LIMIT 6
) p
WHERE @paper_id IS NOT NULL;

-- ------------------------------------------------------------
-- 3. 演示考试：分配给 student01~student03
-- ------------------------------------------------------------
INSERT INTO exam
  (paper_id, teacher_id, title, start_time, end_time, duration_minutes, status, problem_count, total_score)
SELECT
  @paper_id,
  @teacher_id,
  '一年级口算小测 - 演示考试',
  DATE_SUB(NOW(), INTERVAL 1 HOUR),
  DATE_ADD(NOW(), INTERVAL 7 DAY),
  30,
  'published',
  6,
  12
WHERE @paper_id IS NOT NULL
  AND @teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM exam
    WHERE teacher_id = @teacher_id
      AND title = '一年级口算小测 - 演示考试'
  );

SET @exam_id = (
  SELECT exam_id
  FROM exam
  WHERE teacher_id = @teacher_id
    AND title = '一年级口算小测 - 演示考试'
  ORDER BY exam_id DESC
  LIMIT 1
);

INSERT IGNORE INTO exam_student (exam_id, student_id)
SELECT @exam_id, student_id
FROM student
WHERE account IN ('student01', 'student02', 'student03')
  AND @exam_id IS NOT NULL;

-- student02 已提交考试，student01/student03 保持未提交，方便两端页面都有数据状态。
INSERT IGNORE INTO exam_submission
  (exam_id, student_id, score, total_score, correct_count, total_count, correct_rate, detail)
SELECT
  @exam_id,
  @student02_id,
  SUM(epp.score),
  SUM(epp.score),
  COUNT(*),
  COUNT(*),
  100.00,
  JSON_ARRAYAGG(
    JSON_OBJECT(
      'problem_id', p.problem_id,
      'problem_content', p.problem_content,
      'student_answer', p.standard_answer,
      'standard_answer', p.standard_answer,
      'score', epp.score,
      'is_correct', TRUE
    )
  )
FROM exam_paper_problem epp
JOIN problem p ON p.problem_id = epp.problem_id
WHERE epp.paper_id = @paper_id
  AND @exam_id IS NOT NULL
  AND @student02_id IS NOT NULL
GROUP BY epp.paper_id;

-- ------------------------------------------------------------
-- 4. 摘要检查
-- ------------------------------------------------------------
SELECT 'homework' AS module, COUNT(*) AS total FROM homework
UNION ALL
SELECT 'homework_submission', COUNT(*) FROM homework_submission
UNION ALL
SELECT 'exam_paper', COUNT(*) FROM exam_paper
UNION ALL
SELECT 'exam', COUNT(*) FROM exam
UNION ALL
SELECT 'exam_submission', COUNT(*) FROM exam_submission;
