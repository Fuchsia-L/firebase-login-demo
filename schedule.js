import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
    getDatabase,
    ref,
    push,
    set,
    onValue,
    remove,
    update,
    query,
    orderByChild
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAi8CZBjKXZ_ihjyqXNPtr5zIP21XALJpA",
    authDomain: "study-track-8d73f.firebaseapp.com",
    projectId: "study-track-8d73f",
    storageBucket: "study-track-8d73f.firebasestorage.app",
    messagingSenderId: "742695953890",
    appId: "1:742695953890:web:36601be8afe17abf4a05bb",
    measurementId: "G-YG44NX50QZ",
    databaseURL: "https://study-track-8d73f-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const userEmail = document.getElementById("user-email");
const eventsLayer = document.getElementById("events-layer");
const weekdaySelect = document.getElementById("weekday");
const startInput = document.getElementById("start-time");
const endInput = document.getElementById("end-time");
const locationInput = document.getElementById("location");
const eventForm = document.getElementById("event-form");
const toggleFormBtn = document.getElementById("toggle-form");
const closeFormBtn = document.getElementById("close-form");
const clearEventsBtn = document.getElementById("clear-events");

const addTaskBtn = document.getElementById("add-task-btn");
const taskList = document.getElementById("task-list");
const modal = document.getElementById("task-modal");
const modalBackdrop = modal.querySelector(".modal-backdrop");
const modalTitle = document.getElementById("modal-task-title");
const modalClose = document.getElementById("modal-close");
const timerValue = document.getElementById("timer-value");
const startBtn = document.getElementById("start-timer");
const pauseBtn = document.getElementById("pause-timer");
const resumeBtn = document.getElementById("resume-timer");
const stopBtn = document.getElementById("stop-timer");
const loadingOverlay = document.getElementById("loading-overlay");

let events = [];
const DAY_WIDTH = 100 / 5;
const BASE_MINUTES = 6 * 60;
const TOTAL_MINUTES = (24 - 6) * 60;
let currentUserId = null;
let eventsUnsub = null;
let tasksUnsub = null;
let firstEventsLoaded = false;
let firstTasksLoaded = false;

let timerState = {
    taskEl: null,
    status: "idle", // idle | running | paused
    startTime: 0,
    elapsed: 0,
    rafId: null
};

const showForm = () => eventForm.classList.remove("hidden");
const hideForm = () => eventForm.classList.add("hidden");

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    firstEventsLoaded = false;
    firstTasksLoaded = false;
    loadingOverlay.classList.remove("hidden");
    currentUserId = user.uid;
    userEmail.textContent = user.email;
    subscribeEvents(user.uid);
    subscribeTasks(user.uid);
});

document.getElementById("logout-btn").onclick = () => signOut(auth);

toggleFormBtn.addEventListener("click", showForm);
closeFormBtn.addEventListener("click", hideForm);

clearEventsBtn.addEventListener("click", () => {
    if (!events.length) return;
    if (confirm("是否清空全部事件？")) {
        const ops = events.map(ev => remove(ref(db, `users/${currentUserId}/events/${ev.id}`)));
        Promise.all(ops).catch(err => alert("清空失败：" + err.message));
    }
});

const parseTime = value => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
};

const hasConflict = (day, start, end) =>
    events.some(ev => ev.day === day && !(end <= ev.start || start >= ev.end));

const renderEvents = () => {
    const layerHeight = eventsLayer.clientHeight || 1;
    eventsLayer.innerHTML = "";
    events.forEach(ev => {
        const block = document.createElement("div");
        block.className = "event-block";
        const topPx = ((ev.start - BASE_MINUTES) / TOTAL_MINUTES) * layerHeight;
        const heightPx = ((ev.end - ev.start) / TOTAL_MINUTES) * layerHeight;
        const leftPct = (ev.day - 1) * DAY_WIDTH;

        block.style.top = `${topPx}px`;
        block.style.height = `${heightPx}px`;
        block.style.left = `calc(${leftPct}% + 4px)`;
        block.style.width = `calc(${DAY_WIDTH}% - 8px)`;
        block.innerHTML = `<strong>${ev.location}</strong><span>${ev.startLabel} - ${ev.endLabel}</span>`;

        let pressTimer = null;
        const startPress = () => {
            pressTimer = setTimeout(() => {
                if (!ev.id) return;
                if (confirm("是否永久删除事件?")) {
                    remove(ref(db, `users/${currentUserId}/events/${ev.id}`)).catch(err =>
                        alert("删除失败：" + err.message)
                    );
                }
            }, 700);
        };
        const clearPress = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };
        block.addEventListener("mousedown", startPress);
        block.addEventListener("touchstart", startPress);
        ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(evt =>
            block.addEventListener(evt, clearPress)
        );

        eventsLayer.appendChild(block);
    });
};

