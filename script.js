// API 配置
const API_BASE = 'https://firebase-login-demo.vercel.app/api';

const authContainer = document.getElementById("auth-container");
const loginBox = document.getElementById("login-box");
const signupBox = document.getElementById("signup-box");
const userInfo = document.getElementById("user-info");
const userEmail = document.getElementById("user-email");

const copy = {
    signupSuccess: "注册成功！请直接登录。",
    signupFail: "注册失败：",
    loginSuccess: "登录成功！",
    loginFail: "登录失败：",
    currentUser: "当前用户："
};

const showBox = mode => {
    if (mode === "signup") {
        loginBox.classList.add("hidden");
        signupBox.classList.remove("hidden");
    } else {
        signupBox.classList.add("hidden");
        loginBox.classList.remove("hidden");
    }
};

// 检查登录状态 — 有 token 直接跳转到日程页
const checkAuth = () => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');

    if (token && email) {
        window.location.href = "schedule.html";
        return;
    }
    authContainer.style.display = "block";
    userInfo.style.display = "none";
    showBox("login");
};

document.getElementById("to-signup").onclick = () => showBox("signup");
document.getElementById("to-login").onclick = () => showBox("login");

// 注册
document.getElementById("signup-btn").onclick = async () => {
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    if (!email || !password) {
        alert('请填写邮箱和密码');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            alert(copy.signupSuccess);
            showBox("login");
        } else {
            alert(copy.signupFail + (data.message || '未知错误'));
        }
    } catch (err) {
        alert(copy.signupFail + err.message);
    }
};

// 登录
document.getElementById("login-btn").onclick = async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        alert('请填写邮箱和密码');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // 保存 token 和邮箱到 localStorage
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('email', data.data.user.email);

            alert(copy.loginSuccess);
            window.location.href = "schedule.html";
        } else {
            alert(copy.loginFail + (data.message || '未知错误'));
        }
    } catch (err) {
        alert(copy.loginFail + err.message);
    }
};

// 登出
document.getElementById("logout-btn").onclick = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    checkAuth();
};

// 页面加载时检查登录状态
checkAuth();
