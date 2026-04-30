# 小学数学口算分级训练系统 — 工程级开发文档

> 面向有一定编程基础的开发者。本文档目标：从零开始，按步骤复现完整项目，每一步配有原理解释和验证方法。

---

# 一、项目介绍

## 1.1 项目背景与功能

本系统面向小学生群体，提供自适应的数学口算训练服务。核心问题是：传统纸质口算训练无法追踪学生进度、无法自动判题、也无法根据掌握情况动态调整难度。

本系统解决了以下问题：

**功能清单：**

| 功能模块   | 具体能力                                          |
| ---------- | ------------------------------------------------- |
| 账号系统   | 学生注册/登录，教师登录，基于 JWT 的无状态认证    |
| 自适应出题 | 按 1-10 难度等级出题，支持加减乘除及混合题型      |
| 判题引擎   | 标准化答案对比，支持 "5" 与 "5.0" 等价判断        |
| 错题本     | 自动收录答错题目，支持标记已改正、分页查询        |
| 等级系统   | 基于近 20 题正确率自动升/降级（≥85% 升，<60% 降） |
| 学习统计   | 每日统计、累计统计、近20题正确率趋势              |
| 缓存加速   | Redis 缓存题目池、统计摘要，减少数据库压力        |

---

## 1.2 系统模块划分

整个系统由三个部分组成，理解模块边界是架构设计的第一步：

```
┌─────────────────────────────────────────────────────────┐
│                      微信小程序（前端）                    │
│   页面渲染 / 用户交互 / wx.request 发起 HTTP 请求          │
└────────────────────────┬────────────────────────────────┘
                         │  HTTP/HTTPS（JSON 格式）
┌────────────────────────▼────────────────────────────────┐
│                   Node.js 后端服务                        │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  认证模块 │  │  题目模块 │  │  错题模块 │  │ 统计模块 │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              中间件层                              │   │
│  │  JWT 鉴权 / 参数校验 / 请求日志 / 错误捕获          │   │
│  └──────────────────────────────────────────────────┘   │
└──────────┬─────────────────────────┬────────────────────┘
           │                         │
┌──────────▼──────────┐  ┌──────────▼──────────────────┐
│       MySQL          │  │          Redis               │
│   持久化存储           │  │   缓存 / Token 存储           │
│  学生/教师/题目/记录   │  │  token:xxx / problem:xxx    │
└─────────────────────┘  └─────────────────────────────┘
```

**模块职责说明：**

- **微信小程序**：纯前端，不持有业务逻辑，通过 wx.request 调用后端 HTTP 接口。
- **Node.js 后端**：接收请求、校验参数、执行业务逻辑、读写 MySQL 和 Redis、返回标准化 JSON 响应。
- **MySQL**：存储需要持久化的结构化数据——用户账号、题目库、训练记录、错题本、统计数据。
- **Redis**：存储需要高速访问的临时数据——JWT token（7200秒有效期）、题目池缓存（300秒）、统计摘要缓存（60秒）。

---

## 1.3 技术选型（为什么选这些技术）

技术选型不是随机的。每一项技术都对应它解决的具体问题。

### Node.js + Express：为什么不用 Java/Python

**问题：** 后端需要处理大量并发的 HTTP 请求，但每个请求的计算量不大，主要是等待数据库/Redis 的 I/O 响应。

**Node.js 的核心优势：** 非阻塞 I/O 模型。

传统多线程模型（如 Java Servlet）处理方式：每个请求分配一个线程，等待数据库响应期间该线程阻塞，什么都不做但占用内存。

Node.js 的处理方式：单线程事件循环，发出数据库查询后不等待，继续处理其他请求，数据库返回结果时通过回调/Promise 处理。对于 I/O 密集型应用，这意味着同样的硬件资源可以处理更多并发请求。