eventForm.addEventListener("submit", e => {
    e.preventDefault();
    const day = Number(weekdaySelect.value);
    const startVal = startInput.value;
    const endVal = endInput.value;
    const location = locationInput.value.trim();

    if (!startVal || !endVal || !location) {
        alert("请填写完整时间与地点");
        return;
    }

    const start = parseTime(startVal);
    const end = parseTime(endVal);

    if (start < BASE_MINUTES || end > 24 * 60 || end <= start) {
        alert("时间需在 06:00-24:00 之间，且结束时间晚于开始时间");
        return;
    }

    if (hasConflict(day, start, end)) {
        alert("与已有事件时间冲突，请调整");
        return;
    }

    const newRef = push(ref(db, `users/${currentUserId}/events`));
    set(newRef, {
        day,
        start,
        end,
        location,
        startLabel: startVal,
        endLabel: endVal,
        createdAt: Date.now()
    })
        .then(() => {
            eventForm.reset();
            hideForm();
        })
        .catch(err => alert("保存失败：" + err.message));
});

window.addEventListener("resize", renderEvents);

addTaskBtn.addEventListener("click", () => {
    const text = prompt("输入新任务内容：");
    if (!text || !text.trim()) return;
    const newRef = push(ref(db, `users/${currentUserId}/tasks`));
    set(newRef, {
        title: text.trim(),
        status: "pending",
        elapsed: 0,
        createdAt: Date.now()
    }).catch(err => alert("新增任务失败：" + err.message));
});

const formatTime = ms => {
    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
};

const drawTimer = () => {
    timerValue.textContent = formatTime(timerState.elapsed);
};

const stepTimer = () => {
    if (timerState.status !== "running") return;
    const now = performance.now();
    timerState.elapsed += now - timerState.startTime;
    timerState.startTime = now;
    drawTimer();
    timerState.rafId = requestAnimationFrame(stepTimer);
};

const resetTimer = () => {
    if (timerState.rafId) cancelAnimationFrame(timerState.rafId);
    timerState = { taskEl: null, status: "idle", startTime: 0, elapsed: 0, rafId: null };
    drawTimer();
    startBtn.classList.remove("hidden");
    pauseBtn.classList.add("hidden");
    resumeBtn.classList.add("hidden");
    stopBtn.classList.add("hidden");
};

const openModal = (li, initialElapsed = 0) => {
    resetTimer();
    timerState.taskEl = li;
    timerState.elapsed = initialElapsed;
    drawTimer();
    modalTitle.textContent = li.querySelector(".task-title").textContent;
    modal.classList.remove("hidden");
};

const closeModal = () => {
    if (timerState.status === "running" || timerState.status === "paused") {
        const ok = confirm("计时未结束，是否退出该任务？");
        if (!ok) return;
    }
    resetTimer();
    modal.classList.add("hidden");
};

modalBackdrop.addEventListener("click", closeModal);
modalClose.addEventListener("click", closeModal);

startBtn.addEventListener("click", () => {
    timerState.status = "running";
    timerState.startTime = performance.now();
    startBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
    stopBtn.classList.remove("hidden");
    stepTimer();
});

pauseBtn.addEventListener("click", () => {
    if (timerState.status !== "running") return;
    timerState.status = "paused";
    if (timerState.rafId) cancelAnimationFrame(timerState.rafId);
    drawTimer();
    pauseBtn.classList.add("hidden");
    resumeBtn.classList.remove("hidden");
});

resumeBtn.addEventListener("click", () => {
    if (timerState.status !== "paused") return;
    timerState.status = "running";
    timerState.startTime = performance.now();
    resumeBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
    stepTimer();
});

