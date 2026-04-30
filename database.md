# 小学数学口算分级训练系统数据库说明书

## 1. 文档说明

本文档说明“小学数学口算分级训练系统”的数据库设计、核心表结构、表关系、初始化脚本和维护约束。

当前数据库以 `backend/sql/schema.sql`、`backend/sql/homework_exam.sql` 及相关迁移脚本为准，适用于本项目当前版本：

- 后端：Node.js + Express + TypeScript
- 数据库：MySQL
- 缓存/削峰：Redis
- 字符集：`utf8mb4`
- 排序规则：`utf8mb4_unicode_ci`
- 默认数据库名：`oral_arithmetic`

## 2. SQL 文件说明

项目 SQL 文件统一放在 `backend/sql/` 目录下。

| 文件 | 用途 | 是否建议提交 |
| --- | --- | --- |
| `schema.sql` | 创建核心基础表：年级、教师、班级、学生、题库、训练记录、错题本、等级、统计、系统配置 | 是 |
| `seed.sql` | 初始化年级、系统配置和基础题库样本 | 是 |
| `homework_exam.sql` | 创建作业、试卷、考试、提交记录等模块表 | 是 |
| `migrate_invite_code.sql` | 为教师、班级补充学校信息和班级邀请码字段 | 是 |
| `migrate_school_fields.sql` | 为学生补充学校信息字段，并统一演示学校数据 | 是 |
| `demo_invite_class_problem_seed.sql` | 初始化演示教师、班级、邀请码、学生和题目数据 | 是 |
| `demo_homework_exam_seed.sql` | 初始化演示作业和考试数据 | 是 |
| `demo_invite_binding.sql` | 辅助演示邀请码绑定关系 | 是 |
| `*.session.sql` | 数据库工具会话文件 | 否 |

推荐首次初始化顺序：

```sql
SOURCE backend/sql/schema.sql;
SOURCE backend/sql/seed.sql;
SOURCE backend/sql/homework_exam.sql;
SOURCE backend/sql/demo_invite_class_problem_seed.sql;
SOURCE backend/sql/demo_homework_exam_seed.sql;
```

如果是在旧库上升级，先备份数据库，再按需要执行迁移脚本：

```sql
SOURCE backend/sql/migrate_invite_code.sql;
SOURCE backend/sql/migrate_school_fields.sql;
```

## 3. 数据库整体设计

系统围绕“教师创建班级、学生通过邀请码加入班级、学生完成训练/作业/考试、系统沉淀错题和统计数据”展开。

核心实体：

- 教师：负责注册、创建班级、布置作业、发布考试、查看学生和班级统计。
- 班级：属于教师，邀请码属于班级，不属于教师。
- 学生：通过班级邀请码注册或绑定班级，真实绑定关系存储在 `student.class_id`。
- 题库：存储可复用口算题，也支持后端按难度动态生成题目后入库。
- 训练记录：记录学生每一次口算训练答题行为。
- 错题本：记录学生做错的题目、错误次数和是否已掌握。
- 作业：教师从题库或动态生成题目后布置给学生。
- 考试：教师创建试卷，再发布考试并分配给学生。
- 学习统计：按天统计学生训练表现。

简化关系图：

```text
teacher 1 ---- N class 1 ---- N student
                         |
                         | 1
                         N
                 training_record N ---- 1 problem
                         |
student 1 ---- N mistake_book N ---- 1 problem

teacher 1 ---- N homework 1 ---- N homework_problem N ---- 1 problem
homework 1 ---- N homework_student N ---- 1 student
homework 1 ---- N homework_submission N ---- 1 student

teacher 1 ---- N exam_paper 1 ---- N exam_paper_problem N ---- 1 problem
exam_paper 1 ---- N exam
exam 1 ---- N exam_student N ---- 1 student
exam 1 ---- N exam_submission N ---- 1 student

student 1 ---- 1 student_level
student 1 ---- N learning_statistic
grade 1 ---- N class
grade 1 ---- N student
```

## 4. 核心业务规则

### 4.1 邀请码规则

邀请码字段位于 `class` 表：

