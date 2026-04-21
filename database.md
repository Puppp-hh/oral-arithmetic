# 小学数学口算分级训练系统
## 数据库设计说明书

---

## 一、概念结构设计（E-R模型）

### 1.1 系统实体及其属性

#### 1.1.1 核心实体

```
┌──────────────────┐
│      学生        │
├──────────────────┤
│ 学生ID (PK)     │
│ 账号            │
│ 密码            │
│ 姓名            │
│ 班级ID (FK)     │
│ 年级            │
│ 性别            │
│ 出生日期        │
│ 注册日期        │
│ 最后登录时间    │
│ 当前等级 (1-10) │
│ 总训练题数      │
│ 累计正确率      │
│ 账户状态        │
└──────────────────┘

┌──────────────────┐
│      题库        │
├──────────────────┤
│ 题目ID (PK)     │
│ 题目内容        │
│ 题目类型        │
│ 运算类型        │
│ 难度等级        │
│ 标准答案        │
│ 详解步骤        │
│ 创建者ID        │
│ 创建日期        │
│ 启用状态        │
│ 使用频率        │
│ 易错指数        │
└──────────────────┘

┌──────────────────┐
│     训练记录     │
├──────────────────┤
│ 记录ID (PK)     │
│ 学生ID (FK)     │
│ 题目ID (FK)     │
│ 答题内容        │
│ 是否正确        │
│ 答题时间(秒)    │
│ 答题日期        │
│ 得分            │
│ 是否为重做      │
│ 会话ID          │
└──────────────────┘

┌──────────────────┐
│      错题库      │
├──────────────────┤
│ 错题ID (PK)     │
│ 学生ID (FK)     │
│ 题目ID (FK)     │
│ 标准答案        │
│ 学生答案        │
│ 首次做错时间    │
│ 最后做错时间    │
│ 做错次数        │
│ 已改正状态      │
│ 改正日期        │
│ 错误原因        │
└──────────────────┘

┌──────────────────┐
│      用户等级    │
├──────────────────┤
│ 学生ID (PK,FK)  │
│ 当前等级        │
│ 晋升日期        │
│ 正确题数        │
│ 错误题数        │
│ 最近20题正确率  │
│ 晋升条件是否满足│
└──────────────────┘

┌──────────────────┐
│     班级信息     │
├──────────────────┤
│ 班级ID (PK)     │
│ 班级名称        │
│ 年级ID (FK)     │
│ 班主任ID        │
│ 学生数          │
│ 创建日期        │
│ 班级状态        │
│ 平均等级        │
│ 平均正确率      │
└──────────────────┘

┌──────────────────┐
│      年级信息    │
├──────────────────┤
│ 年级ID (PK)     │
│ 年级名称        │
│ 班级数          │
│ 学生总数        │
└──────────────────┘

┌──────────────────┐
│     学习统计     │
├──────────────────┤
│ 统计ID (PK)     │
│ 学生ID (FK)     │
│ 统计日期        │
│ 当日训练题数    │
│ 当日正确题数    │
│ 当日错误题数    │
│ 当日正确率      │
│ 当日平均耗时    │
│ 当日学习时长    │
│ 加法题正确率    │
│ 减法题正确率    │
│ 乘法题正确率    │
│ 除法题正确率    │
└──────────────────┘
```

### 1.2 E-R图 (关系图)

```
                    ┌────────────┐
                    │   年级信息  │
                    └──────┬─────┘
                           │ 1
                           │
                           │ N
                    ┌──────▼─────┐
                    │  班级信息   │
                    └──────┬─────┘
                           │ 1
                           │
                      ┌────┴────┐
                      │          │ N
                      │          │
                    ┌─▼────────┐ │
                    │  学生    │◄┘
                    │(核心)    │
                    └─┬──┬──┬──┘
                      │  │  │
            ┌─────────┘  │  └──────────┐
            │            │             │
            │ 1:N        │ 1:N        │ 1:N
            │            │             │
       ┌────▼───────┐ ┌──▼───────┐ ┌──▼─────────┐
       │  训练记录   │ │  错题库   │ │ 用户等级   │
       │            │ │          │ │            │
       │ (记录所有  │ │ (记录    │ │ (1对1)    │
       │  答题行为) │ │  错题)   │ │            │
       └───┬────────┘ └──┬───────┘ └────────────┘
           │             │
           │ N           │ N
           │             │
           │ M           │ M
           │             │
       ┌───▼──────────────▼─────┐
       │      题库（题目）       │
       │                        │
       │ (分级、分类、标准答案) │
       └────────────────────────┘

       ┌────────────────────────┐
       │     学习统计表          │
       │(日期维度统计数据)      │
       └────┬───────────────────┘
            │ 1:N
            └──► 学生
```