**Express 的原因：** Express 是 Node.js 生态中最成熟的 Web 框架，中间件机制与本项目的"请求处理管道"（日志记录 → 鉴权 → 参数校验 → 业务处理）高度匹配。

**TypeScript 的原因：** JavaScript 是动态类型语言，在团队协作和大型项目中容易产生难以追踪的类型错误。TypeScript 在编译期检查类型，配合 IDE 自动补全，大幅减少运行时错误。本项目中所有接口的请求/响应结构、数据库模型都通过 TypeScript 接口定义，保证数据流全链路类型安全。

---

### MySQL：为什么用关系型数据库

**问题：** 系统数据之间有明确的关系：学生属于班级，训练记录属于学生，错题记录关联题目和学生。

**关系型数据库的核心价值：**

1. **数据完整性（外键约束）**：不能给不存在的学生写训练记录，数据库层面保证引用完整性。
2. **复杂查询（JOIN）**：统计"某学生今日各题型正确率"需要连接多个表，SQL 天然支持。
3. **事务（ACID）**：提交答案时需要同时写训练记录、更新错题本、更新统计，这些操作要么全成功要么全回滚，关系型数据库的事务保证这一点。

**为什么是 MySQL 8.0：** 社区活跃、文档完善、支持 utf8mb4 字符集（可以正确存储中文及 emoji）、JSON 列支持。

---

### Redis：为什么要引入缓存层

**问题一：** JWT token 本身是无状态的（服务端不存储），但项目需要支持主动登出（让 token 立即失效）。解决方案是将有效 token 存入 Redis，每次请求验证 Redis 中是否存在该 token，登出时删除。

**问题二：** 出题接口频繁被调用，但题目数据很少变化（几分钟内相同难度的题目池不变）。每次调用都查 MySQL 是浪费，将题目池缓存到 Redis，TTL 设为 300 秒，相同参数的请求直接从内存返回，响应时间从几十毫秒降到 1 毫秒以内。

**Redis 快的本质原因：**

- 数据存储在内存（RAM），内存访问延迟约 100 纳秒，磁盘访问延迟约 10 毫秒，相差约 10 万倍。
- 数据结构简单（字符串/列表/哈希），操作复杂度低。
- 单线程处理命令，无锁竞争。

---

### JWT（JSON Web Token）：为什么不用 Session

**传统 Session 的问题：**
服务端将用户状态存储在内存或数据库中，用 session_id（存在 Cookie 里）标识用户。问题在于：

- 微信小程序没有 Cookie 机制，session_id 传输需要额外处理。
- 多台服务器部署时，不同服务器不共享内存中的 session，需要额外的共享存储（又回到了 Redis 或数据库）。

**JWT 的方案：**
服务端签发一个包含用户身份信息的 token，客户端保存，每次请求在 Header 中携带。服务端通过验证签名来确认 token 合法，不需要查数据库（纯计算）。

**在本项目中：** JWT 做无状态身份验证，Redis 配合实现主动登出。两者结合，兼顾了性能和安全性。

---

### pino：为什么不用 console.log

**console.log 的问题：**

- 同步写入，阻塞 Node.js 事件循环（在高并发下影响性能）。
- 输出纯文本，无法被日志分析工具解析。
- 没有级别区分，无法在生产环境过滤调试信息。
- 无法追踪某一次请求经历了哪些处理步骤。

**pino 的优势：**

- 异步写入（基于 sonic-boom），比 console.log 快 5 倍以上。
- 输出 JSON 格式，可直接被 ELK Stack、Datadog 等工具摄取和查询。
- 分级（trace/debug/info/warn/error/fatal），生产环境只输出 info 及以上级别。
- pino-http 中间件自动记录每个请求的 method、url、statusCode、responseTime。

---

### Docker：为什么要容器化

**没有 Docker 时的问题：**
项目依赖 Node.js 20、MySQL 8.0、Redis 7 的特定版本。开发者 A 的机器是 macOS，开发者 B 是 Windows，服务器是 Linux。三个环境的配置差异（系统库版本、环境变量、端口占用）导致"在我机器上能跑"的经典问题。