- `class.invite_code`：班级邀请码，全局唯一。
- `class.invite_code_status`：邀请码状态，`active` 表示可用，`disabled` 表示停用。
- `class.invite_code_expire_time`：过期时间，`NULL` 表示长期有效。

重要规则：

1. 邀请码属于班级，不属于老师。
2. 一个班级最多对应一个当前邀请码。
3. 学生注册时通过邀请码查找班级。
4. 学生注册成功后，绑定关系写入 `student.class_id`。
5. 后续刷新或变更邀请码，不影响已经绑定的学生。
6. 删除班级前必须确认班级内有效学生数为 0。

### 4.2 学校字段规则

教师和学生均保存学校信息：

- `school_name`
- `school_address`
- `school_longitude`
- `school_latitude`

教师注册时可通过高德地图联想选择学校。学生通过邀请码注册时，可以继承对应班级教师的学校信息。

### 4.3 作业/考试分配规则

作业、考试支持按学生或按班级分配。数据库中不在 `homework` 或 `exam` 主表直接保存班级 ID，而是由服务层根据 `class_ids` 查询学生列表，然后写入分配表：

- 作业分配：`homework_student`
- 考试分配：`exam_student`

这样可以保留每个学生收到作业/考试时的分配快照，后续学生转班不影响历史作业或考试记录。

### 4.4 训练与错题规则

训练记录写入 `training_record`。学生答错后写入或更新 `mistake_book`：

- 同一学生同一道题在错题本中唯一，对应唯一键 `uk_student_problem(student_id, problem_id)`。
- 再次做错时更新 `wrong_count` 和 `last_wrong_date`。
- 已掌握状态由 `is_corrected` 标识。

后端可结合 Redis 缓存训练过程中的临时错题数据，再批量落库，用于降低高频训练接口对 MySQL 的压力。

## 5. 表结构说明

### 5.1 `grade` 年级表

存储一至六年级基础信息。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `grade_id` | BIGINT PK AUTO_INCREMENT | 年级 ID |
| `grade_name` | VARCHAR(20) UNIQUE NOT NULL | 年级名称 |
| `class_count` | SMALLINT | 班级数 |
| `student_count` | MEDIUMINT | 学生总数 |

索引：

- `idx_grade_name(grade_name)`

### 5.2 `teacher` 教师表

存储教师账号、联系方式和学校信息。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `teacher_id` | BIGINT PK AUTO_INCREMENT | 教师 ID |
| `name` | VARCHAR(50) NOT NULL | 教师姓名 |
| `account` | VARCHAR(50) UNIQUE NOT NULL | 登录账号 |
| `password` | VARCHAR(255) NOT NULL | bcrypt 加密密码 |
| `email` | VARCHAR(100) | 邮箱 |
| `phone` | VARCHAR(20) | 手机号 |
| `teaching_subjects` | VARCHAR(100) | 教授科目 |
| `school_name` | VARCHAR(100) | 学校名称 |
| `school_address` | VARCHAR(255) | 学校地址 |
| `school_longitude` | DECIMAL(10,7) | 学校经度 |
| `school_latitude` | DECIMAL(10,7) | 学校纬度 |
| `created_date` | TIMESTAMP | 创建时间 |
| `account_status` | ENUM | `active` / `inactive` / `banned` |

索引：

- `idx_account(account)`
- `idx_account_status(account_status)`

### 5.3 `class` 班级表

存储班级信息、所属教师、年级和邀请码。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `class_id` | BIGINT PK AUTO_INCREMENT | 班级 ID |
| `grade_id` | BIGINT NOT NULL FK | 年级 ID |
| `class_name` | VARCHAR(50) NOT NULL | 班级名称 |
| `teacher_id` | BIGINT FK | 班主任/创建教师 ID |
| `student_count` | SMALLINT | 学生数 |
| `created_date` | TIMESTAMP | 创建时间 |
| `class_status` | ENUM | `active` / `inactive` |
| `invite_code` | VARCHAR(10) UNIQUE | 班级邀请码 |
| `invite_code_status` | ENUM | `active` / `disabled` |
| `invite_code_expire_time` | DATETIME | 邀请码过期时间 |
| `avg_level` | DECIMAL(4,2) | 班级平均等级 |
| `avg_correct_rate` | DECIMAL(5,2) | 班级平均正确率 |

