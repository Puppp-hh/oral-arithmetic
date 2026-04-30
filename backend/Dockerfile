# ────────────────────────────────────────────────────────────────
# 阶段 1：builder — 安装依赖 + TypeScript 编译
# 使用 node:20-alpine（轻量，约 180MB vs node:20 约 1GB）
# ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 优先复制 package 文件，利用 Docker 层缓存
# 只要 package.json 不变，npm install 层就不会重新执行
COPY package*.json ./

# 安装全部依赖（含 devDependencies，编译需要 typescript / ts-node-dev）
RUN npm ci --frozen-lockfile

# 复制源代码并编译
COPY tsconfig.json ./
COPY src ./src

RUN npm run build
# 编译产物输出到 /app/dist

# ────────────────────────────────────────────────────────────────
# 阶段 2：production — 只包含运行时必要文件，镜像更小更安全
# ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# 只复制 package 文件，仅安装生产依赖（排除 devDependencies）
COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev

# 从 builder 阶段复制编译产物
COPY --from=builder /app/dist ./dist

# 声明端口（文档用途，实际端口由 docker-compose 映射）
EXPOSE 3000

# 使用非 root 用户运行（安全最佳实践）
USER node

# 启动命令
CMD ["node", "dist/app.js"]
