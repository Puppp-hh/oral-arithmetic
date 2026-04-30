/**
 * 文件说明：动态题目生成器
 * 系统作用：不依赖数据库，纯算法按难度等级随机生成加减乘除混合运算题目
 *          生成结果写入 DB，之后 submitAnswer 凭 problem_id 判题
 *
 * 难度等级对应规则：
 *   Level 1  — 10以内加法       (a+b, a,b∈[1,9], a+b≤10)
 *   Level 2  — 10以内减法       (a-b, a∈[1,10], b∈[1,a])
 *   Level 3  — 两位数+一位数    (含进位)
 *   Level 4  — 两位数+两位数    (含进位)
 *   Level 5  — 两位数减法       (含退位)
 *   Level 6  — 乘法表 1-5
 *   Level 7  — 乘法表 6-9
 *   Level 8  — 整除除法
 *   Level 9  — 混合运算 (a op b op c, 不带括号)
 *   Level 10 — 高难度混合 (两位数乘/除 + 三位数加减)
 *
 * 调用链：problemService.generateProblems → generator.generate(level, n) → Problem[]
 */
import { OperationType } from '../types';

export interface RawProblem {
  problem_content: string;
  problem_type: OperationType;
  operation_type: string;
  difficulty_level: number;
  standard_answer: string;
  solution_steps: string;
}

// ── 工具函数 ──────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function steps(expr: string, answer: number): string {
  return JSON.stringify({ expression: expr, answer });
}

// ── 各难度生成函数 ─────────────────────────────────────────────

function genLevel1(): RawProblem {
  const a = rand(1, 9);
  const b = rand(1, 10 - a);
  const ans = a + b;
  return {
    problem_content: `${a} + ${b} = ?`,
    problem_type: 'addition',
    operation_type: '10以内加法',
    difficulty_level: 1,
    standard_answer: String(ans),
    solution_steps: steps(`${a} + ${b}`, ans),
  };
}

function genLevel2(): RawProblem {
  const a = rand(1, 10);
  const b = rand(1, a);
  const ans = a - b;
  return {
    problem_content: `${a} - ${b} = ?`,
    problem_type: 'subtraction',
    operation_type: '10以内减法',
    difficulty_level: 2,
    standard_answer: String(ans),
    solution_steps: steps(`${a} - ${b}`, ans),
  };
}

function genLevel3(): RawProblem {
  const a = rand(10, 99);
  const b = rand(1, 9);
  const ans = a + b;
  const hasCarry = (a % 10) + b >= 10;
  return {
    problem_content: `${a} + ${b} = ?`,
    problem_type: 'addition',
    operation_type: hasCarry ? '两位数加一位数(进位)' : '两位数加一位数',
    difficulty_level: 3,
    standard_answer: String(ans),
    solution_steps: steps(`${a} + ${b}`, ans),
  };
}

function genLevel4(): RawProblem {
  const a = rand(10, 90);
  const b = rand(10, 99 - a + 10);
  const ans = a + b;
  const hasCarry = (a % 10) + (b % 10) >= 10;
  return {
    problem_content: `${a} + ${b} = ?`,
    problem_type: 'addition',
    operation_type: hasCarry ? '两位数加两位数(进位)' : '两位数加两位数',
    difficulty_level: 4,
    standard_answer: String(ans),
    solution_steps: steps(`${a} + ${b}`, ans),
  };
}

function genLevel5(): RawProblem {
  const a = rand(20, 100);
  const b = rand(10, a - 1);
  const ans = a - b;
  const hasBorrow = (a % 10) < (b % 10);
  return {
    problem_content: `${a} - ${b} = ?`,
    problem_type: 'subtraction',
    operation_type: hasBorrow ? '两位数减法(退位)' : '两位数减法',
    difficulty_level: 5,
    standard_answer: String(ans),
    solution_steps: steps(`${a} - ${b}`, ans),
  };
}

function genLevel6(): RawProblem {
  const a = rand(2, 5);
  const b = rand(2, 5);
  const ans = a * b;
  return {
    problem_content: `${a} × ${b} = ?`,
    problem_type: 'multiplication',
    operation_type: '乘法表1-5',
    difficulty_level: 6,
    standard_answer: String(ans),
    solution_steps: steps(`${a} × ${b}`, ans),
  };
}

function genLevel7(): RawProblem {
  const a = rand(6, 9);
  const b = rand(2, 9);
  const ans = a * b;
  return {
    problem_content: `${a} × ${b} = ?`,
    problem_type: 'multiplication',
    operation_type: '乘法表6-9',
    difficulty_level: 7,
    standard_answer: String(ans),
    solution_steps: steps(`${a} × ${b}`, ans),
  };
}