外键：

- `grade_id` 引用 `grade(grade_id)`
- `teacher_id` 引用 `teacher(teacher_id)`

索引：

- `idx_grade_id(grade_id)`
- `idx_class_status(class_status)`
- `idx_invite_code(invite_code)`

### 5.4 `student` 学生表

存储学生账号、班级、年级、学校和学习概况。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `student_id` | BIGINT PK AUTO_INCREMENT | 学生 ID |
| `account` | VARCHAR(50) UNIQUE NOT NULL | 登录账号 |
| `password` | VARCHAR(255) NOT NULL | bcrypt 加密密码 |
| `name` | VARCHAR(50) NOT NULL | 学生姓名 |
| `class_id` | BIGINT NOT NULL FK | 当前班级 ID |
| `grade_id` | BIGINT NOT NULL FK | 当前年级 ID |
| `school_name` | VARCHAR(100) | 学校名称 |
| `school_address` | VARCHAR(255) | 学校地址 |
| `school_longitude` | DECIMAL(10,7) | 学校经度 |
| `school_latitude` | DECIMAL(10,7) | 学校纬度 |
| `gender` | ENUM | `male` / `female` / `unknown` |
| `birth_date` | DATE | 出生日期 |
| `register_date` | TIMESTAMP | 注册时间 |
| `last_login_time` | TIMESTAMP | 最后登录时间 |
| `current_level` | TINYINT | 当前训练等级 |
| `total_problems` | MEDIUMINT | 累计训练题数 |
| `cumulative_correct_rate` | DECIMAL(5,2) | 累计正确率 |
| `account_status` | ENUM | `active` / `inactive` / `banned` |

外键：

- `class_id` 引用 `class(class_id)`
- `grade_id` 引用 `grade(grade_id)`

索引：

- `idx_class_id(class_id)`
- `idx_current_level(current_level)`
- `idx_register_date(register_date)`

### 5.5 `problem` 题库表

存储系统题库题目。后端训练、作业、考试均可复用该表题目。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `problem_id` | BIGINT PK AUTO_INCREMENT | 题目 ID |
| `problem_content` | VARCHAR(500) NOT NULL | 题目内容 |
| `problem_type` | ENUM | `addition` / `subtraction` / `multiplication` / `division` / `mixed` |
| `operation_type` | VARCHAR(50) | 运算细分类型 |
| `difficulty_level` | TINYINT NOT NULL | 难度等级 |
| `standard_answer` | VARCHAR(100) NOT NULL | 标准答案 |
| `solution_steps` | TEXT | 解题步骤，通常为 JSON |
| `creator_id` | BIGINT | 创建者 ID，软引用教师 |
| `create_date` | TIMESTAMP | 创建时间 |
| `enable_status` | ENUM | `enabled` / `disabled` |
| `usage_frequency` | MEDIUMINT | 使用次数 |
| `error_index` | DECIMAL(5,2) | 易错指数 |

索引：

- `idx_difficulty_level(difficulty_level)`
- `idx_problem_type(problem_type)`
- `idx_enable_status(enable_status)`
- `idx_error_index(error_index)`

### 5.6 `training_record` 训练记录表

记录学生每次口算训练答题行为。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `record_id` | BIGINT PK AUTO_INCREMENT | 训练记录 ID |
| `student_id` | BIGINT NOT NULL FK | 学生 ID |
| `problem_id` | BIGINT NOT NULL FK | 题目 ID |
| `answer_content` | VARCHAR(100) NOT NULL | 学生答案 |
| `is_correct` | BOOLEAN NOT NULL | 是否正确 |
| `answer_time_seconds` | SMALLINT NOT NULL | 答题耗时 |
| `answer_date` | DATETIME NOT NULL | 答题时间 |
| `score` | TINYINT | 得分 |
| `is_review` | BOOLEAN | 是否复习重做 |
| `session_id` | VARCHAR(50) | 训练会话 ID |
| `created_time` | TIMESTAMP | 创建时间 |

外键：

- `student_id` 引用 `student(student_id)`
- `problem_id` 引用 `problem(problem_id)`