stopBtn.addEventListener("click", () => {
    const choice = prompt("请输入任务评价：1=已完成, 2=部分完成, 3=未完成");
    if (!choice) return;
    let status = "pending";
    if (choice === "1") status = "done";
    else if (choice === "2") status = "partial";

    if (timerState.taskEl) {
        const tag = timerState.taskEl.querySelector(".tag.status");
        tag.textContent = status === "done" ? "已完成" : status === "partial" ? "部分完成" : "未完成";
        tag.className = `tag status ${status}`;
        timerState.taskEl.dataset.status = status;
        timerState.taskEl.dataset.elapsed = String(Math.floor(timerState.elapsed));
        const timeChip = timerState.taskEl.querySelector(".time-chip");
        if (timeChip) timeChip.textContent = formatTime(timerState.elapsed);
        const taskId = timerState.taskEl.dataset.id;
        if (taskId) {
            update(ref(db, `users/${currentUserId}/tasks/${taskId}`), {
                status,
                elapsed: Math.floor(timerState.elapsed)
            }).catch(err => alert("保存任务失败：" + err.message));
        }
        sortTasks();
    }
    resetTimer();
    modal.classList.add("hidden");
});

const sortTasks = () => {
    const priority = { pending: 1, partial: 2, done: 3 };
    const items = Array.from(taskList.children);
    items.sort((a, b) => priority[a.dataset.status] - priority[b.dataset.status]);
    items.forEach(li => taskList.appendChild(li));
};

taskList.addEventListener("click", e => {
    const li = e.target.closest("li");
    if (!li) return;
    const elapsed = Number(li.dataset.elapsed || "0");
    if (li.dataset.status === "done") {
        const ok = confirm("任务已完成，是否重新计时？");
        if (!ok) return;
        openModal(li, 0);
        return;
    }
    if (li.dataset.status === "partial") {
        const choice = prompt("任务部分完成：输入1继续计时，输入2重新计时");
        if (!choice) return;
        if (choice === "1") {
            openModal(li, elapsed);
        } else if (choice === "2") {
            openModal(li, 0);
        }
        return;
    }
    openModal(li, elapsed);
});

const createTaskItem = task => {
    const li = document.createElement("li");
    li.dataset.status = task.status || "pending";
    li.dataset.elapsed = String(task.elapsed || 0);
    li.dataset.id = task.id;
    const statusText = task.status === "done" ? "已完成" : task.status === "partial" ? "部分完成" : "未完成";
    li.innerHTML = `<span class="task-title">${task.title}</span><span class="time-chip">${formatTime(
        task.elapsed || 0
    )}</span><span class="tag status ${task.status}">${statusText}</span>`;
    return li;
};

const subscribeEvents = uid => {
    if (eventsUnsub) eventsUnsub();
    const q = query(ref(db, `users/${uid}/events`), orderByChild("start"));
    eventsUnsub = onValue(
        q,
        snap => {
            const list = [];
            snap.forEach(child => {
                const data = child.val();
                list.push({
                    id: child.key,
                    day: Number(data.day),
                    start: Number(data.start),
                    end: Number(data.end),
                    location: data.location,
                    startLabel: data.startLabel,
                    endLabel: data.endLabel
                });
            });
            events = list;
            renderEvents();
            if (!firstEventsLoaded) {
                firstEventsLoaded = true;
                if (firstTasksLoaded) loadingOverlay.classList.add("hidden");
            }
        },
        err => alert("加载事件失败：" + err.message)
    );
};

const subscribeTasks = uid => {
    if (tasksUnsub) tasksUnsub();
    const q = query(ref(db, `users/${uid}/tasks`), orderByChild("createdAt"));
    tasksUnsub = onValue(
        q,
        snap => {
            taskList.innerHTML = "";
            snap.forEach(child => {
                const data = child.val();
                taskList.appendChild(
                    createTaskItem({
                        id: child.key,
                        title: data.title || "",
                        status: data.status || "pending",
                        elapsed: data.elapsed || 0
                    })
                );
            });
            sortTasks();
            if (!firstTasksLoaded) {
                firstTasksLoaded = true;
                if (firstEventsLoaded) loadingOverlay.classList.add("hidden");
            }
        },
        err => alert("加载任务失败：" + err.message)
    );
};

drawTimer();