function genLevel8(): RawProblem {
  const b = rand(2, 9);
  const ans = rand(2, 12);
  const a = b * ans;
  return {
    problem_content: `${a} ÷ ${b} = ?`,
    problem_type: 'division',
    operation_type: '基础整除',
    difficulty_level: 8,
    standard_answer: String(ans),
    solution_steps: steps(`${a} ÷ ${b}`, ans),
  };
}

function genLevel9(): RawProblem {
  // 三种混合格式：加+乘、减-除、乘+加
  const variant = rand(1, 3);
  let content: string;
  let ans: number;
  let opType: string;

  if (variant === 1) {
    // a + b × c
    const b = rand(2, 9);
    const c = rand(2, 9);
    const a = rand(1, 50);
    ans = a + b * c;
    content = `${a} + ${b} × ${c} = ?`;
    opType = '混合运算(先乘除后加减)';
  } else if (variant === 2) {
    // a × b - c (保证结果 > 0)
    const a = rand(3, 9);
    const b = rand(3, 9);
    const c = rand(1, a * b - 1);
    ans = a * b - c;
    content = `${a} × ${b} - ${c} = ?`;
    opType = '混合运算(先乘除后加减)';
  } else {
    // (a + b) × c
    const a = rand(2, 15);
    const b = rand(2, 15);
    const c = rand(2, 9);
    ans = (a + b) * c;
    content = `(${a} + ${b}) × ${c} = ?`;
    opType = '混合运算(括号优先)';
  }

  return {
    problem_content: content,
    problem_type: 'mixed',
    operation_type: opType,
    difficulty_level: 9,
    standard_answer: String(ans),
    solution_steps: steps(content.replace(' = ?', ''), ans),
  };
}

function genLevel10(): RawProblem {
  const variant = rand(1, 4);
  let content: string;
  let ans: number;

  if (variant === 1) {
    // 三位数 + 三位数
    const a = rand(100, 499);
    const b = rand(100, 999 - a);
    ans = a + b;
    content = `${a} + ${b} = ?`;
  } else if (variant === 2) {
    // 三位数 - 两位数
    const a = rand(200, 999);
    const b = rand(50, 199);
    ans = a - b;
    content = `${a} - ${b} = ?`;
  } else if (variant === 3) {
    // 两位数 × 两位数（≤ 50）
    const a = rand(11, 25);
    const b = rand(11, 25);
    ans = a * b;
    content = `${a} × ${b} = ?`;
  } else {
    // (a + b) × c - d
    const a = rand(10, 30);
    const b = rand(10, 30);
    const c = rand(3, 9);
    const d = rand(1, 50);
    ans = (a + b) * c - d;
    content = `(${a} + ${b}) × ${c} - ${d} = ?`;
  }

  return {
    problem_content: content,
    problem_type: 'mixed',
    operation_type: '高难度混合',
    difficulty_level: 10,
    standard_answer: String(ans),
    solution_steps: steps(content.replace(' = ?', ''), ans),
  };
}

// ── 分发入口 ──────────────────────────────────────────────────

const generators: Record<number, () => RawProblem> = {
  1: genLevel1,
  2: genLevel2,
  3: genLevel3,
  4: genLevel4,
  5: genLevel5,
  6: genLevel6,
  7: genLevel7,
  8: genLevel8,
  9: genLevel9,
  10: genLevel10,
};

function genAdditionByLevel(level: number): RawProblem {
  const max = level <= 2 ? 10 : level <= 4 ? 100 : level <= 7 ? 500 : 1000;
  const a = rand(1, Math.max(2, max - 1));
  const b = rand(1, max - a);
  const ans = a + b;
  return {
    problem_content: `${a} + ${b} = ?`,
    problem_type: 'addition',
    operation_type: `${max}以内加法`,
    difficulty_level: level,
    standard_answer: String(ans),
    solution_steps: steps(`${a} + ${b}`, ans),
  };
}

function genSubtractionByLevel(level: number): RawProblem {
  const max = level <= 2 ? 10 : level <= 4 ? 100 : level <= 7 ? 500 : 1000;
  const a = rand(2, max);
  const b = rand(1, a - 1);
  const ans = a - b;
  return {
    problem_content: `${a} - ${b} = ?`,
    problem_type: 'subtraction',
    operation_type: `${max}以内减法`,
    difficulty_level: level,
    standard_answer: String(ans),
    solution_steps: steps(`${a} - ${b}`, ans),
  };
}

function genMultiplicationByLevel(level: number): RawProblem {
  const maxA = level <= 3 ? 5 : level <= 6 ? 9 : 25;
  const maxB = level <= 3 ? 5 : level <= 6 ? 9 : 25;
  const a = rand(2, maxA);
  const b = rand(2, maxB);
  const ans = a * b;
  return {
    problem_content: `${a} × ${b} = ?`,
    problem_type: 'multiplication',
    operation_type: level <= 6 ? '表内乘法' : '两位数乘法',
    difficulty_level: level,
    standard_answer: String(ans),
    solution_steps: steps(`${a} × ${b}`, ans),
  };
}