**Docker 解决的问题：**
将应用和它的全部依赖打包进一个容器镜像，无论在哪个机器上运行这个镜像，行为完全一致。Docker Compose 进一步解决了多服务编排问题：一条命令同时启动 Node.js、MySQL、Redis，并配置好它们之间的网络通信。

---

# 二、开发环境准备

本章目标：在本地机器上搭建完整的开发环境，使后续代码可以直接运行。

**环境假设：** macOS（Apple Silicon 或 Intel 均适用）。Windows 用户请在每个步骤参照各工具官方文档的 Windows 安装说明，命令结构相同，安装方式有差异。

---

## 2.1 Node.js 安装

### 原理解释

Node.js 是本项目后端代码的运行时。直接从官网下载安装包存在一个问题：不同项目可能依赖不同版本的 Node.js，直接安装只能有一个版本。

推荐使用 **nvm**（Node Version Manager）管理多个 Node.js 版本，可以随时切换，也方便未来升级。

### 操作步骤

**步骤 1：安装 nvm**

打开终端，执行：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

安装脚本会自动将以下内容写入你的 shell 配置文件（`~/.zshrc` 或 `~/.bash_profile`）：

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

让配置立即生效：

```bash
source ~/.zshrc
```

**步骤 2：安装 Node.js 20 LTS**

```bash
nvm install 20
nvm use 20
nvm alias default 20
```

命令解释：

- `nvm install 20`：下载并安装 Node.js 20（最新的 20.x LTS 版本）。
- `nvm use 20`：在当前终端会话中使用 Node.js 20。
- `nvm alias default 20`：设置 Node.js 20 为新终端会话的默认版本。

**步骤 3：确认 npm 可用**

Node.js 安装包含 npm（Node Package Manager），无需单独安装：

```bash
node --version
npm --version
```

### 验证方法

执行以下命令，输出应与示例匹配（次版本号可能不同）：

```bash
$ node --version
v20.x.x

$ npm --version
10.x.x
```

进一步验证 Node.js 可执行 JavaScript：

```bash
node -e "console.log('Node.js 运行正常，版本：' + process.version)"
```

预期输出：

```
Node.js 运行正常，版本：v20.x.x
```

---

## 2.2 MySQL 安装

### 原理解释

MySQL 是本项目的主数据库，负责持久化存储所有业务数据。安装 MySQL 后需要：

1. 启动 MySQL 服务（后台守护进程）。
2. 设置 root 密码（开发环境）。
3. 创建项目专用数据库（不同项目用不同数据库，隔离数据）。

### 操作步骤

**macOS 推荐方式：使用 Homebrew 安装**

如果尚未安装 Homebrew（macOS 包管理器）：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

安装 MySQL 8.0：

```bash
brew install mysql@8.0
```

将 MySQL 添加到 PATH（Homebrew 安装后会提示具体路径，以实际提示为准）：

```bash
echo 'export PATH="/opt/homebrew/opt/mysql@8.0/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**步骤 1：启动 MySQL 服务**

```bash
brew services start mysql@8.0
```

`brew services start` 将 MySQL 注册为 macOS 系统服务，开机自启。如果不需要开机自启，改用：

```bash
mysql.server start
```

**步骤 2：初始化 root 密码**

MySQL 8.0 首次安装时 root 密码为空，执行安全初始化脚本：

```bash
mysql_secure_installation
```

脚本会询问：

- 是否设置 VALIDATE PASSWORD 插件（开发环境选 `No`，生产环境选 `Yes`）。
- 设置 root 密码：输入 `Root@123456`（与项目 `.env` 保持一致）。
- 是否移除匿名用户：选 `Yes`。
- 是否禁止 root 远程登录：开发环境选 `No`。
- 是否删除测试数据库：选 `Yes`。
- 是否重新加载权限表：选 `Yes`。

**步骤 3：登录 MySQL 并创建数据库**

```bash
mysql -u root -p
```

输入密码 `Root@123456` 后进入 MySQL 命令行，执行：

```sql
CREATE DATABASE oral_arithmetic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