### 1.3 关系说明

| 关系 | 实体1 | 实体2 | 关系类型 | 说明 |
|------|------|------|--------|------|
| R1 | 年级 | 班级 | 1:N | 一个年级有多个班级 |
| R2 | 班级 | 学生 | 1:N | 一个班级有多个学生 |
| R3 | 学生 | 训练记录 | 1:N | 一个学生有多条训练记录 |
| R4 | 题库 | 训练记录 | 1:N | 一道题有多次答题记录 |
| R5 | 学生 | 错题库 | 1:N | 一个学生有多个错题 |
| R6 | 题库 | 错题库 | 1:N | 一道题可能被多个学生做错 |
| R7 | 学生 | 用户等级 | 1:1 | 一个学生对应一个等级记录 |
| R8 | 学生 | 学习统计 | 1:N | 一个学生有多条日统计记录 |

---

## 二、逻辑结构设计（关系模式）

### 2.1 规范化设计

所有表设计均满足**第三范式 (3NF)**：
- ✅ 1NF：每列数据是原子值
- ✅ 2NF：不存在非主属性对主键的部分依赖
- ✅ 3NF：不存在非主属性对主键的传递依赖

### 2.2 关系模式列表

```sql
-- 关系模式命名规范：snake_case (小写+下划线)
-- 主键标记：(PK)
-- 外键标记：(FK)
-- 唯一键标记：(UK)
-- 非空标记：NOT NULL

Grade(年级信息) = {
  grade_id (PK),
  grade_name (UK),
  class_count,
  student_count
}

Class(班级信息) = {
  class_id (PK),
  grade_id (FK),
  class_name,
  teacher_id (FK),
  student_count,
  created_date,
  class_status,
  avg_level,
  avg_correct_rate
}

Student(学生信息) = {
  student_id (PK),
  account (UK),
  password,
  name,
  class_id (FK),
  grade_id (FK),
  gender,
  birth_date,
  register_date,
  last_login_time,
  current_level,
  total_problems,
  cumulative_correct_rate,
  account_status
}

Problem(题库) = {
  problem_id (PK),
  problem_content,
  problem_type,
  operation_type,
  difficulty_level,
  standard_answer,
  solution_steps,
  creator_id,
  create_date,
  enable_status,
  usage_frequency,
  error_index
}

TrainingRecord(训练记录) = {
  record_id (PK),
  student_id (FK),
  problem_id (FK),
  answer_content,
  is_correct,
  answer_time_seconds,
  answer_date,
  score,
  is_review,
  session_id,
  created_time
}

MistakeBook(错题库) = {
  mistake_id (PK),
  student_id (FK),
  problem_id (FK),
  standard_answer,
  student_answer,
  first_wrong_date,
  last_wrong_date,
  wrong_count,
  is_corrected,
  corrected_date,
  error_reason
}

StudentLevel(用户等级) = {
  student_id (PK, FK),
  current_level,
  promotion_date,
  correct_problems,
  wrong_problems,
  recent_20_correct_rate,
  is_promotion_qualified
}

LearningStatistic(学习统计) = {
  statistic_id (PK),
  student_id (FK),
  statistic_date,
  daily_problems,
  daily_correct,
  daily_wrong,
  daily_correct_rate,
  daily_avg_time,
  daily_study_duration,
  addition_correct_rate,
  subtraction_correct_rate,
  multiplication_correct_rate,
  division_correct_rate
}

Teacher(教师信息) = {
  teacher_id (PK),
  name,
  account (UK),
  password,
  email,
  phone,
  teaching_subjects,
  created_date,
  account_status
}

SystemConfig(系统配置) = {
  config_id (PK),
  config_key (UK),
  config_value,
  config_type,
  config_desc,
  is_editable,
  update_date
}
```

---

## 三、数据表详细设计

### 3.1 核心表 - 学生表 (Student)

