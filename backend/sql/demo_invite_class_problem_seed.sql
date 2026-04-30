-- ============================================================
-- 演示数据：班级邀请码绑定关系 + 学校信息 + 题目样本
--
-- 设计规则：
--   1. 邀请码属于班级，不属于老师；每个班级最多一个当前有效邀请码。
--   2. 邀请码必须唯一，用于学生注册/绑定时加入对应班级。
--   3. 已绑定学生的关系存储在 student.class_id，不依赖邀请码是否后续重置。
--   4. teacher02 与 student03 保留为后期绑定测试数据。
--
-- 默认测试账号密码：123456
-- 本脚本面向本地演示数据库，可重复执行。
-- ============================================================

USE oral_arithmetic;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

START TRANSACTION;

SET @pwd = '$2a$10$MIyLf6s.hC7no5Ny71jKQehi6PnuWFRa2NB1NsZBuzCF82.aueOuS';

SET @grade1 = (SELECT grade_id FROM grade WHERE grade_name = '一年级' LIMIT 1);
SET @grade2 = (SELECT grade_id FROM grade WHERE grade_name = '二年级' LIMIT 1);
SET @grade3 = (SELECT grade_id FROM grade WHERE grade_name = '三年级' LIMIT 1);
SET @grade4 = (SELECT grade_id FROM grade WHERE grade_name = '四年级' LIMIT 1);

-- ------------------------------------------------------------
-- 1. 教师演示数据
--    teacher02 仅保留班级邀请码，不绑定学生，便于后续测试。
-- ------------------------------------------------------------
INSERT INTO teacher
  (name, account, password, email, phone, teaching_subjects, school_name, school_address, school_longitude, school_latitude, account_status)
