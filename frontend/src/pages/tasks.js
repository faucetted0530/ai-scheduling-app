// src/pages/tasks.js
import { getCurrentUserId } from "./authentication.js";
import { getCurrentSemester } from "./schedule.js";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function clearTasksUI() {
  const list = document.getElementById("tasks-list");
  const empty = document.getElementById("tasks-empty");
  if (list) list.innerHTML = "";
  if (empty) empty.classList.add("hidden");
}

function renderTasks(tasks) {
  const list = document.getElementById("tasks-list");
  const empty = document.getElementById("tasks-empty");
  if (!list || !empty) return;

  clearTasksUI();

  if (!tasks || tasks.length === 0) {
    empty.textContent = "No tasks yet. Add a course to see its assignments.";
    empty.classList.remove("hidden");
    return;
  }

  // group tasks by courseId
  const grouped = tasks.reduce((acc, task) => {
    const key = task.courseId || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  Object.keys(grouped).forEach((courseId) => {
    const courseTasks = grouped[courseId];

    const card = document.createElement("div");
    card.className = "tasks-course-card";

    const header = document.createElement("div");
    header.className = "tasks-course-header";
    header.innerHTML = `
      <div class="tasks-course-id">${courseId}</div>
      <div class="tasks-course-count">
        ${courseTasks.length} task${courseTasks.length !== 1 ? "s" : ""}
      </div>
    `;
    card.appendChild(header);

    const ul = document.createElement("ul");
    ul.className = "tasks-items";

    courseTasks
      .slice()
      .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
      .forEach((task) => {
        const li = document.createElement("li");
        li.className = "tasks-item";
        li.dataset.taskId = task._id;

        const status = task.status || "not_started";

        li.innerHTML = `
          <div class="tasks-item-main">
            <div class="tasks-item-title">${task.title || "Task"}</div>
            <div class="tasks-item-meta">
              ${
                task.type
                  ? `<span class="tasks-pill">${task.type}</span>`
                  : ""
              }
              ${
                task.priority
                  ? `<span class="tasks-pill tasks-pill-priority">${task.priority}</span>`
                  : ""
              }
            </div>
          </div>
          <div class="tasks-item-right">
            <div class="tasks-item-due">${formatDate(task.dueDate)}</div>
            <div class="tasks-status-buttons">
              <button class="task-status-btn ${
                status === "not_started" ? "active" : ""
              }" data-status="not_started">Uncompleted</button>
              <button class="task-status-btn ${
                status === "in_progress" ? "active" : ""
              }" data-status="in_progress">In progress</button>
              <button class="task-status-btn ${
                status === "completed" ? "active" : ""
              }" data-status="completed">Done</button>
            </div>
          </div>
        `;

        ul.appendChild(li);
      });

    card.appendChild(ul);
    list.appendChild(card);
  });
}

async function updateTaskStatus(taskId, status) {
  const userId = getCurrentUserId && getCurrentUserId();
  const res = await fetch(`/api/tasks/${taskId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, status }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      "Failed to update task status",
      res.status,
      res.statusText,
      text
    );
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function loadTasksForSchedule() {
  const list = document.getElementById("tasks-list");
  const empty = document.getElementById("tasks-empty");
  if (!list) return;

  list.innerHTML = "<p class='tasks-loading'>Loading tasks...</p>";
  if (empty) empty.classList.add("hidden");

  try {
    const userId = getCurrentUserId && getCurrentUserId();
    const semester = getCurrentSemester && getCurrentSemester();

    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (semester) params.set("semester", semester);

    const res = await fetch(`/api/tasks/by-schedule?${params.toString()}`);

    if (!res.ok) {
      const text = await res.text();
      console.error(
        "Failed to load tasks",
        res.status,
        res.statusText,
        text
      );
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const tasks = Array.isArray(data) ? data : data.tasks || [];
    renderTasks(tasks);
  } catch (err) {
    console.error("loadTasksForSchedule error:", err);
    if (list) {
      list.innerHTML =
        "<p class='tasks-error'>Sorry, we couldn't load your tasks.</p>";
    }
  }
}

export function setupTasksPage() {
  const list = document.getElementById("tasks-list");
  if (!list) return;

  // status button behavior
  list.addEventListener("click", async (event) => {
    const btn = event.target.closest(".task-status-btn");
    if (!btn) return;

    const item = btn.closest("[data-task-id]");
    if (!item) return;

    const taskId = item.dataset.taskId;
    const status = btn.dataset.status;

    try {
      btn.disabled = true;
      await updateTaskStatus(taskId, status);

      // update active button styles
      item
        .querySelectorAll(".task-status-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    } catch (err) {
      console.error(err);
      alert("Couldn't update task status. Please try again.");
    } finally {
      btn.disabled = false;
    }
  });
}