```sql
CREATE TABLE student (
  student_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '学生ID',
  account VARCHAR(50) NOT NULL UNIQUE COMMENT '账号（手机号或邮箱）',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  class_id BIGINT NOT NULL COMMENT '班级ID',
  grade_id BIGINT NOT NULL COMMENT '年级ID',
  gender ENUM('male','female','unknown') COMMENT '性别',
  birth_date DATE COMMENT '出生日期',
  register_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '注册日期',
  last_login_time TIMESTAMP COMMENT '最后登录时间',
  current_level TINYINT DEFAULT 1 COMMENT '当前等级（1-10）',
  total_problems MEDIUMINT DEFAULT 0 COMMENT '总训练题数',
  cumulative_correct_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '累计正确率(%)，范围0-100',
  account_status ENUM('active','inactive','banned') DEFAULT 'active' COMMENT '账户状态',
  
  INDEX idx_class_id (class_id),
  INDEX idx_current_level (current_level),
  INDEX idx_register_date (register_date),
  FOREIGN KEY (class_id) REFERENCES class(class_id),
  FOREIGN KEY (grade_id) REFERENCES grade(grade_id)
) COMMENT='学生信息表';
```

**字段说明：**
- `student_id`: 系统生成的唯一标识，自增主键
- `account`: 登录账号，需要唯一性约束，支持微信ID或自定义账号
- `password`: 使用bcrypt等强加密算法存储，不可逆
- `current_level`: 1-10级，初始为1级，根据训练成绩动态调整
- `cumulative_correct_rate`: 所有训练的加权平均正确率
- `account_status`: 用于软删除和权限管理

---

### 3.2 核心表 - 题库表 (Problem)

```sql
CREATE TABLE problem (
  problem_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '题目ID',
  problem_content VARCHAR(500) NOT NULL COMMENT '题目内容',
  problem_type ENUM('addition','subtraction','multiplication','division','mixed') 
    COMMENT '题目类型',
  operation_type VARCHAR(50) COMMENT '运算形式（如两位数加法、进位加法等）',
  difficulty_level TINYINT NOT NULL DEFAULT 1 COMMENT '难度等级（1-10）',
  standard_answer VARCHAR(100) NOT NULL COMMENT '标准答案',
  solution_steps TEXT COMMENT '详细解答步骤（JSON格式）',
  creator_id BIGINT COMMENT '创建者ID',
  create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建日期',
  enable_status ENUM('enabled','disabled') DEFAULT 'enabled' COMMENT '启用状态',
  usage_frequency MEDIUMINT DEFAULT 0 COMMENT '被使用的次数',
  error_index DECIMAL(5,2) DEFAULT 0 COMMENT '错误指数(0-100)，记录被做错的比例',
  
  INDEX idx_difficulty_level (difficulty_level),
  INDEX idx_problem_type (problem_type),
  INDEX idx_enable_status (enable_status),
  INDEX idx_error_index (error_index)
) COMMENT='题库表';
```

**字段说明：**
- `problem_content`: 存储题目的完整表述，如"12 + 8 = ?"
- `operation_type`: 更细致的题目分类，如"两位数+两位数进位加法"
- `difficulty_level`: 对应系统的1-10级分类
- `solution_steps`: JSON格式存储，包含分步讲解，便于前端展示
- `error_index`: 根据使用频率和错误次数动态计算，用于教学分析
- 索引设置便于快速查询不同等级和类型的题目

---

### 3.3 核心表 - 训练记录表 (TrainingRecord)

```sql
CREATE TABLE training_record (
  record_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '训练记录ID',
  student_id BIGINT NOT NULL COMMENT '学生ID',
  problem_id BIGINT NOT NULL COMMENT '题目ID',
  answer_content VARCHAR(100) NOT NULL COMMENT '学生答案内容',
  is_correct BOOLEAN NOT NULL COMMENT '是否正确',
  answer_time_seconds SMALLINT NOT NULL COMMENT '答题用时（秒）',
  answer_date DATETIME NOT NULL COMMENT '答题时间',
  score TINYINT DEFAULT 0 COMMENT '该题得分（0或该题满分）',
  is_review BOOLEAN DEFAULT FALSE COMMENT '是否为复习/重做',
  session_id VARCHAR(50) COMMENT '会话ID，标识一次训练课程',
  created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  
  INDEX idx_student_id (student_id),
  INDEX idx_problem_id (problem_id),
  INDEX idx_answer_date (answer_date),
  INDEX idx_session_id (session_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id),
  FOREIGN KEY (problem_id) REFERENCES problem(problem_id)
) COMMENT='训练记录表（记录每次答题）';
```

**字段说明：**
- `record_id`: 每次答题产生一条记录，便于数据追溯
- `is_correct`: 布尔值，简化判题结果存储
- `answer_time_seconds`: 用于分析学生答题速度趋势
- `session_id`: 将同一堂课或一个测试的记录关联，便于统计
- `is_review`: 区分首次做题和复习/重做，便于分析学习效果
- 多个索引支持按学生、按题目、按时间等多维度查询

