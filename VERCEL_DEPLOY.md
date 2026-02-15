# Vercel + Neon 部署指南（完全免费，无需信用卡）

## 第一步：注册 Neon 数据库（PostgreSQL）

### 1. 访问 Neon 官网
打开浏览器，访问：https://neon.tech

### 2. 注册账号
- 点击 **"Sign Up"**（注册）
- 选择 **"Continue with GitHub"**（用 GitHub 登录）
- 授权 Neon

### 3. 创建数据库
登录后会自动提示创建第一个项目：
- **Project name**: `study-track`（随便起名）
- **PostgreSQL version**: 保持默认（最新版）
- **Region**: 选择 **AWS / US East (Ohio)**（免费套餐可用）
- 点击 **"Create Project"**

### 4. 获取数据库连接地址
项目创建后，你会看到一个 **"Connection Details"** 面板：
- 找到 **"Connection string"**（连接字符串）
- 点击右边的 **复制** 按钮 📋
- **保存到记事本里！** 长这样：
  ```
  postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```

### 5. 初始化数据库表
- 在 Neon 控制台，找到 **"SQL Editor"**（SQL 编辑器）标签页
- 点击 **"New Query"**
- 复制粘贴下面的 SQL（从 `init.sql` 文件）：
  ```sql
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 任务表
  CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'done')),
      elapsed INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 事件表
  CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      content TEXT,
      location VARCHAR(255),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
  CREATE INDEX IF NOT EXISTS idx_events_day ON events(day);
  ```
- 点击 **"Run"**（运行）
- 看到成功提示就完成了！

---

## 第二步：部署到 Vercel

### 1. 访问 Vercel 官网
打开浏览器，访问：https://vercel.com

### 2. 注册账号
- 点击 **"Sign Up"**（注册）
- 选择 **"Continue with GitHub"**（用 GitHub 登录）
- 授权 Vercel

### 3. 导入项目
登录后：
- 点击 **"Add New..."** → 选择 **"Project"**
- 找到 **"Import Git Repository"** 部分
- 找到你的 **"firebase-login-demo"** 仓库
- 点击 **"Import"**

### 4. 配置项目
在 "Configure Project" 页面：
- **Project Name**: 保持默认或改成 `study-track-api`
- **Framework Preset**: 选择 **"Other"**（或保持默认）
- **Root Directory**: 保持默认（`.`）
- **Build Command**: 留空（不需要构建）
- **Output Directory**: 留空
- **Install Command**: 保持默认（`npm install`）

### 5. 添加环境变量（重要！）
在 "Environment Variables" 部分，点击 **"Add"** 添加：

**变量 1：**
- Name: `DATABASE_URL`
- Value: `你刚才从 Neon 复制的连接字符串`

**变量 2：**
- Name: `JWT_SECRET`
- Value: `your-super-secret-jwt-key-change-this`

**变量 3：**
- Name: `CORS_ALLOW_ORIGINS`
- Value: `https://servicewechat.com`

**变量 4：**
- Name: `NODE_ENV`
- Value: `production`

### 6. 部署
点击 **"Deploy"**（部署）按钮！

等待 1-2 分钟，部署完成后会显示：
- ✅ **"Congratulations!"**
- 你会看到一个域名，类似：`https://study-track-api.vercel.app`

**复制这个域名保存好！**

---

## 第三步：测试 API

### 1. 测试健康检查
打开浏览器，访问：
```
https://你的域名.vercel.app/api/health
```

应该看到：
```json
{
  "success": true,
  "message": "API 运行正常",
  "database": "已连接"
}
```

### 2. 测试注册接口
在终端运行：
```bash
curl -X POST https://你的域名.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. 测试登录接口
```bash
curl -X POST https://你的域名.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

如果都成功了，恭喜你！API 已经上线了！🎉

---

## 常见问题

### 1. 部署失败怎么办？
- 检查 Vercel 控制台的 "Deployments" → "Build Logs"
- 看看哪里报错了
- 最常见的问题是环境变量没配置

### 2. 数据库连接失败？
- 确认 `DATABASE_URL` 复制正确
- 确认 Neon 数据库是 "Active" 状态
- 确认 SQL 已经成功运行

### 3. CORS 错误？
- 确认 `CORS_ALLOW_ORIGINS` 包含你的小程序域名
- 如果是测试，可以临时设置为 `*`（允许所有来源）

### 4. 如何更新代码？
- 修改代码后，提交到 GitHub：
  ```bash
  git add .
  git commit -m "更新代码"
  git push
  ```
- Vercel 会自动重新部署！

---

## 完成！

现在你的 API 已经在线了！

**API 地址：** `https://你的域名.vercel.app`

**所有接口文档：** 参考 `README.md` 或 `deploy.md`
