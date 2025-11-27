import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAi8CZBjKXZ_ihjyqXNPtr5zIP21XALJpA",
    authDomain: "study-track-8d73f.firebaseapp.com",
    projectId: "study-track-8d73f",
    storageBucket: "study-track-8d73f.firebasestorage.app",
    messagingSenderId: "742695953890",
    appId: "1:742695953890:web:36601be8afe17abf4a05bb",
    measurementId: "G-YG44NX50QZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authContainer = document.getElementById("auth-container");
const loginBox = document.getElementById("login-box");
const signupBox = document.getElementById("signup-box");
const userInfo = document.getElementById("user-info");
const userEmail = document.getElementById("user-email");

const copy = {
    signupSuccess: "\u6ce8\u518c\u6210\u529f\uff01\u8bf7\u76f4\u63a5\u767b\u5f55\u3002",
    signupFail: "\u6ce8\u518c\u5931\u8d25\uff1a",
    loginSuccess: "\u767b\u5f55\u6210\u529f\uff01",
    loginFail: "\u767b\u5f55\u5931\u8d25\uff1a",
    currentUser: "\u5f53\u524d\u7528\u6237\uff1a"
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

document.getElementById("to-signup").onclick = () => showBox("signup");
document.getElementById("to-login").onclick = () => showBox("login");

document.getElementById("signup-btn").onclick = async () => {
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert(copy.signupSuccess);
        showBox("login");
    } catch (err) {
        alert(copy.signupFail + err.message);
    }
};

document.getElementById("login-btn").onclick = async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert(copy.loginSuccess);
        window.location.href = "schedule.html";
    } catch (err) {
        alert(copy.loginFail + err.message);
    }
};

onAuthStateChanged(auth, user => {
    if (user) {
        // 已登录用户直接进入课表
        window.location.href = "schedule.html";
    } else {
        authContainer.style.display = "block";
        userInfo.style.display = "none";
        showBox("login");
    }
});

document.getElementById("logout-btn").onclick = () => {
    signOut(auth);
};
