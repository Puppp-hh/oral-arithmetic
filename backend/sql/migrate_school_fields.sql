-- ============================================================
-- 迁移：为学生表补充学校字段，并统一演示学校数据
-- ============================================================

USE oral_arithmetic;

SET @exists_school_name := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student' AND COLUMN_NAME = 'school_name'
);
SET @ddl_school_name := IF(
  @exists_school_name = 0,
  'ALTER TABLE student ADD COLUMN school_name VARCHAR(100) NULL COMMENT ''学校名称'' AFTER grade_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl_school_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists_school_address := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student' AND COLUMN_NAME = 'school_address'
);
SET @ddl_school_address := IF(
  @exists_school_address = 0,
  'ALTER TABLE student ADD COLUMN school_address VARCHAR(255) NULL COMMENT ''学校地址'' AFTER school_name',
  'SELECT 1'
);
PREPARE stmt FROM @ddl_school_address;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists_school_longitude := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student' AND COLUMN_NAME = 'school_longitude'
);
SET @ddl_school_longitude := IF(
  @exists_school_longitude = 0,
  'ALTER TABLE student ADD COLUMN school_longitude DECIMAL(10,7) NULL COMMENT ''学校经度'' AFTER school_address',
  'SELECT 1'
);
PREPARE stmt FROM @ddl_school_longitude;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists_school_latitude := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student' AND COLUMN_NAME = 'school_latitude'
);
SET @ddl_school_latitude := IF(
  @exists_school_latitude = 0,
  'ALTER TABLE student ADD COLUMN school_latitude DECIMAL(10,7) NULL COMMENT ''学校纬度'' AFTER school_longitude',
  'SELECT 1'
);
PREPARE stmt FROM @ddl_school_latitude;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE teacher
SET school_name = '河源高级中学',
    school_address = '广东省河源市源城区东环路',
    school_longitude = 114.7247900,
    school_latitude = 23.7232520;

UPDATE student
SET school_name = '河源高级中学',
    school_address = '广东省河源市源城区东环路',
    school_longitude = 114.7247900,
    school_latitude = 23.7232520;
