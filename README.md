# 小学数学口算分级训练系统

前后端分离的小学数学口算训练项目，包含微信小程序前端、Node.js + Express + TypeScript 后端、MySQL 数据库和 Redis 缓存。

## 项目结构

```text
softWareWork/
  backend/              # 后端服务
  frontend/             # 微信小程序
  docs/                 # 项目文档
  database.md           # 数据库设计说明
  docker-compose.yml    # MySQL、Redis、后端服务编排
```

## 后端启动

```bash
cd backend
cp .env.example .env
npm ci
npm run dev
```

生产构建：

```bash
cd backend
npm run build
npm start
```

## Docker 启动

```bash
cp backend/.env.example backend/.env
docker compose up -d
```

## 前端启动

使用微信开发者工具打开 `frontend/` 目录。

## Git 提交说明

以下内容不应提交：

- `backend/.env`
- `backend/node_modules/`
- `backend/dist/`
- `.idea/`
- `.vscode/settings.json`
- `*.session.sql`
- `*.iml`
- `*.js.map`
