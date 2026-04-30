-- ============================================================
-- 小学数学口算分级训练系统 - 数据库初始化脚本
-- 数据库：oral_arithmetic
-- 字符集：utf8mb4 / utf8mb4_unicode_ci
-- 建表顺序：按外键依赖顺序，父表在前
-- ============================================================

CREATE DATABASE IF NOT EXISTS oral_arithmetic
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE oral_arithmetic;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. 年级表 grade（无外键依赖，最先建）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grade (
  grade_id      BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '年级ID',
  grade_name    VARCHAR(20)  NOT NULL UNIQUE            COMMENT '年级名称，如一年级',
  class_count   SMALLINT     DEFAULT 0                  COMMENT '班级数',
  student_count MEDIUMINT    DEFAULT 0                  COMMENT '学生总数',

  INDEX idx_grade_name (grade_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='年级信息表';


-- ------------------------------------------------------------
-- 2. 教师表 teacher（无外键依赖）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher (
  teacher_id        BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '教师ID',
  name              VARCHAR(50)  NOT NULL                   COMMENT '教师姓名',
  account           VARCHAR(50)  NOT NULL UNIQUE            COMMENT '登录账号',
  password          VARCHAR(255) NOT NULL                   COMMENT '密码（bcrypt加密）',
  email             VARCHAR(100)                            COMMENT '邮箱',
  phone             VARCHAR(20)                             COMMENT '手机号',
  teaching_subjects VARCHAR(100)                            COMMENT '教授科目',
  school_name       VARCHAR(100)                            COMMENT '学校名称',
  school_address    VARCHAR(255)                            COMMENT '学校地址',
  school_longitude  DECIMAL(10,7)                           COMMENT '学校经度',
  school_latitude   DECIMAL(10,7)                           COMMENT '学校纬度',
  created_date      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP  COMMENT '创建日期',
  account_status    ENUM('active','inactive','banned') DEFAULT 'active' COMMENT '账户状态',

  INDEX idx_account        (account),
  INDEX idx_account_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教师信息表';


-- ------------------------------------------------------------
-- 3. 班级表 class（依赖 grade, teacher）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class (
  class_id         BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '班级ID',
  grade_id         BIGINT       NOT NULL                   COMMENT '年级ID',
  class_name       VARCHAR(50)  NOT NULL                   COMMENT '班级名称',
  teacher_id       BIGINT                                  COMMENT '班主任ID',
  student_count    SMALLINT     DEFAULT 0                  COMMENT '学生数',
  created_date     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP  COMMENT '创建日期',
  class_status     ENUM('active','inactive') DEFAULT 'active' COMMENT '班级状态',
  invite_code             VARCHAR(10)  UNIQUE              COMMENT '班级邀请码',
  invite_code_status      ENUM('active','disabled') DEFAULT 'active'
                                                               COMMENT '邀请码状态',
  invite_code_expire_time DATETIME                          COMMENT '邀请码过期时间',
  avg_level        DECIMAL(4,2) DEFAULT 0.00               COMMENT '班级平均等级',
  avg_correct_rate DECIMAL(5,2) DEFAULT 0.00               COMMENT '班级平均正确率(%)',

  INDEX idx_grade_id    (grade_id),
  INDEX idx_class_status(class_status),
  INDEX idx_invite_code (invite_code),
  FOREIGN KEY (grade_id)   REFERENCES grade(grade_id),
  FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级信息表';


-- ------------------------------------------------------------
-- 4. 学生表 student（依赖 class, grade）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student (
  student_id            BIGINT         PRIMARY KEY AUTO_INCREMENT COMMENT '学生ID',
  account               VARCHAR(50)    NOT NULL UNIQUE            COMMENT '账号',
  password              VARCHAR(255)   NOT NULL                   COMMENT '密码（bcrypt加密）',
  name                  VARCHAR(50)    NOT NULL                   COMMENT '姓名',
  class_id              BIGINT         NOT NULL                   COMMENT '班级ID',
  grade_id              BIGINT         NOT NULL                   COMMENT '年级ID',
  school_name           VARCHAR(100)                              COMMENT '学校名称',
  school_address        VARCHAR(255)                              COMMENT '学校地址',
  school_longitude      DECIMAL(10,7)                             COMMENT '学校经度',
  school_latitude       DECIMAL(10,7)                             COMMENT '学校纬度',
  gender                ENUM('male','female','unknown')           COMMENT '性别',
  birth_date            DATE                                      COMMENT '出生日期',
  register_date         TIMESTAMP      DEFAULT CURRENT_TIMESTAMP  COMMENT '注册日期',
  last_login_time       TIMESTAMP                                 COMMENT '最后登录时间',
  current_level         TINYINT        DEFAULT 1                  COMMENT '当前等级（1-10）',
  total_problems        MEDIUMINT      DEFAULT 0                  COMMENT '总训练题数',
  cumulative_correct_rate DECIMAL(5,2) DEFAULT 0.00              COMMENT '累计正确率(%)',
  account_status        ENUM('active','inactive','banned') DEFAULT 'active' COMMENT '账户状态',

  INDEX idx_class_id      (class_id),
  INDEX idx_current_level (current_level),
  INDEX idx_register_date (register_date),
  FOREIGN KEY (class_id)  REFERENCES class(class_id),
  FOREIGN KEY (grade_id)  REFERENCES grade(grade_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生信息表';


-- ------------------------------------------------------------
-- 5. 题库表 problem（creator_id 为软引用，不加强制外键）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS problem (
  problem_id      BIGINT        PRIMARY KEY AUTO_INCREMENT COMMENT '题目ID',
  problem_content VARCHAR(500)  NOT NULL                   COMMENT '题目内容，如 12 + 8 = ?',
  problem_type    ENUM('addition','subtraction','multiplication','division','mixed')
                                                           COMMENT '题目类型',
  operation_type  VARCHAR(50)                              COMMENT '运算形式（细分类型）',
  difficulty_level TINYINT      NOT NULL DEFAULT 1         COMMENT '难度等级（1-10）',
  standard_answer VARCHAR(100)  NOT NULL                   COMMENT '标准答案',
  solution_steps  TEXT                                     COMMENT '详细解答步骤（JSON）',
  creator_id      BIGINT                                   COMMENT '创建者ID（教师）',
  create_date     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP  COMMENT '创建日期',
  enable_status   ENUM('enabled','disabled') DEFAULT 'enabled' COMMENT '启用状态',
  usage_frequency MEDIUMINT     DEFAULT 0                  COMMENT '使用次数',
  error_index     DECIMAL(5,2)  DEFAULT 0.00               COMMENT '错误指数(0-100)',

  INDEX idx_difficulty_level (difficulty_level),
  INDEX idx_problem_type     (problem_type),
  INDEX idx_enable_status    (enable_status),
  INDEX idx_error_index      (error_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题库表';


-- ------------------------------------------------------------
-- 6. 训练记录表 training_record（依赖 student, problem）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_record (
  record_id           BIGINT      PRIMARY KEY AUTO_INCREMENT COMMENT '训练记录ID',
  student_id          BIGINT      NOT NULL                   COMMENT '学生ID',
  problem_id          BIGINT      NOT NULL                   COMMENT '题目ID',
  answer_content      VARCHAR(100) NOT NULL                  COMMENT '学生答案',
  is_correct          BOOLEAN     NOT NULL                   COMMENT '是否正确',
  answer_time_seconds SMALLINT    NOT NULL                   COMMENT '答题用时（秒）',
  answer_date         DATETIME    NOT NULL                   COMMENT '答题时间',
  score               TINYINT     DEFAULT 0                  COMMENT '得分（0或满分）',
  is_review           BOOLEAN     DEFAULT FALSE              COMMENT '是否为复习重做',
  session_id          VARCHAR(50)                            COMMENT '会话ID',
  created_time        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP  COMMENT '记录创建时间',

  INDEX idx_student_id  (student_id),
  INDEX idx_problem_id  (problem_id),
  INDEX idx_answer_date (answer_date),
  INDEX idx_session_id  (session_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id),
  FOREIGN KEY (problem_id) REFERENCES problem(problem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='训练记录表';


-- ------------------------------------------------------------
-- 7. 错题库表 mistake_book（依赖 student, problem）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mistake_book (
  mistake_id       BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '错题ID',
  student_id       BIGINT       NOT NULL                   COMMENT '学生ID',
  problem_id       BIGINT       NOT NULL                   COMMENT '题目ID',
  standard_answer  VARCHAR(100) NOT NULL                   COMMENT '标准答案',
  student_answer   VARCHAR(100) NOT NULL                   COMMENT '学生首次错误答案',
  first_wrong_date DATETIME     NOT NULL                   COMMENT '首次做错日期',
  last_wrong_date  DATETIME                                COMMENT '最后做错日期',
  wrong_count      SMALLINT     DEFAULT 1                  COMMENT '做错次数（累计）',
  is_corrected     BOOLEAN      DEFAULT FALSE              COMMENT '是否已改正',
  corrected_date   DATETIME                                COMMENT '改正日期',
  error_reason     VARCHAR(255)                            COMMENT '错误原因分类',

  INDEX idx_student_id       (student_id),
  INDEX idx_problem_id       (problem_id),
  INDEX idx_first_wrong_date (first_wrong_date),
  INDEX idx_is_corrected     (is_corrected),
  UNIQUE KEY uk_student_problem (student_id, problem_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id),
  FOREIGN KEY (problem_id) REFERENCES problem(problem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='错题库表';


-- ------------------------------------------------------------
-- 8. 用户等级表 student_level（1:1 依赖 student）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_level (
  student_id              BIGINT      PRIMARY KEY           COMMENT '学生ID（主键+外键）',
  current_level           TINYINT     NOT NULL DEFAULT 1    COMMENT '当前等级（1-10）',
  promotion_date          DATETIME                          COMMENT '最后晋升日期',
  correct_problems        MEDIUMINT   DEFAULT 0             COMMENT '正确题数（最近评估）',
  wrong_problems          MEDIUMINT   DEFAULT 0             COMMENT '错误题数（最近评估）',
  recent_20_correct_rate  DECIMAL(5,2) DEFAULT 0.00         COMMENT '最近20题正确率(%)',
  is_promotion_qualified  BOOLEAN     DEFAULT FALSE         COMMENT '是否满足晋升条件',

  FOREIGN KEY (student_id) REFERENCES student(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生等级表（1对1）';


-- ------------------------------------------------------------
-- 9. 学习统计表 learning_statistic（依赖 student）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_statistic (
  statistic_id               BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '统计记录ID',
  student_id                 BIGINT       NOT NULL                   COMMENT '学生ID',
  statistic_date             DATE         NOT NULL                   COMMENT '统计日期',
  daily_problems             SMALLINT     DEFAULT 0                  COMMENT '当日训练题数',
  daily_correct              SMALLINT     DEFAULT 0                  COMMENT '当日正确题数',
  daily_wrong                SMALLINT     DEFAULT 0                  COMMENT '当日错误题数',
  daily_correct_rate         DECIMAL(5,2) DEFAULT 0.00               COMMENT '当日正确率(%)',
  daily_avg_time             DECIMAL(6,2) DEFAULT 0.00               COMMENT '当日平均答题时间(秒)',
  daily_study_duration       SMALLINT     DEFAULT 0                  COMMENT '当日学习时长(分钟)',
  addition_correct_rate      DECIMAL(5,2) DEFAULT 0.00               COMMENT '加法正确率(%)',
  subtraction_correct_rate   DECIMAL(5,2) DEFAULT 0.00               COMMENT '减法正确率(%)',
  multiplication_correct_rate DECIMAL(5,2) DEFAULT 0.00              COMMENT '乘法正确率(%)',
  division_correct_rate      DECIMAL(5,2) DEFAULT 0.00               COMMENT '除法正确率(%)',
  mixed_operation_correct_rate DECIMAL(5,2) DEFAULT 0.00             COMMENT '混合运算正确率(%)',

  INDEX idx_student_id    (student_id),
  INDEX idx_statistic_date(statistic_date),
  UNIQUE KEY uk_student_date (student_id, statistic_date),
  FOREIGN KEY (student_id) REFERENCES student(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习统计表（按日期）';


-- ------------------------------------------------------------
-- 10. 系统配置表 system_config（无外键依赖）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_config (
  config_id    BIGINT       PRIMARY KEY AUTO_INCREMENT            COMMENT '配置ID',
  config_key   VARCHAR(100) NOT NULL UNIQUE                       COMMENT '配置键',
  config_value VARCHAR(500) NOT NULL                              COMMENT '配置值',
  config_type  VARCHAR(20)                                        COMMENT '配置类型',
  config_desc  VARCHAR(255)                                       COMMENT '配置描述',
  is_editable  BOOLEAN      DEFAULT TRUE                          COMMENT '是否可编辑',
  update_date  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
               ON UPDATE CURRENT_TIMESTAMP                        COMMENT '更新时间',

  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

SET FOREIGN_KEY_CHECKS = 1;