function genDivisionByLevel(level: number): RawProblem {
  const divisorMax = level <= 3 ? 5 : level <= 6 ? 9 : 18;
  const quotientMax = level <= 3 ? 5 : level <= 6 ? 12 : 30;
  const b = rand(2, divisorMax);
  const ans = rand(2, quotientMax);
  const a = b * ans;
  return {
    problem_content: `${a} ÷ ${b} = ?`,
    problem_type: 'division',
    operation_type: '整除口算',
    difficulty_level: level,
    standard_answer: String(ans),
    solution_steps: steps(`${a} ÷ ${b}`, ans),
  };
}

function genMixedByLevel(level: number): RawProblem {
  const pick = rand(1, 4);
  if (pick === 1) {
    const a = genAdditionByLevel(level);
    const left = Number(a.standard_answer);
    const minus = Math.min(left - 1, rand(1, Math.max(1, left - 1)));
    const ans = left - minus;
    return {
      problem_content: `${a.problem_content.replace(' = ?', '')} - ${minus} = ?`,
      problem_type: 'mixed',
      operation_type: '加减混合',
      difficulty_level: level,
      standard_answer: String(ans),
      solution_steps: steps(`${a.problem_content.replace(' = ?', '')} - ${minus}`, ans),
    };
  }
  if (pick === 2) {
    const a = rand(1, level <= 3 ? 20 : 80);
    const b = rand(2, level <= 3 ? 5 : 12);
    const c = rand(2, level <= 3 ? 5 : 12);
    const ans = a + b * c;
    return {
      problem_content: `${a} + ${b} × ${c} = ?`,
      problem_type: 'mixed',
      operation_type: '先乘除后加减',
      difficulty_level: level,
      standard_answer: String(ans),
      solution_steps: steps(`${a} + ${b} × ${c}`, ans),
    };
  }
  if (pick === 3) {
    const a = rand(2, level <= 4 ? 9 : 20);
    const b = rand(2, level <= 4 ? 9 : 20);
    const c = rand(1, level <= 4 ? 20 : 80);
    const ans = a * b + c;
    return {
      problem_content: `${a} × ${b} + ${c} = ?`,
      problem_type: 'mixed',
      operation_type: '乘加混合',
      difficulty_level: level,
      standard_answer: String(ans),
      solution_steps: steps(`${a} × ${b} + ${c}`, ans),
    };
  }
  const a = rand(2, level <= 4 ? 12 : 30);
  const b = rand(2, level <= 4 ? 12 : 30);
  const c = rand(2, level <= 4 ? 5 : 9);
  const ans = (a + b) * c;
  return {
    problem_content: `(${a} + ${b}) × ${c} = ?`,
    problem_type: 'mixed',
    operation_type: '括号混合',
    difficulty_level: level,
    standard_answer: String(ans),
    solution_steps: steps(`(${a} + ${b}) × ${c}`, ans),
  };
}

function generateByOperation(level: number, opType: OperationType): RawProblem {
  if (opType === 'addition') return genAdditionByLevel(level);
  if (opType === 'subtraction') return genSubtractionByLevel(level);
  if (opType === 'multiplication') return genMultiplicationByLevel(level);
  if (opType === 'division') return genDivisionByLevel(level);
  return genMixedByLevel(level);
}

/**
 * 生成 n 道指定难度的题目
 * @param level 难度等级 1-10
 * @param n     题目数量
 * @param opType 可选：限定运算类型（只在对应 level 有效时筛选）
 */
export function generateProblems(
  level: number,
  n: number,
  opType?: OperationType
): RawProblem[] {
  const lv = Math.min(10, Math.max(1, level));
  const gen = generators[lv] ?? genLevel1;
  const results: RawProblem[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (results.length < n && attempts < n * 30) {
    attempts++;
    const p = opType ? generateByOperation(lv, opType) : gen();
    // 同一次请求内去重（避免完全相同的题目）
    if (seen.has(p.problem_content)) continue;
    seen.add(p.problem_content);
    results.push(p);
  }

  return results;
}

/**
 * 标准化答案：去空格，数字类型统一为整数字符串
 * 支持：'5' == '5.0' == '5.00'
 */
export function normalizeAnswer(raw: string): string {
  const trimmed = raw.trim();
  const num = Number(trimmed);
  if (!isNaN(num) && isFinite(num)) {
    return Number.isInteger(num) ? String(num) : trimmed;
  }
  return trimmed.toLowerCase();
}