VALUES
  ('张老师', 'teacher01', @pwd, 'teacher01@example.com', '13800000001', '数学',
   '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'active'),
  ('李老师', 'teacher02', @pwd, 'teacher02@example.com', '13800000002', '数学',
   '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'active'),
  ('王老师', 'teacher03', @pwd, 'teacher03@example.com', '13800000003', '数学',
   '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'active'),
  ('赵老师', 'teacher04', @pwd, 'teacher04@example.com', '13800000004', '数学',
   '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'active')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  email = VALUES(email),
  phone = VALUES(phone),
  teaching_subjects = VALUES(teaching_subjects),
  school_name = VALUES(school_name),
  school_address = VALUES(school_address),
  school_longitude = VALUES(school_longitude),
  school_latitude = VALUES(school_latitude),
  account_status = 'active';

SET @teacher01 = (SELECT teacher_id FROM teacher WHERE account = 'teacher01' LIMIT 1);
SET @teacher02 = (SELECT teacher_id FROM teacher WHERE account = 'teacher02' LIMIT 1);
SET @teacher03 = (SELECT teacher_id FROM teacher WHERE account = 'teacher03' LIMIT 1);
SET @teacher04 = (SELECT teacher_id FROM teacher WHERE account = 'teacher04' LIMIT 1);

-- ------------------------------------------------------------
-- 2. 班级与唯一邀请码
-- ------------------------------------------------------------
INSERT INTO class
  (grade_id, class_name, teacher_id, student_count, class_status, invite_code, invite_code_status, invite_code_expire_time)
VALUES
  (@grade1, '一年级一班', @teacher01, 0, 'active', 'C00001', 'active', NULL),
  (@grade1, '一年级二班', @teacher01, 0, 'active', 'C00002', 'active', NULL),
  (@grade2, '二年级一班', @teacher01, 0, 'active', 'C00003', 'active', NULL),
  (@grade1, '后期绑定测试班', @teacher02, 0, 'active', 'T2TEST', 'active', NULL),
  (@grade2, '二年级二班', @teacher03, 0, 'active', 'T3G2A1', 'active', NULL),
  (@grade3, '三年级一班', @teacher03, 0, 'active', 'T3G3A1', 'active', NULL),
  (@grade4, '四年级一班', @teacher04, 0, 'active', 'T4G4A1', 'active', NULL)
ON DUPLICATE KEY UPDATE
  grade_id = VALUES(grade_id),
  class_name = VALUES(class_name),
  teacher_id = VALUES(teacher_id),
  class_status = 'active',
  invite_code_status = 'active',
  invite_code_expire_time = NULL;

-- 无班主任的“待绑定班级”，用于承接预留学生；不分发邀请码。
INSERT INTO class
  (grade_id, class_name, teacher_id, student_count, class_status, invite_code, invite_code_status, invite_code_expire_time)
SELECT @grade1, '待绑定班级', NULL, 0, 'active', NULL, 'disabled', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM class
  WHERE grade_id = @grade1
    AND class_name = '待绑定班级'
    AND teacher_id IS NULL
);

SET @class_1_1 = (SELECT class_id FROM class WHERE teacher_id = @teacher01 AND class_name = '一年级一班' LIMIT 1);
SET @class_1_2 = (SELECT class_id FROM class WHERE teacher_id = @teacher01 AND class_name = '一年级二班' LIMIT 1);
SET @class_2_2 = (SELECT class_id FROM class WHERE teacher_id = @teacher03 AND class_name = '二年级二班' LIMIT 1);
SET @class_3_1 = (SELECT class_id FROM class WHERE teacher_id = @teacher03 AND class_name = '三年级一班' LIMIT 1);
SET @class_4_1 = (SELECT class_id FROM class WHERE teacher_id = @teacher04 AND class_name = '四年级一班' LIMIT 1);
SET @class_unbound = (
  SELECT class_id FROM class
  WHERE teacher_id IS NULL AND class_name = '待绑定班级' AND grade_id = @grade1
  LIMIT 1
);

-- ------------------------------------------------------------
-- 3. 学生演示数据
--    student03 保留在待绑定班级，可用于输入 T2TEST 测试后期绑定。
-- ------------------------------------------------------------
INSERT INTO student
  (account, password, name, class_id, grade_id, school_name, school_address, school_longitude, school_latitude, gender, current_level, total_problems, cumulative_correct_rate, account_status)
VALUES
  ('student01', @pwd, '小明', @class_1_1, @grade1, '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'male', 2, 80, 88.50, 'active'),
  ('student02', @pwd, '小红', @class_1_1, @grade1, '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'female', 2, 76, 91.20, 'active'),
  ('student03', @pwd, '小强', @class_unbound, @grade1, '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'male', 1, 12, 75.00, 'active'),
  ('student04', @pwd, '小云', @class_1_2, @grade1, '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'female', 1, 34, 82.40, 'active'),
  ('student05', @pwd, '小宇', @class_2_2, @grade2, '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'male', 3, 126, 89.70, 'active'),
  ('student06', @pwd, '小宁', @class_2_2, @grade2, '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'female', 3, 112, 86.30, 'active'),
  ('student07', @pwd, '小航', @class_3_1, @grade3, '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'male', 4, 168, 90.10, 'active'),
  ('student08', @pwd, '小雨', @class_4_1, @grade4, '河源高级中学', '广东省河源市源城区东环路', 114.7247900, 23.7232520, 'female', 5, 214, 92.60, 'active')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  class_id = VALUES(class_id),
  grade_id = VALUES(grade_id),
  school_name = VALUES(school_name),
  school_address = VALUES(school_address),
  school_longitude = VALUES(school_longitude),
  school_latitude = VALUES(school_latitude),
  gender = VALUES(gender),
  current_level = VALUES(current_level),
  total_problems = VALUES(total_problems),
  cumulative_correct_rate = VALUES(cumulative_correct_rate),
  account_status = 'active';

-- ------------------------------------------------------------
-- 4. 题目演示数据
-- ------------------------------------------------------------
CREATE TEMPORARY TABLE tmp_demo_problem (
  problem_content VARCHAR(500) NOT NULL,
  problem_type VARCHAR(30) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  difficulty_level TINYINT NOT NULL,
  standard_answer VARCHAR(100) NOT NULL
) ENGINE=MEMORY DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_demo_problem
  (problem_content, problem_type, operation_type, difficulty_level, standard_answer)
VALUES
  ('14 + 7 = ?', 'addition', '20以内进位加法', 2, '21'),
  ('18 + 9 = ?', 'addition', '20以内进位加法', 2, '27'),
  ('23 + 18 = ?', 'addition', '两位数加两位数', 4, '41'),
  ('36 + 27 = ?', 'addition', '两位数加两位数(进位)', 4, '63'),
  ('72 - 18 = ?', 'subtraction', '两位数减两位数(退位)', 4, '54'),
  ('63 - 29 = ?', 'subtraction', '两位数减两位数(退位)', 4, '34'),
  ('8 * 7 = ?', 'multiplication', '表内乘法', 5, '56'),
  ('9 * 6 = ?', 'multiplication', '表内乘法', 5, '54'),
  ('48 / 6 = ?', 'division', '表内除法', 5, '8'),
  ('72 / 9 = ?', 'division', '表内除法', 5, '8'),
  ('125 + 236 = ?', 'addition', '三位数加三位数', 6, '361'),
  ('402 - 178 = ?', 'subtraction', '三位数减三位数(退位)', 6, '224'),
  ('24 * 3 = ?', 'multiplication', '两位数乘一位数', 6, '72'),
  ('96 / 4 = ?', 'division', '两位数除一位数', 6, '24'),
  ('18 + 24 - 9 = ?', 'mixed', '加减混合', 4, '33'),
  ('7 * 8 - 16 = ?', 'mixed', '乘减混合', 6, '40'),
  ('45 / 5 + 27 = ?', 'mixed', '除加混合', 6, '36'),
  ('320 + 180 - 95 = ?', 'mixed', '三位数加减混合', 7, '405'),
  ('36 * 4 + 18 = ?', 'mixed', '乘加混合', 7, '162'),
  ('144 / 12 = ?', 'division', '整十整百除法拓展', 8, '12');

INSERT INTO problem
  (problem_content, problem_type, operation_type, difficulty_level, standard_answer, creator_id)
SELECT
  p.problem_content,
  p.problem_type,
  p.operation_type,
  p.difficulty_level,
  p.standard_answer,
  @teacher01
FROM tmp_demo_problem p
WHERE NOT EXISTS (
  SELECT 1
  FROM problem existed
  WHERE existed.problem_content COLLATE utf8mb4_unicode_ci = p.problem_content
    AND existed.standard_answer COLLATE utf8mb4_unicode_ci = p.standard_answer
);

DROP TEMPORARY TABLE tmp_demo_problem;

-- ------------------------------------------------------------
-- 5. 重新统计班级、年级人数
-- ------------------------------------------------------------
UPDATE class c
LEFT JOIN (
  SELECT class_id, COUNT(*) AS cnt
  FROM student
  WHERE account_status != 'banned'
  GROUP BY class_id
) s ON s.class_id = c.class_id
SET c.student_count = COALESCE(s.cnt, 0);

UPDATE grade g
LEFT JOIN (
  SELECT grade_id, COUNT(*) AS student_count
  FROM student
  WHERE account_status != 'banned'
  GROUP BY grade_id
) s ON s.grade_id = g.grade_id
LEFT JOIN (
  SELECT grade_id, COUNT(*) AS class_count
  FROM class
  WHERE class_status = 'active'
  GROUP BY grade_id
) c ON c.grade_id = g.grade_id
SET
  g.student_count = COALESCE(s.student_count, 0),
  g.class_count = COALESCE(c.class_count, 0);

COMMIT;

SELECT
  c.class_id,
  c.class_name,
  t.account AS teacher_account,
  c.student_count,
  c.invite_code,
  c.invite_code_status
FROM class c
LEFT JOIN teacher t ON t.teacher_id = c.teacher_id
ORDER BY c.class_id;

SELECT
  s.account AS student_account,
  s.name AS student_name,
  c.class_name,
  t.account AS teacher_account,
  c.invite_code
FROM student s
JOIN class c ON c.class_id = s.class_id
LEFT JOIN teacher t ON t.teacher_id = c.teacher_id
ORDER BY s.student_id;