### 5.7 `mistake_book` 错题本表

记录学生错题和掌握情况。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `mistake_id` | BIGINT PK AUTO_INCREMENT | 错题 ID |
| `student_id` | BIGINT NOT NULL FK | 学生 ID |
| `problem_id` | BIGINT NOT NULL FK | 题目 ID |
| `standard_answer` | VARCHAR(100) NOT NULL | 标准答案 |
| `student_answer` | VARCHAR(100) NOT NULL | 学生首次错误答案 |
| `first_wrong_date` | DATETIME NOT NULL | 首次做错时间 |
| `last_wrong_date` | DATETIME | 最近做错时间 |
| `wrong_count` | SMALLINT | 做错次数 |
| `is_corrected` | BOOLEAN | 是否已掌握/已改正 |
| `corrected_date` | DATETIME | 改正时间 |
| `error_reason` | VARCHAR(255) | 错误原因 |

约束：

- `uk_student_problem(student_id, problem_id)`：同一学生同一道题只保留一条错题记录。

### 5.8 `student_level` 学生等级表

维护学生等级评估信息，与学生一对一。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `student_id` | BIGINT PK FK | 学生 ID |
| `current_level` | TINYINT | 当前等级 |
| `promotion_date` | DATETIME | 最近晋升时间 |
| `correct_problems` | MEDIUMINT | 最近评估正确题数 |
| `wrong_problems` | MEDIUMINT | 最近评估错误题数 |
| `recent_20_correct_rate` | DECIMAL(5,2) | 最近 20 题正确率 |
| `is_promotion_qualified` | BOOLEAN | 是否满足晋升条件 |

### 5.9 `learning_statistic` 学习统计表

按日期汇总学生训练表现。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `statistic_id` | BIGINT PK AUTO_INCREMENT | 统计 ID |
| `student_id` | BIGINT NOT NULL FK | 学生 ID |
| `statistic_date` | DATE NOT NULL | 统计日期 |
| `daily_problems` | SMALLINT | 当日题数 |
| `daily_correct` | SMALLINT | 当日正确题数 |
| `daily_wrong` | SMALLINT | 当日错误题数 |
| `daily_correct_rate` | DECIMAL(5,2) | 当日正确率 |
| `daily_avg_time` | DECIMAL(6,2) | 平均耗时 |
| `daily_study_duration` | SMALLINT | 学习时长，分钟 |
| `addition_correct_rate` | DECIMAL(5,2) | 加法正确率 |
| `subtraction_correct_rate` | DECIMAL(5,2) | 减法正确率 |
| `multiplication_correct_rate` | DECIMAL(5,2) | 乘法正确率 |
| `division_correct_rate` | DECIMAL(5,2) | 除法正确率 |
| `mixed_operation_correct_rate` | DECIMAL(5,2) | 混合运算正确率 |

约束：

- `uk_student_date(student_id, statistic_date)`：同一学生同一天只保留一条统计。

### 5.10 `system_config` 系统配置表

存储升级阈值、训练题数等可配置项。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `config_id` | BIGINT PK AUTO_INCREMENT | 配置 ID |
| `config_key` | VARCHAR(100) UNIQUE NOT NULL | 配置键 |
| `config_value` | VARCHAR(500) NOT NULL | 配置值 |
| `config_type` | VARCHAR(20) | 配置类型 |
| `config_desc` | VARCHAR(255) | 配置说明 |
| `is_editable` | BOOLEAN | 是否可编辑 |
| `update_date` | TIMESTAMP | 更新时间 |

## 6. 作业模块表

### 6.1 `homework` 作业表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `homework_id` | BIGINT PK AUTO_INCREMENT | 作业 ID |
| `teacher_id` | BIGINT NOT NULL FK | 发布教师 |
| `title` | VARCHAR(100) NOT NULL | 作业标题 |
| `problem_count` | SMALLINT | 题目数量 |
| `difficulty_level` | TINYINT | 难度 |
| `operation_type` | VARCHAR(50) | 题型 |
| `deadline` | DATETIME NOT NULL | 截止时间 |
| `status` | ENUM | `active` / `expired` |
| `create_time` | TIMESTAMP | 创建时间 |