命令解释：

- `CHARACTER SET utf8mb4`：使用 utf8mb4 字符集。utf8mb4 是 MySQL 中真正的 UTF-8，支持中文、日文及 emoji。普通 utf8 在 MySQL 中实际上只支持 3 字节，无法存储 4 字节的 emoji。
- `COLLATE utf8mb4_unicode_ci`：排序规则，`ci` 表示大小写不敏感（case insensitive）。

确认创建成功：

```sql
SHOW DATABASES;
```

退出 MySQL 命令行：

```sql
EXIT;
```

### 验证方法

```bash
mysql -u root -p -e "SHOW DATABASES;"
```

输入密码后，输出列表中应包含 `oral_arithmetic`：

```
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| oral_arithmetic    |
| performance_schema |
| sys                |
+--------------------+
```

测试连接本项目数据库：

```bash
mysql -u root -p oral_arithmetic -e "SELECT DATABASE();"
```

预期输出：

```
+-----------------+
| DATABASE()      |
+-----------------+
| oral_arithmetic |
+-----------------+
```

---

## 2.3 Redis 安装

### 原理解释

Redis 是本项目的缓存层和 token 存储层。它是一个内存数据库，默认监听端口 6379。

安装 Redis 后需要：

1. 启动 Redis 服务。
2. 确认可以执行 `PING` 命令（Redis 可用性标准检查）。

### 操作步骤

**使用 Homebrew 安装：**

```bash
brew install redis
```

**启动 Redis 服务：**

```bash
brew services start redis
```

这将 Redis 注册为后台服务，开机自启。

如不需要开机自启，临时启动：

```bash
redis-server
```

此命令在前台运行 Redis，关闭终端窗口则停止。生产环境不用这种方式，开发调试时方便观察输出。

### 验证方法

**方法一：使用 redis-cli 发送 PING**

```bash
redis-cli ping
```

预期输出：

```
PONG
```

`PONG` 表示 Redis 正在运行且可以接受连接。

**方法二：执行写入和读取操作**

```bash
redis-cli
```

进入交互式命令行后执行：

```
127.0.0.1:6379> SET test_key "hello"
OK
127.0.0.1:6379> GET test_key
"hello"
127.0.0.1:6379> DEL test_key
(integer) 1
127.0.0.1:6379> EXIT
```

命令解释：

- `SET key value`：写入键值对。
- `GET key`：读取键对应的值。
- `DEL key`：删除键，返回删除的键数量。

**方法三：查看 Redis 运行状态**

```bash
redis-cli info server | grep -E "redis_version|tcp_port|uptime"
```

预期输出：

```
redis_version:7.x.x
tcp_port:6379
uptime_in_seconds:xxx
```

---

## 2.4 开发工具

### 2.4.1 代码编辑器：Visual Studio Code

**为什么选 VS Code：** 开源免费，TypeScript 支持由微软（TypeScript 作者）官方维护，补全和类型检查能力最强，插件生态完善。

**安装：**