**关键用途：**
- 统计学生的正确率、答题时间
- 分析题目的易错指数
- 生成学习报告和数据分析

---

### 3.4 核心表 - 错题库表 (MistakeBook)

```sql
CREATE TABLE mistake_book (
  mistake_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '错题ID',
  student_id BIGINT NOT NULL COMMENT '学生ID',
  problem_id BIGINT NOT NULL COMMENT '题目ID',
  standard_answer VARCHAR(100) NOT NULL COMMENT '标准答案',
  student_answer VARCHAR(100) NOT NULL COMMENT '学生第一次的错误答案',
  first_wrong_date DATETIME NOT NULL COMMENT '首次做错日期',
  last_wrong_date DATETIME COMMENT '最后一次做错日期',
  wrong_count SMALLINT DEFAULT 1 COMMENT '做错次数（累计）',
  is_corrected BOOLEAN DEFAULT FALSE COMMENT '是否已改正',
  corrected_date DATETIME COMMENT '改正日期',
  error_reason VARCHAR(255) COMMENT '错误原因分类（计算错误/理解错误/粗心等）',
  
  INDEX idx_student_id (student_id),
  INDEX idx_problem_id (problem_id),
  INDEX idx_first_wrong_date (first_wrong_date),
  INDEX idx_is_corrected (is_corrected),
  UNIQUE KEY uk_student_problem (student_id, problem_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id),
  FOREIGN KEY (problem_id) REFERENCES problem(problem_id)
) COMMENT='错题库表（记录学生的错题集合）';
```

**字段说明：**
- `mistake_id`: 每个学生+题目的组合只产生一条错题记录
- `first_wrong_date`: 首次错题时间，用于分析何时开始出现问题
- `wrong_count`: 累计错误次数，错误次数多的题目应该优先复习
- `is_corrected`: 标记是否已改正（学生成功重做该题）
- `error_reason`: 分类存储错误原因，便于有针对性地改进教学
- 复合唯一键 `(student_id, problem_id)` 确保每个学生对每道题只有一条错题记录

**关键用途：**
- 生成个人错题本
- 优先推荐容易出错的题目
- 追踪学生是否已改正
- 分析常见错误类型

---

### 3.5 等级管理表 - 用户等级表 (StudentLevel)

```sql
CREATE TABLE student_level (
  student_id BIGINT PRIMARY KEY COMMENT '学生ID',
  current_level TINYINT NOT NULL DEFAULT 1 COMMENT '当前等级（1-10）',
  promotion_date DATETIME COMMENT '最后晋升日期',
  correct_problems MEDIUMINT DEFAULT 0 COMMENT '正确题数（最近评估）',
  wrong_problems MEDIUMINT DEFAULT 0 COMMENT '错误题数（最近评估）',
  recent_20_correct_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '最近20题正确率(%)',
  is_promotion_qualified BOOLEAN DEFAULT FALSE COMMENT '是否满足晋升条件',
  
  FOREIGN KEY (student_id) REFERENCES student(student_id)
) COMMENT='学生等级表（1对1关系，便于快速查询）';
```

**字段说明：**
- 1对1对应Student表
- `current_level`: 冗余存储以加快查询速度（避免JOIN）
- `recent_20_correct_rate`: 关键字段，用于判断是否升级或降级
- 升级条件：最近20题正确率 ≥ 85%
- 降级条件：最近20题正确率 < 60%

---

### 3.6 统计表 - 学习统计表 (LearningStatistic)

```sql
CREATE TABLE learning_statistic (
  statistic_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '统计记录ID',
  student_id BIGINT NOT NULL COMMENT '学生ID',
  statistic_date DATE NOT NULL COMMENT '统计日期',
  daily_problems SMALLINT DEFAULT 0 COMMENT '当日训练题数',
  daily_correct SMALLINT DEFAULT 0 COMMENT '当日正确题数',
  daily_wrong SMALLINT DEFAULT 0 COMMENT '当日错误题数',
  daily_correct_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '当日正确率(%)',
  daily_avg_time DECIMAL(6,2) DEFAULT 0.00 COMMENT '当日平均答题时间(秒)',
  daily_study_duration SMALLINT DEFAULT 0 COMMENT '当日学习时长(分钟)',
  addition_correct_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '加法正确率(%)' ,
  subtraction_correct_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '减法正确率(%)',
  multiplication_correct_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '乘法正确率(%)',
  division_correct_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '除法正确率(%)',
  mixed_operation_correct_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '混合运算正确率(%)',
  
  INDEX idx_student_id (student_id),
  INDEX idx_statistic_date (statistic_date),
  UNIQUE KEY uk_student_date (student_id, statistic_date),
  FOREIGN KEY (student_id) REFERENCES student(student_id)
) COMMENT='学习统计表（按日期统计学生学习情况）';
```

