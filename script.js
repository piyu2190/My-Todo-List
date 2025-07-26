// DOM elements
const taskInput = document.getElementById('taskInput');
const startTimeInput = document.getElementById('startTimeInput');
const endTimeInput = document.getElementById('endTimeInput');
const priorityInput = document.getElementById('priorityInput');
const taskList = document.getElementById('taskList');

// Alarm sound from a free online source (no download needed)
const alarmSound = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');

// Enable notifications button
const enableNotifBtn = document.getElementById('enableNotificationsBtn');

// Notification permission/user interaction unlock for mobile sound
enableNotifBtn.addEventListener('click', () => {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                alert("Notifications enabled! You will get alerts and sounds for task start times.");
                // Unlock alarm playback on mobile by playing and pausing immediately
                alarmSound.play().then(() => alarmSound.pause()).catch(() => {});
                enableNotifBtn.style.display = 'none';
            } else {
                alert("You denied notifications permission. You will not get task alerts.");
            }
        });
    } else {
        alert("Your browser does not support notifications.");
    }
});

if (Notification.permission === 'granted') {
    enableNotifBtn.style.display = 'none';
}

if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
}

window.addEventListener('DOMContentLoaded', () => {
    const savedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
    savedTasks.forEach(task => createTaskElement(task));
    startCountdownTimer();

    const now = new Date();
    const todayStr = now.toISOString().substr(0, 10);
    savedTasks.forEach(task => {
        if (task.startTime) {
            const startDateTime = new Date(`${todayStr}T${task.startTime}:00`);
            const delay = startDateTime - now;
            if (delay > 0) {
                scheduleNotification(task, delay);
            }
        }
    });
});

function saveTasks() {
    const tasks = [];
    taskList.querySelectorAll('li').forEach(li => {
        const taskText = li.querySelector('span.task-text').textContent;
        const taskTimeSpan = li.querySelector('span.time');
        const taskTime = taskTimeSpan ? taskTimeSpan.textContent.replace(/[()]/g, '') : "";
        const prioritySpan = li.querySelector('span.priority');
        const priority = prioritySpan ? prioritySpan.textContent : "Low";
        const completed = li.classList.contains('completed');
        let startTime = "", endTime = "";
        if (taskTime.includes(" - ")) {
            [startTime, endTime] = taskTime.split(" - ");
        } else if (taskTime) {
            startTime = taskTime;
        }
        tasks.push({
            text: taskText,
            startTime,
            endTime,
            priority,
            completed
        });
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function createTaskElement(task) {
    const li = document.createElement('li');
    let timeDisplay = "";
    if (task.startTime && task.endTime) {
        timeDisplay = `<span class="time">(${task.startTime} - ${task.endTime})</span>`;
    } else if (task.startTime || task.endTime) {
        timeDisplay = `<span class="time">(${task.startTime || "?"} - ${task.endTime || "?"})</span>`;
    }
    li.innerHTML = `<span class="task-text">${task.text}</span> ${timeDisplay}
        <span class="countdown"></span>
        <span class="priority ${task.priority.toLowerCase()}">${task.priority}</span>`;
    if (task.completed) {
        li.classList.add('completed');
    }
    li.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) return;
        li.classList.toggle('completed');
        saveTasks();
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'delete-btn';
    delBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        li.remove();
        saveTasks();
    });
    li.appendChild(delBtn);
    taskList.appendChild(li);

    if (task.startTime) {
        const now = new Date();
        const todayStr = now.toISOString().substr(0, 10);
        const startDateTime = new Date(`${todayStr}T${task.startTime}:00`);
        const delay = startDateTime - now;
        if (delay > 0) {
            scheduleNotification(task, delay);
        }
    }
}

function addTask() {
    const taskText = taskInput.value.trim();
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const taskPriority = priorityInput.value;
    if (!taskText) {
        alert("Please enter a task.");
        return;
    }
    if (startTime && endTime && startTime > endTime) {
        alert("Start Time cannot be later than End Time.");
        return;
    }
    const task = {
        text: taskText,
        startTime,
        endTime,
        priority: taskPriority,
        completed: false
    };
    createTaskElement(task);
    taskInput.value = "";
    startTimeInput.value = "";
    endTimeInput.value = "";
    priorityInput.value = "Low";
    saveTasks();
}

taskInput.addEventListener('keydown', event => {
    if (event.key === "Enter") addTask();
});

function scheduleNotification(task, delay) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!task.startTime) return;
    setTimeout(() => {
        new Notification("Task Reminder", {
            body: `${task.text} starts now (${task.startTime})`,
            icon: "https://cdn-icons-png.flaticon.com/512/1828/1828827.png"
        });
        if (alarmSound) {
            alarmSound.play().catch(() => {
                // Play might be blocked until user interaction on some browsers
            });
        }
    }, delay);
}

function startCountdownTimer() {
    setInterval(() => {
        taskList.querySelectorAll('li').forEach(li => {
            const taskTimeSpan = li.querySelector('span.time');
            const countdownSpan = li.querySelector('span.countdown');
            if (!taskTimeSpan || !countdownSpan) return;
            const match = taskTimeSpan.textContent.match(/\((\d{2}:\d{2})/);
            if (!match) {
                countdownSpan.textContent = "";
                return;
            }
            const startTimeStr = match[1];
            const today = new Date().toISOString().substr(0, 10);
            const targetTime = new Date(`${today}T${startTimeStr}:00`);
            const now = new Date();
            const diffSec = Math.floor((targetTime - now) / 1000);
            if (diffSec < 0) {
                countdownSpan.textContent = "⏰ Started!";
            } else {
                const minutes = Math.floor(diffSec / 60).toString().padStart(2, '0');
                const seconds = (diffSec % 60).toString().padStart(2, '0');
                countdownSpan.textContent = ` | Starts in: ${minutes}:${seconds}`;
            }
        });
    }, 1000);
}

let pomoInterval = null;
let pomoMinutes = 25;
let pomoSeconds = 0;
let pomoPaused = true;
function updatePomodoroDisplay() {
    const display = document.getElementById("pomodoro-timer");
    if (!display) return;
    display.textContent = `${String(pomoMinutes).padStart(2, "0")}:${String(pomoSeconds).padStart(2, "0")}`;
}
function startPomodoro() {
    if (pomoInterval) return;
    pomoPaused = false;
    pomoInterval = setInterval(() => {
        if (pomoPaused) return;
        if (pomoMinutes === 0 && pomoSeconds === 0) {
            clearInterval(pomoInterval);
            pomoInterval = null;
            alert("Pomodoro complete! Time for a break.");
            return;
        }
        if (pomoSeconds === 0) {
            pomoMinutes--;
            pomoSeconds = 59;
        } else {
            pomoSeconds--;
        }
        updatePomodoroDisplay();
    }, 1000);
}
function pausePomodoro() {
    pomoPaused = true;
    clearInterval(pomoInterval);
    pomoInterval = null;
}
function resetPomodoro() {
    pomoMinutes = 25;
    pomoSeconds = 0;
    updatePomodoroDisplay();
    pausePomodoro();
}
updatePomodoroDisplay();

const themeToggle = document.getElementById("themeToggle");
let dark = localStorage.getItem("todo-darkmode") === "true";
function applyTheme(darkModeOn) {
    document.body.classList.toggle('dark-mode', darkModeOn);
    themeToggle.textContent = darkModeOn ? "☀️ Light Mode" : "🌙 Dark Mode";
}
applyTheme(dark);
themeToggle.addEventListener('click', () => {
    dark = !dark;
    applyTheme(dark);
    localStorage.setItem("todo-darkmode", dark);
});