访问 [https://code.visualstudio.com](https://code.visualstudio.com) 下载对应系统版本。

macOS 安装后将 `code` 命令添加到 PATH（让终端可以用 `code .` 打开目录）：

打开 VS Code，按 `Cmd + Shift + P` 打开命令面板，输入 `Shell Command: Install 'code' command in PATH`，回车执行。

**必装插件：**

在终端执行（或在 VS Code 扩展面板搜索安装）：

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
```

各插件说明：

| 插件 ID                            | 作用                                    |
| ---------------------------------- | --------------------------------------- |
| `dbaeumer.vscode-eslint`           | 实时显示 ESLint 规则违反，代码规范提醒  |
| `esbenp.prettier-vscode`           | 代码格式化，保存时自动统一缩进/引号风格 |
| `ms-vscode.vscode-typescript-next` | 使用最新版 TypeScript 语言服务          |

**配置 VS Code 保存时自动格式化：**

在项目根目录创建 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

### 2.4.2 接口调试工具：Postman 或 Apifox

**为什么需要接口调试工具：** 微信小程序开发需要同时在两端调试，调试后端接口时不可能每次都启动小程序。接口调试工具允许直接构造 HTTP 请求，独立测试后端逻辑。

**Apifox 安装（国内推荐）：**

访问 [https://apifox.com](https://apifox.com) 下载桌面客户端。

**Postman 安装：**

访问 [https://www.postman.com/downloads](https://www.postman.com/downloads) 下载。

两者功能相似，选其一即可。

---

### 2.4.3 数据库可视化工具：TablePlus 或 MySQL Workbench

**为什么需要可视化工具：** 命令行操作 MySQL 效率低，可视化工具允许浏览表结构、执行查询、直接编辑数据，开发效率大幅提升。

**TablePlus（推荐，macOS 体验更好）：**

访问 [https://tableplus.com](https://tableplus.com) 下载，免费版每次最多打开 2 个标签页，开发够用。

**连接配置：**

| 字段     | 值              |
| -------- | --------------- |
| Host     | 127.0.0.1       |
| Port     | 3306            |
| User     | root            |
| Password | Root@123456     |
| Database | oral_arithmetic |

---

### 2.4.4 验证所有工具安装完成

执行以下命令，确认全部工具可用：

```bash
node --version        # 应输出 v20.x.x
npm --version         # 应输出 10.x.x
mysql --version       # 应输出 mysql  Ver 8.0.x
redis-cli --version   # 应输出 Redis CLI 7.x.x
code --version        # 应输出 VS Code 版本号
```

---

## 2.5 项目初始化

### 原理解释

本节目标：创建项目目录结构，配置 TypeScript 编译选项，安装所有依赖，配置环境变量。

这些配置是一次性工作，一旦完成，所有后续代码都在这个骨架上添加。

### 操作步骤

**步骤 1：创建项目目录结构**

```bash
mkdir -p softWareWork/backend/src/{config,controllers,services,middlewares,utils,routes,types,docs,validators}
mkdir -p softWareWork/sql
cd softWareWork/backend
```

命令解释：

- `mkdir -p`：递归创建多级目录，目录不存在时自动创建父级目录。
- `{config,controllers,...}`：Bash 花括号展开，一次创建多个目录。

执行后目录结构：

```
softWareWork/
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── services/
│       ├── middlewares/
│       ├── utils/
│       ├── routes/
│       ├── types/
│       ├── docs/
│       └── validators/
└── sql/
```

**步骤 2：初始化 npm 项目**

```bash
cd softWareWork/backend
npm init -y
```

`npm init -y` 在当前目录创建 `package.json`，`-y` 表示对所有提问使用默认值（不交互询问）。

`package.json` 是 Node.js 项目的清单文件，记录：

- 项目名称和版本
- 所有依赖（dependencies）
- 开发依赖（devDependencies）
- 可执行的脚本命令（scripts）

**步骤 3：安装生产依赖**

```bash
npm install express cors dotenv mysql2 ioredis jsonwebtoken bcryptjs uuid pino pino-http swagger-ui-express zod
```

各包说明：

| 包名                 | 版本范围 | 作用                                                    |
| -------------------- | -------- | ------------------------------------------------------- |
| `express`            | ^4.x     | HTTP 服务器框架                                         |
| `cors`               | ^2.x     | 处理跨域请求头（微信小程序访问后端需要）                |
| `dotenv`             | ^16.x    | 从 `.env` 文件加载环境变量到 `process.env`              |
| `mysql2`             | ^3.x     | MySQL 驱动（支持 Promise API，性能优于 mysql 包）       |
| `ioredis`            | ^5.x     | Redis 客户端（功能比 node-redis 更完善）                |
| `jsonwebtoken`       | ^9.x     | JWT 签发与验证                                          |
| `bcryptjs`           | ^2.x     | 密码 bcrypt 哈希（纯 JavaScript 实现，无 native addon） |
| `uuid`               | ^9.x     | 生成 UUID v4（用于会话 ID）                             |
| `pino`               | ^10.x    | 高性能结构化日志库                                      |
| `pino-http`          | ^11.x    | pino 的 Express 中间件，自动记录请求日志                |
| `swagger-ui-express` | ^5.x     | 挂载 Swagger UI 到 Express 路由                         |
| `zod`                | ^4.x     | TypeScript 优先的参数校验库                             |

**步骤 4：安装开发依赖**

开发依赖（devDependencies）只在开发和编译时使用，不打包进生产镜像。

```bash
npm install --save-dev typescript ts-node-dev @types/node @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/morgan @types/uuid @types/swagger-ui-express pino-pretty
```

各包说明：

| 包名          | 作用                                             |
| ------------- | ------------------------------------------------ |
| `typescript`  | TypeScript 编译器，将 `.ts` 文件编译为 `.js`     |
| `ts-node-dev` | 开发环境热重载：监听文件变化，自动重启服务       |
| `@types/*`    | 各库的 TypeScript 类型声明文件（官方或社区维护） |
| `pino-pretty` | 开发环境将 JSON 日志格式化为人类可读的彩色输出   |

**步骤 5：配置 TypeScript（tsconfig.json）**

在 `backend/` 目录创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

关键配置项解释：

| 配置项            | 值         | 含义                                                                                         |
| ----------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `target`          | `ES2020`   | 编译产物兼容 ES2020 特性（Node.js 20 完整支持）                                              |
| `module`          | `commonjs` | 使用 CommonJS 模块系统（`require`/`module.exports`），Node.js 默认格式                       |
| `outDir`          | `./dist`   | 编译产物输出目录                                                                             |
| `rootDir`         | `./src`    | 源码根目录，确保 `dist/` 目录结构与 `src/` 一致                                              |
| `strict`          | `true`     | 开启所有严格类型检查（noImplicitAny、strictNullChecks 等）                                   |
| `esModuleInterop` | `true`     | 允许用 `import x from 'module'` 语法导入 CommonJS 模块（如 `import express from 'express'`） |
| `sourceMap`       | `true`     | 生成 source map，错误堆栈指向 TypeScript 源文件而不是编译后的 JS                             |

**步骤 6：配置 package.json scripts**

用编辑器打开 `package.json`，将 `"scripts"` 字段替换为：

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "lint": "eslint src/**/*.ts"
  }
}
```

各命令说明：

| 命令            | 作用                       | 使用场景   |
| --------------- | -------------------------- | ---------- |
| `npm run dev`   | 启动开发服务器（热重载）   | 本地开发   |
| `npm run build` | 编译 TypeScript 到 `dist/` | 生产部署前 |
| `npm start`     | 运行编译后的 `dist/app.js` | 生产环境   |

`ts-node-dev` 参数说明：

- `--respawn`：进程崩溃后自动重启（而不是退出）。
- `--transpile-only`：只做语法转换，跳过类型检查（由 IDE/tsc 负责），启动更快。

**步骤 7：创建环境变量文件**

在 `backend/` 目录创建 `.env`：

```dotenv
# 服务器配置
PORT=3000
NODE_ENV=development