**字段说明：**
- 每天为每个学生产生一条汇总记录
- 通过每日的训练记录计算得出
- 用于生成日报、周报、月报
- 复合唯一键保证一天一条记录
- 索引设置便于按学生或日期查询

---

### 3.7 基础表 - 班级表 (Class)

```sql
CREATE TABLE class (
  class_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '班级ID',
  grade_id BIGINT NOT NULL COMMENT '年级ID',
  class_name VARCHAR(50) NOT NULL COMMENT '班级名称，如一年级一班',
  teacher_id BIGINT COMMENT '班主任ID',
  student_count SMALLINT DEFAULT 0 COMMENT '学生数',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建日期',
  class_status ENUM('active','inactive') DEFAULT 'active' COMMENT '班级状态',
  avg_level DECIMAL(4,2) DEFAULT 0.00 COMMENT '班级平均等级',
  avg_correct_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '班级平均正确率(%)',
  
  INDEX idx_grade_id (grade_id),
  INDEX idx_class_status (class_status),
  FOREIGN KEY (grade_id) REFERENCES grade(grade_id)
) COMMENT='班级信息表';
```

---

### 3.8 基础表 - 年级表 (Grade)

```sql
CREATE TABLE grade (
  grade_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '年级ID',
  grade_name VARCHAR(20) NOT NULL UNIQUE COMMENT '年级名称，如一年级',
  class_count SMALLINT DEFAULT 0 COMMENT '班级数',
  student_count MEDIUMINT DEFAULT 0 COMMENT '学生总数',
  
  INDEX idx_grade_name (grade_name)
) COMMENT='年级信息表';
```

---

### 3.9 系统管理表 - 教师表 (Teacher)

```sql
CREATE TABLE teacher (
  teacher_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '教师ID',
  name VARCHAR(50) NOT NULL COMMENT '教师姓名',
  account VARCHAR(50) NOT NULL UNIQUE COMMENT '登录账号',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
  email VARCHAR(100) COMMENT '邮箱',
  phone VARCHAR(20) COMMENT '手机号',
  teaching_subjects VARCHAR(100) COMMENT '教授科目',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建日期',
  account_status ENUM('active','inactive','banned') DEFAULT 'active' COMMENT '账户状态',
  
  INDEX idx_account (account),
  INDEX idx_account_status (account_status)
) COMMENT='教师信息表';
```

---

### 3.10 系统管理表 - 系统配置表 (SystemConfig)

```sql
CREATE TABLE system_config (
  config_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
  config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键（如LEVEL_UP_THRESHOLD）',
  config_value VARCHAR(500) NOT NULL COMMENT '配置值',
  config_type VARCHAR(20) COMMENT '配置类型（如percentage、number、string等）',
  config_desc VARCHAR(255) COMMENT '配置描述',
  is_editable BOOLEAN DEFAULT TRUE COMMENT '是否可编辑',
  update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_config_key (config_key)
) COMMENT='系统配置表';

-- 初始配置数据示例
INSERT INTO system_config VALUES
(1, 'LEVEL_UP_THRESHOLD', '85', 'percentage', '升级正确率阈值(%)', TRUE, NOW()),
(2, 'LEVEL_DOWN_THRESHOLD', '60', 'percentage', '降级正确率阈值(%)', TRUE, NOW()),
(3, 'EVAL_PROBLEMS_COUNT', '20', 'number', '用于评估的最近题目数', TRUE, NOW()),
(4, 'MAX_PROBLEMS_PER_SESSION', '20', 'number', '每次训练最多题数', TRUE, NOW()),
(5, 'PROMOTION_REWARD_POINTS', '50', 'number', '升级奖励积分', FALSE, NOW());
```

---

## 四、数据字典

### 4.1 数据项定义