### 6.2 `homework_problem` 作业题目表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | BIGINT PK AUTO_INCREMENT | 主键 |
| `homework_id` | BIGINT NOT NULL FK | 作业 ID |
| `problem_id` | BIGINT NOT NULL FK | 题目 ID |
| `order_index` | SMALLINT | 题目顺序 |

约束：

- `uk_hw_prob(homework_id, problem_id)`
- `homework_id` 删除时级联删除关联题目。

### 6.3 `homework_student` 作业学生分配表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | BIGINT PK AUTO_INCREMENT | 主键 |
| `homework_id` | BIGINT NOT NULL FK | 作业 ID |
| `student_id` | BIGINT NOT NULL FK | 学生 ID |

约束：

- `uk_hw_stu(homework_id, student_id)`

### 6.4 `homework_submission` 作业提交表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `submission_id` | BIGINT PK AUTO_INCREMENT | 提交 ID |
| `homework_id` | BIGINT NOT NULL FK | 作业 ID |
| `student_id` | BIGINT NOT NULL FK | 学生 ID |
| `submitted_at` | TIMESTAMP | 提交时间 |
| `score` | DECIMAL(5,2) | 得分 |
| `correct_count` | SMALLINT | 正确题数 |
| `total` | SMALLINT | 总题数 |
| `correct_rate` | DECIMAL(5,2) | 正确率 |
| `detail` | TEXT | 提交详情 JSON |

约束：

- `uk_hw_stu_sub(homework_id, student_id)`：每个学生每份作业只能提交一次。

## 7. 考试模块表

### 7.1 `exam_paper` 试卷表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `paper_id` | BIGINT PK AUTO_INCREMENT | 试卷 ID |
| `teacher_id` | BIGINT NOT NULL FK | 创建教师 |
| `title` | VARCHAR(100) NOT NULL | 试卷标题 |
| `problem_count` | SMALLINT | 题目数量 |
| `difficulty_level` | TINYINT | 难度 |
| `operation_type` | VARCHAR(50) | 题型 |
| `create_time` | TIMESTAMP | 创建时间 |

### 7.2 `exam_paper_problem` 试卷题目表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | BIGINT PK AUTO_INCREMENT | 主键 |
| `paper_id` | BIGINT NOT NULL FK | 试卷 ID |
| `problem_id` | BIGINT NOT NULL FK | 题目 ID |
| `score` | SMALLINT | 单题分值 |
| `order_index` | SMALLINT | 题目顺序 |

约束：

- `uk_paper_prob(paper_id, problem_id)`
- `paper_id` 删除时级联删除关联题目。

### 7.3 `exam` 考试表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `exam_id` | BIGINT PK AUTO_INCREMENT | 考试 ID |
| `paper_id` | BIGINT NOT NULL FK | 试卷 ID |
| `teacher_id` | BIGINT NOT NULL FK | 发布教师 |
| `title` | VARCHAR(100) NOT NULL | 考试标题 |
| `start_time` | DATETIME NOT NULL | 开始时间 |
| `end_time` | DATETIME NOT NULL | 结束时间 |
| `duration_minutes` | SMALLINT | 考试时长 |
| `status` | ENUM | `draft` / `published` / `finished` |
| `problem_count` | SMALLINT | 题目数快照 |
| `total_score` | SMALLINT | 总分快照 |
| `create_time` | TIMESTAMP | 创建时间 |

### 7.4 `exam_student` 考试学生分配表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | BIGINT PK AUTO_INCREMENT | 主键 |
| `exam_id` | BIGINT NOT NULL FK | 考试 ID |
| `student_id` | BIGINT NOT NULL FK | 学生 ID |

约束：

- `uk_exam_stu(exam_id, student_id)`

### 7.5 `exam_submission` 考试提交表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `submission_id` | BIGINT PK AUTO_INCREMENT | 提交 ID |
| `exam_id` | BIGINT NOT NULL FK | 考试 ID |
| `student_id` | BIGINT NOT NULL FK | 学生 ID |
| `submitted_at` | TIMESTAMP | 提交时间 |
| `score` | DECIMAL(5,2) | 得分 |
| `total_score` | SMALLINT | 总分 |
| `correct_count` | SMALLINT | 正确题数 |
| `total_count` | SMALLINT | 总题数 |
| `correct_rate` | DECIMAL(5,2) | 正确率 |
| `detail` | TEXT | 提交详情 JSON |

