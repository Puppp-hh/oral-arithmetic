/**
 * 文件说明：测试账号种子脚本
 * 系统作用：使用 bcrypt 生成真实密码哈希，插入教师和学生测试账号
 * 执行方式：npx ts-node scripts/seed.ts
 * 调用链：脚本 → bcrypt.hash → pool.execute → teacher/student/class/student_level 表
 *
 * 测试账号：
 *   教师：teacher01 / 123456
 *   学生：student01 ~ student03 / 123456
 */
import { pool } from "../src/config/database";
import { hashPassword } from "../src/utils/bcrypt";
import dotenv from "dotenv";

dotenv.config();

async function seed(): Promise<void> {
  console.log("\n[Seed] 开始初始化测试数据...\n");

  const pwdHash = await hashPassword("123456");
  console.log("[Seed] 密码哈希生成完成");

  // ── 1. 插入教师账号 ──────────────────────────────────────
  await pool.execute(
    `INSERT IGNORE INTO teacher (name, account, password, email, teaching_subjects, account_status)
     VALUES
     ('张老师', 'teacher01', ?, 'zhang@school.com', '数学', 'active'),
     ('李老师', 'teacher02', ?, 'li@school.com',    '数学', 'active')`,
    [pwdHash, pwdHash],
  );
  console.log("[Seed] 教师账号插入完成: teacher01, teacher02 (密码: 123456)");

  // ── 2. 插入班级（依赖 grade 1=一年级, teacher）────────────
  const [teacherRows] = await pool.execute<any[]>(
    "SELECT teacher_id FROM teacher WHERE account = 'teacher01' LIMIT 1",
  );
  const teacherId: number = teacherRows[0].teacher_id;

  await pool.execute(
    `INSERT IGNORE INTO class (grade_id, class_name, teacher_id, class_status)
     VALUES
     (1, '一年级一班', ?, 'active'),
     (1, '一年级二班', ?, 'active'),
     (2, '二年级一班', ?, 'active')`,
    [teacherId, teacherId, teacherId],
  );
  console.log("[Seed] 班级插入完成");

  // ── 3. 插入学生账号 ──────────────────────────────────────
  const [classRows] = await pool.execute<any[]>(
    "SELECT class_id FROM class WHERE class_name = '一年级一班' LIMIT 1",
  );
  const classId: number = classRows[0].class_id;

  await pool.execute(
    `INSERT IGNORE INTO student
       (account, password, name, class_id, grade_id, gender, current_level, account_status)
     VALUES
     ('student01', ?, '小明', ?, 1, 'male',   1, 'active'),
     ('student02', ?, '小红', ?, 1, 'female', 1, 'active'),
     ('student03', ?, '小强', ?, 1, 'male',   1, 'active')`,
    [pwdHash, classId, pwdHash, classId, pwdHash, classId],
  );
  console.log("[Seed] 学生账号插入完成: student01~03 (密码: 123456)");

  // ── 4. 初始化 student_level（1:1） ──────────────────────
  const [studentRows] = await pool.execute<any[]>(
    "SELECT student_id FROM student WHERE account IN ('student01','student02','student03')",
  );
  for (const row of studentRows) {
    await pool.execute(
      `INSERT IGNORE INTO student_level (student_id, current_level) VALUES (?, 1)`,
      [row.student_id],
    );
  }
  console.log("[Seed] student_level 初始化完成");

  // ── 5. 更新班级学生数 ────────────────────────────────────
  await pool.execute(
    `UPDATE class SET student_count = (
       SELECT COUNT(*) FROM student WHERE class_id = class.class_id
     )`,
  );

  // ── 6. 输出账号列表 ──────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" 测试账号列表（密码统一：123456）");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" 角色    账号         接口");
  console.log(" 教师    teacher01    POST /api/auth/teacher/login");
  console.log(" 教师    teacher02    POST /api/auth/teacher/login");
  console.log(" 学生    student01    POST /api/auth/student/login");
  console.log(" 学生    student02    POST /api/auth/student/login");
  console.log(" 学生    student03    POST /api/auth/student/login");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await pool.end();
  console.log("[Seed] 完成，数据库连接已关闭\n");
}

seed().catch((err) => {
  console.error("[Seed] 错误:", err);
  process.exit(1);
});