| 数据项名 | 简称 | 类型 | 长度 | 说明 | 样例 |
|---------|------|------|------|------|------|
| **学生ID** | SID | BIGINT | 20 | 系统唯一标识 | 1001 |
| **账号** | Account | VARCHAR | 50 | 登录账号，唯一 | student001 / 13800138000 |
| **密码** | Password | VARCHAR | 255 | 加密存储的密码哈希 | $2a$10$N9qo8uLO... |
| **姓名** | Name | VARCHAR | 50 | 学生真实姓名 | 张三 |
| **班级ID** | ClassID | BIGINT | 20 | 所属班级 | 101 |
| **等级** | Level | TINYINT | 1 | 1-10级分级 | 5 |
| **正确率** | CorrectRate | DECIMAL | 5,2 | 百分比，0-100 | 85.50 |
| **题目内容** | Content | VARCHAR | 500 | 题目的文本表述 | "25 + 17 = ?" |
| **标准答案** | Answer | VARCHAR | 100 | 唯一正确答案 | 42 |
| **难度等级** | Difficulty | TINYINT | 1 | 1-10级难度 | 3 |
| **答题用时** | AnswerTime | SMALLINT | 2 | 秒数 | 45 |
| **答题时间** | AnswerDate | DATETIME | - | 答题的日期时间 | 2026-04-13 14:30:45 |
| **是否正确** | IsCorrect | BOOLEAN | 1 | 0=错误,1=正确 | 1 |
| **会话ID** | SessionID | VARCHAR | 50 | 标识一次训练课程 | sess_20260413_001 |
| **错误原因** | ErrorReason | VARCHAR | 255 | 错误分类 | 计算错误/理解错误/粗心 |
| **状态** | Status | ENUM | - | 账户或资源状态 | active / inactive / banned |

### 4.2 数据结构说明

#### 4.2.1 题目内容结构

```json
{
  "problem_id": 12345,
  "problem_content": "25 + 18 = ?",
  "problem_type": "addition",
  "operation_type": "进位加法",
  "difficulty_level": 2,
  "standard_answer": "43",
  "solution_steps": [
    {
      "step": 1,
      "description": "个位数相加",
      "expression": "5 + 8 = 13",
      "result": "进一位"
    },
    {
      "step": 2,
      "description": "十位数相加",
      "expression": "2 + 1 + 1 = 4",
      "result": "4"
    },
    {
      "step": 3,
      "description": "最终答案",
      "expression": "43",
      "result": "正确"
    }
  ],
  "enable_status": "enabled",
  "usage_frequency": 1523,
  "error_index": 12.5
}
```

#### 4.2.2 学习报告结构

```json
{
  "report_id": "report_20260413",
  "student_id": 1001,
  "report_date": "2026-04-13",
  "report_type": "daily",  // daily/weekly/monthly
  
  "summary": {
    "total_problems": 25,
    "correct_problems": 21,
    "wrong_problems": 4,
    "correct_rate": 84.0,
    "average_time": 32.5,
    "study_duration": 45
  },
  
  "operation_analysis": {
    "addition": { "correct_rate": 90.0, "problems": 10 },
    "subtraction": { "correct_rate": 85.0, "problems": 10 },
    "multiplication": { "correct_rate": 70.0, "problems": 5 }
  },
  
  "wrong_problems": [
    { "problem_id": 123, "content": "45 - 28 = ?", "reason": "计算错误" },
    { "problem_id": 456, "content": "6 × 7 = ?", "reason": "记忆不清" }
  ],
  
  "recommendations": [
    "减法运算准确度需提高，建议加强训练",
    "乘法基础需加强巩固",
    "今天学习效率不错，请继续保持"
  ],
  
  "level_info": {
    "current_level": 4,
    "level_up_probability": 30,
    "recent_20_correct_rate": 84.0
  }
}
```

---

## 五、数据库支持的关键功能

### 5.1 分级训练功能支持

#### 5.1.1 数据表关系

```
学生表 (student)
  ├─ current_level = 4
  └─ 关联 →
  
题库表 (problem)
  ├─ difficulty_level = 4
  └─ 关联 →
  
训练记录表 (training_record)
  ├─ is_correct = 1 (正确)
  ├─ answer_time_seconds
  └─ answer_date

用户等级表 (student_level)
  ├─ recent_20_correct_rate
  └─ 判断升级/降级
```

#### 5.1.2 关键SQL操作

```sql
-- 查询用户的当前等级
SELECT current_level FROM student WHERE student_id = ?;

-- 获取该等级的题目
SELECT * FROM problem 
WHERE difficulty_level = ? AND enable_status = 'enabled'
ORDER BY RAND() LIMIT 10;

-- 统计最近20道题的正确率（用于等级评估）
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
  (SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*) * 100) as correct_rate
FROM training_record
WHERE student_id = ? 
ORDER BY answer_date DESC
LIMIT 20;

-- 判断是否需要升级（正确率≥85%）
IF correct_rate >= 85 THEN
  UPDATE student SET current_level = current_level + 1 WHERE student_id = ?;
  UPDATE student_level SET is_promotion_qualified = TRUE WHERE student_id = ?;
END IF;

-- 判断是否需要降级（正确率<60%）
IF correct_rate < 60 THEN
  UPDATE student SET current_level = GREATEST(1, current_level - 1) WHERE student_id = ?;
END IF;
```