约束：

- `uk_exam_stu_sub(exam_id, student_id)`：每个学生每场考试只能提交一次。

## 8. 关键索引与约束

| 表 | 关键约束/索引 | 作用 |
| --- | --- | --- |
| `teacher` | `account UNIQUE` | 防止教师账号重复 |
| `student` | `account UNIQUE` | 防止学生账号重复 |
| `class` | `invite_code UNIQUE` | 保证班级邀请码全局唯一 |
| `mistake_book` | `uk_student_problem` | 防止同一学生同一题重复产生多条错题 |
| `learning_statistic` | `uk_student_date` | 保证每日统计唯一 |
| `homework_problem` | `uk_hw_prob` | 防止作业重复关联同一题 |
| `homework_student` | `uk_hw_stu` | 防止作业重复分配给同一学生 |
| `homework_submission` | `uk_hw_stu_sub` | 防止重复提交作业 |
| `exam_paper_problem` | `uk_paper_prob` | 防止试卷重复关联同一题 |
| `exam_student` | `uk_exam_stu` | 防止考试重复分配给同一学生 |
| `exam_submission` | `uk_exam_stu_sub` | 防止重复提交考试 |

## 9. Redis 使用说明

Redis 不作为主数据源，主要用于以下场景：

- 缓存热点配置或会话数据。
- 训练过程中暂存高频写入数据。
- 错题削峰：先把短时间内产生的错题写入 Redis，再由后端批量合并落库到 `mistake_book`。

MySQL 仍是最终一致的数据源。Redis 中的数据不能替代 `training_record`、`mistake_book`、`homework_submission`、`exam_submission` 等核心业务表。

## 10. 数据安全与提交规范

以下文件或内容不应提交到 GitHub：

- `backend/.env`
- `frontend/.env`
- `*.session.sql`
- `.idea/`
- `.vscode/settings.json`
- `*.iml`
- `node_modules/`
- `dist/`

环境变量示例应放在：

- `backend/.env.example`

如果 `.env`、数据库密码、Redis 密码、高德地图 Key 或 SQL 会话文件已经推送到 GitHub，应立即更换相关密钥，并视情况清理 Git 历史。

## 11. 常用维护 SQL

### 11.1 查看班级邀请码

```sql
SELECT
  c.class_id,
  c.class_name,
  t.account AS teacher_account,
  c.student_count,
  c.invite_code,
  c.invite_code_status,
  c.invite_code_expire_time
FROM class c
LEFT JOIN teacher t ON t.teacher_id = c.teacher_id
ORDER BY c.class_id;
```

### 11.2 查看学生绑定关系

```sql
SELECT
  s.student_id,
  s.account,
  s.name,
  g.grade_name,
  c.class_name,
  t.account AS teacher_account,
  c.invite_code
FROM student s
JOIN grade g ON g.grade_id = s.grade_id
JOIN class c ON c.class_id = s.class_id
LEFT JOIN teacher t ON t.teacher_id = c.teacher_id
ORDER BY s.student_id;
```

### 11.3 重新统计班级学生数

```sql
UPDATE class c
LEFT JOIN (
  SELECT class_id, COUNT(*) AS cnt
  FROM student
  WHERE account_status != 'banned'
  GROUP BY class_id
) s ON s.class_id = c.class_id
SET c.student_count = COALESCE(s.cnt, 0);
```

### 11.4 重新统计年级人数和班级数

```sql
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
```

## 12. 设计总结

当前数据库设计的重点是：

1. 账号、班级、邀请码、学校信息拆分清晰，学生绑定关系稳定存储在 `student.class_id`。
2. 题库、训练、错题、统计构成学生端核心学习闭环。
3. 作业和考试通过分配表关联学生，兼顾按班级分配和历史快照稳定性。
4. MySQL 保存核心业务数据，Redis 只承担缓存和削峰能力。
5. SQL 初始化、迁移、演示数据分文件管理，便于本地开发、演示和后续交付。