# MySQL 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Root@123456
DB_NAME=oral_arithmetic

# Redis 配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT 配置
JWT_SECRET=oral_arithmetic_jwt_secret_2024
JWT_EXPIRES_IN=7200

# Token Redis 过期时间（秒）
TOKEN_EXPIRES_IN=7200

# Swagger 开关（true = 关闭文档）
DISABLE_SWAGGER=false
```

**为什么使用 `.env` 文件：**

将配置（密码、密钥、主机地址）写死在代码中有两个严重问题：

1. 提交到 Git 仓库后，密码泄漏给所有有仓库访问权限的人。
2. 不同环境（开发/测试/生产）的配置不同，修改代码而不是配置违反了十二要素应用原则（12-factor app）。

`.env` 文件存储本地配置，通过 `.gitignore` 排除在版本控制之外，每个环境维护自己的 `.env`。

同时创建 `.env.example`（提交到 Git，作为模板）：

```dotenv
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=oral_arithmetic
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
JWT_SECRET=change_me_to_a_strong_random_secret
JWT_EXPIRES_IN=7200
TOKEN_EXPIRES_IN=7200
DISABLE_SWAGGER=false
```

**步骤 8：创建 .gitignore**

在 `backend/` 目录创建 `.gitignore`：

```gitignore
node_modules/
dist/
.env
*.log
coverage/
.DS_Store
```

**步骤 9：验证 TypeScript 编译环境**

创建一个最简单的入口文件 `src/app.ts`，验证 TypeScript 配置正确：

```typescript
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.get("/health", (_req, res) => {
  res.json({ code: 200, message: "ok", data: { status: "running" } });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
```

### 验证方法

**验证 1：TypeScript 类型检查通过**

```bash
npx tsc --noEmit
```

`--noEmit` 表示只做类型检查，不生成文件。无输出表示类型检查通过。

**验证 2：开发模式启动**

```bash
npm run dev
```

预期输出：

```
[INFO] 12:00:00 ts-node-dev version 2.x.x (using ts-node 10.x.x, typescript 5.x.x, Node 20.x.x)
[INFO] 12:00:00 Watching for file changes.
Server running on http://localhost:3000
```

**验证 3：接口可达**

新开一个终端执行：

```bash
curl http://localhost:3000/health
```

预期响应：

```json
{ "code": 200, "message": "ok", "data": { "status": "running" } }
```

**验证 4：生产编译**

```bash
npm run build
ls dist/
```

`dist/` 目录应包含 `app.js`，即编译后的 JavaScript 文件。

```bash
node dist/app.js
```

服务应正常启动，行为与 `npm run dev` 一致。

---

## 2.6 环境变量工作原理

### 为什么 `dotenv.config()` 必须在最前面调用

`dotenv.config()` 将 `.env` 文件中的键值对写入 `process.env`。`process.env` 是 Node.js 进程的全局环境变量对象，任何模块都可以读取。

关键点：`dotenv.config()` 必须在所有其他 `import` 语句之后（在文件顶部）、但在读取 `process.env` 的代码之前执行。

如果在 `import { pool } from './config/database'` 之后执行 `dotenv.config()`，数据库配置文件中读取的 `process.env.DB_HOST` 将是 `undefined`，连接会失败。

正确的顺序：

```typescript
import dotenv from "dotenv";
dotenv.config(); // 第一步：加载环境变量

import express from "express"; // 第二步：加载其他模块
import { pool } from "./config/database"; // 此时 process.env 已有值
```

### process.env 的本质

`process.env` 是操作系统传给进程的环境变量字典。在终端执行 `PORT=4000 node app.js` 时，`process.env.PORT` 的值是 `"4000"`（注意是字符串）。

`dotenv` 只是在程序启动时将 `.env` 文件内容预填充到 `process.env`，和系统环境变量的优先级规则是：**已存在的系统环境变量不会被 dotenv 覆盖**。这意味着在 Docker 中通过 `environment` 字段设置的变量优先级高于 `.env` 文件，这是 Docker 部署时覆盖 `DB_HOST` 的工作原理。

---

## 2.7 目录结构设计说明

完成环境初始化后，`backend/src/` 目录的预期结构如下：

```
src/
├── app.ts                  # 入口文件：中间件注册、路由挂载、服务启动
├── config/
│   ├── database.ts         # MySQL 连接池初始化
│   ├── redis.ts            # Redis 客户端初始化
│   └── jwt.ts              # JWT 相关常量（密钥、过期时间）
├── controllers/            # 控制器层：解析 HTTP 请求参数，调用 service，格式化响应
│   ├── auth.controller.ts
│   ├── problem.controller.ts
│   ├── mistake.controller.ts
│   └── stats.controller.ts
├── services/               # 业务逻辑层：数据库查询、Redis 操作、业务算法
│   ├── auth.service.ts
│   ├── problem.service.ts
│   ├── mistake.service.ts
│   ├── stats.service.ts
│   └── redis.service.ts
├── middlewares/            # 中间件：在请求到达 controller 前执行的处理逻辑
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── request-logger.middleware.ts
│   └── validate.middleware.ts
├── validators/             # Zod Schema 定义：接口参数约束
│   ├── auth.validator.ts
│   └── problem.validator.ts
├── routes/                 # 路由定义：URL 路径 → controller 映射
│   ├── auth.routes.ts
│   ├── problem.routes.ts
│   ├── mistake.routes.ts
│   └── stats.routes.ts
├── utils/                  # 工具函数：无业务逻辑的纯函数
│   ├── logger.ts
│   ├── response.ts
│   ├── bcrypt.ts
│   ├── jwt.ts
│   └── problem-generator.ts
├── docs/
│   └── swagger.ts          # OpenAPI 3.0 规范定义
└── types/
    └── index.ts            # 全局 TypeScript 类型定义
```

**为什么要这样分层：**

这是经典的三层架构（Three-tier Architecture）在 Node.js 中的体现：

**Controller 层（控制器）：** 只负责 HTTP 相关工作。解析 `req.body`、`req.query`、`req.params`，调用对应的 service 方法，将结果格式化为 JSON 响应。Controller 不直接操作数据库。

好处：如果将来把 Express 换成 Fastify，只需修改 controller 层，service 层完全不动。

**Service 层（服务）：** 只负责业务逻辑。执行 SQL 查询、Redis 操作、业务计算（如等级评估算法）。Service 不了解 HTTP，不操作 `req`/`res` 对象。

好处：service 可以被多个 controller 调用，也可以被定时任务调用，也可以被测试直接调用（单元测试不需要启动 Express）。

**Config 层（配置）：** 创建数据库连接池、Redis 客户端等全局单例。整个应用共享同一个连接池，而不是每次请求创建新连接（建立 TCP 连接有开销）。

**这种分层的核心价值：** 每一层只依赖下面的层，不依赖上面的层（单向依赖）。修改 HTTP 框架不影响业务逻辑，修改数据库不影响路由定义，职责清晰，变更范围可控。

---

## 2.8 开发环境完整验证

完成所有配置后，执行以下完整验证清单：

**基础服务检查：**

```bash
# MySQL 运行状态
brew services list | grep mysql

# Redis 运行状态
brew services list | grep redis

# Redis 连通性
redis-cli ping

# MySQL 连通性
mysql -u root -pRoot@123456 -e "SELECT 1" 2>/dev/null && echo "MySQL 连接正常"
```

**Node.js 项目检查：**

```bash
cd backend

# TypeScript 编译检查（无输出 = 通过）
npx tsc --noEmit && echo "TypeScript 类型检查通过"

# 依赖完整性检查
npm ls --depth=0 2>&1 | tail -5
```

**服务启动检查：**

```bash
# 启动开发服务器
npm run dev &

# 等待服务启动
sleep 3

# 检查健康接口
curl -s http://localhost:3000/health | python3 -m json.tool

# 停止后台进程
kill %1
```

预期 health 接口输出：

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "status": "running"
  }
}
```

全部检查通过后，开发环境准备完成，可以进入后端开发阶段。
