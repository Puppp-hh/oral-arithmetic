/**
 * 文件说明：OpenAPI 3.0 接口文档定义
 * 系统作用：集中维护所有接口的请求/响应结构，由 swagger-ui-express 渲染为可交互文档
 * 访问路径：http://localhost:3000/api-docs
 * 调用链：app.ts → swaggerUi.serve + swaggerUi.setup(swaggerSpec) → /api-docs
 *
 * 覆盖接口：
 *   POST /api/auth/student/login    学生登录
 *   POST /api/auth/teacher/login    教师登录
 *   POST /api/auth/student/register 学生注册
 *   POST /api/auth/logout           登出
 *   GET  /api/problems/generate     随机出题
 *   POST /api/problems/submit       提交答案
 *   GET  /api/problems/:id          查询单题
 *   GET  /api/mistakes              错题本列表
 *   GET  /api/stats/summary         学习摘要
 *   GET  /api/stats/daily           每日统计
 */

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: '小学数学口算分级训练系统 API',
    version: '1.0.0',
    description: `
## 接口说明

本系统为小学数学口算训练平台，提供：
- 学生/教师登录认证（JWT + Redis）
- 分级出题（1-10 难度，5 种题型）
- 自动判题 + 错题本 + 等级评估
- 学习统计（每日/累计/近20题）

## 认证方式

除登录/注册接口外，所有接口需在 Header 中携带：
\`\`\`
Authorization: Bearer <token>
\`\`\`

## 响应格式

所有接口统一返回：
\`\`\`json
{ "code": 200, "message": "ok", "data": { ... } }
\`\`\`
    `,
    contact: { name: 'API Support' },
  },
  servers: [
    { url: 'http://localhost:3000', description: '本地开发环境' },
  ],

  // ── 全局安全方案 ────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '登录后获取的 token，填入此处即可自动带上 Authorization Header',
      },
    },
    schemas: {
      // ── 通用响应包装 ────────────────────────────────────────
      ApiResponse: {
        type: 'object',
        properties: {
          code: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'ok' },
          data: { type: 'object', nullable: true },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          code: { type: 'integer', example: 400 },
          message: { type: 'string', example: '参数校验失败' },
          data: {
            type: 'object',
            properties: {
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'account' },
                    message: { type: 'string', example: '账号不能为空' },
                  },
                },
              },
            },
          },
        },
      },

      // ── 登录响应 ────────────────────────────────────────────
      LoginResult: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          role: { type: 'string', enum: ['student', 'teacher'], example: 'student' },
          userInfo: {
            type: 'object',
            properties: {
              userId: { type: 'integer', example: 1 },
              account: { type: 'string', example: 'student001' },
              name: { type: 'string', example: '张三' },
            },
          },
        },
      },

      // ── 题目 ────────────────────────────────────────────────
      Problem: {
        type: 'object',
        properties: {
          problem_id: { type: 'integer', example: 42 },
          problem_content: { type: 'string', example: '7 + 8 = ?' },
          problem_type: {
            type: 'string',
            enum: ['addition', 'subtraction', 'multiplication', 'division', 'mixed'],
            example: 'addition',
          },
          difficulty_level: { type: 'integer', minimum: 1, maximum: 10, example: 3 },
          standard_answer: { type: 'string', example: '15' },
          solution_steps: { type: 'string', nullable: true, example: '7 + 8 = 15' },
        },
      },

      // ── 提交答案响应 ─────────────────────────────────────────
      SubmitResult: {
        type: 'object',
        properties: {
          is_correct: { type: 'boolean', example: true },
          standard_answer: { type: 'string', example: '15' },
          score: { type: 'integer', example: 10 },
          problem_content: { type: 'string', example: '7 + 8 = ?' },
          solution_steps: { type: 'string', nullable: true },
          record_id: { type: 'integer', example: 101 },
          level_changed: { type: 'boolean', example: false },
          new_level: { type: 'integer', example: 3 },
          recent_20_correct_rate: { type: 'number', example: 90.0 },
        },
      },

      // ── 学习摘要 ─────────────────────────────────────────────
      Summary: {
        type: 'object',
        properties: {
          student_name: { type: 'string', example: '张三' },
          total_problems: { type: 'integer', example: 200 },
          cumulative_correct_rate: { type: 'number', example: 87.5 },
          current_level: { type: 'integer', example: 4 },
          recent_20_correct_rate: { type: 'number', example: 90.0 },
          is_promotion_qualified: { type: 'boolean', example: true },
          today_problems: { type: 'integer', example: 20 },
          today_correct_rate: { type: 'number', example: 95.0 },
        },
      },
    },
  },

  // ── 接口分组标签 ────────────────────────────────────────────
  tags: [
    { name: '认证', description: '登录、注册、登出、Token 管理' },
    { name: '题目', description: '出题、提交答案、查询单题' },
    { name: '错题本', description: '错题查询、删除、标记已改正' },
    { name: '统计', description: '学习摘要、每日统计、近20题' },
  ],

  // ── 接口定义 ────────────────────────────────────────────────
  paths: {

    // ════════════════════════════════════════════════════════
    // 认证
    // ════════════════════════════════════════════════════════

    '/api/auth/student/login': {
      post: {
        tags: ['认证'],
        summary: '学生登录',
        description: '用账号密码换取 JWT token，后续请求在 Header 中携带 `Authorization: Bearer <token>`',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['account', 'password'],
                properties: {
                  account: { type: 'string', example: 'student001', description: '学生账号（1-50位）' },
                  password: { type: 'string', example: '123456', description: '密码（至少6位）' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '登录成功',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: { data: { $ref: '#/components/schemas/LoginResult' } },
                    },
                  ],
                },
                example: {
                  code: 200,
                  message: '登录成功',
                  data: {
                    token: 'eyJhbGciOiJIUzI1NiJ9...',
                    role: 'student',
                    userInfo: { userId: 1, account: 'student001', name: '张三' },
                  },
                },
              },
            },
          },
          400: { description: '参数校验失败', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
          401: { description: '账号或密码错误' },
        },
      },
    },

    '/api/auth/teacher/login': {
      post: {
        tags: ['认证'],
        summary: '教师登录',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['account', 'password'],
                properties: {
                  account: { type: 'string', example: 'teacher001' },
                  password: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '登录成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
          400: { description: '参数校验失败' },
          401: { description: '账号或密码错误' },
        },
      },
    },

    '/api/auth/student/register': {
      post: {
        tags: ['认证'],
        summary: '学生注册',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['account', 'password', 'name', 'class_id', 'grade_id'],
                properties: {
                  account: { type: 'string', example: 'student002', description: '账号（3-50位，字母数字下划线）' },
                  password: { type: 'string', example: '123456' },
                  name: { type: 'string', example: '李四' },
                  class_id: { type: 'integer', example: 1 },
                  grade_id: { type: 'integer', example: 1 },
                  gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
                  birth_date: { type: 'string', example: '2015-06-01' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '注册成功' },
          400: { description: '参数校验失败 / 账号已存在' },
        },
      },
    },

    '/api/auth/logout': {
      post: {
        tags: ['认证'],
        summary: '登出',
        description: '销毁 Redis 中的 token，使当前 token 立即失效',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: '已退出登录' },
          401: { description: 'token 无效或已过期' },
        },
      },
    },

    '/api/auth/refresh': {
      post: {
        tags: ['认证'],
        summary: '刷新 Token',
        description: '用旧 token 换取新 token，旧 token 同时失效',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: '新 token 返回' },
          401: { description: 'token 已失效' },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    // 题目
    // ════════════════════════════════════════════════════════

    '/api/problems/generate': {
      get: {
        tags: ['题目'],
        summary: '随机出题',
        description: `按难度等级和题型出题，优先命中 Redis 缓存（key: \`problem:pool:level:{n}:type:{t}\`），缓存未命中时查 DB 并动态生成补充`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'difficulty_level',
            in: 'query',
            description: '难度等级 1-10（默认 1）',
            schema: { type: 'integer', minimum: 1, maximum: 10, example: 3 },
          },
          {
            name: 'count',
            in: 'query',
            description: '出题数量 1-20（默认 10）',
            schema: { type: 'integer', minimum: 1, maximum: 20, example: 5 },
          },
          {
            name: 'operation_type',
            in: 'query',
            description: '题型筛选（不传则混合）',
            schema: {
              type: 'string',
              enum: ['addition', 'subtraction', 'multiplication', 'division', 'mixed'],
            },
          },
        ],
        responses: {
          200: {
            description: '出题成功',
            content: {
              'application/json': {
                example: {
                  code: 200,
                  message: '出题成功',
                  data: {
                    count: 5,
                    problems: [
                      { problem_id: 42, problem_content: '7 + 8 = ?', problem_type: 'addition', difficulty_level: 3, standard_answer: '15' },
                    ],
                  },
                },
              },
            },
          },
          400: { description: '参数校验失败（如 difficulty_level 超范围）' },
          401: { description: 'token 无效' },
        },
      },
    },

    '/api/problems/submit': {
      post: {
        tags: ['题目'],
        summary: '提交答案',
        description: `
判题流程：
1. 标准化答案对比（"5" == "5.0"）
2. 写入 training_record
3. 答错 → upsert mistake_book；答对 → 自动标记已改正
4. 评估近20题正确率 → 触发升/降级（≥85% 升级，<60% 降级）
5. 更新今日 learning_statistic
6. 删除 Redis summary 缓存（下次查询摘要时重建）

**仅学生角色可调用**
        `,
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['problem_id', 'answer_content', 'answer_time_seconds'],
                properties: {
                  problem_id: { type: 'integer', example: 42 },
                  answer_content: { type: 'string', example: '15' },
                  answer_time_seconds: { type: 'number', minimum: 0, maximum: 3600, example: 8.5 },
                  session_id: { type: 'string', example: 'uuid-xxx', description: '可选，前端自行生成的会话 ID' },
                  is_review: { type: 'boolean', example: false, description: '是否为复习题（默认 false）' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '判题成功',
            content: {
              'application/json': {
                example: {
                  code: 200,
                  message: '回答正确！',
                  data: {
                    is_correct: true,
                    standard_answer: '15',
                    score: 10,
                    problem_content: '7 + 8 = ?',
                    solution_steps: '7 + 8 = 15',
                    record_id: 101,
                    level_changed: false,
                    new_level: 3,
                    recent_20_correct_rate: 90.0,
                  },
                },
              },
            },
          },
          400: { description: '参数校验失败' },
          401: { description: 'token 无效' },
          403: { description: '仅学生可提交答案' },
        },
      },
    },

    '/api/problems/{id}': {
      get: {
        tags: ['题目'],
        summary: '查询单题详情',
        description: '含解题步骤，用于错题本展示。优先命中 Redis 缓存（key: `problem:id:{id}`，TTL=3600s）',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 42 } },
        ],
        responses: {
          200: { description: '题目详情', content: { 'application/json': { schema: { $ref: '#/components/schemas/Problem' } } } },
          404: { description: '题目不存在' },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    // 错题本
    // ════════════════════════════════════════════════════════

    '/api/mistakes': {
      get: {
        tags: ['错题本'],
        summary: '获取错题本列表',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, example: 1 } },
          { name: 'page_size', in: 'query', schema: { type: 'integer', default: 10, example: 10 } },
          { name: 'is_corrected', in: 'query', description: '是否已改正（不传=全部）', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: '错题列表（分页）' },
          401: { description: 'token 无效' },
        },
      },
    },

    '/api/mistakes/{id}': {
      delete: {
        tags: ['错题本'],
        summary: '删除错题',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 5 } },
        ],
        responses: {
          200: { description: '删除成功' },
          404: { description: '错题不存在' },
        },
      },
    },

    '/api/mistakes/{id}/corrected': {
      put: {
        tags: ['错题本'],
        summary: '标记错题为已改正',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 5 } },
        ],
        responses: {
          200: { description: '标记成功' },
          404: { description: '错题不存在' },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    // 统计
    // ════════════════════════════════════════════════════════

    '/api/stats/summary': {
      get: {
        tags: ['统计'],
        summary: '学习摘要',
        description: '返回学生总题数、累计正确率、当前等级、今日数据等。结果缓存 60s，答题后自动失效。',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: '摘要数据',
            content: {
              'application/json': {
                example: {
                  code: 200,
                  message: 'ok',
                  data: {
                    student_name: '张三',
                    total_problems: 200,
                    cumulative_correct_rate: 87.5,
                    current_level: 4,
                    recent_20_correct_rate: 90.0,
                    is_promotion_qualified: true,
                    today_problems: 20,
                    today_correct_rate: 95.0,
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/stats/daily': {
      get: {
        tags: ['统计'],
        summary: '每日学习统计',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'days', in: 'query', description: '查询最近 N 天（默认 7）', schema: { type: 'integer', default: 7, example: 7 } },
        ],
        responses: {
          200: { description: '每日统计列表（按日期降序）' },
        },
      },
    },

    '/api/stats/recent20': {
      get: {
        tags: ['统计'],
        summary: '最近 20 题详情',
        description: '返回最近20题的题目内容、作答结果、答题时长，及综合正确率',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: '近20题数据' },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    // 健康检查
    // ════════════════════════════════════════════════════════

    '/health': {
      get: {
        tags: ['系统'],
        summary: '健康检查',
        description: '用于 Docker / K8s 存活探针，不记录请求日志',
        responses: {
          200: {
            description: '服务正常',
            content: {
              'application/json': {
                example: { code: 200, message: 'ok', data: { status: 'running', time: '2024-01-01T00:00:00.000Z' } },
              },
            },
          },
        },
      },
    },
  },
};
