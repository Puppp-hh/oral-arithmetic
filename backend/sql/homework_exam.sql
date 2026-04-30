-- ============================================================
-- 作业 + 考试模块新增表
-- 依赖：student、teacher、problem 表已存在
-- ============================================================

USE oral_arithmetic;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. 作业表 homework
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homework (
  homework_id      BIGINT       PRIMARY KEY AUTO_INCREMENT,
  teacher_id       BIGINT       NOT NULL,
  title            VARCHAR(100) NOT NULL,
  problem_count    SMALLINT     NOT NULL DEFAULT 10,
  difficulty_level TINYINT      NOT NULL DEFAULT 1,
  operation_type   VARCHAR(50)  NOT NULL,
  deadline         DATETIME     NOT NULL,
  status           ENUM('active','expired') DEFAULT 'active',
  create_time      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_teacher_id (teacher_id),
  INDEX idx_deadline   (deadline),
  FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业表';

-- ------------------------------------------------------------
-- 2. 作业-题目关联表 homework_problem
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homework_problem (
  id           BIGINT  PRIMARY KEY AUTO_INCREMENT,
  homework_id  BIGINT  NOT NULL,
  problem_id   BIGINT  NOT NULL,
  order_index  SMALLINT DEFAULT 0,

  INDEX idx_homework_id (homework_id),
  UNIQUE KEY uk_hw_prob (homework_id, problem_id),
  FOREIGN KEY (homework_id) REFERENCES homework(homework_id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id)  REFERENCES problem(problem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业-题目关联';

-- ------------------------------------------------------------
-- 3. 作业-学生分配表 homework_student
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homework_student (
  id          BIGINT  PRIMARY KEY AUTO_INCREMENT,
  homework_id BIGINT  NOT NULL,
  student_id  BIGINT  NOT NULL,

  UNIQUE KEY uk_hw_stu (homework_id, student_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (homework_id) REFERENCES homework(homework_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id)  REFERENCES student(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业-学生分配';

-- ------------------------------------------------------------
-- 4. 作业提交记录 homework_submission
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homework_submission (
  submission_id BIGINT       PRIMARY KEY AUTO_INCREMENT,
  homework_id   BIGINT       NOT NULL,
  student_id    BIGINT       NOT NULL,
  submitted_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  score         DECIMAL(5,2) DEFAULT 0,
  correct_count SMALLINT     DEFAULT 0,
  total         SMALLINT     DEFAULT 0,
  correct_rate  DECIMAL(5,2) DEFAULT 0,
  detail        TEXT                       COMMENT 'JSON: {problem_id: {answer_content, is_correct}}',

  UNIQUE KEY uk_hw_stu_sub (homework_id, student_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (homework_id) REFERENCES homework(homework_id),
  FOREIGN KEY (student_id)  REFERENCES student(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业提交记录';

-- ------------------------------------------------------------
-- 5. 试卷表 exam_paper
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_paper (
  paper_id         BIGINT       PRIMARY KEY AUTO_INCREMENT,
  teacher_id       BIGINT       NOT NULL,
  title            VARCHAR(100) NOT NULL,
  problem_count    SMALLINT     NOT NULL DEFAULT 10,
  difficulty_level TINYINT      NOT NULL DEFAULT 1,
  operation_type   VARCHAR(50)  NOT NULL,
  create_time      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_teacher_id (teacher_id),
  FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='试卷表';

-- ------------------------------------------------------------
-- 6. 试卷-题目关联 exam_paper_problem
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_paper_problem (
  id          BIGINT   PRIMARY KEY AUTO_INCREMENT,
  paper_id    BIGINT   NOT NULL,
  problem_id  BIGINT   NOT NULL,
  score       SMALLINT DEFAULT 2,
  order_index SMALLINT DEFAULT 0,

  UNIQUE KEY uk_paper_prob (paper_id, problem_id),
  INDEX idx_paper_id (paper_id),
  FOREIGN KEY (paper_id)   REFERENCES exam_paper(paper_id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problem(problem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='试卷-题目关联';

-- ------------------------------------------------------------
-- 7. 考试表 exam
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam (
  exam_id          BIGINT       PRIMARY KEY AUTO_INCREMENT,
  paper_id         BIGINT       NOT NULL,
  teacher_id       BIGINT       NOT NULL,
  title            VARCHAR(100) NOT NULL,
  start_time       DATETIME     NOT NULL,
  end_time         DATETIME     NOT NULL,
  duration_minutes SMALLINT     NOT NULL DEFAULT 30,
  status           ENUM('draft','published','finished') DEFAULT 'published',
  problem_count    SMALLINT     DEFAULT 0,
  total_score      SMALLINT     DEFAULT 0,
  create_time      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_teacher_id (teacher_id),
  INDEX idx_status     (status),
  FOREIGN KEY (paper_id)   REFERENCES exam_paper(paper_id),
  FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试表';

-- ------------------------------------------------------------
-- 8. 考试-学生分配 exam_student
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_student (
  id         BIGINT  PRIMARY KEY AUTO_INCREMENT,
  exam_id    BIGINT  NOT NULL,
  student_id BIGINT  NOT NULL,

  UNIQUE KEY uk_exam_stu (exam_id, student_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (exam_id)    REFERENCES exam(exam_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试-学生分配';

-- ------------------------------------------------------------
-- 9. 考试提交记录 exam_submission
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_submission (
  submission_id BIGINT       PRIMARY KEY AUTO_INCREMENT,
  exam_id       BIGINT       NOT NULL,
  student_id    BIGINT       NOT NULL,
  submitted_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  score         DECIMAL(5,2) DEFAULT 0,
  total_score   SMALLINT     DEFAULT 0,
  correct_count SMALLINT     DEFAULT 0,
  total_count   SMALLINT     DEFAULT 0,
  correct_rate  DECIMAL(5,2) DEFAULT 0,

  detail        TEXT                       COMMENT 'JSON: [{problem_id, student_answer, standard_answer, is_correct}]',

  UNIQUE KEY uk_exam_stu_sub (exam_id, student_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (exam_id)    REFERENCES exam(exam_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试提交记录';

SET FOREIGN_KEY_CHECKS = 1;
