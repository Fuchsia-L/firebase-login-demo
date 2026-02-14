# Study Track API

完整的学习时间管理 API 服务

## ✨ 功能特性

- ✅ PostgreSQL 数据库
- ✅ JWT 身份认证
- ✅ 完整的用户系统（注册/登录）
- ✅ 任务管理 CRUD
- ✅ CORS 跨域配置
- ✅ LLM 接口支持（可选）
- ✅ 生产环境就绪

## 🚀 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 12+

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/study_track
JWT_SECRET=your-super-secret-jwt-key
CORS_ALLOW_ORIGINS=http://localhost:3000,https://servicewechat.com
```

### 初始化数据库

```bash
psql study_track < init.sql
```

### 启动服务

```bash
npm start
```

访问：`http://localhost:3000`

## 📚 API 接口文档

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |

### 需要认证的接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 获取用户信息 |
| GET | `/api/tasks` | 获取所有任务 |
| GET | `/api/tasks/:id` | 获取单个任务 |
| GET | `/api/tasks/status/:status` | 按状态筛选任务 |
| POST | `/api/tasks` | 创建任务 |
| PUT | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| POST | `/api/llm/suggest` | AI 建议（可选）|

### 认证方式

所有需要认证的接口需要在请求头中携带 JWT token：

```
Authorization: Bearer <your-token>
```

## 📦 部署

详细部署指南请查看 [deploy.md](./deploy.md)

支持平台：
- Railway（推荐）
- Render
- Vercel
- 其他支持 Node.js 的云平台

## 🔧 技术栈

- Express.js - Web 框架
- PostgreSQL - 数据库
- JWT - 身份认证
- bcrypt - 密码加密
- CORS - 跨域支持