### 5.2 错题记录功能支持

#### 5.2.1 数据流程

```
学生答错题目
  ↓
INSERT INTO mistake_book (student_id, problem_id, wrong_date, error_reason)
  ↓
UPDATE mistake_book SET wrong_count = wrong_count + 1 WHERE student_id = ? AND problem_id = ?
  ↓
SELECT * FROM mistake_book WHERE student_id = ? AND is_corrected = 0
  ↓
生成个人错题本
```

#### 5.2.2 关键SQL操作

```sql
-- 查询学生的错题集合
SELECT mb.*, p.problem_content, p.standard_answer
FROM mistake_book mb
JOIN problem p ON mb.problem_id = p.problem_id
WHERE mb.student_id = ? AND mb.is_corrected = 0
ORDER BY mb.wrong_count DESC, mb.last_wrong_date DESC;

-- 按错误原因分类错题
SELECT 
  error_reason,
  COUNT(*) as count,
  GROUP_CONCAT(problem_id) as problem_ids
FROM mistake_book
WHERE student_id = ? AND is_corrected = 0
GROUP BY error_reason
ORDER BY count DESC;

-- 查询最易出错的题目（易错指数排序）
SELECT p.*, mb.wrong_count
FROM mistake_book mb
JOIN problem p ON mb.problem_id = p.problem_id
WHERE mb.student_id = ?
ORDER BY p.error_index DESC, mb.wrong_count DESC
LIMIT 10;

-- 标记错题为已改正
UPDATE mistake_book 
SET is_corrected = 1, corrected_date = NOW()
WHERE student_id = ? AND problem_id = ?;
```

### 5.3 数据统计分析功能支持

#### 5.3.1 日报统计

```sql
-- 每日自动生成学习统计（应在晚上11:59执行）
INSERT INTO learning_statistic (student_id, statistic_date, daily_problems, daily_correct, ...)
SELECT 
  student_id,
  DATE(answer_date) as statistic_date,
  COUNT(*) as daily_problems,
  SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as daily_correct,
  SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as daily_wrong,
  ROUND(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as daily_correct_rate,
  ROUND(AVG(answer_time_seconds), 2) as daily_avg_time,
  ROUND(SUM(answer_time_seconds) / 60, 0) as daily_study_duration,
  -- 按类型统计正确率
  ROUND(SUM(CASE WHEN problem_type = 'addition' AND is_correct = 1 THEN 1 ELSE 0 END) / 
    NULLIF(SUM(CASE WHEN problem_type = 'addition' THEN 1 ELSE 0 END), 0) * 100, 2) as addition_correct_rate
FROM training_record tr
JOIN problem p ON tr.problem_id = p.problem_id
WHERE DATE(answer_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
GROUP BY student_id, DATE(answer_date);
```

#### 5.3.2 周/月报统计

```sql
-- 查询周报数据（最近7天的汇总）
SELECT 
  student_id,
  DATE_SUB(CURDATE(), INTERVAL (DAYOFWEEK(CURDATE())-1) DAY) as week_start,
  SUM(daily_problems) as week_problems,
  SUM(daily_correct) as week_correct,
  ROUND(AVG(daily_correct_rate), 2) as week_avg_correct_rate,
  COUNT(DISTINCT statistic_date) as study_days
FROM learning_statistic
WHERE student_id = ? 
  AND statistic_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND statistic_date <= CURDATE()
GROUP BY student_id;

-- 查询月报数据（最近30天的汇总）
SELECT 
  student_id,
  DATE_TRUNC(DATE_SUB(CURDATE(), INTERVAL DAY(CURDATE())-1 DAY), MONTH) as month_start,
  SUM(daily_problems) as month_problems,
  SUM(daily_correct) as month_correct,
  ROUND(AVG(daily_correct_rate), 2) as month_avg_correct_rate,
  COUNT(DISTINCT statistic_date) as study_days,
  MAX(daily_study_duration) as max_daily_duration
FROM learning_statistic
WHERE student_id = ? 
  AND YEAR(statistic_date) = YEAR(CURDATE())
  AND MONTH(statistic_date) = MONTH(CURDATE())
GROUP BY student_id;
```

#### 5.3.3 排名和对标功能

