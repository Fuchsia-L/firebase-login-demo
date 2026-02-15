import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from '../db.js';
import { generateToken, hashPassword, comparePassword, authMiddleware } from '../auth.js';

dotenv.config();

const app = express();

// CORS 配置
const allowedOrigins = process.env.CORS_ALLOW_ORIGINS
    ? process.env.CORS_ALLOW_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://servicewechat.com'];

app.use(cors({
    origin: function (origin, callback) {
        // 允许没有 origin 的请求（如移动应用或 Postman）
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('不允许的 CORS 来源'));
        }
    },
    credentials: true
}));

app.use(express.json());

// ==================== 工具函数 ====================

const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const getStatusText = (status) => {
    const statusMap = {
        'pending': '未完成',
        'partial': '部分完成',
        'done': '已完成'
    };
    return statusMap[status] || '未知';
};

// ==================== 公开接口 ====================

// 健康检查
app.get('/api/health', async (req, res) => {
    try {
        // 测试数据库连接
        await pool.query('SELECT 1');
        res.json({
            success: true,
            message: 'API 运行正常',
            database: '已连接',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'API 运行异常',
            database: '未连接',
            error: error.message
        });
    }
});

// 用户注册
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: '邮箱和密码不能为空'
        });
    }

    try {
        // 检查用户是否已存在
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: '该邮箱已被注册'
            });
        }

        // 加密密码
        const passwordHash = await hashPassword(password);

        // 创建用户
        const result = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, passwordHash]
        );

        const user = result.rows[0];

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                id: user.id,
                email: user.email,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '注册失败',
            error: error.message
        });
    }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: '邮箱和密码不能为空'
        });
    }

    try {
        // 查找用户
        const result = await pool.query(
            'SELECT id, email, password_hash FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        const user = result.rows[0];

        // 验证密码
        const isValid = await comparePassword(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 生成 token
        const token = generateToken(user.id, user.email);

        res.json({
            success: true,
            message: '登录成功',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email
                }
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败',
            error: error.message
        });
    }
});

// ==================== 需要认证的接口 ====================

// 获取当前用户信息
app.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取用户信息失败',
            error: error.message
        });
    }
});

// 获取所有任务
app.get('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );

        const tasks = result.rows.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            statusText: getStatusText(task.status),
            elapsed: task.elapsed,
            elapsedFormatted: formatTime(task.elapsed),
            createdAt: task.created_at,
            updatedAt: task.updated_at
        }));

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取任务失败',
            error: error.message
        });
    }
});

// 获取单个任务
app.get('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '任务不存在'
            });
        }

        const task = result.rows[0];

        res.json({
            success: true,
            data: {
                id: task.id,
                title: task.title,
                status: task.status,
                statusText: getStatusText(task.status),
                elapsed: task.elapsed,
                elapsedFormatted: formatTime(task.elapsed),
                createdAt: task.created_at,
                updatedAt: task.updated_at
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取任务失败',
            error: error.message
        });
    }
});

// 按状态筛选任务
app.get('/api/tasks/status/:status', authMiddleware, async (req, res) => {
    const { status } = req.params;

    if (!['pending', 'partial', 'done'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: '无效的状态值'
        });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM tasks WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
            [req.user.userId, status]
        );

        const tasks = result.rows.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            statusText: getStatusText(task.status),
            elapsed: task.elapsed,
            elapsedFormatted: formatTime(task.elapsed),
            createdAt: task.created_at,
            updatedAt: task.updated_at
        }));

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取任务失败',
            error: error.message
        });
    }
});

// 创建任务
app.post('/api/tasks', authMiddleware, async (req, res) => {
    const { title } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({
            success: false,
            message: '任务标题不能为空'
        });
    }

    try {
        const result = await pool.query(
            'INSERT INTO tasks (user_id, title, status, elapsed) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.userId, title.trim(), 'pending', 0]
        );

        const task = result.rows[0];

        res.status(201).json({
            success: true,
            message: '任务创建成功',
            data: {
                id: task.id,
                title: task.title,
                status: task.status,
                statusText: getStatusText(task.status),
                elapsed: task.elapsed,
                elapsedFormatted: formatTime(task.elapsed),
                createdAt: task.created_at
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '创建任务失败',
            error: error.message
        });
    }
});

// 更新任务
app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
    const { title, status, elapsed } = req.body;

    try {
        // 先检查任务是否存在且属于当前用户
        const checkResult = await pool.query(
            'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '任务不存在'
            });
        }

        // 构建更新字段
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (title !== undefined) {
            updates.push(`title = $${paramCount++}`);
            values.push(title.trim());
        }

        if (status !== undefined) {
            if (!['pending', 'partial', 'done'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: '无效的状态值'
                });
            }
            updates.push(`status = $${paramCount++}`);
            values.push(status);
        }

        if (elapsed !== undefined) {
            updates.push(`elapsed = $${paramCount++}`);
            values.push(elapsed);
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(req.params.id, req.user.userId);

        const result = await pool.query(
            `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount++} AND user_id = $${paramCount++} RETURNING *`,
            values
        );

        const task = result.rows[0];

        res.json({
            success: true,
            message: '任务更新成功',
            data: {
                id: task.id,
                title: task.title,
                status: task.status,
                statusText: getStatusText(task.status),
                elapsed: task.elapsed,
                elapsedFormatted: formatTime(task.elapsed),
                updatedAt: task.updated_at
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '更新任务失败',
            error: error.message
        });
    }
});

// 删除任务
app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '任务不存在'
            });
        }

        res.json({
            success: true,
            message: '任务删除成功'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '删除任务失败',
            error: error.message
        });
    }
});

// ==================== LLM 接口（可选） ====================

// AI 建议接口
app.post('/api/llm/suggest', authMiddleware, async (req, res) => {
    const { prompt } = req.body;

    if (!process.env.LLM_API_KEY) {
        return res.status(503).json({
            success: false,
            message: 'LLM 服务未配置'
        });
    }

    try {
        // 这里可以调用 LLM API
        // 示例代码，需要根据实际的 LLM 服务调整
        res.json({
            success: true,
            message: 'LLM 功能待实现',
            data: {
                prompt,
                response: '这是一个示例响应，请配置 LLM_BASE_URL 和 LLM_API_KEY'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'LLM 调用失败',
            error: error.message
        });
    }
});

// ==================== 404 处理 ====================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在'
    });
});

// ==================== Vercel Serverless 导出 ====================

export default app;
