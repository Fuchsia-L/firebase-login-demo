# 🚀 Railway 部署指南

## 📋 部署步骤

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "完整 API 实现：PostgreSQL + JWT + CORS"
git push origin main
```

### 2. 登录 Railway

访问：https://railway.app
用 GitHub 账号登录

### 3. 创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择你的仓库：`firebase-login-demo`

### 4. 添加 PostgreSQL 数据库

1. 在项目中点击 "+ New"
2. 选择 "Database" → "Add PostgreSQL"
3. Railway 会自动创建数据库并注入 `DATABASE_URL` 环境变量

### 5. 配置环境变量

在 Railway 项目的 "Variables" 标签页添加：

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ALLOW_ORIGINS=https://servicewechat.com,https://你的小程序域名.com
LLM_BASE_URL=https://api.openai.com/v1  (可选)
LLM_API_KEY=sk-xxx  (可选)
LLM_MODEL=gpt-3.5-turbo  (可选)
```

**注意：**
- `DATABASE_URL` 会自动生成，不需要手动添加
- `JWT_SECRET` 必须设置一个强密码
- `CORS_ALLOW_ORIGINS` 填写你的小程序域名

### 6. 初始化数据库

部署成功后，需要运行数据库初始化：

**方法 A：使用 Railway CLI（推荐）**

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 连接到你的项目
railway link

# 运行初始化脚本
railway run psql $DATABASE_URL < init.sql
```

**方法 B：使用数据库客户端**

1. 在 Railway 项目中找到 PostgreSQL 服务
2. 点击 "Connect" 获取连接信息
3. 使用 pgAdmin、DBeaver 或其他工具连接
4. 执行 `init.sql` 脚本内容

**方法 C：使用 Railway 内置终端**

1. 在 Railway 项目中选择你的 API 服务
2. 点击 "..." → "Shell"
3. 运行：
```bash
psql $DATABASE_URL < init.sql
```

### 7. 验证部署

部署完成后，Railway 会给你一个公网地址，例如：
```
https://study-track-production.up.railway.app
```

测试接口：
```bash
# 健康检查
curl https://你的域名.railway.app/api/health

# 注册用户
curl -X POST https://你的域名.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 登录
curl -X POST https://你的域名.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## ⚠️ 重要提示

### 必须完成的步骤：
1. ✅ 添加 PostgreSQL 数据库（Railway 插件）
2. ✅ 配置环境变量（JWT_SECRET, CORS_ALLOW_ORIGINS）
3. ✅ 运行 `init.sql` 初始化数据库表
4. ✅ 在 CORS 中添加你的小程序域名

### 常见问题：

**Q: 数据库连接失败？**
A: 检查 Railway 是否已添加 PostgreSQL 服务，DATABASE_URL 是否自动注入

**Q: API 调用 401 错误？**
A: 检查 JWT_SECRET 是否配置，登录后的 token 是否正确携带

**Q: CORS 错误？**
A: 确保 CORS_ALLOW_ORIGINS 包含你的小程序域名

**Q: 数据库表不存在？**
A: 必须运行 `init.sql` 脚本初始化数据库

## 📝 本地开发

如果要在本地测试数据库功能：

1. 安装 PostgreSQL
2. 创建数据库：
```bash
createdb study_track
```

3. 初始化表：
```bash
psql study_track < init.sql
```

4. 配置 `.env` 文件：
```
DATABASE_URL=postgresql://user:password@localhost:5432/study_track
JWT_SECRET=local-dev-secret
CORS_ALLOW_ORIGINS=http://localhost:3000
```

5. 启动服务：
```bash
npm start
```

## 🎯 小程序接入

在你的小程序中使用 API：

```javascript
const API_BASE = 'https://你的域名.railway.app/api';

// 注册
wx.request({
  url: `${API_BASE}/auth/register`,
  method: 'POST',
  data: { email, password },
  success: (res) => console.log(res)
});

// 登录
wx.request({
  url: `${API_BASE}/auth/login`,
  method: 'POST',
  data: { email, password },
  success: (res) => {
    const token = res.data.data.token;
    wx.setStorageSync('token', token);
  }
});

// 获取任务（需要 token）
wx.request({
  url: `${API_BASE}/tasks`,
  method: 'GET',
  header: {
    'Authorization': `Bearer ${wx.getStorageSync('token')}`
  },
  success: (res) => console.log(res)
});
```

## 🔥 完成！

按照以上步骤，你的 API 就可以正常使用了！
