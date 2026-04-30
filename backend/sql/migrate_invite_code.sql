-- ============================================================
-- 增量迁移：注册系统 + 邀请码绑定
-- 执行前请备份数据库！
-- ============================================================

USE oral_arithmetic;

-- ------------------------------------------------------------
-- 1. teacher 表：增加学校信息字段（均可为 NULL，不影响已有数据）
-- ------------------------------------------------------------
ALTER TABLE teacher
  ADD COLUMN school_name       VARCHAR(100)  NULL COMMENT '学校名称'           AFTER teaching_subjects,
  ADD COLUMN school_address    VARCHAR(255)  NULL COMMENT '学校地址（高德预留）'  AFTER school_name,
  ADD COLUMN school_longitude  DECIMAL(10,7) NULL COMMENT '学校经度（高德预留）'  AFTER school_address,
  ADD COLUMN school_latitude   DECIMAL(10,7) NULL COMMENT '学校纬度（高德预留）'  AFTER school_longitude;

-- ------------------------------------------------------------
-- 2. class 表：增加邀请码字段
-- ------------------------------------------------------------
ALTER TABLE class
  ADD COLUMN invite_code             VARCHAR(10)  NULL
    COMMENT '班级邀请码（全局唯一，6位大写字母+数字）'          AFTER class_status,
  ADD COLUMN invite_code_status      ENUM('active','disabled') DEFAULT 'active'
    COMMENT '邀请码状态：active=可用，disabled=已停用'        AFTER invite_code,
  ADD COLUMN invite_code_expire_time DATETIME     NULL
    COMMENT '邀请码过期时间，NULL 表示永不过期'               AFTER invite_code_status;

-- UNIQUE 约束（同时建唯一索引）
ALTER TABLE class ADD CONSTRAINT uq_invite_code UNIQUE (invite_code);

-- ------------------------------------------------------------
-- 3. 已有班级数据迁移（可选）
--    生产环境建议用应用层脚本生成并校验唯一性；此处为应急备用
-- ------------------------------------------------------------
-- UPDATE class
--   SET invite_code = UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 6))
--   WHERE invite_code IS NULL;