```sql
-- 查询班级排名（基于最近的正确率）
SELECT 
  @rank := @rank + 1 as rank,
  s.student_id,
  s.name,
  s.current_level,
  sl.recent_20_correct_rate
FROM student s
JOIN student_level sl ON s.student_id = sl.student_id
JOIN class c ON s.class_id = c.class_id
CROSS JOIN (SELECT @rank := 0) init
WHERE c.class_id = ?
ORDER BY sl.recent_20_correct_rate DESC, s.student_id
LIMIT 50;

-- 查询与其他学生的对标（同年级）
SELECT 
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY recent_20_correct_rate) as median_correct_rate,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY recent_20_correct_rate) as q3_correct_rate,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY recent_20_correct_rate) as q1_correct_rate,
  AVG(recent_20_correct_rate) as avg_correct_rate
FROM student_level sl
JOIN student s ON sl.student_id = s.student_id
JOIN class c ON s.class_id = c.class_id
JOIN grade g ON c.grade_id = g.grade_id
WHERE g.grade_id = ?;
```

---

## 六、数据库性能优化设计

### 6.1 索引策略

| 表名 | 索引字段 | 索引类型 | 说明 |
|------|---------|--------|------|
| training_record | (student_id, answer_date) | 复合索引 | 快速查询某学生的答题历史 |
| training_record | (problem_id, is_correct) | 复合索引 | 统计题目的做错率 |
| learning_statistic | (student_id, statistic_date) | 复合索引 | 生成学习报告 |
| mistake_book | (student_id, is_corrected) | 复合索引 | 快速查询待改正错题 |
| problem | (difficulty_level, enable_status) | 复合索引 | 按等级快速取题 |
| student | (class_id, current_level) | 复合索引 | 班级内按等级查询 |

### 6.2 分区策略

```sql
-- 训练记录表按年月分区（每月一个分区）
ALTER TABLE training_record PARTITION BY RANGE (YEAR_MONTH(answer_date)) (
  PARTITION p202604 VALUES LESS THAN (202605),
  PARTITION p202605 VALUES LESS THAN (202606),
  PARTITION p202606 VALUES LESS THAN (202607),
  -- ...
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 学习统计表按日期分区
ALTER TABLE learning_statistic PARTITION BY RANGE (YEAR_MONTH(statistic_date)) (
  PARTITION p202604 VALUES LESS THAN (202605),
  -- ...
);
```

### 6.3 缓存策略

```
Redis缓存分层：
├─ 用户会话缓存 (TTL: 7天)
│  └─ user:{user_id}:session → 用户登录状态、权限信息
│
├─ 实时成绩缓存 (TTL: 1小时)
│  ├─ user:{user_id}:today_stats → 今日学习统计
│  └─ user:{user_id}:recent_20 → 最近20题成绩
│
├─ 题库缓存 (TTL: 30天)
│  ├─ problems:level:{level} → 某等级所有题目
│  └─ problem:{problem_id} → 单题详情
│
└─ 排名缓存 (TTL: 1天)
   ├─ class:{class_id}:ranking → 班级排名
   └─ grade:{grade_id}:ranking → 年级排名
```

---

## 七、数据库初始化脚本

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS oral_arithmetic
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE oral_arithmetic;

-- 设置时区
SET time_zone = '+08:00';

-- 年级表初始化
INSERT INTO grade (grade_name) VALUES
('一年级'), ('二年级'), ('三年级'), ('四年级'), ('五年级'), ('六年级');

-- 系统配置初始化
INSERT INTO system_config (config_key, config_value, config_type, config_desc) VALUES
('LEVEL_UP_THRESHOLD', '85', 'percentage', '升级正确率阈值(%)'),
('LEVEL_DOWN_THRESHOLD', '60', 'percentage', '降级正确率阈值(%)'),
('EVAL_PROBLEMS_COUNT', '20', 'number', '用于评估的最近题目数'),
('MAX_PROBLEMS_PER_SESSION', '20', 'number', '每次训练最多题数'),
('PROMOTION_REWARD_POINTS', '50', 'number', '升级奖励积分'),
('SESSION_TIMEOUT', '1800', 'number', '会话超时时间(秒)');
```

---

## 八、总结

本数据库设计遵循以下原则：

✅ **规范性**：所有表满足第三范式，数据完整性高  
✅ **性能优化**：合理使用索引、分区、缓存  
✅ **可扩展性**：支持数据增长，易于添加新字段  
✅ **数据完整性**：通过外键约束和CHECK约束保证数据一致性  
✅ **业务支持**：完全支持分级训练、错题管理、数据分析功能  

---

*文档版本：v1.0*  
*最后更新：2026年4月*  
*审核状态：待评审*

