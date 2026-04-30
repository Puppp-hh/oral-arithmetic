-- ============================================================
-- 演示数据：为已有师生补齐邀请码绑定关系
--
-- 目标：
--   1. teacher01 的班级生成可用邀请码，student01/student02 绑定到该班级。
--   2. teacher02 暂不绑定学生，保留给后续测试。
--   3. student03 移入“待绑定班级”，保留给后续输入邀请码绑定测试。
--
-- 注意：
--   本脚本面向本地演示数据库，可重复执行。
-- ============================================================

USE oral_arithmetic;

START TRANSACTION;

SET @teacher01_id = (SELECT teacher_id FROM teacher WHERE account = 'teacher01' LIMIT 1);
SET @grade01_id = (SELECT grade_id FROM grade ORDER BY grade_id ASC LIMIT 1);

-- teacher01 现有班级补齐邀请码。
UPDATE class
SET invite_code = CONCAT('C', LPAD(class_id, 5, '0')),
    invite_code_status = 'active',
    invite_code_expire_time = NULL
WHERE teacher_id = @teacher01_id
  AND invite_code IS NULL;

-- 取 teacher01 的第一个班级作为演示绑定班级。
SET @bound_class_id = (
  SELECT class_id
  FROM class
  WHERE teacher_id = @teacher01_id
    AND class_status = 'active'
  ORDER BY class_id ASC
  LIMIT 1
);

-- 如果缺少“待绑定班级”，创建一个无班主任班级承接预留学生。
INSERT INTO class (grade_id, class_name, teacher_id, student_count, class_status, invite_code, invite_code_status)
SELECT @grade01_id, '待绑定班级', NULL, 0, 'active', NULL, 'disabled'
WHERE @grade01_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM class
    WHERE teacher_id IS NULL
      AND class_name = '待绑定班级'
      AND grade_id = @grade01_id
  );

SET @unbound_class_id = (
  SELECT class_id
  FROM class
  WHERE teacher_id IS NULL
    AND class_name = '待绑定班级'
    AND grade_id = @grade01_id
  ORDER BY class_id ASC
  LIMIT 1
);

-- student01/student02 绑定到 teacher01 的邀请码班级。
UPDATE student
SET class_id = @bound_class_id,
    grade_id = @grade01_id
WHERE account IN ('student01', 'student02')
  AND @bound_class_id IS NOT NULL;

-- student03 保留为后续绑定测试账号。
UPDATE student
SET class_id = @unbound_class_id,
    grade_id = @grade01_id
WHERE account = 'student03'
  AND @unbound_class_id IS NOT NULL;

-- 重新计算班级人数，避免历史 student_count 不准确。
UPDATE class c
LEFT JOIN (
  SELECT class_id, COUNT(*) AS cnt
  FROM student
  WHERE account_status != 'banned'
  GROUP BY class_id
) s ON s.class_id = c.class_id
SET c.student_count = COALESCE(s.cnt, 0);

COMMIT;

SELECT
  c.class_id,
  c.class_name,
  c.teacher_id,
  t.account AS teacher_account,
  c.student_count,
  c.invite_code,
  c.invite_code_status
FROM class c
LEFT JOIN teacher t ON t.teacher_id = c.teacher_id
ORDER BY c.class_id;

SELECT
  s.student_id,
  s.account,
  s.name,
  s.class_id,
  c.class_name,
  t.account AS teacher_account
FROM student s
JOIN class c ON c.class_id = s.class_id
LEFT JOIN teacher t ON t.teacher_id = c.teacher_id
ORDER BY s.student_id;
